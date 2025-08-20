// /js/panels/admin.js

let db, auth; 

export function loadPanel(root, panelTitle, database, authentication) {
  db = database;
  auth = authentication;

  panelTitle.textContent = 'User Management';

  root.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">👥 User Management</h2>
    <div class="mb-4">
      <input type="text" id="search-user" placeholder="Search by email..." class="border p-2 w-1/3 rounded-md">
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl shadow-lg">
      <h3 class="font-semibold text-lg mb-4">➕ Add New Team Member</h3>
      <form id="add-user-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" id="new-user-name" placeholder="Full Name" class="border p-2 rounded-md" required>
        <input type="email" id="new-user-email" placeholder="Email" class="border p-2 rounded-md" required>
        <input type="password" id="new-user-password" placeholder="Temporary Password" class="border p-2 rounded-md" required>
        <input type="tel" id="new-user-phone" placeholder="Mobile Number" class="border p-2 rounded-md">
        <input type="text" id="new-user-address" placeholder="Address" class="border p-2 rounded-md md:col-span-2">
        <select id="new-user-role" class="border p-2 rounded-md">
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="delivery">Delivery</option>
          <option value="owner">Owner</option>
        </select>
        <button type="submit" id="add-user-btn" class="bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Add User</button>
      </form>
    </div>

    <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table class="min-w-full text-left">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-3">Full Name</th>
              <th class="p-3">Email</th>
              <th class="p-3">Mobile Number</th>
              <th class="p-3">Main Address</th>
              <th class="p-3">Role</th>
              <th class="p-3">Status</th>
              <th class="p-3">Actions</th>
            </tr>
          </thead>
          <tbody id="users-body" class="divide-y"></tbody>
        </table>
    </div>
  `;

  document.getElementById('search-user').addEventListener('input', filterUsers);
  document.getElementById('add-user-form').addEventListener('submit', addNewUser);

  fetchAllUsers();
}

let allUsers = {};

function fetchAllUsers() {
  db.ref('users').on('value', snapshot => {
    allUsers = snapshot.val() || {};
    renderUsers(allUsers);
  });
}

function renderUsers(users) {
  const body = document.getElementById('users-body');
  body.innerHTML = '';

  Object.keys(users).forEach(uid => {
    const user = users[uid];
    body.innerHTML += createUserRow(uid, user);
  });
}

function createUserRow(uid, user) {
  const roleOptions = ['admin', 'manager', 'staff', 'delivery', 'owner', 'customer'].map(role => {
    return `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`;
  }).join('');

  const status = user.isDisabled ? 'Suspended' : 'Active';
  
  let mainAddress = 'N/A';
  if (user.addresses) {
      const firstAddressKey = Object.keys(user.addresses)[0];
      const firstAddress = user.addresses[firstAddressKey];
      mainAddress = `${firstAddress.street}, ${firstAddress.city}`;
  }

  const viewDetailsLink = `<a href="../customer-details.html?uid=${uid}" target="_blank" class="text-green-500 ml-2 hover:underline">View Details</a>`;
  const userNameDisplay = `<a href="../customer-details.html?uid=${uid}" target="_blank" class="text-blue-600 hover:underline">${user.name || 'N/A'}</a>`;

  return `
    <tr class="hover:bg-gray-50">
      <td class="p-3">${userNameDisplay}</td>
      <td class="p-3">${user.email || 'N/A'}</td>
      <td class="p-3">${user.phone || 'N/A'}</td>
      <td class="p-3">${mainAddress}</td>
      <td class="p-3">
        <select onchange="updateUserRole('${uid}', this.value)" class="border p-1 rounded-md bg-white">
          ${roleOptions}
        </select>
      </td>
      <td class="p-3">${status}</td>
      <td class="p-3">
        <button onclick="toggleUserStatus('${uid}', ${user.isDisabled ? 'false' : 'true'})" class="text-red-500">${user.isDisabled ? 'Activate' : 'Suspend'}</button>
        <button onclick="sendPasswordReset('${user.email}')" class="text-blue-500 ml-2">Reset Password</button>
        ${viewDetailsLink}
      </td>
    </tr>
  `;
}

window.updateUserRole = function(uid, newRole) {
    const currentUser = auth.currentUser;
    currentUser.getIdToken().then(idToken => {
        fetch('http://localhost:3000/set-role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ uid, role: newRole })
        })
        .then(res => res.json())
        .then(data => alert(data.message || data.error))
        .catch(err => console.error('Role update failed:', err));
    });
};

window.toggleUserStatus = function(uid, disable) {
    const currentUser = auth.currentUser;
    currentUser.getIdToken().then(idToken => {
        fetch('http://localhost:3000/toggle-user-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ uid, disabled: disable })
        })
        .then(response => response.json())
        .then(data => alert(data.message || data.error))
        .catch(err => console.error('Failed to toggle status:', err));
    });
};

window.sendPasswordReset = function(email) {
  if (!email) return alert('No email available for this user.');
  auth.sendPasswordResetEmail(email)
    .then(() => alert(`Password reset sent to ${email}`))
    .catch(err => console.error('Failed to send reset email:', err));
};

function filterUsers(event) {
  const query = event.target.value.toLowerCase();
  const filtered = Object.keys(allUsers).reduce((acc, uid) => {
    if (allUsers[uid].email?.toLowerCase().includes(query) || allUsers[uid].name?.toLowerCase().includes(query)) {
      acc[uid] = allUsers[uid];
    }
    return acc;
  }, {});
  renderUsers(filtered);
}

function addNewUser(event) {
    event.preventDefault();
    const name = document.getElementById('new-user-name').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password').value.trim();
    const phone = document.getElementById('new-user-phone').value.trim();
    const address = document.getElementById('new-user-address').value.trim();
    const role = document.getElementById('new-user-role').value;

    if (!email || !password || !name) {
        return alert('Please provide a name, email, and a temporary password.');
    }

    const currentUser = auth.currentUser;
    currentUser.getIdToken().then(idToken => {
        fetch('http://localhost:3000/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ name, email, password, phone, address, role })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
            if (data.message) {
                document.getElementById('add-user-form').reset();
            }
        })
        .catch(err => {
            console.error('Failed to add user:', err);
            alert('An error occurred while adding the user.');
        });
    });
}