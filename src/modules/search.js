import { state } from "../state.js";
import { CONFIG, SEARCH_PROVIDERS, SEARCH_SUGGESTIONS } from "../config.js";
import { makeKeyboardInteractive, showCustomModal } from "../utils.js";
import { BANG_MAP } from "./palette.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

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
      platformList: document.getElementById("dropdown-platforms"),
    };

    if (!this.els.form) return;

    this.current = this.getValidProvider(state.get("searchProvider"));
    this._historyDropdownEl = null;
    this._blurTimer = null;
    this._dropdownCloseTimer = null;
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
    this.init();
    window.YD_Search = this;
  }

  getValidProvider(value) {
    if (value?.id === "brave") {
      const replacement = { id: "perplexity", type: "engines" };
      state.set("searchProvider", replacement);
      return replacement;
    }

    const providers = SEARCH_PROVIDERS[value?.type];
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
    this.startTypewriterEffect();
    document.addEventListener("visibilitychange", this._visibilityHandler);

    state.subscribe((key) => {
      if (key === "linkTargets") this.updateButtons();
      if (key === "hideVoiceSearch") this.updateVoiceButton();
      if (key === "widgetControl") this.syncTypewriterVisibility();
      if (key === "searchHistory" || key === "searchAutoDeleteDays") {
        this.pruneExpiredHistory();
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

      if (isNew) {
        const quoteWidget = document.getElementById("quote-widget");
        if (quoteWidget) {
          quoteWidget.style.setProperty("visibility", "hidden", "important");
          quoteWidget.style.opacity = "0";
        }
      }
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

      if (immediate) {
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
    const mainHidden = this.els.dropdown.classList.contains("hidden") || this.els.dropdown.classList.contains("closing");
    const historyHidden = !this._historyDropdownEl || this._historyDropdownEl.classList.contains("closing");

    if (mainHidden && historyHidden) {
      const quoteWidget = document.getElementById("quote-widget");
      if (quoteWidget) {
        quoteWidget.style.removeProperty("visibility");
        quoteWidget.style.opacity = "";
      }
    }
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
      modal.style.color = "#ffffff";
      modal.style.setProperty("--text-primary", "#ffffff"); 
      modal.style.setProperty("--text-secondary", "rgba(255,255,255,0.7)");
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
      provider = SEARCH_PROVIDERS[type].find((p) => p.id === engineId);
      if (provider) break;
    }
    if (!provider) {
      provider = SEARCH_PROVIDERS[this.current.type].find(
        (p) => p.id === this.current.id,
      );
    }
    if (!provider) return;

    this.saveSearch(query, engineId);

    let url;
    if (provider.searchType === "path") {
      url = `${provider.url}/${encodeURIComponent(query)}`;
    } else {
      url = `${provider.url}?${provider.queryParam}=${encodeURIComponent(query)}`;
    }
    window.location.href = url;
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
      const found = SEARCH_PROVIDERS[type].find((p) => p.id === engineId);
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
    footerLi.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._removeHistoryDropdown();
        this.buildHistoryModal();
      }
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
      makeKeyboardInteractive(div, () => {
        this.setProvider(p.id, type);
        this.closeDropdown();
      }, `Use ${p.name}`);
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", String(p.id === this.current.id));

      const img = document.createElement("img");
      img.src = this._getProviderIconUrl(p.icon);
      img.alt = p.name;

      const span = document.createElement("span");
      span.textContent = p.name;

      div.appendChild(img);
      div.appendChild(span);

      div.addEventListener("click", () => {
        this.setProvider(p.id, type);
        this.closeDropdown();
      });
      return div;
    };

    this.els.engineList.innerHTML = "";
    SEARCH_PROVIDERS.engines.forEach((p) =>
      this.els.engineList.appendChild(createItem(p, "engines")),
    );

    this.els.platformList.innerHTML = "";
    SEARCH_PROVIDERS.platforms.forEach((p) =>
      this.els.platformList.appendChild(createItem(p, "platforms")),
    );
  }

  setProvider(id, type) {
    this.current = { id, type };
    state.set("searchProvider", this.current);
    this.updateUI();
    this.updateButtons();
    this.renderProviderDropdown();
  }

  updateUI() {
    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );
    if (provider) {
      this.els.providerIcon.src = this._getProviderIconUrl(provider.icon);
      this.els.providerIcon.alt = provider.name;
    }
  }

  updateButtons() {
    const hasText = this.els.input.value.trim().length > 0;
    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );

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
      
      const quoteWidget = document.getElementById("quote-widget");
      if (quoteWidget) {
        quoteWidget.style.setProperty("visibility", "hidden", "important");
        quoteWidget.style.opacity = "0";
      }
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
    if (
      this.els.dropdown.classList.contains("hidden") ||
      this.els.dropdown.classList.contains("closing")
    ) {
      return;
    }
    
    this.els.dropdown.classList.add("closing");
    this.els.providerBtn.classList.remove("is-open");

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

    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );
    if (!provider) return;

    this.saveSearch(query, this.current.id);

    let url;
    if (provider.searchType === "path") {
      url = `${provider.url}/${encodeURIComponent(query)}`;
    } else {
      url = `${provider.url}?${provider.queryParam}=${encodeURIComponent(query)}`;
    }

    window.location.href = url;
  }
}
// [src/modules/search.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
