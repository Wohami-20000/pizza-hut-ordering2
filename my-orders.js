const db = firebase.database();
const auth = firebase.auth();

let allOrdersCache = {};
let displayedOrderIds = new Set();
let statusConfig = {};
const ORDERS_PER_PAGE = 10;

// --- UI Element References ---
const loadingState = document.getElementById('loading-state');
const loggedOutState = document.getElementById('logged-out-state');
const noOrdersState = document.getElementById('no-orders-state');
const activeOrdersPanel = document.getElementById('active-orders-panel');
const pastOrdersPanel = document.getElementById('past-orders-panel');
const activeOrdersTab = document.getElementById('active-orders-tab');
const pastOrdersTab = document.getElementById('past-orders-tab');
const searchInput = document.getElementById('order-search-input');
const sortSelect = document.getElementById('sort-select');
const sentinel = document.getElementById('sentinel');
const notificationSound = document.getElementById('notification-sound');

// --- Helper & Core Functions ---
const getOrderCard = (orderId) => document.querySelector(`.order-card[data-order-id="${orderId}"]`);

const createOrderCard = (orderId, orderData) => {
    const card = document.createElement('div');
    card.className = 'order-card p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4';
    card.dataset.orderId = orderId;
    card.dataset.status = orderData.status;

    const date = new Date(orderData.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date(orderData.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const statusInfo = statusConfig[orderData.status] || { label: orderData.status, color: { bg: '#E5E7EB', text: '#374151' }, icon: 'fa-question-circle' };
    const isCancellable = orderData.status === 'pending';
    const isDelivered = orderData.status === 'delivered';
    const isPastOrder = ['delivered', 'completed', 'cancelled'].includes(orderData.status);

    let actionButton = '';
    if (isDelivered) {
        actionButton = `<button aria-label="Rate this order" onclick="rateOrder('${orderId}')" class="reorder-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition"><i class="fas fa-star mr-2"></i>Rate Order</button>`;
    } else if (isPastOrder) {
        actionButton = `<button aria-label="Reorder this order" onclick="reorder('${orderId}')" class="reorder-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"><i class="fas fa-redo-alt mr-2"></i>Reorder</button>`;
    } else if (isCancellable) {
        actionButton = `<button aria-label="Cancel this order" onclick="cancelOrder('${orderId}')" class="cancel-btn bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"><i class="fas fa-times mr-2"></i>Cancel</button>`;
    }

    card.innerHTML = `
        <a href="track-order.html?orderId=${orderId}" class="block" aria-label="View details for order #${orderId.slice(-6).toUpperCase()}">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-lg text-gray-800 dark:text-white">Order #${orderId.slice(-6).toUpperCase()}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${date} at ${time}</p>
                </div>
                <span class="py-1 px-3 rounded-full text-xs font-semibold" style="background-color: ${statusInfo.color.bg}; color: ${statusInfo.color.text};">
                    <i class="fas ${statusInfo.icon} mr-1"></i> ${statusInfo.label}
                </span>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p class="text-sm text-gray-600 dark:text-gray-300">${orderData.cart.length} item(s)</p>
                <p class="font-bold text-xl text-gray-900 dark:text-white">${orderData.totalPrice.toFixed(2)} MAD</p>
            </div>
        </a>
        <div class="mt-4 text-right">
            ${actionButton}
        </div>
    `;
    return card;
};

const sortAndFilterOrders = () => {
    const query = searchInput.value.toLowerCase();
    const sortValue = sortSelect.value;
    
    let orders = Object.values(allOrdersCache).filter(order => order.id.toLowerCase().includes(query));

    orders.sort((a, b) => {
        switch (sortValue) {
            case 'date_asc': return new Date(a.timestamp) - new Date(b.timestamp);
            case 'price_desc': return b.totalPrice - a.totalPrice;
            case 'price_asc': return a.totalPrice - b.totalPrice;
            default: return new Date(b.timestamp) - new Date(a.timestamp); // date_desc
        }
    });
    return orders;
};

const renderOrders = (reset = false) => {
    if (reset) {
        activeOrdersPanel.innerHTML = '';
        pastOrdersPanel.innerHTML = '';
        displayedOrderIds.clear();
    }
    const filteredOrders = sortAndFilterOrders();
    const activeTabIsActive = activeOrdersTab.classList.contains('active');

    if(Object.keys(allOrdersCache).length === 0) {
        noOrdersState.classList.remove('hidden');
        loadingState.style.display = 'none';
        return;
    } else {
        noOrdersState.classList.add('hidden');
    }
    
    const startIndex = displayedOrderIds.size;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);

    ordersToDisplay.forEach(orderData => {
        if (!displayedOrderIds.has(orderData.id)) {
            const card = createOrderCard(orderData.id, orderData);
            const isPast = ['delivered', 'completed', 'cancelled'].includes(orderData.status);
            if(isPast) {
                pastOrdersPanel.appendChild(card);
            } else {
                activeOrdersPanel.appendChild(card);
            }
            displayedOrderIds.add(orderData.id);
        }
    });

    if (ordersToDisplay.length === 0 && startIndex === 0) {
        const panelToShow = activeTabIsActive ? activeOrdersPanel : pastOrdersPanel;
        panelToShow.innerHTML = `<p class="text-center text-gray-500 py-8">No orders match your current filters.</p>`;
    }
};

const intersectionObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
        renderOrders();
    }
}, { threshold: 1 });

const cancelOrder = (orderId) => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        db.ref(`orders/${orderId}/status`).set('cancelled');
    }
};

const reorder = (orderId) => {
    const orderData = allOrdersCache[orderId];
    if (orderData && orderData.cart) {
        localStorage.setItem('cart', JSON.stringify(orderData.cart));
        window.location.href = 'cart.html';
    }
};

const rateOrder = (orderId) => {
    window.location.href = `feedback.html?orderId=${orderId}`;
};

const showToast = (message) => {
    notificationSound.play().catch(e => console.log("Audio playback failed. User interaction needed."));
    const toast = document.createElement('div');
    toast.className = 'toast-notification bg-blue-500 text-white py-2 px-4 rounded-lg shadow-lg transform translate-y-full opacity-0';
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 100);

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
};

const setupTabs = () => {
    activeOrdersTab.addEventListener('click', () => {
        activeOrdersTab.classList.add('active');
        pastOrdersTab.classList.remove('active');
        activeOrdersPanel.classList.remove('hidden');
        pastOrdersPanel.classList.add('hidden');
        renderOrders(true);
    });
    pastOrdersTab.addEventListener('click', () => {
        pastOrdersTab.classList.add('active');
        activeOrdersTab.classList.remove('active');
        pastOrdersPanel.classList.remove('hidden');
        activeOrdersPanel.classList.add('hidden');
        renderOrders(true);
    });
};

const populateStatusFilter = () => {
    sortSelect.innerHTML = `
        <option value="date_desc">Newest First</option>
        <option value="date_asc">Oldest First</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="price_asc">Price: Low to High</option>
    `;
};

const loadDataFromCache = () => {
    const cachedOrders = localStorage.getItem('ordersCache');
    const cachedStatuses = localStorage.getItem('statusConfig');
    if(cachedOrders && cachedStatuses) {
        allOrdersCache = JSON.parse(cachedOrders);
        statusConfig = JSON.parse(cachedStatuses);
        loadingState.style.display = 'none';
        renderOrders(true);
        populateStatusFilter();
    }
};

// --- Firebase Listener ---
const listenForOrders = (userId) => {
    const userOrdersRef = db.ref(`users/${userId}/orders`);
    userOrdersRef.on('value', snapshot => {
        if (!snapshot.exists()) {
            loadingState.style.display = 'none';
            noOrdersState.classList.remove('hidden');
            return;
        }
        
        const orderIds = Object.keys(snapshot.val());
        orderIds.forEach(orderId => {
            db.ref(`orders/${orderId}`).on('value', snap => {
                if(snap.exists()){
                    const orderData = { id: snap.key, ...snap.val() };
                    const existingCard = getOrderCard(orderData.id);

                    if (allOrdersCache[orderData.id] && allOrdersCache[orderData.id].status !== orderData.status) {
                        showToast(`Order #${orderData.id.slice(-6)} is now ${statusConfig[orderData.status]?.label || orderData.status}!`);
                        if(existingCard) existingCard.remove();
                    }
                    
                    allOrdersCache[orderData.id] = orderData;
                    localStorage.setItem('ordersCache', JSON.stringify(allOrdersCache));
                    if (!existingCard) renderOrders(true);
                }
            });
        });
    });
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromCache();
    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            loggedOutState.classList.add('hidden');
            
            db.ref('statuses').once('value').then(snapshot => {
                statusConfig = snapshot.val() || {};
                localStorage.setItem('statusConfig', JSON.stringify(statusConfig));
                populateStatusFilter();
                listenForOrders(user.uid);
            });
            intersectionObserver.observe(sentinel);
        } else {
            loadingState.style.display = 'none';
            loggedOutState.classList.remove('hidden');
        }
    });
    setupTabs();
    searchInput.addEventListener('input', () => renderOrders(true));
    sortSelect.addEventListener('change', () => renderOrders(true));
});