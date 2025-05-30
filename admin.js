
// Initialize references
const ordersRef = db.ref('orders');
const menuItemsRef = db.ref('menuItems');

// ---------------------- ORDER MANAGEMENT ----------------------

function loadOrders() {
    ordersRef.on('value', snapshot => {
        const ordersTable = document.getElementById('ordersTableBody');
        ordersTable.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();
            const key = childSnapshot.key;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${key}</td>
                <td>${JSON.stringify(order.items)}</td>
                <td>
                    <select onchange="updateOrderStatus('${key}', this.value)">
                        <option ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                        <option ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>${new Date(order.timestamp).toLocaleString()}</td>
            `;
            ordersTable.appendChild(row);
        });
    });
}

function updateOrderStatus(orderId, newStatus) {
    ordersRef.child(orderId).update({ status: newStatus });
}

// ---------------------- MENU MANAGEMENT ----------------------

function loadMenuItems() {
    menuItemsRef.on('value', snapshot => {
        const menuTable = document.getElementById('menuTableBody');
        menuTable.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const item = childSnapshot.val();
            const key = childSnapshot.key;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" value="${item.name}" id="name-${key}"></td>
                <td><input type="text" value="${item.description}" id="desc-${key}"></td>
                <td><input type="number" value="${item.price}" id="price-${key}"></td>
                <td><input type="text" value="${item.image}" id="image-${key}"></td>
                <td>
                    <button onclick="updateMenuItem('${key}')">Update</button>
                    <button onclick="deleteMenuItem('${key}')">Delete</button>
                </td>
            `;
            menuTable.appendChild(row);
        });
    });
}

function addMenuItem() {
    const name = document.getElementById('newName').value;
    const desc = document.getElementById('newDesc').value;
    const price = parseFloat(document.getElementById('newPrice').value);
    const image = document.getElementById('newImage').value;
    const newItem = { name, description: desc, price, image };
    menuItemsRef.push(newItem);
}

function updateMenuItem(key) {
    const name = document.getElementById(`name-${key}`).value;
    const description = document.getElementById(`desc-${key}`).value;
    const price = parseFloat(document.getElementById(`price-${key}`).value);
    const image = document.getElementById(`image-${key}`).value;
    menuItemsRef.child(key).set({ name, description, price, image });
}

function deleteMenuItem(key) {
    menuItemsRef.child(key).remove();
}

// Load data on page load
window.onload = function() {
    loadOrders();
    loadMenuItems();
};
