// ui-components.js

/**
 * Displays a toast notification message.
 * @param {string} message - The message to display.
 * @param {boolean} [isError=false] - If true, the toast will have a red error style.
 */
export function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 transition-opacity duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}


/**
 * Escapes HTML special characters in a string.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

/**
 * Updates the cart count in the header.
 */
export function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountSpan = document.getElementById('cart-count');
    if (cartCountSpan) {
        cartCountSpan.textContent = count;
    }
}

/**
 * Toggles an item's favorite status in localStorage.
 * @param {string} itemId The ID of the item to toggle.
 * @param {HTMLElement} heartIconEl The heart icon element.
 */
export function toggleFavorite(itemId, heartIconEl) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const isFavorited = heartIconEl.classList.toggle('active');

    if (isFavorited) {
        if (!favorites.includes(itemId)) {
            favorites.push(itemId);
        }
    } else {
        favorites = favorites.filter(id => id !== itemId);
    }
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

/**
 * Creates an item card with quantity controls and a favorite toggle.
 * @param {object} item The item data.
 * @param {string} categoryId The ID of the item's category.
 * @param {string} itemId The ID of the item.
 * @returns {HTMLElement} The created item card.
 */
export function createMenuItemCard(item, categoryId, itemId) {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const itemInCart = cart.find(i => i.id === itemId);
    const quantityInCart = itemInCart ? itemInCart.quantity : 0;
    const isFavorite = favorites.includes(itemId);

    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.id = `item-card-${itemId}`;
    const itemPrice = typeof item.price === 'number' ? item.price : 0;

    card.innerHTML = `
        <div class="item-content-left flex flex-col">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-bold text-gray-800 pr-2">${escapeHTML(item.name || 'Unknown Item')}</h3>
                <i class="fas fa-heart fav-icon text-xl ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${itemId}', this)"></i>
            </div>
            <p class="text-gray-500 text-sm mt-1 mb-3 flex-grow">${escapeHTML(item.description || '')}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="text-xl font-extrabold text-gray-900">${itemPrice.toFixed(2)} MAD</span>
                <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="customize-btn font-semibold">View Item</a>
            </div>
        </div>
        <div class="item-image-right flex flex-col items-center justify-between">
            <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}">
            <div class="quantity-controls flex items-center gap-3 mt-2">
                <button class="quantity-btn" onclick="updateCartItemQuantity('${itemId}', -1)">-</button>
                <span class="font-bold text-lg w-8 text-center">${quantityInCart}</span>
                <button class="quantity-btn" onclick="updateCartItemQuantity('${itemId}', 1, '${categoryId}', '${escapeHTML(item.name)}', ${item.price}, '${escapeHTML(item.image_url)}')">+</button>
            </div>
        </div>`;
    return card;
}

// A new function to handle adding items that are not in the cart yet
export function addItemToCart(itemId, categoryId, itemName, itemPrice, itemImageUrl) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let itemInCart = cart.find(i => i.id === itemId);

    if (itemInCart) {
        itemInCart.quantity++;
    } else {
        cart.push({
            id: itemId,
            name: itemName,
            price: itemPrice,
            quantity: 1,
            categoryId: categoryId,
            image_url: itemImageUrl
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    const card = document.getElementById(`item-card-${itemId}`);
    if (card) {
        const quantitySpan = card.querySelector('.quantity-controls span');
        if (quantitySpan) {
            quantitySpan.textContent = cart.find(i => i.id === itemId).quantity;
        }
    }
}

/**
 * Updates the quantity of an item in the cart (renamed to avoid conflict with stock.js).
 * @param {string} itemId The ID of the item.
 * @param {number} change The change in quantity (+1 or -1).
 * @param {string} [categoryId]
 * @param {string} [itemName]
 * @param {number} [itemPrice]
 * @param {string} [itemImageUrl]
 */
export function updateCartItemQuantity(itemId, change, categoryId, itemName, itemPrice, itemImageUrl) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let itemInCart = cart.find(i => i.id === itemId);

    if (change > 0) {
        if (itemInCart) {
            itemInCart.quantity++;
        } else {
            // Use the new function to add the item
            addItemToCart(itemId, categoryId, itemName, itemPrice, itemImageUrl);
            return; // Exit after adding the new item
        }
    } else if (itemInCart) {
        itemInCart.quantity--;
        if (itemInCart.quantity <= 0) {
            cart = cart.filter(i => i.id !== itemId);
        }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    const card = document.getElementById(`item-card-${itemId}`);
    if (card) {
        const quantitySpan = card.querySelector('.quantity-controls span');
        if (quantitySpan) {
            const updatedItem = cart.find(i => i.id === itemId);
            const newQuantity = updatedItem ? updatedItem.quantity : 0;
            quantitySpan.textContent = newQuantity;
        }
    }
}

/**
 * Audit log helper for admin actions (used by promo-codes.js and other panels).
 * Writes entries under /adminLogs in Realtime Database.
 *
 * @param {firebase.User|null} user - The current authenticated user, if any.
 * @param {string} actionType - A short action label, e.g. 'CREATE_PROMO_CODE'.
 * @param {object} [details={}] - Additional metadata to store with the log entry.
 */
export async function logAction(user, actionType, details = {}) {
    try {
        // Assumes firebase is already initialized globally on the page
        const db = firebase.database();
        const uid = user && !user.isAnonymous ? user.uid : 'anonymous';

        const logEntry = {
            uid,
            actionType,
            details,
            timestamp: new Date().toISOString(),
            source: 'dashboard'
        };

        await db.ref('adminLogs').push(logEntry);
    } catch (error) {
        console.error('logAction failed:', error);
    }
}