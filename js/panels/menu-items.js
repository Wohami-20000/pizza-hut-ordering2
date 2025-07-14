// /js/panels/menu-items.js

const db = firebase.database();

// --- MODAL ELEMENTS ---
let editModal, editModalTitle, editForm;
let currentEditId = ''; // Firebase key of the item being edited

/**
 * Creates the HTML for a single menu item row.
 */
function createMenuItemRow(categoryId, itemId, itemData) {
    const imageUrl = itemData.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const description = itemData.description ? (itemData.description.length > 50 ? itemData.description.substring(0, 50) + '...' : itemData.description) : 'N/A';
    const price = typeof itemData.price === 'number' ? itemData.price.toFixed(2) : 'N/A';

    return `
        <tr class="hover:bg-gray-50 transition duration-150 ease-in-out" data-category-id="${categoryId}" data-item-id="${itemId}">
            <td class="px-4 py-3 text-sm text-gray-700 font-medium">
                <div class="flex items-center">
                    <img src="${imageUrl}" alt="${itemData.name}" class="w-10 h-10 rounded-md object-cover mr-3 shadow-sm">
                    <span>${itemData.name || 'N/A'}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${description}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${price} MAD</td>
            <td class="px-4 py-3 text-sm text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${categoryId}
                </span>
            </td>
            <td class="px-4 py-3 text-center text-sm">
                <button class="edit-item-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 transition shadow-sm mr-2">Edit</button>
                <button class="delete-item-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 transition shadow-sm">Delete</button>
            </td>
        </tr>
    `;
}

// --- MODAL FUNCTIONS ---
function openEditModal(id, data) {
    currentEditId = id;

    editModalTitle.textContent = `Edit Menu Item`;
    editForm.innerHTML = ''; // Clear previous form content

    let formHtml = `
        <input type="hidden" id="edit-item-category-id" value="${data.category}">
        <div>
            <label for="edit-item-name" class="block text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" id="edit-item-name" value="${data.name || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div>
            <label for="edit-item-description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="edit-item-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">${data.description || ''}</textarea>
        </div>
        <div>
            <label for="edit-item-price" class="block text-sm font-medium text-gray-700">Base Price (MAD)</label>
            <input type="number" id="edit-item-price" step="0.01" value="${data.price || 0}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div>
            <label for="edit-item-image-url" class="block text-sm font-medium text-gray-700">Image URL</label>
            <input type="url" id="edit-item-image-url" value="${data.image_url || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>

        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Sizes</h4>
            <div id="edit-item-sizes-container" class="space-y-2"></div>
            <button type="button" id="add-edit-size-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Size</button>
        </div>

        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Recipes (Comma-separated)</h4>
            <input type="text" id="edit-item-recipes" value="${(data.recipes || []).join(', ') || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Spicy, BBQ, Original">
        </div>

        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Add-ons/Options</h4>
            <div id="edit-item-options-container" class="space-y-2"></div>
            <button type="button" id="add-edit-option-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Option</button>
        </div>
    `;
    
    editForm.innerHTML = formHtml;
    editModal.classList.remove('hidden');

    const sizesContainer = document.getElementById('edit-item-sizes-container');
    const optionsContainer = document.getElementById('edit-item-options-container');

    // Render existing sizes
    (data.sizes || []).forEach(size => addSizeField(sizesContainer, size.size, size.price));
    // Render existing options
    (data.options || []).forEach(option => addOptionField(optionsContainer, option.name, option.price.Triple)); // Pass Triple price

    document.getElementById('add-edit-size-btn').addEventListener('click', () => addSizeField(sizesContainer));
    document.getElementById('add-edit-option-btn').addEventListener('click', () => addOptionField(optionsContainer));
}

function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset(); // Clear form fields
    currentEditId = '';
}

// Helper function to add a size input field
function addSizeField(container, size = '', price = '') {
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" class="size-name-input w-2/3 p-2 border rounded-md" placeholder="Size Name (e.g., Small)" value="${size}">
        <input type="number" step="0.01" class="size-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}">
        <button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>
    `;
    div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
}

// Helper function to add an option input field
function addOptionField(container, name = '', price = '') {
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" class="option-name-input w-2/3 p-2 border rounded-md" placeholder="Option Name (e.g., Mushrooms)" value="${name}">
        <input type="number" step="0.01" class="option-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}">
        <button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>
    `;
    div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
}


async function saveEditedEntity(event) {
    event.preventDefault(); // Prevent default form submission

    let updatedData = {};
    let dbRef;

    // This panel only handles 'item' type now
    const categoryId = document.getElementById('edit-item-category-id').value;
    const newBasePrice = parseFloat(document.getElementById('edit-item-price').value);

    // Collect sizes
    const sizes = [];
    document.querySelectorAll('#edit-item-sizes-container .flex').forEach(row => {
        const sizeName = row.querySelector('.size-name-input').value.trim();
        const sizePrice = parseFloat(row.querySelector('.size-price-input').value);
        if (sizeName && !isNaN(sizePrice)) {
            sizes.push({ size: sizeName, price: sizePrice });
        }
    });
    
    // Ensure at least one size exists, or default to a "Regular" size based on the base price
    if (sizes.length === 0 && !isNaN(newBasePrice)) {
            sizes.push({ size: "Regular", price: newBasePrice });
    }


    // Collect recipes
    const recipesInput = document.getElementById('edit-item-recipes').value.trim();
    const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : [];

    // Collect options (add-ons)
    const options = [];
    document.querySelectorAll('#edit-item-options-container .flex').forEach(row => {
        const optionName = row.querySelector('.option-name-input').value.trim();
        const optionPrice = parseFloat(row.querySelector('.option-price-input').value);
        if (optionName && !isNaN(optionPrice)) {
            options.push({ name: optionName, price: { Triple: optionPrice } }); // Assuming 'Triple' is the key expected by item-details.js
        }
    });

    updatedData = {
        name: document.getElementById('edit-item-name').value,
        description: document.getElementById('edit-item-description').value,
        price: newBasePrice, // This will be the default price if no sizes are chosen
        image_url: document.getElementById('edit-item-image-url').value,
        sizes: sizes,
        recipes: recipes,
        options: options,
    };
    dbRef = db.ref(`menu/${categoryId}/items/${currentEditId}`);

    try {
        await dbRef.update(updatedData);
        alert(`Item updated successfully!`);
        closeEditModal();
        loadMenuItems(); // Re-render the list to show updated data
    } catch (error) {
        console.error(`Error updating item:`, error);
        alert(`Failed to update item: ` + error.message);
    }
}


// --- DATA LOADING FUNCTIONS ---
function loadMenuItems() {
    db.ref('menu').once('value', (snapshot) => {
        const menuItemsList = document.getElementById('menu-items-list');
        if (menuItemsList) {
            menuItemsList.innerHTML = ''; // Clear loading message
            if (snapshot.exists()) {
                let itemsHtml = '';
                snapshot.forEach((categorySnapshot) => {
                    const categoryId = categorySnapshot.key;
                    const categoryData = categorySnapshot.val();
                    if (categoryData.items) {
                        for (const itemId in categoryData.items) {
                            itemsHtml += createMenuItemRow(categoryId, itemId, categoryData.items[itemId]);
                        }
                    }
                });
                menuItemsList.innerHTML = itemsHtml || '<tr><td colspan="5" class="text-center p-4 text-gray-500">No menu items found.</td></tr>';
            } else {
                menuItemsList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">No menu items found.</td></tr>';
            }
            populateCategoryDropdown(); // Ensure dropdown is populated on re-load
        }
    }).catch(error => {
        console.error("Error fetching menu items:", error);
        const menuItemsList = document.getElementById('menu-items-list');
        if(menuItemsList) menuItemsList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading menu items.</td></tr>';
    });
}


// --- MAIN PANEL LOAD FUNCTION ---
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Menu Items Management';

    // Update navigation to only show menu items related links
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white active-nav-link" data-content="menu-items"><i class="fas fa-pizza-slice mr-3"></i>Manage Menu Items</a>
    `;

    // Combine "Current Menu Items" and "Add New Item" into one section
    panelRoot.innerHTML = `
        <div id="menu-items-section" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Add New Menu Item</h2>
            <form id="add-item-form" class="space-y-4">
                <div>
                    <label for="new-item-name" class="block text-sm font-medium text-gray-700">Item Name</label>
                    <input type="text" id="new-item-name" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label for="new-item-description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="new-item-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                </div>
                <div>
                    <label for="new-item-price" class="block text-sm font-medium text-gray-700">Base Price (MAD)</label>
                    <input type="number" id="new-item-price" step="0.01" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label for="new-item-category" class="block text-sm font-medium text-gray-700">Category</label>
                    <select id="new-item-category" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="">Select a category</option>
                        </select>
                </div>
                <div>
                    <label for="new-item-image-url" class="block text-sm font-medium text-gray-700">Image URL</label>
                    <input type="url" id="new-item-image-url" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>

                <div class="border-t pt-4 mt-4">
                    <h4 class="text-md font-semibold text-gray-800 mb-2">Sizes (Optional, leave blank for default)</h4>
                    <div id="new-item-sizes-container" class="space-y-2"></div>
                    <button type="button" id="add-new-size-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Size</button>
                </div>

                <div class="border-t pt-4 mt-4">
                    <h4 class="text-md font-semibold text-gray-800 mb-2">Recipes (Optional, comma-separated)</h4>
                    <input type="text" id="new-item-recipes" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Spicy, BBQ, Original">
                </div>

                <div class="border-t pt-4 mt-4">
                    <h4 class="text-md font-semibold text-gray-800 mb-2">Add-ons/Options (Optional)</h4>
                    <div id="new-item-options-container" class="space-y-2"></div>
                    <button type="button" id="add-new-option-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Option</button>
                </div>

                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition transform hover:scale-105">Add Item</button>
            </form>

            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 mt-8">Current Menu Items</h2>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="menu-items-list" class="bg-white divide-y divide-gray-200">
                        <tr><td colspan="5" class="text-center p-4 text-gray-500">Loading menu items...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <h3 id="edit-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Edit Item</h3>
                <form id="edit-form" class="space-y-4">
                    <div class="text-center p-4 text-gray-500">Loading form...</div>
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" id="cancel-edit-btn" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition">Cancel</button>
                        <button type="submit" id="save-edit-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Initialize modal elements after they are added to the DOM
    editModal = document.getElementById('edit-modal');
    editModalTitle = document.getElementById('edit-modal-title');
    editForm = document.getElementById('edit-form');
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', saveEditedEntity);


    // Function to show/hide content sections
    // This function is simplified as there's only one main content section now
    const showContentSection = (sectionId) => {
        document.querySelectorAll('#panel-root > div').forEach(section => {
            if (section.id !== 'edit-modal') {
                section.classList.add('hidden');
            }
        });
        document.getElementById(sectionId).classList.remove('hidden');

        // Update active class for nav links
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('active-nav-link', 'bg-gray-700', 'text-white');
        });
        document.querySelector(`#sidebar-nav a[data-content="${sectionId.replace('-section', '')}"]`)?.classList.add('active-nav-link', 'bg-gray-700', 'text-white');
    };

    // Event listener for panel navigation
    navContainer.addEventListener('click', (event) => {
        const targetLink = event.target.closest('a');
        if (targetLink && targetLink.dataset.content) {
            event.preventDefault();
            const contentId = `${targetLink.dataset.content}-section`;
            showContentSection(contentId);
        }
    });

    // Initial display of menu items section
    showContentSection('menu-items-section');

    // Load initial data
    loadMenuItems();


    // Populate category dropdown for Add New Item form
    function populateCategoryDropdown() {
        const categorySelect = document.getElementById('new-item-category');

        if (!categorySelect) return;

        db.ref('menu').once('value')
            .then(snapshot => {
                categorySelect.innerHTML = '<option value="">Select a category</option>'; // Reset dropdown
                if (snapshot.exists()) {
                    snapshot.forEach(categorySnap => {
                        const categoryName = categorySnap.val().category;
                        const categoryId = categorySnap.key;
                        const option = document.createElement('option');
                        option.value = categoryId;
                        option.textContent = categoryName;
                        categorySelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error("Error populating categories:", error);
            });
    }


    // Handle Add New Item form submission
    document.getElementById('add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newItemPrice = parseFloat(document.getElementById('new-item-price').value);

        // Collect sizes
        const sizes = [];
        document.querySelectorAll('#new-item-sizes-container .flex').forEach(row => {
            const sizeName = row.querySelector('.size-name-input').value.trim();
            const sizePrice = parseFloat(row.querySelector('.size-price-input').value);
            if (sizeName && !isNaN(sizePrice)) {
                sizes.push({ size: sizeName, price: sizePrice });
            }
        });
        // If no sizes were explicitly added, add a default 'Regular' size
        if (sizes.length === 0 && !isNaN(newItemPrice)) {
            sizes.push({ size: "Regular", price: newItemPrice });
        }

        // Collect recipes
        const recipesInput = document.getElementById('new-item-recipes').value.trim();
        const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : [];

        // Collect options (add-ons)
        const options = [];
        document.querySelectorAll('#new-item-options-container .flex').forEach(row => {
            const optionName = row.querySelector('.option-name-input').value.trim();
            const optionPrice = parseFloat(row.querySelector('.option-price-input').value);
            if (optionName && !isNaN(optionPrice)) {
                options.push({ name: optionName, price: { Triple: optionPrice } }); // Assuming 'Triple' is the key expected by item-details.js
            }
        });

        const newItem = {
            name: document.getElementById('new-item-name').value,
            description: document.getElementById('new-item-description').value,
            price: newItemPrice,
            category: document.getElementById('new-item-category').value,
            image_url: document.getElementById('new-item-image-url').value || 'https://www.pizzahut.ma/images/Default_pizza.png',
            sizes: sizes,
            recipes: recipes,
            options: options,
            inStock: true // Default to in stock
        };

        if (!newItem.category) {
            alert('Please select a category.');
            return;
        }

        try {
            await db.ref(`menu/${newItem.category}/items`).push(newItem);
            alert('Item added successfully!');
            e.target.reset(); // Clear form
            // Clear dynamic fields manually
            document.getElementById('new-item-sizes-container').innerHTML = '';
            document.getElementById('new-item-options-container').innerHTML = '';
            document.getElementById('new-item-recipes').value = '';

            loadMenuItems(); // Re-render menu items to update list

        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item: " + error.message);
        }
    });

    // Add listeners for "Add Size" and "Add Option" buttons for NEW item form
    document.getElementById('add-new-size-btn').addEventListener('click', () => {
        addSizeField(document.getElementById('new-item-sizes-container'));
    });
    document.getElementById('add-new-option-btn').addEventListener('click', () => {
        addOptionField(document.getElementById('new-item-options-container'));
    });


    // --- Event delegation for Edit/Delete buttons ---
    panelRoot.addEventListener('click', async (event) => {
        const target = event.target;

        // --- Edit Item ---
        if (target.classList.contains('edit-item-btn')) {
            const row = target.closest('tr');
            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            
            try {
                const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
                if (itemSnapshot.exists()) {
                    const itemData = itemSnapshot.val();
                    // Pass the categoryId as part of itemData for the modal to retrieve later
                    openEditModal(itemId, { ...itemData, category: categoryId });
                } else {
                    alert('Item not found!');
                }
            } catch (error) {
                console.error("Error fetching item for edit:", error);
                alert("Failed to fetch item details: " + error.message);
            }
        } 
        // --- Delete Item ---
        else if (target.classList.contains('delete-item-btn')) {
            const row = target.closest('tr');
            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            if (confirm(`Are you sure you want to delete item ${row.querySelector('span').textContent}? This cannot be undone.`)) {
                try {
                    await db.ref(`menu/${categoryId}/items/${itemId}`).remove();
                    alert('Item deleted successfully!');
                    loadMenuItems(); // Re-render menu items
                } catch (error) {
                    console.error("Error deleting item:", error);
                    alert("Failed to delete item: " + error.message);
                }
            }
        }
    });
}
