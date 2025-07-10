// deleteExpiredOffers.js

const admin = require("firebase-admin");

// Use the same service account key as your other admin scripts
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pizzahut-orders-1-default-rtdb.firebaseio.com" // Make sure this is your correct database URL
});

const db = admin.database();
const offersRef = db.ref('promoCodes');

async function deleteExpiredOffers() {
    console.log("Checking for expired offers...");
    const now = new Date();

    try {
        const snapshot = await offersRef.once('value');
        if (!snapshot.exists()) {
            console.log("No offers found to check.");
            return;
        }

        const offers = snapshot.val();
        const promises = [];

        for (const offerId in offers) {
            const offer = offers[offerId];
            if (offer.expiryDate) {
                const expiryDate = new Date(offer.expiryDate);
                if (expiryDate < now) {
                    console.log(`Offer "${offer.name}" (ID: ${offerId}) has expired. Deleting...`);
                    // Add the delete operation to an array of promises
                    promises.push(offersRef.child(offerId).remove());
                }
            }
        }

        if (promises.length === 0) {
            console.log("No expired offers to delete.");
        } else {
            // Wait for all delete operations to complete
            await Promise.all(promises);
            console.log(`Successfully deleted ${promises.length} expired offer(s).`);
        }

    } catch (error) {
        console.error("Error deleting expired offers:", error);
    } finally {
        // Close the database connection and exit the script
        db.goOffline();
        process.exit(0);
    }
}

deleteExpiredOffers();