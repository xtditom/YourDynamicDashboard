import { state } from "./state.js";
import { applyFontFamily } from "./modules/fontLoader.js";
import { installInteractionPolicy } from "./modules/interactionPolicy.js";
import { Clock } from "./modules/clock.js";
import { Weather } from "./modules/weather.js";
import { Search } from "./modules/search.js";
import { QuoteWidget } from "./modules/quotes.js";
import { TodoManager } from "./modules/todo.js";
import { AppGrid } from "./modules/apps.js";
import { AiTools } from "./modules/aitools.js";
import { Shortcuts } from "./modules/shortcuts.js";
import { NewsManager } from "./modules/news.js";
import { SettingsManager } from "./modules/settings.js";
import { DarkSignalThemeGesture, FullSettingsModal } from "./modules/settingsModal.js";
import { KeyboardManager } from "./modules/keyboard.js";
import { CommandPalette } from "./modules/palette.js";
import { ZenModeController } from "./modules/zenMode.js";
import { initializeDefaultTasks } from "./utils.js";
import { isYddStorageKey } from "./storageKeys.js";

function initializeGlowDefault() {
  const migrationKey = "glowDefaultOffMigrated";
  if (state.get(migrationKey) === true) return;

  try {
    const hasSavedGlowPreference = localStorage.getItem("glowEffect") !== null;
    const hasExistingYddData = Object.keys(localStorage).some(
      (key) => key === "ydd_daily_greeting" || isYddStorageKey(key),
    );

    // Glow used to default to on without being stored. Preserve that implicit
    // preference for existing installations, while an empty profile receives
    // the new off default from CONFIG.
    if (!hasSavedGlowPreference && hasExistingYddData) {
      state.set("glowEffect", true);
    }
    state.set(migrationKey, true);
  } catch (error) {
    console.warn("[YDD] Could not initialize the new glow default.", error);
  }
}

// The single built-in dark background lives with the main visual bootstrap.
// Keeping it here avoids a separate module for a background that has no
// settings or public API of its own.
class SampleDarkBackground {
  constructor() {
    this.container = document.getElementById("sample-dark-background");
    this.canvas = document.getElementById("sample-dark-signal-canvas");
    this.context = this.canvas?.getContext("2d") || null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.particles = [];
    this.frameId = 0;
    this.isAnimating = false;
    this.pointer = { x: -1000, y: -1000, active: false };
    this.reduceMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    );

    if (!this.container || !this.canvas || !this.context) return;

    this._onResize = () => {
      if (this.isActive()) this.resize();
    };
    this._onPointerMove = (event) => {
      if (!this.isActive()) return;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
    };
    this._onPointerLeave = () => {
      this.pointer.active = false;
    };
    this._onMotionChange = (event) => {
      this.reduceMotion = event.matches;
      this.sync();
    };

    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointerMove, {
      passive: true,
    });
    window.addEventListener("blur", this._onPointerLeave, { passive: true });
    document.addEventListener("mouseleave", this._onPointerLeave, {
      passive: true,
    });

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener("change", this._onMotionChange);
    } else {
      motionQuery?.addListener?.(this._onMotionChange);
    }
    this.motionQuery = motionQuery;

    this.observer = new MutationObserver(() => this.sync());
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-theme-id"],
    });
    this.observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-theme-id"],
    });

    state.subscribe((key) => {
      if (key === "darkSignalBackgroundActive") this.sync();
    });

    this.sync();
  }

  isActive() {
    const body = document.body;
    return Boolean(
      body &&
        body.getAttribute("data-theme") === "dark" &&
        body.getAttribute("data-theme-id") === "default-dark" &&
        state.get("darkSignalBackgroundActive") === true &&
        !body.classList.contains("has-custom-bg") &&
        !body.classList.contains("gradient-mode-active"),
    );
  }

  shouldAnimate() {
    return (
      !this.reduceMotion &&
      !document.documentElement.classList.contains("disable-animations")
    );
  }

  sync() {
    if (!this.container || !this.context) return;

    const active = this.isActive();
    this.container.classList.toggle("is-active", active);
    this.stop();

    if (!active) {
      this.clear();
      return;
    }

    this.resize();
    if (this.shouldAnimate()) this.start();
    else this.drawFrame(false);
  }

  makeParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      size: Math.random() * 1.4 + 0.5,
    };
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width || window.innerWidth;
    this.height = bounds.height || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const count =
      this.width < 760 ? 32 : Math.min(72, Math.floor(this.width / 20));
    this.particles = Array.from({ length: count }, () => this.makeParticle());
  }

  start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.frameId = window.requestAnimationFrame(() => this.draw());
  }

  stop() {
    this.isAnimating = false;
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  clear() {
    if (!this.context) return;
    this.context.clearRect(0, 0, this.width, this.height);
    this.pointer.active = false;
  }

  draw() {
    if (!this.isAnimating || !this.isActive()) {
      this.stop();
      return;
    }

    this.drawFrame(true);
    this.frameId = window.requestAnimationFrame(() => this.draw());
  }

  drawFrame(advanceParticles = true) {
    this.context.clearRect(0, 0, this.width, this.height);
    this.particles.forEach((particle, index) => {
      if (advanceParticles && this.pointer.active) {
        const dx = particle.x - this.pointer.x;
        const dy = particle.y - this.pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 145 && distance > 0) {
          const force = (145 - distance) / 145;
          particle.vx += (dx / distance) * force * 0.018;
          particle.vy += (dy / distance) * force * 0.018;
        }
      }

      if (advanceParticles) {
        particle.vx *= 0.992;
        particle.vy *= 0.992;
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -10) particle.x = this.width + 10;
        if (particle.x > this.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = this.height + 10;
        if (particle.y > this.height + 10) particle.y = -10;
      }

      this.context.beginPath();
      this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.context.fillStyle =
        index % 11 === 0 ? "#b4ff5f" : "#f1efe8";
      this.context.fill();

      for (
        let nextIndex = index + 1;
        nextIndex < this.particles.length;
        nextIndex += 1
      ) {
        const next = this.particles[nextIndex];
        const distance = Math.hypot(
          particle.x - next.x,
          particle.y - next.y,
        );
        if (distance > 105) continue;
        this.context.beginPath();
        this.context.moveTo(particle.x, particle.y);
        this.context.lineTo(next.x, next.y);
        this.context.strokeStyle = "rgba(241, 239, 232, 0.14)";
        this.context.lineWidth = Math.max(0.25, 1 - distance / 105);
        this.context.stroke();
      }
    });

  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeGlowDefault();
  applyFontFamily(state.get("fontFamily"));
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

  initialize("Interaction Policy", () => installInteractionPolicy(document));
  initialize("Zen Mode", () => new ZenModeController());
  initialize("Clock", () => new Clock());
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
  const settingsManager = initialize("Settings", () => new SettingsManager());

  // Keep startup phases ordered. Local/visible UI is initialized first;
  // SettingsManager starts the optional background phase; network-backed
  // weather and RSS work begin only after that phase has settled.
  const continueStartup = Promise.resolve(
    settingsManager?.whenBackgroundReady?.(),
  )
    .catch((error) => {
      console.error("[YDD] Background startup failed:", error);
    })
    .then(() => {
      const weather = initialize("Weather", () => new Weather());
      return Promise.resolve(weather?.ready).catch((error) => {
        console.error("[YDD] Weather startup failed:", error);
      });
    })
    .then(() => {
      initialize("News Feeds", () => new NewsManager());
      initialize("Full Settings", () => new FullSettingsModal());
      initialize("Dark signal theme gesture", () => new DarkSignalThemeGesture());
      initialize("Keyboard", () => new KeyboardManager());
      initialize("Command Palette", () => new CommandPalette());
      initialize("Welcome popup", () => manageWelcomePopup());
    });
  void continueStartup.catch((error) => {
    console.error("[YDD] Deferred startup failed:", error);
  });

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
    if (key === "fontFamily") applyFontFamily(value);
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
    if (key === "normalThemeId" || key === "gradientThemeId") {
      const themeId = state.get("gradientModeActive")
        ? `gradient-${state.get("gradientThemeId") || "gradient"}`
        : state.get("normalThemeId") || "default-dark";
      document.body.setAttribute("data-theme-id", themeId);
      document.documentElement.setAttribute("data-theme-id", themeId);
    }
  });

  initialize("Sample dark background", () => new SampleDarkBackground());

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

  if (!overlay) return;

  const versionKey = "welcomeShown_v3.0.0";
  const alreadyShown = localStorage.getItem(versionKey);
  overlay.inert = true;
  const closeWelcome = () => {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    document.removeEventListener("keydown", onKeyDown);
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
  };

  if (!alreadyShown && state.get("zenMode") !== true) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    overlay.inert = false;
    document.addEventListener("keydown", onKeyDown);
  }

  overlay
    .querySelectorAll("[data-welcome-dismiss]")
    .forEach((button) => button.addEventListener("click", closeWelcome));
}

const yearSpan = document.getElementById("copyright-year");
const currentYear = new Date().getFullYear();
if (currentYear > 2025) {
  yearSpan.textContent = `2025 - ${currentYear}`;
}
// [src/main.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
