// cart.js

// Initialize Firebase database object for this script
// This line assumes firebase.js (with firebase.initializeApp) has already been loaded and executed.
const db = firebase.database(); 
console.log("cart.js: Firebase 'db' object initialized.");

// Load cart from localStorage or empty array
// IMPORTANT: Ensure 'quantity' is used consistently, not 'qty'
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// --- Global variables for message box ---
const messageBox = document.getElementById('custom-message-box');
const messageBoxTitle = document.getElementById('message-box-title');
const messageBoxText = document.getElementById('message-box-text');
const messageBoxOkBtn = document.getElementById('message-box-ok-btn');

function showMessageBox(titleKey, messageKey, isError = false) {
  let translatedTitle = (typeof translations !== 'undefined' && translations[currentLang]?.[titleKey]) || titleKey;
  let translatedMessage = (typeof translations !== 'undefined' && translations[currentLang]?.[messageKey]) || messageKey;
  let translatedOk = (typeof translations !== 'undefined' && translations[currentLang]?.message_box_ok) || "OK";

  messageBoxTitle.textContent = translatedTitle;
  messageBoxText.textContent = translatedMessage;
  messageBoxOkBtn.textContent = translatedOk;

  // Apply error styling if needed
  if (isError) {
    messageBoxTitle.classList.add('text-red-600');
    messageBoxOkBtn.classList.add('bg-red-600');
    messageBoxOkBtn.classList.remove('bg-gray-500'); // Remove default non-error color if any
  } else {
    messageBoxTitle.classList.remove('text-red-600');
    messageBoxOkBtn.classList.remove('bg-red-600');
    // messageBoxOkBtn.classList.add('bg-gray-500'); // Re-add default if it was removed
  }

  messageBox.style.display = 'flex'; // Show the modal
  messageBoxOkBtn.onclick = () => {
    messageBox.style.display = 'none'; // Hide the modal on OK
  };
}


function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return String(str).replace(/[<>&"']/g, s => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total"); // For sticky footer total

  if (!container || !cartTotalEl) {
    console.error("Cart HTML elements not found!");
    return;
  }

  container.innerHTML = ""; // Clear previous items

  // Re-load cart here to ensure it's up-to-date with localStorage
  // This is crucial if changes happen on menu page and user navigates back
  cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    container.innerHTML = "<p data-translate='cart_empty' class='text-gray-600 text-center py-4'>Your cart is empty.</p>";
    cartTotalEl.textContent = "0.00";
    // Apply language after setting content for empty cart message
    if (typeof applyLanguage === 'function' && typeof currentLang !== 'undefined') {
        applyLanguage(currentLang);
    }
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    // FIX: Use item.quantity consistently
    const itemQuantity = parseInt(item.quantity) || 0;
    const itemPrice = parseFloat(item.price) || 0;
    const itemTotalPrice = itemPrice * itemQuantity;
    total += itemTotalPrice;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item-card"; // Apply Glovo-like card styling

    itemDiv.innerHTML = `
      <div class="cart-item-image">
        <img src="${escapeHTML(item.image_url || 'https://via.placeholder.com/72x72?text=Item')}" alt="${escapeHTML(item.name || 'Cart Item')}">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${escapeHTML(item.name)}</div>
        <div class="cart-item-price-each">${itemPrice.toFixed(2)} <span class="font-semibold">MAD each</span></div>
      </div>
      <div class="cart-item-controls">
        <button 
          onclick="window.cartFunctions.changeQuantity(${index}, -1)" 
          class="quantity-btn"
          aria-label="Decrease quantity of ${escapeHTML(item.name)}">
          -
        </button>
        <span class="font-medium w-6 text-center">${itemQuantity}</span>
        <button 
          onclick="window.cartFunctions.changeQuantity(${index}, 1)" 
          class="quantity-btn"
          aria-label="Increase quantity of ${escapeHTML(item.name)}">
          +
        </button>
        <button 
          onclick="window.cartFunctions.removeItem(${index})" 
          class="remove-item-btn"
          aria-label="Remove ${escapeHTML(item.name)} from cart">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(itemDiv);
  });

  cartTotalEl.textContent = total.toFixed(2);
  // Ensure the total in the sticky footer also updates if it's separate
  const stickyCartTotalEl = document.querySelector('.order-summary-bar-total #cart-total');
  if (stickyCartTotalEl) {
    stickyCartTotalEl.textContent = total.toFixed(2);
  }

  // After rendering, ensure translations are applied to any new elements
  if (typeof applyLanguage === 'function') {
    applyLanguage(currentLang, container);
    applyLanguage(currentLang, document.querySelector('.order-summary-bar')); // Apply to sticky footer
  }
}

// Expose functions to global scope for onclick handlers
window.cartFunctions = {
  changeQuantity: (index, delta) => { // FIX: Renamed from changeQty
    if (cart[index]) {
      cart[index].quantity += delta; // FIX: Use item.quantity
      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCart(); // Re-render the cart display
      updateCartCountNav(); // Update header cart count
      updatePlaceOrderButtonState(); // Update button state
    }
  },
  removeItem: (index) => {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart(); // Re-render the cart display
    updateCartCountNav(); // Update header cart count
    updatePlaceOrderButtonState(); // Update button state
  }
};

function updateCartCountNav() {
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cartForCount.reduce((sum, i) => sum + i.quantity, 0); // FIX: Use item.quantity
    const cartCountSpanDetails = document.getElementById('cart-count-details'); // In cart.html header
    if (cartCountSpanDetails) {
        cartCountSpanDetails.textContent = count;
    }
}

// Function to update the "Place Order" button state (enabled/disabled)
function updatePlaceOrderButtonState() {
  const placeOrderBtn = document.getElementById("place-order");
  if (placeOrderBtn) {
    placeOrderBtn.disabled = cart.length === 0;
  }
}


// Initial render and setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('lang') || 'en'; // Ensure currentLang is available
    renderCart();
    updateCartCountNav();
    updatePlaceOrderButtonState(); // Set initial state of place order button

    // Place Order button event listener
    const placeOrderBtn = document.getElementById("place-order");
    const tableNumberInput = document.getElementById("table-number");
    const messageContainer = document.getElementById('message-container');
    const messageText = document.getElementById('message-text');

    if (placeOrderBtn && tableNumberInput) {
        placeOrderBtn.addEventListener("click", async () => {
          if (placeOrderBtn.disabled) return; // Prevent double clicks or disabled clicks
          
          const tableNumber = tableNumberInput.value.trim();
          if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) <= 0) {
            showMessageBox('validation_error_title', 'table_number_missing_error', true); // Use custom message box
            return;
          }

          if (cart.length === 0) {
            showMessageBox('validation_error_title', 'cart_empty_order_error', true); // Use custom message box
            return;
          }

          placeOrderBtn.disabled = true;
          placeOrderBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.placing_order_feedback) || "Placing Order...";

          const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0); // FIX: Use item.quantity
          const orderData = {
            table: tableNumber,
            items: cart, 
            total: totalAmount,
            timestamp: new Date().toISOString(), 
            status: "pending"
          };

          localStorage.setItem("lastOrderDataForConfirm", JSON.stringify(orderData)); 
          localStorage.setItem("tableNumber", tableNumber); 

          try {
            console.log("cart.js: Writing to Firebase:", orderData);
            let newOrderRef = db.ref("orders").push(); 
            await newOrderRef.set(orderData); 
            console.log("cart.js: Order pushed with key:", newOrderRef.key);
            
            // Save the order ID to localStorage for the "My Orders" link on the menu page
            localStorage.setItem("lastOrderId", newOrderRef.key); // <--- ADDED LINE

            cart = []; 
            localStorage.removeItem("cart"); 
            
            window.location.href = `confirm.html?orderId=${newOrderRef.key}`; 
          } catch (error) {
            console.error("cart.js: Firebase error during order placement:", error);
            showMessageBox('order_error_title', 'order_placement_error_message', true); // Use custom message box
          } finally {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.place_order_button) || "Place Order";
            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang); // Re-apply language in case button text was added by JS
            }
            updatePlaceOrderButtonState(); // Re-evaluate state after order attempt
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

    // Language switcher event (already in inline script, but just in case for consistency)
    // The inline script already handles this.
});