// --- JavaScript for item-details.html ---

const db = firebase.database();
let currentItemData = null;
let selectedSize = null;
let selectedRecipe = null;
let selectedAddons = [];
let quantity = 1;

// --- Element References ---
const loadingStateDiv = document.getElementById('loading-state');
const itemContentDiv = document.getElementById('item-content');
const errorStateDiv = document.getElementById('error-state');
const itemImage = document.getElementById('item-image');
const itemNameH1 = document.getElementById('item-name');
const itemDescriptionP = document.getElementById('item-description');
const sizeOptionsDiv = document.getElementById('size-options');
const recipeOptionsDiv = document.getElementById('recipe-options');
const addonOptionsDiv = document.getElementById('addon-options');
const decreaseQtyBtn = document.getElementById('decrease-qty-btn');
const increaseQtyBtn = document.getElementById('increase-qty-btn');
const quantitySpan = document.getElementById('item-quantity');
const totalPriceSpan = document.getElementById('total-price');
const addToCartBtn = document.getElementById('add-to-cart-details-btn');
const cartFooter = document.getElementById('add-to-cart-footer');
const allergiesInfoDiv = document.getElementById('allergies-info'); // New element reference

// Helper function to escape HTML for safe display
function escapeHTML(str) {
    if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
    return String(str).replace(/[<>&"']/g, s => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;"
    } [s]));
}


function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartCountSpan = document.getElementById('cart-count');
    if (cartCountSpan) {
        cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

function updatePrice() {
    if (!currentItemData) return;

    let basePrice = 0;
    if (selectedSize && typeof selectedSize.price === 'number') {
        basePrice = selectedSize.price;
    } else if (typeof currentItemData.price === 'number') {
        basePrice = currentItemData.price;
    }

    const addonsPrice = selectedAddons.reduce((total, addon) => total + (addon.price.Triple || 0), 0);
    const total = (basePrice + addonsPrice) * quantity;
    totalPriceSpan.textContent = total.toFixed(2);
}

function renderCustomizations() {
    // Sizes
    if (currentItemData.sizes && currentItemData.sizes.length > 0) {
        let sizeHtml = '<h3 class="text-lg font-semibold mb-2">Size</h3><div class="flex gap-2">';
        currentItemData.sizes.forEach((size, index) => {
            sizeHtml += `
                <div class="customization-option flex-1">
                    <input type="radio" id="size_${index}" name="size" value='${escapeHTML(JSON.stringify(size))}' class="hidden" ${index === 0 ? 'checked' : ''}>
                    <label for="size_${index}" class="block text-center border-2 rounded-lg p-2 cursor-pointer">${escapeHTML(size.size)}</label>
                </div>
            `;
        });
        sizeHtml += '</div>';
        sizeOptionsDiv.innerHTML = sizeHtml;
        selectedSize = currentItemData.sizes[0];

        document.querySelectorAll('input[name="size"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedSize = JSON.parse(e.target.value);
                updatePrice();
            });
        });
    } else {
        sizeOptionsDiv.innerHTML = ''; // Hide if no sizes
    }

    // Recipes
    if (currentItemData.recipes && currentItemData.recipes.length > 0) {
        let recipeHtml = '<h3 class="text-lg font-semibold mb-2">Recipe</h3><select id="recipe-select" class="w-full p-2 border rounded-lg">';
        currentItemData.recipes.forEach(recipe => {
            recipeHtml += `<option value="${escapeHTML(recipe)}">${escapeHTML(recipe)}</option>`;
        });
        recipeHtml += '</select>';
        recipeOptionsDiv.innerHTML = recipeHtml;
        selectedRecipe = currentItemData.recipes[0];

        document.getElementById('recipe-select').addEventListener('change', (e) => {
            selectedRecipe = e.target.value;
        });
    } else {
        recipeOptionsDiv.innerHTML = ''; // Hide if no recipes
    }

    // Add-ons
    if (currentItemData.options && currentItemData.options.length > 0) {
        let addonHtml = '<h3 class="text-lg font-semibold mb-2">Add-ons</h3><div class="space-y-2">';
        currentItemData.options.forEach((addon, index) => {
            addonHtml += `
                <div class="customization-option">
                    <input type="checkbox" id="addon_${index}" name="addon" value='${escapeHTML(JSON.stringify(addon))}' class="form-checkbox h-5 w-5 text-brand-red rounded">
                    <label for="addon_${index}" class="ml-2">${escapeHTML(addon.name)} (+${(addon.price.Triple || 0).toFixed(2)} MAD)</label>
                </div>
            `;
        });
        addonHtml += '</div>';
        addonOptionsDiv.innerHTML = addonHtml;

        document.querySelectorAll('input[name="addon"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const addon = JSON.parse(e.target.value);
                if (e.target.checked) {
                    selectedAddons.push(addon);
                } else {
                    selectedAddons = selectedAddons.filter(a => a.name !== addon.name);
                }
                updatePrice();
            });
        });
    } else {
        addonOptionsDiv.innerHTML = ''; // Hide if no addons
    }

    // Allergies Info
    if (currentItemData.allergies && currentItemData.allergies.trim() !== '') {
        allergiesInfoDiv.innerHTML = `
            <div class="border-t pt-4 mt-4">
                <h3 class="text-lg font-semibold mb-2">Allergies & Dietary Information</h3>
                <p class="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">${escapeHTML(currentItemData.allergies)}</p>
            </div>
        `;
    } else {
        allergiesInfoDiv.innerHTML = ''; // Hide if no allergies
    }
}

function displayItemDetails(itemData) {
    currentItemData = itemData;
    const itemName = itemData.name || 'Item';

    document.title = `${itemName} - Pizza Hut`;
    itemImage.src = itemData.image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    itemImage.alt = itemName;
    itemNameH1.textContent = itemName;
    itemDescriptionP.textContent = itemData.description || ''; // Use 'description' as per new schema

    renderCustomizations();
    updatePrice();

    loadingStateDiv.style.display = 'none';
    itemContentDiv.style.display = 'block';
    cartFooter.classList.remove('hidden');
}

function showError() {
    loadingStateDiv.style.display = 'none';
    errorStateDiv.style.display = 'block';
}

function updateQuantityDisplay() {
    quantitySpan.textContent = quantity;
    decreaseQtyBtn.disabled = quantity <= 1;
    updatePrice();
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
    
    // Construct a unique cartItemId for customized items
    // This ensures different customizations of the same base item are treated as separate entries
    const customizationDetails = [];
    if (selectedSize) customizationDetails.push(selectedSize.size);
    if (selectedRecipe) customizationDetails.push(selectedRecipe);
    if (selectedAddons.length > 0) customizationDetails.push(selectedAddons.map(a => a.name).join('+'));
    
    const cartItemId = `${currentItemData.id}-${customizationDetails.join('-').replace(/\s/g, '_')}-${Date.now()}`;

    const newItem = {
        cartItemId: cartItemId, // Unique ID for this specific customization
        id: currentItemData.id, // Base item ID
        name: currentItemData.name, // Base item name
        image: currentItemData.image_url,
        price: parseFloat(totalPriceSpan.textContent) / quantity, // Price per unit of this customized item
        quantity: quantity,
        categoryId: currentItemData.category, // Pass categoryId for menu card re-rendering
        sizes: selectedSize ? [selectedSize] : [], // Store selected size as an array
        recipes: selectedRecipe ? [selectedRecipe] : [], // Store selected recipe as an array
        options: selectedAddons.map(a => a.name) // Store only names of selected options
    };
    
    cart.push(newItem);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    
    addToCartBtn.textContent = 'Added! ✓';
    addToCartBtn.classList.add('bg-green-500');
    
    setTimeout(() => {
        window.location.href = 'menu.html';
    }, 800);
});

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateQuantityDisplay();

    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('categoryId');
    const itemId = params.get('itemId');

    if (!categoryId || !itemId) {
        showError();
        return;
    }

    db.ref(`menu/${categoryId}/items/${itemId}`).once('value') // Directly fetch item from items sub-node
        .then(snapshot => {
            const itemData = snapshot.val();
            
            if (itemData) {
                // Ensure itemData has a 'category' property for consistency
                itemData.category = categoryId; 
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
