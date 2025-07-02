// profile.js - Enhanced with Address Management

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache (Now includes Address elements) ---
const elements = {
    // Personal Info
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
    // Settings
    forgotPasswordLink: document.getElementById('forgot-password-link'),
    // Addresses
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    addressesList: document.getElementById('addresses-list'),
    loadingState: document.getElementById('loading-state'),
    noAddressesState: document.getElementById('no-addresses-state'),
    addNewAddressBtn: document.getElementById('add-new-btn'),
    addressModal: document.getElementById('address-modal'),
    addressForm: document.getElementById('address-form'),
    cancelBtn: document.getElementById('cancel-btn'),
    modalTitle: document.getElementById('modal-title'),
    saveAddressBtn: document.getElementById('save-address-btn'),
    customConfirmModal: document.getElementById('custom-confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalText: document.getElementById('confirm-modal-text'),
    confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
    confirmModalConfirmBtn: document.getElementById('confirm-modal-confirm-btn'),
};

// --- State ---
let currentUser = null;
let addressesRef = null;
let editingAddressKey = null;
let phoneInputInstance = null;
let originalEmail = '';

// --- Utility & UI Functions ---
const showMessageBox = (title, message) => { /* ... remains the same */ };
const hideMessageBox = () => { /* ... remains the same */ };
const setLoadingState = (button, isLoading, originalText) => { /* ... remains the same */ };
const clearErrorMessages = () => { /* ... remains the same */ };

const showConfirmModal = (title, message, onConfirm) => {
    elements.confirmModalTitle.textContent = title;
    elements.confirmModalText.textContent = message;
    elements.customConfirmModal.classList.remove('hidden');

    const confirmHandler = () => {
        onConfirm();
        closeConfirmModal();
    };
    const cancelHandler = () => closeConfirmModal();

    const closeConfirmModal = () => {
        elements.customConfirmModal.classList.add('hidden');
        elements.confirmModalConfirmBtn.removeEventListener('click', confirmHandler);
        elements.confirmModalCancelBtn.removeEventListener('click', cancelHandler);
    };

    elements.confirmModalConfirmBtn.addEventListener('click', confirmHandler);
    elements.confirmModalCancelBtn.addEventListener('click', cancelHandler);
};

// --- Main Application Logic (Personal Info) ---
const initializePhoneInput = () => { /* ... remains the same */ };
const loadProfileInfo = async (user) => { /* ... remains the same */ };
const handleUpdateProfile = async (e) => { /* ... remains the same */ };
const toggleEmailEditMode = (isEditing) => { /* ... remains the same */ };
const handleSaveEmail = () => { /* ... remains the same */ };
const handleSendVerificationEmail = () => { /* ... remains the same */ };
const handleForgotPassword = () => { /* ... remains the same */ };

// --- NEW: Address Management Logic ---
const openAddressModal = (address = null, key = null) => {
    elements.addressForm.reset();
    editingAddressKey = key;
    elements.modalTitle.textContent = key ? 'Edit Address' : 'Add New Address';
    if (address) {
        elements.addressForm.querySelector('#address-label').value = address.label || '';
        elements.addressForm.querySelector('#address-street').value = address.street || '';
        elements.addressForm.querySelector('#address-city').value = address.city || '';
        elements.addressForm.querySelector('#address-phone').value = address.phone || '';
    }
    elements.addressModal.classList.remove('hidden');
    elements.addressForm.querySelector('input').focus();
};

const closeAddressModal = () => elements.addressModal.classList.add('hidden');

const handleSaveAddress = async (e) => {
    e.preventDefault();
    setLoadingState(elements.saveAddressBtn, true, 'Save');
    const addressData = {
        label: elements.addressForm.querySelector('#address-label').value.trim(),
        street: elements.addressForm.querySelector('#address-street').value.trim(),
        city: elements.addressForm.querySelector('#address-city').value.trim(),
        phone: elements.addressForm.querySelector('#address-phone').value.trim(),
    };

    if (!addressData.street || !addressData.city) {
        showMessageBox('Validation Error', 'Street Address and City are required.');
        setLoadingState(elements.saveAddressBtn, false, 'Save');
        return;
    }

    try {
        if (editingAddressKey) {
            await addressesRef.child(editingAddressKey).update(addressData);
        } else {
            const snapshot = await addressesRef.once('value');
            // Make the very first address the default one
            if (!snapshot.exists()) {
                addressData.isDefault = true;
            }
            await addressesRef.push(addressData);
        }
        closeAddressModal();
    } catch (err) {
        showMessageBox('Error', 'Could not save the address. Please try again.');
        console.error("Address save error:", err);
    } finally {
        setLoadingState(elements.saveAddressBtn, false, 'Save');
    }
};

const setDefaultAddress = async (keyToSetDefault) => {
    const snapshot = await addressesRef.once('value');
    const updates = {};
    snapshot.forEach(childSnapshot => {
        updates[`${childSnapshot.key}/isDefault`] = childSnapshot.key === keyToSetDefault;
    });
    await addressesRef.update(updates);
    showMessageBox('Success', 'Default address has been updated.');
};

const deleteAddress = (key, isDefault) => {
    if (isDefault) {
        showMessageBox('Action Required', 'You cannot delete your default address. Please set another address as default first.');
        return;
    }
    showConfirmModal('Delete Address', 'Are you sure you want to delete this address forever?', () => {
        addressesRef.child(key).remove()
            .then(() => showMessageBox('Success', 'Address deleted.'))
            .catch(err => showMessageBox('Error', 'Could not delete address.'));
    });
};

const createAddressCard = (address, key) => {
    const template = document.getElementById('address-card-template');
    const card = template.content.cloneNode(true).firstElementChild;

    card.querySelector('.address-label').textContent = address.label;
    card.querySelector('.address-street').textContent = address.street;
    card.querySelector('.address-city').textContent = address.city;
    card.querySelector('.address-phone').textContent = address.phone;

    if (address.isDefault) {
        card.classList.add('default');
    } else {
        card.querySelector('.set-default-btn').addEventListener('click', () => setDefaultAddress(key));
    }

    card.querySelector('.edit-btn').addEventListener('click', () => openAddressModal(address, key));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(key, address.isDefault));
    
    return card;
};

const renderAddresses = (snapshot) => {
    elements.loadingState.classList.add('hidden');
    elements.addressesList.innerHTML = '';
    if (!snapshot.exists()) {
        elements.noAddressesState.classList.remove('hidden');
        return;
    }
    elements.noAddressesState.classList.add('hidden');
    snapshot.forEach(childSnapshot => {
        const card = createAddressCard(childSnapshot.val(), childSnapshot.key);
        elements.addressesList.appendChild(card);
    });
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

        // Set up listener for the addresses tab
        addressesRef = db.ref(`users/${user.uid}/addresses`);
        elements.loadingState.classList.remove('hidden');
        addressesRef.on('value', renderAddresses, (error) => {
            elements.loadingState.classList.add('hidden');
            showMessageBox('Error', 'Could not load addresses.');
        });
    });

    // Event Listeners for Personal Info
    elements.profileForm.addEventListener('submit', handleUpdateProfile);
    elements.messageBoxOkBtn.addEventListener('click', hideMessageBox);
    elements.verifyEmailBtn.addEventListener('click', handleSendVerificationEmail);
    elements.changeEmailBtn.addEventListener('click', () => toggleEmailEditMode(true));
    elements.cancelEmailBtn.addEventListener('click', () => toggleEmailEditMode(false));
    elements.saveEmailBtn.addEventListener('click', handleSaveEmail);
    if (elements.forgotPasswordLink) {
        elements.forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // Event Listeners for Addresses
    elements.addNewAddressBtn.addEventListener('click', () => openAddressModal());
    elements.cancelBtn.addEventListener('click', closeAddressModal);
    elements.addressForm.addEventListener('submit', handleSaveAddress);

    // Tab switching logic
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
});