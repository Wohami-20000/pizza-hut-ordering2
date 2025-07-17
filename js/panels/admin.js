// /js/panels/admin.js

const auth = firebase.auth();
const db = firebase.database();

function createUserRow(uid, user) {
    const roles = ['owner', 'manager', 'admin', 'staff', 'delivery', 'customer']; // Ensure 'customer' is here
    const roleOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');

    // Determine current status and button text/class
    const isDisabled = user.isDisabled === true; // Firebase returns `true` or undefined/false
    const statusText = isDisabled ? 'Deactivated' : 'Active';
    const statusClass = isDisabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const buttonText = isDisabled ? 'Activate' : 'Deactivate';
    const buttonClass = isDisabled ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600';


    return `
        <tr class="hover:bg-gray-50 transition" data-uid="${uid}">
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
            </td>
        </tr>
    `;
}

async function setRoleOnServer(uid, role) {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, role })
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Server error');
    return await response.json();
}

// NEW FUNCTION: Send request to toggle user active status
async function toggleUserStatusOnServer(uid, disabled) {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, disabled })
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Server error');
    return await response.json();
}


export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'System Administration';
    
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
    `;

    // Function to load and render users
    const loadUsers = () => {
        db.ref('users').get().then(snapshot => {
            const userListBody = document.getElementById('user-list-body');
            if (snapshot.exists()) {
                userListBody.innerHTML = Object.entries(snapshot.val()).map(([uid, user]) => createUserRow(uid, user)).join('');
            } else {
                userListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No users found.</td></tr>'; // Adjusted colspan
            }
        }).catch(error => {
            console.error("Error loading users:", error);
            const userListBody = document.getElementById('user-list-body');
            if (userListBody) userListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading users.</td></tr>'; // Adjusted colspan
        });
    };

    // Initial load of users
    loadUsers();

    panelRoot.addEventListener('click', async (event) => {
        // Handle Save Role button click
        if (event.target.classList.contains('save-role-btn')) {
            const row = event.target.closest('tr');
            const uid = row.dataset.uid;
            const newRole = row.querySelector('.role-select').value;
            try {
                await setRoleOnServer(uid, newRole);
                alert('Role updated successfully!');
                // Optional: Reload users to ensure UI is fully consistent with DB state
                // loadUsers();
            } catch (error) {
                alert('Error updating role: ' + error.message);
            }
        }
        // NEW: Handle Toggle Status button click
        else if (event.target.classList.contains('toggle-status-btn')) {
            const row = event.target.closest('tr');
            const uid = row.dataset.uid;
            const currentDisabledStatus = event.target.dataset.isDisabled === 'true'; // Convert string to boolean
            const newDisabledStatus = !currentDisabledStatus; // Toggle status

            // Confirmation dialog
            if (!confirm(`Are you sure you want to ${newDisabledStatus ? 'deactivate' : 'activate'} this user?`)) {
                return;
            }

            try {
                await toggleUserStatusOnServer(uid, newDisabledStatus);
                alert(`User successfully ${newDisabledStatus ? 'deactivated' : 'activated'}!`);
                loadUsers(); // Reload users to reflect the new status
            } catch (error) {
                alert('Error toggling user status: ' + error.message);
            }
        }
    });
}