// profile.js - FINAL Enhanced Version

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache ---
const elements = {
    profileEmail: document.getElementById('profile-email'),
    profileName: document.getElementById('profile-name'),
    profilePhone: document.getElementById('profile-phone'),
    updateProfileBtn: document.getElementById('update-profile-btn'),
    profileForm: document.getElementById('profile-form'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    changePasswordForm: document.getElementById('change-password-form'),
    updatePasswordBtn: document.getElementById('update-password-btn'),
    // NEW Elements
    emailVerificationStatus: document.getElementById('email-verification-status'),
    verifyEmailBtn: document.getElementById('verify-email-btn'),
    changeEmailBtn: document.getElementById('change-email-btn'),
    forgotPasswordLink: document.getElementById('forgot-password-link'),
    profileNameError: document.getElementById('profile-name-error'),
    profilePhoneError: document.getElementById('profile-phone-error'),
};

// --- State ---
let currentUser = null;

// --- Utility & UI Functions ---
const showMessageBox = (title, message) => {
    elements.messageBoxTitle.textContent = title;
    elements.messageBoxText.textContent = message;
    elements.messageBox.style.display = 'flex';
    elements.messageBoxOkBtn.onclick = () => { elements.messageBox.style.display = 'none'; };
};

const setLoadingState = (button, isLoading, originalText = 'Update') => {
    button.disabled = isLoading;
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        if (btnText) btnText.style.visibility = 'hidden';
        if (spinner) spinner.style.display = 'inline-block';
    } else {
        if (btnText) {
            btnText.style.visibility = 'visible';
            btnText.textContent = originalText;
        }
        if (spinner) spinner.style.display = 'none';
    }
};

const clearErrorMessages = () => {
    elements.profileNameError.textContent = '';
    elements.profilePhoneError.textContent = '';
};

// --- Main Application Logic ---
const loadProfileInfo = async (user) => {
    elements.profileEmail.value = user.email;
    
    // Email verification status
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
    
    // Format phone number for display
    try {
        if (userProfile.phone) {
            const phoneNumber = libphonenumber.parsePhoneNumber(userProfile.phone, 'MA');
            elements.profilePhone.value = phoneNumber.nationalNumber || '';
        } else {
            elements.profilePhone.value = '';
        }
    } catch(e) {
        elements.profilePhone.value = userProfile.phone || ''; // Fallback to raw number
    }
};

const handleUpdateProfile = async (e) => {
    e.preventDefault();
    clearErrorMessages();
    setLoadingState(elements.updateProfileBtn, true, 'Update Profile');

    const name = elements.profileName.value.trim();
    const phone = elements.profilePhone.value.trim();

    if (!name) {
        elements.profileNameError.textContent = 'Full Name cannot be empty.';
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
        return;
    }

    try {
        // Validate phone number before updating
        const phoneNumber = new libphonenumber.parsePhoneNumber(phone, 'MA');
        if (!phoneNumber.isValid()) {
            elements.profilePhoneError.textContent = 'Please enter a valid Moroccan phone number.';
            setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
            return;
        }

        await db.ref(`users/${currentUser.uid}`).update({
            name: name,
            phone: phoneNumber.format('E.164') // Store in international format
        });
        showMessageBox('Success', 'Your profile has been updated successfully!');
    } catch (error) {
        elements.profilePhoneError.textContent = 'The phone number is not valid.';
        console.error("Profile update error:", error);
    } finally {
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
    }
};

const handleSendVerificationEmail = () => {
    currentUser.sendEmailVerification()
        .then(() => {
            showMessageBox('Email Sent', 'A verification link has been sent to your email address. Please check your inbox (and spam folder).');
        })
        .catch(error => {
            showMessageBox('Error', `Failed to send verification email: ${error.message}`);
        });
};

const handleChangeEmail = () => {
    const password = prompt("For your security, please enter your current password:");
    if (!password) return;

    const newEmail = prompt("Please enter your new email address:");
    if (!newEmail) return;

    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
    
    currentUser.reauthenticateWithCredential(credential)
        .then(() => {
            return currentUser.updateEmail(newEmail);
        })
        .then(() => {
            return db.ref(`users/${currentUser.uid}`).update({ email: newEmail });
        })
        .then(() => {
            showMessageBox('Success', 'Your email has been updated. Please verify your new email address.');
            loadProfileInfo(currentUser); // Refresh info on page
        })
        .catch(error => {
            showMessageBox('Error', `Failed to update email: ${error.message}`);
        });
};

const handleForgotPassword = () => {
    if (confirm("Are you sure you want to send a password reset link to your email?")) {
        auth.sendPasswordResetEmail(currentUser.email)
            .then(() => {
                showMessageBox('Link Sent', 'A password reset link has been sent to your email.');
            })
            .catch(error => {
                showMessageBox('Error', `Failed to send reset link: ${error.message}`);
            });
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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
    elements.verifyEmailBtn.addEventListener('click', handleSendVerificationEmail);
    elements.changeEmailBtn.addEventListener('click', handleChangeEmail);
    elements.forgotPasswordLink.addEventListener('click', handleForgotPassword);
    
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
});