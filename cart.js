// cart.js

// Initialize Firebase database and auth objects for this script
const db = firebase.database();
const auth = firebase.auth();
console.log("cart.js: Firebase 'db' and 'auth' objects initialized."); 

// Load cart and promo from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let appliedPromo = JSON.parse(localStorage.getItem("appliedPromo")) || null;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
const DELIVERY_FEE = 20.00; // Define a standard delivery fee

// --- Global variables for message box ---
const messageBox = document.getElementById('custom-message-box'); 
const messageBoxTitle = document.getElementById('message-box-title'); 
const messageBoxText = document.getElementById('message-box-text'); 
const messageBoxOkBtn = document.getElementById('message-box-ok-btn'); 

let currentLang = localStorage.getItem('lang') || 'en';

// --- IMPORTANT: Server-Side Validation ---
// In a production application, you should NEVER trust the prices sent from the client.
// The client can be manipulated. A secure application must have a backend (like Firebase Functions)
// to verify the price of each item in the cart before finalizing an order.
//
// Here's a conceptual example of how that would work in a Firebase Function:
//
// exports.placeOrder = functions.https.onCall(async (data, context) => {
//   const cart = data.cart;
//   const promoCode = data.promoCode;
//   const uid = context.auth.uid;
//
//   if (!uid) {
//     throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to place an order.');
//   }
//
//   let serverCalculatedSubtotal = 0;
//
//   // Loop through cart items sent from the client
//   for (const clientItem of cart) {
//     // Fetch the item's true price from the database
//     const itemRef = db.ref(`menu/${clientItem.categoryId}/items/${clientItem.id}`);
//     const snapshot = await itemRef.once('value');
//     const serverItem = snapshot.val();
//
//     if (!serverItem) {
//       throw new functions.https.HttpsError('not-found', `Item with ID ${clientItem.id} not found.`);
//     }
//
//     // Add the verified price to the server-calculated subtotal
//     serverCalculatedSubtotal += serverItem.price * clientItem.quantity;
//   }
//
//   // Now, calculate the final total with delivery fees and promo codes on the server
//   const finalTotal = calculateFinalTotal(serverCalculatedSubtotal, promoCode);
//
//   // If the server's total matches the client's, save the order to the database.
//   // Otherwise, reject the order.
//   // ...
// });
//
// The following code is for the client-side experience and does NOT include this
// critical server-side validation.

function showMessageBox(titleKey, messageKey, isError = false) {
  let translatedTitle = (typeof translations !== 'undefined' && translations[currentLang]?.[titleKey]) || titleKey; 
  let translatedMessage = (typeof translations !== 'undefined' && translations[currentLang]?.[messageKey]) || messageKey; 
  let translatedOk = (typeof translations !== 'undefined' && translations[currentLang]?.message_box_ok) || "OK"; 

  messageBoxTitle.textContent = translatedTitle; 
  messageBoxText.textContent = translatedMessage; 
  messageBoxOkBtn.textContent = translatedOk; 

  messageBoxOkBtn.onclick = () => { messageBox.style.display = 'none'; }; // Default close behavior

  if (isError) { 
    messageBoxTitle.classList.add('text-red-600'); 
    messageBoxOkBtn.classList.add('bg-red-600'); 
    messageBoxOkBtn.classList.remove('bg-gray-500'); 
  } else {
    messageBoxTitle.classList.remove('text-red-600'); 
    messageBoxOkBtn.classList.remove('bg-red-600'); 
  }

  messageBox.style.display = 'flex'; 
}

// Message box with a redirecting OK button
function showRedirectMessageBox(titleKey, messageKey, redirectUrl) {
    showMessageBox(titleKey, messageKey, true);
    messageBoxOkBtn.onclick = () => {
        window.location.href = redirectUrl;
    };
}


function escapeHTML(str) { 
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : ''; 
  return String(str).replace(/[<>&"']/g, s => ({ 
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}


function updateTotalsUI() {
    const summarySubtotalEl = document.getElementById('summary-subtotal');
    const deliveryRowEl = document.getElementById('delivery-row');
    const deliveryAmountEl = document.getElementById('delivery-amount');
    const discountRowEl = document.getElementById('discount-row');
    const discountCodeDisplayEl = document.getElementById('discount-code-display');
    const discountAmountEl = document.getElementById('discount-amount');
    const summaryTotalEl = document.getElementById('summary-total');
    const cartTotalEl = document.getElementById("cart-total");

    const orderType = localStorage.getItem('orderType');
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);
    let total = subtotal;
    let currentDeliveryFee = 0;

    if (orderType === 'delivery') {
        if (appliedPromo && appliedPromo.discountType === 'free_delivery') {
            currentDeliveryFee = 0;
            discountRowEl.classList.remove('hidden');
            discountCodeDisplayEl.textContent = appliedPromo.code;
            discountAmountEl.textContent = `${DELIVERY_FEE.toFixed(2)}`;
        } else {
            currentDeliveryFee = DELIVERY_FEE;
        }
        deliveryRowEl.classList.remove('hidden');
        deliveryAmountEl.textContent = `${currentDeliveryFee.toFixed(2)} MAD`;
        total += currentDeliveryFee;
    } else {
        deliveryRowEl.classList.add('hidden');
    }

    if (appliedPromo && appliedPromo.discountType !== 'free_delivery' && subtotal > 0) {
        let discount = 0;
        if (appliedPromo.discountType === 'percentage') {
            discount = subtotal * (appliedPromo.discountValue / 100);
        } else if (appliedPromo.discountType === 'fixed') {
            discount = appliedPromo.discountValue;
        }
        
        discountRowEl.classList.remove('hidden');
        discountCodeDisplayEl.textContent = appliedPromo.code;
        discountAmountEl.textContent = discount.toFixed(2);
        total -= discount;
    } else if (!appliedPromo || appliedPromo.discountType === 'free_delivery') {
         if (!appliedPromo || appliedPromo.discountType !== 'free_delivery'){
            discountRowEl.classList.add('hidden');
         }
    }
    
    total = Math.max(0, total);

    summarySubtotalEl.textContent = `${subtotal.toFixed(2)} MAD`;
    summaryTotalEl.textContent = `${total.toFixed(2)} MAD`;
    cartTotalEl.textContent = total.toFixed(2);
}


function renderCart() { 
  const container = document.getElementById("cart-items"); 
  const summaryBar = document.getElementById('order-summary-bar');

  if (!container) { 
    console.error("Cart HTML elements not found!"); 
    return;
  }

  container.innerHTML = ""; 
  cart = JSON.parse(localStorage.getItem("cart")) || []; 

  if (cart.length === 0) { 
    container.innerHTML = "<p data-translate='cart_empty' class='text-gray-500 text-center py-8'>Your cart is empty. Let's add something tasty!</p>"; 
    summaryBar.classList.remove('visible');
  } else {
     summaryBar.classList.add('visible');
  }

  cart.forEach((item, index) => { 
    const itemQuantity = parseInt(item.quantity) || 0; 
    const itemPrice = parseFloat(item.price) || 0; 
    
    const itemDiv = document.createElement("div"); 
    itemDiv.className = "cart-item-card"; 
    
    itemDiv.innerHTML = `
      <div class="cart-item-image">
        <img src="${escapeHTML(item.image || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Cart Item')}">
      </div>
      <div class="cart-item-details">
        <div class="flex items-center">
            <div class="cart-item-name">${escapeHTML(item.name)}</div>
            ${item.categoryId && item.id ? `<a href="item-details.html?categoryId=${item.categoryId}&itemId=${item.id}" class="edit-item-btn" aria-label="Edit ${escapeHTML(item.name)}"><i class="fas fa-pencil-alt"></i></a>` : ''}
        </div>
        <div class="cart-item-price-each">${itemPrice.toFixed(2)} <span class="font-semibold">MAD</span></div>
      </div>
      <div class="cart-item-controls">
        <button 
          onclick="window.cartFunctions.changeQuantity(${index}, -1)" 
          class="quantity-btn"
          aria-label="Decrease quantity of ${escapeHTML(item.name)}">
          -
        </button>
        <span class="font-bold text-lg w-6 text-center">${itemQuantity}</span>
        <button 
          onclick="window.cartFunctions.changeQuantity(${index}, 1)" 
          class="quantity-btn"
          aria-label="Increase quantity of ${escapeHTML(item.name)}">
          +
        </button>
      </div>
      <button 
          onclick="window.cartFunctions.removeItem(${index})" 
          class="remove-item-btn"
          aria-label="Remove ${escapeHTML(item.name)} from cart">
          <i class="fas fa-times-circle text-xl"></i>
        </button>
    `;
    container.appendChild(itemDiv); 
  });
  
  updateTotalsUI();

  if (typeof applyLanguage === 'function') { 
    applyLanguage(currentLang, document.body); 
  }
}

window.cartFunctions = {
  changeQuantity: (index, delta) => { 
    if (cart[index]) { 
      cart[index].quantity += delta; 
      if (cart[index].quantity <= 0) { 
        cart.splice(index, 1); 
      }
      localStorage.setItem("cart", JSON.stringify(cart)); 
      renderCart(); 
      renderSuggestions();
      updateCartCountNav(); 
      updatePlaceOrderButtonState(); 
    }
  },
  removeItem: (index) => { 
    cart.splice(index, 1); 
    localStorage.setItem("cart", JSON.stringify(cart)); 
    renderCart(); 
    renderSuggestions();
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

function updatePlaceOrderButtonState() { 
  const placeOrderBtn = document.getElementById("place-order"); 
  if (placeOrderBtn) { 
    const cartIsEmpty = cart.length === 0;
    placeOrderBtn.disabled = cartIsEmpty; 
  }
}

function updateOrderTypeSelectionUI() {
    const orderType = localStorage.getItem('orderType');
    const buttons = document.querySelectorAll('.order-type-button');
    buttons.forEach(button => {
        button.classList.remove('selected');
        if (button.dataset.value === orderType) {
            button.classList.add('selected');
        }
    });
}

async function renderOrderDetailsInput(user) {
    const orderDetailsInputDiv = document.getElementById('order-details-input'); 
    if (!orderDetailsInputDiv) return;

    orderDetailsInputDiv.innerHTML = '';
    const orderType = localStorage.getItem('orderType') || 'dineIn';
    updateOrderTypeSelectionUI();
    updateTotalsUI();

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

    } else if (orderType === 'pickup' || orderType === 'delivery') {
        if (!user || user.isAnonymous) {
            window.location.href = 'auth.html';
            return;
        }

        const userProfileSnapshot = await db.ref('users/' + user.uid).once('value'); 
        const userProfile = userProfileSnapshot.val() || {}; 
        const customerName = userProfile.name ? userProfile.name.trim() : '';
        const customerPhone = userProfile.phone ? userProfile.phone.trim() : '';

        let pickupOptionsHtml = '';
        if (orderType === 'pickup') {
            pickupOptionsHtml = `
                <div class="mt-6 border-t pt-4">
                    <label class="block font-semibold text-gray-700 mb-2" data-translate="pickup_time_label">Pickup Time</label>
                    <div class="flex items-center space-x-6">
                        <label class="flex items-center cursor-pointer"><input type="radio" name="pickupTimeOption" value="asap" class="form-radio h-5 w-5 text-red-600" checked><span class="ml-2 text-gray-700" data-translate="pickup_time_asap">ASAP</span></label>
                        <label class="flex items-center cursor-pointer"><input type="radio" name="pickupTimeOption" value="schedule" class="form-radio h-5 w-5 text-red-600"><span class="ml-2 text-gray-700" data-translate="pickup_time_schedule">Schedule</span></label>
                    </div>
                    <div id="schedule-time-div" class="mt-3 hidden">
                         <label for="pickup-time" class="block text-sm font-medium text-gray-600 mb-1" data-translate="pickup_time_select">Select a time:</label>
                         <input type="time" id="pickup-time" name="pickup-time" class="w-full border border-gray-300 rounded-lg p-2 text-lg focus:ring-2 focus:ring-red-500">
                    </div>
                </div>
            `;
        }

        let addressInputHtml = '';
        if (orderType === 'delivery') { 
            addressInputHtml = `
                <div>
                    <label id="address-label" for="delivery-address" class="block mb-2 font-semibold text-gray-700" data-translate="delivery_address_label">Delivery Address</label>
                    <input type="text" id="delivery-address" class="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-red-500" placeholder="Enter your delivery address" required value="${escapeHTML(userProfile.address || '')}"/>
                </div>
                <div class="mt-4">
                    <label for="delivery-instructions" class="block mb-2 font-semibold text-gray-700" data-translate="delivery_instructions_label">Delivery Instructions (Optional)</label>
                    <textarea id="delivery-instructions" rows="2" class="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-red-500" placeholder="e.g. Leave at front door, call upon arrival..."></textarea>
                </div>
            `;
        }
        
        orderDetailsInputDiv.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label id="customer-name-label" for="customer-name" class="block mb-2 font-semibold text-gray-700" data-translate="customer_name_label">Your Name</label>
                    <input type="text" id="customer-name" class="w-full border bg-gray-100 border-gray-300 rounded-lg p-3 text-lg" value="${escapeHTML(customerName)}" readonly />
                </div>
                <div>
                    <label id="customer-phone-label" for="customer-phone" class="block mb-2 font-semibold text-gray-700" data-translate="phone_number_label">Your Phone</label>
                    <input type="tel" id="customer-phone" class="w-full border bg-gray-100 border-gray-300 rounded-lg p-3 text-lg" value="${escapeHTML(customerPhone)}" readonly />
                </div>
                ${addressInputHtml}
            </div>
            ${pickupOptionsHtml}
            <p class="text-center text-sm mt-6" data-translate="incorrect_info_prompt">Is your information incorrect? <a href="profile.html" class="text-blue-600 hover:underline font-semibold" data-translate="edit_profile_link">Edit Profile</a></p>
        `;

        if (orderType === 'pickup') {
            const pickupRadios = document.querySelectorAll('input[name="pickupTimeOption"]');
            const scheduleDiv = document.getElementById('schedule-time-div');
            pickupRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.value === 'schedule') {
                        scheduleDiv.classList.remove('hidden');
                    } else {
                        scheduleDiv.classList.add('hidden');
                    }
                });
            });
        }
    } else if (!orderType) { 
        showRedirectMessageBox('Validation Error', 'Order type is not set. Please select how you want to order.', 'order-type-selection.html');
        document.getElementById("place-order").disabled = true; 
    }

    if (typeof applyLanguage === 'function') {
        applyLanguage(currentLang, orderDetailsInputDiv);
    }
}


function handlePromoCode() {
    const promoInput = document.getElementById('promo-code-input');
    const applyBtn = document.getElementById('apply-promo-btn');
    const promoMessageEl = document.getElementById('promo-message');

    if (appliedPromo) {
        promoInput.value = appliedPromo.code;
        promoInput.disabled = true;
        applyBtn.textContent = 'Remove';
        applyBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        applyBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
        promoMessageEl.textContent = `"${appliedPromo.name}" applied!`;
        promoMessageEl.className = 'text-sm mt-2 font-semibold success';
    }

    applyBtn.addEventListener('click', async () => {
        if (appliedPromo) {
            appliedPromo = null;
            localStorage.removeItem('appliedPromo');
            promoInput.value = '';
            promoInput.disabled = false;
            applyBtn.textContent = 'Apply';
            applyBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            applyBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
            promoMessageEl.textContent = 'Promo code removed.';
            promoMessageEl.className = 'text-sm mt-2 font-semibold';
            updateTotalsUI();
            return;
        }

        const codeToApply = promoInput.value.trim().toUpperCase();
        if (!codeToApply) {
            promoMessageEl.textContent = 'Please enter a promo code.';
            promoMessageEl.className = 'text-sm mt-2 font-semibold error';
            return;
        }

        const promoCodesRef = db.ref('promoCodes');
        const snapshot = await promoCodesRef.once('value');
        const promoCodesData = snapshot.val();
        
        let foundOffer = null;
        if (promoCodesData) {
            for (const offerId in promoCodesData) {
                const offer = promoCodesData[offerId];
                if (offer.code && offer.code.toUpperCase() === codeToApply) {
                    foundOffer = offer;
                    break;
                }
            }
        }

        if (foundOffer) {
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            if (foundOffer.minOrderValue && subtotal < foundOffer.minOrderValue) {
                promoMessageEl.textContent = `This code requires a minimum order of ${foundOffer.minOrderValue} MAD.`;
                promoMessageEl.className = 'text-sm mt-2 font-semibold error';
                return;
            }
            
            if (foundOffer.discountType === 'free_delivery' && localStorage.getItem('orderType') !== 'delivery') {
                promoMessageEl.textContent = 'This code is only valid for delivery orders.';
                promoMessageEl.className = 'text-sm mt-2 font-semibold error';
                return;
            }

            appliedPromo = foundOffer;
            localStorage.setItem('appliedPromo', JSON.stringify(appliedPromo));
            updateTotalsUI(); 
            
            promoInput.disabled = true;
            applyBtn.textContent = 'Remove';
            applyBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            applyBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
            promoMessageEl.textContent = `Success! "${foundOffer.name}" applied.`;
            promoMessageEl.className = 'text-sm mt-2 font-semibold success';
        } else {
            promoMessageEl.textContent = 'This promo code is not valid.';
            promoMessageEl.className = 'text-sm mt-2 font-semibold error';
            appliedPromo = null;
            localStorage.removeItem('appliedPromo');
            updateTotalsUI();
        }
    });
}

function createSuggestionCard(item, categoryId, itemId) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.id = `suggestion-card-${itemId}`;
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const totalQuantityInCart = cart.filter(ci => ci.id === itemId).reduce((sum, ci) => sum + ci.quantity, 0);
    const isFavorite = favorites.includes(itemId);
    
    card.innerHTML = `
        <div class="item-content-left flex flex-col">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-bold text-gray-800 pr-2">${escapeHTML(item.name || 'Unknown Item')}</h3>
                <i class="fas fa-heart fav-icon text-xl ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); window.cartFunctions.toggleFavorite('${itemId}', this)"></i>
            </div>
            <p class="text-gray-500 text-sm mt-1 mb-3 flex-grow">${escapeHTML(item.description || '')}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="text-xl font-extrabold text-gray-900">${itemPrice.toFixed(2)} MAD</span>
                <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="customize-btn font-semibold">Customize</a>
            </div>
        </div>
        <div class="item-image-right flex flex-col items-center justify-between">
            <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}">
            <div class="quantity-controls flex items-center gap-3 mt-2">
                <button class="quantity-btn" onclick="event.stopPropagation(); window.cartFunctions.updateSuggestionItemQuantity('${itemId}', -1, '${categoryId}')">-</button>
                <span class="font-bold text-lg w-8 text-center">${totalQuantityInCart}</span>
                <button class="quantity-btn" onclick="event.stopPropagation(); window.cartFunctions.updateSuggestionItemQuantity('${itemId}', 1, '${categoryId}')">+</button>
            </div>
        </div>
    `;
    return card;
}

async function renderSuggestions() {
    const container = document.getElementById('suggestion-section');
    if (!container) return;

    try {
        const menuSnapshot = await db.ref('menu').once('value');
        const menuData = menuSnapshot.val();
        if (!menuData) {
            container.classList.add('hidden');
            return;
        }

        const cartItemIds = cart.map(item => item.id);
        let potentialItems = [];

        for (const categoryId in menuData) {
            const category = menuData[categoryId];
            if (category.items) {
                for (const itemId in category.items) {
                    const item = category.items[itemId];
                    if (item.price < 30 && !cartItemIds.includes(itemId)) {
                        potentialItems.push({ ...item, id: itemId, categoryId: categoryId });
                    }
                }
            }
        }

        const suggestions = potentialItems.sort(() => 0.5 - Math.random()).slice(0, 3);

        container.innerHTML = ''; 
        if (suggestions.length > 0) {
            const title = document.createElement('h2');
            title.className = 'text-2xl font-bold mb-4 text-gray-800';
            title.textContent = 'You might also like';
            container.appendChild(title);
            
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'space-y-4';
            suggestions.forEach(item => {
                const card = createSuggestionCard(item, item.categoryId, item.id);
                itemsContainer.appendChild(card);
            });
            container.appendChild(itemsContainer);
        }

    } catch (error) {
        console.error("Could not render suggestions:", error);
        container.classList.add('hidden');
    }
}

Object.assign(window.cartFunctions, {
    toggleFavorite: (itemId, heartIconEl) => {
        heartIconEl.classList.toggle('active');
        favorites = favorites.includes(itemId) ? favorites.filter(id => id !== itemId) : [...favorites, itemId];
        localStorage.setItem("favorites", JSON.stringify(favorites));
    },
    updateSuggestionItemQuantity: async (itemId, change, categoryId) => {
        const menuSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
        const itemData = menuSnapshot.val();
        if (!itemData) return;

        let itemInCart = cart.find(i => i.id === itemId && !i.options);
        if (change > 0) {
            if (itemInCart) {
                itemInCart.quantity++;
            } else {
                cart.push({
                    cartItemId: itemId + '-standard',
                    id: itemId,
                    name: itemData.name,
                    price: itemData.price,
                    quantity: 1,
                    categoryId: categoryId,
                    image: itemData.image_url
                });
            }
        } else if (itemInCart) {
            itemInCart.quantity--;
            if (itemInCart.quantity <= 0) {
                cart = cart.filter(i => i.id !== itemId);
            }
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
        renderSuggestions();
        updateCartCountNav();
        updatePlaceOrderButtonState();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    currentLang = localStorage.getItem('lang') || 'en'; 
    
    renderCart(); 
    updateCartCountNav(); 
    updatePlaceOrderButtonState();
    handlePromoCode(); 
    renderSuggestions();

    const orderTypeButtons = document.querySelectorAll('.order-type-button');
    orderTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newOrderType = button.dataset.value;
            const user = auth.currentUser;

            if (user && user.isAnonymous && (newOrderType === 'pickup' || newOrderType === 'delivery')) {
                showRedirectMessageBox('Login Required', 'Pickup and Delivery orders require an account. Please log in or create an account to continue.', 'auth.html');
                return;
            }

            localStorage.setItem('orderType', newOrderType);
            
            if (newOrderType !== 'delivery' && appliedPromo && appliedPromo.discountType === 'free_delivery') {
                appliedPromo = null;
                localStorage.removeItem('appliedPromo');
                 document.getElementById('promo-code-input').value = '';
                 document.getElementById('promo-code-input').disabled = false;
                 document.getElementById('apply-promo-btn').textContent = 'Apply';
                 document.getElementById('promo-message').textContent = '';
            }
            renderOrderDetailsInput(user);
        });
    });

    const placeOrderBtn = document.getElementById("place-order"); 

    auth.onAuthStateChanged(async (user) => {
        const dineInOption = document.getElementById('dineInOption');
        const pickupOption = document.getElementById('pickupOption');
        const deliveryOption = document.getElementById('deliveryOption');
        let orderType = localStorage.getItem('orderType');

        if (user && user.isAnonymous) {
            pickupOption.disabled = true;
            pickupOption.classList.add('disabled');
            deliveryOption.disabled = true;
            deliveryOption.classList.add('disabled');
            
            if (orderType === 'pickup' || orderType === 'delivery') {
                localStorage.setItem('orderType', 'dineIn');
            }
        } else {
            pickupOption.disabled = false;
            pickupOption.classList.remove('disabled');
            deliveryOption.disabled = false;
            deliveryOption.classList.remove('disabled');
        }


        await renderOrderDetailsInput(user); 
        updatePlaceOrderButtonState(); 

        if (placeOrderBtn) { 
            const oldClickListener = placeOrderBtn._currentClickListener; 
            if (oldClickListener) {
                placeOrderBtn.removeEventListener("click", oldClickListener);
            }

            const newClickListener = async () => {
                if (placeOrderBtn.disabled) return;
                
                let orderDetails = {};
                let validationError = false;

                let currentOrderType = localStorage.getItem("orderType"); 

                if (currentOrderType === 'dineIn') { 
                    const localTableNumberInput = document.getElementById('table-number'); 
                    const tableNumber = localTableNumberInput ? localTableNumberInput.value.trim() : '';
                    if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) <= 0) {
                        showMessageBox('validation_error_title', 'table_number_missing_error', true); 
                        validationError = true;
                    } else {
                        orderDetails.table = tableNumber;
                    }
                } else if (currentOrderType === 'pickup' || currentOrderType === 'delivery') {
                    if (!user || user.isAnonymous) { 
                        showRedirectMessageBox('Login Required', 'You must be logged in to place this type of order.', 'auth.html');
                        validationError = true;
                    } else {
                        const userProfileSnapshot = await db.ref('users/' + user.uid).once('value'); 
                        const userProfile = userProfileSnapshot.val() || {}; 

                        orderDetails.userId = user.uid;
                        orderDetails.customerName = userProfile.name || '';
                        orderDetails.customerPhone = userProfile.phone || '';

                        if (currentOrderType === 'delivery') { 
                            const deliveryAddressInput = document.getElementById('delivery-address');
                            const deliveryAddress = deliveryAddressInput ? deliveryAddressInput.value.trim() : '';
                            if (!deliveryAddress) {
                                showMessageBox('validation_error_title', 'delivery_address_missing_error', true); 
                                validationError = true;
                            } else {
                                orderDetails.deliveryAddress = deliveryAddress;
                            }

                            const deliveryInstructionsInput = document.getElementById('delivery-instructions');
                            if (deliveryInstructionsInput) {
                                orderDetails.deliveryInstructions = deliveryInstructionsInput.value.trim();
                            }
                        }

                        if (currentOrderType === 'pickup') {
                             const pickupTimeOption = document.querySelector('input[name="pickupTimeOption"]:checked');
                             if(pickupTimeOption){
                                const selectedValue = pickupTimeOption.value;
                                if (selectedValue === 'schedule') {
                                    const scheduledTime = document.getElementById('pickup-time').value;
                                    if (!scheduledTime) {
                                        showMessageBox('validation_error_title', 'pickup_time_missing_error', true); 
                                        validationError = true;
                                    } else {
                                        orderDetails.pickupTime = scheduledTime;
                                    }
                                } else {
                                    orderDetails.pickupTime = 'ASAP';
                                }
                             } else {
                                 showMessageBox('validation_error_title', 'pickup_time_missing_error', true); 
                                 validationError = true;
                             }
                        }
                    }
                } else { 
                    showMessageBox('validation_error_title', 'order_type_missing_error', true);
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

                const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                let finalTotal = subtotal;
                let currentDeliveryFee = 0;
                
                const orderData = {
                  orderType: currentOrderType, 
                  ...orderDetails,     
                  cart: cart,
                  subtotal: subtotal,
                  timestamp: new Date().toISOString(), 
                  status: "pending" 
                };

                if (currentOrderType === 'delivery') {
                    currentDeliveryFee = (appliedPromo && appliedPromo.discountType === 'free_delivery') ? 0 : DELIVERY_FEE;
                    orderData.deliveryFee = currentDeliveryFee;
                    finalTotal += currentDeliveryFee;
                }

                if (appliedPromo) {
                    let discountAmount = 0;
                    if (appliedPromo.discountType === 'percentage') {
                        discountAmount = subtotal * (appliedPromo.discountValue / 100);
                    } else if (appliedPromo.discountType === 'fixed') {
                        discountAmount = appliedPromo.discountValue;
                    }
                    
                    if(appliedPromo.discountType !== 'free_delivery'){
                         finalTotal -= discountAmount;
                    }
                    
                    orderData.promoApplied = {
                        code: appliedPromo.code,
                        name: appliedPromo.name,
                        discountType: appliedPromo.discountType,
                        discountValue: appliedPromo.discountValue,
                        appliedDiscount: appliedPromo.discountType === 'free_delivery' ? DELIVERY_FEE : discountAmount
                    };
                }
                
                orderData.totalPrice = Math.max(0, finalTotal);
                
                if(user && !user.isAnonymous) {
                    orderData.userId = user.uid;
                }

                if (currentOrderType === 'dineIn') { 
                    localStorage.setItem("tableNumber", orderDetails.table); 
                }

                try {
                    let newOrderRef = db.ref("orders").push(); 
                    await newOrderRef.set(orderData); 
                    
                    if (orderData.userId) {
                       await db.ref(`users/${orderData.userId}/orders/${newOrderRef.key}`).set(true);
                    }
                    
                    localStorage.setItem("lastOrderId", newOrderRef.key); 
                    localStorage.removeItem("cart"); 
                    localStorage.removeItem("appliedPromo");
                    
                    window.location.href = `confirm.html?orderId=${newOrderRef.key}`; 
                } catch (error) {
                    console.error("cart.js: Firebase error during order placement:", error); 
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