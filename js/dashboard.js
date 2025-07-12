// /js/panels/admin.js

// **FIX:** Get Firebase services using the v8 namespaced syntax
const auth = firebase.auth();
const db = firebase.database();

/**
 * Creates the HTML for a single row in the user table.
 * @param {string} uid - The user's unique ID.
 * @param {object} user - The user's data from the database.
 * @returns {string} The HTML string for the table row.
 */
function createUserRow(uid, user) {
    const roles = ['owner', 'manager', 'admin', 'staff', 'delivery'];
    const roleOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');

    return `
        <tr class="hover:bg-gray-50" data-uid="${uid}">
            <td class="px-4 py-3 text-sm text-gray-700">${user.name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${user.email}</td>
            <td class="px-4 py-3 text-sm">
                <select class="role-select border-gray-300 rounded-md shadow-sm w-full p-2">
                    ${roleOptions}
                </select>
            </td>
            <td class="px-4 py-3 text-sm text-center">
                <button class="save-role-btn bg-green-600 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-green-700 transition">Save</button>
                <span class="role-feedback-message ml-2 text-xs"></span>
            </td>
        </tr>
    `;
}

/**
 * Calls your secure local server to set a user's role.
 * @param {string} uid - The UID of the user to update.
 * @param {string} role - The new role to assign.
 */
async function setRoleOnServer(uid, role) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Admin user is not authenticated.");
    }

    // Get the admin's ID token to prove they are who they say they are
    const token = await user.getIdToken();

    const response = await fetch('http://localhost:3000/set-role', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Send the token for verification
        },
        body: JSON.stringify({ uid, role })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server responded with an error.');
    }

    return await response.json();
}

/**
 * Main function to load the Admin Panel. This is the entry point.
 * @param {HTMLElement} panelRoot - The root element to draw the panel in.
 * @param {HTMLElement} panelTitle - The element for the page title.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'User Management'; // Update the main title

    // This is the new layout with a user table
    panelRoot.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg">
            <div class="p-4 border-b">
                <h3 class="text-lg font-semibold">All Restaurant Users</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                            <th class="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-list-body">
                        <tr><td colspan="4" class="text-center p-4">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Fetch and display all users from the database
    db.ref('users').get().then((snapshot) => {
        const userListBody = document.getElementById('user-list-body');
        if (snapshot.exists()) {
            let usersHtml = '';
            snapshot.forEach((childSnapshot) => {
                usersHtml += createUserRow(childSnapshot.key, childSnapshot.val());
            });
            userListBody.innerHTML = usersHtml;
        } else {
            userListBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No users found.</td></tr>';
        }
    });

    // Add one single event listener to the whole panel to handle all clicks
    panelRoot.addEventListener('click', async (event) => {
        // Only act if a "Save" button was clicked
        if (event.target.classList.contains('save-role-btn')) {
            const button = event.target;
            const row = button.closest('tr');
            const uid = row.dataset.uid;
            const newRole = row.querySelector('.role-select').value;
            const feedbackSpan = row.querySelector('.role-feedback-message');

            button.disabled = true;
            feedbackSpan.textContent = 'Saving...';
            feedbackSpan.className = 'role-feedback-message ml-2 text-xs text-gray-500';

            try {
                const result = await setRoleOnServer(uid, newRole);
                console.log(result.message);
                feedbackSpan.textContent = 'Saved!';
                feedbackSpan.className = 'role-feedback-message ml-2 text-xs text-green-600 font-bold';
            } catch (error) {
                console.error('Error setting role:', error);
                feedbackSpan.textContent = 'Error!';
                feedbackSpan.className = 'role-feedback-message ml-2 text-xs text-red-600 font-bold';
            } finally {
                setTimeout(() => {
                    button.disabled = false;
                    feedbackSpan.textContent = '';
                }, 2000);
            }
        }
    });
}