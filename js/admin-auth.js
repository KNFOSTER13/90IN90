import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const ADMIN_EMAIL = 'submissions@forharriet.com'.toLowerCase();

// DOM refs with null checks
const signInBtn = document.getElementById('signin-btn');
const signOutBtn = document.getElementById('signout-btn');
const statusText = document.getElementById('status-text');
const adminPanel = document.getElementById('admin-panel');
const newEntryForm = document.getElementById('new-entry-form');
const entriesList = document.getElementById('entries-list');
const cancelEditBtn = document.getElementById('cancel-edit');

let editingId = null;
let currentCollectionPath = 'entries'; // Start with simple path

function show(el) { 
  if (el) el.classList.remove('hidden'); 
}

function hide(el) { 
  if (el) el.classList.add('hidden'); 
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

if (signInBtn) {
  signInBtn.addEventListener('click', async () => {
    try { 
      const result = await signInWithPopup(auth, provider);
      console.log('Sign in successful:', result.user.email);
      showToast('Sign in successful', 'success');
    }
    catch (e) { 
      console.error('Sign-in failed', e);
      showToast('Sign in failed: ' + e.message, 'error');
    }
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    await firebaseSignOut(auth);
    showToast('Signed out', 'info');
  });
}

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user?.email);
  
  if (!user) {
    if (statusText) statusText.textContent = 'Please sign in to manage sprint entries.';
    show(signInBtn);
    hide(signOutBtn);
    hide(adminPanel);
    if (entriesList) entriesList.innerHTML = '';
    return;
  }

  const email = (user.email || '').toLowerCase();

  if (email === ADMIN_EMAIL) {
    if (statusText) statusText.textContent = `Signed in as ${email} (admin)`;
    hide(signInBtn);
    show(signOutBtn);
    show(adminPanel);
    await loadEntries();
  } else {
    if (statusText) statusText.textContent = `Signed in as ${email} - not authorized.`;
    hide(signInBtn);
    show(signOutBtn);
    hide(adminPanel);
    if (entriesList) entriesList.innerHTML = '';
  }
});

if (newEntryForm) {
  newEntryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('entry-title');
    const bodyInput = document.getElementById('entry-body');
    
    if (!titleInput || !bodyInput) return;
    
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    
    if (!title || !body) {
      showToast('Please fill in both title and body', 'warning');
      return;
    }

    try {
      const entryData = {
        title,
        description: body,
        body, // Include both for compatibility
        contentType: 'Essay',
        access: 'Free',
        status: 'published',
        hearts: 0,
        day: getCurrentDay(),
        link: '#',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      if (editingId) {
        await updateDoc(doc(db, currentCollectionPath, editingId), {
          ...entryData,
          updatedAt: serverTimestamp()
        });
        showToast('Entry updated successfully', 'success');
        editingId = null;
        hide(cancelEditBtn);
      } else {
        await addDoc(collection(db, currentCollectionPath), entryData);
        showToast('Entry created successfully', 'success');
      }
      
      newEntryForm.reset();
      await loadEntries();
    } catch (err) {
      console.error('Save error', err);
      showToast('Error: ' + err.message, 'error');
    }
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editingId = null;
    if (newEntryForm) newEntryForm.reset();
    hide(cancelEditBtn);
  });
}

async function loadEntries() {
  if (!entriesList) return;
  
  entriesList.innerHTML = '<div class="loading-spinner mx-auto"></div>';
  
  try {
    // Try simple path first
    let q = query(collection(db, 'entries'), orderBy('createdAt', 'desc'));
    let snap = await getDocs(q);
    
    if (snap.empty) {
      // Try artifacts path
      currentCollectionPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
      q = query(collection(db, currentCollectionPath), orderBy('timestamp', 'desc'));
      snap = await getDocs(q);
    } else {
      currentCollectionPath = 'entries';
    }
    
    if (snap.empty) { 
      entriesList.innerHTML = '<p class="text-muted">No entries yet. Create your first entry above!</p>'; 
      return; 
    }
    
    const entries = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const timestamp = d.timestamp || d.createdAt;
      const created = timestamp ? 
        (timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)).toLocaleString() 
        : 'Unknown date';
      
      entries.push(`
        <div class="card p-4">
          <h3 class="text-lg font-semibold">${escapeHtml(d.title)}</h3>
          <div class="mt-2 text-text-secondary">${escapeHtml(d.description || d.body || '')}</div>
          <div class="mt-2 flex gap-4 text-sm text-muted">
            <span>Type: ${d.contentType || 'N/A'}</span>
            <span>Access: ${d.access || 'N/A'}</span>
            <span>Status: ${d.status || 'N/A'}</span>
            <span>Hearts: ${d.hearts || 0}</span>
          </div>
          <small class="text-sm text-muted block mt-2">${created}</small>
          <div class="mt-3 flex gap-2">
            <button class="btn btn-secondary text-sm" onclick="editEntry('${id}')">Edit</button>
            <button class="btn btn-secondary text-sm" onclick="deleteEntry('${id}')">Delete</button>
          </div>
        </div>
      `);
    });
    
    entriesList.innerHTML = entries.join('');
    console.log(`Loaded ${entries.length} entries from ${currentCollectionPath}`);
    
  } catch (err) {
    console.error('Error loading entries:', err);
    entriesList.innerHTML = `<p class="text-error">Error: ${err.message}</p>`;
  }
}

function getCurrentDay() {
  const START_DATE = new Date('2025-10-13T00:00:00');
  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  
  if (now < START_DATE) return 1;
  
  const dayNum = Math.floor((now - START_DATE) / MS_PER_DAY) + 1;
  return Math.max(1, Math.min(90, dayNum));
}

window.deleteEntry = async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  
  try {
    await deleteDoc(doc(db, currentCollectionPath, id));
    showToast('Entry deleted', 'success');
    await loadEntries();
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Delete failed: ' + err.message, 'error');
  }
};

window.editEntry = async function editEntry(id) {
  try {
    const docSnap = await getDoc(doc(db, currentCollectionPath, id));
    
    if (!docSnap.exists()) {
      showToast('Entry no longer exists', 'warning');
      return;
    }
    
    const data = docSnap.data();
    const titleInput = document.getElementById('entry-title');
    const bodyInput = document.getElementById('entry-body');
    
    if (titleInput) titleInput.value = data.title || '';
    if (bodyInput) bodyInput.value = data.description || data.body || '';
    
    editingId = id;
    show(cancelEditBtn);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Edit fetch failed:', err);
    showToast('Could not load entry: ' + err.message, 'error');
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}