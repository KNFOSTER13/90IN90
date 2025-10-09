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
let currentCollectionPath = 'entries'; // Track which collection we're using

export function initializeFirebase(onDataUpdate) {
    dataCallback = onDataUpdate;
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('🔥 Firebase initialized');
    
    // Setup auth and load data
    setupAuthAndLoad();
}

async function setupAuthAndLoad() {
    try {
        // Sign in anonymously first
        await signInAnonymously(auth);
        console.log('✅ Signed in anonymously');
        
        // Load initial data
        await loadInitialData();
        
        // Setup real-time listener
        setupFirestoreListener();
    } catch (error) {
        console.error('Auth/Load error:', error);
        // Try loading without auth
        await loadInitialData();
    }
}

async function loadInitialData() {
    console.log('📊 Loading initial data...');
    
    try {
        // Try simple 'entries' collection first
        const entriesRef = collection(db, 'entries');
        const q = query(entriesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            console.log(`✅ Loaded ${snapshot.size} entries from 'entries' collection`);
            currentCollectionPath = 'entries';
            processSnapshot(snapshot);
            return;
        }
    } catch (error) {
        console.log('⚠️ Simple path failed, trying artifacts path...');
    }
    
    // Fallback to artifacts path
    try {
        const dropsPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
        const dropsRef = collection(db, dropsPath);
        const q = query(dropsRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            console.log(`✅ Loaded ${snapshot.size} entries from artifacts path`);
            currentCollectionPath = dropsPath;
            processSnapshot(snapshot);
            return;
        }
    } catch (error) {
        console.error('❌ Artifacts path failed:', error);
    }
    
    // No data found - use demo data
    console.log('📝 No database entries found, using demo data');
    createDemoData();
}

function createDemoData() {
    // Create some demo entries for testing
    const demoEntries = [
        {
            id: 'demo1',
            title: 'Welcome to the Creative Sprint',
            description: 'This is day 1 of my 90-day creative journey. Today I\'m exploring the intersection of culture and technology.',
            contentType: 'Essay',
            access: 'Free',
            status: 'published',
            hearts: 5,
            day: 1,
            link: '#',
            imageUrl: null,
            timestamp: new Date()
        },
        {
            id: 'demo2',
            title: 'Breaking Down Perfectionism',
            description: 'A video essay on why perfectionism holds us back and how daily practice builds creative confidence.',
            contentType: 'Video',
            access: 'Free',
            status: 'published',
            hearts: 12,
            day: 1,
            link: '#',
            imageUrl: null,
            timestamp: new Date()
        }
    ];
    
    state.allEntries = demoEntries;
    if (dataCallback) dataCallback();
}

function processSnapshot(snapshot) {
    const entries = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        
        // Only include published entries
        if (data.status !== 'published') return;
        
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
            timestamp: data.timestamp || data.createdAt || new Date()
        });
    });
    
    state.allEntries = entries;
    console.log(`✅ Processed ${entries.length} published entries`);
    
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
    return Math.max(1, Math.min(90, dayNum));
}

function setupFirestoreListener() {
    console.log('👂 Setting up real-time listener on:', currentCollectionPath);
    
    try {
        const collectionRef = collection(db, currentCollectionPath);
        const q = query(
            collectionRef, 
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc')
        );
        
        onSnapshot(q, 
            (snapshot) => {
                console.log('🔄 Real-time update:', snapshot.size, 'entries');
                processSnapshot(snapshot);
            },
            (error) => {
                console.error('❌ Real-time listener error:', error);
            }
        );
    } catch (error) {
        console.error('❌ Could not setup real-time listener:', error);
    }
}

export async function heartPost(postId) {
    if (!auth.currentUser) {
        console.warn('⚠️ User not authenticated, cannot add heart');
        return;
    }
    
    try {
        const docRef = doc(db, currentCollectionPath, postId);
        await updateDoc(docRef, { hearts: increment(1) });
        console.log('❤️ Heart added to post:', postId);
    } catch (error) {
        console.error('❌ Error adding heart:', error);
    }
}
