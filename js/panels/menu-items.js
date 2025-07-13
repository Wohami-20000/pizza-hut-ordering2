// /js/panels/menu-items.js

const db = firebase.database();

/**
 * Creates the HTML for a single row in the menu items table.
 */
function createMenuItemRow(categoryId, itemId, itemData) {
    const { name, description, price, image_url } = itemData;
    const imageUrl = image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const descSnippet = description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A';
    
    return `
        <tr class="hover:bg-gray-50 transition" data-category-id="${categoryId}" data-item-id="${itemId}">
            <td class="p-3"><img src="${imageUrl}" alt="${name}" class="w-12 h-12 rounded-md object-cover shadow-sm"></td>
            <td class="p-3 font-medium text-gray-800">${name}</td>
            <td class="p-3 text-sm text-gray-600">${descSnippet}</td>
            <td class="p-3 text-sm font-semibold">${price ? price.toFixed(2) : '0.00'} MAD</td>
            <td class="p-3 text-center">
                <button class="edit-item-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600">Edit</button>
                <button class="delete-item-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Fetches and renders all menu items into the table.
 */
function loadMenuItems() {
    const menuItemsList = document.getElementById('menu-items-list');
    db.ref('menu').on('value', snapshot => {
        menuItemsList.innerHTML = ''; // Clear previous list
        if (snapshot.exists()) {
            snapshot.forEach(categorySnapshot => {
                const categoryId = categorySnapshot.key;
                const items = categorySnapshot.val().items || {};
                Object.entries(items).forEach(([itemId, itemData]) => {
                    menuItemsList.innerHTML += createMenuItemRow(categoryId, itemId, itemData);
                });
            });
        } else {
            menuItemsList.innerHTML = '<tr><td colspan="5" class="text-center p-4">No menu items found.</td></tr>';
        }
    });
}

/**
 * Populates the category dropdown in the form.
 */
function populateCategoryDropdown() {
    const categorySelect = document.getElementById('item-category');
    db.ref('menu').once('value', snapshot => {
        categorySelect.innerHTML = '<option value="">Select a Category</option>';
        if (snapshot.exists()) {
            snapshot.forEach(categorySnapshot => {
                const categoryId = categorySnapshot.key;
                const categoryName = categorySnapshot.val().category;
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = categoryName;
                categorySelect.appendChild(option);
            });
        }
    });
}

/**
 * Main function to load the Menu Items Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Menu Items Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <h3 id="form-title" class="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Add New Item</h3>
                <form id="menu-item-form" class="space-y-4">
                    <input type="hidden" id="item-id">
                    <input type="hidden" id="item-original-category">
                    <div>
                        <label for="item-name" class="block text-sm font-medium">Item Name</label>
                        <input type="text" id="item-name" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                     <div>
                        <label for="item-category" class="block text-sm font-medium">Category</label>
                        <select id="item-category" required class="w-full mt-1 p-2 border rounded-md bg-white"></select>
                    </div>
                    <div>
                        <label for="item-price" class="block text-sm font-medium">Price (MAD)</label>
                        <input type="number" id="item-price" step="0.01" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="item-description" class="block text-sm font-medium">Description</label>
                        <textarea id="item-description" rows="3" class="w-full mt-1 p-2 border rounded-md"></textarea>
                    </div>
                    <div>
                        <label for="item-image-url" class="block text-sm font-medium">Image URL</label>
                        <input type="url" id="item-image-url" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div class="flex gap-2 pt-2">
                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">Save Item</button>
                        <button type="button" id="clear-form-btn" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300" title="Clear Form"><i class="fas fa-times"></i></button>
                    </div>
                </form>
            </div>

            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                 <h3 class="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Current Menu Items</h3>
                 <div class="overflow-y-auto" style="max-height: 70vh;">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Image</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Description</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Price</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="menu-items-list" class="divide-y divide-gray-200"></tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    const itemForm = document.getElementById('menu-item-form');
    const itemIdInput = document.getElementById('item-id');
    const formTitle = document.getElementById('form-title');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const menuItemsList = document.getElementById('menu-items-list');
    
    const clearForm = () => {
        itemForm.reset();
        itemIdInput.value = '';
        document.getElementById('item-original-category').value = '';
        formTitle.textContent = 'Add New Item';
    };

    clearFormBtn.addEventListener('click', clearForm);

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemId = itemIdInput.value;
        const selectedCategoryId = document.getElementById('item-category').value;
        const originalCategoryId = document.getElementById('item-original-category').value;
        
        if (!selectedCategoryId) {
            alert('Please select a category.');
            return;
        }

        const itemData = {
            name: document.getElementById('item-name').value,
            price: parseFloat(document.getElementById('item-price').value),
            description: document.getElementById('item-description').value,
            image_url: document.getElementById('item-image-url').value,
            id: `ITEM_ID_${document.getElementById('item-name').value.toUpperCase().replace(/\s+/g, '_')}`
        };

        if (itemId) { // This is an EDIT operation
            // If category was changed, we must delete the old and create a new one
            if (originalCategoryId && originalCategoryId !== selectedCategoryId) {
                 db.ref(`menu/${originalCategoryId}/items/${itemId}`).remove();
            }
            db.ref(`menu/${selectedCategoryId}/items/${itemId}`).set(itemData)
                .then(() => {
                    alert('Item updated successfully!');
                    clearForm();
                }).catch(err => alert('Error: ' + err.message));
        } else { // This is an ADD operation
            db.ref(`menu/${selectedCategoryId}/items`).push(itemData)
                .then(() => {
                    alert('Item added successfully!');
                    clearForm();
                }).catch(err => alert('Error: ' + err.message));
        }
    });

    menuItemsList.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        const categoryId = row.dataset.categoryId;
        const itemId = row.dataset.itemId;

        if (e.target.classList.contains('delete-item-btn')) {
            if (confirm('Are you sure you want to delete this item?')) {
                db.ref(`menu/${categoryId}/items/${itemId}`).remove();
            }
        }

        if (e.target.classList.contains('edit-item-btn')) {
            db.ref(`menu/${categoryId}/items/${itemId}`).once('value', snapshot => {
                const data = snapshot.val();
                formTitle.textContent = 'Edit Item';
                itemIdInput.value = itemId;
                document.getElementById('item-original-category').value = categoryId;
                document.getElementById('item-name').value = data.name || '';
                document.getElementById('item-price').value = data.price || 0;
                document.getElementById('item-description').value = data.description || '';
                document.getElementById('item-image-url').value = data.image_url || '';
                document.getElementById('item-category').value = categoryId;
                window.scrollTo(0, 0); // Scroll to top to see the form
            });
        }
    });

    // Initial data load
    loadMenuItems();
    populateCategoryDropdown();
}