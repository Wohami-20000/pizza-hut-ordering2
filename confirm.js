const db = firebase.database();
const auth = firebase.auth();

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return new DOMParser().parseFromString(str, 'text/html').body.textContent || '';
}

function updateStatusTracker(status) {
    const statuses = ['pending', 'preparing', 'out for delivery', 'delivered'];
    const currentStatusIndex = statuses.indexOf(status.toLowerCase());

    if (currentStatusIndex === -1) return;

    for (let i = 0; i <= currentStatusIndex; i++) {
        const stepId = `status-step-${statuses[i].replace(/\s/g, '-')}`;
        const stepEl = document.getElementById(stepId);
        if (stepEl) {
            stepEl.classList.add('completed');
        }
    }
    
    const progressBar = document.getElementById('status-progress-bar');
    if (progressBar) {
        const progressPercentage = (currentStatusIndex / (statuses.length - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }
}


function displayOrderDetails(orderId, orderData) {
    const detailsContainer = document.getElementById('order-summary-details');
    const itemsList = document.getElementById('items-list');
    const totalsSection = document.getElementById('totals-section');
    const newOrderBtn = document.getElementById('new-order-btn'); // Get the button

    detailsContainer.innerHTML = `<p><strong>Order ID:</strong> #${orderId.slice(-6).toUpperCase()}</p>`;
    itemsList.innerHTML = '';
    totalsSection.innerHTML = '';

    const orderType = orderData.orderType || 'N/A';
    detailsContainer.innerHTML += `<p><strong>Order Type:</strong> <span class="capitalize">${escapeHTML(orderType)}</span></p>`;

    if (orderData.deliveryAddress) {
        detailsContainer.innerHTML += `<p><strong>Delivery To:</strong> ${escapeHTML(orderData.deliveryAddress)}</p>`;
    }
    if (orderData.table) {
        detailsContainer.innerHTML += `<p><strong>Table Number:</strong> ${escapeHTML(orderData.table)}</p>`;
    }
    if (orderData.timestamp) {
        const date = new Date(orderData.timestamp);
        detailsContainer.innerHTML += `<p><strong>Placed At:</strong> ${date.toLocaleTimeString()}, ${date.toLocaleDateString()}</p>`;
    }

    orderData.cart.forEach(item => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center text-sm pb-3 border-b border-gray-100';
        li.innerHTML = `
            <div class="flex items-center">
                <span class="font-bold text-red-600 mr-3">${item.quantity}x</span>
                <span class="font-semibold">${escapeHTML(item.name)}</span>
            </div>
            <span class="font-medium">${(item.price * item.quantity).toFixed(2)} MAD</span>
        `;
        itemsList.appendChild(li);
    });
    
    totalsSection.innerHTML += `
        <div class="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${orderData.subtotal.toFixed(2)} MAD</span>
        </div>`;
    if (orderData.deliveryFee > 0) {
        totalsSection.innerHTML += `
            <div class="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>${orderData.deliveryFee.toFixed(2)} MAD</span>
            </div>`;
    }
    if (orderData.promoApplied) {
        totalsSection.innerHTML += `
            <div class="flex justify-between text-green-600 font-semibold">
                <span>Discount (${escapeHTML(orderData.promoApplied.code)})</span>
                <span>-${orderData.promoApplied.appliedDiscount.toFixed(2)} MAD</span>
            </div>`;
    }
     totalsSection.innerHTML += `
        <div class="flex justify-between text-2xl font-bold text-gray-900 mt-3 pt-3 border-t">
            <span>Total</span>
            <span>${orderData.totalPrice.toFixed(2)} MAD</span>
        </div>`;

    if(orderData.status) {
       updateStatusTracker(orderData.status);
    }
    
    // *** NEW LOGIC FOR THE "NEW ORDER" BUTTON ***
    if (newOrderBtn) {
        if (orderData.orderType === 'dineIn') {
            // For dine-in, go back to the menu. The table number is already in localStorage.
            newOrderBtn.href = 'menu.html';
        } else {
            // For pickup or delivery, go back to the order type selection.
            // Clear the table number just in case.
            localStorage.removeItem('tableNumber');
            newOrderBtn.href = 'order-type-selection.html';
        }
    }

    document.getElementById('loading-order').style.display = 'none';
    document.getElementById('confirmation-content').style.display = 'block';
}

function showError(message) {
    document.getElementById('loading-order').style.display = 'none';
    const errorDiv = document.getElementById('error-fetching-order');
    if (errorDiv.querySelector('#error-message-text')) {
       errorDiv.querySelector('#error-message-text').textContent = message;
    }
    errorDiv.style.display = 'block';
}

function setupPdfButton(orderId) {
    const btn = document.getElementById('save-pdf-btn');
    btn.addEventListener('click', () => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        btn.disabled = true;

        const element = document.getElementById('confirmation-content');
        const opt = {
            margin:       0.5,
            filename:     `PizzaHut_Order_${orderId}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: -window.scrollY },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || localStorage.getItem('lastOrderId');

    if (!orderId) {
        showError('No order ID found.');
        return;
    }

    // Clear the cart and promo code from the previous order
    localStorage.removeItem("cart"); 
    localStorage.removeItem("appliedPromo");

    auth.onAuthStateChanged(user => {
        if (user && user.isAnonymous) {
            document.getElementById('guest-cta-section').style.display = 'flex';
        }

        const orderRef = db.ref('orders/' + orderId);
        orderRef.on('value', snapshot => {
            if (!snapshot.exists()) {
                showError('This order could not be found.');
                orderRef.off();
                return;
            }
            
            const orderData = snapshot.val();

            // Permission check: allow if guest, or if logged-in user matches the order's userId
            const canView = !user || user.isAnonymous || (user && orderData.userId === user.uid);

            if (canView) {
                displayOrderDetails(orderId, orderData);
                if (!document.getElementById('save-pdf-btn')._isSetup) {
                    setupPdfButton(orderId);
                    document.getElementById('save-pdf-btn')._isSetup = true;
                }
            } else {
                showError('You do not have permission to view this order.');
                orderRef.off(); 
            }
        }, error => {
            console.error("Firebase fetch error:", error);
            showError('A server error occurred while fetching your order.');
        });
    });
});