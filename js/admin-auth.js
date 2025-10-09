// js/admin-auth.js - admin create / edit / delete with Firebase
import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// Use the ADMIN_EMAIL from environment or fallback
const ADMIN_EMAIL = 'submissions@forharriet.com'.toLowerCase();

// DOM refs
const signInBtn = document.getElementById('signin-btn');
const signOutBtn = document.getElementById('signout-btn');
const statusText = document.getElementById('status-text');
const adminPanel = document.getElementById('admin-panel');
const authGate = document.getElementById('auth-gate');
const newEntryForm = document.getElementById('new-entry-form');
const entriesList = document.getElementById('entries-list');
const cancelEditBtn = document.getElementById('cancel-edit');

let editingId = null;

function show(el) { 
  if (!el) return; 
  el.classList.remove('hidden'); 
}

function hide(el) { 
  if (!el) return; 
  el.classList.add('hidden'); 
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

signInBtn?.addEventListener('click', async () => {
  try { 
    await signInWithPopup(auth, provider);
    showToast('Sign in successful', 'success');
  }
  catch (e) { 
    console.error('Sign-in failed', e);
    showToast('Sign in failed - check console', 'error');
  }
});

signOutBtn?.addEventListener('click', async () => {
  await firebaseSignOut(auth);
  showToast('Signed out', 'info');
});

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user?.email);
  
  if (!user) {
    statusText.textContent = 'Please sign in to manage sprint entries.';
    show(signInBtn);
    hide(signOutBtn);
    hide(adminPanel);
    entriesList.innerHTML = '';
    return;
  }

  // Get the user's email
  const email = (user.email || '').toLowerCase();

  if (email === ADMIN_EMAIL) {
    statusText.textContent = `Signed in as ${email} (admin)`;
    hide(signInBtn);
    show(signOutBtn);
    show(adminPanel);
    await loadEntries();
  } else {
    statusText.textContent = `Signed in as ${email} - not authorized to manage entries.`;
    hide(signInBtn);
    show(signOutBtn);
    hide(adminPanel);
    entriesList.innerHTML = '';
  }
});

newEntryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const titleInput = document.getElementById('entry-title');
  const bodyInput = document.getElementById('entry-body');
  
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  
  if (!title || !body) {
    showToast('Please fill in both title and body', 'warning');
    return;
  }

  try {
    // Use the correct collection path for the drops
    const dropsCollectionPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
    
    if (editingId) {
      await updateDoc(doc(db, dropsCollectionPath, editingId), { 
        title, 
        description: body,
        updatedAt: serverTimestamp()
      });
      showToast('Entry updated successfully', 'success');
      editingId = null;
      if (cancelEditBtn) hide(cancelEditBtn);
    } else {
      // Create new entry with the proper structure
      await addDoc(collection(db, dropsCollectionPath), {
        title,
        description: body,
        contentType: 'Essay', // Default type
        access: 'Free', // Default access
        status: 'published',
        hearts: 0,
        day: getCurrentDay(),
        link: '#', // You may want to add a link field to your form
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      showToast('Entry created successfully', 'success');
    }
    
    newEntryForm.reset();
    await loadEntries();
  } catch (err) {
    console.error('Save error', err);
    showToast('Could not save entry. See console.', 'error');
  }
});

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editingId = null;
    newEntryForm.reset();
    hide(cancelEditBtn);
  });
}

async function loadEntries() {
  entriesList.innerHTML = '<div class="loading-spinner mx-auto"></div>';
  
  try {
    const dropsCollectionPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
    const q = query(collection(db, dropsCollectionPath), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    
    if (snap.empty) { 
      entriesList.innerHTML = '<p class="text-muted">No entries yet.</p>'; 
      return; 
    }
    
    const html = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const created = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : '—';
      
      html.push(`
        <div class="card p-4">
          <h3 class="text-lg font-semibold">${escapeHtml(d.title)}</h3>
          <div class="mt-2 text-text-secondary">${escapeHtml(d.description)}</div>
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
    entriesList.innerHTML = html.join('');
  } catch (err) {
    console.error('Error loading entries', err);
    entriesList.innerHTML = '<p class="text-error">Error loading entries (see console)</p>';
  }
}

// Calculate current day based on sprint start date
function getCurrentDay() {
  const START_DATE = new Date('2025-10-13T00:00:00');
  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  
  if (now < START_DATE) return 0;
  
  const startOfDay = d => { 
    const date = new Date(d); 
    date.setHours(0, 0, 0, 0); 
    return date; 
  };
  
  return Math.floor((startOfDay(now) - startOfDay(START_DATE)) / MS_PER_DAY) + 1;
}

window.deleteEntry = async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  
  try {
    const dropsCollectionPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
    await deleteDoc(doc(db, dropsCollectionPath, id));
    showToast('Entry deleted', 'success');
    await loadEntries();
  } catch (err) {
    console.error('Delete failed', err);
    showToast('Delete failed - check console', 'error');
  }
};

window.editEntry = async function editEntry(id) {
  try {
    const dropsCollectionPath = `artifacts/productivity-tracker-knf13/public/data/drops`;
    const dref = doc(db, dropsCollectionPath, id);
    const docSnap = await getDoc(dref);
    
    if (!docSnap.exists()) {
      showToast('Entry no longer exists', 'warning');
      return;
    }
    
    const data = docSnap.data();
    document.getElementById('entry-title').value = data.title || '';
    document.getElementById('entry-body').value = data.description || data.body || '';
    
    editingId = id;
    if (cancelEditBtn) show(cancelEditBtn);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Edit fetch failed', err);
    showToast('Could not load entry to edit', 'error');
  }
};

function escapeHtml(s = '') {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}