// /js/panels/categories.js

const db = firebase.database();
let editingCategoryId = null;

/**
 * Renders the list of categories from Firebase.
 * @param {object} categories - The categories object from Firebase.
 */
function renderCategories(categories) {
    const listContainer = document.getElementById('category-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear current list

    if (!categories) {
        listContainer.innerHTML = '<p class="text-gray-500">No categories found. Add one to get started!</p>';
        return;
    }

    // Sort categories by displayOrder
    const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => a.displayOrder - b.displayOrder);

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    sortedCategories.forEach(([id, data]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${data.displayOrder}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 edit-btn" data-id="${id}" data-name="${data.category}" data-order="${data.displayOrder}">Edit</button>
                <button class="text-red-600 hover:text-red-900 ml-4 delete-btn" data-id="${id}" data-name="${data.category}">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    listContainer.appendChild(table);
}

/**
 * Populates the form for editing a category.
 * @param {string} id - The ID of the category to edit.
 * @param {string} name - The current name of the category.
 * @param {number} order - The current display order.
 */
function populateEditForm(id, name, order) {
    editingCategoryId = id;
    document.getElementById('category-name').value = name;
    document.getElementById('display-order').value = order;
    document.getElementById('form-title').textContent = 'Edit Category';
    document.getElementById('form-submit-btn').textContent = 'Update Category';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

/**
 * Clears the form and resets it to "Add" mode.
 */
function clearForm() {
    editingCategoryId = null;
    document.getElementById('category-form').reset();
    document.getElementById('form-title').textContent = 'Add New Category';
    document.getElementById('form-submit-btn').textContent = 'Add Category';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}


/**
 * Handles the form submission for adding or updating a category.
 * @param {Event} e - The form submission event.
 */
function handleFormSubmit(e) {
    e.preventDefault();
    const categoryName = document.getElementById('category-name').value.trim();
    const displayOrder = parseInt(document.getElementById('display-order').value, 10);

    if (!categoryName || isNaN(displayOrder)) {
        alert('Please fill in both fields with valid values.');
        return;
    }

    const categoryData = {
        category: categoryName,
        displayOrder: displayOrder
    };

    let promise;
    if (editingCategoryId) {
        // Update existing category
        promise = db.ref(`menu/${editingCategoryId}`).update(categoryData);
    } else {
        // Add new category
        const newCategoryKey = categoryName.toLowerCase().replace(/\s+/g, '-');
        promise = db.ref(`menu/${newCategoryKey}`).set(categoryData);
    }

    promise.then(() => {
        clearForm();
    }).catch(error => {
        console.error("Error saving category:", error);
        alert('An error occurred while saving the category.');
    });
}

/**
 * Handles the deletion of a category.
 * @param {string} id - The ID of the category to delete.
 * @param {string} name - The name of the category to delete.
 */
async function handleDelete(id, name) {
    // First, check if there are any items in this category.
    const itemsSnapshot = await db.ref(`menu/${id}/items`).once('value');
    if (itemsSnapshot.exists()) {
        alert(`Cannot delete "${name}" because it contains menu items. Please move or delete the items first.`);
        return;
    }

    // If no items, proceed with deletion confirmation.
    if (confirm(`Are you sure you want to delete the category "${name}"? This cannot be undone.`)) {
        db.ref(`menu/${id}`).remove().catch(error => {
            console.error("Error deleting category:", error);
            alert('An error occurred while deleting the category.');
        });
    }
}


/**
 * Main function to load the Category Management panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Category Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                <h3 id="form-title" class="text-xl font-bold mb-4">Add New Category</h3>
                <form id="category-form" class="space-y-4">
                    <div>
                        <label for="category-name" class="block text-sm font-medium text-gray-700">Category Name</label>
                        <input type="text" id="category-name" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    </div>
                    <div>
                        <label for="display-order" class="block text-sm font-medium text-gray-700">Display Order</label>
                        <input type="number" id="display-order" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., 1">
                    </div>
                    <div class="flex items-center gap-2">
                         <button type="submit" id="form-submit-btn" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">Add Category</button>
                         <button type="button" id="cancel-edit-btn" class="hidden w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition">Cancel</button>
                    </div>
                </form>
            </div>
            <div class="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <h3 class="text-xl font-bold mb-4">Existing Categories</h3>
                <div id="category-list" class="space-y-2">
                     <p class="text-center py-8"><i class="fas fa-spinner fa-spin"></i> Loading categories...</p>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners
    document.getElementById('category-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-edit-btn').addEventListener('click', clearForm);

    const listContainer = document.getElementById('category-list');
    listContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            populateEditForm(target.dataset.id, target.dataset.name, target.dataset.order);
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(target.dataset.id, target.dataset.name);
        }
    });

    // Initial load and listen for changes
    const categoriesRef = db.ref('menu');
    categoriesRef.on('value', (snapshot) => {
        renderCategories(snapshot.val());
    });
}
