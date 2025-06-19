// confirm.js - Updated for New Security Rules
const db = firebase.database();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    const orderIdSpan = document.getElementById('order-id');
    const orderStatusDiv = document.getElementById('order-status');
    const orderTotalSpan = document.getElementById('order-total');
    const orderItemsUl = document.getElementById('order-items-list');
    const loadingDiv = document.getElementById('loading-state');
    const contentDiv = document.getElementById('confirmation-content');
    const errorDiv = document.getElementById('error-state');

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        return;
    }
    
    localStorage.setItem("lastOrderId", orderId); // Save for "My Orders" button

    db.ref('orders/' + orderId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const orderData = snapshot.val();
                
                // --- NEW: If the user is logged in, ensure this orderId is in their user profile ---
                // This is a "self-healing" mechanism in case the write failed previously
                if (orderData.userId) {
                    const userOrderRef = db.ref(`users/${orderData.userId}/orders/${orderId}`);
                    userOrderRef.set(true);
                }
                // --- End of new logic ---

                loadingDiv.style.display = 'none';
                contentDiv.style.display = 'block';

                orderIdSpan.textContent = `#${orderId.slice(-6).toUpperCase()}`;
                orderStatusDiv.textContent = orderData.status || 'Placed';
                orderTotalSpan.textContent = `${orderData.totalPrice.toFixed(2)} MAD`;

                orderItemsUl.innerHTML = '';
                orderData.cart.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center text-sm';
                    li.innerHTML = `
                        <span>${item.quantity} x ${item.name}</span>
                        <span class="font-semibold">${(item.price * item.quantity).toFixed(2)} MAD</span>
                    `;
                    orderItemsUl.appendChild(li);
                });

            } else {
                loadingDiv.style.display = 'none';
                errorDiv.style.display = 'block';
            }
        })
        .catch(err => {
            console.error("Error fetching order confirmation:", err);
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'block';
        });
});