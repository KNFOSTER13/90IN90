// js/state.js
// Manages the application's global state.

export const state = {
    allEntries: [],
    filteredEntries: [],
    currentFilter: 'all',
    currentSort: 'newest',
    searchQuery: '',
    heartedPosts: JSON.parse(localStorage.getItem('heartedPosts') || '{}'),
    visiblePreviousEntries: 5, // Corresponds to ENTRIES_PER_PAGE
};

export function updateHeartedPosts(newHeartedPosts) {
    state.heartedPosts = newHeartedPosts;
    localStorage.setItem('heartedPosts', JSON.stringify(newHeartedPosts));
}
