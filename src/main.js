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
import { KeyboardManager } from "./modules/keyboard.js";

document.addEventListener("DOMContentLoaded", () => {
  try {
    new Clock();
    new Weather();
    new Search();
    new QuoteWidget();

    // --- Data Migration: v2.0.2 to v2.1.0 (To-Do List) ---
    try {
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
    } catch (e) {
      console.warn("Failed to migrate old To-Do lists:", e);
    }

    new TodoManager();
    new AppGrid();
    new AiTools();
    new Shortcuts();
    new SettingsManager();
    new KeyboardManager();

    manageWelcomePopup();
  } catch (error) {
    console.error("CRITICAL MODULE ERROR:", error);
  }

  // --- VISUAL CONTROLLER ---
  if (state.get("transparencyActive"))
    document.body.classList.add("transparency-active");

  if (state.get("gradientModeActive")) {
    document.body.classList.add("gradient-mode-active");
  } else {
    if (state.get("darkMode")) document.body.setAttribute("data-theme", "dark");
  }

  state.subscribe((key, value) => {
    if (key === "transparencyActive") {
      document.body.classList.toggle("transparency-active", value);
    }
    if (key === "gradientModeActive") {
      document.body.classList.toggle("gradient-mode-active", value);
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
    if (key === "zenMode") {
      document.body.classList.toggle("zen-mode", value);
    }
  });

  // --- WELCOME TEXT ---
  const welcomeEl = document.getElementById("welcome-text");
  if (welcomeEl) {
    welcomeEl.textContent = state.get("welcomeText");
    welcomeEl.addEventListener("blur", () =>
      state.set("welcomeText", welcomeEl.textContent),
    );

    welcomeEl.addEventListener("input", () => {
      if (welcomeEl.textContent.length > 35) {
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

  if (!alreadyShown) {
    overlay.classList.remove("hidden");
  }

  closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    localStorage.setItem(versionKey, "true");
  });
}

const yearSpan = document.getElementById("copyright-year");
const currentYear = new Date().getFullYear();
if (currentYear > 2025) {
  yearSpan.textContent = `2025 - ${currentYear}`;
}

// src/main.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
