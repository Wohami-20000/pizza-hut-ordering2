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
 */
function switchTab(tabName) {
    if (!panelRoot) return;
    panelRoot.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    panelRoot.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('border-red-600', 'text-red-600');
        el.classList.add('text-gray-500', 'border-transparent');
    });

    const contentToShow = panelRoot.querySelector(`#${tabName}-section`);
    const buttonToActivate = panelRoot.querySelector(`[data-tab="${tabName}"]`);
    if (contentToShow) contentToShow.style.display = 'block';
    if (buttonToActivate) {
        buttonToActivate.classList.add('border-red-600', 'text-red-600');
        buttonToActivate.classList.remove('text-gray-500', 'border-transparent');
        activeTab = tabName;
    }
}

// --- WAREHOUSE FUNCTIONS ---
function addWarehouseItemRow() {
    const container = document.getElementById('warehouse-items-container');
    const ingredientOptions = Object.entries(ingredientsCache).map(([id, data]) => 
        `<option value="${id}">${data.name} (${data.unit})</option>`
    ).join('');

    const div = document.createElement('div');
    div.className = 'grid grid-cols-4 gap-2 items-center';
    div.innerHTML = `
        <select class="warehouse-item-select col-span-2 p-2 border rounded-md bg-white">${ingredientOptions}</select>
        <input type="number" step="0.1" placeholder="Quantity" class="warehouse-item-qty p-2 border rounded-md">
        <div class="flex items-center">
            <input type="number" step="0.01" placeholder="Cost/Unit" class="warehouse-item-cost p-2 border rounded-md w-full">
            <button type="button" class="remove-warehouse-item-btn text-red-500 ml-2"><i class="fas fa-times-circle"></i></button>
        </div>
    `;
    container.appendChild(div);
    div.querySelector('.remove-warehouse-item-btn').addEventListener('click', () => div.remove());
}
async function saveWarehouseDelivery(e) {
    e.preventDefault();
    const deliveryData = {
        date: document.getElementById('warehouse-date').value,
        supplier: document.getElementById('warehouse-supplier').value,
        items: {},
        total_cost: 0
    };
    const itemRows = document.querySelectorAll('#warehouse-items-container > div');
    if (itemRows.length === 0) {
        alert("Please add at least one ingredient to the delivery.");
        return;
    }
    const stockUpdates = {};
    let totalCost = 0;
    itemRows.forEach(row => {
        const id = row.querySelector('.warehouse-item-select').value;
        const qty = parseFloat(row.querySelector('.warehouse-item-qty').value) || 0;
        const unit_cost = parseFloat(row.querySelector('.warehouse-item-cost').value) || 0;
        const total = qty * unit_cost;
        if (id && qty > 0) {
            deliveryData.items[id] = { qty, unit_cost, total };
            totalCost += total;
            stockUpdates[`/ingredients/${id}/stock_level`] = firebase.database.ServerValue.increment(qty);
            stockUpdates[`/ingredients/${id}/last_restocked`] = deliveryData.date;
        }
    });
    deliveryData.total_cost = totalCost;
    try {
        await db.ref('warehouse').push(deliveryData);
        await db.ref().update(stockUpdates);
        alert('Warehouse delivery saved and stock levels updated!');
        document.getElementById('warehouse-form').reset();
        document.getElementById('warehouse-items-container').innerHTML = '';
    } catch (error) {
        console.error("Error saving warehouse delivery:", error);
        alert("Failed to save delivery.");
    }
}

// --- All other functions remain unchanged ---
async function loadSalesData() {
    const salesDate = document.getElementById('sales-date-picker').value;
    const salesRef = db.ref(`sales/${salesDate}`);
    try {
        const snapshot = await salesRef.once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('platform-sales').value = data.platform || 0;
            document.getElementById('glovo-sales').value = data.glovo || 0;
            document.getElementById('regular-sales').value = data.regular || 0;
            updateTotalSales();
        } else {
            document.getElementById('sales-form').reset();
            updateTotalSales();
        }
    } catch (error) {
        console.error("Error loading sales data:", error);
        alert("Could not load sales data.");
    }
}
function updateTotalSales() {
    const platform = parseFloat(document.getElementById('platform-sales').value) || 0;
    const glovo = parseFloat(document.getElementById('glovo-sales').value) || 0;
    const regular = parseFloat(document.getElementById('regular-sales').value) || 0;
    const total = platform + glovo + regular;
    document.getElementById('total-sales-display').textContent = `${total.toFixed(2)} MAD`;
}
async function saveSalesData(e) {
    e.preventDefault();
    const salesDate = document.getElementById('sales-date-picker').value;
    const salesData = {
        platform: parseFloat(document.getElementById('platform-sales').value) || 0,
        glovo: parseFloat(document.getElementById('glovo-sales').value) || 0,
        regular: parseFloat(document.getElementById('regular-sales').value) || 0,
        total: 0
    };
    salesData.total = salesData.platform + salesData.glovo + salesData.regular;
    try {
        await db.ref(`sales/${salesDate}`).set(salesData);
        alert(`Sales for ${salesDate} saved successfully!`);
    } catch (error) {
        console.error("Error saving sales data:", error);
        alert("Failed to save sales data.");
    }
}
async function loadDailyCountData() {
    const dailyTbody = document.getElementById('daily-count-tbody');
    if (!dailyTbody) return;
    dailyTbody.innerHTML = '<tr><td colspan="8" class="text-center p-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading data for selected date...</td></tr>';
    const selectedDate = new Date(currentStockDate);
    selectedDate.setDate(selectedDate.getDate());
    const dayStart = selectedDate.toISOString().split('T')[0];
    selectedDate.setDate(selectedDate.getDate() - 1);
    const prevDateStr = selectedDate.toISOString().split('T')[0];
    try {
        const [ingSnapshot, recSnapshot, prevStockSnapshot, ordersSnapshot] = await Promise.all([db.ref('ingredients').once('value'), db.ref('recipes').once('value'), db.ref(`stockCounts/${prevDateStr}`).once('value'), db.ref('orders').orderByChild('timestamp').startAt(dayStart).endAt(dayStart + '\uf8ff').once('value')]);
        ingredientsCache = ingSnapshot.exists() ? ingSnapshot.val() : {};
        recipesCache = recSnapshot.exists() ? recSnapshot.val() : {};
        const prevStock = prevStockSnapshot.exists() ? prevStockSnapshot.val() : {};
        const theoreticalUsage = {};
        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val();
            for (const orderId in orders) {
                const order = orders[orderId];
                if (order.items) {
                    for (const item of order.items) {
                        const recipe = recipesCache[item.id];
                        if (recipe && recipe.ingredients) {
                            for (const ingredientId in recipe.ingredients) {
                                const recipeIngredient = recipe.ingredients[ingredientId];
                                theoreticalUsage[ingredientId] = (theoreticalUsage[ingredientId] || 0) + (recipeIngredient.qty * item.quantity);
                            }
                        }
                    }
                }
            }
        }
        if (Object.keys(ingredientsCache).length === 0) {
            dailyTbody.innerHTML = '<tr><td colspan="8" class="text-center p-6 text-gray-500">No ingredients defined. Please add ingredients first.</td></tr>';
            return;
        }
        let tableHtml = '';
        for (const ingId in ingredientsCache) {
            const ingredient = ingredientsCache[ingId];
            const openingStock = prevStock[ingId]?.closing_actual ?? ingredient.stock_level ?? 0;
            const usedExpected = theoreticalUsage[ingId] || 0;
            tableHtml += `<tr data-id="${ingId}"><td class="p-2 font-medium">${ingredient.name} <span class="text-xs text-gray-400">(${ingredient.unit})</span></td><td class="p-2 text-center" data-opening>${openingStock.toFixed(2)}</td><td class="p-2"><input type="number" step="0.1" value="0" class="daily-input purchases-input w-20 p-1 border rounded text-right"></td><td class="p-2 text-center" data-used>${usedExpected.toFixed(2)}</td><td class="p-2"><input type="number" step="0.1" value="0" class="daily-input wastage-input w-20 p-1 border rounded text-right"></td><td class="p-2 text-center font-bold" data-closing-theory>0.00</td><td class="p-2"><input type="number" step="0.1" class="daily-input closing-actual-input w-20 p-1 border rounded text-right bg-yellow-50"></td><td class="p-2 text-center font-semibold" data-variance>0.00</td></tr>`;
        }
        dailyTbody.innerHTML = tableHtml;
        dailyTbody.querySelectorAll('tr').forEach(calculateRow);
    } catch (error) {
        console.error("Error loading daily count data:", error);
        dailyTbody.innerHTML = '<tr><td colspan="8" class="text-center p-6 text-red-500">Failed to load data.</td></tr>';
    }
}
function calculateRow(row) {
    const opening = parseFloat(row.querySelector('[data-opening]').textContent) || 0;
    const purchases = parseFloat(row.querySelector('.purchases-input').value) || 0;
    const used = parseFloat(row.querySelector('[data-used]').textContent) || 0;
    const wastage = parseFloat(row.querySelector('.wastage-input').value) || 0;
    const closingActualInput = row.querySelector('.closing-actual-input');
    const closingActual = closingActualInput.value === '' ? null : parseFloat(closingActualInput.value);
    const closingTheoretical = opening + purchases - used - wastage;
    const variance = (closingActual !== null) ? closingActual - closingTheoretical : 0;
    const closingTheoryEl = row.querySelector('[data-closing-theory]');
    const varianceEl = row.querySelector('[data-variance]');
    if (closingTheoryEl) closingTheoryEl.textContent = closingTheoretical.toFixed(2);
    if (varianceEl) varianceEl.textContent = (closingActual !== null) ? variance.toFixed(2) : '...';
    if (varianceEl) {
        varianceEl.classList.remove('text-green-600', 'text-red-600');
        if (variance > 0) varianceEl.classList.add('text-green-600');
        else if (variance < 0) varianceEl.classList.add('text-red-600');
    }
}
async function saveDailyCount() {
    const saveData = {};
    const rows = document.querySelectorAll('#daily-count-tbody tr[data-id]');
    rows.forEach(row => {
        const id = row.dataset.id;
        saveData[id] = {
            opening: parseFloat(row.querySelector('[data-opening]').textContent),
            purchases: parseFloat(row.querySelector('.purchases-input').value),
            used_expected: parseFloat(row.querySelector('[data-used]').textContent),
            wastage: parseFloat(row.querySelector('.wastage-input').value),
            closing_theoretical: parseFloat(row.querySelector('[data-closing-theory]').textContent),
            closing_actual: parseFloat(row.querySelector('.closing-actual-input').value),
            variance: parseFloat(row.querySelector('[data-variance]').textContent)
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
function createIngredientRow(ingredientId, ingredientData) {
    const { name, category, unit, unit_cost, supplier, low_stock_threshold } = ingredientData;
    const isLowStock = ingredientData.stock_level && low_stock_threshold && ingredientData.stock_level < low_stock_threshold;
    return `<tr class="hover:bg-gray-50 transition ${isLowStock ? 'bg-yellow-50' : ''}" data-id="${ingredientId}"><td class="p-3 font-medium text-gray-800">${name || 'N/A'}</td><td class="p-3 text-sm text-gray-600">${category || 'N/A'}</td><td class="p-3 text-sm text-center">${ingredientData.stock_level || 0} ${unit || ''}</td><td class="p-3 text-sm">${(unit_cost || 0).toFixed(2)} MAD</td><td class="p-3 text-sm text-gray-500">${supplier || 'N/A'}</td><td class="p-3 text-center"><button class="edit-ingredient-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button><button class="delete-ingredient-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button></td></tr>`;
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
    const ingredientData = { name: document.getElementById('ingredient-name').value.trim(), category: document.getElementById('ingredient-category').value.trim(), unit: document.getElementById('ingredient-unit').value.trim(), unit_cost: parseFloat(document.getElementById('ingredient-unit-cost').value) || 0, supplier: document.getElementById('ingredient-supplier').value.trim(), stock_level: parseFloat(document.getElementById('ingredient-stock-level').value) || 0, low_stock_threshold: parseFloat(document.getElementById('low-stock-threshold').value) || 0 };
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
        if (!ingredientsTbody) return;
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
            db.ref(`ingredients/${ingredientId}`).remove().catch(err => alert('Error deleting ingredient: ' + err.message));
        }
    }
}


export function loadPanel(root, panelTitle) {
    panelRoot = root;
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
                    <button data-tab="ingredients" class="tab-button py-2 px-4 font-semibold">Ingredients</button>
                    <button data-tab="daily-count" class="tab-button py-2 px-4 font-semibold">Daily Count</button>
                    <button data-tab="sales-input" class="tab-button py-2 px-4 font-semibold">Sales Input</button>
                    <button data-tab="warehouse" class="tab-button py-2 px-4 font-semibold">Warehouse</button>
                </nav>
            </div>

            <div id="ingredients-section" class="tab-content">
                <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-gray-800">Master Ingredient List</h3><button id="add-ingredient-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition"><i class="fas fa-plus mr-2"></i>Add Ingredient</button></div>
                <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs font-semibold uppercase">Name</th><th class="p-3 text-left text-xs font-semibold uppercase">Category</th><th class="p-3 text-center text-xs font-semibold uppercase">Current Stock</th><th class="p-3 text-left text-xs font-semibold uppercase">Cost/Unit</th><th class="p-3 text-left text-xs font-semibold uppercase">Supplier</th><th class="p-3 text-center text-xs font-semibold uppercase">Actions</th></tr></thead><tbody id="ingredients-tbody" class="divide-y"></tbody></table></div>
            </div>

            <div id="daily-count-section" class="tab-content" style="display: none;">
                <div class="flex justify-between items-center mb-4"><div><h3 class="text-xl font-bold text-gray-800">Daily Stock Count</h3><input type="date" id="stock-date-picker" value="${currentStockDate}" class="mt-1 p-2 border rounded-md"></div><button id="save-daily-count-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Save Today's Count</button></div>
                <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Ingredient</th><th class="p-2 text-center">Opening</th><th class="p-2 text-center">Purchases</th><th class="p-2 text-center">Used (Theory)</th><th class="p-2 text-center">Wastage</th><th class="p-2 text-center">Closing (Theory)</th><th class="p-2 text-center">Closing (Actual)</th><th class="p-2 text-center">Variance</th></tr></thead><tbody id="daily-count-tbody" class="divide-y"></tbody></table></div>
            </div>

            <div id="sales-input-section" class="tab-content" style="display: none;">
                <div class="flex justify-between items-center mb-4"><div><h3 class="text-xl font-bold text-gray-800">Daily Sales Input</h3><input type="date" id="sales-date-picker" value="${currentStockDate}" class="mt-1 p-2 border rounded-md"></div></div>
                <form id="sales-form" class="max-w-md space-y-4"><label for="platform-sales" class="block font-medium">Platform Sales (MAD)</label><input type="number" id="platform-sales" class="w-full mt-1 p-2 border rounded-md" value="0" step="0.01"><div><label for="glovo-sales" class="block font-medium">Glovo Sales (MAD)</label><input type="number" id="glovo-sales" class="w-full mt-1 p-2 border rounded-md" value="0" step="0.01"></div><div><label for="regular-sales" class="block font-medium">Regular/In-House Sales (MAD)</label><input type="number" id="regular-sales" class="w-full mt-1 p-2 border rounded-md" value="0" step="0.01"></div><div class="border-t pt-4"><p class="text-lg font-bold">Total Sales: <span id="total-sales-display">0.00 MAD</span></p></div><button type="submit" id="save-sales-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Save Sales Data</button></form>
            </div>

            <div id="warehouse-section" class="tab-content" style="display: none;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Log New Warehouse Delivery</h3>
                <form id="warehouse-form" class="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="warehouse-date" class="block text-sm font-medium">Delivery Date</label><input type="date" id="warehouse-date" value="${currentStockDate}" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="warehouse-supplier" class="block text-sm font-medium">Supplier</label><input type="text" id="warehouse-supplier" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., Supplier A"></div></div>
                    <div class="border-t pt-4"><label class="block text-sm font-medium mb-2">Delivered Items</label><div id="warehouse-items-container" class="space-y-2"></div><button type="button" id="add-warehouse-item-btn" class="mt-2 bg-gray-200 text-sm py-1 px-3 rounded-md hover:bg-gray-300"><i class="fas fa-plus mr-1"></i>Add Item</button></div>
                    <div class="flex justify-end pt-4"><button type="submit" class="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">Save Delivery</button></div>
                </form>
            </div>
        </div>

        <div id="ingredient-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg"><h3 id="modal-title" class="text-2xl font-bold text-gray-800 mb-4">Add New Ingredient</h3><form id="ingredient-form" class="space-y-4"><div><label for="ingredient-name" class="block text-sm font-medium">Ingredient Name</label><input type="text" id="ingredient-name" required class="w-full mt-1 p-2 border rounded-md"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-category" class="block text-sm font-medium">Category</label><input type="text" id="ingredient-category" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., Dairy, Meat, Vegetable"></div><div><label for="ingredient-unit" class="block text-sm font-medium">Unit</label><input type="text" id="ingredient-unit" required class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., kg, L, pcs"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-unit-cost" class="block text-sm font-medium">Cost per Unit (MAD)</label><input type="number" id="ingredient-unit-cost" step="0.01" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="ingredient-supplier" class="block text-sm font-medium">Supplier</label><input type="text" id="ingredient-supplier" class="w-full mt-1 p-2 border rounded-md"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-stock-level" class="block text-sm font-medium">Initial Stock Level</label><input type="number" id="ingredient-stock-level" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="low-stock-threshold" class="block text-sm font-medium">Low Stock Threshold</label><input type="number" id="low-stock-threshold" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div></div><div class="flex justify-end gap-4 pt-4"><button type="button" id="cancel-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Ingredient</button></div></form></div>
        </div>
    `;

    // --- Attach Event Listeners Safely ---
    ingredientModal = panelRoot.querySelector('#ingredient-modal');
    ingredientForm = panelRoot.querySelector('#ingredient-form');
    modalTitle = panelRoot.querySelector('#modal-title');
    
    panelRoot.querySelector('#add-ingredient-btn')?.addEventListener('click', () => openIngredientModal());
    panelRoot.querySelector('#cancel-modal-btn')?.addEventListener('click', closeIngredientModal);
    if(ingredientForm) ingredientForm.addEventListener('submit', handleSaveIngredient);
    panelRoot.querySelector('#ingredients-tbody')?.addEventListener('click', handleTableClick);

    panelRoot.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
            if (tabName === 'daily-count') loadDailyCountData();
            if (tabName === 'sales-input') loadSalesData();
        });
    });
    
    panelRoot.querySelector('#stock-date-picker')?.addEventListener('change', (e) => { currentStockDate = e.target.value; loadDailyCountData(); });
    panelRoot.querySelector('#daily-count-tbody')?.addEventListener('input', (e) => { if (e.target.classList.contains('daily-input')) calculateRow(e.target.closest('tr')); });
    panelRoot.querySelector('#save-daily-count-btn')?.addEventListener('click', saveDailyCount);
    
    panelRoot.querySelector('#sales-date-picker')?.addEventListener('change', loadSalesData);
    panelRoot.querySelector('#sales-form')?.addEventListener('input', updateTotalSales);
    panelRoot.querySelector('#sales-form')?.addEventListener('submit', saveSalesData);

    const addWarehouseItemBtn = panelRoot.querySelector('#add-warehouse-item-btn');
    if(addWarehouseItemBtn) addWarehouseItemBtn.addEventListener('click', addWarehouseItemRow);
    const warehouseForm = panelRoot.querySelector('#warehouse-form');
    if(warehouseForm) warehouseForm.addEventListener('submit', saveWarehouseDelivery);

    switchTab('ingredients');
    loadAndRenderIngredients();
}