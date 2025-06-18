// auth.js
const auth = firebase.auth();
const db = firebase.database();

// --- Form Elements ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const authTitle = document.getElementById('auth-title');
const loginErrorMessage = document.getElementById('login-error-message');
const signupErrorMessage = document.getElementById('signup-error-message');

// --- Social & Guest Login Buttons ---
const googleBtn = document.getElementById('google-signin-btn');
const appleBtn = document.getElementById('apple-signin-btn');
const guestBtn = document.getElementById('guest-continue-btn');

// --- Password Reset Modal Elements ---
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const closeModalBtn = document.getElementById('close-modal-btn');
const sendResetLinkBtn = document.getElementById('send-reset-link-btn');
const resetErrorMessage = document.getElementById('reset-error-message');
const resetSuccessMessage = document.getElementById('reset-success-message');

// --- Utility Functions ---
function displayError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function hideError(element) {
  element.classList.add('hidden');
  element.textContent = '';
}

// --- Form Switching with Animation ---
function switchForms(showForm, hideForm, newTitle) {
    hideForm.classList.add('hidden-form');
    authTitle.textContent = newTitle;

    setTimeout(() => {
        showForm.classList.remove('hidden-form');
        hideError(loginErrorMessage);
        hideError(signupErrorMessage);
    }, 100); // A small delay to ensure the class is applied before removing
}

showSignupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  switchForms(signupForm, loginForm, 'Create Account');
});

showLoginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  switchForms(loginForm, signupForm, 'Customer Login');
});


// --- Custom Password Input Element (no changes needed here) ---
class PasswordInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .password-group {
          display: flex;
          flex-direction: column;
          gap: 1.5rem; /* space-y-6 */
        }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db; /* gray-300 */
          border-radius: 0.5rem; /* rounded-lg */
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        input:focus {
          border-color: #ef4444; /* red-500 */
          box-shadow: 0 0 0 1px #ef4444; /* ring-1 ring-red-500 */
          outline: none;
        }
        .error-message {
          color: #ef4444; /* red-500 */
          font-size: 0.875rem; /* text-sm */
          display: none; /* Hidden by default */
        }
        .error-message.visible {
            display: block;
        }
      </style>
      <div class="password-group">
        <input type="password" id="password" placeholder="Password" required />
        <input type="password" id="confirm-password" placeholder="Confirm Password" required />
        <p id="password-error" class="error-message">Passwords do not match.</p>
      </div>
    `;
    this.passwordInput = this.shadowRoot.getElementById('password');
    this.confirmPasswordInput = this.shadowRoot.getElementById('confirm-password');
    this.passwordError = this.shadowRoot.getElementById('password-error');

    this.confirmPasswordInput.addEventListener('input', () => this.validatePasswords());
    this.passwordInput.addEventListener('input', () => this.validatePasswords());
  }

  validatePasswords() {
    if (this.passwordInput.value !== this.confirmPasswordInput.value) {
      this.passwordError.classList.add('visible');
      return false;
    } else {
      this.passwordError.classList.remove('visible');
      return true;
    }
  }

  get password() {
    return this.passwordInput.value;
  }

  checkValidity() {
    return this.passwordInput.checkValidity() &&
           this.confirmPasswordInput.checkValidity() &&
           this.validatePasswords();
  }
}
customElements.define('password-input', PasswordInput);


// --- Core Authentication Logic ---

const handleSuccessfulLogin = (user) => {
  console.log('User logged in:', user.uid);
  // Save user data to Realtime Database on login/signup
  db.ref('users/' + user.uid).update({
      email: user.email,
      lastLogin: new Date().toISOString(),
      name: user.displayName || 'Customer',
      phone: user.phoneNumber || ''
  });
  window.location.href = 'order-type-selection.html';
};

// Email/Password Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginErrorMessage);
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    handleSuccessfulLogin(userCredential.user);
  } catch (error) {
    displayError(loginErrorMessage, 'Invalid email or password.');
  }
});

// Email/Password Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(signupErrorMessage);

  const email = document.getElementById('signup-email').value;
  const passwordInputComponent = signupForm.querySelector('password-input');
  const password = passwordInputComponent.password;
  const phone = document.getElementById('signup-phone').value;
  const name = document.getElementById('signup-name').value;

  if (!passwordInputComponent.checkValidity()) {
    displayError(signupErrorMessage, 'Passwords do not match or are invalid.');
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    // Update profile with name
    await user.updateProfile({ displayName: name });
    // Save additional data to Realtime DB
    await db.ref('users/' + user.uid).set({
      email: user.email,
      name: name || 'Customer',
      phone: phone || '',
      createdAt: new Date().toISOString()
    });
    handleSuccessfulLogin(user);
  } catch (error) {
    let msg = 'Error signing up. Please try again.';
    if (error.code === 'auth/email-already-in-use') msg = 'This email is already in use.';
    if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
    displayError(signupErrorMessage, msg);
  }
});

// Google Sign-In
googleBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        handleSuccessfulLogin(result.user);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        displayError(loginErrorMessage, 'Could not sign in with Google. Please try again.');
    }
});

// Apple Sign-In
appleBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    try {
        const result = await auth.signInWithPopup(provider);
        handleSuccessfulLogin(result.user);
    } catch (error) {
        console.error("Apple Sign-In Error:", error);
        displayError(loginErrorMessage, 'Could not sign in with Apple. Please try again.');
    }
});


// Continue as Guest
guestBtn.addEventListener('click', async () => {
    try {
        const userCredential = await auth.signInAnonymously();
        console.log('Guest user signed in:', userCredential.user.uid);
        // Set a flag to identify guest users
        localStorage.setItem('isGuest', 'true');
        // Redirect to order type selection
        window.location.href = 'order-type-selection.html';
    } catch (error) {
        console.error("Guest Sign-In Error:", error);
        displayError(loginErrorMessage, 'Could not continue as guest. Please try again.');
    }
});

// --- Password Reset Logic ---
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.classList.remove('hidden');
    hideError(resetErrorMessage);
    hideError(resetSuccessMessage);
});

closeModalBtn.addEventListener('click', () => {
    forgotPasswordModal.classList.add('hidden');
});

sendResetLinkBtn.addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value;
    if (!email) {
        displayError(resetErrorMessage, 'Please enter your email address.');
        return;
    }
    hideError(resetErrorMessage);
    hideError(resetSuccessMessage);

    try {
        await auth.sendPasswordResetEmail(email);
        resetSuccessMessage.textContent = 'Password reset link sent! Check your inbox.';
        resetSuccessMessage.classList.remove('hidden');
    } catch (error) {
        displayError(resetErrorMessage, 'Failed to send reset link. Please check the email and try again.');
    }
});

// Redirect if already logged in (but not a guest)
auth.onAuthStateChanged(user => {
  if (user && !user.isAnonymous) {
    window.location.href = 'order-type-selection.html';
  }
});