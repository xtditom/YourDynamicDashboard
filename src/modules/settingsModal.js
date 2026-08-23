import { state } from "../state.js";
import {
  chooseGeocodingResult,
  getGeocodingResults,
  getIconUrl,
  makeKeyboardInteractive,
  showCustomModal,
} from "../utils.js";
import { CONFIG, DEFAULT_KEY_MAP } from "../config.js";
import {
  getBindableKey,
  validateImageBlob,
  MAX_SHORTCUTS,
} from "../validators.js";

const KEY_LABELS = Object.freeze({
  todo: "Toggle To-Do",
  ai: "Toggle AI Tools",
  apps: "Toggle Google Apps",
  settings: "Toggle Full Settings",
  miniSettings: "Toggle Mini Settings",
  search: "Focus On Search",
  clock: "Toggle Clock Mode",
  date: "Toggle Date",
  autoTheme: "Toggle Auto Theme",
  tempDisplay: "Toggle Temp Display",
  hideGreetings: "Toggle Greetings",
  showEditableText: "Toggle Editable Text",
  numKeys: "Keys for Shortcuts",
  zen: "Key for Zen Mode",
  voice: "Key for Voice Search",
});

const FULL_NORMAL_THEME_ORDER = Object.freeze([
  "default-light",
  "theme-3",
  "theme-5",
  "theme-4",
  "theme-8",
  "default-dark",
  "theme-1",
  "theme-2",
  "theme-6",
  "theme-7",
]);

const FULL_GRADIENT_THEME_ORDER = Object.freeze([
  "electric-sky",
  "cotton-candy",
  "glacier",
  "bio-lime",
  "dawn-bloom",
  "grey",
  "royal",
  "deep-space",
  "ember",
  "forest",
]);

/**
 * FullSettingsModal — A comprehensive, draggable settings window.
 * Dynamically builds its entire DOM and delegates theme/shortcut/backup
 * operations to the existing SettingsManager singleton.
 */
export class FullSettingsModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.isOpen = false;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.modalStartX = 0;
    this.modalStartY = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // Element cache
    this.els = {};
    this._activeKeyCleanup = null;
    this._previousFocus = null;
    this._locationRequestId = 0;
    this._locationController = null;
    this._generateThemeCooldown = false;

    window.__fullSettingsModalInstance = this;

    // Bound handlers for cleanup
    this._onMouseMove = this._handleDragMove.bind(this);
    this._onMouseUp = this._handleDragEnd.bind(this);
    this._onDialogKeyDown = this._handleDialogKeyDown.bind(this);

    this.build();
    this.bindCoreEvents();
    this.subscribeState();
  }

  // ─── Helpers ───────────────────────────────────────────────

  _el(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") el.className = v;
      else if (k === "textContent") el.textContent = v;
      else if (k === "innerHTML") el.innerHTML = v;
      else if (k.startsWith("on"))
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "style" && typeof v === "object")
        Object.assign(el.style, v);
      else el.setAttribute(k, v);
    });
    children.forEach((c) => {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  _newSticker(className = "fs-new-sticker") {
    return this._el("span", {
      className,
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 36" role="img" aria-label="New">
        <title>New</title>
        <path d="M10 3h58l7 7v16l-7 7H10l-7-7V10z" fill="#ffe05b" stroke="#141414" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M13 8h11" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
        <text x="39" y="24" fill="#141414" font-family="Arial, sans-serif" font-size="14" font-weight="800" letter-spacing="1" text-anchor="middle">NEW</text>
      </svg>`,
    });
  }

  _row(label, desc, control) {
    const row = this._el("div", { className: "setting-row" });
    const labelDiv = this._el("div", { className: "label" });
    labelDiv.appendChild(this._el("span", { textContent: label }));
    if (desc) labelDiv.appendChild(this._el("small", { textContent: desc }));
    const controlId = control?.querySelector?.("[id]")?.id;
    if (controlId) {
      labelDiv.id = `${controlId}-label`;
      control.querySelector("[id]")?.setAttribute("aria-labelledby", labelDiv.id);
    }
    row.appendChild(labelDiv);
    if (control) row.appendChild(control);
    return row;
  }

  _toggle(id) {
    const label = this._el("label", { className: "toggle-switch" });
    const input = this._el("input", { type: "checkbox", id });
    const slider = this._el("span", { className: "slider" });
    label.appendChild(input);
    label.appendChild(slider);
    return { wrapper: label, input };
  }

  _section(title, children = []) {
    const sec = this._el("div", { className: "fs-section" });
    sec.appendChild(
      this._el("h3", { className: "fs-section-title", textContent: title }),
    );
    children.forEach((c) => {
      if (c) sec.appendChild(c);
    });
    return sec;
  }

  _divider() {
    return this._el("div", { className: "settings-divider" });
  }

  _dropdown(id, options) {
    const sel = this._el("select", {
      id,
      className: "settings-dropdown",
      style: {
        padding: "5px",
        borderRadius: "5px",
        background: "var(--bg-interactive)",
        color: "var(--text-primary)",
        border: "none",
      },
    });
    options.forEach(([val, text]) => {
      sel.appendChild(this._el("option", { value: val, textContent: text }));
    });
    return sel;
  }

  // ─── Build ─────────────────────────────────────────────────

  build() {
    // Overlay
    this.overlay = this._el("div", {
      id: "full-settings-overlay",
      className: "hidden",
      "aria-hidden": "true",
      role: "presentation",
    });

    // Modal
    this.modal = this._el("div", {
      id: "full-settings-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "full-settings-title",
      tabindex: "-1",
    });

    // Titlebar
    const titlebar = this._el("div", { className: "fs-titlebar" });
    const miniBtn = this._el("button", {
      id: "open-mini-settings-btn",
      className: "fs-nav-btn",
      title: "Switch to Mini Settings",
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    });
    this.els.miniBtn = miniBtn;

    const titleH2 = this._el("h2", { id: "full-settings-title" }, [
      this._el("span", { className: "fs-title-icon", textContent: "⚙" }),
      document.createTextNode("Full Settings"),
    ]);
    const closeBtn = this._el("button", {
      className: "fs-close-btn",
      textContent: "×",
      title: "Close",
    });
    this.els.closeBtn = closeBtn;
    titlebar.append(miniBtn, titleH2, closeBtn);
    this.els.titlebar = titlebar;

    // Tabs
    const tabs = this._el("div", { className: "fs-tabs" });
    const tabDefs = [
      { id: "fs-tab-general", label: "General" },
      { id: "fs-tab-appearance", label: "Appearance" },
      { id: "fs-tab-shortcuts", label: "Shortcuts" },
      { id: "fs-tab-data", label: "Extras" },
    ];
    this.els.tabBtns = [];
    tabDefs.forEach((def, i) => {
      const btn = this._el("button", {
        className: `fs-tab-btn ${i === 0 ? "active" : ""}`,
        textContent: def.label,
        "data-tab": def.id,
        role: "tab",
        "aria-selected": i === 0 ? "true" : "false",
        "aria-controls": def.id,
      });
      this.els.tabBtns.push(btn);
      tabs.appendChild(btn);
    });

    // Content
    const content = this._el("div", { className: "fs-content" });
    this.els.panes = [];

    const generalPane = this.buildGeneralPane();
    const appearancePane = this.buildAppearancePane();
    const shortcutsPane = this.buildShortcutsPane();
    const dataPane = this.buildDataPane();

    [generalPane, appearancePane, shortcutsPane, dataPane].forEach(
      (pane, i) => {
        pane.id = tabDefs[i].id;
        pane.classList.add("fs-pane");
        if (i === 0) pane.classList.add("active");
        this.els.panes.push(pane);
        content.appendChild(pane);
      },
    );

    // Footer
    const footer = this._el("div", { className: "fs-footer" });
    footer.innerHTML = `<p>&copy; Ditom Baroi Antu <span class="fs-copyright-year">2025</span></p>
<p><strong>YourDynamicDashboard</strong> V3.0.0</p>
<p>Weather data provided by <a href="https://open-meteo.com/" target="_blank">Open-Meteo.com</a></p>`;
    const yearSpan = footer.querySelector(".fs-copyright-year");
    const year = new Date().getFullYear();
    if (year > 2025) yearSpan.textContent = `2025 - ${year}`;
    this.els.footer = footer;

    // Assemble
    this.modal.append(titlebar, tabs, content, footer);
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    this.overlay.inert = true;
  }

  // ─── General Pane ──────────────────────────────────────────

  buildGeneralPane() {
    const pane = this._el("div");

    // Clock & Display
    const clockToggle = this._toggle("fs-clock-type-toggle");
    const formatToggle = this._toggle("fs-clock-format-toggle");
    const dateToggle = this._toggle("fs-date-toggle");
    const greetToggle = this._toggle("fs-hide-greetings-toggle");
    const editableToggle = this._toggle("fs-editable-text-toggle");
    const disableAnimationsToggle = this._toggle("fs-disable-animations-toggle");

    this.els.fsClockType = clockToggle.input;
    this.els.fsClockFormat = formatToggle.input;
    this.els.fsDateToggle = dateToggle.input;
    this.els.fsHideGreetings = greetToggle.input;
    this.els.fsEditableText = editableToggle.input;
    this.els.fsDisableAnimations = disableAnimationsToggle.input;

    const formatRow = this._row(
      "Clock Format",
      "Toggle for 24-hour format.",
      formatToggle.wrapper,
    );
    this.els.fsClockFormatRow = formatRow;

    const disableAnimationsRow = this._row(
      "Disable Animations/Transitions",
      "Turn off all visual animations and transitions.",
      disableAnimationsToggle.wrapper,
    );
    const disableAnimationsLabel = disableAnimationsRow.querySelector(
      ".label > span",
    );
    if (disableAnimationsLabel) {
      disableAnimationsLabel.classList.add("fs-disable-animations-label");
      if ((Number(state.get("disableAnimationsToggleCount")) || 0) < 10) {
        const newSticker = this._el("span", {
          className: "fs-new-sticker",
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 36" role="img" aria-label="New">
            <title>New</title>
            <path d="M10 3h58l7 7v16l-7 7H10l-7-7V10z" fill="#ffe05b" stroke="#141414" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M13 8h11" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
            <text x="39" y="24" fill="#141414" font-family="Arial, sans-serif" font-size="14" font-weight="800" letter-spacing="1" text-anchor="middle">NEW</text>
          </svg>`,
        });
        disableAnimationsLabel.appendChild(newSticker);
        this.els.fsDisableAnimationsNewSticker = newSticker;
      }
    }

    pane.appendChild(
      this._section("Clock & Display", [
        this._row("Analog Clock", "Use the analog clock.", clockToggle.wrapper),
        formatRow,
        this._row(
          "Day & Date",
          "Display the day and date.",
          dateToggle.wrapper,
        ),
        this._row(
          "Hide Greetings",
          "Hide the greeting message.",
          greetToggle.wrapper,
        ),
        this._row(
          "Hide Editable Text",
          "Hide custom text under greeting.",
          editableToggle.wrapper,
        ),
        disableAnimationsRow,
      ]),
    );

    // Weather
    const locInput = this._el("input", {
      type: "text",
      id: "fs-location-input",
      className: "fs-location-input",
      placeholder: "Enter city name...",
      style: { flex: "3 1 0" },
    });
    const locSave = this._el("button", {
      className: "settings-button fs-location-action",
      textContent: "Save",
    });
    const locGps = this._el("button", {
      className: "settings-button fs-location-action",
      title: "Detect My Location",
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><g fill="none" fill-rule="evenodd"><path d="M18 0v18H0V0z"/><path fill="currentColor" fill-rule="nonzero" d="M5.04 12.48a.75.75 0 0 1 .42 1.44c-.375.11-.645.225-.818.33.178.107.46.227.852.339C6.36 14.836 7.6 15 9 15s2.64-.164 3.506-.411c.392-.112.674-.232.852-.339-.173-.105-.443-.22-.818-.33a.75.75 0 0 1 .42-1.44c.501.146.96.334 1.313.575.326.224.727.615.727 1.195 0 .587-.411.98-.743 1.205-.358.241-.827.43-1.34.576C11.884 16.327 10.5 16.5 9 16.5s-2.885-.173-3.918-.469c-.512-.146-.981-.335-1.34-.576C3.332 15.23 2.92 14.836 2.92 14.25c0-.58.401-.971.727-1.195.353-.241.812-.428 1.313-.575M9 1.5a5.625 5.625 0 0 1 5.625 5.625c0 1.926-1.05 3.492-2.137 4.605A12.3 12.3 0 0 1 11.098 12.94c-.446.335-1.464.962-1.464.962a1.283 1.283 0 0 1-1.268 0s-1.018-.627-1.464-.962a12.217 12.217 0 0 1-1.39-1.21C4.425 10.617 3.375 9.051 3.375 7.125A5.625 5.625 0 0 1 9 1.5m0 4.125a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/></g></svg>`,
      style: {
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });

    this.els.fsLocInput = locInput;
    this.els.fsLocSave = locSave;
    this.els.fsLocGps = locGps;

    const locRow = this._el("div", { className: "api-key-section" });
    const weatherLocationLabel = this._el("span", {
      className: "fs-weather-location-label",
    }, [this._el("span", { textContent: "Weather Location" })]);
    this.els.fsWeatherLocationUpdatedSticker = null;
    if ((Number(state.get("weatherLocationSaveCount")) || 0) < 2) {
      const updatedSticker = this._el("span", {
        className: "fs-updated-sticker",
        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 36" role="img" aria-label="Updated">
          <title>Updated</title>
          <path d="M10 3h88l7 7v16l-7 7H10l-7-7V10z" fill="#ffe05b" stroke="#141414" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M13 8h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
          <text x="54" y="24" fill="#141414" font-family="Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="1.1" text-anchor="middle">UPDATED</text>
        </svg>`,
      });
      weatherLocationLabel.appendChild(updatedSticker);
      this.els.fsWeatherLocationUpdatedSticker = updatedSticker;
    }
    locRow.appendChild(
      this._el("div", { className: "label" }, [weatherLocationLabel]),
    );
    const locWrapper = this._el("div", {
      style: { display: "flex", gap: "8px" },
    });
    locWrapper.append(locInput, locSave, locGps);
    locRow.appendChild(locWrapper);

    const tempToggle = this._toggle("fs-temp-unit-toggle");
    const tempDisplay = this._toggle("fs-temp-display-toggle");
    this.els.fsTempUnit = tempToggle.input;
    this.els.fsTempDisplay = tempDisplay.input;

    const tempUnitRow = this._row(
      "Temperature Unit",
      "Toggle for Fahrenheit.",
      tempToggle.wrapper,
    );
    const tempDisplayRow = this._row(
      "Temperature Display",
      "Switch between Min-Max and Feels like.",
      tempDisplay.wrapper,
    );
    this.els.fsTempUnitRow = tempUnitRow;
    this.els.fsTempDisplayRow = tempDisplayRow;

    pane.appendChild(
      this._section("Weather", [
        locRow,
        tempUnitRow,
        tempDisplayRow,
      ]),
    );

    // Controls
    const widgetSelect = this._dropdown("fs-widget-control", [
      ["all", "All Visible"],
      ["search-only", "Search Only"],
      ["weather-only", "Weather Only"],
      ["quote-only", "Quote Only"],
      ["search-weather", "Search & Weather"],
      ["search-quote", "Search & Quote"],
      ["weather-quote", "Weather & Quote"],
      ["nothing", "Nothing"],
    ]);
    this.els.fsWidgetControl = widgetSelect;

    const posSelect = this._dropdown("fs-shortcuts-position", [
      ["bottom", "Bottom"],
      ["top", "Top"],
      ["hide", "Hide"],
    ]);
    this.els.fsShortcutsPosition = posSelect;

    pane.appendChild(
      this._section("Controls", [
        this._row("Widget Control", "Control widget visibility.", widgetSelect),
        this._row(
          "Shortcuts Position",
          "Position or hide the shortcuts bar.",
          posSelect,
        ),
      ]),
    );

    // Link Direction (inline)
    const linkDirContainer = this._el("div", { className: "fs-key-grid" });
    const resetLinkDirections = this._el("button", {
      type: "button",
      className: "settings-button danger",
      textContent: "Reset Link Directions",
    });
    resetLinkDirections.hidden = true;
    this.els.fsLinkDirList = linkDirContainer;
    this.els.fsResetLinkDirections = resetLinkDirections;
    pane.appendChild(
      this._section("Link Direction", [linkDirContainer, resetLinkDirections]),
    );

    // Shortcut Keys (inline)
    const keyContainer = this._el("div", { className: "fs-key-grid" });
    const keyNoteContainer = this._el("div");
    const resetKeys = this._el("button", {
      type: "button",
      className: "settings-button danger",
      textContent: "Reset Keyboard Shortcuts",
    });
    resetKeys.hidden = true;
    this.els.fsKeyList = keyContainer;
    this.els.fsKeyNoteContainer = keyNoteContainer;
    this.els.fsResetKeys = resetKeys;
    pane.appendChild(
      this._section("Keyboard Shortcuts", [
        keyContainer,
        keyNoteContainer,
        resetKeys,
      ]),
    );

    return pane;
  }

  // ─── Appearance Pane ───────────────────────────────────────

  buildAppearancePane() {
    const pane = this._el("div");

    // Theme controls
    const darkToggle = this._toggle("fs-dark-mode-toggle");
    const autoToggle = this._toggle("fs-auto-theme-toggle");
    const glowToggle = this._toggle("fs-glow-toggle");
    this.els.fsDark = darkToggle.input;
    this.els.fsAutoTheme = autoToggle.input;
    this.els.fsGlow = glowToggle.input;

    const darkRow = this._row(
      "Dark Mode",
      "Toggle this theme's dark or light appearance.",
      darkToggle.wrapper,
    );
    const darkModeLabel = darkRow.querySelector(".label > span");
    this.els.fsDarkUpdatedSticker = null;
    if (darkModeLabel) {
      darkModeLabel.classList.add("fs-dark-mode-label");
      if ((Number(state.get("darkModeToggleUseCount")) || 0) < 20) {
        const updatedSticker = this._el("span", {
          className: "fs-updated-sticker",
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 36" role="img" aria-label="Updated">
            <title>Updated</title>
            <path d="M10 3h88l7 7v16l-7 7H10l-7-7V10z" fill="#ffe05b" stroke="#141414" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M13 8h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
            <text x="54" y="24" fill="#141414" font-family="Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="1.1" text-anchor="middle">UPDATED</text>
          </svg>`,
        });
        darkModeLabel.appendChild(updatedSticker);
        this.els.fsDarkUpdatedSticker = updatedSticker;
      }
    }
    this.els.fsDarkRow = darkRow;

    const autoThemeRow = this._row(
      "Auto Theme",
      "Randomize theme on every new tab.",
      autoToggle.wrapper,
    );
    const glowRow = this._row(
      "Glow Effect",
      "Toggle clock glow & pulsing.",
      glowToggle.wrapper,
    );
    this.els.fsAutoThemeRow = autoThemeRow;
    this.els.fsGlowRow = glowRow;

    pane.appendChild(
      this._section("Theme", [
        darkRow,
        autoThemeRow,
        glowRow,
      ]),
    );

    // Background
    const uploadBtn = this._el("button", {
      className: "settings-button",
      id: "fs-upload-bg",
      textContent: "Upload",
    });
    const bgFileInput = this._el("input", {
      type: "file",
      accept: "image/*",
      className: "hidden",
      id: "fs-bg-file-input",
    });
    const removeBtn = this._el("button", {
      className: "settings-button hidden",
      id: "fs-remove-bg",
      textContent: "Remove",
    });
    this.els.fsUploadBg = uploadBtn;
    this.els.fsBgInput = bgFileInput;
    this.els.fsRemoveBg = removeBtn;

    const bgControls = this._el("div", { className: "background-controls" });
    bgControls.append(uploadBtn, bgFileInput, removeBtn);

    const freezeBtn = this._el("button", {
      className: "settings-button hidden",
      id: "fs-freeze-btn",
      textContent: "Freeze",
    });
    const rndBtn = this._el("button", {
      className: "settings-button",
      id: "fs-rnd-btn",
      textContent: "Random",
    });
    this.els.fsFreezeBtn = freezeBtn;
    this.els.fsRndBtn = rndBtn;
    const rndControls = this._el("div", { className: "background-controls" });
    rndControls.append(freezeBtn, rndBtn);

    const blurSelect = this._dropdown("fs-blur-select", [
      ["0", "Off"],
      ["10", "10%"],
      ["20", "20%"],
      ["30", "30%"],
      ["40", "40%"],
      ["50", "50%"],
    ]);
    this.els.fsBlurSelect = blurSelect;
    const blurRow = this._row(
      "Blur Intensity",
      "Blur the background image.",
      blurSelect,
    );
    this.els.fsBlurRow = blurRow;

    pane.appendChild(
      this._section("Background", [
        this._row("Custom BG", "Upload an image.", bgControls),
        this._row("Random BG", "Fetch image from Lorem Picsum.", rndControls),
        blurRow,
      ]),
    );

    // Normal themes
    const normalGrid = this._el("div", { className: "fs-themes-grid" });
    this.els.fsNormalThemes = normalGrid;
    pane.appendChild(this._section("Theme Presets", [normalGrid]));

    // Gradient themes
    const gradientGrid = this._el("div", { className: "fs-themes-grid" });
    this.els.fsGradientThemes = gradientGrid;
    pane.appendChild(this._section("Gradient Theme Presets", [gradientGrid]));

    // Saved presets
    const saveBtn = this._el("button", {
      className: "settings-button",
      textContent: "Save Current Theme",
    });
    this.els.fsSaveThemeBtn = saveBtn;
    const savedGrid = this._el("div", { className: "fs-saved-grid" });
    this.els.fsSavedThemes = savedGrid;
    pane.appendChild(
      this._section("Saved Presets", [
        this._el(
          "div",
          {
            className: "setting-row",
            style: { background: "transparent", padding: "0 0 10px 0" },
          },
          [saveBtn],
        ),
        savedGrid,
      ]),
    );

    // Advanced Options
    const generateThemeBtn = this._el("button", {
      type: "button",
      className: "settings-button fs-generate-theme-btn",
      textContent: "Generate a Theme",
    });
    this.els.fsThemeGeneratorNewSticker = null;
    if ((Number(state.get("themeGeneratorUseCount")) || 0) < 1) {
      const newSticker = this._newSticker("fs-generate-new-sticker");
      generateThemeBtn.appendChild(newSticker);
      this.els.fsThemeGeneratorNewSticker = newSticker;
    }
    this.els.fsGenerateThemeBtn = generateThemeBtn;

    const colorNote = this._el("p", {
      className: "settings-note hidden",
      id: "fs-color-warning",
      textContent: "(Switch to a normal theme without a wallpaper to use Advanced Options)",
      style: {
        color: "var(--text-secondary)",
        fontWeight: "bold",
        marginBottom: "10px",
      },
    });
    this.els.fsColorWarning = colorNote;

    const colorGrid = this._el("div", {
      className: "fs-color-grid",
      id: "fs-advanced-colors",
    });
    this.els.fsColorControls = colorGrid;

    const colorDefs = [
      { id: "fs-bg-primary-picker", label: "Primary Background" },
      { id: "fs-bg-secondary-picker", label: "Widgets Background" },
      { id: "fs-bg-tertiary-picker", label: "Popups Background" },
      { id: "fs-theme-color-picker", label: "Accent Color" },
      { id: "fs-text-primary-picker", label: "Primary Text" },
      { id: "fs-text-secondary-picker", label: "Secondary Text" },
      { id: "fs-text-placeholder-picker", label: "SearchBox Text" },
      { id: "fs-glow-color-picker", label: "Glow Color" },
    ];
    colorDefs.forEach((def) => {
      const picker = this._el("input", {
        type: "color",
        id: def.id,
        className: "color-picker",
      });
      colorGrid.appendChild(this._row(def.label, null, picker));
    });

    pane.appendChild(
      this._section("Advanced Options", [generateThemeBtn, colorNote, colorGrid]),
    );

    return pane;
  }

  // ─── Shortcuts Pane ────────────────────────────────────────

  buildShortcutsPane() {
    const pane = this._el("div");

    const posSelect = this._dropdown("fs-sc-position", [
      ["bottom", "Bottom"],
      ["top", "Top"],
      ["hide", "Hide"],
    ]);
    this.els.fsScPosition = posSelect;

    pane.appendChild(
      this._section("Position", [
        this._row(
          "Shortcuts Position",
          "Position or hide the shortcuts bar.",
          posSelect,
        ),
      ]),
    );

    const listContainer = this._el("div", {
      className: "fs-shortcuts-list",
      id: "fs-shortcuts-editor-list",
    });
    this.els.fsShortcutList = listContainer;
    pane.appendChild(
      this._section(`Your Shortcuts (up to ${MAX_SHORTCUTS})`, [listContainer]),
    );

    // Add shortcut form
    const form = this._el("form", { id: "fs-add-shortcut-form" });
    form.appendChild(
      this._el("h3", {
        className: "settings-header",
        textContent: "Add New Shortcut",
      }),
    );
    const inputsDiv = this._el("div", { className: "add-shortcut-inputs" });
    const nameInput = this._el("input", {
      type: "text",
      placeholder: "Name (e.g., Google)",
      maxlength: "35",
      required: "",
    });
    const urlInput = this._el("input", {
      type: "text",
      placeholder: "URL (e.g., https://google.com)",
      maxlength: "2048",
      required: "",
    });
    inputsDiv.append(nameInput, urlInput);
    form.appendChild(inputsDiv);
    form.appendChild(
      this._el("button", {
        type: "submit",
        className: "settings-button",
        textContent: "Add Shortcut",
      }),
    );
    this.els.fsShortcutForm = form;
    this.els.fsScNameInput = nameInput;
    this.els.fsScUrlInput = urlInput;

    pane.appendChild(form);

    return pane;
  }

  // ─── Data Pane ─────────────────────────────────────────────

  buildDataPane() {
    const pane = this._el("div");

    // Visibility toggles
    const todoToggle = this._toggle("fs-todo-toggle");
    const appsToggle = this._toggle("fs-apps-toggle");
    const aiToggle = this._toggle("fs-ai-toggle");
    const voiceToggle = this._toggle("fs-hide-voice-toggle");
    this.els.fsTodoToggle = todoToggle.input;
    this.els.fsAppsToggle = appsToggle.input;
    this.els.fsAiToggle = aiToggle.input;
    this.els.fsHideVoice = voiceToggle.input;

    pane.appendChild(
      this._section("Visibility", [
        this._row(
          "Hide To-Do List",
          "Hide the To-Do List button.",
          todoToggle.wrapper,
        ),
        this._row(
          "Hide Google Apps",
          "Hide the Google Apps button.",
          appsToggle.wrapper,
        ),
        this._row(
          "Hide AI Tools & Socials",
          "Hide the AI Tools & Socials button.",
          aiToggle.wrapper,
        ),
        this._row(
          "Hide Voice Search",
          "Hide the microphone button.",
          voiceToggle.wrapper,
        ),
      ]),
    );

    // Backup & Restore
    const backupBtn = this._el("button", {
      className: "settings-button",
      textContent: "Backup",
    });
    const restoreBtn = this._el("button", {
      className: "settings-button",
      textContent: "Restore",
    });
    const restoreInput = this._el("input", {
      type: "file",
      accept: ".json",
      className: "hidden",
    });
    const resetBtn = this._el("button", {
      className: "settings-button danger",
      textContent: "Reset All",
    });
    this.els.fsBackup = backupBtn;
    this.els.fsRestore = restoreBtn;
    this.els.fsRestoreInput = restoreInput;
    this.els.fsReset = resetBtn;

    const backupControls = this._el("div", { className: "fs-backup-controls" });
    backupControls.append(backupBtn, restoreBtn, restoreInput, resetBtn);
    pane.appendChild(this._section("Backup & Restore", [backupControls]));

    // About
    const updateBtn = this._el("button", {
      className: "icon-button",
      innerHTML: `<svg stroke="currentColor" fill="currentColor" height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21,10.12H14.22L16.96,7.3C14.23,4.6 9.81,4.5 7.08,7.2C4.35,9.91 4.35,14.28 7.08,17C9.81,19.7 14.23,19.7 16.96,17C18.32,15.65 19,14.08 19,12.1H21C21,14.08 20.12,16.65 18.36,18.39C14.85,21.87 9.15,21.87 5.64,18.39C2.14,14.92 2.11,9.28 5.62,5.81C9.13,2.34 14.76,2.34 18.27,5.81L21,3V10.12M12.5,8V12.25L16,14.33L15.28,15.54L11,13V8H12.5Z"/></svg><span>Check for Updates</span>`,
    });
    const ghBtn = this._el("button", {
      className: "icon-button",
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg><span>GitHub</span>`,
    });
    const ppLink = this._el("a", {
      href: "privacy-policy.html",
      className: "icon-button",
      rel: "noopener noreferrer",
      innerHTML: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 5C17.5866 5 14.992 4.05652 12.45 2.15C12.1833 1.95 11.8167 1.95 11.55 2.15C9.00797 4.05652 6.41341 5 3.75 5C3.33579 5 3 5.33579 3 5.75V11C3 16.0012 5.95756 19.6757 11.7251 21.9478C11.9018 22.0174 12.0982 22.0174 12.2749 21.9478C18.0424 19.6757 21 16.0012 21 11V5.75C21 5.33579 20.6642 5 20.25 5ZM16.7568 9.30287L10.7568 14.8029C10.4608 15.0742 10.0036 15.0643 9.71967 14.7803L7.21967 12.2803C6.92678 11.9874 6.92678 11.5126 7.21967 11.2197C7.51256 10.9268 7.98744 10.9268 8.28033 11.2197L10.2726 13.2119L15.7432 8.19714C16.0485 7.91724 16.523 7.93787 16.8029 8.24321C17.0828 8.54855 17.0621 9.02297 16.7568 9.30287Z" fill="currentColor"/></svg><span>Privacy Policy</span>`,
    });

    this.els.fsUpdateBtn = updateBtn;
    this.els.fsGhBtn = ghBtn;

    const aboutRow1 = this._el("div", { className: "fs-about-row" });
    aboutRow1.append(updateBtn);
    const aboutRow2 = this._el("div", { className: "fs-about-row" });
    aboutRow2.append(ghBtn, ppLink);
    pane.appendChild(this._section("About", [aboutRow1, aboutRow2]));

    return pane;
  }

  // ─── Core Events ───────────────────────────────────────────

  bindCoreEvents() {
    // Close
    this.els.closeBtn.addEventListener("click", () => this.close());
    this.overlay.addEventListener("keydown", this._onDialogKeyDown, true);
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    if (this.els.miniBtn) {
      this.els.miniBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
        this.isOpen = false;
        state.set("lastSettingsView", "mini");
        const sm = this._sm();
        if (sm && sm.els.popup) {
          sm.els.popup.classList.add("visible");
          sm.els.popup.setAttribute("aria-hidden", "false");
          sm.els.btn?.setAttribute("aria-expanded", "true");
        }
      });
    }

    // Tab switching
    this.els.tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = this.els.tabBtns.indexOf(btn);
        this.els.tabBtns.forEach((b) => b.classList.remove("active"));
        this.els.tabBtns.forEach((b) => b.setAttribute("aria-selected", "false"));
        this.els.panes.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        if (this.els.panes[idx]) this.els.panes[idx].classList.add("active");
      });
    });

    // Drag
    this.els.titlebar.addEventListener("mousedown", (e) =>
      this._handleDragStart(e),
    );
    this.els.footer.addEventListener("mousedown", (e) => {
      // The entire footer is a drag handle. Let the footer link receive its
      // normal click/open behavior instead of starting a modal drag.
      if (e.target.closest("a")) return;
      this._handleDragStart(e);
    });

    // Open full settings button (in mini popup)
    const openBtn = document.getElementById("open-full-settings-btn");
    if (openBtn) openBtn.addEventListener("click", () => this.open());

    // ─── General tab events ───
    this._bindToggle(this.els.fsClockType, "clockType", "analog");
    this._bindToggle(this.els.fsClockFormat, "clockFormat", "24");
    this._bindToggle(this.els.fsDateToggle, "showDate", true);
    this._bindToggle(this.els.fsHideGreetings, "hideGreetings", true);
    this._bindHideToggle(this.els.fsEditableText, "showEditableText");
    this.els.fsDisableAnimations.addEventListener("change", () => {
      state.set("disableAnimations", this.els.fsDisableAnimations.checked);
      this._recordDisableAnimationsToggle();
    });
    this._bindToggle(this.els.fsTempUnit, "tempUnit", "imperial");
    this._bindToggle(this.els.fsTempDisplay, "tempDisplayMode", true);

    this.els.fsWidgetControl.addEventListener("change", (e) =>
      state.set("widgetControl", e.target.value),
    );
    this.els.fsShortcutsPosition.addEventListener("change", (e) =>
      state.set("shortcutsPosition", e.target.value),
    );
    this.els.fsResetKeys.addEventListener("click", async () => {
      if (await showCustomModal("Reset keyboard shortcuts to default?", true)) {
        state.set("keyMap", structuredClone(DEFAULT_KEY_MAP));
        this._renderKeyEditor();
      }
    });
    this.els.fsResetLinkDirections.addEventListener("click", async () => {
      if (await showCustomModal("Reset link directions to default?", true)) {
        state.set("linkTargets", { ...CONFIG.defaults.linkTargets });
        this._renderLinkDirectionEditor();
      }
    });

    // Location search
    this.els.fsLocSave.addEventListener("click", () => {
      this._sm()?.recordWeatherLocationSaveUse?.();
      this._searchLocation();
    });
    this.els.fsLocInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._searchLocation();
    });
    this.els.fsLocGps.addEventListener("click", () => {
      const sm = this._sm();
      if (sm) sm.detectLocation();
    });

    // ─── Appearance tab events ───
    this.els.fsDark.addEventListener("change", () => {
      if (this.els.fsDark.disabled) return;
      const sm = this._sm();
      if (sm) sm.disableAutoTheme();
      if (sm) {
        sm.applyDarkModePreference?.(this.els.fsDark.checked);
        sm.recordDarkModeToggleUse?.();
      }
    });

    this.els.fsAutoTheme.addEventListener("change", () => {
      if (this.els.fsAutoTheme.checked) {
        state.set("autoTheme", true);
      } else {
        state.set("autoTheme", false);
      }
    });

    this.els.fsGlow.addEventListener("change", () => {
      state.set("glowEffect", this.els.fsGlow.checked);
      document.body.classList.toggle("no-glow", !this.els.fsGlow.checked);
    });

    // BG upload
    this.els.fsUploadBg.addEventListener("click", () => {
      this.els.fsBgInput.value = "";
      this.els.fsBgInput.click();
    });
    this.els.fsBgInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const sm = this._sm();
      if (sm && typeof sm.handleBgUpload === "function") {
        await sm.handleBgUpload(file);
      }
      this._updateBgState();
      this.els.fsBgInput.value = "";
    });
    this.els.fsRemoveBg.addEventListener("click", async () => {
      const sm = this._sm();
      if (sm && typeof sm.removeCustomBg === "function") {
        await sm.removeCustomBg();
      }
      this._updateBgState();
    });

    // Random BG
    this.els.fsRndBtn.addEventListener("click", async () => {
      const sm = this._sm();
      if (sm) {
        await sm.fetchRandomBackground("user", this.els.fsRndBtn);
        this._updateBgState();
      }
    });
    this.els.fsFreezeBtn.addEventListener("click", async () => {
      const sm = this._sm();
      if (sm && typeof sm.freezeRandomBackground === "function") {
        await sm.freezeRandomBackground();
        this._updateBgState();
      }
    });

    // Blur
    this.els.fsBlurSelect.addEventListener("change", (e) => {
      state.set("bgBlurIntensity", e.target.value);
      const blurMap = { 0: 0, 10: 2, 20: 4, 30: 6, 40: 8, 50: 10 };
      document.documentElement.style.setProperty(
        "--bg-blur",
        (blurMap[e.target.value] || 0) + "px",
      );
      if (e.target.value !== "0")
        document.documentElement.classList.add("high-bg-blur");
      else document.documentElement.classList.remove("high-bg-blur");
    });

    // Color pickers
    if (this.els.fsColorControls) {
      this.els.fsColorControls.addEventListener("input", (e) => {
        if (!e.target.classList.contains("color-picker")) return;
        const hasBg =
          document.body.classList.contains("has-custom-bg") ||
          !!state.get("backgroundImage") ||
          !!state.get("randomBgMode");
        const isGradient =
          document.body.classList.contains("gradient-mode-active") ||
          state.get("gradientModeActive") === true;
        if (hasBg || isGradient) return;

        const sm = this._sm();
        if (sm) sm.disableAutoTheme();

        const mapping = {
          "fs-bg-primary-picker": "--bg-primary",
          "fs-bg-secondary-picker": "--bg-secondary",
          "fs-bg-tertiary-picker": "--bg-tertiary",
          "fs-theme-color-picker": "--accent-color",
          "fs-text-primary-picker": "--text-primary",
          "fs-text-secondary-picker": "--text-secondary",
          "fs-text-placeholder-picker": "--text-placeholder",
          "fs-glow-color-picker": "--glow-color",
        };
        const cssVar = mapping[e.target.id];
        if (cssVar) {
          document.body.style.setProperty(cssVar, e.target.value);
          state.set(`custom-${cssVar}`, e.target.value);
          if (cssVar === "--bg-tertiary") {
            sm?.updateIconInversion(e.target.value);
          }
        }
        state.set("normalThemeId", "custom");
        sm?.applyCustomThemeUI?.();
        this._updateColorControlsState();
      });
    }

    // Save theme
    this.els.fsGenerateThemeBtn.addEventListener("click", () => {
      if (this._generateThemeCooldown) return;
      const sm = this._sm();
      if (!sm?.generateCuratedTheme) return;

      this._generateThemeCooldown = true;
      this._updateColorControlsState();
      try {
        const generated = sm.generateCuratedTheme();
        if (generated) {
          sm.recordThemeGeneratorUse?.();
          sm.showThemeGenerationHint?.();
        }
        this._syncColorPickers();
      } catch (error) {
        console.error("Theme generation failed:", error);
      } finally {
        window.setTimeout(() => {
          this._generateThemeCooldown = false;
          this._updateColorControlsState();
        }, 1000);
      }
    });

    this.els.fsSaveThemeBtn.addEventListener("click", () => {
      const sm = this._sm();
      if (sm) {
        sm.saveCurrentTheme();
        this._renderSavedThemes();
      }
    });

    // ─── Shortcuts tab events ───
    this.els.fsScPosition.addEventListener("change", (e) =>
      state.set("shortcutsPosition", e.target.value),
    );

    this.els.fsShortcutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = this.els.fsScNameInput.value;
      const url = this.els.fsScUrlInput.value;
      if (!name.trim() || !url.trim()) return;
      const sm = this._sm();
      if (sm) {
        if (await sm.addShortcut(name, url)) {
          this.els.fsScNameInput.value = "";
          this.els.fsScUrlInput.value = "";
          this._renderShortcutEditor();
        }
      }
    });

    // ─── Data tab events ───
    this._bindHideToggle(this.els.fsTodoToggle, "showTodo");
    this._bindHideToggle(this.els.fsAppsToggle, "showApps");
    this._bindHideToggle(this.els.fsAiToggle, "showAiTools");
    this.els.fsHideVoice.addEventListener("change", () => {
      state.set("hideVoiceSearch", this.els.fsHideVoice.checked);
    });

    this.els.fsBackup.addEventListener("click", () => {
      const sm = this._sm();
      if (sm) sm.backup();
    });
    this.els.fsRestore.addEventListener("click", () =>
      this.els.fsRestoreInput.click(),
    );
    this.els.fsRestoreInput.addEventListener("change", (e) => {
      const sm = this._sm();
      if (sm) sm.restore(e);
    });
    this.els.fsReset.addEventListener("click", async () => {
      const sm = this._sm();
      if (sm && typeof sm.resetAll === "function") {
        await sm.resetAll();
      }
    });

    this.els.fsUpdateBtn.addEventListener("click", () => {
      window.open(
        "https://github.com/xtditom/YourDynamicDashboard/releases/latest",
        "_blank",
      );
    });
    this.els.fsGhBtn.addEventListener("click", () => {
      window.open("https://github.com/xtditom/YourDynamicDashboard", "_blank");
    });
  }

  _bindToggle(input, key, trueValue) {
    input.addEventListener("change", () => {
      if (typeof trueValue === "boolean") {
        state.set(key, input.checked);
      } else {
        if (key === "tempUnit") {
          state.set(key, input.checked ? "imperial" : "metric");
        } else {
          state.set(
            key,
            input.checked
              ? trueValue
              : key === "clockFormat"
                ? "12"
                : "digital",
          );
        }
      }
    });
  }

  _bindHideToggle(input, key) {
    input.checked = state.get(key) === false;
    input.addEventListener("change", () => {
      state.set(key, !input.checked);
    });
  }

  _recordDisableAnimationsToggle() {
    const currentCount = Math.max(
      0,
      Number(state.get("disableAnimationsToggleCount")) || 0,
    );
    const nextCount = Math.min(10, currentCount + 1);
    if (!state.set("disableAnimationsToggleCount", nextCount)) return;

    if (nextCount >= 10) {
      this.els.fsDisableAnimationsNewSticker?.remove();
      this.els.fsDisableAnimationsNewSticker = null;
    }
  }

  updateDarkModeUpdatedBadge(hidden = null) {
    const shouldHide =
      hidden === null
        ? (Number(state.get("darkModeToggleUseCount")) || 0) >= 20
        : hidden;
    if (this.els.fsDarkUpdatedSticker) {
      this.els.fsDarkUpdatedSticker.hidden = shouldHide;
    }
  }

  updateWeatherLocationBadge(hidden = null) {
    const shouldHide =
      hidden === null
        ? (Number(state.get("weatherLocationSaveCount")) || 0) >= 2
        : hidden;
    if (this.els.fsWeatherLocationUpdatedSticker) {
      this.els.fsWeatherLocationUpdatedSticker.hidden = shouldHide;
    }
  }

  updateThemeBadges() {
    const lavenderHidden =
      (Number(state.get("lavenderMistThemeUseCount")) || 0) >= 1;
    const dawnHidden =
      (Number(state.get("dawnBloomThemeUseCount")) || 0) >= 1;
    this.els.fsNormalThemes
      ?.querySelector('[data-theme-feature-badge="lavenderMist"]')
      ?.toggleAttribute("hidden", lavenderHidden);
    this.els.fsGradientThemes
      ?.querySelector('[data-theme-feature-badge="dawnBloom"]')
      ?.toggleAttribute("hidden", dawnHidden);
  }

  updateThemeGeneratorBadge(hidden = null) {
    const shouldHide =
      hidden === null
        ? (Number(state.get("themeGeneratorUseCount")) || 0) >= 1
        : hidden;
    if (this.els.fsThemeGeneratorNewSticker) {
      this.els.fsThemeGeneratorNewSticker.hidden = shouldHide;
    }
  }

  // ─── State Subscription ────────────────────────────────────

  subscribeState() {
    state.subscribe((key, value) => {
      if (!this.isOpen) return;
      this._syncToggle(key, value);
      if (key === "keyMap") {
        this._renderKeyEditor();
      }
      if (key === "userSavedThemes") {
        this._renderSavedThemes();
      }
      if (
        key === "gradientModeActive" ||
        key === "backgroundImage" ||
        key === "randomBgMode" ||
        key === "normalThemeId" ||
        key === "gradientThemeId" ||
        key === "autoTheme" ||
        key === "darkMode" ||
        key === "widgetControl" ||
        key === "yd_city" ||
        key === "yd_lat" ||
        key === "yd_lon" ||
        key === "glowEffect"
      ) {
        this._syncColorPickers();
        this._updateColorControlsState();
        this._updateBgState();
      }
    });
  }

  _syncToggle(key, value) {
    const map = {
      clockType: { el: this.els.fsClockType, check: value === "analog" },
      clockFormat: { el: this.els.fsClockFormat, check: value === "24" },
      showDate: { el: this.els.fsDateToggle, check: value === true },
      hideGreetings: { el: this.els.fsHideGreetings, check: value === true },
      showEditableText: { el: this.els.fsEditableText, check: value === false },
      disableAnimations: { el: this.els.fsDisableAnimations, check: value === true },
      tempUnit: { el: this.els.fsTempUnit, check: value === "imperial" },
      tempDisplayMode: { el: this.els.fsTempDisplay, check: value === true },
      darkMode: {
        el: this.els.fsDark,
        check: this.isDefaultThemeModeAvailable() && value === true,
      },
      autoTheme: { el: this.els.fsAutoTheme, check: value === true },
      glowEffect: { el: this.els.fsGlow, check: value !== false },
      showTodo: { el: this.els.fsTodoToggle, check: value === false },
      showApps: { el: this.els.fsAppsToggle, check: value === false },
      showAiTools: { el: this.els.fsAiToggle, check: value === false },
      hideVoiceSearch: { el: this.els.fsHideVoice, check: value === true },
    };

    if (map[key]) {
      map[key].el.checked = map[key].check;
    }

    if (key === "widgetControl")
      this.els.fsWidgetControl.value = value || "all";
    if (key === "shortcutsPosition") {
      this.els.fsShortcutsPosition.value = value || "bottom";
      this.els.fsScPosition.value = value || "bottom";
    }
    if (key === "yd_city" && this.els.fsLocInput)
      this.els.fsLocInput.value = value || "";

    // Clock format row disabled when analog
    if (key === "clockType") {
      const isAnalog = value === "analog";
      if (this.els.fsClockFormatRow) {
        this.els.fsClockFormatRow.classList.toggle("disabled", isAnalog);
        this.els.fsClockFormat.disabled = isAnalog;
      }
    }
  }

  // ─── Populate on Open ──────────────────────────────────────

  populateAll() {
    // Toggles
    this.els.fsClockType.checked = state.get("clockType") === "analog";
    this.els.fsClockFormat.checked = state.get("clockFormat") === "24";
    this.els.fsDateToggle.checked = state.get("showDate") === true;
    this.els.fsHideGreetings.checked = state.get("hideGreetings") === true;
    this.els.fsEditableText.checked = state.get("showEditableText") === false;
    this.els.fsDisableAnimations.checked = state.get("disableAnimations") === true;
    this.els.fsTempUnit.checked = state.get("tempUnit") === "imperial";
    this.els.fsTempDisplay.checked = state.get("tempDisplayMode") === true;
    this.els.fsDark.checked = state.get("darkMode") === true;
    this.els.fsAutoTheme.checked = state.get("autoTheme") === true;
    this.els.fsGlow.checked = state.get("glowEffect") !== false;
    this.els.fsTodoToggle.checked = state.get("showTodo") === false;
    this.els.fsAppsToggle.checked = state.get("showApps") === false;
    this.els.fsAiToggle.checked = state.get("showAiTools") === false;
    this.els.fsHideVoice.checked = state.get("hideVoiceSearch") === true;

    // Dropdowns
    this.els.fsWidgetControl.value = state.get("widgetControl") || "all";
    this.els.fsShortcutsPosition.value =
      state.get("shortcutsPosition") || "bottom";
    this.els.fsScPosition.value = state.get("shortcutsPosition") || "bottom";
    this.els.fsLocInput.value = state.get("yd_city") || "";
    this.els.fsBlurSelect.value = state.get("bgBlurIntensity") || "0";

    // Clock format row state
    const isAnalog = state.get("clockType") === "analog";
    this.els.fsClockFormatRow.classList.toggle("disabled", isAnalog);
    this.els.fsClockFormat.disabled = isAnalog;

    // Color pickers
    this._syncColorPickers();

    // Render dynamic content
    this._renderThemes();
    this._renderSavedThemes();
    this._renderShortcutEditor();
    this._renderKeyEditor();
    this._renderLinkDirectionEditor();
    this._updateBgState();
    this._updateColorControlsState();
    this._updateControlAvailability();
  }

  // ─── Open / Close ──────────────────────────────────────────

  open() {
    if (this.isOpen) return;
    state.set("fullSettingsEverOpened", true);
    // Close the mini popup if open
    const miniPopup = document.getElementById("settings-popup");
    if (miniPopup) {
      miniPopup.classList.remove("visible");
      miniPopup.setAttribute("aria-hidden", "true");
      document.getElementById("settings-toggle-button")?.setAttribute("aria-expanded", "false");
    }

    this._previousFocus = document.activeElement;
    this.populateAll();
    this.overlay.classList.remove("hidden");
    this.overlay.inert = false;
    this.overlay.setAttribute("aria-hidden", "false");
    this.isOpen = true;
    window.addEventListener("keydown", this._onDialogKeyDown, true);
    document.addEventListener("keydown", this._onDialogKeyDown, true);
    state.set("lastSettingsView", "full");

    // Reset position to center
    this.modal.style.transform = "";
    this.offsetX = 0;
    this.offsetY = 0;
    window.setTimeout(() => this.els.closeBtn.focus(), 0);
  }

  close() {
    if (!this.isOpen) return;
    if (this._activeKeyCleanup) this._activeKeyCleanup();
    this._handleDragEnd();
    window.removeEventListener("keydown", this._onDialogKeyDown, true);
    document.removeEventListener("keydown", this._onDialogKeyDown, true);
    this.modal.style.transform = "";
    this.overlay.classList.add("hidden");
    this.overlay.inert = true;
    this.overlay.setAttribute("aria-hidden", "true");
    this.isOpen = false;
    state.set("lastSettingsView", "full");
    const previousFocus = this._previousFocus;
    this._previousFocus = null;
    if (previousFocus && typeof previousFocus.focus === "function") {
      window.setTimeout(() => previousFocus.focus(), 0);
    }
  }

  _handleDialogKeyDown(event) {
    if (!this.isOpen) return;
    if (event.key === "Escape" || event.key === "Esc") {
      if (event.target?.closest?.(".ydd-custom-modal-overlay")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      this.modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      this.modal.focus();
      return;
    }
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

  // ─── Drag ──────────────────────────────────────────────────

  _handleDragStart(e) {
    if (e.target.closest(".fs-close-btn")) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.modalStartX = this.offsetX;
    this.modalStartY = this.offsetY;
    this.modal.classList.add("is-dragging");
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);
  }

  _handleDragMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.offsetX = this.modalStartX + dx;
    this.offsetY = this.modalStartY + dy;
    this.modal.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;
  }

  _handleDragEnd() {
    this.isDragging = false;
    this.modal.classList.remove("is-dragging");
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);
  }

  // ─── Settings Manager Reference ────────────────────────────

  _sm() {
    return window.__settingsManagerInstance || null;
  }

  // ─── Location Search ───────────────────────────────────────

  async _searchLocation() {
    const city = this.els.fsLocInput.value.trim();
    if (!city) return;
    const requestId = ++this._locationRequestId;
    this._locationController?.abort();
    const controller = new AbortController();
    this._locationController = controller;
    this.els.fsLocInput.disabled = true;
    this.els.fsLocSave.textContent = "...";
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
      const results = getGeocodingResults(await res.json());
      if (requestId !== this._locationRequestId) return;
      if (results.length === 0) {
        showCustomModal(
          `Could not find any city with name "${city}". Try another name.`,
        );
        return;
      }
      const loc = await chooseGeocodingResult(results, city);
      if (requestId !== this._locationRequestId || !loc) return;
      {
        state.set("yd_city", loc.name);
        state.set("yd_lat", Number(loc.latitude));
        state.set("yd_lon", Number(loc.longitude));
        state.set("locationUpdate", Date.now());
        this.els.fsLocInput.value = loc.name;
        this.els.fsLocSave.textContent = "Saved";
        setTimeout(() => {
          if (requestId === this._locationRequestId) {
            this.els.fsLocSave.textContent = "Save";
          }
        }, 2000);
      }
    } catch (error) {
      if (error?.name !== "AbortError" && requestId === this._locationRequestId) {
        console.error("Geocoding Error:", error);
        showCustomModal("Could not look up that location. Check your connection and try again.");
      }
    } finally {
      if (requestId === this._locationRequestId) {
        this.els.fsLocInput.disabled = false;
        if (this.els.fsLocSave && this.els.fsLocSave.textContent === "...") {
          this.els.fsLocSave.textContent = "Save";
        }
      }
    }
  }

  // ─── Theme Rendering ──────────────────────────────────────

  _renderThemes() {
    const sm = this._sm();
    if (!sm) return;

    const orderThemes = (themes, order) => {
      const byId = new Map(themes.map((theme) => [theme.id, theme]));
      const ordered = order.map((id) => byId.get(id)).filter(Boolean);
      const listed = new Set(order);
      return [...ordered, ...themes.filter((theme) => !listed.has(theme.id))];
    };

    const renderGrid = (container, themes, isGradient) => {
      container.innerHTML = "";
      themes.forEach((theme) => {
        const btn = document.createElement("button");
        btn.className = `theme-preset-button ${isGradient ? "gradient" : ""}`;
        btn.textContent = theme.name;
        const badgeKey =
          theme.id === "theme-8"
            ? "lavenderMist"
            : theme.id === "dawn-bloom"
              ? "dawnBloom"
              : null;
        const badgeCountKey =
          badgeKey === "lavenderMist"
            ? "lavenderMistThemeUseCount"
            : badgeKey === "dawnBloom"
              ? "dawnBloomThemeUseCount"
              : null;
        if (badgeKey && (Number(state.get(badgeCountKey)) || 0) < 1) {
          const newSticker = this._newSticker("fs-theme-new-sticker");
          newSticker.dataset.themeFeatureBadge = badgeKey;
          btn.appendChild(newSticker);
        }
        if (isGradient) {
          btn.style.background = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        } else {
          const rightColor = window.__getThemeRightColor
            ? window.__getThemeRightColor(theme)
            : theme.id === "theme-3"
              ? "#006EFF"
              : theme.id === "theme-7"
                ? "#91AA5B"
                : theme.colors["--accent-color"];
          btn.style.background = `linear-gradient(135deg, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
          btn.style.borderColor = "var(--border-color)";
        }
        btn.addEventListener("click", async () => {
          if (
            await sm.applySelectedTheme(theme, isGradient)
          ) {
            sm.recordThemePresetUse?.(theme.id);
            // Re-sync pickers and disabled states
            setTimeout(() => {
              this._syncColorPickers();
              this._updateColorControlsState();
            }, 50);
          }
        });
        container.appendChild(btn);
      });
    };

    // Access THEMES through the exported reference
    if (window.__YDD_THEMES) {
      renderGrid(
        this.els.fsNormalThemes,
        orderThemes(window.__YDD_THEMES.normal, FULL_NORMAL_THEME_ORDER),
        false,
      );
      renderGrid(
        this.els.fsGradientThemes,
        orderThemes(window.__YDD_THEMES.gradient, FULL_GRADIENT_THEME_ORDER),
        true,
      );
    }
  }

  _renderSavedThemes() {
    const container = this.els.fsSavedThemes;
    if (!container) return;
    container.innerHTML = "";
    const sm = this._sm();
    const savedThemes = state.get("userSavedThemes") || [];

    for (let i = 0; i < 5; i++) {
      const theme = savedThemes[i];
      const btn = document.createElement("div");
      btn.className = "saved-preset-button";
      if (theme) {
        const rightColor = window.__getThemeRightColor
          ? window.__getThemeRightColor(theme)
          : theme.colors["--accent-color"];
        btn.classList.add("filled");
        btn.textContent = theme.name;
        btn.style.background = `linear-gradient(135deg, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
        btn.style.color = "#ffffff";
        btn.style.textShadow =
          "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        btn.style.borderColor = "var(--border-color)";
        const applySavedTheme = async () => {
          if (sm) {
            if (await sm.applySelectedTheme(theme)) {
              setTimeout(() => {
                this._syncColorPickers();
                this._updateColorControlsState();
              }, 50);
            }
          }
        };
        btn.addEventListener("click", applySavedTheme);
        makeKeyboardInteractive(btn, applySavedTheme, `Apply ${theme.name}`);
        const del = document.createElement("button");
        del.className = "delete-preset";
        del.textContent = "×";
        del.setAttribute("aria-label", `Delete ${theme.name}`);
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const newSaved = savedThemes.filter((_, idx) => idx !== i);
          newSaved.forEach((t, idx) => (t.name = `Preset ${idx + 1}`));
          state.set("userSavedThemes", newSaved);
          this._renderSavedThemes();
          if (sm) sm.renderSavedThemes();
        });
        btn.appendChild(del);
      } else {
        btn.textContent = "Empty";
      }
      container.appendChild(btn);
    }
  }

  // ─── Color Picker Sync ────────────────────────────────────

  _syncColorPickers() {
    const mapping = {
      "--bg-primary": "fs-bg-primary-picker",
      "--bg-secondary": "fs-bg-secondary-picker",
      "--bg-tertiary": "fs-bg-tertiary-picker",
      "--accent-color": "fs-theme-color-picker",
      "--text-primary": "fs-text-primary-picker",
      "--text-secondary": "fs-text-secondary-picker",
      "--text-placeholder": "fs-text-placeholder-picker",
      "--glow-color": "fs-glow-color-picker",
    };
    Object.entries(mapping).forEach(([cssVar, pickerId]) => {
      const el = document.getElementById(pickerId);
      if (el) {
        const val =
          state.get(`custom-${cssVar}`) ||
          getComputedStyle(document.body).getPropertyValue(cssVar).trim();
        if (val) el.value = val;
      }
    });
  }

  _updateColorControlsState() {
    const hasBg =
      document.body.classList.contains("has-custom-bg") ||
      !!state.get("backgroundImage") ||
      !!state.get("randomBgMode");
    const isGradient =
      document.body.classList.contains("gradient-mode-active") ||
      state.get("gradientModeActive") === true;
    const disabled = hasBg || isGradient;

    if (this.els.fsGenerateThemeBtn) {
      this.els.fsGenerateThemeBtn.disabled =
        disabled || this._generateThemeCooldown;
    }

    if (this.els.fsColorControls) {
      this.els.fsColorControls.style.opacity = disabled ? "0.4" : "1";
      this.els.fsColorControls.style.pointerEvents = disabled ? "none" : "auto";
      this.els.fsColorControls
        .querySelectorAll("input")
        .forEach((i) => (i.disabled = disabled));
    }
    if (this.els.fsColorWarning) {
      this.els.fsColorWarning.classList.toggle("hidden", !disabled);
    }
    this._updateControlAvailability();
  }

  _updateControlAvailability() {
    const hasBg =
      document.body.classList.contains("has-custom-bg") ||
      !!state.get("backgroundImage") ||
      !!state.get("randomBgMode");
    const isGradient =
      document.body.classList.contains("gradient-mode-active") ||
      state.get("gradientModeActive") === true;
    const autoThemeDisabled = hasBg;
    const glowDisabled = hasBg || isGradient;

    const setDisabled = (input, row, disabled) => {
      if (input) input.disabled = disabled;
      if (row) row.classList.toggle("disabled", disabled);
    };
    setDisabled(
      this.els.fsAutoTheme,
      this.els.fsAutoThemeRow,
      autoThemeDisabled,
    );
    setDisabled(this.els.fsGlow, this.els.fsGlowRow, glowDisabled);

    const darkModeAvailable = this.isDefaultThemeModeAvailable();
    setDisabled(this.els.fsDark, this.els.fsDarkRow, !darkModeAvailable);
    if (this.els.fsDark) {
      this.els.fsDark.checked =
        darkModeAvailable && state.get("darkMode") === true;
    }

    const widgetControl = state.get("widgetControl") || "all";
    const weatherVisible = [
      "all",
      "weather-only",
      "search-weather",
      "weather-quote",
    ].includes(widgetControl);
    const latitude = state.get("yd_lat");
    const longitude = state.get("yd_lon");
    const hasLocation =
      latitude !== null &&
      latitude !== undefined &&
      latitude !== "" &&
      longitude !== null &&
      longitude !== undefined &&
      longitude !== "" &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude)) &&
      Number(latitude) >= -90 &&
      Number(latitude) <= 90 &&
      Number(longitude) >= -180 &&
      Number(longitude) <= 180;
    const temperatureDisabled = !weatherVisible || !hasLocation;
    setDisabled(
      this.els.fsTempUnit,
      this.els.fsTempUnitRow,
      temperatureDisabled,
    );
    setDisabled(
      this.els.fsTempDisplay,
      this.els.fsTempDisplayRow,
      temperatureDisabled,
    );
  }

  isDarkModeAvailable() {
    const sm = this._sm();
    return sm?.isDarkModeAvailable?.() === true;
  }

  isDefaultThemeModeAvailable() {
    return this.isDarkModeAvailable();
  }

  // ─── Background State ─────────────────────────────────────

  _updateBgState() {
    const hasBg =
      document.body.classList.contains("has-custom-bg") ||
      !!state.get("backgroundImage") ||
      !!state.get("randomBgMode");
    const mode = state.get("randomBgMode");

    if (this.els.fsRemoveBg) {
      this.els.fsRemoveBg.classList.toggle("hidden", !hasBg);
    }
    if (this.els.fsFreezeBtn) {
      if (mode === "freeze") {
        this.els.fsFreezeBtn.textContent = "Unfreeze";
        this.els.fsFreezeBtn.style.color = "var(--accent-color)";
        this.els.fsFreezeBtn.classList.remove("hidden");
      } else if (mode === "random") {
        this.els.fsFreezeBtn.textContent = "Freeze";
        this.els.fsFreezeBtn.style.color = "";
        this.els.fsFreezeBtn.classList.remove("hidden");
      } else {
        this.els.fsFreezeBtn.textContent = "Freeze";
        this.els.fsFreezeBtn.style.color = "";
        this.els.fsFreezeBtn.classList.add("hidden");
      }
    }
    if (this.els.fsBlurRow) {
      this.els.fsBlurRow.classList.toggle("hidden", !hasBg);
    }

    this._updateColorControlsState();
  }

  // ─── Shortcut Editor ──────────────────────────────────────

  _renderShortcutEditor() {
    const list = this.els.fsShortcutList;
    if (!list) return;
    list.innerHTML = "";
    const shortcuts = state.get("userShortcuts") || [];

    shortcuts.forEach((s, index) => {
      const div = this._el("div", {
        className: "shortcut-editor-item",
        draggable: "true",
      });
      div.dataset.index = index;

      const handle = this._el("div", {
        className: "drag-handle",
        title: "Drag to reorder",
        textContent: "☰",
      });

      const iconContainer = this._el("div", {
        className: "icon-container",
        style: { position: "relative", cursor: "pointer" },
        title: "Click to upload custom icon",
      });
      const img = this._el("img", {
        src: s.customIcon || s.icon || getIconUrl(s.url),
        className: "icon",
        alt: `${s.name} icon`,
      });
      const fileInput = this._el("input", {
        type: "file",
        accept: "image/*",
        style: { display: "none" },
      });
      iconContainer.append(img, fileInput);
      const chooseIcon = () => fileInput.click();
      iconContainer.addEventListener("click", chooseIcon);
      makeKeyboardInteractive(iconContainer, chooseIcon, `Change ${s.name} icon`);

      const inputsDiv = this._el("div", { className: "inputs" });
      const nameInput = this._el("input", {
        type: "text",
        className: "name-input",
        value: s.name,
        placeholder: "Name",
        maxlength: "35",
        "aria-label": `${s.name} shortcut name`,
      });
      const urlInput = this._el("input", {
        type: "text",
        className: "url-input",
        value: s.url,
        placeholder: "URL",
        maxlength: "2048",
        "aria-label": `${s.name} shortcut URL`,
      });
      inputsDiv.append(nameInput, urlInput);

      const triggerSave = () => {
        const sm = this._sm();
        if (sm && !sm.updateShortcut(index, nameInput.value, urlInput.value)) {
          const saved = (state.get("userShortcuts") || [])[index];
          if (saved) {
            nameInput.value = saved.name;
            urlInput.value = saved.url;
          }
        }
      };
      nameInput.addEventListener("blur", triggerSave);
      urlInput.addEventListener("blur", triggerSave);

      const actionsDiv = this._el("div", { className: "actions" });
      const resetIconBtn = this._el("button", {
        type: "button",
        className: "action-btn reset",
        title: "Reset Custom Icon",
        innerHTML:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
      });
      resetIconBtn.setAttribute("aria-label", `Reset ${s.name} custom icon`);
      resetIconBtn.hidden = !s.customIcon;
      resetIconBtn.addEventListener("click", () => {
        const sm = this._sm();
        if (!sm) return;
        sm.updateShortcut(index, nameInput.value, urlInput.value, null, true);
        this._renderShortcutEditor();
      });
      const delBtn = this._el("button", {
        className: "action-btn delete",
        title: "Delete",
        "aria-label": `Delete ${s.name} shortcut`,
      });
      delBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      delBtn.addEventListener("click", () => {
        const sm = this._sm();
        if (sm) {
          sm.deleteShortcut(index);
          this._renderShortcutEditor();
        }
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
          const tempImg = new Image();
          tempImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            canvas.getContext("2d").drawImage(tempImg, 0, 0, 256, 256);
            const dataUrl = canvas.toDataURL("image/png");
            const sm = this._sm();
            if (
              sm?.updateShortcut(
                index,
                nameInput.value,
                urlInput.value,
                dataUrl,
              )
            ) {
              img.src = dataUrl;
              resetIconBtn.hidden = false;
            }
          };
          tempImg.onerror = () => showCustomModal("The icon could not be decoded.");
          tempImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });

      actionsDiv.append(resetIconBtn, delBtn);
      div.append(handle, iconContainer, inputsDiv, actionsDiv);

      // Drag & drop
      div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", index);
        div.classList.add("dragging");
        list.classList.add("is-reordering");
      });
      div.addEventListener("dragend", () => {
        div.classList.remove("dragging");
        list.classList.remove("is-reordering");
      });
      div.addEventListener("dragover", (e) => e.preventDefault());
      div.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData("text/plain"));
        const sm = this._sm();
        if (sm) {
          sm.reorderShortcuts(from, index);
          this._renderShortcutEditor();
        }
      });

      list.appendChild(div);
    });
  }

  // ─── Key Editor ────────────────────────────────────────────

  _createResetIconButton(title, onClick) {
    const button = this._el("button", {
      type: "button",
      className: "action-btn reset",
      title,
      innerHTML:
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    });
    button.addEventListener("click", onClick);
    return button;
  }

  async _resetKeyBinding(action) {
    const defaults = DEFAULT_KEY_MAP[action];
    if (!defaults) return;

    const currentMap = state.get("keyMap") || {};
    const defaultKey = defaults.key;
    const getEntry = (entry) =>
      typeof entry === "string" ? { key: entry, enabled: true } : entry || {};
    const conflictAction = Object.keys(currentMap).find((key) => {
      if (key === action) return false;
      const entry = getEntry(currentMap[key]);
      return entry.enabled !== false && entry.key === defaultKey;
    });

    if (conflictAction) {
      const conflictLabel = KEY_LABELS[conflictAction] || conflictAction;
      const decision = await showCustomModal(
        `The default key “${defaultKey.toUpperCase()}” is already assigned to ${conflictLabel}. Swap the two keys so both shortcuts remain available?`,
        true,
        false,
        [
          { text: "Swap keys", value: "swap", width: "120px" },
          {
            text: "Cancel",
            value: "cancel",
            width: "120px",
            style:
              "background: var(--bg-interactive); color: var(--text-primary);",
          },
        ],
      );
      if (decision !== "swap") return;

      const displaced = getEntry(currentMap[action]);
      const displacedKey = displaced.key;
      const displacedOwner = Object.keys(currentMap).find((key) => {
        if (key === action || key === conflictAction) return false;
        const entry = getEntry(currentMap[key]);
        return entry.enabled !== false && entry.key === displacedKey;
      });
      if (!displacedKey || displacedKey === defaultKey || displacedOwner) {
        await showCustomModal(
          "These shortcuts already contain another key conflict. Change the conflicting shortcut first, then try resetting this one again.",
        );
        return;
      }

      const nextMap = { ...currentMap };
      nextMap[action] = structuredClone(defaults);
      nextMap[conflictAction] = {
        ...getEntry(currentMap[conflictAction]),
        key: displaced.key || defaults.key,
      };
      state.set("keyMap", nextMap);
      this._renderKeyEditor();
      return;
    }

    const nextMap = { ...currentMap, [action]: structuredClone(defaults) };
    state.set("keyMap", nextMap);
    this._renderKeyEditor();
  }

  _renderKeyEditor() {
    const container = this.els.fsKeyList;
    if (!container) return;
    container.innerHTML = "";
    if (this.els.fsKeyNoteContainer) this.els.fsKeyNoteContainer.innerHTML = "";

    if (this._activeKeyCleanup) {
      this._activeKeyCleanup();
    }

    const map = state.get("keyMap");
    const labels = KEY_LABELS;

    const hasChanges = Object.keys(labels).some((action) => {
      const current = map[action] || DEFAULT_KEY_MAP[action];
      const baseline = DEFAULT_KEY_MAP[action];
      return (
        !baseline ||
        current.key !== baseline.key ||
        current.enabled !== baseline.enabled
      );
    });
    if (this.els.fsResetKeys) this.els.fsResetKeys.hidden = !hasChanges;

    Object.entries(labels).forEach(([action, labelText]) => {
      let data = map[action];
      if (!data || typeof data !== "object") {
        data = DEFAULT_KEY_MAP[action] || { key: "?", enabled: false };
      }

      const row = this._el("div", { className: "key-row" });
      const label = this._el("span", {
        className: "shortcut-key-label",
        textContent: labelText,
      });
      const usageCountKey =
        action === "settings"
          ? "settingsShortcutUseCount"
          : action === "miniSettings"
            ? "miniSettingsShortcutUseCount"
            : null;
      if (usageCountKey && (Number(state.get(usageCountKey)) || 0) < 8) {
        const updatedSticker = this._el("span", {
          className: "fs-shortcut-updated-sticker",
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 36" role="img" aria-label="Updated">
            <title>Updated</title>
            <path d="M10 3h88l7 7v16l-7 7H10l-7-7V10z" fill="#ffe05b" stroke="#141414" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M13 8h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
            <text x="54" y="24" fill="#141414" font-family="Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="1.1" text-anchor="middle">UPDATED</text>
          </svg>`,
        });
        label.appendChild(updatedSticker);
      }
      row.appendChild(label);

      const controls = this._el("div", { className: "key-controls" });
      const baseline = DEFAULT_KEY_MAP[action];
      const changed =
        !baseline ||
        data.key !== baseline.key ||
        data.enabled !== baseline.enabled;
      const resetButton = this._createResetIconButton(
        `Reset ${labelText}`,
        () => this._resetKeyBinding(action),
      );
      resetButton.hidden = !changed;

      if (data.fixed) {
        const status = this._el("span", {
          className: `key-fixed-status ${data.enabled ? "active" : "inactive"}`,
          textContent: data.enabled ? "ACTIVE" : "INACTIVE",
          style: {
            fontWeight: "bold",
            padding: "0.4rem 1rem",
            minWidth: "60px",
            textAlign: "center",
            fontSize: "0.85rem",
            color: data.enabled
              ? "var(--accent-color)"
              : "var(--text-secondary)",
          },
        });
        controls.appendChild(status);
      } else {
        const btn = this._el("button", {
          className: `key-btn ${!data.enabled ? "disabled" : ""}`,
          textContent: (data.key || "?").toUpperCase(),
        });
        btn.disabled = !data.enabled;

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this._activeKeyCleanup) this._activeKeyCleanup();

          const originalText = btn.textContent;
          btn.textContent = "...";
          btn.classList.add("listening");
          btn.style.borderColor = "var(--accent-color)";

          const handler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            document.removeEventListener("keydown", handler, true);
            this._activeKeyCleanup = null;
            btn.classList.remove("listening");
            btn.style.borderColor = "";

            const pressedKey = getBindableKey(event);
            if (!pressedKey) {
              btn.textContent = "Invalid!";
              btn.style.borderColor = "#e53e3e";
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.borderColor = "";
              }, 1000);
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
            this._renderKeyEditor();
          };

          this._activeKeyCleanup = () => {
            document.removeEventListener("keydown", handler, true);
            btn.textContent = originalText;
            btn.classList.remove("listening");
            btn.style.borderColor = "";
            this._activeKeyCleanup = null;
          };
          document.addEventListener("keydown", handler, { capture: true });
        });

        controls.appendChild(btn);
      }

      // Toggle
      const toggleLabel = this._el("label", {
        className: "toggle-switch mini",
      });
      const checkbox = this._el("input", { type: "checkbox" });
      checkbox.checked = data.enabled;
      toggleLabel.append(checkbox, this._el("span", { className: "slider" }));
      checkbox.addEventListener("change", () => {
        const newMap = { ...state.get("keyMap") };
        newMap[action] = { ...data, enabled: checkbox.checked };
        state.set("keyMap", newMap);
        this._renderKeyEditor();
      });
      controls.appendChild(toggleLabel);
      controls.appendChild(resetButton);

      row.appendChild(controls);
      container.appendChild(row);
    });

    // Note
    const note = this._el("div", {
      className: "settings-note",
      style: { marginTop: "1rem" },
    });
    note.innerHTML =
      "<p>Keys <strong>1-9</strong> are reserved for <strong>Shortcuts</strong><br>Press <strong>Z</strong> for <strong>Zen Mode</strong>, <strong>V</strong> for <strong>Voice Search</strong></p>";
    if (this.els.fsKeyNoteContainer)
      this.els.fsKeyNoteContainer.appendChild(note);
    else container.appendChild(note);
  }

  // ─── Link Direction Editor ─────────────────────────────────

  _renderLinkDirectionEditor() {
    const container = this.els.fsLinkDirList;
    if (!container) return;
    container.innerHTML = "";

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
    const defaults = CONFIG.defaults.linkTargets;
    const hasChanges = Object.keys(labels).some(
      (key) => targets[key] !== defaults[key],
    );
    if (this.els.fsResetLinkDirections) {
      this.els.fsResetLinkDirections.hidden = !hasChanges;
    }

    Object.entries(labels).forEach(([key, labelText]) => {
      const isNewTab = (targets[key] || "_blank") === "_blank";
      const resetButton = this._createResetIconButton(
        `Reset ${labelText}`,
        () => {
          const currentTargets = { ...state.get("linkTargets") };
          currentTargets[key] = defaults[key];
          state.set("linkTargets", currentTargets);
          this._renderLinkDirectionEditor();
        },
      );
      resetButton.hidden = targets[key] === defaults[key];
      const row = this._el("div", { className: "key-row" });
      row.appendChild(this._el("span", { textContent: labelText }));

      const controls = this._el("div", { className: "key-controls" });
      controls.appendChild(
        this._el("span", {
          textContent: isNewTab ? "New Tab" : "Same Tab",
          style: { marginRight: "10px", fontSize: "0.9em", opacity: "0.8" },
        }),
      );

      const toggleLabel = this._el("label", {
        className: "toggle-switch mini",
      });
      const checkbox = this._el("input", { type: "checkbox" });
      checkbox.checked = isNewTab;
      toggleLabel.append(checkbox, this._el("span", { className: "slider" }));
      checkbox.addEventListener("change", () => {
        const newTargets = { ...state.get("linkTargets") };
        newTargets[key] = checkbox.checked ? "_blank" : "_self";
        state.set("linkTargets", newTargets);
        this._renderLinkDirectionEditor();
      });
      controls.appendChild(toggleLabel);
      controls.appendChild(resetButton);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }
}
// [src/modules/settingsModal.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
