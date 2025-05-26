// Load cart from localStorage or empty array
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, s => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function renderCart() {
  const container = document.getElementById("cart-items");
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-total").textContent = "0";
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.qty;

    const itemDiv = document.createElement("div");
    itemDiv.className = "bg-white rounded shadow p-4 flex justify-between items-center";

    itemDiv.innerHTML = `
      <div>
        <div class="font-semibold">${escapeHTML(item.name)}</div>
        <div>${item.price} MAD each</div>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="changeQty(${index}, -1)" class="bg-gray-200 px-2 rounded">-</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${index}, 1)" class="bg-gray-200 px-2 rounded">+</button>
        <button onclick="removeItem(${index})" class="text-red-500 ml-3">×</button>
      </div>
    `;

    container.appendChild(itemDiv);
  });

  document.getElementById("cart-total").textContent = total;
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty < 1) cart[index].qty = 1;
  saveCart();
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

let isPlacingOrder = false;

document.getElementById("place-order").addEventListener("click", async () => {
  if (isPlacingOrder) return;
  isPlacingOrder = true;
  document.getElementById("place-order").disabled = true;

  const tableNumber = document.getElementById("table-number").value.trim();
  if (!tableNumber || isNaN(tableNumber) || tableNumber <= 0) {
    alert("Please enter a valid table number.");
    document.getElementById("place-order").disabled = false;
    isPlacingOrder = false;
    return;
  }

  // Prepare order data
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderData = {
    table: tableNumber,
    items: cart,
    total,
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  // Save order to localStorage temporarily (later: send to backend)
  localStorage.setItem("lastOrder", JSON.stringify(orderData));
  localStorage.setItem("tableNumber", tableNumber);

  // Send order to Firebase
  try {
    // DEBUG: log what we're sending
    console.log("Writing to Firebase:", orderData);
    let ref = db.ref("orders");
    let result = await ref.push(orderData);
    console.log("Order pushed with key:", result.key);
    cart = [];
    localStorage.removeItem("cart");
    window.location.href = "confirm.html";
  } catch (error) {
    console.error("Firebase error:", error);
    alert("There was a problem saving the order online. Please try again.");
    document.getElementById("place-order").disabled = false;
    isPlacingOrder = false;
  }
});

// Initialize
renderCart();