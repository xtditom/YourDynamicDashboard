import { state } from "../state.js";
import { getIconUrl, showCustomModal } from "../utils.js";
import { DEFAULT_KEY_MAP, CONFIG } from "../config.js";

// --- ALIEN DNA (Glass Palettes) ---
const ALIEN_LIGHT = {
  "--bg-secondary": "rgba(255, 255, 255, 0.25)",
  "--bg-tertiary": "rgba(255, 255, 255, 0.35)",
  "--bg-interactive": "rgba(255, 255, 255, 0.5)",
  "--text-primary": "#1a1a1a",
  "--text-secondary": "#333333",
  "--text-placeholder": "#555555",
  "--accent-color": "#1a1a1a",
  "--glow-color": "rgba(0,0,0,0.5)",
  "--icon-filter": "grayscale(0%)",
  "--icon-opacity": "1",
};

const ALIEN_DARK = {
  "--bg-secondary": "rgba(0, 0, 0, 0.25)",
  "--bg-tertiary": "rgba(0, 0, 0, 0.45)",
  "--bg-interactive": "rgba(255, 255, 255, 0.1)",
  "--text-primary": "#f0f0f0",
  "--text-secondary": "#d1d5db",
  "--text-placeholder": "#9ca3af",
  "--accent-color": "#f0f0f0",
  "--glow-color": "rgba(255,255,255,0.7)",
  "--icon-filter": "grayscale(0%) brightness(1.0)",
  "--icon-opacity": "0.9",
};

const THEMES = {
  normal: [
    // YOUR CUSTOM DEFAULT LIGHT
    {
      id: "default-light",
      type: "light",
      name: "Default Light",
      colors: {
        "--bg-primary": "#c3c3c3",
        "--bg-secondary": "#ffffff",
        "--bg-tertiary": "#e9e9e9",
        "--accent-color": "#1a1a1a",
        "--text-primary": "#1a1a1a",
        "--text-secondary": "#000000",
        "--text-placeholder": "#8a8d91",
        "--glow-color": "#7f7f7f",
      },
    },
    {
      id: "default-dark",
      type: "default-dark",
      name: "Default Dark",
      colors: {
        "--bg-primary": "#030303",
        "--bg-secondary": "#3a3a3a",
        "--bg-tertiary": "#2d2d2d",
        "--accent-color": "#ffffffff",
        "--text-primary": "#f9fafb",
        "--text-secondary": "#d1d5db",
        "--text-placeholder": "#9ca3af",
        "--glow-color": "#c8c8c8",
      },
    },
    {
      id: "theme-1",
      type: "dark",
      name: "YDD Standard",
      colors: {
        "--bg-primary": "#000000",
        "--bg-secondary": "#141414",
        "--bg-tertiary": "#2d2d2d",
        "--accent-color": "#ff7300",
        "--text-primary": "#ff7300",
        "--text-secondary": "#ff7300",
        "--text-placeholder": "#ff7300",
        "--glow-color": "#ff7300",
      },
    },
    {
      id: "theme-2",
      type: "dark",
      name: "Radioactive",
      colors: {
        "--bg-primary": "#000000",
        "--bg-secondary": "#648112",
        "--bg-tertiary": "#292929",
        "--accent-color": "#c8ff00",
        "--text-primary": "#ffffff",
        "--text-secondary": "#ffffff",
        "--text-placeholder": "#c8ff00",
        "--glow-color": "#38ff6a",
      },
    },
    {
      id: "theme-3",
      type: "light",
      name: "Azure Sky",
      colors: {
        "--bg-primary": "#bebebe",
        "--bg-secondary": "#006eff",
        "--bg-tertiary": "#287ff0",
        "--accent-color": "#ffffff",
        "--text-primary": "#000000",
        "--text-secondary": "#ffffff",
        "--text-placeholder": "#ffffff",
        "--glow-color": "#006eff",
      },
    },
    {
      id: "theme-4",
      type: "light",
      name: "Minty Fresh",
      colors: {
        "--bg-primary": "#90c69e",
        "--bg-secondary": "#FFFFFF",
        "--bg-tertiary": "#ccffd9",
        "--accent-color": "#328558",
        "--text-primary": "#2e8b57",
        "--text-secondary": "#555555",
        "--text-placeholder": "#008a10",
        "--glow-color": "#3cb371",
      },
    },
    {
      id: "theme-5",
      type: "light",
      name: "Sakura",
      colors: {
        "--bg-primary": "#ffa9d2ff",
        "--bg-secondary": "#ffc7e3",
        "--bg-tertiary": "#FFFFFF",
        "--accent-color": "#ff4da6",
        "--text-primary": "#C71585",
        "--text-secondary": "#8B5765",
        "--text-placeholder": "#ff70a0",
        "--glow-color": "#5f0030ff",
      },
    },
    {
      id: "theme-6",
      type: "dark",
      name: "Cyberpunk",
      colors: {
        "--bg-primary": "#0A043C",
        "--bg-secondary": "#140C4F",
        "--bg-tertiary": "#221B64",
        "--accent-color": "#00E5FF",
        "--text-primary": "#00e5ff",
        "--text-secondary": "#FF00FF",
        "--text-placeholder": "#ff00ff",
        "--glow-color": "#00E5FF",
      },
    },
    {
      id: "theme-7",
      type: "dark",
      name: "Phosphor",
      colors: {
        "--bg-primary": "#0f0f15",
        "--bg-secondary": "#2a2931",
        "--bg-tertiary": "#2d2d35",
        "--accent-color": "#fcfdfb",
        "--text-primary": "#8ea659",
        "--text-secondary": "#59b560",
        "--text-placeholder": "#717a8a",
        "--glow-color": "#828282",
      },
    },
  ],
  gradient: [
    {
      id: "electric-sky",
      name: "Electric Sky",
      colors: ["#1580FD", "#9B90FB"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "cotton-candy",
      name: "Cotton Candy",
      colors: ["#eb76beff", "#d14ac6ff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "glacier",
      name: "Glacier",
      colors: ["#20e3b2", "#0c7febff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "bio-lime",
      name: "Bio Lime",
      colors: ["#42bd00ff", "#087416ff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "grey",
      name: "Passion",
      colors: ["#c9c9c9", "#4e4e4e"],
      ui: ALIEN_DARK,
      type: "dark",
    },
    {
      id: "royal",
      name: "Royal",
      colors: ["#9500ebff", "#257bfcff"],
      ui: ALIEN_DARK,
      type: "dark",
    },
    {
      id: "deep-space",
      name: "Deep Space",
      colors: ["#302b63", "#1d0838ff"],
      ui: ALIEN_DARK,
      type: "dark",
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#480048", "#C04848"],
      ui: ALIEN_DARK,
      type: "dark",
    },
    {
      id: "forest",
      name: "Forest",
      colors: ["#295038", "#10491eff"],
      ui: ALIEN_DARK,
      type: "dark",
    },
  ],
};

export class SettingsManager {
  static instance = null;

  constructor() {
    if (SettingsManager.instance) {
      return SettingsManager.instance;
    }
    SettingsManager.instance = this;

    this.els = {
      btn: document.getElementById("settings-toggle-button"),
      popup: document.getElementById("settings-popup"),
      tabs: document.querySelectorAll(".settings-tab-button"),
      panes: document.querySelectorAll(".settings-pane"),
      clockType: document.getElementById("clock-type-toggle"),
      clockFormat: document.getElementById("clock-format-toggle"),
      clockFormatRow: document.getElementById("clock-format-row"),
      dateToggle: document.getElementById("date-visibility-toggle"),
      tempUnit: document.getElementById("temp-unit-toggle"),
      todo: document.getElementById("todo-visibility-toggle"),
      apps: document.getElementById("apps-visibility-toggle"),
      ai: document.getElementById("ai-tools-visibility-toggle"),
      shortcuts: document.getElementById("shortcuts-toggle"),
      dark: document.getElementById("dark-mode-toggle"),
      autoThemeToggle: document.getElementById("auto-theme-toggle"),
      glowToggle: document.getElementById("glow-effect-toggle"),
      quote: document.getElementById("quote-position-select"),
      colorControls: document.getElementById("advanced-color-controls"),
      themeColorNote: document.getElementById("theme-color-note"),
      normalContainer: document.getElementById("normal-themes-container"),
      gradientContainer: document.getElementById("gradient-themes-container"),
      savedContainer: document.getElementById("saved-themes-container"),
      saveThemeBtn: document.getElementById("save-current-theme-btn"),
      locInput: document.getElementById("custom-location-input"),
      locSave: document.getElementById("save-location-btn"),
      locDetect: document.getElementById("settings-gps-btn"),
      tempDisplayToggle: document.getElementById("temp-display-toggle"),
      shortcutList: document.getElementById("shortcuts-editor-list"),
      shortcutForm: document.getElementById("add-shortcut-form"),
      uploadBg: document.getElementById("upload-bg-button"),
      bgInput: document.getElementById("bg-file-input"),
      removeBg: document.getElementById("remove-bg-button"),
      randomBgFreeze: document.getElementById("random-bg-freeze-btn"),
      randomBgRnd: document.getElementById("random-bg-rnd-btn"),
      backup: document.getElementById("backup-button"),
      restore: document.getElementById("restore-button"),
      restoreInput: document.getElementById("restore-file-input"),
      reset: document.getElementById("reset-button"),
      updateBtn: document.getElementById("check-for-updates-btn"),
      githubBtn: document.getElementById("github-repo-btn"),
      infoBtn: document.getElementById("info-btn"),
      infoOverlay: document.getElementById("info-modal-overlay"),
      infoClose: document.getElementById("info-modal-close"),
      editKeysBtn: document.getElementById("edit-keys-btn"),
      keyOverlay: document.getElementById("key-modal-overlay"),
      keyClose: document.getElementById("key-modal-close"),
      keyList: document.getElementById("key-list"),
      keyNoteContainer: document.getElementById("key-note-container"),
      keyReset: document.getElementById("reset-keys-btn"),
      editLinkDirBtn: document.getElementById("edit-link-direction-btn"),
      linkDirOverlay: document.getElementById("link-direction-modal-overlay"),
      linkDirClose: document.getElementById("link-direction-modal-close"),
      linkDirList: document.getElementById("link-direction-list"),
      linkDirReset: document.getElementById("reset-link-direction-btn"),
    };

    if (!this.els.btn) return;
    this.init();
  }

  init() {
    // Ensure glowToggle is available
    if (!this.els.glowToggle) {
      this.els.glowToggle = document.getElementById("glow-effect-toggle");
    }

    this.loadInitialState();
    this.setupEventListeners();
    this.renderThemes();
    this.renderSavedThemes();
    this.renderShortcutEditor();

    state.subscribe((key, value) => {
      if (
        key === "quotePosition" ||
        key === "yd_city" ||
        key === "locationUpdate"
      ) {
        this.updateTempTogglesState();
      }
      if (key === "autoTheme") {
        if (this.els.autoThemeToggle) {
          this.els.autoThemeToggle.checked = value;
        }
        if (value) {
          this.applyRandomTheme();
        }
      }
      if (key === "yd_city") {
        if (this.els.locInput) this.els.locInput.value = value || "";
      }
      if (key === "showDate") {
        if (this.els.dateToggle) {
          this.els.dateToggle.checked = value;
        }
      }
      if (key === "clockType") {
        if (this.els.clockType) {
          this.els.clockType.checked = value === "analog";
        }
        this.updateClockFormatState();
      }
      if (key === "glowEffect") {
        const isGlowOn = value !== false; // Default true if undefined
        if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;
        document.body.classList.toggle("no-glow", !isGlowOn);

        // Disable/Enable Glow Color Picker
        const glowPicker = document.getElementById("glow-color-picker");
        if (glowPicker) {
          glowPicker.disabled = !isGlowOn;
          glowPicker.style.opacity = isGlowOn ? "1" : "0.5";
          glowPicker.style.cursor = isGlowOn ? "pointer" : "not-allowed";
          // Optional: Disable the parent row opacity for better visual cue
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) {
            if (!isGlowOn) parentRow.classList.add("disabled");
            else parentRow.classList.remove("disabled");
          }
        }
      }
    });
  }

  loadInitialState() {
    this.bindSimpleToggle(this.els.clockType, "clockType", "analog");
    this.bindSimpleToggle(this.els.clockFormat, "clockFormat", "24");
    this.bindSimpleToggle(this.els.dateToggle, "showDate", false);
    this.bindSimpleToggle(this.els.tempUnit, "tempUnit", "imperial");
    this.bindSimpleToggle(this.els.tempDisplayToggle, "tempDisplayMode", true);
    this.bindSimpleToggle(this.els.todo, "showTodo", true);
    this.bindSimpleToggle(this.els.apps, "showApps", true);
    this.bindSimpleToggle(this.els.ai, "showAiTools", true);
    this.bindSimpleToggle(this.els.shortcuts, "showShortcuts", true);
    this.bindSimpleToggle(this.els.autoThemeToggle, "autoTheme", false);

    // Explicitly bind glow toggle with default TRUE
    this.bindSimpleToggle(this.els.glowToggle, "glowEffect", true);

    if (this.els.dark) {
      this.els.dark.checked = state.get("darkMode") === true;
    }

    if (this.els.quote) this.els.quote.value = state.get("quotePosition");
    if (this.els.locInput) this.els.locInput.value = state.get("yd_city") || "";

    const bg = state.get("backgroundImage");
    const randomBgMode = state.get("randomBgMode");
    const randomBgTime = state.get("randomBgTime");

    if (randomBgMode === "random") {
      document.body.classList.add("has-custom-bg");
      this.fetchRandomBackground("random");
    } else if (randomBgMode === "freeze") {
      document.body.classList.add("has-custom-bg");
      if (randomBgTime === -1) {
        // Save Forever - don't expire
        if (state.get("savedBgUrl")) {
          document.body.style.backgroundImage = `url(${state.get("savedBgUrl")})`;
        } else if (bg) {
          document.body.style.backgroundImage = `url(${bg})`;
        }
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      } else if (randomBgTime && Date.now() - randomBgTime > 259200000) {
        // If 72 hours passed, unfreeze and go back to random
        state.set("randomBgMode", "random");
        this.fetchRandomBackground("random");
      } else if (state.get("savedBgUrl")) {
        document.body.style.backgroundImage = `url(${state.get("savedBgUrl")})`;
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      } else if (bg) {
        document.body.style.backgroundImage = `url(${bg})`;
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      }
    } else if (bg) {
      document.body.classList.add("has-custom-bg");
      document.body.style.backgroundImage = `url(${bg})`;
      if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
    } else {
      document.body.classList.remove("has-custom-bg");
    }

    this.updateRandomBgButtons();
    this.updateAutoThemeGlowState();

    // Apply initial glow state (Default to TRUE if undefined)
    const currentGlow = state.get("glowEffect");
    const isGlowOn = currentGlow !== false;
    document.body.classList.toggle("no-glow", !isGlowOn);
    if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;

    if (state.get("autoTheme")) {
      this.applyRandomTheme(true);
    } else {
      const isGradient = state.get("gradientModeActive");
      if (isGradient) {
        const themeId = state.get("gradientThemeId");
        const theme =
          THEMES.gradient.find((t) => t.id === themeId) || THEMES.gradient[0];
        this.applyGradientTheme(theme, false, true);
      } else {
        const savedId = state.get("normalThemeId");

        let theme = THEMES.normal.find((t) => t.id === savedId);

        if (!theme) {
          const savedPresets = state.get("userSavedThemes") || [];
          theme = savedPresets.find((t) => t.id === savedId);
        }

        if (theme) {
          this.applyNormalTheme(theme, true);
        } else {
          this.applyCustomColors();
        }
      }
    }

    this.updateClockFormatState();
    this.updateTempTogglesState();
    this.updateWarningText();
  }

  updateClockFormatState() {
    const isAnalog = state.get("clockType") === "analog";
    if (this.els.clockFormatRow) {
      if (isAnalog) {
        this.els.clockFormatRow.classList.add("disabled");
        if (this.els.clockFormat) this.els.clockFormat.disabled = true;
      } else {
        this.els.clockFormatRow.classList.remove("disabled");
        if (this.els.clockFormat) this.els.clockFormat.disabled = false;
      }
    }
  }

  updateTempTogglesState() {
    const quotePosition = state.get("quotePosition");
    const city = state.get("yd_city");
    const lat = state.get("yd_lat");
    const lon = state.get("yd_lon");

    // Check if location is set (based on weather.js logic)
    const hasLocation = city && lat && lon && lat !== "0" && lon !== "0";

    const shouldDisable = quotePosition === "replace" || !hasLocation;

    [this.els.tempUnit, this.els.tempDisplayToggle].forEach((toggleEl) => {
      if (toggleEl) {
        toggleEl.disabled = shouldDisable;
        const row = toggleEl.closest(".setting-row");
        if (row) {
          if (shouldDisable) {
            row.classList.add("disabled");
          } else {
            row.classList.remove("disabled");
          }
        }
      }
    });
  }

  applyRandomTheme(skipBgWipe = false) {
    const pool = [
      ...THEMES.normal.map((t) => ({ ...t, mode: "normal" })),
      ...THEMES.gradient.map((t) => ({ ...t, mode: "gradient" })),
    ];

    const random = pool[Math.floor(Math.random() * pool.length)];

    if (random.mode === "gradient") {
      this.applyGradientTheme(random, true, skipBgWipe);
    } else {
      this.applyNormalTheme(random, skipBgWipe);
    }
    state.set("autoTheme", true);
  }

  disableAutoTheme() {
    if (state.get("autoTheme")) {
      state.set("autoTheme", false);
      if (this.els.autoThemeToggle) {
        this.els.autoThemeToggle.checked = false;
      }
    }
  }

  setupEventListeners() {
    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.els.popup.classList.toggle("visible");
      this.renderShortcutEditor();
      this.els.btn.classList.add("animating");

      // --- DYNAMIC VIBE: DELETE FIRST DEFAULT TASK ---
      if (state.get("defaultTasksPinned")) {
        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-1");
        });
      }

      setTimeout(() => this.els.btn.classList.remove("animating"), 400);
    });

    document.addEventListener("click", (e) => {
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(e.target)
      )
        this.els.popup.classList.remove("visible");
    });
    this.els.popup.addEventListener("click", (e) => e.stopPropagation());

    // Direct Debug Listener for Glow
    const glowToggle = document.getElementById("glow-effect-toggle");
    if (glowToggle) {
      glowToggle.addEventListener("change", (e) => {
        console.log("GLOW TOGGLE CHANGED:", e.target.checked);
        state.set("glowEffect", e.target.checked);
        document.body.classList.toggle("no-glow", !e.target.checked);
      });
    } else {
      console.error("GLOW TOGGLE NOT FOUND IN DOM");
    }

    this.els.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        this.els.tabs.forEach((t) => t.classList.remove("active"));
        this.els.panes.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        if (this.els.panes[index])
          this.els.panes[index].classList.add("active");
      });
    });

    if (this.els.quote)
      this.els.quote.addEventListener("change", (e) =>
        state.set("quotePosition", e.target.value),
      );

    if (this.els.dark) {
      this.els.dark.addEventListener("change", () => {
        this.disableAutoTheme();
        const isChecked = this.els.dark.checked;
        state.set("darkMode", isChecked);

        const targetTheme = isChecked
          ? THEMES.normal.find((t) => t.id === "default-dark")
          : THEMES.normal.find((t) => t.id === "default-light");
        this.applyNormalTheme(targetTheme);

        // Complete Theme Task
        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.addEventListener("change", () => {
        if (this.els.autoThemeToggle.checked) {
          this.applyRandomTheme();
        } else {
          state.set("autoTheme", false);
        }

        // Complete Theme Task
        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.colorControls) {
      this.els.colorControls.addEventListener("input", (e) => {
        if (e.target.classList.contains("color-picker")) {
          this.disableAutoTheme();

          // Complete Theme Task
          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-5");
          });

          if (state.get("darkMode")) {
            state.set("darkMode", false);
            if (this.els.dark) this.els.dark.checked = false;
          }

          if (state.get("gradientModeActive")) {
            state.set("gradientModeActive", false);
            document.body.classList.remove("gradient-mode-active");
            state.set("transparencyActive", false);
            document.body.classList.remove("transparency-active");

            const lastId = state.get("normalThemeId") || "default-light";
            let lastTheme = THEMES.normal.find((t) => t.id === lastId);

            if (!lastTheme) lastTheme = THEMES.normal[0];

            Object.entries(lastTheme.colors).forEach(([k, v]) => {
              document.body.style.setProperty(k, v);
              state.set(`custom-${k}`, v);
            });

            state.set("normalThemeId", "custom");
          }

          const mapping = {
            "bg-primary-picker": "--bg-primary",
            "bg-secondary-picker": "--bg-secondary",
            "bg-tertiary-picker": "--bg-tertiary",
            "theme-color-picker": "--accent-color",
            "text-primary-picker": "--text-primary",
            "text-secondary-picker": "--text-secondary",
            "text-placeholder-picker": "--text-placeholder",
            "glow-color-picker": "--glow-color",
          };
          const cssVar = mapping[e.target.id];
          if (cssVar) {
            document.body.style.setProperty(cssVar, e.target.value);
            state.set(`custom-${cssVar}`, e.target.value);
            if (cssVar === "--bg-tertiary")
              this.updateIconInversion(e.target.value);
          }
          state.set("normalThemeId", "custom");
          this.updateWarningText();
        }
      });
    }

    if (this.els.updateBtn) {
      this.els.updateBtn.addEventListener("click", () => {
        window.open(
          "https://github.com/xtditom/YourDynamicDashboard/releases/latest",
          "_blank",
        );
      });
    }
    if (this.els.githubBtn) {
      this.els.githubBtn.addEventListener("click", () => {
        window.open(
          "https://github.com/xtditom/YourDynamicDashboard",
          "_blank",
        );
      });
    }

    if (this.els.saveThemeBtn) {
      this.els.saveThemeBtn.addEventListener("click", () =>
        this.saveCurrentTheme(),
      );
    }

    if (this.els.infoBtn) {
      this.els.infoBtn.addEventListener("click", () => {
        this.els.infoOverlay.classList.remove("hidden");

        // --- DYNAMIC VIBE: DELETE SECOND DEFAULT TASK ---
        if (state.get("defaultTasksPinned")) {
          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-2");
          });
        }
      });
    }
    if (this.els.infoClose) {
      this.els.infoClose.addEventListener("click", () =>
        this.els.infoOverlay.classList.add("hidden"),
      );
    }

    if (this.els.editKeysBtn) {
      this.els.editKeysBtn.addEventListener("click", () => {
        this.renderKeyEditor();
        this.els.keyOverlay.classList.remove("hidden");
      });
    }
    if (this.els.keyClose) {
      this.els.keyClose.addEventListener("click", () =>
        this.els.keyOverlay.classList.add("hidden"),
      );
    }
    if (this.els.keyReset) {
      this.els.keyReset.addEventListener("click", async () => {
        if (
          await showCustomModal("Reset keyboard shortcuts to default?", true)
        ) {
          state.set("keyMap", null);
          this.renderKeyEditor();
        }
      });
    }

    if (this.els.editLinkDirBtn) {
      this.els.editLinkDirBtn.addEventListener("click", () => {
        this.renderLinkDirectionEditor();
        this.els.linkDirOverlay.classList.remove("hidden");
      });
    }
    if (this.els.linkDirClose) {
      this.els.linkDirClose.addEventListener("click", () =>
        this.els.linkDirOverlay.classList.add("hidden"),
      );
    }
    if (this.els.linkDirReset) {
      this.els.linkDirReset.addEventListener("click", async () => {
        if (await showCustomModal("Reset link directions to default?", true)) {
          state.set("linkTargets", null);
          this.renderLinkDirectionEditor();
        }
      });
    }

    this.setupMiscListeners();

    if (this.els.randomBgFreeze) {
      this.els.randomBgFreeze.addEventListener("click", async () => {
        const currentMode = state.get("randomBgMode");
        if (currentMode === "freeze") {
          state.set("randomBgMode", "random");
          state.set("randomBgTime", null);
          this.fetchRandomBackground();
        } else {
          const result = await showCustomModal(
            "Freeze current background? You can save it for 72 hours or forever.",
            false,
            false,
            [
              { text: "Save Forever", value: "forever", width: "140px" },
              { text: "72 Hours", value: "ok", width: "120px" },
              {
                text: "Cancel",
                value: "cancel",
                width: "100px",
                style:
                  "background: var(--bg-interactive); color: var(--text-primary);",
              },
            ],
          );

          if (result === "cancel" || !result) return;

          state.set("randomBgMode", "freeze");
          if (result === "forever") {
            state.set("randomBgTime", -1);
          } else {
            state.set("randomBgTime", Date.now());
          }

          if (
            !state.get("savedBgUrl") ||
            !document.body.classList.contains("has-custom-bg")
          ) {
            this.fetchRandomBackground();
          } else {
            this.updateRandomBgButtons();
          }

          const message =
            result === "forever"
              ? "Background is saved forever! It won't change until you manually update it."
              : "Background is freezed for the next 72 hours.";

          setTimeout(() => showCustomModal(message), 10);
        }
      });
    }
    if (this.els.randomBgRnd) {
      this.els.randomBgRnd.addEventListener("click", () => {
        state.set("randomBgMode", "random");
        this.fetchRandomBackground();
      });
    }
  }

  renderKeyEditor() {
    if (!this.els.keyList) return;
    this.els.keyList.innerHTML = "";
    if (this.els.keyNoteContainer) this.els.keyNoteContainer.innerHTML = "";

    if (this.activeKeyCleanup) {
      this.activeKeyCleanup();
    }

    const map = state.get("keyMap");
    const labels = {
      todo: "Toggle To-Do",
      ai: "Toggle AI Tools",
      apps: "Toggle Google Apps",
      settings: "Toggle Settings",
      search: "Focus On Search",
      clock: "Toggle Clock Mode",
      date: "Toggle Date",
      autoTheme: "Toggle Auto Theme",
      tempDisplay: "Toggle Temp Display",
      numKeys: "Keys for Shortcuts",
      zen: "Key for Zen Mode",
      voice: "Key for Voice Search",
    };

    Object.entries(labels).forEach(([action, labelText]) => {
      let data = map[action];
      if (!data || typeof data !== "object") {
        data = DEFAULT_KEY_MAP[action] || { key: "?", enabled: false };
      }

      const currentKey = data.key;
      const isEnabled = data.enabled;
      const isFixed = data.fixed;

      const row = document.createElement("div");
      row.className = "key-row";

      const label = document.createElement("span");
      label.textContent = labelText;

      const controls = document.createElement("div");
      controls.className = "key-controls";

      let statusSpan = null;
      const btn = document.createElement("button");
      btn.className = `key-btn ${!isEnabled ? "disabled" : ""}`;
      btn.textContent = currentKey.toUpperCase();
      btn.disabled = !isEnabled;

      if (isFixed) {
        statusSpan = document.createElement("span");
        statusSpan.className = `key-fixed-status ${isEnabled ? "active" : "inactive"}`;
        statusSpan.textContent = isEnabled ? "ACTIVE" : "INACTIVE";
        statusSpan.style.fontWeight = "bold";
        statusSpan.style.padding = "0.4rem 1rem";
        statusSpan.style.minWidth = "60px";
        statusSpan.style.textAlign = "center";
        statusSpan.style.fontSize = "0.85rem";
        statusSpan.style.color = isEnabled
          ? "var(--accent-color)"
          : "var(--text-secondary)";
      }

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "toggle-switch mini";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isEnabled;
      const slider = document.createElement("span");
      slider.className = "slider";

      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(slider);

      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const newMap = { ...state.get("keyMap") };

        // Preserve fixed property if it exists
        const currentData = newMap[action] || DEFAULT_KEY_MAP[action];
        newMap[action] = {
          ...currentData,
          key: currentKey,
          enabled: checkbox.checked,
        };
        state.set("keyMap", newMap);
        this.renderKeyEditor();
      });

      if (!isFixed)
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.activeKeyCleanup) this.activeKeyCleanup();

          const originalText = btn.textContent;
          btn.textContent = "...";
          btn.classList.add("listening");
          btn.style.borderColor = "var(--accent-color)";

          const handler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            document.removeEventListener("keydown", handler, true);
            this.activeKeyCleanup = null;
            btn.classList.remove("listening");
            btn.style.borderColor = "";

            const pressedKey = event.key.toLowerCase();
            if (event.key === "Escape") {
              btn.textContent = originalText;
              return;
            }
            if (
              (pressedKey >= "1" && pressedKey <= "9") ||
              pressedKey === "z" ||
              pressedKey === "v"
            ) {
              btn.textContent = "Reserved!";
              btn.style.borderColor = "#e53e3e";
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.borderColor = "";
              }, 1000);
              return;
            }
            const currentMap = state.get("keyMap");
            const existingAction = Object.keys(currentMap).find((k) => {
              const item = currentMap[k];
              const itemKey = typeof item === "object" ? item.key : item;
              return itemKey === pressedKey && k !== action && item.enabled;
            });

            if (existingAction) {
              btn.textContent = "Taken!";
              btn.style.borderColor = "#e53e3e";
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.borderColor = "";
              }, 1000);
              return;
            }
            const newMap = { ...currentMap };
            newMap[action] = { key: pressedKey, enabled: true };
            state.set("keyMap", newMap);
            this.renderKeyEditor();
          };

          this.activeKeyCleanup = () => {
            document.removeEventListener("keydown", handler, true);
            btn.textContent = originalText;
            btn.classList.remove("listening");
            btn.style.borderColor = "";
            this.activeKeyCleanup = null;
          };
          document.addEventListener("keydown", handler, { capture: true });
        });

      if (isFixed) {
        controls.appendChild(statusSpan);
      } else {
        controls.appendChild(btn);
      }
      controls.appendChild(toggleLabel);
      row.appendChild(label);
      row.appendChild(controls);
      this.els.keyList.appendChild(row);
    });

    const note = document.createElement("div");
    note.className = "settings-note";
    note.style.marginTop = "1rem";

    // Manual creation to avoid innerHTML
    const p = document.createElement("p");
    p.appendChild(document.createTextNode("Keys "));
    const strong1 = document.createElement("strong");
    strong1.textContent = "1-9";
    p.appendChild(strong1);
    p.appendChild(document.createTextNode(" are reserved for "));
    const strong2 = document.createElement("strong");
    strong2.textContent = "Shortcuts";
    p.appendChild(strong2);
    p.appendChild(document.createElement("br"));
    p.appendChild(document.createTextNode("Press "));
    const strong3 = document.createElement("strong");
    strong3.textContent = "Z";
    p.appendChild(strong3);
    p.appendChild(document.createTextNode(" for "));
    const strong4 = document.createElement("strong");
    strong4.textContent = "Zen Mode";
    p.appendChild(strong4);
    p.appendChild(document.createTextNode(", "));
    const strong5 = document.createElement("strong");
    strong5.textContent = "V";
    p.appendChild(strong5);
    p.appendChild(document.createTextNode(" for "));
    const strong6 = document.createElement("strong");
    strong6.textContent = "Voice Search";
    p.appendChild(strong6);

    note.appendChild(p);
    if (this.els.keyNoteContainer) {
      this.els.keyNoteContainer.appendChild(note);
    } else {
      this.els.keyList.appendChild(note);
    }
  }

  renderLinkDirectionEditor() {
    if (!this.els.linkDirList) return;
    this.els.linkDirList.innerHTML = "";

    let targets = state.get("linkTargets");
    if (!targets) {
      targets = { ...CONFIG.defaults.linkTargets };
      state.set("linkTargets", targets);
    }

    const labels = {
      ai: "AI Tools & Socials",
      apps: "Google Apps",
      shortcuts: "Shortcuts",
      searchOpen: "Search Open Button",
    };

    Object.entries(labels).forEach(([key, labelText]) => {
      const currentTarget = targets[key] || "_blank";
      const isNewTab = currentTarget === "_blank";

      const row = document.createElement("div");
      row.className = "key-row"; // Reuse key-row styling

      const label = document.createElement("span");
      label.textContent = labelText;

      const controls = document.createElement("div");
      controls.className = "key-controls";

      const statusText = document.createElement("span");
      statusText.textContent = isNewTab ? "New Tab" : "Same Tab";
      statusText.style.marginRight = "10px";
      statusText.style.fontSize = "0.9em";
      statusText.style.opacity = "0.8";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "toggle-switch mini";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isNewTab;
      const slider = document.createElement("span");
      slider.className = "slider";

      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(slider);

      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const newTargets = { ...state.get("linkTargets") };
        newTargets[key] = checkbox.checked ? "_blank" : "_self";
        state.set("linkTargets", newTargets);
        this.renderLinkDirectionEditor();
      });

      controls.appendChild(statusText);
      controls.appendChild(toggleLabel);
      row.appendChild(label);
      row.appendChild(controls);
      this.els.linkDirList.appendChild(row);
    });
  }

  saveCurrentTheme() {
    if (state.get("gradientModeActive")) {
      showCustomModal("You cannot save Gradient themes as presets.");
      return;
    }

    const currentColors = {};
    const vars = [
      "--bg-primary",
      "--bg-secondary",
      "--bg-tertiary",
      "--accent-color",
      "--text-primary",
      "--text-secondary",
      "--text-placeholder",
      "--glow-color",
    ];

    vars.forEach((v) => {
      currentColors[v] =
        state.get(`custom-${v}`) ||
        getComputedStyle(document.body).getPropertyValue(v).trim();
    });

    const isMatch = THEMES.normal.some(
      (t) => JSON.stringify(t.colors) === JSON.stringify(currentColors),
    );
    if (isMatch) {
      showCustomModal("This matches a built-in theme. No need to save.");
      return;
    }

    let savedThemes = state.get("userSavedThemes") || [];

    if (savedThemes.length >= 5) {
      savedThemes[4] = {
        id: `preset-${Date.now()}`,
        name: `Preset 5`,
        colors: currentColors,
      };
    } else {
      savedThemes.push({
        id: `preset-${Date.now()}`,
        name: `Preset ${savedThemes.length + 1}`,
        colors: currentColors,
      });
    }

    state.set("userSavedThemes", savedThemes);
    this.renderSavedThemes();
  }

  renderSavedThemes() {
    if (!this.els.savedContainer) return;
    this.els.savedContainer.innerHTML = "";
    const savedThemes = state.get("userSavedThemes") || [];

    for (let i = 0; i < 5; i++) {
      const theme = savedThemes[i];
      const btn = document.createElement("div");
      btn.className = "saved-preset-button";

      if (theme) {
        btn.classList.add("filled");
        btn.textContent = theme.name;
        btn.style.background = theme.colors["--bg-primary"];
        btn.style.color = theme.colors["--text-primary"];
        btn.style.borderColor = theme.colors["--accent-color"];

        btn.addEventListener("click", () => {
          this.disableAutoTheme();
          this.applyNormalTheme(theme);
          // Complete Theme Task
          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-5");
          });
        });

        const del = document.createElement("div");
        del.className = "delete-preset";
        del.textContent = "×";
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const newSaved = savedThemes.filter((_, idx) => idx !== i);
          newSaved.forEach((t, idx) => (t.name = `Preset ${idx + 1}`));
          state.set("userSavedThemes", newSaved);
          this.renderSavedThemes();
        });
        btn.appendChild(del);
      } else {
        btn.textContent = "Empty";
      }
      this.els.savedContainer.appendChild(btn);
    }
  }

  applyNormalTheme(theme, skipBgWipe = false) {
    if (!skipBgWipe) {
      state.set("backgroundImage", null);
      state.set("randomBgMode", null);
      state.set("savedBgUrl", null);
      state.set("bgSavedDate", null);
      document.body.style.backgroundImage = "";
      document.body.classList.remove("has-custom-bg");
      if (this.els.removeBg) this.els.removeBg.classList.add("hidden");
      this.updateRandomBgButtons();
      this.updateAutoThemeGlowState();
    }

    state.set("gradientModeActive", false);
    state.set("transparencyActive", false);
    document.body.classList.remove("gradient-mode-active");
    document.body.classList.remove("gradient-dark");
    document.body.classList.remove("gradient-light");
    document.body.classList.remove("transparency-active");

    if (theme.id) {
      state.set("normalThemeId", theme.id);
    } else {
      state.set("normalThemeId", "custom");
    }

    Object.entries(theme.colors).forEach(([key, val]) => {
      document.body.style.setProperty(key, val);
      state.set(`custom-${key}`, val);
      if (key === "--bg-tertiary") this.updateIconInversion(val);
    });

    if (theme.id === "default-dark") {
      document.body.style.setProperty("--icon-filter", "grayscale(100%)");
      document.body.style.setProperty("--icon-opacity", "0.99");

      state.set("darkMode", true);
      if (this.els.dark) this.els.dark.checked = true;
    } else {
      document.body.style.setProperty("--icon-filter", "grayscale(0%)");
      document.body.style.setProperty("--icon-opacity", "1");

      state.set("darkMode", false);
      if (this.els.dark) this.els.dark.checked = false;
    }

    this.syncColorPickers(theme.colors);

    const isDarkType = theme.type === "dark" || theme.type === "default-dark";
    document.body.setAttribute("data-theme", isDarkType ? "dark" : "light");

    this.updateWarningText();
    this.updateAutoThemeGlowState();
    document.body.classList.remove("force-white-text");
  }

  applyGradientTheme(theme, save = true, skipBgWipe = false) {
    if (!skipBgWipe) {
      state.set("backgroundImage", null);
      state.set("randomBgMode", null);
      state.set("savedBgUrl", null);
      state.set("bgSavedDate", null);
      document.body.style.backgroundImage = "";
      document.body.classList.remove("has-custom-bg");
      if (this.els.removeBg) this.els.removeBg.classList.add("hidden");
      this.updateRandomBgButtons();
      this.updateAutoThemeGlowState();
    }

    if (save) {
      state.set("gradientModeActive", true);
      state.set("gradientThemeId", theme.id);
      state.set("transparencyActive", true);
    }

    state.set("darkMode", false);
    if (this.els.dark) this.els.dark.checked = false;

    document.body.style.setProperty("--gradient-color-1", theme.colors[0]);
    document.body.style.setProperty("--gradient-color-2", theme.colors[1]);

    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const timings = ["ease", "linear", "ease-in-out"];
    const randomAngle = angles[Math.floor(Math.random() * angles.length)];
    const randomTiming = timings[Math.floor(Math.random() * timings.length)];

    document.body.style.setProperty("--gradient-angle", `${randomAngle}deg`);
    document.body.style.setProperty("--gradient-timing", randomTiming);

    document.body.classList.add("gradient-mode-active");
    document.body.classList.add("transparency-active");

    // Add specific class for Dark/Light Gradient and set data-theme
    document.body.classList.remove("gradient-dark", "gradient-light");
    if (theme.type === "dark") {
      document.body.classList.add("gradient-dark");
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.classList.add("gradient-light");
      document.body.setAttribute("data-theme", "light");
    }

    const forceWhiteTextThemes = [
      "electric-sky",
      "cotton-candy",
      "glacier",
      "bio-lime",
    ];
    if (forceWhiteTextThemes.includes(theme.id)) {
      document.body.classList.add("force-white-text");
    } else {
      document.body.classList.remove("force-white-text");
    }

    Object.entries(theme.ui).forEach(([key, val]) => {
      document.body.style.setProperty(key, val);
    });

    this.updateWarningText();
    this.updateAutoThemeGlowState();
  }

  applyCustomColors() {
    if (state.get("gradientModeActive")) return;

    const defaultFallback = THEMES.normal[1].colors;

    const vars = [
      "--bg-primary",
      "--bg-secondary",
      "--accent-color",
      "--text-primary",
      "--bg-tertiary",
      "--text-secondary",
      "--text-placeholder",
      "--glow-color",
    ];

    const colors = {};
    vars.forEach((v) => {
      const saved =
        state.get(`custom-${v}`) ||
        defaultFallback[v] ||
        getComputedStyle(document.body).getPropertyValue(v).trim();
      if (saved) {
        document.body.style.setProperty(v, saved);
        colors[v] = saved;
        if (v === "--bg-tertiary") this.updateIconInversion(saved);
      }
    });
    this.syncColorPickers(colors);
    document.body.style.setProperty("--icon-filter", "grayscale(0%)");
    document.body.style.setProperty("--icon-opacity", "1");
  }

  async searchLocation() {
    const city = this.els.locInput.value.trim();
    if (!city) return;

    this.els.locInput.disabled = true;
    if (this.els.locSave) this.els.locSave.textContent = "...";
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const loc = data.results[0];
        state.set("yd_city", loc.name);
        state.set("yd_lat", loc.latitude);
        state.set("yd_lon", loc.longitude);
        state.set("locationUpdate", Date.now());
        this.els.locInput.value = loc.name;
        if (this.els.locSave) {
          this.els.locSave.textContent = "Saved";
          setTimeout(() => {
            this.els.locSave.textContent = "Save";
          }, 2000);
        }
      } else {
        showCustomModal(
          `Could not find any city with name "${city}". Try another name.`,
        );
        if (this.els.locSave) this.els.locSave.textContent = "Save";
      }
    } catch (e) {
      showCustomModal("Connection error. Check your internet.");
      if (this.els.locSave) this.els.locSave.textContent = "Save";
    } finally {
      this.els.locInput.disabled = false;
    }
  }

  async reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      const data = await res.json();
      return data.city || data.locality || "Unknown Location";
    } catch (e) {
      return `${parseFloat(lat).toFixed(1)}, ${parseFloat(lon).toFixed(1)}`;
    }
  }

  async detectLocation() {
    if (!navigator.geolocation) {
      showCustomModal("Geolocation not supported by your browser.");
      return;
    }

    const triggerNativeGPS = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const gpsLat = pos.coords.latitude;
          const gpsLon = pos.coords.longitude;
          const gpsCity = await this.reverseGeocode(gpsLat, gpsLon);
          state.set("yd_city", gpsCity);
          state.set("yd_lat", gpsLat);
          state.set("yd_lon", gpsLon);
          state.set("locationUpdate", Date.now());
          if (this.els.locInput) this.els.locInput.value = gpsCity;
        },
        (err) =>
          showCustomModal(
            "Geolocation error: " +
              err.message +
              ". Please enable location services.",
          ),
      );
    };

    if (localStorage.getItem("hideGpsConsent") === "true") {
      triggerNativeGPS();
      return;
    }

    const modal = document.getElementById("gps-consent-modal-overlay");
    const agreeBtn = document.getElementById("gps-consent-agree");
    const cancelBtn = document.getElementById("gps-consent-cancel");
    const checkbox = document.getElementById("gps-consent-checkbox");

    if (modal) {
      modal.classList.remove("hidden");

      const closeAndClean = () => {
        modal.classList.add("hidden");
        agreeBtn.replaceWith(agreeBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      };

      document
        .getElementById("gps-consent-agree")
        .addEventListener("click", () => {
          if (checkbox.checked) {
            localStorage.setItem("hideGpsConsent", "true");
          }
          closeAndClean();
          triggerNativeGPS();
        });

      document
        .getElementById("gps-consent-cancel")
        .addEventListener("click", () => {
          closeAndClean();
        });
    } else {
      triggerNativeGPS(); // Fallback if modal fails to load
    }
  }

  updateWarningText() {
    const isGradient = state.get("gradientModeActive");
    if (this.els.themeColorNote) {
      this.els.themeColorNote.style.display = "none";
    }

    // Disable Advanced Colors in Gradient Mode
    if (this.els.colorControls) {
      if (isGradient) {
        this.els.colorControls.classList.add("disabled");
      } else {
        this.els.colorControls.classList.remove("disabled");
      }
    }

    // Disable Glow Toggle & Picker in Gradient Mode
    const glowPicker = document.getElementById("glow-color-picker");
    if (this.els.glowToggle) {
      this.els.glowToggle.disabled = isGradient;
      const glowRow = this.els.glowToggle.closest(".setting-row");

      if (isGradient) {
        if (glowRow) glowRow.classList.add("disabled");

        // Also disable the picker explicitly if in gradient mode
        if (glowPicker) {
          glowPicker.disabled = true;
          glowPicker.style.opacity = "0.5";
          glowPicker.style.cursor = "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) parentRow.classList.add("disabled");
        }
      } else {
        if (glowRow) glowRow.classList.remove("disabled");

        // Re-evaluate picker state based on toggle value
        const isGlowOn = this.els.glowToggle.checked;
        if (glowPicker) {
          glowPicker.disabled = !isGlowOn;
          glowPicker.style.opacity = isGlowOn ? "1" : "0.5";
          glowPicker.style.cursor = isGlowOn ? "pointer" : "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) {
            if (!isGlowOn) parentRow.classList.add("disabled");
            else parentRow.classList.remove("disabled");
          }
        }
      }
    }
  }

  syncColorPickers(colors) {
    const mapping = {
      "--bg-primary": "bg-primary-picker",
      "--bg-secondary": "bg-secondary-picker",
      "--bg-tertiary": "bg-tertiary-picker",
      "--accent-color": "theme-color-picker",
      "--text-primary": "text-primary-picker",
      "--text-secondary": "text-secondary-picker",
      "--text-placeholder": "text-placeholder-picker",
      "--glow-color": "glow-color-picker",
    };
    Object.entries(colors).forEach(([key, val]) => {
      const id = mapping[key];
      if (id) {
        const el = document.getElementById(id);
        if (el) el.value = val;
      }
    });
  }

  renderThemes() {
    const createBtn = (container, list, isGradient) => {
      if (!container) return;
      container.innerHTML = "";
      list.forEach((theme) => {
        const btn = document.createElement("button");
        btn.className = `theme-preset-button ${isGradient ? "gradient" : ""}`;
        btn.textContent = theme.name;
        if (isGradient) {
          btn.style.background = `linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})`;
        } else {
          btn.style.background = theme.colors["--bg-primary"];
          btn.style.color = theme.colors["--text-primary"];
          btn.style.borderColor = theme.colors["--accent-color"];
        }
        btn.addEventListener("click", () => {
          this.disableAutoTheme();
          if (isGradient) this.applyGradientTheme(theme);
          else this.applyNormalTheme(theme);

          // Complete theme task
          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-5");
          });
        });
        container.appendChild(btn);
      });
    };
    createBtn(this.els.normalContainer, THEMES.normal, false);
    createBtn(this.els.gradientContainer, THEMES.gradient, true);
  }

  bindSimpleToggle(el, key, trueValue) {
    if (!el) return;
    const current = state.get(key);
    if (key === "showDate") {
      if (current === undefined || current === null) {
        state.set(key, false);
        el.checked = false;
      } else {
        el.checked = current === true;
      }
    } else if (key === "autoTheme") {
      if (current === undefined) {
        state.set(key, false);
        el.checked = false;
      } else {
        el.checked = current === true;
      }
    } else {
      if (typeof trueValue === "boolean") {
        el.checked = current === trueValue;
      } else {
        el.checked = current === trueValue;
      }
    }

    el.addEventListener("change", () => {
      const val =
        typeof trueValue === "boolean"
          ? el.checked
          : el.checked
            ? trueValue
            : key === "clockFormat"
              ? "12"
              : "digital";
      if (key === "tempUnit")
        state.set(key, el.checked ? "imperial" : "metric");
      else state.set(key, val);
    });
  }

  setupMiscListeners() {
    if (this.els.locInput) {
      this.els.locInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.searchLocation();
      });
    }
    if (this.els.locSave) {
      this.els.locSave.addEventListener("click", () => this.searchLocation());
    }
    if (this.els.locDetect) {
      this.els.locDetect.addEventListener("click", () => this.detectLocation());
    }
    this.els.uploadBg.addEventListener("click", () => {
      this.els.bgInput.value = "";
      this.els.bgInput.click();
    });
    this.els.bgInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            let width = img.width;
            let height = img.height;
            const maxWidth = 1920;
            const maxHeight = 1080;

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

            state.set("backgroundImage", dataUrl);
            state.set("randomBgMode", null);
            document.body.classList.add("has-custom-bg");
            document.body.style.backgroundImage = `url(${dataUrl})`;
            if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
            this.updateRandomBgButtons();
            this.updateAutoThemeGlowState();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
    this.els.removeBg.addEventListener("click", () => {
      state.set("backgroundImage", null);
      state.set("randomBgMode", null);
      document.body.classList.remove("has-custom-bg");
      document.body.style.backgroundImage = "";
      this.els.removeBg.classList.add("hidden");
      this.updateRandomBgButtons();
      this.updateAutoThemeGlowState();
    });
    if (this.els.shortcutForm) {
      this.els.shortcutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const inputs = this.els.shortcutForm.querySelectorAll("input");
        this.addShortcut(inputs[0].value, inputs[1].value);
        inputs[0].value = "";
        inputs[1].value = "";
      });
    }
    this.els.backup.addEventListener("click", () => this.backup());
    this.els.restore.addEventListener("click", () =>
      this.els.restoreInput.click(),
    );
    this.els.restoreInput.addEventListener("change", (e) => this.restore(e));
    this.els.reset.addEventListener("click", async () => {
      if (
        await showCustomModal(
          "Resetting all deletes everything. Make sure you have backed up your settings. Are you sure you want to continue?",
          true,
          true,
        )
      ) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  renderShortcutEditor() {
    if (!this.els.shortcutList) return;
    this.els.shortcutList.innerHTML = "";
    const shortcuts = state.get("userShortcuts") || [];
    shortcuts.forEach((s, index) => {
      const div = document.createElement("div");
      div.className = "shortcut-editor-item";
      div.draggable = true;
      div.dataset.index = index;

      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.title = "Drag to reorder";
      dragHandle.textContent = "☰";

      // Icon
      const img = document.createElement("img");
      img.src = s.icon;
      img.className = "icon";

      const inputsDiv = document.createElement("div");
      inputsDiv.className = "inputs";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "name-input";
      nameInput.value = s.name;
      nameInput.placeholder = "Name";
      nameInput.maxLength = 35;

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "url-input";
      urlInput.value = s.url;
      urlInput.placeholder = "URL";

      inputsDiv.appendChild(nameInput);
      inputsDiv.appendChild(urlInput);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "actions";

      const saveBtn = document.createElement("button");
      saveBtn.className = "action-btn save";
      saveBtn.title = "Save";
      // SVG is static, safe to use innerHTML for icon only
      saveBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';

      const delBtn = document.createElement("button");
      delBtn.className = "action-btn delete";
      delBtn.title = "Delete";
      delBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      actionsDiv.appendChild(saveBtn);
      actionsDiv.appendChild(delBtn);

      div.appendChild(dragHandle);
      div.appendChild(img);
      div.appendChild(inputsDiv);
      div.appendChild(actionsDiv);

      saveBtn.addEventListener("click", () => {
        this.updateShortcut(index, nameInput.value, urlInput.value);
        saveBtn.style.color = "var(--accent-color)";
        setTimeout(() => (saveBtn.style.color = ""), 500);
      });
      delBtn.addEventListener("click", () => this.deleteShortcut(index));
      div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", index);
        div.classList.add("dragging");
      });
      div.addEventListener("dragend", () => {
        div.classList.remove("dragging");
      });
      div.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      div.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = index;
        this.reorderShortcuts(fromIndex, toIndex);
      });
      this.els.shortcutList.appendChild(div);
    });
  }

  addShortcut(name, url) {
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const current = [...(state.get("userShortcuts") || [])];
    const cleanName = name.substring(0, 35);
    current.push({ name: cleanName, url, icon: getIconUrl(url) });
    state.set("userShortcuts", current);
    this.renderShortcutEditor();
  }

  updateShortcut(index, name, url) {
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const current = [...(state.get("userShortcuts") || [])];
    if (current[index]) {
      current[index].name = name.substring(0, 35);
      current[index].url = url;
      current[index].icon = getIconUrl(url);
      state.set("userShortcuts", current);
    }
  }

  deleteShortcut(index) {
    const current = [...(state.get("userShortcuts") || [])];
    current.splice(index, 1);
    state.set("userShortcuts", current);
    this.renderShortcutEditor();
  }

  reorderShortcuts(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const current = [...(state.get("userShortcuts") || [])];
    const item = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, item);
    state.set("userShortcuts", current);
    this.renderShortcutEditor();
  }

  backup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ydd-backup.json";
    a.click();
  }
  restore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.keys(data).forEach((key) =>
          localStorage.setItem(key, data[key]),
        );
        location.reload();
      } catch (err) {
        showCustomModal("Invalid Backup File");
      }
    };
    reader.readAsText(file);
  }

  async fetchRandomBackground() {
    const targetBtn = this.els.randomBgRnd;
    let originalContent = "";
    if (targetBtn) {
      originalContent = targetBtn.innerHTML;
      targetBtn.innerHTML = "⏳";
      targetBtn.disabled = true;
    }

    const applyBg = (url) => {
      document.body.classList.add("has-custom-bg");
      document.body.style.backgroundImage = `url(${url})`;
      state.set("backgroundImage", url);
      if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");

      this.disableAutoTheme();
      this.updateRandomBgButtons();
      this.updateAutoThemeGlowState();

      if (targetBtn) {
        targetBtn.innerHTML = originalContent;
        targetBtn.disabled = false;
      }
    };

    const width = Math.round(window.screen.width * window.devicePixelRatio);
    const height = Math.round(window.screen.height * window.devicePixelRatio);

    try {
      const response = await fetch(
        `https://picsum.photos/${width}/${height}?random=1`,
      );
      const finalUrl = response.url;
      state.set("savedBgUrl", finalUrl);
      applyBg(finalUrl);
    } catch (err) {
      if (targetBtn) {
        targetBtn.innerHTML = originalContent;
        targetBtn.disabled = false;
      }
    }
  }

  updateRandomBgButtons() {
    const mode = state.get("randomBgMode");

    if (this.els.randomBgFreeze) {
      if (mode === "freeze") {
        this.els.randomBgFreeze.textContent = "Unfreeze";
        this.els.randomBgFreeze.style.color = "var(--accent-color)";
        this.els.randomBgFreeze.style.borderColor = "var(--accent-color)";
        this.els.randomBgFreeze.classList.remove("hidden");
      } else if (mode === "random") {
        this.els.randomBgFreeze.textContent = "Freeze";
        this.els.randomBgFreeze.style.color = "";
        this.els.randomBgFreeze.style.borderColor = "";
        this.els.randomBgFreeze.classList.remove("hidden");
      } else {
        this.els.randomBgFreeze.textContent = "Freeze";
        this.els.randomBgFreeze.style.color = "";
        this.els.randomBgFreeze.style.borderColor = "";
        this.els.randomBgFreeze.classList.add("hidden");
      }
    }

    if (this.els.randomBgRnd) {
      this.els.randomBgRnd.style.color =
        mode === "random" ? "var(--accent-color)" : "";
      this.els.randomBgRnd.style.borderColor =
        mode === "random" ? "var(--accent-color)" : "";
    }
  }

  updateAutoThemeGlowState() {
    const hasBg = document.body.classList.contains("has-custom-bg");
    const isGradient = document.body.classList.contains("gradient-mode-active");

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.disabled = hasBg;
      const parentRow = this.els.autoThemeToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = hasBg ? "0.5" : "1";
    }

    // Disable glow toggle if custom background OR gradient mode is active
    const disabledControls = hasBg || isGradient;
    if (this.els.glowToggle) {
      this.els.glowToggle.disabled = disabledControls;
      const parentRow = this.els.glowToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = disabledControls ? "0.5" : "1";
    }

    // Disable Advanced Colors section
    const advancedColorsContainer = document.getElementById(
      "advanced-color-controls",
    );
    const themeColorNote = document.getElementById("theme-color-note");
    const advancedColorWarning = document.getElementById(
      "advanced-color-warning",
    );

    if (advancedColorsContainer) {
      if (disabledControls) {
        advancedColorsContainer.classList.add("advanced-colors-disabled");
        if (themeColorNote) {
          themeColorNote.style.color = "#ff6b6b"; // Warning color
          themeColorNote.style.fontWeight = "bold";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.remove("hidden");
        }
      } else {
        advancedColorsContainer.classList.remove("advanced-colors-disabled");
        if (themeColorNote) {
          themeColorNote.style.color = ""; // Revert to CSS default
          themeColorNote.style.fontWeight = "normal";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.add("hidden");
        }
      }
    }

    // Disable glow strictly if custom background active
    // (Gradient text shadows are handled via CSS)
    if (hasBg) {
      document.body.classList.add("no-glow");
    } else {
      const isGlowOn = state.get("glowEffect") !== false;
      document.body.classList.toggle("no-glow", !isGlowOn);
    }
  }

  updateIconInversion(colorVal) {
    if (!colorVal) return;
    let r, g, b;
    const color = colorVal.trim().toLowerCase();

    if (color.startsWith("#")) {
      let hex = color.substring(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (color.startsWith("rgb")) {
      const match = color.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      }
    }

    if (r !== undefined && g !== undefined && b !== undefined) {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      document.body.classList.toggle("dark-popups", luminance < 128);
    }
  }
}

// src/modules/settings.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
