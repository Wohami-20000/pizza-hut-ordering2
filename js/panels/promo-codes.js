// /js/panels/promo-codes.js

import { logAction, escapeHTML } from '../../ui-components.js';

const db = firebase.database();

/**
 * Normalizes raw promo data from form / DB into a clean object.
 * Ensures numeric fields and defaults are consistent.
 */
function normalizePromoData(raw = {}) {
    const discountType = raw.discountType || 'percentage';

    return {
        name: raw.name || '',
        code: (raw.code || '').toUpperCase(),
        discountType,
        discountValue:
            discountType === 'free_delivery'
                ? 0
                : Number(raw.discountValue || 0),
        minOrderValue: Number(raw.minOrderValue || 0),
        totalUsageLimit: Number(raw.totalUsageLimit || 0),
        perUserLimit: Number(raw.perUserLimit || 0),
        expiryDate: raw.expiryDate || '',
        createdAt: raw.createdAt || new Date().toISOString(),
        isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
        currentUsage: Number(raw.currentUsage || 0)
    };
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return escapeHTML(dateStr);
    return d.toLocaleDateString();
}

function createPromoCodeRow(promoId, promoData) {
    const normalized = normalizePromoData(promoData);
    const {
        name,
        code,
        discountType,
        discountValue,
        minOrderValue,
        expiryDate,
        totalUsageLimit,
        perUserLimit,
        isActive,
        currentUsage
    } = normalized;

    const expiry = formatDate(expiryDate);
    const isExpired = expiryDate ? (new Date(expiryDate) < new Date()) : false;
    const isChecked = isActive ? 'checked' : '';

    let discountDisplay = '';
    if (discountType === 'percentage') {
        discountDisplay = `${discountValue}%`;
    } else if (discountType === 'fixed') {
        discountDisplay = `${discountValue.toFixed(2)} MAD`;
    } else {
        discountDisplay = 'Free Delivery';
    }

    const totalLimit = totalUsageLimit > 0 ? totalUsageLimit : '∞';
    const userLimit = perUserLimit > 0 ? perUserLimit : '∞';
    const usageCount = currentUsage || 0;

    const rowDisabledClass = (isExpired || !isActive) ? 'bg-gray-100 opacity-60' : '';

    return `
        <tr class="hover:bg-gray-50 ${rowDisabledClass}" data-promo-id="${promoId}">
            <td class="p-3 font-medium">${escapeHTML(name)}</td>
            <td class="p-3 font-mono">${escapeHTML(code)}</td>
            <td class="p-3">${escapeHTML(discountDisplay)}</td>
            <td class="p-3">${minOrderValue.toFixed(2)} MAD</td>
            <td class="p-3 text-center">${usageCount} / ${totalLimit}</td>
            <td class="p-3 text-center">${totalLimit} / ${userLimit}</td>
            <td class="p-3 ${isExpired ? 'text-red-500 font-bold' : ''}">${expiry}</td>
            <td class="p-3 text-center">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" class="sr-only peer status-toggle" ${isChecked}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </td>
            <td class="p-3 text-center space-x-2">
                <button class="edit-promo-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-promo-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600">Delete</button>
            </td>
        </tr>
    `;
}

function loadPromoCodes() {
    const promoListBody = document.getElementById('promo-list-body');
    db.ref('promoCodes').orderByChild('createdAt').on('value', snapshot => {
        promoListBody.innerHTML = '';
        if (snapshot.exists()) {
            let codes = [];
            snapshot.forEach(child => codes.push({ id: child.key, ...child.val() }));
            codes.reverse().forEach(promo => {
                // Normalize & ensure currentUsage exists for display
                const normalized = normalizePromoData(promo);
                promoListBody.innerHTML += createPromoCodeRow(promo.id, normalized);
            });
        } else {
            promoListBody.innerHTML = '<tr><td colspan="9" class="text-center p-4">No promo codes found.</td></tr>';
        }
    });
}

export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Promo Code Management';

    panelRoot.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4 border-b pb-3">Add New Promo Code</h3>
                <form id="add-promo-form" class="space-y-4">
                    <div>
                        <label for="promo-name" class="block text-sm font-medium">Name</label>
                        <input type="text" id="promo-name" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-code" class="block text-sm font-medium">Code</label>
                        <input type="text" id="promo-code" required class="w-full mt-1 p-2 border rounded-md uppercase">
                    </div>
                    <div>
                        <label for="promo-discount-type" class="block text-sm font-medium">Type</label>
                        <select id="promo-discount-type" required class="w-full mt-1 p-2 border rounded-md bg-white">
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (MAD)</option>
                            <option value="free_delivery">Free Delivery</option>
                        </select>
                    </div>
                    <div>
                        <label for="promo-discount-value" class="block text-sm font-medium">Value</label>
                        <input type="number" id="promo-discount-value" step="0.01" min="0" class="w-full mt-1 p-2 border rounded-md">
                        <p class="text-xs text-gray-500 mt-1" id="promo-value-help">
                            For percentage, enter 0–100. For fixed, enter an amount in MAD. Free delivery ignores this field.
                        </p>
                    </div>
                     <div>
                        <label for="promo-min-order" class="block text-sm font-medium">Min. Order (MAD)</label>
                        <input type="number" id="promo-min-order" step="0.01" min="0" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-total-limit" class="block text-sm font-medium">Total Usage Limit (0 for unlimited)</label>
                        <input type="number" id="promo-total-limit" step="1" min="0" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-user-limit" class="block text-sm font-medium">Limit Per User (0 for unlimited)</label>
                        <input type="number" id="promo-user-limit" step="1" min="0" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-expiry" class="block text-sm font-medium">Expiry Date</label>
                        <input type="date" id="promo-expiry" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Add Promo</button>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                 <h3 class="text-xl font-bold mb-4 border-b pb-3">Existing Promo Codes</h3>
                 <div class="overflow-y-auto" style="max-height: 70vh;">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-3 text-left text-xs uppercase">Name</th>
                                <th class="p-3 text-left text-xs uppercase">Code</th>
                                <th class="p-3 text-left text-xs uppercase">Discount</th>
                                <th class="p-3 text-left text-xs uppercase">Min. Order</th>
                                <th class="p-3 text-center text-xs uppercase">Usage (Used / Total)</th>
                                <th class="p-3 text-center text-xs uppercase">Limits (Total / User)</th>
                                <th class="p-3 text-left text-xs uppercase">Expires</th>
                                <th class="p-3 text-center text-xs uppercase">Status</th>
                                <th class="p-3 text-center text-xs uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="promo-list-body" class="divide-y"></tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    const form = panelRoot.querySelector('#add-promo-form');
    const formTitle = form.closest('div').querySelector('h3');
    const submitBtn = form.querySelector('button[type="submit"]');
    const discountTypeSelect = form.querySelector('#promo-discount-type');
    const discountValueInput = form.querySelector('#promo-discount-value');
    let editingPromoId = null;

    // Auto-disable value input for free_delivery
    function updateDiscountValueState() {
        const type = discountTypeSelect.value;
        if (type === 'free_delivery') {
            discountValueInput.value = '';
            discountValueInput.disabled = true;
        } else {
            discountValueInput.disabled = false;
        }
    }
    discountTypeSelect.addEventListener('change', updateDiscountValueState);
    updateDiscountValueState();

    function resetFormToCreateMode() {
        editingPromoId = null;
        formTitle.textContent = 'Add New Promo Code';
        submitBtn.textContent = 'Add Promo';
        form.reset();
        // Ensure default values after reset
        document.getElementById('promo-min-order').value = 0;
        document.getElementById('promo-total-limit').value = 0;
        document.getElementById('promo-user-limit').value = 0;
        updateDiscountValueState();
    }

    // --- CONSOLIDATED EVENT LISTENER ---
    panelRoot.addEventListener('submit', (e) => {
        if (e.target.id === 'add-promo-form') {
            e.preventDefault();

            const rawPromo = {
                name: document.getElementById('promo-name').value.trim(),
                code: document.getElementById('promo-code').value.trim(),
                discountType: document.getElementById('promo-discount-type').value,
                discountValue: document.getElementById('promo-discount-value').value,
                minOrderValue: document.getElementById('promo-min-order').value,
                totalUsageLimit: document.getElementById('promo-total-limit').value,
                perUserLimit: document.getElementById('promo-user-limit').value,
                expiryDate: document.getElementById('promo-expiry').value
            };

            // Basic safety: Require name, code, expiry
            if (!rawPromo.name || !rawPromo.code || !rawPromo.expiryDate) {
                alert('Please fill in all required fields (Name, Code, Expiry Date).');
                return;
            }

            let promoToSave = normalizePromoData(rawPromo);
            const user = firebase.auth().currentUser || null;

            if (editingPromoId) {
                // Preserve existing createdAt & currentUsage
                db.ref(`promoCodes/${editingPromoId}`).once('value').then(snap => {
                    if (snap.exists()) {
                        const existing = snap.val();
                        promoToSave.createdAt = existing.createdAt || promoToSave.createdAt;
                        promoToSave.currentUsage = Number(existing.currentUsage || 0);
                        promoToSave.isActive = typeof existing.isActive === 'boolean'
                            ? existing.isActive
                            : promoToSave.isActive;
                    }
                    return db.ref(`promoCodes/${editingPromoId}`).update(promoToSave);
                }).then(() => {
                    logAction(user, 'UPDATE_PROMO_CODE', {
                        promoId: editingPromoId,
                        code: promoToSave.code,
                        name: promoToSave.name
                    });

                    resetFormToCreateMode();
                });
            } else {
                // New promo: ensure createdAt, isActive, currentUsage
                promoToSave.createdAt = new Date().toISOString();
                promoToSave.isActive = true;
                promoToSave.currentUsage = 0;

                db.ref('promoCodes').push(promoToSave).then((ref) => {
                    logAction(user, 'CREATE_PROMO_CODE', {
                        promoId: ref.key,
                        code: promoToSave.code,
                        name: promoToSave.name,
                        discountType: promoToSave.discountType,
                        discountValue: promoToSave.discountValue
                    });
                    form.reset();
                    // Reset defaults
                    document.getElementById('promo-min-order').value = 0;
                    document.getElementById('promo-total-limit').value = 0;
                    document.getElementById('promo-user-limit').value = 0;
                    updateDiscountValueState();
                });
            }
        }
    });

    panelRoot.addEventListener('click', (e) => {
        // EDIT
        if (e.target.classList.contains('edit-promo-btn')) {
            const row = e.target.closest('tr');
            const promoId = row.dataset.promoId;
            db.ref(`promoCodes/${promoId}`).once('value').then(snapshot => {
                if (!snapshot.exists()) return;
                const promo = normalizePromoData(snapshot.val());

                editingPromoId = promoId;
                document.getElementById('promo-name').value = promo.name || '';
                document.getElementById('promo-code').value = promo.code || '';
                document.getElementById('promo-discount-type').value = promo.discountType || 'percentage';
                document.getElementById('promo-discount-value').value = promo.discountType === 'free_delivery'
                    ? ''
                    : promo.discountValue || 0;
                document.getElementById('promo-min-order').value = promo.minOrderValue || 0;
                document.getElementById('promo-total-limit').value = promo.totalUsageLimit || 0;
                document.getElementById('promo-user-limit').value = promo.perUserLimit || 0;
                document.getElementById('promo-expiry').value = promo.expiryDate || '';

                formTitle.textContent = 'Edit Promo Code';
                submitBtn.textContent = 'Update Promo';
                updateDiscountValueState();
            });
            return;
        }

        // DELETE
        if (e.target.classList.contains('delete-promo-btn')) {
            const promoId = e.target.closest('tr').dataset.promoId;
            if (confirm('Delete this promo code?')) {
                const user = firebase.auth().currentUser || null;
                db.ref(`promoCodes/${promoId}`).remove().then(() => {
                    logAction(user, 'DELETE_PROMO_CODE', { promoId });
                });
            }
        }
    });

    panelRoot.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-toggle')) {
            const promoId = e.target.closest('tr').dataset.promoId;
            const newStatus = e.target.checked;
            const user = firebase.auth().currentUser || null;
            db.ref(`promoCodes/${promoId}/isActive`).set(newStatus).then(() => {
                logAction(user, 'TOGGLE_PROMO_CODE_STATUS', {
                    promoId,
                    isActive: newStatus
                });
            });
        }
    });

    loadPromoCodes();
}