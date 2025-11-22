export function showError(message: string) {
  const errorEl = document.getElementById('game-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  setTimeout(() => { errorEl.textContent = ''; }, 5000); // auto clear after 2.5s
}