// admin-menu.js - For Admin Menu Management

// Ensure Firebase is initialized (from firebase.js which should be loaded in admin.html)
// This script assumes 'auth' and 'db' (firebase.auth() and firebase.database()) are globally available
// after firebase.js and the Firebase SDKs are loaded in admin.html.

const categoriesListDivAdmin = document.getElementById('categories-list');
const newCategoryNameInput = document.getElementById('new-category-name');
const addCategoryBtn = document.getElementById('add-category-btn');

const itemManagementSectionAdmin = document.getElementById('item-management-section');
const currentEditingCategorySpanAdmin = document.getElementById('current-editing-category');
const itemsListDivAdmin = document.getElementById('items-list');

// Inputs for adding a new item
const newItemNameInputAdmin = document.getElementById('new-item-name');
const newItemDescInputAdmin = document.getElementById('new-item-desc');
const newItemPriceInputAdmin = document.getElementById('new-item-price');
const addItemBtnAdmin = document.getElementById('add-item-btn');

let menuDataCacheAdmin = {}; // Store the menu data from Firebase as an object
let currentEditingCategoryId = null; // To keep track of which category's items are being shown

function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return str.replace(/[&<>"']/g, function (match) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
  });
}

// --- Category Functions ---
function renderCategoriesAdmin(menuObject) {
  if (!categoriesListDivAdmin) {
      console.error("Admin categories list div not found");
      return;
  }
  categoriesListDivAdmin.innerHTML = ''; // Clear previous list
  if (!menuObject || Object.keys(menuObject).length === 0) {
    categoriesListDivAdmin.innerHTML = '<p>No categories found. Add one below.</p>';
    return;
  }

  // Convert the menu object to an array of categories for easier iteration if needed,
  // but we can iterate over object keys directly for rendering.
  for (const categoryId in menuObject) {
    if (menuObject.hasOwnProperty(categoryId)) {
      const category = menuObject[categoryId];
      if (!category || typeof category.category !== 'string') {
          console.warn("Skipping invalid category object:", categoryId, category);
          continue;
      }
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors';
      categoryDiv.innerHTML = `
        <span class="font-medium text-gray-700">${escapeHTML(category.category)}</span>
        <div>
          <button class="text-blue-600 hover:text-blue-800 mr-3 transition-colors" onclick="window.adminMenu.editCategoryItems('${categoryId}')">
            <i class="fas fa-edit mr-1"></i>Edit Items
          </button>
          <button class="text-red-500 hover:text-red-700 transition-colors" onclick="window.adminMenu.deleteCategory('${categoryId}')">
            <i class="fas fa-trash mr-1"></i>Delete Category
          </button>
        </div>
      `;
      categoriesListDivAdmin.appendChild(categoryDiv);
    }
  }
}

if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    console.log("Admin: Add Category button clicked");
    if (!newCategoryNameInput) {
        alert("Category name input field not found!");
        return;
    }
    const categoryName = newCategoryNameInput.value.trim();
    if (!categoryName) {
      alert('Please enter a category name.');
      return;
    }

    // Generate a unique ID for the category (Firebase push keys are good for this)
    const newCategoryRef = db.ref('menu').push(); // Get a new unique key
    const newCategoryId = newCategoryRef.key;

    const newCategoryData = {
      category: categoryName,
      id: newCategoryId, // Store the Firebase-generated key as an 'id' property as well for convenience
      // Initialize items or subcategories based on your needs, e.g., an empty items array
      items: {} // Using an object for items, keyed by unique item IDs
    };

    console.log("Admin: Trying to add category:", newCategoryData);
    newCategoryRef.set(newCategoryData)
      .then(() => {
        console.log('Admin: Category added successfully to Firebase with ID:', newCategoryId);
        newCategoryNameInput.value = ''; // Clear input
        // The main Firebase listener for /menu will re-render the list
      })
      .catch(error => {
        console.error('Admin: Error adding category to Firebase:', error);
        alert('Failed to add category: ' + error.message + (error.code === 'PERMISSION_DENIED' ? ' (Check admin login & Firebase rules for /menu)' : ''));
      });
  });
} else {
    console.error("Admin: 'add-category-btn' not found.");
}

// --- Item Functions ---
function renderItemsForAdmin(categoryId) {
  if (!itemsListDivAdmin || !currentEditingCategorySpanAdmin || !itemManagementSectionAdmin) {
      console.error("Admin item management elements not found");
      return;
  }
  currentEditingCategoryId = categoryId; // Store the ID of the category being edited
  itemsListDivAdmin.innerHTML = ''; // Clear previous items

  const categoryData = menuDataCacheAdmin[categoryId];
  if (!categoryData) {
    currentEditingCategorySpanAdmin.textContent = 'Unknown';
    itemsListDivAdmin.innerHTML = '<p>Category data not found.</p>';
    itemManagementSectionAdmin.classList.remove('hidden');
    return;
  }

  currentEditingCategorySpanAdmin.textContent = escapeHTML(categoryData.category);
  const itemsObject = categoryData.items || (categoryData.subcategories ? {} : {}); // Handle cases, pizzas need different UI

  if (Object.keys(itemsObject).length === 0 && categoryData.category !== "Pizzas") {
    itemsListDivAdmin.innerHTML = '<p>No items in this category yet. Add one below.</p>';
  } else if (categoryData.category === "Pizzas") {
    // Pizza management UI is more complex - this is a placeholder
    itemsListDivAdmin.innerHTML = '<p>Pizza subcategory & item management UI needs to be built here.</p>';
    // You'd iterate over catObj.subcategories and catObj.options here if they exist
  } else {
    for (const itemId in itemsObject) {
      if (itemsObject.hasOwnProperty(itemId)) {
        const item = itemsObject[itemId];
        if (!item || typeof item.name !== 'string') {
            console.warn("Skipping invalid item in admin render:", itemId, item);
            continue;
        }
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center p-2 border rounded bg-gray-100 mb-1';
        itemDiv.innerHTML = `
          <div>
            <p class="font-semibold">${escapeHTML(item.name)}</p>
            <p class="text-sm text-gray-600">${item.desc ? escapeHTML(item.desc) : ''} - ${item.price ? escapeHTML(item.price) + ' DH' : 'N/A'}</p>
          </div>
          <button class="text-red-500 hover:text-red-700" onclick="window.adminMenu.deleteItem('${categoryId}', '${itemId}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        `;
        itemsListDivAdmin.appendChild(itemDiv);
      }
    }
  }
  itemManagementSectionAdmin.classList.remove('hidden'); // Make sure the section is visible
}

if (addItemBtnAdmin) {
  addItemBtnAdmin.addEventListener('click', () => {
    console.log("Admin: Add Item button clicked for category ID:", currentEditingCategoryId);
    if (!currentEditingCategoryId) {
      alert('Please select a category to edit first by clicking "Edit Items".');
      return;
    }
    if (!newItemNameInputAdmin || !newItemDescInputAdmin || !newItemPriceInputAdmin) {
        alert("Item input fields not found!");
        return;
    }

    const itemName = newItemNameInputAdmin.value.trim();
    const itemDesc = newItemDescInputAdmin.value.trim();
    const itemPriceText = newItemPriceInputAdmin.value.trim();

    if (!itemName || itemPriceText === '') {
      alert('Please enter at least an item name and price.');
      return;
    }
    const itemPrice = parseFloat(itemPriceText);
    if (isNaN(itemPrice)) {
        alert('Price must be a valid number.');
        return;
    }

    const categoryData = menuDataCacheAdmin[currentEditingCategoryId];
    if (categoryData && categoryData.category === "Pizzas") {
      alert('Adding items to "Pizzas" category requires special handling for subcategories and sizes. This UI is simplified.');
      return; // Pizza items need a more complex UI and data structure.
    }

    const newItemRef = db.ref('menu/' + currentEditingCategoryId + '/items').push(); // Get new unique key for item
    const newItemId = newItemRef.key;

    const newItemData = {
      id: newItemId, // Store the Firebase-generated key as an 'id'
      name: itemName,
      desc: itemDesc,
      price: itemPrice,
    };
    console.log("Admin: Trying to add item:", newItemData, "to category:", currentEditingCategoryId);

    newItemRef.set(newItemData)
      .then(() => {
        console.log('Admin: Item added successfully to Firebase with ID:', newItemId);
        newItemNameInputAdmin.value = '';
        newItemDescInputAdmin.value = '';
        newItemPriceInputAdmin.value = '';
        // View will update via the main listener or by calling renderItemsForAdmin if desired
        // renderItemsForAdmin(currentEditingCategoryId); // Optionally re-render immediately
      })
      .catch(error => {
        console.error('Admin: Error adding item to Firebase:', error);
        alert('Failed to add item: ' + error.message + (error.code === 'PERMISSION_DENIED' ? ' (Check admin login & Firebase rules for /menu)' : ''));
      });
  });
} else {
    console.error("Admin: 'add-item-btn' not found.");
}

// To be called by HTML buttons (make sure this object is on window)
window.adminMenu = {
  editCategoryItems: (categoryId) => {
    console.log("Admin: Editing items for category ID:", categoryId);
    if (!itemManagementSectionAdmin) {
        console.error("Admin: itemManagementSectionAdmin not found");
        return;
    }
    itemManagementSectionAdmin.classList.remove('hidden');
    renderItemsForAdmin(categoryId);
  },

  deleteCategory: (categoryId) => {
    console.log("Admin: Attempting to delete category ID:", categoryId);
    if (!confirm(`Are you sure you want to delete this category and all its items? ID: ${categoryId}`)) {
      return;
    }
    db.ref('menu/' + categoryId).remove()
      .then(() => {
        console.log('Admin: Category deleted successfully from Firebase:', categoryId);
        if (currentEditingCategoryId === categoryId && itemManagementSectionAdmin) {
          itemManagementSectionAdmin.classList.add('hidden'); // Hide item section if deleted category was being edited
          currentEditingCategoryId = null;
        }
        // View will update via the main Firebase 'value' listener
      })
      .catch(error => {
        console.error('Admin: Error deleting category from Firebase:', error);
        alert('Failed to delete category: ' + error.message + (error.code === 'PERMISSION_DENIED' ? ' (Check admin login & Firebase rules for /menu)' : ''));
      });
  },

  deleteItem: (categoryId, itemId) => {
    console.log("Admin: Attempting to delete item ID:", itemId, "from category ID:", categoryId);
    if (!confirm(`Are you sure you want to delete this item? ID: ${itemId}`)) {
      return;
    }
    // This path assumes items are direct children of the category node in Firebase
    // If your structure is different (e.g. items within subcategories), adjust the path.
    const itemPath = `menu/${categoryId}/items/${itemId}`;
    
    // Check if category is "Pizzas" as items are structured differently
    const categoryData = menuDataCacheAdmin[categoryId];
    if (categoryData && categoryData.category === "Pizzas") {
        alert("Deleting items from 'Pizzas' category needs a more specific UI and logic for subcategories/sizes.");
        // You'd need to find the item within the subcategories array and update that structure.
        // Example: find subcategory -> find item in sizes -> remove -> update entire category or specific subcategory
        return;
    }

    db.ref(itemPath).remove()
      .then(() => {
        console.log('Admin: Item deleted successfully from Firebase:', itemPath);
        // Optionally re-render items for the current category
        // if (currentEditingCategoryId === categoryId) {
        //   renderItemsForAdmin(categoryId);
        // }
        // The main Firebase listener for /menu should update the view
      })
      .catch(error => {
        console.error('Admin: Error deleting item from Firebase:', error);
        alert('Failed to delete item: ' + error.message + (error.code === 'PERMISSION_DENIED' ? ' (Check admin login & Firebase rules for /menu)' : ''));
      });
  }
};


// --- Firebase Listener for Menu Data in Admin Panel ---
// Ensure auth and db are defined (they should be from admin.html's main script block)
if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
    auth.onAuthStateChanged(user => {
      if (user) { // Only setup listener if admin is logged in
        console.log("Admin: User is logged in, setting up Firebase /menu listener.");
        db.ref('menu').on('value', (snapshot) => {
          const data = snapshot.val();
          console.log("Admin: Menu data from Firebase:", data);
          menuDataCacheAdmin = data || {}; // Store as an object, or empty object if null
          renderCategoriesAdmin(menuDataCacheAdmin); // Re-render categories list

          // If a category was being edited, refresh its item view
          if (currentEditingCategoryId && menuDataCacheAdmin[currentEditingCategoryId] && itemManagementSectionAdmin) {
            renderItemsForAdmin(currentEditingCategoryId);
          } else if (currentEditingCategoryId && !menuDataCacheAdmin[currentEditingCategoryId] && itemManagementSectionAdmin) {
            // If the category being edited was deleted
            itemManagementSectionAdmin.classList.add('hidden');
            currentEditingCategoryId = null;
          }

        }, (error) => {
            console.error("Admin: Error listening to /menu in Firebase:", error);
            if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = "<p>Error loading menu data for admin.</p>";
        });
      } else {
        console.log("Admin: User is not logged in. Menu management features will not write to Firebase.");
        // Optionally clear admin views if user logs out from this page dynamically,
        // though admin.html already has a redirect if user is not authenticated on load.
        if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = '<p>Please log in to manage the menu.</p>';
        if(itemManagementSectionAdmin) itemManagementSectionAdmin.classList.add('hidden');
      }
    });
} else {
    console.error("Admin: Firebase 'auth' or 'db' is not defined. Ensure Firebase SDKs and firebase.js are loaded before admin-menu.js.");
    if(categoriesListDivAdmin) categoriesListDivAdmin.innerHTML = "<p>Error: Firebase connection not available for admin.</p>";
}


// --- Initial Setup ---
if (itemManagementSectionAdmin) {
    itemManagementSectionAdmin.classList.add('hidden'); // Initially hide item management
} else {
    console.error("Admin: 'item-management-section' not found on page load.");
} 