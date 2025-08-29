// user-orders.js

const db = firebase.database();
const auth = firebase.auth();

const loadingState = document.getElementById('loading-state');
const ordersContainer = document.getElementById('orders-container');
const noOrdersState = document.getElementById('no-orders-state');
const pageTitle = document.getElementById('page-title');

/**
 * Creates the HTML for a single order card.
 * @param {string} orderId The ID of the order.
 * @param {object} orderData The data for the order.
 * @returns {string} The HTML string for the order card.
 */
function createOrderCard(orderId, orderData) {
    const date = new Date(orderData.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date(orderData.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="order-card bg-white rounded-2xl shadow-lg p-5">
            <div class="flex justify-between items-start border-b pb-3 mb-3">
                <div>
                    <p class="font-bold text-lg text-brand-dark">Order #${orderData.orderNumber}</p>
                    <p class="text-xs text-gray-500">ID: ${orderId.slice(-6).toUpperCase()}</p>
                </div>
                <span class="py-1 px-3 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">${orderData.status}</span>
            </div>
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-sm text-gray-600">${orderData.cart.length} item(s)</p>
                    <p class="font-extrabold text-2xl text-brand-dark">${orderData.priceDetails.finalTotal.toFixed(2)} MAD</p>
                </div>
                <div class="text-right">
                     <p class="text-sm text-gray-500">${date} at ${time}</p>
                     <a href="order-details.html?orderId=${orderId}" target="_blank" class="text-sm font-bold py-2 px-4 rounded-lg bg-gray-200 mt-2 inline-block">View Details</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Fetches and displays the orders for a specific user.
 * @param {string} userId The UID of the user whose orders to fetch.
 */
async function loadUserOrders(userId) {
    try {
        // First, get the user's name to display in the title
        const userSnapshot = await db.ref(`users/${userId}`).once('value');
        if (userSnapshot.exists()) {
            const userName = userSnapshot.val().name || 'Customer';
            pageTitle.textContent = `Orders for ${userName}`;
        }

        const ordersSnapshot = await db.ref('orders').orderByChild('customerInfo/userId').equalTo(userId).once('value');
        
        loadingState.style.display = 'none';

        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val();
            const sortedOrders = Object.entries(orders).sort(([, a], [, b]) => new Date(b.timestamp) - new Date(a.timestamp));
            
            ordersContainer.innerHTML = ''; // Clear container
            sortedOrders.forEach(([orderId, orderData]) => {
                ordersContainer.innerHTML += createOrderCard(orderId, orderData);
            });
            ordersContainer.classList.remove('hidden');
        } else {
            noOrdersState.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error fetching user orders:", error);
        loadingState.innerHTML = '<p class="text-red-500">Could not load orders.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('uid');

    if (!userId) {
        loadingState.innerHTML = '<p class="text-red-500">No user ID provided.</p>';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            // You can add an admin check here if needed for security
            loadUserOrders(userId);
        } else {
            // Redirect if not logged in
            window.location.href = 'auth.html';
        }
    });
});
