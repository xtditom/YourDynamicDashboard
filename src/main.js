import { state } from "./state.js";
import { Clock } from "./modules/clock.js";
import { Weather } from "./modules/weather.js";
import { Search } from "./modules/search.js";
import { QuoteWidget } from "./modules/quotes.js";
import { TodoManager } from "./modules/todo.js";
import { AppGrid } from "./modules/apps.js";
import { AiTools } from "./modules/aitools.js";
import { Shortcuts } from "./modules/shortcuts.js";
import { SettingsManager } from "./modules/settings.js";
import { FullSettingsModal } from "./modules/settingsModal.js";
import { KeyboardManager } from "./modules/keyboard.js";
import { CommandPalette } from "./modules/palette.js";
import { ZenModeController } from "./modules/zenMode.js";
import { initializeDefaultTasks } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.toggle(
    "disable-animations",
    state.get("disableAnimations") === true,
  );

  const initialize = (name, factory) => {
    try {
      return factory();
    } catch (error) {
      console.error(`[YDD] ${name} failed to initialize:`, error);
      return null;
    }
  };

  initialize("Zen Mode", () => new ZenModeController());
  initialize("Clock", () => new Clock());
  initialize("Weather", () => new Weather());
  initialize("Search", () => new Search());
  initialize("Quote", () => new QuoteWidget());

  // --- Data Migration: v2.0.2 to v2.1.0 (To-Do List) ---
  initialize("To-Do migration", () => {
    const oldTodosJson = localStorage.getItem("todos");
    if (oldTodosJson) {
      const parsed = JSON.parse(oldTodosJson);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "string"
      ) {
        console.log("Migrating older To-Do list format to v2.1 objects...");
        const migrated = parsed.map((taskString, index) => ({
          id: Date.now() + index,
          text: taskString,
          completed: false,
          pinned: false,
        }));
        localStorage.setItem("todos", JSON.stringify(migrated));
        console.log("V2.1 To-Do Migration Complete.");
      }
    }
  });

  initialize("Welcome tasks", () => initializeDefaultTasks());

  initialize("To-Do", () => new TodoManager());
  initialize("Google Apps", () => new AppGrid());
  initialize("AI Tools", () => new AiTools());
  initialize("Shortcuts", () => new Shortcuts());
  initialize("Settings", () => new SettingsManager());
  initialize("Full Settings", () => new FullSettingsModal());
  initialize("Keyboard", () => new KeyboardManager());
  initialize("Command Palette", () => new CommandPalette());
  initialize("Welcome popup", () => manageWelcomePopup());

  // --- VISUAL CONTROLLER ---
  if (state.get("transparencyActive"))
    document.body.classList.add("transparency-active");

  if (state.get("gradientModeActive")) {
    document.body.classList.add("gradient-mode-active");
    const gradientId = state.get("gradientThemeId") || "gradient";
    document.body.setAttribute("data-theme-id", `gradient-${gradientId}`);
    document.documentElement.setAttribute("data-theme-id", `gradient-${gradientId}`);
  } else {
    const normalThemeId = state.get("normalThemeId") || "default-dark";
    document.body.setAttribute("data-theme-id", normalThemeId);
    document.documentElement.setAttribute("data-theme-id", normalThemeId);
    if (state.get("darkMode")) document.body.setAttribute("data-theme", "dark");
  }

  state.subscribe((key, value) => {
    if (key === "transparencyActive") {
      document.body.classList.toggle("transparency-active", value);
    }
    if (key === "gradientModeActive") {
      document.body.classList.toggle("gradient-mode-active", value);
      const themeId = value
        ? `gradient-${state.get("gradientThemeId") || "gradient"}`
        : state.get("normalThemeId") || "default-dark";
      document.body.setAttribute("data-theme-id", themeId);
      document.documentElement.setAttribute("data-theme-id", themeId);
      if (!value) {
        document.body.setAttribute(
          "data-theme",
          state.get("darkMode") ? "dark" : "light",
        );
      }
    }
    if (key === "darkMode") {
      if (!state.get("gradientModeActive")) {
        document.body.setAttribute("data-theme", value ? "dark" : "light");
      }
    }
    if (key === "showEditableText") {
      const welcomeEl = document.getElementById("welcome-text");
      if (welcomeEl) welcomeEl.classList.toggle("hidden", value === false);
    }
    if (key === "disableAnimations") {
      document.documentElement.classList.toggle("disable-animations", value === true);
    }
  });

  // --- WELCOME TEXT ---
  const welcomeEl = document.getElementById("welcome-text");
  if (welcomeEl) {
    welcomeEl.textContent = state.get("welcomeText") || "";
    welcomeEl.classList.toggle("hidden", state.get("showEditableText") === false);
    
    welcomeEl.addEventListener("blur", () => {
      if (welcomeEl.textContent.trim() === "") welcomeEl.innerHTML = "";
      state.set("welcomeText", welcomeEl.textContent);
    });

    welcomeEl.addEventListener("input", () => {
      if (welcomeEl.textContent.trim() === "") {
        welcomeEl.innerHTML = "";
      } else if (welcomeEl.textContent.length > 35) {
        welcomeEl.textContent = welcomeEl.textContent.substring(0, 35);
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(welcomeEl.childNodes[0], 35);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    welcomeEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.target.blur();
    });
  }

  setTimeout(() => document.body.classList.add("loaded"), 100);
});

// --- POPUP MANAGER ---
function manageWelcomePopup() {
  const overlay = document.getElementById("welcome-modal-overlay");
  const closeBtn = document.getElementById("welcome-modal-close");

  if (!overlay || !closeBtn) return;

  const versionKey = "welcomeShown_v2.0_widescreen";
  const alreadyShown = localStorage.getItem(versionKey);
  const previousFocus = document.activeElement;
  overlay.inert = true;
  const closeWelcome = () => {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    document.removeEventListener("keydown", onKeyDown);
    if (previousFocus?.focus) window.setTimeout(() => previousFocus.focus(), 0);
    localStorage.setItem(versionKey, "true");
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeWelcome();
      return;
    }
    if (event.key === "Tab") {
      const focusable = overlay.querySelectorAll("button, a[href], input, select, textarea");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (key === "normalThemeId" || key === "gradientThemeId") {
      const themeId = state.get("gradientModeActive")
        ? `gradient-${state.get("gradientThemeId") || "gradient"}`
        : state.get("normalThemeId") || "default-dark";
      document.body.setAttribute("data-theme-id", themeId);
      document.documentElement.setAttribute("data-theme-id", themeId);
    }
  };

  if (!alreadyShown && state.get("zenMode") !== true) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    overlay.inert = false;
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeBtn.focus(), 0);
  }

  closeBtn.addEventListener("click", closeWelcome);
}

const yearSpan = document.getElementById("copyright-year");
const currentYear = new Date().getFullYear();
if (currentYear > 2025) {
  yearSpan.textContent = `2025 - ${currentYear}`;
}
// [src/main.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
