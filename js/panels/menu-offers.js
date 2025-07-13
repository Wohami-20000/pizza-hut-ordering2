// /js/panels/menu-offers.js

const db = firebase.database();

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

/**
 * Main function to load the Menu & Offers Management Panel.
 */
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

    // Setup the main content areas
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
    `;

    // Function to show/hide content sections
    const showContentSection = (sectionId) => {
        document.querySelectorAll('#panel-root > div').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionId).classList.remove('hidden');

        // Update active class for nav links
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('active-nav-link');
        });
        document.querySelector(`#sidebar-nav a[data-content="${sectionId.replace('-section', '')}"]`).classList.add('active-nav-link');
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

    // Fetch and display menu items
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
            populateCategoryDropdown();
        }
    }).catch(error => {
        console.error("Error fetching menu items:", error);
        const menuItemsList = document.getElementById('menu-items-list');
        if(menuItemsList) menuItemsList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading menu items.</td></tr>';
    });

    // Fetch and display offers
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
        if(offersList) offersList.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading offers.</td></tr>';
    });

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
                // Optionally show an error to the user
            });
    }


    // Handle Add New Item form submission (basic implementation)
    document.getElementById('add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('new-item-name').value,
            description: document.getElementById('new-item-description').value,
            price: parseFloat(document.getElementById('new-item-price').value),
            category: document.getElementById('new-item-category').value,
            image_url: document.getElementById('new-item-image-url').value || 'https://www.pizzahut.ma/images/Default_pizza.png',
            // Default options for new items, can be expanded later
            options: [],
            sizes: [{size: "Regular", price: parseFloat(document.getElementById('new-item-price').value)}],
            recipes: []
        };

        if (!newItem.category) {
            alert('Please select a category.');
            return;
        }

        try {
            // Push to specific category's items
            await db.ref(`menu/${newItem.category}/items`).push(newItem);
            alert('Item added successfully!');
            e.target.reset(); // Clear form
            // Re-fetch and re-render menu items to update list
            db.ref('menu').once('value').then(snapshot => {
                const menuItemsList = document.getElementById('menu-items-list');
                menuItemsList.innerHTML = '';
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
                }
            });

        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item: " + error.message);
        }
    });

    // Handle Add New Offer form submission (basic implementation)
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

        try {
            await db.ref('promoCodes').push(newOffer);
            alert('Offer added successfully!');
            e.target.reset(); // Clear form
            // Re-fetch and re-render offers to update list
            db.ref('promoCodes').once('value').then(snapshot => {
                const offersList = document.getElementById('offers-list');
                offersList.innerHTML = '';
                if (snapshot.exists()) {
                    let offersHtml = '';
                    snapshot.forEach((offerSnapshot) => {
                        offersHtml += createOfferRow(offerSnapshot.key, offerSnapshot.val());
                    });
                    offersList.innerHTML = offersHtml || '<tr><td colspan="5" class="text-center p-4 text-gray-500">No offers found.</td></tr>';
                }
            });
        } catch (error) {
            console.error("Error adding offer:", error);
            alert("Failed to add offer: " + error.message);
        }
    });

    // Implement Edit/Delete for Menu Items (placeholders for now)
    panelRoot.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-item-btn')) {
            const row = target.closest('tr');
            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            alert(`Edit item: ${itemId} from category ${categoryId}`);
            // In a full implementation, you'd open a modal/form pre-filled for editing
        } else if (target.classList.contains('delete-item-btn')) {
            const row = target.closest('tr');
            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            if (confirm(`Are you sure you want to delete item ${itemId}?`)) {
                db.ref(`menu/${categoryId}/items/${itemId}`).remove()
                    .then(() => {
                        alert('Item deleted successfully!');
                        // Re-fetch and re-render menu items
                        db.ref('menu').once('value').then(snapshot => {
                            const menuItemsList = document.getElementById('menu-items-list');
                            menuItemsList.innerHTML = '';
                            if (snapshot.exists()) {
                                let itemsHtml = '';
                                snapshot.forEach((categorySnapshot) => {
                                    const catId = categorySnapshot.key;
                                    const catData = categorySnapshot.val();
                                    if (catData.items) {
                                        for (const itId in catData.items) {
                                            itemsHtml += createMenuItemRow(catId, itId, catData.items[itId]);
                                        }
                                    }
                                });
                                menuItemsList.innerHTML = itemsHtml || '<tr><td colspan="5" class="text-center p-4 text-gray-500">No menu items found.</td></tr>';
                            }
                        });
                    })
                    .catch(error => alert("Error deleting item: " + error.message));
            }
        }
    });

    // Implement Edit/Delete for Offers (placeholders for now)
    panelRoot.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-offer-btn')) {
            const row = target.closest('tr');
            const offerId = row.dataset.offerId;
            alert(`Edit offer: ${offerId}`);
            // In a full implementation, you'd open a modal/form pre-filled for editing
        } else if (target.classList.contains('delete-offer-btn')) {
            const row = target.closest('tr');
            const offerId = row.dataset.offerId;
            if (confirm(`Are you sure you want to delete offer ${offerId}?`)) {
                db.ref(`promoCodes/${offerId}`).remove()
                    .then(() => {
                        alert('Offer deleted successfully!');
                        // Re-fetch and re-render offers
                        db.ref('promoCodes').once('value').then(snapshot => {
                            const offersList = document.getElementById('offers-list');
                            offersList.innerHTML = '';
                            if (snapshot.exists()) {
                                let offersHtml = '';
                                snapshot.forEach((offerSnapshot) => {
                                    offersHtml += createOfferRow(offerSnapshot.key, offerSnapshot.val());
                                });
                                offersList.innerHTML = offersHtml || '<tr><td colspan="5" class="text-center p-4 text-gray-500">No offers found.</td></tr>';
                            }
                        });
                    })
                    .catch(error => alert("Error deleting offer: " + error.message));
            }
        }
    });
}