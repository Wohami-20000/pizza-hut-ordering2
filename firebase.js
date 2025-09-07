// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAg3A_jpphMH-BOmwJ8p4hUK8WGlSwpefQ",
  authDomain: "pizzahut-clone-app.firebaseapp.com",
  projectId: "pizzahut-clone-app",
  storageBucket: "pizzahut-clone-app.firebasestorage.app",
  messagingSenderId: "13674883842",
  appId: "1:13674883842:web:6c43460a8646e904c0301b"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

console.log("firebase.js: Firebase App Initialized and services exported.");

// Export the initialized services
export { db, auth };
