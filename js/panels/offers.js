// /js/panels/offers.js

import { logAction } from './logs.js';

const db = firebase.database();

/**
 * Safely parse a float from an input.
 */
function safeParseFloat(value) {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
}

/**
 * Creates a human‑readable summary of linked items for a table row.
 */
function buildItemsSummary(items, resolvedItemsLookup) {
    if (!items || typeof items !== 'object') return 'No items linked';

    const entries = Object.entries(items);
    if (entries.length === 0) return 'No items linked';

    // Try to use resolved item names if provided (from cached menu lookup),
    // otherwise fall back to counts only.
    if (resolvedItemsLookup && Object.keys(resolvedItemsLookup).length) {
        const names = [];
        entries.forEach(([itemId, data]) => {
            const meta = resolvedItemsLookup[itemId];
            if (!meta) return;
            const qty = data && typeof data.quantity === 'number' ? data.quantity : 1;
            names.push(`${qty}× ${meta.name}`);
        });
        if (names.length) {
            return names.join(', ');
        }
    }

    const count = entries.length;
    return `${count} item${count > 1 ? 's' : ''}`;
}

/**
 * Returns whether an offer is currently "live" given its fields.
 */
function isOfferCurrentlyLive(offerData) {
    const { isActive = true, startDate, endDate } = offerData;
    if (!isActive) return false;

    const now = new Date();
    const startOk = !startDate || new Date(startDate) <= now;
    const endOk = !endDate || new Date(endDate) >= now;

    return startOk && endOk;
}

function createOfferRow(offerId, offerData, resolvedItemsLookup) {
    const {
        name,
        description,
        price,
        imageURL,
        isActive = true,
        startDate,
        endDate,
        items,
    } = offerData;

    const descSnippet = description
        ? (description.length > 80 ? description.substring(0, 80) + '...' : description)
        : 'N/A';

    const imageUrl = imageURL || 'https://www.pizzahut.ma/images/Default_pizza.png';
    const priceDisplay =
        typeof price === 'number' && !isNaN(price) ? price.toFixed(2) + ' MAD' : 'N/A';

    const itemsSummary = buildItemsSummary(items, resolvedItemsLookup);

    const currentlyLive = isOfferCurrentlyLive(offerData);
    const isChecked = isActive ? 'checked' : '';

    const statusBadgeClass = currentlyLive
        ? 'bg-green-100 text-green-800'
        : isActive
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-100 text-gray-600';

    const statusText = currentlyLive
        ? 'Live'
        : isActive
        ? 'Scheduled / Expired Window'
        : 'Inactive';

    return `
        <tr class="hover:bg-gray-50 ${!currentlyLive ? 'bg-gray-100 opacity-80' : ''}" data-offer-id="${offerId}">
            <td class="p-3">
                <img src="${imageUrl}" alt="${name}" class="w-12 h-12 rounded-md object-cover">
            </td>
            <td class="p-3 font-medium">${name || 'Untitled Offer'}</td>
            <td class="p-3 text-sm text-gray-600">${descSnippet}</td>
            <td class="p-3 font-semibold">${priceDisplay}</td>
            <td class="p-3 text-sm text-gray-700 max-w-xs">
                <span class="inline-block align-top">${itemsSummary}</span>
            </td>
            <td class="p-3 text-sm">
                <div class="flex flex-col space-y-1">
                    <span>
                        <span class="font-semibold text-xs text-gray-500">Start:</span>
                        ${startDate || '—'}
                    </span>
                    <span>
                        <span class="font-semibold text-xs text-gray-500">End:</span>
                        ${endDate || '—'}
                    </span>
                </div>
            </td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}">
                    ${statusText}
                </span>
            </td>
            <td class="p-3 text-center space-y-1">
                <div>
                    <label class="relative inline-flex items-center cursor-pointer" title="Toggle Active / Inactive">
                        <input type="checkbox" class="sr-only peer offer-active-toggle" ${isChecked}>
                        <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-red-500 peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <div class="mt-1">
                    <button class="edit-offer-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                    <button class="delete-offer-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-1">Delete</button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Build a lookup map of menu items for summarising offers.
 * { "<itemId>": { name, categoryName } }
 */
async function buildMenuItemsLookup() {
    const snapshot = await db.ref('menu').once('value');
    const lookup = {};
    if (!snapshot.exists()) return lookup;

    const menu = snapshot.val();
    Object.entries(menu).forEach(([categoryId, categoryData]) => {
        const categoryName = categoryData.category || categoryId;
        if (!categoryData.items) return;
        Object.entries(categoryData.items).forEach(([itemId, itemData]) => {
            lookup[itemId] = {
                name: itemData.name || 'Unnamed item',
                categoryId,
                categoryName,
            };
        });
    });
    return lookup;
}

async function loadOffers() {
    const offerListBody = document.getElementById('offer-list-body');
    // Build menu lookup once for better summaries
    const menuLookupPromise = buildMenuItemsLookup();

    db.ref('offers').orderByChild('createdAt').on('value', async snapshot => {
        offerListBody.innerHTML = '';

        const menuLookup = await menuLookupPromise;

        if (snapshot.exists()) {
            const offers = [];
            snapshot.forEach(child => offers.push({ id: child.key, ...child.val() }));
            // Newest first
            offers
                .sort((a, b) => {
                    if (!a.createdAt || !b.createdAt) return 0;
                    return a.createdAt < b.createdAt ? 1 : -1;
                })
                .forEach(offer => {
                    offerListBody.innerHTML += createOfferRow(
                        offer.id,
                        offer,
                        menuLookup
                    );
                });
        } else {
            offerListBody.innerHTML =
                '<tr><td colspan="8" class="text-center p-4 text-gray-500">No offers found.</td></tr>';
        }
    });
}

/**
 * Render a multi-select of menu items that can be linked to an offer.
 */
async function populateItemsSelector(container, selectedItems = {}) {
    container.innerHTML =
        '<p class="text-gray-500 text-sm">Loading menu items…</p>';

    const snapshot = await db.ref('menu').once('value');
    if (!snapshot.exists()) {
        container.innerHTML =
            '<p class="text-red-500 text-sm">No menu items found. Please add menu items first.</p>';
        return;
    }

    const menu = snapshot.val();
    const html = [];

    Object.entries(menu)
        .sort(([, a], [, b]) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .forEach(([categoryId, categoryData]) => {
            if (!categoryData.items) return;
            const categoryName = categoryData.category || categoryId;

            html.push(`
                <div class="border rounded-md mb-2 bg-gray-50">
                    <button type="button" class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 category-toggle">
                        <span>${categoryName}</span>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </button>
                    <div class="max-h-44 overflow-y-auto divide-y bg-white category-items">
            `);

            Object.entries(categoryData.items)
                .sort(([, a], [, b]) => (a.orderIndex || 0) - (b.orderIndex || 0))
                .forEach(([itemId, itemData]) => {
                    const key = itemId;
                    const existing = selectedItems && selectedItems[key];
                    const checked = !!existing;
                    const qty =
                        existing && typeof existing.quantity === 'number'
                            ? existing.quantity
                            : 1;

                    html.push(`
                        <label class="flex items-center justify-between px-3 py-2 text-xs sm:text-sm">
                            <div class="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    class="linked-item-checkbox rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    data-item-id="${key}"
                                    ${checked ? 'checked' : ''}
                                >
                                <span>${itemData.name || 'Unnamed item'}</span>
                            </div>
                            <div class="flex items-center space-x-1">
                                <span class="text-[11px] text-gray-500">Qty</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value="${qty}"
                                    class="linked-item-qty w-16 p-1 border rounded-md text-[11px] sm:text-xs text-right"
                                    data-item-id="${key}"
                                >
                            </div>
                        </label>
                    `);
                });

            html.push(`
                    </div>
                </div>
            `);
        });

    container.innerHTML = `
        <div class="space-y-1 text-xs text-gray-500 mb-1">
            <p>
                Choose which menu items are included in this deal and set their quantities.
                These will be used on <code>offer-details.html</code> to add the full deal to the cart.
            </p>
        </div>
        <div class="border rounded-md max-h-80 overflow-y-auto p-1 bg-white">
            ${html.join('')}
        </div>
    `;

    // simple collapse/expand
    container.querySelectorAll('.category-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemsDiv = btn.parentElement.querySelector('.category-items');
            if (!itemsDiv) return;
            const icon = btn.querySelector('i');
            const hidden = itemsDiv.classList.toggle('hidden');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', hidden);
                icon.classList.toggle('fa-chevron-up', !hidden);
            }
        });
    });
}

/**
 * Reads the current selection from the items selector into an `items` object:
 * {
 *   "<itemId>": { quantity: number },
 *   ...
 * }
 */
function collectSelectedItems(container) {
    const items = {};
    const checkboxes = container.querySelectorAll('.linked-item-checkbox');
    checkboxes.forEach(cb => {
        const itemId = cb.dataset.itemId;
        const qtyInput = container.querySelector(
            `.linked-item-qty[data-item-id="${itemId}"]`
        );
        let qty = safeParseFloat(qtyInput && qtyInput.value);
        if (!cb.checked) return;
        if (!qty || qty <= 0) qty = 1;
        items[itemId] = { quantity: qty };
    });
    return items;
}

/**
 * Simple form validation – throws an Error if invalid.
 */
function validateOfferData(offerData) {
    if (!offerData.name || !offerData.name.trim()) {
        throw new Error('Please enter an offer name.');
    }
    if (offerData.price == null || isNaN(offerData.price) || offerData.price <= 0) {
        throw new Error('Please enter a valid deal price greater than 0.');
    }

    if (offerData.startDate && offerData.endDate) {
        const start = new Date(offerData.startDate);
        const end = new Date(offerData.endDate);
        if (end < start) {
            throw new Error('End date cannot be before start date.');
        }
    }
}

export function loadPanel(panelRoot, panelTitle) {
    panelRoot.dataset.panelId = 'offers-panel';
    panelTitle.textContent = 'Offers & Deals Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- LEFT: Offer Form -->
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <h3 id="form-title" class="text-xl font-bold mb-4 border-b pb-3">Add New Offer</h3>
                <form id="offer-form" class="space-y-4">
                    <input type="hidden" id="offer-id">

                    <div>
                        <label for="offer-name" class="block text-sm font-medium">Name</label>
                        <input
                            type="text"
                            id="offer-name"
                            required
                            autocomplete="off"
                            class="w-full mt-1 p-2 border rounded-md"
                            placeholder="e.g., Large Pepperoni + 2 Cokes"
                        >
                    </div>

                    <div>
                        <label for="offer-price" class="block text-sm font-medium">Deal Price (MAD)</label>
                        <input
                            type="number"
                            id="offer-price"
                            step="0.01"
                            min="0"
                            required
                            class="w-full mt-1 p-2 border rounded-md"
                            placeholder="120"
                        >
                    </div>

                    <div>
                        <label for="offer-description" class="block text-sm font-medium">Short Description</label>
                        <input
                            type="text"
                            id="offer-description"
                            class="w-full mt-1 p-2 border rounded-md"
                            placeholder="Shown in lists and cards"
                        >
                    </div>

                    <div>
                        <label for="offer-long-desc" class="block text-sm font-medium">Long Description</label>
                        <textarea
                            id="offer-long-desc"
                            rows="3"
                            class="w-full mt-1 p-2 border rounded-md"
                            placeholder="Full details shown on the offer details page"
                        ></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium">Offer Visibility Window</label>
                        <div class="grid grid-cols-2 gap-2 mt-1">
                            <div>
                                <label for="offer-start-date" class="block text-xs text-gray-600">Start Date</label>
                                <input
                                    type="date"
                                    id="offer-start-date"
                                    class="w-full mt-1 p-2 border rounded-md"
                                >
                            </div>
                            <div>
                                <label for="offer-end-date" class="block text-xs text-gray-600">End Date</label>
                                <input
                                    type="date"
                                    id="offer-end-date"
                                    class="w-full mt-1 p-2 border rounded-md"
                                >
                            </div>
                        </div>
                        <p class="mt-1 text-xs text-gray-500">
                            Offers are only shown between the start and end dates (inclusive) while they are marked as active.
                        </p>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">Is Active</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="offer-is-active" class="sr-only peer" checked>
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-red-500 peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    <div>
                        <label for="offer-image-url" class="block text-sm font-medium">
                            Image
                        </label>
                        <input
                            type="url"
                            id="offer-image-url"
                            class="w-full mt-1 p-2 border rounded-md"
                            placeholder="Paste image URL, e.g. from Cloudinary"
                        >
                        <p class="mt-1 text-xs text-gray-500">
                            For a perfect UX you can later replace this with the Cloudinary uploader used in the Menu Items panel so admins don’t have to paste URLs manually.
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">
                            Linked Menu Items (Offer Composition)
                        </label>
                        <div id="offer-items-container" class="text-sm text-gray-700">
                            <!-- populated dynamically -->
                        </div>
                    </div>

                    <div class="flex gap-2 pt-2">
                        <button
                            type="submit"
                            class="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700"
                        >
                            Save Offer
                        </button>
                        <button
                            type="button"
                            id="clear-form-btn"
                            class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300"
                            title="Clear form"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </form>
            </div>

            <!-- RIGHT: Offers List -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between mb-4 border-b pb-3">
                    <h3 class="text-xl font-bold">Current Offers</h3>
                    <div class="flex items-center space-x-2 text-xs text-gray-500">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">Live</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">Scheduled / Window</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">Inactive</span>
                    </div>
                </div>
                <div class="overflow-y-auto" style="max-height: 70vh;">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Offer</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Description</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Price</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Items</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Start / End</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Status</th>
                                <th class="p-3 text-center text-xs font-semibold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="offer-list-body" class="divide-y"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const offerForm = document.getElementById('offer-form');
    const offerIdInput = document.getElementById('offer-id');
    const formTitle = document.getElementById('form-title');
    const itemsContainer = document.getElementById('offer-items-container');

    const clearForm = async () => {
        offerForm.reset();
        offerIdInput.value = '';
        formTitle.textContent = 'Add New Offer';
        const isActiveCheckbox = document.getElementById('offer-is-active');
        if (isActiveCheckbox) isActiveCheckbox.checked = true;
        await populateItemsSelector(itemsContainer, {});
    };

    document.getElementById('clear-form-btn').addEventListener('click', clearForm);

    // Initial items selector
    populateItemsSelector(itemsContainer, {}).catch(console.error);

    offerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = offerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        try {
            const nowIso = new Date().toISOString();

            const offerData = {
                name: document.getElementById('offer-name').value.trim(),
                price: safeParseFloat(document.getElementById('offer-price').value),
                description: document.getElementById('offer-description').value.trim(),
                longDesc: document.getElementById('offer-long-desc').value.trim(),
                imageURL: document.getElementById('offer-image-url').value.trim(),
                isActive: document.getElementById('offer-is-active').checked,
                startDate: document.getElementById('offer-start-date').value || null,
                endDate: document.getElementById('offer-end-date').value || null,
                items: collectSelectedItems(itemsContainer),
            };

            validateOfferData(offerData);

            const offerId = offerIdInput.value;
            if (offerId) {
                const offerRef = db.ref(`offers/${offerId}`);
                const beforeSnap = await offerRef.once('value');
                const beforeData = beforeSnap.val();

                await offerRef.update(offerData);

                await logAction('update', offerData.name, offerId, {
                    section: 'offers',
                    before: beforeData,
                    after: { ...(beforeData || {}), ...offerData },
                });

                alert('Offer updated successfully!');
            } else {
                const ref = db.ref('offers').push();
                const payload = {
                    ...offerData,
                    createdAt: nowIso,
                    id: ref.key,
                };
                await ref.set(payload);

                await logAction('create', payload.name, ref.key, {
                    section: 'offers',
                    data: payload,
                });

                alert('Offer added successfully!');
            }

            await clearForm();
        } catch (err) {
            console.error('Offer save error:', err);
            alert('Error saving offer: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Offer';
            }
        }
    });

    document.getElementById('offer-list-body').addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const offerId = row.dataset.offerId;

        if (e.target.classList.contains('delete-offer-btn')) {
            if (!confirm('Are you sure you want to permanently delete this offer?')) return;
            try {
                const offerRef = db.ref(`offers/${offerId}`);
                const snap = await offerRef.once('value');
                const data = snap.val();
                await logAction('delete', data && data.name, offerId, {
                    section: 'offers',
                    before: data,
                });
                await offerRef.remove();
                alert('Offer deleted!');
            } catch (err) {
                console.error('Delete offer error:', err);
                alert('Error deleting offer: ' + err.message);
            }
        } else if (e.target.classList.contains('edit-offer-btn')) {
            const snap = await db.ref(`offers/${offerId}`).once('value');
            if (!snap.exists()) {
                alert('Offer not found.');
                return;
            }
            const data = snap.val();
            formTitle.textContent = 'Edit Offer';
            offerIdInput.value = offerId;
            document.getElementById('offer-name').value = data.name || '';
            document.getElementById('offer-price').value =
                typeof data.price === 'number' ? data.price : '';
            document.getElementById('offer-description').value = data.description || '';
            document.getElementById('offer-long-desc').value = data.longDesc || '';
            document.getElementById('offer-image-url').value = data.imageURL || '';
            document.getElementById('offer-is-active').checked =
                data.isActive !== false; // default true
            document.getElementById('offer-start-date').value = data.startDate || '';
            document.getElementById('offer-end-date').value = data.endDate || '';

            await populateItemsSelector(itemsContainer, data.items || {});
        }
    });

    // Handle activation toggle directly from the list
    document.getElementById('offer-list-body').addEventListener('change', async (e) => {
        if (!e.target.classList.contains('offer-active-toggle')) return;
        const row = e.target.closest('tr');
        if (!row) return;
        const offerId = row.dataset.offerId;
        const newStatus = e.target.checked;

        try {
            const offerRef = db.ref(`offers/${offerId}`);
            const snap = await offerRef.once('value');
            const before = snap.val();
            await offerRef.child('isActive').set(newStatus);
            await logAction('update', before && before.name, offerId, {
                section: 'offers',
                change: `isActive set to ${newStatus}`,
                before: before && { isActive: before.isActive },
                after: { isActive: newStatus },
            });
        } catch (err) {
            console.error('Error updating isActive:', err);
            alert('Failed to update offer status: ' + err.message);
            // revert checkbox
            e.target.checked = !newStatus;
        }
    });

    loadOffers().catch(console.error);
}