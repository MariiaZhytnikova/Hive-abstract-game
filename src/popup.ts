// const overlay = document.getElementById("popup-overlay") as HTMLDivElement;
// const closeBtn = document.getElementById("close-popup") as HTMLSpanElement;
// const message = document.getElementById("popup-message") as HTMLHeadingElement;
// const showBtn = document.getElementById("show-popup") as HTMLButtonElement;

// // Show popup with custom text
// export function showPopup(text: string) {
//   message.textContent = text;
//   overlay.classList.remove("hidden");
// }

// // Hide popup
// function hidePopup() {
//   overlay.classList.add("hidden");
// }

// // Close when X is clicked
// if (closeBtn) {
//   closeBtn.addEventListener("click", () => {
//     console.log("clicked X!");
//     hidePopup();
//   });
// }

// // ✅ Correct: "click" not "close-popup"
// if (overlay) {
//   overlay.addEventListener("click", (e) => {
//     if (e.target === overlay) hidePopup();
//   });
// }

// // Temporary test button
// if (showBtn) {
//   showBtn.addEventListener("click", () => showPopup("White wins!"));
// }
window.addEventListener("DOMContentLoaded", () => {
  let overlay = document.getElementById("popup-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.innerHTML = ""; // Clear any content
  }
});

export function showWinnerPopup(winner: "White" | "Black") {
  // Get or create the overlay
  let overlay = document.getElementById("popup-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    overlay.className = "hidden";
    document.body.appendChild(overlay);
  }
 overlay.classList.remove("hidden");

  // Create the popup box
  overlay.innerHTML = `
    <div class="popup">
      <h2>${winner} won!</h2>
      <span id="close-popup">&times;</span>
    </div>
  `;

  // Close logic
  const closeBtn = document.getElementById("close-popup");
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay?.classList.add("hidden");
      window.location.reload(); // Reloads the page and starts a new game
    };
  }
}

// Optionally, you can add a function to hide the popup
export function hideWinnerPopup() {
  const overlay = document.getElementById("popup-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}