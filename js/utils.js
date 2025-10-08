// utils.js
// Utility and helper functions

console.log("utils.js loaded");

function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
