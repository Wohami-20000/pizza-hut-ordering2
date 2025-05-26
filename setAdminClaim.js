console.log("🚀 Script started..."); // DEBUG: entry point

const admin = require("firebase-admin");
const serviceAccount = require("C:\\coding\\pizza-hut-ordering1-main\\serviceAccountKey.json"); // Make sure this file exists!

console.log("🔐 Initializing Firebase Admin...");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pizzahut-orders-1-default-rtdb.firebaseio.com/"
});

const emailToMakeAdmin = "admin@pizzahut.com"; // Make sure this email exists in your Firebase Auth

console.log(`📧 Setting admin claim for: ${emailToMakeAdmin}`);

admin.auth().getUserByEmail(emailToMakeAdmin)
  .then((user) => {
    console.log("👤 User found:", user.uid);
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(`✅ Success! ${emailToMakeAdmin} is now an admin.`);
    return admin.auth().getUserByEmail(emailToMakeAdmin);
  })
  .then((user) => {
    console.log("🔍 Current custom claims:", user.customClaims);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error setting admin claim:", error);
    process.exit(1);
  });
