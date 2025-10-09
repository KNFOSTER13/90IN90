// js/admin-auth.js - admin create / edit / delete with Firebase (clean ASCII)
import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
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
} from 'firebase/firestore';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();

// DOM refs
const signInBtn = document.getElementById('signin-btn');
const signOutBtn = document.getElementById('signout-btn');
const statusText = document.getElementById('status-text');
const adminPanel = document.getElementById('admin-panel');
const newEntryForm = document.getElementById('new-entry-form');
const entriesList = document.getElementById('entries-list');
const cancelEditBtn = document.getElementById('cancel-edit');

let editingId = null;

function show(el) { if (!el) return; el.classList.remove('hidden'); }
function hide(el) { if (!el) return; el.classList.add('hidden'); }

signInBtn.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); }
  catch (e) { console.error('Sign-in failed', e); alert('Sign in failed — check console.'); }
});

signOutBtn.addEventListener('click', async () => {
  await firebaseSignOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  console.log('onAuthStateChanged user:', user);
  if (!user) {
    statusText.textContent = 'Please sign in to manage sprint entries.';
    show(signInBtn); hide(signOutBtn); hide(adminPanel);
    entriesList.innerHTML = '';
    return;
  }

  const emailCandidates = [
    user.email,
    user.providerData && user.providerData[0] && user.providerData[0].email,
    (user.providerData || []).map(pd => pd.email).find(Boolean)
  ];
  const email = (emailCandidates.find(Boolean) || '').toString().toLowerCase();

  if (email && email === ADMIN_EMAIL) {
    statusText.textContent = `Signed in as ${email} (admin)`;
    hide(signInBtn); show(signOutBtn); show(adminPanel);
    await loadEntries();
  } else {
    statusText.textContent = `Signed in as ${email || user.displayName || '—'} — not authorized to manage entries.`;
    hide(signInBtn); show(signOutBtn); hide(adminPanel);
    entriesList.innerHTML = '';
  }
});

newEntryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('entry-title').value.trim();
  const body = document.getElementById('entry-body').value.trim();
  if (!title || !body) return alert('Fill title and body.');

  try {
    if (editingId) {
      await updateDoc(doc(db, 'entries', editingId), { title, body });
      editingId = null;
      if (cancelEditBtn) hide(cancelEditBtn);
    } else {
      await addDoc(collection(db, 'entries'), {
        title,
        body,
        createdAt: serverTimestamp()
      });
    }
    newEntryForm.reset();
    await loadEntries();
  } catch (err) {
    console.error('Save error', err);
    alert('Could not save entry. See console.');
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
  entriesList.innerHTML = 'Loading...';
  try {
    const q = query(collection(db, 'entries'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) { entriesList.innerHTML = '<p>No entries yet.</p>'; return; }
    const html = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const created = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString() : '—';
      html.push(`
        <div class="entry p-4 border rounded">
          <h3 class="text-lg font-semibold">${escapeHtml(d.title)}</h3>
          <div class="mt-2">${escapeHtml(d.body)}</div>
          <small class="text-sm text-muted block mt-2">${created}</small>
          <div class="mt-3 flex gap-2">
            <button class="btn btn-sm" onclick="editEntry('${id}')">Edit</button>
            <button class="btn btn-sm btn-ghost" onclick="deleteEntry('${id}')">Delete</button>
          </div>
        </div>
      `);
    });
    entriesList.innerHTML = html.join('');
  } catch (err) {
    console.error('Error loading entries', err);
    entriesList.innerHTML = '<p>Error loading entries (see console)</p>';
  }
}

window.deleteEntry = async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'entries', id));
    await loadEntries();
  } catch (err) {
    console.error('Delete failed', err);
    alert('Delete failed — check console.');
  }
};

window.editEntry = async function editEntry(id) {
  try {
    const dref = doc(db, 'entries', id);
    const docSnap = await getDoc(dref);
    if (!docSnap.exists()) return alert('Entry no longer exists.');
    const data = docSnap.data();
    document.getElementById('entry-title').value = data.title || '';
    document.getElementById('entry-body').value = data.body || '';
    editingId = id;
    if (cancelEditBtn) show(cancelEditBtn);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Edit fetch failed', err);
    alert('Could not load entry to edit.');
  }
};

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
