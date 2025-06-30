// auth.js
const auth = firebase.auth();
const db = firebase.database();

// --- Elements ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const languageSwitcher = document.getElementById('language-switcher');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const loginCtaBtn = document.getElementById('login-cta-btn');
const signupCtaBtn = document.getElementById('signup-cta-btn');
const authTitle = document.getElementById('auth-title');
const authSubtext = document.getElementById('auth-subtext');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const loginSignupPrompt = document.getElementById('login-signup-prompt');
const signupLoginPrompt = document.getElementById('signup-login-prompt');
const orSeparator = document.getElementById('or-separator');
const googleBtnText = document.getElementById('google-btn-text');
const guestBtnText = document.getElementById('guest-btn-text');
const termsLabel = document.getElementById('terms-label');
const resetModalTitle = document.getElementById('reset-modal-title');
const resetModalSubtext = document.getElementById('reset-modal-subtext');
const resetEmailInput = document.getElementById('reset-email');
const sendResetLinkBtn = document.getElementById('send-reset-link-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const loginErrorMessage = document.getElementById('login-error-message');
const signupErrorMessage = document.getElementById('signup-error-message');

// --- Translations ---
const translations = {
    en: {
        loginTitle: "🍕 Welcome Back!", loginSubtext: "Log in to get your favorites delivered hot & fast.", loginCta: "→ Log In & Order Now", signupTitle: "🎉 Join the Pizza Party!", signupSubtext: "Sign up & get 20% OFF your first order.", signupCta: "→ Create Account", emailPlaceholder: "Email", passwordPlaceholder: "Password", confirmPasswordPlaceholder: "Confirm Password", forgotPassword: "Forgot password?", noAccountPrompt: "Don't have an account?", signupLink: "Sign Up", hasAccountPrompt: "Already have an account?", loginLink: "Login", orSeparator: "OR", googleBtn: "Sign in with Google", guestBtn: "Continue as Guest", terms: 'I agree to the <a href="terms.html" class="text-blue-600 hover:underline">Terms and Conditions</a>.', resetTitle: "Reset Password", resetSubtext: "Enter your email and we'll send a reset link.", sendResetLink: "Send Reset Link", cancel: "Cancel", strength: { weak: "Weak", medium: "Medium", strong: "Strong" }
    },
    fr: {
        loginTitle: "🍕 Content de te revoir !", loginSubtext: "Connecte-toi pour commander ta pizza préférée.", loginCta: "→ Se connecter et commander", signupTitle: "🎉 Rejoins la famille Pizza !", signupSubtext: "Inscris-toi et reçois 20% de réduction sur ta première commande.", signupCta: "→ Créer un compte", emailPlaceholder: "Adresse e-mail", passwordPlaceholder: "Mot de passe", confirmPasswordPlaceholder: "Confirmer le mot de passe", forgotPassword: "Mot de passe oublié ?", noAccountPrompt: "Pas encore de compte ?", signupLink: "S'inscrire", hasAccountPrompt: "Déjà un compte ?", loginLink: "Se connecter", orSeparator: "OU", googleBtn: "Se connecter avec Google", guestBtn: "Continuer en tant qu'invité", terms: 'J\'accepte les <a href="terms.html" class="text-blue-600 hover:underline">Termes et Conditions</a>.', resetTitle: "Réinitialiser le mot de passe", resetSubtext: "Entrez votre email et nous enverrons un lien.", sendResetLink: "Envoyer le lien", cancel: "Annuler", strength: { weak: "Faible", medium: "Moyen", strong: "Fort" }
    },
    ar: {
        loginTitle: "🍕 مرحباً بعودتك!", loginSubtext: "سجّل الدخول واطلب بيتزاك المفضلة الآن.", loginCta: "→ تسجيل الدخول والطلب الآن", signupTitle: "🎉 انضم لعشاق البيتزا!", signupSubtext: "سجّل الآن واحصل على خصم 20٪ لأول طلب.", signupCta: "→ إنشاء حساب", emailPlaceholder: "البريد الإلكتروني", passwordPlaceholder: "كلمة المرور", confirmPasswordPlaceholder: "تأكيد كلمة المرور", forgotPassword: "هل نسيت كلمة المرور؟", noAccountPrompt: "ليس لديك حساب؟", signupLink: "إنشاء حساب", hasAccountPrompt: "لديك حساب بالفعل؟", loginLink: "تسجيل الدخول", orSeparator: "أو", googleBtn: "تسجيل الدخول عبر جوجل", guestBtn: "المتابعة كزائر", terms: 'أوافق على <a href="terms.html" class="text-blue-600 hover:underline">الشروط والأحكام</a>.', resetTitle: "إعادة تعيين كلمة المرور", resetSubtext: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا.", sendResetLink: "إرسال الرابط", cancel: "إلغاء", strength: { weak: "ضعيف", medium: "متوسط", strong: "قوي" }
    }
};

// --- Language Functions ---
function applyLanguage(lang) {
    const t = translations[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    authTitle.textContent = t.loginTitle;
    authSubtext.textContent = t.loginSubtext;
    loginCtaBtn.querySelector('.btn-text').textContent = t.loginCta;
    signupCtaBtn.querySelector('.btn-text').textContent = t.signupCta;
    forgotPasswordLink.textContent = t.forgotPassword;
    loginSignupPrompt.textContent = t.noAccountPrompt;
    showSignupBtn.textContent = t.signupLink;
    signupLoginPrompt.textContent = t.hasAccountPrompt;
    showLoginBtn.textContent = t.loginLink;
    orSeparator.textContent = t.orSeparator;
    googleBtnText.textContent = t.googleBtn;
    guestBtnText.textContent = t.guestBtn;
    termsLabel.innerHTML = t.terms;
    resetModalTitle.textContent = t.resetTitle;
    resetModalSubtext.textContent = t.resetSubtext;
    sendResetLinkBtn.textContent = t.sendResetLink;
    closeModalBtn.textContent = t.cancel;
    loginEmailInput.placeholder = t.emailPlaceholder;
    loginPasswordInput.placeholder = t.passwordPlaceholder;
    document.getElementById('signup-email').placeholder = t.emailPlaceholder;
    document.getElementById('signup-name').placeholder = "Full Name"; // Add translations if needed
    document.getElementById('signup-phone').placeholder = "Phone Number"; // Add translations if needed
    resetEmailInput.placeholder = t.emailPlaceholder;
    const passwordInputComponent = document.querySelector('password-input');
    if (passwordInputComponent && passwordInputComponent.shadowRoot) {
        passwordInputComponent.shadowRoot.getElementById('password').placeholder = t.passwordPlaceholder;
        passwordInputComponent.shadowRoot.getElementById('confirm-password').placeholder = t.confirmPasswordPlaceholder;
    }
    languageSwitcher.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    if (signupForm.classList.contains('hidden-form')) {
        authTitle.textContent = t.loginTitle; authSubtext.textContent = t.loginSubtext;
    } else {
        authTitle.textContent = t.signupTitle; authSubtext.textContent = t.signupSubtext;
    }
}

// --- Event Listeners & Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('lang') || 'en';
    applyLanguage(savedLang);
    languageSwitcher.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const lang = e.target.dataset.lang;
            localStorage.setItem('lang', lang);
            applyLanguage(lang);
        }
    });
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordModal.classList.remove('hidden');
        document.getElementById('reset-error-message').textContent = '';
        document.getElementById('reset-success-message').textContent = '';
    });
});

// --- Utility Functions ---
function displayError(element, message) { element.textContent = message; }
function hideError(element) { element.textContent = ''; }
function switchForms(showForm, hideForm) {
    if (!hideForm.classList.contains('hidden-form')) hideForm.classList.add('hidden-form');
    const lang = localStorage.getItem('lang') || 'en';
    const t = translations[lang];
    if (showForm.id === 'signup-form') {
        authTitle.textContent = t.signupTitle; authSubtext.textContent = t.signupSubtext;
    } else {
        authTitle.textContent = t.loginTitle; authSubtext.textContent = t.loginSubtext;
    }
    setTimeout(() => {
        showForm.classList.remove('hidden-form');
        hideError(loginErrorMessage);
        hideError(signupErrorMessage);
    }, 50);
}
showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); switchForms(signupForm, loginForm); });
showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); switchForms(loginForm, signupForm); });

// --- Custom Password Input Element ---
class PasswordInput extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.setAttribute('rel', 'stylesheet');
        fontAwesomeLink.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
        this.shadowRoot.appendChild(fontAwesomeLink);
        this.shadowRoot.innerHTML += `
          <style>
            .password-group { display: flex; flex-direction: column; gap: 1rem; }
            .password-wrapper { position: relative; }
            input { box-sizing: border-box; width: 100%; padding: 0.75rem; padding-right: 2.5rem; border-radius: 0.5rem; transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; background-color: #f3f4f6; border: 1px solid #d1d5db; color: #231F20; }
            input::placeholder { color: #9ca3af; }
            input:focus { border-color: #FFC72C; box-shadow: 0 0 0 2px rgba(255, 199, 44, 0.5); outline: none; }
            .toggle-password { position: absolute; top: 50%; right: 0.75rem; transform: translateY(-50%); cursor: pointer; color: #9ca3af; }
            .error-message { color: #dc2626; font-size: 0.875rem; display: none; margin-top: -0.5rem; margin-bottom: 0.5rem; }
            .error-message.visible { display: block; }
            /* Strength Meter Styles */
            .strength-meter { height: 12px; width: 100%; background-color: #e5e7eb; border-radius: 9999px; display: flex; overflow: hidden; margin-top: -0.5rem; margin-bottom: 0.5rem; }
            .strength-bar { height: 100%; width: 0; transition: width 0.3s ease, background-color 0.3s ease; }
            .strength-text { font-size: 0.8rem; font-weight: 600; text-align: right; }
          </style>
          <div class="password-group">
            <div class="password-wrapper">
                <input type="password" id="password" required />
                <i class="fas fa-eye toggle-password" data-target="password"></i>
            </div>
            <div class="strength-meter">
                <div class="strength-bar"></div>
            </div>
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
        this.shadowRoot.querySelectorAll('.toggle-password').forEach(toggle => { toggle.addEventListener('click', () => { const targetId = toggle.dataset.target; const targetInput = this.shadowRoot.getElementById(targetId); if (targetInput.type === 'password') { targetInput.type = 'text'; toggle.classList.remove('fa-eye'); toggle.classList.add('fa-eye-slash'); } else { targetInput.type = 'password'; toggle.classList.remove('fa-eye-slash'); toggle.classList.add('fa-eye'); } }); });
    }
    checkStrength() {
        const pass = this.passwordInput.value;
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        const lang = localStorage.getItem('lang') || 'en';
        const t = translations[lang].strength;
        
        if (pass.length === 0) {
            this.strengthBar.style.width = '0%';
            this.strengthText.textContent = '';
            return;
        }

        switch (score) {
            case 1:
            case 2:
                this.strengthBar.style.width = '33.33%';
                this.strengthBar.style.backgroundColor = '#ef4444'; // red-500
                this.strengthText.textContent = t.weak;
                this.strengthText.style.color = '#ef4444';
                break;
            case 3:
                this.strengthBar.style.width = '66.66%';
                this.strengthBar.style.backgroundColor = '#f59e0b'; // amber-500
                this.strengthText.textContent = t.medium;
                this.strengthText.style.color = '#f59e0b';
                break;
            case 4:
                this.strengthBar.style.width = '100%';
                this.strengthBar.style.backgroundColor = '#22c55e'; // green-500
                this.strengthText.textContent = t.strong;
                this.strengthText.style.color = '#22c55e';
                break;
            default:
                this.strengthBar.style.width = '10%';
                this.strengthBar.style.backgroundColor = '#ef4444';
                this.strengthText.textContent = t.weak;
                this.strengthText.style.color = '#ef4444';
        }
    }
    validatePasswords() { if (this.passwordInput.value && this.confirmPasswordInput.value && this.passwordInput.value !== this.confirmPasswordInput.value) { this.passwordError.classList.add('visible'); return false; } else { this.passwordError.classList.remove('visible'); return true; } }
    get password() { return this.passwordInput.value; }
    checkValidity() { return this.passwordInput.checkValidity() && this.confirmPasswordInput.checkValidity() && this.validatePasswords(); }
}
customElements.define('password-input', PasswordInput);
document.querySelectorAll('.toggle-password').forEach(toggle => { toggle.addEventListener('click', () => { const targetId = toggle.dataset.target; const targetInput = document.getElementById(targetId); if (targetInput && targetInput.type === 'password') { targetInput.type = 'text'; toggle.classList.remove('fa-eye'); toggle.classList.add('fa-eye-slash'); } else if (targetInput) { targetInput.type = 'password'; toggle.classList.remove('fa-eye-slash'); toggle.classList.add('fa-eye'); } }); });

// --- Core Authentication Logic ---
const handleSuccessfulLogin = (user) => {
    const userRef = db.ref('users/' + user.uid);
    userRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            // This is a new user, or a Google Sign-In user without a DB entry
            userRef.update({
                email: user.email,
                name: user.displayName || 'Customer',
                lastLogin: new Date().toISOString()
            });
        } else {
            // Existing user, just update last login
            userRef.update({
                lastLogin: new Date().toISOString()
            });
        }
    });
    window.location.href = 'order-type-selection.html';
};
const setLoading = (button, isLoading) => { button.disabled = isLoading; };
loginForm.addEventListener('submit', async (e) => { e.preventDefault(); hideError(loginErrorMessage); setLoading(loginCtaBtn, true); try { const userCredential = await auth.signInWithEmailAndPassword(loginEmailInput.value, loginPasswordInput.value); handleSuccessfulLogin(userCredential.user); } catch (error) { displayError(loginErrorMessage, 'Invalid email or password.'); } finally { setLoading(loginCtaBtn, false); } });

// UPDATED: Signup form logic to save name and phone
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(signupErrorMessage);
    const passwordInputComponent = signupForm.querySelector('password-input');
    const name = document.getElementById('signup-name').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const email = document.getElementById('signup-email').value.trim();

    if (!document.getElementById('terms-checkbox').checked) {
        displayError(signupErrorMessage, 'You must agree to the terms and conditions.');
        return;
    }
    if (!passwordInputComponent.checkValidity()) {
        displayError(signupErrorMessage, 'Passwords do not match or are invalid.');
        return;
    }
    setLoading(signupCtaBtn, true);
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, passwordInputComponent.password);

        // Save additional user info to the database
        await db.ref('users/' + userCredential.user.uid).set({
            email: email,
            name: name,
            phone: phone,
            createdAt: new Date().toISOString()
        });

        handleSuccessfulLogin(userCredential.user);
    } catch (error) {
        let msg = 'Error signing up. Please try again.';
        if (error.code === 'auth/email-already-in-use') msg = 'This email is already in use.';
        if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
        displayError(signupErrorMessage, msg);
    } finally {
        setLoading(signupCtaBtn, false);
    }
});

document.getElementById('google-signin-btn').addEventListener('click', async () => { try { const result = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); handleSuccessfulLogin(result.user); } catch (error) { displayError(loginErrorMessage, 'Could not sign in with Google. Please try again.'); } });
document.getElementById('guest-continue-btn').addEventListener('click', async () => { try { await auth.signInAnonymously(); localStorage.setItem('orderType', 'dineIn'); window.location.href = 'menu.html'; } catch (error) { displayError(loginErrorMessage, 'Could not continue as guest. Please try again.'); } });
closeModalBtn.addEventListener('click', () => { forgotPasswordModal.classList.add('hidden'); });
sendResetLinkBtn.addEventListener('click', async () => { const email = resetEmailInput.value; const resetError = document.getElementById('reset-error-message'); const resetSuccess = document.getElementById('reset-success-message'); if (!email) { resetError.textContent = 'Please enter your email address.'; return; } resetError.textContent = ''; resetSuccess.textContent = ''; try { await auth.sendPasswordResetEmail(email); resetSuccess.textContent = 'Password reset link sent! Check your inbox.'; } catch (error) { resetError.textContent = 'Failed to send. Please check the email and try again.'; } });