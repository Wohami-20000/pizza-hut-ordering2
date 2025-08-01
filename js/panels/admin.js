export function loadPanel(root, panelTitle, navContainer, db, auth) {
  root.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">👥 User Management</h2>

    <div class="mb-4">
      <input type="text" id="search-user" placeholder="Search by email..." class="border p-2 w-1/3">
    </div>

    <div class="mb-4">
      <h3 class="font-semibold">➕ Add New Team Member</h3>
      <input type="email" id="new-user-email" placeholder="Email" class="border p-2">
      <select id="new-user-role" class="border p-2">
        <option value="manager">Manager</option>
        <option value="staff">Staff</option>
        <option value="delivery">Delivery</option>
      </select>
      <button id="add-user-btn" class="bg-green-500 text-white p-2 rounded">Add User</button>
    </div>

    <table class="min-w-full text-left border">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-body"></tbody>
    </table>
  `;

  document.getElementById('search-user').addEventListener('input', filterUsers);
  document.getElementById('add-user-btn').addEventListener('click', addNewUser);

  fetchAllUsers();
}

let allUsers = {};

function fetchAllUsers() {
  db.ref('users').once('value', snapshot => {
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
  const roleOptions = ['admin', 'manager', 'staff', 'delivery', 'customer'].map(role => {
    return `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`;
  }).join('');

  const status = user.disabled ? 'Suspended' : 'Active';

  return `
    <tr>
      <td>${user.email || 'N/A'}</td>
      <td>
        <select onchange="updateUserRole('${uid}', this.value)">
          ${roleOptions}
        </select>
      </td>
      <td>${status}</td>
      <td>
        <button onclick="toggleUserStatus('${uid}', ${user.disabled ? 'false' : 'true'})" class="text-red-500">${user.disabled ? 'Activate' : 'Suspend'}</button>
        <button onclick="sendPasswordReset('${user.email}')" class="text-blue-500 ml-2">Reset Password</button>
        <button onclick="viewUserOrders('${uid}')" class="text-green-500 ml-2">View Orders</button>
      </td>
    </tr>
  `;
}

window.updateUserRole = function(uid, newRole) {
  db.ref(`users/${uid}/role`).set(newRole)
    .then(() => alert('Role updated!'))
    .catch(err => console.error('Failed to update role:', err));
};

window.toggleUserStatus = function(uid, disable) {
  db.ref(`users/${uid}/disabled`).set(disable)
    .then(() => alert(`User ${disable ? 'suspended' : 'activated'}.`))
    .catch(err => console.error('Failed to toggle status:', err));
};

window.sendPasswordReset = function(email) {
  if (!email) return alert('No email available for this user.');
  auth.sendPasswordResetEmail(email)
    .then(() => alert(`Password reset sent to ${email}`))
    .catch(err => console.error('Failed to send reset email:', err));
};

window.viewUserOrders = function(uid) {
  db.ref('orders').orderByChild('customerInfo/userId').equalTo(uid).once('value', snapshot => {
    const orders = snapshot.val();
    if (!orders) {
      alert('No orders found for this user.');
      return;
    }
    console.log(`Orders for user ${uid}:`, orders);
    alert(`User has ${Object.keys(orders).length} orders. Check console for details.`);
  });
};

function filterUsers(event) {
  const query = event.target.value.toLowerCase();
  const filtered = Object.keys(allUsers).reduce((acc, uid) => {
    if (allUsers[uid].email?.toLowerCase().includes(query)) {
      acc[uid] = allUsers[uid];
    }
    return acc;
  }, {});
  renderUsers(filtered);
}

function addNewUser() {
  const email = document.getElementById('new-user-email').value.trim();
  const role = document.getElementById('new-user-role').value;

  if (!email) return alert('Please provide an email.');

  // This assumes you have logic elsewhere to create the user in Firebase Auth
  // Here we just create their role entry in the database
  const newUserRef = db.ref('users').push();
  newUserRef.set({
    email: email,
    role: role,
    disabled: false
  }).then(() => {
    alert('New team member added.');
    fetchAllUsers();
  }).catch(err => console.error('Failed to add user:', err));
}