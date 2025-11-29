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
const TAX_RATE = 0.20; // 20% VAT/TVA, as an example

// --- Global variables for message box ---
const messageBox = document.getElementById('custom-message-box');
const messageBoxTitle = document.getElementById('message-box-title');
const messageBoxText = document.getElementById('message-box-text');
const messageBoxOkBtn = document.getElementById('message-box-ok-btn');

let currentLang = localStorage.getItem('lang') || 'en';
let phoneInputInstance;

// --- NEW HELPER FUNCTIONS ---

/**
 * Generates a random, 6-character alphanumeric ID for an order.
 * @returns {string} A 6-character ID (e.g., "A4T9B1").
 */
function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Gets the next sequential order number for the current day.
 * Uses a Firebase Transaction to ensure atomicity and prevent race conditions.
 * Resets to 1 every new day.
 * @returns {Promise<number|null>} The next order number, or null if the transaction fails.
 */
async function getNextOrderNumber() {
    const counterRef = db.ref('dailyCounters/orders');
    const today = new Date().toISOString().split('T')[0]; // Format:YYYY-MM-DD

    try {
        const {
            committed,
            snapshot
        } = await counterRef.transaction(currentData => {
            if (currentData === null) {
                // First order ever, initialize the counter.
                return {
                    number: 1,
                    date: today
                };
            }
            if (currentData.date === today) {
                // It's the same day, increment the number.
                currentData.number++;
            } else {
                // It's a new day, reset the number to 1 and update the date.
                currentData.number = 1;
                currentData.date = today;
            }
            return currentData;
        });

        if (committed) {
            return snapshot.val().number;
        } else {
            console.error("Transaction to get next order number was aborted.");
            return null;
        }
    } catch (error) {
        console.error("Firebase transaction for order number failed: ", error);
        return null;
    }
}


// --- EXISTING UI AND HELPER FUNCTIONS (Corrected Syntax) ---

function showMessageBox(titleKey, messageKey, isError = false, iconClass = '') {
    let translatedTitle, translatedMessage, translatedOk;
    if (typeof translations !== 'undefined' && translations[currentLang]) {
        translatedTitle = translations[currentLang][titleKey] || titleKey;
        translatedMessage = translations[currentLang][messageKey] || messageKey;
        translatedOk = translations[currentLang].message_box_ok || "OK";
    } else {
        translatedTitle = titleKey;
        translatedMessage = messageKey;
        translatedOk = "OK";
    }

    messageBoxTitle.textContent = translatedTitle;
    messageBoxText.textContent = translatedMessage;
    messageBoxOkBtn.textContent = translatedOk;
    messageBoxOkBtn.onclick = () => {
        messageBox.style.display = 'none';
    };

    const iconElement = messageBox.querySelector('i');
    if (iconClass) {
        if(!iconElement) {
            const newIconElement = document.createElement('i');
            messageBox.insertBefore(newIconElement, messageBoxTitle);
        }
        messageBox.querySelector('i').className = iconClass;
        messageBox.querySelector('i').style.display = 'block';
    } else if (iconElement) {
        iconElement.style.display = 'none';
    }

    if (isError) {
        messageBoxTitle.classList.add('text-red-600');
        messageBoxOkBtn.classList.add('bg-red-600');
    } else {
        messageBoxTitle.classList.remove('text-red-600');
        messageBoxOkBtn.classList.remove('bg-red-600');
    }
    messageBox.style.display = 'flex';
}


function showRedirectMessageBox(titleKey, messageKey, redirectUrl) {
    showMessageBox(titleKey, messageKey, true);
    messageBoxOkBtn.onclick = () => {
        window.location.href = redirectUrl;
    };
}


function escapeHTML(str) {
    if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
    return String(str).replace(/[<>&"']/g, s => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;"
    } [s]));
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
    const taxes = subtotal * TAX_RATE;
    let total = subtotal + taxes;
    let currentDeliveryFee = 0;

    if (orderType === 'delivery') {
        if (appliedPromo && appliedPromo.discountType === 'free_delivery') {
            currentDeliveryFee = 0;
        } else {
            currentDeliveryFee = DELIVERY_FEE;
        }
        deliveryRowEl.classList.remove('hidden');
        deliveryAmountEl.textContent = `${currentDeliveryFee.toFixed(2)} MAD`;
        total += currentDeliveryFee;
    } else {
        deliveryRowEl.classList.add('hidden');
    }

    let discountValue = 0;
    if (appliedPromo) {
        if (appliedPromo.discountType === 'percentage') {
            discountValue = subtotal * (appliedPromo.discountValue / 100);
        } else if (appliedPromo.discountType === 'fixed') {
            discountValue = appliedPromo.discountValue;
        } else if (appliedPromo.discountType === 'free_delivery') {
            discountValue = DELIVERY_FEE;
        }
        discountRowEl.classList.remove('hidden');
        discountCodeDisplayEl.textContent = appliedPromo.code;
        discountAmountEl.textContent = discountValue.toFixed(2);
        total -= discountValue;
    } else {
        discountRowEl.classList.add('hidden');
    }

    total = Math.max(0, total);

    summarySubtotalEl.textContent = `${subtotal.toFixed(2)} MAD`;
    if (document.getElementById('summary-taxes')) {
        document.getElementById('summary-taxes').textContent = `${taxes.toFixed(2)} MAD`;
    }
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
        const customizations = item.options ? item.options.join(', ') : '';

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
        ${customizations ? `<div class="cart-item-customizations">${escapeHTML(customizations)}</div>` : ''}
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
    
    // Check for the reorder flag
    const requiresNewTable = localStorage.getItem('reorderRequiresNewTable') === 'true';

    if (orderType === 'dineIn') {
        if (requiresNewTable) {
            orderDetailsInputDiv.innerHTML = `
                <div>
                    <label for="new-table-input" class="block mb-2 font-semibold text-gray-700" data-translate="new_table_number_label">Enter New Table Number</label>
                    <input type="number" id="new-table-input" class="input-field-style w-full" placeholder="e.g., 15" required />
                </div>
            `;
            // Clean up the flag so it's only used once per attempt
            localStorage.removeItem('reorderRequiresNewTable');
        } else {
             const tableNumber = localStorage.getItem('tableNumber') || '';
             orderDetailsInputDiv.innerHTML = `
                <div>
                    <label id="table-label" class="block mb-2 font-semibold text-gray-700" data-translate="table_number_label">Table Number</label>
                    <div class="output-field"><strong>${escapeHTML(tableNumber)}</strong></div>
                </div>
            `;
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
            const userAddresses = userProfile.addresses || {};
            let savedAddressesHtml = '<p class="text-sm text-gray-600 mb-2">Select a saved address or enter a new one below.</p>';

            if (Object.keys(userAddresses).length > 0) {
                savedAddressesHtml += '<div class="space-y-2 mb-4">';
                for (const addressId in userAddresses) {
                    const address = userAddresses[addressId];
                    const fullAddress = `${address.street}, ${address.city}`;
                    savedAddressesHtml += `
                        <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="savedAddress" value="${escapeHTML(fullAddress)}" class="form-radio h-5 w-5 text-red-600">
                            <span class="ml-3">
                                <span class="font-semibold">${escapeHTML(address.label)}</span>
                                <span class="block text-sm text-gray-500">${escapeHTML(fullAddress)}</span>
                            </span>
                        </label>
                    `;
                }
                savedAddressesHtml += '</div>';
            } else {
                savedAddressesHtml += `
                    <div class="text-center p-4 border-2 border-dashed rounded-lg mb-4">
                         <p class="text-gray-500">No saved addresses found.</p>
                         <a href="profile.html#addresses" class="text-sm text-blue-600 hover:underline">Add an address in your profile</a>
                    </div>
                `;
            }

            addressInputHtml = `
                <div>
                    <label id="address-label" class="block mb-2 font-semibold text-gray-700" data-translate="delivery_address_label">Delivery Address</label>
                    ${savedAddressesHtml}
                    <input type="text" id="delivery-address" class="input-field-style w-full" placeholder="Enter your delivery address" required value=""/>
                </div>
                <div class="mt-4">
                    <label for="delivery-instructions" class="block mb-2 font-semibold text-gray-700" data-translate="delivery_instructions_label">Delivery Instructions (Optional)</label>
                    <textarea id="delivery-instructions" rows="2" class="input-field-style w-full" placeholder="e.g. Leave at front door, call upon arrival..."></textarea>
                </div>
            `;
        }

        orderDetailsInputDiv.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label id="customer-name-label" class="block mb-2 font-semibold text-gray-700" data-translate="customer_name_label">Your Name</label>
                    <div class="output-field"><strong>${escapeHTML(customerName)}</strong></div>
                </div>
                <div>
                    <label id="customer-phone-label" for="customer-phone" class="block mb-2 font-semibold text-gray-700" data-translate="phone_number_label">Your Phone</label>
                    <div class="flex items-center gap-2 mt-1">
                        <div id="customer-phone-display" class="output-field flex-grow"><strong>${escapeHTML(customerPhone)}</strong></div>
                        <input type="tel" id="customer-phone-input" class="hidden w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-red-500" value="${escapeHTML(customerPhone)}" />
                        <button type="button" id="change-phone-btn" class="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Change</button>
                        <button type="button" id="save-phone-btn" class="hidden px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Save</button>
                        <button type="button" id="cancel-phone-btn" class="hidden px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600">Cancel</button>
                    </div>
                </div>
                ${addressInputHtml}
            </div>
            ${pickupOptionsHtml}
        `;

        // Add event listeners after injecting HTML
        const changePhoneBtn = document.getElementById('change-phone-btn');
        const savePhoneBtn = document.getElementById('save-phone-btn');
        const cancelPhoneBtn = document.getElementById('cancel-phone-btn');
        const customerPhoneDisplay = document.getElementById('customer-phone-display');
        const customerPhoneInput = document.getElementById('customer-phone-input');
        
        const togglePhoneEditMode = (isEditing) => {
            customerPhoneDisplay.classList.toggle('hidden', isEditing);
            customerPhoneInput.classList.toggle('hidden', !isEditing);
            changePhoneBtn.classList.toggle('hidden', isEditing);
            savePhoneBtn.classList.toggle('hidden', !isEditing);
            cancelPhoneBtn.classList.toggle('hidden', !isEditing);
            if(isEditing) {
                customerPhoneInput.focus();
            }
        };

        changePhoneBtn.addEventListener('click', () => togglePhoneEditMode(true));
        cancelPhoneBtn.addEventListener('click', () => {
            customerPhoneInput.value = customerPhone;
            togglePhoneEditMode(false);
        });
        savePhoneBtn.addEventListener('click', async () => {
            const newPhoneNumber = customerPhoneInput.value.trim();
            if(newPhoneNumber && newPhoneNumber !== customerPhone) {
                await db.ref(`users/${user.uid}`).update({ phone: newPhoneNumber });
                customerPhoneDisplay.querySelector('strong').textContent = newPhoneNumber;
                showMessageBox('Success!', 'Phone number updated successfully.', false, 'fas fa-check-circle text-5xl text-green-500 mb-4');
            }
            togglePhoneEditMode(false);
        });


        if (orderType === 'delivery') {
            const savedAddressRadios = document.querySelectorAll('input[name="savedAddress"]');
            const deliveryAddressInput = document.getElementById('delivery-address');
            savedAddressRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        deliveryAddressInput.value = e.target.value;
                    }
                });
            });
        }

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

/* ---------- NEW: full promo validation ---------- */

async function validatePromo(foundOffer, foundOfferId) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderType = localStorage.getItem('orderType') || 'dineIn';

    if (foundOffer.minOrderValue && subtotal < foundOffer.minOrderValue) {
        return {
            ok: false,
            errorMessage: `This code requires a minimum order of ${foundOffer.minOrderValue} MAD.`
        };
    }

    if (foundOffer.discountType === 'free_delivery' && orderType !== 'delivery') {
        return {
            ok: false,
            errorMessage: 'This code is only valid for delivery orders.'
        };
    }

    const now = new Date();
    if (foundOffer.expiryDate) {
        const expiryDate = new Date(foundOffer.expiryDate);
        if (expiryDate < now) {
            return {
                ok: false,
                errorMessage: 'This promo code has expired.'
            };
        }
    }

    if (foundOffer.isActive === false) {
        return {
            ok: false,
            errorMessage: 'This promo code is not currently active.'
        };
    }

    const currentUsage = foundOffer.currentUsage || 0;
    const totalLimit = foundOffer.totalUsageLimit || 0; // 0 = unlimited
    if (totalLimit > 0 && currentUsage >= totalLimit) {
        return {
            ok: false,
            errorMessage: 'This promo code has reached its usage limit.'
        };
    }

    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
        return {
            ok: false,
            errorMessage: 'Please sign in to use this promo code.'
        };
    }

    const userPromoRef = db.ref(`users/${user.uid}/usedPromoCodes/${foundOfferId}`);
    const userPromoSnapshot = await userPromoRef.once('value');
    const userUsageCount = userPromoSnapshot.val() || 0;
    const perUserLimit = foundOffer.perUserLimit || 0; // 0 = unlimited

    if (perUserLimit > 0 && userUsageCount >= perUserLimit) {
        return {
            ok: false,
            errorMessage: 'You have already used this promo code the maximum number of times.'
        };
    }

    return { ok: true };
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
        let foundOfferId = null;

        if (promoCodesData) {
            for (const offerId in promoCodesData) {
                const offer = promoCodesData[offerId];
                if (offer.code && offer.code.toUpperCase() === codeToApply) {
                    foundOffer = offer;
                    foundOfferId = offerId;
                    break;
                }
            }
        }

        if (!foundOffer) {
            promoMessageEl.textContent = 'This promo code is not valid.';
            promoMessageEl.className = 'text-sm mt-2 font-semibold error';
            appliedPromo = null;
            localStorage.removeItem('appliedPromo');
            updateTotalsUI();
            return;
        }

        const validation = await validatePromo(foundOffer, foundOfferId);
        if (!validation.ok) {
            promoMessageEl.textContent = validation.errorMessage || 'This promo code cannot be used.';
            promoMessageEl.className = 'text-sm mt-2 font-semibold error';
            return;
        }

        foundOffer.id = foundOfferId;

        appliedPromo = foundOffer;
        localStorage.setItem('appliedPromo', JSON.stringify(appliedPromo));
        updateTotalsUI();

        promoInput.disabled = true;
        applyBtn.textContent = 'Remove';
        applyBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        applyBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
        promoMessageEl.textContent = `Success! "${foundOffer.name}" applied.`;
        promoMessageEl.className = 'text-sm mt-2 font-semibold success';
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

        const cartItemIds = new Set(cart.map(item => item.id));
        const suggestions = [];
        const suggestionIds = new Set();

        // 1. Add a favorite item if available and not in cart
        if (favorites.length > 0) {
            const shuffledFavorites = [...favorites].sort(() => 0.5 - Math.random());
            for (const favId of shuffledFavorites) {
                if (!cartItemIds.has(favId)) {
                    for (const categoryId in menuData) {
                        if (menuData[categoryId].items && menuData[categoryId].items[favId]) {
                            const item = menuData[categoryId].items[favId];
                            suggestions.push({ ...item, id: favId, categoryId });
                            suggestionIds.add(favId);
                            break; // Add only one favorite
                        }
                    }
                }
                if (suggestions.length > 0) break;
            }
        }

        // 2. Fill remaining spots with other items
        const potentialItems = [];
        for (const categoryId in menuData) {
            const category = menuData[categoryId];
            if (category.items) {
                for (const itemId in category.items) {
                    if (!cartItemIds.has(itemId) && !suggestionIds.has(itemId)) {
                         potentialItems.push({ ...category.items[itemId], id: itemId, categoryId });
                    }
                }
            }
        }

        potentialItems.sort(() => 0.5 - Math.random());
        
        while (suggestions.length < 3 && potentialItems.length > 0) {
            suggestions.push(potentialItems.shift());
        }


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

/* --- NEW: track promo usage on successful order --- */
async function trackPromoUsageOnOrder(orderId, orderData) {
    if (!appliedPromo || !appliedPromo.id) return;

    const promoId = appliedPromo.id;
    const promoUsageRef = db.ref(`promoCodes/${promoId}/currentUsage`);
    promoUsageRef.transaction(current => (current || 0) + 1);

    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
        const perUserRef = db.ref(`users/${user.uid}/usedPromoCodes/${promoId}`);
        perUserRef.transaction(current => (current || 0) + 1);
    }

    const promoInfo = {
        id: promoId,
        code: appliedPromo.code || null,
        discountType: appliedPromo.discountType || null,
        discountValue: appliedPromo.discountValue || 0
    };
    await db.ref(`orders/${orderId}/promo`).set(promoInfo);

    appliedPromo = null;
    localStorage.removeItem('appliedPromo');
}


document.addEventListener('DOMContentLoaded', () => {
    currentLang = localStorage.getItem('lang') || 'en';

    renderCart();
    updateCartCountNav();
    updatePlaceOrderButtonState();
    handlePromoCode();
    renderSuggestions();
    
    const checkoutDetailsSection = document.getElementById('checkout-details-section');
    const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');
    const placeOrderBtn = document.getElementById('place-order');

    proceedToCheckoutBtn.addEventListener('click', () => {
        checkoutDetailsSection.classList.add('expanded');
        proceedToCheckoutBtn.classList.add('hidden');
        placeOrderBtn.classList.remove('hidden');
    });
    
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

    auth.onAuthStateChanged(async (user) => {
        const dineInOption = document.getElementById('dineInOption');
        const pickupOption = document.getElementById('pickupOption');
        const deliveryOption = document.getElementById('deliveryOption');
        const guestCtaSection = document.getElementById('guest-cta-section');

        const tableNumber = localStorage.getItem('tableNumber');

        guestCtaSection.classList.add('hidden');

        if (tableNumber) {
            localStorage.setItem('orderType', 'dineIn');
            pickupOption.disabled = true;
            pickupOption.classList.add('disabled');
            deliveryOption.disabled = true;
            deliveryOption.classList.add('disabled');
            if (user && user.isAnonymous) {
                guestCtaSection.classList.remove('hidden');
            }
        } else if (user && !user.isAnonymous) {
            dineInOption.disabled = true;
            dineInOption.classList.add('disabled');
        } else {
            if (localStorage.getItem('orderType') !== 'dineIn') {
                showRedirectMessageBox('Login Required', 'Pickup and Delivery orders require an account. Please log in or create an account to continue.', 'auth.html');
            }
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

                let customerInfo = {};
                let orderSpecifics = {};
                let validationError = false;

                const currentOrderType = localStorage.getItem("orderType");
                
                const allergyInfo = document.getElementById('allergy-info') ? document.getElementById('allergy-info').value.trim() : '';

                if (currentOrderType === 'dineIn') {
                    const newTableInput = document.getElementById('new-table-input');
                    let tableNumber = '';

                    if (newTableInput) { // Reorder conflict scenario
                        tableNumber = newTableInput.value.trim();
                        if (!tableNumber || isNaN(parseInt(tableNumber))) {
                            showMessageBox('validation_error_title', 'Please enter a valid new table number.', true);
                            validationError = true;
                        } else {
                            orderSpecifics.table = tableNumber;
                        }
                    } else { // Normal dine-in scenario
                        tableNumber = localStorage.getItem('tableNumber') || '';
                        if (!tableNumber) {
                            showMessageBox('validation_error_title', 'table_number_missing_error', true);
                            validationError = true;
                        } else {
                            orderSpecifics.table = tableNumber;
                        }
                    }
                    if (user && !user.isAnonymous) {
                        const profile = (await db.ref(`users/${user.uid}`).once('value')).val() || {};
                        customerInfo = { userId: user.uid, name: profile.name || 'N/A', phone: profile.phone || 'N/A' };
                    } else {
                        customerInfo = { userId: user ? user.uid : 'guest', name: 'Dine-in Guest', phone: '' };
                    }
                } else if (currentOrderType === 'pickup' || currentOrderType === 'delivery') {
                    if (!user || user.isAnonymous) {
                        showRedirectMessageBox('Login Required', 'You must be logged in for this order type.', 'auth.html');
                        return;
                    }
                    const profile = (await db.ref(`users/${user.uid}`).once('value')).val() || {};
                    customerInfo = { userId: user.uid, name: profile.name || 'N/A', phone: profile.phone || 'N/A' };

                    if (currentOrderType === 'delivery') {
                        const addressInput = document.getElementById('delivery-address');
                        const address = addressInput ? addressInput.value.trim() : '';
                        if (!address) {
                            showMessageBox('validation_error_title', 'delivery_address_missing_error', true);
                            validationError = true;
                        } else {
                            orderSpecifics.deliveryAddress = address;
                            const instructionsInput = document.getElementById('delivery-instructions');
                            orderSpecifics.deliveryInstructions = instructionsInput ? instructionsInput.value.trim() : '';
                        }
                    } else { // Pickup
                        const pickupTimeOption = document.querySelector('input[name="pickupTimeOption"]:checked');
                        if (pickupTimeOption && pickupTimeOption.value === 'schedule') {
                            const scheduledTime = document.getElementById('pickup-time').value;
                            if (!scheduledTime) {
                                showMessageBox('validation_error_title', 'pickup_time_missing_error', true);
                                validationError = true;
                            } else {
                                orderSpecifics.pickupTime = scheduledTime;
                            }
                        } else {
                            orderSpecifics.pickupTime = 'ASAP';
                        }
                    }
                } else {
                    showMessageBox('validation_error_title', 'order_type_missing_error', true);
                    return;
                }

                if (validationError || cart.length === 0) {
                    if (cart.length === 0) showMessageBox('validation_error_title', 'cart_empty_order_error', true);
                    return;
                }

                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = "Placing Order...";

                const orderNumber = await getNextOrderNumber();
                if (orderNumber === null) {
                    showMessageBox('order_error_title', 'Could not generate order number. Please try again.', true);
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = "Place Order";
                    return;
                }
                const orderId = generateShortId();

                const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const taxes = itemsTotal * TAX_RATE;
                const deliveryFee = currentOrderType === 'delivery' ? (appliedPromo && appliedPromo.discountType === 'free_delivery' ? 0 : DELIVERY_FEE) : 0;
                let discount = 0;
                if (appliedPromo) {
                    if (appliedPromo.discountType === 'percentage') discount = itemsTotal * (appliedPromo.discountValue / 100);
                    else if (appliedPromo.discountType === 'fixed') discount = appliedPromo.discountValue;
                    else if (appliedPromo.discountType === 'free_delivery') discount = DELIVERY_FEE;
                }
                const finalTotal = itemsTotal + taxes + deliveryFee - discount;

                const orderData = {
                    orderNumber,
                    orderId,
                    orderType: currentOrderType,
                    cart: cart,
                    priceDetails: {
                        itemsTotal: parseFloat(itemsTotal.toFixed(2)),
                        deliveryFee: parseFloat(deliveryFee.toFixed(2)),
                        taxes: parseFloat(taxes.toFixed(2)),
                        discount: parseFloat(discount.toFixed(2)),
                        finalTotal: parseFloat(finalTotal.toFixed(2))
                    },
                    status: "pending",
                    timestamp: new Date().toISOString(),
                    customerInfo,
                    ...orderSpecifics,
                    allergyInfo: allergyInfo
                };

                try {
                    await db.ref("orders/" + orderId).set(orderData);

                    if (customerInfo.userId && customerInfo.userId !== 'guest') {
                        await db.ref(`users/${customerInfo.userId}/orders/${orderId}`).set(true);
                    }

                    await trackPromoUsageOnOrder(orderId, orderData);

                    localStorage.setItem("lastOrderId", orderId);
                    localStorage.removeItem("cart");

                    window.location.href = `confirm.html?orderId=${orderId}`;
                } catch (error) {
                    console.error("Firebase error during order placement:", error);
                    showMessageBox('order_error_title', `Order placement failed: ${error.message}`, true);
                } finally {
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = "Place Order";
                }
            };
            placeOrderBtn.addEventListener("click", newClickListener);
            placeOrderBtn._currentClickListener = newClickListener;
        }
    });
});