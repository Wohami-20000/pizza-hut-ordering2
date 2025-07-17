// /js/panels/admin.js

const auth = firebase.auth();
const db = firebase.database();

// Helper function to escape HTML characters
function escapeHTML(str) {
    if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
    return String(str).replace(/[<>&"']/g, s => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;"
    }[s]));
}


/**
 * Creates the HTML for a single user row in the user management table.
 * Includes buttons for role management, status toggling, and viewing order history for customers.
 * @param {string} uid The Firebase User ID.
 * @param {object} user The user data object from Firebase Realtime Database.
 * @returns {string} The HTML string for the user table row.
 */
function createUserRow(uid, user) {
    // Define available roles. 'customer' is included for display purposes.
    const roles = ['owner', 'manager', 'admin', 'staff', 'delivery', 'customer']; 
    // Generate options for the role select dropdown, marking the current role as selected.
    const roleOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');

    // Determine user status (active/deactivated) and corresponding button text/class.
    const isDisabled = user.isDisabled === true; // Firebase returns `true` or undefined/false
    const statusText = isDisabled ? 'Deactivated' : 'Active';
    const statusClass = isDisabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const buttonText = isDisabled ? 'Activate' : 'Deactivate';
    const buttonClass = isDisabled ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600';

    // Conditionally render the 'See Orders' button only for 'customer' roles.
    const seeOrdersButtonHtml = user.role === 'customer' ? `
        <button class="view-orders-btn bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-600">See Orders</button>
    ` : '';

    // Return the complete HTML for the table row.
    return `
        <tr class="hover:bg-gray-50 transition" data-uid="${uid}" data-user-name="${escapeHTML(user.name || user.email)}">
            <td class="p-3 text-sm text-gray-700">${user.name || 'N/A'}</td>
            <td class="p-3 text-sm text-gray-500">${user.email}</td>
            <td class="p-3">
                <select class="role-select w-full p-2 border rounded-md">${roleOptions}</select>
            </td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="p-3 text-center space-x-2">
                <button class="save-role-btn bg-brand-red text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-700">Save Role</button>
                <button class="toggle-status-btn ${buttonClass} text-white px-3 py-1 rounded-lg text-xs font-semibold"
                        data-is-disabled="${isDisabled}">${buttonText}</button>
                ${seeOrdersButtonHtml}
            </td>
        </tr>
    `;
}

/**
 * Sends a request to the server to set a custom role claim for a user.
 * This function interacts with the Firebase Admin SDK via a backend server.
 * @param {string} uid The User ID whose role is to be set.
 * @param {string} role The new role to assign (e.g., 'admin', 'manager', 'customer').
 * @returns {Promise<object>} A promise that resolves with the server response.
 */
async function setRoleOnServer(uid, role) {
    // Get the current user's ID token for authentication with the backend.
    const token = await auth.currentUser.getIdToken();
    // Send a POST request to the backend '/set-role' endpoint.
    const response = await fetch('http://localhost:3000/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, role })
    });
    // Check if the response was successful. If not, throw an error with the server's message.
    if (!response.ok) throw new Error((await response.json()).error || 'Server error');
    // Parse and return the JSON response.
    return await response.json();
}

/**
 * Sends a request to the server to toggle a user's disabled status.
 * This function interacts with the Firebase Admin SDK via a backend server.
 * @param {string} uid The User ID whose status is to be toggled.
 * @param {boolean} disabled True to deactivate the user, false to activate.
 * @returns {Promise<object>} A promise that resolves with the server response.
 */
async function toggleUserStatusOnServer(uid, disabled) {
    // Get the current user's ID token for authentication with the backend.
    const token = await auth.currentUser.getIdToken();
    // Send a POST request to the backend '/toggle-user-status' endpoint.
    const response = await fetch('http://localhost:3000/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, disabled })
    });
    // Check if the response was successful. If not, throw an error with the server's message.
    if (!response.ok) throw new Error((await response.json()).error || 'Server error');
    // Parse and return the JSON response.
    return await response.json();
}

// --- FUNCTIONS FOR ORDER HISTORY MODAL ---

/**
 * Opens a modal by removing 'hidden' class and applying transition classes.
 * @param {string} modalId The ID of the modal element to open.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden'); // Remove display: none
        // Use a small timeout to allow the browser to register the 'display' change
        // before applying opacity/transform for CSS transitions.
        setTimeout(() => {
            modal.classList.add('opacity-100'); // Apply opacity for fade-in
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('scale-100', 'opacity-100'); // Apply scale and opacity for inner content transition
            }
        }, 10); 
    } else {
        console.error(`Modal element with ID '${modalId}' not found in the DOM.`);
    }
}

/**
 * Closes a modal by applying transition classes and then adding 'hidden' class.
 * @param {string} modalId The ID of the modal element to close.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('opacity-100'); // Remove opacity for fade-out
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-100', 'opacity-100'); // Remove scale and opacity for inner content transition
        }
        // After transition duration, re-add 'hidden' to fully remove from layout.
        setTimeout(() => {
            modal.classList.add('hidden'); // Re-apply display: none
        }, 300); // Match CSS transition duration
    }
}

/**
 * Creates the HTML for a single order history card to be displayed in the modal.
 * @param {object} orderData The order data object.
 * @returns {string} The HTML string for the order card.
 */
function createOrderHistoryCard(orderData) {
    const date = new Date(orderData.timestamp).toLocaleString();
    // Summarize items, e.g., "2x Pizza, 1x Coke"
    const itemsSummary = orderData.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    // Link to the full order details page (assuming it exists)
    const orderLink = `../order-details.html?orderId=${orderData.orderId}`; 

    return `
        <div class="bg-gray-50 p-4 rounded-lg shadow-sm mb-3">
            <div class="flex justify-between items-center">
                <h4 class="font-semibold text-gray-800">Order #${orderData.orderNumber || orderData.orderId}</h4>
                <span class="text-xs font-medium text-gray-600">${date}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1 truncate" title="${itemsSummary}">${itemsSummary}</p>
            <div class="flex justify-between items-center mt-3">
                <span class="font-bold text-lg text-brand-red">${orderData.priceDetails.finalTotal.toFixed(2)} MAD</span>
                <a href="${orderLink}" target="_blank" class="text-blue-600 hover:underline text-sm">View Details <i class="fas fa-external-link-alt ml-1"></i></a>
            </div>
        </div>
    `;
}

/**
 * Fetches a user's order history from Firebase and populates the modal.
 * @param {string} uid The User ID whose orders are to be loaded.
 * @param {string} userName The name of the user to display in the modal title.
 */
async function loadUserOrdersIntoModal(uid, userName) {
    const ordersHistoryContent = document.getElementById('orders-history-content');
    const modalTitle = document.getElementById('orders-history-modal-title');
    
    // Set modal title and show loading spinner.
    modalTitle.textContent = `${userName}'s Order History`;
    ordersHistoryContent.innerHTML = `
        <div class="text-center py-10">
            <i class="fas fa-spinner fa-spin text-4xl text-brand-red"></i>
            <p class="mt-4 text-lg text-gray-600">Loading orders...</p>
        </div>
    `;
    
    try {
        // Fetch all order IDs associated with the user.
        const userOrdersSnapshot = await db.ref(`users/${uid}/orders`).get();
        if (!userOrdersSnapshot.exists()) {
            ordersHistoryContent.innerHTML = '<p class="text-center py-10 text-gray-500">No orders found for this user.</p>';
            return;
        }

        // Get all order IDs and fetch full order details for each.
        const orderIds = Object.keys(userOrdersSnapshot.val());
        const orderPromises = orderIds.map(orderId => db.ref(`orders/${orderId}`).get());
        const orderSnapshots = await Promise.all(orderPromises);

        let orders = [];
        // Collect valid order data.
        orderSnapshots.forEach(snapshot => {
            if (snapshot.exists()) {
                orders.push({ orderId: snapshot.key, ...snapshot.val() });
            }
        });

        // Sort orders by timestamp, newest first.
        orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Render order cards or a "no orders" message.
        if (orders.length > 0) {
            ordersHistoryContent.innerHTML = orders.map(order => createOrderHistoryCard(order)).join('');
        } else {
            ordersHistoryContent.innerHTML = '<p class="text-center py-10 text-gray-500">No orders found for this user.</p>';
        }

    } catch (error) {
        console.error("Error loading user orders into modal:", error); 
        ordersHistoryContent.innerHTML = `<p class="text-center py-10 text-red-500">Error loading orders: ${error.message}</p>`;
    }
}

/**
 * Main function to load the Admin Panel, specifically the User Management section.
 * This function sets up the panel's HTML structure, loads user data, and attaches event listeners.
 * @param {HTMLElement} panelRoot The root DOM element where the panel content will be rendered.
 * @param {HTMLElement} panelTitle The DOM element for the panel's title.
 * @param {HTMLElement} navContainer The DOM element for the sidebar navigation.
 */
export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'System Administration';
    
    // Set up the navigation links specific to the Admin role.
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="users"><i class="fas fa-users mr-3"></i>User Management</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="analytics"><i class="fas fa-chart-line mr-3"></i>Analytics</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="team"><i class="fas fa-sitemap mr-3"></i>Team Management</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="assign-deliveries"><i class="fas fa-motorcycle mr-3"></i>Assign Deliveries</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="stock"><i class="fas fa-boxes mr-3"></i>Stock Management</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="orders"><i class="fas fa-receipt mr-3"></i>Order Management</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="feedback"><i class="fas fa-comment-dots mr-3"></i>Customer Feedback</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="menu-items"><i class="fas fa-pizza-slice mr-3"></i>Menu Items</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="offers"><i class="fas fa-star mr-3"></i>Offers / Deals</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="promo-codes"><i class="fas fa-gift mr-3"></i>Promo Codes</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="system"><i class="fas fa-cogs mr-3"></i>System Config</a>
    `;

    // Set the main content of the panel, including the user table and the hidden order history modal.
    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">User Management</h2>
            <div class="overflow-x-auto rounded-lg border">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Email</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Role</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Status</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-list-body" class="bg-white divide-y"></tbody>
                </table>
            </div>
        </div>

        <!-- Orders History Modal HTML Structure -->
        <div id="orders-history-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden opacity-0 transition-opacity duration-300 z-50 p-4">
            <div class="modal-content bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform scale-95 opacity-0 transition-all duration-300">
                <div class="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 id="orders-history-modal-title" class="text-2xl font-bold text-gray-800">User Order History</h3>
                    <button class="close-modal-btn text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div id="orders-history-content" class="max-h-96 overflow-y-auto space-y-4">
                    <!-- Order history cards will be loaded here -->
                </div>
            </div>
        </div>
    `;

    /**
     * Loads and displays all users in the user management table.
     */
    const loadUsers = () => {
        db.ref('users').get().then(snapshot => {
            const userListBody = document.getElementById('user-list-body');
            if (snapshot.exists()) {
                // Map user data to HTML rows and join them.
                userListBody.innerHTML = Object.entries(snapshot.val()).map(([uid, user]) => createUserRow(uid, user)).join('');
            } else {
                userListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No users found.</td></tr>';
            }
        }).catch(error => {
            console.error("Error loading users:", error);
            const userListBody = document.getElementById('user-list-body');
            if (userListBody) userListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading users.</td></tr>';
        });
    };

    // Initial load of users when the panel is loaded.
    loadUsers();

    // Event listener for closing the order history modal.
    // Uses event delegation on panelRoot to catch clicks on the dynamically added close button.
    panelRoot.addEventListener('click', (event) => {
        if (event.target.classList.contains('close-modal-btn')) {
            closeModal('orders-history-modal');
        }
    });

    // Main event listener for buttons within the user list table.
    // Uses event delegation on panelRoot to handle clicks on dynamically added buttons.
    panelRoot.addEventListener('click', async (event) => {
        // Wrap the entire logic in a try-catch to catch any unexpected errors during button actions.
        try {
            // Handle Save Role button click
            if (event.target.classList.contains('save-role-btn')) {
                const row = event.target.closest('tr');
                const uid = row.dataset.uid;
                const newRole = row.querySelector('.role-select').value;
                try {
                    await setRoleOnServer(uid, newRole);
                    alert('Role updated successfully!');
                    // Reload users to reflect potential role changes (e.g., 'See Orders' button visibility)
                    loadUsers(); 
                } catch (error) {
                    alert('Error updating role: ' + error.message);
                }
            }
            // Handle Toggle Status button click
            else if (event.target.classList.contains('toggle-status-btn')) {
                const row = event.target.closest('tr');
                const uid = row.dataset.uid;
                // Get current disabled status from data attribute.
                const currentDisabledStatus = event.target.dataset.isDisabled === 'true';
                const newDisabledStatus = !currentDisabledStatus;

                // Confirm action with the user.
                if (!confirm(`Are you sure you want to ${newDisabledStatus ? 'deactivate' : 'activate'} this user?`)) {
                    return;
                }

                try {
                    await toggleUserStatusOnServer(uid, newDisabledStatus);
                    alert(`User successfully ${newDisabledStatus ? 'deactivated' : 'activated'}!`);
                    // Reload users to reflect the updated status.
                    loadUsers();
                } catch (error) {
                    alert('Error toggling user status: ' + error.message);
                }
            }
            // Handle View Orders button click
            else if (event.target.classList.contains('view-orders-btn')) {
                const row = event.target.closest('tr');
                if (!row) {
                    console.error("View Orders button clicked, but parent row (tr) not found."); 
                    return;
                }
                const uid = row.dataset.uid;
                const userName = row.dataset.userName;
                
                // Load user orders into the modal and then open the modal.
                await loadUserOrdersIntoModal(uid, userName);
                openModal('orders-history-modal');
            }
        } catch (error) {
            console.error("An unexpected error occurred in User Management actions:", error);
            alert("An unexpected error occurred. Please check the console for details.");
        }
    });
}
