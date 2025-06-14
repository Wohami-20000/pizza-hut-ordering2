// admin-menu.js - Enhanced for Generic Item Details

const authInstance = firebase.auth();
const dbInstance = firebase.database();
console.log("admin-menu.js: Initialized auth and db instances from global firebase.");

// --- HTML Element References (Declared here, assigned in DOMContentLoaded) ---
let categoriesListDivAdmin;
let newCategoryNameInput;
let addCategoryBtn;

let itemManagementSectionAdmin;
let currentEditingCategorySpanAdmin;

let genericItemManagementDiv;
let pizzaSpecificManagementDiv; 

let itemsListBodyAdmin; // Updated reference to tbody
let genericItemFormTitle;
let newItemNameInputAdmin;
let newItemShortDescInputAdmin;
let newItemPriceInputAdmin;
let addItemBtnAdmin;
let clearItemFormBtnAdmin;

// === NEW Generic Item Detail Field References ===
let newItemImageURLInputAdmin;
let newItemLongDescInputAdmin;
let newItemIngredientsInputAdmin;
let newItemAllergiesInputAdmin;

// Pizza Subcategory Management Elements
let newPizzaSubcategoryNameInput;
let newPizzaSubcategoryDescInput;
let addPizzaSubcategoryBtn;
let pizzaSubcategoriesListDiv;
let pizzaItemsInSubcategorySection;
let currentPizzaSubcatNameSpan;
let pizzaItemsListDisplayDiv;


// --- State Variables ---
let menuDataCacheAdmin = {}; 
let currentEditingCategoryId = null; 
let currentPizzasFirebaseKey = null; // Stores the Firebase key for "Pizzas" category
let editingItemIdGeneric = null; // Stores ID of generic item being edited, or null if adding new

// --- Utility Functions ---
function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return String(str).replace(/[<>&"']/g, s => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// Function to safely check if object has property (for linting safety)
function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

// Function to show messages/errors specifically for admin-menu.js context
function showAdminMenuMessage(message, isError = false) {
    const adminPageErrorContainer = document.getElementById('error-message-admin-page');
    if (adminPageErrorContainer) {
        const messageTextSpan = adminPageErrorContainer.querySelector('#admin-page-error-text');
        if (messageTextSpan) {
            messageTextSpan.textContent = message;
        } else {
            adminPageErrorContainer.textContent = message;
        }
        adminPageErrorContainer.classList.remove('hidden');
        if (isError) {
            adminPageErrorContainer.classList.remove('bg-green-100', 'text-green-700', 'border-green-400');
            adminPageErrorContainer.classList.add('bg-red-100', 'text-red-700', 'border-red-400');
        } else {
            adminPageErrorContainer.classList.remove('bg-red-100', 'text-red-700', 'border-red-400');
            adminPageErrorContainer.classList.add('bg-green-100', 'text-green-700', 'border-green-400');
        }
        setTimeout(() => hideMessage('error-message-admin-page'), 5000); // Hide after 5 seconds
    }
}

// --- Category Functions ---
function renderCategoriesAdmin(menuObject) {
  if (!categoriesListDivAdmin) { console.error("Admin: categoriesListDivAdmin not found."); return; }
  categoriesListDivAdmin.innerHTML = ''; 
  if (!menuObject || Object.keys(menuObject).length === 0) {
    categoriesListDivAdmin.innerHTML = '<p class="text-gray-500" data-translate="no_categories_found">No categories found. Add one below.</p>';
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
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
    if (hasOwnProperty(menuObject, categoryId)) {
      const category = menuObject[categoryId];
      if (!category || typeof category.category !== 'string') continue;
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm';
      categoryDiv.innerHTML = `
        <span class="font-medium text-gray-700">${escapeHTML(category.category)}</span>
        <div>
          <button class="text-sm text-blue-600 hover:text-blue-800 mr-3 transition-colors" onclick="window.adminMenu.editCategoryItems('${categoryId}')" data-translate="edit_items_subcategories">
            <i class="fas fa-edit mr-1"></i>Edit Items/Subcategories
          </button>
          <button class="text-sm text-red-500 hover:text-red-700 transition-colors" onclick="window.adminMenu.deleteCategory('${categoryId}')" data-translate="delete_category">
            <i class="fas fa-trash mr-1"></i>Delete Category
          </button>
        </div>`;
      categoriesListDivAdmin.appendChild(categoryDiv);
    }
  }
  if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
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
  if (typeof applyLanguage === 'function') {
        applyLanguage(currentLang, itemManagementSectionAdmin);
    }
}

// --- Generic Item Functions ---
function populateGenericItemForm(itemData) {
    if (!genericItemFormTitle || !newItemNameInputAdmin || !newItemShortDescInputAdmin || !newItemPriceInputAdmin || 
        !newItemImageURLInputAdmin || !newItemLongDescInputAdmin || !newItemIngredientsInputAdmin || 
        !newItemAllergiesInputAdmin || !addItemBtnAdmin) {
        console.error("Admin: One or more generic item form fields are missing for populate."); return;
    }
    genericItemFormTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.edit_generic_item) || "Edit Generic Item";
    newItemNameInputAdmin.value = itemData.name || '';
    newItemShortDescInputAdmin.value = itemData.shortDesc || itemData.desc || ''; 
    newItemPriceInputAdmin.value = itemData.price || '';
    newItemImageURLInputAdmin.value = itemData.imageURL || '';
    newItemLongDescInputAdmin.value = itemData.longDesc || '';
    newItemIngredientsInputAdmin.value = Array.isArray(itemData.ingredients) ? itemData.ingredients.join(', ') : (typeof itemData.ingredients === 'string' ? itemData.ingredients : '');
    newItemAllergiesInputAdmin.value = Array.isArray(itemData.allergies) ? itemData.allergies.join(', ') : (typeof itemData.allergies === 'string' ? itemData.allergies : '');
    
    addItemBtnAdmin.innerHTML = `<i class="fas fa-save mr-2"></i> ${(typeof translations !== 'undefined' && translations[currentLang]?.update_item_button) || "Update Item"}`;
    if (newItemNameInputAdmin) newItemNameInputAdmin.focus();
}

window.adminMenu = window.adminMenu || {}; 
window.adminMenu.clearGenericItemForm = () => { 
    if(genericItemFormTitle) genericItemFormTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.add_new_item) || "Add New Item";
    if(newItemNameInputAdmin) newItemNameInputAdmin.value = '';
    if(newItemShortDescInputAdmin) newItemShortDescInputAdmin.value = '';
    if(newItemPriceInputAdmin) newItemPriceInputAdmin.value = '';
    if(newItemImageURLInputAdmin) newItemImageURLInputAdmin.value = '';
    if(newItemLongDescInputAdmin) newItemLongDescInputAdmin.value = '';
    if(newItemIngredientsInputAdmin) newItemIngredientsInputAdmin.value = '';
    if(newItemAllergiesInputAdmin) newItemAllergiesInputAdmin.value = '';
    editingItemIdGeneric = null; 
    if(addItemBtnAdmin) addItemBtnAdmin.innerHTML = `<i class="fas fa-plus mr-2"></i> ${(typeof translations !== 'undefined' && translations[currentLang]?.add_item_button) || "Add Item"}`;
    if(newItemNameInputAdmin) newItemNameInputAdmin.focus();
};

function renderGenericItems(categoryId) {
  if (!itemsListBodyAdmin) { console.error("Admin: itemsListBodyAdmin not found."); return; } // Corrected to itemsListBodyAdmin
  itemsListBodyAdmin.innerHTML = ''; 
  const categoryData = menuDataCacheAdmin[categoryId];
  const itemsObject = categoryData?.items || {};

  if (Object.keys(itemsObject).length === 0) {
    itemsListBodyAdmin.innerHTML = `<p class="text-gray-500 italic" data-translate="no_items_yet">No items yet. Use the form below.</p>`;
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, itemsListBodyAdmin);
  } else {
    for (const itemId in itemsObject) {
      if (hasOwnProperty(itemsObject, itemId)) {
        const item = itemsObject[itemId];
        if (!item || typeof item.name !== 'string') continue;
        const li = document.createElement('tr'); // Changed to tr for table body
        li.className = 'hover:bg-gray-50'; // Tailwind class for table rows
        
        const shortDescDisplay = item.shortDesc || item.desc || ( (typeof translations !== 'undefined' && translations[currentLang]?.no_short_desc) || 'No short description.');
        const longDescSnippet = item.longDesc ? escapeHTML(item.longDesc.substring(0, 60)) + (item.longDesc.length > 60 ? '...' : '') : '';
        const imageHTML = item.imageURL 
          ? `<img src="${escapeHTML(item.imageURL)}" alt="${escapeHTML(item.name)}" class="w-16 h-16 object-cover rounded-md mr-4 mb-2 sm:mb-0 flex-shrink-0 border">` 
          : '<div class="w-16 h-16 bg-gray-200 rounded-md mr-4 mb-2 sm:mb-0 flex items-center justify-center text-gray-400 flex-shrink-0 border"><i class="fas fa-image text-2xl"></i></div>';
        
        const ingredientsList = Array.isArray(item.ingredients) && item.ingredients.length > 0 ? item.ingredients.join(', ') : (item.ingredients || '');
        const allergiesList = Array.isArray(item.allergies) && item.allergies.length > 0 ? item.allergies.join(', ') : (item.allergies || '');

        li.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${escapeHTML(itemId)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                <div class="flex items-center">
                    ${imageHTML}
                    <span>${escapeHTML(item.name)}</span>
                </div>
            </td>
            <td class="px-4 py-2 whitespace-normal text-sm text-gray-500">${escapeHTML(shortDescDisplay)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${item.price ? item.price.toFixed(2) : 'N/A'} MAD</td>
            <td class="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
            <button title="Edit this item" class="text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm" onclick="window.adminMenu.editGenericItem('${categoryId}', '${itemId}')" data-translate="edit_button">
                <i class="fas fa-edit fa-fw"></i> <span class="hidden md:inline">Edit</span>
            </button>
            <button title="Delete this item" class="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm" onclick="window.adminMenu.deleteItem('${categoryId}', '${itemId}')">
                <i class="fas fa-trash fa-fw"></i> <span class="hidden md:inline" data-translate="delete_button">Delete</span>
            </button>
          </td>
        `;
        itemsListBodyAdmin.appendChild(li); // Append to tbody
      }
    }
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, itemsListBodyAdmin);
  }
}

// --- Pizza Subcategory Functions ---
function renderPizzaSubcategories() {
    if (!pizzaSubcategoriesListDiv || !currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]) {
        if(pizzaSubcategoriesListDiv) pizzaSubcategoriesListDiv.innerHTML = '<p class="text-gray-500 italic" data-translate="no_pizzas_category_message">Select the "Pizzas" category to manage subcategories, or add it if it doesn\'t exist.</p>';
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, pizzaSubcategoriesListDiv);
        return;
    }
    pizzaSubcategoriesListDiv.innerHTML = '';
    const pizzasCategoryData = menuDataCacheAdmin[currentPizzasFirebaseKey];
    const subcategories = pizzasCategoryData.subcategories || {};

    if (Object.keys(subcategories).length === 0) {
        pizzaSubcategoriesListDiv.innerHTML = `<p class="text-gray-500 italic" data-translate="no_pizza_subcategories">No pizza subcategories yet. Add one using the form above.</p>`;
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, pizzaSubcategoriesListDiv);
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'space-y-3';
    for (const subcatId in subcategories) {
        if (hasOwnProperty(subcategories, subcatId)) {
            const subcategory = subcategories[subcatId];
            const li = document.createElement('li');
            li.className = 'p-4 border rounded-lg bg-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-xl transition-shadow duration-150 ease-in-out';
            li.innerHTML = `
                <div class="flex-grow mb-3 sm:mb-0">
                    <h5 class="font-semibold text-lg text-red-700">${escapeHTML(subcategory.name)}</h5>
                    <p class="text-sm text-gray-600 mt-1">${escapeHTML(subcategory.description || ( (typeof translations !== 'undefined' && translations[currentLang]?.no_description_provided) || 'No description provided.'))}</p>
                </div>
                <div class="flex-shrink-0 flex flex-wrap gap-2 self-start sm:self-center">
                    <button title="Manage individual pizzas in this subcategory" class="text-xs bg-green-500 hover:bg-green-600 text-white font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.editItemsInPizzaSubcategory('${subcatId}')" data-translate="manage_pizzas_button">
                        <i class="fas fa-pizza-slice fa-fw mr-1"></i> Manage Pizzas
                    </button>
                    <button title="Edit subcategory name/description" class="text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.editPizzaSubcategoryDetails('${subcatId}')" data-translate="edit_details_button">
                        <i class="fas fa-edit fa-fw"></i> Edit Details
                    </button>
                    <button title="Delete this subcategory and all its pizzas" class="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors" onclick="window.adminMenu.deletePizzaSubcategory('${subcatId}')" data-translate="delete_subcat_button">
                        <i class="fas fa-trash fa-fw"></i> Delete Subcat
                    </button>
                </div>`;
            ul.appendChild(li);
        }
    }
    pizzaSubcategoriesListDiv.appendChild(ul);
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, pizzaSubcategoriesListDiv);
}

// --- window.adminMenu (Public Interface) ---
window.adminMenu = window.adminMenu || {}; 

// This function is called by admin.js when menu management section is explicitly activated.
window.adminMenu.initializeView = () => { 
    hideMessage('admin-page-error-text'); // Clear any global admin page errors

    if (!authInstance.currentUser) {
        console.log("admin-menu.js: User not logged in, cannot initialize menu view.");
        categoriesListDivAdmin.innerHTML = '<p class="text-red-500" data-translate="login_to_manage_menu">Please log in to manage the menu.</p>';
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
        itemManagementSectionAdmin.classList.add('hidden');
        pizzaSpecificManagementDiv.classList.add('hidden');
        menuDataCacheAdmin = {};
        currentEditingCategoryId = null;
        currentPizzasFirebaseKey = null;
        return;
    }
    
    // Attach listener for menu data (if not already attached, or force re-render if needed)
    // The dbInstance.ref('menu').on('value', ...) below handles continuous updates.
    // This call just ensures the initial render.
    dbInstance.ref('menu').once('value', (snapshot) => {
        const data = snapshot.val();
        menuDataCacheAdmin = data || {};
        renderCategoriesAdmin(menuDataCacheAdmin); // Always render categories when view initializes
        
        // Re-show item management if a category was being edited before page refresh
        if (currentEditingCategoryId && menuDataCacheAdmin[currentEditingCategoryId]) {
            showCorrectItemManagementUI(currentEditingCategoryId);
        } else if (itemManagementSectionAdmin) {
            itemManagementSectionAdmin.classList.add('hidden');
            currentEditingCategoryId = null;
        }
    }).catch(error => {
        console.error("admin-menu.js: Error fetching initial menu data for view initialization:", error);
        showAdminMenuMessage(`Error loading menu data: ${error.message}`, true);
        categoriesListDivAdmin.innerHTML = `<p class="text-center py-4 text-red-500" data-translate="error_loading_categories">Error loading categories: ${error.message}</p>`;
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
    });
};


window.adminMenu.editCategoryItems = (categoryId) => { 
  if(pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.add('hidden');
  showCorrectItemManagementUI(categoryId);
};

window.adminMenu.deleteCategory = (categoryId) => { 
  const catData = menuDataCacheAdmin[categoryId];
  if (!catData) { showAdminMenuMessage("Category data not found for deletion.", true); return; }
  if (!confirm(`DELETE CATEGORY: "${escapeHTML(catData.category)}"? This is IRREVERSIBLE.`)) return;
  dbInstance.ref('menu/' + categoryId).remove()
    .then(() => console.log(`Category ${categoryId} deleted.`))
    .catch(e => {
        console.error('Error deleting category:', e);
        showAdminMenuMessage(`Failed to delete category: ${e.message}`, true);
    });
};

window.adminMenu.editGenericItem = (categoryId, itemId) => { 
  const itemData = menuDataCacheAdmin[categoryId]?.items?.[itemId];
  if (!itemData) { showAdminMenuMessage("Item data not found for editing.", true); return; }
  showCorrectItemManagementUI(categoryId); 
  populateGenericItemForm(itemData);
  editingItemIdGeneric = itemId;
};

window.adminMenu.deleteItem = (categoryId, itemId) => { 
  const itemData = menuDataCacheAdmin[categoryId]?.items?.[itemId];
  if (!itemData) { showAdminMenuMessage("Item not found.", true); return;}
  if (menuDataCacheAdmin[categoryId]?.category?.toLowerCase() === "pizzas") {
     showAdminMenuMessage("Cannot delete individual pizza items from here. Manage them via subcategories.", true);
     return;
  }
  if (!confirm(`Delete item "${escapeHTML(itemData.name)}"?`)) return;
  dbInstance.ref(`menu/${categoryId}/items/${itemId}`).remove()
    .then(() => console.log(`Item ${itemId} deleted.`))
    .catch(e => {
        console.error('Error deleting item:', e);
        showAdminMenuMessage(`Failed to delete item: ${e.message}`, true);
    });
};

window.adminMenu.editItemsInPizzaSubcategory = (subcategoryId) => { 
      if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) {
          showAdminMenuMessage("Pizzas category or subcategory data missing.", true);
          return;
       }
      const subCatData = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId];
      if (!subCatData) { showAdminMenuMessage("Subcategory data not found.", true); return; }
      if (currentPizzaSubcatNameSpan) currentPizzaSubcatNameSpan.textContent = escapeHTML(subCatData.name);
      if (pizzaItemsListDisplayDiv) pizzaItemsListDisplayDiv.innerHTML = `<p class="text-gray-500" data-translate="managing_pizzas_message">Managing items for "<strong>${escapeHTML(subCatData.name)}</strong>" (Next step: Implement pizza item management here).</p>`;
      if (typeof applyLanguage === 'function') applyLanguage(currentLang, pizzaItemsListDisplayDiv);
      if (pizzaItemsInSubcategorySection) pizzaItemsInSubcategorySection.classList.remove('hidden');
};

window.adminMenu.editPizzaSubcategoryDetails = (subcategoryId) => { 
      if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) {
          showAdminMenuMessage("Pizzas category or subcategory data missing.", true);
          return;
      }
      const subCatData = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId];
      if (!subCatData) { showAdminMenuMessage("Subcategory not found.", true); return;}
      alert(`Placeholder: Edit details for "${escapeHTML(subCatData.name)}".`); 
  };

window.adminMenu.deletePizzaSubcategory = (subcategoryId) => { 
  if (!currentPizzasFirebaseKey || !menuDataCacheAdmin[currentPizzasFirebaseKey]?.subcategories) {
      showAdminMenuMessage("Pizzas category or subcategory data missing for deletion.", true);
      return;
   }
  const subcatName = menuDataCacheAdmin[currentPizzasFirebaseKey].subcategories[subcategoryId]?.name;
  if (!subcatName) { showAdminMenuMessage("Subcategory not found.", true); return; }
  if (!confirm(`DELETE Subcategory: "${escapeHTML(subcatName)}" and ALL its pizzas? IRREVERSIBLE.`)) return;
  dbInstance.ref(`menu/${currentPizzasFirebaseKey}/subcategories/${subcategoryId}`).remove()
    .then(() => console.log(`Pizza subcategory ${subcategoryId} deleted.`))
    .catch(e => {
        console.error('Error deleting pizza subcategory:', e);
        showAdminMenuMessage(`Failed to delete pizza subcategory: ${e.message}`, true);
    });
};


// --- DOMContentLoaded for Element Assignment and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign HTML elements here to ensure they are loaded
    categoriesListDivAdmin = document.getElementById('categories-list');
    newCategoryNameInput = document.getElementById('new-category-name');
    addCategoryBtn = document.getElementById('add-category-btn');

    itemManagementSectionAdmin = document.getElementById('item-management-section');
    currentEditingCategorySpanAdmin = document.getElementById('current-editing-category');

    genericItemManagementDiv = document.getElementById('generic-item-management');
    pizzaSpecificManagementDiv = document.getElementById('pizza-specific-management'); 

    itemsListBodyAdmin = document.getElementById('items-list-body'); // Corrected ID to tbody
    genericItemFormTitle = document.getElementById('generic-item-form-title');
    newItemNameInputAdmin = document.getElementById('new-item-name');
    newItemShortDescInputAdmin = document.getElementById('new-item-short-desc');
    newItemPriceInputAdmin = document.getElementById('new-item-price');
    addItemBtnAdmin = document.getElementById('add-item-btn');
    clearItemFormBtnAdmin = document.getElementById('clear-item-form-btn');

    newItemImageURLInputAdmin = document.getElementById('new-item-image-url');
    newItemLongDescInputAdmin = document.getElementById('new-item-long-desc');
    newItemIngredientsInputAdmin = document.getElementById('new-item-ingredients');
    newItemAllergiesInputAdmin = document.getElementById('new-item-allergies');

    newPizzaSubcategoryNameInput = document.getElementById('new-pizza-subcategory-name');
    newPizzaSubcategoryDescInput = document.getElementById('new-pizza-subcategory-desc');
    addPizzaSubcategoryBtn = document.getElementById('add-pizza-subcategory-btn');
    pizzaSubcategoriesListDiv = document.getElementById('pizza-subcategories-list');
    pizzaItemsInSubcategorySection = document.getElementById('pizza-items-in-subcategory-section');
    currentPizzaSubcatNameSpan = document.getElementById('current-editing-pizza-subcategory-name');
    pizzaItemsListDisplayDiv = document.getElementById('pizza-items-list-display');


    // Attach event listener for adding new category
    if (addCategoryBtn && newCategoryNameInput) {
        addCategoryBtn.addEventListener('click', () => {
            if (!authInstance.currentUser) {
                showAdminMenuMessage("You must be logged in to add categories.", true);
                return;
            }
            const categoryName = newCategoryNameInput.value.trim();
            if (!categoryName) { showAdminMenuMessage('Please enter a category name.', true); return; }
            if (categoryName.toLowerCase() === 'pizzas' && currentPizzasFirebaseKey) {
                showAdminMenuMessage('A "Pizzas" category already exists. It must be unique for special handling.', true); return;
            }
            const newCategoryRef = dbInstance.ref('menu').push(); 
            const newCategoryId = newCategoryRef.key;
            let newCategoryData = { category: categoryName, id: newCategoryId };
            if (categoryName.toLowerCase() === 'pizzas') {
                newCategoryData.subcategories = {}; 
                newCategoryData.options = {};
            } else { newCategoryData.items = {}; } // Default for non-pizza categories
            newCategoryRef.set(newCategoryData)
                .then(() => { 
                    newCategoryNameInput.value = '';
                    showAdminMenuMessage("Category added successfully.", false);
                })
                .catch(e => {
                    console.error('Error adding category:', e);
                    showAdminMenuMessage(`Failed to add category: ${e.message}`, true);
                });
        });
    }

    // Attach event listener for clear generic item form button
    if(clearItemFormBtnAdmin){
        clearItemFormBtnAdmin.addEventListener('click', window.adminMenu.clearGenericItemForm);
    }

    // Attach event listener for adding generic item (from addItemBtnAdmin)
    if (addItemBtnAdmin) {
        addItemBtnAdmin.addEventListener('click', () => {
            if (!authInstance.currentUser) {
                showAdminMenuMessage("You must be logged in to add/update items.", true);
                return;
            }
            if (!currentEditingCategoryId) { showAdminMenuMessage("No category selected for item.", true); return; }
            const categoryData = menuDataCacheAdmin[currentEditingCategoryId];
            if (categoryData?.category?.toLowerCase() === "pizzas") {
                showAdminMenuMessage('Manage Pizzas via their subcategories, not directly here.', true); return; 
            }

            if (!newItemNameInputAdmin || !newItemShortDescInputAdmin || !newItemPriceInputAdmin ||
                !newItemImageURLInputAdmin || !newItemLongDescInputAdmin || !newItemIngredientsInputAdmin ||
                !newItemAllergiesInputAdmin) {
                console.error("Admin: Not all generic item form fields are available.");
                showAdminMenuMessage("Error: Some form fields are missing. Please refresh.", true);
                return;
            }

            const itemName = newItemNameInputAdmin.value.trim();
            const itemShortDesc = newItemShortDescInputAdmin.value.trim();
            const itemPriceText = newItemPriceInputAdmin.value.trim();
            const itemImageURL = newItemImageURLInputAdmin.value.trim();
            const itemLongDesc = newItemLongDescInputAdmin.value.trim();
            const itemIngredientsRaw = newItemIngredientsInputAdmin.value.trim();
            const itemAllergiesRaw = newItemAllergiesInputAdmin.value.trim();

            if (!itemName || !itemPriceText) { showAdminMenuMessage('Item name and price are required.', true); return; }
            const itemPrice = parseFloat(itemPriceText);
            if (isNaN(itemPrice)) { showAdminMenuMessage('Price must be a valid number.', true); return; }

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
                newItemData.id = editingItemIdGeneric; 
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
                showAdminMenuMessage(successMessage, false);
              })
              .catch(error => {
                  console.error('Error saving generic item:', error);
                  showAdminMenuMessage(`Failed to save item: ${error.message}`, true);
              });
        });
    }


    // Attach event listener for adding pizza subcategory
    if (addPizzaSubcategoryBtn && newPizzaSubcategoryNameInput && newPizzaSubcategoryDescInput) {
        addPizzaSubcategoryBtn.addEventListener('click', () => {
            if (!authInstance.currentUser) {
                showAdminMenuMessage("You must be logged in to add pizza subcategories.", true);
                return;
            }
            if (!currentPizzasFirebaseKey) { showAdminMenuMessage("The 'Pizzas' category key not available. Please ensure it exists.", true); return; }
            const subcatName = newPizzaSubcategoryNameInput.value.trim();
            const subcatDesc = newPizzaSubcategoryDescInput.value.trim();
            if (!subcatName) { showAdminMenuMessage('Pizza subcategory name required.', true); return; }
            const newSubcatRef = dbInstance.ref(`menu/${currentPizzasFirebaseKey}/subcategories`).push();
            const newSubcatId = newSubcatRef.key;
            newSubcatRef.set({ id: newSubcatId, name: subcatName, description: subcatDesc, items: {} })
                .then(() => { 
                    newPizzaSubcategoryNameInput.value = ''; 
                    newPizzaSubcategoryDescInput.value = ''; 
                    showAdminMenuMessage("Pizza subcategory added successfully.", false);
                })
                .catch(e => {
                    console.error('Error adding pizza subcategory:', e);
                    showAdminMenuMessage(`Failed to add pizza subcategory: ${e.message}`, true);
                });
        });
    }
});


// --- Firebase Listener for Menu Data ---
// This listener runs once auth state is known and stays active
// It updates menuDataCacheAdmin and triggers rendering if the menu section is active.
if (typeof firebase !== 'undefined' && firebase.auth && firebase.database) { 
    authInstance.onAuthStateChanged(user => {
      if (user) { 
        console.log("admin-menu.js: User is LOGGED IN. Attaching /menu listener.");
        // Only attach listener once to prevent multiple calls
        // Use .off() first if you re-run this logic multiple times
        dbInstance.ref('menu').on('value', (snapshot) => {
          const data = snapshot.val();
          menuDataCacheAdmin = data || {}; 

          // Check if the current section is 'menu-management-section' before rendering.
          // This ensures renderCategoriesAdmin is called when the tab is active.
          const menuManagementSection = document.getElementById('menu-management-section');
          if (menuManagementSection && !menuManagementSection.classList.contains('hidden')) {
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
            showAdminMenuMessage(`Error loading menu categories: ${error.message}`, true);
            if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = `<p class="text-center py-4 text-red-500" data-translate="error_loading_categories">Error loading categories: ${error.message}</p>`;
            if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
        });
      } else {
        console.log("admin-menu.js: User logged OUT. Clearing admin menu view.");
        if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = '<p class="text-gray-500" data-translate="login_to_manage_menu">Please log in to manage the menu.</p>';
        if(itemManagementSectionAdmin) itemManagementSectionAdmin.classList.add('hidden');
        if(pizzaSpecificManagementDiv) pizzaSpecificManagementDiv.classList.add('hidden');
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, categoriesListDivAdmin);
        menuDataCacheAdmin = {}; currentEditingCategoryId = null; currentPizzasFirebaseKey = null;
      }
    });
} else {
    console.error("admin-menu.js: FATAL - Firebase instances (auth or db) not defined. Ensure firebase.js is loaded before admin-menu.js.");
    if(document.getElementById('categories-list')) document.getElementById('categories-list').innerHTML = '<p class="text-red-500">Error: Firebase not initialized. Check console.</p>';
}