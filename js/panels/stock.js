// /js/panels/stock.js

const db = firebase.database();

// --- STATE MANAGEMENT ---
let ingredientsCache = {};
let editingIngredientId = null;

// --- UI ELEMENT REFERENCES (to be assigned in loadPanel) ---
let ingredientModal, ingredientForm, modalTitle, panelRoot;

// --- HELPER FUNCTIONS ---

/**
 * Creates the HTML for a single row in the ingredients table.
 * @param {string} ingredientId - The Firebase key for the ingredient.
 * @param {object} ingredientData - The ingredient's data object.
 * @returns {string} The HTML string for the table row.
 */
function createIngredientRow(ingredientId, ingredientData) {
    const { name, category, unit, unit_cost, supplier, low_stock_threshold } = ingredientData;
    // A simple check for low stock
    const isLowStock = ingredientData.stock_level && low_stock_threshold && ingredientData.stock_level < low_stock_threshold;

    return `
        <tr class="hover:bg-gray-50 transition ${isLowStock ? 'bg-yellow-50' : ''}" data-id="${ingredientId}">
            <td class="p-3 font-medium text-gray-800">${name || 'N/A'}</td>
            <td class="p-3 text-sm text-gray-600">${category || 'N/A'}</td>
            <td class="p-3 text-sm text-center">${ingredientData.stock_level || 0} ${unit || ''}</td>
            <td class="p-3 text-sm">${(unit_cost || 0).toFixed(2)} MAD</td>
            <td class="p-3 text-sm text-gray-500">${supplier || 'N/A'}</td>
            <td class="p-3 text-center">
                <button class="edit-ingredient-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-ingredient-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Opens the modal to add or edit an ingredient.
 * @param {string} [ingredientId] - The ID of the ingredient to edit. If null, it's a new ingredient.
 */
function openIngredientModal(ingredientId = null) {
    editingIngredientId = ingredientId;
    ingredientForm.reset();

    if (ingredientId && ingredientsCache[ingredientId]) {
        modalTitle.textContent = 'Edit Ingredient';
        const data = ingredientsCache[ingredientId];
        document.getElementById('ingredient-name').value = data.name || '';
        document.getElementById('ingredient-category').value = data.category || '';
        document.getElementById('ingredient-unit').value = data.unit || '';
        document.getElementById('ingredient-unit-cost').value = data.unit_cost || 0;
        document.getElementById('ingredient-supplier').value = data.supplier || '';
        document.getElementById('ingredient-stock-level').value = data.stock_level || 0;
        document.getElementById('low-stock-threshold').value = data.low_stock_threshold || 0;
    } else {
        modalTitle.textContent = 'Add New Ingredient';
    }

    ingredientModal.classList.remove('hidden');
}

/**
 * Closes the ingredient modal.
 */
function closeIngredientModal() {
    ingredientModal.classList.add('hidden');
    editingIngredientId = null;
}

/**
 * Handles the submission of the ingredient form (add or edit).
 * @param {Event} e - The form submission event.
 */
async function handleSaveIngredient(e) {
    e.preventDefault();
    const saveBtn = ingredientForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const ingredientData = {
        name: document.getElementById('ingredient-name').value.trim(),
        category: document.getElementById('ingredient-category').value.trim(),
        unit: document.getElementById('ingredient-unit').value.trim(),
        unit_cost: parseFloat(document.getElementById('ingredient-unit-cost').value) || 0,
        supplier: document.getElementById('ingredient-supplier').value.trim(),
        stock_level: parseFloat(document.getElementById('ingredient-stock-level').value) || 0,
        low_stock_threshold: parseFloat(document.getElementById('low-stock-threshold').value) || 0,
    };

    try {
        let dbRef;
        if (editingIngredientId) {
            dbRef = db.ref(`ingredients/${editingIngredientId}`);
            await dbRef.update(ingredientData);
        } else {
            ingredientData.last_restocked = new Date().toISOString(); // Set initial restock date
            dbRef = db.ref('ingredients').push();
            await dbRef.set(ingredientData);
        }
        closeIngredientModal();
    } catch (error) {
        console.error("Error saving ingredient:", error);
        alert("Could not save ingredient. See console for details.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Ingredient';
    }
}

/**
 * Fetches and renders all ingredients into the table.
 */
function loadAndRenderIngredients() {
    const ingredientsTbody = document.getElementById('ingredients-tbody');
    const ingredientsRef = db.ref('ingredients');

    ingredientsRef.on('value', (snapshot) => {
        ingredientsTbody.innerHTML = '';
        if (snapshot.exists()) {
            ingredientsCache = snapshot.val();
            let rowsHtml = '';
            for (const id in ingredientsCache) {
                rowsHtml += createIngredientRow(id, ingredientsCache[id]);
            }
            ingredientsTbody.innerHTML = rowsHtml;
        } else {
            ingredientsCache = {};
            ingredientsTbody.innerHTML = '<tr><td colspan="6" class="text-center p-6 text-gray-500">No ingredients found. Add one to get started!</td></tr>';
        }
    });
}

/**
 * Handles clicks on the ingredients table for editing or deleting.
 * @param {Event} e - The click event.
 */
function handleTableClick(e) {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;

    const ingredientId = row.dataset.id;

    if (target.classList.contains('edit-ingredient-btn')) {
        openIngredientModal(ingredientId);
    } else if (target.classList.contains('delete-ingredient-btn')) {
        if (confirm('Are you sure you want to delete this ingredient? This cannot be undone.')) {
            db.ref(`ingredients/${ingredientId}`).remove()
                .catch(err => alert('Error deleting ingredient: ' + err.message));
        }
    }
}

/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(root, panelTitle) {
    panelRoot = root; // Assign to module-level variable
    panelTitle.textContent = 'Stock & Sales Control';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Sales</h4><p class="text-2xl font-bold">0 MAD</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Loss Value</h4><p class="text-2xl font-bold text-red-500">0 MAD</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Food Cost %</h4><p class="text-2xl font-bold">0%</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Low Stock Items</h4><p class="text-2xl font-bold">0</p></div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="border-b mb-4">
                <nav class="flex space-x-4">
                    <button class="py-2 px-4 font-semibold border-b-2 border-red-600 text-red-600">Ingredients</button>
                    <button class="py-2 px-4 font-semibold text-gray-500 hover:text-red-600">Daily Count</button>
                    <button class="py-2 px-4 font-semibold text-gray-500 hover:text-red-600">Sales Input</button>
                    <button class="py-2 px-4 font-semibold text-gray-500 hover:text-red-600">Warehouse</button>
                    <button class="py-2 px-4 font-semibold text-gray-500 hover:text-red-600">Reports</button>
                </nav>
            </div>

            <div id="ingredients-section">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Master Ingredient List</h3>
                    <button id="add-ingredient-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Ingredient
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Category</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Current Stock</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Cost/Unit</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Supplier</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="ingredients-tbody" class="divide-y">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="ingredient-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <h3 id="modal-title" class="text-2xl font-bold text-gray-800 mb-4">Add New Ingredient</h3>
                <form id="ingredient-form" class="space-y-4">
                    <div>
                        <label for="ingredient-name" class="block text-sm font-medium">Ingredient Name</label>
                        <input type="text" id="ingredient-name" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="ingredient-category" class="block text-sm font-medium">Category</label>
                            <input type="text" id="ingredient-category" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., Dairy, Meat, Vegetable">
                        </div>
                        <div>
                            <label for="ingredient-unit" class="block text-sm font-medium">Unit</label>
                            <input type="text" id="ingredient-unit" required class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., kg, L, pcs">
                        </div>
                    </div>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="ingredient-unit-cost" class="block text-sm font-medium">Cost per Unit (MAD)</label>
                            <input type="number" id="ingredient-unit-cost" step="0.01" required class="w-full mt-1 p-2 border rounded-md">
                        </div>
                        <div>
                            <label for="ingredient-supplier" class="block text-sm font-medium">Supplier</label>
                            <input type="text" id="ingredient-supplier" class="w-full mt-1 p-2 border rounded-md">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="ingredient-stock-level" class="block text-sm font-medium">Initial Stock Level</label>
                            <input type="number" id="ingredient-stock-level" step="0.1" required class="w-full mt-1 p-2 border rounded-md">
                        </div>
                        <div>
                            <label for="low-stock-threshold" class="block text-sm font-medium">Low Stock Threshold</label>
                            <input type="number" id="low-stock-threshold" step="0.1" required class="w-full mt-1 p-2 border rounded-md">
                        </div>
                    </div>
                    <div class="flex justify-end gap-4 pt-4">
                        <button type="button" id="cancel-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Ingredient</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // --- Assign UI elements and attach event listeners ---
    ingredientModal = document.getElementById('ingredient-modal');
    ingredientForm = document.getElementById('ingredient-form');
    modalTitle = document.getElementById('modal-title');
    const ingredientsTbody = document.getElementById('ingredients-tbody');

    document.getElementById('add-ingredient-btn').addEventListener('click', () => openIngredientModal());
    document.getElementById('cancel-modal-btn').addEventListener('click', closeIngredientModal);
    ingredientForm.addEventListener('submit', handleSaveIngredient);
    ingredientsTbody.addEventListener('click', handleTableClick);

    // Initial data load
    loadAndRenderIngredients();
}