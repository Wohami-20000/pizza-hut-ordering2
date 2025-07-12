export function loadPanel(panelRoot, panelTitle, navContainer) {
    panelTitle.textContent = 'Delivery Dashboard';

    navContainer.innerHTML = `
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">My Deliveries</a>
        <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">My Schedule</a>
    `;

    panelRoot.innerHTML = `
        <div>
            <h2 class="text-2xl font-bold mb-4">Assigned Deliveries</h2>
            <div class="space-y-4">
                <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <p class="font-semibold">Order #1138</p>
                        <p class="text-sm text-gray-600">123 Main St, Anytown</p>
                    </div>
                     <div class="text-right">
                        <p class="font-bold text-green-600">Status: Out for Delivery</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}