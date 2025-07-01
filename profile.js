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
    addressesList: document.getElementById('addresses-list'),
    loadingState: document.getElementById('loading-state'),
    noAddressesState: document.getElementById('no-addresses-state'),
    addNewAddressBtn: document.getElementById('add-new-btn'),
    addressModal: document.getElementById('address-modal'),
    addressModalContent: document.getElementById('address-modal-content'),
    addressForm: document.getElementById('address-form'),
    cancelBtn: document.getElementById('cancel-btn'),
    modalTitle: document.getElementById('modal-title'),
    saveAddressBtn: document.getElementById('save-address-btn'),
    messageBox: document.getElementById('custom-message-box'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    changePasswordForm: document.getElementById('change-password-form'),
    updatePasswordBtn: document.getElementById('update-password-btn'),
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

// --- Utility & UI Functions ---
const showMessageBox = (titleKey, messageKey, isError = false) => {
    const lang = localStorage.getItem('lang') || 'en';
    const t = translations[lang];
    elements.messageBoxTitle.textContent = t[titleKey] || titleKey;
    elements.messageBoxText.textContent = t[messageKey] || messageKey;
    elements.messageBoxOkBtn.textContent = t.message_box_ok || "OK";
    elements.messageBox.style.display = 'flex';
    elements.messageBoxOkBtn.onclick = () => { elements.messageBox.style.display = 'none'; };
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

const setLoadingState = (button, isLoading) => {
    button.disabled = isLoading;
};

const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': "&quot;", "'": '&#39;' }[match]));
};

// --- Main Application Logic ---

// 1. TAB SWITCHING
elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        elements.tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// 2. PROFILE INFO & PHONE VALIDATION
const setupPhoneValidation = () => {
    const phoneInput = elements.profilePhone;
    phoneInput.addEventListener('blur', () => {
        try {
            const phoneNumber = new libphonenumber.parsePhoneNumber(phoneInput.value, 'MA');
            phoneInput.style.borderColor = phoneNumber.isValid() ? '#d1d5db' : 'red';
        } catch (error) {
            phoneInput.style.borderColor = 'red';
        }
    });
};

const loadProfileInfo = async (user) => {
    elements.profileEmail.value = user.email;
    const snapshot = await db.ref(`users/${user.uid}`).once('value');
    const userProfile = snapshot.val() || {};
    elements.profileName.value = userProfile.name || '';
    elements.profilePhone.value = userProfile.phone || '';
};

const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const nameField = elements.profileName;
    const nameError = nameField.nextElementSibling;
    nameError.textContent = '';
    
    if (!nameField.value.trim()) {
        nameError.textContent = 'Full Name cannot be empty.';
        return;
    }

    try {
        const phoneNumber = new libphonenumber.parsePhoneNumber(elements.profilePhone.value, 'MA');
        if (!phoneNumber.isValid()) {
            showMessageBox('Validation Error', 'Please enter a valid phone number.', true);
            return;
        }
        setLoadingState(elements.updateProfileBtn, true);
        await db.ref(`users/${currentUser.uid}`).update({
            name: elements.profileName.value.trim(),
            phone: phoneNumber.formatInternational()
        });
        showMessageBox('profile_success_title', 'profile_update_success');
    } catch (error) {
        showMessageBox('Validation Error', 'The phone number is not valid.', true);
    } finally {
        setLoadingState(elements.updateProfileBtn, false);
    }
};

// 3. ADDRESS MANAGEMENT & MODAL ACCESSIBILITY
const openAddressModal = (address = null, key = null) => {
    const lang = localStorage.getItem('lang') || 'en';
    const t = translations[lang];
    elements.addressForm.reset();
    editingAddressKey = key;
    elements.modalTitle.textContent = key ? t.modal_title_edit_address : t.modal_title_add_address;
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
        showMessageBox('Validation Error', 'Street and City are required.', true);
        setLoadingState(elements.saveAddressBtn, false);
        return;
    }
    try {
        const snapshot = await addressesRef.once('value');
        addressData.isDefault = !snapshot.exists();
        const promise = editingAddressKey ? addressesRef.child(editingAddressKey).update(addressData) : addressesRef.push(addressData);
        await promise;
        closeAddressModal();
    } catch (err) {
        showMessageBox('Error', 'Could not save address.', true);
    } finally {
        setLoadingState(elements.saveAddressBtn, false);
    }
};

const setDefaultAddress = async (key) => {
    const snapshot = await addressesRef.once('value');
    const updates = {};
    snapshot.forEach(child => { updates[child.key + '/isDefault'] = child.key === key; });
    await addressesRef.update(updates);
};

const deleteAddress = (key, isDefault) => {
    if (isDefault) {
        showMessageBox('Action Required', 'Cannot delete default address. Please set another address as default first.', true);
        return;
    }
    showConfirmModal('Delete Address', 'Are you sure you want to delete this address?', () => {
        addressesRef.child(key).remove();
    });
};

const createAddressCard = (address, key) => {
    const template = document.getElementById('address-card-template');
    const card = template.content.cloneNode(true);
    
    card.querySelector('.address-label').textContent = escapeHTML(address.label);
    card.querySelector('.address-street').textContent = escapeHTML(address.street);
    card.querySelector('.address-city').textContent = escapeHTML(address.city);
    card.querySelector('.address-phone').textContent = escapeHTML(address.phone);
    
    if (address.isDefault) {
        card.querySelector('.address-card').classList.add('default');
        const setDefaultBtn = card.querySelector('.set-default-btn');
        if (setDefaultBtn) setDefaultBtn.remove();
    }

    card.querySelector('.edit-btn').addEventListener('click', () => openAddressModal(address, key));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(key, address.isDefault));
    const setDefaultBtn = card.querySelector('.set-default-btn');
    if (setDefaultBtn) setDefaultBtn.addEventListener('click', () => setDefaultAddress(key));
    
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
    snapshot.forEach(child => {
        elements.addressesList.appendChild(createAddressCard(child.val(), child.key));
    });
};

// 4. PASSWORD CHANGE
const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoadingState(elements.updatePasswordBtn, true);
    const [current, newPass, confirm] = ['current-password', 'new-password', 'confirm-password'].map(id => document.getElementById(id).value);
    
    if (newPass !== confirm) {
        showMessageBox('Validation Error', 'password_update_mismatch', true);
        setLoadingState(elements.updatePasswordBtn, false);
        return;
    }
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, current);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPass);
        showMessageBox('Success', 'password_update_success');
        elements.changePasswordForm.reset();
    } catch (error) {
        showMessageBox('Error', error.code === 'auth/wrong-password' ? 'password_update_wrong_current' : 'password_update_error', true);
    } finally {
        setLoadingState(elements.updatePasswordBtn, false);
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
        setupPhoneValidation();
        addressesRef = db.ref(`users/${user.uid}/addresses`);
        elements.loadingState.classList.remove('hidden');
        addressesRef.on('value', renderAddresses, (error) => {
            elements.loadingState.classList.add('hidden');
            showMessageBox('Error', 'Could not load addresses.', true);
        });
    });

    // Event Listeners
    elements.profileForm.addEventListener('submit', handleUpdateProfile);
    elements.addNewAddressBtn.addEventListener('click', () => openAddressModal());
    elements.cancelBtn.addEventListener('click', closeAddressModal);
    elements.addressForm.addEventListener('submit', handleSaveAddress);
    elements.changePasswordForm.addEventListener('submit', handleChangePassword);
    
    // Modal Accessibility
    elements.addressModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAddressModal();
        if (e.key === 'Tab') {
            const focusable = elements.addressModalContent.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                last.focus();
                e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    });
});