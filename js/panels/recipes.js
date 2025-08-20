// /js/panels/recipes.js

const db = firebase.database();

// --- STATE & CACHE ---
let menuItemsCache = {};
let ingredientsCache = {};
let recipesCache = {};
let currentRecipeMenuItemId = null; // The menu item ID we are editing the recipe for

// --- UI ELEMENT REFERENCES ---
let recipeModal, recipeForm, panelRoot, recipesTbody;

/**
 * Renders a single row in the main recipes table.
 */
function createRecipeRow(menuItemId, recipeData) {
    const menuItem = menuItemsCache[menuItemId] || { name: 'Unknown Item' };
    let ingredientsSummary = 'No ingredients set.';

    if (recipeData.ingredients && Object.keys(recipeData.ingredients).length > 0) {
        ingredientsSummary = Object.entries(recipeData.ingredients).map(([ingId, data]) => {
            const ingredient = ingredientsCache[ingId];
            return ingredient ? `${data.qty} ${ingredient.unit} ${ingredient.name}` : 'Unknown Ingredient';
        }).join(', ');
    }

    return `
        <tr class="hover:bg-gray-50" data-item-id="${menuItemId}" data-item-name="${menuItem.name}">
            <td class="p-3 font-medium">${menuItem.name}</td>
            <td class="p-3 text-sm text-gray-600">${ingredientsSummary}</td>
            <td class="p-3 text-center">
                <button class="edit-recipe-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-recipe-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Fetches all necessary data and renders the main recipes table.
 */
async function loadAndRenderRecipes() {
    recipesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-6"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const [menuSnapshot, ingredientsSnapshot, recipesSnapshot] = await Promise.all([
            db.ref('menu').once('value'),
            db.ref('ingredients').once('value'),
            db.ref('recipes').once('value')
        ]);

        // Flatten menu items for easy lookup
        if (menuSnapshot.exists()) {
            const menuData = menuSnapshot.val();
            for (const categoryId in menuData) {
                if (menuData[categoryId].items) {
                    Object.assign(menuItemsCache, menuData[categoryId].items);
                }
            }
        }

        ingredientsCache = ingredientsSnapshot.exists() ? ingredientsSnapshot.val() : {};
        recipesCache = recipesSnapshot.exists() ? recipesSnapshot.val() : {};

        if (Object.keys(recipesCache).length > 0) {
            recipesTbody.innerHTML = Object.entries(recipesCache)
                .map(([menuItemId, recipeData]) => createRecipeRow(menuItemId, recipeData))
                .join('');
        } else {
            recipesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-gray-500">No recipes found. Click "Add Recipe" to start.</td></tr>';
        }

    } catch (error) {
        console.error("Error loading recipe data:", error);
        recipesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-red-500">Could not load recipes.</td></tr>';
    }
}

/**
 * Opens and populates the recipe editing modal.
 */
async function openRecipeModal(menuItemId = null) {
    currentRecipeMenuItemId = menuItemId;
    recipeForm.reset();
    document.getElementById('recipe-ingredients-list').innerHTML = '<p class="text-gray-500 p-4 text-center">Add ingredients from the left.</p>';
    
    const menuItemSelect = document.getElementById('menu-item-select');
    menuItemSelect.innerHTML = '<option value="">-- Select a Menu Item --</option>';
    
    // Populate menu item dropdown
    Object.entries(menuItemsCache).forEach(([id, item]) => {
        // Only show items that don't already have a recipe, unless we are editing it
        if (!recipesCache[id] || id === menuItemId) {
            const option = new Option(item.name, id);
            menuItemSelect.add(option);
        }
    });

    // Populate available ingredients list
    const availableList = document.getElementById('available-ingredients');
    availableList.innerHTML = Object.entries(ingredientsCache).map(([id, data]) => `
        <div class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
            <span>${data.name} (${data.unit})</span>
            <button type="button" class="add-ingredient-to-recipe-btn text-green-500 hover:text-green-700 text-lg" data-id="${id}">
                <i class="fas fa-plus-circle"></i>
            </button>
        </div>
    `).join('');

    if (menuItemId) {
        document.getElementById('recipe-modal-title').textContent = `Edit Recipe for ${menuItemsCache[menuItemId].name}`;
        menuItemSelect.value = menuItemId;
        menuItemSelect.disabled = true; // Don't allow changing the item when editing
        
        const recipeData = recipesCache[menuItemId];
        if (recipeData && recipeData.ingredients) {
            const recipeList = document.getElementById('recipe-ingredients-list');
            recipeList.innerHTML = '';
            Object.entries(recipeData.ingredients).forEach(([ingId, data]) => {
                addIngredientToRecipeList(ingId, data.qty);
            });
        }
    } else {
        document.getElementById('recipe-modal-title').textContent = 'Add New Recipe';
        menuItemSelect.disabled = false;
    }

    recipeModal.classList.remove('hidden');
}

function closeRecipeModal() {
    recipeModal.classList.add('hidden');
    currentRecipeMenuItemId = null;
}

function addIngredientToRecipeList(ingredientId, quantity = 0.1) {
    const recipeList = document.getElementById('recipe-ingredients-list');
    if (!ingredientsCache[ingredientId]) return;

    if (recipeList.querySelector(`[data-id="${ingredientId}"]`)) {
        alert('Ingredient is already in the recipe.');
        return;
    }
    if (recipeList.querySelector('p')) {
        recipeList.innerHTML = ''; // Clear the placeholder text
    }

    const ingredientData = ingredientsCache[ingredientId];
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-2 bg-blue-50 rounded-md';
    div.dataset.id = ingredientId;

    div.innerHTML = `
        <span class="font-semibold">${ingredientData.name}</span>
        <div class="flex items-center gap-2">
            <input type="number" step="0.01" value="${quantity}" class="recipe-qty-input w-20 p-1 border rounded-md text-right">
            <span class="text-sm text-gray-600">${ingredientData.unit}</span>
            <button type="button" class="remove-ingredient-from-recipe-btn text-red-500 hover:text-red-700 text-lg">
                <i class="fas fa-minus-circle"></i>
            </button>
        </div>
    `;
    recipeList.appendChild(div);
}

async function handleSaveRecipe(e) {
    e.preventDefault();
    const menuItemId = currentRecipeMenuItemId || document.getElementById('menu-item-select').value;
    if (!menuItemId) {
        alert('Please select a menu item.');
        return;
    }

    const recipeList = document.getElementById('recipe-ingredients-list');
    const ingredientRows = recipeList.querySelectorAll('[data-id]');
    
    const recipeData = {
        name: menuItemsCache[menuItemId].name,
        ingredients: {}
    };

    ingredientRows.forEach(row => {
        const id = row.dataset.id;
        const qty = parseFloat(row.querySelector('.recipe-qty-input').value);
        if (!isNaN(qty)) {
            recipeData.ingredients[id] = { qty, unit: ingredientsCache[id].unit };
        }
    });

    try {
        await db.ref(`recipes/${menuItemId}`).set(recipeData);
        alert('Recipe saved successfully!');
        closeRecipeModal();
        loadAndRenderRecipes(); // Refresh the main table
    } catch (error) {
        alert('Error saving recipe: ' + error.message);
    }
}

function filterIngredients(query) {
    const availableList = document.getElementById('available-ingredients');
    const items = availableList.children;
    for (let i = 0; i < items.length; i++) {
        const itemText = items[i].textContent.toLowerCase();
        items[i].style.display = itemText.includes(query) ? '' : 'none';
    }
}

/**
 * Main function to load the Recipes Panel.
 */
export function loadPanel(root, panelTitle) {
    panelRoot = root;
    panelTitle.textContent = 'Recipe Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h2 class="text-2xl font-bold text-gray-800">Menu Recipes</h2>
                <button id="add-recipe-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i>Add Recipe
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Menu Item</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Linked Ingredients (Quantity)</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recipes-tbody" class="divide-y">
                        <tr><td colspan="3" class="text-center p-6 text-gray-500">Loading recipes...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style="max-height: 90vh;">
                <h3 id="recipe-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Add New Recipe</h3>
                <form id="recipe-form" class="flex-grow overflow-hidden flex flex-col">
                    <div class="flex-grow overflow-y-auto pr-4 space-y-4">
                        <div>
                            <label for="menu-item-select" class="block text-sm font-medium text-gray-700">Select Menu Item</label>
                            <select id="menu-item-select" required class="w-full mt-1 p-2 border rounded-md bg-white"></select>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-semibold mb-2 text-gray-700">Available Ingredients</h4>
                                <input type="text" id="ingredient-search" placeholder="Search ingredients..." class="w-full p-2 border rounded-md mb-2">
                                <div id="available-ingredients" class="h-64 overflow-y-auto border p-2 rounded-md bg-gray-50"></div>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2 text-gray-700">Recipe Ingredients</h4>
                                <div id="recipe-ingredients-list" class="h-64 overflow-y-auto border p-2 rounded-md space-y-2">
                                    <p class="text-gray-500 p-4 text-center">Add ingredients from the left.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0 flex justify-end gap-4 pt-4 border-t mt-4">
                        <button type="button" id="cancel-recipe-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Recipe</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // --- Assign UI elements and attach listeners ---
    recipeModal = panelRoot.querySelector('#recipe-modal');
    recipeForm = panelRoot.querySelector('#recipe-form');
    recipesTbody = panelRoot.querySelector('#recipes-tbody');

    panelRoot.querySelector('#add-recipe-btn').addEventListener('click', () => openRecipeModal());
    panelRoot.querySelector('#cancel-recipe-modal-btn').addEventListener('click', closeRecipeModal);
    recipeForm.addEventListener('submit', handleSaveRecipe);
    
    panelRoot.querySelector('#ingredient-search').addEventListener('input', (e) => filterIngredients(e.target.value.toLowerCase()));

    // Event delegation for dynamically added elements
    panelRoot.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-ingredient-to-recipe-btn');
        const removeBtn = e.target.closest('.remove-ingredient-from-recipe-btn');
        const editRecipeBtn = e.target.closest('.edit-recipe-btn');
        const deleteRecipeBtn = e.target.closest('.delete-recipe-btn');

        if (addBtn) {
            addIngredientToRecipeList(addBtn.dataset.id);
        }
        if (removeBtn) {
            removeBtn.closest('[data-id]').remove();
        }
        if (editRecipeBtn) {
            const row = editRecipeBtn.closest('tr');
            openRecipeModal(row.dataset.itemId);
        }
        if (deleteRecipeBtn) {
            const row = deleteRecipeBtn.closest('tr');
            if (confirm(`Are you sure you want to delete the recipe for "${row.dataset.itemName}"?`)) {
                db.ref(`recipes/${row.dataset.itemId}`).remove()
                    .then(() => {
                        alert('Recipe deleted!');
                        loadAndRenderRecipes();
                    })
                    .catch(err => alert('Error deleting recipe: ' + err.message));
            }
        }
    });

    // Initial data load
    loadAndRenderRecipes();
}