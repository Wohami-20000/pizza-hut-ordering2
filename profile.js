// profile.js

const auth = firebase.auth();
const db = firebase.database();

const profileEmailInput = document.getElementById('profile-email');
const profileNameInput = document.getElementById('profile-name');
const profilePhoneInput = document.getElementById('profile-phone');
// Corrected to target the new SPAN element for displaying the address
const profileAddressDisplay = document.getElementById('profile-address-display'); 
const updateProfileBtn = document.getElementById('update-profile-btn');
const messageContainer = document.getElementById('message-container');
const messageText = document.getElementById('message-text');
const profileTitle = document.getElementById('profile-title');

let currentLang = localStorage.getItem('lang') || 'en';

// Function to display messages in the message box
function showMessageBox(titleKey, messageKey, isError = false) {
    let translatedTitle = (typeof translations !== 'undefined' && translations[currentLang]?.[titleKey]) || titleKey;
    let translatedMessage = (typeof translations !== 'undefined' && translations[currentLang]?.[messageKey]) || messageKey;
    let translatedOk = (typeof translations !== 'undefined' && translations[currentLang]?.message_box_ok) || "OK";

    const localMessageBox = document.getElementById('custom-message-box');
    const localMessageBoxTitle = document.getElementById('message-box-title');
    const localMessageBoxText = document.getElementById('message-box-text');
    const localMessageBoxOkBtn = document.getElementById('message-box-ok-btn');

    if (localMessageBox && localMessageBoxTitle && localMessageBoxText && localMessageBoxOkBtn) {
        localMessageBoxTitle.textContent = translatedTitle;
        localMessageBoxText.textContent = translatedMessage;
        localMessageBoxOkBtn.textContent = translatedOk;

        if (isError) {
            localMessageBoxTitle.classList.add('text-red-600');
            localMessageBoxOkBtn.classList.add('bg-red-600');
            localMessageBoxOkBtn.classList.remove('bg-gray-500');
        } else {
            localMessageBoxTitle.classList.remove('text-red-600');
            localMessageBoxOkBtn.classList.remove('bg-red-600');
        }

        localMessageBox.style.display = 'flex';
        localMessageBoxOkBtn.onclick = () => {
            localMessageBox.style.display = 'none';
        };
    } else {
        console.error("Profile page: Message box elements not found for showMessageBox.");
        alert(`${translatedTitle}: ${translatedMessage}`);
    }
}


function updateCartCountNav() {
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cartForCount.reduce((sum, i) => sum + i.quantity, 0);
    const cartCountSpanNav = document.getElementById('cart-count-nav');
    if (cartCountSpanNav) {
        cartCountSpanNav.textContent = count;
    }
}

async function loadProfile(user) {
    if (user) {
        profileEmailInput.value = user.email;

        try {
            const userProfileRef = db.ref('users/' + user.uid);
            const snapshot = await userProfileRef.once('value');
            const userProfile = snapshot.val() || {};

            profileNameInput.value = userProfile.name || '';
            profilePhoneInput.value = userProfile.phone || '';
            
            // Correctly update the text content of the display span
            if (profileAddressDisplay) {
                // Find the default address from the addresses list
                if (userProfile.addresses) {
                    const defaultAddress = Object.values(userProfile.addresses).find(addr => addr.isDefault);
                    if (defaultAddress) {
                        profileAddressDisplay.textContent = `${defaultAddress.street}, ${defaultAddress.city}`;
                        profileAddressDisplay.classList.remove('italic');
                    } else {
                         profileAddressDisplay.textContent = 'No default address set.';
                         profileAddressDisplay.classList.add('italic');
                    }
                } else {
                    profileAddressDisplay.textContent = 'No addresses saved.';
                    profileAddressDisplay.classList.add('italic');
                }
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            showMessageBox('profile_error_title', 'profile_load_error', true);
        }
    } else {
        window.location.href = 'auth.html';
    }
}

async function updateProfile(e) {
    e.preventDefault();
    updateProfileBtn.disabled = true;
    updateProfileBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.updating_profile_feedback) || "Updating Profile...";

    const user = auth.currentUser;
    if (!user) {
        showMessageBox('profile_error_title', 'no_user_logged_in', true);
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.update_profile_button) || "Update Profile";
        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
        return;
    }

    const name = profileNameInput.value.trim();
    const phone = profilePhoneInput.value.trim();
    
    // Address is no longer updated from this form, so it's removed from here.

    if (!name) {
        showMessageBox('validation_error_title', 'name_missing_error', true);
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.update_profile_button) || "Update Profile";
        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
        return;
    }

    try {
        const userProfileRef = db.ref('users/' + user.uid);
        // Only update name and phone. Address is managed on addresses.html
        await userProfileRef.update({
            name: name,
            phone: phone
        });
        showMessageBox('profile_success_title', 'profile_update_success', false);
    }  catch (error) {
        console.error("Error updating user profile:", error);
        showMessageBox('profile_error_title', 'profile_update_error', true);
    } finally {
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.update_profile_button) || "Update Profile";
        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.value = currentLang;
        languageSwitcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('lang', currentLang);
            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang);
                applyLanguage(currentLang, document.getElementById('profile-form'));
                if (profileTitle) profileTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.profile_title) || "My Profile";
            }
        });
    }
    if (profileTitle) profileTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.profile_title) || "My Profile";

    updateCartCountNav();

    auth.onAuthStateChanged(async (user) => {
        await loadProfile(user); 
        
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            const oldSubmitListener = profileForm._currentSubmitListener;
            if (oldSubmitListener) {
                profileForm.removeEventListener('submit', oldSubmitListener);
            }
            profileForm.addEventListener('submit', updateProfile);
            profileForm._currentSubmitListener = updateProfile;
        }
    });
});