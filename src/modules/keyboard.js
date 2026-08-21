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

    const key = e.key.toLowerCase();

    // Global Command Palette Shortcut: Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && key === "k") {
      e.preventDefault();
      if (window.YD_CommandPalette) {
        if (window.YD_CommandPalette.isOpen) {
          window.YD_CommandPalette.close();
        } else {
          window.YD_CommandPalette.open();
        }
      }
      return;
    }

    // Do not collide with browser/OS shortcuts such as Ctrl+S or Alt+Left.
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
      if (e.key === "Escape") e.target.blur();
      return;
    }

    const map = state.get("keyMap");

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
    } else if (isEnabled("hideGreetings")) {
      const current = state.get("hideGreetings");
      state.set("hideGreetings", !current);
    } else if (isEnabled("showEditableText")) {
      const current = state.get("showEditableText");
      state.set("showEditableText", !current);
    }

    // --- NEW: Zen Mode Shortcut ---
    else if (key === "z") {
      const current = state.get("zenMode");
      // Once Zen Mode is active, Z is always an escape hatch even if the
      // shortcut was disabled before the tab was reloaded.
      if (current || isActionEnabled("zen")) {
        state.set("zenMode", !current);
      }
    }

    // --- NEW: Voice Search Shortcut (V) ---
    else if (key === "v") {
      if (isActionEnabled("voice")) {
        this.clickButton("voice-search-btn");
      }
    } else if (e.key === "Escape") this.closeAllPopups();
    else if (key >= "1" && key <= "9") {
      if (isActionEnabled("numKeys")) {
        this.launchShortcut(parseInt(key) - 1);
      }
    }
  }

  clickButton(id) {
    if (
      state.get("zenMode") &&
      [
        "todo-toggle-button",
        "ai-tools-toggle-button",
        "apps-toggle-button",
        "settings-toggle-button",
      ].includes(id)
    ) {
      return;
    }
    const btn = document.getElementById(id);
    const style = btn ? window.getComputedStyle(btn) : null;
    if (
      btn &&
      !btn.disabled &&
      !btn.hidden &&
      !btn.classList.contains("hidden") &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    ) {
      btn.click();
      btn.classList.add("active-press");
      setTimeout(() => btn.classList.remove("active-press"), 200);
    }
  }

  launchShortcut(index) {
    if (state.get("zenMode")) return;
    const shortcuts = state.get("userShortcuts");
    if (shortcuts && shortcuts[index]) {
      const targets = state.get("linkTargets") || {};
      window.open(shortcuts[index].url, targets.shortcuts || "_blank");
    }
  }

  closeAllPopups() {
    const popups = document.querySelectorAll(".popup-container.visible");
    popups.forEach((p) => {
      p.classList.remove("visible");
      p.setAttribute("aria-hidden", "true");
      document
        .querySelector(`[aria-controls="${p.id}"]`)
        ?.setAttribute("aria-expanded", "false");
    });

    const openBtns = document.querySelectorAll(".corner-button.is-open");
    openBtns.forEach((b) => b.classList.remove("is-open"));

    const searchDrop = document.getElementById("search-dropdown");
    if (searchDrop) searchDrop.classList.add("hidden");

    window.__settingsManagerInstance?.closeInfoModal?.();

    if (document.activeElement) document.activeElement.blur();
  }
}
// [src/modules/keyboard.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
