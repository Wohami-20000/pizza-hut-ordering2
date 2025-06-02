// cart.js

// Initialize Firebase database object for this script
// This line assumes firebase.js (with firebase.initializeApp) has already been loaded and executed.
const db = firebase.database(); 
console.log("cart.js: Firebase 'db' object initialized.");

// Load cart from localStorage or empty array
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return String(str).replace(/[<>&"']/g, s => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total");

  if (!container || !cartTotalEl) {
    console.error("Cart HTML elements not found!");
    return;
  }

  container.innerHTML = ""; // Clear previous items

  if (cart.length === 0) {
    container.innerHTML = "<p data-translate='cart_empty'>Your cart is empty.</p>";
    cartTotalEl.textContent = "0.00";
    // Try to re-apply language in case this message was just added
    if (typeof applyLanguage === 'function' && typeof currentLang !== 'undefined') {
        applyLanguage(currentLang);
    }
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    const itemTotalPrice = (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0);
    total += itemTotalPrice;

    const itemDiv = document.createElement("div");
    itemDiv.className = "bg-white rounded-lg shadow p-4 flex justify-between items-center mb-3";

    itemDiv.innerHTML = `
      <div class="flex-grow">
        <div class="font-semibold text-lg text-gray-800">${escapeHTML(item.name)}</div>
        <div class="text-sm text-gray-600">${(parseFloat(item.price) || 0).toFixed(2)} MAD each</div>
      </div>
      <div class="flex items-center space-x-3">
        <button 
          onclick="window.cartFunctions.changeQty(${index}, -1)" 
          class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 transition text-sm font-medium"
          aria-label="Decrease quantity of ${escapeHTML(item.name)}">
          -
        </button>
        <span class="font-medium w-8 text-center">${item.qty}</span>
        <button 
          onclick="window.cartFunctions.changeQty(${index}, 1)" 
          class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 transition text-sm font-medium"
          aria-label="Increase quantity of ${escapeHTML(item.name)}">
          +
        </button>
        <button 
          onclick="window.cartFunctions.removeItem(${index})" 
          class="text-red-500 hover:text-red-700 transition ml-4"
          aria-label="Remove ${escapeHTML(item.name)} from cart">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(itemDiv);
  });

  cartTotalEl.textContent = total.toFixed(2);
}

// Expose functions to global scope for onclick handlers
window.cartFunctions = {
  changeQty: (index, delta) => {
    if (cart[index]) {
      cart[index].qty += delta;
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCart();
      updateCartCountNav(); 
    }
  },
  removeItem: (index) => {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
    updateCartCountNav();
  }
};

function updateCartCountNav() {
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cartForCount.reduce((sum, i) => sum + i.qty, 0);
    const cartCountSpanDetails = document.getElementById('cart-count-details'); // In cart.html header
    if (cartCountSpanDetails) {
        cartCountSpanDetails.textContent = count;
    }
}

// Initial render
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        renderCart();
        updateCartCountNav();
    });
} else {
    renderCart();
    updateCartCountNav();
}


// Place Order
let isPlacingOrder = false;
const placeOrderBtn = document.getElementById("place-order");
const tableNumberInput = document.getElementById("table-number");

if (placeOrderBtn && tableNumberInput) {
    placeOrderBtn.addEventListener("click", async () => {
      if (isPlacingOrder) return;
      
      const tableNumber = tableNumberInput.value.trim();
      if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) <= 0) {
        alert("Please enter a valid table number.");
        return;
      }

      if (cart.length === 0) {
        alert("Your cart is empty. Please add items before placing an order.");
        return;
      }

      isPlacingOrder = true;
      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = "Placing Order..."; // Feedback

      const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0), 0);
      const orderData = {
        table: tableNumber,
        items: cart, 
        total: totalAmount,
        timestamp: new Date().toISOString(), // Client-side timestamp
        // timestamp: firebase.database.ServerValue.TIMESTAMP, // Alternative: Server-side timestamp
        status: "pending"
      };

      localStorage.setItem("lastOrderDataForConfirm", JSON.stringify(orderData)); // Store for confirm page
      localStorage.setItem("tableNumber", tableNumber); 

      try {
        console.log("cart.js: Writing to Firebase:", orderData);
        // 'db' is defined at the top of this file
        let newOrderRef = db.ref("orders").push(); // Get unique key first
        await newOrderRef.set(orderData); // Set data at that key
        console.log("cart.js: Order pushed with key:", newOrderRef.key);
        
        cart = []; 
        localStorage.removeItem("cart"); 
        
        window.location.href = `confirm.html?orderId=${newOrderRef.key}`; 
      } catch (error) {
        console.error("cart.js: Firebase error during order placement:", error);
        alert("There was a problem placing your order online. Please try again. Error: " + error.message);
      } finally {
        isPlacingOrder = false;
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order"; // Reset button text
        // Try to re-apply language in case this text was just added by JS
        if (typeof applyLanguage === 'function' && typeof currentLang !== 'undefined') {
            applyLanguage(currentLang);
        }
      }
    });
} else {
    console.error("Place order button or table number input not found.");
}

// Autofill table number if saved
const savedTable = localStorage.getItem("tableNumber");
if (savedTable && tableNumberInput) {
  tableNumberInput.value = savedTable;
}