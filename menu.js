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

function createMenuItemCard(item, categoryId, itemId) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.id = `item-card-${itemId}`;
    card.dataset.categoryId = categoryId;
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const totalQuantityInCart = cart.filter(ci => ci.id === itemId).reduce((sum, ci) => sum + ci.quantity, 0);
    const isFavorite = favorites.includes(itemId);
    card.innerHTML = `
        <div class="item-content-left flex flex-col">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-bold text-gray-800 pr-2">${escapeHTML(item.name || 'Unknown Item')}</h3>
                <i class="fas fa-heart fav-icon text-xl ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${itemId}', this)"></i>
            </div>
            <p class="text-gray-500 text-sm mt-1 mb-3 flex-grow">${escapeHTML(item.description || '')}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="text-xl font-extrabold text-gray-900">${itemPrice.toFixed(2)} MAD</span>
                <button class="customize-btn font-semibold" onclick="event.stopPropagation(); window.menuFunctions.navigateToItemDetails('${categoryId}', '${itemId}')">Customize</button>
            </div>
        </div>
        <div class="item-image-right flex flex-col items-center justify-between">
            <img src="${escapeHTML(item.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png')}" alt="${escapeHTML(item.name || 'Pizza')}">
            <div class="quantity-controls flex items-center gap-3 mt-2">
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', -1, this)">-</button>
                <span class="font-bold text-lg w-8 text-center">${totalQuantityInCart}</span>
                <button class="quantity-btn" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, this)">+</button>
            </div>
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
        itemsContainer.className = 'space-y-4';
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

// --- SLIDESHOW LOGIC ---
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
    updateItemQuantity: (itemId, change, buttonElement) => {
        const card = buttonElement.closest('.menu-item-card');
        const categoryId = card.dataset.categoryId;
        const itemData = menuDataCache[categoryId]?.items?.[itemId];
        if (!itemData) return;
        let standardItemInCart = cart.find(i => i.id === itemId && !i.options);
        if (change > 0) {
            if (standardItemInCart) standardItemInCart.quantity++;
            else cart.push({ cartItemId: itemId + '-standard', id: itemId, name: itemData.name, price: itemData.price, quantity: 1, categoryId: categoryId, image_url: itemData.image_url });
        } else if (standardItemInCart) {
            standardItemInCart.quantity--;
            if (standardItemInCart.quantity <= 0) cart = cart.filter(i => i.cartItemId !== standardItemInCart.cartItemId);
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartUI();
        const totalQuantity = cart.filter(i => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0);
        card.querySelector('.quantity-controls span').textContent = totalQuantity;
    },
    navigateToItemDetails: (categoryId, itemId) => window.location.href = `item-details.html?categoryId=${categoryId}&itemId=${itemId}`,
    scrollToCategory: (categoryId) => {
        const section = document.getElementById(`category-section-${categoryId}`);
        if (section) window.scrollTo({ top: section.offsetTop - 140, behavior: 'smooth' });
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
        card.style.display = matches ? 'grid' : 'none';
        if (matches) hasResults = true;
    });
    document.querySelectorAll('.category-section').forEach(section => {
        const visibleItems = section.querySelectorAll('.menu-item-card[style*="display: grid"]');
        section.style.display = visibleItems.length > 0 ? 'block' : 'none';
    });
    noResultsMessage.style.display = hasResults ? 'none' : 'block';
    updateActiveTabOnScroll();
}

function updateActiveTabOnScroll() {
    const scrollPosition = window.scrollY + 141;
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

/**
 * NEW AND IMPROVED DRAWER UI LOGIC
 * This function now handles all user states:
 * 1. Logged-in full user
 * 2. Guest user (anonymous)
 * 3. Not logged in at all
 */
function updateDrawerUI(user) {
    const guestInfo = document.getElementById('guest-info-drawer');
    const userInfo = document.getElementById('user-info-drawer');
    const userNameSpan = document.getElementById('user-name-drawer');
    const authenticatedMenu = document.getElementById('authenticated-menu');
    const guestMenu = document.getElementById('guest-menu');

    if (!guestInfo || !userInfo || !userNameSpan || !authenticatedMenu || !guestMenu) return;

    // --- Case 1: Full Logged-in User ---
    if (user && !user.isAnonymous) {
        guestInfo.classList.add('hidden'); // Hide the "Login/Signup" prompt
        userInfo.classList.remove('hidden'); // Show the user's name
        authenticatedMenu.classList.remove('hidden'); // Show the full menu
        guestMenu.classList.remove('hidden'); // The "Help" section is shared

        dbInstance.ref(`users/${user.uid}/name`).once('value').then(snapshot => {
            userNameSpan.textContent = (snapshot.val() || 'Customer');
        }).catch(() => userNameSpan.textContent = 'Customer');
    } 
    // --- Case 2: Guest (Anonymous) or No User ---
    else {
        userInfo.classList.add('hidden'); // Hide user-specific info
        authenticatedMenu.classList.add('hidden'); // Hide the authenticated menu
        guestMenu.classList.remove('hidden'); // Show the shared "Help" menu
        
        // If they are a dine-in guest, we don't need to ask them to log in.
        // If they are not logged in at all, we show the login prompt.
        const isDineInGuest = user && user.isAnonymous;
        guestInfo.classList.toggle('hidden', isDineInGuest);
    }
}

// --- ROBUST INITIALIZATION LOGIC ---
let isDomReady = false;
let isAuthReady = false;
let initialUser = null;

function initializeApp() {
    // This function will only run when both DOM is ready and Firebase Auth has been checked
    if (!isDomReady || !isAuthReady) return;
    
    updateCartUI();
    updateDrawerUI(initialUser);

    dbInstance.ref('menu').on('value', async (snapshot) => {
        menuDataCache = snapshot.val() || {};
        await loadFavorites(initialUser); // Load favorites based on the initial user
        renderCategoriesTabs();
        renderOffersSlideshow(); 
    }, error => console.error("Firebase data error:", error));

    // Setup event listeners for UI elements
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

// Listener for DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    isDomReady = true;
    initializeApp(); // Try to initialize
});

// Listener for Auth Ready
authInstance.onAuthStateChanged((user) => {
    isAuthReady = true;
    initialUser = user;
    initializeApp(); // Try to initialize
});