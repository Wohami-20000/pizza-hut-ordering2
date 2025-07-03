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
    renderFullMenu();
}

/**
 * ---- UPDATED FUNCTION ----
 * Creates an item card with conditional quantity controls.
 */
function createMenuItemCard(item, categoryId, itemId) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.id = `item-card-${itemId}`;
    card.dataset.categoryId = categoryId;
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const isFavorite = favorites.includes(itemId);

    // Get quantities from cart
    const standardItemInCart = cart.find(ci => ci.cartItemId === `${itemId}-standard`);
    const standardQuantity = standardItemInCart ? standardItemInCart.quantity : 0;
    const customizedItems = cart.filter(ci => ci.id === itemId && ci.cartItemId !== `${itemId}-standard`);
    const customizedQuantity = customizedItems.reduce((sum, item) => sum + item.quantity, 0);

    // Determine which controls to show
    let controlsHtml = '';
    if (standardQuantity > 0) {
        controlsHtml = `
            <div class="quantity-controls flex items-center justify-center gap-3">
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', -1, this)">-</button>
                <span class="font-bold text-lg w-8 text-center">${standardQuantity}</span>
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, this)">+</button>
            </div>
        `;
    } else {
        controlsHtml = `
            <button onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, this)" class="w-full bg-yellow-400 text-brand-dark font-bold py-2 px-4 rounded-full hover:bg-yellow-500 transition-all transform hover:scale-105">
                Add
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

        <div class="p-3 pt-0 text-center flex-grow flex flex-col">
            <h3 class="font-semibold text-base text-gray-800 truncate flex-grow" title="${escapeHTML(item.name || 'Unknown Item')}">${escapeHTML(item.name || 'Unknown Item')}</h3>
            <a href="item-details.html?categoryId=${categoryId}&itemId=${itemId}" class="text-xs text-gray-500 hover:text-red-600 transition-colors">Customize</a>
            <p class="text-xl font-extrabold text-red-600 mt-2">${itemPrice.toFixed(2)} MAD</p>
        </div>

        <div class="px-3 pb-4 mt-auto">
            ${controlsHtml}
            ${customizedIndicator}
        </div>
    `;
    return card;
}


function renderFullMenu() {
    const menuContainer = document.getElementById("menu-container");
    const loadingPlaceholder = document.getElementById("loading-placeholder");
    if (!menuContainer || !loadingPlaceholder) {
        console.error("renderFullMenu: Critical elements are missing from the DOM.");
        return;
    }
    if (!menuDataCache || Object.keys(menuDataCache).length === 0) {
        loadingPlaceholder.style.display = 'block';
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
        tab.className = 'category-tab px-5 py-2 text-sm font-semibold whitespace-nowrap';
        tab.textContent = escapeHTML(categoryData.category);
        tab.onclick = (e) => { e.preventDefault(); window.menuFunctions.scrollToCategory(categoryId); };
        tabsContainer.appendChild(tab);
    });
    if (tabsContainer.firstElementChild) tabsContainer.firstElementChild.classList.add('active-tab');
}

function showSlide(index) {
    const slidesWrapper = document.getElementById('slides-wrapper');
    if (!slidesWrapper || !slides.length) return;
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    currentIndex = (index + slides.length) % slides.length;
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
    slidesWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
}

function startSlideshow() {
    stopSlideshow();
    slideInterval = setInterval(() => showSlide(currentIndex + 1), 3000);
}

function stopSlideshow() {
    clearInterval(slideInterval);
}

function renderOffersSlideshow() {
    const slideshowContainer = document.getElementById('offers-slideshow-container');
    const slidesWrapper = document.getElementById('slides-wrapper');
    const dotsContainer = document.getElementById('slides-dots');
    if (!slideshowContainer || !slidesWrapper || !dotsContainer) return;

    dbInstance.ref('offers').on('value', (snapshot) => {
        slidesWrapper.innerHTML = '';
        dotsContainer.innerHTML = '';
        stopSlideshow();
        if (snapshot.exists()) {
            const offersData = snapshot.val();
            slides = [];
            dots = [];
            let offerIndex = 0;
            for (const offerId in offersData) {
                const offer = offersData[offerId];
                const slideElement = document.createElement('a');
                slideElement.href = `item-details.html?offerId=${offerId}`;
                slideElement.className = 'slide';
                slideElement.style.backgroundImage = `url('${escapeHTML(offer.imageURL || '')}')`;
                slideElement.innerHTML = `<div class="slide-content"><h3 class="slide-title">${escapeHTML(offer.name)}</h3></div>`;
                slidesWrapper.appendChild(slideElement);
                slides.push(slideElement);

                const dotElement = document.createElement('div');
                dotElement.className = 'slide-dot';
                dotElement.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showSlide(offerIndex); startSlideshow(); });
                dotsContainer.appendChild(dotElement);
                dots.push(dotElement);
                offerIndex++;
            }
            if (slides.length > 0) {
                showSlide(0);
                startSlideshow();
                slideshowContainer.classList.remove('hidden');
                slideshowContainer.addEventListener('mouseenter', stopSlideshow);
                slideshowContainer.addEventListener('mouseleave', startSlideshow);
            } else {
                slideshowContainer.classList.add('hidden');
            }
        } else {
            slideshowContainer.classList.add('hidden');
        }
    });
}

window.menuFunctions = {
    /**
     * ---- UPDATED FUNCTION ----
     * Handles quantity changes and redraws the card to show correct controls.
     */
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
                cart.push({ cartItemId: `${itemId}-standard`, id: itemId, name: itemData.name, price: itemData.price, quantity: 1, categoryId: categoryId, image_url: itemData.image_url, options: [] });
            }
        } else if (standardItemInCart) {
            standardItemInCart.quantity--;
            if (standardItemInCart.quantity <= 0) {
                cart = cart.filter(i => i.cartItemId !== `${itemId}-standard`);
            }
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartUI();

        // Re-render the specific card that was changed to update its controls
        const newCard = createMenuItemCard(itemData, categoryId, itemId);
        card.parentNode.replaceChild(newCard, card);
        newCard.classList.add('visible'); // Make sure it's visible after re-render
    },
    navigateToItemDetails: (categoryId, itemId) => window.location.href = `item-details.html?categoryId=${categoryId}&itemId=${itemId}`,
    scrollToCategory: (categoryId) => {
        const section = document.getElementById(`category-section-${categoryId}`);
        if (section) window.scrollTo({ top: section.offsetTop - 200, behavior: 'smooth' });
    }
};

function filterMenu() {
    const searchBar = document.getElementById("search-bar");
    const noResultsMessage = document.getElementById("no-results-message");
    if (!searchBar || !noResultsMessage) return;
    const searchTerm = searchBar.value.toLowerCase().trim();
    let hasResults = false;
    document.querySelectorAll('.menu-item-card').forEach(card => {
        const itemName = card.querySelector('h3').textContent.toLowerCase();
        const matches = itemName.includes(searchTerm);
        card.style.display = matches ? 'flex' : 'none';
        if (matches) hasResults = true;
    });
    document.querySelectorAll('.category-section').forEach(section => {
        const visibleItems = section.querySelectorAll('.menu-item-card[style*="display: flex"]');
        section.style.display = visibleItems.length > 0 ? 'block' : 'none';
    });
    noResultsMessage.style.display = hasResults ? 'none' : 'block';
    updateActiveTabOnScroll();
}

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

    if (!guestInfo || !userInfo || !userNameSpan || !authenticatedMenu || !guestMenu) return;

    if (user && !user.isAnonymous) {
        guestInfo.classList.add('hidden');
        userInfo.classList.remove('hidden');
        authenticatedMenu.classList.remove('hidden');
        guestMenu.classList.remove('hidden');

        dbInstance.ref(`users/${user.uid}/name`).once('value').then(snapshot => {
            userNameSpan.textContent = (snapshot.val() || 'Customer');
        }).catch(() => userNameSpan.textContent = 'Customer');
    } 
    else {
        userInfo.classList.add('hidden');
        authenticatedMenu.classList.add('hidden');
        guestMenu.classList.remove('hidden');
        
        const isDineInGuest = user && user.isAnonymous;
        guestInfo.classList.toggle('hidden', isDineInGuest);
    }
}

// --- ROBUST INITIALIZATION LOGIC ---
let isDomReady = false;
let isAuthReady = false;
let initialUser = null;

function initializeApp() {
    if (!isDomReady || !isAuthReady) return;
    
    updateCartUI();
    updateDrawerUI(initialUser);

    dbInstance.ref('menu').on('value', async (snapshot) => {
        menuDataCache = snapshot.val() || {};
        await loadFavorites(initialUser);
        renderCategoriesTabs();
        renderOffersSlideshow(); 
    }, error => console.error("Firebase data error:", error));

    const openDrawerBtn = document.getElementById('open-drawer-btn');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerMenu = document.getElementById('drawer-menu');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const logoutBtn = document.getElementById('logout-btn');
    const searchBar = document.getElementById('search-bar');
    
    if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => { drawerMenu.classList.add('open'); drawerOverlay.classList.remove('hidden'); });
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => { drawerMenu.classList.remove('open'); drawerOverlay.classList.add('hidden'); });
    if (drawerOverlay) drawerOverlay.addEventListener('click', () => { drawerMenu.classList.remove('open'); drawerOverlay.classList.add('hidden'); });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { authInstance.signOut().then(() => { localStorage.clear(); window.location.href = 'auth.html'; }); });
    if (searchBar) searchBar.addEventListener('input', filterMenu);
    
    window.addEventListener('scroll', updateActiveTabOnScroll, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
    isDomReady = true;
    initializeApp();
});

authInstance.onAuthStateChanged((user) => {
    isAuthReady = true;
    initialUser = user;
    initializeApp();
});