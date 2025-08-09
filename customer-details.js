// customer-details.js

const db = firebase.database();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('uid');

    const loadingState = document.getElementById('loading-state');
    const container = document.getElementById('customer-details-container');

    if (!userId) {
        loadingState.innerHTML = '<p class="text-red-500 text-center">No User ID provided.</p>';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            // Future: Add admin role check here for security
            loadCustomerData(userId);
        } else {
            window.location.href = 'auth.html'; // Redirect if not logged in
        }
    });
});

async function loadCustomerData(userId) {
    const loadingState = document.getElementById('loading-state');
    const container = document.getElementById('customer-details-container');

    try {
        // Fetch user profile and orders simultaneously
        const [userSnapshot, ordersSnapshot] = await Promise.all([
            db.ref(`users/${userId}`).once('value'),
            db.ref('orders').orderByChild('customerInfo/userId').equalTo(userId).once('value')
        ]);

        // Populate Profile Info
        if (userSnapshot.exists()) {
            const profile = userSnapshot.val();
            document.getElementById('customer-name').textContent = profile.name || 'N/A';
            document.getElementById('customer-email').textContent = profile.email || 'N/A';
            document.getElementById('customer-phone').textContent = profile.phone || 'N/A';
            
            let mainAddress = 'No address saved';
            if (profile.addresses) {
                const firstAddressKey = Object.keys(profile.addresses)[0];
                const firstAddress = profile.addresses[firstAddressKey];
                mainAddress = `${firstAddress.street}, ${firstAddress.city}`;
            }
            document.getElementById('customer-address').textContent = mainAddress;
        }

        // Populate Order History
        const ordersTbody = document.getElementById('orders-tbody');
        const noOrdersState = document.getElementById('no-orders-state');
        ordersTbody.innerHTML = '';

        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val();
            const sortedOrders = Object.entries(orders).sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

            sortedOrders.forEach(([orderId, orderData]) => {
                const row = `
                    <tr>
                        <td class="font-medium text-blue-600"><a href="order-details.html?orderId=${orderId}" target="_blank" class="hover:underline">${orderId}</a></td>
                        <td>${new Date(orderData.timestamp).toLocaleString()}</td>
                        <td class="capitalize">${orderData.orderType.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td><span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">${orderData.status}</span></td>
                        <td>${orderData.priceDetails.finalTotal.toFixed(2)} MAD</td>
                    </tr>
                `;
                ordersTbody.innerHTML += row;
            });
            noOrdersState.classList.add('hidden');
        } else {
            noOrdersState.classList.remove('hidden');
        }

        loadingState.style.display = 'none';
        container.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching customer data:", error);
        loadingState.innerHTML = `<p class="text-red-500 text-center">Could not load customer data: ${error.message}</p>`;
    }
}