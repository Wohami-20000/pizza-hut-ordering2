// offers.js

const db = firebase.database();
const auth = firebase.auth();

const offersContainer = document.getElementById('offers-container');
const loadingState = document.getElementById('loading-state');
const manualPromoInput = document.getElementById('manual-promo-input');
const applyManualPromoBtn = document.getElementById('apply-manual-promo-btn');

// Modal Elements
const messageModal = document.getElementById('message-modal');
const modalBox = messageModal.querySelector('.modal-box');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalOkBtn = document.getElementById('modal-ok-btn');

/**
 * Displays the custom modal with a title and message.
 * @param {string} title - The title for the modal.
 * @param {string} message - The message content for the modal.
 * @param {boolean} isError - If true, styles the modal title for an error.
 */
function showModal(title, message, isError = false) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalTitle.style.color = isError ? '#dc2626' : '#1f2937'; // Red for error, dark gray for success

    messageModal.classList.remove('hidden');
    setTimeout(() => {
        messageModal.classList.remove('opacity-0');
        modalBox.classList.remove('scale-95', 'opacity-0');
    }, 10); // Delay for CSS transitions
}

/**
 * Hides the custom modal.
 */
function hideModal() {
    messageModal.classList.add('opacity-0');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        messageModal.classList.add('hidden');
    }, 300); // Match transition duration
}

/**
 * Creates the HTML for a single redesigned offer card.
 * @param {object} offerData - The data for the offer.
 * @returns {HTMLElement} The created card element.
 */
function createOfferCard(offerData) {
    const card = document.createElement('div');
    // Added animate-fadeInUp for the animation
    card.className = 'bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 animate-fadeInUp';
    
    // Fallback image if none is provided in the database
    const imageUrl = offerData.imageURL || 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=1935&auto=format&fit=crop';
    
    card.innerHTML = `
        <div class="h-40 bg-cover bg-center" style="background-image: url('${escapeHTML(imageUrl)}')"></div>
        <div class="p-5 flex flex-col flex-grow">
            <h2 class="text-xl font-extrabold text-gray-800 mb-2">${escapeHTML(offerData.name)}</h2>
            <p class="text-gray-500 text-sm flex-grow">${escapeHTML(offerData.description)}</p>
            <p class="text-xs text-gray-400 mt-4">Expires: ${new Date(offerData.expiryDate).toLocaleDateString()}</p>
        </div>
        <div class="bg-gray-50 px-5 py-3 border-t flex justify-between items-center">
            <span class="font-mono font-bold text-red-600 tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-md">${escapeHTML(offerData.code || 'N/A')}</span>
            <button class="copy-btn bg-gray-700 text-white font-bold text-sm py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">COPY</button>
        </div>
    `;

    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        if (offerData.code) {
            navigator.clipboard.writeText(offerData.code).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'COPIED!';
                copyBtn.classList.add('bg-green-600');
                copyBtn.classList.remove('bg-gray-700');
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove('bg-green-600');
                    copyBtn.classList.add('bg-gray-700');
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
            if (!offer || !offer.code) continue;

            const isGlobalOffer = !offer.isWelcomeOffer;
            const isUserSpecificOffer = userOfferIds.includes(promoId);

            if (isGlobalOffer || isUserSpecificOffer) {
                const isUsed = usedCodes[offer.code];
                const expiryDate = new Date(offer.expiryDate);
                const isExpired = expiryDate < today;

                if (!isUsed && !isExpired && !offerCodesAdded.has(offer.code)) {
                    offersToShow.push(offer);
                    offerCodesAdded.add(offer.code);
                }
            }
        }

        loadingState.style.display = 'none';
        offersContainer.innerHTML = '';

        if (offersToShow.length > 0) {
            offersToShow.forEach((offer, index) => {
                const card = createOfferCard(offer);
                card.style.animationDelay = `${index * 100}ms`; // Staggered animation
                offersContainer.appendChild(card);
            });
        } else {
            offersContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">Sorry, there are no available offers for you at the moment.</p>';
        }

    } catch (error) {
        console.error("Error loading offers:", error);
        loadingState.style.display = 'none';
        offersContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Could not load offers. Please try again later.</p>';
    }
}

/**
 * Validates and provides feedback on a manually entered coupon code.
 * @param {string} userId - The current user's ID.
 */
async function applyManualCode(userId) {
    const codeToApply = manualPromoInput.value.trim().toUpperCase();
    if (!codeToApply) {
        showModal('Invalid Input', 'Please enter a code.', true);
        return;
    }

    applyManualPromoBtn.disabled = true;
    applyManualPromoBtn.textContent = '...';

    try {
        const [promoSnapshot, usedSnapshot] = await Promise.all([
            db.ref('promoCodes').orderByChild('code').equalTo(codeToApply).once('value'),
            db.ref(`users/${userId}/usedPromoCodes`).once('value')
        ]);

        if (!promoSnapshot.exists()) {
            showModal('Invalid Code', 'This coupon code was not found.', true);
            return;
        }

        const usedCodes = usedSnapshot.val() || {};
        const promos = promoSnapshot.val();
        const promoId = Object.keys(promos)[0];
        const offer = promos[promoId];

        if (usedCodes[offer.code]) {
            showModal('Already Used', 'You have already used this coupon code.', true);
            return;
        }

        const expiryDate = new Date(offer.expiryDate);
        const today = new Date();
        if (expiryDate < today) {
            showModal('Coupon Expired', 'This coupon is no longer valid.', true);
            return;
        }
        
        showModal('Success!', `The offer "${offer.name}" is valid. You can now copy the code and use it in your cart.`);

    } catch (error) {
        console.error('Error applying code:', error);
        showModal('Error', 'Could not verify the code. Please try again.', true);
    } finally {
        applyManualPromoBtn.disabled = false;
        applyManualPromoBtn.textContent = 'Apply';
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    modalOkBtn.addEventListener('click', hideModal);

    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            loadAndRenderOffers(user.uid);
            
            applyManualPromoBtn.addEventListener('click', () => {
                applyManualCode(user.uid);
            });

        } else {
            loadingState.style.display = 'none';
            offersContainer.innerHTML = `
                <div class="text-center bg-white p-8 rounded-2xl shadow-lg col-span-full">
                    <i class="fas fa-tags text-5xl text-gray-400 mb-4"></i>
                    <h2 class="text-2xl font-bold text-gray-800">Unlock Special Offers</h2>
                    <p class="text-gray-600 mt-2 mb-6">Log in or create an account to view and use exclusive offers.</p>
                    <a href="auth.html" class="bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-700 transition">Login / Sign Up</a>
                </div>
            `;
            manualPromoInput.disabled = true;
            applyManualPromoBtn.disabled = true;
        }
    });
});