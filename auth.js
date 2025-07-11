// auth.js - RECODED AND CORRECTED

document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Services ---
    const auth = firebase.auth();
    const db = firebase.database();

    // --- Element Cache ---
    const elements = {
        // Forms
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        // Buttons
        showSignupBtn: document.getElementById('show-signup'),
        showLoginBtn: document.getElementById('show-login'),
        loginCtaBtn: document.getElementById('login-cta-btn'),
        signupCtaBtn: document.getElementById('signup-cta-btn'),
        googleSigninBtn: document.getElementById('google-signin-btn'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        sendResetLinkBtn: document.getElementById('send-reset-link-btn'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        // Inputs
        loginEmailInput: document.getElementById('login-email'),
        loginPasswordInput: document.getElementById('login-password'),
        rememberMeCheckbox: document.getElementById('remember-me'),
        signupNameInput: document.getElementById('signup-name'),
        signupEmailInput: document.getElementById('signup-email'),
        signupPhoneInput: document.getElementById('signup-phone'),
        termsCheckbox: document.getElementById('terms-checkbox'),
        resetEmailInput: document.getElementById('reset-email'),
        // UI Text & Modals
        authTitle: document.getElementById('auth-title'),
        authSubtext: document.getElementById('auth-subtext'),
        forgotPasswordModal: document.getElementById('forgot-password-modal'),
        // Error Message Paragraphs
        errorMessages: document.querySelectorAll('.error-message')
    };

    // Initialize International Telephone Input
    const iti = window.intlTelInput(elements.signupPhoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        initialCountry: "auto",
        geoIpLookup: cb => {
            fetch("https://ipapi.co/json").then(res => res.json()).then(data => cb(data.country_code)).catch(() => cb("us"));
        }
    });

    // --- UI HELPER FUNCTIONS ---

    const setLoading = (button, isLoading, text) => {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        button.disabled = isLoading;
        if (isLoading) {
            btnText.textContent = text;
            spinner.classList.remove('hidden');
        } else {
            // Restore original text
            btnText.textContent = button.id === 'login-cta-btn' ? '→ Log In & Order Now' : '→ Create Account';
            spinner.classList.add('hidden');
        }
    };

    const displayError = (elementId, message) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = message;
    };

    const clearErrors = () => {
        elements.errorMessages.forEach(el => el.textContent = '');
    };

    // --- FORM SWITCHING ---

    const switchForms = (showForm) => {
        clearErrors();
        const isLogin = showForm === 'login';
        elements.loginForm.classList.toggle('hidden-form', !isLogin);
        elements.signupForm.classList.toggle('hidden-form', isLogin);
        elements.authTitle.textContent = isLogin ? "🍕 Welcome Back!" : "🎉 Join the Pizza Party!";
        elements.authSubtext.textContent = isLogin ? "Log in to get your favorites delivered hot & fast." : "Sign up & get 20% OFF your first order.";
    };

    // --- !! IMPORTANT: PASSWORD INPUT CUSTOM ELEMENT (This was missing) !! ---

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
                1: { width: '25%', color: '#ef4444', text: "Weak" },
                2: { width: '50%', color: '#f97316', text: "Medium" },
                3: { width: '75%', color: '#f59e0b', text: "Good" },
                4: { width: '100%', color: '#22c55e', text: "Strong" }
            };
            if (pass.length === 0) {
                this.strengthBar.style.width = '0%';
                this.strengthText.textContent = '';
                return;
            }
            const level = strengthLevels[score] || { width: '10%', color: '#ef4444', text: "Very Weak" };
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
    }
    if (!customElements.get('password-input')) {
        customElements.define('password-input', PasswordInput);
    }
    
    // --- CORE AUTHENTICATION LOGIC ---

    const handleSuccessfulLogin = (user) => {
        console.log("Login successful for user:", user.uid);
        const userRef = db.ref(`users/${user.uid}`);
        userRef.update({ lastLogin: new Date().toISOString() });

        user.getIdTokenResult().then(idTokenResult => {
            if (idTokenResult.claims.admin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'order-type-selection.html';
            }
        });
    };

    const handleAuthError = (error, formType) => {
        console.error(`Auth Error (${formType}):`, error);
        let message = 'An unexpected error occurred. Please try again.';
        let emailErrorId = `${formType}-email-error`;
        let passwordErrorId = `${formType}-password-error`;
        let generalErrorId = `${formType}-error-message`;

        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                 message = "Incorrect email or password.";
                 displayError(generalErrorId, message);
                 break;
            case 'auth/wrong-password':
                displayError(passwordErrorId, 'Incorrect password.');
                break;
            case 'auth/invalid-email':
                displayError(emailErrorId, 'Please enter a valid email address.');
                break;
            case 'auth/weak-password':
                displayError(passwordErrorId, 'Password must be at least 6 characters.');
                break;
            case 'auth/email-already-in-use':
                displayError(emailErrorId, 'This email is already registered.');
                break;
            case 'auth/popup-closed-by-user':
                message = 'Sign-in window closed. Please try again.';
                displayError(generalErrorId, message);
                break;
            default:
                displayError(generalErrorId, message);
                break;
        }
    };

    // --- EVENT LISTENERS ---

    elements.showSignupBtn.addEventListener('click', () => switchForms('signup'));
    elements.showLoginBtn.addEventListener('click', () => switchForms('login'));

    elements.googleSigninBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(result => {
                const user = result.user;
                const userRef = db.ref('users/' + user.uid);
                userRef.once('value', snapshot => {
                    if (!snapshot.exists()) {
                        userRef.set({
                            email: user.email,
                            name: user.displayName,
                            createdAt: new Date().toISOString()
                        });
                    }
                });
                handleSuccessfulLogin(user);
            })
            .catch(error => handleAuthError(error, 'login'));
    });

    elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors();
        setLoading(elements.loginCtaBtn, true, 'Logging In...');
        const email = elements.loginEmailInput.value;
        const password = elements.loginPasswordInput.value;
        const persistence = elements.rememberMeCheckbox.checked ?
            firebase.auth.Auth.Persistence.LOCAL :
            firebase.auth.Auth.Persistence.SESSION;

        auth.setPersistence(persistence)
            .then(() => auth.signInWithEmailAndPassword(email, password))
            .then(userCredential => handleSuccessfulLogin(userCredential.user))
            .catch(error => handleAuthError(error, 'login'))
            .finally(() => setLoading(elements.loginCtaBtn, false));
    });

    elements.signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors();

        const name = elements.signupNameInput.value.trim();
        const email = elements.signupEmailInput.value.trim();
        const phone = iti.isValidNumber() ? iti.getNumber() : "";
        const passwordInput = elements.signupForm.querySelector('password-input');
        const password = passwordInput.password;

        if (!name) return displayError('signup-name-error', 'Name is required.');
        if (!passwordInput.validatePasswords()) return displayError('signup-password-error', 'Passwords do not match.');
        if (password.length < 6) return displayError('signup-password-error', 'Password must be at least 6 characters.');
        if (!elements.termsCheckbox.checked) return displayError('signup-error-message', 'You must agree to the terms.');

        setLoading(elements.signupCtaBtn, true, 'Creating Account...');
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return db.ref('users/' + user.uid).set({
                    name: name,
                    email: email,
                    phone: phone,
                    createdAt: new Date().toISOString()
                }).then(() => {
                    user.sendEmailVerification();
                    handleSuccessfulLogin(user);
                });
            })
            .catch(error => handleAuthError(error, 'signup'))
            .finally(() => setLoading(elements.signupCtaBtn, false));
    });

    elements.forgotPasswordLink.addEventListener('click', () => elements.forgotPasswordModal.classList.remove('hidden'));
    elements.closeModalBtn.addEventListener('click', () => elements.forgotPasswordModal.classList.add('hidden'));
    elements.sendResetLinkBtn.addEventListener('click', () => {
        const email = elements.resetEmailInput.value;
        const errorEl = document.getElementById('reset-error-message');
        const successEl = document.getElementById('reset-success-message');
        errorEl.textContent = '';
        successEl.textContent = '';

        if (!email) {
            errorEl.textContent = 'Please enter your email.';
            return;
        }

        auth.sendPasswordResetEmail(email)
            .then(() => {
                successEl.textContent = 'Password reset link sent! Check your inbox.';
            })
            .catch(error => {
                errorEl.textContent = error.code === 'auth/user-not-found' ? 'No account found with this email.' : 'An error occurred.';
            });
    });

    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetInput = document.getElementById(toggle.dataset.target);
            if (!targetInput) return;
            const isPassword = targetInput.type === 'password';
            targetInput.type = isPassword ? 'text' : 'password';
            toggle.classList.toggle('fa-eye', !isPassword);
            toggle.classList.toggle('fa-eye-slash', isPassword);
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        switchForms('signup');
    }
});