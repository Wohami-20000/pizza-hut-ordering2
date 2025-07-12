export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'System Administration';

    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Reports & Analytics</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Menu & Offers</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">User Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">System Config</a>
    `;

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">Menu & Offers</h3>
                <p class="text-gray-600">Full control over all menu items and promotions.</p>
                <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">Manage Menu</button>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">User Management</h3>
                <p class="text-gray-600">View, edit roles, or suspend user accounts.</p>
                <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">Manage Users</button>
            </div>
             <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">System Configuration</h3>
                <p class="text-gray-600">Manage Firebase settings and system-level configurations.</p>
                <button class="mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg">System Settings</button>
            </div>
        </div>
    `;
}