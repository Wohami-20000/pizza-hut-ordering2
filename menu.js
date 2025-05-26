// Menu rendering and cart logic for Pizza Hut menu

const categories = menu.map(c => c.category);
const tabsContainer = document.getElementById("category-tabs");
const menuGrid = document.getElementById("menu-grid");
let activeCategory = categories[0];

// --- Category Tabs ---
function renderTabs() {
  tabsContainer.innerHTML = "";
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "flex-shrink-0 px-3 py-2 mx-1 rounded-t text-base sm:text-lg whitespace-nowrap " +
      (activeCategory === cat ? "bg-red-600 text-white font-semibold shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100");
    btn.textContent = cat;
    btn.onclick = () => {
      activeCategory = cat;
      renderTabs();
      renderMenu();
      window.scrollTo({top: 0, behavior: "smooth"});
    };
    tabsContainer.appendChild(btn);
  });
}

// --- Menu Grid ---
function renderMenu() {
  menuGrid.innerHTML = "";
  const catObj = menu.find(c => c.category === activeCategory);
  if (!catObj) return;

  // Handle pizzas with sizes/subcategories
  if (activeCategory === "Pizzas") {
    catObj.subcategories.forEach(sub => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
      card.innerHTML = `
        <div class="font-bold text-lg mb-1">${sub.name}</div>
        ${sub.desc ? `<div class="text-gray-600 mb-1 text-sm">${sub.desc}</div>` : ""}
        ${sub.recipes ? `<ul class="mb-1 text-xs text-gray-500">${sub.recipes.map(r => `<li>• ${r}</li>`).join("")}</ul>` : ""}
        <div class="flex flex-col gap-2 mb-2">
          ${sub.sizes.map(sz => `
            <button class="border rounded px-2 py-1 flex justify-between items-center hover:bg-green-50 active:bg-green-100 mb-1 text-sm"
              onclick="addToCart('${sub.name}', '${sz.size}', ${sz.price})">
              <span>${sz.size}</span>
              <span class="font-semibold">${sz.price} DH</span>
            </button>
          `).join("")}
        </div>
      `;
      menuGrid.appendChild(card);
    });
    // Show Cheezy Crust option
    const options = catObj.options || [];
    options.forEach(opt => {
      const card = document.createElement("div");
      card.className = "bg-yellow-50 rounded-xl p-4 shadow flex flex-col";
      card.innerHTML = `<div class="font-semibold mb-1">${opt.name}</div>
        <div class="text-gray-600 text-xs mb-1">${opt.desc || ""}</div>
        <div class="text-gray-800 text-xs">+${opt.price.Individual} DH (Individuelle), +${opt.price.Double} DH (Double), +${opt.price.Triple} DH (Triple)</div>`;
      menuGrid.appendChild(card);
    });
  } else {
    // Other categories: items
    (catObj.items || []).forEach(item => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-xl p-4 shadow flex flex-col mb-1";
      card.innerHTML = `
        <div class="font-bold text-lg mb-1">${item.name}</div>
        ${item.desc ? `<div class="text-gray-600 mb-2 text-sm">${item.desc}</div>` : ""}
        ${item.price ? `<div class="font-semibold mb-2">${item.price} DH</div>` : ""}
        ${item.price ? `<button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 text-base font-semibold" onclick="addToCart('${item.name}', '', ${item.price})">Add to Cart</button>` : ""}
      `;
      menuGrid.appendChild(card);
    });
  }
}

// --- Cart ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function addToCart(name, size, price) {
  if (!price) return;
  // Check if already in cart (by name+size)
  const idx = cart.findIndex(i => i.name === name && i.size === size);
  if (idx > -1) cart[idx].qty += 1;
  else cart.push({ name, size, price, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  // Quick feedback for mobile
  document.getElementById("cart-btn").classList.add("ring", "ring-green-300");
  setTimeout(()=>document.getElementById("cart-btn").classList.remove("ring", "ring-green-300"),600);
}
function updateCartCount() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("cart-count").textContent = count;
}
document.getElementById("cart-btn").onclick = () => window.location.href = "cart.html";

// --- Responsive adjustments for tiny screens ---
function fixGridForMobile() {
  if(window.innerWidth<400){
    menuGrid.classList.remove('sm:grid-cols-2','md:grid-cols-3');
    menuGrid.classList.add('grid-cols-1');
  }
}
window.addEventListener('resize', fixGridForMobile);

// --- Initial render ---
renderTabs();
renderMenu();
updateCartCount();
fixGridForMobile();

// --- Expose addToCart globally for inline handlers ---
window.addToCart = addToCart;