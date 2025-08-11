// /js/panels/stock.js

const db = firebase.database();

/**
 * Creates the HTML for a single ingredient row in the table.
 */
function createIngredientRow(ingredientId, ingredientData) {
    const { name, stockLevel, unit } = ingredientData;

    return `
        <tr class="hover:bg-gray-50" data-ingredient-id="${ingredientId}">
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 text-center">${stockLevel}</td>
            <td class="p-3">${unit}</td>
            <td class="p-3 text-center">
                <button class="edit-ingredient-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-ingredient-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Main function to load the Stock Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Stock Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4 border-b pb-3">Add New Ingredient</h3>
                <form id="add-ingredient-form" class="space-y-4">
                    <div>
                        <label for="ingredient-name" class="block text-sm font-medium">Ingredient Name</label>
                        <input type="text" id="ingredient-name" required placeholder="e.g., Mozzarella Cheese" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="ingredient-stock" class="block text-sm font-medium">Current Stock Level</label>
                        <input type="number" id="ingredient-stock" step="0.1" required placeholder="e.g., 10.5" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="ingredient-unit" class="block text-sm font-medium">Unit of Measurement</label>
                        <input type="text" id="ingredient-unit" required placeholder="e.g., kg, Liters, units" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Add Ingredient</button>
                </form>
            </div>

            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                 <h3 class="text-xl font-bold mb-4 border-b pb-3">Current Stock</h3>
                 <div class="overflow-y-auto" style="max-height: 70vh;">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-3 text-left text-xs uppercase">Ingredient</th>
                                <th class="p-3 text-center text-xs uppercase">Stock Level</th>
                                <th class="p-3 text-left text-xs uppercase">Unit</th>
                                <th class="p-3 text-center text-xs uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="ingredient-list-body" class="divide-y">
                            <tr><td colspan="4" class="text-center p-4">No ingredients added yet.</td></tr>
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    // Placeholder for future functionality
    const addIngredientForm = document.getElementById('add-ingredient-form');
    addIngredientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('This form is a placeholder for the future inventory management system.');
        addIngredientForm.reset();
    });
}