import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    query, 
    where, 
    doc, 
    updateDoc, 
    increment,
    orderBy,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
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
    
    // Start with loading static data first
    loadInitialData();
    
    // Then setup auth
    setupAuthListener();
}

// Load data immediately without waiting for auth
async function loadInitialData() {
    try {
        // Try to load from the simpler 'entries' collection first
        const entriesRef = collection(db, 'entries');
        const snapshot = await getDocs(entriesRef);
        
        if (!snapshot.empty) {
            console.log(`Loaded ${snapshot.size} entries from 'entries' collection`);
            processSnapshot(snapshot);
        } else {
            // Fallback to the complex path
            await loadFromArtifactsPath();
        }
    } catch (error) {
        console.log('Trying alternative collection path...', error);
        await loadFromArtifactsPath();
    }
}

async function loadFromArtifactsPath() {
    try {
        const dropsPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
        const dropsRef = collection(db, dropsPath);
        const snapshot = await getDocs(dropsRef);
        
        if (!snapshot.empty) {
            console.log(`Loaded ${snapshot.size} entries from artifacts path`);
            processSnapshot(snapshot);
        } else {
            // No data found
            console.log('No entries found in database');
            state.allEntries = [];
            if (dataCallback) dataCallback();
        }
    } catch (error) {
        console.error('Error loading from artifacts path:', error);
        state.allEntries = [];
        if (dataCallback) dataCallback();
    }
}

function processSnapshot(snapshot) {
    const entries = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        entries.push({
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description || data.body || '',
            contentType: data.contentType || 'Essay',
            access: data.access || 'Free',
            status: data.status || 'published',
            hearts: data.hearts || 0,
            day: data.day || calculateDay(data.timestamp || data.createdAt),
            link: data.link || '#',
            imageUrl: data.imageUrl || null,
            timestamp: data.timestamp || data.createdAt || null
        });
    });
    
    // Filter only published entries
    state.allEntries = entries.filter(e => e.status === 'published');
    console.log(`Processed ${state.allEntries.length} published entries`);
    
    if (dataCallback) {
        dataCallback();
    }
}

function calculateDay(timestamp) {
    if (!timestamp) return 1;
    
    const START_DATE = new Date('2025-10-13T00:00:00');
    const entryDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    const dayNum = Math.floor((entryDate - START_DATE) / MS_PER_DAY) + 1;
    return Math.max(1, Math.min(90, dayNum)); // Clamp between 1 and 90
}

function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                await signInAnonymously(auth);
                console.log('Signed in anonymously');
            } catch (error) {
                console.warn('Anonymous auth failed, continuing without auth:', error);
            }
        }
        // Setup real-time listener after auth
        setupFirestoreListener();
    });
}

function setupFirestoreListener() {
    // Try the simple path first
    try {
        const entriesRef = collection(db, 'entries');
        const q = query(entriesRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                console.log('Real-time update:', snapshot.size, 'entries');
                processSnapshot(snapshot);
            },
            (error) => {
                console.log('Falling back to artifacts path for real-time updates');
                setupArtifactsListener();
            }
        );
    } catch (error) {
        setupArtifactsListener();
    }
}

function setupArtifactsListener() {
    try {
        const dropsPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
        const dropsRef = collection(db, dropsPath);
        const q = query(dropsRef, where('status', '==', 'published'), orderBy('timestamp', 'desc'));
        
        onSnapshot(q, 
            (snapshot) => {
                console.log('Real-time update from artifacts:', snapshot.size, 'entries');
                processSnapshot(snapshot);
            },
            (error) => {
                console.error('Real-time listener error:', error);
            }
        );
    } catch (error) {
        console.error('Could not setup real-time listener:', error);
    }
}

export async function heartPost(postId) {
    if (!auth.currentUser) {
        console.warn('User not authenticated, cannot add heart');
        return;
    }
    
    try {
        // Try simple path first
        let docRef = doc(db, 'entries', postId);
        await updateDoc(docRef, { hearts: increment(1) });
        console.log('Heart added to post:', postId);
    } catch (error) {
        // Try artifacts path
        try {
            const dropsPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
            docRef = doc(db, dropsPath, postId);
            await updateDoc(docRef, { hearts: increment(1) });
            console.log('Heart added to post (artifacts path):', postId);
        } catch (err) {
            console.error('Error adding heart:', err);
            throw err;
        }
    }
}