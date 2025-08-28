// /customer-details.js

import { db, auth } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const addressGroup = document.getElementById('address-group');

    // Show address field only for delivery
    if (orderDetails.orderType === 'delivery') {
        addressGroup.style.display = 'block';
    } else {
        addressGroup.style.display = 'none';
    }

    // Pre-fill form if user is logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            db.ref(`users/${user.uid}`).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    nameInput.value = userData.name || '';
                    phoneInput.value = userData.phone || '';
                    // You could add logic here to pre-fill address if available
                }
            });
        }
    });

    placeOrderBtn.addEventListener('click', async () => {
        // Basic validation
        if (!nameInput.value || !phoneInput.value || (orderDetails.orderType === 'delivery' && !addressInput.value)) {
            alert('Please fill in all required fields.');
            return;
        }

        // Update orderDetails with form values
        orderDetails.name = nameInput.value;
        orderDetails.phone = phoneInput.value;
        if (orderDetails.orderType === 'delivery') {
            orderDetails.address = addressInput.value;
        }
        
        // Save the updated details back to localStorage
        localStorage.setItem('orderDetails', JSON.stringify(orderDetails));

        // --- THIS IS THE CRITICAL FIX ---
        // The original file was missing the logic to save the cart and price.
        
        const user = auth.currentUser;
        const newOrderId = db.ref('orders').push().key;

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const taxes = subtotal * 0.20; // 20% tax
        const total = subtotal + taxes;

        const orderData = {
            orderId: newOrderId,
            orderNumber: Math.floor(100000 + Math.random() * 900000),
            timestamp: new Date().toISOString(),
            status: 'Pending',
            orderType: orderDetails.orderType,
            customerName: orderDetails.name, // Add for easier display in dashboard
            customerPhone: orderDetails.phone, // Add for easier display in dashboard
            customerAddress: orderDetails.address || '', // Add for easier display in dashboard
            customerInfo: {
                userId: user ? user.uid : 'guest',
                name: orderDetails.name,
                phone: orderDetails.phone,
                address: orderDetails.address || '',
            },
            // --- [FIX] Include the cart and price details when saving ---
            cart: cart,
            totalPrice: total,
            priceDetails: {
                subtotal: subtotal,
                taxes: taxes,
                total: total
            }
        };

        try {
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Placing Order...';

            await db.ref('orders/' + newOrderId).set(orderData);
            
            // Redirect to confirmation page
            window.location.href = `confirm.html?orderId=${newOrderId}`;

        } catch (error) {
            console.error("Failed to place order:", error);
            alert("There was an error placing your order. Please try again.");
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    });
});