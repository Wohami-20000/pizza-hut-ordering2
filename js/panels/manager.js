// /js/panels/manager.js

const db = firebase.database();

/**
 * Creates the HTML for a single menu item row.
 */
function createMenuItemRow(key, item) {
    return `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-medium">${item.name || 'No Name'}</td>
            <td class="p-3 text-gray-600">${item.shortDesc || ''}</td>
            <td class="p-3 text-gray-800 font-semibold">${(item.price || 0).toFixed(2)} MAD</td>
            <td class="p-3 text-right">
                <button class="text-xs bg-yellow-400 text-gray-800 px-2 py-1 rounded hover:bg-yellow-500">Edit</button>
                <button class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Main function to load the Manager Panel.
 */
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Restaurant Management';
    
    // Setup navigation for Manager
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Menu Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Order Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Analytics</a>
    `;

    // Setup the main content for Manager
    panelRoot.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Menu & Offers Management</h2>

        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-lg font-semibold mb-3">Add New Menu Item</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input id="new-item-name" type="text" placeholder="Item Name" class="p-2 border rounded">
                <input id="new-item-desc" type="text" placeholder="Description" class="p-2 border rounded">
                <input id="new-item-price" type="number" placeholder="Price" class="p-2 border rounded">
            </div>
            <button id="save-new-item-btn" class="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Add Item</button>
        </div>

        <div class="bg-white rounded-lg shadow-md">
            <div class="p-4 border-b">
                <h3 class="text-lg font-semibold">Current Menu (Accompaniments)</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                            <th class="p-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="menu-item-list">
                        <tr><td colspan="4" class="text-center p-4">Loading menu...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Fetch and display menu items from a specific category
    // For this example, we'll use the 'Accompaniments' category
    const menuCategoryRef = db.ref('menu/CATEGORY_ID_ACCOMPAGNEMENTS/items');
    
    menuCategoryRef.on('value', (snapshot) => {
        const itemListBody = document.getElementById('menu-item-list');
        itemListBody.innerHTML = ''; // Clear previous list
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const itemKey = childSnapshot.key;
                const itemData = childSnapshot.val();
                itemListBody.innerHTML += createMenuItemRow(itemKey, itemData);
            });
        } else {
            itemListBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No items in this category.</td></tr>';
        }
    });

    // Handle saving a new item
    const saveBtn = document.getElementById('save-new-item-btn');
    saveBtn.addEventListener('click', () => {
        const name = document.getElementById('new-item-name').value;
        const shortDesc = document.getElementById('new-item-desc').value;
        const price = parseFloat(document.getElementById('new-item-price').value);

        if (name && !isNaN(price)) {
            // Get a new unique key for the item
            const newItemRef = menuCategoryRef.push();
            newItemRef.set({
                id: newItemRef.key,
                name: name,
                shortDesc: shortDesc,
                price: price
            }).then(() => {
                alert('Item added successfully!');
                // Clear the form
                document.getElementById('new-item-name').value = '';
                document.getElementById('new-item-desc').value = '';
                document.getElementById('new-item-price').value = '';
            }).catch((error) => {
                alert('Error adding item: ' + error.message);
            });
        } else {
            alert('Please enter a valid name and price.');
        }
    });
}