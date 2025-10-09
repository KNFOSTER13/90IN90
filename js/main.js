// js/main.js
// Main application entry point.

import { initializeFirebase } from './firebase.js';
import { initializeEventListeners, applyFiltersAndSort } from './events.js';
import { 
    cacheDOMElements,
    initializeScrollObserver,
    updateWeeklyTheme, 
    updateProgress, 
    setupModals,
    updateChallengeDates 
} from './ui.js';


document.addEventListener('DOMContentLoaded', () => {
    // Ensure all DOM elements are available before doing anything else
    cacheDOMElements();

    // Initialize UI components
    initializeScrollObserver();
    updateChallengeDates();
    updateProgress();
    updateWeeklyTheme();
    setupModals();
    
    // Set up intervals
    setInterval(updateProgress, 60000);
    setInterval(updateWeeklyTheme, 60000 * 60);

    // Initialize Firebase
    initializeFirebase(applyFiltersAndSort);

    // Initialize event listeners
    initializeEventListeners();
});

