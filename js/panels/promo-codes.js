// /js/panels/promo-codes.js - Redesigned for better UI/UX

const db = firebase.database();

/**
 * Creates the HTML for a single, redesigned promo code card.
 * @param {string} promoId - The unique key for the promo code in Firebase.
 * @param {object} promoData - The data object for the promo code.
 * @returns {string} The HTML string for the promo code card.
 */
function createPromoCodeCard(promoId, promoData) {
    const { name, code, discountType, discountValue, minOrderValue, expiryDate } = promoData;
    const expiry = new Date(expiryDate);
    const isExpired = expiry < new Date();
    const expiryFormatted = expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let discountDisplay = '';
    if (discountType === 'percentage') {
        discountDisplay = `<span class="text-3xl font-bold">${discountValue}%</span> OFF`;
    } else if (discountType === 'fixed') {
        discountDisplay = `<span class="text-3xl font-bold">${discountValue}</span> MAD OFF`;
    } else {
        discountDisplay = `<span class="text-3xl font-bold">FREE</span> Delivery`;
    }

    return `
        <div class="promo-card bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 animate-fadeInUp ${isExpired ? 'opacity-50' : ''}" data-promo-id="${promoId}">
            <div class="p-5">
                <div class="flex justify-between items-start">
                    <h4 class="text-lg font-bold text-gray-800">${name}</h4>
                    <div class="font-mono text-sm bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-full">${code}</div>
                </div>
                <div class="my-4 text-center text-brand-red">
                    ${discountDisplay}
                </div>
                <div class="text-xs text-gray-500 space-y-1">
                    <p><strong>Min. Order:</strong> ${minOrderValue.toFixed(2)} MAD</p>
                    <p class="${isExpired ? 'text-red-500 font-bold' : ''}"><strong>Expires:</strong> ${expiryFormatted}</p>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3 border-t flex justify-end items-center gap-2">
                <button class="edit-promo-btn text-sm bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-promo-btn text-sm bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Fetches all promo codes from Firebase and renders them as cards.
 */
function loadPromoCodes() {
    const promoContainer = document.getElementById('promo-codes-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    
    db.ref('promoCodes').orderByChild('createdAt').on('value', snapshot => {
        promoContainer.innerHTML = ''; // Clear existing content
        if (snapshot.exists()) {
            loadingPlaceholder.classList.add('hidden');
            let codes = [];
            snapshot.forEach(child => codes.push({ id: child.key, ...child.val() }));
            
            let delay = 0;
            codes.reverse().forEach(promo => {
                const cardHtml = createPromoCodeCard(promo.id, promo);
                const cardEl = document.createElement('div');
                cardEl.innerHTML = cardHtml;
                cardEl.firstChild.style.animationDelay = `${delay}ms`;
                promoContainer.appendChild(cardEl.firstChild);
                delay += 50;
            });
        } else {
            loadingPlaceholder.classList.remove('hidden');
            loadingPlaceholder.textContent = 'No promo codes found. Add one to get started!';
        }
    });
}

/**
 * Main function to set up and load the Promo Codes panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Promo Code Management';

    panelRoot.innerHTML = `
        <style>
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fadeInUp {
                animation: fadeInUp 0.5s ease-out forwards;
                opacity: 0;
            }
        </style>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Form Column -->
            <div class="lg:col-span-1 bg-white rounded-2xl shadow-xl p-6 h-fit sticky top-6">
                <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-6 flex items-center gap-2">
                    <i class="fas fa-arrow-left"></i>Back to Dashboard
                </button>
                <h3 id="form-title" class="text-2xl font-bold mb-4 border-b pb-3 text-gray-800">Add New Promo Code</h3>
                <form id="promo-form" class="space-y-4">
                    <input type="hidden" id="promo-id">
                    <div>
                        <label for="promo-name" class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="promo-name" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                    </div>
                    <div>
                        <label for="promo-code" class="block text-sm font-medium text-gray-700">Code</label>
                        <input type="text" id="promo-code" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm uppercase focus:ring-brand-red focus:border-brand-red">
                    </div>
                    <div>
                        <label for="promo-discount-type" class="block text-sm font-medium text-gray-700">Discount Type</label>
                        <select id="promo-discount-type" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-brand-red focus:border-brand-red">
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (MAD)</option>
                            <option value="free_delivery">Free Delivery</option>
                        </select>
                    </div>
                    <div id="discount-value-container">
                        <label for="promo-discount-value" class="block text-sm font-medium text-gray-700">Value</label>
                        <input type="number" id="promo-discount-value" step="0.01" class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                    </div>
                    <div>
                        <label for="promo-min-order" class="block text-sm font-medium text-gray-700">Minimum Order (MAD)</label>
                        <input type="number" id="promo-min-order" step="0.01" value="0" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                    </div>
                    <div>
                        <label for="promo-expiry" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                        <input type="date" id="promo-expiry" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                    </div>
                    <div class="flex gap-3 pt-4 border-t">
                        <button type="submit" id="save-promo-btn" class="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                            <i class="fas fa-plus-circle"></i> <span>Add Promo Code</span>
                        </button>
                        <button type="button" id="clear-form-btn" title="Clear Form" class="bg-gray-200 text-gray-600 font-bold p-3 rounded-lg hover:bg-gray-300 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </form>
            </div>
            <!-- Promo Codes List Column -->
            <div class="lg:col-span-2">
                 <h3 class="text-2xl font-bold mb-6 text-gray-800">Current Promo Codes</h3>
                 <div id="promo-codes-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <p id="loading-placeholder" class="col-span-full text-center text-gray-500 py-20">Loading promo codes...</p>
                 </div>
            </div>
        </div>
    `;

    // --- Element References ---
    const promoForm = document.getElementById('promo-form');
    const promoIdInput = document.getElementById('promo-id');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('save-promo-btn');
    const saveBtnIcon = saveBtn.querySelector('i');
    const saveBtnText = saveBtn.querySelector('span');
    const promoContainer = document.getElementById('promo-codes-container');
    const discountTypeSelect = document.getElementById('promo-discount-type');
    const discountValueContainer = document.getElementById('discount-value-container');

    // --- Helper Functions ---
    const clearForm = () => {
        promoForm.reset();
        promoIdInput.value = '';
        formTitle.textContent = 'Add New Promo Code';
        saveBtnText.textContent = 'Add Promo Code';
        saveBtnIcon.className = 'fas fa-plus-circle';
        saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        saveBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        discountValueContainer.style.display = 'block';
    };
    
    const toggleDiscountValueField = () => {
        if (discountTypeSelect.value === 'free_delivery') {
            discountValueContainer.style.display = 'none';
        } else {
            discountValueContainer.style.display = 'block';
        }
    };

    // --- Event Listeners ---
    document.getElementById('clear-form-btn').addEventListener('click', clearForm);
    discountTypeSelect.addEventListener('change', toggleDiscountValueField);

    promoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const promoData = {
            name: document.getElementById('promo-name').value,
            code: document.getElementById('promo-code').value.toUpperCase(),
            discountType: document.getElementById('promo-discount-type').value,
            discountValue: parseFloat(document.getElementById('promo-discount-value').value) || 0,
            minOrderValue: parseFloat(document.getElementById('promo-min-order').value) || 0,
            expiryDate: document.getElementById('promo-expiry').value,
            createdAt: new Date().toISOString()
        };
        const promoId = promoIdInput.value;
        const promise = promoId ? db.ref(`promoCodes/${promoId}`).update(promoData) : db.ref('promoCodes').push(promoData);
        
        promise.then(() => {
            alert(`Promo code ${promoId ? 'updated' : 'added'} successfully!`);
            clearForm();
        }).catch(err => {
            console.error('Firebase Error:', err);
            alert('Error: ' + err.message);
        });
    });

    promoContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        
        const card = targetButton.closest('.promo-card');
        const promoId = card.dataset.promoId;

        if (targetButton.classList.contains('delete-promo-btn')) {
            if (confirm('Are you sure you want to permanently delete this promo code?')) {
                db.ref(`promoCodes/${promoId}`).remove()
                    .then(() => alert('Promo code deleted.'))
                    .catch(err => alert('Error deleting promo code: ' + err.message));
            }
        } else if (targetButton.classList.contains('edit-promo-btn')) {
            db.ref(`promoCodes/${promoId}`).once('value', snapshot => {
                const data = snapshot.val();
                if (data) {
                    formTitle.textContent = 'Edit Promo Code';
                    promoIdInput.value = promoId;
                    document.getElementById('promo-name').value = data.name || '';
                    document.getElementById('promo-code').value = data.code || '';
                    document.getElementById('promo-discount-type').value = data.discountType || 'percentage';
                    document.getElementById('promo-discount-value').value = data.discountValue || 0;
                    document.getElementById('promo-min-order').value = data.minOrderValue || 0;
                    document.getElementById('promo-expiry').value = data.expiryDate || '';
                    
                    toggleDiscountValueField(); // Ensure correct field visibility on edit
                    
                    saveBtnText.textContent = 'Save Changes';
                    saveBtnIcon.className = 'fas fa-save';
                    saveBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    saveBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    
                    promoForm.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });

    // Initial load
    loadPromoCodes();
    toggleDiscountValueField();
}
