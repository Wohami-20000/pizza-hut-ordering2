// profile.js - Enhanced with full address management

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
    // Address Section Elements
    addressesList: document.getElementById('addresses-list'),
    loadingState: document.getElementById('loading-state'),
    noAddressesState: document.getElementById('no-addresses-state'),
    addNewAddressBtn: document.getElementById('add-new-btn'),
    // Address Modal Elements
    addressModal: document.getElementById('address-modal'),
    addressModalContent: document.getElementById('address-modal-content'),
    addressForm: document.getElementById('address-form'),
    cancelBtn: document.getElementById('cancel-btn'),
    modalTitle: document.getElementById('modal-title'),
    saveAddressBtn: document.getElementById('save-address-btn'),
    // Message & Confirm Modals
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    customConfirmModal: document.getElementById('custom-confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalText: document.getElementById('confirm-modal-text'),
    confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
    confirmModalConfirmBtn: document.getElementById('confirm-modal-confirm-btn'),
    // ... other elements from previous steps
};

// --- State ---
let currentUser = null;
let addressesRef = null;
let editingAddressKey = null;

// --- Utility & UI Functions ---
const showMessageBox = (title, message) => {
    // ... (This function remains the same as before)
};

const showConfirmModal = (title, message, onConfirm) => {
    elements.confirmModalTitle.textContent = title;
    elements.confirmModalText.textContent = message;
    elements.customConfirmModal.classList.remove('hidden');

    const confirmHandler = () => {
        onConfirm();
        closeConfirmModal();
    };

    const cancelHandler = () => {
        closeConfirmModal();
    };

    const closeConfirmModal = () => {
        elements.customConfirmModal.classList.add('hidden');
        elements.confirmModalConfirmBtn.removeEventListener('click', confirmHandler);
        elements.confirmModalCancelBtn.removeEventListener('click', cancelHandler);
    };

    elements.confirmModalConfirmBtn.addEventListener('click', confirmHandler);
    elements.confirmModalCancelBtn.addEventListener('click', cancelHandler);
};

const setLoadingState = (button, isLoading) => { /* ... remains the same */ };
const escapeHTML = (str) => { /* ... remains the same */ };


// --- NEW: Address Management Logic ---

/**
 * Creates an address card element from the template.
 * @param {object} address - The address data.
 * @param {string} key - The Firebase key for the address.
 * @returns {DocumentFragment} The populated card element.
 */
const createAddressCard = (address, key) => {
    const template = document.getElementById('address-card-template');
    const card = template.content.cloneNode(true);
    const cardElement = card.querySelector('.address-card');

    card.querySelector('.address-label').textContent = escapeHTML(address.label);
    card.querySelector('.address-street').textContent = escapeHTML(address.street);
    card.querySelector('.address-city').textContent = escapeHTML(address.city);
    card.querySelector('.address-phone').textContent = escapeHTML(address.phone);

    if (address.isDefault) {
        cardElement.classList.add('default');
        const setDefaultBtn = card.querySelector('.set-default-btn');
        if (setDefaultBtn) setDefaultBtn.remove();
    }

    card.querySelector('.edit-btn').addEventListener('click', () => openAddressModal(address, key));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(key, address.isDefault));
    
    const setDefaultBtn = card.querySelector('.set-default-btn');
    if (setDefaultBtn) setDefaultBtn.addEventListener('click', () => setDefaultAddress(key));
    
    return card;
};

/**
 * Renders the list of addresses from the Firebase snapshot.
 * @param {firebase.database.DataSnapshot} snapshot - The data from Firebase.
 */
const renderAddresses = (snapshot) => {
    elements.loadingState.classList.add('hidden');
    elements.addressesList.innerHTML = '';

    if (!snapshot.exists()) {
        elements.noAddressesState.classList.remove('hidden');
        return;
    }
    elements.noAddressesState.classList.add('hidden');
    snapshot.forEach(child => {
        elements.addressesList.appendChild(createAddressCard(child.val(), child.key));
    });
};

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
    setLoadingState(elements.saveAddressBtn, true);

    const addressData = {
        label: elements.addressForm.querySelector('#address-label').value.trim(),
        street: elements.addressForm.querySelector('#address-street').value.trim(),
        city: elements.addressForm.querySelector('#address-city').value.trim(),
        phone: elements.addressForm.querySelector('#address-phone').value.trim(),
    };

    if (!addressData.street || !addressData.city) {
        showMessageBox('Validation Error', 'Street and City are required.');
        setLoadingState(elements.saveAddressBtn, false);
        return;
    }

    try {
        if (editingAddressKey) {
            await addressesRef.child(editingAddressKey).update(addressData);
        } else {
            const snapshot = await addressesRef.once('value');
            // If this is the very first address, make it the default one.
            addressData.isDefault = !snapshot.exists();
            await addressesRef.push(addressData);
        }
        closeAddressModal();
    } catch (err) {
        showMessageBox('Error', 'Could not save address.');
        console.error("Error saving address:", err);
    } finally {
        setLoadingState(elements.saveAddressBtn, false);
    }
};

const setDefaultAddress = async (keyToMakeDefault) => {
    const snapshot = await addressesRef.once('value');
    const updates = {};
    let currentDefaultKey = null;

    snapshot.forEach(child => {
        if (child.val().isDefault) {
            currentDefaultKey = child.key;
        }
    });

    if (currentDefaultKey) {
        updates[`${currentDefaultKey}/isDefault`] = false;
    }
    updates[`${keyToMakeDefault}/isDefault`] = true;

    await addressesRef.update(updates);
    showMessageBox('Success', 'Default address updated.');
};

const deleteAddress = (key, isDefault) => {
    if (isDefault) {
        showMessageBox('Action Required', 'Cannot delete your default address. Please set another address as default first.');
        return;
    }
    showConfirmModal('Delete Address', 'Are you sure you want to delete this address?', () => {
        addressesRef.child(key).remove()
            .then(() => showMessageBox('Success', 'Address deleted.'))
            .catch(err => showMessageBox('Error', 'Could not delete address.'));
    });
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (!user || user.isAnonymous) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = user;
        
        // --- Setup Listeners specific to authenticated user ---
        addressesRef = db.ref(`users/${user.uid}/addresses`);
        elements.loadingState.classList.remove('hidden');
        addressesRef.on('value', renderAddresses, (error) => {
            elements.loadingState.classList.add('hidden');
            showMessageBox('Error', 'Could not load addresses.');
        });
        
        // Load personal info (this function comes from your previous implementation)
        // loadProfileInfo(user);
    });

    // Event Listeners for Address Management
    elements.addNewAddressBtn.addEventListener('click', () => openAddressModal());
    elements.cancelBtn.addEventListener('click', closeAddressModal);
    elements.addressForm.addEventListener('submit', handleSaveAddress);

    // ... other existing event listeners (profile form, tabs, etc.)
});