// ui.js
// Small, framework-free UI helpers shared by game.js and admin.js.
// Nothing here touches Firebase — it only manipulates the DOM.

/**
 * Renders text into an element one character at a time, VN-style.
 * Click-to-skip is supported via skipToEnd().
 */
export class Typewriter {
  constructor(el, speed = 18) {
    this.el = el;
    this.speed = speed;
    this._timer = null;
    this._fullText = "";
  }

  start(text, onDone) {
    this.stop();
    this._fullText = text || "";
    this.el.textContent = "";
    let i = 0;
    if (this._fullText.length === 0) {
      if (onDone) onDone();
      return;
    }
    this._timer = setInterval(() => {
      i++;
      this.el.textContent = this._fullText.slice(0, i);
      if (i >= this._fullText.length) {
        this.stop();
        if (onDone) onDone();
      }
    }, this.speed);
  }

  /** Jumps straight to the full line. Returns true if it actually skipped anything. */
  skipToEnd() {
    if (this._timer) {
      this.el.textContent = this._fullText;
      this.stop();
      return true;
    }
    return false;
  }

  stop() {
    clearInterval(this._timer);
    this._timer = null;
  }
}

/** Lightweight toast notification, used by the admin dashboard. */
export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/** Toggles a button between its normal label and a "busy" label, disabling it while busy. */
export function setLoading(button, isLoading, loadingLabel = "Saving…") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}
