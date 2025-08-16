// /js/panels/menu-items.js

const db = firebase.database();

// --- MODAL ELEMENTS ---
let editModal, editModalTitle, editForm, recipeModal;
let currentEditId = ''; // Firebase key of the item being edited
let currentRecipeItemId = ''; // ID of the item for which the recipe is being edited
let ingredientsCache = {}; // Cache for the master ingredient list

/**
 * Creates the HTML for a single menu item row.
 */
function createMenuItemRow(categoryId, itemId, itemData) {
    const { name, description, price, image_url, inStock } = itemData;
    const imageUrl = image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const descSnippet = description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A';
    const priceDisplay = typeof price === 'number' ? price.toFixed(2) : 'N/A';
    const isChecked = inStock === false ? '' : 'checked'; // In stock by default
    const stockText = inStock === false ? 'Out of Stock' : 'In Stock';
    const stockTextColor = inStock === false ? 'text-red-500' : 'text-green-600';

    return `
        <tr class="hover:bg-gray-50 transition duration-150 ease-in-out ${inStock === false ? 'bg-gray-100 opacity-60' : ''}" data-category-id="${categoryId}" data-item-id="${itemId}" data-item-name="${name}">
            <td class="px-4 py-3 text-sm text-gray-700 font-medium">
                <div class="flex items-center">
                    <img src="${imageUrl}" alt="${name}" class="w-10 h-10 rounded-md object-cover mr-3 shadow-sm">
                    <span>${name || 'N/A'}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${descSnippet}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${priceDisplay} MAD</td>
            <td class="px-4 py-3 text-sm text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${categoryId}
                </span>
            </td>
            <td class="p-4 text-center">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" class="sr-only peer stock-toggle" ${isChecked}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span class="ml-3 text-sm font-medium ${stockTextColor}">${stockText}</span>
                </label>
            </td>
            <td class="px-4 py-3 text-center text-sm">
                <button class="edit-item-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 transition shadow-sm mr-2">Edit</button>
                <button class="recipe-item-btn bg-purple-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-purple-600 transition shadow-sm mr-2">Recipe</button>
                <button class="delete-item-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 transition shadow-sm">Delete</button>
            </td>
        </tr>
    `;
}

// --- RECIPE MODAL FUNCTIONS ---

/**
 * Populates the recipe modal with available ingredients and the current recipe.
 */
async function populateRecipeModal() {
    const availableList = document.getElementById('available-ingredients');
    const recipeList = document.getElementById('recipe-ingredients-list');
    availableList.innerHTML = '<p class="text-gray-500">Loading ingredients...</p>';
    recipeList.innerHTML = '<p class="text-gray-500">Add ingredients from the left.</p>';

    // 1. Fetch all available ingredients
    const ingredientsSnapshot = await db.ref('ingredients').once('value');
    if (ingredientsSnapshot.exists()) {
        ingredientsCache = ingredientsSnapshot.val();
        availableList.innerHTML = Object.entries(ingredientsCache).map(([id, data]) => `
            <div class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
                <span>${data.name} (${data.unit})</span>
                <button type="button" class="add-ingredient-to-recipe-btn text-green-500 hover:text-green-700 text-lg" data-id="${id}">
                    <i class="fas fa-plus-circle"></i>
                </button>
            </div>
        `).join('');
    } else {
        availableList.innerHTML = '<p class="text-red-500">No ingredients found. Please add ingredients in the Stock panel first.</p>';
    }

    // 2. Fetch the current recipe for the item
    const recipeSnapshot = await db.ref(`recipes/${currentRecipeItemId}`).once('value');
    if (recipeSnapshot.exists()) {
        const recipeData = recipeSnapshot.val();
        if (recipeData.ingredients) {
            recipeList.innerHTML = ''; // Clear placeholder
            Object.entries(recipeData.ingredients).forEach(([ingredientId, data]) => {
                addIngredientToRecipeList(ingredientId, data.qty);
            });
        }
    }
}

/**
 * Adds an ingredient from the available list to the recipe list UI.
 * @param {string} ingredientId - The ID of the ingredient to add.
 * @param {number} [quantity=0.1] - The initial quantity.
 */
function addIngredientToRecipeList(ingredientId, quantity = 0.1) {
    const recipeList = document.getElementById('recipe-ingredients-list');
    if (!ingredientsCache[ingredientId]) return; // Ingredient doesn't exist

    // Prevent adding duplicates
    if (recipeList.querySelector(`[data-id="${ingredientId}"]`)) {
        alert('Ingredient is already in the recipe.');
        return;
    }
     // Clear the placeholder text if it's the first item
    if (recipeList.querySelector('p')) {
        recipeList.innerHTML = '';
    }

    const ingredientData = ingredientsCache[ingredientId];
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-2 bg-blue-50 rounded-md';
    div.dataset.id = ingredientId;
    div.dataset.unit = ingredientData.unit;

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

/**
 * Opens the recipe modal and populates it with data.
 * @param {string} itemId - The ID of the menu item.
 * @param {string} itemName - The name of the menu item.
 */
function openRecipeModal(itemId, itemName) {
    currentRecipeItemId = itemId;
    document.getElementById('recipe-modal-title').textContent = `Recipe for ${itemName}`;
    populateRecipeModal();
    recipeModal.classList.remove('hidden');
}

function closeRecipeModal() {
    recipeModal.classList.add('hidden');
    currentRecipeItemId = '';
}

/**
 * Handles saving the recipe to Firebase.
 * @param {Event} e - The form submission event.
 */
async function handleSaveRecipe(e) {
    e.preventDefault();
    if (!currentRecipeItemId) return;

    const recipeList = document.getElementById('recipe-ingredients-list');
    const ingredientRows = recipeList.querySelectorAll('[data-id]');
    
    const recipeData = {
        name: document.getElementById('recipe-modal-title').textContent.replace('Recipe for ', ''),
        ingredients: {}
    };

    ingredientRows.forEach(row => {
        const id = row.dataset.id;
        const unit = row.dataset.unit;
        const qty = parseFloat(row.querySelector('.recipe-qty-input').value);
        if (!isNaN(qty)) {
            recipeData.ingredients[id] = { qty, unit };
        }
    });

    try {
        await db.ref(`recipes/${currentRecipeItemId}`).set(recipeData);
        alert('Recipe saved successfully!');
        closeRecipeModal();
    } catch (error) {
        alert('Error saving recipe: ' + error.message);
        console.error("Recipe save error:", error);
    }
}


// --- EXISTING MODAL AND PANEL FUNCTIONS (Minor adjustments for recipe button) ---
// ... (All other functions like openEditModal, closeEditModal, saveEditedEntity, etc., remain here without changes) ...
function openEditModal(id, data) {
    currentEditId = id;
    const formFieldsContainer = document.getElementById('edit-form-fields');
    if (!formFieldsContainer) return;
    editModalTitle.textContent = `Edit Menu Item`;
    formFieldsContainer.innerHTML = ''; // Clear previous form content
    let formHtml = `
        <input type="hidden" id="edit-item-category-id" value="${data.category}">
        <div>
            <label for="edit-item-name" class="block text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" id="edit-item-name" value="${data.name || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div>
            <label for="edit-item-description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="edit-item-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">${data.description || ''}</textarea>
        </div>
        <div>
            <label for="edit-item-price" class="block text-sm font-medium text-gray-700">Base Price (MAD)</label>
            <input type="number" id="edit-item-price" step="0.01" value="${data.price || 0}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div>
            <label for="edit-item-image-url" class="block text-sm font-medium text-gray-700">Image URL</label>
            <input type="url" id="edit-item-image-url" value="${data.image_url || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Sizes</h4>
            <div id="edit-item-sizes-container" class="space-y-2"></div>
            <button type="button" id="add-edit-size-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Size</button>
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Recipes (Comma-separated)</h4>
            <input type="text" id="edit-item-recipes" value="${(data.recipes || []).join(', ') || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Spicy, BBQ, Original">
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Add-ons/Options</h4>
            <div id="edit-item-options-container" class="space-y-2"></div>
            <button type="button" id="add-edit-option-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Option</button>
        </div>
        <div class="border-t pt-4 mt-4">
            <label for="edit-item-allergies" class="block text-sm font-medium text-gray-700">Allergies/Dietary Info</label>
            <textarea id="edit-item-allergies" rows="2" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Contains dairy, gluten-free option available">${data.allergies || ''}</textarea>
        </div>`;
    formFieldsContainer.innerHTML = formHtml;
    editModal.classList.remove('hidden');
    const sizesContainer = document.getElementById('edit-item-sizes-container');
    const optionsContainer = document.getElementById('edit-item-options-container');
    (data.sizes || []).forEach(size => addSizeField(sizesContainer, size.size, size.price));
    (data.options || []).forEach(option => addOptionField(optionsContainer, option.name, option.price.Triple));
    document.getElementById('add-edit-size-btn').addEventListener('click', () => addSizeField(sizesContainer));
    document.getElementById('add-edit-option-btn').addEventListener('click', () => addOptionField(optionsContainer));
}
function closeEditModal() { editModal.classList.add('hidden'); }
function addSizeField(container, size = '', price = '') { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="text" class="size-name-input w-2/3 p-2 border rounded-md" placeholder="Size Name (e.g., Small)" value="${size}"><input type="number" step="0.01" class="size-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}"><button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>`; div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove()); container.appendChild(div); }
function addOptionField(container, name = '', price = '') { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="text" class="option-name-input w-2/3 p-2 border rounded-md" placeholder="Option Name (e.g., Mushrooms)" value="${name}"><input type="number" step="0.01" class="option-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}"><button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>`; div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove()); container.appendChild(div); }
async function saveEditedEntity(event) { event.preventDefault(); const categoryId = document.getElementById('edit-item-category-id').value; const newBasePrice = parseFloat(document.getElementById('edit-item-price').value); const sizes = []; document.querySelectorAll('#edit-item-sizes-container .flex').forEach(row => { const sizeName = row.querySelector('.size-name-input').value.trim(); const sizePrice = parseFloat(row.querySelector('.size-price-input').value); if (sizeName && !isNaN(sizePrice)) { sizes.push({ size: sizeName, price: sizePrice }); } }); if (sizes.length === 0 && !isNaN(newBasePrice)) { sizes.push({ size: "Regular", price: newBasePrice }); } const recipesInput = document.getElementById('edit-item-recipes').value.trim(); const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : []; const options = []; document.querySelectorAll('#edit-item-options-container .flex').forEach(row => { const optionName = row.querySelector('.option-name-input').value.trim(); const optionPrice = parseFloat(row.querySelector('.option-price-input').value); if (optionName && !isNaN(optionPrice)) { options.push({ name: optionName, price: { Triple: optionPrice } }); } }); const updatedData = { name: document.getElementById('edit-item-name').value, description: document.getElementById('edit-item-description').value, price: newBasePrice, image_url: document.getElementById('edit-item-image-url').value, sizes: sizes, recipes: recipes, options: options, allergies: document.getElementById('edit-item-allergies').value.trim() }; const dbRef = db.ref(`menu/${categoryId}/items/${currentEditId}`); try { await dbRef.update(updatedData); alert(`Item updated successfully!`); closeEditModal(); loadMenuItems(); } catch (error) { alert(`Failed to update item: ` + error.message); } }
function loadMenuItems() { db.ref('menu').on('value', (snapshot) => { const menuItemsList = document.getElementById('menu-items-list'); if (menuItemsList) { menuItemsList.innerHTML = ''; if (snapshot.exists()) { let itemsHtml = ''; snapshot.forEach((categorySnapshot) => { const categoryId = categorySnapshot.key; const categoryData = categorySnapshot.val(); if (categoryData.items) { for (const itemId in categoryData.items) { itemsHtml += createMenuItemRow(categoryId, itemId, categoryData.items[itemId]); } } }); menuItemsList.innerHTML = itemsHtml || `<tr><td colspan="6" class="text-center p-4 text-gray-500">No menu items found.</td></tr>`; } else { menuItemsList.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-500">No menu items found.</td></tr>`; } populateCategoryDropdown(); } }); }
function populateCategoryDropdown() { const categorySelect = document.getElementById('new-item-category'); if (!categorySelect) return; db.ref('menu').once('value').then(snapshot => { categorySelect.innerHTML = '<option value="">Select a category</option>'; if (snapshot.exists()) { snapshot.forEach(categorySnap => { const categoryName = categorySnap.val().category; const categoryId = categorySnap.key; const option = document.createElement('option'); option.value = categoryId; option.textContent = categoryName; categorySelect.appendChild(option); }); } }); }


export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Menu Items Management';
    panelRoot.innerHTML = `
        <div id="menu-items-section" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Add New Menu Item</h2>
            <form id="add-item-form" class="space-y-4"></form>

            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 mt-8">Current Menu Items</h2>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Availability</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="menu-items-list" class="bg-white divide-y divide-gray-200"></tbody>
                </table>
            </div>
        </div>

        <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4"></div>

        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl">
                <h3 id="recipe-modal-title" class="text-2xl font-bold mb-4">Recipe Editor</h3>
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold mb-2">Available Ingredients</h4>
                        <div id="available-ingredients" class="h-64 overflow-y-auto border p-2 rounded-md">
                            <p class="text-gray-500">Loading ingredients...</p>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2">Recipe Ingredients</h4>
                         <form id="recipe-form">
                             <div id="recipe-ingredients-list" class="h-64 overflow-y-auto border p-2 rounded-md space-y-2">
                                <p class="text-gray-500">Add ingredients from the left.</p>
                             </div>
                             <div class="flex justify-end gap-4 pt-4 border-t mt-4">
                                <button type="button" id="cancel-recipe-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Recipe</button>
                            </div>
                         </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Assign UI elements and attach event listeners ---
    editModal = document.getElementById('edit-modal');
    editModalTitle = document.getElementById('edit-modal-title');
    editForm = document.getElementById('edit-form');
    recipeModal = document.getElementById('recipe-modal');

    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-recipe-modal-btn').addEventListener('click', closeRecipeModal);
    editForm.addEventListener('submit', saveEditedEntity);
    document.getElementById('recipe-form').addEventListener('submit', handleSaveRecipe);

    // Event delegation for recipe modal interactions
    recipeModal.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-ingredient-to-recipe-btn');
        const removeBtn = e.target.closest('.remove-ingredient-from-recipe-btn');
        
        if (addBtn) {
            addIngredientToRecipeList(addBtn.dataset.id);
        } else if (removeBtn) {
            removeBtn.closest('[data-id]').remove();
        }
    });

    loadMenuItems();
    // ... (rest of the loadPanel function, including form submissions and table clicks)
        document.getElementById('add-item-form').addEventListener('submit', async (e) => { e.preventDefault(); const newItemPrice = parseFloat(document.getElementById('new-item-price').value); const sizes = []; document.querySelectorAll('#new-item-sizes-container .flex').forEach(row => { const sizeName = row.querySelector('.size-name-input').value.trim(); const sizePrice = parseFloat(row.querySelector('.size-price-input').value); if (sizeName && !isNaN(sizePrice)) { sizes.push({ size: sizeName, price: sizePrice }); } }); if (sizes.length === 0 && !isNaN(newItemPrice)) { sizes.push({ size: "Regular", price: newItemPrice }); } const recipesInput = document.getElementById('new-item-recipes').value.trim(); const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : []; const options = []; document.querySelectorAll('#new-item-options-container .flex').forEach(row => { const optionName = row.querySelector('.option-name-input').value.trim(); const optionPrice = parseFloat(row.querySelector('.option-price-input').value); if (optionName && !isNaN(optionPrice)) { options.push({ name: optionName, price: { Triple: optionPrice } }); } }); const newItem = { name: document.getElementById('new-item-name').value, description: document.getElementById('new-item-description').value, price: newItemPrice, category: document.getElementById('new-item-category').value, image_url: document.getElementById('new-item-image-url').value || 'https://www.pizzahut.ma/images/Default_pizza.png', sizes: sizes, recipes: recipes, options: options, allergies: document.getElementById('new-item-allergies').value.trim(), inStock: true }; if (!newItem.category) { alert('Please select a category.'); return; } try { const newRef = await db.ref(`menu/${newItem.category}/items`).push(); await newRef.set({ ...newItem, id: newRef.key }); alert('Item added successfully!'); e.target.reset(); document.getElementById('new-item-sizes-container').innerHTML = ''; document.getElementById('new-item-options-container').innerHTML = ''; document.getElementById('new-item-recipes').value = ''; document.getElementById('new-item-allergies').value = ''; loadMenuItems(); } catch (error) { alert("Failed to add item: " + error.message); } });
    document.getElementById('add-new-size-btn').addEventListener('click', () => { addSizeField(document.getElementById('new-item-sizes-container')); });
    document.getElementById('add-new-option-btn').addEventListener('click', () => { addOptionField(document.getElementById('new-item-options-container')); });
    panelRoot.addEventListener('click', async (event) => { const target = event.target.closest('button'); if (!target) return; const row = target.closest('tr'); if (!row) return; const categoryId = row.dataset.categoryId; const itemId = row.dataset.itemId; const itemName = row.dataset.itemName; if (target.classList.contains('edit-item-btn')) { try { const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value'); if (itemSnapshot.exists()) { const itemData = itemSnapshot.val(); openEditModal(itemId, { ...itemData, category: categoryId }); } else { alert('Item not found!'); } } catch (error) { alert("Failed to fetch item details: " + error.message); } } else if (target.classList.contains('recipe-item-btn')) { openRecipeModal(itemId, itemName); } else if (target.classList.contains('delete-item-btn')) { if (confirm(`Are you sure you want to delete item ${itemName}? This cannot be undone.`)) { try { await db.ref(`menu/${categoryId}/items/${itemId}`).remove(); alert('Item deleted successfully!'); loadMenuItems(); } catch (error) { alert("Failed to delete item: " + error.message); } } } });
    panelRoot.addEventListener('change', (e) => { if (e.target.classList.contains('stock-toggle')) { const row = e.target.closest('tr'); const categoryId = row.dataset.categoryId; const itemId = row.dataset.itemId; const isInStock = e.target.checked; db.ref(`menu/${categoryId}/items/${itemId}/inStock`).set(isInStock); } });
}