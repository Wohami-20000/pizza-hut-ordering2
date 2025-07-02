// profile.js - Enhanced with new features and full address management

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache ---
const elements = {
    // ... (personal info elements)
    profileEmail: document.getElementById('profile-email'),
    profileName: document.getElementById('profile-name'),
    profilePhone: document.getElementById('profile-phone'),
    updateProfileBtn: document.getElementById('update-profile-btn'),
    profileForm: document.getElementById('profile-form'),
    // ... (message box elements)
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    // ... (tab elements)
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    // ... (NEW address elements)
    addressesList: document.getElementById('addresses-list'),
    loadingState: document.getElementById('loading-state'),
    noAddressesState: document.getElementById('no-addresses-state'),
    addNewAddressBtn: document.getElementById('add-new-address-btn'),
    addressModal: document.getElementById('address-modal'),
    addressForm: document.getElementById('address-form'),
    cancelBtn: document.getElementById('cancel-btn'),
    modalTitle: document.getElementById('modal-title'),
    saveAddressBtn: document.getElementById('save-address-btn'),
};

// --- State ---
let currentUser = null;
let addressesRef = null;
let editingAddressKey = null;
let phoneInputInstance = null;
let originalEmail = '';

// --- Utility & UI Functions ---
const showMessageBox = (title, message) => { /* ... same as before */ };
const hideMessageBox = () => { /* ... same as before */ };
const setLoadingState = (button, isLoading, originalText) => { /* ... same as before */ };

// --- Address Management Logic ---
const openAddressModal = (address = null, key = null) => {
    elements.addressForm.reset();
    editingAddressKey = key;
    elements.modalTitle.textContent = key ? 'Edit Address' : 'Add New Address';
    if (address) {
        document.getElementById('address-label').value = address.label || '';
        document.getElementById('address-street').value = address.street || '';
        document.getElementById('address-city').value = address.city || '';
        document.getElementById('address-phone').value = address.phone || '';
    }
    elements.addressModal.classList.remove('hidden');
};

const closeAddressModal = () => {
    elements.addressModal.classList.add('hidden');
};

const handleSaveAddress = async (e) => {
    e.preventDefault();
    setLoadingState(elements.saveAddressBtn, true, 'Save');
    const addressData = {
        label: document.getElementById('address-label').value.trim(),
        street: document.getElementById('address-street').value.trim(),
        city: document.getElementById('address-city').value.trim(),
        phone: document.getElementById('address-phone').value.trim(),
    };

    if (!addressData.label || !addressData.street || !addressData.city) {
        showMessageBox('Validation Error', 'Label, Street, and City are required.');
        setLoadingState(elements.saveAddressBtn, false, 'Save');
        return;
    }

    try {
        if (editingAddressKey) {
            await addressesRef.child(editingAddressKey).update(addressData);
            showMessageBox('Success', 'Address updated successfully!');
        } else {
            const snapshot = await addressesRef.once('value');
            if (!snapshot.exists()) {
                addressData.isDefault = true; // Make the first address the default
            }
            await addressesRef.push(addressData);
            showMessageBox('Success', 'New address added successfully!');
        }
        closeAddressModal();
    } catch (err) {
        showMessageBox('Error', 'Could not save the address. Please try again.');
        console.error(err);
    } finally {
        setLoadingState(elements.saveAddressBtn, false, 'Save');
    }
};

const setDefaultAddress = async (keyToMakeDefault) => {
    const snapshot = await addressesRef.once('value');
    const updates = {};
    snapshot.forEach(childSnapshot => {
        updates[`${childSnapshot.key}/isDefault`] = childSnapshot.key === keyToMakeDefault;
    });
    await addressesRef.update(updates);
    showMessageBox('Success', 'Default address has been updated.');
};

const deleteAddress = (key, isDefault) => {
    if (isDefault) {
        showMessageBox('Action Required', 'You cannot delete your default address. Please set another address as default first.');
        return;
    }
    if (confirm('Are you sure you want to delete this address?')) {
        addressesRef.child(key).remove()
            .then(() => showMessageBox('Success', 'Address has been deleted.'))
            .catch(err => showMessageBox('Error', 'Failed to delete address.'));
    }
};

const createAddressCard = (address, key) => {
    const template = document.getElementById('address-card-template');
    const card = template.content.cloneNode(true);
    const cardElement = card.querySelector('.address-card');
    
    card.querySelector('.address-label').textContent = address.label;
    card.querySelector('.address-street').textContent = address.street;
    card.querySelector('.address-city').textContent = address.city;
    card.querySelector('.address-phone').textContent = address.phone;
    
    const setDefaultBtn = card.querySelector('.set-default-btn');
    if (address.isDefault) {
        cardElement.classList.add('default');
        if (setDefaultBtn) setDefaultBtn.remove();
    } else {
        setDefaultBtn.addEventListener('click', () => setDefaultAddress(key));
    }

    card.querySelector('.edit-btn').addEventListener('click', () => openAddressModal(address, key));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(key, address.isDefault));
    
    return card;
};

const renderAddresses = (snapshot) => {
    elements.loadingState.style.display = 'none';
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (personal info initialization remains the same)

    auth.onAuthStateChanged(user => {
        if (!user || user.isAnonymous) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = user;
        // ... (loadProfileInfo call remains the same)
        
        // Setup Address Management
        addressesRef = db.ref(`users/${user.uid}/addresses`);
        elements.loadingState.style.display = 'block';
        addressesRef.on('value', renderAddresses, (error) => {
            elements.loadingState.style.display = 'none';
            showMessageBox('Error', 'Could not load addresses.');
            console.error(error);
        });
    });

    // Event Listeners
    elements.profileForm.addEventListener('submit', handleUpdateProfile);
    elements.messageBoxOkBtn.addEventListener('click', hideMessageBox);
    
    // New Address Listeners
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