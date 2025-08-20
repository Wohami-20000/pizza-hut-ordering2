// /js/panels/recipes.js

const db = firebase.database();

// --- STATE & CACHE ---
let menuItemsCache = {};
let ingredientsCache = {};
let currentRecipeMenuItemId = null; // The menu item ID we are editing the recipe for

// --- UI ELEMENT REFERENCES ---
let recipeModal, recipeForm, panelRoot;

/**
 * Main function to load the Recipes Panel.
 */
export function loadPanel(root, panelTitle) {
    panelRoot = root;
    panelTitle.textContent = 'Recipe Management';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h2 class="text-2xl font-bold text-gray-800">Menu Recipes</h2>
                <button id="add-recipe-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i>Add Recipe
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Menu Item</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase">Linked Ingredients (Quantity)</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recipes-tbody" class="divide-y">
                        <tr><td colspan="3" class="text-center p-6 text-gray-500">Loading recipes...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style="max-height: 90vh;">
                <h3 id="recipe-modal-title" class="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Add New Recipe</h3>
                <form id="recipe-form" class="flex-grow overflow-hidden flex flex-col">
                    <div class="flex-grow overflow-y-auto pr-4 space-y-4">
                        <div>
                            <label for="menu-item-select" class="block text-sm font-medium text-gray-700">Select Menu Item</label>
                            <select id="menu-item-select" required class="w-full mt-1 p-2 border rounded-md bg-white"></select>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-semibold mb-2 text-gray-700">Available Ingredients</h4>
                                <input type="text" id="ingredient-search" placeholder="Search ingredients..." class="w-full p-2 border rounded-md mb-2">
                                <div id="available-ingredients" class="h-64 overflow-y-auto border p-2 rounded-md bg-gray-50"></div>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2 text-gray-700">Recipe Ingredients</h4>
                                <div id="recipe-ingredients-list" class="h-64 overflow-y-auto border p-2 rounded-md space-y-2">
                                    <p class="text-gray-500 p-4 text-center">Add ingredients from the left.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0 flex justify-end gap-4 pt-4 border-t mt-4">
                        <button type="button" id="cancel-recipe-modal-btn" class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Recipe</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    // We will add event listeners and logic in the next step.
}