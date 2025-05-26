const menu = {
  pizza: [
    { name: "Margherita", price: 50, img: "https://via.placeholder.com/80", desc: "Classic cheese pizza" },
    { name: "Pepperoni", price: 60, img: "https://via.placeholder.com/80", desc: "Spicy beef pepperoni" },
  ],
  sides: [
    { name: "Garlic Bread", price: 20, img: "https://via.placeholder.com/80", desc: "Crispy with garlic butter" },
  ],
  drinks: [
    { name: "Coke", price: 15, img: "https://via.placeholder.com/80", desc: "Cold and fizzy" },
  ],
  desserts: [
    { name: "Chocolate Cake", price: 25, img: "https://via.placeholder.com/80", desc: "Rich and moist" },
  ],
};

let currentCategory = "pizza";
let cart = [];

function renderMenu() {
  const container = document.getElementById("menu-items");
  container.innerHTML = "";

  menu[currentCategory].forEach((item, index) => {
    const html = `
      <div class="bg-white rounded-xl shadow p-4 flex items-center space-x-4">
        <img src="${item.img}" class="w-20 h-20 object-cover rounded" />
        <div class="flex-1">
          <h2 class="text-lg font-semibold">${item.name}</h2>
          <p class="text-sm text-gray-600">${item.desc}</p>
          <p class="font-bold">${item.price} MAD</p>
        </div>
        <button onclick="addToCart('${item.name}', ${item.price})"
                class="bg-green-500 text-white px-3 py-1 rounded">
          +
        </button>
      </div>
    `;
    container.innerHTML += html;
  });
}


function addToCart(name, price) {
  // Check if item already in cart
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  document.getElementById("cart-count").textContent = cart.reduce((a,b) => a+b.qty, 0);
}


// Change category buttons
document.querySelectorAll(".category-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("bg-red-500", "text-white"));
    btn.classList.add("bg-red-500", "text-white");
    currentCategory = btn.dataset.cat;
    renderMenu();
  });
});

renderMenu();
