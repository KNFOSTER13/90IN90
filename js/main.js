// js/main.js
// Main application entry point.

import { initializeFirebase } from './firebase.js';
import { initializeEventListeners } from './events.js';
import { 
    initializeScrollObserver,
    updateWeeklyTheme, 
    updateProgress, 
    setupModals,
    updateChallengeDates 
} from './ui.js';


document.addEventListener('DOMContentLoaded', () => {
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
    initializeFirebase();

    // Initialize event listeners
    initializeEventListeners();
});
