// /js/panels/stock.js

const db = firebase.database();

// --- MODAL ELEMENTS ---
let editModal, editModalTitle, editForm, reportModal;
let currentIngredientId = '';

/**
 * Creates the HTML for a single ingredient row in the table.
 */
function createIngredientRow(ingredientId, ingredientData) {
    const { name, stockLevel, unit, supplierContact, lowStockThreshold } = ingredientData;
    const isLowStock = stockLevel <= lowStockThreshold;

    return `
        <tr class="hover:bg-gray-50 ${isLowStock ? 'bg-yellow-100' : ''}" data-ingredient-id="${ingredientId}">
            <td class="p-3 font-medium">
                ${name}
                ${isLowStock ? '<span class="ml-2 text-xs font-semibold bg-yellow-500 text-white px-2 py-1 rounded-full">Low Stock</span>' : ''}
            </td>
            <td class="p-3 text-center font-bold ${isLowStock ? 'text-yellow-700' : ''}">${stockLevel}</td>
            <td class="p-3">${unit}</td>
            <td class="p-3 text-sm text-gray-600">${supplierContact || 'N/A'}</td>
            <td class="p-3 text-center">
                <button class="edit-ingredient-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-ingredient-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Opens the modal to edit an ingredient's details.
 */
function openEditModal(ingredientId, ingredientData) {
    currentIngredientId = ingredientId;
    editModalTitle.textContent = `Edit: ${ingredientData.name}`;
    
    document.getElementById('edit-ingredient-name').value = ingredientData.name;
    document.getElementById('edit-ingredient-stock').value = ingredientData.stockLevel;
    document.getElementById('edit-ingredient-unit').value = ingredientData.unit;
    document.getElementById('edit-supplier-contact').value = ingredientData.supplierContact || '';
    document.getElementById('edit-low-stock-threshold').value = ingredientData.lowStockThreshold || 0;


    editModal.classList.remove('hidden');
}

/**
 * Closes the edit modal.
 */
function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset();
    currentIngredientId = '';
}

/**
 * Saves the edited ingredient data back to Firebase.
 */
function saveEditedIngredient(e) {
    e.preventDefault();
    const updatedData = {
        name: document.getElementById('edit-ingredient-name').value,
        stockLevel: parseFloat(document.getElementById('edit-ingredient-stock').value),
        unit: document.getElementById('edit-ingredient-unit').value,
        supplierContact: document.getElementById('edit-supplier-contact').value,
        lowStockThreshold: parseFloat(document.getElementById('edit-low-stock-threshold').value) || 0
    };

    db.ref(`inventory/${currentIngredientId}`).update(updatedData)
        .then(() => {
            closeEditModal();
        })
        .catch(err => {
            alert("Error updating ingredient: " + err.message);
        });
}


/**
 * Fetches and displays the list of ingredients from the database.
 */
function loadIngredients() {
    const ingredientListBody = document.getElementById('ingredient-list-body');
    const ingredientsRef = db.ref('inventory');

    ingredientsRef.on('value', snapshot => {
        ingredientListBody.innerHTML = ''; // Clear the list before re-rendering
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                ingredientListBody.innerHTML += createIngredientRow(childSnapshot.key, childSnapshot.val());
            });
        } else {
            ingredientListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No ingredients added yet.</td></tr>';
        }
    });
}

/**
 * Generic function to generate a sales report for a given number of past days.
 */
async function generateReport(title, days) {
    const reportTitle = document.getElementById('report-modal-title');
    const reportContent = document.getElementById('report-modal-content');
    reportTitle.textContent = title;
    reportContent.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i>';
    reportModal.classList.remove('hidden');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString();

    const itemsSold = {};

    try {
        const ordersSnapshot = await db.ref('orders').orderByChild('timestamp').startAt(startDateString).once('value');
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach(orderSnap => {
                const order = orderSnap.val();
                order.items.forEach(item => {
                    itemsSold[item.name] = (itemsSold[item.name] || 0) + item.quantity;
                });
            });

            let reportHtml = '<ul class="list-disc pl-5 space-y-2">';
            for (const [name, quantity] of Object.entries(itemsSold).sort(([,a],[,b]) => b - a)) {
                reportHtml += `<li><strong>${quantity}x</strong> ${name}</li>`;
            }
            reportHtml += '</ul>';
            reportContent.innerHTML = reportHtml;

        } else {
            reportContent.innerHTML = `<p>No items sold in the last ${days} day(s).</p>`;
        }
    } catch (error) {
        reportContent.innerHTML = `<p class="text-red-500">Error generating report: ${error.message}</p>`;
    }
}


/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="space-y-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4 border-b pb-3">Add New Ingredient</h3>
                    <form id="add-ingredient-form" class="space-y-4">
                        <div><label for="ingredient-name" class="block text-sm font-medium">Ingredient Name</label><input type="text" id="ingredient-name" required placeholder="e.g., Mozzarella Cheese" class="w-full mt-1 p-2 border rounded-md"></div>
                        <div><label for="ingredient-stock" class="block text-sm font-medium">Current Stock Level</label><input type="number" id="ingredient-stock" step="0.1" required placeholder="e.g., 10.5" class="w-full mt-1 p-2 border rounded-md"></div>
                        <div><label for="ingredient-unit" class="block text-sm font-medium">Unit of Measurement</label><input type="text" id="ingredient-unit" required placeholder="e.g., kg, Liters, units" class="w-full mt-1 p-2 border rounded-md"></div>
                        <div><label for="supplier-contact" class="block text-sm font-medium">Supplier Contact (Email/Phone)</label><input type="text" id="supplier-contact" placeholder="e.g., supplier@example.com" class="w-full mt-1 p-2 border rounded-md"></div>
                        <div><label for="low-stock-threshold" class="block text-sm font-medium">Low Stock Threshold</label><input type="number" id="low-stock-threshold" step="0.1" value="0" required placeholder="e.g., 2.5" class="w-full mt-1 p-2 border rounded-md"></div>
                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Add Ingredient</button>
                    </form>
                </div>

                <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                     <h3 class="text-xl font-bold mb-4 border-b pb-3">Current Stock</h3>
                     <div class="overflow-y-auto" style="max-height: 70vh;"><table class="min-w-full"><thead class="bg-gray-50 sticky top-0"><tr><th class="p-3 text-left text-xs uppercase">Ingredient</th><th class="p-3 text-center text-xs uppercase">Stock Level</th><th class="p-3 text-left text-xs uppercase">Unit</th><th class="p-3 text-left text-xs uppercase">Supplier</th><th class="p-3 text-center text-xs uppercase">Actions</th></tr></thead><tbody id="ingredient-list-body" class="divide-y"></tbody></table></div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4 border-b pb-3">Stock Reports & Forecasting</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold text-gray-700">Daily Report</h4><p class="text-sm text-gray-500 mb-4">View today's item sales.</p><button id="daily-report-btn" class="w-full bg-gray-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-gray-700">Generate</button></div>
                    <div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold text-gray-700">Weekly Report</h4><p class="text-sm text-gray-500 mb-4">Analyze item sales for the last 7 days.</p><button id="weekly-report-btn" class="w-full bg-gray-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-gray-700">Generate</button></div>
                    <div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold text-gray-700">Monthly Report</h4><p class="text-sm text-gray-500 mb-4">Get a 30-day overview of item sales.</p><button id="monthly-report-btn" class="w-full bg-gray-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-gray-700">Generate</button></div>
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200"><h4 class="font-bold text-blue-800">Forecast Needs</h4><p class="text-sm text-blue-600 mb-4">Predict future stock needs based on sales.</p><button id="forecast-btn" class="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700">Forecast</button></div>
                </div>
            </div>
        </div>

        <div id="edit-ingredient-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50"><div class="bg-white p-6 rounded-xl shadow-xl w-full max-w-md"><h3 id="edit-modal-title" class="text-xl font-bold mb-4">Edit Ingredient</h3><form id="edit-ingredient-form" class="space-y-4"><div><label for="edit-ingredient-name" class="block text-sm font-medium">Ingredient Name</label><input type="text" id="edit-ingredient-name" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="edit-ingredient-stock" class="block text-sm font-medium">Stock Level</label><input type="number" id="edit-ingredient-stock" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="edit-ingredient-unit" class="block text-sm font-medium">Unit</label><input type="text" id="edit-ingredient-unit" required class="w-full mt-1 p-2 border rounded-md"></div><div><label for="edit-supplier-contact" class="block text-sm font-medium">Supplier Contact</label><input type="text" id="edit-supplier-contact" class="w-full mt-1 p-2 border rounded-md"></div><div><label for="edit-low-stock-threshold" class="block text-sm font-medium">Low Stock Threshold</label><input type="number" id="edit-low-stock-threshold" step="0.1" required class="w-full mt-1 p-2 border rounded-md"></div><div class="flex justify-end gap-4 pt-4"><button type="button" id="cancel-edit-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Changes</button></div></form></div></div>
        
        <div id="report-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50"><div class="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg"><h3 id="report-modal-title" class="text-xl font-bold mb-4 border-b pb-2">Report</h3><div id="report-modal-content" class="my-4 max-h-96 overflow-y-auto"></div><button id="close-report-btn" class="mt-4 bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Close</button></div></div>
    `;

    editModal = document.getElementById('edit-ingredient-modal');
    editModalTitle = document.getElementById('edit-modal-title');
    editForm = document.getElementById('edit-ingredient-form');
    reportModal = document.getElementById('report-modal');

    document.getElementById('add-ingredient-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newIngredient = { name: document.getElementById('ingredient-name').value, stockLevel: parseFloat(document.getElementById('ingredient-stock').value), unit: document.getElementById('ingredient-unit').value, supplierContact: document.getElementById('supplier-contact').value, lowStockThreshold: parseFloat(document.getElementById('low-stock-threshold').value) || 0 };
        db.ref('inventory').push(newIngredient).then(() => { e.target.reset(); });
    });

    document.getElementById('ingredient-list-body').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const row = button.closest('tr');
        const ingredientId = row.dataset.ingredientId;
        if (button.classList.contains('delete-ingredient-btn')) {
            if (confirm(`Are you sure you want to delete "${row.cells[0].textContent.trim()}"?`)) {
                db.ref(`inventory/${ingredientId}`).remove();
            }
        } else if (button.classList.contains('edit-ingredient-btn')) {
            db.ref(`inventory/${ingredientId}`).once('value', snapshot => { openEditModal(ingredientId, snapshot.val()); });
        }
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', saveEditedIngredient);
    document.getElementById('daily-report-btn').addEventListener('click', () => generateReport('Daily Sales Report', 1));
    document.getElementById('weekly-report-btn').addEventListener('click', () => generateReport('Weekly Sales Report', 7));
    document.getElementById('monthly-report-btn').addEventListener('click', () => generateReport('Monthly Sales Report', 30));
    document.getElementById('forecast-btn').addEventListener('click', () => {
        alert('Forecasting feature is coming soon!');
    });
    document.getElementById('close-report-btn').addEventListener('click', () => reportModal.classList.add('hidden'));

    loadIngredients();
}