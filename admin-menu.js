// menu.js (Updated)

// Ensure Firebase is initialized (from firebase.js)
// const db = firebase.database(); (assuming firebase.js is loaded before this script in menu.html)

const tabsContainer = document.getElementById("category-tabs");
const menuGrid = document.getElementById("menu-grid");
let activeCategoryName = ""; // Will be set from Firebase data
let fullMenuData = []; // To store the complete menu from Firebase

// --- Firebase Listener for Menu ---
db.ref('menu').on('value', (snapshot) => {
  const firebaseMenuData = snapshot.val();
  if (firebaseMenuData && Array.isArray(firebaseMenuData)) {
    fullMenuData = firebaseMenuData;
    if (fullMenuData.length > 0) {
      activeCategoryName = fullMenuData[0].category; // Set initial active category
      renderTabs();
      renderMenu();
    } else {
      tabsContainer.innerHTML = "<p>Menu loading or not available.</p>";
      menuGrid.innerHTML = "";
    }
  } else {
    console.error("Menu data from Firebase is not in the expected format or is empty.");
    tabsContainer.innerHTML = "<p>Error loading menu.</p>";
    menuGrid.innerHTML = "";
    fullMenuData = []; // Reset menu data
  }
  updateCartCount(); // Ensure cart count is updated after menu might change
});


// --- Category Tabs ---
function renderTabs() {
  tabsContainer.innerHTML = "";
  if (!fullMenuData || fullMenuData.length === 0) return;

  const categories = fullMenuData.map(c => c.category);
  // Ensure activeCategoryName is valid, default to first if not
  if (!categories.includes(activeCategoryName) && categories.length > 0) {
      activeCategoryName = categories[0];
  }
  
  categories.forEach(catName => {
    const btn = document.createElement("button");
    btn.className = "flex-shrink-0 px-3 py-2 mx-1 rounded-t text-base sm:text-lg whitespace-nowrap " +
      (activeCategoryName === catName ? "bg-red-600 text-white font-semibold shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100");
    btn.textContent = catName;
    btn.onclick = () => {
      activeCategoryName = catName;
      renderTabs(); // Re-render tabs to update active state
      renderMenu(); // Re-render menu for the new category
      window.scrollTo({top: 0, behavior: "smooth"});
    };
    tabsContainer.appendChild(btn);
  });
}

// --- Menu Grid (largely similar, but uses fullMenuData) ---
function renderMenu() {
  menuGrid.innerHTML = "";
  if (!fullMenuData || fullMenuData.length === 0) return;

  const catObj = fullMenuData.find(c => c.category === activeCategoryName);
  if (!catObj) {
      console.warn(`Category object for "${activeCategoryName}" not found.`);
      if (fullMenuData.length > 0) { // Default to first category if current active is somehow invalid
          activeCategoryName = fullMenuData[0].category;
          renderTabs(); // This will recall renderMenu
      }
      return;
  }

  // Handle pizzas with sizes/subcategories
  if (activeCategoryName === "Pizzas") {
    if (catObj.subcategories) {
      catObj.subcategories.forEach(sub => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
        // Ensure all fields are escaped
        card.innerHTML = `
          <div class="font-bold text-lg mb-1">${escapeHTML(sub.name)}</div>
          ${sub.desc ? `<div class="text-gray-600 mb-1 text-sm">${escapeHTML(sub.desc)}</div>` : ""}
          ${sub.recipes && Array.isArray(sub.recipes) ? `<ul class="mb-1 text-xs text-gray-500">${sub.recipes.map(r => `<li>• ${escapeHTML(r)}</li>`).join("")}</ul>` : ""}
          <div class="flex flex-col gap-2 mb-2">
            ${sub.sizes && Array.isArray(sub.sizes) ? sub.sizes.map(sz => `
              <button class="border rounded px-2 py-1 flex justify-between items-center hover:bg-green-50 active:bg-green-100 mb-1 text-sm"
                onclick="addToCart('${escapeHTML(sub.name)}', '${escapeHTML(sz.size)}', ${parseFloat(sz.price)})">
                <span>${escapeHTML(sz.size)}</span>
                <span class="font-semibold">${parseFloat(sz.price)} DH</span>
              </button>
            `).join("") : ""}
          </div>
        `;
        menuGrid.appendChild(card);
      });
    }
    // Show Cheezy Crust option
    const options = catObj.options || [];
    options.forEach(opt => {
      const card = document.createElement("div");
      card.className = "bg-yellow-50 rounded-xl p-4 shadow flex flex-col";
      card.innerHTML = `<div class="font-semibold mb-1">${escapeHTML(opt.name)}</div>
        <div class="text-gray-600 text-xs mb-1">${opt.desc ? escapeHTML(opt.desc) : ""}</div>
        <div class="text-gray-800 text-xs">+${parseFloat(opt.price.Individual)} DH (Individuelle), +${parseFloat(opt.price.Double)} DH (Double), +${parseFloat(opt.price.Triple)} DH (Triple)</div>`;
      menuGrid.appendChild(card);
    });
  } else {
    // Other categories: items
    (catObj.items || []).forEach(item => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
      card.innerHTML = `
        <div class="font-bold text-lg mb-1">${escapeHTML(item.name)}</div>
        ${item.desc ? `<div class="text-gray-600 mb-2 text-sm">${escapeHTML(item.desc)}</div>` : ""}
        ${item.price ? `<div class="font-semibold mb-2">${parseFloat(item.price)} DH</div>` : ""}
        ${item.price ? `<button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 text-base font-semibold" onclick="addToCart('${escapeHTML(item.name)}', '', ${parseFloat(item.price)})">Add to Cart</button>` : ""}
      `;
      menuGrid.appendChild(card);
    });
  }
}

// --- Cart (same as before) ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function addToCart(name, size, price) {
  if (price === undefined || price === null || isNaN(parseFloat(price))) {
      console.error("Attempted to add item with invalid price:", name, size, price);
      return;
  }
  const numericPrice = parseFloat(price);
  const idx = cart.findIndex(i => i.name === name && i.size === size);
  if (idx > -1) cart[idx].qty += 1;
  else cart.push({ name, size, price: numericPrice, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  document.getElementById("cart-btn").classList.add("ring", "ring-green-300");
  setTimeout(()=>document.getElementById("cart-btn").classList.remove("ring", "ring-green-300"),600);
}
function updateCartCount() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("cart-count").textContent = count;
}
document.getElementById("cart-btn").onclick = () => window.location.href = "cart.html";


function escapeHTML(str) {
  if (typeof str !== 'string') return '';
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

// --- Responsive adjustments (same as before) ---
function fixGridForMobile() {
  if(window.innerWidth<400){
    menuGrid.classList.remove('sm:grid-cols-2','md:grid-cols-3');
    menuGrid.classList.add('grid-cols-1');
  }
}
window.addEventListener('resize', fixGridForMobile);
fixGridForMobile(); // Initial call

// --- Expose addToCart globally (same as before) ---
window.addToCart = addToCart;