// /js/panels/staff.js

export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Staff Dashboard';

    // Setup navigation for Staff
    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="orders">Current Orders</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700" data-panel="schedule">My Schedule</a>
    `;

    // Setup the main content for Staff
    panelRoot.innerHTML = `
        <div>
            <h2 class="text-2xl font-bold mb-4">Today's Orders</h2>
            <div id="staff-order-list" class="space-y-4">
                <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <p class="font-semibold">Order #1142 - Table 5</p>
                        <p class="text-sm text-gray-600">2x Pepperoni Pizza, 1x Coke</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-yellow-600">Status: Preparing</p>
                        <button class="mt-2 text-sm bg-green-500 text-white px-3 py-1 rounded">Mark as Ready</button>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <p class="font-semibold">Order #1141 - Pickup</p>
                        <p class="text-sm text-gray-600">1x Margherita, 1x Garlic Bread</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">Status: Ready for Pickup</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}