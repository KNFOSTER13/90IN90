// js/firebase.js
// Handles all Firebase interactions for the main site

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, increment, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';
import { state } from './state.js';

let db;
let auth;
let dataCallback; 

export function initializeFirebase(onDataUpdate) {
    dataCallback = onDataUpdate;
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    setupAuthListener();
}

function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                await signInAnonymously(auth);
                console.log('Signed in anonymously');
            } catch (error) {
                console.error('Anonymous sign-in failed:', error);
            }
        }
        setupFirestoreListener();
    });
}

function setupFirestoreListener() {
    const dropsCollectionPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
    
    // Query for published entries, ordered by timestamp
    const q = query(
        collection(db, dropsCollectionPath), 
        where('status', '==', 'published'),
        orderBy('timestamp', 'desc')
    );
    
    onSnapshot(q, (snapshot) => {
        console.log(`Loaded ${snapshot.docs.length} entries from Firebase`);
        
        state.allEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Ensure all required fields have defaults
                hearts: data.hearts || 0,
                contentType: data.contentType || 'Essay',
                access: data.access || 'Free',
                day: data.day || 1,
                title: data.title || 'Untitled',
                description: data.description || '',
                link: data.link || '#'
            };
        });
        
        if (dataCallback) {
            dataCallback();
        }
    }, (error) => {
        console.error('Firebase listener error:', error);
        // Still call the callback to render empty state
        if (dataCallback) {
            dataCallback();
        }
    });
}

export async function heartPost(postId) {
    try {
        const dropsCollectionPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
        await updateDoc(doc(db, dropsCollectionPath, postId), { 
            hearts: increment(1) 
        });
        console.log('Heart added to post:', postId);
    } catch (error) {
        console.error('Error adding heart:', error);
        throw error;
    }
}