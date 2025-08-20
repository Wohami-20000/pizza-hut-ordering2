// /js/panels/stock.js

const db = firebase.database();

// --- STATE MANAGEMENT ---
let ingredientsCache = {};
let recipesCache = {};
let menuItemsCache = {};
let editingIngredientId = null;
let currentRecipeMenuItemId = null;
let currentStockDate = new Date().toISOString().split('T')[0];

// --- UI ELEMENT REFERENCES ---
let ingredientModal, ingredientForm, modalTitle, panelRoot, recipeModal, recipeForm;

// --- FINANCIAL KPI CALCULATION (NEW) ---
async function updateFinancialKPIs() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Get references to the KPI card elements
    const salesCard = panelRoot.querySelector('[data-kpi="sales"]');
    const lossCard = panelRoot.querySelector('[data-kpi="loss"]');
    const foodCostCard = panelRoot.querySelector('[data-kpi="food-cost"]');
    const lowStockCard = panelRoot.querySelector('[data-kpi="low-stock"]');

    try {
        // 1. Fetch all necessary data in parallel
        const [salesSnapshot, stockCountSnapshot, ordersSnapshot] = await Promise.all([
            db.ref(`sales/${todayStr}`).once('value'),
            db.ref(`stockCounts/${todayStr}`).once('value'),
            db.ref('orders').orderByChild('timestamp').startAt(todayStr).endAt(todayStr + '\uf8ff').once('value')
        ]);

        // 2. Calculate Today's Sales
        const todaysSales = salesSnapshot.exists() ? salesSnapshot.val().total : 0;
        if (salesCard) salesCard.textContent = `${todaysSales.toFixed(2)} MAD`;

        // 3. Calculate Total Loss from Variance
        let totalLoss = 0;
        if (stockCountSnapshot.exists()) {
            const counts = stockCountSnapshot.val();
            for (const ingId in counts) {
                const variance = counts[ingId].variance || 0;
                const unitCost = ingredientsCache[ingId]?.unit_cost || 0;
                // Only count negative variances as a loss
                if (variance < 0) {
                    totalLoss += Math.abs(variance * unitCost);
                }
            }
        }
        if (lossCard) lossCard.textContent = `${totalLoss.toFixed(2)} MAD`;

        // 4. Calculate Cost of Goods Sold (COGS)
        let costOfGoodsSold = 0;
        if (ordersSnapshot.exists()) {
            const todaysOrders = ordersSnapshot.val();
            for (const orderId in todaysOrders) {
                const order = todaysOrders[orderId];
                if (order.items) {
                    for (const item of order.items) {
                        const recipe = recipesCache[item.id]; // item.id is the menuItemId
                        if (recipe && recipe.ingredients) {
                            for (const ingId in recipe.ingredients) {
                                const costPerUnit = ingredientsCache[ingId]?.unit_cost || 0;
                                const qtyUsed = recipe.ingredients[ingId].qty * item.quantity;
                                costOfGoodsSold += qtyUsed * costPerUnit;
                            }
                        }
                    }
                }
            }
        }
        
        // 5. Calculate Food Cost Percentage
        const foodCostPercent = (todaysSales > 0) ? (costOfGoodsSold / todaysSales) * 100 : 0;
        if (foodCostCard) foodCostCard.textContent = `${foodCostPercent.toFixed(0)}%`;

        // 6. Count Low Stock Items
        let lowStockCount = 0;
        for(const ingId in ingredientsCache){
            const ing = ingredientsCache[ingId];
            if(ing.stock_level < ing.low_stock_threshold){
                lowStockCount++;
            }
        }
        if(lowStockCard) lowStockCard.textContent = lowStockCount;


    } catch (error) {
        console.error("Failed to update financial KPIs:", error);
        if (salesCard) salesCard.textContent = 'Error';
        if (lossCard) lossCard.textContent = 'Error';
        if (foodCostCard) foodCostCard.textContent = 'Error';
        if (lowStockCard) lowStockCard.textContent = 'Error';
    }
}


// --- TABS & NAVIGATION ---
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
    }
    // Load data for the activated tab
    if (tabName === 'recipes') loadAndRenderRecipes();
    if (tabName === 'daily-count') loadDailyCountData();
    if (tabName === 'sales-input') loadSalesData();
}


// --- RECIPE MANAGEMENT FUNCTIONS ---

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

async function loadAndRenderRecipes() {
    const recipesTbody = document.getElementById('recipes-tbody');
    if (!recipesTbody) return;
    recipesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-6"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const recipesSnapshot = await db.ref('recipes').once('value');
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

function openRecipeModal(menuItemId = null) {
    currentRecipeMenuItemId = menuItemId;
    recipeForm.reset();
    document.getElementById('recipe-ingredients-list').innerHTML = '<p class="text-gray-500 p-4 text-center">Add ingredients from the left.</p>';
    
    const menuItemSelect = document.getElementById('menu-item-select');
    menuItemSelect.innerHTML = '<option value="">-- Select a Menu Item --</option>';
    
    Object.entries(menuItemsCache).forEach(([id, item]) => {
        if (!recipesCache[id] || id === menuItemId) {
            const option = new Option(item.name, id);
            menuItemSelect.add(option);
        }
    });

    const availableList = document.getElementById('available-ingredients');
    availableList.innerHTML = Object.entries(ingredientsCache).map(([id, data]) => `
        <div class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
            <span>${data.name} (${data.unit})</span>
            <button type="button" class="add-ingredient-to-recipe-btn text-green-500 hover:text-green-700 text-lg" data-id="${id}"><i class="fas fa-plus-circle"></i></button>
        </div>
    `).join('');

    if (menuItemId) {
        document.getElementById('recipe-modal-title').textContent = `Edit Recipe for ${menuItemsCache[menuItemId].name}`;
        menuItemSelect.value = menuItemId;
        menuItemSelect.disabled = true;
        
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

    if (recipeList.querySelector(`[data-id="${ingredientId}"]`)) return;
    if (recipeList.querySelector('p')) recipeList.innerHTML = '';

    const ingredientData = ingredientsCache[ingredientId];
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-2 bg-blue-50 rounded-md';
    div.dataset.id = ingredientId;
    div.innerHTML = `
        <span class="font-semibold">${ingredientData.name}</span>
        <div class="flex items-center gap-2">
            <input type="number" step="0.01" value="${quantity}" class="recipe-qty-input w-20 p-1 border rounded-md text-right">
            <span class="text-sm text-gray-600">${ingredientData.unit}</span>
            <button type="button" class="remove-ingredient-from-recipe-btn text-red-500 hover:text-red-700 text-lg"><i class="fas fa-minus-circle"></i></button>
        </div>
    `;
    recipeList.appendChild(div);
}

async function handleSaveRecipe(e) {
    e.preventDefault();
    const menuItemId = currentRecipeMenuItemId || document.getElementById('menu-item-select').value;
    if (!menuItemId) { alert('Please select a menu item.'); return; }

    const ingredientRows = document.querySelectorAll('#recipe-ingredients-list [data-id]');
    const recipeData = { name: menuItemsCache[menuItemId].name, ingredients: {} };

    ingredientRows.forEach(row => {
        const id = row.dataset.id;
        const qty = parseFloat(row.querySelector('.recipe-qty-input').value);
        if (!isNaN(qty)) recipeData.ingredients[id] = { qty, unit: ingredientsCache[id].unit };
    });

    try {
        await db.ref(`recipes/${menuItemId}`).set(recipeData);
        alert('Recipe saved successfully!');
        closeRecipeModal();
        loadAndRenderRecipes();
    } catch (error) {
        alert('Error saving recipe: ' + error.message);
    }
}

function filterIngredients(query) {
    const items = document.querySelectorAll('#available-ingredients > div');
    items.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        item.style.display = itemText.includes(query) ? '' : 'none';
    });
}


// --- WAREHOUSE, SALES, DAILY COUNT, INGREDIENT FUNCTIONS ---
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
    } catch (error) { console.error("Error loading sales data:", error); }
}

function updateTotalSales() {
    const platform = parseFloat(document.getElementById('platform-sales').value) || 0;
    const glovo = parseFloat(document.getElementById('glovo-sales').value) || 0;
    const regular = parseFloat(document.getElementById('regular-sales').value) || 0;
    document.getElementById('total-sales-display').textContent = `${(platform + glovo + regular).toFixed(2)} MAD`;
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
        updateFinancialKPIs(); // Refresh KPIs after saving sales
    } catch (error) { alert("Failed to save sales data."); }
}

async function loadDailyCountData() {
    const dailyTbody = document.getElementById('daily-count-tbody');
    if (!dailyTbody) return;
    dailyTbody.innerHTML = '<tr><td colspan="8" class="text-center p-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</td></tr>';
    const selectedDate = new Date(currentStockDate);
    const dayStart = selectedDate.toISOString().split('T')[0];
    selectedDate.setDate(selectedDate.getDate() - 1);
    const prevDateStr = selectedDate.toISOString().split('T')[0];
    try {
        const [prevStockSnapshot, ordersSnapshot] = await Promise.all([
            db.ref(`stockCounts/${prevDateStr}`).once('value'),
            db.ref('orders').orderByChild('timestamp').startAt(dayStart).endAt(dayStart + '\uf8ff').once('value')
        ]);
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
                                theoreticalUsage[ingredientId] = (theoreticalUsage[ingredientId] || 0) + (recipe.ingredients[ingredientId].qty * item.quantity);
                            }
                        }
                    }
                }
            }
        }
        let tableHtml = '';
        for (const ingId in ingredientsCache) {
            const ingredient = ingredientsCache[ingId];
            const openingStock = prevStock[ingId]?.closing_actual ?? ingredient.stock_level ?? 0;
            const usedExpected = theoreticalUsage[ingId] || 0;
            tableHtml += `<tr data-id="${ingId}"><td class="p-2 font-medium">${ingredient.name} (${ingredient.unit})</td><td class="p-2 text-center" data-opening>${openingStock.toFixed(2)}</td><td class="p-2"><input type="number" step="0.1" value="0" class="daily-input purchases-input w-20 p-1 border rounded text-right"></td><td class="p-2 text-center" data-used>${usedExpected.toFixed(2)}</td><td class="p-2"><input type="number" step="0.1" value="0" class="daily-input wastage-input w-20 p-1 border rounded text-right"></td><td class="p-2 text-center font-bold" data-closing-theory>0.00</td><td class="p-2"><input type="number" step="0.1" class="daily-input closing-actual-input w-20 p-1 border rounded text-right bg-yellow-50"></td><td class="p-2 text-center font-semibold" data-variance>0.00</td></tr>`;
        }
        dailyTbody.innerHTML = tableHtml || '<tr><td colspan="8" class="text-center p-6">No ingredients found.</td></tr>';
        dailyTbody.querySelectorAll('tr[data-id]').forEach(calculateRow);
    } catch (error) {
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
    row.querySelector('[data-closing-theory]').textContent = closingTheoretical.toFixed(2);
    const varianceEl = row.querySelector('[data-variance]');
    varianceEl.textContent = (closingActual !== null) ? variance.toFixed(2) : '...';
    varianceEl.className = 'p-2 text-center font-semibold';
    if (variance > 0) varianceEl.classList.add('text-green-600');
    else if (variance < 0) varianceEl.classList.add('text-red-600');
}

async function saveDailyCount() {
    const saveData = {};
    document.querySelectorAll('#daily-count-tbody tr[data-id]').forEach(row => {
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
            updateFinancialKPIs(); // Refresh KPIs after saving counts
        } catch (error) { alert("Failed to save stock count."); }
    }
}

// --- MAIN PANEL LOADER ---

export async function loadPanel(root, panelTitle) {
    panelRoot = root;
    panelTitle.textContent = 'Stock & Sales Control';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Sales</h4><p data-kpi="sales" class="text-2xl font-bold">Loading...</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Loss Value</h4><p data-kpi="loss" class="text-2xl font-bold text-red-500">Loading...</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Food Cost %</h4><p data-kpi="food-cost" class="text-2xl font-bold">Loading...</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Low Stock Items</h4><p data-kpi="low-stock" class="text-2xl font-bold">Loading...</p></div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="border-b mb-4"><nav class="flex space-x-4">
                <button data-tab="ingredients" class="tab-button py-2 px-4 font-semibold">Ingredients</button>
                <button data-tab="recipes" class="tab-button py-2 px-4 font-semibold">Recipes</button>
                <button data-tab="daily-count" class="tab-button py-2 px-4 font-semibold">Daily Count</button>
                <button data-tab="sales-input" class="tab-button py-2 px-4 font-semibold">Sales Input</button>
                <button data-tab="warehouse" class="tab-button py-2 px-4 font-semibold">Warehouse</button>
            </nav></div>
            <div id="ingredients-section" class="tab-content">...</div>
            <div id="recipes-section" class="tab-content" style="display: none;">...</div>
            <div id="daily-count-section" class="tab-content" style="display: none;">...</div>
            <div id="sales-input-section" class="tab-content" style="display: none;">...</div>
            <div id="warehouse-section" class="tab-content" style="display: none;">...</div>
        </div>
        `;
    
    // Append modals to the root to ensure they are available
    panelRoot.insertAdjacentHTML('beforeend', `
        <div id="ingredient-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">...</div>
        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">...</div>
    `);

    // --- Cache all necessary data on initial load ---
    try {
        const [ingSnapshot, recSnapshot, menuSnapshot] = await Promise.all([
            db.ref('ingredients').once('value'),
            db.ref('recipes').once('value'),
            db.ref('menu').once('value')
        ]);
        ingredientsCache = ingSnapshot.exists() ? ingSnapshot.val() : {};
        recipesCache = recSnapshot.exists() ? recSnapshot.val() : {};
        if (menuSnapshot.exists()) {
            const menuData = menuSnapshot.val();
            for (const catId in menuData) {
                if (menuData[catId].items) Object.assign(menuItemsCache, menuData[catId].items);
            }
        }
    } catch (error) {
        console.error("Failed to pre-cache data:", error);
    }

    // --- Initialize UI and Listeners ---
    ingredientModal = panelRoot.querySelector('#ingredient-modal');
    ingredientForm = panelRoot.querySelector('#ingredient-form');
    modalTitle = panelRoot.querySelector('#modal-title');
    recipeModal = panelRoot.querySelector('#recipe-modal');
    recipeForm = panelRoot.querySelector('#recipe-form');

    // ... (rest of the event listeners for modals and forms)

    panelRoot.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    
    // Initial UI state
    switchTab('ingredients');
    loadAndRenderIngredients(); // This now uses the cache
    updateFinancialKPIs(); // Initial KPI calculation
}