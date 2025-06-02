// menu.js (Updated to fetch from Firebase and handle object structures for items)

// Get references to HTML elements
const tabsContainer = document.getElementById("category-tabs");
const menuGrid = document.getElementById("menu-grid");
const cartBtn = document.getElementById("cart-btn");
const cartCountSpan = document.getElementById("cart-count");

// Global variables to store menu data and current state
let fullMenuData = []; // This will hold the menu from Firebase as an ARRAY of categories
let activeCategoryName = ""; // Name of the currently active category
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Helper function to prevent naughty code in names/descriptions
function escapeHTML(str) {
  if (typeof str !== 'string') {
    return str !== null && str !== undefined ? String(str) : '';
  }
  return str.replace(/[&<>"']/g, function (match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

// --- Firebase Listener: Get the menu from the magic whiteboard! ---
try {
  if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined') {
    throw new Error("Firebase is not initialized. Make sure firebase.js is loaded before menu.js and configured correctly.");
  }
  const db = firebase.database(); // Get Firebase database instance

  db.ref('menu').on('value', (snapshot) => {
    const firebaseMenuData = snapshot.val();
    console.log("Customer Menu: Raw data from Firebase /menu:", firebaseMenuData); 

    if (firebaseMenuData) {
      if (typeof firebaseMenuData === 'object' && !Array.isArray(firebaseMenuData)) {
        fullMenuData = Object.values(firebaseMenuData);
        console.log("Customer Menu: Converted menu object to array:", fullMenuData);
      } else if (Array.isArray(firebaseMenuData)) {
        fullMenuData = firebaseMenuData;
        console.log("Customer Menu: Menu is already an array:", fullMenuData);
      } else {
        console.error("Customer Menu: Menu data from Firebase is not a recognized format (object or array).");
        fullMenuData = [];
      }

      if (fullMenuData.length > 0) {
        const categoryNames = fullMenuData.map(c => c.category).filter(name => typeof name === 'string');
        if (!activeCategoryName || !categoryNames.includes(activeCategoryName)) {
          activeCategoryName = categoryNames[0] || ""; 
        }
      } else {
        activeCategoryName = "";
        if (tabsContainer) tabsContainer.innerHTML = "<p data-translate='menu_empty'>Menu is currently empty.</p>";
      }
    } else {
      console.warn("Customer Menu: No menu data found in Firebase at '/menu'.");
      fullMenuData = [];
      activeCategoryName = "";
      if (tabsContainer) tabsContainer.innerHTML = "<p data-translate='menu_unavailable'>Menu not available.</p>";
    }
    renderTabs();
    renderMenu();
    if (typeof updateCartCount === 'function') updateCartCount();

  }, (error) => {
    console.error("Customer Menu: Error fetching menu data from Firebase:", error);
    if (tabsContainer) tabsContainer.innerHTML = "<p data-translate='menu_error_loading'>Error loading menu. Please try again later.</p>";
    if (menuGrid) menuGrid.innerHTML = "";
  });
} catch (e) {
  console.error("Customer Menu: Firebase setup error:", e);
  if (tabsContainer) tabsContainer.innerHTML = "<p data-translate='menu_error_critical'>Critical error: Firebase not set up for menu.</p>";
  if (menuGrid) menuGrid.innerHTML = "";
}


// --- Category Tabs ---
function renderTabs() {
  if (!tabsContainer) return;
  tabsContainer.innerHTML = ""; 
  if (!fullMenuData || fullMenuData.length === 0) {
    return;
  }

  const categoryNames = fullMenuData.map(c => c.category).filter(name => typeof name === 'string');

  categoryNames.forEach(catName => {
    const btn = document.createElement("button");
    btn.className = "flex-shrink-0 px-3 py-2 mx-1 rounded-t text-base sm:text-lg whitespace-nowrap " +
      (activeCategoryName === catName ? "bg-red-600 text-white font-semibold shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100");
    btn.textContent = escapeHTML(catName);
    btn.onclick = () => {
      activeCategoryName = catName;
      renderTabs(); 
      renderMenu(); 
      window.scrollTo({top: 0, behavior: "smooth"});
    };
    tabsContainer.appendChild(btn);
  });
}

// --- Menu Grid ---
function renderMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = ""; 
  if (!activeCategoryName || !fullMenuData || fullMenuData.length === 0) {
    menuGrid.innerHTML = "<p data-translate='select_category_items'>Select a category to see items.</p>";
    return;
  }

  const catObj = fullMenuData.find(c => c.category === activeCategoryName);
  if (!catObj) {
    console.warn(`Customer Menu: Category object for "${escapeHTML(activeCategoryName)}" not found.`);
    menuGrid.innerHTML = "<p data-translate='category_items_load_error'>Items for this category could not be loaded.</p>";
    return;
  }

  if (catObj.category === "Pizzas") {
    // (Pizza rendering logic - seems okay for now based on your problem description)
    if (catObj.subcategories && Array.isArray(catObj.subcategories)) {
      catObj.subcategories.forEach(sub => {
        if (!sub || !sub.name || !Array.isArray(sub.sizes)) {
            console.warn('Customer Menu: Skipping invalid subcategory or subcategory with invalid sizes:', sub);
            return;
        }
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
        card.innerHTML = `
          <div class="font-bold text-lg mb-1" data-translate-item="${sub.id || sub.name}_name">${escapeHTML(sub.name)}</div>
          ${sub.desc ? `<div class="text-gray-600 mb-1 text-sm" data-translate-item="${sub.id || sub.name}_desc">${escapeHTML(sub.desc)}</div>` : ""}
          ${sub.recipes && Array.isArray(sub.recipes) ? `<ul class="mb-1 text-xs text-gray-500">${sub.recipes.map(r => `<li data-translate-item="${sub.id || sub.name}_recipe_${r.toLowerCase().replace(/\s/g, '_')}">• ${escapeHTML(r)}</li>`).join("")}</ul>` : ""}
          <div class="flex flex-col gap-2 mb-2">
            ${sub.sizes.map(sz => {
              if (!sz || typeof sz.size === 'undefined' || typeof sz.price === 'undefined') {
                  console.warn('Customer Menu: Skipping invalid size in subcategory:', sub.name, sz);
                  return '';
              }
              const itemNameEsc = escapeHTML(sub.name.replace(/'/g, "\\'"));
              const itemSizeEsc = escapeHTML(sz.size.replace(/'/g, "\\'"));
              return `
                <button class="border rounded px-2 py-1 flex justify-between items-center hover:bg-green-50 active:bg-green-100 mb-1 text-sm"
                  onclick="addToCart('${itemNameEsc}', '${itemSizeEsc}', ${parseFloat(sz.price)})">
                  <span data-translate-item="${sub.id || sub.name}_size_${sz.size.toLowerCase()}">${escapeHTML(sz.size)}</span>
                  <span class="font-semibold">${parseFloat(sz.price)} DH</span>
                </button>
              `;
            }).join("")}
          </div>
        `;
        menuGrid.appendChild(card);
      });
    }
    const options = catObj.options || [];
    if (Array.isArray(options)) {
        options.forEach(opt => {
            if(!opt || !opt.name || !opt.price || typeof opt.price.Individual === 'undefined' || typeof opt.price.Double === 'undefined' || typeof opt.price.Triple === 'undefined'){
                console.warn('Customer Menu: Skipping invalid option:', opt);
                return;
            }
            const card = document.createElement("div");
            card.className = "bg-yellow-50 rounded-xl p-4 shadow flex flex-col";
            card.innerHTML = `
              <div class="font-semibold mb-1" data-translate-item="${opt.id || opt.name}_name">${escapeHTML(opt.name)}</div>
              <div class="text-gray-600 text-xs mb-1">${opt.desc ? escapeHTML(opt.desc) : ""}</div>
              <div class="text-gray-800 text-xs">
                +${parseFloat(opt.price.Individual)} DH (Individuelle), 
                +${parseFloat(opt.price.Double)} DH (Double), 
                +${parseFloat(opt.price.Triple)} DH (Triple)
              </div>`;
            menuGrid.appendChild(card);
        });
    }
  } else {
    // Other categories: items - *** THIS IS THE UPDATED PART ***
    const itemsObject = catObj.items || {}; // Items are expected to be an object
    const itemsArray = Object.values(itemsObject); // Convert the object's values to an array

    if (itemsArray.length === 0) {
        menuGrid.innerHTML = `<p data-translate="no_items_category">No items in this category yet.</p>`;
    } else {
        itemsArray.forEach(item => {
            if (!item || !item.name) { 
                console.warn('Customer Menu: Skipping invalid item:', item);
                return;
            }
            const card = document.createElement("div");
            card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
            
            const itemNameEsc = escapeHTML(item.name.replace(/'/g, "\\'"));
            const itemPrice = item.price !== undefined && item.price !== null ? parseFloat(item.price) : null;

            card.innerHTML = `
              <div class="font-bold text-lg mb-1" data-translate-item="${item.id || item.name}_name">${escapeHTML(item.name)}</div>
              ${item.desc ? `<div class="text-gray-600 mb-2 text-sm" data-translate-item="${item.id || item.name}_desc">${escapeHTML(item.desc)}</div>` : ""}
              ${itemPrice !== null ? `<div class="font-semibold mb-2">${itemPrice} DH</div>` : ""}
              ${itemPrice !== null ? `<button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 text-base font-semibold" 
                                            onclick="addToCart('${itemNameEsc}', '', ${itemPrice})">
                                            <span data-translate="add_to_cart">Add to Cart</span>
                                          </button>` : ""}
            `;
            menuGrid.appendChild(card);
        });
    }
  }
}

// --- Cart ---
function addToCart(name, size, price) {
  if (price === undefined || price === null || isNaN(parseFloat(price))) {
      console.error("Attempted to add item with invalid price:", name, size, price);
      alert("Sorry, this item cannot be added due to a price error.");
      return;
  }
  const numericPrice = parseFloat(price);

  const idx = cart.findIndex(i => i.name === name && i.size === size);
  if (idx > -1) {
    cart[idx].qty += 1;
  } else {
    cart.push({ name, size, price: numericPrice, qty: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  if (cartBtn) {
    cartBtn.classList.add("ring", "ring-green-300");
    setTimeout(() => cartBtn.classList.remove("ring", "ring-green-300"), 600);
  }
}

function updateCartCount() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  if (cartCountSpan) {
    cartCountSpan.textContent = count;
  }
}

if (cartBtn) {
  cartBtn.onclick = () => window.location.href = "cart.html";
}

// --- Responsive adjustments ---
function fixGridForMobile() {
  if (window.innerWidth < 400) {
    if (menuGrid) {
        menuGrid.classList.remove('sm:grid-cols-2', 'md:grid-cols-3');
        menuGrid.classList.add('grid-cols-1');
    }
  }
}
window.addEventListener('resize', fixGridForMobile);

// --- Initial calls ---
fixGridForMobile(); 
// renderTabs() and renderMenu() are called by Firebase listener
// updateCartCount() is also called by Firebase listener and addToCart.

// --- Expose addToCart globally ---
window.addToCart = addToCart;