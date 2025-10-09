// js/ui.js
// Handles all DOM manipulation and UI updates.

import { state } from './state.js';
import { escapeHtml, toJsDate, getCurrentDay } from './utils.js';
import { weeklyThemes, ENTRIES_PER_PAGE, START_DATE, TOTAL_DAYS } from './config.js';

// Cache DOM elements for performance
const DOMElements = Object.fromEntries(
    [
        'header-day', 'header-entries', 'today-count', 'streak-count', 'header-streak',
        'free-count', 'paid-count', 'challenge-dates', 'search-input',
        'sort-select', 'skeleton-loaders', 'today-section', 'today-entries', 'previous-section', 'previous-entries',
        'load-more-container', 'empty-state', 'empty-state-message', 'subscribe-btn', 'hero-subscribe-btn',
        'subscribe-modal', 'close-subscribe', 'sms-modal', 'close-sms-modal', 'toast',
        'content-feed', 'day-dots-container', 'feed-announcer',
        'welcome-modal', 'show-welcome-btn', 'close-welcome-modal', 'weekly-theme', 'newsletter-secondary-btn'
    ].map(id => [id.replace(/-(\w)/g, (m, g) => g.toUpperCase()), document.getElementById(id)])
);

let scrollObserver;

export function initializeScrollObserver() {
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
    }, { threshold: 0.1 });
}


function createEntryCard(entry) {
    const isHearted = state.heartedPosts[entry.id];
    const entryDate = toJsDate(entry.timestamp);
    const time = entryDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const fallbackImage = `https://knfoster13.github.io/90IN90/images/90in90transparent40glow.png`;
    const imageUrl = entry.imageUrl || fallbackImage;

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
            </div>
        </div>
    `;
    scrollObserver.observe(card);
    return card;
};

export function renderEntries() {
    DOMElements.skeletonLoaders.classList.add('hidden');
    DOMElements.contentFeed.setAttribute('aria-busy', 'false');

    const day = getCurrentDay();
    const todayEntries = state.filteredEntries.filter(d => d.day === day);
    const previousEntries = state.filteredEntries.filter(d => d.day < day);

    const publishedEntriesCount = state.allEntries.length;

    DOMElements.headerEntries.textContent = publishedEntriesCount;
    DOMElements.todayCount.textContent = todayEntries.length;
    DOMElements.freeCount.textContent = state.allEntries.filter(d => d.access === 'Free').length;
    DOMElements.paidCount.textContent = state.allEntries.filter(d => d.access === 'Paid').length;
    const daysWithEntries = new Set(state.allEntries.map(d => d.day)).size;
    DOMElements.streakCount.textContent = daysWithEntries;
    DOMElements.headerStreak.textContent = daysWithEntries;

    DOMElements.todaySection.classList.toggle('hidden', todayEntries.length === 0);
    DOMElements.todayEntries.innerHTML = '';
    todayEntries.forEach(d => DOMElements.todayEntries.appendChild(createEntryCard(d)));

    const previousToShow = previousEntries.slice(0, state.visiblePreviousEntries);
    DOMElements.previousSection.classList.toggle('hidden', previousToShow.length === 0);
    DOMElements.previousEntries.innerHTML = '';
    previousToShow.forEach(d => DOMElements.previousEntries.appendChild(createEntryCard(d)));

    DOMElements.loadMoreContainer.innerHTML = '';
    if (previousEntries.length > state.visiblePreviousEntries) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Load More Entries';
        loadMoreBtn.className = 'btn btn-secondary';
        loadMoreBtn.onclick = () => {
            state.visiblePreviousEntries += ENTRIES_PER_PAGE;
            renderEntries();
        };
        DOMElements.loadMoreContainer.appendChild(loadMoreBtn);
    }

    if (state.filteredEntries.length === 0 && todayEntries.length === 0) {
        DOMElements.emptyState.classList.remove('hidden');
        DOMElements.emptyStateMessage.textContent = (state.searchQuery || state.currentFilter !== 'all') ? 'No entries found.' : 'No entries yet.';
    } else {
        DOMElements.emptyState.classList.add('hidden');
    }
}

export function updateWeeklyTheme() {
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    if (!DOMElements.weeklyTheme) return;

    if (now < START_DATE) {
        const daysUntilStart = Math.ceil((START_DATE - now) / MS_PER_DAY);
        let startMessage = `Sprint Starts in ${daysUntilStart} days!`;
        if (daysUntilStart === 1) startMessage = `Sprint Starts Tomorrow!`;
        else if (daysUntilStart <= 0) startMessage = `Sprint Starts Today!`;
        DOMElements.weeklyTheme.innerHTML = `<strong class="font-bold">${startMessage}</strong> First theme: ${weeklyThemes[0]}`;
        DOMElements.weeklyTheme.parentElement.style.display = 'inline-block';
        return;
    }
    
    const END_DATE = new Date(START_DATE.getTime() + (TOTAL_DAYS * MS_PER_DAY));
    if (now > END_DATE) {
        DOMElements.weeklyTheme.parentElement.style.display = 'none';
        return;
    }

    const daysIntoSprint = Math.floor((now - START_DATE) / MS_PER_DAY);
    const weekNumber = Math.floor(daysIntoSprint / 7);

    let themeText = "Reflections & Future Forecasts";
    if (weekNumber >= 0 && weekNumber < weeklyThemes.length) {
        themeText = weeklyThemes[weekNumber];
    }
    DOMElements.weeklyTheme.innerHTML = `<strong class="font-bold">This Week's Theme:</strong> ${themeText}`;
    DOMElements.weeklyTheme.parentElement.style.display = 'inline-block';
};

export function updateProgress() {
    const day = getCurrentDay();
    if (DOMElements.headerDay) DOMElements.headerDay.textContent = day;
};

export function setupModals() {
    const setupModal = (modal, openBtns, closeBtn) => {
        const openModal = () => modal?.classList.remove('hidden');
        const closeModal = () => modal?.classList.add('hidden');
        openBtns.forEach(btn => btn?.addEventListener('click', openModal));
        closeBtn?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    };

    setupModal(DOMElements.welcomeModal, [DOMElements.showWelcomeBtn], DOMElements.closeWelcomeModal);
    setupModal(DOMElements.subscribeModal, [DOMElements.subscribeBtn, DOMElements.heroSubscribeBtn, DOMElements.newsletterSecondaryBtn], DOMElements.closeSubscribe);
}

export function updateChallengeDates() {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const endDate = new Date(START_DATE.getTime() + ((TOTAL_DAYS - 1) * MS_PER_DAY));
    DOMElements.challengeDates.innerHTML = `${START_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} &mdash; ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}
