// /js/panels/promo-codes.js

const db = firebase.database();

/**
 * Creates the HTML for a single row in the promo code table.
 * @param {string} promoId - The Firebase key for the promo code.
 * @param {object} promoData - The data object for the promo code.
 * @returns {string} The HTML string for the table row.
 */
function createPromoCodeRow(promoId, promoData) {
    const { name, code, discountType, discountValue, minOrderValue, expiryDate } = promoData;
    const expiry = new Date(expiryDate).toLocaleDateString();
    const isExpired = new Date(expiryDate) < new Date();

    let discountDisplay = '';
    if (discountType === 'percentage') {
        discountDisplay = `${discountValue}%`;
    } else if (discountType === 'fixed') {
        discountDisplay = `${discountValue} MAD`;
    } else {
        discountDisplay = 'Free Delivery';
    }

    return `
        <tr class="hover:bg-gray-50 transition ${isExpired ? 'bg-red-50 opacity-60' : ''}" data-promo-id="${promoId}">
            <td class="p-3 text-sm font-medium text-gray-800">${name}</td>
            <td class="p-3 text-sm text-gray-600 font-mono">${code}</td>
            <td class="p-3 text-sm text-gray-600">${discountDisplay}</td>
            <td class="p-3 text-sm text-gray-600">${minOrderValue.toFixed(2)} MAD</td>
            <td class="p-3 text-sm ${isExpired ? 'text-red-500 font-bold' : 'text-gray-600'}">${expiry}</td>
            <td class="p-3 text-center">
                <button class="edit-promo-btn bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600">Edit</button>
                <button class="delete-promo-btn bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

/**
 * Renders all promo codes into the table.
 */
function loadPromoCodes() {
    const promoListBody = document.getElementById('promo-list-body');
    if (!promoListBody) return;

    db.ref('promoCodes').orderByChild('createdAt').once('value', snapshot => {
        if (snapshot.exists()) {
            let html = '';
            snapshot.forEach(childSnapshot => {
                // Prepend to show newest first
                html = createPromoCodeRow(childSnapshot.key, childSnapshot.val()) + html;
            });
            promoListBody.innerHTML = html;
        } else {
            promoListBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">No promo codes found.</td></tr>';
        }
    }).catch(err => {
        console.error("Error loading promo codes:", err);
        promoListBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">Error loading data.</td></tr>';
    });
}

/**
 * Main function to load the Promo Codes Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Promo Code Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
                <h3 class="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Add New Promo Code</h3>
                <form id="add-promo-form" class="space-y-4">
                    <div>
                        <label for="promo-name" class="block text-sm font-medium">Name</label>
                        <input type="text" id="promo-name" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-code" class="block text-sm font-medium">Code (e.g., PIZZA20)</label>
                        <input type="text" id="promo-code" required class="w-full mt-1 p-2 border rounded-md uppercase">
                    </div>
                    <div>
                        <label for="promo-discount-type" class="block text-sm font-medium">Discount Type</label>
                        <select id="promo-discount-type" required class="w-full mt-1 p-2 border rounded-md bg-white">
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (MAD)</option>
                            <option value="free_delivery">Free Delivery</option>
                        </select>
                    </div>
                    <div>
                        <label for="promo-discount-value" class="block text-sm font-medium">Value</label>
                        <input type="number" id="promo-discount-value" step="0.01" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 20 or 15.50">
                    </div>
                     <div>
                        <label for="promo-min-order" class="block text-sm font-medium">Min. Order (MAD)</label>
                        <input type="number" id="promo-min-order" step="0.01" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-expiry" class="block text-sm font-medium">Expiry Date</label>
                        <input type="date" id="promo-expiry" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">Add Promo</button>
                </form>
            </div>

            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 100ms;">
                 <h3 class="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Existing Promo Codes</h3>
                 <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Code</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Discount</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Min. Order</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Expires</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="promo-list-body">
                            </tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    // --- Event Listeners ---

    // Form submission for adding a new promo
    const addForm = document.getElementById('add-promo-form');
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPromo = {
            name: document.getElementById('promo-name').value,
            code: document.getElementById('promo-code').value.toUpperCase(),
            discountType: document.getElementById('promo-discount-type').value,
            discountValue: parseFloat(document.getElementById('promo-discount-value').value) || 0,
            minOrderValue: parseFloat(document.getElementById('promo-min-order').value) || 0,
            expiryDate: document.getElementById('promo-expiry').value,
            createdAt: new Date().toISOString()
        };

        if (!newPromo.expiryDate) {
            alert('Expiry date is required.');
            return;
        }

        db.ref('promoCodes').push(newPromo)
            .then(() => {
                alert('Promo code added successfully!');
                addForm.reset();
                loadPromoCodes(); // Refresh the list
            })
            .catch(err => {
                alert('Error adding promo code: ' + err.message);
            });
    });
    
    // Event delegation for delete buttons
    const promoListBody = document.getElementById('promo-list-body');
    promoListBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-promo-btn')) {
            const row = e.target.closest('tr');
            const promoId = row.dataset.promoId;
            const promoName = row.cells[0].textContent;

            if (confirm(`Are you sure you want to delete the promo "${promoName}"?`)) {
                db.ref(`promoCodes/${promoId}`).remove()
                    .then(() => {
                        alert('Promo deleted successfully.');
                        loadPromoCodes(); // Refresh the list
                    })
                    .catch(err => alert('Error deleting promo: ' + err.message));
            }
        }
        // NOTE: Edit functionality would be added here in a similar fashion,
        // typically by opening a modal pre-filled with the row's data.
    });

    // Initial load of promo codes
    loadPromoCodes();
}