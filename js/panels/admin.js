// /js/panels/admin.js

const auth = firebase.auth();
const db = firebase.database();

function createUserRow(uid, user) {
    const roles = ['owner', 'manager', 'admin', 'staff', 'delivery'];
    const roleOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');

    return `
        <tr class="hover:bg-gray-50 transition" data-uid="${uid}">
            <td class="p-3 text-sm text-gray-700">${user.name || 'N/A'}</td>
            <td class="p-3 text-sm text-gray-500">${user.email}</td>
            <td class="p-3"><select class="role-select w-full p-2 border rounded-md">${roleOptions}</select></td>
            <td class="p-3 text-center"><button class="save-role-btn bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Save</button></td>
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

export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'System Administration';
    
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="users"><i class="fas fa-users mr-3"></i>User Management</a>
        <a href="#" class="block py-2.5 px-4 rounded-lg hover:bg-gray-700 hover:text-white" data-panel="orders"><i class="fas fa-receipt mr-3"></i>Order Management</a>
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
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-list-body" class="bg-white divide-y"></tbody>
                </table>
            </div>
        </div>
    `;

    db.ref('users').get().then(snapshot => {
        const userListBody = document.getElementById('user-list-body');
        if (snapshot.exists()) {
            userListBody.innerHTML = Object.entries(snapshot.val()).map(([uid, user]) => createUserRow(uid, user)).join('');
        } else {
            userListBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No users found.</td></tr>';
        }
    });

    panelRoot.addEventListener('click', async (event) => {
        if (event.target.classList.contains('save-role-btn')) {
            const row = event.target.closest('tr');
            const uid = row.dataset.uid;
            const newRole = row.querySelector('.role-select').value;
            try {
                await setRoleOnServer(uid, newRole);
                alert('Role updated successfully!');
            } catch (error) {
                alert('Error updating role: ' + error.message);
            }
        }
    });
}