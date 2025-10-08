// main.js
// Entry point for the 90IN90 site

console.log("main.js loaded");

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  initApp();
});

function initApp() {
  console.log("Initializing 90IN90...");
  if (typeof renderHomepage === "function") {
    renderHomepage();
  }
}
