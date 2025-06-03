// admin-menu.js - Enhanced for Generic Item Details

const authInstance = firebase.auth();
const dbInstance = firebase.database();
console.log("admin-menu.js: Initialized auth and db instances from global firebase.");

// --- HTML Element References ---
const categoriesListDivAdmin = document.getElementById('categories-list');
const newCategoryNameInput = document.getElementById('new-category-name');
const addCategoryBtn = document.getElementById('add-category-btn');

const itemManagementSectionAdmin = document.getElementById('item-management-section');
const currentEditingCategorySpanAdmin = document.getElementById('current-editing-category');

const genericItemManagementDiv = document.getElementById('generic-item-management');
const pizzaSpecificManagementDiv = document.getElementById('pizza-specific-management'); 

// Generic Item elements
const itemsListDivAdmin = document.getElementById('items-list'); // Inside genericItemManagementDiv
const genericItemFormTitle = document.getElementById('generic-item-form-title');
const newItemNameInputAdmin = document.getElementById('new-item-name');
const newItemShortDescInputAdmin = document.getElementById('new-item-short-desc'); // Updated ID
const newItemPriceInputAdmin = document.getElementById('new-item-price');
const addItemBtnAdmin = document.getElementById('add-item-btn');
const clearItemFormBtnAdmin = document.getElementById('clear-item-form-btn');

// === NEW Generic Item Detail Field References ===
const newItemImageURLInputAdmin = document.getElementById('new-item-image-url');
const newItemLongDescInputAdmin = document.getElementById('new-item-long-desc');
const newItemIngredientsInputAdmin = document.getElementById('new-item-ingredients');
const newItemAllergiesInputAdmin = document.getElementById('new-item-allergies');

// Pizza Subcategory Management Elements (references for existing HTML from your file)
const newPizzaSubcategoryNameInput = document.getElementById('new-pizza-subcategory-name');
const newPizzaSubcategoryDescInput = document.getElementById('new-pizza-subcategory-desc');
const addPizzaSubcategoryBtn = document.getElementById('add-pizza-subcategory-btn');
const pizzaSubcategoriesListDiv = document.getElementById('pizza-subcategories-list');
const pizzaItemsInSubcategorySection = document.getElementById('pizza-items-in-subcategory-section');
const currentPizzaSubcatNameSpan = document.getElementById('current-editing-pizza-subcategory-name');
const pizzaItemsListDisplayDiv = document.getElementById('pizza-items-list-display');


// --- State Variables ---
let menuDataCacheAdmin = {}; 
let currentEditingCategoryId = null; 
let currentPizzasFirebaseKey = null; // Stores the Firebase key for "Pizzas" category
let editingItemIdGeneric = null; // Stores ID of generic item being edited, or null if adding new

// --- Utility Functions ---
function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
}

// --- Category Functions ---
function renderCategoriesAdmin(menuObject) {
  if (!categoriesListDivAdmin) { console.error("Admin: categoriesListDivAdmin not found."); return; }
  categoriesListDivAdmin.innerHTML = ''; 
  if (!menuObject || Object.keys(menuObject).length === 0) {
    categoriesListDivAdmin.innerHTML = '<p class="text-gray-500">No categories found. Add one below.</p>';
    currentPizzasFirebaseKey = null; // Reset if no categories
    return;
  }
  const pizzasCatEntry = Object.entries(menuObject).find(([id, catData]) => catData.category && catData.category.toLowerCase() === 'pizzas');
  if (pizzasCatEntry) { 
      currentPizzasFirebaseKey = pizzasCatEntry[0]; 
      console.log("Admin: 'Pizzas' category Firebase key:", currentPizzasFirebaseKey);
  } else {
      currentPizzasFirebaseKey = null;
  }

  for (const categoryId in menuObject) {
    if (menuObject.hasOwnProperty(categoryId)) {
      const category = menuObject[categoryId];
      if (!category || typeof category.category !== 'string') continue;
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm';
      categoryDiv.innerHTML = `
        <span class="font-medium text-gray-700">${escapeHTML(category.category)}</span>
        <div>
          <button class="text-sm text-blue-600 hover:text-blue-800 mr-3 transition-colors" onclick="window.adminMenu.editCategoryItems('${categoryId}')">
            <i class="fas fa-edit mr-1"></i>Edit Items/Subcategories
          </button>
          <button class="text-sm text-red-500 hover:text-red-700 transition-colors" onclick="window.adminMenu.deleteCategory('${categoryId}')">
            <i class="fas fa-trash mr-1"></i>Delete Category
          </button>
        </div>`;
      categoriesListDivAdmin.appendChild(categoryDiv);
    }
  }
}

if (addCategoryBtn && newCategoryNameInput) {
  addCategoryBtn.addEventListener('click', () => {
    const categoryName = newCategoryNameInput.value.trim();
    if (!categoryName) { alert('Please enter a category name.'); return; }
    if (categoryName.toLowerCase() === 'pizzas' && currentPizzasFirebaseKey) {
        alert('A "Pizzas" category already exists. It must be unique for special handling.'); return;
    }
    const newCategoryRef = dbInstance.ref('menu').push(); 
    const newCategoryId = newCategoryRef.key;
    let newCategoryData = { category: categoryName, id: newCategoryId };
    if (categoryName.toLowerCase() === 'pizzas') {
        newCategoryData.subcategories = {}; newCategoryData.options = {};
        currentPizzasFirebaseKey = newCategoryId; 
    } else { newCategoryData.items = {}; }
    newCategoryRef.set(newCategoryData).then(() => newCategoryNameInput.value = '').catch(e => console.error('Error adding category:', e));
  });
}

function showCorrectItemManagementUI(categoryId) {
    currentEditingCategoryId = categoryId; 
    const categoryData = menuDataCacheAdmin[categoryId];
    if (!categoryData || !itemManagementSectionAdmin || !currentEditingCategorySpanAdmin || !genericItemManagementDiv || !pizzaSpecificManagementDiv) {
        if (itemManagementSectionAdmin) itemManagementSectionAdmin.classList.add('hidden'); return;
    }
    currentEditingCategorySpanAdmin.textContent = escapeHTML(categoryData.category);
    itemManagementSectionAdmin.classList.remove('hidden');
    if(pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.add('hidden');

    if (categoryData.category && categoryData.category.toLowerCase() === 'pizzas') {
        currentPizzasFirebaseKey = categoryId; 
        genericItemManagementDiv.classList.add('hidden');
        pizzaSpecificManagementDiv.classList.remove('hidden');
        renderPizzaSubcategories(); 
    } else {
        pizzaSpecificManagementDiv.classList.add('hidden');
        genericItemManagementDiv.classList.remove('hidden');
        window.adminMenu.clearGenericItemForm(); 
        renderGenericItems(categoryId);
    }
}

// --- Generic Item Functions ---
function populateGenericItemForm(itemData) {
    if (!genericItemFormTitle || !newItemNameInputAdmin || !newItemShortDescInputAdmin || !newItemPriceInputAdmin || 
        !newItemImageURLInputAdmin || !newItemLongDescInputAdmin || !newItemIngredientsInputAdmin || 
        !newItemAllergiesInputAdmin || !addItemBtnAdmin) {
        console.error("Admin: One or more generic item form fields are missing for populate."); return;
    }
    genericItemFormTitle.textContent = "Edit Generic Item";
    newItemNameInputAdmin.value = itemData.name || '';
    newItemShortDescInputAdmin.value = itemData.shortDesc || itemData.desc || ''; // Compatibility for old 'desc'
    newItemPriceInputAdmin.value = itemData.price || '';
    newItemImageURLInputAdmin.value = itemData.imageURL || '';
    newItemLongDescInputAdmin.value = itemData.longDesc || '';
    newItemIngredientsInputAdmin.value = Array.isArray(itemData.ingredients) ? itemData.ingredients.join(', ') : (typeof itemData.ingredients === 'string' ? itemData.ingredients : '');
    newItemAllergiesInputAdmin.value = Array.isArray(itemData.allergies) ? itemData.allergies.join(', ') : (typeof itemData.allergies === 'string' ? itemData.allergies : '');
    
    addItemBtnAdmin.innerHTML = '<i class="fas fa-save mr-2"></i>Update Item';
    if (newItemNameInputAdmin) newItemNameInputAdmin.focus();
}

window.adminMenu = window.adminMenu || {};
window.adminMenu.clearGenericItemForm = () => { // Make sure it's on window.adminMenu
    if(genericItemFormTitle) genericItemFormTitle.textContent = "Add New Generic Item";
    if(newItemNameInputAdmin) newItemNameInputAdmin.value = '';
    if(newItemShortDescInputAdmin) newItemShortDescInputAdmin.value = '';
    if(newItemPriceInputAdmin) newItemPriceInputAdmin.value = '';
    if(newItemImageURLInputAdmin) newItemImageURLInputAdmin.value = '';
    if(newItemLongDescInputAdmin) newItemLongDescInputAdmin.value = '';
    if(newItemIngredientsInputAdmin) newItemIngredientsInputAdmin.value = '';
    if(newItemAllergiesInputAdmin) newItemAllergiesInputAdmin.value = '';
    editingItemIdGeneric = null; // Reset editing state
    if(addItemBtnAdmin) addItemBtnAdmin.innerHTML = '<i class="fas fa-plus mr-2"></i>Add New Item';
    if(newItemNameInputAdmin) newItemNameInputAdmin.focus();
};

if(clearItemFormBtnAdmin){
    clearItemFormBtnAdmin.addEventListener('click', window.adminMenu.clearGenericItemForm);
}

function renderGenericItems(categoryId) {
  if (!itemsListDivAdmin) { console.error("Admin: itemsListDivAdmin not found."); return; }
  itemsListDivAdmin.innerHTML = ''; 
  const categoryData = menuDataCacheAdmin[categoryId];
  const itemsObject = categoryData?.items || {};

  if (Object.keys(itemsObject).length === 0) {
    itemsListDivAdmin.innerHTML = '<p class="text-gray-500 italic">No items yet. Use the form below.</p>';
  } else {
    const ul = document.createElement('ul');
    ul.className = 'space-y-3';
    for (const itemId in itemsObject) {
      if (itemsObject.hasOwnProperty(itemId)) {
        const item = itemsObject[itemId];
        if (!item || typeof item.name !== 'string') continue;
        const li = document.createElement('li');
        li.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg bg-white hover:bg-gray-50 shadow-sm transition-shadow duration-150';
        
        const shortDescDisplay = item.shortDesc || item.desc || 'No short description.';
        const longDescSnippet = item.longDesc ? escapeHTML(item.longDesc.substring(0, 60)) + (item.longDesc.length > 60 ? '...' : '') : '';
        const imageHTML = item.imageURL 
          ? `<img src="${escapeHTML(item.imageURL)}" alt="${escapeHTML(item.name)}" class="w-16 h-16 object-cover rounded-md mr-4 mb-2 sm:mb-0 flex-shrink-0 border">` 
          : '<div class="w-16 h-16 bg-gray-200 rounded-md mr-4 mb-2 sm:mb-0 flex items-center justify-center text-gray-400 flex-shrink-0 border"><i class="fas fa-image text-2xl"></i></div>';
        
        const ingredientsList = Array.isArray(item.ingredients) && item.ingredients.length > 0 ? item.ingredients.join(', ') : (item.ingredients || '');
        const allergiesList = Array.isArray(item.allergies) && item.allergies.length > 0 ? item.allergies.join(', ') : (item.allergies || '');

        li.innerHTML = `
          <div class="flex items-start flex-grow min-w-0">
            ${imageHTML}
            <div class="flex-grow">
              <p class="font-semibold text-gray-800 text-md" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</p>
              <p class="text-xs text-gray-600">${escapeHTML(shortDescDisplay)}</p>
              <p class="text-xs text-gray-500 mt-1" title="${escapeHTML(item.longDesc || '')}">${longDescSnippet}</p>
              ${ingredientsList ? `<p class="text-xs text-gray-500 mt-1"><strong>Ingredients:</strong> <span class="font-mono text-blue-600">${escapeHTML(ingredientsList)}</span></p>` : ''}
              ${allergiesList ? `<p class="text-xs text-red-500 mt-1"><strong>Allergies:</strong> <span class="font-mono">${escapeHTML(allergiesList)}</span></p>` : ''}
            </div>
          </div>
          <div class="flex-shrink-0 ml-0 sm:ml-3 mt-3 sm:mt-0 flex space-x-2 self-start sm:self-center">
            <button title="Edit this item" class="text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm" onclick="window.adminMenu.editGenericItem('${categoryId}', '${itemId}')">
                <i class="fas fa-edit fa-fw"></i> <span class="hidden md:inline">Edit</span>
            </button>
            <button title="Delete this item" class="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm" onclick="window.adminMenu.deleteItem('${categoryId}', '${itemId}')">
                <i class="fas fa-trash fa-fw"></i> <span class="hidden md:inline">Delete</span>
            </button>
          </div>
        `;
        ul.appendChild(li);
      }
    }
    itemsListDivAdmin.appendChild(ul);
  }
}

if (addItemBtnAdmin) {
  addItemBtnAdmin.addEventListener('click', () => {
    if (!currentEditingCategoryId) { alert("No category selected for item."); return; }
    const categoryData = menuDataCacheAdmin[currentEditingCategoryId];
    if (categoryData?.category?.toLowerCase() === "pizzas") {
      alert('Manage Pizzas via their subcategories.'); return; 
    }

    // Ensure all new input elements are present before trying to read from them
    if (!newItemNameInputAdmin || !newItemShortDescInputAdmin || !newItemPriceInputAdmin ||
        !newItemImageURLInputAdmin || !newItemLongDescInputAdmin || !newItemIngredientsInputAdmin ||
        !newItemAllergiesInputAdmin) {
        console.error("Admin: Not all generic item form fields are available.");
        alert("Error: Some form fields are missing. Please refresh.");
        return;
    }

    const itemName = newItemNameInputAdmin.value.trim();
    const itemShortDesc = newItemShortDescInputAdmin.value.trim();
    const itemPriceText = newItemPriceInputAdmin.value.trim();
    const itemImageURL = newItemImageURLInputAdmin.value.trim();
    const itemLongDesc = newItemLongDescInputAdmin.value.trim();
    const itemIngredientsRaw = newItemIngredientsInputAdmin.value.trim();
    const itemAllergiesRaw = newItemAllergiesInputAdmin.value.trim();

    if (!itemName || !itemPriceText) { alert('Item name and price are required.'); return; }
    const itemPrice = parseFloat(itemPriceText);
    if (isNaN(itemPrice)) { alert('Price must be a valid number.'); return; }

    const newItemData = {
      name: itemName,
      shortDesc: itemShortDesc, 
      price: itemPrice,
      imageURL: itemImageURL || "", 
      longDesc: itemLongDesc || "",
      ingredients: itemIngredientsRaw ? itemIngredientsRaw.split(',').map(s => s.trim()).filter(s => s) : [], 
      allergies: itemAllergiesRaw ? itemAllergiesRaw.split(',').map(s => s.trim()).filter(s => s) : []   
    };

    let itemRef;
    let successMessage;
    if (editingItemIdGeneric) { 
        itemRef = dbInstance.ref(`menu/${currentEditingCategoryId}/items/${editingItemIdGeneric}`);
        newItemData.id = editingItemIdGeneric; // Ensure ID is part of the update
        successMessage = "Generic item updated successfully.";
    } else { 
        itemRef = dbInstance.ref(`menu/${currentEditingCategoryId}/items`).push();
        newItemData.id = itemRef.key; 
        successMessage = "Generic item added successfully.";
    }
    
    itemRef.set(newItemData)
      .then(() => {
        console.log(successMessage);
        window.adminMenu.clearGenericItemForm(); 
      })
      .catch(error => console.error('Error saving generic item:', error));
  });
}

// --- Pizza Subcategory Functions (kept from previous working state for UI toggle) ---
function renderPizzaSubcategories() {
    if (!pizzaSubcategoriesListDiv || !currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]) {
        if(pizzaSubcategoriesListDiv) pizzaSubcategoriesListDiv.innerHTML = '<p class="text-gray-500 italic">Select the "Pizzas" category to manage subcategories, or add it if it doesn\'t exist.</p>';
        return;
    }
    pizzaSubcategoriesListDiv.innerHTML = '';
    const pizzasCategoryData = menuDataCacheAdmin[currentPizzasFirebaseKey];
    const subcategories = pizzasCategoryData.subcategories || {};

    if (Object.keys(subcategories).length === 0) {
        pizzaSubcategoriesListDiv.innerHTML = '<p class="text-gray-500 italic">No pizza subcategories yet. Add one using the form above.</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'space-y-3';
    for (const subcatId in subcategories) {
        if (subcategories.hasOwnProperty(subcatId)) {
            const subcategory = subcategories[subcatId];
            const li = document.createElement('li');
            li.className = 'p-4 border rounded-lg bg-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-xl transition-shadow duration-150 ease-in-out';
            li.innerHTML = `
                <div class="flex-grow mb-3 sm:mb-0">
                    <h5 class="font-semibold text-lg text-red-700">${escapeHTML(subcategory.name)}</h5>
                    <p class="text-sm text-gray-600 mt-1">${escapeHTML(subcategory.description || 'No description provided.')}</p>
                </div>
                <div class="flex-shrink-0 flex flex-wrap gap-2 self-start sm:self-center">
                    <button title="Manage individual pizzas in this subcategory" class="text-xs bg-green-500 hover:bg-green-600 text-white font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.editItemsInPizzaSubcategory('${subcatId}')">
                        <i class="fas fa-pizza-slice fa-fw mr-1"></i> Manage Pizzas
                    </button>
                    <button title="Edit subcategory name/description" class="text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.editPizzaSubcategoryDetails('${subcatId}')">
                        <i class="fas fa-edit fa-fw mr-1"></i> Edit Details
                    </button>
                    <button title="Delete this subcategory and all its pizzas" class="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.deletePizzaSubcategory('${subcatId}')">
                        <i class="fas fa-trash fa-fw mr-1"></i> Delete Subcat
                    </button>
                </div>`;
            ul.appendChild(li);
        }
    }
    pizzaSubcategoriesListDiv.appendChild(ul);
}

if (addPizzaSubcategoryBtn && newPizzaSubcategoryNameInput && newPizzaSubcategoryDescInput) {
    addPizzaSubcategoryBtn.addEventListener('click', () => {
        if (!currentPizzasFirebaseKey) { alert("The 'Pizzas' category key not available."); return; }
        const subcatName = newPizzaSubcategoryNameInput.value.trim();
        const subcatDesc = newPizzaSubcategoryDescInput.value.trim();
        if (!subcatName) { alert('Pizza subcategory name required.'); return; }
        const newSubcatRef = dbInstance.ref(`menu/${currentPizzasFirebaseKey}/subcategories`).push();
        const newSubcatId = newSubcatRef.key;
        newSubcatRef.set({ id: newSubcatId, name: subcatName, description: subcatDesc, items: {} })
            .then(() => { newPizzaSubcategoryNameInput.value = ''; newPizzaSubcategoryDescInput.value = ''; })
            .catch(e => console.error('Error adding pizza subcategory:', e));
    });
}

// --- window.adminMenu (Public Interface) ---
window.adminMenu = {
  editCategoryItems: (categoryId) => {
    if(pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.add('hidden');
    showCorrectItemManagementUI(categoryId);
  },
  deleteCategory: (categoryId) => {
    const catData = menuDataCacheAdmin[categoryId];
    if (!catData) { alert("Category not found."); return; }
    if (!confirm(`DELETE CATEGORY: "${escapeHTML(catData.category)}"? This is IRREVERSIBLE.`)) return;
    dbInstance.ref('menu/' + categoryId).remove().then(() => {
        if (currentEditingCategoryId === categoryId) {
          itemManagementSectionAdmin.classList.add('hidden'); currentEditingCategoryId = null;
          if (catData.category.toLowerCase() === 'pizzas') currentPizzasFirebaseKey = null;
        }
      }).catch(e => alert("Error: " + e.message));
  },
  editGenericItem: (categoryId, itemId) => {
    const itemData = menuDataCacheAdmin[categoryId]?.items?.[itemId];
    if (!itemData) { alert("Item data not found for editing."); return; }
    showCorrectItemManagementUI(categoryId); // Ensure generic UI is visible
    populateGenericItemForm(itemData);
    editingItemIdGeneric = itemId;
  },
  deleteItem: (categoryId, itemId) => { 
    const itemData = menuDataCacheAdmin[categoryId]?.items?.[itemId];
    if (!itemData) { alert("Item not found."); return;}
    if (menuDataCacheAdmin[categoryId]?.category?.toLowerCase() === "pizzas") return; 
    if (!confirm(`Delete item "${escapeHTML(itemData.name)}"?`)) return;
    dbInstance.ref(`menu/${categoryId}/items/${itemId}`).remove().catch(e => alert("Error: " + e.message));
  },
  editItemsInPizzaSubcategory: (subcategoryId) => {
      if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) return;
      const subCatData = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId];
      if (!subCatData) { alert("Subcategory data not found."); return; }
      if (currentPizzaSubcatNameSpan) currentPizzaSubcatNameSpan.textContent = escapeHTML(subCatData.name);
      if (pizzaItemsListDisplayDiv) pizzaItemsListDisplayDiv.innerHTML = `<p>Managing items for "<strong>${escapeHTML(subCatData.name)}</strong>" (Next step).</p>`;
      if (pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.remove('hidden');
  },
  editPizzaSubcategoryDetails: (subcategoryId) => {
      if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) return;
      const subCatData = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId];
      if (!subCatData) { alert("Subcategory not found."); return;}
      alert(`Placeholder: Edit details for "${escapeHTML(subCatData.name)}".`);
  },
  deletePizzaSubcategory: (subcategoryId) => {
    if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) return;
    const subcatName = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId]?.name;
    if (!subcatName) { alert("Subcategory not found."); return; }
    if (!confirm(`DELETE Subcategory: "${escapeHTML(subcatName)}" and ALL its pizzas? IRREVERSIBLE.`)) return;
    dbInstance.ref(`menu/${currentPizzasFirebaseKey}/subcategories/${subcategoryId}`).remove()
      .then(() => {
          if (pizzaItemsInSubcategorySection && !pizzaItemsInSubcategorySection.classList.contains('hidden')) {
              if (currentPizzaSubcatNameSpan && currentPizzaSubcatNameSpan.textContent === escapeHTML(subcatName)) {
                  pizzaItemsInSubcategorySection.classList.add('hidden');
              }
          }
      }).catch(e => alert("Error: " + e.message));
  },
  initializeView: () => { // Called by admin.html navigation when menu section shown
      if (authInstance.currentUser && Object.keys(menuDataCacheAdmin).length > 0) {
          renderCategoriesAdmin(menuDataCacheAdmin);
          if (currentEditingCategoryId && menuDataCacheAdmin[currentEditingCategoryId]) {
              showCorrectItemManagementUI(currentEditingCategoryId);
          }
      }
  },
  clearGenericItemForm: window.adminMenu.clearGenericItemForm // Expose the clear function
};

// --- Firebase Listener for Menu Data ---
if (authInstance && dbInstance) {
    authInstance.onAuthStateChanged(user => {
      if (user) { 
        console.log("admin-menu.js: User is LOGGED IN. Attaching /menu listener.");
        dbInstance.ref('menu').on('value', (snapshot) => {
          const data = snapshot.val();
          menuDataCacheAdmin = data || {}; 
          const menuSection = document.getElementById('menu-management-content-section');
          if (categoriesListDivAdmin && menuSection && !menuSection.classList.contains('hidden')) {
              renderCategoriesAdmin(menuDataCacheAdmin); 
              if (currentEditingCategoryId && menuDataCacheAdmin[currentEditingCategoryId]) {
                showCorrectItemManagementUI(currentEditingCategoryId);
              } else if (currentEditingCategoryId && !menuDataCacheAdmin[currentEditingCategoryId] && itemManagementSectionAdmin) {
                itemManagementSectionAdmin.classList.add('hidden');
                currentEditingCategoryId = null;
              }
          }
        }, (error) => {
            console.error("admin-menu.js: Firebase /menu listener error:", error);
        });
      } else {
        console.log("admin-menu.js: User logged OUT. Clearing admin menu view.");
        if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = '<p>Please log in to manage the menu.</p>';
        if(itemManagementSectionAdmin) itemManagementSectionAdmin.classList.add('hidden');
        if(pizzaSpecificManagementDiv) pizzaSpecificManagementDiv.classList.add('hidden');
        menuDataCacheAdmin = {}; currentEditingCategoryId = null; currentPizzasFirebaseKey = null;
      }
    });
} else {
    console.error("admin-menu.js: FATAL - Firebase instances not defined.");
}

// --- Initial UI Setup ---
if (itemManagementSectionAdmin) itemManagementSectionAdmin.classList.add('hidden'); 
if (pizzaSpecificManagementDiv) pizzaSpecificManagementDiv.classList.add('hidden');
if (pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.add('hidden');