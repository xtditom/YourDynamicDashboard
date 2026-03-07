import { state } from "../state.js";
import { CONFIG, SEARCH_PROVIDERS, SEARCH_SUGGESTIONS } from "../config.js";
import { showCustomModal } from "../utils.js";

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

    this.current =
      state.get("searchProvider") || CONFIG.defaults.searchProvider;
    this._historyDropdownEl = null;
    this._blurTimer = null;
    this.currentFilteredHistory = [];
    this.init();
  }

  init() {
    this.renderProviderDropdown();
    this.updateUI();
    this.updateButtons();
    this.startTypewriterEffect();

    state.subscribe((key) => {
      if (key === "linkTargets") this.updateButtons();
    });

    this.els.input.addEventListener("input", (e) => {
      this.updateButtons();
      
      const val = e.target.value;
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

      // Auto-fill suggestion ONLY if there is exactly 1 match
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

        if (this.currentFilteredHistory && this.currentFilteredHistory.length > 0) {
          // Execute top match with the CURRENTLY ACTIVE engine
          this._executeViaEngine(this.currentFilteredHistory[0].query, this.current.id);
        } else {
          // Fallback to normal search
          this.handleSubmit(new Event("submit"));
        }
      }
    });

    // Layer 1: show quick-history dropdown on focus
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
      if (state.get("hideVoiceSearch") === true) {
        this.els.voiceBtn.style.display = "none";
      } else if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        this.els.voiceBtn.addEventListener("click", () =>
          this.toggleVoiceSearch(),
        );
      } else {
        this.els.voiceBtn.style.display = "none";
      }
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
  saveSearch(query, engineId) {
    if (state.get("searchHistoryPaused")) return;

    const now = Date.now();
    const autoDeleteDays = state.get("searchAutoDeleteDays") || 365;
    const maxAge = autoDeleteDays * 24 * 60 * 60 * 1000;

    let history = state.get("searchHistory") || [];

    // Prune entries older than the configured auto-delete window
    history = history.filter((item) => now - item.timestamp < maxAge);

    // Prepend newest entry (duplicates allowed)
    history.unshift({ query, engineId, timestamp: now });

    // Enforce 1000-item cap
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

    // Conditional blur for custom-bg / gradient themes
    if (document.body.classList.contains("has-custom-bg") || document.body.classList.contains("gradient-mode-active")) {
      ul.style.setProperty("backdrop-filter", "blur(40px)", "important");
      ul.style.setProperty("-webkit-backdrop-filter", "blur(40px)", "important");
      const isDark = document.body.getAttribute("data-theme") === "dark";
      ul.style.setProperty("background-color", "var(--widget-bg)", "important");
      ul.style.setProperty("color", isDark ? "#ffffff" : "#000000", "important");

      // Hide quotes if dropdown is NEW
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

      // Engine icon
      const icon = document.createElement("img");
      const engineIcon = this._resolveEngineIcon(item.engineId);
      icon.src = CONFIG.paths.search + engineIcon;
      icon.alt = item.engineId || "";
      icon.width = 16;
      icon.height = 16;
      icon.onerror = () => { icon.style.display = "none"; };

      // Query text
      const text = document.createElement("span");
      text.className = "sh-qd-text";
      text.textContent = item.query;

      // Time
      const time = document.createElement("span");
      time.className = "sh-qd-time";
      time.textContent = this._formatTime(item.timestamp);

      li.appendChild(icon);
      li.appendChild(text);
      li.appendChild(time);

      // mousedown fires before blur — execute via CURRENTLY ACTIVE engine
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        clearTimeout(this._blurTimer);
        this._removeHistoryDropdown();
        this._executeViaEngine(item.query, this.current.id);
      });

      ul.appendChild(li);
    });

    // "Full Search History" footer item
    const footerLi = document.createElement("li");
    footerLi.className = "sh-full-history-btn";
    footerLi.textContent = "Full Search History";
    footerLi.addEventListener("mousedown", (e) => {
      e.preventDefault();
      clearTimeout(this._blurTimer);
      this._removeHistoryDropdown();
      this.buildHistoryModal();
    });
    ul.appendChild(footerLi);

    // Position under the search input
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
    // Only restore if BOTH dropdowns are closed/hidden
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
    // Idempotent: remove existing modal first
    const existing = document.getElementById("sh-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "sh-modal-overlay";
    overlay.style.zIndex = "9900";

    const modal = document.createElement("div");
    modal.className = "sh-modal";
    modal.style.maxWidth = "850px";
    modal.style.width = "90%";
    modal.addEventListener("click", (e) => e.stopPropagation());

    if (document.body.classList.contains("force-white-text") && !document.body.classList.contains("has-custom-bg")) {
      modal.style.color = "#ffffff";
      // Force child text elements to inherit white if needed
      modal.style.setProperty("--text-primary", "#ffffff"); 
      modal.style.setProperty("--text-secondary", "rgba(255,255,255,0.7)");
    }

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement("div");
    header.className = "sh-modal-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "sh-title-wrap";

    // ⓘ Info button — placed BEFORE the title
    const infoBtn = document.createElement("button");
    infoBtn.className = "sh-info-btn";
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
    title.textContent = "Search History";

    titleWrap.appendChild(infoBtn);
    titleWrap.appendChild(title);

    // ── Controls row (toggle + auto-delete select + clear all) ──────────────
    const controls = document.createElement("div");
    controls.className = "sh-controls-row";

    // "Don't save searches" toggle
    const ghostLabel = document.createElement("label");
    ghostLabel.className = "sh-ghost-toggle";
    const ghostCheck = document.createElement("input");
    ghostCheck.type = "checkbox";
    ghostCheck.checked = state.get("searchHistoryPaused") || false;
    const ghostSpan = document.createElement("span");
    ghostSpan.textContent = "Don't save searches";
    ghostLabel.appendChild(ghostCheck);
    ghostLabel.appendChild(ghostSpan);
    ghostCheck.addEventListener("change", () => {
      state.set("searchHistoryPaused", ghostCheck.checked);
    });

    // Auto Delete select
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
      // Purge items now exceeding the new limit
      const cutoff = Date.now() - newDays * 24 * 60 * 60 * 1000;
      const h = (state.get("searchHistory") || []).filter(
        (item) => item.timestamp >= cutoff,
      );
      state.set("searchHistory", h);
      this._renderModalList(filterInput.value.toLowerCase(), listContainer);
    });
    autoDeleteWrap.appendChild(autoDeleteLabel);
    autoDeleteWrap.appendChild(autoDeleteSelect);

    // Clear All button
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

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "sh-close-btn";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close history");
    closeBtn.addEventListener("click", () => overlay.remove());

    header.appendChild(titleWrap);
    header.appendChild(controls);
    header.appendChild(closeBtn);

    // ── Filter row ──────────────────────────────────────────────────────────
    const filterRow = document.createElement("div");
    filterRow.className = "sh-filter-row";
    const filterInput = document.createElement("input");
    filterInput.type = "text";
    filterInput.id = "sh-filter-input";
    filterInput.placeholder = "Filter history…";
    filterRow.appendChild(filterInput);

    // ── List container ──────────────────────────────────────────────────────
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

    overlay.addEventListener("click", () => overlay.remove());

    const escHandler = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
    overlay.addEventListener("remove", () =>
      document.removeEventListener("keydown", escHandler),
    );
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

    // Group items
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

        // Engine icon
        const icon = document.createElement("img");
        icon.src = CONFIG.paths.search + this._resolveEngineIcon(item.engineId);
        icon.alt = item.engineId || "";
        icon.width = 22;
        icon.height = 22;
        icon.className = "sh-row-icon";
        icon.onerror = () => { icon.style.display = "none"; };

        // Query text — executes via item's OWN saved engineId
        const queryEl = document.createElement("span");
        queryEl.className = "sh-row-query";
        queryEl.textContent = item.query;
        queryEl.title = "Search for this again";
        queryEl.addEventListener("click", () => {
          const ov = document.getElementById("sh-modal-overlay");
          if (ov) ov.remove();
          this._executeViaEngine(item.query, item.engineId);
        });

        // Time (HH:MM)
        const timeEl = document.createElement("span");
        timeEl.className = "sh-row-time";
        timeEl.textContent = this._formatTime(item.timestamp);

        // Delete button — uses index-independent timestamp comparison
        const delBtn = document.createElement("button");
        delBtn.className = "sh-delete-btn";
        delBtn.textContent = "×";
        delBtn.title = "Remove this entry";
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

  // Executes a search using a specific engineId regardless of the active provider
  _executeViaEngine(query, engineId) {
    let provider = null;
    for (const type of ["engines", "platforms"]) {
      provider = SEARCH_PROVIDERS[type].find((p) => p.id === engineId);
      if (provider) break;
    }
    // Fall back to the currently active provider if not found
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
    for (const type of ["engines", "platforms"]) {
      const found = SEARCH_PROVIDERS[type].find((p) => p.id === engineId);
      if (found) return found.icon;
    }
    return "google.png";
  }

  // --- SECTION: VOICE SEARCH ---
  toggleVoiceSearch() {
    if (this.isListening) {
      this.stopVoiceSearch();
    } else {
      this.startVoiceSearch();
    }
  }

  startVoiceSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.lang = "en-US";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.start();
    this.isListening = true;
    this.els.voiceBtn.classList.add("listening");
    this.els.input.placeholder = "Listening...";

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.els.input.value = transcript;
      this.updateButtons();

      setTimeout(() => {
        this.handleSubmit(new Event("submit"));
      }, 800);
    };

    this.recognition.onspeechend = () => {
      this.stopVoiceSearch();
    };

    this.recognition.onerror = (event) => {
      const voiceBtn = document.getElementById("voice-search-btn");
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
      }

      if (event.error === "network" || event.error === "not-allowed") {
        showCustomModal(
          "Voice Search failed: Your browser (like Brave) is blocking the audio connection for privacy reasons. You can also hide Voice Search",
          false,
          false,
          [
            {
              text: "Hide Forever",
              value: "hide",
              width: "120px",
              style:
                "background-color: var(--bg-interactive); color: var(--text-primary);",
            },
            { text: "Try again", value: "ok", width: "120px" },
          ],
        ).then((result) => {
          if (result === "hide" && voiceBtn) {
            voiceBtn.style.display = "none";
            state.set("hideVoiceSearch", true);
          }
        });
      } else {
        console.warn(event.error);
      }

      this.stopVoiceSearch();
      this.els.input.placeholder = "Error. Try again.";
    };
  }

  stopVoiceSearch() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.els.voiceBtn.classList.remove("listening");
  }

  // --- SECTION: UI & ANIMATION ---
  startTypewriterEffect() {
    const typeSpeed = 50;
    const deleteSpeed = 25;
    const readDelay = 9500;

    const loop = () => {
      if (this.isListening) {
        setTimeout(loop, 1000);
        return;
      }

      const text =
        SEARCH_SUGGESTIONS[
          Math.floor(Math.random() * SEARCH_SUGGESTIONS.length)
        ];
      let i = 0;
      const typing = setInterval(() => {
        if (this.isListening) {
          clearInterval(typing);
          loop();
          return;
        }

        this.els.input.placeholder = text.substring(0, i) + "|";
        i++;

        if (i > text.length) {
          clearInterval(typing);
          this.els.input.placeholder = text;

          setTimeout(() => {
            let j = text.length;
            const deleting = setInterval(() => {
              if (this.isListening) {
                clearInterval(deleting);
                loop();
                return;
              }

              this.els.input.placeholder = text.substring(0, j) + "|";
              j--;

              if (j < 0) {
                clearInterval(deleting);
                this.els.input.placeholder = "";
                setTimeout(loop, 200);
              }
            }, deleteSpeed);
          }, readDelay);
        }
      }, typeSpeed);
    };
    loop();
  }

  renderProviderDropdown() {
    const createItem = (p, type) => {
      const div = document.createElement("div");
      div.className = `dropdown-item ${p.id === this.current.id ? "active" : ""}`;

      const img = document.createElement("img");
      img.src = CONFIG.paths.search + p.icon;
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
      this.els.providerIcon.src = CONFIG.paths.search + provider.icon;
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
    const isHidden = this.els.dropdown.classList.contains("hidden");
    if (isHidden) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  openDropdown() {
    this.els.dropdown.classList.remove("closing");
    this.els.dropdown.classList.remove("hidden");
    this.els.providerBtn.classList.add("is-open");

    const body = document.body;
    if (body.classList.contains("has-custom-bg") || body.classList.contains("gradient-mode-active")) {
      this.els.dropdown.style.setProperty("backdrop-filter", "blur(40px)", "important");
      this.els.dropdown.style.setProperty("-webkit-backdrop-filter", "blur(40px)", "important");
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
    if (this.els.dropdown.classList.contains("hidden")) return;
    
    this.els.dropdown.classList.add("closing");
    this.els.providerBtn.classList.remove("is-open");

    setTimeout(() => {
      this.els.dropdown.classList.add("hidden");
      this.els.dropdown.classList.remove("closing");

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

    // Save to history before navigating
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

// src/modules/search.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
