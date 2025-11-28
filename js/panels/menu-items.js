// /js/panels/menu-items.js

import { logAction } from './logs.js';

const db = firebase.database();
// REMOVED: Firebase Storage reference is no longer needed

// --- NEW: CLOUDINARY CONFIGURATION ---
// IMPORTANT: Your Cloud Name is added. Just replace the upload preset below.
const CLOUDINARY_CLOUD_NAME = "ddgjamijw";
const CLOUDINARY_UPLOAD_PRESET = "pizza-hut-menu"; // <-- PASTE YOUR UPLOAD PRESET NAME HERE
// ------------------------------------

// --- MODAL ELEMENTS ---
let editModal, editModalTitle, editForm, recipeModal, panelRoot;
let currentEditId = ''; // Firebase key of the item being edited
let currentRecipeItemId = ''; // ID of the item for which the recipe is being edited
let ingredientsCache = {}; // Cache for the master ingredient list
let selectedItems = new Map(); // For bulk editing { itemId: categoryId }
let sortableInstances = []; // To keep track of Sortable instances

/**
 * Updates the visibility and count of the bulk action UI.
 */
function updateBulkActionUI() {
    const bulkActionContainer = panelRoot.querySelector('#bulk-action-container');
    const selectedCountSpan = panelRoot.querySelector('#selected-count');
    const selectAllCheckbox = panelRoot.querySelector('#select-all-items');

    if (selectedItems.size > 0) {
        bulkActionContainer.classList.remove('hidden');
        selectedCountSpan.textContent = `${selectedItems.size} selected`;
    } else {
        bulkActionContainer.classList.add('hidden');
    }

    // Update the "select all" checkbox state
    const totalRows = panelRoot.querySelectorAll('#menu-items-table tr[data-item-id]').length;
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedItems.size > 0 && selectedItems.size === totalRows;
        selectAllCheckbox.indeterminate = selectedItems.size > 0 && selectedItems.size < totalRows;
    }
}


/**
 * Creates the HTML for a single menu item row.
 */
function createMenuItemRow(categoryId, itemId, itemData) {
    const { name, description, price, image_url, inStock } = itemData;
    const imageUrl = image_url || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const descSnippet = description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A';
    const priceDisplay = typeof price === 'number' ? price.toFixed(2) : 'N/A';
    const isChecked = inStock === false ? '' : 'checked'; // In stock by default
    const stockText = inStock === false ? 'Out of Stock' : 'In Stock';
    const stockTextColor = inStock === false ? 'text-red-500' : 'text-green-500';

    return `
        <tr class="hover:bg-gray-50 transition duration-150 ease-in-out ${inStock === false ? 'bg-gray-100 opacity-60' : ''}" data-category-id="${categoryId}" data-item-id="${itemId}" data-item-name="${name}">
            <td class="drag-handle px-4 py-3 text-gray-400 cursor-grab active:cursor-grabbing">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
            </td>
            <td class="px-4 py-3 text-center">
                <input type="checkbox" class="item-checkbox rounded border-gray-300 text-red-600 shadow-sm focus:ring-red-500" data-item-id="${itemId}" data-category-id="${categoryId}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-700 font-medium">
                <div class="flex items-center">
                    <img src="${imageUrl}" alt="${name}" class="w-10 h-10 rounded-md object-cover mr-3 shadow-sm">
                    <span>${name || 'N/A'}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${descSnippet}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${priceDisplay} MAD</td>
            <td class="px-4 py-3 text-sm text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${categoryId}
                </span>
            </td>
            <td class="p-4 text-center">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" class="sr-only peer stock-toggle" ${isChecked}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span class="ml-3 text-sm font-medium ${stockTextColor}">${stockText}</span>
                </label>
            </td>
            <td class="px-4 py-3 text-center text-sm whitespace-nowrap">
                <button class="edit-item-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 transition shadow-sm mr-2">Edit</button>
                <button class="duplicate-item-btn bg-teal-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-teal-600 transition shadow-sm mr-2">Duplicate</button>
                <button class="recipe-item-btn bg-purple-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-purple-600 transition shadow-sm mr-2">Recipe</button>
                <button class="delete-item-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 transition shadow-sm">Delete</button>
            </td>
        </tr>
    `;
}

// --- NEW: Cloudinary Image Upload Function ---
/**
 * Uploads an image file to Cloudinary and returns the secure URL.
 * @param {File} file The image file to upload.
 * @param {function} onProgress A callback function to report upload progress (receives a percentage).
 * @returns {Promise<string>} A promise that resolves with the secure public URL of the image.
 */
async function uploadImage(file, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    return new Promise((resolve, reject) => {
        if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET_NAME") {
            return reject(new Error("Cloudinary credentials are not configured in js/panels/menu-items.js. Please add them."));
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            }
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        console.error('Cloudinary upload failed:', error);
                        reject(new Error(error.error.message || 'Cloudinary upload failed'));
                    } catch (e) {
                        console.error('Could not parse Cloudinary error response:', xhr.responseText);
                        reject(new Error('Cloudinary upload failed with an unknown error.'));
                    }
                }
            }
        };
        
        xhr.onerror = () => {
             reject(new Error('Network error during upload. Check your internet connection.'));
        };

        xhr.send(formData);
    });
}


// --- RECIPE MODAL FUNCTIONS ---

async function populateRecipeModal() {
    const availableList = document.getElementById('available-ingredients');
    const recipeList = document.getElementById('recipe-ingredients-list');
    availableList.innerHTML = '<p class="text-gray-500">Loading ingredients...</p>';
    recipeList.innerHTML = '<p class="text-gray-500">Add ingredients from the left.</p>';

    const ingredientsSnapshot = await db.ref('ingredients').once('value');
    if (ingredientsSnapshot.exists()) {
        ingredientsCache = ingredientsSnapshot.val();
        availableList.innerHTML = Object.entries(ingredientsCache).map(([id, data]) => `
            <div class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
                <span>${data.name} (${data.unit})</span>
                <button type="button" class="add-ingredient-to-recipe-btn text-green-500 hover:text-green-700 text-lg" data-id="${id}">
                    <i class="fas fa-plus-circle"></i>
                </button>
            </div>
        `).join('');
    } else {
        availableList.innerHTML = '<p class="text-red-500">No ingredients found. Please add ingredients in the Stock panel first.</p>';
    }

    const recipeSnapshot = await db.ref(`recipes/${currentRecipeItemId}`).once('value');
    if (recipeSnapshot.exists()) {
        const recipeData = recipeSnapshot.val();
        if (recipeData.ingredients) {
            recipeList.innerHTML = '';
            Object.entries(recipeData.ingredients).forEach(([ingredientId, data]) => {
                addIngredientToRecipeList(ingredientId, data.qty);
            });
        }
    }
}

function addIngredientToRecipeList(ingredientId, quantity = 0.1) {
    const recipeList = document.getElementById('recipe-ingredients-list');
    if (!ingredientsCache[ingredientId]) return;

    if (recipeList.querySelector(`[data-id="${ingredientId}"]`)) {
        alert('Ingredient is already in the recipe.');
        return;
    }
    if (recipeList.querySelector('p')) {
        recipeList.innerHTML = '';
    }

    const ingredientData = ingredientsCache[ingredientId];
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-2 bg-blue-50 rounded-md';
    div.dataset.id = ingredientId;
    div.dataset.unit = ingredientData.unit;

    div.innerHTML = `
        <span class="font-semibold">${ingredientData.name}</span>
        <div class="flex items-center gap-2">
            <input type="number" step="0.01" value="${quantity}" class="recipe-qty-input w-20 p-1 border rounded-md text-right">
            <span class="text-sm text-gray-600">${ingredientData.unit}</span>
            <button type="button" class="remove-ingredient-from-recipe-btn text-red-500 hover:text-red-700 text-lg">
                <i class="fas fa-minus-circle"></i>
            </button>
        </div>
    `;
    recipeList.appendChild(div);
}

function openRecipeModal(itemId, itemName) {
    currentRecipeItemId = itemId;
    document.getElementById('recipe-modal-title').textContent = `Recipe for ${itemName}`;
    populateRecipeModal();
    recipeModal.classList.remove('hidden');
}

function closeRecipeModal() {
    recipeModal.classList.add('hidden');
    currentRecipeItemId = '';
}

async function handleSaveRecipe(e) {
    e.preventDefault();
    if (!currentRecipeItemId) return;

    const recipeList = document.getElementById('recipe-ingredients-list');
    const ingredientRows = recipeList.querySelectorAll('[data-id]');
    
    const recipeData = {
        name: document.getElementById('recipe-modal-title').textContent.replace('Recipe for ', ''),
        ingredients: {}
    };

    ingredientRows.forEach(row => {
        const id = row.dataset.id;
        const unit = row.dataset.unit;
        const qty = parseFloat(row.querySelector('.recipe-qty-input').value);
        if (!isNaN(qty)) {
            recipeData.ingredients[id] = { qty, unit };
        }
    });

    try {
        await db.ref(`recipes/${currentRecipeItemId}`).set(recipeData);
        alert('Recipe saved successfully!');
        closeRecipeModal();
    } catch (error) {
        alert('Error saving recipe: ' + error.message);
        console.error("Recipe save error:", error);
    }
}

async function openEditModal(id, data) {
    currentEditId = id;
    const formFieldsContainer = document.getElementById('edit-form-fields');
    if (!formFieldsContainer) return;
    editModalTitle.textContent = `Edit Menu Item`;
    formFieldsContainer.innerHTML = '';
    let formHtml = `
        <input type="hidden" id="edit-item-category-id" value="${data.category}">
        <div>
            <label class="block text-sm font-medium text-gray-700">Item Image</label>
            <div id="edit-image-uploader" class="image-uploader mt-1">
                <input type="file" id="edit-item-image-file" class="hidden" accept="image/*">
                <p>Click to upload or drag & drop</p>
                <img id="edit-image-preview" src="${data.image_url || ''}" class="image-preview ${data.image_url ? '' : 'hidden'}">
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mt-2 hidden" id="edit-progress-container">
                <div class="progress-bar rounded-full" id="edit-progress-bar"></div>
            </div>
            <input type="hidden" id="edit-item-image-url" value="${data.image_url || ''}">
        </div>
        <div>
            <label for="edit-item-name" class="block text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" id="edit-item-name" value="${data.name || ''}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div>
            <label for="edit-item-description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="edit-item-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">${data.description || ''}</textarea>
        </div>
        <div>
            <label for="edit-item-price" class="block text-sm font-medium text-gray-700">Base Price (MAD)</label>
            <input type="number" id="edit-item-price" step="0.01" value="${data.price || 0}" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Sizes</h4>
            <div id="edit-item-sizes-container" class="space-y-2"></div>
            <button type="button" id="add-edit-size-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Size</button>
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Recipes (Comma-separated)</h4>
            <input type="text" id="edit-item-recipes" value="${(data.recipes || []).join(', ') || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Spicy, BBQ, Original">
        </div>
        <div class="border-t pt-4 mt-4">
            <h4 class="text-md font-semibold text-gray-800 mb-2">Add-ons/Options</h4>
            <div id="edit-item-options-container" class="space-y-2"></div>
            <button type="button" id="add-edit-option-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Option</button>
        </div>
        <div class="border-t pt-4 mt-4">
            <label for="edit-item-allergies" class="block text-sm font-medium text-gray-700">Allergies/Dietary Info</label>
            <textarea id="edit-item-allergies" rows="2" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Contains dairy, gluten-free option available">${data.allergies || ''}</textarea>
        </div>`;
    formFieldsContainer.innerHTML = formHtml;
    editModal.classList.remove('hidden');

    const editImageUploader = document.getElementById('edit-image-uploader');
    const editImageFileInput = document.getElementById('edit-item-image-file');
    const editImagePreview = document.getElementById('edit-image-preview');
    editImageUploader.addEventListener('click', () => editImageFileInput.click());
    editImageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                editImagePreview.src = event.target.result;
                editImagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    const sizesContainer = document.getElementById('edit-item-sizes-container');
    const optionsContainer = document.getElementById('edit-item-options-container');
    (data.sizes || []).forEach(size => addSizeField(sizesContainer, size.size, size.price));
    (data.options || []).forEach(option => addOptionField(optionsContainer, option.name, option.price || ''));
    document.getElementById('add-edit-size-btn').addEventListener('click', () => addSizeField(sizesContainer));
    document.getElementById('add-edit-option-btn').addEventListener('click', () => addOptionField(optionsContainer));
}
function closeEditModal() { editModal.classList.add('hidden'); }
function addSizeField(container, size = '', price = '') { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="text" class="size-name-input w-2/3 p-2 border rounded-md" placeholder="Size Name (e.g., Small)" value="${size}"><input type="number" step="0.01" class="size-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}"><button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>`; div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove()); container.appendChild(div); }
function addOptionField(container, name = '', price = '') { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="text" class="option-name-input w-2/3 p-2 border rounded-md" placeholder="Option Name (e.g., Mushrooms)" value="${name}"><input type="number" step="0.01" class="option-price-input w-1/3 p-2 border rounded-md" placeholder="Price" value="${price}"><button type="button" class="remove-field-btn text-red-500 hover:text-red-700"><i class="fas fa-times-circle"></i></button>`; div.querySelector('.remove-field-btn').addEventListener('click', () => div.remove()); container.appendChild(div); }

async function saveEditedEntity(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-edit-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const imageFile = document.getElementById('edit-item-image-file').files[0];
    let imageUrl = document.getElementById('edit-item-image-url').value;

    try {
        if (imageFile) {
            const progressContainer = document.getElementById('edit-progress-container');
            const progressBar = document.getElementById('edit-progress-bar');
            progressContainer.classList.remove('hidden');
            imageUrl = await uploadImage(imageFile, (progress) => {
                progressBar.style.width = `${progress}%`;
            });
            progressContainer.classList.add('hidden');
        }

        const categoryId = document.getElementById('edit-item-category-id').value;
        const newBasePrice = parseFloat(document.getElementById('edit-item-price').value);
        const sizes = [];
        document.querySelectorAll('#edit-item-sizes-container .flex').forEach(row => {
            const sizeName = row.querySelector('.size-name-input').value.trim();
            const sizePrice = parseFloat(row.querySelector('.size-price-input').value);
            if (sizeName && !isNaN(sizePrice)) {
                sizes.push({ size: sizeName, price: sizePrice });
            }
        });
        if (sizes.length === 0 && !isNaN(newBasePrice)) {
            sizes.push({ size: "Regular", price: newBasePrice });
        }
        const recipesInput = document.getElementById('edit-item-recipes').value.trim();
        const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : [];
        const options = [];
        document.querySelectorAll('#edit-item-options-container .flex').forEach(row => {
            const optionName = row.querySelector('.option-name-input').value.trim();
            const optionPrice = parseFloat(row.querySelector('.option-price-input').value);
            if (optionName && !isNaN(optionPrice)) {
                options.push({ name: optionName, price: optionPrice });
            }
        });

        const updatedData = {
            name: document.getElementById('edit-item-name').value,
            description: document.getElementById('edit-item-description').value,
            price: newBasePrice,
            image_url: imageUrl,
            sizes: sizes,
            recipes: recipes,
            options: options,
            allergies: document.getElementById('edit-item-allergies').value.trim()
        };
        
        // Fetch old data for logging changes
        const dbRef = db.ref(`menu/${categoryId}/items/${currentEditId}`);
        const oldDataSnapshot = await dbRef.once('value');
        const oldData = oldDataSnapshot.val();

        await dbRef.update(updatedData);
        
        // Log the update action
        logAction('update', updatedData.name, currentEditId, { before: oldData, after: updatedData });

        alert(`Item updated successfully!`);
        closeEditModal();
        // The on() listener will automatically refresh the view
    } catch (error) {
        alert(`Failed to update item: ` + error.message);
        console.error("Save error:", error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

function filterItems() {
    const searchTerm = document.getElementById('item-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const table = document.getElementById('menu-items-table');
    if (!table) return;

    table.querySelectorAll('tbody').forEach(tbody => {
        let hasVisibleRows = false;
        tbody.querySelectorAll('tr').forEach(row => {
            const itemName = (row.dataset.itemName || '').toLowerCase();
            const categoryId = row.dataset.categoryId || '';

            const nameMatch = itemName.includes(searchTerm);
            const categoryMatch = (categoryFilter === 'all' || categoryId === categoryFilter);

            if (nameMatch && categoryMatch) {
                row.style.display = '';
                hasVisibleRows = true;
            } else {
                row.style.display = 'none';
            }
        });
        // You could hide entire category tbodies if they have no matching items
        // tbody.style.display = hasVisibleRows ? '' : 'none';
    });
}

function loadMenuItems() {
    db.ref('menu').on('value', (snapshot) => {
        const menuItemsTable = document.getElementById('menu-items-table');
        if (!menuItemsTable) return;

        // Clear existing tbody elements before re-rendering
        menuItemsTable.querySelectorAll('tbody').forEach(tbody => tbody.remove());

        if (snapshot.exists()) {
            const menu = snapshot.val();
            
            // Sort categories by displayOrder
            const sortedCategories = Object.entries(menu).sort(([, a], [, b]) => (a.displayOrder || 0) - (b.displayOrder || 0));

            if (sortedCategories.length === 0) {
                 const emptyTbody = document.createElement('tbody');
                 emptyTbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-500">No menu items found.</td></tr>`;
                 menuItemsTable.appendChild(emptyTbody);
            } else {
                sortedCategories.forEach(([categoryId, categoryData]) => {
                    if (categoryData.items) {
                        // Sort items within the category by orderIndex
                        const sortedItems = Object.entries(categoryData.items)
                            .sort(([, a], [, b]) => (a.orderIndex || 0) - (b.orderIndex || 0));
                        
                        const tbody = document.createElement('tbody');
                        tbody.className = 'sortable-category-body bg-white divide-y divide-gray-200';
                        tbody.dataset.categoryId = categoryId;
                        
                        let itemsHtml = '';
                        sortedItems.forEach(([itemId, itemData]) => {
                            itemsHtml += createMenuItemRow(categoryId, itemId, itemData);
                        });
                        tbody.innerHTML = itemsHtml;
                        menuItemsTable.appendChild(tbody);
                    }
                });
            }
        } else {
             const emptyTbody = document.createElement('tbody');
             emptyTbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-500">No menu items found.</td></tr>`;
             menuItemsTable.appendChild(emptyTbody);
        }
        
        initializeSortable();
        populateCategoryDropdowns();
        filterItems();
        updateBulkActionUI();
    });
}

/**
 * Initializes SortableJS on all category table bodies.
 */
function initializeSortable() {
    // Destroy previous instances to avoid memory leaks
    sortableInstances.forEach(instance => instance.destroy());
    sortableInstances = [];

    const categoryBodies = document.querySelectorAll('.sortable-category-body');
    const saveOrderBtn = document.getElementById('save-order-btn');

    categoryBodies.forEach(tbody => {
        const sortable = new Sortable(tbody, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                // When the user drops an item, show the save button
                saveOrderBtn.classList.remove('hidden');
            },
        });
        sortableInstances.push(sortable);
    });
}

/**
 * Saves the new order of items to Firebase.
 */
async function saveOrder() {
    const saveOrderBtn = document.getElementById('save-order-btn');
    saveOrderBtn.disabled = true;
    saveOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

    const updates = {};
    const categoryBodies = document.querySelectorAll('.sortable-category-body');

    categoryBodies.forEach(tbody => {
        const categoryId = tbody.dataset.categoryId;
        tbody.querySelectorAll('tr').forEach((row, index) => {
            const itemId = row.dataset.itemId;
            updates[`/menu/${categoryId}/items/${itemId}/orderIndex`] = index;
        });
    });

    try {
        await db.ref().update(updates);
        logAction('reorder', 'Menu Items', 'all', { details: 'Admin reordered items within categories.' });
        alert('Menu order saved successfully!');
        saveOrderBtn.classList.add('hidden');
    } catch (error) {
        console.error("Error saving order:", error);
        alert("Failed to save order. Please check the console for details.");
    } finally {
        saveOrderBtn.disabled = false;
        saveOrderBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save New Order';
    }
}


function populateCategoryDropdowns() {
    const categorySelect = document.getElementById('new-item-category');
    const categoryFilter = document.getElementById('category-filter');
    const bulkCategorySelect = document.getElementById('bulk-category-select');


    db.ref('menu').once('value').then(snapshot => {
        const selects = [categorySelect, categoryFilter, bulkCategorySelect];
        selects.forEach(sel => {
            if (sel) {
                const firstOption = sel.options[0];
                sel.innerHTML = '';
                sel.appendChild(firstOption);
            }
        });


        if (snapshot.exists()) {
            const categories = [];
            snapshot.forEach(categorySnap => {
                categories.push({ id: categorySnap.key, ...categorySnap.val() });
            });
            categories.sort((a, b) => a.displayOrder - b.displayOrder);
            
            categories.forEach(category => {
                const categoryName = category.category;
                const categoryId = category.id;
                
                selects.forEach(sel => {
                    if (sel) {
                        const option = document.createElement('option');
                        option.value = categoryId;
                        option.textContent = categoryName;
                        sel.appendChild(option);
                    }
                });
            });
        }
    });
}

function prefillAddItemForm(data) {
    // 1. Basic Fields
    document.getElementById('new-item-name').value = data.name || '';
    document.getElementById('new-item-description').value = data.description || '';
    document.getElementById('new-item-price').value = data.price || '';
    document.getElementById('new-item-recipes').value = (data.recipes || []).join(', ');
    document.getElementById('new-item-allergies').value = data.allergies || '';
    
    // 2. Category
    const categorySelect = document.getElementById('new-item-category');
    if (data.category) {
        categorySelect.value = data.category;
    }

    // 3. Clear Image (Requirement: Admin must re-upload)
    document.getElementById('new-item-image-file').value = '';
    const imgPreview = document.getElementById('new-image-preview');
    imgPreview.src = '';
    imgPreview.classList.add('hidden');

    // 4. Sizes
    const sizesContainer = document.getElementById('new-item-sizes-container');
    sizesContainer.innerHTML = ''; // Clear existing
    if (data.sizes && Array.isArray(data.sizes)) {
        data.sizes.forEach(size => addSizeField(sizesContainer, size.size, size.price));
    }

    // 5. Options
    const optionsContainer = document.getElementById('new-item-options-container');
    optionsContainer.innerHTML = ''; // Clear existing
    if (data.options && Array.isArray(data.options)) {
        data.options.forEach(option => addOptionField(optionsContainer, option.name, option.price));
    }

    // 6. Scroll to form and highlight
    const form = document.getElementById('add-item-form');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Optional: visual cue
    form.classList.add('ring-2', 'ring-teal-500');
    setTimeout(() => form.classList.remove('ring-2', 'ring-teal-500'), 1000);
}

export function loadPanel(root, panelTitle) {
    panelRoot = root; 
    panelTitle.textContent = 'Menu Items Management';
    
    panelRoot.innerHTML = `
        <div id="menu-items-section" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Add New Menu Item</h2>
            <form id="add-item-form" class="space-y-4">
                <div><label for="new-item-name" class="block text-sm font-medium text-gray-700">Item Name</label><input type="text" id="new-item-name" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Item Image</label>
                    <div id="new-image-uploader" class="image-uploader mt-1">
                        <input type="file" id="new-item-image-file" class="hidden" accept="image/*" required>
                        <p>Click to upload or drag & drop</p>
                        <img id="new-image-preview" src="" class="image-preview hidden">
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2 hidden" id="new-progress-container">
                        <div class="progress-bar rounded-full" id="new-progress-bar"></div>
                    </div>
                </div>
                <div><label for="new-item-description" class="block text-sm font-medium text-gray-700">Description</label><textarea id="new-item-description" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
                <div><label for="new-item-price" class="block text-sm font-medium text-gray-700">Base Price (MAD)</label><input type="number" id="new-item-price" step="0.01" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></div>
                <div><label for="new-item-category" class="block text-sm font-medium text-gray-700">Category</label><select id="new-item-category" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"><option value="">Select a category</option></select></div>
                <div class="border-t pt-4 mt-4"><h4 class="text-md font-semibold text-gray-800 mb-2">Sizes (Optional)</h4><div id="new-item-sizes-container" class="space-y-2"></div><button type="button" id="add-new-size-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Size</button></div>
                <div class="border-t pt-4 mt-4"><h4 class="text-md font-semibold text-gray-800 mb-2">Recipes (Optional)</h4><input type="text" id="new-item-recipes" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Spicy, BBQ"></div>
                <div class="border-t pt-4 mt-4"><h4 class="text-md font-semibold text-gray-800 mb-2">Add-ons (Optional)</h4><div id="new-item-options-container" class="space-y-2"></div><button type="button" id="add-new-option-btn" class="mt-2 bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-md hover:bg-blue-200"><i class="fas fa-plus mr-1"></i>Add Option</button></div>
                <div class="border-t pt-4 mt-4"><label for="new-item-allergies" class="block text-sm font-medium text-gray-700">Allergies</label><textarea id="new-item-allergies" rows="2" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Add Item</button>
            </form>
            <div class="flex justify-between items-center border-b pb-4 mt-8">
                <h2 class="text-2xl font-bold text-gray-800">Current Menu Items</h2>
                <button id="save-order-btn" class="hidden bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-save mr-2"></i>Save New Order
                </button>
            </div>
             
            <!-- Bulk Actions -->
            <div id="bulk-action-container" class="hidden bg-gray-100 p-4 rounded-lg my-4 space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 flex-wrap">
                <span id="selected-count" class="font-bold text-sm">0 selected</span>
                <select id="bulk-category-select" class="p-2 border rounded-md bg-white text-sm"><option value="">Change category...</option></select>
                <button id="bulk-change-category-btn" class="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Apply</button>
                <div class="flex items-center gap-2">
                    <button id="bulk-set-instock-btn" class="text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600">Set In Stock</button>
                    <button id="bulk-set-oot-btn" class="text-sm bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600">Set Out of Stock</button>
                </div>
                 <div class="flex items-center gap-2">
                    <input type="number" id="bulk-price-adjust" placeholder="e.g., 10 or -5" class="p-1 border rounded-md w-24 text-sm">
                    <button id="bulk-adjust-price-btn" class="text-sm bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600">Adjust Price %</button>
                </div>
                <button id="bulk-delete-btn" class="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700">Delete Selected</button>
            </div>


            <div class="flex justify-between items-center mb-4 mt-4">
                <input type="text" id="item-search" placeholder="Search by name..." class="w-1/3 p-2 border rounded-md">
                <select id="category-filter" class="p-2 border rounded-md bg-white">
                    <option value="all">All Categories</option>
                </select>
            </div>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table id="menu-items-table" class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-3"></th>
                            <th scope="col" class="px-4 py-3 text-center"><input type="checkbox" id="select-all-items" class="rounded border-gray-300 text-red-600 shadow-sm focus:ring-red-500"></th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Availability</th>
                            <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    {/* The tbody elements will be inserted here by loadMenuItems */}
                </table>
            </div>
        </div>
        <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4"><div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg flex flex-col"><h3 id="edit-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3 flex-shrink-0">Edit Item</h3><form id="edit-form" class="flex-grow overflow-hidden flex flex-col"><div id="edit-form-fields" class="space-y-4 flex-grow overflow-y-auto pr-4"></div><div class="flex justify-end space-x-2 pt-4 border-t mt-4 flex-shrink-0"><button type="button" id="cancel-edit-btn" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition">Cancel</button><button type="submit" id="save-edit-btn" class="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition">Save Changes</button></div></form></div></div>
        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl">
                <h3 id="recipe-modal-title" class="text-2xl font-bold mb-4">Recipe Editor</h3>
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold mb-2">Available Ingredients</h4>
                        <div id="available-ingredients" class="h-64 overflow-y-auto border p-2 rounded-md"></div>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2">Recipe Ingredients</h4>
                         <form id="recipe-form">
                             <div id="recipe-ingredients-list" class="h-64 overflow-y-auto border p-2 rounded-md space-y-2"></div>
                             <div class="flex justify-end gap-4 pt-4 border-t mt-4">
                                <button type="button" id="cancel-recipe-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Recipe</button>
                            </div>
                         </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    editModal = panelRoot.querySelector('#edit-modal');
    editModalTitle = panelRoot.querySelector('#edit-modal-title');
    editForm = panelRoot.querySelector('#edit-form');
    recipeModal = panelRoot.querySelector('#recipe-modal');
    
    panelRoot.querySelector('#cancel-edit-btn').addEventListener('click', closeEditModal);
    panelRoot.querySelector('#cancel-recipe-modal-btn').addEventListener('click', closeRecipeModal);
    editForm.addEventListener('submit', saveEditedEntity);
    panelRoot.querySelector('#recipe-form').addEventListener('submit', handleSaveRecipe);
    panelRoot.querySelector('#save-order-btn').addEventListener('click', saveOrder);


    panelRoot.querySelector('#add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        const imageFile = document.getElementById('new-item-image-file').files[0];
        if (!imageFile) {
            alert('Please select an image for the item.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Item';
            return;
        }

        try {
            const progressContainer = document.getElementById('new-progress-container');
            const progressBar = document.getElementById('new-progress-bar');
            progressContainer.classList.remove('hidden');
            const imageUrl = await uploadImage(imageFile, (progress) => {
                progressBar.style.width = `${progress}%`;
            });
            progressContainer.classList.add('hidden');

            const newItemPrice = parseFloat(panelRoot.querySelector('#new-item-price').value);
            const sizes = [];
            panelRoot.querySelectorAll('#new-item-sizes-container .flex').forEach(row => { const sizeName = row.querySelector('.size-name-input').value.trim(); const sizePrice = parseFloat(row.querySelector('.size-price-input').value); if (sizeName && !isNaN(sizePrice)) { sizes.push({ size: sizeName, price: sizePrice }); } }); if (sizes.length === 0 && !isNaN(newItemPrice)) { sizes.push({ size: "Regular", price: newItemPrice }); }
            const recipesInput = panelRoot.querySelector('#new-item-recipes').value.trim();
            const recipes = recipesInput ? recipesInput.split(',').map(r => r.trim()).filter(r => r) : [];
            const options = [];
            panelRoot.querySelectorAll('#new-item-options-container .flex').forEach(row => { const optionName = row.querySelector('.option-name-input').value.trim(); const optionPrice = parseFloat(row.querySelector('.option-price-input').value); if (optionName && !isNaN(optionPrice)) { options.push({ name: optionName, price: optionPrice }); } });
            
            const newItem = { name: panelRoot.querySelector('#new-item-name').value, description: panelRoot.querySelector('#new-item-description').value, price: newItemPrice, category: panelRoot.querySelector('#new-item-category').value, image_url: imageUrl, sizes: sizes, recipes: recipes, options: options, allergies: panelRoot.querySelector('#new-item-allergies').value.trim(), inStock: true };
            if (!newItem.category) { alert('Please select a category.'); return; }
            
            const newRef = await db.ref(`menu/${newItem.category}/items`).push();
            await newRef.set({ ...newItem, id: newRef.key });

            logAction('create', newItem.name, newRef.key, { data: newItem });

            alert('Item added successfully!');
            e.target.reset();
            document.getElementById('new-image-preview').classList.add('hidden');
            panelRoot.querySelector('#new-item-sizes-container').innerHTML = '';
            panelRoot.querySelector('#new-item-options-container').innerHTML = '';
        } catch (error) {
            alert("Failed to add item: " + error.message);
            console.error("Add item error:", error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Item';
        }
    });

    if (recipeModal) {
        recipeModal.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-ingredient-to-recipe-btn');
            const removeBtn = e.target.closest('.remove-ingredient-from-recipe-btn');
            
            if (addBtn) {
                addIngredientToRecipeList(addBtn.dataset.id);
            } else if (removeBtn) {
                removeBtn.closest('[data-id]').remove();
            }
        });
    }

    const newImageUploader = document.getElementById('new-image-uploader');
    const newImageFileInput = document.getElementById('new-item-image-file');
    const newImagePreview = document.getElementById('new-image-preview');
    newImageUploader.addEventListener('click', () => newImageFileInput.click());
    newImageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                newImagePreview.src = event.target.result;
                newImagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    panelRoot.querySelector('#add-new-size-btn').addEventListener('click', () => addSizeField(panelRoot.querySelector('#new-item-sizes-container')));
    panelRoot.querySelector('#add-new-option-btn').addEventListener('click', () => addOptionField(panelRoot.querySelector('#new-item-options-container')));
    
    panelRoot.querySelector('#item-search').addEventListener('input', filterItems);
    panelRoot.querySelector('#category-filter').addEventListener('change', filterItems);

    panelRoot.addEventListener('click', async (event) => {
        const target = event.target;
        
        // --- Single Item Actions ---
        const btn = target.closest('button');
        if (btn) {
            const row = btn.closest('tr');
            if (!row) return;

            const categoryId = row.dataset.categoryId;
            const itemId = row.dataset.itemId;
            const itemName = row.dataset.itemName;

            if (btn.classList.contains('edit-item-btn')) {
                const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
                if (itemSnapshot.exists()) {
                    openEditModal(itemId, { ...itemSnapshot.val(), category: categoryId });
                }
            } else if (btn.classList.contains('duplicate-item-btn')) {
                const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
                if (itemSnapshot.exists()) {
                    const originalItem = itemSnapshot.val();
                    const duplicatedData = {
                        ...originalItem,
                        name: `${originalItem.name} (Copy)`,
                        category: categoryId, // Ensure category is preserved
                    };
                    prefillAddItemForm(duplicatedData);
                }
            } else if (btn.classList.contains('recipe-item-btn')) {
                openRecipeModal(itemId, itemName);
            } else if (btn.classList.contains('delete-item-btn')) {
                if (confirm(`Are you sure you want to delete ${itemName}?`)) {
                    await logAction('delete', itemName, itemId);
                    await db.ref(`menu/${categoryId}/items/${itemId}`).remove();
                    alert('Item deleted!');
                }
            }
        }
        
        // --- Bulk Item Checkbox Handling ---
        if (target.matches('.item-checkbox')) {
            const itemId = target.dataset.itemId;
            const categoryId = target.dataset.categoryId;
            if (target.checked) {
                selectedItems.set(itemId, categoryId);
            } else {
                selectedItems.delete(itemId);
            }
            updateBulkActionUI();
        }
    });

    panelRoot.addEventListener('change', (e) => {
        if (e.target.classList.contains('stock-toggle')) {
            const row = e.target.closest('tr');
            const newStatus = e.target.checked;
            db.ref(`menu/${row.dataset.categoryId}/items/${row.dataset.itemId}/inStock`).set(newStatus);
            logAction('update', row.dataset.itemName, row.dataset.itemId, { change: `Availability set to ${newStatus ? 'In Stock' : 'Out of Stock'}` });
        }
    });
    
    // --- Bulk Action Event Listeners ---
    
    panelRoot.querySelector('#select-all-items').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const itemCheckboxes = panelRoot.querySelectorAll('#menu-items-table tr .item-checkbox');
        
        selectedItems.clear();
        itemCheckboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            // Only select visible rows
            if (row.style.display !== 'none') {
                checkbox.checked = isChecked;
                if (isChecked) {
                    selectedItems.set(checkbox.dataset.itemId, checkbox.dataset.categoryId);
                }
            }
        });
        updateBulkActionUI();
    });

    panelRoot.querySelector('#bulk-delete-btn').addEventListener('click', async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} items? This cannot be undone.`)) return;

        const updates = {};
        for (const [itemId, categoryId] of selectedItems.entries()) {
            updates[`/menu/${categoryId}/items/${itemId}`] = null;
            // Log each deletion
            const row = panelRoot.querySelector(`tr[data-item-id="${itemId}"]`);
            if (row) {
                 await logAction('delete', row.dataset.itemName, itemId, { details: 'Bulk delete action' });
            }
        }

        try {
            await db.ref().update(updates);
            alert(`${selectedItems.size} items deleted successfully.`);
            selectedItems.clear();
            updateBulkActionUI();
        } catch (error) {
            alert('Error deleting items: ' + error.message);
        }
    });
    
    panelRoot.querySelector('#bulk-set-instock-btn').addEventListener('click', () => bulkUpdateAvailability(true));
    panelRoot.querySelector('#bulk-set-oot-btn').addEventListener('click', () => bulkUpdateAvailability(false));

    panelRoot.querySelector('#bulk-change-category-btn').addEventListener('click', async () => {
        const newCategoryId = panelRoot.querySelector('#bulk-category-select').value;
        if (!newCategoryId || selectedItems.size === 0) {
            alert('Please select items and a target category.');
            return;
        }

        const updates = {};
        const itemsToMove = [];
        
        // Prepare data for moving
        for (const [itemId, categoryId] of selectedItems.entries()) {
            if (categoryId !== newCategoryId) {
                 const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
                 if(itemSnapshot.exists()) {
                     itemsToMove.push({ itemId, oldCategoryId: categoryId, data: itemSnapshot.val() });
                 }
            }
        }

        if (itemsToMove.length === 0) {
            alert('All selected items are already in that category.');
            return;
        }

        itemsToMove.forEach(item => {
            updates[`/menu/${item.oldCategoryId}/items/${item.itemId}`] = null; // Delete old
            updates[`/menu/${newCategoryId}/items/${item.itemId}`] = item.data; // Add new
            logAction('update', item.data.name, item.itemId, { change: `Category moved from ${item.oldCategoryId} to ${newCategoryId}` });
        });
        
        try {
            await db.ref().update(updates);
            alert(`${itemsToMove.length} items moved to category "${newCategoryId}".`);
            selectedItems.clear();
            updateBulkActionUI();
        } catch (error) {
            alert('Error moving items: ' + error.message);
        }
    });

    panelRoot.querySelector('#bulk-adjust-price-btn').addEventListener('click', async () => {
        const percentage = parseFloat(panelRoot.querySelector('#bulk-price-adjust').value);
        if (isNaN(percentage) || selectedItems.size === 0) {
            alert('Please select items and enter a valid percentage.');
            return;
        }

        const updates = {};
        for (const [itemId, categoryId] of selectedItems.entries()) {
            const itemSnapshot = await db.ref(`menu/${categoryId}/items/${itemId}`).once('value');
            if (itemSnapshot.exists()) {
                const item = itemSnapshot.val();
                const currentPrice = parseFloat(item.price);
                if (!isNaN(currentPrice)) {
                    const newPrice = currentPrice * (1 + percentage / 100);
                    updates[`/menu/${categoryId}/items/${itemId}/price`] = parseFloat(newPrice.toFixed(2));
                    logAction('update', item.name, itemId, { change: `Price adjusted by ${percentage}% from ${currentPrice.toFixed(2)} to ${newPrice.toFixed(2)}` });
                }
            }
        }
        
        try {
            await db.ref().update(updates);
            alert(`Prices for ${selectedItems.size} items adjusted by ${percentage}%.`);
            selectedItems.clear();
            updateBulkActionUI();
        } catch (error) {
            alert('Error adjusting prices: ' + error.message);
        }
    });


    loadMenuItems();
}

async function bulkUpdateAvailability(inStock) {
    if (selectedItems.size === 0) return;
    const updates = {};
    for (const [itemId, categoryId] of selectedItems.entries()) {
        updates[`/menu/${categoryId}/items/${itemId}/inStock`] = inStock;
        const row = panelRoot.querySelector(`tr[data-item-id="${itemId}"]`);
        if (row) {
            await logAction('update', row.dataset.itemName, itemId, { change: `Availability set to ${inStock ? 'In Stock' : 'Out of Stock'}`, details: 'Bulk update action' });
        }
    }

    try {
        await db.ref().update(updates);
        alert(`Availability for ${selectedItems.size} items updated.`);
        selectedItems.clear();
        updateBulkActionUI();
    } catch (error) {
        alert('Error updating availability: ' + error.message);
    }
}