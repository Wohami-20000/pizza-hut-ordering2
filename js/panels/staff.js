// /js/panels/staff.js

const db = firebase.database();

/**
 * Creates the HTML for a single order card for the staff view.
 */
function createStaffOrderCard(orderId, orderData) {
    const items = orderData.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
    const orderLocation = orderData.orderType === 'dineIn' ? `Table ${orderData.table}` : 'Pickup';

    return `
        <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
                <p class="font-semibold">${orderLocation} - Order #${orderData.orderId}</p>
                <ul class="text-sm text-gray-600 list-disc list-inside">${items}</ul>
            </div>
            <div class="text-right">
                <p class="font-bold text-yellow-600">Status: ${orderData.status}</p>
                <button 
                    onclick="updateOrderStatus('${orderId}', 'ready')"
                    class="mt-2 text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                >
                    Mark as Ready
                </button>
            </div>
        </div>
    `;
}

/**
 * Updates an order's status in Firebase. This function is exposed to the global window object
 * so that the inline `onclick` attribute can call it.
 */
window.updateOrderStatus = (orderId, newStatus) => {
    db.ref(`orders/${orderId}/status`).set(newStatus)
        .catch(err => alert("Error updating status: " + err.message));
};


/**
 * Main function to load the Staff Panel.
 */
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Kitchen / Staff Dashboard';
    
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Active Orders</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">My Schedule</a>
    `;

    panelRoot.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Orders to Prepare</h2>
        <div id="staff-order-list" class="space-y-4">
            <p>Loading active orders...</p>
        </div>
    `;

    const ordersRef = db.ref('orders').orderByChild('status').equalTo('preparing');
    ordersRef.on('value', (snapshot) => {
        const orderListDiv = document.getElementById('staff-order-list');
        orderListDiv.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                orderListDiv.innerHTML += createStaffOrderCard(childSnapshot.key, childSnapshot.val());
            });
        } else {
            orderListDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No orders currently in preparation.</p>';
        }
    });
}