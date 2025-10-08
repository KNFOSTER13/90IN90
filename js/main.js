import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc, increment, serverTimestamp, runTransaction, getDoc, getDocs, writeBatch, limit, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// --- TYPE DEFINITIONS (JSDoc) ---
/**
 * @typedef {object} Entry
 * @property {string} id - The document ID.
 * @property {string} title - The title of the entry.
 * @property {string} description - A short description.
 * @property {string} link - URL to the content.
 * @property {string} contentType - The type of content (e.g., Video, Essay).
 * @property {string} access - Access level ('Free' or 'Paid').
 * @property {string} [imageUrl] - Optional URL for a thumbnail image.
 * @property {number} day - The day of the challenge this was created on.
 * @property {number} hearts - The number of hearts.
 * @property {'published' | 'scheduled' | 'draft'} status - The publication status.
 * @property {import("firebase/firestore").Timestamp} [timestamp] - Firestore server timestamp for published items.
 * @property {string} [scheduledFor] - ISO string for scheduled items.
 */

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDTd4lvs1lzjKeGu7Ee91lM30-8v88h-ng",
    authDomain: "productivity-tracker-knf13.firebaseapp.com",
    projectId: "productivity-tracker-knf13",
    storageBucket: "productivity-tracker-knf13.appspot.com",
    messagingSenderId: "762035393571",
    appId: "1:762035393571:web:7d474a6a57cc031b860d96"
};
const ADMIN_EMAIL = "submissions@forharriet.com";
const START_DATE = new Date('2025-10-09T00:00:00');
const TOTAL_DAYS = 90;
const END_DATE = new Date(START_DATE.getTime() + (TOTAL_DAYS * 24 * 60 * 60 * 1000));
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ENTRIES_PER_PAGE = 5;
const dropsCollectionPath = `artifacts/${firebaseConfig.projectId}/public/data/drops`;
const DRAFT_KEY = 'entryFormDraft';

// --- UTILITY FUNCTIONS ---
const getCurrentDay = () => {
    const now = new Date();
    if (now < START_DATE) return 0;
    if (now > END_DATE) return TOTAL_DAYS;
    const startOfDay = d => { const date = new Date(d); date.setHours(0,0,0,0); return date; };
    return Math.floor((startOfDay(now) - startOfDay(START_DATE)) / MS_PER_DAY) + 1;
};
const escapeHtml = str => str ? new DOMParser().parseFromString(str, 'text/html').body.textContent : '';
const debounce = (func, wait) => {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
};
const toJsDate = v => v?.toDate ? v.toDate() : new Date(v);

// --- INITIALIZATION ---
let db, auth, analytics, currentUser = null, isAdmin = false;

// --- GLOBAL STATE ---
const state = {
    allEntries: [],
    filteredEntries: [],
    currentFilter: 'all',
    currentSort: 'newest',
    searchQuery: '',
    heartedPosts: JSON.parse(localStorage.getItem('heartedPosts') || '{}'),
    editingEntryId: null,
    unsubscribeDrops: null,
    visiblePreviousEntries: ENTRIES_PER_PAGE,
    isLoading: false
};

// --- DOM ELEMENTS (Cached for performance) ---
const DOMElements = Object.fromEntries(
    [
        'header-day', 'header-entries', 'today-count', 'streak-count', 'header-streak',
        'free-count', 'paid-count', 'challenge-dates', 'admin-panel', 'admin-signin-btn', 'admin-signout-btn',
        'entry-form', 'publish-btn', 'publish-btn-text', 'cancel-edit-btn', 'clear-data-btn', 'search-input',
        'sort-select', 'skeleton-loaders', 'today-section', 'today-entries', 'previous-section', 'previous-entries',
        'load-more-container', 'empty-state', 'empty-state-message', 'subscribe-btn', 'hero-subscribe-btn',
        'subscribe-modal', 'close-subscribe', 'sms-modal', 'close-sms-modal', 'toast', 'toast-message',
        'toast-icon', 'content-feed', 'day-dots-container', 'schedule-toggle', 'schedule-options', 'feed-announcer',
        'welcome-modal', 'show-welcome-btn', 'close-welcome-modal', 'auto-save-status', 'save-draft-btn',
        'drafts-section', 'draft-entries', 'scheduled-section', 'scheduled-entries', 'weekly-theme', 'sprint-details'
    ].map(id => [id.replace(/-(\w)/g, (m, g) => g.toUpperCase()), document.getElementById(id)])
);

const weeklyThemes = [
    "Narratives, Myths & Lies",
    "Digital Selves & Authenticity",
    "The Aesthetics of Power",
    "Creator Economy & The Future of Work",
    "Black Feminist Thought in a Digital Age",
    "Nostalgia, Trends, and the Cultural Cycle",
    "Visual Storytelling & Online Identity",
    "The Art of the Critique",
    "Building Community in Public",
    "Rest, Leisure, and Liberatory Practice",
    "Money, Ambition, and Creative Integrity",
    "The Algorithm & The Archive",
    "Reflections & Future Forecasts"
];

// --- UI & FEEDBACK FUNCTIONS ---
const updateWeeklyTheme = () => {
    const now = new Date();
    if (now < START_DATE || now > END_DATE || !DOMElements.weeklyTheme) {
        if(DOMElements.weeklyTheme) DOMElements.weeklyTheme.parentElement.style.display = 'none';
        return;
    }
    const daysIntoSprint = Math.floor((now - START_DATE) / MS_PER_DAY);
    const weekNumber = Math.floor(daysIntoSprint / 7);

    let themeText = "Reflections & Future Forecasts";
    if (weekNumber >= 0 && weekNumber < weeklyThemes.length) {
        themeText = weeklyThemes[weekNumber];
    }
    DOMElements.weeklyTheme.innerHTML = `<strong class="font-bold">This Week’s Theme:</strong> ${themeText}`;
};

const updateProgress = () => {
    const day = getCurrentDay();
    if (DOMElements.headerDay) DOMElements.headerDay.textContent = day;
};

let toastTimeout;
const showToast = (message, type = 'success') => {
    clearTimeout(toastTimeout);
    const icons = {
        success: { path: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>`, color: 'text-green-500' },
        error: { path: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`, color: 'text-red-500' },
        warning: { path: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`, color: 'text-yellow-500' }
    };
    DOMElements.toastMessage.textContent = message;
    DOMElements.toast.className = `toast ${type}`;
    DOMElements.toastIcon.innerHTML = icons[type].path;
    DOMElements.toastIcon.setAttribute('class', `w-5 h-5 ${icons[type].color}`);
    DOMElements.toast.classList.add('show');
    toastTimeout = setTimeout(() => DOMElements.toast.classList.remove('show'), 5000);
};

// --- FORM HANDLING ---
const resetForm = () => {
    DOMElements.entryForm?.reset();
    state.editingEntryId = null;
    if(DOMElements.publishBtnText) DOMElements.publishBtnText.textContent = 'Publish It!';
    DOMElements.cancelEditBtn?.classList.add('hidden');
    clearDraftFromLocalStorage();
    checkFormValidity();
};

const populateFormForEdit = (entry) => {
    state.editingEntryId = entry.id;
    Object.entries({ title: entry.title, description: entry.description, link: entry.link, image: entry.imageUrl, type: entry.contentType, access: entry.access })
          .forEach(([key, value]) => { document.getElementById(`entry-${key}`).value = value || ''; });
    DOMElements.publishBtnText.textContent = 'Update Entry';
    DOMElements.cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: DOMElements.adminPanel.offsetTop - 80, behavior: 'smooth' });
    checkFormValidity();
};

const checkFormValidity = () => {
    if (!DOMElements.entryForm) return;
    const isValidLink = (link) => { try { new URL(link); return true; } catch { return false; }};
    const title = document.getElementById('entry-title').value.trim();
    const desc = document.getElementById('entry-description').value.trim();
    const link = document.getElementById('entry-link').value.trim();
    DOMElements.publishBtn.disabled = !(title && desc && isValidLink(link));
};

// --- DRAFT & AUTO-SAVE FUNCTIONS ---
const saveDraftToLocalStorage = () => {
    const draftData = {
        title: document.getElementById('entry-title').value,
        description: document.getElementById('entry-description').value,
        link: document.getElementById('entry-link').value,
        imageUrl: document.getElementById('entry-image').value,
        contentType: document.getElementById('entry-type').value,
        access: document.getElementById('entry-access').value,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    if (DOMElements.autoSaveStatus) {
        DOMElements.autoSaveStatus.textContent = `Draft saved locally at ${new Date().toLocaleTimeString()}`;
    }
};

const loadDraftFromLocalStorage = () => {
    const draftData = localStorage.getItem(DRAFT_KEY);
    if (draftData) {
        const data = JSON.parse(draftData);
        Object.entries(data).forEach(([key, value]) => {
            const elId = `entry-${key.replace('contentType', 'type').replace('imageUrl', 'image')}`;
            const el = document.getElementById(elId);
            if (el) el.value = value;
        });
        if (DOMElements.autoSaveStatus) DOMElements.autoSaveStatus.textContent = 'Loaded auto-saved draft.';
        checkFormValidity();
    }
};

const clearDraftFromLocalStorage = () => {
    localStorage.removeItem(DRAFT_KEY);
    if (DOMElements.autoSaveStatus) DOMElements.autoSaveStatus.textContent = '';
};

// --- RENDER FUNCTIONS ---
const createEntryCard = (entry, scrollObserver) => {
    const isHearted = state.heartedPosts[entry.id];
    const entryDate = toJsDate(entry.timestamp);
    const time = entryDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const fallbackImage = `https://placehold.co/400x300/7c3aed/ffffff?text=${encodeURIComponent(entry.contentType)}`;
    const imageUrl = entry.imageUrl || fallbackImage;

    const adminButtons = isAdmin ? `
        <button class="edit-btn text-muted hover:text-accent" data-id="${entry.id}" aria-label="Edit ${escapeHtml(entry.title)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path></svg>
        </button>
        <button class="delete-btn text-muted hover:text-error" data-id="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
    ` : '';
    
    const card = document.createElement('div');
    card.className = 'card flex flex-col md:flex-row relative';
    card.dataset.id = entry.id;
    card.dataset.contentType = entry.contentType;
    
    card.innerHTML = `
        <div class="md:w-48 aspect-[4/3] flex-shrink-0 image-container relative">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.title)}" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImage}';">
        </div>
        <div class="flex-1 p-4 md:p-5 flex flex-col">
            <span class="tag ${entry.access === 'Paid' ? 'tag-paid' : 'tag-free'} absolute top-3 right-3">${entry.access}</span>
            <div class="flex-grow space-y-2 mt-4">
                <h3 class="font-medium leading-tight hover:text-accent transition-colors">
                  <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5">${escapeHtml(entry.title)} <svg class="w-4 h-4 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>
                </h3>
                <p class="text-base text-muted line-clamp-3" style="line-height: 1.5;">${escapeHtml(entry.description)}</p>
            </div>
             <p class="text-xs text-muted mt-4">Day ${entry.day} • ${entry.contentType} • ${time}</p>
            <div class="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
                 <button class="heart-btn flex items-center gap-1.5 ${isHearted ? 'text-heart hearted' : 'text-muted hover:text-heart'}" data-id="${entry.id}" aria-label="${isHearted ? 'Remove heart' : 'Add heart'} from ${escapeHtml(entry.title)}">
                    <svg class="w-5 h-5" fill="${isHearted ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.25l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.5l-1.318-1.182a4.5 4.5 0 00-6.364 0z"></path></svg>
                    <span class="font-mono text-sm">${entry.hearts || 0}</span>
                </button>
                <button class="share-btn text-sm text-muted hover:text-primary ml-2" data-link="${escapeHtml(entry.link)}" data-title="${escapeHtml(entry.title)}">
                    Share
                </button>
                <div class="ml-auto flex items-center gap-3">${adminButtons}</div>
            </div>
        </div>
    `;
    scrollObserver.observe(card);
    return card;
};

const renderAdminLists = () => {
    const drafts = state.allEntries.filter(s => s.status === 'draft');
    const scheduled = state.allEntries.filter(s => s.status === 'scheduled');

    DOMElements.draftsSection.classList.toggle('hidden', drafts.length === 0);
    DOMElements.draftEntries.innerHTML = '';
    drafts.forEach(entry => {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-2 rounded hover:bg-white/5';
        el.innerHTML = `
            <span>${escapeHtml(entry.title)}</span>
            <div class="flex items-center gap-2">
                <button class="edit-btn text-muted hover:text-accent" data-id="${entry.id}" aria-label="Edit ${escapeHtml(entry.title)}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path></svg></button>
                <button class="delete-btn text-muted hover:text-error" data-id="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
        `;
        DOMElements.draftEntries.appendChild(el);
    });
    
    DOMElements.scheduledSection.classList.toggle('hidden', scheduled.length === 0);
};

const renderEntries = (scrollObserver) => {
    DOMElements.skeletonLoaders.classList.add('hidden');
    DOMElements.contentFeed.setAttribute('aria-busy', 'false');

    const day = getCurrentDay();
    const todayEntries = state.filteredEntries.filter(d => d.day === day);
    const previousEntries = state.filteredEntries.filter(d => d.day < day);
    
    const publishedEntries = state.allEntries.filter(d => d.status === 'published');
    const publishedEntriesCount = publishedEntries.length;
    
    DOMElements.headerEntries.textContent = publishedEntriesCount;
    DOMElements.todayCount.textContent = todayEntries.length;
    DOMElements.freeCount.textContent = publishedEntries.filter(d => d.access === 'Free').length;
    DOMElements.paidCount.textContent = publishedEntries.filter(d => d.access === 'Paid').length;
    const daysWithEntries = new Set(publishedEntries.map(d => d.day)).size;
    DOMElements.streakCount.textContent = daysWithEntries;
    DOMElements.headerStreak.textContent = daysWithEntries;

    DOMElements.todaySection.classList.toggle('hidden', todayEntries.length === 0);
    DOMElements.todayEntries.innerHTML = '';
    todayEntries.forEach(d => {
        const card = createEntryCard(d, scrollObserver);
        DOMElements.todayEntries.appendChild(card);
    });

    const previousToShow = previousEntries.slice(0, state.visiblePreviousEntries);
    DOMElements.previousSection.classList.toggle('hidden', previousToShow.length === 0);
    DOMElements.previousEntries.innerHTML = '';
    previousToShow.forEach(d => DOMElements.previousEntries.appendChild(createEntryCard(d, scrollObserver)));
    
    DOMElements.loadMoreContainer.innerHTML = ''; 
    if (previousEntries.length > state.visiblePreviousEntries) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Load More Entries';
        loadMoreBtn.className = 'btn btn-secondary';
        loadMoreBtn.onclick = () => {
            state.visiblePreviousEntries += ENTRIES_PER_PAGE;
            renderEntries(scrollObserver);
        };
        DOMElements.loadMoreContainer.appendChild(loadMoreBtn);
    }

    if (state.filteredEntries.length === 0 && todayEntries.length === 0) {
        DOMElements.emptyState.classList.remove('hidden');
        const emptyMsg = (state.searchQuery || state.currentFilter !== 'all') ? 'No entries found matching your criteria.' : 'No entries yet. Check back soon!';
        DOMElements.emptyStateMessage.textContent = emptyMsg;
        DOMElements.feedAnnouncer.textContent = emptyMsg;
    } else {
        DOMElements.emptyState.classList.add('hidden');
        DOMElements.feedAnnouncer.textContent = `Feed updated. Now showing ${state.filteredEntries.length} entries.`;
    }

    if (isAdmin) renderAdminLists();
    updateItemListSchema(publishedEntries.slice(0, 10));
};

const applyFiltersAndSort = (scrollObserver) => {
    state.visiblePreviousEntries = ENTRIES_PER_PAGE;
    const publishedEntries = state.allEntries.filter(d => d.status === 'published');
    state.filteredEntries = publishedEntries.filter(entry => {
        const search = state.searchQuery.toLowerCase();
        const matchesSearch = !search || entry.title.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search);
        const matchesFilter = state.currentFilter === 'all' || (['Free', 'Paid'].includes(state.currentFilter) ? entry.access === state.currentFilter : entry.contentType === state.currentFilter);
        return matchesSearch && matchesFilter;
    });

    state.filteredEntries.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        switch (state.currentSort) {
            case 'oldest': return timeA - timeB;
            case 'most-loved': return (b.hearts || 0) - (a.hearts || 0);
            case 'trending': return ((b.hearts || 0) / (Date.now() - timeB + MS_PER_DAY)) - ((a.hearts || 0) / (Date.now() - timeA + MS_PER_DAY));
            default: return timeB - timeA;
        }
    });
    renderEntries(scrollObserver);
    renderDayDots();
};

const setupFirestoreListener = (scrollObserver) => {
    if (state.unsubscribeDrops) state.unsubscribeDrops(); 
    const q = isAdmin ? query(collection(db, dropsCollectionPath)) : query(collection(db, dropsCollectionPath), where('status', '==', 'published'));

    state.unsubscribeDrops = onSnapshot(q, (snapshot) => {
        state.allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFiltersAndSort(scrollObserver);
    }, (error) => {
        console.error("Firestore listener error:", error);
        showToast("Error loading entries. Please refresh.", "error");
    });
};

const updateItemListSchema = (entries) => {
    document.getElementById('itemListSchema').textContent = JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList",
        "itemListElement": entries.map((entry, index) => ({
            "@type": "ListItem", "position": index + 1, "url": entry.link, "name": entry.title
        }))
    });
};

const renderDayDots = () => {
    const currentDay = getCurrentDay();
    DOMElements.dayDotsContainer.innerHTML = '';
    for (let i = 1; i <= TOTAL_DAYS; i++) {
        const dot = document.createElement('div');
        dot.className = `w-2 h-2 rounded-full day-dot ${i < currentDay ? 'bg-accent' : 'bg-muted'}`;
        if (i === currentDay) dot.classList.add('current');
        dot.title = `Day ${i}`;
        DOMElements.dayDotsContainer.appendChild(dot);
    }
}

const handleAdminFormSubmit = async (e) => {
    e.preventDefault();
    const entryData = {
        title: document.getElementById('entry-title').value.trim(),
        description: document.getElementById('entry-description').value.trim(),
        link: document.getElementById('entry-link').value.trim(),
        imageUrl: document.getElementById('entry-image').value.trim(),
        contentType: document.getElementById('entry-type').value,
        access: document.getElementById('entry-access').value,
    };
    
    DOMElements.publishBtn.querySelector('.loading-spinner').classList.remove('hidden');
    DOMElements.publishBtn.disabled = true;

    try {
        if (DOMElements.scheduleToggle.checked) {
            const date = document.getElementById('schedule-date').value;
            const time = document.getElementById('schedule-time').value;
            if (!date || !time) throw new Error("Please select a valid schedule date and time.");
            entryData.status = 'scheduled';
            entryData.scheduledFor = new Date(`${date}T${time}`).toISOString();
        } else {
            entryData.status = 'published';
            entryData.day = getCurrentDay();
            entryData.timestamp = serverTimestamp();
        }
        
        if (state.editingEntryId) {
            await updateDoc(doc(db, dropsCollectionPath, state.editingEntryId), entryData);
            showToast('Entry updated successfully!');
        } else {
            entryData.hearts = 0; 
            await addDoc(collection(db, dropsCollectionPath), entryData);
            showToast('Entry added successfully!');
        }
        resetForm();
    } catch (error) {
        showToast(error.message || "Could not save entry.", "error");
    } finally {
        DOMElements.publishBtn.querySelector('.loading-spinner').classList.add('hidden');
        checkFormValidity();
    }
};

const handleSaveAsDraft = async () => {
     const entryData = {
        title: document.getElementById('entry-title').value.trim() || 'Untitled Draft',
        description: document.getElementById('entry-description').value.trim(),
        link: document.getElementById('entry-link').value.trim(),
        imageUrl: document.getElementById('entry-image').value.trim(),
        contentType: document.getElementById('entry-type').value,
        access: document.getElementById('entry-access').value,
        status: 'draft',
    };

    try {
        if (state.editingEntryId && state.allEntries.find(s => s.id === state.editingEntryId)?.status === 'draft') {
            await updateDoc(doc(db, dropsCollectionPath, state.editingEntryId), entryData);
            showToast('Draft updated!');
        } else {
            await addDoc(collection(db, dropsCollectionPath), entryData);
            showToast('Saved as draft!');
        }
         resetForm();
    } catch (error) {
         showToast(error.message || "Could not save draft.", "error");
    }
};


const handleContentClick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const { id, link, title } = btn.dataset;
    
    if (btn.classList.contains('share-btn')) {
         if (navigator.share) {
            try { await navigator.share({ title, url: link }); } catch {}
        } else {
            navigator.clipboard.writeText(link);
            showToast('Link copied to clipboard!');
        }
        return;
    }

    if (!id) return;

    if (btn.classList.contains('delete-btn')) {
        if (window.confirm('Delete this entry? This cannot be undone.')) {
            await deleteDoc(doc(db, dropsCollectionPath, id));
            showToast('Entry deleted.');
        }
    } else if (btn.classList.contains('edit-btn')) {
        populateFormForEdit(state.allEntries.find(d => d.id === id));
    } else if (btn.classList.contains('heart-btn')) {
        if (state.heartedPosts[id]) return;
        
        state.heartedPosts[id] = true;
        localStorage.setItem('heartedPosts', JSON.stringify(state.heartedPosts));
        
        const heartCountSpan = btn.querySelector('span');
        heartCountSpan.textContent = parseInt(heartCountSpan.textContent, 10) + 1;
        btn.classList.add('text-heart', 'hearted');
        btn.setAttribute('aria-label', `Remove heart from ${escapeHtml(title)}`);

        try {
            await updateDoc(doc(db, dropsCollectionPath, id), { hearts: increment(1) });
        } catch (error) {
            state.heartedPosts[id] = false;
            localStorage.setItem('heartedPosts', JSON.stringify(state.heartedPosts));
            heartCountSpan.textContent = parseInt(heartCountSpan.textContent, 10) - 1;
            btn.classList.remove('text-heart', 'hearted');
            btn.setAttribute('aria-label', `Add heart to ${escapeHtml(title)}`);
            showToast('Could not save heart.', 'error');
        }
    }
};

const provider = new GoogleAuthProvider();
async function signInWithGoogle() {
    try { await signInWithPopup(auth, provider); showToast("Sign-in successful!", "success"); } 
    catch (error) { showToast(`Sign-in failed: ${error.message}`, "error"); }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });

    document.querySelectorAll('main .card, .fade-in-section, .hero-anim-item').forEach(el => scrollObserver.observe(el));

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        isAdmin = user?.email === ADMIN_EMAIL;
        
        document.body.classList.toggle('is-admin', isAdmin);
        DOMElements.adminPanel.classList.toggle('hidden', !isAdmin);
        DOMElements.adminSigninBtn.classList.toggle('hidden', isAdmin);
        DOMElements.adminSignoutBtn.classList.toggle('hidden', !isAdmin);
        
        if (isAdmin) {
            loadDraftFromLocalStorage();
        }
        
        if (!user) await signInAnonymously(auth);
        
        setupFirestoreListener(scrollObserver);
    });

    const endDate = new Date(START_DATE.getTime() + (TOTAL_DAYS - 1) * MS_PER_DAY);
    DOMElements.challengeDates.innerHTML = `${START_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} &mdash; ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    updateProgress();
    updateWeeklyTheme();
    setInterval(updateProgress, 60000);
    setInterval(updateWeeklyTheme, 60000 * 60);

    const setupModal = (modal, openBtns, closeBtn) => {
        openBtns.forEach(btn => btn?.addEventListener('click', () => modal?.classList.remove('hidden')));
        closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    };
    
    setupModal(DOMElements.welcomeModal, [DOMElements.showWelcomeBtn], DOMElements.closeWelcomeModal);
    setupModal(DOMElements.subscribeModal, [DOMElements.subscribeBtn, DOMElements.heroSubscribeBtn], DOMElements.closeSubscribe);

    DOMElements.entryForm?.addEventListener('submit', handleAdminFormSubmit);
    DOMElements.entryForm?.addEventListener('input', debounce(saveDraftToLocalStorage, 2000));
    DOMElements.contentFeed.addEventListener('click', handleContentClick);
    DOMElements.draftEntries?.addEventListener('click', handleContentClick);
    DOMElements.searchInput?.addEventListener('input', debounce(() => { state.searchQuery = DOMElements.searchInput.value; applyFiltersAndSort(scrollObserver); }, 300));
    DOMElements.sortSelect?.addEventListener('change', (e) => { state.currentSort = e.target.value; applyFiltersAndSort(scrollObserver); });
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        e.currentTarget.classList.add('active');
        state.currentFilter = e.currentTarget.dataset.filter;
        applyFiltersAndSort(scrollObserver);
    }));
    
    DOMElements.adminSigninBtn?.addEventListener('click', signInWithGoogle);
    DOMElements.adminSignoutBtn?.addEventListener('click', () => signOut(auth));
    DOMElements.saveDraftBtn?.addEventListener('click', handleSaveAsDraft);
    DOMElements.cancelEditBtn?.addEventListener('click', resetForm);
    DOMElements.clearDataBtn?.addEventListener('click', async () => {
        if (window.confirm('Are you sure you want to delete ALL entries? This is irreversible.')) {
            const snapshot = await getDocs(query(collection(db, dropsCollectionPath)));
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            showToast('All data cleared.');
        }
    });
    DOMElements.scheduleToggle?.addEventListener('change', e => DOMElements.scheduleOptions.classList.toggle('hidden', !e.target.checked));
    DOMElements.toast.addEventListener('click', e => { if (e.target.classList.contains('dismiss-toast')) DOMElements.toast.classList.remove('show'); });
});
