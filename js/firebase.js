// js/firebase.js
// Handles all Firebase interactions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';
import { state } from './state.js';
import { applyFiltersAndSort } from './events.js';

let db;
let auth;

export function initializeFirebase() {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    setupAuthListener();
}

function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            await signInAnonymously(auth);
        }
        setupFirestoreListener();
    });
}

function setupFirestoreListener() {
    const dropsCollectionPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
    const q = query(collection(db, dropsCollectionPath), where('status', '==', 'published'));
    
    onSnapshot(q, (snapshot) => {
        state.allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFiltersAndSort();
    });
}

export async function heartPost(postId) {
    const dropsCollectionPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
    await updateDoc(doc(db, dropsCollectionPath, postId), { hearts: increment(1) });
}
