// favorites.js
const db = firebase.database();
const favoritesContainer = document.getElementById('favorites-container');
const cartCountSpan = document.getElementById('cart-count');

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

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cartCountSpan) {
        cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    // Get favorites from localStorage, which is synced for both guests and users
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `<p class="text-center text-gray-500 mt-10">You haven't added any favorites yet.</p>`;
        return;
    }

    // Fetch the entire menu from Firebase to find the details
    db.ref('menu').once('value', snapshot => {
        const menuData = snapshot.val();
        if (!menuData) {
            favoritesContainer.innerHTML = `<p class="text-center text-red-500 mt-10">Could not load menu data.</p>`;
            return;
        }

        const container = document.createElement('div');
        container.className = 'space-y-4';
        
        // Loop through saved favorite IDs and find them in the menu data
        favorites.forEach(favId => {
            let itemFound = false;
            for (const categoryId in menuData) {
                if (menuData[categoryId].items && menuData[categoryId].items[favId]) {
                    const item = menuData[categoryId].items[favId];
                    container.appendChild(createFavoriteItemCard(item, categoryId, favId));
                    itemFound = true;
                    break; 
                }
            }
        });
        
        favoritesContainer.innerHTML = ''; // Clear "Loading..."
        favoritesContainer.appendChild(container);
    });
});