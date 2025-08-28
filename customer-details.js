// /customer-details.js

import { db, auth } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const promo = JSON.parse(localStorage.getItem('appliedPromo')) || null;


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
        if (user && !user.isAnonymous) {
            db.ref(`users/${user.uid}`).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    nameInput.value = userData.name || '';
                    phoneInput.value = userData.phone || '';
                    if (orderDetails.orderType === 'delivery' && userData.addresses?.main) {
                        addressInput.value = userData.addresses.main.street || '';
                    }
                }
            });
        }
    });

    placeOrderBtn.addEventListener('click', async () => {
        // Basic validation
        if (!nameInput.value.trim() || !phoneInput.value.trim() || (orderDetails.orderType === 'delivery' && !addressInput.value.trim())) {
            alert('Please fill in all required fields.');
            return;
        }

        // Update orderDetails with form values
        orderDetails.name = nameInput.value.trim();
        orderDetails.phone = phoneInput.value.trim();
        if (orderDetails.orderType === 'delivery') {
            orderDetails.address = addressInput.value.trim();
        }
        
        const user = auth.currentUser;
        const newOrderId = db.ref('orders').push().key;

        // --- Calculate price details correctly ---
        const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxes = itemsTotal * 0.20; // 20% tax
        const deliveryFee = orderDetails.orderType === 'delivery' ? 15 : 0;
        let discount = 0;
        if (promo) {
             if (promo.type === 'percentage') {
                discount = itemsTotal * (promo.value / 100);
            } else if (promo.type === 'fixed') {
                discount = promo.value;
            }
        }
        const finalTotal = itemsTotal + taxes + deliveryFee - discount;


        const orderData = {
            orderId: newOrderId,
            orderNumber: Math.floor(100000 + Math.random() * 900000),
            timestamp: new Date().toISOString(),
            status: 'Pending',
            orderType: orderDetails.orderType,
            customerName: orderDetails.name,
            customerPhone: orderDetails.phone,
            customerAddress: orderDetails.address || '',
            customerInfo: {
                userId: user ? user.uid : 'guest',
                name: orderDetails.name,
                phone: orderDetails.phone,
                address: orderDetails.address || '',
            },
            // --- [FINAL FIX] Save the item list under BOTH 'cart' and 'items' keys ---
            cart: cart, 
            items: cart, // This ensures both confirm.js and orders.js work correctly
            totalPrice: finalTotal,
            priceDetails: {
                itemsTotal: itemsTotal,
                taxes: taxes,
                deliveryFee: deliveryFee,
                discount: discount,
                finalTotal: finalTotal
            }
        };

        try {
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Placing Order...';

            await db.ref('orders/' + newOrderId).set(orderData);
            
            localStorage.setItem('lastOrderId', newOrderId);

            // Redirect to confirmation page
            window.location.href = `confirm.html`;

        } catch (error) {
            console.error("Failed to place order:", error);
            alert("There was an error placing your order. Please try again.");
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    });
});
