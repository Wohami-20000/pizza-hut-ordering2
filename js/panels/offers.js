// /js/panels/offers.js

const db = firebase.database();

function createOfferRow(offerId, offerData) {
    const { name, description, price, imageURL } = offerData;
    const descSnippet = description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A';
    const imageUrl = imageURL || 'https://www.pizzahut.ma/images/Default_pizza.png';

    return `
        <tr class="hover:bg-gray-50" data-offer-id="${offerId}">
            <td class="p-3"><img src="${imageUrl}" alt="${name}" class="w-12 h-12 rounded-md object-cover"></td>
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 text-sm text-gray-600">${descSnippet}</td>
            <td class="p-3 font-semibold">${price ? price.toFixed(2) : 'N/A'} MAD</td>
            <td class="p-3 text-center">
                <button class="edit-offer-btn bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600">Edit</button>
                <button class="delete-offer-btn bg-red-500 text-white px-3 py-1 text-xs rounded-md hover:bg-red-600 ml-2">Delete</button>
            </td>
        </tr>
    `;
}

function loadOffers() {
    const offerListBody = document.getElementById('offer-list-body');
    db.ref('offers').on('value', snapshot => {
        offerListBody.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                offerListBody.innerHTML += createOfferRow(child.key, child.val());
            });
        } else {
            offerListBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No offers found.</td></tr>';
        }
    });
}

export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Offers & Deals Management';

    panelRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition mb-4">
                    <i class="fas fa-arrow-left mr-2"></i>Back
                </button>
                <h3 id="form-title" class="text-xl font-bold mb-4 border-b pb-3">Add New Offer</h3>
                <form id="offer-form" class="space-y-4">
                    <input type="hidden" id="offer-id">
                    <div>
                        <label for="offer-name" class="block text-sm font-medium">Name</label>
                        <input type="text" id="offer-name" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="offer-price" class="block text-sm font-medium">Price (MAD)</label>
                        <input type="number" id="offer-price" step="0.01" required class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div>
                        <label for="offer-description" class="block text-sm font-medium">Short Description</label>
                        <input type="text" id="offer-description" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                     <div>
                        <label for="offer-long-desc" class="block text-sm font-medium">Long Description</label>
                        <textarea id="offer-long-desc" rows="3" class="w-full mt-1 p-2 border rounded-md"></textarea>
                    </div>
                    <div>
                        <label for="offer-image-url" class="block text-sm font-medium">Image URL</label>
                        <input type="url" id="offer-image-url" class="w-full mt-1 p-2 border rounded-md">
                    </div>
                    <div class="flex gap-2 pt-2">
                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Save Offer</button>
                        <button type="button" id="clear-form-btn" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300"><i class="fas fa-times"></i></button>
                    </div>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4 border-b pb-3">Current Offers</h3>
                <div class="overflow-y-auto" style="max-height: 70vh;">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Image</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Name</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Description</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase">Price</th>
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

    const clearForm = () => {
        offerForm.reset();
        offerIdInput.value = '';
        formTitle.textContent = 'Add New Offer';
    };

    document.getElementById('clear-form-btn').addEventListener('click', clearForm);

    offerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const offerData = {
            name: document.getElementById('offer-name').value,
            price: parseFloat(document.getElementById('offer-price').value),
            description: document.getElementById('offer-description').value,
            longDesc: document.getElementById('offer-long-desc').value,
            imageURL: document.getElementById('offer-image-url').value,
        };
        const offerId = offerIdInput.value;
        const promise = offerId ? db.ref(`offers/${offerId}`).update(offerData) : db.ref('offers').push(offerData);
        promise.then(() => {
            alert(`Offer ${offerId ? 'updated' : 'added'}!`);
            clearForm();
        }).catch(err => alert('Error: ' + err.message));
    });

    document.getElementById('offer-list-body').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const offerId = row.dataset.offerId;

        if (e.target.classList.contains('delete-offer-btn')) {
            if (confirm('Delete this offer?')) db.ref(`offers/${offerId}`).remove();
        } else if (e.target.classList.contains('edit-offer-btn')) {
            db.ref(`offers/${offerId}`).once('value', snapshot => {
                const data = snapshot.val();
                formTitle.textContent = 'Edit Offer';
                offerIdInput.value = offerId;
                document.getElementById('offer-name').value = data.name;
                document.getElementById('offer-price').value = data.price;
                document.getElementById('offer-description').value = data.description;
                document.getElementById('offer-long-desc').value = data.longDesc;
                document.getElementById('offer-image-url').value = data.imageURL;
            });
        }
    });

    loadOffers();
}
