// auth.js - Final Corrected Version
document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Firebase Services ---
    const auth = firebase.auth();
    const db = firebase.database();

    // --- Cache UI Elements ---
    const elements = {
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        showSignupBtn: document.getElementById('show-signup'),
        showLoginBtn: document.getElementById('show-login'),
        forgotPasswordModal: document.getElementById('forgot-password-modal'),
        loginCtaBtn: document.getElementById('login-cta-btn'),
        signupCtaBtn: document.getElementById('signup-cta-btn'),
        authTitle: document.getElementById('auth-title'),
        authSubtext: document.getElementById('auth-subtext'),
        loginEmailInput: document.getElementById('login-email'),
        loginPasswordInput: document.getElementById('login-password'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        rememberMeCheckbox: document.getElementById('remember-me'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        loginErrorMessage: document.getElementById('login-error-message'),
        signupErrorMessage: document.getElementById('signup-error-message'),
        googleSigninBtn: document.getElementById('google-signin-btn'),
        resetErrorMessage: document.getElementById('reset-error-message'),
        resetSuccessMessage: document.getElementById('reset-success-message'),
        signupNameError: document.getElementById('signup-name-error'),
        signupEmailError: document.getElementById('signup-email-error'),
        signupPhoneError: document.getElementById('signup-phone-error'),
        signupPasswordError: document.getElementById('signup-password-error'),
        resetEmailInput: document.getElementById('reset-email'),
        sendResetLinkBtn: document.getElementById('send-reset-link-btn'),
        logoutBtn: document.getElementById('logout-btn')
    };

    // --- Handle Redirect Result from Google Sign-In ---
    auth.getRedirectResult()
        .then((result) => {
            if (result.user) {
                // This means the user has successfully signed in via redirect.
                handleSuccessfulLogin(result.user);
            }
        }).catch((error) => {
            // Handle Errors here.
            handleAuthError(error, 'login');
        });


    // --- UI & Utility Functions ---
    const displayError = (element, message) => {
        element.textContent = message;
    };

    const clearErrors = () => {
        Object.values(elements).forEach(el => {
            if (el && el.classList && el.classList.contains('error-message')) {
                el.textContent = '';
            }
        });
    };

    const setLoading = (button, isLoading, loadingText) => {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        const originalText = button.id === 'login-cta-btn' ? '→ Log In & Order Now' : '→ Create Account';

        button.disabled = isLoading;
        if (isLoading) {
            btnText.textContent = loadingText;
            spinner.classList.remove('hidden');
        } else {
            btnText.textContent = originalText;
            spinner.classList.add('hidden');
        }
    };

    // --- Form Switching Logic ---
    function switchForms(showForm, hideForm) {
        if (!hideForm.classList.contains('hidden-form')) hideForm.classList.add('hidden-form');
        clearErrors();

        if (showForm.id === 'signup-form') {
            elements.authTitle.textContent = "🎉 Join the Pizza Party!";
            elements.authSubtext.textContent = "Sign up & get 20% OFF your first order.";
        } else {
            elements.authTitle.textContent = "🍕 Welcome Back!";
            elements.authSubtext.textContent = "Log in to get your favorites delivered hot & fast.";
        }
        setTimeout(() => showForm.classList.remove('hidden-form'), 50);
    }

    // --- Password Input Custom Element ---
    class PasswordInput extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({
                mode: 'open'
            });
            this.shadowRoot.innerHTML = `
                <style>
                    .password-group { display: flex; flex-direction: column; gap: 0.75rem; }
                    .password-wrapper { position: relative; }
                    input[type="password"], input[type="text"] {
                        width: 100%;
                        padding: 0.75rem;
                        padding-right: 2.5rem; /* Space for the icon */
                        background-color: #F9FAFB; /* bg-gray-50 */
                        border: 1px solid #D1D5DB; /* border-gray-300 */
                        border-radius: 0.5rem; /* rounded-lg */
                        color: #231F20; /* brand-dark */
                        transition: border-color 0.2s, box-shadow 0.2s;
                        box-sizing: border-box; /* Important for padding */
                    }
                    input[type="password"]:focus, input[type="text"]:focus {
                        outline: none;
                        border-color: #FFC72C; /* brand-yellow */
                        box-shadow: 0 0 0 2px rgba(255, 199, 44, 0.5);
                    }
                    .toggle-password {
                        position: absolute;
                        top: 50%;
                        right: 0.75rem;
                        transform: translateY(-50%);
                        cursor: pointer;
                        color: #9ca3af;
                    }
                    .strength-meter {
                        height: 6px;
                        width: 100%;
                        background-color: #e5e7eb;
                        border-radius: 3px;
                        overflow: hidden;
                        margin-top: 2px;
                    }
                    .strength-bar {
                        height: 100%;
                        width: 0%;
                        background-color: #ef4444; /* red-500 */
                        transition: width 0.3s, background-color 0.3s;
                    }
                    .strength-text {
                        font-size: 0.75rem;
                        text-align: right;
                        min-height: 1rem;
                    }
                    .error-message {
                        color: #dc2626; /* red-600 */
                        font-size: 0.875rem;
                        min-height: 1rem;
                        display: none; /* Hidden by default */
                    }
                    .error-message.visible {
                        display: block;
                    }
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
                <div class="password-group">
                    <div class="password-wrapper">
                        <input type="password" id="password" required placeholder="Password"/>
                        <i class="fas fa-eye toggle-password" data-target="password"></i>
                    </div>
                    <div class="strength-meter"><div class="strength-bar"></div></div>
                    <p class="strength-text"></p>
                    <div class="password-wrapper">
                        <input type="password" id="confirm-password" required placeholder="Confirm Password"/>
                        <i class="fas fa-eye toggle-password" data-target="confirm-password"></i>
                    </div>
                    <p id="password-error" class="error-message">Passwords do not match.</p>
                </div>
            `;
            this.passwordInput = this.shadowRoot.getElementById('password');
            this.confirmPasswordInput = this.shadowRoot.getElementById('confirm-password');
            this.passwordError = this.shadowRoot.getElementById('password-error');
            this.strengthBar = this.shadowRoot.querySelector('.strength-bar');
            this.strengthText = this.shadowRoot.querySelector('.strength-text');

            this.passwordInput.addEventListener('input', () => {
                this.validatePasswords();
                this.checkStrength();
            });
            this.confirmPasswordInput.addEventListener('input', () => this.validatePasswords());
            this.shadowRoot.querySelectorAll('.toggle-password').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const targetInput = this.shadowRoot.getElementById(toggle.dataset.target);
                    const isPassword = targetInput.type === 'password';
                    targetInput.type = isPassword ? 'text' : 'password';
                    toggle.classList.toggle('fa-eye', !isPassword);
                    toggle.classList.toggle('fa-eye-slash', isPassword);
                });
            });
        }
        checkStrength() {
            const pass = this.passwordInput.value;
            let score = 0;
            if (pass.length >= 8) score++;
            if (/[A-Z]/.test(pass)) score++;
            if (/[0-9]/.test(pass)) score++;
            if (/[^A-Za-z0-9]/.test(pass)) score++;
            const strengthLevels = {
                1: {
                    width: '33.33%',
                    color: '#ef4444',
                    text: "Weak"
                },
                2: {
                    width: '33.33%',
                    color: '#ef4444',
                    text: "Weak"
                },
                3: {
                    width: '66.66%',
                    color: '#f59e0b',
                    text: "Medium"
                },
                4: {
                    width: '100%',
                    color: '#22c55e',
                    text: "Strong"
                }
            };
            if (pass.length === 0) {
                this.strengthBar.style.width = '0%';
                this.strengthText.textContent = '';
                return;
            }
            const level = strengthLevels[score] || {
                width: '10%',
                color: '#ef4444',
                text: "Weak"
            };
            this.strengthBar.style.width = level.width;
            this.strengthBar.style.backgroundColor = level.color;
            this.strengthText.textContent = level.text;
            this.strengthText.style.color = level.color;
        }
        validatePasswords() {
            const match = this.passwordInput.value === this.confirmPasswordInput.value;
            this.passwordError.classList.toggle('visible', !match && this.confirmPasswordInput.value.length > 0);
            return match;
        }
        get password() {
            return this.passwordInput.value;
        }
        checkValidity() {
            return this.passwordInput.checkValidity() && this.confirmPasswordInput.checkValidity() && this.validatePasswords();
        }
    }
    if (!customElements.get('password-input')) {
        customElements.define('password-input', PasswordInput);
    }

    const phoneInput = document.querySelector("#signup-phone");
    const iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        initialCountry: "auto",
    });

    // --- Core Authentication Logic ---
    const redirectToPreviousPage = () => {
        const redirectUrl = sessionStorage.getItem('redirectUrl');
        sessionStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl || 'order-type-selection.html';
    };

    const handleSuccessfulLogin = (user) => {
        user.getIdTokenResult().then((idTokenResult) => {
            const userRef = db.ref('users/' + user.uid);
            userRef.once('value').then(snapshot => {
                const userUpdate = {
                    lastLogin: new Date().toISOString()
                };
                if (!snapshot.exists()) {
                    userUpdate.email = user.email;
                    userUpdate.name = user.displayName || 'New User';
                }
                userRef.update(userUpdate);
            });
            if (idTokenResult.claims.admin === true) {
                window.location.href = 'admin.html';
            } else {
                redirectToPreviousPage();
            }
        });
    };

    const handleAuthError = (error, form) => {
        let errorElement = form === 'login' ? elements.loginErrorMessage : elements.signupErrorMessage;
        let errorMessage = "An unexpected error occurred.";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                errorMessage = "No account found with this email.";
                break;
            case 'auth/wrong-password':
                errorMessage = "Incorrect password.";
                break;
            case 'auth/invalid-email':
                errorElement = form === 'login' ? elements.loginEmailError : elements.signupEmailError;
                errorMessage = "Please enter a valid email address.";
                break;
            case 'auth/weak-password':
                errorElement = elements.signupPasswordError;
                errorMessage = "Password should be at least 6 characters.";
                break;
            case 'auth/email-already-in-use':
                errorElement = elements.signupEmailError;
                errorMessage = "This email address is already in use.";
                break;
        }
        displayError(errorElement, errorMessage);
    };

    const handleLogout = () => {
        const user = auth.currentUser;
        if (user) {
            localStorage.removeItem(`ordersCache_${user.uid}`);
        }
        auth.signOut().then(() => {
            localStorage.removeItem('statusConfig');
            localStorage.removeItem('cart');
            localStorage.removeItem('appliedPromo');
            localStorage.removeItem('favorites');
            sessionStorage.clear();
            window.location.href = 'auth.html';
        }).catch((error) => {
            console.error("Logout Error:", error);
            alert("Failed to log out. Please try again.");
        });
    };

    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        setLoading(elements.loginCtaBtn, true, 'Logging in...');
        try {
            const persistence = elements.rememberMeCheckbox.checked ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
            await auth.setPersistence(persistence);
            const userCredential = await auth.signInWithEmailAndPassword(elements.loginEmailInput.value, elements.loginPasswordInput.value);
            handleSuccessfulLogin(userCredential.user);
        } catch (error) {
            handleAuthError(error, 'login');
        } finally {
            setLoading(elements.loginCtaBtn, false);
        }
    });

    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = iti.getNumber();
        const passwordInputComponent = elements.signupForm.querySelector('password-input');
        let isValid = true;
        if (!name) {
            displayError(elements.signupNameError, 'This field is required.');
            isValid = false;
        }
        if (!email) {
            displayError(elements.signupEmailError, 'This field is required.');
            isValid = false;
        }
        if (!phone) {
            displayError(elements.signupPhoneError, 'This field is required.');
            isValid = false;
        }
        if (!passwordInputComponent.password) {
            displayError(elements.signupPasswordError, 'This field is required.');
            isValid = false;
        }
        if (!passwordInputComponent.checkValidity()) {
            displayError(elements.signupPasswordError, 'Passwords do not match or are invalid.');
            isValid = false;
        }
        if (phone && !iti.isValidNumber()) {
            displayError(elements.signupPhoneError, 'Invalid phone number.');
            isValid = false;
        }
        if (!document.getElementById('terms-checkbox').checked) {
            displayError(elements.signupErrorMessage, 'You must agree to the terms.');
            isValid = false;
        }
        if (!isValid) return;
        setLoading(elements.signupCtaBtn, true, 'Creating Account...');
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, passwordInputComponent.password);
            const user = userCredential.user;
            await user.sendEmailVerification();
            await db.ref('users/' + user.uid).set({
                email: email,
                name: name,
                phone: phone,
                createdAt: new Date().toISOString()
            });
            await db.ref(`users/${user.uid}/availableOffers/WELCOME20`).set(true);
            alert("Verification email sent. Please check your inbox.");
            handleSuccessfulLogin(user);
        } catch (error) {
            handleAuthError(error, 'signup');
        } finally {
            setLoading(elements.signupCtaBtn, false);
        }
    });

    elements.googleSigninBtn.addEventListener('click', async () => {
        try {
            // This will redirect the user to the Google sign-in page
            await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        } catch (error) {
            handleAuthError(error, 'login');
        }
    });


    elements.forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        elements.forgotPasswordModal.classList.remove('hidden');
        elements.resetErrorMessage.textContent = '';
        elements.resetSuccessMessage.textContent = '';
    });

    elements.closeModalBtn.addEventListener('click', () => elements.forgotPasswordModal.classList.add('hidden'));

    elements.sendResetLinkBtn.addEventListener('click', async () => {
        const email = elements.resetEmailInput.value;
        if (!email) {
            displayError(elements.resetErrorMessage, 'Please enter a valid email address.');
            return;
        }
        clearErrors();
        try {
            await auth.sendPasswordResetEmail(email);
            elements.resetSuccessMessage.textContent = 'Password reset link sent!';
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                displayError(elements.resetErrorMessage, 'No account found with this email.');
            } else {
                handleAuthError(error);
            }
        }
    });

    elements.showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchForms(elements.signupForm, elements.loginForm);
    });
    elements.showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchForms(elements.loginForm, elements.signupForm);
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        switchForms(elements.signupForm, elements.loginForm);
    }

    const referrer = document.referrer;
    if (referrer && !referrer.includes('auth.html')) {
        sessionStorage.setItem('redirectUrl', referrer);
    }
});