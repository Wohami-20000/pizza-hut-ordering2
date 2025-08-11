// /js/panels/stock.js

const db = firebase.database();

// --- MODAL ELEMENTS (will be found in dashboard.html) ---
let editModal, editModalTitle, editForm, reportModal, endOfDayModal;
let currentIngredientId = '';
let fullInventoryData = {}; // Cache for all inventory items

/**
 * Creates the HTML for a single ingredient row in the master table.
 */
function createIngredientRow(ingredientId, data) {
    const { name, category, unit, openingStock, valuePerUnit, supplier } = data;
    // For now, these will be placeholders. They will be populated by the daily log.
    const theoreticalStock = openingStock;
    const variance = 0;

    return `
        <tr class="hover:bg-gray-50" data-ingredient-id="${ingredientId}">
            <td class="p-2 border-b text-sm">${name}</td>
            <td class="p-2 border-b text-sm">${category || 'N/A'}</td>
            <td class="p-2 border-b text-sm text-center">${unit}</td>
            <td class="p-2 border-b text-sm text-center font-bold">${openingStock}</td>
            <td class="p-2 border-b text-sm text-center text-blue-600">${theoreticalStock}</td>
            <td class="p-2 border-b text-sm text-center text-red-600">${variance.toFixed(2)}</td>
            <td class="p-2 border-b text-sm text-center">${valuePerUnit.toFixed(2)} MAD</td>
            <td class="p-2 border-b text-sm">${supplier || 'N/A'}</td>
            <td class="p-2 border-b text-sm text-center">
                <button class="edit-ingredient-btn bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">Edit</button>
                <button class="delete-ingredient-btn bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600 ml-1">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Fetches and displays the list of all ingredients.
 */
function loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    const inventoryRef = db.ref('inventory');

    inventoryRef.on('value', snapshot => {
        tbody.innerHTML = '';
        if (snapshot.exists()) {
            fullInventoryData = snapshot.val(); // Cache the data
            Object.entries(fullInventoryData).forEach(([id, data]) => {
                tbody.innerHTML += createIngredientRow(id, data);
            });
        } else {
            fullInventoryData = {};
            tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">No ingredients found. Start by adding one.</td></tr>';
        }
    });
}

// --- NEW DAILY LOG FUNCTIONS ---

async function startOfDayProcess() {
    const date = document.getElementById('log-date').value;
    if (!date) {
        alert('Please select a date.');
        return;
    }
    if (Object.keys(fullInventoryData).length === 0) {
        alert('No ingredients in the master list to log.');
        return;
    }

    const logRef = db.ref(`dailyLogs/${date}/openingStock`);
    const openingData = {};
    for (const [id, data] of Object.entries(fullInventoryData)) {
        openingData[id] = data.openingStock; // Only log the stock level
    }

    try {
        await logRef.set(openingData);
        alert(`Opening stock for ${date} has been successfully recorded.`);
    } catch (error) {
        alert(`Error recording opening stock: ${error.message}`);
    }
}

async function endOfDayProcess() {
    const date = document.getElementById('log-date').value;
    if (!date) {
        alert('Please select a date.');
        return;
    }

    // Show the modal for physical count input
    const modalTbody = document.getElementById('eod-tbody');
    modalTbody.innerHTML = ''; // Clear previous entries
    
    Object.entries(fullInventoryData).forEach(([id, data]) => {
        modalTbody.innerHTML += `
            <tr data-id="${id}">
                <td class="py-2 pr-2">${data.name} (${data.unit})</td>
                <td class="py-2 pl-2"><input type="number" step="0.01" class="w-full p-1 border rounded" required></td>
            </tr>
        `;
    });
    
    endOfDayModal.classList.remove('hidden');
}

async function calculateVariance(e) {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    
    // Show loading state in the report modal
    const reportTitle = document.getElementById('report-modal-title');
    const reportContent = document.getElementById('report-modal-content');
    reportTitle.textContent = `Variance Report for ${date}`;
    reportContent.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i>';
    endOfDayModal.classList.add('hidden');
    reportModal.classList.remove('hidden');

    try {
        // 1. Get Opening Stock for the day
        const openingStockSnap = await db.ref(`dailyLogs/${date}/openingStock`).once('value');
        if (!openingStockSnap.exists()) {
            throw new Error("Opening stock for today has not been recorded. Please complete 'Start of Day' first.");
        }
        const openingStock = openingStockSnap.val();

        // 2. Calculate Expected Usage from sales (Placeholder logic)
        // This is a simplified version. A real system would map recipes to ingredients.
        const expectedUsage = {}; 
        Object.keys(fullInventoryData).forEach(id => {
            expectedUsage[id] = 0; // In a real scenario, you'd calculate this from recipes and sales.
        });

        // 3. Get Actual Closing Stock from the modal form
        const actualClosingStock = {};
        document.querySelectorAll('#eod-tbody tr').forEach(row => {
            const id = row.dataset.id;
            const input = row.querySelector('input');
            actualClosingStock[id] = parseFloat(input.value);
        });

        // 4. Calculate Variance and generate report
        let totalVarianceValue = 0;
        let reportHtml = '<table class="min-w-full text-sm"><thead><tr class="bg-gray-100"><th class="p-2 text-left">Ingredient</th><th class="p-2 text-center">Variance (Qty)</th><th class="p-2 text-center">Variance (Value)</th></tr></thead><tbody>';

        for (const id in fullInventoryData) {
            const item = fullInventoryData[id];
            const theoreticalClosing = (openingStock[id] || 0) - (expectedUsage[id] || 0);
            const actualClosing = actualClosingStock[id] || 0;
            const varianceQty = actualClosing - theoreticalClosing;
            const varianceValue = varianceQty * item.valuePerUnit;
            totalVarianceValue += varianceValue;

            const varianceColor = varianceQty < 0 ? 'text-red-600' : 'text-green-600';

            reportHtml += `
                <tr class="border-b">
                    <td class="p-2">${item.name}</td>
                    <td class="p-2 text-center font-bold ${varianceColor}">${varianceQty.toFixed(2)} ${item.unit}</td>
                    <td class="p-2 text-center font-bold ${varianceColor}">${varianceValue.toFixed(2)} MAD</td>
                </tr>
            `;
        }
        
        reportHtml += `</tbody><tfoot><tr class="font-bold bg-gray-100"><td class="p-2" colspan="2">Total Variance Value</td><td class="p-2 text-center ${totalVarianceValue < 0 ? 'text-red-600' : 'text-green-600'}">${totalVarianceValue.toFixed(2)} MAD</td></tr></tfoot></table>`;
        reportContent.innerHTML = reportHtml;

    } catch (error) {
        reportContent.innerHTML = `<p class="text-red-500">Error calculating variance: ${error.message}</p>`;
    }
}


/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Ingredient Stock Control';

    panelRoot.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4 border-b pb-3">Daily Stock Log</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label for="log-date" class="block text-sm font-medium">Log Date</label>
                        <input type="date" id="log-date" class="w-full mt-1 p-2 border rounded-md" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="md:col-span-2 flex justify-end gap-4">
                        <button id="start-day-btn" class="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700">Start of Day (Record Opening)</button>
                        <button id="end-day-btn" class="bg-red-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-700">End of Day (Calculate Variance)</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6"><h3 id="form-title" class="text-xl font-bold mb-4 border-b pb-3">Add New Ingredient</h3><form id="ingredient-form" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><input type="hidden" id="ingredient-id"><div><label for="ingredient-name" class="block text-sm font-medium">Name</label><input type="text" id="ingredient-name" required placeholder="e.g., Mozzarella Cheese" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="ingredient-category" class="block text-sm font-medium">Category</label><input type="text" id="ingredient-category" placeholder="e.g., Dairy" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="ingredient-unit" class="block text-sm font-medium">Unit</label><input type="text" id="ingredient-unit" required placeholder="e.g., kg, L, units" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="opening-stock" class="block text-sm font-medium">Current Stock</label><input type="number" id="opening-stock" step="0.01" required value="0" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="value-per-unit" class="block text-sm font-medium">Value per Unit (MAD)</label><input type="number" id="value-per-unit" step="0.01" required value="0" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="supplier" class="block text-sm font-medium">Supplier</label><input type="text" id="supplier" placeholder="Supplier Name/Contact" class="w-full mt-1 p-2 border rounded-md"></div><div class="md:col-span-2 lg:col-span-3 flex justify-end gap-4"><button type="button" id="clear-form-btn" class="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Clear</button><button type="submit" class="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700">Save Ingredient</button></div></form></div>
            <div class="bg-white rounded-xl shadow-lg p-6"><h3 class="text-xl font-bold mb-4 border-b pb-3">Ingredient & Supply Master Table</h3><div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left font-semibold">Name</th><th class="p-2 text-left font-semibold">Category</th><th class="p-2 text-center font-semibold">Unit</th><th class="p-2 text-center font-semibold">Opening Stock</th><th class="p-2 text-center font-semibold">Theoretical Stock</th><th class="p-2 text-center font-semibold">Variance</th><th class="p-2 text-center font-semibold">Value/Unit</th><th class="p-2 text-left font-semibold">Supplier</th><th class="p-2 text-center font-semibold">Actions</th></tr></thead><tbody id="inventory-tbody" class="divide-y"></tbody></table></div></div>
        </div>
    `;

    // Cache modal elements from dashboard.html
    editModal = document.getElementById('edit-ingredient-modal');
    reportModal = document.getElementById('report-modal');
    endOfDayModal = document.getElementById('end-of-day-modal');
    editModalTitle = document.getElementById('edit-modal-title');
    editForm = document.getElementById('edit-ingredient-form');


    document.getElementById('add-ingredient-form').addEventListener('submit', (e) => { e.preventDefault(); /* ... */ });
    document.getElementById('inventory-tbody').addEventListener('click', (e) => { /* ... */ });
    document.getElementById('clear-form-btn').addEventListener('click', () => document.getElementById('ingredient-form').reset());
    
    // New button listeners
    document.getElementById('start-day-btn').addEventListener('click', startOfDayProcess);
    document.getElementById('end-day-btn').addEventListener('click', endOfDayProcess);
    document.getElementById('cancel-eod-btn').addEventListener('click', () => endOfDayModal.classList.add('hidden'));
    document.getElementById('eod-form').addEventListener('submit', calculateVariance);
    document.getElementById('close-report-btn').addEventListener('click', () => reportModal.classList.add('hidden'));
    document.getElementById('print-report-btn').addEventListener('click', () => window.print());


    loadInventory();
}