// auth.js - Refactored and Improved Version
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
        languageSwitcher: document.getElementById('language-switcher'),
        forgotPasswordModal: document.getElementById('forgot-password-modal'),
        loginCtaBtn: document.getElementById('login-cta-btn'),
        signupCtaBtn: document.getElementById('signup-cta-btn'),
        authTitle: document.getElementById('auth-title'),
        authSubtext: document.getElementById('auth-subtext'),
        loginEmailInput: document.getElementById('login-email'),
        loginPasswordInput: document.getElementById('login-password'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        rememberMeCheckbox: document.getElementById('remember-me'),
        loginSignupPrompt: document.getElementById('login-signup-prompt'),
        signupLoginPrompt: document.getElementById('signup-login-prompt'),
        orSeparator: document.getElementById('or-separator'),
        googleBtnText: document.getElementById('google-btn-text'),
        guestBtnText: document.getElementById('guest-btn-text'),
        termsLabel: document.getElementById('terms-label'),
        resetModalTitle: document.getElementById('reset-modal-title'),
        resetModalSubtext: document.getElementById('reset-modal-subtext'),
        resetEmailInput: document.getElementById('reset-email'),
        sendResetLinkBtn: document.getElementById('send-reset-link-btn'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        loginErrorMessage: document.getElementById('login-error-message'),
        signupErrorMessage: document.getElementById('signup-error-message'),
        googleSigninBtn: document.getElementById('google-signin-btn'),
        guestContinueBtn: document.getElementById('guest-continue-btn'),
        resetErrorMessage: document.getElementById('reset-error-message'),
        resetSuccessMessage: document.getElementById('reset-success-message'),
    };

    // --- Translations (Keep this simple for now, can be moved to a separate file later) ---
    const translations = {
        en: { loginTitle: "🍕 Welcome Back!", loginSubtext: "Log in to get your favorites delivered hot & fast.", loginCta: "→ Log In & Order Now", signupTitle: "🎉 Join the Pizza Party!", signupSubtext: "Sign up & get 20% OFF your first order.", signupCta: "→ Create Account", emailPlaceholder: "Email", passwordPlaceholder: "Password", confirmPasswordPlaceholder: "Confirm Password", forgotPassword: "Forgot password?", noAccountPrompt: "Don't have an account?", signupLink: "Sign Up", hasAccountPrompt: "Already have an account?", loginLink: "Login", orSeparator: "OR", googleBtn: "Sign in with Google", guestBtn: "Continue as Guest", terms: 'I agree to the <a href="terms.html" class="text-blue-600 hover:underline">Terms and Conditions</a>.', resetTitle: "Reset Password", resetSubtext: "Enter your email and we'll send a reset link.", sendResetLink: "Send Reset Link", cancel: "Cancel", strength: { weak: "Weak", medium: "Medium", strong: "Strong" }, loadingLogin: "Logging in...", loadingSignup: "Creating Account...", errorInvalidEmail: "Please enter a valid email address.", errorUserNotFound: "No account found with this email.", errorWrongPassword: "Incorrect password. Please try again.", errorWeakPassword: "Password should be at least 6 characters.", errorEmailInUse: "This email address is already in use.", errorGeneric: "An unexpected error occurred. Please try again." },
        fr: { loginTitle: "🍕 Content de te revoir !", loginSubtext: "Connecte-toi pour commander ta pizza préférée.", loginCta: "→ Se connecter et commander", signupTitle: "🎉 Rejoins la famille Pizza !", signupSubtext: "Inscris-toi et reçois 20% de réduction.", signupCta: "→ Créer un compte", emailPlaceholder: "Adresse e-mail", passwordPlaceholder: "Mot de passe", confirmPasswordPlaceholder: "Confirmer le mot de passe", forgotPassword: "Mot de passe oublié ?", noAccountPrompt: "Pas encore de compte ?", signupLink: "S'inscrire", hasAccountPrompt: "Déjà un compte ?", loginLink: "Se connecter", orSeparator: "OU", googleBtn: "Se connecter avec Google", guestBtn: "Continuer en tant qu'invité", terms: 'J\'accepte les <a href="terms.html" class="text-blue-600 hover:underline">Termes et Conditions</a>.', resetTitle: "Réinitialiser le mot de passe", resetSubtext: "Entrez votre email et nous enverrons un lien.", sendResetLink: "Envoyer le lien", cancel: "Annuler", strength: { weak: "Faible", medium: "Moyen", strong: "Fort" }, loadingLogin: "Connexion...", loadingSignup: "Création du compte...", errorInvalidEmail: "Veuillez saisir une adresse e-mail valide.", errorUserNotFound: "Aucun compte trouvé avec cet e-mail.", errorWrongPassword: "Mot de passe incorrect. Veuillez réessayer.", errorWeakPassword: "Le mot de passe doit comporter au moins 6 caractères.", errorEmailInUse: "Cette adresse e-mail est déjà utilisée.", errorGeneric: "Une erreur inattendue est survenue. Veuillez réessayer." },
        ar: { loginTitle: "🍕 مرحباً بعودتك!", loginSubtext: "سجّل الدخول واطلب بيتزاك المفضلة الآن.", loginCta: "→ تسجيل الدخول والطلب الآن", signupTitle: "🎉 انضم لعشاق البيتزا!", signupSubtext: "سجّل الآن واحصل على خصم 20٪.", signupCta: "→ إنشاء حساب", emailPlaceholder: "البريد الإلكتروني", passwordPlaceholder: "كلمة المرور", confirmPasswordPlaceholder: "تأكيد كلمة المرور", forgotPassword: "هل نسيت كلمة المرور؟", noAccountPrompt: "ليس لديك حساب؟", signupLink: "إنشاء حساب", hasAccountPrompt: "لديك حساب بالفعل؟", loginLink: "تسجيل الدخول", orSeparator: "أو", googleBtn: "تسجيل الدخول عبر جوجل", guestBtn: "المتابعة كزائر", terms: 'أوافق على <a href="terms.html" class="text-blue-600 hover:underline">الشروط والأحكام</a>.', resetTitle: "إعادة تعيين كلمة المرور", resetSubtext: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا.", sendResetLink: "إرسال الرابط", cancel: "إلغاء", strength: { weak: "ضعيف", medium: "متوسط", strong: "قوي" }, loadingLogin: "جاري تسجيل الدخول...", loadingSignup: "جاري إنشاء الحساب...", errorInvalidEmail: "يرجى إدخال بريد إلكتروني صالح.", errorUserNotFound: "لم يتم العثور على حساب بهذا البريد الإلكتروني.", errorWrongPassword: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.", errorWeakPassword: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.", errorEmailInUse: "هذا البريد الإلكتروني مستخدم بالفعل.", errorGeneric: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." }
    };

    // --- UI & Utility Functions ---
    const getLang = () => localStorage.getItem('lang') || 'en';

    const displayError = (element, messageKey) => {
        const lang = getLang();
        element.textContent = translations[lang][messageKey] || translations[lang].errorGeneric;
    };

    const clearErrors = () => {
        elements.loginErrorMessage.textContent = '';
        elements.signupErrorMessage.textContent = '';
        elements.resetErrorMessage.textContent = '';
    };

    const setLoading = (button, isLoading, loadingTextKey) => {
        const lang = getLang();
        const t = translations[lang];
        const originalTextKey = button.id === 'login-cta-btn' ? 'loginCta' : 'signupCta';
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');

        button.disabled = isLoading;
        if (isLoading) {
            btnText.textContent = t[loadingTextKey];
            spinner.classList.remove('hidden');
        } else {
            btnText.textContent = t[originalTextKey];
            spinner.classList.add('hidden');
        }
    };

    // --- Language Switcher Logic ---
    function applyLanguage(lang) {
        const t = translations[lang];
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        Object.keys(elements).forEach(key => {
            if (elements[key] && elements[key].id) {
                const element = elements[key];
                const translationKey = element.id.replace(/-/g, '_');
                if (t[translationKey]) {
                    element.textContent = t[translationKey];
                }
            }
        });

        // Handle specific elements
        elements.authTitle.textContent = t.loginTitle;
        elements.authSubtext.textContent = t.loginSubtext;
        elements.loginCtaBtn.querySelector('.btn-text').textContent = t.loginCta;
        elements.signupCtaBtn.querySelector('.btn-text').textContent = t.signupCta;
        elements.forgotPasswordLink.textContent = t.forgotPassword;
        elements.loginSignupPrompt.textContent = t.noAccountPrompt;
        elements.showSignupBtn.textContent = t.signupLink;
        elements.signupLoginPrompt.textContent = t.hasAccountPrompt;
        elements.showLoginBtn.textContent = t.loginLink;
        elements.orSeparator.textContent = t.orSeparator;
        elements.googleBtnText.textContent = t.googleBtn;
        elements.guestBtnText.textContent = t.guestBtn;
        elements.termsLabel.innerHTML = t.terms;
        elements.resetModalTitle.textContent = t.resetTitle;
        elements.resetModalSubtext.textContent = t.resetSubtext;
        elements.sendResetLinkBtn.textContent = t.sendResetLink;
        elements.closeModalBtn.textContent = t.cancel;
        elements.loginEmailInput.placeholder = t.emailPlaceholder;
        elements.loginPasswordInput.placeholder = t.passwordPlaceholder;
        document.getElementById('signup-email').placeholder = t.emailPlaceholder;
        document.getElementById('signup-name').placeholder = "Full Name";
        document.getElementById('signup-phone').placeholder = "Phone Number";
        elements.resetEmailInput.placeholder = t.emailPlaceholder;

        const passwordInputComponent = document.querySelector('password-input');
        if (passwordInputComponent && passwordInputComponent.shadowRoot) {
            passwordInputComponent.shadowRoot.getElementById('password').placeholder = t.passwordPlaceholder;
            passwordInputComponent.shadowRoot.getElementById('confirm-password').placeholder = t.confirmPasswordPlaceholder;
        }

        elements.languageSwitcher.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));

        if (elements.signupForm.classList.contains('hidden-form')) {
            elements.authTitle.textContent = t.loginTitle;
            elements.authSubtext.textContent = t.loginSubtext;
        } else {
            elements.authTitle.textContent = t.signupTitle;
            elements.authSubtext.textContent = t.signupSubtext;
        }
    }

    // --- Form Switching Logic ---
    function switchForms(showForm, hideForm) {
        if (!hideForm.classList.contains('hidden-form')) hideForm.classList.add('hidden-form');
        clearErrors();
        const lang = getLang();
        const t = translations[lang];

        if (showForm.id === 'signup-form') {
            elements.authTitle.textContent = t.signupTitle;
            elements.authSubtext.textContent = t.signupSubtext;
        } else {
            elements.authTitle.textContent = t.loginTitle;
            elements.authSubtext.textContent = t.loginSubtext;
        }
        setTimeout(() => showForm.classList.remove('hidden-form'), 50);
    }

    // --- Password Input Custom Element ---
    class PasswordInput extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
                <style>
                    /* ... (All the styles from your original auth.js file) ... */
                    .password-group { display: flex; flex-direction: column; gap: 1rem; }
                    .password-wrapper { position: relative; }
                    input { box-sizing: border-box; width: 100%; padding: 0.75rem; padding-right: 2.5rem; border-radius: 0.5rem; transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; background-color: #f3f4f6; border: 1px solid #d1d5db; color: #231F20; }
                    input::placeholder { color: #9ca3af; }
                    input:focus { border-color: #FFC72C; box-shadow: 0 0 0 2px rgba(255, 199, 44, 0.5); outline: none; }
                    .toggle-password { position: absolute; top: 50%; right: 0.75rem; transform: translateY(-50%); cursor: pointer; color: #9ca3af; }
                    .error-message { color: #dc2626; font-size: 0.875rem; display: none; margin-top: -0.5rem; margin-bottom: 0.5rem; }
                    .error-message.visible { display: block; }
                    .strength-meter { height: 8px; width: 100%; background-color: #e5e7eb; border-radius: 9999px; display: flex; overflow: hidden; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                    .strength-bar { height: 100%; width: 0; transition: width 0.3s ease, background-color 0.3s ease; }
                    .strength-text { font-size: 0.8rem; font-weight: 600; text-align: right; min-height: 1.25rem; }
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
                <div class="password-group">
                    <div class="password-wrapper">
                        <input type="password" id="password" required />
                        <i class="fas fa-eye toggle-password" data-target="password"></i>
                    </div>
                    <div class="strength-meter"><div class="strength-bar"></div></div>
                    <p class="strength-text"></p>
                    <div class="password-wrapper">
                        <input type="password" id="confirm-password" required />
                        <i class="fas fa-eye toggle-password" data-target="confirm-password"></i>
                    </div>
                </div>
                <p id="password-error" class="error-message">Passwords do not match.</p>
            `;
            this.passwordInput = this.shadowRoot.getElementById('password');
            this.confirmPasswordInput = this.shadowRoot.getElementById('confirm-password');
            this.passwordError = this.shadowRoot.getElementById('password-error');
            this.strengthBar = this.shadowRoot.querySelector('.strength-bar');
            this.strengthText = this.shadowRoot.querySelector('.strength-text');

            this.passwordInput.addEventListener('input', () => { this.validatePasswords(); this.checkStrength(); });
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
            
            const t = translations[getLang()].strength;
            
            if (pass.length === 0) {
                this.strengthBar.style.width = '0%';
                this.strengthText.textContent = '';
                return;
            }

            const strengthLevels = {
                1: { width: '33.33%', color: '#ef4444', text: t.weak },
                2: { width: '33.33%', color: '#ef4444', text: t.weak },
                3: { width: '66.66%', color: '#f59e0b', text: t.medium },
                4: { width: '100%', color: '#22c55e', text: t.strong }
            };
            const level = strengthLevels[score] || { width: '10%', color: '#ef4444', text: t.weak };
            
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
        get password() { return this.passwordInput.value; }
        checkValidity() { return this.passwordInput.checkValidity() && this.confirmPasswordInput.checkValidity() && this.validatePasswords(); }
    }
    if (!customElements.get('password-input')) {
        customElements.define('password-input', PasswordInput);
    }
    
    // --- Core Authentication Logic ---
    const handleSuccessfulLogin = (user) => {
        user.getIdTokenResult().then((idTokenResult) => {
            const userRef = db.ref('users/' + user.uid);
            userRef.once('value').then(snapshot => {
                const userUpdate = { lastLogin: new Date().toISOString() };
                if (!snapshot.exists()) {
                    userUpdate.email = user.email;
                    userUpdate.name = user.displayName || 'New User';
                }
                userRef.update(userUpdate);
            });

            if (idTokenResult.claims.admin === true) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'order-type-selection.html';
            }
        }).catch(() => {
            window.location.href = 'order-type-selection.html'; // Default redirect on error
        });
    };

    const handleAuthError = (error, form) => {
        let errorMessageKey = 'errorGeneric';
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                errorMessageKey = 'errorUserNotFound';
                break;
            case 'auth/wrong-password':
                errorMessageKey = 'errorWrongPassword';
                break;
            case 'auth/invalid-email':
                errorMessageKey = 'errorInvalidEmail';
                break;
            case 'auth/weak-password':
                errorMessageKey = 'errorWeakPassword';
                break;
            case 'auth/email-already-in-use':
                errorMessageKey = 'errorEmailInUse';
                break;
        }
        displayError(form === 'login' ? elements.loginErrorMessage : elements.signupErrorMessage, errorMessageKey);
    };

    // --- Event Listeners ---
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        setLoading(elements.loginCtaBtn, true, 'loadingLogin');
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
        const passwordInputComponent = elements.signupForm.querySelector('password-input');
        if (!document.getElementById('terms-checkbox').checked) {
            displayError(elements.signupErrorMessage, 'You must agree to the terms and conditions.');
            return;
        }
        if (!passwordInputComponent.checkValidity()) {
            displayError(elements.signupErrorMessage, 'Passwords do not match or are invalid.');
            return;
        }
        setLoading(elements.signupCtaBtn, true, 'loadingSignup');
        try {
            const email = document.getElementById('signup-email').value.trim();
            const userCredential = await auth.createUserWithEmailAndPassword(email, passwordInputComponent.password);
            
            await db.ref('users/' + userCredential.user.uid).set({
                email: email,
                name: document.getElementById('signup-name').value.trim(),
                phone: document.getElementById('signup-phone').value.trim(),
                createdAt: new Date().toISOString()
            });
            handleSuccessfulLogin(userCredential.user);
        } catch (error) {
            handleAuthError(error, 'signup');
        } finally {
            setLoading(elements.signupCtaBtn, false);
        }
    });
    
    elements.googleSigninBtn.addEventListener('click', async () => {
        try {
            const result = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
            handleSuccessfulLogin(result.user);
        } catch (error) {
            handleAuthError(error, 'login');
        }
    });

    elements.guestContinueBtn.addEventListener('click', async () => {
        if (confirm("Continuing as a guest means you won't be able to track or view your order history. Do you want to continue?")) {
            try {
                await auth.signInAnonymously();
                localStorage.setItem('orderType', 'dineIn');
                window.location.href = 'menu.html';
            } catch (error) {
                handleAuthError(error, 'login');
            }
        }
    });

    // Modal Listeners
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
            displayError(elements.resetErrorMessage, 'errorInvalidEmail');
            return;
        }
        clearErrors();
        try {
            await auth.sendPasswordResetEmail(email);
            elements.resetSuccessMessage.textContent = 'Password reset link sent! Check your inbox.';
        } catch (error) {
            handleAuthError(error);
            displayError(elements.resetErrorMessage, 'errorUserNotFound');
        }
    });

    // Init listeners
    elements.showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); switchForms(elements.signupForm, elements.loginForm); });
    elements.showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); switchForms(elements.loginForm, elements.signupForm); });
    elements.languageSwitcher.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const lang = e.target.dataset.lang;
            localStorage.setItem('lang', lang);
            applyLanguage(lang);
        }
    });
    
    // Initial load
    applyLanguage(getLang());
});