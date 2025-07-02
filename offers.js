// offers.js

const db = firebase.database();
const auth = firebase.auth();

const offersContainer = document.getElementById('offers-container');
const loadingState = document.getElementById('loading-state');

/**
 * Creates the HTML for a single offer card.
 * @param {object} offerData - The data for the offer.
 * @returns {HTMLElement} The created card element.
 */
function createOfferCard(offerData) {
    const card = document.createElement('div');
    card.className = 'coupon-card';
    card.innerHTML = `
        <div class="p-6">
            <h2 class="text-2xl font-extrabold text-gray-800">${escapeHTML(offerData.name)}</h2>
            <p class="text-gray-500 mt-1">${escapeHTML(offerData.description)}</p>
            <p class="text-xs text-gray-400 mt-3">Expires on: ${new Date(offerData.expiryDate).toLocaleDateString()}</p>
        </div>
        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
            <span class="coupon-code p-2 rounded-lg text-lg">${escapeHTML(offerData.code)}</span>
            <button class="copy-btn bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Copy</button>
        </div>
    `;

    // Add event listener for the copy button
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(offerData.code).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            copyBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                copyBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            }, 2000);
        }).catch(err => console.error('Failed to copy code: ', err));
    });

    return card;
}

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return new DOMParser().parseFromString(str, 'text/html').body.textContent || '';
}

/**
 * Fetches all offers and the user's used offers, then renders the valid ones.
 * @param {string} userId - The current user's ID.
 */
async function loadAndRenderOffers(userId) {
    try {
        // Fetch all promo codes and the user's used codes simultaneously
        const [promoSnapshot, usedSnapshot] = await Promise.all([
            db.ref('promoCodes').once('value'),
            db.ref(`users/${userId}/usedPromoCodes`).once('value')
        ]);

        const allPromos = promoSnapshot.val() || {};
        const usedCodes = usedSnapshot.val() || {};
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set time to end of day for comparison

        const validOffers = Object.values(allPromos).filter(offer => {
            const isUsed = usedCodes[offer.code];
            const expiryDate = new Date(offer.expiryDate);
            const isExpired = expiryDate < today;
            
            return !isUsed && !isExpired;
        });

        loadingState.style.display = 'none';
        offersContainer.innerHTML = ''; // Clear container

        if (validOffers.length > 0) {
            validOffers.forEach(offer => {
                const card = createOfferCard(offer);
                offersContainer.appendChild(card);
            });
        } else {
            offersContainer.innerHTML = '<p class="text-center text-gray-500">Sorry, there are no available offers for you at the moment.</p>';
        }

    } catch (error) {
        console.error("Error loading offers:", error);
        loadingState.style.display = 'none';
        offersContainer.innerHTML = '<p class="text-center text-red-500">Could not load offers. Please try again later.</p>';
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            // User is logged in, load their valid offers
            loadAndRenderOffers(user.uid);
        } else {
            // User is a guest or not logged in, show a message
            loadingState.style.display = 'none';
            offersContainer.innerHTML = `
                <div class="text-center bg-white p-8 rounded-lg shadow-md">
                    <i class="fas fa-tags text-4xl text-gray-400 mb-4"></i>
                    <h2 class="text-xl font-bold text-gray-800">Unlock Special Offers</h2>
                    <p class="text-gray-600 mt-2 mb-6">Please log in or create an account to view and use exclusive offers.</p>
                    <a href="auth.html" class="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition">Login / Sign Up</a>
                </div>
            `;
        }
    });
});