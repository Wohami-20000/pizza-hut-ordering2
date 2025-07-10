// my-orders.js

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
// Modal UI elements
const confirmationModal = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');


// --- Helper & Core Functions ---
const getOrderCard = (orderId) => document.querySelector(`.order-card[data-order-id="${orderId}"]`);

function showPopin(title, message, buttons) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = '';

    buttons.forEach(btnInfo => {
        const button = document.createElement('button');
        button.textContent = btnInfo.text;
        button.className = `w-full px-4 py-2 rounded-md font-semibold ${btnInfo.class || 'bg-gray-200 text-gray-800'}`;
        button.onclick = () => {
            confirmationModal.classList.add('hidden');
            if (btnInfo.action) btnInfo.action();
        };
        modalButtons.appendChild(button);
    });

    confirmationModal.classList.remove('hidden');
}

const createOrderCard = (orderId, orderData) => {
    const card = document.createElement('div');
    card.className = 'order-card p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4';
    card.dataset.orderId = orderId;
    card.dataset.status = orderData.status;

    const date = new Date(orderData.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date(orderData.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const statusInfo = statusConfig[orderData.status] || { label: orderData.status, color: { bg: '#E5E7EB', text: '#374151' }, icon: 'fa-question-circle' };
    
    const isCancellable = orderData.status === 'pending';
    const canBeRated = ['delivered', 'completed'].includes(orderData.status);
    const hasBeenRated = orderData.rated === true;
    const isPastOrder = ['delivered', 'completed', 'cancelled'].includes(orderData.status);

    let actionButton = '';
    if (canBeRated && !hasBeenRated) {
        actionButton = `<button aria-label="Leave Feedback" onclick="rateOrder('${orderId}')" class="feedback-btn bg-brand-yellow hover:opacity-90 text-brand-dark font-bold py-2 px-4 rounded-lg shadow-sm"><i class="fas fa-comment-dots mr-2"></i>Leave Feedback</button>`;
    } else if (hasBeenRated) {
        actionButton = `<span class="text-sm text-green-600 font-semibold"><i class="fas fa-check-circle mr-2"></i>Feedback Submitted</span>`;
    } else if (isPastOrder) {
        actionButton = `<button aria-label="Reorder" onclick="reorder('${orderId}')" class="reorder-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"><i class="fas fa-redo-alt mr-2"></i>Reorder</button>`;
    } else if (isCancellable) {
        actionButton = `<button aria-label="Cancel Order" onclick="cancelOrder('${orderId}')" class="cancel-btn bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"><i class="fas fa-times mr-2"></i>Cancel</button>`;
    }

    card.innerHTML = `
        <a href="order-details.html?orderId=${orderId}" class="block">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-lg text-gray-800 dark:text-white">Order #${orderData.orderNumber}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">ID: ${orderId.slice(-6).toUpperCase()}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${date} at ${time}</p>
                </div>
                <span class="py-1 px-3 rounded-full text-xs font-semibold" style="background-color: ${statusInfo.color.bg}; color: ${statusInfo.color.text};">
                    <i class="fas ${statusInfo.icon} mr-1"></i> ${statusInfo.label}
                </span>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p class="text-sm text-gray-600 dark:text-gray-300">${orderData.items.length} item(s)</p>
                <p class="font-bold text-xl text-gray-900 dark:text-white">${orderData.priceDetails.finalTotal.toFixed(2)} MAD</p>
            </div>
        </a>
        <div class="mt-4 text-right">${actionButton}</div>
    `;
    return card;
};

const sortAndFilterOrders = () => {
    const query = searchInput.value.toLowerCase();
    const sortValue = sortSelect.value;
    
    let orders = Object.values(allOrdersCache).filter(order => order.orderId.toLowerCase().includes(query));

    orders.sort((a, b) => {
        switch (sortValue) {
            case 'date_asc': return new Date(a.timestamp) - new Date(b.timestamp);
            case 'price_desc': return b.priceDetails.finalTotal - a.priceDetails.finalTotal;
            case 'price_asc': return a.priceDetails.finalTotal - b.priceDetails.finalTotal;
            default: return new Date(b.timestamp) - new Date(a.timestamp);
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
        if (!displayedOrderIds.has(orderData.orderId)) {
            const card = createOrderCard(orderData.orderId, orderData);
            const isPast = ['delivered', 'completed', 'cancelled'].includes(orderData.status);
            if(isPast) {
                pastOrdersPanel.appendChild(card);
            } else {
                activeOrdersPanel.appendChild(card);
            }
            displayedOrderIds.add(orderData.orderId);
        }
    });
};

const intersectionObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
        renderOrders();
    }
}, { threshold: 1 });

const cancelOrder = (orderId) => {
    showPopin(
        'Confirm Cancellation',
        'Are you sure you want to cancel this order? This action cannot be undone.',
        [
            { text: 'Yes, Cancel', class: 'bg-red-600 hover:bg-red-700 text-white', action: () => db.ref(`orders/${orderId}/status`).set('cancelled') },
            { text: 'No, Keep Order', class: 'bg-gray-200 hover:bg-gray-300 text-gray-800' }
        ]
    );
};

const reorder = async (orderId) => {
    const orderData = allOrdersCache[orderId];
    if (!orderData || !orderData.items) {
        showPopin('Error', 'Could not find order data.', [{ text: 'OK', class: 'bg-red-600 text-white' }]);
        return;
    }

    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (new Date(orderData.timestamp).getTime() > thirtyMinutesAgo) {
        showPopin('Reorder Too Soon', 'You can reorder after 30 minutes.', [{ text: 'OK', class: 'bg-red-600 text-white' }]);
        return;
    }

    localStorage.removeItem('reorderRequiresNewTable');

    if (orderData.orderType === 'dineIn' && orderData.table) {
        const snapshot = await db.ref('orders').orderByChild('table').equalTo(orderData.table).once('value');
        if (snapshot.exists()) {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            let isTableTaken = false;
            snapshot.forEach(child => {
                const activeOrder = child.val();
                if (['pending', 'preparing'].includes(activeOrder.status) && new Date(activeOrder.timestamp).getTime() > oneHourAgo) {
                    isTableTaken = true;
                }
            });
            if (isTableTaken) {
                showPopin('Table Occupied', `Table ${orderData.table} is taken. Enter a new table in your cart.`, [{
                    text: 'Continue',
                    class: 'bg-red-600 text-white',
                    action: () => {
                        localStorage.setItem('reorderRequiresNewTable', 'true');
                        localStorage.setItem('cart', JSON.stringify(orderData.items));
                        localStorage.setItem('orderType', 'dineIn');
                        window.location.href = 'cart.html';
                    }
                }]);
                return;
            }
        }
    }

    localStorage.setItem('cart', JSON.stringify(orderData.items));
    if (orderData.orderType === 'dineIn') localStorage.setItem('tableNumber', orderData.table);
    localStorage.setItem('orderType', orderData.orderType);
    window.location.href = 'cart.html';
};

const rateOrder = (orderId) => window.location.href = `feedback.html?orderId=${orderId}`;

const showToast = (message) => {
    notificationSound.play().catch(e => console.log("Audio playback failed."));
    const toast = document.createElement('div');
    toast.className = 'toast-notification bg-blue-500 text-white py-2 px-4 rounded-lg shadow-lg transform translate-y-full opacity-0';
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-full', 'opacity-0'), 100);
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
};

const setupTabs = () => {
    const switchTabs = (activeTab, inactiveTab, activePanel, inactivePanel) => {
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        activePanel.classList.remove('hidden');
        inactivePanel.classList.add('hidden');
        renderOrders(true);
    };
    activeOrdersTab.addEventListener('click', () => switchTabs(activeOrdersTab, pastOrdersTab, activeOrdersPanel, pastOrdersPanel));
    pastOrdersTab.addEventListener('click', () => switchTabs(pastOrdersTab, activeOrdersTab, pastOrdersPanel, activeOrdersPanel));
};

const populateStatusFilter = () => {
    sortSelect.innerHTML = `
        <option value="date_desc">Newest First</option>
        <option value="date_asc">Oldest First</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="price_asc">Price: Low to High</option>
    `;
};

/**
 * Loads data from localStorage cache first, then fetches updates.
 */
function loadAndListenForOrders(userId) {
    // 1. Load from cache immediately
    const cachedOrders = localStorage.getItem(`ordersCache_${userId}`);
    if (cachedOrders) {
        allOrdersCache = JSON.parse(cachedOrders);
        renderOrders(true);
    }

    // 2. Listen for Firebase updates
    const userOrdersRef = db.ref(`users/${userId}/orders`);
    userOrdersRef.on('value', snapshot => {
        if (!snapshot.exists()) {
            if (Object.keys(allOrdersCache).length === 0) {
                loadingState.style.display = 'none';
                noOrdersState.classList.remove('hidden');
            }
            return;
        }
        
        const orderIds = Object.keys(snapshot.val());
        orderIds.forEach(orderId => {
            db.ref(`orders/${orderId}`).on('value', snap => {
                if(snap.exists()){
                    const orderData = snap.val();
                    const existingOrder = allOrdersCache[orderData.orderId];

                    if (existingOrder && existingOrder.status !== orderData.status) {
                        showToast(`Order #${orderData.orderNumber} is now ${statusConfig[orderData.status]?.label || orderData.status}!`);
                    }
                    
                    // Merge new data into the cache
                    allOrdersCache[orderData.orderId] = { ...existingOrder, ...orderData };
                    localStorage.setItem(`ordersCache_${userId}`, JSON.stringify(allOrdersCache));
                    renderOrders(true); // Re-render to reflect any changes
                }
            });
        });
        loadingState.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            loggedOutState.classList.add('hidden');
            
            db.ref('statuses').once('value').then(snapshot => {
                statusConfig = snapshot.val() || {};
                localStorage.setItem('statusConfig', JSON.stringify(statusConfig));
                populateStatusFilter();
                loadAndListenForOrders(user.uid);
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