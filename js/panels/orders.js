// /js/panels/orders.js

const db = firebase.database();
let allOrdersCache = {};
let isInitialLoad = true;
let deliveryStaff = []; // Cache for delivery staff

const STATUS_OPTIONS = ['pending', 'preparing', 'ready', 'out for delivery', 'delivered', 'completed', 'cancelled'];

/**
 * Fetches users with the 'delivery' role.
 */
async function fetchDeliveryStaff() {
    try {
        const usersSnapshot = await db.ref('users').orderByChild('role').equalTo('delivery').once('value');
        deliveryStaff = [];
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(userSnap => {
                deliveryStaff.push({ uid: userSnap.key, ...userSnap.val() });
            });
        }
    } catch (error) {
        console.error("Error fetching delivery staff:", error);
    }
}


/**
 * Creates the HTML for a single order row in the table.
 */
function createOrderRow(orderId, orderData) {
    const { customerInfo, timestamp, priceDetails, status, orderType, allergyInfo } = orderData;
    const customerName = customerInfo ? customerInfo.name : 'N/A';
    const customerId = customerInfo ? customerInfo.userId : null;
    const customerLink = customerId ? `<a href="../customer-details.html?uid=${customerId}" target="_blank" class="text-blue-600 hover:underline">${customerName}</a>` : customerName;
    const orderDate = new Date(timestamp).toLocaleString();
    const finalTotal = priceDetails ? priceDetails.finalTotal.toFixed(2) : '0.00';
    const isCancellable = status !== 'cancelled' && status !== 'delivered' && status !== 'completed';
    const notes = allergyInfo ? `<span class="text-red-600 font-semibold">${allergyInfo}</span>` : 'N/A';

    // Determine if the assignment UI should be shown
    const isAssignable = orderType === 'delivery' && (status === 'preparing' || status === 'ready');

    const statusDropdown = STATUS_OPTIONS.map(opt =>
        `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
    ).join('');

    // Generate driver options for the dropdown
    const driverOptions = deliveryStaff.map(driver =>
        `<option value="${driver.uid}">${driver.name}</option>`
    ).join('');

    // Conditionally create the assignment UI
    const assignmentHtml = isAssignable ? `
        <div class="mt-2 flex items-center gap-2">
            <select class="driver-select w-full p-1 border rounded-md text-xs bg-white">
                <option value="">Assign Driver...</option>
                ${driverOptions}
            </select>
            <button class="assign-driver-btn bg-green-600 text-white px-2 py-1 rounded-md text-xs font-semibold hover:bg-green-700">Assign</button>
        </div>
    ` : '';


    return `
        <tr class="hover:bg-gray-50 transition" data-order-id="${orderId}">
            <td class="p-3 text-sm font-medium text-blue-600">
                <a href="../order-details.html?orderId=${orderId}" target="_blank" class="hover:underline">${orderId}</a>
            </td>
            <td class="p-3 text-sm text-gray-700">${customerLink}</td>
            <td class="p-3 text-sm text-gray-600">${orderDate}</td>
            <td class="p-3 text-sm capitalize">${orderType.replace(/([A-Z])/g, ' $1').trim()}</td>
            <td class="p-3 text-sm text-gray-600">${notes}</td>
            <td class="p-3 text-sm font-semibold">${finalTotal} MAD</td>
            <td class="p-3">
                <select class="status-select w-full p-2 border rounded-md text-sm bg-white">
                    ${statusDropdown}
                </select>
            </td>
            <td class="p-3 text-center">
                <a href="../edit-order.html?orderId=${orderId}" class="edit-order-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600">Edit</a>
                ${isCancellable ? `<button class="cancel-order-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 ml-2">Cancel</button>` : ''}
                ${assignmentHtml}
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

    const ordersArray = Object.values(allOrdersCache)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const filteredOrders = ordersArray.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchInput) ||
                              (order.customerInfo && order.customerInfo.name.toLowerCase().includes(searchInput));
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    orderListBody.innerHTML = filteredOrders.length
        ? filteredOrders.map(order => createOrderRow(order.id, order)).join('')
        : `<tr><td colspan="8" class="text-center p-4 text-gray-500">No matching orders found.</td></tr>`;
}

function playNotificationSound() {
    const sound = document.getElementById('notification-sound');
    if (sound) {
        sound.play().catch(error => console.warn("Audio playback failed.", error));
    }
}

/**
 * Main function to load the Orders Panel.
 */
export async function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Order Management';
    isInitialLoad = true;
    
    // Fetch delivery staff before rendering anything
    await fetchDeliveryStaff();

    const statusFilterOptions = ['all', ...STATUS_OPTIONS]
        .map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">All Orders</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="search" id="order-search" placeholder="Search by Order ID or Customer..." class="w-full p-2 border rounded-md">
                <select id="status-filter" class="w-full p-2 border rounded-md bg-white">${statusFilterOptions}</select>
            </div>
            <div class="overflow-y-auto" style="max-height: 70vh;">
                <table class="min-w-full">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Order ID</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Customer</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Type</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Customer Notes</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Total</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Status</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="order-list-body" class="divide-y divide-gray-200">
                        <tr><td colspan="8" class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-brand-red"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('order-search').addEventListener('input', renderFilteredOrders);
    document.getElementById('status-filter').addEventListener('change', renderFilteredOrders);

    panelRoot.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.closest('tr').dataset.orderId;
            const newStatus = e.target.value;
            db.ref(`orders/${orderId}/status`).set(newStatus);
        }
    });

    // Combined event listener for cancel and assign buttons
    panelRoot.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        if (!row) return;

        const orderId = row.dataset.orderId;

        if (button.classList.contains('cancel-order-btn')) {
            if (confirm(`Are you sure you want to cancel order #${orderId}? This action cannot be undone.`)) {
                db.ref(`orders/${orderId}/status`).set('cancelled');
            }
        } else if (button.classList.contains('assign-driver-btn')) {
            const selectEl = row.querySelector('.driver-select');
            const driverUid = selectEl.value;

            if (!driverUid) {
                alert('Please select a driver first.');
                return;
            }
            
            const driverName = selectEl.options[selectEl.selectedIndex].text;
            const updates = {
                status: 'out for delivery',
                assignedDriver: {
                    uid: driverUid,
                    name: driverName
                }
            };

            db.ref(`orders/${orderId}`).update(updates);
        }
    });

    const ordersRef = db.ref('orders');
    ordersRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            allOrdersCache = {};
            document.getElementById('order-list-body').innerHTML = '<tr><td colspan="8" class="text-center p-4">No orders found.</td></tr>';
            return;
        }

        const ordersData = snapshot.val();

        if (!isInitialLoad) {
            const newOrderIds = Object.keys(ordersData);
            const cachedOrderIds = Object.keys(allOrdersCache);
            if (newOrderIds.length > cachedOrderIds.length) {
                playNotificationSound();
            }
        }

        allOrdersCache = Object.keys(ordersData).reduce((acc, key) => {
            acc[key] = { id: key, ...ordersData[key] };
            return acc;
        }, {});

        renderFilteredOrders();
        isInitialLoad = false;
    });
}