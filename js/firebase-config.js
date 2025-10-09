// js/firebase-config.js
// Shared Firebase configuration for the app

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDTd4lvs1lzjKeGu7Ee91lM30-8v88h-ng",
    authDomain: "productivity-tracker-knf13.firebaseapp.com",
    projectId: "productivity-tracker-knf13",
    storageBucket: "productivity-tracker-knf13.appspot.com",
    messagingSenderId: "762035393571",
    appId: "1:762035393571:web:7d474a6a57cc031b860d96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export config for other modules that need it
export { firebaseConfig };

// Admin email (public, not a secret)
export const ADMIN_EMAIL = "submissions@forharriet.com";