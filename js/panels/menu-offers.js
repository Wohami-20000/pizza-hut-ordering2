// /js/panels/menu-offers.js

const db = firebase.database();

// --- MODAL ELEMENTS (will be dynamically added to panelRoot) ---
let editModal, editModalTitle, editForm, editIdInput, editTypeInput;
let currentEditType = ''; // 'item' or 'offer'
let currentEditId = ''; // Firebase key of the item/offer being edited

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

/**
 * Creates the HTML for a single offer row.
 */
function createOfferRow(offerId, offerData) {
    const expiryDate = offerData.expiryDate ? new Date(offerData.expiryDate).toLocaleDateString() : 'N/A';
    const description = offerData.description ? (offerData.description.length > 50 ? offerData.description.substring(0, 50) + '...' : offerData.description) : 'N/A';

    return `
        <tr class="hover:bg-gray-50 transition duration-150 ease-in-out" data-offer-id="${offerId}">
            <td class="px-4 py-3 text-sm text-gray-700 font-medium">${offerData.name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${description}</td>
            <td class="px-4 py-3 text-sm text-gray-700 font-mono">${offerData.code || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${expiryDate}</td>
            <td class="px-4 py-3 text-center text-sm">
                <button class="edit-offer-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 transition shadow-sm mr-2">Edit</button>
                <button class="delete-offer-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 transition shadow-sm">Delete</button>
            </td>
        </tr>
    `;
}

// --- MODAL FUNCTIONS ---
function openEditModal(type, id, data) {
    currentEditType = type;
    currentEditId = id;

    editModalTitle.textContent = `Edit ${type === 'item' ? 'Menu Item' : 'Offer'}`;
    editForm.innerHTML = ''; // Clear previous form content

    let formHtml = '';
    if (type === 'item') {
        formHtml = `
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
                <label for="edit-item-price" class="block text-sm font-medium text-gray-700">Price (MAD)</label>
                <input type="number" id="edit-item-price" step="0.01" value="${data.price || 0}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="edit-item-image-url" class="block text-sm font-medium text-gray-700">Image URL</label>
                <input type="url" id="edit-item-image-url" value="${data.image_url || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            `;
    } else if (type === 'offer') {
        formHtml = `
            <div>
                <label for="edit-offer-name" class="block text-sm font-medium text-gray-700">Offer Name</label>
                <input type="text" id="edit-offer-name" value="${data.name || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="edit-offer-description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="edit-offer-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">${data.description || ''}</textarea>
            </div>
            <div>
                <label for="edit-offer-code" class="block text-sm font-medium text-gray-700">Promo Code</label>
                <input type="text" id="edit-offer-code" value="${data.code || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm uppercase">
            </div>
            <div>
                <label for="edit-offer-discount-type" class="block text-sm font-medium text-gray-700">Discount Type</label>
                <select id="edit-offer-discount-type" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="percentage" ${data.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                    <option value="fixed" ${data.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount (MAD)</option>
                    <option value="free_delivery" ${data.discountType === 'free_delivery' ? 'selected' : ''}>Free Delivery</option>
                </select>
            </div>
            <div>
                <label for="edit-offer-discount-value" class="block text-sm font-medium text-gray-700">Discount Value</label>
                <input type="number" id="edit-offer-discount-value" step="0.01" value="${data.discountValue || 0}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <p class="text-xs text-gray-500 mt-1">Leave empty for Free Delivery.</p>
            </div>
            <div>
                <label for="edit-offer-min-order-value" class="block text-sm font-medium text-gray-700">Minimum Order Value (MAD)</label>
                <input type="number" id="edit-offer-min-order-value" step="0.01" value="${data.minOrderValue || 0}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="edit-offer-expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input type="date" id="edit-offer-expiry-date" value="${data.expiryDate || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="edit-offer-image-url" class="block text-sm font-medium text-gray-700">Image URL (for slideshow)</label>
                <input type="url" id="edit-offer-image-url" value="${data.imageURL || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
        `;
    }
    
    editForm.innerHTML = formHtml;
    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset(); // Clear form fields
    currentEditType = '';
    currentEditId = '';
}

async function saveEditedEntity(event) {
    event.preventDefault(); // Prevent default form submission

    let updatedData = {};
    let dbRef;

    if (currentEditType === 'item') {
        const categoryId = document.getElementById('edit-item-category-id').value;
        updatedData = {
            name: document.getElementById('edit-item-name').value,
            description: document.getElementById('edit-item-description').value,
            price: parseFloat(document.getElementById('edit-item-price').value),
            image_url: document.getElementById('edit-item-image-url').value,
            // Keep existing options, sizes, recipes if not updated here.
            // For a full implementation, you might fetch and merge, or have fields for them.
        };
        dbRef = db.ref(`menu/${categoryId}/items/${currentEditId}`);
    } else if (currentEditType === 'offer') {
        updatedData = {
            name: document.getElementById('edit-offer-name').value,
            description: document.getElementById('edit-offer-description').value,
            code: document.getElementById('edit-offer-code').value.toUpperCase(),
            discountType: document.getElementById('edit-offer-discount-type').value,
            discountValue: parseFloat(document.getElementById('edit-offer-discount-value').value) || 0,
            minOrderValue: parseFloat(document.getElementById('edit-offer-min-order-value').value) || 0,
            expiryDate: document.getElementById('edit-offer-expiry-date').value,
            imageURL: document.getElementById('edit-offer-image-url').value,
        };
        dbRef = db.ref(`promoCodes/${currentEditId}`);
    }

    try {
        await dbRef.update(updatedData);
        alert(`${currentEditType === 'item' ? 'Item' : 'Offer'} updated successfully!`);
        closeEditModal();
        // Re-render the respective list to show updated data
        if (currentEditType === 'item') {
            loadMenuItems();
        } else if (currentEditType === 'offer') {
            loadOffers();
        }
    } catch (error) {
        console.error(`Error updating ${currentEditType}:`, error);
        alert(`Failed to update ${currentEditType}: ` + error.message);
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

function loadOffers() {
    db.ref('promoCodes').once('value', (snapshot) => {
        const offersList = document.getElementById('offers-list');
        if (offersList) {
            offersList.innerHTML = ''; // Clear loading message
            if (snapshot.exists()) {
                let offersHtml = '';
                snapshot.forEach((offerSnapshot) => {
                    offersHtml += createOfferRow(offerSnapshot.key, offerSnapshot.val());
                });
                offersList.innerHTML = offersHtml || '<tr><td colspan="5" class="text-center p-4 text-gray-500">No offers found.</td></tr>';
            } else {
                offersList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">No offers found.</td></tr>';
            }
        }
    }).catch(error => {
        console.error("Error fetching offers:", error);
        const offersList = document.getElementById('offers-list');
        if(offersList) offersList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading offers.</td></td></tr>';
    });
}


// --- MAIN PANEL LOAD FUNCTION ---
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Menu & Offers Management';

    // Setup navigation for Admin within this panel
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white active-nav-link" data-content="menu-items"><i class="fas fa-pizza-slice mr-3"></i>Manage Menu Items</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white" data-content="offers"><i class="fas fa-tags mr-3"></i>Manage Offers</a>
        <hr class="border-gray-700 my-2">
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white" data-content="add-item"><i class="fas fa-plus-circle mr-3"></i>Add New Item</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white" data-content="add-offer"><i class="fas fa-gift mr-3"></i>Add New Offer</a>
    `;

    // Setup the main content areas, including the new Edit Modal
    panelRoot.innerHTML = `
        <div id="menu-items-section" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Current Menu Items</h2>
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

        <div id="offers-section" class="bg-white rounded-xl shadow-lg p-6 mt-8 hidden animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Current Offers</h2>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Offer Name</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expires</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="offers-list" class="bg-white divide-y divide-gray-200">
                        <tr><td colspan="5" class="text-center p-4 text-gray-500">Loading offers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="add-item-section" class="bg-white rounded-xl shadow-lg p-6 mt-8 hidden animate-fadeInUp">
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
                    <label for="new-item-price" class="block text-sm font-medium text-gray-700">Price (MAD)</label>
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
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition transform hover:scale-105">Add Item</button>
            </form>
        </div>

        <div id="add-offer-section" class="bg-white rounded-xl shadow-lg p-6 mt-8 hidden animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Add New Offer</h2>
            <form id="add-offer-form" class="space-y-4">
                <div>
                    <label for="new-offer-name" class="block text-sm font-medium text-gray-700">Offer Name</label>
                    <input type="text" id="new-offer-name" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label for="new-offer-description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="new-offer-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                </div>
                <div>
                    <label for="new-offer-code" class="block text-sm font-medium text-gray-700">Promo Code</label>
                    <input type="text" id="new-offer-code" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm uppercase">
                </div>
                 <div>
                    <label for="new-offer-discount-type" class="block text-sm font-medium text-gray-700">Discount Type</label>
                    <select id="new-offer-discount-type" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (MAD)</option>
                        <option value="free_delivery">Free Delivery</option>
                    </select>
                </div>
                <div>
                    <label for="new-offer-discount-value" class="block text-sm font-medium text-gray-700">Discount Value</label>
                    <input type="number" id="new-offer-discount-value" step="0.01" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    <p class="text-xs text-gray-500 mt-1">Leave empty for Free Delivery.</p>
                </div>
                <div>
                    <label for="new-offer-min-order-value" class="block text-sm font-medium text-gray-700">Minimum Order Value (MAD)</label>
                    <input type="number" id="new-offer-min-order-value" step="0.01" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" value="0">
                </div>
                <div>
                    <label for="new-offer-expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input type="date" id="new-offer-expiry-date" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label for="new-offer-image-url" class="block text-sm font-medium text-gray-700">Image URL (for slideshow)</label>
                    <input type="url" id="new-offer-image-url" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                </div>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition transform hover:scale-105">Add Offer</button>
            </form>
        </div>

        <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <h3 id="edit-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Edit Item/Offer</h3>
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
    const showContentSection = (sectionId) => {
        document.querySelectorAll('#panel-root > div').forEach(section => {
            // Exclude the modal from being hidden
            if (section.id !== 'edit-modal') {
                section.classList.add('hidden');
            }
        });
        document.getElementById(sectionId).classList.remove('hidden');

        // Update active class for nav links
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('active-nav-link');
        });
        document.querySelector(`#sidebar-nav a[data-content="${sectionId.replace('-section', '')}"]`)?.classList.add('active-nav-link');
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
    loadOffers();


    // Populate category dropdown for Add New Item form
    function populateCategoryDropdown() {
        const categorySelect = document.getElementById('new-item-category');
        const editItemCategorySelect = document.getElementById('edit-item-category'); // Assuming an edit category select exists if we implement it

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
                        // if (editItemCategorySelect) editItemCategorySelect.appendChild(option.cloneNode(true)); // For edit form
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
        const newItem = {
            name: document.getElementById('new-item-name').value,
            description: document.getElementById('new-item-description').value,
            price: parseFloat(document.getElementById('new-item-price').value),
            category: document.getElementById('new-item-category').value,
            image_url: document.getElementById('new-item-image-url').value || 'https://www.pizzahut.ma/images/Default_pizza.png',
            options: [], // Default options for new items
            sizes: [{size: "Regular", price: parseFloat(document.getElementById('new-item-price').value)}], // Default size
            recipes: [] // Default recipes
        };

        if (!newItem.category) {
            alert('Please select a category.');
            return;
        }

        try {
            await db.ref(`menu/${newItem.category}/items`).push(newItem);
            alert('Item added successfully!');
            e.target.reset(); // Clear form
            loadMenuItems(); // Re-render menu items to update list

        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item: " + error.message);
        }
    });

    // Handle Add New Offer form submission
    document.getElementById('add-offer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newOffer = {
            name: document.getElementById('new-offer-name').value,
            description: document.getElementById('new-offer-description').value,
            code: document.getElementById('new-offer-code').value.toUpperCase(),
            discountType: document.getElementById('new-offer-discount-type').value,
            discountValue: parseFloat(document.getElementById('new-offer-discount-value').value) || 0,
            minOrderValue: parseFloat(document.getElementById('new-offer-min-order-value').value) || 0,
            expiryDate: document.getElementById('new-offer-expiry-date').value,
            imageURL: document.getElementById('new-offer-image-url').value || 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=1935&auto=format&fit=crop',
            createdAt: new Date().toISOString()
        };

        if (newOffer.discountType !== 'free_delivery' && (isNaN(newOffer.discountValue) || newOffer.discountValue <= 0)) {
            alert('Please enter a valid discount value for the selected discount type.');
            return;
        }
        if (newOffer.minOrderValue < 0) {
            alert('Minimum order value cannot be negative.');
            return;
        }
        if (!newOffer.expiryDate) {
            alert('Please select an expiry date.');
            return;
        }

        try {
            await db.ref('promoCodes').push(newOffer);
            alert('Offer added successfully!');
            e.target.reset(); // Clear form
            loadOffers(); // Re-render offers to update list
        } catch (error) {
            console.error("Error adding offer:", error);
            alert("Failed to add offer: " + error.message);
        }
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
                    openEditModal('item', itemId, { ...itemData, category: categoryId });
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
        // --- Edit Offer ---
        else if (target.classList.contains('edit-offer-btn')) {
            const row = target.closest('tr');
            const offerId = row.dataset.offerId;
            
            try {
                const offerSnapshot = await db.ref(`promoCodes/${offerId}`).once('value');
                if (offerSnapshot.exists()) {
                    openEditModal('offer', offerId, offerSnapshot.val());
                } else {
                    alert('Offer not found!');
                }
            } catch (error) {
                console.error("Error fetching offer for edit:", error);
                alert("Failed to fetch offer details: " + error.message);
            }
        } 
        // --- Delete Offer ---
        else if (target.classList.contains('delete-offer-btn')) {
            const row = target.closest('tr');
            const offerId = row.dataset.offerId;
            if (confirm(`Are you sure you want to delete offer ${row.querySelector('td:first-child').textContent}? This cannot be undone.`)) {
                try {
                    await db.ref(`promoCodes/${offerId}`).remove();
                    alert('Offer deleted successfully!');
                    loadOffers(); // Re-render offers
                } catch (error) {
                    console.error("Error deleting offer:", error);
                    alert("Failed to delete offer: " + error.message);
                }
            }
        }
    });
}