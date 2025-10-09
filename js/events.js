// js/events.js
// Sets up all event listeners for the application.

import { state, updateHeartedPosts } from './state.js';
import { renderEntries } from './ui.js';
import { heartPost } from './firebase.js';
import { debounce } from './utils.js';

export function applyFiltersAndSort() {
    state.visiblePreviousEntries = 5; // Reset pagination
    
    state.filteredEntries = state.allEntries.filter(entry => {
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
            default: return timeB - timeA;
        }
    });

    renderEntries();
}

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.currentTarget.classList.add('active');
            state.currentFilter = e.currentTarget.dataset.filter;
            applyFiltersAndSort();
        });
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        applyFiltersAndSort();
    }, 300));
}

function setupSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    sortSelect?.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        applyFiltersAndSort();
    });
}

function setupContentFeedActions() {
    const contentFeed = document.getElementById('content-feed');
    contentFeed.addEventListener('click', async (e) => {
        const btn = e.target.closest('.heart-btn');
        if (btn && !btn.classList.contains('hearted')) {
             const id = btn.dataset.id;
             
             const newHeartedPosts = { ...state.heartedPosts, [id]: true };
             updateHeartedPosts(newHeartedPosts);

             btn.classList.add('text-heart', 'hearted');
             const heartCountSpan = btn.querySelector('span');
             heartCountSpan.textContent = parseInt(heartCountSpan.textContent, 10) + 1;
             
             await heartPost(id);
        }
    });
}


export function initializeEventListeners() {
    setupFilterButtons();
    setupSearchInput();
    setupSortSelect();
    setupContentFeedActions();
}
