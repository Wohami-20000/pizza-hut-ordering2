// profile.js - Enhanced with new features and feedback messages

const auth = firebase.auth();
const db = firebase.database();

// --- Element Cache ---
const elements = {
    messageBox: document.getElementById('custom-message-box'),
    messageBoxIcon: document.getElementById('message-box-icon'),
    messageBoxTitle: document.getElementById('message-box-title'),
    messageBoxText: document.getElementById('message-box-text'),
    messageBoxOkBtn: document.getElementById('message-box-ok-btn'),
    
    personalInfoContent: document.getElementById('personal-info'),
    addressesContent: document.getElementById('addresses'),
    settingsContent: document.getElementById('settings'),

    addressModal: document.getElementById('address-modal'),
    addressModalTitle: document.getElementById('address-modal-title'),
    addressForm: document.getElementById('address-form'),
    addressIdInput: document.getElementById('address-id'),
    addressLabelInput: document.getElementById('address-label'),
    addressStreetInput: document.getElementById('address-street'),
    addressCityInput: document.getElementById('address-city'),
    addressPhoneInput: document.getElementById('address-phone'),
    cancelAddressModalBtn: document.getElementById('cancel-address-modal'),
};

// --- State ---
let currentUser = null;
let phoneInputInstance = null;
let originalEmail = '';
let userAddresses = {};

// --- Utility & UI Functions ---
const showMessageBox = (title, message, isError = false) => {
    elements.messageBoxTitle.textContent = title;
    elements.messageBoxText.textContent = message;
    
    if (isError) {
        elements.messageBoxIcon.className = 'fas fa-times-circle text-5xl mb-4 text-red-500';
    } else {
        elements.messageBoxIcon.className = 'fas fa-check-circle text-5xl mb-4 text-green-500';
    }

    elements.messageBox.classList.add('visible');
};

const hideMessageBox = () => {
    elements.messageBox.classList.remove('visible');
};

const setLoadingState = (button, isLoading) => {
    if (!button) return;
    button.disabled = isLoading;
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        if (btnText) btnText.style.visibility = 'hidden';
        if (spinner) spinner.style.display = 'inline-block';
    } else {
        if (btnText) btnText.style.visibility = 'visible';
        if (spinner) spinner.style.display = 'none';
    }
};

// --- RENDER FUNCTIONS FOR EACH TAB ---

function renderPersonalInfo(userProfile) {
    elements.personalInfoContent.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <form id="profile-form" class="space-y-6">
                <div>
                    <div class="flex justify-between items-center">
                        <label class="block text-sm font-medium text-gray-700">Email Address</label>
                        <span id="email-verification-status" class="email-status"></span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                       <input type="email" id="profile-email" class="block w-full p-3 border border-gray-300 rounded-lg bg-gray-100 transition" readonly />
                       <button type="button" id="change-email-btn" class="px-4 py-3 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">Change</button>
                       <button type="button" id="save-email-btn" class="hidden px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">Save</button>
                       <button type="button" id="cancel-email-btn" class="hidden px-4 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">Cancel</button>
                    </div>
                    <button type="button" id="verify-email-btn" class="hidden text-sm text-blue-600 hover:underline mt-1">Send verification email</button>
                    <p id="profile-email-error" class="error-message"></p>
                </div>
                <div>
                    <label for="profile-name" class="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="profile-name" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500 transition" required />
                    <p id="profile-name-error" class="error-message"></p>
                </div>
                <div>
                    <label for="profile-phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="tel" id="profile-phone" class="mt-1 block w-full p-3 border-gray-300 rounded-lg transition" />
                    <p id="profile-phone-error" class="error-message"></p>
                </div>
                <button type="submit" id="update-profile-btn" class="w-full bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg px-6 py-3 shadow-md transition flex items-center justify-center relative transform hover:scale-105">
                    <span class="btn-text">Update Profile</span>
                    <div class="spinner absolute hidden" style="border-width: 3px; border-color: rgba(255,255,255,0.3); border-top-color: #fff;"></div>
                </button>
            </form>
        </div>
    `;

    // Re-attach event listeners after rendering
    document.getElementById('profile-form').addEventListener('submit', handleUpdateProfile);
    document.getElementById('change-email-btn').addEventListener('click', () => toggleEmailEditMode(true));
    document.getElementById('cancel-email-btn').addEventListener('click', () => toggleEmailEditMode(false));
    document.getElementById('save-email-btn').addEventListener('click', handleSaveEmail);
    document.getElementById('verify-email-btn').addEventListener('click', handleSendVerificationEmail);
    
    // Populate form fields
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-name').value = userProfile.name || '';
    
    // Initialize and set phone number
    initializePhoneInput();
    if (userProfile.phone && phoneInputInstance) {
        phoneInputInstance.setNumber(userProfile.phone);
    }
}

function renderAddresses() {
    elements.addressesContent.innerHTML = ''; // Clear previous content
    const addressesList = document.createElement('div');
    addressesList.className = 'space-y-4';

    if (Object.keys(userAddresses).length === 0) {
        addressesList.innerHTML = `
            <div class="text-center p-8 border-2 border-dashed rounded-xl bg-white">
                <i class="fas fa-map-signs text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-500 font-semibold">You haven't saved any addresses yet.</p>
                <p class="text-sm text-gray-400 mt-1">Add an address for faster checkout!</p>
            </div>
        `;
    } else {
        for (const addressId in userAddresses) {
            const address = userAddresses[addressId];
            const addressCard = document.createElement('div');
            addressCard.className = 'p-4 bg-white rounded-xl shadow-lg flex justify-between items-center transition hover:shadow-xl';
            addressCard.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="bg-gray-100 rounded-full h-10 w-10 flex items-center justify-center">
                        <i class="fas ${address.label.toLowerCase() === 'work' ? 'fa-briefcase' : 'fa-home'} text-gray-500"></i>
                    </div>
                    <div>
                        <p class="font-bold text-lg text-gray-800">${address.label}</p>
                        <p class="text-gray-600">${address.street}, ${address.city}</p>
                        <p class="text-sm text-gray-500">${address.phone}</p>
                    </div>
                </div>
                <div>
                    <button class="edit-address-btn text-blue-500 hover:text-blue-700 p-2" data-id="${addressId}"><i class="fas fa-edit"></i></button>
                    <button class="remove-address-btn text-red-500 hover:text-red-700 p-2" data-id="${addressId}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            addressesList.appendChild(addressCard);
        }
    }
    elements.addressesContent.appendChild(addressesList);

    const addAddressButton = document.createElement('button');
    addAddressButton.id = 'add-address-btn';
    addAddressButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Add New Address';
    addAddressButton.className = 'mt-6 w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-bold transition transform hover:scale-105';
    elements.addressesContent.appendChild(addAddressButton);

    addAddressButton.addEventListener('click', () => showAddressModal());
    document.querySelectorAll('.edit-address-btn').forEach(button => button.addEventListener('click', (e) => {
        const addressId = e.currentTarget.dataset.id;
        showAddressModal(addressId, userAddresses[addressId]);
    }));
    document.querySelectorAll('.remove-address-btn').forEach(button => button.addEventListener('click', (e) => {
        const addressId = e.currentTarget.dataset.id;
        if (confirm('Are you sure you want to remove this address?')) {
            removeAddress(addressId);
        }
    }));
}

function renderSettings() {
    elements.settingsContent.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Quick Links</h3>
                <div class="space-y-2">
                    <a href="my-orders.html" class="flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                        <span class="font-semibold text-gray-700">My Orders</span>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </a>
                </div>
            </div>
    
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Change Password</h3>
                <form id="change-password-form" class="space-y-4">
                    <div>
                        <label for="current-password" class="block text-sm font-medium text-gray-700">Current Password</label>
                        <input type="password" id="current-password" required class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label for="new-password" class="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" id="new-password" required class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label for="confirm-new-password" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" id="confirm-new-password" required class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                    </div>
                    <p id="password-change-message" class="text-sm h-5"></p>
                    <button type="submit" id="update-password-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-6 py-3 transition">Update Password</button>
                </form>
                <div class="text-center mt-4">
                    <a href="#" id="settings-forgot-password" class="text-sm text-blue-600 hover:underline">Forgot Password?</a>
                </div>
            </div>
    
            <div class="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
                <h3 class="text-xl font-bold text-red-700 mb-4">Danger Zone</h3>
                <p class="text-gray-600 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                <a href="delete-account.html" class="w-full block text-center bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg px-6 py-3 transition">Delete My Account</a>
            </div>
        </div>
    `;

    document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
    document.getElementById('settings-forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });
}


// --- Main Application Logic ---
const loadProfileInfo = async (user) => {
    originalEmail = user.email;

    const snapshot = await db.ref(`users/${user.uid}`).once('value');
    const userProfile = snapshot.val() || {};
    userAddresses = userProfile.addresses || {};
    
    // Render the initial active tab
    renderPersonalInfo(userProfile);
    renderAddresses();
    renderSettings();

    // Set email verification status after rendering personal info
    const emailStatusEl = document.getElementById('email-verification-status');
    const verifyBtnEl = document.getElementById('verify-email-btn');
    if (user.emailVerified) {
        emailStatusEl.textContent = 'Verified';
        emailStatusEl.className = 'email-status verified';
        verifyBtnEl.classList.add('hidden');
    } else {
        emailStatusEl.textContent = 'Not Verified';
        emailStatusEl.className = 'email-status unverified';
        verifyBtnEl.classList.remove('hidden');
    }
};

const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const updateBtn = document.getElementById('update-profile-btn');
    setLoadingState(updateBtn, true);

    const name = document.getElementById('profile-name').value.trim();
    if (!name) {
        document.getElementById('profile-name-error').textContent = 'Full Name cannot be empty.';
        setLoadingState(updateBtn, false);
        return;
    }

    if (phoneInputInstance && !phoneInputInstance.isValidNumber()) {
        document.getElementById('profile-phone-error').textContent = 'The phone number is not valid.';
        setLoadingState(updateBtn, false);
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
        showMessageBox('Error', 'An error occurred while updating your profile.', true);
        console.error("Profile update error:", error);
    } finally {
        setLoadingState(updateBtn, false);
    }
};

// --- Email Functions ---
const toggleEmailEditMode = (isEditing) => {
    document.getElementById('profile-email').readOnly = !isEditing;
    document.getElementById('change-email-btn').classList.toggle('hidden', isEditing);
    document.getElementById('save-email-btn').classList.toggle('hidden', !isEditing);
    document.getElementById('cancel-email-btn').classList.toggle('hidden', !isEditing);
    if (isEditing) {
        document.getElementById('profile-email').classList.remove('bg-gray-100');
        document.getElementById('profile-email').focus();
    } else {
        document.getElementById('profile-email').classList.add('bg-gray-100');
        document.getElementById('profile-email').value = originalEmail;
    }
};

const handleSaveEmail = () => {
    const newEmail = document.getElementById('profile-email').value.trim();
    if (newEmail === originalEmail) {
        toggleEmailEditMode(false);
        return;
    }

    const password = prompt("For your security, please enter your current password to change your email:");
    if (!password) return;

    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
    const saveBtn = document.getElementById('save-email-btn');
    setLoadingState(saveBtn, true);

    currentUser.reauthenticateWithCredential(credential).then(() => {
        return currentUser.updateEmail(newEmail);
    }).then(() => {
        return db.ref(`users/${currentUser.uid}`).update({ email: newEmail });
    }).then(() => {
        showMessageBox('Success!', 'Your email has been updated. A verification link has been sent to your new address.');
        originalEmail = newEmail;
        toggleEmailEditMode(false);
        loadProfileInfo(auth.currentUser);
    }).catch(error => {
        showMessageBox('Error', `Failed to update email. ${error.message}`, true);
        toggleEmailEditMode(false);
    }).finally(() => {
        setLoadingState(saveBtn, false);
    });
};

const handleSendVerificationEmail = () => {
    const verifyBtn = document.getElementById('verify-email-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Sending...';

    currentUser.sendEmailVerification()
        .then(() => showMessageBox('Email Sent', 'A verification link has been sent. Please check your inbox.'))
        .catch(error => showMessageBox('Error', `Failed to send verification email: ${error.message}`, true))
        .finally(() => {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Send verification email';
        });
};

const handleForgotPassword = () => {
    if (confirm("Are you sure you want to send a password reset link to your email?")) {
        auth.sendPasswordResetEmail(currentUser.email)
            .then(() => showMessageBox('Link Sent', 'A password reset link has been sent to your email.'))
            .catch(error => showMessageBox('Error', `Failed to send reset link: ${error.message}`, true));
    }
};

// --- Address Functions ---
const showAddressModal = (addressId = null, address = {}) => {
    elements.addressModalTitle.textContent = addressId ? 'Edit Address' : 'Add Address';
    elements.addressIdInput.value = addressId || '';
    elements.addressLabelInput.value = address.label || '';
    elements.addressStreetInput.value = address.street || '';
    elements.addressPhoneInput.value = address.phone || '';
    elements.addressModal.classList.add('visible');
};

const closeAddressModal = () => {
    elements.addressModal.classList.remove('visible');
};

const saveAddress = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const addressId = elements.addressIdInput.value;
    const addressData = {
        label: elements.addressLabelInput.value,
        street: elements.addressStreetInput.value,
        city: elements.addressCityInput.value,
        phone: elements.addressPhoneInput.value,
    };

    const addressRef = addressId
        ? db.ref(`users/${currentUser.uid}/addresses/${addressId}`)
        : db.ref(`users/${currentUser.uid}/addresses`).push();

    try {
        await addressRef.set(addressData);
        closeAddressModal();
        userAddresses = (await db.ref(`users/${currentUser.uid}/addresses`).once('value')).val() || {};
        renderAddresses();
        showMessageBox('Success!', 'Address saved successfully.');
    } catch (error) {
        showMessageBox('Error', 'Failed to save address.', true);
    }
};

const removeAddress = async (addressId) => {
    if (!currentUser) return;
    try {
        await db.ref(`users/${currentUser.uid}/addresses/${addressId}`).remove();
        userAddresses = (await db.ref(`users/${currentUser.uid}/addresses`).once('value')).val() || {};
        renderAddresses();
        showMessageBox('Success!', 'Address removed.');
    } catch(error) {
        showMessageBox('Error', 'Failed to remove address.', true);
    }
};

// --- Settings Functions ---
const handleChangePassword = async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const messageEl = document.getElementById('password-change-message');

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
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPassword);
        
        messageEl.textContent = "Password updated successfully!";
        messageEl.className = 'text-sm h-5 text-green-600';
        document.getElementById('change-password-form').reset();
    } catch (error) {
        console.error("Password change error:", error);
        messageEl.textContent = error.code === 'auth/wrong-password' ? "Incorrect current password." : "An error occurred.";
        messageEl.className = 'text-sm h-5 text-red-600';
    }
};

const initializePhoneInput = () => {
    const phoneInputEl = document.getElementById('profile-phone');
    if (!phoneInputEl) return;
    phoneInputInstance = window.intlTelInput(phoneInputEl, {
        initialCountry: "auto",
        geoIpLookup: cb => fetch("https://ipapi.co/json").then(r => r.json()).then(d => cb(d.country_code)).catch(() => cb("us")),
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
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
        loadProfileInfo(user);
    });

    // Event Listeners
    elements.messageBoxOkBtn.addEventListener('click', hideMessageBox);
    elements.addressForm.addEventListener('submit', saveAddress);
    elements.cancelAddressModalBtn.addEventListener('click', closeAddressModal);
    
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