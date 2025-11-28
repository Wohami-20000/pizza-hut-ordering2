// /js/panels/categories.js

const db = firebase.database();

// Tracks which category is currently being edited
let editingCategoryId = null;

// Tracks SortableJS instance for the categories table body
let sortableInstance = null;

// Tracks the currently highlighted (editing) row id
let currentEditingRowId = null;

// Tracks whether the drag-and-drop order has unsaved changes
let hasPendingOrderChanges = false;

/**
 * Utility: Safely call logAction if available.
 * @param {string} type
 * @param {string} title
 * @param {string} id
 * @param {object} [details]
 */
function safeLogAction(type, title, id, details = undefined) {
    if (typeof logAction === 'function') {
        try {
            logAction(type, title, id, details);
        } catch (err) {
            console.warn('logAction failed:', err);
        }
    }
}

/**
 * Clears all row highlights in the category table.
 */
function clearRowHighlight() {
    const tbody = document.getElementById('category-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
        row.classList.remove('bg-yellow-100');
    });
    currentEditingRowId = null;
}

/**
 * Applies highlight to a row matching the provided category id.
 * @param {string} id
 */
function highlightRowById(id) {
    const tbody = document.getElementById('category-tbody');
    if (!tbody) return;
    clearRowHighlight();
    const targetRow = Array.from(tbody.querySelectorAll('tr')).find(r => r.dataset.id === id);
    if (targetRow) {
        targetRow.classList.add('bg-yellow-100');
        currentEditingRowId = id;
    }
}

/**
 * Updates the state (enabled/disabled) of the "Save New Order" button.
 */
function updateSaveOrderButtonState() {
    const btn = document.getElementById('save-order-btn');
    if (!btn) return;
    btn.disabled = !hasPendingOrderChanges;
}

/**
 * Renders the list of categories from Firebase.
 * @param {object|null} categories - The categories object from Firebase.
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
    const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => {
        const aOrder = typeof a.displayOrder === 'number' ? a.displayOrder : Number(a.displayOrder) || 0;
        const bOrder = typeof b.displayOrder === 'number' ? b.displayOrder : Number(b.displayOrder) || 0;
        return aOrder - bOrder;
    });

    const wrapper = document.createElement('div');

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th class="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
        <tbody id="category-tbody" class="bg-white divide-y divide-gray-200">
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    sortedCategories.forEach(([id, data]) => {
        const displayOrder = data.displayOrder ?? '';
        const name = data.category ?? '(Unnamed)';

        const row = document.createElement('tr');
        row.dataset.id = id; // for sortable / saving order
        row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-400 cursor-move handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${displayOrder}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <button
                    class="text-indigo-600 hover:text-indigo-900 edit-btn"
                    data-id="${id}"
                    data-name="${name}"
                    data-order="${displayOrder}"
                >
                    Edit
                </button>
                <button
                    class="text-red-600 hover:text-red-900 delete-btn"
                    data-id="${id}"
                    data-name="${name}"
                >
                    Delete
                </button>
            </td>
        `;

        // Maintain highlight if this is the row being edited
        if (id === editingCategoryId) {
            row.classList.add('bg-yellow-100');
            currentEditingRowId = id;
        }

        tbody.appendChild(row);
    });

    wrapper.appendChild(table);

    // Save new order button
    const saveOrderBtn = document.createElement('button');
    saveOrderBtn.id = 'save-order-btn';
    saveOrderBtn.className = 'mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed';
    saveOrderBtn.type = 'button';
    saveOrderBtn.innerHTML = `
        <i class="fas fa-save mr-2"></i> Save New Order
    `;
    saveOrderBtn.disabled = !hasPendingOrderChanges;
    wrapper.appendChild(saveOrderBtn);

    listContainer.appendChild(wrapper);

    // Initialize or update Sortable
    const tbodyElement = document.getElementById('category-tbody');
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    if (typeof Sortable !== 'undefined' && tbodyElement) {
        sortableInstance = Sortable.create(tbodyElement, {
            handle: '.handle',
            animation: 150,
            onStart: () => {
                // Intentionally left blank for now
            },
            onEnd: () => {
                // Mark that there are unsaved changes when order is changed
                hasPendingOrderChanges = true;
                updateSaveOrderButtonState();
            }
        });
    } else {
        console.warn('SortableJS not found. Drag-and-drop ordering will be disabled.');
    }

    // Attach save order handler (ensure we don't attach multiple listeners)
    saveOrderBtn.addEventListener('click', saveNewOrder);
}

/**
 * Saves the new displayOrder values based on the current row order.
 */
async function saveNewOrder() {
    const tbody = document.getElementById('category-tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (!rows.length) return;

    // Compute new order mapping
    const updates = {};
    const orderDetails = [];
    rows.forEach((row, index) => {
        const id = row.dataset.id;
        const newOrder = index + 1;
        updates[`menu/${id}/displayOrder`] = newOrder;
        orderDetails.push({ id, displayOrder: newOrder });
    });

    try {
        await db.ref().update(updates);
        hasPendingOrderChanges = false;
        updateSaveOrderButtonState();
        safeLogAction('category:reorder', 'Category reorder', 'menu', { orderDetails });
        alert('Category order updated successfully.');
    } catch (error) {
        console.error('Error updating order:', error);
        alert('An error occurred while updating the order.');
    }
}

/**
 * Populates the form for editing a category.
 * @param {string} id - The ID of the category to edit.
 * @param {string} name - The current name of the category.
 * @param {number|string} order - The current display order.
 */
function populateEditForm(id, name, order) {
    editingCategoryId = id;
    document.getElementById('category-name').value = name;
    document.getElementById('display-order').value = order;
    document.getElementById('form-title').textContent = 'Edit Category';
    document.getElementById('form-submit-btn').textContent = 'Update Category';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    highlightRowById(id);
}

/**
 * Clears the form and resets it to "Add" mode.
 */
function clearForm() {
    editingCategoryId = null;
    const form = document.getElementById('category-form');
    if (form) form.reset();
    document.getElementById('form-title').textContent = 'Add New Category';
    document.getElementById('form-submit-btn').textContent = 'Add Category';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
    clearRowHighlight();
}

/**
 * Checks whether a displayOrder is already taken by another category.
 * @param {number} displayOrder
 * @param {string|null} currentId - The ID of the category being edited (if any).
 * @returns {Promise<boolean>}
 */
async function isDisplayOrderTaken(displayOrder, currentId = null) {
    const snapshot = await db.ref('menu').once('value');
    const categories = snapshot.val();
    if (!categories) return false;

    return Object.entries(categories).some(([id, data]) => {
        if (!data || typeof data.displayOrder === 'undefined') return false;
        if (currentId && id === currentId) return false;
        return Number(data.displayOrder) === Number(displayOrder);
    });
}

/**
 * Handles the form submission for adding or updating a category.
 * @param {Event} e - The form submission event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const categoryName = document.getElementById('category-name').value.trim();
    const displayOrder = parseInt(document.getElementById('display-order').value, 10);

    if (!categoryName || isNaN(displayOrder)) {
        alert('Please fill in both fields with valid values.');
        return;
    }

    try {
        // Uniqueness validation for displayOrder
        const isOrderTaken = await isDisplayOrderTaken(displayOrder, editingCategoryId);
        if (isOrderTaken) {
            alert('Display Order number is already taken. Please choose another.');
            return;
        }
    } catch (err) {
        console.error('Error validating display order:', err);
        alert('An error occurred while validating the display order.');
        return;
    }

    const categoryData = {
        category: categoryName,
        displayOrder: displayOrder
    };

    try {
        if (editingCategoryId) {
            // Update existing category
            const categoryRef = db.ref(`menu/${editingCategoryId}`);

            // Grab old data for logging
            let oldData = null;
            try {
                const snap = await categoryRef.once('value');
                oldData = snap.val() || null;
            } catch (err) {
                console.warn('Could not fetch old data for logging:', err);
            }

            await categoryRef.update(categoryData);

            safeLogAction('category:update', categoryName, editingCategoryId, {
                oldData,
                newData: categoryData
            });
        } else {
            // Add new category
            const newCategoryKey = categoryName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '') || `category-${Date.now()}`;

            const categoryRef = db.ref(`menu/${newCategoryKey}`);
            await categoryRef.set(categoryData);

            safeLogAction('category:create', categoryName, newCategoryKey, {
                data: categoryData
            });
        }

        clearForm();
    } catch (error) {
        console.error("Error saving category:", error);
        alert('An error occurred while saving the category.');
    }
}

/**
 * Handles the deletion of a category.
 * @param {string} id - The ID of the category to delete.
 * @param {string} name - The name of the category to delete.
 */
async function handleDelete(id, name) {
    // First, check if there are any items in this category.
    let itemsSnapshot;
    try {
        itemsSnapshot = await db.ref(`menu/${id}/items`).once('value');
    } catch (error) {
        console.error('Error checking items in category before delete:', error);
        alert('An error occurred while checking if the category can be deleted.');
        return;
    }

    if (itemsSnapshot.exists()) {
        alert(`Cannot delete "${name}" because it contains menu items. Please move or delete the items first.`);
        return;
    }

    // If no items, proceed with deletion confirmation.
    if (!confirm(`Are you sure you want to delete the category "${name}"? This cannot be undone.`)) {
        return;
    }

    try {
        safeLogAction('category:delete', name, id);
        await db.ref(`menu/${id}`).remove();

        // If we were editing this category, reset the form
        if (editingCategoryId === id) {
            clearForm();
        }
    } catch (error) {
        console.error("Error deleting category:", error);
        alert('An error occurred while deleting the category.');
    }
}

/**
 * Main function to load the Category Management panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Category Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Left: Form -->
            <div class="md:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                <h3 id="form-title" class="text-xl font-bold mb-4">Add New Category</h3>
                <form id="category-form" class="space-y-4">
                    <div>
                        <label for="category-name" class="block text-sm font-medium text-gray-700">
                            Category Name
                        </label>
                        <input
                            type="text"
                            id="category-name"
                            required
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g., Pizzas"
                        >
                    </div>
                    <div>
                        <label for="display-order" class="block text-sm font-medium text-gray-700">
                            Display Order
                        </label>
                        <input
                            type="number"
                            id="display-order"
                            required
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g., 1"
                            min="1"
                        >
                        <p class="mt-1 text-xs text-gray-500">
                            Determines the position of this category in the list. Lower numbers appear first.
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            type="submit"
                            id="form-submit-btn"
                            class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Add Category
                        </button>
                        <button
                            type="button"
                            id="cancel-edit-btn"
                            class="hidden w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            <!-- Right: List -->
            <div class="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold">Existing Categories</h3>
                    <p class="text-xs text-gray-400">
                        Drag the handle to reorder categories, then click "Save New Order".
                    </p>
                </div>
                <div id="category-list" class="space-y-2">
                    <p class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        Loading categories...
                    </p>
                </div>
            </div>
        </div>
    `;

    // Attach form listeners
    document.getElementById('category-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-edit-btn').addEventListener('click', clearForm);

    // Delegate edit/delete from the table
    const listContainer = document.getElementById('category-list');
    listContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            populateEditForm(target.dataset.id, target.dataset.name, target.dataset.order);
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(target.dataset.id, target.dataset.name);
        }
    });

    // Optional: warn about unsaved order changes when leaving the page
    window.addEventListener('beforeunload', (event) => {
        if (hasPendingOrderChanges) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    // Initial load and listen for realtime changes
    const categoriesRef = db.ref('menu');
    categoriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        renderCategories(data);
    });
}