import { showToast } from '../../ui-components.js';

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

let allOrders = []; // Cache for all orders
let deliveryMen = {}; // Cache for delivery men

function fetchDeliveryMen() {
    const deliveryRef = db.ref('users').orderByChild('role').equalTo('delivery');
    deliveryRef.on('value', snapshot => {
        deliveryMen = {};
        snapshot.forEach(childSnapshot => {
            deliveryMen[childSnapshot.key] = childSnapshot.val().name;
        });
    });
}

async function updateOrderStatus(orderId, status) {
    const orderRef = db.ref('orders/' + orderId);
    try {
        await orderRef.update({ status: status });
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

function renderFilteredOrders(filter = 'All') {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;

    const filteredOrders = filter === 'All' ? allOrders : allOrders.filter(order => order.status === filter);

    if (filteredOrders.length === 0) {
        ordersContainer.innerHTML = `<div class="text-center py-12 bg-white rounded-lg shadow"><p class="text-gray-500">No ${filter !== 'All' ? filter : ''} orders found.</p></div>`;
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

        return `
            <div class="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div class="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">Order #${order.id.substring(0, 6)}</h3>
                        <p class="text-sm font-semibold text-gray-700 capitalize mt-1"><i class="fas ${orderTypeIcon} fa-fw mr-2 text-gray-400"></i>${orderType}</p>
                        <p class="text-sm text-gray-500">${formattedDate}</p>
                        <p class="text-sm text-gray-600 mt-2"><strong>Customer:</strong> ${order.customerInfo.name || 'N/A'} (${order.customerInfo.phone || 'N/A'})</p>
                        <p class="text-sm text-gray-600"><strong>Address:</strong> ${order.customerInfo.address || 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClasses[order.status] || 'bg-gray-100 text-gray-800'}">
                            ${order.status}
                        </span>
                        <p class="text-2xl font-bold mt-2 text-gray-800">${(order.priceDetails.finalTotal || 0).toFixed(2)} MAD</p>
                    </div>
                </div>
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-semibold text-md mb-2 text-gray-700">Items:</h4>
                    <ul class="space-y-1 text-sm">${itemsHtml}</ul>
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

function listenToOrders() {
    const ordersRef = db.ref('orders').orderByChild('timestamp');
    const ordersContainer = document.getElementById('orders-container');

    ordersRef.on('value', snapshot => {
        allOrders = [];
        snapshot.forEach(childSnapshot => {
            allOrders.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        allOrders.reverse(); 
        
        const currentFilter = document.querySelector('.filter-btn.bg-blue-500')?.dataset.status || 'All';
        renderFilteredOrders(currentFilter);
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
            <div id="order-filters" class="mb-4 flex flex-wrap gap-2">
                <button class="filter-btn bg-blue-500 text-white px-4 py-2 rounded-lg shadow" data-status="All">All</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Pending">Pending</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Confirmed">Confirmed</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Preparing">Preparing</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Out for Delivery">Out for Delivery</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Delivered">Delivered</button>
                <button class="filter-btn bg-white text-gray-700 px-4 py-2 rounded-lg shadow border" data-status="Cancelled">Cancelled</button>
            </div>
            <div id="orders-container" class="space-y-6">
                <p class="text-center text-gray-500 mt-8">Loading orders...</p>
            </div>
        </div>
    `;

    fetchDeliveryMen();
    listenToOrders();

    root.addEventListener('click', e => {
        const target = e.target;
        
        if (target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700', 'border');
            });
            target.classList.add('bg-blue-500', 'text-white');
            target.classList.remove('bg-white', 'text-gray-700', 'border');
            renderFilteredOrders(target.dataset.status);
        }

        if (target.classList.contains('status-btn')) {
            const orderId = target.dataset.orderId;
            const status = target.dataset.status;
            updateOrderStatus(orderId, status);
        }

        if (target.classList.contains('assign-btn')) {
            const orderId = target.dataset.orderId;
            const select = target.previousElementSibling;
            const deliveryManId = select.value;
            assignDelivery(orderId, deliveryManId);
        }
    });
}

