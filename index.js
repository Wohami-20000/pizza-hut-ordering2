// index.js

// This script acts as a router based on user state and URL parameters.
document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(user => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get('table');

    // --- SCENARIO 1: NFC SCAN (Dine-in) ---
    // A 'table' parameter in the URL always means a dine-in order.
    if (tableNumber) {
        localStorage.setItem('orderType', 'dineIn');
        localStorage.setItem('tableNumber', tableNumber);
        console.log(`NFC Scan: Detected table number ${tableNumber}. Setting order type to dine-in.`);

        // If a user is already logged in (even a guest), we respect that session
        // and send them straight to the menu.
        if (user) {
            console.log("NFC Scan for a logged-in user. Redirecting to menu.");
            window.location.href = 'menu.html';
        } 
        // If there's no active user session, we create a guest session for them.
        else {
            firebase.auth().signInAnonymously()
                .then(() => {
                    console.log("NFC Scan for a new user. Signed in as guest. Redirecting to menu.");
                    window.location.href = 'menu.html';
                })
                .catch((error) => {
                    console.error("Anonymous sign-in for NFC scan failed:", error);
                    // Fallback: Still try to go to the menu. The app may handle it.
                    window.location.href = 'menu.html';
                });
        }
    } 
    // --- SCENARIO 2: STANDARD WEBSITE VISIT (Delivery/Pickup) ---
    // No 'table' parameter means the user is visiting from outside.
    else {
        // If the user is logged in (but not a guest), they are a returning customer.
        if (user && !user.isAnonymous) {
            console.log("Existing user visiting site. Redirecting to order type selection.");
            window.location.href = 'order-type-selection.html';
        } 
        // If there's no user or the user is just a guest from a previous session,
        // they need to log in or sign up.
        else {
            console.log("New or guest user visiting site. Redirecting to authentication page.");
            window.location.href = 'auth.html';
        }
    }
  });
});