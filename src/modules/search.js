import { state } from "../state.js";
import { CONFIG, SEARCH_PROVIDERS, SEARCH_SUGGESTIONS } from "../config.js";
import { makeKeyboardInteractive, showCustomModal } from "../utils.js";
import { BANG_MAP } from "./palette.js";
import {
  MAX_CUSTOM_SEARCH_ENGINES,
  MAX_CUSTOM_SEARCH_NAME_LENGTH,
  MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH,
  MAX_CUSTOM_SEARCH_QUERY_PARAMS,
  MAX_CUSTOM_SEARCH_URL_LENGTH,
  MAX_CUSTOM_TOOL_ICON_LENGTH,
  normalizeHttpUrl,
  validateImageBlob,
} from "../validators.js";
import {
  isLikelySearchProviderUrl,
  SEARCH_QUERY_PARAMETER_CANDIDATES,
} from "../keywords.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const CUSTOM_SEARCH_ICON_SIZE = 128;
const CUSTOM_SEARCH_ICON_MAX_BYTES = 5 * 1024 * 1024;
const CUSTOM_SEARCH_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export class Search {
  constructor() {
    this.els = {
      form: document.getElementById("search-form"),
      input: document.getElementById("search-input"),
      searchBtn: document.getElementById("search-button"),
      openBtn: document.getElementById("open-site-button"),
      providerBtn: document.getElementById("search-provider-button"),
      providerIcon: document.getElementById("current-provider-icon"),
      voiceBtn: document.getElementById("voice-search-btn"),
      dropdown: document.getElementById("search-dropdown"),
      engineList: document.getElementById("dropdown-engines"),
      customEngineSection: document.getElementById("dropdown-custom-section"),
      customEngineList: document.getElementById("dropdown-custom-engines"),
      customEngineAction: document.getElementById("custom-search-engine-action"),
      platformList: document.getElementById("dropdown-platforms"),
    };

    if (!this.els.form) return;

    this.current = this.getValidProvider(state.get("searchProvider"));
    this.customSearchEditMode = false;
    this.customSearchModal = null;
    this._customSearchConfirmOpen = false;
    this._historyDropdownEl = null;
    this._blurTimer = null;
    this._dropdownCloseTimer = null;
    this._quoteRestoreTimer = null;
    this._historyExpiryTimer = null;
    this._historyModalClose = null;
    this._historyPreviousFocus = null;
    this.recognition = null;
    this.isListening = false;
    this._voiceStartPending = false;
    this._voiceStartId = 0;
    this._voicePlaceholderBeforeStart = null;
    this._typewriterTimer = null;
    this._typewriterInterval = null;
    this._typewriterRunId = 0;
    this._visibilityHandler = () => this.handleVisibilityChange();
    this.currentFilteredHistory = [];
    this._quoteHiddenBySearch = false;
    this.init();
    window.YD_Search = this;
  }

  getCustomSearchEngines() {
    return (state.get("customSearchEngines") || []).map((provider) => ({
      ...provider,
      providerType: "engines",
      isCustom: true,
    }));
  }

  getProviders(type) {
    return type === "engines"
      ? [...SEARCH_PROVIDERS.engines, ...this.getCustomSearchEngines()]
      : [...(SEARCH_PROVIDERS[type] || [])];
  }

  getProvider(id, type) {
    return this.getProviders(type).find((provider) => provider.id === id) || null;
  }

  getValidProvider(value) {
    if (value?.id === "brave") {
      const replacement = { id: "perplexity", type: "engines" };
      state.set("searchProvider", replacement);
      return replacement;
    }

    const providers = this.getProviders(value?.type);
    if (
      Array.isArray(providers) &&
      providers.some((provider) => provider.id === value.id)
    ) {
      return { id: value.id, type: value.type };
    }

    const fallback = { ...CONFIG.defaults.searchProvider };
    state.set("searchProvider", fallback);
    return fallback;
  }

  init() {
    this.renderProviderDropdown();
    this.updateUI();
    this.updateButtons();
    this.els.customEngineAction?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!this.getCustomSearchEngines().length) {
        this.openCustomSearchEngineModal();
        return;
      }
      this.customSearchEditMode = !this.customSearchEditMode;
      this.renderProviderDropdown();
    });
    this.startTypewriterEffect();
    document.addEventListener("visibilitychange", this._visibilityHandler);

    state.subscribe((key) => {
      if (key === "linkTargets") this.updateButtons();
      if (key === "hideVoiceSearch") this.updateVoiceButton();
      if (key === "widgetControl") this.syncTypewriterVisibility();
      if (key === "disableAnimations") {
        if (this._isSearchOverlayOpen()) {
          this._hideQuoteForOverlay();
        } else {
          this._restoreQuotesImmediately();
        }
      }
      if (key === "searchHistory" || key === "searchAutoDeleteDays") {
        this.pruneExpiredHistory();
      }
      if (key === "customSearchEngines") {
        this.current = this.getValidProvider(this.current);
        this.renderProviderDropdown();
        this.updateUI();
        this.updateButtons();
      }
    });
    this.pruneExpiredHistory();

    this.els.input.addEventListener("input", (e) => {
      this.updateButtons();
      
      const val = e.target.value;

      // --- Reactive Bang Search Engine Switcher (!yt , !g , !sp , !ddg , etc.) ---
      if (val.endsWith(" ") && (val.startsWith("!") || val.startsWith("/"))) {
        const bangKey = val.trim().substring(1).toLowerCase();
        const target = BANG_MAP[bangKey];
        if (target) {
          this.setProvider(target.id, target.type);
          this.els.input.value = "";
          return;
        }
      }

      const lowerVal = val.toLowerCase();
      const history = state.get("searchHistory") || [];

      if (!val) {
        this.currentFilteredHistory = history.slice(0, 5);
        this.renderHistoryDropdown(this.currentFilteredHistory);
        return;
      }

      this.currentFilteredHistory = history
        .filter((item) => item.query.toLowerCase().startsWith(lowerVal))
        .slice(0, 5);

      this.renderHistoryDropdown(this.currentFilteredHistory);

      if (
        this.currentFilteredHistory.length === 1 && 
        e.inputType !== "deleteContentBackward" && 
        e.inputType !== "deleteContentForward"
      ) {
        const match = this.currentFilteredHistory[0].query;
        if (match.toLowerCase().startsWith(lowerVal)) {
          const originalLength = val.length;
          const remainder = match.substring(originalLength);
          
          this.els.input.value = val + remainder;
          this.els.input.setSelectionRange(originalLength, this.els.input.value.length);
        }
      }
    });

    this.els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = this.els.input.value.trim();
        if (!val) return;

        this.handleSubmit(new Event("submit"));
      }
    });

    this.els.input.addEventListener("focus", () => {
      const history = state.get("searchHistory") || [];
      this.currentFilteredHistory = history.slice(0, 5);
      this.renderHistoryDropdown(this.currentFilteredHistory);
    });
    this.els.input.addEventListener("blur", () => {
      this._blurTimer = setTimeout(() => this._removeHistoryDropdown(), 150);
    });

    this.els.providerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.els.form.addEventListener("submit", (e) => this.handleSubmit(e));

    // --- Voice Search Logic ---
    if (this.els.voiceBtn) {
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        this.els.voiceBtn.addEventListener("click", () =>
          this.toggleVoiceSearch(),
        );
      }
      this.updateVoiceButton();
    }

    document.addEventListener("click", (e) => {
      if (this._customSearchConfirmOpen || this.customSearchModal) return;
      if (
        !this.els.dropdown.contains(e.target) &&
        !this.els.providerBtn.contains(e.target)
      ) {
        this.closeDropdown();
      }
    });
  }

  // --- SECTION: SAVE SEARCH ---
  getHistoryMaxAge() {
    const configuredDays = Number(state.get("searchAutoDeleteDays"));
    const days =
      Number.isFinite(configuredDays) && configuredDays > 0
        ? configuredDays
        : CONFIG.defaults.searchAutoDeleteDays;
    return days * DAY_IN_MS;
  }

  isSearchVisible() {
    const control = state.get("widgetControl") || "all";
    return ["all", "search-only", "search-weather", "search-quote"].includes(control);
  }

  handleVisibilityChange() {
    this.syncTypewriterVisibility();
  }

  syncTypewriterVisibility() {
    if (document.hidden || !this.isSearchVisible()) {
      this.stopTypewriterEffect();
    } else if (!this._typewriterTimer && !this._typewriterInterval) {
      this.startTypewriterEffect();
    }
  }

  scheduleHistoryExpiry(history) {
    clearTimeout(this._historyExpiryTimer);
    this._historyExpiryTimer = null;
    if (history.length === 0) return;

    const maxAge = this.getHistoryMaxAge();
    const nextExpiry = Math.min(
      ...history.map((item) => item.timestamp + maxAge),
    );
    const delay = Math.min(
      Math.max(0, nextExpiry - Date.now()) + 25,
      MAX_TIMEOUT_MS,
    );

    this._historyExpiryTimer = window.setTimeout(() => {
      this._historyExpiryTimer = null;
      this.pruneExpiredHistory();
    }, delay);
  }

  pruneExpiredHistory() {
    const history = state.get("searchHistory") || [];
    const cutoff = Date.now() - this.getHistoryMaxAge();
    const retained = history.filter((item) => item.timestamp > cutoff);

    if (retained.length !== history.length) {
      if (!state.set("searchHistory", retained)) {
        clearTimeout(this._historyExpiryTimer);
        this._historyExpiryTimer = null;
        return history;
      }
      this.refreshOpenHistoryViews(retained);
    } else {
      this.scheduleHistoryExpiry(retained);
    }

    return retained;
  }

  refreshOpenHistoryViews(history) {
    if (this._historyDropdownEl) {
      const filter = this.els.input.value.trim().toLowerCase();
      this.currentFilteredHistory = history
        .filter((item) =>
          filter ? item.query.toLowerCase().startsWith(filter) : true,
        )
        .slice(0, 5);
      this.renderHistoryDropdown(this.currentFilteredHistory);
    }

    const modalList = document.getElementById("sh-list-container");
    if (modalList) {
      const filter =
        document.getElementById("sh-filter-input")?.value.toLowerCase() || "";
      this._renderModalList(filter, modalList);
    }
  }

  saveSearch(query, engineId) {
    if (state.get("searchHistoryPaused")) return;

    if (engineId === "brave") engineId = "perplexity";

    const now = Date.now();
    let history = this.pruneExpiredHistory();

    history.unshift({ query, engineId, timestamp: now });

    history = history.slice(0, 1000);

    state.set("searchHistory", history);
  }

  // --- SECTION: LAYER 1 — QUICK HISTORY DROPDOWN ---
  renderHistoryDropdown(items = null) {
    const history = items || state.get("searchHistory") || [];
    if (history.length === 0) {
      this._removeHistoryDropdown();
      return;
    }

    const top5 = history.slice(0, 5);
    let ul = this._historyDropdownEl;
    const isNew = !ul;

    if (isNew) {
      ul = document.createElement("ul");
      ul.id = "sh-quick-dropdown";
      document.body.appendChild(ul);
      this._historyDropdownEl = ul;
    } else {
      ul.classList.remove("closing");
      ul.innerHTML = "";
    }

    if (document.body.classList.contains("has-custom-bg") || document.body.classList.contains("gradient-mode-active")) {
      if (!document.documentElement.classList.contains("high-bg-blur")) {
        ul.style.setProperty("backdrop-filter", "blur(40px)", "important");
        ul.style.setProperty("-webkit-backdrop-filter", "blur(40px)", "important");
      } else {
        ul.style.setProperty("backdrop-filter", "blur(3px)", "important");
        ul.style.setProperty("-webkit-backdrop-filter", "blur(3px)", "important");
      }
      const isDark = document.body.getAttribute("data-theme") === "dark";
      ul.style.setProperty("background-color", "var(--widget-bg)", "important");
      ul.style.setProperty("color", isDark ? "#ffffff" : "#000000", "important");

      if (isNew) this._hideQuoteForOverlay();
    } else {
      ul.style.removeProperty("backdrop-filter");
      ul.style.removeProperty("-webkit-backdrop-filter");
      ul.style.removeProperty("background-color");
      ul.style.removeProperty("color");
      ul.style.backgroundColor = "var(--bg-secondary)";
      ul.style.color = "var(--text-primary)";
    }

    top5.forEach((item) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      li.setAttribute("aria-label", `Search again for ${item.query}`);

      const icon = document.createElement("img");
      const engineIcon = this._resolveEngineIcon(item.engineId);
      icon.src = this._getProviderIconUrl(engineIcon);
      icon.alt = item.engineId || "";
      icon.width = 16;
      icon.height = 16;
      icon.onerror = () => { icon.style.display = "none"; };

      const text = document.createElement("span");
      text.className = "sh-qd-text";
      text.textContent = item.query;

      const time = document.createElement("span");
      time.className = "sh-qd-time";
      time.textContent = this._formatTime(item.timestamp);

      li.appendChild(icon);
      li.appendChild(text);
      li.appendChild(time);

      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        clearTimeout(this._blurTimer);
        this._removeHistoryDropdown();
        this._executeViaEngine(item.query, this.current.id);
      });
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._removeHistoryDropdown();
          this._executeViaEngine(item.query, this.current.id);
        }
      });

      ul.appendChild(li);
    });

    const footerLi = document.createElement("li");
    footerLi.className = "sh-full-history-btn";
    footerLi.setAttribute("role", "button");
    footerLi.tabIndex = 0;
    footerLi.setAttribute("aria-label", "Open full search history");
    footerLi.textContent = "Full Search History";
    footerLi.addEventListener("mousedown", (e) => {
      e.preventDefault();
      clearTimeout(this._blurTimer);
      this._removeHistoryDropdown();
      this.buildHistoryModal();
    });
    footerLi.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._removeHistoryDropdown();
        this.buildHistoryModal();
      }
    });
    ul.appendChild(footerLi);

    const inputRect = this.els.input.getBoundingClientRect();
    ul.style.top   = inputRect.bottom + window.scrollY + "px";
    ul.style.left  = inputRect.left   + window.scrollX + "px";
    ul.style.width = inputRect.width  + "px";
  }

  _removeHistoryDropdown(immediate = false) {
    if (this._historyDropdownEl) {
      const el = this._historyDropdownEl;
      this._historyDropdownEl = null;

      if (immediate || state.get("disableAnimations") === true) {
        el.remove();
        this._restoreQuotes();
      } else {
        el.classList.add("closing");
        setTimeout(() => {
          el.remove();
          this._restoreQuotes();
        }, 180);
      }
    }
  }

  _restoreQuotes() {
    if (!this._quoteHiddenBySearch) return;

    const mainHidden = this.els.dropdown.classList.contains("hidden") || this.els.dropdown.classList.contains("closing");
    const historyHidden = !this._historyDropdownEl || this._historyDropdownEl.classList.contains("closing");

    if (mainHidden && historyHidden) {
      this._quoteHiddenBySearch = false;
      const quoteWidget = document.getElementById("quote-widget");
      if (quoteWidget) {
        clearTimeout(this._quoteRestoreTimer);
        this._quoteRestoreTimer = null;
        quoteWidget.style.removeProperty("visibility");
        quoteWidget.classList.remove(
          "fade-up",
          "fade-down",
          "popup-scale-entry",
          "quote-dropdown-fade-in",
        );
        if (state.get("disableAnimations") === true) {
          quoteWidget.style.opacity = "1";
        } else {
          quoteWidget.style.opacity = "0";
          void quoteWidget.offsetWidth;
          quoteWidget.classList.add("quote-dropdown-fade-in");
          this._quoteRestoreTimer = window.setTimeout(() => {
            quoteWidget.classList.remove("quote-dropdown-fade-in");
            quoteWidget.style.opacity = "1";
            this._quoteRestoreTimer = null;
          }, 280);
        }
      }
    }
  }

  _isSearchOverlayOpen() {
    const mainDropdownOpen = !this.els.dropdown.classList.contains("hidden");
    const historyDropdownOpen = Boolean(
      this._historyDropdownEl || document.getElementById("sh-quick-dropdown"),
    );
    return mainDropdownOpen || historyDropdownOpen;
  }

  _hideQuoteForOverlay() {
    const quoteWidget = document.getElementById("quote-widget");
    const hasOverlaySurface =
      document.body.classList.contains("has-custom-bg") ||
      document.body.classList.contains("gradient-mode-active");
    if (
      !quoteWidget ||
      quoteWidget.classList.contains("hidden") ||
      !hasOverlaySurface
    ) {
      return;
    }

    clearTimeout(this._quoteRestoreTimer);
    this._quoteRestoreTimer = null;
    this._quoteHiddenBySearch = true;
    quoteWidget.classList.remove(
      "fade-up",
      "fade-down",
      "popup-scale-entry",
      "quote-dropdown-fade-in",
    );
    quoteWidget.style.setProperty("visibility", "hidden", "important");
    quoteWidget.style.opacity = "0";
  }

  _restoreQuotesImmediately() {
    if (!this._quoteHiddenBySearch) return;

    this._quoteHiddenBySearch = false;
    const quoteWidget = document.getElementById("quote-widget");
    if (!quoteWidget) return;

    clearTimeout(this._quoteRestoreTimer);
    this._quoteRestoreTimer = null;
    quoteWidget.style.removeProperty("visibility");
    quoteWidget.style.opacity = "1";
    quoteWidget.classList.remove(
      "fade-up",
      "fade-down",
      "popup-scale-entry",
      "quote-dropdown-fade-in",
    );
  }

  // --- SECTION: LAYER 2 — FULL HISTORY MODAL ---
  buildHistoryModal() {
    this.closeHistoryModal(true);

    const overlay = document.createElement("div");
    overlay.id = "sh-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sh-modal-title");
    overlay.style.zIndex = "9900";

    const modal = document.createElement("div");
    modal.className = "sh-modal";
    modal.style.maxWidth = "850px";
    modal.style.width = "90%";
    modal.addEventListener("click", (e) => e.stopPropagation());

    if (document.body.classList.contains("force-white-text") && !document.body.classList.contains("has-custom-bg")) {
      modal.style.color = "#000000";
      modal.style.setProperty("--text-primary", "#000000");
      modal.style.setProperty("--text-secondary", "rgba(0,0,0,0.7)");
    }

    const header = document.createElement("div");
    header.className = "sh-modal-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "sh-title-wrap";

    const infoBtn = document.createElement("button");
    infoBtn.className = "sh-info-btn";
    infoBtn.setAttribute("aria-label", "About search history");
    infoBtn.title = "About Search History";
    infoBtn.style.background = "transparent";
    infoBtn.style.border = "none";
    infoBtn.style.padding = "0";
    infoBtn.style.display = "flex";
    infoBtn.style.alignItems = "center";
    
    const svgString = `<svg class="sh-info-btn" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; margin-right: 8px; opacity: 0.8; transition: opacity 0.2s;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    infoBtn.appendChild(svgDoc.documentElement);

    infoBtn.addEventListener("click", () => {
      import("../utils.js").then(({ showCustomModal: scm }) => {
        scm(
          "Searches are saved locally on your device up to 1,000 items. " +
          "The oldest ones are deleted first. Searches are auto-deleted " +
          "after your chosen timeframe. No data is ever sent to any server.",
        );
      });
    });

    const title = document.createElement("h3");
    title.id = "sh-modal-title";
    title.textContent = "Search History";

    titleWrap.appendChild(infoBtn);
    titleWrap.appendChild(title);

    const controls = document.createElement("div");
    controls.className = "sh-controls-row";

    const ghostLabel = document.createElement("label");
    ghostLabel.className = "sh-ghost-toggle";
    const ghostCheck = document.createElement("input");
    ghostCheck.type = "checkbox";
    ghostCheck.setAttribute("aria-label", "Pause saving search history");
    ghostCheck.checked = state.get("searchHistoryPaused") || false;
    const ghostSpan = document.createElement("span");
    ghostSpan.textContent = "Don't save searches";
    ghostLabel.appendChild(ghostCheck);
    ghostLabel.appendChild(ghostSpan);
    ghostCheck.addEventListener("change", () => {
      state.set("searchHistoryPaused", ghostCheck.checked);
    });

    const autoDeleteWrap = document.createElement("label");
    autoDeleteWrap.className = "sh-auto-delete-wrap";
    const autoDeleteLabel = document.createElement("span");
    autoDeleteLabel.textContent = "Auto Delete:";
    const autoDeleteSelect = document.createElement("select");
    autoDeleteSelect.className = "sh-auto-delete-select";
    const savedDays = state.get("searchAutoDeleteDays") || 365;
    [30, 90, 180, 365].forEach((days) => {
      const opt = document.createElement("option");
      opt.value = String(days);
      opt.textContent = days === 365 ? "1 year" : `${days} days`;
      if (days === savedDays) opt.selected = true;
      opt.style.color = "#ffffff";
      opt.style.backgroundColor = "#000000";
      autoDeleteSelect.appendChild(opt);
    });
    autoDeleteSelect.addEventListener("change", () => {
      const newDays = parseInt(autoDeleteSelect.value, 10);
      state.set("searchAutoDeleteDays", newDays);
      this._renderModalList(filterInput.value.toLowerCase(), listContainer);
    });
    autoDeleteWrap.appendChild(autoDeleteLabel);
    autoDeleteWrap.appendChild(autoDeleteSelect);

    const clearBtn = document.createElement("button");
    clearBtn.className = "sh-clear-btn";
    clearBtn.textContent = "Clear All";
    clearBtn.addEventListener("click", () => {
      showCustomModal(
        "Clear all search history? This cannot be undone.",
        false,
        false,
        [
          { text: "Cancel", value: "cancel", width: "90px" },
          { text: "Clear All", value: "ok", width: "90px",
            style: "background-color: #c0392b; color: #fff;" },
        ],
      ).then((result) => {
        if (result === "ok") {
          state.set("searchHistory", []);
          this._renderModalList("", listContainer);
        }
      });
    });

    controls.appendChild(ghostLabel);
    controls.appendChild(autoDeleteWrap);
    controls.appendChild(clearBtn);

    const closeBtn = document.createElement("button");
    closeBtn.className = "sh-close-btn";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close history");

    header.appendChild(titleWrap);
    header.appendChild(controls);
    header.appendChild(closeBtn);

    const filterRow = document.createElement("div");
    filterRow.className = "sh-filter-row";
    const filterInput = document.createElement("input");
    filterInput.type = "text";
    filterInput.id = "sh-filter-input";
    filterInput.setAttribute("aria-label", "Filter search history");
    filterInput.placeholder = "Filter history…";
    filterRow.appendChild(filterInput);

    const listContainer = document.createElement("div");
    listContainer.id = "sh-list-container";

    this._renderModalList("", listContainer);

    let filterTimer;
    filterInput.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => {
        this._renderModalList(filterInput.value.toLowerCase(), listContainer);
      }, 150);
    });

    modal.appendChild(header);
    modal.appendChild(filterRow);
    modal.appendChild(listContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    window.requestAnimationFrame(() => overlay.classList.add("is-open"));

    let isClosing = false;
    let closeTimer = null;
    const closeOverlay = (immediate = false) => {
      if (isClosing && !immediate) return;
      isClosing = true;
      clearTimeout(filterTimer);
      document.removeEventListener("keydown", escHandler);
      overlay.classList.add("closing");
      const finishClose = () => {
        closeTimer = null;
        overlay.remove();
        if (this._historyPreviousFocus?.focus) {
          window.setTimeout(() => this._historyPreviousFocus.focus(), 0);
        }
        this._historyPreviousFocus = null;
        if (this._historyModalClose === closeOverlay) {
          this._historyModalClose = null;
        }
      };
      if (immediate) {
        if (closeTimer !== null) window.clearTimeout(closeTimer);
        finishClose();
      } else {
        closeTimer = window.setTimeout(finishClose, 250);
      }
    };
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeOverlay();
        return;
      }
      if (e.key === "Tab") {
        const focusable = overlay.querySelectorAll("button, input, select, [tabindex]:not([tabindex='-1'])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    this._historyModalClose = closeOverlay;
    this._historyPreviousFocus = document.activeElement;
    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", closeOverlay);
    document.addEventListener("keydown", escHandler);
    window.setTimeout(() => filterInput.focus(), 0);
  }

  closeHistoryModal(immediate = false) {
    if (this._historyModalClose) {
      this._historyModalClose(immediate);
      return;
    }
    document.getElementById("sh-modal-overlay")?.remove();
  }

  _renderModalList(filter, container) {
    container.innerHTML = "";

    let history = state.get("searchHistory") || [];

    if (filter) {
      history = history.filter((item) =>
        item.query.toLowerCase().includes(filter),
      );
    }

    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sh-empty-msg";
      empty.textContent = filter
        ? "No results match your filter."
        : "No search history yet.";
      container.appendChild(empty);
      return;
    }

    const groups = new Map();
    history.forEach((item) => {
      const groupKey = this._getHistoryGroup(item.timestamp);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(item);
    });

    groups.forEach((items, groupKey) => {
      const groupHeader = document.createElement("div");
      groupHeader.className = "sh-group-header";
      groupHeader.textContent = groupKey;
      container.appendChild(groupHeader);

      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "sh-row";

        const icon = document.createElement("img");
        icon.src = this._getProviderIconUrl(
          this._resolveEngineIcon(item.engineId),
        );
        icon.alt = item.engineId || "";
        icon.width = 22;
        icon.height = 22;
        icon.className = "sh-row-icon";
        icon.onerror = () => { icon.style.display = "none"; };

        const queryEl = document.createElement("span");
        queryEl.className = "sh-row-query";
        queryEl.textContent = item.query;
        queryEl.title = "Search for this again";
        const repeatSearch = () => {
          this.closeHistoryModal();
          this._executeViaEngine(item.query, item.engineId);
        };
        makeKeyboardInteractive(queryEl, repeatSearch, `Search again for ${item.query}`);
        queryEl.addEventListener("click", repeatSearch);

        const timeEl = document.createElement("span");
        timeEl.className = "sh-row-time";
        timeEl.textContent = this._formatTime(item.timestamp);

        const delBtn = document.createElement("button");
        delBtn.className = "sh-delete-btn";
        delBtn.textContent = "×";
        delBtn.title = "Remove this entry";
        delBtn.setAttribute("aria-label", `Remove search ${item.query}`);
        delBtn.addEventListener("click", () => {
          const h = (state.get("searchHistory") || []).filter(
            (x) => x.timestamp !== item.timestamp,
          );
          state.set("searchHistory", h);
          this._renderModalList(filter, container);
        });

        row.appendChild(icon);
        row.appendChild(queryEl);
        row.appendChild(timeEl);
        row.appendChild(delBtn);
        container.appendChild(row);
      });
    });
  }

  _executeViaEngine(query, engineId) {
    if (engineId === "brave") engineId = "perplexity";
    let provider = null;
    for (const type of ["engines", "platforms"]) {
      provider = this.getProviders(type).find((p) => p.id === engineId);
      if (provider) break;
    }
    if (!provider) {
      provider = this.getProvider(this.current.id, this.current.type);
    }
    if (!provider) return;

    this.saveSearch(query, engineId);

    const url = this.buildProviderUrl(provider, query);
    window.location.href = url;
  }

  buildProviderUrl(provider, query) {
    if (provider.searchType === "path") {
      return `${provider.url}/${encodeURIComponent(query)}`;
    }

    try {
      const url = new URL(provider.url);
      const queryParams = Array.isArray(provider.queryParams) && provider.queryParams.length
        ? provider.queryParams
        : [provider.queryParam];
      const selectedParams = [...new Set(queryParams.filter(Boolean))];
      const preferredParam = selectedParams.includes(provider.queryParam)
        ? provider.queryParam
        : selectedParams[0];
      const preferredNormalized = preferredParam?.toLowerCase();
      const hasQAndQuery = selectedParams.some((param) => param.toLowerCase() === "q") &&
        selectedParams.some((param) => param.toLowerCase() === "query");
      selectedParams.forEach((param) => {
        const normalizedParam = param.toLowerCase();
        if (
          hasQAndQuery &&
          (normalizedParam === "q" || normalizedParam === "query") &&
          normalizedParam !== preferredNormalized
        ) {
          url.searchParams.delete(param);
          return;
        }
        url.searchParams.set(param, query);
      });
      return url.href;
    } catch {
      const queryParam = provider.queryParam || provider.queryParams?.[0] || "q";
      return `${provider.url}?${queryParam}=${encodeURIComponent(query)}`;
    }
  }

  // --- SECTION: HELPERS ---
  _getHistoryGroup(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    if (diff < THREE_HOURS) return "Recent";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const ts = new Date(timestamp);

    if (ts >= todayStart) return "Today";
    if (ts >= yesterdayStart) return "Yesterday";
    if (diff > THIRTY_DAYS) return "Older than 30 days";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[ts.getDay()]}, ${months[ts.getMonth()]} ${ts.getDate()}`;
  }

  _formatTime(timestamp) {
    const clockFormat = state.get("clockFormat") || "12";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: clockFormat === "12",
    }).format(new Date(timestamp));
  }

  _resolveEngineIcon(engineId) {
    if (!engineId) return "google.png";
    if (engineId === "brave") engineId = "perplexity";
    for (const type of ["engines", "platforms"]) {
      const found = this.getProviders(type).find((p) => p.id === engineId);
      if (found) return found.icon;
    }
    return "google.png";
  }

  _getProviderIconUrl(icon) {
    if (!icon) return `${CONFIG.paths.search}google.png`;
    return icon.includes("/") ? icon : `${CONFIG.paths.search}${icon}`;
  }

  // --- SECTION: VOICE SEARCH ---
  updateVoiceButton() {
    if (!this.els.voiceBtn) return;
    const hide = state.get("hideVoiceSearch") === true;
    const shouldHide = hide || !this.isVoiceSearchSupported();
    this.els.voiceBtn.classList.toggle("hidden", shouldHide);
    this.els.voiceBtn.style.removeProperty("display");
    if (shouldHide && (this.isListening || this._voiceStartPending)) {
      this.stopVoiceSearch();
    }
  }

  isVoiceSearchSupported() {
    return Boolean(this.getSpeechRecognitionConstructor());
  }

  getSpeechRecognitionConstructor() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    return typeof SpeechRecognition === "function" ? SpeechRecognition : null;
  }

  isVoiceButtonAvailable() {
    if (!this.els.voiceBtn || !this.isVoiceSearchSupported()) return false;
    const style = window.getComputedStyle(this.els.voiceBtn);
    return (
      state.get("hideVoiceSearch") !== true &&
      !this.els.voiceBtn.classList.contains("hidden") &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  toggleVoiceSearch() {
    if (
      !this.isListening &&
      !this._voiceStartPending &&
      !this.isVoiceButtonAvailable()
    ) {
      return;
    }
    if (this.isListening || this._voiceStartPending) {
      this.stopVoiceSearch();
    } else {
      void this.startVoiceSearch();
    }
  }

  async requestMicrophoneAccess() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error("Microphone access is unavailable.");
      error.name = "NotSupportedError";
      throw error;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
    stream.getTracks().forEach((track) => track.stop());
  }

  isExtensionContext() {
    return Boolean(
      window.chrome?.runtime?.id ||
        window.browser?.runtime?.id ||
        /^(chrome|edge|moz)-extension:$/.test(window.location.protocol),
    );
  }

  async startVoiceSearch() {
    if (this.isListening || this._voiceStartPending) return;
    const SpeechRecognition = this.getSpeechRecognitionConstructor();
    if (!SpeechRecognition || !this.isVoiceButtonAvailable()) return;

    const startId = ++this._voiceStartId;
    this._voiceStartPending = true;
    this._voicePlaceholderBeforeStart = this.els.input.placeholder;
    this.els.voiceBtn.classList.add("listening");
    this.els.input.placeholder = "Requesting microphone...";

    let recognition = null;
    try {
      // Extension new-tab pages have a browser-managed origin. In Edge,
      // getUserMedia() can reject in that override context even though
      // SpeechRecognition itself is allowed to request and use the mic.
      if (!this.isExtensionContext()) {
        await this.requestMicrophoneAccess();
      }
      if (startId !== this._voiceStartId) return;

      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (this.recognition !== recognition) return;

        let transcript = "";
        const firstResult = Number.isInteger(event.resultIndex)
          ? event.resultIndex
          : 0;
        for (let i = firstResult; i < (event.results?.length || 0); i += 1) {
          transcript += event.results[i]?.[0]?.transcript || "";
        }
        transcript = transcript.trim();
        if (!transcript) return;
        this.els.input.value = transcript;
        this.updateButtons();

        window.setTimeout(() => {
          this.handleSubmit(new Event("submit"));
        }, 800);
      };

      recognition.onspeechend = () => {
        if (this.recognition !== recognition) return;
        this.els.input.placeholder = "Processing speech...";
        // Keep the recognition object alive until its final result and end
        // events arrive. Clearing it here used to discard valid transcripts.
        try {
          recognition.stop();
        } catch {
          // Some implementations have already stopped by this event.
        }
      };

      recognition.onerror = (event) => {
        if (this.recognition !== recognition) return;
        this.finishVoiceSearch(recognition);
        this.els.input.placeholder = "Error. Try again.";
        void this.showVoiceError(event).catch((modalError) =>
          console.error("Could not show the Voice Search error dialog.", modalError),
        );
      };

      recognition.onend = () => {
        this.finishVoiceSearch(recognition);
      };

      this.recognition = recognition;
      this._voiceStartPending = false;
      this.isListening = true;
      this.els.input.placeholder = "Listening...";
      recognition.start();
    } catch (error) {
      if (startId !== this._voiceStartId) return;
      this._voiceStartPending = false;
      this.finishVoiceSearch(recognition);
      this.els.input.placeholder = "Voice search unavailable. Try again.";
      void this.showVoiceError(error).catch((modalError) =>
        console.error("Could not show the Voice Search error dialog.", modalError),
      );
    }
  }

  stopVoiceSearch() {
    this._voiceStartId += 1;
    this._voiceStartPending = false;
    const recognition = this.recognition;
    this.finishVoiceSearch(recognition);
    if (!recognition) return;
    try {
      recognition.stop();
    } catch (error) {
      console.warn("Voice Search could not stop cleanly.", error);
    }
  }

  finishVoiceSearch(recognition) {
    if (recognition && this.recognition !== recognition) return;
    this.recognition = null;
    this._voiceStartPending = false;
    this.isListening = false;
    this.els.voiceBtn.classList.remove("listening");
    if (
      [
        "Listening...",
        "Requesting microphone...",
        "Processing speech...",
      ].includes(
        this.els.input.placeholder,
      )
    ) {
      this.els.input.placeholder = this._voicePlaceholderBeforeStart || "";
    }
    this._voicePlaceholderBeforeStart = null;
    this.syncTypewriterVisibility();
  }

  async showVoiceError(error) {
    const code = error?.error || error?.name || "unknown";
    if (code === "aborted") return;
    if (code === "no-speech") {
      this.els.input.placeholder = "No speech detected. Try again.";
      return;
    }

    let message;
    if (
      [
        "not-allowed",
        "service-not-allowed",
        "NotAllowedError",
        "SecurityError",
      ].includes(code)
    ) {
      message =
        "Microphone access is blocked for this Edge extension. Allow microphone access in Edge and Windows privacy settings, then choose Try again.";
    } else if (["audio-capture", "NotFoundError"].includes(code)) {
      message =
        "No available microphone was found. Connect or enable a microphone, then choose Try again.";
    } else if (["NotReadableError", "AbortError"].includes(code)) {
      message =
        "Edge could not use the microphone. Another app may be using it, or Windows privacy settings may be blocking it.";
    } else if (code === "network") {
      message =
        "Edge accessed the microphone, but its online speech-recognition service could not be reached. Check your connection and online speech-recognition settings, then try again.";
    } else if (code === "NotSupportedError") {
      message = "This Edge version cannot request microphone access here.";
    } else {
      message = "Voice Search could not start. Check microphone access and try again.";
    }

    const result = await showCustomModal(message, false, false, [
      {
        text: "Hide",
        value: "hide",
        width: "120px",
        style:
          "background-color: var(--bg-interactive); color: var(--text-primary);",
      },
      { text: "Try again", value: "retry", width: "120px" },
    ]);

    if (result === "hide") {
      state.set("hideVoiceSearch", true);
    } else if (result === "retry" && this.isVoiceButtonAvailable()) {
      void this.startVoiceSearch();
    }
  }

  // --- SECTION: UI & ANIMATION ---
  startTypewriterEffect() {
    this.stopTypewriterEffect();
    if (document.hidden || !this.isSearchVisible()) return;

    const typeSpeed = 50;
    const deleteSpeed = 25;
    const readDelay = 9500;
    const runId = ++this._typewriterRunId;

    const loop = (delay = 0) => {
      this._typewriterTimer = window.setTimeout(() => {
        this._typewriterTimer = null;
        if (
          runId !== this._typewriterRunId ||
          document.hidden ||
          !this.isSearchVisible()
        ) return;
        if (this.isListening || this._voiceStartPending) {
          loop(1000);
          return;
        }

        const text =
          SEARCH_SUGGESTIONS[
            Math.floor(Math.random() * SEARCH_SUGGESTIONS.length)
          ];
        let i = 0;
        this._typewriterInterval = window.setInterval(() => {
          if (
            runId !== this._typewriterRunId ||
            document.hidden ||
            !this.isSearchVisible() ||
            this.isListening ||
            this._voiceStartPending
          ) {
            this.stopTypewriterEffect();
            return;
          }

          this.els.input.placeholder = text.substring(0, i) + "|";
          i++;

          if (i > text.length) {
            clearInterval(this._typewriterInterval);
            this._typewriterInterval = null;
            this.els.input.placeholder = text;
            this._typewriterTimer = window.setTimeout(() => {
              this._typewriterTimer = null;
              let j = text.length;
              this._typewriterInterval = window.setInterval(() => {
                if (
                  runId !== this._typewriterRunId ||
                  document.hidden ||
                  !this.isSearchVisible() ||
                  this.isListening ||
                  this._voiceStartPending
                ) {
                  this.stopTypewriterEffect();
                  return;
                }

                this.els.input.placeholder = text.substring(0, j) + "|";
                j--;
                if (j < 0) {
                  clearInterval(this._typewriterInterval);
                  this._typewriterInterval = null;
                  this.els.input.placeholder = "";
                  loop(200);
                }
              }, deleteSpeed);
            }, readDelay);
          }
        }, typeSpeed);
      }, delay);
    };

    loop();
  }

  stopTypewriterEffect() {
    this._typewriterRunId++;
    clearTimeout(this._typewriterTimer);
    clearInterval(this._typewriterInterval);
    this._typewriterTimer = null;
    this._typewriterInterval = null;
    if (this.els.input && !this.els.input.value) {
      this.els.input.placeholder = "";
    }
  }

  renderProviderDropdown() {
    const createItem = (p, type) => {
      const div = document.createElement("div");
      div.className = `dropdown-item ${p.id === this.current.id ? "active" : ""}`;
      const selectProvider = () => {
        this.setProvider(p.id, type);
        if (p.id === "perplexity") this.recordPerplexityUse();
        this.closeDropdown();
      };
      makeKeyboardInteractive(div, selectProvider, `Use ${p.name}`);
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", String(p.id === this.current.id));

      const img = document.createElement("img");
      img.src = this._getProviderIconUrl(p.icon);
      img.alt = p.name;

      const span = document.createElement("span");
      span.className = "custom-search-provider-name";
      span.textContent = p.name;

      div.appendChild(img);
      div.appendChild(span);

      if (p.isCustom) {
        div.classList.add("custom-search-provider-item");
        const actionGroup = document.createElement("span");
        actionGroup.className = "custom-search-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "custom-search-edit";
        editButton.classList.toggle("hidden", !this.customSearchEditMode);
        editButton.setAttribute("aria-label", `Edit ${p.name}`);
        editButton.title = `Edit ${p.name}`;
        editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h4L19.5 8.5a2.121 2.121 0 0 0-3-3L4 17v3Z"/><path d="m14.5 5.5 4 4"/></svg>';
        editButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openCustomSearchEngineModal(p);
        });
        editButton.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "custom-search-delete";
        deleteButton.classList.toggle("hidden", !this.customSearchEditMode);
        deleteButton.setAttribute("aria-label", `Delete ${p.name}`);
        deleteButton.title = `Delete ${p.name}`;
        deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._customSearchConfirmOpen = true;
          try {
            const confirmed = await showCustomModal(
              `Delete the custom search engine "${p.name}"?`,
              true,
              true,
            );
            if (confirmed) this.deleteCustomSearchEngine(p.id);
          } finally {
            this._customSearchConfirmOpen = false;
          }
        });
        deleteButton.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        });
        actionGroup.append(editButton, deleteButton);
        div.appendChild(actionGroup);
      }

      if (
        p.id === "perplexity" &&
        (Number(state.get("perplexityUseCount")) || 0) < 1
      ) {
        const badge = document.createElement("span");
        badge.className = "search-new-badge";
        badge.textContent = "NEW";
        badge.setAttribute("aria-label", "New");
        div.appendChild(badge);
      }

      div.addEventListener("click", selectProvider);
      return div;
    };

    this.els.engineList.innerHTML = "";
    SEARCH_PROVIDERS.engines.forEach((p) =>
      this.els.engineList.appendChild(createItem(p, "engines")),
    );

    const customEngines = this.getCustomSearchEngines();
    this.els.customEngineList.innerHTML = "";
    this.els.customEngineSection.classList.toggle("hidden", !customEngines.length);
    customEngines.forEach((provider) =>
      this.els.customEngineList.appendChild(createItem(provider, "engines")),
    );
    if (customEngines.length && this.customSearchEditMode) {
      const addItem = document.createElement("button");
      addItem.type = "button";
      addItem.className = "dropdown-add-custom-item";
      addItem.textContent = "ADD";
      addItem.setAttribute("aria-label", "Add another custom search engine");
      addItem.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openCustomSearchEngineModal();
      });
      this.els.customEngineList.appendChild(addItem);
    }
    if (this.els.customEngineAction) {
      this.els.customEngineAction.textContent = customEngines.length
        ? this.customSearchEditMode
          ? "SAVE"
          : "EDIT"
        : "ADD";
      this.els.customEngineAction.setAttribute(
        "aria-label",
        customEngines.length
          ? this.customSearchEditMode
            ? "Save custom search engine changes"
            : "Edit custom search engines"
          : "Add a custom search engine",
      );
      this.els.customEngineAction.setAttribute(
        "aria-pressed",
        String(Boolean(customEngines.length && this.customSearchEditMode)),
      );
    }

    this.els.platformList.innerHTML = "";
    SEARCH_PROVIDERS.platforms.forEach((p) =>
      this.els.platformList.appendChild(createItem(p, "platforms")),
    );
  }

  createCustomSearchEngineId() {
    const existing = new Set(this.getCustomSearchEngines().map((provider) => provider.id));
    let id;
    do {
      const randomPart = globalThis.crypto?.randomUUID?.() ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      id = `custom-search-${randomPart}`;
    } while (existing.has(id));
    return id;
  }

  async createScaledSearchIconData(file) {
    const fileType = file?.type?.toLowerCase();
    if (!file || !CUSTOM_SEARCH_IMAGE_TYPES.has(fileType)) {
      throw new TypeError("Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG icon.");
    }
    if (file.size <= 0 || file.size > CUSTOM_SEARCH_ICON_MAX_BYTES) {
      throw new TypeError("The icon must be smaller than 5 MB.");
    }
    if (fileType !== "image/svg+xml") {
      await validateImageBlob(file, {
        maxBytes: CUSTOM_SEARCH_ICON_MAX_BYTES,
        maxWidth: 8192,
        maxHeight: 8192,
        maxPixels: 40_000_000,
      });
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new TypeError("The icon could not be decoded."));
        element.src = objectUrl;
      });
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height || width * height > 40_000_000) {
        throw new TypeError("The icon dimensions are too large.");
      }

      const scale = Math.min(1, CUSTOM_SEARCH_ICON_SIZE / width, CUSTOM_SEARCH_ICON_SIZE / height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The icon could not be processed.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > MAX_CUSTOM_TOOL_ICON_LENGTH) {
        throw new TypeError("The processed icon is too large.");
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  getSearchQueryParamCandidates(rawUrl) {
    let normalizedUrl;
    try {
      normalizedUrl = normalizeHttpUrl(rawUrl, MAX_CUSTOM_SEARCH_URL_LENGTH);
    } catch {
      return SEARCH_QUERY_PARAMETER_CANDIDATES.slice(0, MAX_CUSTOM_SEARCH_QUERY_PARAMS);
    }

    let existing = [];
    try {
      existing = [...new URL(normalizedUrl).searchParams.keys()];
    } catch {
      // The URL was already normalized; use the common candidates below.
    }
    return [...new Set([
      ...existing,
      ...SEARCH_QUERY_PARAMETER_CANDIDATES,
    ])]
      .filter((param) => /^[a-z][a-z\d._-]*$/i.test(param))
      .filter((param) => param.length <= MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH)
      .slice(0, MAX_CUSTOM_SEARCH_QUERY_PARAMS);
  }

  deleteCustomSearchEngine(id) {
    const current = state.get("customSearchEngines") || [];
    const next = current.filter((provider) => provider.id !== id);
    if (next.length === current.length || !state.set("customSearchEngines", next)) return false;

    if (this.current.id === id) {
      this.current = this.getValidProvider(CONFIG.defaults.searchProvider);
      state.set("searchProvider", this.current);
      this.updateUI();
      this.updateButtons();
    }
    const wasLastCustomEngine = next.length === 0;
    if (wasLastCustomEngine) this.customSearchEditMode = false;
    this.renderProviderDropdown();
    if (wasLastCustomEngine) this.closeDropdown();
    return true;
  }

  openCustomSearchEngineModal(editProvider = null) {
    if (this.customSearchModal) return;

    const isEditing = Boolean(editProvider?.id);
    const wasEditing = this.customSearchEditMode;

    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "ydd-add-tool-overlay";
    overlay.setAttribute("role", "presentation");

    const modal = document.createElement("section");
    modal.className = "ydd-add-tool-modal ydd-add-search-engine-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ydd-add-search-engine-title");

    const title = document.createElement("h2");
    title.id = "ydd-add-search-engine-title";
    title.textContent = isEditing ? "Edit Search Engine" : "Add a new Search Engine";

    const subtitle = document.createElement("p");
    subtitle.className = "ydd-add-tool-subtitle";
    subtitle.textContent = isEditing
      ? "Update this custom search engine or searchable platform."
      : "Add a custom search engine or searchable platform.";

    const note = document.createElement("p");
    note.className = "ydd-search-engine-note";
    note.textContent = "NOTE: Be careful when adding a search engine. This is not like adding a shortcut, AI tool, or Google app. The URL and query parameter must be correct for searches to work.";

    const form = document.createElement("form");
    form.noValidate = true;

    const iconLabel = document.createElement("label");
    iconLabel.className = "ydd-tool-icon-picker";
    iconLabel.tabIndex = 0;
    iconLabel.setAttribute("aria-label", "Choose an icon image");
    const iconPreview = document.createElement("span");
    iconPreview.className = "ydd-tool-icon-preview";
    iconPreview.textContent = "+";
    const iconHint = document.createElement("span");
    iconHint.className = "ydd-tool-icon-hint";
    iconHint.textContent = "Choose icon";
    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml";
    iconInput.className = "visually-hidden";
    iconInput.setAttribute("aria-label", "Choose an icon image");
    iconLabel.append(iconPreview, iconHint, iconInput);

    const createField = (labelText, inputType, placeholder, limit) => {
      const wrapper = document.createElement("label");
      wrapper.className = "ydd-add-tool-field";
      const labelRow = document.createElement("span");
      labelRow.className = "ydd-add-tool-label-row";
      const label = document.createElement("span");
      label.textContent = labelText;
      const count = document.createElement("span");
      count.className = "ydd-add-tool-count";
      count.textContent = `0/${limit}`;
      labelRow.append(label, count);
      const input = document.createElement("input");
      input.type = inputType;
      input.placeholder = placeholder;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.maxLength = limit;
      input.dataset.limit = String(limit);
      input.setAttribute("aria-label", labelText);
      const error = document.createElement("span");
      error.className = "ydd-add-tool-error";
      error.setAttribute("aria-live", "polite");
      wrapper.append(labelRow, input, error);
      return { wrapper, input, count, error };
    };

    const nameField = createField(
      "Name",
      "text",
      "e.g. Ecosia",
      MAX_CUSTOM_SEARCH_NAME_LENGTH,
    );
    const urlField = createField(
      "Search URL",
      "url",
      "https://example.com/search",
      MAX_CUSTOM_SEARCH_URL_LENGTH,
    );
    nameField.input.value = editProvider?.name || "";
    urlField.input.value = editProvider?.url || "";

    const queryFieldset = document.createElement("fieldset");
    queryFieldset.className = "ydd-search-query-fieldset";
    const queryLegend = document.createElement("legend");
    queryLegend.textContent = "Query parameter(s)";
    const queryHint = document.createElement("p");
    queryHint.className = "ydd-search-query-hint";
    queryHint.textContent = "Select one or more parameters. All selected parameters receive your search text; q and query are handled as one compatible pair.";
    const queryOptions = document.createElement("div");
    queryOptions.className = "ydd-search-query-options";
    const customParamRow = document.createElement("div");
    customParamRow.className = "ydd-search-custom-param-row";
    const customParamInput = document.createElement("input");
    customParamInput.type = "text";
    customParamInput.className = "ydd-search-query-custom-input";
    customParamInput.placeholder = "Custom parameter";
    customParamInput.maxLength = MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH;
    customParamInput.autocomplete = "off";
    customParamInput.spellcheck = false;
    customParamInput.setAttribute("aria-label", "Custom query parameter");
    const customParamAddButton = document.createElement("button");
    customParamAddButton.type = "button";
    customParamAddButton.className = "settings-button ydd-search-query-add-button";
    customParamAddButton.textContent = "Add";
    customParamRow.append(customParamInput, customParamAddButton);
    const customParamError = document.createElement("span");
    customParamError.className = "ydd-add-tool-error ydd-search-custom-param-error";
    customParamError.setAttribute("aria-live", "polite");
    const queryError = document.createElement("span");
    queryError.className = "ydd-add-tool-error";
    queryError.setAttribute("aria-live", "polite");
    queryFieldset.append(
      queryLegend,
      queryHint,
      queryOptions,
      customParamRow,
      customParamError,
      queryError,
    );

    const formError = document.createElement("p");
    formError.className = "ydd-add-tool-form-error";
    formError.setAttribute("aria-live", "polite");
    const actions = document.createElement("div");
    actions.className = "ydd-add-tool-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "settings-button ydd-add-tool-cancel";
    cancelButton.textContent = "Cancel";
    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.className = "settings-button";
    addButton.textContent = isEditing ? "Save" : "Add";
    actions.append(cancelButton, addButton);

    form.append(iconLabel, nameField.wrapper, urlField.wrapper, queryFieldset, formError, actions);
    modal.append(title, subtitle, note, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let iconData = editProvider?.icon || null;
    let closing = false;
    let isSubmitting = false;
    const setFieldError = (field, message = "") => {
      field.input.classList.toggle("is-invalid", Boolean(message));
      field.input.setAttribute("aria-invalid", String(Boolean(message)));
      field.error.textContent = message;
    };
    const updateCount = (field) => {
      const length = field.input.value.length;
      field.count.textContent = `${length}/${field.input.dataset.limit}`;
      field.count.classList.toggle("is-over-limit", length > Number(field.input.dataset.limit));
    };
    const initialQueryParams = new Set(
      editProvider?.queryParams?.length
        ? editProvider.queryParams
        : [editProvider?.queryParam].filter(Boolean),
    );
    const customQueryParams = new Set(
      [...initialQueryParams].filter(
        (param) => !SEARCH_QUERY_PARAMETER_CANDIDATES.includes(param),
      ),
    );
    const renderQueryOptions = (preferUrlParams = false) => {
      const previous = new Set(
        [...queryOptions.querySelectorAll("input:checked")].map((input) => input.value),
      );
      const candidates = [...new Set([
        ...customQueryParams,
        ...this.getSearchQueryParamCandidates(urlField.input.value),
      ])]
        .filter((param) => /^[a-z][a-z\d._-]*$/i.test(param))
        .filter((param) => param.length <= MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH)
        .slice(0, MAX_CUSTOM_SEARCH_QUERY_PARAMS);
      let urlParams = [];
      try {
        urlParams = [...new URL(
          normalizeHttpUrl(urlField.input.value, MAX_CUSTOM_SEARCH_URL_LENGTH),
        ).searchParams.keys()];
      } catch {
        // Use the common candidates when the URL is still being typed.
      }
      const selected = preferUrlParams && urlParams.length
        ? new Set([...urlParams, ...customQueryParams])
        : previous.size
          ? previous
          : initialQueryParams;
      queryOptions.replaceChildren();
      candidates.forEach((param, index) => {
        const label = document.createElement("label");
        label.className = "ydd-search-query-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = param;
        checkbox.checked = selected.size ? selected.has(param) : index === 0;
        const text = document.createElement("span");
        text.textContent = param;
        label.append(checkbox, text);
        queryOptions.appendChild(label);
      });
    };
    const addCustomQueryParameter = () => {
      const parameter = customParamInput.value.trim();
      if (
        !parameter ||
        parameter.length > MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH ||
        !/^[a-z][a-z\d._-]*$/i.test(parameter)
      ) {
        customParamError.textContent = "Use a parameter name beginning with a letter; letters, numbers, ., _, and - are allowed.";
        customParamInput.classList.add("is-invalid");
        return;
      }
      if (!customQueryParams.has(parameter) && customQueryParams.size >= MAX_CUSTOM_SEARCH_QUERY_PARAMS) {
        customParamError.textContent = `You can add up to ${MAX_CUSTOM_SEARCH_QUERY_PARAMS} query parameters.`;
        customParamInput.classList.add("is-invalid");
        return;
      }
      customQueryParams.add(parameter);
      customParamInput.value = "";
      customParamInput.classList.remove("is-invalid");
      customParamError.textContent = "";
      renderQueryOptions();
      const checkbox = [...queryOptions.querySelectorAll("input")]
        .find((input) => input.value === parameter);
      if (checkbox) checkbox.checked = true;
    };
    const getSelectedQueryParams = () =>
      [...queryOptions.querySelectorAll("input:checked")].map((input) => input.value);
    const validateFields = () => {
      let valid = true;
      updateCount(nameField);
      updateCount(urlField);
      const name = nameField.input.value.trim();
      const rawUrl = urlField.input.value.trim();
      const selectedParams = getSelectedQueryParams();

      if (!name) {
        setFieldError(nameField, "Enter a name.");
        valid = false;
      } else if (nameField.input.value.length > MAX_CUSTOM_SEARCH_NAME_LENGTH) {
        setFieldError(nameField, `Name must be ${MAX_CUSTOM_SEARCH_NAME_LENGTH} characters or fewer.`);
        valid = false;
      } else {
        setFieldError(nameField);
      }
      if (!rawUrl) {
        setFieldError(urlField, "Enter a search URL.");
        valid = false;
      } else {
        try {
          normalizeHttpUrl(rawUrl, MAX_CUSTOM_SEARCH_URL_LENGTH);
          setFieldError(urlField);
        } catch (error) {
          setFieldError(urlField, error.message);
          valid = false;
        }
      }
      queryError.textContent = selectedParams.length
        ? ""
        : "Select at least one query parameter.";
      if (!selectedParams.length) valid = false;
      if (!iconData) {
        iconLabel.classList.add("is-invalid");
        formError.textContent = "Choose an icon image.";
        valid = false;
      } else {
        iconLabel.classList.remove("is-invalid");
        if (formError.textContent === "Choose an icon image.") formError.textContent = "";
      }
      return valid;
    };
    const closeModal = (immediate = false) => {
      if (closing) return;
      closing = true;
      document.removeEventListener("keydown", keyHandler, true);
      overlay.classList.remove("is-open");
      const remove = () => {
        if (overlay.isConnected) overlay.remove();
        if (this.customSearchModal?.overlay === overlay) this.customSearchModal = null;
        if (previousFocus?.isConnected) window.setTimeout(() => previousFocus.focus(), 0);
      };
      if (immediate) remove();
      else window.setTimeout(remove, 220);
    };
    const keyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = modal.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])");
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
    };

    this.customSearchModal = {
      overlay,
      close: (immediate = false) => closeModal(immediate),
    };
    if (iconData) {
      const preview = document.createElement("img");
      preview.src = iconData;
      preview.alt = "Current icon preview";
      iconPreview.replaceChildren(preview);
      iconHint.textContent = "Change icon";
    }
    renderQueryOptions();
    updateCount(nameField);
    updateCount(urlField);
    customParamAddButton.addEventListener("click", addCustomQueryParameter);
    customParamInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addCustomQueryParameter();
    });
    customParamInput.addEventListener("input", () => {
      customParamInput.classList.remove("is-invalid");
      customParamError.textContent = "";
    });
    nameField.input.addEventListener("input", () => {
      updateCount(nameField);
      setFieldError(
        nameField,
        nameField.input.value.length > MAX_CUSTOM_SEARCH_NAME_LENGTH
          ? `Name must be ${MAX_CUSTOM_SEARCH_NAME_LENGTH} characters or fewer.`
          : "",
      );
    });
    urlField.input.addEventListener("input", () => {
      updateCount(urlField);
      setFieldError(
        urlField,
        urlField.input.value.length > MAX_CUSTOM_SEARCH_URL_LENGTH
          ? `Search URL must be ${MAX_CUSTOM_SEARCH_URL_LENGTH} characters or fewer.`
          : "",
      );
      renderQueryOptions(true);
    });
    iconInput.addEventListener("change", async () => {
      const file = iconInput.files?.[0];
      if (!file) return;
      iconInput.value = "";
      iconInput.disabled = true;
      try {
        iconData = await this.createScaledSearchIconData(file);
        const preview = document.createElement("img");
        preview.src = iconData;
        preview.alt = "Selected icon preview";
        iconPreview.replaceChildren(preview);
        iconHint.textContent = "Change icon";
        iconLabel.classList.remove("is-invalid");
        if (formError.textContent === "Choose an icon image.") formError.textContent = "";
      } catch (error) {
        iconData = null;
        iconPreview.textContent = "+";
        iconLabel.classList.add("is-invalid");
        formError.textContent = error.message || "The icon could not be processed.";
      } finally {
        iconInput.disabled = false;
      }
    });
    iconLabel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        iconInput.click();
      }
    });
    cancelButton.addEventListener("click", () => closeModal());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting || !validateFields()) return;
      isSubmitting = true;
      addButton.disabled = true;
      try {
        const current = state.get("customSearchEngines") || [];
        if (!isEditing && current.length >= MAX_CUSTOM_SEARCH_ENGINES) {
          formError.textContent = `You can add up to ${MAX_CUSTOM_SEARCH_ENGINES} custom search engines.`;
          return;
        }
        const cleanUrl = normalizeHttpUrl(urlField.input.value, MAX_CUSTOM_SEARCH_URL_LENGTH);
        const queryParams = getSelectedQueryParams();
        if (!isLikelySearchProviderUrl(cleanUrl)) {
          const previousOverlayZIndex = overlay.style.zIndex;
          overlay.style.zIndex = "11900";
          let confirmation;
          try {
            confirmation = await showCustomModal(
              "No known search-engine or searchable-platform keyword was found in this URL. This does not prove the URL is invalid, but verify its format and query parameter carefully before adding it.",
              false,
              false,
              [
                { text: "Add anyway", value: "add-anyway", width: "120px" },
                {
                  text: "Cancel",
                  value: "cancel",
                  width: "120px",
                  style: "background: var(--bg-interactive); color: var(--text-primary);",
                },
              ],
            );
          } finally {
            overlay.style.zIndex = previousOverlayZIndex;
          }
          if (confirmation !== "add-anyway") return;
        }

        const provider = {
          id: isEditing ? editProvider.id : this.createCustomSearchEngineId(),
          name: nameField.input.value.trim(),
          url: cleanUrl,
          icon: iconData,
          queryParams,
          queryParam: queryParams[0],
        };
        const next = isEditing
          ? current.map((item) => (item.id === editProvider.id ? provider : item))
          : [...current, provider];
        if (!state.set("customSearchEngines", next)) {
          formError.textContent = "The search engine could not be saved. Check browser storage.";
          return;
        }
        if (!isEditing) {
          this.current = { id: provider.id, type: "engines" };
          state.set("searchProvider", this.current);
        }
        this.customSearchEditMode = isEditing || wasEditing;
        this.updateUI();
        this.updateButtons();
        this.renderProviderDropdown();
        closeModal();
      } catch (error) {
        formError.textContent = error.message || "The search engine could not be saved.";
      } finally {
        isSubmitting = false;
        addButton.disabled = false;
      }
    });

    document.addEventListener("keydown", keyHandler, true);
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      iconLabel.focus();
    });
  }

  recordPerplexityUse() {
    if ((Number(state.get("perplexityUseCount")) || 0) >= 1) return;
    if (!state.set("perplexityUseCount", 1)) return;
    this.renderProviderDropdown();
  }

  setProvider(id, type) {
    this.current = { id, type };
    state.set("searchProvider", this.current);
    this.updateUI();
    this.updateButtons();
    this.renderProviderDropdown();
  }

  updateUI() {
    const provider = this.getProvider(this.current.id, this.current.type);
    if (provider) {
      this.els.providerIcon.src = this._getProviderIconUrl(provider.icon);
      this.els.providerIcon.alt = provider.name;
    }
  }

  updateButtons() {
    const hasText = this.els.input.value.trim().length > 0;
    const provider = this.getProvider(this.current.id, this.current.type);

    if (hasText) {
      this.els.searchBtn.classList.remove("hidden");
      this.els.openBtn.classList.add("hidden");
    } else {
      this.els.searchBtn.classList.add("hidden");
      this.els.openBtn.classList.remove("hidden");

      if (provider) {
        this.els.openBtn.textContent = "Open";
        this.els.openBtn.title = `Open ${provider.name}`;
        this.els.openBtn.onclick = () => {
          const urlObj = new URL(provider.url);
          const targets =
            state.get("linkTargets") || CONFIG.defaults.linkTargets;
          window.open(urlObj.origin, targets.searchOpen || "_blank");
        };
      }
    }
  }

  toggleDropdown() {
    const isHiddenOrClosing =
      this.els.dropdown.classList.contains("hidden") ||
      this.els.dropdown.classList.contains("closing");
    if (isHiddenOrClosing) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  openDropdown() {
    clearTimeout(this._dropdownCloseTimer);
    this._dropdownCloseTimer = null;
    this.renderProviderDropdown();
    this.els.dropdown.classList.remove("closing");
    this.els.dropdown.classList.remove("hidden");
    this.els.dropdown.setAttribute("aria-hidden", "false");
    this.els.providerBtn.classList.add("is-open");
    this.els.providerBtn.setAttribute("aria-expanded", "true");

    const body = document.body;
    if (body.classList.contains("has-custom-bg") || body.classList.contains("gradient-mode-active")) {
      if (!document.documentElement.classList.contains("high-bg-blur")) {
        this.els.dropdown.style.setProperty("backdrop-filter", "blur(40px)", "important");
        this.els.dropdown.style.setProperty("-webkit-backdrop-filter", "blur(40px)", "important");
      } else {
        this.els.dropdown.style.setProperty("backdrop-filter", "blur(3px)", "important");
        this.els.dropdown.style.setProperty("-webkit-backdrop-filter", "blur(3px)", "important");
      }
      const isDark = body.getAttribute("data-theme") === "dark";
      this.els.dropdown.style.setProperty("background-color", "var(--widget-bg)", "important");
      this.els.dropdown.style.setProperty("color", isDark ? "#ffffff" : "#000000", "important");
      
      this._hideQuoteForOverlay();
    } else {
      this.els.dropdown.style.removeProperty("backdrop-filter");
      this.els.dropdown.style.removeProperty("-webkit-backdrop-filter");
      this.els.dropdown.style.removeProperty("background-color");
      this.els.dropdown.style.removeProperty("color");
    }

    import("../utils.js").then((utils) => {
      utils.completeDefaultTask("dt-4");
    });
  }

  closeDropdown() {
    const wasEditing = this.customSearchEditMode;
    this.customSearchEditMode = false;
    if (wasEditing) this.renderProviderDropdown();
    if (
      this.els.dropdown.classList.contains("hidden") ||
      this.els.dropdown.classList.contains("closing")
    ) {
      return;
    }
    
    this.els.providerBtn.classList.remove("is-open");

    if (state.get("disableAnimations") === true) {
      this.els.dropdown.classList.add("hidden");
      this.els.dropdown.setAttribute("aria-hidden", "true");
      this.els.providerBtn.setAttribute("aria-expanded", "false");
      this.els.dropdown.classList.remove("closing");
      this.els.dropdown.style.removeProperty("backdrop-filter");
      this.els.dropdown.style.removeProperty("-webkit-backdrop-filter");
      this.els.dropdown.style.removeProperty("background-color");
      this.els.dropdown.style.removeProperty("color");
      this._restoreQuotes();
      return;
    }

    this.els.dropdown.classList.add("closing");

    this._dropdownCloseTimer = window.setTimeout(() => {
      this._dropdownCloseTimer = null;
      this.els.dropdown.classList.add("hidden");
      this.els.dropdown.setAttribute("aria-hidden", "true");
      this.els.dropdown.classList.remove("closing");
      this.els.providerBtn.setAttribute("aria-expanded", "false");

      this.els.dropdown.style.removeProperty("backdrop-filter");
      this.els.dropdown.style.removeProperty("-webkit-backdrop-filter");
      this.els.dropdown.style.removeProperty("background-color");
      this.els.dropdown.style.removeProperty("color");
      
      this._restoreQuotes();
    }, 180);
  }

  handleSubmit(e) {
    if (e.preventDefault) e.preventDefault();
    const query = this.els.input.value.trim();
    if (!query) return;

    const provider = this.getProvider(this.current.id, this.current.type);
    if (!provider) return;

    this.saveSearch(query, this.current.id);

    const url = this.buildProviderUrl(provider, query);

    window.location.href = url;
  }
}
// [src/modules/search.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
