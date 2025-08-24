// /js/panels/stock.js

const db = firebase.database();

// --- STATE MANAGEMENT ---
let ingredientsCache = {};
let recipesCache = {};
let menuItemsCache = {};
let editingIngredientId = null;
let currentRecipeMenuItemId = null;
let currentStockDate = new Date().toISOString().split('T')[0];
let charts = {}; // To hold chart instances

// --- UI ELEMENT REFERENCES ---
let ingredientModal, ingredientForm, modalTitle, panelRoot, recipeModal, recipeForm, reportModal;

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
    if (tabName === 'analytics') loadAnalyticsReports();
    if (tabName === 'alerts') checkAndDisplayAlerts(); // Load alerts when tab is clicked
}

// --- ALERTS & NOTIFICATIONS ---
async function checkAndDisplayAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    alertsContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2">Checking for alerts...</p></div>`;

    let alertsHtml = '';
    const today = new Date().toISOString().split('T')[0];

    try {
        const [ingredientsSnapshot, stockCountSnapshot] = await Promise.all([
            db.ref('ingredients').once('value'),
            db.ref(`stockCounts/${today}`).once('value')
        ]);

        const ingredients = ingredientsSnapshot.val() || {};
        const stockCounts = stockCountSnapshot.val() || {};

        // 1. Low Stock Alerts
        let lowStockAlerts = '';
        for (const id in ingredients) {
            const ing = ingredients[id];
            if (ing.stock_level < ing.low_stock_threshold) {
                lowStockAlerts += `<li class="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"><strong>Low Stock:</strong> ${ing.name} is at ${ing.stock_level} ${ing.unit} (Threshold: ${ing.low_stock_threshold} ${ing.unit}).</li>`;
            }
        }
        if (lowStockAlerts) {
            alertsHtml += `<div><h4 class="font-bold text-lg mb-2 text-yellow-700">Low Stock Warnings</h4><ul class="space-y-2">${lowStockAlerts}</ul></div>`;
        }

        // 2. High Variance Alerts
        let highVarianceAlerts = '';
        for (const id in stockCounts) {
            const count = stockCounts[id];
            const ingredient = ingredients[id];
            if (ingredient && count.variance < 0) { // Only show negative variances as alerts
                 const variancePercentage = (Math.abs(count.variance) / count.opening) * 100;
                 if(variancePercentage > 5) { // Example threshold: 5% variance
                    highVarianceAlerts += `<li class="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg"><strong>High Variance:</strong> ${ingredient.name} has a variance of ${count.variance.toFixed(2)} ${ingredient.unit} (${variancePercentage.toFixed(1)}% loss).</li>`;
                 }
            }
        }
         if (highVarianceAlerts) {
            alertsHtml += `<div><h4 class="font-bold text-lg mb-2 text-red-700">High Variance Alerts (Today)</h4><ul class="space-y-2">${highVarianceAlerts}</ul></div>`;
        }


        alertsContainer.innerHTML = alertsHtml || '<p class="text-center text-gray-500 p-8">No alerts to show right now. Everything looks good!</p>';

    } catch (error) {
        console.error("Error checking alerts:", error);
        alertsContainer.innerHTML = `<p class="text-red-500">Could not check for alerts: ${error.message}</p>`;
    }
}


// --- FINANCIAL KPI CALCULATIONS ---
async function updateFinancialKPIs() {
    const today = new Date().toISOString().split('T')[0];
    const salesRef = db.ref(`sales/${today}`);
    const stockCountRef = db.ref(`stockCounts/${today}`);
    const ingredientsRef = db.ref('ingredients');

    try {
        const [salesSnapshot, stockCountSnapshot, ingredientsSnapshot] = await Promise.all([
            salesRef.once('value'),
            stockCountRef.once('value'),
            ingredientsRef.once('value')
        ]);

        const salesData = salesSnapshot.exists() ? salesSnapshot.val() : { total: 0 };
        const stockCountData = stockCountSnapshot.exists() ? stockCountSnapshot.val() : {};
        const ingredientsData = ingredientsSnapshot.exists() ? ingredientsSnapshot.val() : {};

        let totalSales = salesData.total || 0;
        let ingredientCost = 0;
        let totalLossValue = 0;
        let lowStockItems = 0;

        for (const id in ingredientsData) {
            const ingredient = ingredientsData[id];
            if (ingredient.stock_level < ingredient.low_stock_threshold) {
                lowStockItems++;
            }
        }

        for (const ingId in stockCountData) {
            const count = stockCountData[ingId];
            const ingredient = ingredientsData[ingId];
            if (ingredient) {
                ingredientCost += count.used_expected * (ingredient.unit_cost || 0);
                if (count.variance < 0) {
                    totalLossValue += Math.abs(count.variance) * (ingredient.unit_cost || 0);
                }
            }
        }

        const foodCostPercentage = totalSales > 0 ? (ingredientCost / totalSales) * 100 : 0;
        
        panelRoot.querySelector('#todays-sales').textContent = `${totalSales.toFixed(2)} MAD`;
        panelRoot.querySelector('#todays-loss').textContent = `${totalLossValue.toFixed(2)} MAD`;
        panelRoot.querySelector('#food-cost').textContent = `${foodCostPercentage.toFixed(2)}%`;
        panelRoot.querySelector('#low-stock-items').textContent = lowStockItems;

    } catch (error) {
        console.error("Error updating financial KPIs:", error);
    }
}

// --- ANALYTICS & REPORTING ---
function destroyCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

async function loadAnalyticsReports() {
    destroyCharts();
    const container = document.getElementById('analytics-container');
    if (!container) return;
    container.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2">Loading analytics data...</p></div>`;

    try {
        const [salesSnapshot, stockCountsSnapshot, ingredientsSnapshot] = await Promise.all([
            db.ref('sales').once('value'),
            db.ref('stockCounts').once('value'),
            db.ref('ingredients').once('value')
        ]);

        const sales = salesSnapshot.val() || {};
        const stockCounts = stockCountsSnapshot.val() || {};
        const ingredients = ingredientsSnapshot.val() || {};

        renderWeeklyReport(sales, stockCounts, ingredients);
        renderMonthlyReport(sales, stockCounts, ingredients);
        renderYearlyReport(sales, stockCounts, ingredients);
        
    } catch (error) {
        console.error("Error loading analytics:", error);
        container.innerHTML = `<p class="text-red-500">Could not load analytics: ${error.message}</p>`;
    }
}

function renderWeeklyReport(sales, stockCounts, ingredients) {
    const weeklyContainer = document.getElementById('weekly-report-container');
    if (!weeklyContainer) return;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const weeklySalesData = { labels: [], data: [] };
    const usageVsPurchases = { labels: [], usage: [], purchases: [] };
    let lossData = {};

    last7Days.forEach(date => {
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        weeklySalesData.labels.push(dayOfWeek);
        weeklySalesData.data.push(sales[date] ? sales[date].total : 0);

        if (stockCounts[date]) {
            let totalUsage = 0, totalPurchases = 0;
            for (const ingId in stockCounts[date]) {
                const ingredient = ingredients[ingId];
                if (ingredient) {
                    totalUsage += stockCounts[date][ingId].used_expected * (ingredient.unit_cost || 0);
                    totalPurchases += stockCounts[date][ingId].purchases * (ingredient.unit_cost || 0);
                    if (stockCounts[date][ingId].variance < 0) {
                        lossData[ingredient.name] = (lossData[ingredient.name] || 0) + Math.abs(stockCounts[date][ingId].variance);
                    }
                }
            }
            usageVsPurchases.labels.push(dayOfWeek);
            usageVsPurchases.usage.push(totalUsage);
            usageVsPurchases.purchases.push(totalPurchases);
        }
    });

    const top5Losses = Object.entries(lossData).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, qty]) => `<li>${name}: ${qty.toFixed(2)} units</li>`).join('') || "<li>No losses recorded this week.</li>";

    weeklyContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div><h4 class="font-bold mb-2">Weekly Sales Trend (Last 7 Days)</h4><canvas id="weekly-sales-chart"></canvas></div>
            <div><h4 class="font-bold mb-2">Usage vs Purchases (Cost in MAD)</h4><canvas id="usage-purchases-chart"></canvas></div>
            <div class="lg:col-span-2"><h4 class="font-bold mb-2">Top 5 Loss Ingredients (by Quantity)</h4><ul class="list-disc list-inside bg-gray-50 p-4 rounded-md">${top5Losses}</ul></div>
        </div>
    `;

    charts.weeklySales = new Chart(document.getElementById('weekly-sales-chart'), { type: 'line', data: { labels: weeklySalesData.labels, datasets: [{ label: 'Sales (MAD)', data: weeklySalesData.data, borderColor: '#D71921', tension: 0.1 }] } });
    charts.usagePurchases = new Chart(document.getElementById('usage-purchases-chart'), { type: 'bar', data: { labels: usageVsPurchases.labels, datasets: [{ label: 'Usage Cost', data: usageVsPurchases.usage, backgroundColor: '#EF4444' }, { label: 'Purchases Cost', data: usageVsPurchases.purchases, backgroundColor: '#3B82F6' }] }, options: { scales: { y: { beginAtZero: true } } } });
}

function renderMonthlyReport(sales, stockCounts, ingredients) {
    const monthlyContainer = document.getElementById('monthly-report-container');
    if (!monthlyContainer) return;
    const monthlySales = {};
    const monthlyCosts = {};

    for (const date in sales) {
        const month = date.substring(0, 7); // YYYY-MM
        monthlySales[month] = (monthlySales[month] || 0) + sales[date].total;
    }
     for (const date in stockCounts) {
        const month = date.substring(0, 7); // YYYY-MM
        let dailyCost = 0;
        for(const ingId in stockCounts[date]){
            if(ingredients[ingId]){
                 dailyCost += stockCounts[date][ingId].used_expected * (ingredients[ingId].unit_cost || 0);
            }
        }
        monthlyCosts[month] = (monthlyCosts[month] || 0) + dailyCost;
    }

    const labels = Object.keys(monthlySales).sort();
    const salesData = labels.map(month => monthlySales[month]);
    const costData = labels.map(month => monthlyCosts[month] || 0);

    monthlyContainer.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mt-8 mb-4 border-t pt-6">Monthly Report</h3>
        <div><h4 class="font-bold mb-2">Cost vs Sales Trend</h4><canvas id="monthly-sales-chart"></canvas></div>
    `;

    charts.monthlySales = new Chart(document.getElementById('monthly-sales-chart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Total Sales (MAD)', data: salesData, backgroundColor: '#22C55E' },
                { label: 'Ingredient Cost (MAD)', data: costData, backgroundColor: '#F97316' }
            ]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function renderYearlyReport(sales, stockCounts, ingredients) {
    const yearlyContainer = document.getElementById('yearly-report-container');
    if (!yearlyContainer) return;
    let totalRevenue = 0, totalPurchases = 0, totalLosses = 0;

    for(const date in sales) {
        totalRevenue += sales[date].total;
    }
    for(const date in stockCounts){
        for(const ingId in stockCounts[date]){
            const ingredient = ingredients[ingId];
            if(ingredient){
                totalPurchases += stockCounts[date][ingId].purchases * (ingredient.unit_cost || 0);
                if(stockCounts[date][ingId].variance < 0){
                    totalLosses += Math.abs(stockCounts[date][ingId].variance) * (ingredient.unit_cost || 0);
                }
            }
        }
    }

    yearlyContainer.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mt-8 mb-4 border-t pt-6">Year-to-Date Summary</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-100 p-4 rounded-lg text-center"><p class="text-sm font-semibold">Total Revenue</p><p class="text-2xl font-bold">${totalRevenue.toFixed(2)} MAD</p></div>
            <div class="bg-blue-100 p-4 rounded-lg text-center"><p class="text-sm font-semibold">Total Purchases</p><p class="text-2xl font-bold">${totalPurchases.toFixed(2)} MAD</p></div>
            <div class="bg-red-100 p-4 rounded-lg text-center"><p class="text-sm font-semibold">Total Losses</p><p class="text-2xl font-bold">${totalLosses.toFixed(2)} MAD</p></div>
        </div>
    `;
}

// --- END-OF-DAY REPORT ---
async function generateEndOfDayReport() {
    const reportDate = document.getElementById('stock-date-picker').value;
    const reportModal = document.getElementById('report-modal');
    const reportTitle = document.getElementById('report-modal-title');
    const reportContent = document.getElementById('report-modal-content');

    reportTitle.textContent = `End of Day Report for ${reportDate}`;
    reportContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2">Generating report...</p></div>`;
    reportModal.classList.remove('hidden');

    try {
        const [salesSnapshot, stockCountSnapshot, ingredientsSnapshot] = await Promise.all([
            db.ref(`sales/${reportDate}`).once('value'),
            db.ref(`stockCounts/${reportDate}`).once('value'),
            db.ref('ingredients').once('value')
        ]);

        const sales = salesSnapshot.val() || { total: 0, platform: 0, glovo: 0, regular: 0 };
        const stockCounts = stockCountSnapshot.val() || {};
        const ingredients = ingredientsSnapshot.val() || {};

        let totalLossValue = 0, ingredientCost = 0, varianceRows = '', wastageRows = '';

        for (const ingId in stockCounts) {
            const count = stockCounts[ingId];
            const ingredient = ingredients[ingId];
            if (!ingredient) continue;

            ingredientCost += count.used_expected * (ingredient.unit_cost || 0);
            
            if (count.variance !== 0) {
                const varianceValue = count.variance * (ingredient.unit_cost || 0);
                if (varianceValue < 0) totalLossValue += Math.abs(varianceValue);
                const varianceColor = count.variance < 0 ? 'text-red-600' : 'text-green-600';
                varianceRows += `<tr><td class="py-1 px-2">${ingredient.name}</td><td class="py-1 px-2 text-center ${varianceColor}">${count.variance.toFixed(2)} ${ingredient.unit}</td><td class="py-1 px-2 text-right ${varianceColor}">${varianceValue.toFixed(2)} MAD</td></tr>`;
            }

            if (count.wastage > 0) {
                const wastageValue = count.wastage * (ingredient.unit_cost || 0);
                wastageRows += `<tr><td class="py-1 px-2">${ingredient.name}</td><td class="py-1 px-2 text-center">${count.wastage.toFixed(2)} ${ingredient.unit}</td><td class="py-1 px-2 text-right">${wastageValue.toFixed(2)} MAD</td></tr>`;
            }
        }

        const profitEstimate = sales.total - ingredientCost - totalLossValue;

        reportContent.innerHTML = `
            <div class="space-y-6 text-sm">
                <div class="p-4 bg-gray-50 rounded-lg"><h4 class="font-bold text-lg mb-2">Financial Summary</h4><div class="grid grid-cols-2 gap-x-4 gap-y-2"><span class="font-semibold">Total Sales:</span><span class="text-right font-bold text-green-600">${sales.total.toFixed(2)} MAD</span><span class="font-semibold">Ingredient Cost:</span><span class="text-right">-${ingredientCost.toFixed(2)} MAD</span><span class="font-semibold">Variance Loss:</span><span class="text-right text-red-600">-${totalLossValue.toFixed(2)} MAD</span><span class="font-bold border-t pt-2 mt-1">Estimated Profit:</span><span class="text-right font-bold border-t pt-2 mt-1">${profitEstimate.toFixed(2)} MAD</span></div></div>
                <div><h4 class="font-bold text-lg mb-2">Sales Breakdown</h4><div class="grid grid-cols-2 gap-x-4 gap-y-1"><span>Platform Sales:</span><span class="text-right">${(sales.platform || 0).toFixed(2)} MAD</span><span>Glovo Sales:</span><span class="text-right">${(sales.glovo || 0).toFixed(2)} MAD</span><span>In-House Sales:</span><span class="text-right">${(sales.regular || 0).toFixed(2)} MAD</span></div></div>
                <div><h4 class="font-bold text-lg mb-2">Stock Variance Report</h4>${varianceRows ? `<table class="w-full"><thead><tr class="bg-gray-100"><th class="text-left px-2 py-1">Item</th><th class="text-center px-2 py-1">Qty Var.</th><th class="text-right px-2 py-1">Value Var.</th></tr></thead><tbody>${varianceRows}</tbody></table>` : '<p>No variances recorded.</p>'}</div>
                <div><h4 class="font-bold text-lg mb-2">Wastage Report</h4>${wastageRows ? `<table class="w-full"><thead><tr class="bg-gray-100"><th class="text-left px-2 py-1">Item</th><th class="text-center px-2 py-1">Qty</th><th class="text-right px-2 py-1">Value</th></tr></thead><tbody>${wastageRows}</tbody></table>` : '<p>No wastage recorded.</p>'}</div>
            </div>
        `;
    } catch (error) {
        console.error("Error generating report:", error);
        reportContent.innerHTML = `<p class="text-red-500">Could not generate report. Error: ${error.message}</p>`;
    }
}

function printReport() {
    window.print();
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

// --- INGREDIENT, DAILY COUNT, SALES, WAREHOUSE FUNCTIONS ---
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
        updateFinancialKPIs();
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


// --- MAIN PANEL LOADER ---
export function loadPanel(root, panelTitle) {
    panelRoot = root;
    panelTitle.textContent = 'Stock & Sales Control';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Sales</h4><p id="todays-sales" class="text-2xl font-bold">0 MAD</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Today's Loss Value</h4><p id="todays-loss" class="text-2xl font-bold text-red-500">0 MAD</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Food Cost %</h4><p id="food-cost" class="text-2xl font-bold">0%</p></div>
            <div class="bg-white p-5 rounded-xl shadow-lg"><h4 class="text-sm text-gray-500">Low Stock Items</h4><p id="low-stock-items" class="text-2xl font-bold">0</p></div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="border-b mb-4">
                <nav class="flex space-x-4">
                    <button data-tab="ingredients" class="tab-button py-2 px-4 font-semibold">Ingredients</button>
                    <button data-tab="recipes" class="tab-button py-2 px-4 font-semibold">Recipes</button>
                    <button data-tab="daily-count" class="tab-button py-2 px-4 font-semibold">Daily Count</button>
                    <button data-tab="sales-input" class="tab-button py-2 px-4 font-semibold">Sales Input</button>
                    <button data-tab="warehouse" class="tab-button py-2 px-4 font-semibold">Warehouse</button>
                    <button data-tab="analytics" class="tab-button py-2 px-4 font-semibold">Analytics</button>
                    <button data-tab="alerts" class="tab-button py-2 px-4 font-semibold">Alerts</button>
                </nav>
            </div>

            <div id="ingredients-section" class="tab-content">
                 <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-gray-800">Master Ingredient List</h3><button id="add-ingredient-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition"><i class="fas fa-plus mr-2"></i>Add Ingredient</button></div>
                <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs font-semibold uppercase">Name</th><th class="p-3 text-left text-xs font-semibold uppercase">Category</th><th class="p-3 text-center text-xs font-semibold uppercase">Current Stock</th><th class="p-3 text-left text-xs font-semibold uppercase">Cost/Unit</th><th class="p-3 text-left text-xs font-semibold uppercase">Supplier</th><th class="p-3 text-center text-xs font-semibold uppercase">Actions</th></tr></thead><tbody id="ingredients-tbody" class="divide-y"></tbody></table></div>
            </div>

            <div id="recipes-section" class="tab-content" style="display: none;">
                <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-gray-800">Menu Recipes</h3><button id="add-recipe-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition"><i class="fas fa-plus mr-2"></i>Add Recipe</button></div>
                <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs font-semibold uppercase">Menu Item</th><th class="p-3 text-left text-xs font-semibold uppercase">Linked Ingredients</th><th class="p-3 text-center text-xs font-semibold uppercase">Actions</th></tr></thead><tbody id="recipes-tbody" class="divide-y"></tbody></table></div>
            </div>
            
            <div id="daily-count-section" class="tab-content" style="display: none;">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Daily Stock Count</h3>
                        <input type="date" id="stock-date-picker" value="${currentStockDate}" class="mt-1 p-2 border rounded-md">
                    </div>
                    <div class="flex gap-2">
                         <button id="generate-report-btn" class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition"><i class="fas fa-file-alt mr-2"></i>Generate Report</button>
                         <button id="save-daily-count-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Save Today's Count</button>
                    </div>
                </div>
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

            <div id="analytics-section" class="tab-content" style="display: none;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Reports & Analytics</h3>
                <div id="analytics-container" class="space-y-8">
                    <div id="weekly-report-container"></div>
                    <div id="monthly-report-container"></div>
                    <div id="yearly-report-container"></div>
                </div>
            </div>

            <div id="alerts-section" class="tab-content" style="display: none;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Alerts & Notifications</h3>
                <div id="alerts-container" class="space-y-4"></div>
            </div>
        </div>

        <div id="ingredient-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
             <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg"><h3 id="modal-title" class="text-2xl font-bold text-gray-800 mb-4">Add New Ingredient</h3><form id="ingredient-form" class="space-y-4"><div><label for="ingredient-name" class="block text-sm font-medium">Ingredient Name</label><input type="text" id="ingredient-name" required class="w-full mt-1 p-2 border rounded-md"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-category" class="block text-sm font-medium">Category</label><input type="text" id="ingredient-category" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., Dairy, Meat, Vegetable"></div><div><label for="ingredient-unit" class="block text-sm font-medium">Unit</label><input type="text" id="ingredient-unit" required class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., kg, L, pcs"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-unit-cost" class="block text-sm font-medium">Cost per Unit (MAD)</label><input type="number" id="ingredient-unit-cost" step="0.01" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="ingredient-supplier" class="block text-sm font-medium">Supplier</label><input type="text" id="ingredient-supplier" class="w-full mt-1 p-2 border rounded-md"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="ingredient-stock-level" class="block text-sm font-medium">Initial Stock Level</label><input type="number" id="ingredient-stock-level" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="low-stock-threshold" class="block text-sm font-medium">Low Stock Threshold</label><input type="number" id="low-stock-threshold" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div></div><div class="flex justify-end gap-4 pt-4"><button type="button" id="cancel-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Ingredient</button></div></form></div>
        </div>
        
        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
             <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style="max-height: 90vh;"><h3 id="recipe-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Add New Recipe</h3><form id="recipe-form" class="flex-grow overflow-hidden flex flex-col"><div class="flex-grow overflow-y-auto pr-4 space-y-4"><div><label for="menu-item-select" class="block text-sm font-medium text-gray-700">Select Menu Item</label><select id="menu-item-select" required class="w-full mt-1 p-2 border rounded-md bg-white"></select></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 class="font-semibold mb-2 text-gray-700">Available Ingredients</h4><input type="text" id="ingredient-search" placeholder="Search ingredients..." class="w-full p-2 border rounded-md mb-2"><div id="available-ingredients" class="h-64 overflow-y-auto border p-2 rounded-md bg-gray-50"></div></div><div><h4 class="font-semibold mb-2 text-gray-700">Recipe Ingredients</h4><div id="recipe-ingredients-list" class="h-64 overflow-y-auto border p-2 rounded-md space-y-2"><p class="text-gray-500 p-4 text-center">Add ingredients from the left.</p></div></div></div></div><div class="flex-shrink-0 flex justify-end gap-4 pt-4 border-t mt-4"><button type="button" id="cancel-recipe-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Recipe</button></div></form></div>
        </div>
    `;

    // --- Attach Event Listeners ---
    ingredientModal = panelRoot.querySelector('#ingredient-modal');
    ingredientForm = panelRoot.querySelector('#ingredient-form');
    modalTitle = panelRoot.querySelector('#modal-title');
    recipeModal = panelRoot.querySelector('#recipe-modal');
    recipeForm = panelRoot.querySelector('#recipe-form');
    reportModal = document.getElementById('report-modal');

    panelRoot.querySelector('#add-ingredient-btn')?.addEventListener('click', () => openIngredientModal());
    panelRoot.querySelector('#cancel-modal-btn')?.addEventListener('click', closeIngredientModal);
    if(ingredientForm) ingredientForm.addEventListener('submit', handleSaveIngredient);
    panelRoot.querySelector('#ingredients-tbody')?.addEventListener('click', handleTableClick);

    panelRoot.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    panelRoot.querySelector('#add-recipe-btn')?.addEventListener('click', () => openRecipeModal());
    panelRoot.querySelector('#cancel-recipe-modal-btn')?.addEventListener('click', closeRecipeModal);
    recipeForm?.addEventListener('submit', handleSaveRecipe);
    panelRoot.querySelector('#ingredient-search')?.addEventListener('input', (e) => filterIngredients(e.target.value.toLowerCase()));
    
    panelRoot.querySelector('#generate-report-btn')?.addEventListener('click', generateEndOfDayReport);
    document.getElementById('close-report-btn')?.addEventListener('click', () => reportModal.classList.add('hidden'));
    document.getElementById('print-report-btn')?.addEventListener('click', printReport);


    panelRoot.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-ingredient-to-recipe-btn');
        const removeBtn = e.target.closest('.remove-ingredient-from-recipe-btn');
        const editRecipeBtn = e.target.closest('.edit-recipe-btn');
        const deleteRecipeBtn = e.target.closest('.delete-recipe-btn');

        if (addBtn) addIngredientToRecipeList(addBtn.dataset.id);
        if (removeBtn) removeBtn.closest('[data-id]').remove();
        if (editRecipeBtn) openRecipeModal(editRecipeBtn.closest('tr').dataset.itemId);
        if (deleteRecipeBtn) {
            const row = deleteRecipeBtn.closest('tr');
            if (confirm(`Delete recipe for "${row.dataset.itemName}"?`)) {
                db.ref(`recipes/${row.dataset.itemId}`).remove().then(() => {
                    alert('Recipe deleted!');
                    loadAndRenderRecipes();
                });
            }
        }
    });

    // Initialize the panel
    (async () => {
        await Promise.all([loadAndRenderIngredients(), db.ref('menu').once('value').then(snap => {
            if(snap.exists()){
                const menu = snap.val();
                for(const catId in menu){
                    if(menu[catId].items) Object.assign(menuItemsCache, menu[catId].items);
                }
            }
        })]);
        switchTab('ingredients');
        updateFinancialKPIs();
    })();
}
