// js/main.js - Complete Fixed Version
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

// Force hero section to be visible
function showHeroSection() {
    console.log('🎭 Showing hero section...');
    
    // Select all hero elements
    const heroItems = document.querySelectorAll('.hero-anim-item');
    const heroTagline = document.getElementById('hero-tagline');
    const newsreaderText = document.querySelector('.font-newsreader');
    const heroImage = document.querySelector('.hero-image');
    const heroSection = document.querySelector('section[aria-labelledby="hero-title"]');
    
    // Force visibility on everything
    [heroSection, heroImage, heroTagline, newsreaderText, ...heroItems].forEach(el => {
        if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.style.visibility = 'visible';
            el.style.display = el.tagName === 'IMG' ? 'block' : '';
            el.classList.add('is-visible');
        }
    });
    
    // Force buttons and links to be visible and clickable
    const interactiveElements = [
        '#hero-subscribe-btn',
        '#newsletter-secondary-btn', 
        '#show-welcome-btn',
        'a[href="sms-optin.html"]'
    ];
    
    interactiveElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.pointerEvents = 'auto';
            el.style.display = 'inline-flex';
        });
    });
    
    // Force all .link-secondary to be visible
    document.querySelectorAll('.link-secondary').forEach(link => {
        link.style.opacity = '1';
        link.style.visibility = 'visible';
        link.style.display = 'inline-block';
        link.style.pointerEvents = 'auto';
    });
    
    console.log('✅ Hero section forced visible');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initializing...');
    
    // Cache DOM elements first
    cacheDOMElements();

    // CRITICAL: Force hero section to show immediately
    showHeroSection();

    // Initialize UI components
    initializeScrollObserver();
    updateChallengeDates();
    updateProgress();
    updateWeeklyTheme();
    setupModals();
    
    // Set up intervals for updates
    setInterval(updateProgress, 60000);
    setInterval(updateWeeklyTheme, 60000 * 60);

    // Initialize Firebase and load data
    initializeFirebase(applyFiltersAndSort);

    // Initialize event listeners
    initializeEventListeners();
    
    console.log('✅ App initialized successfully');
});
