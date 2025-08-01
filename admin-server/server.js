// admin-server/server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json()); // Middleware to read JSON from requests

// --- SECURITY: Configure CORS ---
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
  databaseURL: "https://pizzahut-clone-app-default-rtdb.firebaseio.com"
});

// --- SECURE MIDDLEWARE: Verify Admin Token ---
const checkIfAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(403).json({ error: 'Unauthorized: No token provided.' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.admin === true) {
      req.user = decodedToken; 
      return next();
    }
    return res.status(403).json({ error: 'Unauthorized: Requester is not an admin.' });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Unauthorized: Invalid token.' });
  }
};


// --- THE SECURE ENDPOINT for setting roles ---
app.post('/set-role', checkIfAdmin, async (req, res) => {
  const { uid, role } = req.body;

  if (!uid || !role) {
    return res.status(400).json({ error: 'Missing uid or role in request body.' }); 
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role: role });
    await admin.database().ref(`users/${uid}`).update({ role: role });
    res.status(200).json({ message: `Success! User ${uid} has been assigned the role: ${role}.` });
  } catch (error) {
    console.error('Error setting custom claim:', error);
    res.status(500).json({ error: error.message || 'Internal server error while setting role.' });
  }
});

// --- NEW SECURE ENDPOINT for toggling user active status ---
app.post('/toggle-user-status', checkIfAdmin, async (req, res) => {
  const { uid, disabled } = req.body; 

  if (!uid || typeof disabled !== 'boolean') {
    return res.status(400).json({ error: 'Missing uid or invalid disabled status in request body.' }); 
  }

  try {
    await admin.auth().updateUser(uid, { disabled: disabled });
    await admin.database().ref(`users/${uid}`).update({ isDisabled: disabled });

    const statusMessage = disabled ? 'deactivated' : 'activated';
    res.status(200).json({ message: `User ${uid} successfully ${statusMessage}.` }); 
  } catch (error) {
    console.error(`Error toggling user status for ${uid}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error while toggling user status.' });
  }
});

// --- NEW SECURE ENDPOINT for creating a new user ---
app.post('/create-user', checkIfAdmin, async (req, res) => {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields: name, email, password, role.' });
    }

    try {
        // 1. Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name,
            disabled: false,
        });

        // 2. Set custom role claim for the new user
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: role });

        // 3. Store user details in Realtime Database
        const userDbRef = admin.database().ref(`users/${userRecord.uid}`);
        await userDbRef.set({
            name: name,
            email: email,
            phone: phone || '',
            role: role,
            createdAt: new Date().toISOString(),
            // Add address if provided
            ...(address && { addresses: { 'main': { label: 'Main', street: address, city: 'Oujda' } } })
        });
        
        // 4. Send a password reset email so the user can set their own password
        await admin.auth().generatePasswordResetLink(email);


        res.status(200).json({ message: `Successfully created user ${email}. A password reset link has been sent to them.` });

    } catch (error) {
        console.error('Error creating new user:', error);
        res.status(500).json({ error: error.message || 'An internal error occurred.' });
    }
});


// --- START THE SERVER ---
const PORT = 3000; 
app.listen(PORT, () => {
  console.log(`🚀 Admin server running securely on http://localhost:${PORT}`);
});