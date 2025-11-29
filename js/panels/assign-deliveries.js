// /js/panels/assign-deliveries.js

const db = firebase.database();

/**
 * Safe wrapper to call logAction if it exists (global from logging.js).
 * If logging.js is missing or fails, the app keeps working.
 */
function safeLogAction(actionType, targetLabel, targetId, metadata = {}) {
    try {
        if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
            return window.logAction(actionType, targetLabel, targetId, metadata);
        }
    } catch (err) {
        console.warn('safeLogAction error:', err);
    }
    return Promise.resolve();
}

/**
 * Formats a timestamp (ms since epoch) into a human-readable age string.
 * Example: "Placed 12 min ago (3:41 PM)"
 * @param {number} timestamp
 * @returns {string}
 */
function formatOrderTiming(timestamp) {
    if (!timestamp) return '';
    const placedDate = new Date(timestamp);
    const ageMinutes = Math.floor((Date.now() - timestamp) / 60000);
    const placedAt = placedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Placed ${ageMinutes} min ago (${placedAt})`;
}

/**
 * Builds an HTML string for options in a driver <select> element, including status.
 * Drivers are expected to have a `status` field: "available" | "on_delivery" | "unavailable" (or unknown).
 * @param {Array} deliveryStaff
 * @param {string} [selectedUid]
 * @param {boolean} [disableUnavailable] - if true, disables non-available drivers
 * @returns {string}
 */
function buildDriverOptions(deliveryStaff, selectedUid = '', disableUnavailable = false) {
    // Sort by logical availability
    const order = { available: 0, on_delivery: 1, unavailable: 2, unknown: 3 };
    const sorted = [...deliveryStaff].sort((a, b) => {
        const aStatus = a.status || 'unknown';
        const bStatus = b.status || 'unknown';
        return (order[aStatus] ?? 3) - (order[bStatus] ?? 3);
    });

    return sorted
        .map(driver => {
            const status = driver.status || 'unknown';
            const statusLabel = status
                .charAt(0)
                .toUpperCase() + status.slice(1).replace('_', ' ');
            const label = `${driver.name} - ${statusLabel}`;
            const selected = driver.uid === selectedUid ? 'selected' : '';
            const disabled =
                disableUnavailable && status !== 'available'
                    ? 'disabled'
                    : '';
            return `<option value="${driver.uid}" ${selected} ${disabled}>${label}</option>`;
        })
        .join('');
}

/**
 * Creates the HTML for a single order card that needs assignment.
 * @param {string} orderId - The ID of the order.
 * @param {object} orderData - The data for the order.
 * @param {Array} deliveryStaff - An array of delivery staff objects.
 * @returns {string} The HTML string for the order card.
 */
function createOrderCard(orderId, orderData, deliveryStaff) {
    const { deliveryAddress, items = [], priceDetails, timestamp } = orderData;
    const itemsSummary = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    const driverOptions = buildDriverOptions(deliveryStaff, '', true);

    const total = priceDetails?.finalTotal;
    const timingInfo = formatOrderTiming(timestamp);

    return `
        <div class="bg-white p-4 rounded-xl shadow-lg space-y-3 order-card" data-order-id="${orderId}">
            <div>
                <p class="font-bold text-gray-800">Order #${orderId}</p>
                <p class="text-sm text-gray-600">To: ${deliveryAddress}</p>
                ${total != null ? `<p class="text-sm text-gray-700 mt-1">Total: $${Number(total).toFixed(2)}</p>` : ''}
                ${timingInfo ? `<p class="text-xs text-gray-500">${timingInfo}</p>` : ''}
            </div>
            <div class="text-xs text-gray-500 border-t border-b py-2">
                ${itemsSummary}
            </div>
            <div class="flex items-center gap-2">
                <select class="driver-select w-full p-2 border rounded-md bg-white" data-order-id="${orderId}">
                    <option value="">Select a driver...</option>
                    ${driverOptions}
                </select>
                <button class="assign-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition" data-order-id="${orderId}">
                    Assign
                </button>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for an order card that is already out for delivery and can be re-assigned.
 * @param {string} orderId
 * @param {object} orderData
 * @param {Array} deliveryStaff
 * @returns {string}
 */
function createAssignedOrderCard(orderId, orderData, deliveryStaff) {
    const { deliveryAddress, items = [], priceDetails, timestamp, assignedDriver } = orderData;
    const itemsSummary = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    const currentDriverUid = assignedDriver?.uid || '';
    const driverOptions = buildDriverOptions(deliveryStaff, currentDriverUid, false);

    const total = priceDetails?.finalTotal;
    const timingInfo = formatOrderTiming(timestamp);

    return `
        <div class="bg-white p-4 rounded-xl shadow-lg space-y-3 assigned-order-card" data-order-id="${orderId}">
            <div>
                <p class="font-bold text-gray-800">Order #${orderId}</p>
                <p class="text-sm text-gray-600">To: ${deliveryAddress}</p>
                ${total != null ? `<p class="text-sm text-gray-700 mt-1">Total: $${Number(total).toFixed(2)}</p>` : ''}
                ${timingInfo ? `<p class="text-xs text-gray-500">${timingInfo}</p>` : ''}
                <p class="text-xs text-gray-500 mt-1">
                    Assigned to: ${assignedDriver?.name || 'Unknown'}
                </p>
            </div>
            <div class="text-xs text-gray-500 border-t border-b py-2">
                ${itemsSummary}
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <select class="driver-select w-full p-2 border rounded-md bg-white" data-order-id="${orderId}">
                    ${driverOptions}
                </select>
                <button class="reassign-btn bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition" data-order-id="${orderId}">
                    Re-assign
                </button>
                <button class="unassign-btn bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition" data-order-id="${orderId}">
                    Unassign
                </button>
            </div>
        </div>
    `;
}

/**
 * (Optional scaffold) Initialize a map area for future expansion.
 * Currently this only reserves a container in the layout; actual map logic
 * (Leaflet/Google Maps + geocoding + driver markers) should be wired separately.
 */
function initMapIfPresent() {
    const mapEl = document.getElementById('delivery-map');
    if (!mapEl) return;
    // Placeholder: you can integrate Leaflet or Google Maps here later.
    mapEl.innerHTML = `
        <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Map view coming soon...
        </div>
    `;
}

/**
 * Main function to load and manage the delivery assignment panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Assign Deliveries';

    panelRoot.innerHTML = `
        <div id="assign-container" class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Orders Ready for Delivery</h2>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div id="orders-for-delivery" class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-full text-center py-10">
                        <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    </div>
                </div>
                <div id="delivery-map" class="h-80 bg-gray-100 rounded-xl shadow-inner"></div>
            </div>

            <h2 class="text-2xl font-bold text-gray-800 mt-8">Out for Delivery</h2>
            <div id="orders-out-for-delivery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-10">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                </div>
            </div>
        </div>
    `;

    initMapIfPresent();

    const ordersContainer = document.getElementById('orders-for-delivery');
    const outForDeliveryContainer = document.getElementById('orders-out-for-delivery');

    // We cache deliveryStaff so both sections share it.
    let deliveryStaff = [];

    // 1. Fetch all delivery staff (with status if present)
    db.ref('users')
        .orderByChild('role')
        .equalTo('delivery')
        .once('value')
        .then(usersSnapshot => {
            deliveryStaff = [];
            if (usersSnapshot.exists()) {
                usersSnapshot.forEach(userSnap => {
                    deliveryStaff.push({ uid: userSnap.key, ...userSnap.val() });
                });
            }

            // 2a. Listen for orders that are "Ready" (unassigned delivery orders)
            const ordersRef = db.ref('orders');
            ordersRef
                .orderByChild('status')
                .equalTo('Ready')
                .on('value', ordersSnapshot => {
                    ordersContainer.innerHTML = '';
                    let hasOrdersToAssign = false;

                    if (ordersSnapshot.exists()) {
                        ordersSnapshot.forEach(orderSnap => {
                            const orderId = orderSnap.key;
                            const orderData = orderSnap.val();

                            // We only want to show "delivery" orders that are "Ready" and not yet assigned
                            if (orderData.orderType === 'delivery' && !orderData.assignedDriver) {
                                hasOrdersToAssign = true;
                                ordersContainer.innerHTML += createOrderCard(orderId, orderData, deliveryStaff);
                            }
                        });
                    }

                    if (!hasOrdersToAssign) {
                        ordersContainer.innerHTML =
                            '<p class="col-span-full text-center text-gray-500 py-10">No orders are currently waiting for a driver.</p>';
                    }
                });

            // 2b. Listen for orders that are "out for delivery" (for re-assign/unassign)
            const outRef = db.ref('orders');
            outRef
                .orderByChild('status')
                .equalTo('out for delivery')
                .on('value', snapshot => {
                    outForDeliveryContainer.innerHTML = '';
                    let hasOutForDelivery = false;

                    if (snapshot.exists()) {
                        snapshot.forEach(orderSnap => {
                            const orderId = orderSnap.key;
                            const orderData = orderSnap.val();

                            if (orderData.orderType === 'delivery') {
                                hasOutForDelivery = true;
                                outForDeliveryContainer.innerHTML += createAssignedOrderCard(
                                    orderId,
                                    orderData,
                                    deliveryStaff
                                );
                            }
                        });
                    }

                    if (!hasOutForDelivery) {
                        outForDeliveryContainer.innerHTML =
                            '<p class="col-span-full text-center text-gray-500 py-10">No orders are currently out for delivery.</p>';
                    }
                });
        });

    // 3. Event delegation for buttons (Assign, Re-assign, Unassign)
    panelRoot.addEventListener('click', e => {
        // Assign
        if (e.target.classList.contains('assign-btn')) {
            const orderId = e.target.dataset.orderId;
            const selectEl = panelRoot.querySelector(`.driver-select[data-order-id="${orderId}"]`);
            if (!selectEl) {
                alert('Driver selector not found for this order.');
                return;
            }
            const driverUid = selectEl.value;
            const driverName = selectEl.options[selectEl.selectedIndex]?.text || '';

            if (!driverUid) {
                alert('Please select a driver first.');
                return;
            }

            const updates = {
                status: 'out for delivery',
                assignedDriver: {
                    uid: driverUid,
                    name: driverName
                }
            };

            db.ref(`orders/${orderId}`)
                .update(updates)
                .then(() => {
                    console.log(`Order ${orderId} assigned to ${driverName}.`);
                    safeLogAction('update', `Order #${orderId}`, orderId, {
                        change: `Assigned to driver ${driverName} (${driverUid})`
                    });
                    // The real-time listener will automatically remove the card from the UI.
                })
                .catch(err => {
                    alert('Failed to assign order: ' + err.message);
                });
        }

        // Re-assign
        if (e.target.classList.contains('reassign-btn')) {
            const orderId = e.target.dataset.orderId;
            const selectEl = panelRoot.querySelector(
                `.assigned-order-card .driver-select[data-order-id="${orderId}"]`
            );
            if (!selectEl) {
                alert('Driver selector not found for this order.');
                return;
            }
            const driverUid = selectEl.value;
            const driverName = selectEl.options[selectEl.selectedIndex]?.text || '';

            if (!driverUid) {
                alert('Please select a driver first.');
                return;
            }

            const updates = {
                // Keep status as "out for delivery"
                assignedDriver: {
                    uid: driverUid,
                    name: driverName
                }
            };

            db.ref(`orders/${orderId}`)
                .update(updates)
                .then(() => {
                    console.log(`Order ${orderId} re-assigned to ${driverName}.`);
                    safeLogAction('update', `Order #${orderId}`, orderId, {
                        change: `Re-assigned to driver ${driverName} (${driverUid})`
                    });
                })
                .catch(err => {
                    alert('Failed to re-assign order: ' + err.message);
                });
        }

        // Unassign
        if (e.target.classList.contains('unassign-btn')) {
            const orderId = e.target.dataset.orderId;

            const updates = {
                status: 'Ready',
                assignedDriver: null
            };

            db.ref(`orders/${orderId}`)
                .update(updates)
                .then(() => {
                    console.log(`Order ${orderId} unassigned and moved back to Ready.`);
                    safeLogAction('update', `Order #${orderId}`, orderId, {
                        change: 'Driver unassigned; order moved back to Ready.'
                    });
                })
                .catch(err => {
                    alert('Failed to unassign order: ' + err.message);
                });
        }
    });
}