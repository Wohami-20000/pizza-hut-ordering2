const admin = require("firebase-admin");

// Replace with your actual path to the service account key file
const serviceAccount = require("C:/coding/pizza-hut-ordering1-main/serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Replace with the UID of the user to promote to admin
const uid = "0o8oV1E67PTsmAuQypuWiIawN1v1";

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
