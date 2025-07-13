// edit-order.js

document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    const loadingState = document.getElementById('loading-state');
    const container = document.getElementById('edit-order-container');
    const itemsContainer = document.getElementById('items-container');
    const orderIdDisplay = document.getElementById('order-id-display');
    const saveChangesBtn = document.getElementById('save-changes-btn');

    // Price elements
    const subtotalEl = document.getElementById('subtotal');
    const taxesEl = document.getElementById('taxes');
    const deliveryFeeEl = document.getElementById('delivery-fee');
    const discountEl = document.getElementById('discount');
    const finalTotalEl = document.getElementById('final-total');

    let currentOrder = null;
    const TAX_RATE = 0.20;

    if (!orderId) {
        container.innerHTML = '<p class="text-red-500 text-center">No Order ID found.</p>';
        loadingState.style.display = 'none';
        return;
    }

    orderIdDisplay.textContent = `ID: ${orderId}`;

    // --- Functions ---

    function calculateTotals() {
        if (!currentOrder) return;

        const subtotal = currentOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxes = subtotal * TAX_RATE;
        const deliveryFee = currentOrder.priceDetails.deliveryFee || 0;
        const discount = currentOrder.priceDetails.discount || 0;
        const finalTotal = subtotal + taxes + deliveryFee - discount;

        // Update UI
        subtotalEl.textContent = `${subtotal.toFixed(2)} MAD`;
        taxesEl.textContent = `${taxes.toFixed(2)} MAD`;
        deliveryFeeEl.textContent = `${deliveryFee.toFixed(2)} MAD`;
        discountEl.textContent = `-${discount.toFixed(2)} MAD`;
        finalTotalEl.textContent = `${finalTotal.toFixed(2)} MAD`;

        // Update the order object in memory
        currentOrder.priceDetails.itemsTotal = subtotal;
        currentOrder.priceDetails.taxes = taxes;
        currentOrder.priceDetails.finalTotal = finalTotal;
    }

    function renderItems() {
        itemsContainer.innerHTML = '';
        if (!currentOrder || !currentOrder.items) return;

        currentOrder.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row border-b pb-3';
            itemDiv.innerHTML = `
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-500">${item.price.toFixed(2)} MAD</p>
                </div>
                <div class="flex items-center gap-2">
                    <button data-index="${index}" class="change-qty-btn bg-gray-200 w-6 h-6 rounded-full">-</button>
                    <span>${item.quantity}</span>
                    <button data-index="${index}" class="change-qty-btn bg-gray-200 w-6 h-6 rounded-full">+</button>
                </div>
                <button data-index="${index}" class="remove-item-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
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
                currentOrder.items.splice(index, 1);
                renderItems();
            }
        } else if (target.classList.contains('change-qty-btn')) {
            const delta = target.textContent === '+' ? 1 : -1;
            currentOrder.items[index].quantity += delta;
            if (currentOrder.items[index].quantity <= 0) {
                currentOrder.items.splice(index, 1);
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

    // --- Initial Load ---
    
    db.ref(`orders/${orderId}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
            currentOrder = snapshot.val();
            renderItems();
            loadingState.style.display = 'none';
            container.classList.remove('hidden');
        } else {
            loadingState.style.display = 'none';
            container.innerHTML = '<p class="text-red-500 text-center">Order not found.</p>';
        }
    });
});