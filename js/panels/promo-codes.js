// /js/panels/promo-codes.js

const db = firebase.database();

function createPromoCodeRow(promoId, promoData) {
    const { name, code, discountType, discountValue, minOrderValue, expiryDate, totalUsageLimit, perUserLimit } = promoData;
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

    const totalLimit = totalUsageLimit > 0 ? totalUsageLimit : '∞';
    const userLimit = perUserLimit > 0 ? perUserLimit : '∞';

    return `
        <tr class="hover:bg-gray-50 ${isExpired ? 'bg-red-50 opacity-60' : ''}" data-promo-id="${promoId}">
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 font-mono">${code}</td>
            <td class="p-3">${discountDisplay}</td>
            <td class="p-3">${minOrderValue.toFixed(2)} MAD</td>
            <td class="p-3 text-center">${totalLimit} / ${userLimit}</td>
            <td class="p-3 ${isExpired ? 'text-red-500 font-bold' : ''}">${expiry}</td>
            <td class="p-3 text-center">
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
                promoListBody.innerHTML += createPromoCodeRow(promo.id, promo);
            });
        } else {
            promoListBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No promo codes found.</td></tr>';
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
                        <input type="number" id="promo-discount-value" step="0.01" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                     <div>
                        <label for="promo-min-order" class="block text-sm font-medium">Min. Order (MAD)</label>
                        <input type="number" id="promo-min-order" step="0.01" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-total-limit" class="block text-sm font-medium">Total Usage Limit (0 for unlimited)</label>
                        <input type="number" id="promo-total-limit" step="1" value="0" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="promo-user-limit" class="block text-sm font-medium">Limit Per User (0 for unlimited)</label>
                        <input type="number" id="promo-user-limit" step="1" value="0" required class="w-full mt-1 p-2 border rounded-md">
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
                                <th class="p-3 text-center text-xs uppercase">Limits (Total/User)</th>
                                <th class="p-3 text-left text-xs uppercase">Expires</th>
                                <th class="p-3 text-center text-xs uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="promo-list-body" class="divide-y"></tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    document.getElementById('add-promo-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newPromo = {
            name: document.getElementById('promo-name').value,
            code: document.getElementById('promo-code').value.toUpperCase(),
            discountType: document.getElementById('promo-discount-type').value,
            discountValue: parseFloat(document.getElementById('promo-discount-value').value) || 0,
            minOrderValue: parseFloat(document.getElementById('promo-min-order').value) || 0,
            totalUsageLimit: parseInt(document.getElementById('promo-total-limit').value) || 0,
            perUserLimit: parseInt(document.getElementById('promo-user-limit').value) || 0,
            expiryDate: document.getElementById('promo-expiry').value,
            createdAt: new Date().toISOString()
        };
        db.ref('promoCodes').push(newPromo).then(() => e.target.reset());
    });
    
    document.getElementById('promo-list-body').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-promo-btn')) {
            const promoId = e.target.closest('tr').dataset.promoId;
            if (confirm('Delete this promo code?')) db.ref(`promoCodes/${promoId}`).remove();
        }
    });

    loadPromoCodes();
}