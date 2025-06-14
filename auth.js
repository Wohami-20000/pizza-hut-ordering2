// auth.js
const auth = firebase.auth();
const db = firebase.database(); // You already have db initialized in firebase.js, but ensure it's accessible

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const authTitle = document.getElementById('auth-title');
const loginErrorMessage = document.getElementById('login-error-message');
const signupErrorMessage = document.getElementById('signup-error-message');

// Custom element for password input with confirmation
class PasswordInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .password-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem; /* Equivalent to Tailwind's space-y-3 */
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
        }
      </style>
      <div class="password-group">
        <input type="password" id="password" placeholder="Password" required />
        <input type="password" id="confirm-password" placeholder="Confirm Password" required />
        <p id="password-error" class="error-message hidden">Passwords do not match.</p>
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
      this.passwordError.classList.remove('hidden');
      return false;
    } else {
      this.passwordError.classList.add('hidden');
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


// Function to display error messages
function displayError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

// Function to hide error messages
function hideError(element) {
  element.classList.add('hidden');
  element.textContent = '';
}

// Switch between login and signup forms
showSignupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  authTitle.textContent = 'Create Account';
  hideError(loginErrorMessage);
  hideError(signupErrorMessage);
});

showLoginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  authTitle.textContent = 'Customer Login';
  hideError(loginErrorMessage);
  hideError(signupErrorMessage);
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginErrorMessage);

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Check if the user is an admin (if you integrate custom claims later)
    // For now, all logged-in users are considered customers
    console.log('User logged in:', user.uid);

    // Redirect to order type selection
    window.location.href = 'order-type-selection.html'; // We'll create this next
  } catch (error) {
    console.error('Login error:', error.code, error.message);
    let errorMessage = 'Invalid email or password.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format.';
    }
    displayError(loginErrorMessage, errorMessage);
  }
});

// Sign Up Form Submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(signupErrorMessage);

  const email = document.getElementById('signup-email').value;
  const passwordInputComponent = signupForm.querySelector('password-input');
  const password = passwordInputComponent.password; // Get value from custom element
  const phone = document.getElementById('signup-phone').value;
  const name = document.getElementById('signup-name').value;

  if (!passwordInputComponent.checkValidity()) {
    displayError(signupErrorMessage, 'Passwords do not match or are invalid.');
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save additional user data to Realtime Database
    await db.ref('users/' + user.uid).set({
      email: user.email,
      name: name || 'Customer',
      phone: phone || '',
      createdAt: new Date().toISOString()
    });

    console.log('User signed up and data saved:', user.uid);

    // Redirect to order type selection
    window.location.href = 'order-type-selection.html'; // We'll create this next
  } catch (error) {
    console.error('Sign up error:', error.code, error.message);
    let errorMessage = 'Error signing up. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already in use.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak (should be at least 6 characters).';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format.';
    }
    displayError(signupErrorMessage, errorMessage);
  }
});

// Check auth state on load (already in your admin-login.html, but crucial here too)
auth.onAuthStateChanged(user => {
  if (user) {
    // User is logged in, redirect to order type selection
    window.location.href = 'order-type-selection.html';
  }
});