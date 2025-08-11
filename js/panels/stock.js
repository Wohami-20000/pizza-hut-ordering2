// /js/panels/stock.js

const db = firebase.database();

/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Stock Management</h2>
            <p class="text-gray-600">This panel is currently not in use. Item availability is managed directly in the "Menu Items" panel.</p>
        </div>
    `;
}