// menu.js - Updated to display more item details and link to item-details.html

const dbInstance = firebase.database();
console.log("menu.js: Firebase dbInstance object initialized.");

let menuDataCache = {}; 
let currentActiveCategoryId = null;
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentLang = localStorage.getItem("lang") || "en";

// --- HTML Element References ---
const tabsContainer = document.getElementById("category-tabs");
const menuGrid = document.getElementById("menu-grid");
const cartBtn = document.getElementById("cart-btn"); 
const cartCountSpan = document.getElementById("cart-count");
const categoryTitleH2 = document.getElementById("category-title-h2");

// --- Utility ---
function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

// --- Rendering Functions ---
function renderCategoriesTabs(menuObject) {
  if (!tabsContainer) { console.error("Menu.js: #category-tabs not found."); return; }
  tabsContainer.innerHTML = ''; 

  if (!menuObject || Object.keys(menuObject).length === 0) {
    tabsContainer.innerHTML = `<p class="p-4 text-gray-500 italic" data-translate="no_categories_available">No categories available.</p>`;
    if (categoryTitleH2 && typeof translations !== 'undefined' && translations[currentLang]) {
        categoryTitleH2.textContent = translations[currentLang]?.no_categories_available || "No categories available";
    } else if (categoryTitleH2) {
        categoryTitleH2.textContent = "No categories available";
    }
    if (menuGrid) menuGrid.innerHTML = ''; 
    if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    return;
  }

  let firstCategoryId = null;
  let isFirstTab = true;

  Object.entries(menuObject).forEach(([categoryId, categoryData]) => {
    if (isFirstTab) {
        firstCategoryId = categoryId;
        isFirstTab = false;
    }
    if (!categoryData || !categoryData.category) return;
    
    const tabButton = document.createElement('button');
    tabButton.className = 'category-tab whitespace-nowrap py-3 px-5 text-sm sm:text-base font-medium text-gray-500 hover:text-red-600 hover:border-red-600 border-b-2 border-transparent focus:outline-none transition-colors duration-150 ease-in-out';
    tabButton.textContent = escapeHTML(categoryData.category);
    tabButton.dataset.translate = `cat_${categoryData.category.toLowerCase().replace(/\s+/g, '_')}`; // For translation key
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', 'false');
    tabButton.onclick = () => window.menuFunctions.selectCategory(categoryId, tabButton);
    tabsContainer.appendChild(tabButton);
  });
  
  if (typeof applyLanguage === 'function') applyLanguage(currentLang); // Translate newly added tabs

  // Automatically select and render the first category if no category is currently active or if current is invalid
  if (firstCategoryId && (!currentActiveCategoryId || !menuObject[currentActiveCategoryId])) {
    currentActiveCategoryId = firstCategoryId; // Update the global active ID
    const firstTabElement = tabsContainer.querySelector('.category-tab'); // Get the first rendered tab
    if (firstTabElement) { // Ensure the element exists before trying to click
        window.menuFunctions.selectCategory(firstCategoryId, firstTabElement);
    } else {
        console.warn("Menu.js: First category tab element not found for auto-selection.");
        renderMenuItems(firstCategoryId); // Attempt to render items anyway
    }
  } else if (currentActiveCategoryId && menuObject[currentActiveCategoryId]) {
    // If a category was active and still exists, re-apply active style and render items
    const activeTabElement = Array.from(tabsContainer.querySelectorAll('.category-tab')).find(tab => tab.textContent === menuObject[currentActiveCategoryId].category);
    if(activeTabElement) window.menuFunctions.selectCategory(currentActiveCategoryId, activeTabElement);
    else renderMenuItems(currentActiveCategoryId); // Fallback if tab not found but ID is valid
  } else if (categoryTitleH2 && Object.keys(menuObject).length > 0){ // A category exists, but none were active
    const firstCatId = Object.keys(menuObject)[0];
    const firstTabElement = tabsContainer.querySelector('.category-tab');
    window.menuFunctions.selectCategory(firstCatId, firstTabElement);
  }
}

function renderMenuItems(categoryId) {
  if (!menuGrid) { console.error("Menu.js: #menu-grid not found."); return; }
  if (!categoryTitleH2) { console.warn("Menu.js: #category-title-h2 not found."); }
  
  menuGrid.innerHTML = ''; 
  currentActiveCategoryId = categoryId; 

  const categoryData = menuDataCache[categoryId];
  if (!categoryData) {
    if (categoryTitleH2) categoryTitleH2.textContent = "Category Not Found";
    menuGrid.innerHTML = `<p class="text-gray-600 col-span-full p-4" data-translate="category_not_found">Selected category data is missing.</p>`;
    if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    return;
  }

  if (categoryTitleH2) {
    categoryTitleH2.textContent = escapeHTML(categoryData.category);
    categoryTitleH2.dataset.translate = `cat_title_${categoryData.category.toLowerCase().replace(/\s+/g, '_')}`;
  }

  // As per user: We are not focusing on Pizza specific subcategory display in this step.
  // All categories will attempt to render items generically.
  if (categoryData.items && Object.keys(categoryData.items).length > 0) {
    Object.entries(categoryData.items).forEach(([itemIdFromKey, itemData]) => {
      const itemId = itemData.id || itemIdFromKey; // Prefer item.id if present
      if(itemData && typeof itemData === 'object') { 
        menuGrid.appendChild(createMenuItemCard(itemData, categoryId, itemId));
      } else {
        console.warn(`Menu.js: Item data for key ${itemIdFromKey} in category ${categoryId} is invalid or not an object:`, itemData);
      }
    });
  } else {
    menuGrid.innerHTML = `<p class="text-gray-600 col-span-full p-4 text-center" data-translate="no_items_in_category">No items available in this category yet.</p>`;
  }
  if (typeof applyLanguage === 'function') applyLanguage(currentLang);
}

function createMenuItemCard(item, categoryId, itemId) {
  const itemCard = document.createElement("div");
  itemCard.className = "menu-item-card bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-shadow duration-300 ease-in-out group";
  itemCard.dataset.categoryId = categoryId; 
  itemCard.dataset.itemId = itemId; 

  const itemName = item.name ? escapeHTML(item.name) : 'Unnamed Item';
  const itemPrice = item.price !== undefined && !isNaN(parseFloat(item.price)) ? parseFloat(item.price).toFixed(2) : '0.00';
  const itemShortDescription = item.shortDesc || item.desc || 'Tap for more details!'; 
  const itemImageURL = item.imageURL || ''; // Ensure imageURL is defined

  const imagePlaceholder = '<div class="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400 rounded-t-xl"><i class="fas fa-image text-4xl"></i></div>';
  const imageHTML = itemImageURL 
    ? `<img src="${escapeHTML(itemImageURL)}" alt="${itemName}" class="w-full h-48 object-cover rounded-t-xl group-hover:scale-105 transition-transform duration-300 ease-in-out">`
    : imagePlaceholder;
  
  itemCard.innerHTML = `
    <div class="relative" onclick="window.menuFunctions.navigateToItemDetails('${categoryId}', '${itemId}')">
      ${imageHTML}
    </div>
    <div class="p-4 sm:p-5 flex flex-col flex-grow">
      <h3 class="text-md sm:text-lg font-bold text-red-700 mb-1 truncate group-hover:text-red-800 transition-colors cursor-pointer" title="${itemName}" onclick="window.menuFunctions.navigateToItemDetails('${categoryId}', '${itemId}')">${itemName}</h3>
      <p class="text-xs text-gray-600 mb-3 flex-grow min-h-[40px] leading-relaxed">${escapeHTML(itemShortDescription)}</p>
      <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
        <span class="text-lg sm:text-xl font-bold text-gray-900">${itemPrice} MAD</span>
        <button 
          class="add-to-cart-btn bg-red-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition text-xs sm:text-sm font-semibold shadow-md"
          onclick="event.stopPropagation(); window.menuFunctions.addToCart('${itemId}', '${itemName}', ${parseFloat(item.price || 0)}, '${escapeHTML(itemImageURL)}')">
          <i class="fas fa-cart-plus mr-1 sm:mr-1.5"></i><span data-translate="add_to_cart">Add to Cart</span>
        </button>
      </div>
    </div>
  `;
  return itemCard;
}

// --- Cart & Category Selection ---
window.menuFunctions = {
  ...(window.menuFunctions || {}),
  addToCart: (itemId, itemName, itemPrice, itemImageURL = '') => {
    console.log("Menu.js: addToCart for item:", itemName, "ID:", itemId, "Price:", itemPrice, "Img:", itemImageURL);
    if (typeof itemPrice !== 'number' || isNaN(itemPrice)) {
        alert("Cannot add item: price error."); return;
    }
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    if (existingItemIndex > -1) cart[existingItemIndex].qty++;
    else cart.push({ id: itemId, name: itemName, price: itemPrice, qty: 1, imageURL: itemImageURL });
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    const buttons = document.querySelectorAll(`.menu-item-card[data-item-id="${itemId}"] .add-to-cart-btn`);
    buttons.forEach(button => {
        const originalTextEl = button.querySelector('span');
        const originalTextKey = originalTextEl ? originalTextEl.dataset.translate : 'add_to_cart';
        const addedText = (typeof translations !== 'undefined' && translations[currentLang]?.added_to_cart_feedback) || 'Added!';
        button.innerHTML = `<i class="fas fa-check mr-1.5"></i> ${addedText}`;
        button.disabled = true;
        setTimeout(() => {
            const cartText = (typeof translations !== 'undefined' && translations[currentLang]?.[originalTextKey]) || "Add to Cart";
            button.innerHTML = `<i class="fas fa-cart-plus mr-1.5"></i><span data-translate="${originalTextKey}">${cartText}</span>`;
            button.disabled = false;
        }, 1200);
    });
  },
  selectCategory: (categoryId, clickedTabElement) => {
    console.log("Menu.js: selectCategory called for ID:", categoryId);
    currentActiveCategoryId = categoryId;
    document.querySelectorAll("#category-tabs .category-tab").forEach(tab => {
        tab.classList.remove("text-red-700", "border-red-700", "font-semibold", "active-tab");
        tab.classList.add("text-gray-500", "hover:text-red-600", "hover:border-red-600", "border-transparent");
        tab.setAttribute('aria-selected', 'false');
    });
    if (clickedTabElement) {
        clickedTabElement.classList.add("text-red-700", "border-red-700", "font-semibold", "active-tab");
        clickedTabElement.classList.remove("text-gray-500", "border-transparent");
        clickedTabElement.setAttribute('aria-selected', 'true');
    }
    renderMenuItems(categoryId);
  },
  navigateToItemDetails: (categoryId, itemId) => {
    console.log(`Menu.js: Navigating to details page for item ID: ${itemId}, category ID: ${categoryId}`);
    window.location.href = `item-details.html?categoryId=${categoryId}&itemId=${itemId}`;
  }
};

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  if (cartCountSpan) cartCountSpan.textContent = count;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Menu.js: DOMContentLoaded event fired.");
    updateCartCount(); 

    const languageSwitcherMenu = document.getElementById('language-switcher');
    if (languageSwitcherMenu) {
        if (typeof applyLanguage === 'function' && typeof translations !== 'undefined') {
            currentLang = localStorage.getItem("lang") || "en";
            languageSwitcherMenu.value = currentLang;
        } else {
            console.warn("Menu.js: applyLanguage function or translations missing. Make sure lang.js is loaded before menu.js.");
        }
        
        languageSwitcherMenu.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('lang', currentLang);
            if (typeof applyLanguage === 'function') applyLanguage(currentLang); 
            renderCategoriesTabs(menuDataCache); 
            if (currentActiveCategoryId) renderMenuItems(currentActiveCategoryId);
            else if (categoryTitleH2 && typeof translations !== 'undefined' && translations[currentLang]) {
                categoryTitleH2.textContent = translations[currentLang]?.select_category_prompt || "Select a category";
            }
        });
    } else {
        console.warn("Menu.js: language-switcher not found.");
    }
    
    dbInstance.ref('menu').on('value', snapshot => {
        menuDataCache = snapshot.val() || {};
        console.log("Menu.js: Menu data received/updated:", menuDataCache);
        // If currentActiveCategoryId is null or no longer valid, renderCategoriesTabs will select the first one
        if (!currentActiveCategoryId || !menuDataCache[currentActiveCategoryId]) {
            currentActiveCategoryId = null; // Reset if invalid
        }
        renderCategoriesTabs(menuDataCache); 
        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    }, error => {
        console.error("Menu.js: Firebase /menu listener error:", error);
        if (menuGrid) menuGrid.innerHTML = "<p>Error loading menu. Please try again.</p>";
        if (categoryTitleH2) categoryTitleH2.textContent = "Error Loading Menu";
    });

    if (cartBtn) cartBtn.onclick = () => window.location.href = "cart.html";
});