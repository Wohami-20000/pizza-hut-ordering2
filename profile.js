// profile.js - Enhanced with new features

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache ---
const elements = {
    // ... (other elements remain the same)
    profileEmail: document.getElementById('profile-email'),
    profileName: document.getElementById('profile-name'),
    profilePhone: document.getElementById('profile-phone'),
    updateProfileBtn: document.getElementById('update-profile-btn'),
    profileForm: document.getElementById('profile-form'),
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    forgotPasswordLink: document.getElementById('forgot-password-link'),
    // NEW Elements
    emailVerificationStatus: document.getElementById('email-verification-status'),
    verifyEmailBtn: document.getElementById('verify-email-btn'),
    changeEmailBtn: document.getElementById('change-email-btn'),
    saveEmailBtn: document.getElementById('save-email-btn'),
    cancelEmailBtn: document.getElementById('cancel-email-btn'),
    profileNameError: document.getElementById('profile-name-error'),
    profilePhoneError: document.getElementById('profile-phone-error'),
    profileEmailError: document.getElementById('profile-email-error'),
};

// --- State ---
let currentUser = null;
let phoneInputInstance = null; // To hold the intl-tel-input instance
let originalEmail = '';

// --- Utility & UI Functions ---
const showMessageBox = (title, message) => {
    elements.messageBoxTitle.textContent = title;
    elements.messageBoxText.textContent = message;
    elements.messageBox.style.display = 'flex';
};

const hideMessageBox = () => {
    elements.messageBox.style.display = 'none';
};

const setLoadingState = (button, isLoading, originalText) => {
    // ... (this function remains the same)
};

const clearErrorMessages = () => {
    elements.profileNameError.textContent = '';
    elements.profilePhoneError.textContent = '';
    elements.profileEmailError.textContent = '';
};

// --- Phone Input Initialization ---
const initializePhoneInput = () => {
    phoneInputInstance = window.intlTelInput(elements.profilePhone, {
        initialCountry: "auto",
        geoIpLookup: callback => {
            fetch("https://ipapi.co/json")
                .then(res => res.json())
                .then(data => callback(data.country_code))
                .catch(() => callback("us"));
        },
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });
};

// --- Main Application Logic ---
const loadProfileInfo = async (user) => {
    originalEmail = user.email;
    elements.profileEmail.value = user.email;

    if (user.emailVerified) {
        elements.emailVerificationStatus.textContent = 'Verified';
        elements.emailVerificationStatus.className = 'email-status verified';
        elements.verifyEmailBtn.classList.add('hidden');
    } else {
        elements.emailVerificationStatus.textContent = 'Not Verified';
        elements.emailVerificationStatus.className = 'email-status unverified';
        elements.verifyEmailBtn.classList.remove('hidden');
    }

    const snapshot = await db.ref(`users/${user.uid}`).once('value');
    const userProfile = snapshot.val() || {};
    elements.profileName.value = userProfile.name || '';
    if (userProfile.phone) {
        phoneInputInstance.setNumber(userProfile.phone);
    }
};

const handleUpdateProfile = async (e) => {
    e.preventDefault();
    clearErrorMessages();
    setLoadingState(elements.updateProfileBtn, true, 'Update Profile');

    const name = elements.profileName.value.trim();
    if (!name) {
        elements.profileNameError.textContent = 'Full Name cannot be empty.';
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
        return;
    }

    if (!phoneInputInstance.isValidNumber()) {
        elements.profilePhoneError.textContent = 'The phone number is not valid.';
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
        return;
    }

    const fullPhoneNumber = phoneInputInstance.getNumber(); // Gets number in E.164 format

    try {
        await db.ref(`users/${currentUser.uid}`).update({
            name: name,
            phone: fullPhoneNumber
        });
        showMessageBox('Success!', 'Your profile has been updated successfully.');
    } catch (error) {
        showMessageBox('Error', 'An error occurred while updating your profile.');
        console.error("Profile update error:", error);
    } finally {
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
    }
};

// --- NEW Email Functions ---
const toggleEmailEditMode = (isEditing) => {
    elements.profileEmail.readOnly = !isEditing;
    elements.changeEmailBtn.classList.toggle('hidden', isEditing);
    elements.saveEmailBtn.classList.toggle('hidden', !isEditing);
    elements.cancelEmailBtn.classList.toggle('hidden', !isEditing);
    if (isEditing) {
        elements.profileEmail.classList.remove('bg-gray-100');
        elements.profileEmail.focus();
    } else {
        elements.profileEmail.classList.add('bg-gray-100');
        elements.profileEmail.value = originalEmail; // Revert on cancel
    }
};

const handleSaveEmail = () => {
    const newEmail = elements.profileEmail.value.trim();
    if (newEmail === originalEmail) {
        toggleEmailEditMode(false);
        return;
    }

    const password = prompt("For your security, please enter your current password to change your email:");
    if (!password) return;

    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);

    currentUser.reauthenticateWithCredential(credential).then(() => {
        return currentUser.updateEmail(newEmail);
    }).then(() => {
        return db.ref(`users/${currentUser.uid}`).update({ email: newEmail });
    }).then(() => {
        showMessageBox('Success!', 'Your email has been updated. A verification link has been sent to your new address.');
        originalEmail = newEmail; // Update the original email state
        toggleEmailEditMode(false);
        loadProfileInfo(currentUser); // Refresh verification status etc.
    }).catch(error => {
        showMessageBox('Error', `Failed to update email. ${error.message}`);
        toggleEmailEditMode(false); // Revert on error
    });
};

const handleSendVerificationEmail = () => { /* ... remains the same */ };
const handleForgotPassword = () => { /* ... remains the same */ };

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializePhoneInput(); // Initialize the phone input library

    auth.onAuthStateChanged(user => {
        if (!user || user.isAnonymous) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = user;
        loadProfileInfo(user);
    });

    // Event Listeners
    elements.profileForm.addEventListener('submit', handleUpdateProfile);
    elements.messageBoxOkBtn.addEventListener('click', hideMessageBox);
    
    // New Listeners
    elements.verifyEmailBtn.addEventListener('click', handleSendVerificationEmail);
    elements.changeEmailBtn.addEventListener('click', () => toggleEmailEditMode(true));
    elements.cancelEmailBtn.addEventListener('click', () => toggleEmailEditMode(false));
    elements.saveEmailBtn.addEventListener('click', handleSaveEmail);

    if (elements.forgotPasswordLink) {
        elements.forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // ... Tab switching logic remains the same
});