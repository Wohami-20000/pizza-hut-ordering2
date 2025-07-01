// ui-components.js

/**
 * Escapes HTML special characters in a string.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
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
function updateCartCount() {
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
function toggleFavorite(itemId, heartIconEl) {
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
 * Updates the quantity of an item in the cart.
 * @param {string} itemId The ID of the item.
 * @param {number} change The change in quantity (+1 or -1).
 */
function updateItemQuantity(itemId, change) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let itemInCart = cart.find(i => i.id === itemId);

    if (change > 0) {
        if (itemInCart) {
            itemInCart.quantity++;
        } else {
            // This requires fetching item details from Firebase,
            // which should be handled in the calling script (menu.js or favorites.js)
            console.error("Cannot add new item from here. This needs to be handled by the page's main script.");
        }
    } else if (itemInCart) {
        itemInCart.quantity--;
        if (itemInCart.quantity <= 0) {
            cart = cart.filter(i => i.id !== itemId);
        }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    // Update the quantity display on the card
    const card = document.getElementById(`item-card-${itemId}`);
    if (card) {
        const quantitySpan = card.querySelector('.quantity-controls span');
        if (quantitySpan) {
            const newQuantity = itemInCart ? itemInCart.quantity : 0;
            quantitySpan.textContent = newQuantity;
        }
    }
}

/**
 * Creates an item card with quantity controls and a favorite toggle.
 * @param {object} item The item data.
 * @param {string} categoryId The ID of the item's category.
 * @param {string} itemId The ID of the item.
 * @returns {HTMLElement} The created item card.
 */
function createMenuItemCard(item, categoryId, itemId) {
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
                <button class="quantity-btn" onclick="updateItemQuantity('${itemId}', -1)">-</button>
                <span class="font-bold text-lg w-8 text-center">${quantityInCart}</span>
                <button class="quantity-btn" onclick="updateItemQuantity('${itemId}', 1, '${categoryId}', '${escapeHTML(item.name)}', ${item.price}, '${escapeHTML(item.image_url)}')">+</button>
            </div>
        </div>`;
    return card;
}

// A new function to handle adding items that are not in the cart yet
function addItemToCart(itemId, categoryId, itemName, itemPrice, itemImageUrl) {
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


// Modified updateItemQuantity to use addItemToCart
function updateItemQuantity(itemId, change, categoryId, itemName, itemPrice, itemImageUrl) {
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