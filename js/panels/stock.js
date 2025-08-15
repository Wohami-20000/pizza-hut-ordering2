// /js/panels/stock.js

const db = firebase.database();

/**
 * Main function to load the Stock Management Panel.
 * This is a blank slate for building the new inventory system.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Stock Control</h2>
            <p class="text-gray-600">This panel is ready for the new ingredient-level inventory management system.</p>
        </div>
    `;

    // We will add all new functionality here, starting from the next step.
}