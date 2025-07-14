// /js/panels/orders.js - Redesigned for better UI/UX

const db = firebase.database();
let allOrdersCache = {}; 
let isInitialLoad = true;

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-clock' },
    preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800', icon: 'fa-utensils' },
    ready: { label: 'Ready', color: 'bg-indigo-100 text-indigo-800', icon: 'fa-clipboard-check' },
    'out for delivery': { label: 'Out for Delivery', color: 'bg-purple-100 text-purple-800', icon: 'fa-biking' },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: 'fa-check-double' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: 'fa-check-double' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: 'fa-times-circle' },
    default: { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: 'fa-question-circle' }
};

/**
 * Creates the HTML for a single, redesigned order card.
 * @param {string} orderId - The unique key for the order.
 * @param {object} orderData - The data object for the order.
 * @returns {string} The HTML string for the order card.
 */
function createOrderCard(orderId, orderData) {
    const { customerInfo, timestamp, priceDetails, status, items, orderType, table, deliveryAddress } = orderData;
    const customerName = customerInfo ? customerInfo.name : 'N/A';
    const orderDate = new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const finalTotal = priceDetails ? priceDetails.finalTotal.toFixed(2) : '0.00';
    const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.default;

    const locationInfo = orderType === 'dineIn' 
        ? `<i class="fas fa-utensils mr-2 text-gray-500"></i>Table ${table}`
        : `<i class="fas fa-motorcycle mr-2 text-gray-500"></i>${deliveryAddress || 'Pickup'}`;

    const itemsSummary = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    const statusDropdown = Object.keys(STATUS_CONFIG)
        .filter(key => key !== 'default')
        .map(opt => `<option value="${opt}" ${status === opt ? 'selected' : ''}>${STATUS_CONFIG[opt].label}</option>`)
        .join('');

    return `
        <div class="order-card bg-white rounded-2xl shadow-lg transition-all duration-300 animate-fadeInUp" data-order-id="${orderId}" data-status="${status}" data-customer="${customerName.toLowerCase()}">
            <div class="p-5 border-b border-gray-100">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-lg text-brand-dark">Order #${orderData.orderNumber}</p>
                        <p class="text-xs text-gray-500">ID: ${orderId.slice(-6).toUpperCase()}</p>
                    </div>
                    <span class="py-1 px-3 rounded-full text-xs font-semibold ${statusInfo.color}">
                        <i class="fas ${statusInfo.icon} mr-1.5"></i>${statusInfo.label}
                    </span>
                </div>
                <div class="text-sm text-gray-600 mt-2">${locationInfo}</div>
            </div>
            <div class="p-5">
                <p class="text-sm text-gray-500 font-medium">Customer: <span class="font-bold text-gray-700">${customerName}</span></p>
                <p class="text-sm text-gray-500 font-medium">Date: <span class="font-bold text-gray-700">${orderDate}</span></p>
                <div class="my-3 py-2 border-t border-b text-xs text-gray-600">${itemsSummary}</div>
                <p class="text-right font-extrabold text-2xl text-brand-dark">${finalTotal} MAD</p>
            </div>
            <div class="bg-gray-50 px-5 py-3 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                <div class="w-full sm:w-auto">
                    <select class="status-select w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-brand-red focus:border-brand-red">
                        ${statusDropdown}
                    </select>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <a href="../order-details.html?orderId=${orderId}" target="_blank" class="w-full text-center text-sm font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 bg-gray-200 text-gray-800">Details</a>
                    <a href="../edit-order.html?orderId=${orderId}" class="w-full text-center text-sm font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 bg-blue-500 text-white">Edit</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders orders based on current filters.
 */
function renderFilteredOrders() {
    const orderListContainer = document.getElementById('order-list-container');
    if (!orderListContainer) return;

    const searchInput = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const noResultsMessage = document.getElementById('no-results-message');
    
    let hasVisibleItems = false;
    orderListContainer.querySelectorAll('.order-card').forEach(card => {
        const matchesSearch = card.dataset.orderId.toLowerCase().includes(searchInput) || card.dataset.customer.includes(searchInput);
        const matchesStatus = statusFilter === 'all' || card.dataset.status === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            card.style.display = 'block';
            hasVisibleItems = true;
        } else {
            card.style.display = 'none';
        }
    });

    noResultsMessage.style.display = hasVisibleItems ? 'none' : 'block';
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
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Order Management';
    isInitialLoad = true; 

    const statusFilterOptions = ['all', ...Object.keys(STATUS_CONFIG).filter(k => k !== 'default')]
        .map(s => `<option value="${s}">${capitalizeFirstLetter(s)}</option>`).join('');

    panelRoot.innerHTML = `
        <style>
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fadeInUp {
                animation: fadeInUp 0.5s ease-out forwards;
                opacity: 0;
            }
        </style>
        <div class="bg-white rounded-2xl shadow-xl p-6">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-6 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="border-b pb-4 mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Live Orders</h2>
                <p class="text-sm text-gray-500 mt-1">Search, filter, and manage all incoming and past orders.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="md:col-span-2 relative">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="search" id="order-search" placeholder="Search by Order ID or Customer Name..." class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                </div>
                <div>
                    <select id="status-filter" class="w-full p-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-brand-red focus:border-brand-red">${statusFilterOptions}</select>
                </div>
            </div>
            
            <div id="order-list-container" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div id="loading-placeholder" class="col-span-full text-center py-20 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    <p class="mt-3">Loading orders...</p>
                </div>
                <div id="no-results-message" class="col-span-full text-center py-20 text-gray-500" style="display: none;">
                    <i class="fas fa-receipt text-3xl mb-3"></i>
                    <p>No orders match your search.</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('order-search').addEventListener('input', renderFilteredOrders);
    document.getElementById('status-filter').addEventListener('change', renderFilteredOrders);

    panelRoot.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.closest('.order-card').dataset.orderId;
            const newStatus = e.target.value;
            db.ref(`orders/${orderId}/status`).set(newStatus);
        }
    });

    const ordersRef = db.ref('orders');
    ordersRef.on('value', (snapshot) => {
        const orderListContainer = document.getElementById('order-list-container');
        if (!orderListContainer) return; // Panel not visible

        if (!snapshot.exists()) {
            allOrdersCache = {};
            document.getElementById('loading-placeholder').textContent = 'No orders have been placed yet.';
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
        
        const sortedOrders = Object.values(allOrdersCache).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        orderListContainer.innerHTML = ''; // Clear previous content
        sortedOrders.forEach((order, index) => {
            const cardHtml = createOrderCard(order.id, order);
            const cardEl = document.createElement('div');
            cardEl.innerHTML = cardHtml;
            cardEl.firstChild.style.animationDelay = `${index * 30}ms`;
            orderListContainer.appendChild(cardEl.firstChild);
        });

        // Add the "no results" message back in
        orderListContainer.insertAdjacentHTML('beforeend', `
            <div id="no-results-message" class="col-span-full text-center py-20 text-gray-500" style="display: none;">
                <i class="fas fa-receipt text-3xl mb-3"></i>
                <p>No orders match your search.</p>
            </div>
        `);

        document.getElementById('loading-placeholder').style.display = 'none';
        renderFilteredOrders(); // Apply initial filters
        isInitialLoad = false;
    });
}
