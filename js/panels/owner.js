// /js/panels/owner.js

export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Business Overview';

    // Setup navigation for Owner
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="analytics">Reports & Analytics</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="orders">View Orders</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="team">Team Management</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="feedback">Customer Feedback</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="stock">Stock Overview</a>
    `;

    // Setup the main content for Owner
    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-md col-span-1 md:col-span-2">
                <h3 class="text-xl font-semibold mb-2">Key Performance Metrics</h3>
                <p class="text-gray-600">High-level view of sales, popular items, and customer satisfaction.</p>
                <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">View Full Report</button>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-2">Team Overview</h3>
                <p class="text-gray-600">View team structure and manager assignments.</p>
                <button class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">Manage Team</button>
            </div>
        </div>
    `;
}