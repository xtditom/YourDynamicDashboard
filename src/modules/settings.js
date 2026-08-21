import { state } from "../state.js";
import { getIconUrl, showCustomModal, completeDefaultTask } from "../utils.js";
import { secondStorage } from "../secondStorage.js";
import {
  clearYddLocalStorage,
  getYddStorageEntries,
  validateYddStorageEntries,
} from "../storageKeys.js";
import {
  MAX_SHORTCUTS,
  MAX_SHORTCUT_NAME_LENGTH,
  normalizeHttpUrl,
  validateImageBlob,
} from "../validators.js";

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

export function getThemeRightColor(theme) {
  if (!theme || !theme.colors) return "#ffffff";
  if (theme.id === "theme-3" || theme.name === "Azure Sky") return "#006EFF";
  if (theme.id === "theme-7" || theme.name === "Phosphor") return "#91AA5B";
  return (
    theme.colors["--accent-color"] ||
    theme.colors["--text-primary"] ||
    "#ffffff"
  );
}
window.__getThemeRightColor = getThemeRightColor;

export const THEMES = {
  normal: [
    {
      id: "default-light",
      type: "light",
      name: "Light",
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
      name: "Dark",
      colors: {
        "--bg-primary": "#0a0a0a",
        "--bg-secondary": "#3a3a3a",
        "--bg-tertiary": "#2d2d2d",
        "--accent-color": "#ffffff",
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
    {
      id: "theme-8",
      type: "light",
      name: "Lavender Mist",
      colors: {
        "--bg-primary": "#ded6ff",
        "--bg-secondary": "#ffffff",
        "--bg-tertiary": "#cdc1fb",
        "--accent-color": "#6953b8",
        "--text-primary": "#33265f",
        "--text-secondary": "#5a4b7a",
        "--text-placeholder": "#887aa8",
        "--glow-color": "#9b87d3",
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
      id: "dawn-bloom",
      name: "Dawn Bloom",
      colors: ["#ffd6a5", "#ffafcc"],
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
  static THEMES = null;

  constructor() {
    if (SettingsManager.instance) {
      return SettingsManager.instance;
    }
    SettingsManager.instance = this;
    SettingsManager.THEMES = THEMES;
    this._backgroundOperationId = 0;
    this._activeBackgroundObjectUrl = null;
    window.addEventListener(
      "pagehide",
      () => this._releaseActiveBackgroundObjectUrl(),
      { once: true },
    );

    // Expose for full settings modal module
    window.__settingsManagerInstance = this;
    window.__YDD_THEMES = THEMES;

    this.els = {
      btn: document.getElementById("settings-toggle-button"),
      popup: document.getElementById("settings-popup"),
      tabs: document.querySelectorAll(".settings-tab-button"),
      panes: document.querySelectorAll(".settings-pane"),
      clockType: document.getElementById("clock-type-toggle"),
      clockFormat: document.getElementById("clock-format-toggle"),
      clockFormatRow: document.getElementById("clock-format-row"),
      hideGreetings: document.getElementById("hide-greetings-toggle"),
      dateToggle: document.getElementById("date-visibility-toggle"),
      tempUnit: document.getElementById("temp-unit-toggle"),
      todo: document.getElementById("todo-visibility-toggle"),
      apps: document.getElementById("apps-visibility-toggle"),
      ai: document.getElementById("ai-tools-visibility-toggle"),
      shortcutsPosition: document.getElementById("shortcuts-position-select"),
      dark: document.getElementById("dark-mode-toggle"),
      autoThemeToggle: document.getElementById("auto-theme-toggle"),
      glowToggle: document.getElementById("glow-effect-toggle"),
      editableTextToggle: document.getElementById("editable-text-toggle"),
      widgetControl: document.getElementById("widget-control-select"),
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
      bgBlurSelect: document.getElementById("bg-blur-select"),
      blurRow: document.getElementById("blur-intensity-row"),
    };

    if (!this.els.btn) return;
    this.init();
  }

  init() {
    if (!this.els.glowToggle) {
      this.els.glowToggle = document.getElementById("glow-effect-toggle");
    }

    this.loadInitialState();
    this.setupEventListeners();
    this.renderThemes();
    this.renderSavedThemes();
    this.renderMiniThemes();
    this.renderShortcutEditor();

    state.subscribe((key, value) => {
      if (
        key === "widgetControl" ||
        key === "yd_city" ||
        key === "yd_lat" ||
        key === "yd_lon" ||
        key === "locationUpdate"
      ) {
        if (key === "widgetControl" && this.els.widgetControl) {
          this.els.widgetControl.value = value || "all";
        }
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
      if (key === "hideGreetings") {
        if (this.els.hideGreetings) {
          this.els.hideGreetings.checked = value === true;
        }
      }
      if (key === "clockType") {
        if (this.els.clockType) {
          this.els.clockType.checked = value === "analog";
        }
        this.updateClockFormatState();
      }
      if (key === "userSavedThemes") {
        this.renderSavedThemes();
        this.renderMiniThemes();
      }
      if (
        key === "gradientModeActive" ||
        key === "backgroundImage" ||
        key === "randomBgMode" ||
        key === "normalThemeId" ||
        key === "gradientThemeId"
      ) {
        this.updateAutoThemeGlowState();
      }
      if (key === "glowEffect") {
        const isGlowOn = value !== false;
        if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;
        document.body.classList.toggle("no-glow", !isGlowOn);

        const glowPicker = document.getElementById("glow-color-picker");
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
    });
  }

  loadInitialState() {
    this.bindSimpleToggle(this.els.clockType, "clockType", "analog");
    this.bindSimpleToggle(this.els.clockFormat, "clockFormat", "24");
    this.bindSimpleToggle(this.els.hideGreetings, "hideGreetings", false);
    this.bindSimpleToggle(this.els.dateToggle, "showDate", false);
    this.bindSimpleToggle(this.els.tempUnit, "tempUnit", "imperial");
    this.bindSimpleToggle(this.els.tempDisplayToggle, "tempDisplayMode", true);
    this.bindSimpleToggle(this.els.todo, "showTodo", true);
    this.bindSimpleToggle(this.els.apps, "showApps", true);
    this.bindSimpleToggle(this.els.ai, "showAiTools", true);
    this.bindSimpleToggle(this.els.autoThemeToggle, "autoTheme", false);
    this.bindSimpleToggle(
      this.els.editableTextToggle,
      "showEditableText",
      true,
    );

    if (this.els.shortcutsPosition) {
      this.els.shortcutsPosition.value =
        state.get("shortcutsPosition") || "bottom";
      if (
        state.get("showShortcuts") === false &&
        !state.get("shortcutsPosition")
      ) {
        this.els.shortcutsPosition.value = "hide";
        state.set("shortcutsPosition", "hide");
      }
    }

    this.bindSimpleToggle(this.els.glowToggle, "glowEffect", true);

    if (this.els.dark) {
      this.els.dark.checked = state.get("darkMode") === true;
    }

    if (this.els.widgetControl)
      this.els.widgetControl.value = state.get("widgetControl") || "all";
    if (this.els.locInput) this.els.locInput.value = state.get("yd_city") || "";

    if (this.els.bgBlurSelect) {
      const savedBlur = state.get("bgBlurIntensity") || "0";
      this.els.bgBlurSelect.value = savedBlur;

      const blurMap = {
        0: 0,
        10: 2,
        20: 4,
        30: 6,
        40: 8,
        50: 10,
      };
      const blurPx = blurMap[savedBlur] || 0;
      document.documentElement.style.setProperty("--bg-blur", blurPx + "px");

      if (
        savedBlur === "10" ||
        savedBlur === "20" ||
        savedBlur === "30" ||
        savedBlur === "40" ||
        savedBlur === "50"
      ) {
        document.documentElement.classList.add("high-bg-blur");
      } else {
        document.documentElement.classList.remove("high-bg-blur");
      }
    }

    const bg = state.get("backgroundImage");
    const randomBgMode = state.get("randomBgMode");
    const randomBgTime = state.get("randomBgTime");

    if (randomBgMode === "random") {
      document.body.classList.add("has-custom-bg");
      this.fetchRandomBackground("startup");
    } else if (randomBgMode === "freeze") {
      document.body.classList.add("has-custom-bg");
      if (randomBgTime === -1) {
        if (state.get("savedBgUrl")) {
          document.body.style.backgroundImage = `url(${state.get("savedBgUrl")})`;
        } else if (bg) {
          document.body.style.backgroundImage = `url(${bg})`;
        }
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      } else if (randomBgTime && Date.now() - randomBgTime > 259200000) {
        this.fetchRandomBackground("startup");
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

    secondStorage
      .getImage()
      .then((blob) => {
        if (blob) {
          document.body.classList.add("has-custom-bg");
          if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
          this.updateAutoThemeGlowState();
        }
      })
      .catch((err) => console.error("IndexedDB load error:", err));

    this.updateRandomBgButtons();
    this.updateAutoThemeGlowState();

    const currentGlow = state.get("glowEffect");
    const isGlowOn = currentGlow !== false;
    document.body.classList.toggle("no-glow", !isGlowOn);
    if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;

    if (state.get("autoTheme")) {
      if (document.body.classList.contains("has-custom-bg")) {
        this.disableAutoTheme();
      } else {
        this.applyRandomTheme();
      }
    } else {
      const isGradient = state.get("gradientModeActive");
      if (isGradient) {
        const themeId = state.get("gradientThemeId");
        const theme =
          THEMES.gradient.find((t) => t.id === themeId) || THEMES.gradient[0];
        this.applyGradientTheme(theme, false);
      } else {
        const savedId = state.get("normalThemeId");

        let theme = THEMES.normal.find((t) => t.id === savedId);

        if (!theme) {
          const savedPresets = state.get("userSavedThemes") || [];
          theme = savedPresets.find((t) => t.id === savedId);
        }

        if (theme) {
          this.applyNormalTheme(theme);
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
    const widgetControl = state.get("widgetControl") || "all";
    const lat = state.get("yd_lat");
    const lon = state.get("yd_lon");

    const hasLocation =
      lat !== null &&
      lat !== undefined &&
      lat !== "" &&
      lon !== null &&
      lon !== undefined &&
      lon !== "" &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lon)) &&
      Number(lat) >= -90 &&
      Number(lat) <= 90 &&
      Number(lon) >= -180 &&
      Number(lon) <= 180;

    const weatherHidden = [
      "search-only",
      "quote-only",
      "search-quote",
      "nothing",
    ].includes(widgetControl);
    const shouldDisable = weatherHidden || !hasLocation;

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

  applyRandomTheme() {
    const pool = [
      ...THEMES.normal.map((t) => ({ ...t, mode: "normal" })),
      ...THEMES.gradient.map((t) => ({ ...t, mode: "gradient" })),
    ];

    const random = pool[Math.floor(Math.random() * pool.length)];

    if (random.mode === "gradient") {
      this.applyGradientTheme(random);
    } else {
      this.applyNormalTheme(random);
    }
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
      this.els.btn.classList.add("animating");

      const fullModal = window.__fullSettingsModalInstance;
      const isFullOpen = fullModal && fullModal.isOpen;
      const isMiniOpen =
        this.els.popup && this.els.popup.classList.contains("visible");

      if (isFullOpen) {
        fullModal.close();
        state.set("lastSettingsView", "full");
      } else if (isMiniOpen) {
        this.els.popup.classList.remove("visible");
        state.set("lastSettingsView", "mini");
      } else {
        const lastView = state.get("lastSettingsView") || "mini";
        if (lastView === "full" && fullModal) {
          fullModal.open();
        } else {
          this.els.popup.classList.add("visible");
          state.set("lastSettingsView", "mini");
        }
      }

      this.renderShortcutEditor();

      // --- DYNAMIC VIBE: DELETE FIRST DEFAULT TASK ---
      if (state.get("defaultTasksPinned")) {
        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-1");
        });
      }

      setTimeout(() => this.els.btn.classList.remove("animating"), 400);
    });

    if (this.els.bgBlurSelect) {
      this.els.bgBlurSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        state.set("bgBlurIntensity", val);

        const blurMap = {
          0: 0,
          10: 2,
          20: 4,
          30: 6,
          40: 8,
          50: 10,
        };
        const blurPx = blurMap[val] || 0;
        document.documentElement.style.setProperty("--bg-blur", blurPx + "px");

        if (
          val === "10" ||
          val === "20" ||
          val === "30" ||
          val === "40" ||
          val === "50"
        ) {
          document.documentElement.classList.add("high-bg-blur");
        } else {
          document.documentElement.classList.remove("high-bg-blur");
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(e.target) &&
        !this.els.btn.contains(e.target)
      ) {
        this.els.popup.classList.remove("visible");
        state.set("lastSettingsView", "mini");
      }
    });
    this.els.popup.addEventListener("click", (e) => e.stopPropagation());

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

    if (this.els.widgetControl)
      this.els.widgetControl.addEventListener("change", (e) =>
        state.set("widgetControl", e.target.value),
      );

    if (this.els.shortcutsPosition) {
      this.els.shortcutsPosition.addEventListener("change", (e) => {
        state.set("shortcutsPosition", e.target.value);
      });
    }

    if (this.els.dark) {
      this.els.dark.addEventListener("change", () => {
        this.disableAutoTheme();
        const isChecked = this.els.dark.checked;
        state.set("darkMode", isChecked);

        const targetTheme = isChecked
          ? THEMES.normal.find((t) => t.id === "default-dark")
          : THEMES.normal.find((t) => t.id === "default-light");
        this.applyNormalTheme(targetTheme);

        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.addEventListener("change", () => {
        if (this.els.autoThemeToggle.checked) {
          state.set("autoTheme", true);
        } else {
          state.set("autoTheme", false);
        }

        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.colorControls) {
      this.els.colorControls.addEventListener("input", (e) => {
        if (e.target.classList.contains("color-picker")) {
          this.disableAutoTheme();

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

    this.setupMiscListeners();

    if (this.els.randomBgFreeze) {
      this.els.randomBgFreeze.addEventListener("click", () => {
        this.freezeRandomBackground();
      });
    }
    if (this.els.randomBgRnd) {
      this.els.randomBgRnd.addEventListener("click", () => {
        this.fetchRandomBackground();
      });
    }
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
    const type =
      document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";

    if (savedThemes.length >= 5) {
      savedThemes[4] = {
        id: `preset-${Date.now()}`,
        name: `Preset 5`,
        colors: currentColors,
        type,
      };
    } else {
      savedThemes.push({
        id: `preset-${Date.now()}`,
        name: `Preset ${savedThemes.length + 1}`,
        colors: currentColors,
        type,
      });
    }

    state.set("userSavedThemes", savedThemes);
    this.renderSavedThemes();
  }

  renderSavedThemes() {
    if (this.els.savedContainer) {
      this.els.savedContainer.innerHTML = "";
      const savedThemes = state.get("userSavedThemes") || [];

      for (let i = 0; i < 5; i++) {
        const theme = savedThemes[i];
        const btn = document.createElement("div");
        btn.className = "saved-preset-button";

        if (theme) {
          btn.classList.add("filled");
          btn.textContent = theme.name;
          const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
          const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
          const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
          btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";

          btn.addEventListener("click", async () => {
            await this.applySelectedTheme(theme);
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
    this.renderMiniThemes();
  }

  renderMiniThemes() {
    const container = document.getElementById("mini-themes-grid");
    if (!container) return;
    container.innerHTML = "";

    const targetNormalIds = ["theme-1", "theme-7", "theme-5"]; // YDD Standard, Phosphor, Sakura
    const targetGradientIds = ["glacier", "bio-lime", "deep-space"]; // Glacier, Bio Lime, Deep Space

    targetNormalIds.forEach((id) => {
      const theme = THEMES.normal.find((t) => t.id === id);
      if (!theme) return;
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      btn.title = theme.name;
      const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
      const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
      const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
      btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
      btn.addEventListener("click", async () => {
        await this.applySelectedTheme(theme);
      });
      container.appendChild(btn);
    });

    targetGradientIds.forEach((id) => {
      const theme = THEMES.gradient.find((t) => t.id === id);
      if (!theme) return;
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      btn.title = theme.name;
      btn.style.background = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;
      btn.addEventListener("click", async () => {
        await this.applySelectedTheme(theme, true);
      });
      container.appendChild(btn);
    });

    const savedThemes = state.get("userSavedThemes") || [];
    for (let i = 0; i < 3; i++) {
      const theme = savedThemes[i];
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      if (theme) {
        btn.title = theme.name;
        const rightColor = window.__getThemeRightColor
          ? window.__getThemeRightColor(theme)
          : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]);
        btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
        btn.addEventListener("click", async () => {
          await this.applySelectedTheme(theme);
        });
      } else {
        btn.classList.add("empty");
        btn.title = `Preset ${i + 1} (Empty)`;
      }
      container.appendChild(btn);
    }
  }

  hasCustomBackground() {
    return (
      document.body.classList.contains("has-custom-bg") ||
      !!state.get("backgroundImage") ||
      !!state.get("randomBgMode") ||
      localStorage.getItem("has_idb_bg") === "true"
    );
  }

  async applySelectedTheme(theme, isGradient = false) {
    if (this.hasCustomBackground()) {
      const decision = await showCustomModal(
        "Applying this theme will permanently delete your custom background. Continue?",
        true,
        true,
        [
          { text: "OK", value: "ok", width: "110px" },
          {
            text: "No",
            value: "no",
            width: "110px",
            style:
              "background: var(--bg-interactive); color: var(--text-primary);",
          },
        ],
      );
      if (decision !== "ok") return false;
      if (!(await this.removeCustomBg())) return false;
    }

    this.disableAutoTheme();
    if (isGradient) this.applyGradientTheme(theme);
    else this.applyNormalTheme(theme);
    completeDefaultTask("dt-5");
    return true;
  }

  applyNormalTheme(theme) {
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

    this.syncColorPickers(theme.colors);

    const isDarkType = this.getThemeType(theme) === "dark";
    state.set("darkMode", isDarkType);
    if (this.els.dark) this.els.dark.checked = isDarkType;
    document.body.setAttribute("data-theme", isDarkType ? "dark" : "light");
    if (theme.colors["--bg-tertiary"]) {
      this.updateIconInversion(theme.colors["--bg-tertiary"]);
    }

    this.updateWarningText();
    this.updateAutoThemeGlowState();
    document.body.classList.remove("force-white-text");
  }

  applyGradientTheme(theme, save = true) {
    if (save) {
      state.set("gradientModeActive", true);
      state.set("gradientThemeId", theme.id);
      state.set("transparencyActive", true);
    }

    const isDarkType = theme.type === "dark";
    state.set("darkMode", isDarkType);
    if (this.els.dark) this.els.dark.checked = isDarkType;

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

  async freezeRandomBackground() {
    const currentMode = state.get("randomBgMode");
    if (currentMode === "freeze") {
      if (await this.fetchRandomBackground()) {
        state.set("randomBgTime", null);
      }
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

      if (
        !state.get("savedBgUrl") ||
        !document.body.classList.contains("has-custom-bg")
      ) {
        if (!(await this.fetchRandomBackground())) return;
      }

      state.set("randomBgMode", "freeze");
      state.set("randomBgTime", result === "forever" ? -1 : Date.now());
      this.updateRandomBgButtons();

      const message =
        result === "forever"
          ? "Background is saved forever! It won't change until you manually update it."
          : "Background is freezed for the next 72 hours.";

      setTimeout(() => showCustomModal(message), 10);
    }
    if (window.__fullSettingsModalInstance) {
      window.__fullSettingsModalInstance._updateBgState();
    }
  }

  async detectLocation() {
    if (!navigator.geolocation) {
      showCustomModal("Geolocation not supported by your browser.");
      return;
    }

    // If user previously opted out of our consent modal, go straight
    // to the browser's native location prompt
    if (localStorage.getItem("hideGpsConsent") === "true") {
      this._requestBrowserLocation();
      return;
    }

    // Show our own privacy-info consent modal first
    const result = await showCustomModal(
      "Your coordinates are used strictly to fetch local weather data. " +
        "When you proceed, your browser will securely ping Open-Meteo " +
        "(for weather) and BigDataCloud (for the city name).\n\n" +
        "This data is saved locally on your device. We do not track you " +
        "in the background, and we have no server to store your location data.",
      false,
      false,
      [
        { text: "I Agree", value: "agree", width: "130px" },
        { text: "Always Allow", value: "always", width: "130px" },
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

    if (result === "always") {
      localStorage.setItem("hideGpsConsent", "true");
    }

    // This triggers the browser's native "Allow location?" prompt
    this._requestBrowserLocation();
  }

  /** Calls the standard Web Geolocation API — the browser handles the permission prompt. */
  _requestBrowserLocation() {
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
        if (
          window.__fullSettingsModalInstance &&
          window.__fullSettingsModalInstance.els.fsLocInput
        ) {
          window.__fullSettingsModalInstance.els.fsLocInput.value = gpsCity;
        }
      },
      (err) =>
        showCustomModal(
          "Geolocation error: " +
            err.message +
            ". Please enable location services.",
        ),
    );
  }

  updateWarningText() {
    const isGradient = state.get("gradientModeActive");
    if (this.els.themeColorNote) {
      this.els.themeColorNote.style.display = "none";
    }

    const glowPicker = document.getElementById("glow-color-picker");
    if (this.els.glowToggle) {
      this.els.glowToggle.disabled = isGradient;
      const glowRow = this.els.glowToggle.closest(".setting-row");

      if (isGradient) {
        if (glowRow) glowRow.classList.add("disabled");

        if (glowPicker) {
          glowPicker.disabled = true;
          glowPicker.style.opacity = "0.5";
          glowPicker.style.cursor = "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) parentRow.classList.add("disabled");
        }
      } else {
        if (glowRow) glowRow.classList.remove("disabled");

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
          btn.style.background = `linear-gradient(to top right, ${theme.colors[0]} 50%, ${theme.colors[1]} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        } else {
          const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
          const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
          const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
          btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        }
        btn.addEventListener("click", async () => {
          await this.applySelectedTheme(theme, isGradient);
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
    if (key === "showDate" || key === "hideGreetings") {
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
    if (this.els.uploadBg) {
      this.els.uploadBg.addEventListener("click", () => {
        this.els.bgInput.value = "";
        this.els.bgInput.click();
      });
    }
    if (this.els.bgInput) {
      this.els.bgInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) await this.handleBgUpload(file);
        this.els.bgInput.value = "";
      });
    }
    if (this.els.removeBg) {
      this.els.removeBg.addEventListener("click", async () => {
        await this.removeCustomBg();
      });
    }
    if (this.els.shortcutForm) {
      this.els.shortcutForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputs = this.els.shortcutForm.querySelectorAll("input");
        if (await this.addShortcut(inputs[0].value, inputs[1].value)) {
          inputs[0].value = "";
          inputs[1].value = "";
        }
      });
    }
    if (this.els.backup) {
      this.els.backup.addEventListener("click", () => this.backup());
    }
    if (this.els.restore && this.els.restoreInput) {
      this.els.restore.addEventListener("click", () =>
        this.els.restoreInput.click(),
      );
      this.els.restoreInput.addEventListener("change", (e) => this.restore(e));
    }
    if (this.els.reset) {
      this.els.reset.addEventListener("click", () => this.resetAll());
    }
  }

  _releaseActiveBackgroundObjectUrl() {
    if (this._activeBackgroundObjectUrl) {
      URL.revokeObjectURL(this._activeBackgroundObjectUrl);
      this._activeBackgroundObjectUrl = null;
    }
    window.__releaseYddPreloadBackground?.();
  }

  _removePreloadedBackgroundStyles() {
    document.getElementById("ydd-remote-background")?.remove();
    document.getElementById("ydd-idb-background")?.remove();
    document.getElementById("idb-preloader")?.remove();
  }

  _applyBackgroundUrl(url) {
    document.body.classList.add("has-custom-bg");
    document.body.style.setProperty(
      "background-image",
      `url("${String(url).replaceAll('"', "%22")}")`,
      "important",
    );
    document.body.style.setProperty("background-size", "cover", "important");
    document.body.style.setProperty(
      "background-position",
      "center",
      "important",
    );
  }

  _syncBackgroundControls() {
    const hasBackground = document.body.classList.contains("has-custom-bg");
    if (this.els.removeBg) {
      this.els.removeBg.classList.toggle("hidden", !hasBackground);
    }
    this.updateRandomBgButtons();
    this.updateAutoThemeGlowState();
    window.__fullSettingsModalInstance?._updateBgState();
  }

  async handleBgUpload(file) {
    if (!file) return false;
    const operationId = ++this._backgroundOperationId;
    try {
      await validateImageBlob(file);
      if (operationId !== this._backgroundOperationId) return false;
      await secondStorage.saveImage(file);
      if (operationId !== this._backgroundOperationId) return false;

      const objectUrl = URL.createObjectURL(file);
      this._releaseActiveBackgroundObjectUrl();
      this._activeBackgroundObjectUrl = objectUrl;
      this._removePreloadedBackgroundStyles();
      this._applyBackgroundUrl(objectUrl);

      localStorage.setItem("has_idb_bg", "true");
      localStorage.removeItem("lowResBg");
      state.set("randomBgMode", null);
      state.set("randomBgTime", null);
      state.set("savedBgUrl", null);
      state.set("backgroundImage", null);
      this.disableAutoTheme();
      this._syncBackgroundControls();
      return true;
    } catch (error) {
      if (operationId === this._backgroundOperationId) {
        console.error("Background upload failed:", error);
        await showCustomModal(
          error instanceof TypeError
            ? error.message
            : "The background could not be saved. Your current background was kept.",
        );
      }
      return false;
    }
  }

  async removeCustomBg() {
    const operationId = ++this._backgroundOperationId;
    try {
      await secondStorage.deleteImage();
      if (operationId !== this._backgroundOperationId) return false;
      this._releaseActiveBackgroundObjectUrl();
      this._removePreloadedBackgroundStyles();
      state.set("backgroundImage", null);
      state.set("savedBgUrl", null);
      state.set("randomBgMode", null);
      state.set("randomBgTime", null);
      localStorage.removeItem("has_idb_bg");
      localStorage.removeItem("lowResBg");
      document.body.classList.remove("has-custom-bg");
      document.body.style.removeProperty("background-image");
      document.body.style.removeProperty("background-size");
      document.body.style.removeProperty("background-position");
      this._syncBackgroundControls();
      return true;
    } catch (error) {
      if (operationId === this._backgroundOperationId) {
        console.error("Background removal failed:", error);
        await showCustomModal(
          "The saved background could not be removed. Nothing was changed.",
        );
      }
      return false;
    }
  }

  async resetAll() {
    if (
      await showCustomModal(
        "Resetting all deletes everything. Make sure you have backed up your settings. Are you sure you want to continue?",
        true,
        true,
      )
    ) {
      try {
        await secondStorage.deleteImage();
      } catch (e) {
        console.error("Failed to wipe IndexedDB:", e);
      }
      clearYddLocalStorage();
      location.reload();
    }
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

      const iconContainer = document.createElement("div");
      iconContainer.className = "icon-container";
      iconContainer.style.position = "relative";
      iconContainer.style.cursor = "pointer";
      iconContainer.title = "Click to upload custom icon";

      const img = document.createElement("img");
      img.src = s.customIcon || s.icon || getIconUrl(s.url);
      img.className = "icon";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      iconContainer.appendChild(img);
      iconContainer.appendChild(fileInput);

      iconContainer.addEventListener("click", () => fileInput.click());

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
      urlInput.maxLength = 2048;

      const triggerSave = () => {
        this.updateShortcut(index, nameInput.value, urlInput.value);
      };

      nameInput.addEventListener("blur", triggerSave);
      nameInput.addEventListener("change", triggerSave);
      urlInput.addEventListener("blur", triggerSave);
      urlInput.addEventListener("change", triggerSave);

      inputsDiv.appendChild(nameInput);
      inputsDiv.appendChild(urlInput);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "actions";

      const resetBtn = document.createElement("button");
      resetBtn.className = "action-btn reset";
      resetBtn.title = "Reset Icon";
      const resetSvgString =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
      const resetParsedSvg = new DOMParser().parseFromString(
        resetSvgString,
        "image/svg+xml",
      );
      resetBtn.appendChild(resetParsedSvg.documentElement);

      if (!s.customIcon) {
        resetBtn.style.display = "none";
      }

      resetBtn.addEventListener("click", () => {
        this.updateShortcut(index, nameInput.value, urlInput.value, null, true);
        const autoIcon = getIconUrl(urlInput.value);
        img.src = autoIcon;
        resetBtn.style.display = "none";
      });

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await validateImageBlob(file, {
            maxBytes: 2 * 1024 * 1024,
            maxWidth: 4096,
            maxHeight: 4096,
            maxPixels: 16_000_000,
          });
        } catch (error) {
          await showCustomModal(error.message);
          fileInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const tempImg = new window.Image();
          tempImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(tempImg, 0, 0, 256, 256);
            const dataUrl = canvas.toDataURL("image/png");

            img.src = dataUrl;
            this.updateShortcut(
              index,
              nameInput.value,
              urlInput.value,
              dataUrl,
            );
            resetBtn.style.display = "";
          };
          tempImg.onerror = () => showCustomModal("The icon could not be decoded.");
          tempImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });

      const delBtn = document.createElement("button");
      delBtn.className = "action-btn delete";
      delBtn.title = "Delete";
      const delSvgString =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const delParsedSvg = new DOMParser().parseFromString(
        delSvgString,
        "image/svg+xml",
      );
      delBtn.appendChild(delParsedSvg.documentElement);

      actionsDiv.appendChild(resetBtn);
      actionsDiv.appendChild(delBtn);

      div.appendChild(dragHandle);
      div.appendChild(iconContainer);
      div.appendChild(inputsDiv);
      div.appendChild(actionsDiv);

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

  async addShortcut(name, url) {
    const current = [...(state.get("userShortcuts") || [])];
    if (current.length >= MAX_SHORTCUTS) {
      await showCustomModal(`You can add up to ${MAX_SHORTCUTS} shortcuts.`);
      return false;
    }
    const cleanName = String(name || "").trim().slice(0, MAX_SHORTCUT_NAME_LENGTH);
    if (!cleanName) {
      await showCustomModal("Enter a shortcut name.");
      return false;
    }
    try {
      url = normalizeHttpUrl(url);
    } catch (error) {
      await showCustomModal(error.message);
      return false;
    }
    current.push({ name: cleanName, url, icon: getIconUrl(url) });
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  updateShortcut(
    index,
    name,
    url,
    customIconData = undefined,
    removeCustomIcon = false,
  ) {
    const current = [...(state.get("userShortcuts") || [])];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return false;
    }
    const cleanName = String(name || "").trim().slice(0, MAX_SHORTCUT_NAME_LENGTH);
    if (!cleanName) {
      void showCustomModal("Enter a shortcut name.");
      return false;
    }
    try {
      url = normalizeHttpUrl(url);
    } catch (error) {
      void showCustomModal(error.message);
      return false;
    }
    if (current[index]) {
      current[index].name = cleanName;
      const oldUrl = current[index].url;
      current[index].url = url;

      if (!current[index].customIcon && !customIconData) {
        if (oldUrl !== url) {
          current[index].icon = getIconUrl(url);
        }
      }

      if (customIconData !== undefined && customIconData !== null) {
        if (
          typeof customIconData !== "string" ||
          !customIconData.startsWith("data:image/") ||
          customIconData.length > 3_000_000
        ) {
          void showCustomModal("The processed shortcut icon is too large.");
          return false;
        }
        current[index].customIcon = customIconData;
      }
      if (removeCustomIcon) {
        delete current[index].customIcon;
        current[index].icon = getIconUrl(url);
      }
      return state.set("userShortcuts", current);
    }
    return false;
  }

  deleteShortcut(index) {
    const current = [...(state.get("userShortcuts") || [])];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return false;
    }
    current.splice(index, 1);
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  reorderShortcuts(fromIndex, toIndex) {
    const current = [...(state.get("userShortcuts") || [])];
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= current.length ||
      toIndex >= current.length
    ) {
      return false;
    }
    if (fromIndex === toIndex) return true;
    const item = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, item);
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  async backup() {
    try {
      let backgroundBlob = null;
      try {
        backgroundBlob = await secondStorage.getImage();
      } catch (error) {
        if (localStorage.getItem("has_idb_bg") === "true") throw error;
        console.warn("IndexedDB was unavailable during backup:", error);
      }
      const data = {
        format: "YourDynamicDashboard",
        version: 2,
        createdAt: new Date().toISOString(),
        localStorage: getYddStorageEntries(),
        backgroundImage: backgroundBlob
          ? await this.blobToDataUrl(backgroundBlob)
          : null,
      };
      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ydd-backup.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error("Backup failed:", error);
      showCustomModal(
        "The backup could not be created. Your data was not changed.",
      );
    }
  }

  getThemeType(theme) {
    if (theme?.type === "dark" || theme?.type === "default-dark") return "dark";
    if (theme?.type === "light") return "light";

    const color = String(theme?.colors?.["--bg-primary"] || "").trim();
    let channels = null;
    if (/^#[\da-f]{3}$/i.test(color)) {
      channels = [color[1], color[2], color[3]].map((value) =>
        parseInt(value + value, 16),
      );
    } else if (/^#[\da-f]{6}/i.test(color)) {
      channels = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ];
    } else if (/^rgba?\(/i.test(color)) {
      const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (values?.length === 3 && values.every(Number.isFinite)) channels = values;
    }
    if (channels) {
      const [r, g, b] = channels;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
        ? "dark"
        : "light";
    }
    return document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  async restore(e) {
    const file = e.target.files[0];
    if (!file) return;

    let previousEntries = {};
    let previousBackground = null;
    let mutationStarted = false;
    try {
      previousEntries = getYddStorageEntries();
      try {
        previousBackground = await secondStorage.getImage();
      } catch (error) {
        if (localStorage.getItem("has_idb_bg") === "true") {
          throw new Error(
            "The existing background could not be read safely before restore.",
            { cause: error },
          );
        }
        console.warn("IndexedDB was unavailable before restore:", error);
      }
      const data = JSON.parse(await file.text());
      const isCurrentFormat =
        data?.format === "YourDynamicDashboard" && data?.version === 2;
      const entries = validateYddStorageEntries(
        isCurrentFormat ? data.localStorage : data,
      );

      let restoredBackground = null;
      if (isCurrentFormat && data.backgroundImage !== null) {
        if (
          typeof data.backgroundImage !== "string" ||
          !data.backgroundImage.startsWith("data:image/")
        ) {
          throw new TypeError("Invalid background image in backup.");
        }
        restoredBackground = await this.dataUrlToBlob(data.backgroundImage);
        await validateImageBlob(restoredBackground);
      }

      mutationStarted = true;
      clearYddLocalStorage();
      Object.entries(entries).forEach(([key, value]) =>
        localStorage.setItem(key, value),
      );

      if (isCurrentFormat) {
        if (restoredBackground) {
          await secondStorage.saveImage(restoredBackground);
          localStorage.setItem("has_idb_bg", "true");
        } else {
          await secondStorage.deleteImage();
          localStorage.removeItem("has_idb_bg");
        }
      } else if (entries.has_idb_bg === "true" && !previousBackground) {
        localStorage.removeItem("has_idb_bg");
      }

      location.reload();
    } catch (error) {
      console.error("Restore failed:", error);
      let rollbackSucceeded = true;
      if (mutationStarted) {
        try {
          clearYddLocalStorage();
          Object.entries(previousEntries).forEach(([key, value]) =>
            localStorage.setItem(key, value),
          );
          if (previousBackground) {
            await secondStorage.saveImage(previousBackground);
          } else {
            await secondStorage.deleteImage();
          }
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error("Restore rollback failed:", rollbackError);
        }
      }
      showCustomModal(
        rollbackSucceeded
          ? "Invalid or incomplete backup. Your current data was preserved."
          : "Restore failed and some previous data could not be recovered. " +
            "Reload the tab before making more changes.",
      );
    } finally {
      e.target.value = "";
    }
  }

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new TypeError("Could not decode backup background.");
    return response.blob();
  }

  async fetchRandomBackground(origin = "user") {
    const targetBtn = origin === "startup" ? null : this.els.randomBgRnd;
    const operationId = ++this._backgroundOperationId;
    let originalNodes = [];
    if (targetBtn) {
      originalNodes = Array.from(targetBtn.childNodes);
      targetBtn.textContent = "⏳";
      targetBtn.disabled = true;
    }

    const width = Math.max(800, Math.min(1920, Math.round(window.innerWidth)));
    const height = Math.max(600, Math.min(1080, Math.round(window.innerHeight)));

    try {
      const cacheKey = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
      const response = await fetch(
        `https://picsum.photos/${width}/${height}?random=${cacheKey}`,
      );
      if (!response.ok) {
        throw new Error(`Wallpaper service returned ${response.status}.`);
      }
      if (operationId !== this._backgroundOperationId) return false;

      const finalUrl = response.url;
      if (!finalUrl) throw new Error("Wallpaper service returned no image URL.");
      const wallpaperBlob = await response.blob();
      await validateImageBlob(wallpaperBlob, {
        maxBytes: 20 * 1024 * 1024,
        maxWidth: 4096,
        maxHeight: 4096,
        maxPixels: 20_000_000,
      });
      if (operationId !== this._backgroundOperationId) return false;
      await secondStorage.deleteImage();
      if (operationId !== this._backgroundOperationId) return false;

      this._releaseActiveBackgroundObjectUrl();
      this._removePreloadedBackgroundStyles();
      this._applyBackgroundUrl(finalUrl);
      localStorage.removeItem("has_idb_bg");
      localStorage.removeItem("lowResBg");
      state.set("savedBgUrl", finalUrl);
      state.set("backgroundImage", finalUrl);
      state.set("randomBgMode", "random");
      this.disableAutoTheme();
      this._syncBackgroundControls();
      return true;
    } catch (err) {
      if (operationId === this._backgroundOperationId) {
        console.error("Random background failed:", err);
        await showCustomModal(
          "A new background could not be loaded. Your current background was kept.",
        );
      }
      return false;
    } finally {
      if (targetBtn) {
        targetBtn.textContent = "";
        originalNodes.forEach((node) => targetBtn.appendChild(node));
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
    const autoThemeDisabled = hasBg;
    const disabledControls = hasBg || isGradient;

    if (this.els.blurRow) {
      if (hasBg) {
        this.els.blurRow.classList.remove("hidden");
      } else {
        this.els.blurRow.classList.add("hidden");
      }
    }

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.disabled = autoThemeDisabled;
      const parentRow = this.els.autoThemeToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = autoThemeDisabled ? "0.5" : "1";
    }

    if (this.els.glowToggle) {
      this.els.glowToggle.disabled = disabledControls;
      const parentRow = this.els.glowToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = disabledControls ? "0.5" : "1";
    }

    const advancedColorsContainer = document.getElementById(
      "advanced-color-controls",
    );
    const themeColorNote = document.getElementById("theme-color-note");
    const advancedColorWarning = document.getElementById(
      "advanced-color-warning",
    );

    if (advancedColorsContainer) {
      const colorInputs = advancedColorsContainer.querySelectorAll("input");
      if (disabledControls) {
        advancedColorsContainer.classList.add("advanced-colors-disabled");
        advancedColorsContainer.classList.add("disabled");
        advancedColorsContainer.style.opacity = "0.5";
        colorInputs.forEach((input) => (input.disabled = true));
        if (themeColorNote) {
          themeColorNote.style.color = "#ff6b6b";
          themeColorNote.style.fontWeight = "bold";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.remove("hidden");
        }
      } else {
        advancedColorsContainer.classList.remove("advanced-colors-disabled");
        advancedColorsContainer.classList.remove("disabled");
        advancedColorsContainer.style.opacity = "1";
        colorInputs.forEach((input) => (input.disabled = false));
        if (themeColorNote) {
          themeColorNote.style.color = "";
          themeColorNote.style.fontWeight = "normal";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.add("hidden");
        }
      }
    }

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
// [src/modules/settings.js] YourDynamicDashboard V2.2 (Ditom Baroi Antu - 2025-26)
