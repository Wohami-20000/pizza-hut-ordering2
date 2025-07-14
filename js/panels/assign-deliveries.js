// /js/panels/assign-deliveries.js - Redesigned with Drag-and-Drop UI

const db = firebase.database();

/**
 * Creates the HTML for a draggable order card.
 * @param {string} orderId - The unique key for the order.
 * @param {object} orderData - The data object for the order.
 * @returns {string} The HTML string for the order card.
 */
function createOrderCard(orderId, orderData) {
    const { deliveryAddress, items, orderNumber } = orderData;
    const itemsSummary = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    return `
        <div id="order-${orderId}" class="order-card bg-white p-4 rounded-xl shadow-md cursor-grab active:cursor-grabbing" draggable="true" data-order-id="${orderId}">
            <p class="font-bold text-gray-800">Order #${orderNumber}</p>
            <p class="text-sm text-gray-600 my-1">To: ${deliveryAddress}</p>
            <div class="text-xs text-gray-500 border-t border-b py-2 mt-2">${itemsSummary}</div>
        </div>
    `;
}

/**
 * Creates the HTML for a droppable driver card.
 * @param {string} driverId - The unique ID of the driver.
 * @param {object} driverData - The data object for the driver.
 * @param {number} activeDeliveries - The number of active deliveries for this driver.
 * @returns {string} The HTML string for the driver card.
 */
function createDriverCard(driverId, driverData, activeDeliveries) {
    return `
        <div id="driver-${driverId}" class="driver-card bg-white p-4 rounded-xl shadow-md transition-all duration-200" data-driver-id="${driverId}" data-driver-name="${driverData.name}">
            <div class="flex items-center space-x-4">
                <i class="fas fa-user-circle text-4xl text-gray-400"></i>
                <div class="flex-grow">
                    <p class="font-bold text-gray-800">${driverData.name}</p>
                    <p class="text-sm text-gray-500">Active Deliveries: <span class="font-bold text-blue-600">${activeDeliveries}</span></p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Shows a temporary toast notification.
 * @param {string} message - The message to display.
 */
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'bg-green-600 text-white py-2 px-5 rounded-lg shadow-xl animate-fadeInUp';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * Main function to set up and load the Assign Deliveries Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Assign Deliveries';

    panelRoot.innerHTML = `
        <style>
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
            .order-card.dragging { opacity: 0.5; border: 2px dashed #9ca3af; }
            .driver-card.drop-hover { transform: scale(1.05); box-shadow: 0 0 0 3px #3b82f6; }
        </style>
        <div class="space-y-6">
             <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-2 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Unassigned Orders Column -->
                <div class="bg-gray-100 p-4 rounded-xl">
                    <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-box-open text-yellow-600"></i>Unassigned Orders</h3>
                    <div id="unassigned-orders-list" class="space-y-4 min-h-[50vh]">
                        <p id="orders-loading" class="text-center text-gray-500 py-10">Loading orders...</p>
                    </div>
                </div>
                <!-- Available Drivers Column -->
                <div class="bg-gray-100 p-4 rounded-xl">
                    <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-motorcycle text-blue-600"></i>Available Drivers</h3>
                    <div id="available-drivers-list" class="space-y-4">
                        <p id="drivers-loading" class="text-center text-gray-500 py-10">Loading drivers...</p>
                    </div>
                </div>
            </div>
        </div>
        <div id="toast-container" class="fixed bottom-5 right-5 z-50"></div>
    `;

    const unassignedOrdersList = document.getElementById('unassigned-orders-list');
    const availableDriversList = document.getElementById('available-drivers-list');
    const ordersLoading = document.getElementById('orders-loading');
    const driversLoading = document.getElementById('drivers-loading');

    // --- Drag and Drop Logic ---
    let draggedOrderId = null;

    unassignedOrdersList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-card')) {
            draggedOrderId = e.target.dataset.orderId;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    unassignedOrdersList.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('order-card')) {
            e.target.classList.remove('dragging');
            draggedOrderId = null;
        }
    });

    availableDriversList.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow drop
        const dropTarget = e.target.closest('.driver-card');
        if (dropTarget) {
            e.dataTransfer.dropEffect = 'move';
            dropTarget.classList.add('drop-hover');
        }
    });

    availableDriversList.addEventListener('dragleave', (e) => {
        const dropTarget = e.target.closest('.driver-card');
        if (dropTarget) {
            dropTarget.classList.remove('drop-hover');
        }
    });

    availableDriversList.addEventListener('drop', async (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.driver-card');
        if (dropTarget && draggedOrderId) {
            dropTarget.classList.remove('drop-hover');
            const driverId = dropTarget.dataset.driverId;
            const driverName = dropTarget.dataset.driverName;
            
            const updates = {
                status: 'out for delivery',
                assignedDriver: { uid: driverId, name: driverName }
            };
            
            try {
                await db.ref(`orders/${draggedOrderId}`).update(updates);
                showToast(`Order assigned to ${driverName}.`);
            } catch (err) {
                alert('Failed to assign order: ' + err.message);
            }
        }
    });

    // --- Firebase Data Loading ---
    
    // 1. Listen for all orders to calculate active deliveries
    db.ref('orders').on('value', (ordersSnapshot) => {
        const allOrders = ordersSnapshot.val() || {};
        
        // 2. Listen for delivery staff
        db.ref('users').orderByChild('role').equalTo('delivery').on('value', (usersSnapshot) => {
            driversLoading.style.display = 'none';
            availableDriversList.innerHTML = '';
            if (usersSnapshot.exists()) {
                usersSnapshot.forEach(userSnap => {
                    const driverId = userSnap.key;
                    const driverData = userSnap.val();
                    
                    // Calculate active deliveries for this driver
                    const activeDeliveries = Object.values(allOrders).filter(order => 
                        order.assignedDriver?.uid === driverId && order.status === 'out for delivery'
                    ).length;
                    
                    availableDriversList.innerHTML += createDriverCard(driverId, driverData, activeDeliveries);
                });
            } else {
                availableDriversList.innerHTML = '<p class="text-center text-gray-500">No delivery staff found.</p>';
            }
        });
    });

    // 3. Listen for unassigned orders
    db.ref('orders').orderByChild('status').equalTo('preparing').on('value', (ordersSnapshot) => {
        ordersLoading.style.display = 'none';
        unassignedOrdersList.innerHTML = '';
        let hasOrdersToAssign = false;
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach(orderSnap => {
                const orderData = orderSnap.val();
                if (orderData.orderType === 'delivery') {
                    hasOrdersToAssign = true;
                    unassignedOrdersList.innerHTML += createOrderCard(orderSnap.key, orderData);
                }
            });
        }
        if (!hasOrdersToAssign) {
            unassignedOrdersList.innerHTML = '<p class="text-center text-gray-500">No orders are currently waiting for a driver.</p>';
        }
    });
}
