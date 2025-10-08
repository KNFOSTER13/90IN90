// render.js
// Handles rendering of different parts of the site

console.log("render.js loaded");

function renderHomepage() {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `
      <h2>Welcome to 90IN90</h2>
      <p>Explore the daily creative experiment in progress.</p>
    `;
  }
}
