let db, auth; // Declare db and auth at the module level

export function loadPanel(root, panelTitle, navContainer, database, authentication) {
  // Assign the passed-in Firebase services to the module-level variables
  db = database;
  auth = authentication;

  // --- ADDED NAVIGATION ---
  panelTitle.textContent = 'User Management';
  navContainer.innerHTML = `
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="users"><i class="fas fa-users-cog mr-3"></i>User Management</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="orders"><i class="fas fa-receipt mr-3"></i>Order Management</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="menu-items"><i class="fas fa-pizza-slice mr-3"></i>Menu Items</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="offers"><i class="fas fa-tags mr-3"></i>Offers</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="promo-codes"><i class="fas fa-percent mr-3"></i>Promo Codes</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="stock"><i class="fas fa-boxes mr-3"></i>Stock Control</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="assign-deliveries"><i class="fas fa-motorcycle mr-3"></i>Assign Deliveries</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="team"><i class="fas fa-users mr-3"></i>Team Roster</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="feedback"><i class="fas fa-comment-dots mr-3"></i>Feedback</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="analytics"><i class="fas fa-chart-line mr-3"></i>Analytics</a>
    <a href="#" class="block py-2.5 px-4 rounded-lg transition" data-panel="system"><i class="fas fa-cogs mr-3"></i>System Config</a>
  `;
  // --- END NAVIGATION ---

  root.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">👥 User Management</h2>
    <div class="mb-4">
      <input type="text" id="search-user" placeholder="Search by email..." class="border p-2 w-1/3">
    </div>

    <div class="mb-6 p-4 border rounded-lg">
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
        <button type="submit" id="add-user-btn" class="bg-green-500 text-white p-2 rounded-md">Add User</button>
      </form>
    </div>

    <table class="min-w-full text-left border">
      <thead>
        <tr>
          <th>Full Name</th>
          <th>Email</th>
          <th>Mobile Number</th>
          <th>Main Address</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-body"></tbody>
    </table>
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

  const status = user.disabled ? 'Suspended' : 'Active';
  
  let mainAddress = 'N/A';
  if (user.addresses) {
      const firstAddressKey = Object.keys(user.addresses)[0];
      const firstAddress = user.addresses[firstAddressKey];
      mainAddress = `${firstAddress.street}, ${firstAddress.city}`;
  }


  const viewOrdersLink = user.role === 'customer' 
    ? `<a href="../customer-details.html?uid=${uid}" target="_blank" class="text-green-500 ml-2 hover:underline">View Details</a>`
    : '';
  
  const userNameDisplay = user.role === 'customer'
    ? `<a href="../customer-details.html?uid=${uid}" target="_blank" class="text-blue-600 hover:underline">${user.name || 'N/A'}</a>`
    : (user.name || 'N/A');


  return `
    <tr>
      <td>${userNameDisplay}</td>
      <td>${user.email || 'N/A'}</td>
      <td>${user.phone || 'N/A'}</td>
      <td>${mainAddress}</td>
      <td>
        <select onchange="updateUserRole('${uid}', this.value)">
          ${roleOptions}
        </select>
      </td>
      <td>${status}</td>
      <td>
        <button onclick="toggleUserStatus('${uid}', ${user.disabled ? 'false' : 'true'})" class="text-red-500">${user.disabled ? 'Activate' : 'Suspend'}</button>
        <button onclick="sendPasswordReset('${user.email}')" class="text-blue-500 ml-2">Reset Password</button>
        ${viewOrdersLink}
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
    if (allUsers[uid].email?.toLowerCase().includes(query)) {
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