// edit-order.js

document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const auth = firebase.auth(); // Get Firebase Auth instance
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    const loadingState = document.getElementById('loading-state');
    const container = document.getElementById('edit-order-container');
    const itemsContainer = document.getElementById('items-container');
    const orderIdDisplay = document.getElementById('order-id-display');
    const saveChangesBtn = document.getElementById('save-changes-btn');

    // --- Modal Elements ---
    const addItemBtn = document.getElementById('add-item-btn');
    const addItemModal = document.getElementById('add-item-modal');
    const closeAddModalBtn = document.getElementById('close-add-modal-btn');
    const menuItemSearch = document.getElementById('menu-item-search');
    const menuItemsList = document.getElementById('menu-items-list');
    
    // Price elements
    const subtotalEl = document.getElementById('subtotal');
    const taxesEl = document.getElementById('taxes');
    const deliveryFeeEl = document.getElementById('delivery-fee');
    const discountEl = document.getElementById('discount');
    const finalTotalEl = document.getElementById('final-total');

    let currentOrder = null;
    let menuItemsCache = {}; // Cache for all menu items
    const TAX_RATE = 0.20;

    if (!orderId) {
        loadingState.style.display = 'none';
        container.innerHTML = '<p class="text-red-500 text-center">No Order ID found.</p>';
        container.classList.remove('hidden');
        return;
    }

    orderIdDisplay.textContent = `ID: ${orderId}`;

    // --- Functions ---

    function fetchMenuItems() {
        db.ref('menu').once('value', (snapshot) => {
            if (snapshot.exists()) {
                const menuData = snapshot.val();
                menuItemsCache = {};
                for (const categoryId in menuData) {
                    const category = menuData[categoryId];
                    if (category.items) {
                        for (const itemId in category.items) {
                            menuItemsCache[itemId] = { id: itemId, categoryId, ...category.items[itemId] };
                        }
                    }
                }
            }
        }).catch(error => console.error("Error fetching menu items:", error));
    }

    function renderMenuItemsInModal(filter = '') {
        menuItemsList.innerHTML = '';
        const filterLower = filter.toLowerCase();
        const filteredItems = Object.values(menuItemsCache).filter(item =>
            item.name.toLowerCase().includes(filterLower)
        );

        if (filteredItems.length === 0) {
            menuItemsList.innerHTML = '<p class="text-gray-500 text-center">No items found.</p>';
            return;
        }

        filteredItems.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex justify-between items-center p-2 hover:bg-gray-100 rounded-md';
            itemEl.innerHTML = `
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-500">${(item.price || 0).toFixed(2)} MAD</p>
                </div>
                <div class="flex items-center gap-2">
                     <button class="add-standard-item-btn bg-green-500 text-white text-xs px-2 py-1 rounded-md hover:bg-green-600" data-item-id="${item.id}">+ Quick Add</button>
                     <a href="item-details.html?categoryId=${item.categoryId}&itemId=${item.id}&editOrderId=${orderId}" class="customize-link-btn bg-blue-500 text-white text-xs px-2 py-1 rounded-md hover:bg-blue-600">Customize</a>
                </div>
            `;
            menuItemsList.appendChild(itemEl);
        });
    }

    function calculateTotals() {
        if (!currentOrder) return;
        const subtotal = currentOrder.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxes = subtotal * TAX_RATE;
        const deliveryFee = currentOrder.priceDetails.deliveryFee || 0;
        const discount = currentOrder.priceDetails.discount || 0;
        const finalTotal = subtotal + taxes + deliveryFee - discount;
        subtotalEl.textContent = `${subtotal.toFixed(2)} MAD`;
        taxesEl.textContent = `${taxes.toFixed(2)} MAD`;
        deliveryFeeEl.textContent = `${deliveryFee.toFixed(2)} MAD`;
        discountEl.textContent = `-${discount.toFixed(2)} MAD`;
        finalTotalEl.textContent = `${finalTotal.toFixed(2)} MAD`;
        currentOrder.priceDetails.itemsTotal = subtotal;
        currentOrder.priceDetails.taxes = taxes;
        currentOrder.priceDetails.finalTotal = finalTotal;
    }

    function renderItems() {
        itemsContainer.innerHTML = '';
        if (!currentOrder || !currentOrder.cart) return;

        currentOrder.cart.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row border-b pb-3';
            
            let customizationDetails = '';
            if (item.sizes && item.sizes.length > 0 && item.sizes[0].size !== 'Regular') {
                customizationDetails += `<span class="text-xs bg-gray-200 px-2 py-0.5 rounded-full">${item.sizes[0].size}</span>`;
            }
            if (item.options && item.options.length > 0) {
                customizationDetails += `<p class="text-xs text-gray-500 mt-1">+ ${item.options.join(', ')}</p>`;
            }

            itemDiv.innerHTML = `
                <div class="item-details">
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-500">${item.price.toFixed(2)} MAD</p>
                    <div class="mt-1 flex flex-wrap gap-1">${customizationDetails}</div>
                </div>
                <div class="item-qty flex items-center gap-2">
                    <button data-index="${index}" class="change-qty-btn bg-gray-200 w-6 h-6 rounded-full">-</button>
                    <span>${item.quantity}</span>
                    <button data-index="${index}" class="change-qty-btn bg-gray-200 w-6 h-6 rounded-full">+</button>
                </div>
                <button data-index="${index}" class="item-remove remove-item-btn text-red-500 hover:text-red-700 self-start pt-1"><i class="fas fa-trash"></i></button>
            `;
            itemsContainer.appendChild(itemDiv);
        });
        calculateTotals();
    }

    // --- Event Listeners ---
    
    itemsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const index = parseInt(target.dataset.index);

        if (target.classList.contains('remove-item-btn')) {
            if (confirm('Are you sure you want to remove this item?')) {
                currentOrder.cart.splice(index, 1);
                renderItems();
            }
        } else if (target.classList.contains('change-qty-btn')) {
            const delta = target.textContent === '+' ? 1 : -1;
            currentOrder.cart[index].quantity += delta;
            if (currentOrder.cart[index].quantity <= 0) {
                currentOrder.cart.splice(index, 1);
            }
            renderItems();
        }
    });

    saveChangesBtn.addEventListener('click', () => {
        if (!currentOrder) return;
        saveChangesBtn.textContent = 'Saving...';
        saveChangesBtn.disabled = true;

        db.ref(`orders/${orderId}`).update(currentOrder)
            .then(() => {
                alert('Order updated successfully!');
                window.location.href = 'dashboard.html';
            })
            .catch(err => {
                alert('Error updating order: ' + err.message);
                saveChangesBtn.textContent = 'Save Changes to Order';
                saveChangesBtn.disabled = false;
            });
    });
    
    addItemBtn.addEventListener('click', () => {
        renderMenuItemsInModal();
        addItemModal.classList.remove('hidden');
    });

    closeAddModalBtn.addEventListener('click', () => addItemModal.classList.add('hidden'));

    menuItemSearch.addEventListener('input', (e) => renderMenuItemsInModal(e.target.value));

    menuItemsList.addEventListener('click', (e) => {
        const target = e.target;
        const itemContainer = target.closest('.flex.justify-between');
        if (!itemContainer) return;

        if (target.matches('.add-standard-item-btn')) {
            const itemId = target.dataset.itemId;
            const itemToAdd = menuItemsCache[itemId];

            if (itemToAdd && currentOrder) {
                const existingItemInCart = currentOrder.cart.find(cartItem => cartItem.id === itemId && (!cartItem.options || cartItem.options.length === 0) && (!cartItem.sizes || cartItem.sizes.length === 0 || cartItem.sizes[0].size === 'Regular'));
                
                if (existingItemInCart) {
                    existingItemInCart.quantity++;
                } else {
                    currentOrder.cart.push({
                        id: itemToAdd.id,
                        name: itemToAdd.name,
                        price: itemToAdd.price,
                        quantity: 1,
                        options: [],
                        sizes: itemToAdd.sizes ? [itemToAdd.sizes.find(s => s.size === 'Regular') || itemToAdd.sizes[0]] : []
                    });
                }
                
                renderItems(); 
                addItemModal.classList.add('hidden');
            }
        }
    });

    // --- Initial Load ---
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchMenuItems();
            db.ref(`orders/${orderId}`).once('value', (snapshot) => {
                if (snapshot.exists()) {
                    currentOrder = snapshot.val();
                    
                    // Check for a new item from the customization page
                    const newItemData = sessionStorage.getItem('newItemForOrder');
                    if (newItemData) {
                        const { item, forOrderId } = JSON.parse(newItemData);
                        if (forOrderId === orderId) {
                            if (!currentOrder.cart) currentOrder.cart = [];
                            currentOrder.cart.push(item);
                            sessionStorage.removeItem('newItemForOrder'); // Clean up immediately
                        }
                    }

                    renderItems();
                    loadingState.style.display = 'none';
                    container.classList.remove('hidden');
                } else {
                    loadingState.style.display = 'none';
                    container.innerHTML = '<p class="text-red-500 text-center">Order not found.</p>';
                    container.classList.remove('hidden'); 
                }
            }).catch(error => {
                console.error("Error fetching order details:", error);
                loadingState.style.display = 'none';
                container.innerHTML = `<p class="text-red-500 text-center">Error loading order: ${error.message}. Please check console for details.</p>`;
                container.classList.remove('hidden');
            });
        } else {
            loadingState.style.display = 'none';
            container.innerHTML = '<p class="text-red-500 text-center">You must be logged in to view this page.</p>';
            container.classList.remove('hidden'); 
        }
    });
});

