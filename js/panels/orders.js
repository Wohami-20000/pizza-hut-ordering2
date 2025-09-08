import { showToast, escapeHTML } from '../../ui-components.js';

// Store a reference to the database
const db = firebase.database();

// --- Helper Functions for Stock Management ---

/**
 * Gets today's date in YYYY-MM-DD format.
 * @returns {string} The formatted date string.
 */
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Processes a completed order to deduct ingredients from stock using Realtime Database.
 * @param {string} orderId - The ID of the order.
 * @param {object} orderData - The data object of the order.
 */
async function processOrderForStockRTDB(orderId, orderData) {
    if (orderData.stock_updated) {
        console.log(`Order ${orderId} has already been processed for stock. Skipping.`);
        return;
    }
    if (!orderData.cart || orderData.cart.length === 0) {
        console.log(`Order ${orderId} has no cart items. Marking as processed.`);
        await db.ref(`orders/${orderId}`).update({ stock_updated: true });
        return;
    }

    console.log(`Processing order ${orderId} for stock deduction.`);

    try {
        // 1. Aggregate total usage for each ingredient based on recipes.
        const ingredientUsage = new Map();
        const recipePromises = orderData.cart.map(item =>
            db.ref(`recipes/${item.id}`).once('value')
        );
        const recipeSnapshots = await Promise.all(recipePromises);

        recipeSnapshots.forEach((snap, index) => {
            if (snap.exists()) {
                const recipe = snap.val();
                const cartItem = orderData.cart[index];
                if (recipe.ingredients) {
                    for (const [ingredientId, ingredientDetails] of Object.entries(recipe.ingredients)) {
                        const totalUsage = Number(ingredientDetails.qty) * Number(cartItem.quantity);
                        if (totalUsage > 0) {
                            const currentTotal = ingredientUsage.get(ingredientId) || 0;
                            ingredientUsage.set(ingredientId, currentTotal + totalUsage);
                        }
                    }
                }
            } else {
                 console.warn(`Recipe for item ID ${orderData.cart[index].id} not found.`);
            }
        });

        if (ingredientUsage.size === 0) {
            console.log(`No ingredients to update for order ${orderId}. Marking as processed.`);
            await db.ref(`orders/${orderId}`).update({ stock_updated: true });
            return;
        }

        // 2. Fetch current stock and daily count values for all needed ingredients.
        const dateString = getTodayDateString();
        const updates = {};
        
        for (const [ingredientId, totalUsage] of ingredientUsage.entries()) {
            const ingredientRef = db.ref(`/ingredients/${ingredientId}`);
            const stockCountRef = db.ref(`/stockCounts/${dateString}/${ingredientId}`);

            const ingredientSnap = await ingredientRef.once('value');
            
            if (ingredientSnap.exists()) {
                const currentStock = ingredientSnap.val().stock_level || 0;
                updates[`/ingredients/${ingredientId}/stock_level`] = currentStock - totalUsage;
            }

            const stockCountSnap = await stockCountRef.once('value');
            const currentUsedExpected = stockCountSnap.exists() ? stockCountSnap.val().used_expected || 0 : 0;
            updates[`/stockCounts/${dateString}/${ingredientId}/used_expected`] = currentUsedExpected + totalUsage;
        }

        updates[`/orders/${orderId}/stock_updated`] = true;

        // 4. Execute the single atomic update.
        await db.ref().update(updates);
        
        console.log(`Successfully updated stock for order ${orderId}.`);
        showToast(`Stock updated for order ${orderId.substring(0, 6)}...`);

    } catch (error) {
        console.error(`Stock update failed for order ${orderId}:`, error);
        showToast(`Error updating stock: ${error.message}`, true);
    }
}


// --- Main Panel Rendering and Logic ---

let allOrders = []; // Cache for all orders for the selected day
let deliveryMen = {}; // Cache for delivery men
let timerInterval; // To hold the interval for updating timers
let currentOrdersRef; // To hold the current Firebase listener

// --- PIN Authorization ---
const ADMIN_PIN = '1937';
const statusHierarchy = [
    'Pending',
    'Confirmed',
    'Preparing',
    'Ready',
    'Out for Delivery',
    'Delivered',
    'Completed'
];
let pendingStatusChange = null; // To store { orderId, newStatus }

function showPinModal(orderId, newStatus) {
    const modal = document.getElementById('pin-modal');
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error-message');
    
    pendingStatusChange = { orderId, newStatus };
    
    if (modal && pinInput && pinError) {
        pinInput.value = '';
        pinError.textContent = '';
        modal.classList.remove('hidden');
        pinInput.focus();
    } else {
        console.error('PIN Modal elements not found in dashboard.html');
    }
}

function hidePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    pendingStatusChange = null;
}

function handlePinSubmit() {
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error-message');
    const enteredPin = pinInput.value;

    if (enteredPin === ADMIN_PIN) {
        if (pendingStatusChange) {
            performStatusUpdate(pendingStatusChange.orderId, pendingStatusChange.newStatus);
        }
        hidePinModal();
    } else {
        pinError.textContent = 'Incorrect PIN. Please try again.';
        pinInput.value = '';
        pinInput.focus();
    }
}

function fetchDeliveryMen() {
    const deliveryRef = db.ref('users').orderByChild('role').equalTo('delivery');
    deliveryRef.on('value', snapshot => {
        deliveryMen = {};
        snapshot.forEach(childSnapshot => {
            deliveryMen[childSnapshot.key] = childSnapshot.val().name;
        });
    });
}

async function performStatusUpdate(orderId, status) {
    const orderRef = db.ref('orders/' + orderId);
    try {
        const updates = { status: status };
        const now = new Date().toISOString();

        if (status.toLowerCase() === 'confirmed') {
            const orderSnapshot = await orderRef.once('value');
            if (orderSnapshot.exists() && !orderSnapshot.val().confirmedTimestamp) {
                updates.confirmedTimestamp = now;
            }
        } else if (['ready', 'delivered', 'completed'].includes(status.toLowerCase())) {
            const orderSnapshot = await orderRef.once('value');
            if (orderSnapshot.exists() && !orderSnapshot.val().readyTimestamp) {
                updates.readyTimestamp = now;
            }
        }

        await orderRef.update(updates);
        showToast('Order status updated successfully.');

        if (status.toLowerCase() === 'delivered' || status.toLowerCase() === 'completed') {
            const orderSnapshot = await orderRef.once('value');
            if (orderSnapshot.exists()) {
                await processOrderForStockRTDB(orderId, orderSnapshot.val());
            }
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Failed to update order status.', true);
    }
}

function attemptStatusUpdate(orderId, newStatus) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('Could not find the order to update.', true);
        return;
    }

    const currentStatus = order.status;
    const currentIndex = statusHierarchy.indexOf(currentStatus);
    const newIndex = statusHierarchy.indexOf(newStatus);

    // Require PIN if the new status is "Cancelled" or is a step backward in the hierarchy.
    if (newStatus === 'Cancelled' || (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex)) {
        showPinModal(orderId, newStatus);
    } else {
        // Otherwise, proceed without PIN for forward progress.
        performStatusUpdate(orderId, newStatus);
    }
}


function assignDelivery(orderId, deliveryManId) {
    if (!deliveryManId) {
        showToast('Please select a delivery person.', true);
        return;
    }
    const orderRef = db.ref('orders/' + orderId);
    orderRef.update({
        deliveryBoy: deliveryManId,
        status: 'Out for Delivery'
    }).then(() => {
        showToast('Delivery assigned successfully.');
    }).catch(error => {
        console.error('Error assigning delivery:', error);
        showToast('Failed to assign delivery.', true);
    });
}

function printOrderReceipt(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        alert('Could not find order details to print.');
        return;
    }

    const printWindow = window.open('', '_blank', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Print Order</title>');
    printWindow.document.write(`
        <style>
            body { font-family: 'Courier New', monospace; font-size: 10pt; margin: 0; padding: 10px; }
            .receipt-header { text-align: center; margin-bottom: 20px; }
            .receipt-header h1 { margin: 0; font-size: 16pt; }
            .receipt-header p { margin: 2px 0; font-size: 9pt;}
            .item-table { width: 100%; border-collapse: collapse; font-size: 9pt;}
            .item-table th, .item-table td { text-align: left; padding: 5px 0; border-bottom: 1px dashed #ccc; }
            .item-table th { border-bottom: 1px solid #000; }
            .totals { margin-top: 20px; width: 100%; font-size: 10pt;}
            .totals td { padding: 2px 0; }
            .text-right { text-align: right; }
            .notes { margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; font-size: 9pt;}
            hr { border: none; border-top: 1px dashed #000; }
        </style>
    `);
    printWindow.document.write('</head><body>');

    // Receipt Content
    printWindow.document.write('<div class="receipt-header">');
    printWindow.document.write('<h1>Pizza Hut</h1>');
    printWindow.document.write('<p>123 Pizza Lane, Oujda</p>');
    printWindow.document.write(`<p>Date: ${new Date(order.timestamp).toLocaleString()}</p>`);
    printWindow.document.write(`<h2>Order #${order.id.substring(0, 6)}</h2>`);
    printWindow.document.write('</div>');

    printWindow.document.write('<hr>');
    printWindow.document.write(`<p><strong>Order Type:</strong> ${order.orderType}</p>`);
    if (order.orderType === 'dineIn') {
         printWindow.document.write(`<p><strong>Table:</strong> ${order.table}</p>`);
    } else {
         printWindow.document.write(`<p><strong>Customer:</strong> ${order.customerInfo.name}</p>`);
         printWindow.document.write(`<p><strong>Phone:</strong> ${order.customerInfo.phone}</p>`);
         if (order.orderType === 'delivery') {
            printWindow.document.write(`<p><strong>Address:</strong> ${order.deliveryAddress}</p>`);
         }
    }
    printWindow.document.write('<hr>');


    printWindow.document.write('<table class="item-table">');
    printWindow.document.write('<thead><tr><th>Qty</th><th>Item</th><th class="text-right">Price</th></tr></thead>');
    printWindow.document.write('<tbody>');
    order.cart.forEach(item => {
        printWindow.document.write(`
            <tr>
                <td>${item.quantity}x</td>
                <td>${escapeHTML(item.name)}</td>
                <td class="text-right">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `);
    });
    printWindow.document.write('</tbody></table>');

    printWindow.document.write('<table class="totals">');
    printWindow.document.write(`<tr><td>Subtotal:</td><td class="text-right">${order.priceDetails.itemsTotal.toFixed(2)}</td></tr>`);
    printWindow.document.write(`<tr><td>Taxes:</td><td class="text-right">${order.priceDetails.taxes.toFixed(2)}</td></tr>`);
     if (order.orderType === 'delivery') {
        printWindow.document.write(`<tr><td>Delivery Fee:</td><td class="text-right">${order.priceDetails.deliveryFee.toFixed(2)}</td></tr>`);
    }
    if (order.priceDetails.discount > 0) {
        printWindow.document.write(`<tr><td>Discount:</td><td class="text-right">-${order.priceDetails.discount.toFixed(2)}</td></tr>`);
    }
    printWindow.document.write(`<tr><td style="font-weight: bold; font-size: 12pt;">Total:</td><td class="text-right" style="font-weight: bold; font-size: 12pt;">${order.priceDetails.finalTotal.toFixed(2)} MAD</td></tr>`);
    printWindow.document.write('</table>');
    
    if (order.allergyInfo) {
        printWindow.document.write(`<div class="notes"><strong>Notes:</strong> ${escapeHTML(order.allergyInfo)}</div>`);
    }


    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Expose the print function to the global scope so inline `onclick` can access it
window.printOrderReceipt = printOrderReceipt;

function renderFilteredOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;

    const statusFilter = document.querySelector('.status-filter-btn.bg-blue-500')?.dataset.status || 'All';
    const typeFilter = document.querySelector('.type-filter-btn.bg-blue-500')?.dataset.type || 'All';
    const searchQuery = document.getElementById('order-search-input')?.value.toLowerCase() || '';

    let filteredOrders = allOrders;

    // Apply status filter
    if (statusFilter !== 'All') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'All') {
        filteredOrders = filteredOrders.filter(order => order.orderType === typeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
        filteredOrders = filteredOrders.filter(order =>
            (order.id && order.id.toLowerCase().includes(searchQuery)) ||
            (order.customerInfo && order.customerInfo.name && order.customerInfo.name.toLowerCase().includes(searchQuery))
        );
    }

    if (filteredOrders.length === 0) {
        ordersContainer.innerHTML = `<div class="text-center py-12 bg-white rounded-lg shadow"><p class="text-gray-500">No orders match the current filters.</p></div>`;
        return;
    }

    const statusClasses = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'Preparing': 'bg-indigo-100 text-indigo-800',
        'Out for Delivery': 'bg-purple-100 text-purple-800',
        'Delivered': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800',
        'Ready': 'bg-cyan-100 text-cyan-800',
        'Completed': 'bg-green-100 text-green-800'
    };

    ordersContainer.innerHTML = filteredOrders.map(order => {
        const orderDate = new Date(order.timestamp);
        const formattedDate = `${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}`;
        
        const itemsHtml = (order.cart && Array.isArray(order.cart)) 
            ? order.cart.map(item => `
                <li class="flex justify-between text-gray-600">
                    <span>${item.quantity || 1} x ${item.name || 'Unknown Item'}</span>
                    <span class="font-mono">${((item.price || 0) * (item.quantity || 1)).toFixed(2)} MAD</span>
                </li>
            `).join('')
            : '<li>No items found in cart.</li>';

        let availableStatuses;
        if (order.orderType === 'delivery') {
            availableStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'];
        } else { // This covers 'dineIn' and 'pickup'
            availableStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
        }

        const statusButtons = availableStatuses.map(status => `
            <button data-order-id="${order.id}" data-status="${status}" class="status-btn px-2 py-1 text-xs rounded transition-colors ${order.status === status ? 'bg-blue-600 text-white font-bold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${status}
            </button>
        `).join('');

        const deliveryOptions = Object.entries(deliveryMen).map(([id, name]) =>
            `<option value="${id}" ${order.deliveryBoy === id ? 'selected' : ''}>${name}</option>`
        ).join('');

        const assignDeliveryHtml = order.orderType === 'delivery' ? `
            <div class="mt-4 border-t pt-4">
                 <h4 class="font-semibold text-md mb-2 text-gray-700">Assign Delivery:</h4>
                 <div class="flex gap-2">
                    <select class="delivery-select bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                        <option value="">Select Delivery Person</option>
                        ${deliveryOptions}
                    </select>
                    <button data-order-id="${order.id}" class="assign-btn bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600">Assign</button>
                 </div>
            </div>
        ` : '';

        const orderType = order.orderType || 'N/A';
        const orderTypeIcon =
            order.orderType === 'delivery' ? 'fa-motorcycle' :
            order.orderType === 'pickup' ? 'fa-shopping-bag' :
            order.orderType === 'dineIn' ? 'fa-utensils' : 'fa-question-circle';

        const allergyInfoHtml = order.allergyInfo ? `
            <div class="mt-4 border-t pt-4">
                <h4 class="font-semibold text-md mb-2 text-yellow-700 flex items-center"><i class="fas fa-exclamation-triangle mr-2"></i>Allergies or Special Instructions</h4>
                <p class="text-sm text-gray-800 bg-yellow-50 p-3 rounded-lg border border-yellow-200">${escapeHTML(order.allergyInfo)}</p>
            </div>
        ` : '';
        
        let customerInfoHtml = '';
        if (order.orderType === 'dineIn') {
            customerInfoHtml = `<p class="text-sm text-gray-600 mt-2"><strong>Table:</strong> ${order.table || 'N/A'}</p>`;
        } else if (order.orderType === 'pickup') {
            customerInfoHtml = `<p class="text-sm text-gray-600 mt-2"><strong>Customer:</strong> ${order.customerInfo.name || 'N/A'} (${order.customerInfo.phone || 'N/A'})</p>`;
        } else if (order.orderType === 'delivery') {
            customerInfoHtml = `
                <p class="text-sm text-gray-600 mt-2"><strong>Customer:</strong> ${order.customerInfo.name || 'N/A'} (${order.customerInfo.phone || 'N/A'})</p>
                <p class="text-sm text-gray-600"><strong>Address:</strong> ${order.deliveryAddress || 'N/A'}</p>
                <p class="text-sm text-gray-600"><strong>Assigned to:</strong> ${order.deliveryBoy ? deliveryMen[order.deliveryBoy] || 'Not Assigned' : 'Not Assigned'}</p>
            `;
        }

        // Timer and Border Logic
        let timerHtml = '';
        let cardBorderClass = 'border border-gray-200'; // Default with full border
        let timerTextColorClass = 'text-gray-600'; // Default text color for prep time
        const isTimerActive = order.confirmedTimestamp && ['Confirmed', 'Preparing'].includes(order.status);
        const prepTimeFinished = order.confirmedTimestamp && order.readyTimestamp;

        if (isTimerActive) {
            // Live timer will handle its own color and the card border via updateLiveTimers()
            // Start with a green border, updateLiveTimers will take over
            cardBorderClass = 'border-l-4 border-green-500';
            timerHtml = `<div class="live-timer text-sm font-bold text-green-500" data-confirmed-time="${order.confirmedTimestamp}"></div>`;
        } else if (prepTimeFinished) {
            const confirmedTime = new Date(order.confirmedTimestamp).getTime();
            const readyTime = new Date(order.readyTimestamp).getTime();
            const elapsedSeconds = Math.floor((readyTime - confirmedTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            
            if (minutes >= 7) {
                cardBorderClass = 'border-l-4 border-red-500';
                timerTextColorClass = 'text-red-500 font-bold';
            } else if (minutes >= 3) {
                cardBorderClass = 'border-l-4 border-yellow-400';
                timerTextColorClass = 'text-yellow-500 font-bold';
            } else {
                cardBorderClass = 'border-l-4 border-green-500';
                timerTextColorClass = 'text-green-500 font-bold';
            }

            timerHtml = `<div class="text-sm ${timerTextColorClass}"><i class="fas fa-stopwatch mr-1"></i>Prep: ${minutes}m ${seconds}s</div>`;
        }

        const editOrderButtonHtml = order.status === 'Pending' ? `
            <a href="../edit-order.html?orderId=${order.id}" target="_blank" class="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"><i class="fas fa-edit mr-2"></i>Edit Order</a>
        ` : '';


        return `
            <div class="bg-white p-6 rounded-lg shadow-md ${cardBorderClass}">
                <div class="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">Order #${order.id.substring(0, 6)}</h3>
                        <p class="text-sm font-semibold text-gray-700 capitalize mt-1"><i class="fas ${orderTypeIcon} fa-fw mr-2 text-gray-400"></i>${orderType}</p>
                        <p class="text-sm text-gray-500">${formattedDate}</p>
                        ${customerInfoHtml}
                    </div>
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-4">
                            ${timerHtml}
                            <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClasses[order.status] || 'bg-gray-100 text-gray-800'}">
                                ${order.status}
                            </span>
                        </div>
                        <p class="text-2xl font-bold mt-2 text-gray-800">${(order.priceDetails.finalTotal || 0).toFixed(2)} MAD</p>
                    </div>
                </div>
                ${allergyInfoHtml}
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-semibold text-md mb-2 text-gray-700">Items:</h4>
                    <ul class="space-y-1 text-sm">${itemsHtml}</ul>
                </div>
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-semibold text-md mb-2 text-gray-700">Actions:</h4>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.printOrderReceipt('${order.id}')" class="px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 transition"><i class="fas fa-print mr-2"></i>Print Receipt</button>
                        ${editOrderButtonHtml}
                    </div>
                </div>
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-semibold text-md mb-2 text-gray-700">Update Status:</h4>
                    <div class="flex flex-wrap gap-2">${statusButtons}</div>
                </div>
                ${assignDeliveryHtml}
                 ${order.stock_updated ? '<p class="text-xs text-green-600 mt-3 font-semibold flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>Stock Deducted</p>' : ''}
            </div>
        `;
    }).join('');
}

function updateLiveTimers() {
    const timerElements = document.querySelectorAll('.live-timer');
    timerElements.forEach(el => {
        const confirmedTime = new Date(el.dataset.confirmedTime).getTime();
        if (isNaN(confirmedTime)) return;

        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - confirmedTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;

        el.innerHTML = `<i class="fas fa-clock mr-1"></i> ${minutes}m ${String(seconds).padStart(2, '0')}s`;
        
        // Also update text color live
        el.classList.remove('text-green-500', 'text-yellow-500', 'text-red-500');

        const card = el.closest('.bg-white');
        if (card) {
            // Remove all potential border classes before adding the correct one
            card.classList.remove('border-gray-200', 'border-green-500', 'border-yellow-400', 'border-red-500', 'border-l-4', 'border');
            
            if (minutes >= 7) {
                card.classList.add('border-l-4', 'border-red-500');
                el.classList.add('text-red-500');
            } else if (minutes >= 3) {
                card.classList.add('border-l-4', 'border-yellow-400');
                el.classList.add('text-yellow-500');
            } else {
                card.classList.add('border-l-4', 'border-green-500');
                el.classList.add('text-green-500');
            }
        }
    });
}

function listenToOrders(dateString) {
    if (currentOrdersRef) {
        currentOrdersRef.off(); // Detach previous listener to prevent memory leaks
    }

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    const ordersRef = db.ref('orders').orderByChild('timestamp').startAt(startISO).endAt(endISO);
    currentOrdersRef = ordersRef; // Store the new listener reference

    const ordersContainer = document.getElementById('orders-container');
    ordersContainer.innerHTML = '<p class="text-center text-gray-500 mt-8">Loading orders...</p>';

    ordersRef.on('value', snapshot => {
        allOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                allOrders.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        allOrders.reverse(); // Show the newest orders first
        
        renderFilteredOrders();
    }, error => {
        console.error("Error fetching orders: ", error);
        if (ordersContainer) {
            ordersContainer.innerHTML = '<div class="text-center py-12 bg-white rounded-lg shadow"><p class="text-red-500">Failed to load orders.</p></div>';
        }
    });
}

/**
 * Main function to load the panel.
 * @param {HTMLElement} root - The main container element for the panel.
 * @param {HTMLElement} panelTitle - The element for the panel's title.
 */
export function loadPanel(root, panelTitle) {
    panelTitle.textContent = 'Live Orders';
    root.innerHTML = `
        <div class="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div class="flex flex-wrap items-center justify-between mb-4 gap-4">
                <div class="relative flex-grow">
                    <input type="search" id="order-search-input" placeholder="Search by Order ID or Customer Name..." class="w-full p-2 pl-10 border rounded-lg shadow-sm bg-white">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <div>
                    <label for="order-date-picker" class="text-sm font-medium mr-2">View Orders for:</label>
                    <input type="date" id="order-date-picker" value="${getTodayDateString()}" class="p-2 border rounded-lg shadow-sm bg-white">
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between mb-4 gap-4">
                 <div id="order-type-filters" class="flex flex-wrap gap-2 items-center">
                     <span class="text-sm font-medium mr-2">Type:</span>
                     <button class="type-filter-btn bg-blue-500 text-white px-3 py-1 rounded-full text-sm" data-type="All">All</button>
                     <button class="type-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-type="dineIn">Dine-In</button>
                     <button class="type-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-type="pickup">Pickup</button>
                     <button class="type-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-type="delivery">Delivery</button>
                </div>
            </div>
            <div id="order-status-filters" class="flex flex-wrap gap-2 mb-4">
                <span class="text-sm font-medium mr-2 self-center">Status:</span>
                <button class="status-filter-btn bg-blue-500 text-white px-3 py-1 rounded-full text-sm" data-status="All">All</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Pending">Pending</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Confirmed">Confirmed</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Preparing">Preparing</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Ready">Ready</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Out for Delivery">Out for Delivery</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Delivered">Delivered</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Completed">Completed</button>
                <button class="status-filter-btn bg-white text-gray-700 px-3 py-1 rounded-full text-sm border" data-status="Cancelled">Cancelled</button>
            </div>

            <div id="orders-container" class="space-y-6">
                <p class="text-center text-gray-500 mt-8">Loading orders...</p>
            </div>
        </div>
    `;

    fetchDeliveryMen();
    
    const datePicker = root.querySelector('#order-date-picker');
    listenToOrders(datePicker.value); // Initial load for today

    datePicker.addEventListener('change', () => {
        listenToOrders(datePicker.value);
    });

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateLiveTimers, 1000);

    root.addEventListener('click', e => {
        const target = e.target;
        
        if (target.classList.contains('status-filter-btn')) {
            document.querySelectorAll('.status-filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700', 'border');
            });
            target.classList.add('bg-blue-500', 'text-white');
            target.classList.remove('bg-white', 'text-gray-700', 'border');
            renderFilteredOrders();
        }

        if (target.classList.contains('type-filter-btn')) {
            document.querySelectorAll('.type-filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700', 'border');
            });
            target.classList.add('bg-blue-500', 'text-white');
            target.classList.remove('bg-white', 'text-gray-700', 'border');
            renderFilteredOrders();
        }

        if (target.classList.contains('status-btn')) {
            const orderId = target.dataset.orderId;
            const status = target.dataset.status;
            attemptStatusUpdate(orderId, status);
        }

        if (target.classList.contains('assign-btn')) {
            const orderId = target.dataset.orderId;
            const select = target.previousElementSibling;
            const deliveryManId = select.value;
            assignDelivery(orderId, deliveryManId);
        }
    });

    root.querySelector('#order-search-input').addEventListener('input', () => {
        renderFilteredOrders();
    });
    
    // Attach PIN modal listeners if not already attached
    const pinModal = document.getElementById('pin-modal');
    if (pinModal && !pinModal.dataset.listenerAttached) {
        document.getElementById('pin-submit-btn').addEventListener('click', handlePinSubmit);
        document.getElementById('pin-cancel-btn').addEventListener('click', hidePinModal);
        pinModal.dataset.listenerAttached = 'true';
    }
}

