// order-details.js

const db = firebase.database();
const auth = firebase.auth();

// --- UI Elements ---
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessageText = document.getElementById('error-message-text');
const contentDiv = document.getElementById('order-details-content');
const actionButtonsDiv = document.getElementById('action-buttons');

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return new DOMParser().parseFromString(str, 'text/html').body.textContent || '';
}

function updateStatusTracker(status, orderType) {
    let statuses = ['pending', 'preparing'];
    if (orderType === 'delivery') {
        statuses.push('out for delivery', 'delivered');
    } else {
        statuses.push('ready', 'completed');
    }

    let currentStatusIndex = statuses.indexOf(status.toLowerCase());
    
    if (currentStatusIndex === -1 && status.toLowerCase() === 'completed') {
        currentStatusIndex = statuses.length - 1;
    }

    if (currentStatusIndex === -1) return;

    for (let i = 0; i <= currentStatusIndex; i++) {
        const stepId = `status-step-${statuses[i].replace(/\s/g, '-')}`;
        const stepEl = document.getElementById(stepId);
        if (stepEl) stepEl.classList.add('completed');
    }

    const progressBar = document.getElementById('status-progress-bar');
    if (progressBar) {
        const progressPercentage = (currentStatusIndex / (statuses.length - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }
}

function renderOrderDetails(orderData) {
    const { orderId, orderNumber, orderType, items, priceDetails, timestamp, customerInfo, status } = orderData;
    
    let statusLabels = ['Placed', 'Preparing'];
    if (orderType === 'delivery') {
        statusLabels.push('On its way', 'Delivered');
    } else {
        statusLabels.push('Ready', 'Completed');
    }

    let statusSteps = ['pending', 'preparing'];
    if (orderType === 'delivery') {
        statusSteps.push('out for delivery', 'delivered');
    } else {
        statusSteps.push('ready', 'completed');
    }

    let itemsHtml = items.map(item => `
        <li class="flex justify-between items-center text-sm pb-3 border-b border-gray-100">
            <div class="flex items-center">
                <span class="font-bold text-red-600 mr-3">${item.quantity}x</span>
                <span class="font-semibold">${escapeHTML(item.name)}</span>
            </div>
            <span class="font-medium">${(item.price * item.quantity).toFixed(2)} MAD</span>
        </li>
    `).join('');

    let priceDetailsHtml = `
        <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>${priceDetails.itemsTotal.toFixed(2)} MAD</span></div>
        ${priceDetails.taxes > 0 ? `<div class="flex justify-between text-gray-600"><span>Taxes</span><span>${priceDetails.taxes.toFixed(2)} MAD</span></div>` : ''}
        ${priceDetails.deliveryFee > 0 ? `<div class="flex justify-between text-gray-600"><span>Delivery Fee</span><span>${priceDetails.deliveryFee.toFixed(2)} MAD</span></div>` : ''}
        ${priceDetails.discount > 0 ? `<div class="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>-${priceDetails.discount.toFixed(2)} MAD</span></div>` : ''}
        <div class="flex justify-between text-2xl font-bold text-gray-900 mt-3 pt-3 border-t"><span>Total</span><span>${priceDetails.finalTotal.toFixed(2)} MAD</span></div>
    `;

    contentDiv.innerHTML = `
        <div class="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <div class="status-tracker">
                <div id="status-progress-bar"></div>
                ${statusSteps.map((step, index) => `
                    <div id="status-step-${step.replace(/\s/g, '-')}" class="status-step">
                        <div class="status-dot"><i class="fas fa-receipt"></i></div>
                        <div class="status-label">${statusLabels[index]}</div>
                    </div>
                `).join('<div class="status-line"></div>')}
            </div>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Order Summary</h2>
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-lg font-semibold mb-3">Your Items</h3>
                    <ul class="space-y-3">${itemsHtml}</ul>
                </div>
                <div class="space-y-6">
                     <div>
                        <h3 class="text-lg font-semibold mb-3">Details</h3>
                        <div class="space-y-2 text-gray-600">
                            <p><strong>Order ID:</strong> #${orderId}</p>
                            <p><strong>Daily Number:</strong> ${orderNumber}</p>
                            <p><strong>Placed At:</strong> ${new Date(timestamp).toLocaleString()}</p>
                            <p><strong>Customer:</strong> ${escapeHTML(customerInfo.name)} (${escapeHTML(customerInfo.phone)})</p>
                            ${orderData.table ? `<p><strong>Table Number:</strong> ${orderData.table}</p>` : ''}
                            ${orderData.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${escapeHTML(orderData.deliveryAddress)}</p>` : ''}
                        </div>
                    </div>
                    <div>
                         <h3 class="text-lg font-semibold mb-3">Totals</h3>
                         <div class="space-y-2 text-gray-800">${priceDetailsHtml}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadingState.style.display = 'none';
    contentDiv.classList.remove('hidden');
    // *** THIS IS THE CORRECTED LINE ***
    actionButtonsDiv.classList.remove('hidden'); 
    
    updateStatusTracker(status, orderType);
}

function showError(message) {
    loadingState.style.display = 'none';
    errorMessageText.textContent = message;
    errorState.classList.remove('hidden');
}

function setupPdfButton(orderId) {
    const btn = document.getElementById('save-pdf-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        btn.disabled = true;

        // The element to capture is the content div, not the button container
        const elementToCapture = document.getElementById('order-details-content');
        
        const options = {
            margin: 0.5,
            filename: `PizzaHut_Order_${orderId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: -window.scrollY },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(options).from(elementToCapture).save().then(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }).catch(err => {
            console.error("PDF generation failed:", err);
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            alert("Sorry, there was an error creating the PDF.");
        });
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
        showError('No Order ID provided in the URL.');
        return;
    }

    const orderRef = db.ref('orders/' + orderId);
    
    orderRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            showError('The requested order could not be found.');
            orderRef.off();
            return;
        }
        
        const orderData = snapshot.val();
        
        auth.onAuthStateChanged(user => {
            const canView = (user && orderData.customerInfo.userId === user.uid) || 
                            (orderData.customerInfo.userId === 'guest');

            if (canView) {
                renderOrderDetails(orderData);
                if (!document.getElementById('save-pdf-btn')._isSetup) {
                    setupPdfButton(orderId);
                    document.getElementById('save-pdf-btn')._isSetup = true;
                }
            } else {
                if(user) {
                     user.getIdTokenResult().then(idTokenResult => {
                        if (idTokenResult.claims.admin) {
                            renderOrderDetails(orderData);
                            if (!document.getElementById('save-pdf-btn')._isSetup) {
                                setupPdfButton(orderId);
                                document.getElementById('save-pdf-btn')._isSetup = true;
                            }
                        } else {
                            showError("You don't have permission to view this order.");
                        }
                    });
                } else {
                     showError("You must be logged in to view this order.");
                }
            }
        });

    }, (error) => {
        console.error("Firebase read failed: " + error.message);
        showError("An error occurred while fetching the order.");
    });
});