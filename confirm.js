// /confirm.js

const db = firebase.database();
const auth = firebase.auth();

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return new DOMParser().parseFromString(str, 'text/html').body.textContent || '';
}

function updateStatusTracker(status, orderType) {
    const trackerContainer = document.getElementById('status-tracker-container');
    trackerContainer.innerHTML = ''; // Clear previous tracker

    let statuses, labels, icons;

    if (orderType === 'delivery') {
        statuses = ['pending', 'preparing', 'out for delivery', 'delivered'];
        labels = ['Pending', 'Preparing', 'On its Way', 'Delivered'];
        icons = ['fa-receipt', 'fa-utensils', 'fa-biking', 'fa-check-double'];
    } else { // 'dineIn' or 'pickup'
        statuses = ['pending', 'preparing', 'ready', 'completed'];
        labels = ['Pending', 'Preparing', 'Ready', 'Completed'];
        icons = ['fa-receipt', 'fa-utensils', 'fa-clipboard-check', 'fa-check-double'];
    }

    if (status.toLowerCase() === 'cancelled') {
        trackerContainer.innerHTML = `<div class="w-full text-center text-red-600 font-bold text-lg p-4 bg-red-50 rounded-lg">This order has been cancelled.</div>`;
        document.getElementById('confirmation-title').textContent = 'Order Cancelled';
        document.getElementById('confirmation-subtitle').textContent = 'This order is no longer active.';
        document.querySelector('.success-checkmark')?.classList.add('hidden');
        return;
    }
    
    trackerContainer.innerHTML = `<div class="progress-bar-container"><div id="status-progress-bar" class="progress-bar"></div></div>`;
    statuses.forEach((stepKey, index) => {
        const stepEl = document.createElement('div');
        stepEl.id = `status-step-${stepKey.replace(/\s/g, '-')}`;
        stepEl.className = 'status-step-new';
        stepEl.innerHTML = `
            <div class="status-dot-new"><i class="fas ${icons[index]}"></i></div>
            <div class="status-label-new">${labels[index]}</div>`;
        trackerContainer.appendChild(stepEl);
    });
    
    const currentStatusIndex = statuses.indexOf(status.toLowerCase());
    if (currentStatusIndex === -1) return;

    statuses.forEach((stepKey, index) => {
        const stepEl = document.getElementById(`status-step-${stepKey.replace(/\s/g, '-')}`);
        if (!stepEl) return;
        
        stepEl.classList.remove('active', 'completed');
        if (index < currentStatusIndex) {
            stepEl.classList.add('completed');
        } else if (index === currentStatusIndex) {
            stepEl.classList.add('active');
        }
    });

    const progressBar = document.getElementById('status-progress-bar');
    if (progressBar) {
        const progressPercentage = (currentStatusIndex / (statuses.length - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }
}


function displayOrderDetails(orderId, orderData) {
    const orderIdDisplay = document.getElementById('order-id-display');
    const summaryDetails = document.getElementById('order-summary-details');
    const itemsList = document.getElementById('items-list');
    const totalsSection = document.getElementById('totals-section');
    const newOrderBtn = document.getElementById('new-order-btn');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    const feedbackCtaSection = document.getElementById('feedback-cta-section');
    const leaveFeedbackBtn = document.getElementById('leave-feedback-btn');

    orderIdDisplay.innerHTML = `Order ID: <strong>#${orderData.orderId}</strong>`;
    itemsList.innerHTML = '';
    
    // --- [FIX] Read from 'cart' instead of 'items' for consistency ---
    const { orderType, deliveryAddress, table, timestamp, cart, priceDetails, status } = orderData;

    summaryDetails.innerHTML = `
        <p><strong>Order Type:</strong> <span class="capitalize">${escapeHTML(orderType)}</span></p>
        <p><strong>Placed At:</strong> ${new Date(timestamp).toLocaleString()}</p>
        ${deliveryAddress ? `<p><strong>Delivery To:</strong> ${escapeHTML(deliveryAddress)}</p>` : ''}
        ${table ? `<p><strong>Table Number:</strong> ${escapeHTML(table)}</p>` : ''}
    `;

    // --- [FIX] Read from 'cart' instead of 'items' ---
    if (cart && cart.length > 0) {
        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-start pb-2 border-b border-gray-100';
            li.innerHTML = `
                <div>
                    <span class="font-semibold">${item.quantity}x ${escapeHTML(item.name)}</span>
                    ${item.options && item.options.length > 0 ? `<div class="text-xs text-gray-500 pl-4">${item.options.join(', ')}</div>` : ''}
                </div>
                <span class="font-medium whitespace-nowrap">${(item.price * item.quantity).toFixed(2)} MAD</span>
            `;
            itemsList.appendChild(li);
        });
    } else {
        itemsList.innerHTML = '<li>No items found in this order.</li>';
    }


    totalsSection.innerHTML = `
        <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>${priceDetails.itemsTotal.toFixed(2)} MAD</span></div>
        ${priceDetails.taxes > 0 ? `<div class="flex justify-between text-gray-600"><span>Taxes</span><span>${priceDetails.taxes.toFixed(2)} MAD</span></div>` : ''}
        ${priceDetails.deliveryFee > 0 ? `<div class="flex justify-between text-gray-600"><span>Delivery Fee</span><span>${priceDetails.deliveryFee.toFixed(2)} MAD</span></div>` : ''}
        ${priceDetails.discount > 0 ? `<div class="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>-${priceDetails.discount.toFixed(2)} MAD</span></div>` : ''}
        <div class="flex justify-between text-xl font-bold text-gray-900 mt-2 pt-2 border-t"><span>Total</span><span>${priceDetails.finalTotal.toFixed(2)} MAD</span></div>
    `;

    updateStatusTracker(status, orderType);

    const isCancellable = status === 'pending';
    cancelOrderBtn.classList.toggle('hidden', !isCancellable);

    const canBeRated = ['delivered', 'completed'].includes(status);
    const hasBeenRated = orderData.rated === true || orderData.feedback;
    feedbackCtaSection.classList.toggle('hidden', !(canBeRated && !hasBeenRated));
    if (canBeRated && !hasBeenRated) {
        leaveFeedbackBtn.href = `feedback.html?orderId=${orderId}`;
    }

    if (newOrderBtn) {
        newOrderBtn.href = orderType === 'dineIn' ? 'menu.html' : 'order-type-selection.html';
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
    if (!btn) return;

    btn.addEventListener('click', () => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        btn.disabled = true;
        const elementToCapture = document.getElementById('confirmation-content');
        html2pdf().set({
            margin: 0.5,
            filename: `PizzaHut_Order_${orderId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: -window.scrollY },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).from(elementToCapture).save().then(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }).catch(err => {
            console.error("PDF generation failed:", err);
            btn.innerHTML = originalHtml;
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

    localStorage.removeItem("cart");
    localStorage.removeItem("appliedPromo");

    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    if(cancelOrderBtn){
        cancelOrderBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
                db.ref(`orders/${orderId}/status`).set('cancelled')
                .catch(error => console.error("Error cancelling order:", error));
            }
        });
    }

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
            const canView = !user || (user && orderData.customerInfo.userId === user.uid) || (orderData.customerInfo.userId === 'guest');

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
