const admin = require("firebase-admin");

// Corrected: Use a relative path to load the service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Replace with the UID of the user to promote to admin
const uid = "O1BMcskZUBR71ZIeVorLZ1FwrWY2";

// Set the admin custom claim
admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Custom claim 'admin: true' set for user ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error setting custom claim:", error);
    process.exit(1);
  });