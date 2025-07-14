// /js/panels/admin.js - Redesigned for better UI/UX

const auth = firebase.auth();
const db = firebase.database();

/**
 * Creates the HTML for a single user row in the management list.
 * @param {string} uid - The user's unique ID.
 * @param {object} user - The user data object.
 * @returns {string} The HTML string for the user row.
 */
function createUserRow(uid, user) {
    const roles = ['owner', 'manager', 'admin', 'staff', 'delivery'];
    const roleOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');

    return `
        <div class="user-row flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-200" data-uid="${uid}" data-name="${(user.name || '').toLowerCase()}" data-email="${user.email.toLowerCase()}" data-role="${user.role || ''}">
            <div class="flex items-center w-full sm:w-1/3 mb-3 sm:mb-0">
                <i class="fas fa-user-circle text-3xl text-gray-400 mr-4"></i>
                <div>
                    <p class="font-bold text-gray-800">${user.name || 'N/A'}</p>
                    <p class="text-sm text-gray-500">${user.email}</p>
                </div>
            </div>
            <div class="w-full sm:w-1/4 mb-3 sm:mb-0">
                <select class="role-select w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-brand-red focus:border-brand-red">
                    ${roleOptions}
                </select>
            </div>
            <div class="w-full sm:w-auto text-center">
                <button class="save-role-btn w-full sm:w-auto bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-save"></i>
                    <span>Save</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Sets the user's role on the secure server.
 * @param {string} uid - The user's ID.
 * @param {string} role - The new role to assign.
 * @returns {Promise<object>} The response from the server.
 */
async function setRoleOnServer(uid, role) {
    const token = await auth.currentUser.getIdToken();
    // IMPORTANT: Replace 'http://localhost:3000' with your actual server URL in production.
    const response = await fetch('http://localhost:3000/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, role })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error occurred.');
    }
    return await response.json();
}

/**
 * Filters the user list based on search and role filters.
 */
function filterUsers() {
    const userListContainer = document.getElementById('user-list-container');
    const searchQuery = document.getElementById('user-search-input').value.toLowerCase();
    const roleFilter = document.getElementById('user-role-filter').value;
    const noResultsMessage = document.getElementById('no-results-message');

    let hasVisibleUsers = false;
    userListContainer.querySelectorAll('.user-row').forEach(row => {
        const nameMatch = row.dataset.name.includes(searchQuery);
        const emailMatch = row.dataset.email.includes(searchQuery);
        const roleMatch = roleFilter === 'all' || row.dataset.role === roleFilter;

        if ((nameMatch || emailMatch) && roleMatch) {
            row.style.display = 'flex';
            hasVisibleUsers = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    noResultsMessage.style.display = hasVisibleUsers ? 'none' : 'block';
}

/**
 * Main function to set up and load the User Management panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'User Management';

    const rolesForFilter = ['all', 'owner', 'manager', 'admin', 'staff', 'delivery'];
    const filterOptions = rolesForFilter.map(role => `<option value="${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</option>`).join('');

    panelRoot.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl p-6">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-6 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="border-b pb-4 mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Manage Users & Roles</h2>
                <p class="text-sm text-gray-500 mt-1">Assign roles to users to grant them specific permissions.</p>
            </div>
            
            <!-- Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="md:col-span-2 relative">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="search" id="user-search-input" placeholder="Search by name or email..." class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                </div>
                <div>
                    <select id="user-role-filter" class="w-full p-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-brand-red focus:border-brand-red">
                        ${filterOptions}
                    </select>
                </div>
            </div>

            <!-- User List -->
            <div id="user-list-container" class="border border-gray-200 rounded-lg overflow-hidden">
                <div id="loading-placeholder" class="text-center py-20 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    <p class="mt-3">Loading users...</p>
                </div>
                <div id="no-results-message" class="text-center py-20 text-gray-500" style="display: none;">
                    <i class="fas fa-user-slash text-3xl mb-3"></i>
                    <p>No users match your search.</p>
                </div>
            </div>
        </div>
    `;

    const userListContainer = document.getElementById('user-list-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');

    db.ref('users').get().then(snapshot => {
        loadingPlaceholder.style.display = 'none';
        if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([uid, user]) => {
                userListContainer.insertAdjacentHTML('beforeend', createUserRow(uid, user));
            });
        } else {
            userListContainer.innerHTML = '<p class="text-center p-8 text-gray-500">No users found in the database.</p>';
        }
        // Add the "no results" message placeholder after loading
        userListContainer.insertAdjacentHTML('beforeend', `
            <div id="no-results-message" class="text-center py-20 text-gray-500" style="display: none;">
                <i class="fas fa-user-slash text-3xl mb-3"></i>
                <p>No users match your search.</p>
            </div>
        `);
    });

    // --- Event Listeners ---
    document.getElementById('user-search-input').addEventListener('input', filterUsers);
    document.getElementById('user-role-filter').addEventListener('change', filterUsers);

    panelRoot.addEventListener('click', async (event) => {
        const saveButton = event.target.closest('.save-role-btn');
        if (saveButton) {
            const originalHtml = saveButton.innerHTML;
            saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>`;
            saveButton.disabled = true;

            const row = saveButton.closest('.user-row');
            const uid = row.dataset.uid;
            const newRole = row.querySelector('.role-select').value;
            
            try {
                await setRoleOnServer(uid, newRole);
                row.dataset.role = newRole; // Update data attribute for filtering
                alert('Role updated successfully!');
            } catch (error) {
                alert('Error updating role: ' + error.message);
            } finally {
                saveButton.innerHTML = originalHtml;
                saveButton.disabled = false;
            }
        }
    });
}
