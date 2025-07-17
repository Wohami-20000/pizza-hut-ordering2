// admin-server/server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json()); // Middleware to read JSON from requests

// --- SECURITY: Configure CORS ---
// Only allow requests from your web app's domain.
// For local testing, you might use 'http://127.0.0.1:5500' or similar.
// For production, change this to your actual domain (e.g., 'https://pizzahut.yourdomain.com')
const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://pizza-hut-ordering2.vercel.app'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));


// --- INITIALIZE FIREBASE ADMIN ---
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // **IMPORTANT ADDITION**: Explicitly set your Firebase Realtime Database URL here.
  // Based on your serviceAccountKey.json, it should be: https://pizzahut-clone-app-default-rtdb.firebaseio.com
  databaseURL: "https://pizzahut-clone-app-default-rtdb.firebaseio.com"
});

// --- SECURE MIDDLEWARE: Verify Admin Token ---
// This function runs before our role-setting logic.
// It checks the token sent from the admin panel to ensure the user is a real admin.
const checkIfAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    // IMPORTANT: Always send JSON responses for errors
    return res.status(403).json({ error: 'Unauthorized: No token provided.' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.admin === true) {
      req.user = decodedToken; // Pass decoded user info to the next function
      return next();
    }
    // IMPORTANT: Always send JSON responses for errors
    return res.status(403).json({ error: 'Unauthorized: Requester is not an admin.' });
  } catch (error) {
    console.error('Error verifying token:', error);
    // IMPORTANT: Always send JSON responses for errors
    return res.status(403).json({ error: 'Unauthorized: Invalid token.' });
  }
};


// --- THE SECURE ENDPOINT for setting roles ---
// We apply our `checkIfAdmin` middleware here.
app.post('/set-role', checkIfAdmin, async (req, res) => {
  const { uid, role } = req.body;

  if (!uid || !role) {
    return res.status(400).json({ error: 'Missing uid or role in request body.' }); // Changed to .json()
  }

  try {
    // Use the Admin SDK to set the custom claim
    await admin.auth().setCustomUserClaims(uid, { role: role });

    // Also update the role in your Realtime Database for consistency
    await admin.database().ref(`users/${uid}`).update({ role: role });

    res.status(200).json({ message: `Success! User ${uid} has been assigned the role: ${role}.` }); // Changed to .json()
  } catch (error) {
    console.error('Error setting custom claim:', error);
    res.status(500).json({ error: error.message || 'Internal server error while setting role.' }); // Changed to .json()
  }
});

// --- NEW SECURE ENDPOINT for toggling user active status ---
app.post('/toggle-user-status', checkIfAdmin, async (req, res) => {
  const { uid, disabled } = req.body; // 'disabled' should be true to deactivate, false to activate

  if (!uid || typeof disabled !== 'boolean') {
    return res.status(400).json({ error: 'Missing uid or invalid disabled status in request body.' }); // Changed to .json()
  }

  try {
    // Update user in Firebase Authentication (sets disabled status)
    await admin.auth().updateUser(uid, { disabled: disabled });

    // Update 'isDisabled' flag in Realtime Database for easier frontend access
    await admin.database().ref(`users/${uid}`).update({ isDisabled: disabled });

    const statusMessage = disabled ? 'deactivated' : 'activated';
    res.status(200).json({ message: `User ${uid} successfully ${statusMessage}.` }); // Changed to .json()
  } catch (error) {
    console.error(`Error toggling user status for ${uid}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error while toggling user status.' }); // Changed to .json()
  }
});


// --- START THE SERVER ---
const PORT = 3000; // You can change this port if needed
app.listen(PORT, () => {
  console.log(`🚀 Admin server running securely on http://localhost:${PORT}`);
});
