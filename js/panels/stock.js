// /js/panels/stock.js

const db = firebase.database();

/**
 * Creates the HTML for a single item row in the stock management table.
 */
function createStockItemRow(categoryId, itemId, itemData) {
    const { name, inStock } = itemData;
    const isChecked = inStock === false ? '' : 'checked'; // In stock by default

    return `
        <tr class="hover:bg-gray-50">
            <td class="p-4 font-medium text-gray-800">${name}</td>
            <td class="p-4 text-sm text-gray-500">${categoryId}</td>
            <td class="p-4 text-center">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" class="sr-only peer" data-category-id="${categoryId}" data-item-id="${itemId}" ${isChecked}>
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span class="ml-3 text-sm font-medium text-gray-900">${inStock === false ? 'Out of Stock' : 'In Stock'}</span>
                </label>
            </td>
        </tr>
    `;
}

/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Manage Item Availability</h2>
            <p class="text-sm text-gray-500 mb-6">Use the toggles to mark items as "In Stock" or "Out of Stock". Changes are saved automatically and will reflect on the customer-facing menu.</p>
            <div class="overflow-y-auto" style="max-height: 70vh;">
                <table class="min-w-full">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Item Name</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Category</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Availability</th>
                        </tr>
                    </thead>
                    <tbody id="stock-list-body" class="divide-y divide-gray-200">
                        </tbody>
                </table>
            </div>
        </div>
    `;

    const stockListBody = document.getElementById('stock-list-body');

    // Load all menu items
    db.ref('menu').on('value', snapshot => {
        stockListBody.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach(categorySnapshot => {
                const categoryId = categorySnapshot.key;
                const items = categorySnapshot.val().items || {};
                Object.entries(items).forEach(([itemId, itemData]) => {
                    stockListBody.innerHTML += createStockItemRow(categoryId, itemId, itemData);
                });
            });
        } else {
            stockListBody.innerHTML = '<tr><td colspan="3" class="text-center p-4">No menu items found.</td></tr>';
        }
    });

    // Event listener for the toggle switches
    stockListBody.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const categoryId = e.target.dataset.categoryId;
            const itemId = e.target.dataset.itemId;
            const isInStock = e.target.checked;
            
            // Update the 'inStock' property in Firebase
            db.ref(`menu/${categoryId}/items/${itemId}/inStock`).set(isInStock)
                .catch(err => console.error("Failed to update stock status:", err));
        }
    });
}