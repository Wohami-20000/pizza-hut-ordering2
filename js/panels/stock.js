// /js/panels/stock.js - Redesigned for better UI/UX

const db = firebase.database();
let allItemsCache = []; // Cache to hold all items for filtering

/**
 * Creates the HTML for a single item row in the stock management list.
 * @param {string} categoryId - The ID of the item's category.
 * @param {string} itemId - The unique key for the item.
 * @param {object} itemData - The data object for the item.
 * @returns {string} The HTML string for the item row.
 */
function createStockItemRow(categoryId, itemId, itemData) {
    const { name, inStock } = itemData;
    const isChecked = inStock !== false; // Default to true (in stock) if undefined
    const stockStatusText = isChecked ? 'In Stock' : 'Out of Stock';
    const stockStatusColor = isChecked ? 'text-green-600' : 'text-red-600';

    return `
        <div class="stock-item-row flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-200" data-name="${name.toLowerCase()}" data-status="${isChecked ? 'in' : 'out'}">
            <div class="flex items-center w-full sm:w-auto mb-2 sm:mb-0">
                <img src="${itemData.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png'}" alt="${name}" class="w-12 h-12 rounded-md object-cover mr-4">
                <div>
                    <p class="font-bold text-gray-800">${name}</p>
                    <p class="text-xs text-gray-500">${categoryId}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="stock-status-label text-sm font-semibold w-24 text-right ${stockStatusColor}">${stockStatusText}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer stock-toggle" data-category-id="${categoryId}" data-item-id="${itemId}" ${isChecked ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
            </div>
        </div>
    `;
}

/**
 * Filters and displays items based on search query and status filter.
 */
function renderFilteredItems() {
    const stockListContainer = document.getElementById('stock-list-container');
    const searchQuery = document.getElementById('stock-search-input').value.toLowerCase();
    const statusFilter = document.getElementById('stock-status-filter').value;

    let hasVisibleItems = false;
    stockListContainer.querySelectorAll('.stock-item-row').forEach(row => {
        const nameMatch = row.dataset.name.includes(searchQuery);
        const statusMatch = statusFilter === 'all' || row.dataset.status === statusFilter;

        if (nameMatch && statusMatch) {
            row.style.display = 'flex';
            hasVisibleItems = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    const noResultsMessage = document.getElementById('no-results-message');
    noResultsMessage.style.display = hasVisibleItems ? 'none' : 'block';
}

/**
 * Main function to set up and load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl p-6">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-6 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="border-b pb-4 mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Manage Item Availability</h2>
                <p class="text-sm text-gray-500 mt-1">Toggle an item's availability to instantly update it on the customer menu.</p>
            </div>
            
            <!-- Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="md:col-span-2 relative">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="search" id="stock-search-input" placeholder="Search by item name..." class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                </div>
                <div>
                    <select id="stock-status-filter" class="w-full p-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-brand-red focus:border-brand-red">
                        <option value="all">All Items</option>
                        <option value="in">In Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                </div>
            </div>

            <!-- Item List -->
            <div id="stock-list-container" class="border border-gray-200 rounded-lg overflow-hidden">
                <div id="loading-placeholder" class="text-center py-20 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    <p class="mt-3">Loading stock items...</p>
                </div>
                <div id="no-results-message" class="text-center py-20 text-gray-500" style="display: none;">
                    <i class="fas fa-box-open text-3xl mb-3"></i>
                    <p>No items match your search.</p>
                </div>
            </div>
        </div>
    `;

    const stockListContainer = document.getElementById('stock-list-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');

    // Load all menu items into the cache
    db.ref('menu').on('value', snapshot => {
        stockListContainer.innerHTML = ''; // Clear previous content
        if (snapshot.exists()) {
            snapshot.forEach(categorySnapshot => {
                const categoryId = categorySnapshot.key;
                const items = categorySnapshot.val().items || {};
                Object.entries(items).forEach(([itemId, itemData]) => {
                    const rowHtml = createStockItemRow(categoryId, itemId, itemData);
                    stockListContainer.insertAdjacentHTML('beforeend', rowHtml);
                });
            });
            loadingPlaceholder.style.display = 'none';
        } else {
            loadingPlaceholder.textContent = 'No menu items found.';
        }
        // Add a placeholder for "no results" message after loading
        stockListContainer.insertAdjacentHTML('beforeend', `
            <div id="no-results-message" class="text-center py-20 text-gray-500" style="display: none;">
                <i class="fas fa-box-open text-3xl mb-3"></i>
                <p>No items match your search.</p>
            </div>
        `);
    });

    // --- Event Listeners ---
    document.getElementById('stock-search-input').addEventListener('input', renderFilteredItems);
    document.getElementById('stock-status-filter').addEventListener('change', renderFilteredItems);

    stockListContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('stock-toggle')) {
            const checkbox = e.target;
            const categoryId = checkbox.dataset.categoryId;
            const itemId = checkbox.dataset.itemId;
            const isInStock = checkbox.checked;
            
            // Update the status label text and color immediately for better UX
            const row = checkbox.closest('.stock-item-row');
            const statusLabel = row.querySelector('.stock-status-label');
            row.dataset.status = isInStock ? 'in' : 'out';
            statusLabel.textContent = isInStock ? 'In Stock' : 'Out of Stock';
            statusLabel.className = `stock-status-label text-sm font-semibold w-24 text-right ${isInStock ? 'text-green-600' : 'text-red-600'}`;

            // Update Firebase
            db.ref(`menu/${categoryId}/items/${itemId}/inStock`).set(isInStock)
                .catch(err => {
                    console.error("Failed to update stock status:", err);
                    // Revert UI on failure
                    checkbox.checked = !isInStock;
                    row.dataset.status = !isInStock ? 'in' : 'out';
                    statusLabel.textContent = !isInStock ? 'In Stock' : 'Out of Stock';
                    statusLabel.className = `stock-status-label text-sm font-semibold w-24 text-right ${!isInStock ? 'text-green-600' : 'text-red-600'}`;
                    alert('Failed to update stock status. Please try again.');
                });
        }
    });
}
