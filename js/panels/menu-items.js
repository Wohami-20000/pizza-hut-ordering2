// /js/panels/menu-items.js

const db = firebase.database();

function createMenuItemRow(categoryId, itemId, itemData) {
    const { name, description, price, image_url } = itemData;
    const imageUrl = image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const descSnippet = description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A';
    
    return `
        <tr class="hover:bg-gray-50" data-category-id="${categoryId}" data-item-id="${itemId}">
            <td class="p-3"><img src="${imageUrl}" alt="${name}" class="w-12 h-12 rounded-md object-cover shadow-sm"></td>
            <td class="p-3 font-medium text-gray-800">${name}</td>
            <td class="p-3 text-sm text-gray-600">${descSnippet}</td>
            <td class="p-3 text-sm font-semibold">${price.toFixed(2)} MAD</td>
            <td class="p-3 text-sm"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">${categoryId}</span></td>
            <td class="p-3 text-center">
                <button class="delete-item-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600">Delete</button>
            </td>
        </tr>
    `;
}

function loadMenuItems() {
    const menuItemsList = document.getElementById('menu-items-list');
    db.ref('menu').on('value', snapshot => {
        menuItemsList.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach(categorySnapshot => {
                const categoryId = categorySnapshot.key;
                const items = categorySnapshot.val().items || {};
                Object.entries(items).forEach(([itemId, itemData]) => {
                    menuItemsList.innerHTML += createMenuItemRow(categoryId, itemId, itemData);
                });
            });
        } else {
            menuItemsList.innerHTML = '<tr><td colspan="6" class="text-center p-4">No menu items found.</td></tr>';
        }
    });
}

export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Menu Items Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Menu Items</h2>
            <div class="overflow-y-auto" style="max-height: 80vh;">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Image</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Description</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Price</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Category</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="menu-items-list" class="divide-y divide-gray-200"></tbody>
                </table>
            </div>
        </div>
    `;

    const menuItemsList = document.getElementById('menu-items-list');
    menuItemsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-item-btn')) {
            const row = e.target.closest('tr');
            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            if (confirm('Are you sure you want to delete this menu item?')) {
                db.ref(`menu/${categoryId}/items/${itemId}`).remove();
            }
        }
    });

    loadMenuItems();
}