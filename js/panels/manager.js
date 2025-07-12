export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Restaurant Management';

    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">View Reports</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Manage Orders</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Manage Team</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Stock Management</a>
    `;

    panelRoot.innerHTML = `
         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">Live Orders</h3>
                <p class="text-gray-600">View and manage incoming and ongoing orders.</p>
                 <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">View Orders</button>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">Staff Shifts</h3>
                <p class="text-gray-600">Create and manage shift schedules.</p>
                 <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">Manage Shifts</button>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">Sales Analytics</h3>
                <p class="text-gray-600">Review sales performance reports.</p>
                 <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">View Reports</button>
            </div>
        </div>
    `;
}