// ui.js
// Manages DOM interactions and UI components

console.log("ui.js loaded");

function updateStatus(message) {
  const app = document.getElementById("app");
  if (app) {
    app.textContent = message;
  }
}
