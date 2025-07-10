// offers.js

const db = firebase.database();
const auth = firebase.auth();

const offersContainer = document.getElementById('offers-container');
const loadingState = document.getElementById('loading-state');
const manualPromoInput = document.getElementById('manual-promo-input');
const applyManualPromoBtn = document.getElementById('apply-manual-promo-btn');
const promoMessageEl = document.getElementById('promo-message');

/**
 * Sets a message in the promo code section.
 * @param {string} text - The message to display.
 * @param {boolean} isError - If true, styles the message as an error.
 */
function setPromoMessage(text, isError = false) {
    promoMessageEl.textContent = text;
    promoMessageEl.style.color = isError ? '#dc2626' : '#16a34a'; // Red for error, green for success
}

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
            <span class="coupon-code p-2 rounded-lg text-lg">${escapeHTML(offerData.code || 'N/A')}</span>
            <button class="copy-btn bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Copy</button>
        </div>
    `;

    // Add event listener for the copy button
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        // Ensure offerData.code exists before trying to copy
        if (offerData.code) {
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
        }
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
        const [promoSnapshot, userOffersSnapshot, usedSnapshot] = await Promise.all([
            db.ref('promoCodes').once('value'),
            db.ref(`users/${userId}/availableOffers`).once('value'),
            db.ref(`users/${userId}/usedPromoCodes`).once('value')
        ]);

        const allPromos = promoSnapshot.val() || {};
        const userOfferIds = userOffersSnapshot.exists() ? Object.keys(userOffersSnapshot.val()) : [];
        const usedCodes = usedSnapshot.val() || {};
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const offersToShow = [];
        const offerCodesAdded = new Set();

        for (const promoId in allPromos) {
            const offer = allPromos[promoId];
            
            // Ensure offer and code exist
            if (!offer || !offer.code) continue;

            const isGlobalOffer = !offer.isWelcomeOffer;
            const isUserSpecificOffer = userOfferIds.includes(promoId);

            if (isGlobalOffer || isUserSpecificOffer) {
                const isUsed = usedCodes[offer.code];
                const expiryDate = new Date(offer.expiryDate);
                const isExpired = expiryDate < today; // Strict less than check

                if (!isUsed && !isExpired && !offerCodesAdded.has(offer.code)) {
                    offersToShow.push(offer);
                    offerCodesAdded.add(offer.code);
                }
            }
        }

        loadingState.style.display = 'none';
        offersContainer.innerHTML = ''; 

        if (offersToShow.length > 0) {
            offersToShow.forEach(offer => {
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


/**
 * Validates and provides feedback on a manually entered coupon code.
 * @param {string} userId - The current user's ID.
 */
async function applyManualCode(userId) {
    const codeToApply = manualPromoInput.value.trim().toUpperCase();
    if (!codeToApply) {
        setPromoMessage('Please enter a code.', true);
        return;
    }

    setPromoMessage('Checking...', false);

    try {
        const [promoSnapshot, usedSnapshot] = await Promise.all([
            db.ref('promoCodes').orderByChild('code').equalTo(codeToApply).once('value'),
            db.ref(`users/${userId}/usedPromoCodes`).once('value')
        ]);

        if (!promoSnapshot.exists()) {
            setPromoMessage('This coupon code is not valid.', true);
            return;
        }

        const usedCodes = usedSnapshot.val() || {};
        const promos = promoSnapshot.val();
        const promoId = Object.keys(promos)[0];
        const offer = promos[promoId];

        if (usedCodes[offer.code]) {
            setPromoMessage('You have already used this code.', true);
            return;
        }

        const expiryDate = new Date(offer.expiryDate);
        const today = new Date();
        if (expiryDate < today) {
            setPromoMessage('This coupon has expired.', true);
            return;
        }
        
        // If all checks pass, the code is valid.
        // You can decide what "applying" the code does. For now, we'll show a success message.
        setPromoMessage(`Success! "${offer.name}" is a valid offer.`, false);

    } catch (error) {
        console.error('Error applying code:', error);
        setPromoMessage('Could not verify the code. Please try again.', true);
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            loadAndRenderOffers(user.uid);
            
            // Add event listener for the manual apply button only when logged in
            applyManualPromoBtn.addEventListener('click', () => {
                applyManualCode(user.uid);
            });

        } else {
            loadingState.style.display = 'none';
            offersContainer.innerHTML = `
                <div class="text-center bg-white p-8 rounded-lg shadow-md">
                    <i class="fas fa-tags text-4xl text-gray-400 mb-4"></i>
                    <h2 class="text-xl font-bold text-gray-800">Unlock Special Offers</h2>
                    <p class="text-gray-600 mt-2 mb-6">Please log in or create an account to view and use exclusive offers.</p>
                    <a href="auth.html" class="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition">Login / Sign Up</a>
                </div>
            `;
            // Disable manual input form for logged-out users
            manualPromoInput.disabled = true;
            applyManualPromoBtn.disabled = true;
        }
    });
});