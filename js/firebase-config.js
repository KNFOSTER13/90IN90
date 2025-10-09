// js/firebase-config.js
// This file contains the shared Firebase configuration for the app.

// In a local environment, you can hardcode these.
// For production on GitHub, these values should be replaced by a CI/CD pipeline (like GitHub Actions)
// using secrets. This placeholder setup is for demonstration.
export const firebaseConfig = {
    apiKey: "%FIREBASE_API_KEY%",
    authDomain: "%FIREBASE_AUTH_DOMAIN%",
    projectId: "productivity-tracker-knf13",
    storageBucket: "%FIREBASE_STORAGE_BUCKET%",
    messagingSenderId: "%FIREBASE_MESSAGING_SENDER_ID%",
    appId: "%FIREBASE_APP_ID%"
};

// This is NOT a secret and can be public.
export const ADMIN_EMAIL = "submissions@forharriet.com";
