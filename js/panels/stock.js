// /js/panels/stock.js

const db = firebase.database();

// --- STATE MANAGEMENT ---
let ingredientsCache = {};
let recipesCache = {};
let editingIngredientId = null;
let currentStockDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// --- UI ELEMENT REFERENCES ---
let ingredientModal, ingredientForm, modalTitle, panelRoot, activeTab;

// --- HELPER & CORE FUNCTIONS ---

/**
 * Handles switching between the different tabs in the panel.
 * @param {string} tabName - The name of the tab to switch to.
 */
function switchTab(tabName) {
    // Hide all tab content
    panelRoot.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    // Deactivate all tab buttons
    panelRoot.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('border-red-600', 'text-red-600');
        el.classList.add('text-gray-500', 'border-transparent');
    });

    // Show the selected tab content and activate the button
    const contentToShow = panelRoot.querySelector(`#${tabName}-section`);
    const buttonToActivate = panelRoot.querySelector(`[data-tab="${tabName}"]`);
    if (contentToShow) contentToShow.style.display = 'block';
    if (buttonToActivate) {
        buttonToActivate.classList.add('border-red-600', 'text-red-600');
        buttonToActivate.classList.remove('text-gray-500', 'border-transparent');
        activeTab = tabName;
    }
}

/**
 * Fetches all necessary data (ingredients, recipes, orders) to populate the daily count.
 */
async function loadDailyCountData() {
    const dailyTbody = document.getElementById('daily-count-tbody');
    if (!dailyTbody) return;
    dailyTbody.innerHTML = '<tr><td colspan="9" class="text-center p-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading data for selected date...</td></tr>';
    
    // Get the previous day's date string
    const selectedDate = new Date(currentStockDate);
    selectedDate.setDate(selectedDate.getDate() - 1);
    const prevDateStr = selectedDate.toISOString().split('T')[0];

    try {
        // Fetch ingredients, recipes, previous day's stock, and today's orders all at once
        const [ingSnapshot, recSnapshot, prevStockSnapshot, ordersSnapshot] = await Promise.all([
            db.ref('ingredients').once('value'),
            db.ref('recipes').once('value'),
            db.ref(`stockCounts/${prevDateStr}`).once('value'),
            db.ref('orders').orderByChild('timestamp').startAt(currentStockDate).endAt(currentStockDate + '\uf8ff').once('value')
        ]);

        ingredientsCache = ingSnapshot.exists() ? ingSnapshot.val() : {};
        recipesCache = recSnapshot.exists() ? recSnapshot.val() : {};
        const prevStock = prevStockSnapshot.exists() ? prevStockSnapshot.val() : {};
        
        // --- Calculate Theoretical Usage from Today's Sales ---
        const theoreticalUsage = {};
        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val();
            for (const orderId in orders) {
                const order = orders[orderId];
                for (const item of order.items) {
                    const recipe = recipesCache[item.id]; // item.id should be the menu item's key
                    if (recipe && recipe.ingredients) {
                        for (const ingredientId in recipe.ingredients) {
                            const recipeIngredient = recipe.ingredients[ingredientId];
                            theoreticalUsage[ingredientId] = (theoreticalUsage[ingredientId] || 0) + (recipeIngredient.qty * item.quantity);
                        }
                    }
                }
            }
        }
        
        // --- Render the table ---
        if (Object.keys(ingredientsCache).length === 0) {
            dailyTbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-gray-500">No ingredients defined. Please add ingredients first.</td></tr>';
            return;
        }

        let tableHtml = '';
        for (const ingId in ingredientsCache) {
            const ingredient = ingredientsCache[ingId];
            const openingStock = prevStock[ingId]?.closing_actual ?? ingredient.stock_level ?? 0;
            const usedExpected = theoreticalUsage[ingId] || 0;
            
            tableHtml += `
                <tr data-id="${ingId}">
                    <td class="p-2 font-medium">${ingredient.name} <span class="text-xs text-gray-400">(${ingredient.unit})</span></td>
                    <td class="p-2 text-center" data-opening>${openingStock.toFixed(2)}</td>
                    <td class="p-2"><input type="number" step="0.1" value="0" class="daily-input purchases-input w-20 p-1 border rounded text-right"></td>
                    <td class="p-2 text-center" data-used>${usedExpected.toFixed(2)}</td>
                    <td class="p-2"><input type="number" step="0.1" value="0" class="daily-input wastage-input w-20 p-1 border rounded text-right"></td>
                    <td class="p-2 text-center font-bold" data-closing-theory">0.00</td>
                    <td class="p-2"><input type="number" step="0.1" class="daily-input closing-actual-input w-20 p-1 border rounded text-right bg-yellow-50"></td>
                    <td class="p-2 text-center font-semibold" data-variance">0.00</td>
                </tr>
            `;
        }
        dailyTbody.innerHTML = tableHtml;
        // Initial calculation for all rows
        dailyTbody.querySelectorAll('tr').forEach(calculateRow);

    } catch (error) {
        console.error("Error loading daily count data:", error);
        dailyTbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-red-500">Failed to load data.</td></tr>';
    }
}

/**
 * Calculates theoretical closing and variance for a single row in the daily count table.
 * @param {HTMLElement} row - The <tr> element to calculate.
 */
function calculateRow(row) {
    const opening = parseFloat(row.querySelector('[data-opening]').textContent) || 0;
    const purchases = parseFloat(row.querySelector('.purchases-input').value) || 0;
    const used = parseFloat(row.querySelector('[data-used]').textContent) || 0;
    const wastage = parseFloat(row.querySelector('.wastage-input').value) || 0;
    const closingActual = parseFloat(row.querySelector('.closing-actual-input').value) || 0;

    const closingTheoretical = opening + purchases - used - wastage;
    const variance = closingActual - closingTheoretical;

    const closingTheoryEl = row.querySelector('[data-closing-theory]');
    const varianceEl = row.querySelector('[data-variance]');
    
    closingTheoryEl.textContent = closingTheoretical.toFixed(2);
    varianceEl.textContent = variance.toFixed(2);

    // Color code the variance for easy reading
    varianceEl.classList.remove('text-green-600', 'text-red-600');
    if (variance > 0) {
        varianceEl.classList.add('text-green-600'); // Surplus
    } else if (variance < 0) {
        varianceEl.classList.add('text-red-600'); // Loss
    }
}


/**
 * Saves the entire daily stock count to Firebase.
 */
async function saveDailyCount() {
    const saveData = {};
    const rows = document.querySelectorAll('#daily-count-tbody tr[data-id]');
    
    rows.forEach(row => {
        const id = row.dataset.id;
        const opening = parseFloat(row.querySelector('[data-opening]').textContent);
        const purchases = parseFloat(row.querySelector('.purchases-input').value);
        const used_expected = parseFloat(row.querySelector('[data-used]').textContent);
        const wastage = parseFloat(row.querySelector('.wastage-input').value);
        const closing_theoretical = parseFloat(row.querySelector('[data-closing-theory]').textContent);
        const closing_actual = parseFloat(row.querySelector('.closing-actual-input').value);
        const variance = parseFloat(row.querySelector('[data-variance]').textContent);
        
        saveData[id] = {
            opening, purchases, used_expected, wastage,
            closing_theoretical, closing_actual, variance
        };
    });

    if (Object.keys(saveData).length > 0) {
        try {
            await db.ref(`stockCounts/${currentStockDate}`).set(saveData);
            alert(`Stock count for ${currentStockDate} saved successfully!`);
        } catch (error) {
            console.error("Error saving stock count:", error);
            alert("Failed to save stock count.");
        }
    }
}


// --- All previous ingredient management functions remain unchanged here ---
function createIngredientRow(ingredientId, ingredientData) {
    const { name, category, unit, unit_cost, supplier, low_stock_threshold } = ingredientData;
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
function closeIngredientModal() {
    ingredientModal.classList.add('hidden');
    editingIngredientId = null;
}
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
            ingredientData.last_restocked = new Date().toISOString();
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
    panelRoot = root;
    panelTitle.textContent = 'Stock & Sales Control';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="border-b mb-4">
                <nav class="flex space-x-4">
                    <button data-tab="ingredients" class="tab-button py-2 px-4 font-semibold">Ingredients</button>
                    <button data-tab="daily-count" class="tab-button py-2 px-4 font-semibold">Daily Count</button>
                </nav>
            </div>

            <div id="ingredients-section" class="tab-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Master Ingredient List</h3>
                    <button id="add-ingredient-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Ingredient
                    </button>
                </div>
                <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs font-semibold uppercase">Name</th><th class="p-3 text-left text-xs font-semibold uppercase">Category</th><th class="p-3 text-center text-xs font-semibold uppercase">Current Stock</th><th class="p-3 text-left text-xs font-semibold uppercase">Cost/Unit</th><th class="p-3 text-left text-xs font-semibold uppercase">Supplier</th><th class="p-3 text-center text-xs font-semibold uppercase">Actions</th></tr></thead><tbody id="ingredients-tbody" class="divide-y"></tbody></table></div>
            </div>

            <div id="daily-count-section" class="tab-content" style="display: none;">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Daily Stock Count</h3>
                        <input type="date" id="stock-date-picker" value="${currentStockDate}" class="mt-1 p-2 border rounded-md">
                    </div>
                    <button id="save-daily-count-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Save Today's Count</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-2 text-left">Ingredient</th>
                                <th class="p-2 text-center">Opening</th>
                                <th class="p-2 text-center">Purchases</th>
                                <th class="p-2 text-center">Used (Theory)</th>
                                <th class="p-2 text-center">Wastage</th>
                                <th class="p-2 text-center">Closing (Theory)</th>
                                <th class="p-2 text-center">Closing (Actual)</th>
                                <th class="p-2 text-center">Variance</th>
                            </tr>
                        </thead>
                        <tbody id="daily-count-tbody" class="divide-y"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="ingredient-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
           </div>
    `;

    // --- Assign UI elements and attach event listeners ---
    ingredientModal = panelRoot.querySelector('#ingredient-modal');
    ingredientForm = panelRoot.querySelector('#ingredient-form');
    modalTitle = panelRoot.querySelector('#modal-title');
    const ingredientsTbody = panelRoot.querySelector('#ingredients-tbody');

    panelRoot.querySelector('#add-ingredient-btn').addEventListener('click', () => openIngredientModal());
    panelRoot.querySelector('#cancel-modal-btn').addEventListener('click', closeIngredientModal);
    ingredientForm.addEventListener('submit', handleSaveIngredient);
    ingredientsTbody.addEventListener('click', handleTableClick);

    // Tab switching logic
    panelRoot.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
            if(tabName === 'daily-count'){
                loadDailyCountData();
            }
        });
    });
    
    // Daily count event listeners
    panelRoot.querySelector('#stock-date-picker').addEventListener('change', (e) => {
        currentStockDate = e.target.value;
        loadDailyCountData();
    });

    panelRoot.querySelector('#daily-count-tbody').addEventListener('input', (e) => {
        if (e.target.classList.contains('daily-input')) {
            calculateRow(e.target.closest('tr'));
        }
    });

    panelRoot.querySelector('#save-daily-count-btn').addEventListener('click', saveDailyCount);


    // Initial state
    switchTab('ingredients');
    loadAndRenderIngredients();
}