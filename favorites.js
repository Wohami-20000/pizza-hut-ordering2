// favorites.js

// --- Firebase and DOM Element Initialization ---
const db = firebase.database();
const favoritesContainer = document.getElementById('favorites-container');
const cartCountSpan = document.getElementById('cart-count');

// --- Re-usable UI and Helper Functions ---

/**
 * Escapes special HTML characters in a string to prevent XSS attacks.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, match => ({ 
        '&': '&amp;', 
        '<': '&lt;', 
        '>': '&gt;', 
        '"': "&quot;", 
        "'": '&#39;' 
    }[match]));
}

/**
 * Updates the cart count in the header.
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cartCountSpan) {
        cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

/**
 * Creates the HTML structure for a favorite item card.
 * @param {object} item The item data from Firebase.
 * @param {string} categoryId The ID of the item's category.
 * @param {string} itemId The unique ID of the item.
 * @returns {HTMLElement} The created card element.
 */
function createFavoriteItemCard(item, categoryId, itemId) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    
    card.innerHTML = `
        <div class="item-content-left flex flex-col">
            <h3 class="text-lg font-bold text-gray-800 pr-2">${escapeHTML(item.name || 'Unknown Item')}</h3>
            <p class="text-gray-500 text-sm mt-1 mb-3 flex-grow">${escapeHTML(item.description || '')}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="text-xl font-extrabold text-gray-900">${itemPrice.toFixed(2)} MAD</span>
                <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="customize-btn font-semibold">View Item</a>
            </div>
        </div>
        <div class="item-image-right flex flex-col items-center justify-between">
            <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}">
        </div>`;
    return card;
}
        
// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `<p class="text-center text-gray-500 mt-10">You haven't added any favorites yet.</p>`;
        return;
    }

    // Fetch the entire menu to find details for the favorite items
    db.ref('menu').once('value', snapshot => {
        const menuData = snapshot.val();
        if (!menuData) {
            favoritesContainer.innerHTML = `<p class="text-center text-red-500 mt-10">Could not load menu data.</p>`;
            return;
        }

        const container = document.createElement('div');
        container.className = 'space-y-4';
        
        // Find and render each favorite item
        favorites.forEach(favId => {
            let itemFound = false;
            for (const categoryId in menuData) {
                if (menuData[categoryId].items && menuData[categoryId].items[favId]) {
                    const item = menuData[categoryId].items[favId];
                    container.appendChild(createFavoriteItemCard(item, categoryId, favId));
                    itemFound = true;
                    break; // Move to the next favorite once found
                }
            }
        });
        
        favoritesContainer.innerHTML = ''; // Clear loading/empty message
        favoritesContainer.appendChild(container);
    });
});