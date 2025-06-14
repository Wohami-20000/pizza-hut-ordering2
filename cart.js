// cart.js

// Initialize Firebase database and auth objects for this script
const db = firebase.database();
const auth = firebase.auth();
console.log("cart.js: Firebase 'db' and 'auth' objects initialized."); 

// Load cart from localStorage or empty array
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// --- Global variables for message box ---
const messageBox = document.getElementById('custom-message-box'); 
const messageBoxTitle = document.getElementById('message-box-title'); 
const messageBoxText = document.getElementById('message-box-text'); 
const messageBoxOkBtn = document.getElementById('message-box-ok-btn'); 

let currentLang = localStorage.getItem('lang') || 'en';

function showMessageBox(titleKey, messageKey, isError = false) {
  let translatedTitle = (typeof translations !== 'undefined' && translations[currentLang]?.[titleKey]) || titleKey; 
  let translatedMessage = (typeof translations !== 'undefined' && translations[currentLang]?.[messageKey]) || messageKey; 
  let translatedOk = (typeof translations !== 'undefined' && translations[currentLang]?.message_box_ok) || "OK"; 

  messageBoxTitle.textContent = translatedTitle; 
  messageBoxText.textContent = translatedMessage; 
  messageBoxOkBtn.textContent = translatedOk; 

  if (isError) { 
    messageBoxTitle.classList.add('text-red-600'); 
    messageBoxOkBtn.classList.add('bg-red-600'); 
    messageBoxOkBtn.classList.remove('bg-gray-500'); 
  } else {
    messageBoxTitle.classList.remove('text-red-600'); 
    messageBoxOkBtn.classList.remove('bg-red-600'); 
  }

  messageBox.style.display = 'flex'; 
  messageBoxOkBtn.onclick = () => { 
    messageBox.style.display = 'none'; 
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
  const cartTotalEl = document.getElementById("cart-total"); 

  if (!container || !cartTotalEl) { 
    console.error("Cart HTML elements not found!"); 
    return;
  }

  container.innerHTML = ""; 

  cart = JSON.parse(localStorage.getItem("cart")) || []; 

  if (cart.length === 0) { 
    container.innerHTML = "<p data-translate='cart_empty' class='text-gray-600 text-center py-4'>Your cart is empty.</p>"; 
    cartTotalEl.textContent = "0.00"; 
    if (typeof applyLanguage === 'function' && typeof currentLang !== 'undefined') { 
        applyLanguage(currentLang); 
    }
    return;
  }

  let total = 0; 

  cart.forEach((item, index) => { 
    const itemQuantity = parseInt(item.quantity) || 0; 
    const itemPrice = parseFloat(item.price) || 0; 
    const itemTotalPrice = itemPrice * itemQuantity; 
    total += itemTotalPrice; 

    const itemDiv = document.createElement("div"); 
    itemDiv.className = "cart-item-card"; 

    itemDiv.innerHTML = `
      <div class="cart-item-image">
        <img src="${escapeHTML(item.image || 'https://via.placeholder.com/72x72?text=Item')}" alt="${escapeHTML(item.name || 'Cart Item')}">
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
  const stickyCartTotalEl = document.querySelector('.order-summary-bar-total #cart-total'); 
  if (stickyCartTotalEl) { 
    stickyCartTotalEl.textContent = total.toFixed(2); 
  }

  if (typeof applyLanguage === 'function') { 
    applyLanguage(currentLang, container); 
    applyLanguage(currentLang, document.querySelector('.order-summary-bar')); 
  }
}

// Expose functions to global scope for onclick handlers
window.cartFunctions = {
  changeQuantity: (index, delta) => { 
    if (cart[index]) { 
      cart[index].quantity += delta; 
      if (cart[index].quantity <= 0) { 
        cart.splice(index, 1); 
      }
      localStorage.setItem("cart", JSON.stringify(cart)); 
      renderCart(); 
      updateCartCountNav(); 
      updatePlaceOrderButtonState(); 
    }
  },
  removeItem: (index) => { 
    cart.splice(index, 1); 
    localStorage.setItem("cart", JSON.stringify(cart)); 
    renderCart(); 
    updateCartCountNav(); 
    updatePlaceOrderButtonState(); 
  }
};

function updateCartCountNav() { 
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || []; 
    const count = cartForCount.reduce((sum, i) => sum + i.quantity, 0); 
    const cartCountSpanDetails = document.getElementById('cart-count-details'); 
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

// Function to render the dynamic input field based on order type
async function renderOrderDetailsInput(user) { // user parameter added
    const orderDetailsInputDiv = document.getElementById('order-details-input'); 
    if (!orderDetailsInputDiv) {
        console.error("Order details input div not found!");
        return;
    }
    orderDetailsInputDiv.innerHTML = ''; // Clear previous content

    const orderType = localStorage.getItem('orderType') || null; 

    if (orderType === 'dineIn') { 
        const tableNumber = localStorage.getItem('tableNumber') || ''; 
        orderDetailsInputDiv.innerHTML = `
            <label id="table-label" for="table-number" class="block mb-2 font-semibold text-gray-700" data-translate="table_number_label">Table Number</label>
            <input type="number" id="table-number" class="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter your table number" inputmode="numeric" value="${escapeHTML(tableNumber)}" data-translate="table_number_placeholder" />
        `;
        const tableNumberInputEl = document.getElementById("table-number"); 
        if (tableNumber && tableNumberInputEl) { 
            tableNumberInputEl.value = tableNumber; 
        }

async function renderOrderDetailsInput(user) { // user parameter added
    const orderDetailsInputDiv = document.getElementById('order-details-input'); 
    if (!orderDetailsInputDiv) {
        console.error("Order details input div not found!");
        return;
    }
    orderDetailsInputDiv.innerHTML = ''; // Clear previous content

    const orderType = localStorage.getItem('orderType') || null; 

    if (orderType === 'dineIn') { 
        const tableNumber = localStorage.getItem('tableNumber') || ''; 
        orderDetailsInputDiv.innerHTML = `
            <label id="table-label" for="table-number" class="block mb-2 font-semibold text-gray-700" data-translate="table_number_label">Table Number</label>
            <input type="number" id="table-number" class="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter your table number" inputmode="numeric" value="${escapeHTML(tableNumber)}" data-translate="table_number_placeholder" />
        `;
        const tableNumberInputEl = document.getElementById("table-number"); 
        if (tableNumber && tableNumberInputEl) { 
            tableNumberInputEl.value = tableNumber; 
        }

    } else if (orderType === 'toGo' || orderType === 'delivery') { 
        if (!user) { // User must be logged in for toGo/delivery orders
            showMessageBox('validation_error_title', 'no_user_logged_in', true); 
            document.getElementById("place-order").disabled = true; 
        } else {
            const userProfileSnapshot = await db.ref('users/' + user.uid).once('value'); 
            const userProfile = userProfileSnapshot.val() || {}; 

            const customerName = userProfile.name ? userProfile.name.trim() : '';
            const customerPhone = userProfile.phone ? userProfile.phone.trim() : '';

            if (!customerName || customerName.toLowerCase() === 'customer' || !customerPhone) {
                showMessageBox('validation_error_title', 'profile_details_missing_error', true); 
                document.getElementById("place-order").disabled = true; 
            } else {
                let addressInputHtml = '';
                if (orderType === 'delivery') { 
                    addressInputHtml = `<label id="address-label" for="delivery-address" class="block mb-2 font-semibold text-gray-700" data-translate="delivery_address_label">Delivery Address</label>
                                        <input type="text" id="delivery-address" class="w-full border border-gray-300 rounded-lg p-3 text-lg" placeholder="Enter your delivery address" required value="${escapeHTML(userProfile.address || '')}"/>`; 
                }
                orderDetailsInputDiv.innerHTML = `
                    <label id="customer-name-label" for="customer-name" class="block mb-2 font-semibold text-gray-700" data-translate="customer_name_label">Customer Name</label>
                    <input type="text" id="customer-name" class="w-full border border-gray-300 rounded-lg p-3 text-lg mb-4" value="${escapeHTML(customerName)}" readonly />
                    <label id="customer-phone-label" for="customer-phone" class="block mb-2 font-semibold text-gray-700" data-translate="phone_number_label">Phone Number</label>
                    <input type="tel" id="customer-phone" class="w-full border border-gray-300 rounded-lg p-3 text-lg mb-4" value="${escapeHTML(customerPhone)}" readonly />
                    ${addressInputHtml}
                    <p class="text-center text-sm mt-4" data-translate="incorrect_info_prompt">Is your information incorrect? <a href="profile.html" class="text-blue-600 hover:underline" data-translate="edit_profile_link">Edit Profile</a></p>
                `;
            }
        }
    } else { // This 'else' correctly handles any other cases for orderType (including orderType === null)
        // If orderType is null (i.e. not set), it correctly redirects to order-type-selection.html
        if (orderType === null) {
            window.location.href = 'order-type-selection.html'; // Redirect if no orderType and not a dine-in bypass
        } else {
            // Handle unexpected or invalid orderType (e.g., localStorage corruption)
            showMessageBox('validation_error_title', 'order_type_missing_error', true); 
        }
        document.getElementById("place-order").disabled = true; 
    }

    if (typeof applyLanguage === 'function') {
        applyLanguage(currentLang, orderDetailsInputDiv);
    }
}


// Initial render and setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    currentLang = localStorage.getItem('lang') || 'en'; 
    
    renderCart(); 
    updateCartCountNav(); 
    updatePlaceOrderButtonState(); 

    const placeOrderBtn = document.getElementById("place-order"); 

    auth.onAuthStateChanged(async (user) => {
        await renderOrderDetailsInput(user); 

        if (placeOrderBtn) { 
            const oldClickListener = placeOrderBtn._currentClickListener; 
            if (oldClickListener) {
                placeOrderBtn.removeEventListener("click", oldClickListener);
            }

            // Define newClickListener, ensuring 'user' from onAuthStateChanged is directly used.
            const newClickListener = async () => {
                if (placeOrderBtn.disabled) return;
                
                let orderDetails = {};
                let validationError = false;

                let orderType = localStorage.getItem("orderType"); 

                if (orderType === 'dineIn') { 
                    const localTableNumberInput = document.getElementById('table-number'); 
                    const tableNumber = localTableNumberInput ? localTableNumberInput.value.trim() : '';
                    if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) <= 0) {
                        showMessageBox('validation_error_title', 'table_number_missing_error', true); 
                        validationError = true;
                    } else {
                        orderDetails.table = tableNumber;
                    }
                } else if (orderType === 'toGo' || orderType === 'delivery') { 
                    if (!user) { // Directly use 'user' from the outer onAuthStateChanged scope
                        showMessageBox('validation_error_title', 'no_user_logged_in', true); 
                        validationError = true;
                    } else {
                        const userProfileSnapshot = await db.ref('users/' + user.uid).once('value'); 
                        const userProfile = userProfileSnapshot.val() || {}; 

                        const customerName = userProfile.name ? userProfile.name.trim() : '';
                        const customerPhone = userProfile.phone ? userProfile.phone.trim() : '';

                        if (!customerName || customerName.toLowerCase() === 'customer' || !customerPhone) {
                            showMessageBox('validation_error_title', 'profile_details_missing_error', true); 
                            validationError = true;
                        } else {
                            orderDetails.userId = user.uid; // Assign UID from 'user'
                            orderDetails.customerName = customerName;
                            orderDetails.customerPhone = customerPhone;

                            if (orderType === 'delivery') { 
                                const deliveryAddressInput = document.getElementById('delivery-address');
                                const deliveryAddress = deliveryAddressInput ? deliveryAddressInput.value.trim() : '';
                                if (!deliveryAddress) {
                                    showMessageBox('validation_error_title', 'delivery_address_missing_error', true); 
                                    validationError = true;
                                } else {
                                    orderDetails.deliveryAddress = deliveryAddress;
                                }
                            }
                        }
                } else { // This 'else' handles cases where orderType is not set or unexpected.
                    // This case means orderType is null or invalid, or somehow was not set properly.
                    // If it reaches here and orderType is not null, it's an unexpected state.
                    if (orderType === null) {
                        window.location.href = 'order-type-selection.html'; // Redirect if no orderType and not a dine-in bypass
                    } else {
                        // Handle unexpected or invalid orderType (e.g., localStorage corruption)
                        showMessageBox('validation_error_title', 'order_type_missing_error', true); 
                    }
                    document.getElementById("place-order").disabled = true; 
                    return;
                }

                if (validationError) {
                  return;
                }

                if (cart.length === 0) { 
                  showMessageBox('validation_error_title', 'cart_empty_order_error', true); 
                  return;
                }

                placeOrderBtn.disabled = true; 
                placeOrderBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.placing_order_feedback) || "Placing Order..."; 

                const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0); 
                const orderData = {
                  orderType: orderType, 
                  ...orderDetails,     
                  items: cart, 
                  total: totalAmount, 
                  timestamp: new Date().toISOString(), 
                  status: "pending" 
                };

                // LOGGING FOR DEBUGGING WRITE OPERATIONS
                console.log("cart.js: Preparing order for Firebase write:", orderData);
                if (user) { // Use the 'user' variable from onAuthStateChanged
                    console.log("cart.js: Current authenticated user UID for write:", user.uid);
                } else {
                    console.warn("cart.js: No authenticated user found during order write for non-dineIn order (this should not happen if user validation passed).");
                }

                localStorage.setItem("lastOrderDataForConfirm", JSON.stringify(orderData)); 
                if (orderType === 'dineIn') { 
                    localStorage.setItem("tableNumber", orderDetails.table); 
                } else {
                    localStorage.removeItem("tableNumber"); 
                }

                try {
                    console.log("cart.js: Attempting to write order to Firebase with data:", orderData); 
                    let newOrderRef = db.ref("orders").push(); 
                    await newOrderRef.set(orderData); 
                    console.log("cart.js: Order pushed successfully with key:", newOrderRef.key); 
                    
                    localStorage.setItem("lastOrderId", newOrderRef.key); 
                    localStorage.removeItem("cart"); 
                    
                    window.location.href = `confirm.html?orderId=${newOrderRef.key}`; 
                } catch (error) {
                    console.error("cart.js: Firebase error during order placement (CAUGHT):", error); 
                    showMessageBox('order_error_title', `Order placement failed: ${error.message}`, true); 
                } finally {
                    placeOrderBtn.disabled = false; 
                    placeOrderBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.place_order_button) || "Place Order"; 
                    if (typeof applyLanguage === 'function') {
                        applyLanguage(currentLang);
                    }
                    updatePlaceOrderButtonState(); 
                }
            };
            placeOrderBtn.addEventListener("click", newClickListener);
            placeOrderBtn._currentClickListener = newClickListener; 
        } else {
            console.error("Place order button not found.");
        }
    });
});