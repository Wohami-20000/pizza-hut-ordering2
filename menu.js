// menu.js - Refactored for a perfect, user-friendly menu with search and scroll-spy.

const dbInstance = firebase.database();
console.log("menu.js: Firebase dbInstance object initialized.");

let menuDataCache = {};
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentLang = localStorage.getItem("lang") || "en";

// --- HTML Element References ---
const tabsContainer = document.getElementById("category-tabs");
const menuContainer = document.getElementById("menu-container");
const cartCountSpan = document.getElementById("cart-count");
const searchBar = document.getElementById("search-bar");
const noResultsMessage = document.getElementById("no-results-message");
const loadingPlaceholder = document.getElementById("loading-placeholder");

// New elements for the sticky summary bar
const cartSummaryBar = document.getElementById('cart-summary-bar');
const summaryCartCountSpan = document.getElementById('summary-cart-count');
const summaryCartTotalSpan = document.getElementById('summary-cart-total');

// New element for back-to-top button
const backToTopBtn = document.getElementById('back-to-top-btn');


// --- Utility ---
function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

// --- Helper Functions (defined early for accessibility) ---

function updateCartCount() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountSpan.textContent = totalItems;
}

// NEW: Function to update the sticky bottom cart summary bar
function updateSummaryBar() {
  let totalItems = 0;
  let totalPrice = 0;

  cart.forEach(item => {
    totalItems += item.quantity;
    totalPrice += item.quantity * item.price;
  });

  summaryCartCountSpan.textContent = totalItems;
  summaryCartTotalSpan.textContent = `${totalPrice.toFixed(2)} MAD`;

  if (totalItems > 0) {
    cartSummaryBar.classList.remove('translate-y-full'); // Show the bar
  } else {
    cartSummaryBar.classList.add('translate-y-full'); // Hide the bar
  }
  if (typeof applyLanguage === 'function') applyLanguage(currentLang, cartSummaryBar); // Re-apply language to new elements
}

// NEW: Function to update the quantity display on a specific menu item card (for +/- buttons)
function updateMenuCardQuantity(itemId) {
  const card = document.getElementById(`item-${itemId}`);
  if (!card) return;

  const existingCartItem = cart.find(cartItem => cartItem.id === itemId);
  const itemQuantity = existingCartItem ? existingCartItem.quantity : 0;

  // Re-render the controls area
  const quantityControlsHTML = itemQuantity > 0 ?
    `<div class="flex items-center justify-between bg-red-600 text-white rounded-full px-2 py-1 w-28 mx-auto sm:mx-0">
      <button class="quantity-btn p-1" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', -1)">
        <i class="fas fa-minus text-sm"></i>
      </button>
      <span class="font-bold text-lg px-2">${itemQuantity}</span>
      <button class="quantity-btn p-1" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, '${escapeHTML(existingCartItem.name)}', ${existingCartItem.price}, '${escapeHTML(existingCartItem.image || '')}')">
        <i class="fas fa-plus text-sm"></i>
      </button>
    </div>`
    :
    `<button class="add-to-cart-btn bg-red-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition-colors w-full sm:w-auto"
      onclick="event.stopPropagation(); window.menuFunctions.addToCart('${itemId}', '${escapeHTML(existingCartItem ? existingCartItem.name : '')}', ${existingCartItem ? existingCartItem.price : 0}, '${escapeHTML(existingCartItem ? existingCartItem.image : '')}')"
      data-translate="add_button">
      <i class="fas fa-plus mr-2"></i> Add
    </button>`;

  const targetDiv = card.querySelector('.self-end'); // Assuming this is the container for add/quantity buttons
  if (targetDiv) {
    targetDiv.innerHTML = quantityControlsHTML;
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, targetDiv); // Re-apply language to new elements
  }
}

// --- Rendering Functions ---

function renderCategoriesTabs(menuObject) {
  tabsContainer.innerHTML = ''; // Clear existing tabs
  if (!menuObject || Object.keys(menuObject).length === 0) {
    tabsContainer.innerHTML = `<p class="p-4 text-gray-500 italic" data-translate="no_categories">No categories available.</p>`;
    return;
  }

  // Create "All" tab first
  const allTab = document.createElement('a');
  allTab.href = '#';
  allTab.className = 'category-tab px-4 py-3 text-center text-gray-700 text-sm sm:text-base whitespace-nowrap border-b-2 border-transparent hover:border-red-400 transition-colors duration-200';
  allTab.textContent = 'All'; // Default text
  allTab.dataset.translate = 'tab_all';
  allTab.onclick = (e) => {
    e.preventDefault();
    // Scroll to the top of the first visible category section
    const firstVisibleSection = document.querySelector('.category-section[style*="display: block"]');
    if (firstVisibleSection) {
      window.scrollTo({
        top: firstVisibleSection.offsetTop - (tabsContainer.offsetHeight + searchBar.offsetHeight + document.querySelector('header').offsetHeight) - 20, // Adjust for sticky headers and some margin
        behavior: 'smooth'
      });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top if no sections are visible
    }

    // Deactivate all other tabs
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active-tab'));
    allTab.classList.add('active-tab'); // Activate 'All' tab
  };
  tabsContainer.appendChild(allTab);


  Object.entries(menuObject).forEach(([categoryId, categoryData]) => {
    const tab = document.createElement('a');
    tab.href = `#category-section-${categoryId}`; // Link to the section
    tab.className = 'category-tab px-4 py-3 text-center text-gray-700 text-sm sm:text-base whitespace-nowrap border-b-2 border-transparent hover:border-red-400 transition-colors duration-200';
    tab.textContent = escapeHTML(categoryData.category);
    tab.dataset.translate = `cat_tab_${categoryData.category.toLowerCase().replace(/\s+/g, '_')}`; // For i18n
    tab.onclick = (e) => {
      e.preventDefault();
      window.menuFunctions.scrollToCategory(categoryId);
      // Manually activate the clicked tab and deactivate others
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active-tab'));
      tab.classList.add('active-tab');
    };
    tabsContainer.appendChild(tab);
  });
  // Initially set the first tab (All or first category) as active
  if (tabsContainer.firstElementChild) {
    tabsContainer.firstElementChild.classList.add('active-tab');
  }

  if (typeof applyLanguage === 'function') applyLanguage(currentLang, tabsContainer);
}

// UPDATED createMenuItemCard function for Glovo-like item display (FIXED toFixed error)
function createMenuItemCard(item, categoryId, itemId) {
  const card = document.createElement('div');
  card.id = `item-${itemId}`; // Add ID for easy targeting
  card.className = 'menu-item-card bg-white rounded-lg shadow-md p-4 flex flex-col justify-between transform transition-transform hover:scale-[1.02] duration-200'; // Existing card styles
  // The card's click leads to item details page (as per your existing setup)
  card.onclick = () => window.menuFunctions.navigateToItemDetails(categoryId, itemId); 

  // Ensure item.price is a number, default to 0 if undefined/null
  const itemPrice = typeof item.price === 'number' ? item.price : 0;

  const existingCartItem = cart.find(cartItem => cartItem.id === itemId);
  const itemQuantity = existingCartItem ? existingCartItem.quantity : 0;

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-shrink-0 w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
        <img src="${escapeHTML(item.image_url || 'https://via.placeholder.com/150?text=No+Image')}" alt="${escapeHTML(item.name || 'No Name')}" class="w-full h-full object-cover">
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-xl font-bold text-gray-800 truncate" data-translate="item_name_${categoryId}_${itemId}">${escapeHTML(item.name || 'Unknown Item')}</h3>
        <p class="text-gray-600 text-sm mt-1 mb-2 line-clamp-2" data-translate="item_desc_${categoryId}_${itemId}">${escapeHTML(item.description || 'No description available.')}</p>
        <div class="text-red-600 font-extrabold text-lg sm:text-xl mt-auto">
          ${itemPrice.toFixed(2)} <span class="text-sm font-semibold">MAD</span>
        </div>
      </div>
    </div>

    <div class="mt-4 self-end">
      ${itemQuantity > 0 ?
        // Item is in cart - show quantity controls
        `<div class="flex items-center justify-between bg-red-600 text-white rounded-full px-2 py-1 w-28 mx-auto sm:mx-0">
          <button class="quantity-btn p-1" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', -1)">
            <i class="fas fa-minus text-sm"></i>
          </button>
          <span class="font-bold text-lg px-2">${itemQuantity}</span>
          <button class="quantity-btn p-1" onclick="event.stopPropagation(); window.menuFunctions.updateItemQuantity('${itemId}', 1, '${escapeHTML(item.name || '')}', ${itemPrice}, '${escapeHTML(item.image_url || '')}')">
            <i class="fas fa-plus text-sm"></i>
          </button>
        </div>`
        :
        // Item not in cart - show "Add" button
        `<button class="add-to-cart-btn bg-red-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition-colors w-full sm:w-auto"
          onclick="event.stopPropagation(); window.menuFunctions.addToCart('${itemId}', '${escapeHTML(item.name || '')}', ${itemPrice}, '${escapeHTML(item.image_url || '')}')"
          data-translate="add_button">
          <i class="fas fa-plus mr-2"></i> Add
        </button>`
      }
    </div>
  `;
  return card;
}

function renderFullMenu(menuObject) {
  if (!menuContainer || !loadingPlaceholder) { console.error("Menu.js: #menu-container or loading placeholder not found."); return; }
  menuContainer.innerHTML = '';
  loadingPlaceholder.classList.add('hidden');

  if (!menuObject || Object.keys(menuObject).length === 0) {
    menuContainer.innerHTML = `<p class="text-gray-600 col-span-full p-4 text-center" data-translate="no_items_in_category">No menu data available.</p>`;
    if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    return;
  }

  Object.entries(menuObject).forEach(([categoryId, categoryData]) => {
    const categorySection = document.createElement('section');
    categorySection.id = `category-section-${categoryId}`;
    categorySection.className = 'category-section mb-12';

    const categoryTitle = document.createElement('h2');
    categoryTitle.className = 'category-title text-3xl sm:text-4xl font-extrabold text-gray-800 mb-6 border-b-4 border-red-600 pb-2';
    categoryTitle.textContent = escapeHTML(categoryData.category);
    categoryTitle.dataset.translate = `cat_title_${categoryData.category.toLowerCase().replace(/\s+/g, '_')}`;
    categorySection.appendChild(categoryTitle);

    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6';

    if (categoryData.items && Object.keys(categoryData.items).length > 0) {
      Object.entries(categoryData.items).forEach(([itemId, itemData]) => {
        if (itemData && typeof itemData === 'object') {
          itemsGrid.appendChild(createMenuItemCard(itemData, categoryId, itemId));
        }
      });
    } else {
      itemsGrid.innerHTML = `<p class="text-gray-600 col-span-full p-4" data-translate="no_items_in_category">No items available in this category yet.</p>`;
    }

    categorySection.appendChild(itemsGrid);
    menuContainer.appendChild(categorySection);
  });
  
  menuContainer.appendChild(noResultsMessage);

  if (typeof applyLanguage === 'function') applyLanguage(currentLang);
}

// --- Search and Filter Functionality ---

function filterMenu() {
    const searchTerm = searchBar.value.toLowerCase().trim();
    const allItemCards = document.querySelectorAll('.menu-item-card');
    let visibleItemsCount = 0;

    allItemCards.forEach(card => {
        const itemName = card.querySelector('h3').textContent.toLowerCase();
        const matches = itemName.includes(searchTerm);
        card.style.display = matches ? 'flex' : 'none'; // Ensure it's flex for the new layout
        if (matches) {
            visibleItemsCount++;
        }
    });
    
    // Hide or show category titles based on visible items
    document.querySelectorAll('.category-section').forEach(section => {
        const visibleItemsInSection = section.querySelectorAll('.menu-item-card[style*="display: flex"]');
        section.style.display = visibleItemsInSection.length > 0 ? 'block' : 'none';
    });

    // Display "no results" message if applicable
    noResultsMessage.style.display = visibleItemsCount === 0 ? 'block' : 'hidden';

    // Update the active tab in the nav bar after filtering
    updateActiveTabOnScroll();
}


// --- Scroll & Navigation Functions ---

function updateActiveTabOnScroll() {
  const scrollPosition = window.scrollY + tabsContainer.offsetHeight + searchBar.offsetHeight + document.querySelector('header').offsetHeight + 20; // Add an offset for sticky headers

  document.querySelectorAll('.category-section').forEach(section => {
    const sectionId = section.id;
    const categoryTab = document.querySelector(`.category-tab[href="#${sectionId}"]`);

    if (categoryTab) {
      if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
        // Only activate if the section is currently displayed (not hidden by search)
        if (window.getComputedStyle(section).display !== 'none') {
          document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active-tab'));
          categoryTab.classList.add('active-tab');
        }
      }
    }
  });

  // Handle "All" tab activation/deactivation
  const allTab = document.querySelector('.category-tab[data-translate="tab_all"]');
  if (allTab) {
      const firstVisibleSection = document.querySelector('.category-section[style*="display: block"]');
      if (!firstVisibleSection || window.scrollY < firstVisibleSection.offsetTop - (tabsContainer.offsetHeight + searchBar.offsetHeight + document.querySelector('header').offsetHeight + 20)) {
          // If no visible sections or scrolled to the very top, activate "All"
          document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active-tab'));
          allTab.classList.add('active-tab');
      }
  }
}


window.menuFunctions = {
  scrollToCategory: (categoryId) => {
    const section = document.getElementById(`category-section-${categoryId}`);
    if (section) {
      const offset = tabsContainer.offsetHeight + searchBar.offsetHeight + document.querySelector('header').offsetHeight;
      window.scrollTo({
        top: section.offsetTop - offset,
        behavior: 'smooth'
      });
    }
  },
  // MODIFIED addToCart to include updateMenuCardQuantity and updateSummaryBar
  addToCart: (itemId, itemName, itemPrice, itemImageURL = '') => {
    const existingItemIndex = cart.findIndex((item) => item.id === itemId);

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += 1;
    } else {
      // Ensure itemPrice is a valid number before adding to cart
      const price = typeof itemPrice === 'number' ? itemPrice : 0;
      cart.push({ id: itemId, name: itemName, price: price, quantity: 1, image: itemImageURL });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount(); // Update header cart count
    updateMenuCardQuantity(itemId); // Update the specific menu card
    updateSummaryBar(); // Update the bottom summary bar
  },
  // navigateToItemDetails is called directly by card.onclick, no changes here
  navigateToItemDetails: (categoryId, itemId) => {
    // This function navigates to the item details page
    // It's already in your provided item-details.html setup and is correctly called
    // by the card.onclick event handler in createMenuItemCard.
    console.log(`Navigating to details for Category: ${categoryId}, Item: ${itemId}`);
    window.location.href = `item-details.html?categoryId=${categoryId}&itemId=${itemId}`;
  },
  // NEW: Function to handle quantity updates from +/- buttons
  updateItemQuantity: (itemId, change, itemName = '', itemPrice = 0, itemImageURL = '') => {
    const existingItemIndex = cart.findIndex(item => item.id === itemId);

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += change;
      if (cart[existingItemIndex].quantity <= 0) {
        cart.splice(existingItemIndex, 1); // Remove if quantity is zero or less
      }
    } else if (change > 0) {
      // If item doesn't exist and change is positive, add it with quantity 1
      // Ensure itemPrice is a valid number before adding to cart
      const price = typeof itemPrice === 'number' ? itemPrice : 0;
      cart.push({ id: itemId, name: itemName, price: price, quantity: 1, image: itemImageURL });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount(); // Update header cart count
    updateMenuCardQuantity(itemId); // Update the specific menu card
    updateSummaryBar(); // Update the bottom summary bar
  }
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateSummaryBar(); // Call on load to ensure bar state is correct
    
    if(searchBar) {
        searchBar.addEventListener('input', filterMenu);
    }
    
    const languageSwitcherMenu = document.getElementById('language-switcher');
    if (languageSwitcherMenu) {
        currentLang = localStorage.getItem("lang") || "en";
        languageSwitcherMenu.value = currentLang;
        languageSwitcherMenu.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('lang', currentLang);
            if (typeof applyLanguage === 'function') {
              applyLanguage(currentLang);
            }
        });
    }

    dbInstance.ref('menu').on('value', snapshot => {
        menuDataCache = snapshot.val() || {};
        console.log("Menu.js: Menu data received:", menuDataCache);
        renderCategoriesTabs(menuDataCache);
        renderFullMenu(menuDataCache);
        updateActiveTabOnScroll();
        // Re-call summary bar update in case data load affects cart state or items are filtered
        updateSummaryBar(); 
        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    }, error => {
        console.error("Menu.js: Firebase /menu listener error:", error);
        if (loadingPlaceholder) loadingPlaceholder.textContent = "Error loading menu. Please try again.";
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            updateActiveTabOnScroll();
            // Show/hide back-to-top button based on scroll position
            if (window.scrollY > 300) { // Show after 300px scroll
                backToTopBtn.style.display = 'flex'; // Use flex for centering
            } else {
                backToTopBtn.style.display = 'none';
            }
        }, 50);
    }, { passive: true });

    // Add click listener for back-to-top button
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});