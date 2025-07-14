// /js/panels/delivery.js

const db = firebase.database();

/**
 * Creates the HTML for a single delivery card.
 */
function createDeliveryCard(orderId, orderData) {
    const address = orderData.deliveryAddress || 'N/A';
    const items = orderData.items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    return `
        <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
                <p class="font-semibold">Order #${orderData.orderId} to: ${address}</p>
                <p class="text-sm text-gray-600">${items}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600">Status: ${orderData.status}</p>
                <button 
                    onclick="window.updateDeliveryStatus('${orderId}', 'out for delivery')"
                    class="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                >
                    Pick Up for Delivery
                </button>
            </div>
        </div>
    `;
}

/**
 * Updates a delivery order's status in Firebase.
 */
window.updateDeliveryStatus = (orderId, newStatus) => {
    db.ref(`orders/${orderId}/status`).set(newStatus)
        .catch(err => alert("Error updating status: " + err.message));
};

/**
 * Main function to load the Delivery Panel.
 */
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Delivery Dashboard';
    
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Available for Delivery</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">My Deliveries</a>
    `;

    panelRoot.innerHTML = `
        <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition mb-4">
            <i class="fas fa-arrow-left mr-2"></i>Back
        </button>
        <h2 class="text-2xl font-bold mb-4">Orders Ready for Delivery</h2>
        <div id="delivery-order-list" class="space-y-4">
            <p>Loading available orders...</p>
        </div>
    `;

    // Listen for orders that are "ready" and of type "delivery"
    const ordersRef = db.ref('orders');
    ordersRef.orderByChild('status').equalTo('ready').on('value', (snapshot) => {
        const orderListDiv = document.getElementById('delivery-order-list');
        orderListDiv.innerHTML = '';
        let foundDelivery = false;
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const orderData = childSnapshot.val();
                if (orderData.orderType === 'delivery') {
                    orderListDiv.innerHTML += createDeliveryCard(childSnapshot.key, orderData);
                    foundDelivery = true;
                }
            });
        }
        
        if (!foundDelivery) {
            orderListDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No orders ready for delivery right now.</p>';
        }
    });
}
