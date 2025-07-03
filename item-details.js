// --- JavaScript for item-details.html ---

const db = firebase.database();
let currentItemData = null;
let quantity = 1;

// --- Element References ---
const loadingStateDiv = document.getElementById('loading-state');
const itemContentArticle = document.getElementById('item-content');
const errorStateDiv = document.getElementById('error-state');
const itemImageWrapper = document.getElementById('item-image-wrapper');
const itemNameH1 = document.getElementById('item-name');
const itemShortDescP = document.getElementById('item-short-desc');
const itemLongDescP = document.getElementById('item-long-desc');
const longDescSection = document.getElementById('long-desc-section');
const itemPriceSpan = document.getElementById('item-price');
const addToCartBtn = document.getElementById('add-to-cart-details-btn');
const cartCountSpan = document.getElementById('cart-count');
const decreaseQtyBtn = document.getElementById('decrease-qty-btn');
const increaseQtyBtn = document.getElementById('increase-qty-btn');
const quantitySpan = document.getElementById('item-quantity');

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cartCountSpan) cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function displayItemDetails(itemData) {
    currentItemData = itemData;
    const itemName = itemData.name || 'Item';
    const itemPrice = typeof itemData.price === 'number' ? itemData.price : 0;
    
    document.title = `${escapeHTML(itemName)} - Pizza Hut`;
    itemImageWrapper.innerHTML = `<img src="${escapeHTML(itemData.imageURL || itemData.image_url || '')}" alt="${escapeHTML(itemName)}" class="w-full h-full object-contain p-4">`;
    itemNameH1.textContent = escapeHTML(itemName);
    itemShortDescP.textContent = escapeHTML(itemData.description || itemData.shortDesc || '');
    
    if (itemData.longDesc) {
        itemLongDescP.textContent = escapeHTML(itemData.longDesc);
        longDescSection.style.display = 'block';
    } else {
        longDescSection.style.display = 'none';
    }

    itemPriceSpan.textContent = `${itemPrice.toFixed(2)} MAD`;
    loadingStateDiv.style.display = 'none';
    itemContentArticle.style.display = 'block';
}

function showError() {
    loadingStateDiv.style.display = 'none';
    errorStateDiv.style.display = 'block';
}

function updateQuantityDisplay() {
    quantitySpan.textContent = quantity;
    decreaseQtyBtn.disabled = quantity <= 1;
}

increaseQtyBtn.addEventListener('click', () => {
    quantity++;
    updateQuantityDisplay();
});

decreaseQtyBtn.addEventListener('click', () => {
    if (quantity > 1) {
        quantity--;
        updateQuantityDisplay();
    }
});
    
addToCartBtn.addEventListener('click', () => {
    if (!currentItemData) return;
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    const selectedToppings = Array.from(document.querySelectorAll('input[name="extra-topping"]:checked'))
        .map(checkbox => ({
            name: checkbox.nextElementSibling.textContent.split('(')[0].trim(),
            price: parseFloat(checkbox.dataset.price)
        }));

    let finalPrice = currentItemData.price;
    selectedToppings.forEach(topping => {
        finalPrice += topping.price;
    });

    // Generate a unique ID for customized items
    const cartItemId = selectedToppings.length > 0
        ? `${currentItemData.id}-${Date.now()}`
        : `${currentItemData.id}-standard`;

    const newItem = {
        cartItemId: cartItemId, 
        id: currentItemData.id, 
        name: currentItemData.name,
        image: currentItemData.imageURL || currentItemData.image_url,
        price: finalPrice, 
        quantity: quantity,
        options: selectedToppings
    };
    
    let existingItem = cart.find(item => item.cartItemId === cartItemId);
    
    if (existingItem) {
         existingItem.quantity += quantity;
    } else {
        cart.push(newItem);
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    
    const btn = document.getElementById('add-to-cart-details-btn');
    btn.textContent = 'Added! Returning to menu...';
    btn.disabled = true;
    btn.classList.remove('bg-red-600', 'hover:bg-red-700');
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
        window.location.href = 'menu.html';
    }, 1000);
});

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateQuantityDisplay();
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('categoryId');
    const itemId = params.get('itemId');
    const offerId = params.get('offerId');

    let itemRef;

    if (offerId) {
        itemRef = db.ref(`offers/${offerId}`);
    } else if (categoryId && itemId) {
        itemRef = db.ref(`menu/${categoryId}/items/${itemId}`);
    } else {
        showError();
        return;
    }

    itemRef.once('value')
        .then(snapshot => {
            const itemData = snapshot.val();
            if (itemData) {
                itemData.id = snapshot.key;
                displayItemDetails(itemData);
            } else {
                showError();
            }
        })
        .catch(error => {
            console.error("Error fetching item details:", error);
            showError();
        });
});