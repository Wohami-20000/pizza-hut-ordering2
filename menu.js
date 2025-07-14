// menu.js - Corrected and Robust Version
const dbInstance = firebase.database();
const authInstance = firebase.auth();

let menuDataCache = {};
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let favorites = [];

// --- SLIDESHOW STATE ---
let slideInterval;
let currentIndex = 0;
let slides = [];
let dots = [];
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50; // Min pixels for a swipe to register
const SLIDE_GAP = '1rem'; // MUST match the 'gap' in the CSS style block

const categoryEmojis = {
    "Pair Deals": "🤝",
    "Pizzas": "🍕",
    "Specialties": "⭐",
    "Sides": "🍟",
    "Desserts": "🍰",
    "Drinks": "🥤",
    "Promotions": "🔥"
};

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCountSpan = document.getElementById("cart-count");
    const summaryCartCountSpan = document.getElementById('summary-cart-count');
    const summaryTotalPriceSpan = document.getElementById('summary-total-price');
    const cartSummaryBar = document.getElementById('cart-summary-bar');
    if(cartCountSpan) cartCountSpan.textContent = totalItems;
    if(summaryCartCountSpan) summaryCartCountSpan.textContent = totalItems;
    if(summaryTotalPriceSpan) summaryTotalPriceSpan.textContent = `${totalPrice.toFixed(2)} MAD`;
    if(cartSummaryBar) cartSummaryBar.classList.toggle('translate-y-full', totalItems === 0);
}

async function toggleFavorite(itemId, heartIconEl) {
    const user = authInstance.currentUser;
    const isFavorited = heartIconEl.classList.toggle('active');

    if (user && !user.isAnonymous) {
        const favRef = dbInstance.ref(`users/${user.uid}/favorites/${itemId}`);
        if (isFavorited) {
            await favRef.set(true);
            if (!favorites.includes(itemId)) favorites.push(itemId);
        } else {
            await favRef.remove();
            favorites = favorites.filter(id => id !== itemId);
        }
    } else {
        favorites = isFavorited ? [...new Set([...favorites, itemId])] : favorites.filter(id => id !== itemId);
        localStorage.setItem("favorites", JSON.stringify(favorites));
    }
}

async function loadFavorites(user) {
    if (user && !user.isAnonymous) {
        const favRef = dbInstance.ref(`users/${user.uid}/favorites`);
        const snapshot = await favRef.once('value');
        favorites = snapshot.exists() ? Object.keys(snapshot.val()) : [];
    } else {
        favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    }
}

function createMenuItemCard(item, categoryId, itemId) {
    // Add a class if the item is out of stock
    const isOutOfStock = item.inStock === false;
    const card = document.createElement('div');
    card.className = `menu-item-card ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`;
    card.id = `item-card-${itemId}`;
    card.dataset.categoryId = categoryId;
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const isFavorite = favorites.includes(itemId);

    // Calculate total quantity of this item, including all customized versions
    const totalQuantityInCart = cart.filter(ci => ci.id === itemId).reduce((sum, ci) => sum + ci.quantity, 0);
    
    // Find the standard version specifically for +/- buttons
    const standardItemInCart = cart.find(ci => ci.cartItemId === `${itemId}-standard`);
    const standardQuantity = standardItemInCart ? standardItemInCart.quantity : 0;
    
    // Count only the customized versions for the indicator
    const customizedQuantity = totalQuantityInCart - standardQuantity;

    // Apply 'chosen-card' class if any version of the item is in the cart
    if (totalQuantityInCart > 0) {
        card.classList.add('chosen-card');
    } else {
        card.classList.remove('chosen-card'); // Ensure it's removed if quantity drops to 0
    }
    
    // Disable the button if out of stock
    const addButtonDisabled = isOutOfStock ? 'disabled' : '';
    const addButtonStyle = isOutOfStock ? 'bg-gray-300 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500';

    let controlsHtml = '';
    // If there's at least one standard item, show +/- controls for it
    // Otherwise, show the "Add" button
    if (standardQuantity > 0) {
        controlsHtml = `
            <div class="quantity-controls flex items-center justify-center gap-3">
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', -1, this)">-</button>
                <span class="font-bold text-lg w-8 text-center">${totalQuantityInCart}</span>
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, this)">+</button>
            </div>
        `;
    } else {
        controlsHtml = `
            <button onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, this)" 
                    class="w-full text-brand-dark font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105 ${addButtonStyle}" ${addButtonDisabled}>
                ${isOutOfStock ? 'Out of Stock' : 'Add'}
            </button>
        `;
    }

    const customizedIndicator = customizedQuantity > 0
        ? `<div class="text-xs text-center text-red-600 font-semibold mt-1">+${customizedQuantity} customized</div>`
        : '';
        
    card.innerHTML = `
        <button onclick="event.stopPropagation(); toggleFavorite('${itemId}', this.querySelector('i'))" class="absolute top-2 right-2 z-10 bg-white rounded-full h-8 w-8 flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors">
            <i class="fas fa-heart fav-icon text-lg ${isFavorite ? 'active' : ''}"></i>
        </button>
        <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="block cursor-pointer group">
            <div class="p-4 bg-white rounded-t-xl">
                 <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}" class="w-full h-32 object-contain transition-transform duration-300 group-hover:scale-105">
            </div>
        </a>
        <div class="p-3 pt-0 text-center flex-grow flex flex-col justify-center">
            <h3 class="font-semibold text-base text-gray-800 truncate" title="${escapeHTML(item.name || 'Unknown Item')}">${escapeHTML(item.name || 'Unknown Item')}</h3>
            <div class="my-2">
                <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="inline-block text-xs bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-full hover:bg-gray-300 transition-colors">Customize</a>
            </div>
            <p class="text-xl font-extrabold text-red-600">${itemPrice.toFixed(2)} MAD</p>
        </div>
        <div class="px-3 pb-4 mt-auto">
            ${controlsHtml}
            ${customizedIndicator}
        </div>
    `;
    return card;
}


function showSlide(index) {
    if (!slides.length) return;
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    const slidesWrapper = document.getElementById('slides-wrapper');
    if(slidesWrapper) {
        slidesWrapper.style.transform = `translateX(calc(-${index} * 100% - ${index} * ${SLIDE_GAP}))`;
    }

    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');

    dots.forEach(dot => dot.classList.remove('active'));
    dots[index].classList.add('active');

    currentIndex = index;
}

function startSlideshow() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        showSlide(currentIndex + 1);
    }, 5000);
}

function renderOffersSlideshow() {
    const slideshowContainer = document.getElementById('offers-slideshow-container');
    const slidesWrapper = document.getElementById('slides-wrapper');
    const slidesDots = document.getElementById('slides-dots');

    if (!slideshowContainer || !slidesWrapper || !slidesDots) return;

    dbInstance.ref('offers').once('value').then(snapshot => {
        if (!snapshot.exists()) {
            slideshowContainer.classList.add('hidden');
            return;
        }

        const offers = snapshot.val();
        slidesWrapper.innerHTML = '';
        slidesDots.innerHTML = '';
        slides = [];
        dots = [];
        let offerKeys = Object.keys(offers);

        offerKeys.forEach((key, index) => {
            const offer = offers[key];
            if (offer.imageURL && offer.name) {
                const slide = document.createElement('a');
                slide.href = `item-details.html?offerId=${key}`;
                slide.className = 'slide';

                slide.innerHTML = `
                    <img src="${escapeHTML(offer.imageURL)}" alt="${escapeHTML(offer.name)}" class="slide-image">
                    <div class="slide-content">
                        <h2 class="slide-title">${escapeHTML(offer.name)}</h2>
                    </div>
                `;
                slidesWrapper.appendChild(slide);
                slides.push(slide);

                const dot = document.createElement('div');
                dot.className = 'slide-dot';
                dot.addEventListener('click', () => {
                    showSlide(index);
                    startSlideshow();
                });
                slidesDots.appendChild(dot);
                dots.push(dot);
            }
        });

        if (slides.length > 0) {
            slideshowContainer.classList.remove('hidden');
            showSlide(0);
            startSlideshow();
        } else {
            slideshowContainer.classList.add('hidden');
        }
    }).catch(error => {
        console.error("Error fetching offers for slideshow:", error);
        slideshowContainer.classList.add('hidden');
    });
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const swipeDistance = touchEndX - touchStartX;
    if (swipeDistance > swipeThreshold) {
        showSlide(currentIndex - 1);
        startSlideshow();
    } else if (swipeDistance < -swipeThreshold) {
        showSlide(currentIndex + 1);
        startSlideshow();
    }
}

function renderFullMenu() {
    const menuContainer = document.getElementById("menu-container");
    const loadingPlaceholder = document.getElementById("loading-placeholder");

    if (!menuContainer || !loadingPlaceholder) {
        return;
    }
    if (!menuDataCache || Object.keys(menuDataCache).length === 0) {
        loadingPlaceholder.style.display = 'block';
        menuContainer.innerHTML = '';
        return;
    }
    loadingPlaceholder.style.display = 'none';
    menuContainer.innerHTML = '';
    let itemRenderDelay = 0;

    Object.entries(menuDataCache).forEach(([categoryId, categoryData]) => {
        const section = document.createElement('section');
        section.className = 'category-section mb-12';
        section.id = `category-section-${categoryId}`;
        const title = document.createElement('h2');
        title.className = 'text-3xl font-extrabold text-gray-800 mb-6 initial-hidden animate-fadeInUp';
        title.style.animationDelay = `${itemRenderDelay}ms`;
        itemRenderDelay += 100;
        title.textContent = escapeHTML(categoryData.category);
        section.appendChild(title);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

        if (categoryData.items) {
            Object.entries(categoryData.items).forEach(([itemId, itemData]) => {
                const card = createMenuItemCard(itemData, categoryId, itemId);
                card.style.transitionDelay = `${itemRenderDelay}ms`;
                itemsContainer.appendChild(card);
                setTimeout(() => card.classList.add('visible'), 50);
                itemRenderDelay += 50;
            });
        }
        section.appendChild(itemsContainer);
        menuContainer.appendChild(section);
    });

    const noResultsMessage = document.getElementById("no-results-message");
    if (noResultsMessage) menuContainer.appendChild(noResultsMessage);
}

function renderCategoriesTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';
    if (!menuDataCache) return;

    Object.entries(menuDataCache).forEach(([categoryId, categoryData]) => {
        const tab = document.createElement('a');
        tab.href = `#category-section-${categoryId}`;
        tab.className = 'category-tab px-4 py-2 text-sm font-semibold whitespace-nowrap flex items-center gap-2';

        const categoryName = escapeHTML(categoryData.category);
        const emoji = categoryEmojis[categoryName] || '🍽️';

        tab.innerHTML = `<span>${emoji}</span> <span>${categoryName}</span>`;
        tab.onclick = (e) => {
            e.preventDefault();
            window.menuFunctions.scrollToCategory(categoryId);
        };
        tabsContainer.appendChild(tab);
    });

    const firstCategoryTab = tabsContainer.querySelector('.category-tab');
    if (firstCategoryTab) {
        firstCategoryTab.classList.add('active-tab');
    }
}


window.menuFunctions = {
    updateItemQuantity: (itemId, change, buttonElement) => {
        const card = buttonElement.closest('.menu-item-card');
        if (!card) return;
        const categoryId = card.dataset.categoryId;
        const itemData = menuDataCache[categoryId]?.items?.[itemId];
        if (!itemData) return;

        let standardItemInCart = cart.find(i => i.cartItemId === `${itemId}-standard`);

        if (change > 0) {
            if (standardItemInCart) {
                standardItemInCart.quantity++;
            } else {
                // Add a new standard item if none exists
                cart.push({
                    cartItemId: `${itemId}-standard`, // Unique ID for standard item
                    id: itemId,
                    name: itemData.name,
                    price: itemData.price,
                    quantity: 1,
                    categoryId: categoryId,
                    image_url: itemData.image_url,
                    options: [], // Standard item has no options
                    sizes: itemData.sizes ? [itemData.sizes[0]] : [], // Default to first size if available
                    recipes: itemData.recipes ? [itemData.recipes[0]] : [] // Default to first recipe if available
                });
            }
        } else if (standardItemInCart) {
            standardItemInCart.quantity--;
            if (standardItemInCart.quantity <= 0) {
                cart = cart.filter(i => i.cartItemId !== `${itemId}-standard`);
            }
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartUI();

        // Re-render the specific card to reflect the updated quantity (standard + customized)
        const newCard = createMenuItemCard(itemData, categoryId, itemId);
        card.parentNode.replaceChild(newCard, card);
        newCard.classList.add('visible'); // Ensure it animates in correctly
    },
    navigateToItemDetails: (categoryId, itemId) => window.location.href = `item-details.html?categoryId=${categoryId}&itemId=${itemId}`,
    scrollToCategory: (categoryId) => {
        const section = document.getElementById(`category-section-${categoryId}`);
        if (section) window.scrollTo({ top: section.offsetTop - 200, behavior: 'smooth' });
    }
};

function updateActiveTabOnScroll() {
    const scrollPosition = window.scrollY + 201;
    let activeSectionFound = false;
    document.querySelectorAll('.category-section').forEach(section => {
        if (!activeSectionFound && section.style.display !== 'none' && section.offsetTop <= scrollPosition && section.offsetTop + section.offsetHeight > scrollPosition) {
            document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active-tab'));
            const activeTab = document.querySelector(`.category-tab[href="#${section.id}"]`);
            if (activeTab) {
                activeTab.classList.add('active-tab');
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            activeSectionFound = true;
        }
    });
}

function updateDrawerUI(user) {
    const guestInfo = document.getElementById('guest-info-drawer');
    const userInfo = document.getElementById('user-info-drawer');
    const userNameSpan = document.getElementById('user-name-drawer');
    const authenticatedMenu = document.getElementById('authenticated-menu');
    const guestMenu = document.getElementById('guest-menu');
    const logoutSection = document.getElementById('logout-section');


    if (!guestInfo || !userInfo || !userNameSpan || !authenticatedMenu || !guestMenu || !logoutSection) return;

    if (user && !user.isAnonymous) {
        guestInfo.classList.add('hidden');
        userInfo.classList.remove('hidden');
        authenticatedMenu.classList.remove('hidden');
        guestMenu.classList.remove('hidden');
        logoutSection.classList.remove('hidden');

        dbInstance.ref(`users/${user.uid}/name`).once('value').then(snapshot => {
            userNameSpan.textContent = (snapshot.val() || 'Customer');
        }).catch(() => userNameSpan.textContent = 'Customer');
    }
    else {
        userInfo.classList.add('hidden');
        authenticatedMenu.classList.add('hidden');
        logoutSection.classList.add('hidden');
        guestMenu.classList.remove('hidden');
        
        const isDineInGuest = user && user.isAnonymous;
        guestInfo.classList.toggle('hidden', isDineInGuest);
    }
}

// --- ROBUST INITIALIZATION LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    const openDrawerBtn = document.getElementById('open-drawer-btn');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerMenu = document.getElementById('drawer-menu');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const logoutBtn = document.getElementById('logout-btn');
    const slidesWrapper = document.getElementById('slides-wrapper');
    
    if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => { drawerMenu.classList.add('open'); drawerOverlay.classList.remove('hidden'); });
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => { drawerMenu.classList.remove('open'); drawerOverlay.classList.add('hidden'); });
    if (drawerOverlay) drawerOverlay.addEventListener('click', () => { drawerMenu.classList.remove('open'); drawerOverlay.classList.add('hidden'); });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { authInstance.signOut().then(() => { localStorage.clear(); window.location.href = 'auth.html'; }); });
    
    if (slidesWrapper) {
        slidesWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
        slidesWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    window.addEventListener('scroll', updateActiveTabOnScroll, { passive: true });

    authInstance.onAuthStateChanged((user) => {
        updateDrawerUI(user);

        dbInstance.ref('menu').on('value', async (snapshot) => {
            menuDataCache = snapshot.val() || {};
            await loadFavorites(user); 
            renderCategoriesTabs();
            renderOffersSlideshow(); 
            renderFullMenu(); 
        }, error => console.error("Firebase data error:", error));
    });
});
// End of menu.js
