// favorites.js - Redesigned
const db = firebase.database();
const auth = firebase.auth();
const favoritesContainer = document.getElementById('favorites-container');
const cartCountSpan = document.getElementById('cart-count');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');

// Modal Elements
const messageModal = document.getElementById('message-modal');
const modalOverlay = messageModal.querySelector('.modal-overlay');
const modalBox = messageModal.querySelector('.modal-box');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalOkBtn = document.getElementById('modal-ok-btn');

// --- UTILITY FUNCTIONS ---

/**
 * Escapes special characters in a string for safe HTML insertion.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

/**
 * Displays a custom modal with a title and message.
 * @param {string} title The title for the modal.
 * @param {string} message The message content for the modal.
 */
function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
    setTimeout(() => {
        messageModal.classList.remove('opacity-0');
        modalBox.classList.remove('scale-95', 'opacity-0');
    }, 10); // Short delay to allow CSS transitions to trigger
}

/**
 * Hides the custom modal with a fade-out animation.
 */
function hideModal() {
    messageModal.classList.add('opacity-0');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        messageModal.classList.add('hidden');
    }, 300); // Matches the transition duration
}

/**
 * Updates the cart item count in the header.
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountSpan) {
        cartCountSpan.textContent = count;
        cartCountSpan.classList.toggle('hidden', count === 0);
    }
}

// --- CORE LOGIC ---

/**
 * Removes an item from the user's favorites, updating the database and UI.
 * @param {string} itemId The ID of the item to remove.
 * @param {HTMLElement} cardElement The card element in the DOM to remove.
 */
async function removeFromFavorites(itemId, cardElement) {
    const user = auth.currentUser;
    // Remove from Firebase if the user is logged in
    if (user && !user.isAnonymous) {
        await db.ref(`users/${user.uid}/favorites/${itemId}`).remove();
    }
    
    // Always remove from local storage for guests or as a fallback
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(id => id !== itemId);
    localStorage.setItem("favorites", JSON.stringify(favorites));

    // Animate and remove the card from the UI
    cardElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.9)';
    setTimeout(() => {
        cardElement.remove();
        // If no cards are left, show the empty state message
        if (favoritesContainer.children.length === 0) {
            emptyState.classList.remove('hidden');
        }
    }, 300);
}

/**
 * Adds a standard version of an item to the cart.
 * @param {string} itemId The ID of the item to add.
 * @param {string} categoryId The category ID of the item.
 * @param {HTMLElement} buttonElement The button that was clicked.
 */
async function addToCart(itemId, categoryId, buttonElement) {
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    try {
        const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
        if (!itemSnapshot.exists()) {
            showModal('Error', 'This item could not be found in the menu.');
            return;
        }
        const itemData = itemSnapshot.val();
        let cart = JSON.parse(localStorage.getItem("cart")) || [];

        // Use a consistent cartItemId for standard, non-customized items
        const cartItemId = `${itemId}-standard`;
        const existingItem = cart.find(item => item.cartItemId === cartItemId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                cartItemId: cartItemId,
                id: itemId,
                name: itemData.name,
                price: itemData.price,
                quantity: 1,
                categoryId: categoryId,
                image_url: itemData.image_url,
                options: [] // Empty options for a standard item
            });
        }
        
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();

        // Provide visual feedback on the button
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Added';
        buttonElement.classList.remove('bg-yellow-400', 'hover:bg-yellow-500');
        buttonElement.classList.add('bg-green-500');

        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
            buttonElement.classList.remove('bg-green-500');
            buttonElement.classList.add('bg-yellow-400', 'hover:bg-yellow-500');
        }, 1500);

    } catch (error) {
        showModal('Error', 'Could not add item to cart. Please try again.');
        console.error("Add to cart error:", error);
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    }
}

/**
 * Creates and returns the HTML element for a single favorite item card.
 * @param {object} item The item data from Firebase.
 * @param {string} categoryId The category ID of the item.
 * @param {string} itemId The unique ID of the item.
 * @returns {HTMLElement} The card element.
 */
function createFavoriteItemCard(item, categoryId, itemId) {
    const card = document.createElement('div');
    card.className = 'fav-item-card bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col opacity-0 animate-fadeInUp';
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    
    card.innerHTML = `
        <div class="relative">
            <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}">
                <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}" class="w-full h-48 object-cover">
            </a>
            <button class="absolute top-3 right-3 bg-white rounded-full h-8 w-8 flex items-center justify-center text-red-500 hover:bg-red-50 transition remove-fav-btn" aria-label="Remove from favorites">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="p-4 flex flex-col flex-grow">
            <h3 class="text-lg font-bold text-gray-800 truncate">${escapeHTML(item.name || 'Unknown Item')}</h3>
            <p class="text-gray-500 text-sm mt-1 mb-4 flex-grow">${escapeHTML(item.description || 'No description available.')}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="text-xl font-extrabold text-gray-900">${itemPrice.toFixed(2)} MAD</span>
                <button class="add-to-cart-btn bg-yellow-400 text-brand-dark font-bold py-2 px-4 rounded-full hover:bg-yellow-500 transition-all transform hover:scale-105">
                    Add to Cart
                </button>
            </div>
        </div>
    `;

    // Attach event listeners to the buttons on the new card
    card.querySelector('.remove-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromFavorites(itemId, card);
    });
    
    card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(itemId, categoryId, e.currentTarget);
    });

    return card;
}

/**
 * Fetches menu data and renders the favorite items on the page.
 * @param {string[]} favoriteIds An array of favorite item IDs.
 */
function renderFavorites(favoriteIds) {
    loadingState.style.display = 'none';

    if (favoriteIds.length === 0) {
        emptyState.classList.remove('hidden');
        favoritesContainer.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    favoritesContainer.classList.remove('hidden');
    favoritesContainer.innerHTML = ''; // Clear previous items

    db.ref('menu').once('value', snapshot => {
        const menuData = snapshot.val();
        if (!menuData) {
            showModal('Error', 'Could not load menu data.');
            return;
        }
        
        let itemsRendered = 0;
        favoriteIds.forEach((favId, index) => {
            let itemFound = false;
            for (const categoryId in menuData) {
                if (menuData[categoryId].items && menuData[categoryId].items[favId]) {
                    const item = menuData[categoryId].items[favId];
                    const card = createFavoriteItemCard(item, categoryId, favId);
                    // Stagger the animation for a nice effect
                    card.style.animationDelay = `${index * 100}ms`;
                    favoritesContainer.appendChild(card);
                    itemFound = true;
                    itemsRendered++;
                    break;
                }
            }
        });

        // If favorite IDs exist but none were found in the menu (e.g., old items)
        if (itemsRendered === 0) {
             emptyState.classList.remove('hidden');
             favoritesContainer.classList.add('hidden');
        }
    });
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    modalOkBtn.addEventListener('click', hideModal);

    // Listen for authentication state changes to decide where to get favorites from
    auth.onAuthStateChanged(user => {
        loadingState.style.display = 'block';
        emptyState.classList.add('hidden');
        favoritesContainer.innerHTML = '';

        if (user && !user.isAnonymous) {
            // Logged-in user: get favorites from Firebase
            db.ref(`users/${user.uid}/favorites`).once('value', snapshot => {
                const favorites = snapshot.exists() ? Object.keys(snapshot.val()) : [];
                renderFavorites(favorites);
            });
        } else {
            // Guest or logged-out user: get favorites from local storage
            const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
            renderFavorites(favorites);
        }
    });
});
