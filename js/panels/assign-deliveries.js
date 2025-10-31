// /js/panels/assign-deliveries.js

const db = firebase.database();

/**
 * Creates the HTML for a single order card that needs assignment.
 * @param {string} orderId - The ID of the order.
 * @param {object} orderData - The data for the order.
 * @param {Array} deliveryStaff - An array of available delivery staff objects.
 * @returns {string} The HTML string for the order card.
 */
function createOrderCard(orderId, orderData, deliveryStaff) {
    const { deliveryAddress, items } = orderData;
    const itemsSummary = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    const driverOptions = deliveryStaff.map(driver => 
        `<option value="${driver.uid}">${driver.name}</option>`
    ).join('');

    return `
        <div class="bg-white p-4 rounded-xl shadow-lg space-y-3">
            <div>
                <p class="font-bold text-gray-800">Order #${orderId}</p>
                <p class="text-sm text-gray-600">To: ${deliveryAddress}</p>
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
 * Main function to load and manage the delivery assignment panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Assign Deliveries';

    panelRoot.innerHTML = `
        <div id="assign-container" class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Orders Ready for Delivery</h2>
            <div id="orders-for-delivery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-10">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                </div>
            </div>
        </div>
    `;

    const ordersContainer = document.getElementById('orders-for-delivery');
    
    // 1. Fetch all delivery staff
    db.ref('users').orderByChild('role').equalTo('delivery').once('value').then(usersSnapshot => {
        const deliveryStaff = [];
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(userSnap => {
                deliveryStaff.push({ uid: userSnap.key, ...userSnap.val() });
            });
        }

        // 2. Listen for orders that are "Ready"
        const ordersRef = db.ref('orders');
        ordersRef.orderByChild('status').equalTo('Ready').on('value', ordersSnapshot => {
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
                ordersContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">No orders are currently waiting for a driver.</p>';
            }
        });
    });

    // 3. Event delegation for the "Assign" buttons
    panelRoot.addEventListener('click', (e) => {
        if (e.target.classList.contains('assign-btn')) {
            const orderId = e.target.dataset.orderId;
            const selectEl = panelRoot.querySelector(`.driver-select[data-order-id="${orderId}"]`);
            const driverUid = selectEl.value;
            const driverName = selectEl.options[selectEl.selectedIndex].text;

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
            
            db.ref(`orders/${orderId}`).update(updates)
                .then(() => {
                    console.log(`Order ${orderId} assigned to ${driverName}.`);
                    // The real-time listener will automatically remove the card from the UI.
                })
                .catch(err => {
                    alert('Failed to assign order: ' + err.message);
                });
        }
    });
}
