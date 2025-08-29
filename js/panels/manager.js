// /js/panels/manager.js

const db = firebase.database();

/**
 * Creates the HTML for a single order row in the table.
 */
function createOrderRow(orderId, orderData) {
    const statusOptions = ['pending', 'preparing', 'out for delivery', 'delivered', 'completed', 'cancelled'];
    const selectOptions = statusOptions.map(status => 
        `<option value="${status}" ${orderData.status === status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
    ).join('');

    const customerName = orderData.customerInfo ? orderData.customerInfo.name : 'N/A';
    const orderItems = orderData.cart ? orderData.cart.map(item => `${item.quantity}x ${item.name}`).join(', ') : 'No items';

    return `
        <tr class="hover:bg-gray-50" data-order-id="${orderId}">
            <td class="p-3 font-medium text-sm text-blue-600">#${orderData.orderId}</td>
            <td class="p-3 text-sm text-gray-700">${customerName}</td>
            <td class="p-3 text-sm text-gray-500">${orderItems}</td>
            <td class="p-3 text-sm text-gray-800 font-semibold">${(orderData.priceDetails.finalTotal || 0).toFixed(2)} MAD</td>
            <td class="p-3">
                <select class="order-status-select p-2 border rounded-md text-sm w-full">
                    ${selectOptions}
                </select>
            </td>
        </tr>
    `;
}

/**
 * Main function to load the Manager Panel.
 */
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Restaurant Management';
    
    // Setup navigation for Manager
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Order Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Menu Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Analytics</a>
    `;

    // Setup the main content for Manager
    panelRoot.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Live Order Management</h2>

        <div class="bg-white rounded-lg shadow-md">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Order ID</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody id="order-list-body">
                        <tr><td colspan="5" class="text-center p-4">Loading orders...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Fetch and display orders, listening for real-time updates
    const ordersRef = db.ref('orders').orderByChild('timestamp').limitToLast(50); // Get the last 50 orders
    
    ordersRef.on('value', (snapshot) => {
        const orderListBody = document.getElementById('order-list-body');
        if (!orderListBody) return;
        
        orderListBody.innerHTML = ''; // Clear previous list
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const orderId = childSnapshot.key;
                const orderData = childSnapshot.val();
                orderListBody.innerHTML = createOrderRow(orderId, orderData) + orderListBody.innerHTML; // Prepend to show newest first
            });
        } else {
            orderListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No orders found.</td></tr>';
        }
    });

    // Add one event listener to handle status changes
    panelRoot.addEventListener('change', (event) => {
        if (event.target.classList.contains('order-status-select')) {
            const selectElement = event.target;
            const orderId = selectElement.closest('tr').dataset.orderId;
            const newStatus = selectElement.value;

            // Update the status in the database
            db.ref(`orders/${orderId}/status`).set(newStatus)
                .catch(error => {
                    alert('Error updating status: ' + error.message);
                    // Optionally, revert the dropdown on error
                    // selectElement.value = originalStatus; 
                });
        }
    });
}
