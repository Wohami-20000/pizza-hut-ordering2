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
    forgotPasswordLink: document.getElementById('forgot-password-link'),
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
    renderAddresses(userProfile.addresses);
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
                showMessageBox('Link Sent', 'A password reset link has been sent to your email.');
            })
            .catch(error => {
                showMessageBox('Error', `Failed to send reset link: ${error.message}`);
            });
    }
};

// --- Address Functions ---
const renderAddresses = (addresses) => {
    const addressesContent = elements.addressesContent;
    addressesContent.innerHTML = ''; 

    if (!addresses || Object.keys(addresses).length === 0) {
        addressesContent.innerHTML = `
            <div class="text-center">
                <p>No addresses found.</p>
                <button id="add-address-btn" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Add Address</button>
            </div>
        `;
        document.getElementById('add-address-btn').addEventListener('click', () => {
            showAddressModal();
        });
        return;
    }

    const addressesList = document.createElement('div');
    addressesList.className = 'space-y-4';

    for (const addressId in addresses) {
        const address = addresses[addressId];
        const addressCard = document.createElement('div');
        addressCard.className = 'p-4 border rounded-lg';
        addressCard.innerHTML = `
            <p><strong>Label:</strong> ${address.label}</p>
            <p><strong>Street:</strong> ${address.street}</p>
            <p><strong>City:</strong> ${address.city}</p>
            <p><strong>Phone:</strong> ${address.phone}</p>
            <button class="edit-address-btn" data-id="${addressId}">Edit</button>
            <button class="remove-address-btn" data-id="${addressId}">Remove</button>
        `;
        addressesList.appendChild(addressCard);
    }
    addressesContent.appendChild(addressesList);

    const addAddressButton = document.createElement('button');
    addAddressButton.id = 'add-address-btn';
    addAddressButton.textContent = 'Add Address';
    addAddressButton.className = 'mt-4 bg-blue-500 text-white px-4 py-2 rounded';
    addressesContent.appendChild(addAddressButton);

    document.getElementById('add-address-btn').addEventListener('click', () => {
        showAddressModal();
    });

    document.querySelectorAll('.edit-address-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const addressId = e.target.dataset.id;
            const address = addresses[addressId];
            showAddressModal(addressId, address);
        });
    });

    document.querySelectorAll('.remove-address-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const addressId = e.target.dataset.id;
            if (confirm('Are you sure you want to remove this address?')) {
                removeAddress(addressId);
            }
        });
    });
};

const showAddressModal = (addressId = null, address = {}) => {
    const modal = document.createElement('div');
    modal.className = 'message-box';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="message-box-content">
            <h3>${addressId ? 'Edit Address' : 'Add Address'}</h3>
            <form id="address-form" class="space-y-4">
                <input type="text" id="address-label" placeholder="Label (e.g., Home, Work)" value="${address.label || ''}" required class="w-full p-2 border rounded">
                <input type="text" id="address-street" placeholder="Street" value="${address.street || ''}" required class="w-full p-2 border rounded">
                <input type="text" id="address-city" placeholder="City" value="Oujda" required class="w-full p-2 border rounded" readonly>
                <input type="tel" id="address-phone" placeholder="Phone Number" value="${address.phone || ''}" required class="w-full p-2 border rounded">
                <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                <button type="button" id="cancel-address-modal" class="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('address-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newAddress = {
            label: document.getElementById('address-label').value,
            street: document.getElementById('address-street').value,
            city: document.getElementById('address-city').value,
            phone: document.getElementById('address-phone').value,
        };
        saveAddress(addressId, newAddress);
        modal.remove();
    });

    document.getElementById('cancel-address-modal').addEventListener('click', () => {
        modal.remove();
    });
};

const saveAddress = async (addressId, address) => {
    const user = auth.currentUser;
    if (!user) return;

    if (addressId) {
        // Update existing address
        await db.ref(`users/${user.uid}/addresses/${addressId}`).update(address);
    } else {
        // Add new address
        await db.ref(`users/${user.uid}/addresses`).push(address);
    }
    loadProfileInfo(user);
};

const removeAddress = async (addressId) => {
    const user = auth.currentUser;
    if (!user) return;

    await db.ref(`users/${user.uid}/addresses/${addressId}`).remove();
    loadProfileInfo(user);
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

    if (elements.forgotPasswordLink) {
        elements.forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
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