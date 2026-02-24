import { state } from "../state.js";

export class KeyboardManager {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener("keydown", (e) => this.handleKey(e));
  }

  handleKey(e) {
    if (e.repeat) return;

    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
      if (e.key === "Escape") e.target.blur();
      return;
    }

    const map = state.get("keyMap");
    const key = e.key.toLowerCase();

    const isEnabled = (action) =>
      map && map[action] && map[action].enabled && map[action].key === key;

    const isActionEnabled = (action) =>
      map && map[action] ? map[action].enabled : true;

    if (isEnabled("search")) {
      e.preventDefault();
      const search = document.getElementById("search-input");
      if (search) {
        search.focus();
        search.select();
      }
    } else if (isEnabled("todo")) this.clickButton("todo-toggle-button");
    else if (isEnabled("ai")) this.clickButton("ai-tools-toggle-button");
    else if (isEnabled("apps")) this.clickButton("apps-toggle-button");
    else if (isEnabled("settings")) this.clickButton("settings-toggle-button");
    else if (isEnabled("clock")) {
      const current = state.get("clockType");
      state.set("clockType", current === "analog" ? "digital" : "analog");
    } else if (isEnabled("date")) {
      const current = state.get("showDate");
      state.set("showDate", !current);
    } else if (isEnabled("autoTheme")) {
      if (document.body.classList.contains("has-custom-bg")) return;
      const current = state.get("autoTheme");
      state.set("autoTheme", !current);
    } else if (isEnabled("tempDisplay")) {
      const current = state.get("tempDisplayMode");
      state.set("tempDisplayMode", !current);
    }

    // --- NEW: Zen Mode Shortcut ---
    else if (key === "z") {
      if (isActionEnabled("zen")) {
        const current = state.get("zenMode");
        state.set("zenMode", !current);
      }
    }

    // --- NEW: Voice Search Shortcut (V) ---
    else if (key === "v") {
      if (isActionEnabled("voice")) {
        this.clickButton("voice-search-btn");
      }
    } else if (e.key === "Escape") this.closeAllPopups();
    // Numeric Launchers (1-9)
    else if (key >= "1" && key <= "9") {
      if (isActionEnabled("numKeys")) {
        this.launchShortcut(parseInt(key) - 1);
      }
    }
  }

  clickButton(id) {
    const btn = document.getElementById(id);
    if (btn && !btn.classList.contains("hidden")) {
      btn.click();
      btn.classList.add("active-press");
      setTimeout(() => btn.classList.remove("active-press"), 200);
    }
  }

  launchShortcut(index) {
    const shortcuts = state.get("userShortcuts");
    if (shortcuts && shortcuts[index]) {
      window.location.href = shortcuts[index].url;
    }
  }

  closeAllPopups() {
    const popups = document.querySelectorAll(".popup-container.visible");
    popups.forEach((p) => p.classList.remove("visible"));

    const openBtns = document.querySelectorAll(".corner-button.is-open");
    openBtns.forEach((b) => b.classList.remove("is-open"));

    const searchDrop = document.getElementById("search-dropdown");
    if (searchDrop) searchDrop.classList.add("hidden");

    if (document.activeElement) document.activeElement.blur();
  }
}

// src/modules/keyboard.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
