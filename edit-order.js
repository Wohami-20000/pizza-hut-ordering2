// edit-order.js
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Initialize DB from the global firebase object (initialized in firebase.js)
const db = getDatabase();

// 1. Get the order ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get("orderId");
console.log("Editing order:", orderId);

if (orderId) {
    // 2. Fetch the order from Firebase
    const orderRef = ref(db, 'orders/' + orderId);
    get(orderRef).then(snapshot => {
        if (snapshot.exists()) {
            const order = snapshot.val();
            console.log("Order Data:", order);
            // Add the ID to the order object itself for easy access
            order.id = orderId; 
            renderOrder(order);
        } else {
            const container = document.getElementById("edit-order-container");
            container.innerHTML = `<p style="color: red;">Error: No order found with ID: ${orderId}</p>`;
            console.error("No order found with ID:", orderId);
        }
    }).catch(error => {
        const container = document.getElementById("edit-order-container");
        container.innerHTML = `<p style="color: red;">Error fetching order: ${error.message}</p>`;
        console.error("Error fetching order:", error);
    });
} else {
    const container = document.getElementById("edit-order-container");
    container.innerHTML = `<p style="color: red;">Error: No orderId provided in the URL.</p>`;
}


// 3. Render the order on the page
function renderOrder(order) {
    const container = document.getElementById("edit-order-container");
    if (!container) return;

    // Use a more detailed structure from your previous files
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg space-y-6">
            <div class="flex justify-between items-center">
                 <h2 class="text-xl font-bold">Order Details #${order.orderId}</h2>
                 <p><strong>Customer:</strong> ${order.customerInfo.name || 'N/A'}</p>
            </div>
            
            <div>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Total:</strong> ${order.priceDetails.finalTotal.toFixed(2)} MAD</p>
            </div>

            <div>
                <h4 class="font-semibold mb-2">Items:</h4>
                <ul class="list-disc list-inside space-y-1">
                    ${order.cart.map(item => `<li>${item.name} x${item.quantity}</li>`).join("")}
                </ul>
            </div>

            <div class="border-t pt-4">
                <h4 class="font-semibold mb-2">Update Status:</h4>
                <div class="flex gap-2">
                    <button onclick="updateStatus('${order.id}', 'Preparing')">Set to Preparing</button>
                    <button onclick="updateStatus('${order.id}', 'Ready')">Set to Ready</button>
                    <button onclick="updateStatus('${order.id}', 'Completed')">Set to Completed</button>
                    <button onclick="updateStatus('${order.id}', 'Cancelled')">Cancel Order</button>
                </div>
            </div>
        </div>
    `;
}

// 4. Allow updates
function updateStatus(orderId, newStatus) {
    const orderRef = ref(db, 'orders/' + orderId);
    update(orderRef, { status: newStatus })
        .then(() => {
            alert("Order status updated!");
            location.reload(); // Reload the page to show the new status
        })
        .catch(err => {
            console.error("Error updating status:", err);
            alert("Failed to update status.");
        });
}

// Expose the function to the global scope so inline onclick can find it
window.updateStatus = updateStatus;
