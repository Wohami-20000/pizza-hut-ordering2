// /js/panels/orders.js

const db = firebase.database();
let allOrdersCache = []; // Cache to hold all orders for filtering

// All possible statuses for an order
const STATUS_OPTIONS = ['pending', 'preparing', 'ready', 'out for delivery', 'delivered', 'completed', 'cancelled'];

/**
 * Creates the HTML for a single order row in the table.
 */
function createOrderRow(orderId, orderData) {
    const { customerInfo, timestamp, priceDetails, status } = orderData;
    const customerName = customerInfo ? customerInfo.name : 'N/A';
    const orderDate = new Date(timestamp).toLocaleString();
    const finalTotal = priceDetails ? priceDetails.finalTotal.toFixed(2) : '0.00';

    // Create the status dropdown
    const statusDropdown = STATUS_OPTIONS.map(opt => 
        `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
    ).join('');

    return `
        <tr class="hover:bg-gray-50 transition" data-order-id="${orderId}">
            <td class="p-3 text-sm font-medium text-blue-600">
                <a href="../order-details.html?orderId=${orderId}" target="_blank" class="hover:underline">${orderId}</a>
            </td>
            <td class="p-3 text-sm text-gray-700">${customerName}</td>
            <td class="p-3 text-sm text-gray-600">${orderDate}</td>
            <td class="p-3 text-sm font-semibold">${finalTotal} MAD</td>
            <td class="p-3">
                <select class="status-select w-full p-2 border rounded-md text-sm bg-white">
                    ${statusDropdown}
                </select>
            </td>
        </tr>
    `;
}

/**
 * Renders orders based on current filters.
 */
function renderFilteredOrders() {
    const orderListBody = document.getElementById('order-list-body');
    if (!orderListBody) return;

    const searchInput = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;

    const filteredOrders = allOrdersCache.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchInput) || 
                              (order.customerInfo && order.customerInfo.name.toLowerCase().includes(searchInput));
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    orderListBody.innerHTML = filteredOrders.length 
        ? filteredOrders.map(order => createOrderRow(order.id, order)).join('')
        : '<tr><td colspan="5" class="text-center p-4 text-gray-500">No matching orders found.</td></tr>';
}

/**
 * Main function to load the Orders Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Order Management';

    // Populate status filter dropdown options
    const statusFilterOptions = ['all', ...STATUS_OPTIONS]
        .map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">All Orders</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="search" id="order-search" placeholder="Search by Order ID or Customer..." class="w-full p-2 border rounded-md">
                <select id="status-filter" class="w-full p-2 border rounded-md bg-white">
                    ${statusFilterOptions}
                </select>
            </div>

            <div class="overflow-y-auto" style="max-height: 70vh;">
                <table class="min-w-full">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Order ID</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Customer</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Total</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody id="order-list-body" class="divide-y divide-gray-200">
                        <tr><td colspan="5" class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-brand-red"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // --- Event Listeners ---

    // Listen for filter changes
    document.getElementById('order-search').addEventListener('input', renderFilteredOrders);
    document.getElementById('status-filter').addEventListener('change', renderFilteredOrders);

    // Event delegation for status dropdown changes
    panelRoot.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.closest('tr').dataset.orderId;
            const newStatus = e.target.value;
            db.ref(`orders/${orderId}/status`).set(newStatus)
                .catch(err => alert('Failed to update status: ' + err.message));
        }
    });

    // --- Initial Data Load ---
    const ordersRef = db.ref('orders');
    ordersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const ordersData = snapshot.val();
            // Convert to array and sort by most recent first
            allOrdersCache = Object.keys(ordersData)
                .map(key => ({ id: key, ...ordersData[key] }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderFilteredOrders();
        } else {
            allOrdersCache = [];
            document.getElementById('order-list-body').innerHTML = '<tr><td colspan="5" class="text-center p-4">No orders in the database.</td></tr>';
        }
    });
}