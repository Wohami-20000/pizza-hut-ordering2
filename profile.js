// profile.js - Enhanced with new features and feedback messages

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache ---
const elements = {
    profileEmail: document.getElementById('profile-email'),
    profileName: document.getElementById('profile-name'),
    profilePhone: document.getElementById('profile-phone'),
    updateProfileBtn: document.getElementById('update-profile-btn'),
    profileForm: document.getElementById('profile-form'),
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    emailVerificationStatus: document.getElementById('email-verification-status'),
    verifyEmailBtn: document.getElementById('verify-email-btn'),
    changeEmailBtn: document.getElementById('change-email-btn'),
    saveEmailBtn: document.getElementById('save-email-btn'),
    cancelEmailBtn: document.getElementById('cancel-email-btn'),
    profileNameError: document.getElementById('profile-name-error'),
    profilePhoneError: document.getElementById('profile-phone-error'),
    profileEmailError: document.getElementById('profile-email-error'),
    addressesTab: document.querySelector('[data-tab="addresses"]'),
    addressesContent: document.getElementById('addresses'),
    addressModal: document.getElementById('address-modal'),
    addressModalTitle: document.getElementById('address-modal-title'),
    addressForm: document.getElementById('address-form'),
    addressIdInput: document.getElementById('address-id'),
    addressLabelInput: document.getElementById('address-label'),
    addressStreetInput: document.getElementById('address-street'),
    addressCityInput: document.getElementById('address-city'),
    addressPhoneInput: document.getElementById('address-phone'),
    cancelAddressModalBtn: document.getElementById('cancel-address-modal'),
    // Settings elements
    changePasswordForm: document.getElementById('change-password-form'),
    currentPasswordInput: document.getElementById('current-password'),
    newPasswordInput: document.getElementById('new-password'),
    confirmNewPasswordInput: document.getElementById('confirm-new-password'),
    passwordChangeMessage: document.getElementById('password-change-message'),
    updatePasswordBtn: document.getElementById('update-password-btn'),
    settingsForgotPassword: document.getElementById('settings-forgot-password'),
};

// --- State ---
let currentUser = null;
let phoneInputInstance = null; // To hold the intl-tel-input instance
let originalEmail = '';
let userAddresses = {};

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
    if (!button) return;
    button.disabled = isLoading;
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        if (btnText) btnText.style.visibility = 'hidden';
        if (spinner) spinner.style.display = 'inline-block';
    } else {
        if (btnText) {
            btnText.style.visibility = 'visible';
            if(originalText) btnText.textContent = originalText;
        }
        if (spinner) spinner.style.display = 'none';
    }
};

const clearErrorMessages = () => {
    elements.profileNameError.textContent = '';
    elements.profilePhoneError.textContent = '';
    elements.profileEmailError.textContent = '';
};

// --- Phone Input Initialization ---
const initializePhoneInput = () => {
    if (!elements.profilePhone) return;
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
    if (userProfile.phone && phoneInputInstance) {
        phoneInputInstance.setNumber(userProfile.phone);
    }
    userAddresses = userProfile.addresses || {};
    renderAddresses();
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

    if (phoneInputInstance && !phoneInputInstance.isValidNumber()) {
        elements.profilePhoneError.textContent = 'The phone number is not valid for the selected country.';
        setLoadingState(elements.updateProfileBtn, false, 'Update Profile');
        return;
    }

    const fullPhoneNumber = phoneInputInstance ? phoneInputInstance.getNumber() : '';

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

// --- Email Functions ---
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
    
    setLoadingState(elements.saveEmailBtn, true, 'Save');
    currentUser.reauthenticateWithCredential(credential).then(() => {
        return currentUser.updateEmail(newEmail);
    }).then(() => {
        return db.ref(`users/${currentUser.uid}`).update({ email: newEmail });
    }).then(() => {
        showMessageBox('Success!', 'Your email has been updated. A verification link has been sent to your new address.');
        originalEmail = newEmail;
        toggleEmailEditMode(false);
        loadProfileInfo(auth.currentUser); // Refresh info on page
    }).catch(error => {
        showMessageBox('Error', `Failed to update email. ${error.message}`);
        toggleEmailEditMode(false); // Revert on error
    }).finally(() => {
        setLoadingState(elements.saveEmailBtn, false, 'Save');
    });
};

const handleSendVerificationEmail = () => {
    elements.verifyEmailBtn.disabled = true;
    elements.verifyEmailBtn.textContent = 'Sending...';

    currentUser.sendEmailVerification()
        .then(() => {
            showMessageBox('Email Sent', 'A verification link has been sent to your email address. Please check your inbox (and spam folder).');
        })
        .catch(error => {
            showMessageBox('Error', `Failed to send verification email: ${error.message}`);
        })
        .finally(() => {
            elements.verifyEmailBtn.disabled = false;
            elements.verifyEmailBtn.textContent = 'Send verification email';
        });
};

const handleForgotPassword = () => {
    if (confirm("Are you sure you want to send a password reset link to your email?")) {
        auth.sendPasswordResetEmail(currentUser.email)
            .then(() => {
                showMessageBox('Link Sent', 'A password reset link has been sent to your email. Please check your inbox.');
            })
            .catch(error => {
                showMessageBox('Error', `Failed to send reset link: ${error.message}`);
            });
    }
};

// --- Address Functions ---
const renderAddresses = () => {
    const addressesContent = elements.addressesContent;
    addressesContent.innerHTML = '';

    const addressesList = document.createElement('div');
    addressesList.className = 'space-y-4';

    if (Object.keys(userAddresses).length === 0) {
        addressesList.innerHTML = `
            <div class="text-center p-8 border-2 border-dashed rounded-lg">
                <p class="text-gray-500">You haven't saved any addresses yet.</p>
            </div>
        `;
    } else {
        for (const addressId in userAddresses) {
            const address = userAddresses[addressId];
            const addressCard = document.createElement('div');
            addressCard.className = 'p-4 border rounded-lg flex justify-between items-center';
            addressCard.innerHTML = `
                <div>
                    <p class="font-bold text-lg">${address.label}</p>
                    <p>${address.street}, ${address.city}</p>
                    <p class="text-sm text-gray-500">${address.phone}</p>
                </div>
                <div>
                    <button class="edit-address-btn text-blue-500 hover:text-blue-700 p-2" data-id="${addressId}" aria-label="Edit address ${escapeHTML(address.label)}"><i class="fas fa-edit"></i></button>
                    <button class="remove-address-btn text-red-500 hover:text-red-700 p-2" data-id="${addressId}" aria-label="Remove address ${escapeHTML(address.label)}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            addressesList.appendChild(addressCard);
        }
    }
    addressesContent.appendChild(addressesList);

    const addAddressButton = document.createElement('button');
    addAddressButton.id = 'add-address-btn';
    addAddressButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Add New Address';
    addAddressButton.className = 'mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700';
    addressesContent.appendChild(addAddressButton);

    document.getElementById('add-address-btn').addEventListener('click', () => {
        showAddressModal();
    });

    document.querySelectorAll('.edit-address-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const addressId = e.currentTarget.dataset.id;
            const address = userAddresses[addressId];
            showAddressModal(addressId, address);
        });
    });

    document.querySelectorAll('.remove-address-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const addressId = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to remove this address?')) {
                removeAddress(addressId);
            }
        });
    });
};

const showAddressModal = (addressId = null, address = {}) => {
    elements.addressModalTitle.textContent = addressId ? 'Edit Address' : 'Add Address';
    elements.addressIdInput.value = addressId || '';
    elements.addressLabelInput.value = address.label || '';
    elements.addressStreetInput.value = address.street || '';
    elements.addressPhoneInput.value = address.phone || '';
    elements.addressModal.style.display = 'block';
};

const closeAddressModal = () => {
    elements.addressModal.style.display = 'none';
};

const saveAddress = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const addressId = elements.addressIdInput.value;
    const addressData = {
        label: elements.addressLabelInput.value,
        street: elements.addressStreetInput.value,
        city: elements.addressCityInput.value,
        phone: elements.addressPhoneInput.value,
    };

    const addressRef = addressId
        ? db.ref(`users/${user.uid}/addresses/${addressId}`)
        : db.ref(`users/${user.uid}/addresses`).push();

    await addressRef.set(addressData);
    closeAddressModal();
    loadProfileInfo(user);
};

const removeAddress = async (addressId) => {
    const user = auth.currentUser;
    if (!user) return;

    await db.ref(`users/${user.uid}/addresses/${addressId}`).remove();
    loadProfileInfo(user);
};

// --- Settings Functions ---
const handleChangePassword = async (e) => {
    e.preventDefault();
    const currentPassword = elements.currentPasswordInput.value;
    const newPassword = elements.newPasswordInput.value;
    const confirmNewPassword = elements.confirmNewPasswordInput.value;
    const messageEl = elements.passwordChangeMessage;

    if (newPassword !== confirmNewPassword) {
        messageEl.textContent = "New passwords do not match.";
        messageEl.className = 'text-sm h-5 text-red-600';
        return;
    }
    if (newPassword.length < 6) {
        messageEl.textContent = "Password must be at least 6 characters long.";
        messageEl.className = 'text-sm h-5 text-red-600';
        return;
    }

    messageEl.textContent = "Updating...";
    messageEl.className = 'text-sm h-5 text-gray-500';

    try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        messageEl.textContent = "Password updated successfully!";
        messageEl.className = 'text-sm h-5 text-green-600';
        elements.changePasswordForm.reset();
    } catch (error) {
        console.error("Password change error:", error);
        if (error.code === 'auth/wrong-password') {
            messageEl.textContent = "Incorrect current password.";
        } else {
            messageEl.textContent = "An error occurred. Please try again.";
        }
        messageEl.className = 'text-sm h-5 text-red-600';
    }
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializePhoneInput();

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
    
    elements.verifyEmailBtn.addEventListener('click', handleSendVerificationEmail);
    elements.changeEmailBtn.addEventListener('click', () => toggleEmailEditMode(true));
    elements.cancelEmailBtn.addEventListener('click', () => toggleEmailEditMode(false));
    elements.saveEmailBtn.addEventListener('click', handleSaveEmail);

    if (elements.settingsForgotPassword) {
        elements.settingsForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            handleForgotPassword();
        });
    }
    
    elements.addressForm.addEventListener('submit', saveAddress);
    elements.cancelAddressModalBtn.addEventListener('click', closeAddressModal);
    
    elements.changePasswordForm.addEventListener('submit', handleChangePassword);
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
});