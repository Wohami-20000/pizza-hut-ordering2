// menu.js (Updated to fetch from Firebase)

// IMPORTANT: Make sure firebase.js is loaded in your menu.html BEFORE this script,
// so that 'firebase' and 'db' are available.
// Example:
// <script src="firebase.js"></script>
// <script src="menu.js"></script>

// Get references to HTML elements
const tabsContainer = document.getElementById("category-tabs");
const menuGrid = document.getElementById("menu-grid");
const cartBtn = document.getElementById("cart-btn");
const cartCountSpan = document.getElementById("cart-count");

// Global variables to store menu data and current state
let fullMenuData = []; // This will hold the menu from Firebase
let activeCategoryName = ""; // Name of the currently active category
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Helper function to prevent naughty code in names/descriptions
function escapeHTML(str) {
  if (typeof str !== 'string') {
    // If it's not a string (e.g. a number like price), return it as is or convert to string
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
// This assumes 'db' is initialized in firebase.js and is globally accessible.
// If 'db' is not global, you might need to get it like: const db = firebase.database();
try {
  if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined') {
    throw new Error("Firebase is not initialized. Make sure firebase.js is loaded before menu.js and configured correctly.");
  }
  const db = firebase.database(); // Get Firebase database instance

  db.ref('menu').on('value', (snapshot) => {
    const firebaseMenuData = snapshot.val();
    if (firebaseMenuData) {
      // Firebase might return an object if you used custom keys (like cat_pair_deals)
      // or an array if it auto-generated keys (0, 1, 2...). We need an array.
      if (Array.isArray(firebaseMenuData)) {
        fullMenuData = firebaseMenuData;
      } else if (typeof firebaseMenuData === 'object') {
        // Convert object of categories to an array
        fullMenuData = Object.values(firebaseMenuData);
      } else {
        console.error("Menu data from Firebase is not in a recognized format (array or object).");
        fullMenuData = [];
      }

      if (fullMenuData.length > 0) {
        // If activeCategoryName is no longer valid or not set, default to the first one
        const categoryNames = fullMenuData.map(c => c.category);
        if (!activeCategoryName || !categoryNames.includes(activeCategoryName)) {
          activeCategoryName = categoryNames[0];
        }
      } else {
        activeCategoryName = ""; // No categories, so no active one
        tabsContainer.innerHTML = "<p>Menu is currently empty.</p>";
      }
    } else {
      console.warn("No menu data found in Firebase at '/menu'.");
      fullMenuData = [];
      activeCategoryName = "";
      tabsContainer.innerHTML = "<p>Menu not available.</p>";
    }
    renderTabs(); // Redraw tabs with new data/active state
    renderMenu(); // Redraw menu items for the active category
    updateCartCount(); // Update cart count as menu data might affect it indirectly
  }, (error) => {
    console.error("Error fetching menu data from Firebase:", error);
    tabsContainer.innerHTML = "<p>Error loading menu. Please try again later.</p>";
    menuGrid.innerHTML = "";
  });
} catch (e) {
  console.error("Firebase setup error:", e);
  tabsContainer.innerHTML = "<p>Critical error: Firebase not set up for menu.</p>";
  menuGrid.innerHTML = "";
}


// --- Category Tabs (Modified) ---
function renderTabs() {
  tabsContainer.innerHTML = ""; // Clear existing tabs
  if (!fullMenuData || fullMenuData.length === 0) {
    // If no categories, tabsContainer might already have a message from the listener
    return;
  }

  const categoryNames = fullMenuData.map(c => c.category);

  categoryNames.forEach(catName => {
    const btn = document.createElement("button");
    btn.className = "flex-shrink-0 px-3 py-2 mx-1 rounded-t text-base sm:text-lg whitespace-nowrap " +
      (activeCategoryName === catName ? "bg-red-600 text-white font-semibold shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100");
    btn.textContent = escapeHTML(catName); // Escape category name
    btn.onclick = () => {
      activeCategoryName = catName;
      renderTabs(); // Re-render tabs to update active style
      renderMenu(); // Re-render menu for the new category
      window.scrollTo({top: 0, behavior: "smooth"});
    };
    tabsContainer.appendChild(btn);
  });
}

// --- Menu Grid (Modified) ---
function renderMenu() {
  menuGrid.innerHTML = ""; // Clear existing menu items
  if (!activeCategoryName || !fullMenuData || fullMenuData.length === 0) {
    // If no active category or no menu data, menuGrid can remain empty or show a message
    menuGrid.innerHTML = "<p>Select a category to see items.</p>";
    return;
  }

  const catObj = fullMenuData.find(c => c.category === activeCategoryName);
  if (!catObj) {
    console.warn(`Category object for "${escapeHTML(activeCategoryName)}" not found.`);
    menuGrid.innerHTML = "<p>Items for this category could not be loaded.</p>";
    return;
  }

  // Handle pizzas with sizes/subcategories
  if (activeCategoryName === "Pizzas") {
    if (catObj.subcategories && Array.isArray(catObj.subcategories)) {
      catObj.subcategories.forEach(sub => {
        if (!sub || !sub.name || !Array.isArray(sub.sizes)) {
            console.warn('Skipping invalid subcategory or subcategory with invalid sizes:', sub);
            return;
        }
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
        card.innerHTML = `
          <div class="font-bold text-lg mb-1">${escapeHTML(sub.name)}</div>
          ${sub.desc ? `<div class="text-gray-600 mb-1 text-sm">${escapeHTML(sub.desc)}</div>` : ""}
          ${sub.recipes && Array.isArray(sub.recipes) ? `<ul class="mb-1 text-xs text-gray-500">${sub.recipes.map(r => `<li>• ${escapeHTML(r)}</li>`).join("")}</ul>` : ""}
          <div class="flex flex-col gap-2 mb-2">
            ${sub.sizes.map(sz => {
              if (!sz || typeof sz.size === 'undefined' || typeof sz.price === 'undefined') {
                  console.warn('Skipping invalid size in subcategory:', sub.name, sz);
                  return ''; // Skip this invalid size
              }
              // Make sure addToCart arguments are properly escaped for strings, and numbers are numbers
              const itemNameEsc = escapeHTML(sub.name.replace(/'/g, "\\'")); // Escape single quotes for JS string
              const itemSizeEsc = escapeHTML(sz.size.replace(/'/g, "\\'"));
              return `
                <button class="border rounded px-2 py-1 flex justify-between items-center hover:bg-green-50 active:bg-green-100 mb-1 text-sm"
                  onclick="addToCart('${itemNameEsc}', '${itemSizeEsc}', ${parseFloat(sz.price)})">
                  <span>${escapeHTML(sz.size)}</span>
                  <span class="font-semibold">${parseFloat(sz.price)} DH</span>
                </button>
              `;
            }).join("")}
          </div>
        `;
        menuGrid.appendChild(card);
      });
    }
    // Show Cheezy Crust option (and other options)
    const options = catObj.options || [];
    if (Array.isArray(options)) {
        options.forEach(opt => {
            if(!opt || !opt.name || !opt.price || typeof opt.price.Individual === 'undefined' || typeof opt.price.Double === 'undefined' || typeof opt.price.Triple === 'undefined'){
                console.warn('Skipping invalid option:', opt);
                return;
            }
            const card = document.createElement("div");
            card.className = "bg-yellow-50 rounded-xl p-4 shadow flex flex-col";
            card.innerHTML = `
              <div class="font-semibold mb-1">${escapeHTML(opt.name)}</div>
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
    // Other categories: items
    if (catObj.items && Array.isArray(catObj.items)) {
      catObj.items.forEach(item => {
        if (!item || !item.name) { // Basic check for a valid item
            console.warn('Skipping invalid item:', item);
            return;
        }
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
        // Escape all dynamic content coming from Firebase
        const itemNameEsc = escapeHTML(item.name.replace(/'/g, "\\'")); // Escape single quotes for JS string
        const itemPrice = item.price !== undefined && item.price !== null ? parseFloat(item.price) : null;

        card.innerHTML = `
          <div class="font-bold text-lg mb-1">${escapeHTML(item.name)}</div>
          ${item.desc ? `<div class="text-gray-600 mb-2 text-sm">${escapeHTML(item.desc)}</div>` : ""}
          ${itemPrice !== null ? `<div class="font-semibold mb-2">${itemPrice} DH</div>` : ""}
          ${itemPrice !== null ? `<button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 text-base font-semibold" 
                                        onclick="addToCart('${itemNameEsc}', '', ${itemPrice})">Add to Cart</button>` : ""}
        `;
        menuGrid.appendChild(card);
      });
    } else if (catObj.items) {
        console.warn(`Items for category "${escapeHTML(activeCategoryName)}" is not an array:`, catObj.items);
        menuGrid.innerHTML = `<p>Could not load items for this category.</p>`;
    }
  }
}

// --- Cart ---
// 'cart' variable is already defined globally
function addToCart(name, size, price) {
  // Price validation
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
  // Quick feedback for mobile
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

// --- Responsive adjustments for tiny screens ---
function fixGridForMobile() {
  if (window.innerWidth < 400) {
    if (menuGrid) {
        menuGrid.classList.remove('sm:grid-cols-2', 'md:grid-cols-3');
        menuGrid.classList.add('grid-cols-1');
    }
  }
}
window.addEventListener('resize', fixGridForMobile);

// --- Initial render (called by Firebase listener now) ---
// renderTabs(); // No longer needed here
// renderMenu(); // No longer needed here
// updateCartCount(); // Called within Firebase listener
fixGridForMobile(); // Call once on load

// --- Expose addToCart globally for inline handlers ---
window.addToCart = addToCart;