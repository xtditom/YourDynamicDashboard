import { state } from "../state.js";
import {
  GOOGLE_APPS,
  AI_TOOLS,
  SOCIAL_LINKS,
  SEARCH_PROVIDERS,
  COMMAND_PALETTE_SHORTCUT_USE_LIMIT,
} from "../config.js";

// Complete Bang Mapping for Search Engines & Platforms
export const BANG_MAP = {
  // Search Engines
  "g": { id: "google", type: "engines" },
  "google": { id: "google", type: "engines" },
  "b": { id: "bing", type: "engines" },
  "bing": { id: "bing", type: "engines" },
  "y": { id: "yahoo", type: "engines" },
  "yahoo": { id: "yahoo", type: "engines" },
  "ppx": { id: "perplexity", type: "engines" },
  "perplexity": { id: "perplexity", type: "engines" },
  "ddg": { id: "duckduckgo", type: "engines" },
  "duckduckgo": { id: "duckduckgo", type: "engines" },
  "yd": { id: "yandex", type: "engines" },
  "yandex": { id: "yandex", type: "engines" },

  // Platforms
  "yt": { id: "youtube", type: "platforms" },
  "youtube": { id: "youtube", type: "platforms" },
  "sp": { id: "spotify", type: "platforms" },
  "spotify": { id: "spotify", type: "platforms" },
  "w": { id: "wikipedia", type: "platforms" },
  "wikipedia": { id: "wikipedia", type: "platforms" },
  "pin": { id: "pinterest", type: "platforms" },
  "pinterest": { id: "pinterest", type: "platforms" },
  "r": { id: "reddit", type: "platforms" },
  "reddit": { id: "reddit", type: "platforms" },
  "q": { id: "quora", type: "platforms" },
  "quora": { id: "quora", type: "platforms" }
};

const RESERVED_COMMAND_IDS = ["check-updates", "help-palette", "help-info"];
const BACKGROUND_COMMAND_IDS = new Set([
  "bg-remove",
  "bg-random-freeze",
]);

export class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.activeIndex = 0;
    this.currentMenu = "main"; // "main", "search", "apps", "ai", "socials"
    this._helpModalClose = null;

    // 1. Core main commands
    this.mainCommands = [
      {
        id: "help-palette",
        name: "Command Palette Help",
        icon: "❓",
        shortcut: "",
        action: () => this.openHelpModal()
      },
      {
        id: "settings-full",
        name: "Open Full Settings",
        icon: "⚙️",
        shortcut: () => this.getShortcutLabel("settings"),
        action: () => window.__fullSettingsModalInstance?.open()
      },
      {
        id: "zen-mode",
        name: "Toggle Zen Mode",
        icon: "🧘",
        shortcut: () => this.getShortcutLabel("zen"),
        action: () => state.set("zenMode", !state.get("zenMode"))
      },
      {
        id: "voice-search",
        name: "Start / Stop Voice Search",
        icon: "🎙️",
        shortcut: () => this.getShortcutLabel("voice"),
        action: () => window.YD_Search?.toggleVoiceSearch()
      },
      {
        id: "clock-type",
        name: "Toggle Digital / Analog Clock",
        icon: "🕒",
        shortcut: () => this.getShortcutLabel("clock"),
        action: () =>
          state.set(
            "clockType",
            state.get("clockType") === "analog" ? "digital" : "analog",
          )
      },
      {
        id: "date-visibility",
        name: "Toggle Day & Date Visibility",
        icon: "📅",
        shortcut: () => this.getShortcutLabel("date"),
        action: () => this.toggleBooleanState("showDate", false)
      },
      {
        id: "disable-animations",
        name: "Toggle Disable Animations",
        icon: "🎞️",
        shortcut: "",
        action: () => this.toggleBooleanState("disableAnimations", false)
      },
      {
        id: "glow-effect",
        name: "Toggle Glow Effect",
        icon: "✨",
        shortcut: "",
        action: () => {
          if (state.get("disableAnimations") === true) return;
          this.toggleBooleanState("glowEffect", true);
        }
      },
      {
        id: "generate-theme",
        name: "Generate a New Theme",
        icon: "🎨",
        shortcut: "",
        action: () => window.__fullSettingsModalInstance?.generateTheme?.()
      },
      {
        id: "auto-theme",
        name: "Toggle Auto Theme",
        icon: "🌅",
        shortcut: () => this.getShortcutLabel("autoTheme"),
        action: () => {
          if (!document.body.classList.contains("has-custom-bg")) {
            this.toggleBooleanState("autoTheme", false);
          }
        }
      },
      {
        id: "temperature-display",
        name: "Toggle Temperature Display",
        icon: "🌡️",
        shortcut: () => this.getShortcutLabel("tempDisplay"),
        action: () => this.toggleBooleanState("tempDisplayMode", false)
      },
      {
        id: "temperature-unit",
        name: "Toggle Temperature Unit (°C / °F)",
        icon: "🌡️",
        shortcut: "",
        action: () =>
          state.set(
            "tempUnit",
            state.get("tempUnit") === "imperial" ? "metric" : "imperial",
          )
      },
      {
        id: "detect-weather-location",
        name: "Detect Weather Location Automatically",
        icon: "📍",
        shortcut: "",
        action: () => window.__settingsManagerInstance?.detectLocation?.()
      },
      {
        id: "greeting-visibility",
        name: "Toggle Greeting Visibility",
        icon: "👋",
        shortcut: () => this.getShortcutLabel("hideGreetings"),
        action: () => this.toggleBooleanState("hideGreetings", false)
      },
      {
        id: "editable-text-visibility",
        name: "Toggle Editable Text Visibility",
        icon: "✏️",
        shortcut: () => this.getShortcutLabel("showEditableText"),
        action: () => this.toggleBooleanState("showEditableText", true)
      },
      {
        id: "check-updates",
        name: "Check for Updates",
        icon: "🔄",
        shortcut: "",
        action: () => this.clickBtn("check-for-updates-btn")
      },
      {
        id: "help-info",
        name: "Open Help & Info Dialog",
        icon: "ℹ️",
        shortcut: "",
        action: () => {
          const settings = window.__settingsManagerInstance;
          if (settings?.openInfoModal) settings.openInfoModal();
          else document.getElementById("info-btn")?.click();
        }
      },
      {
        id: "bg-remove",
        name: "Remove Custom Wallpaper Background",
        icon: "🖼️",
        shortcut: "",
        action: () => this.clickBtn("remove-bg-button")
      },
      {
        id: "history",
        name: "Open Search History Modal",
        icon: "📜",
        shortcut: "",
        action: () => {
          if (window.YD_Search) {
            window.YD_Search.buildHistoryModal();
          }
        }
      },
      {
        id: "history-ghost",
        name: "Toggle Search History Ghost Mode (Pause Saving)",
        icon: "👻",
        shortcut: "",
        action: () => {
          state.set("searchHistoryPaused", !state.get("searchHistoryPaused"));
        }
      },
      {
        id: "clock-format",
        name: "Toggle Clock Format (12h / 24h)",
        icon: "⏰",
        shortcut: "",
        action: () => {
          state.set("clockFormat", state.get("clockFormat") === "12" ? "24" : "12");
        }
      },
      {
        id: "mode-dark",
        name: "Toggle Dark / Light Theme Mode",
        icon: "🌗",
        shortcut: "",
        action: () => this.clickBtn("dark-mode-toggle")
      },
      {
        id: "transparency",
        name: "Toggle Transparency Effect (Glassmorphism)",
        icon: "🔮",
        shortcut: "",
        action: () => {
          state.set("transparencyActive", !state.get("transparencyActive"));
        }
      },
      {
        id: "shortcuts-pos",
        name: "Toggle Shortcuts Bar Position (Top / Bottom)",
        icon: "↕️",
        shortcut: "",
        action: () => {
          state.set("shortcutsPosition", state.get("shortcutsPosition") === "bottom" ? "top" : "bottom");
        }
      },
      {
        id: "bg-random-rnd",
        name: "Trigger New Random Background Image",
        icon: "🖼️",
        shortcut: "",
        action: () => this.clickBtn("random-bg-rnd-btn")
      },
      {
        id: "bg-random-freeze",
        name: "Toggle Freeze Random Background Image",
        icon: "❄️",
        shortcut: "",
        action: () => this.clickBtn("random-bg-freeze-btn")
      },
      {
        id: "reset",
        name: "Reset Dashboard to Defaults",
        icon: "⚠️",
        shortcut: "",
        action: () => {
          const sm = window.__settingsManagerInstance;
          if (sm && typeof sm.resetAll === "function") {
            sm.resetAll();
          } else {
            this.clickBtn("reset-button");
          }
        },
      },
      {
        id: "submenu-apps",
        name: "Launch App...",
        icon: "🚀",
        shortcut: "Folder",
        action: () => this.switchMenu("apps")
      },
      {
        id: "submenu-ai",
        name: "Launch AI...",
        icon: "🤖",
        shortcut: "Folder",
        action: () => this.switchMenu("ai")
      },
      {
        id: "submenu-socials",
        name: "Launch Social...",
        icon: "📱",
        shortcut: "Folder",
        action: () => this.switchMenu("socials")
      },
      {
        id: "submenu-search",
        name: "Do Search...",
        icon: "🔎",
        shortcut: "Folder",
        action: () => this.switchMenu("search")
      }
    ];

    this.searchCommands = [
      ...(SEARCH_PROVIDERS.engines || []).map((provider) => ({
        ...provider,
        providerType: "engines",
      })),
      ...(SEARCH_PROVIDERS.platforms || []).map((provider) => ({
        ...provider,
        providerType: "platforms",
      })),
    ].map((provider) => ({
        id: `search-${provider.providerType}-${provider.id}`,
        name: provider.name,
        icon: "🔎",
        shortcut: "",
        action: () => {
          if (provider.id === "perplexity") {
            window.YD_Search?.recordPerplexityUse?.();
          }
          window.YD_Search?.setProvider(provider.id, provider.providerType);
        },
      }));

    this.syncCustomSearchCommands();

    // 2. Google Apps and user-added app commands
    this.appCommands = [];
    this.syncAppCommands();

    // 3. AI Tools commands
    this.aiCommands = [];
    (AI_TOOLS || []).forEach(tool => {
      if (tool.name) {
        this.aiCommands.push({
          id: `ai-${tool.name.toLowerCase()}`,
          name: tool.name,
          icon: "🤖",
          shortcut: "",
          action: () => {
            const targets = state.get("linkTargets") || {};
            window.open(tool.url, targets.ai || "_blank");
          }
        });
      }
    });

    // 4. Social networks commands
    this.socialCommands = [];
    (SOCIAL_LINKS || []).forEach(social => {
      if (social.name) {
        this.socialCommands.push({
          id: `social-${social.name.toLowerCase()}`,
          name: social.name,
          icon: "📱",
          shortcut: "",
          action: () => {
            const targets = state.get("linkTargets") || {};
            window.open(social.url, targets.socials || targets.ai || "_blank");
          }
        });
      }
    });

    this.syncCustomToolCommands();

    this.filteredCommands = [...this.mainCommands];
    this.init();
  }

  syncCustomToolCommands() {
    this.aiCommands = (this.aiCommands || []).filter(
      (command) => !command.id.startsWith("custom-ai-"),
    );
    this.socialCommands = (this.socialCommands || []).filter(
      (command) => !command.id.startsWith("custom-social-"),
    );

    (state.get("customAiTools") || []).forEach((tool) => {
      this.aiCommands.push({
        id: tool.id,
        name: tool.name,
        icon: "🤖",
        shortcut: "",
        action: () => {
          const targets = state.get("linkTargets") || {};
          window.open(tool.url, targets.ai || "_blank");
        },
      });
    });

    (state.get("customSocialLinks") || []).forEach((tool) => {
      this.socialCommands.push({
        id: tool.id,
        name: tool.name,
        icon: "📱",
        shortcut: "",
        action: () => {
          const targets = state.get("linkTargets") || {};
          window.open(tool.url, targets.socials || targets.ai || "_blank");
        },
      });
    });
  }

  syncCustomSearchCommands() {
    this.searchCommands = (this.searchCommands || []).filter(
      (command) => !command.id.startsWith("search-engines-custom-search-"),
    );

    (state.get("customSearchEngines") || []).forEach((provider) => {
      this.searchCommands.push({
        id: `search-engines-${provider.id}`,
        name: provider.name,
        icon: "🔎",
        shortcut: "",
        action: () => {
          window.YD_Search?.setProvider(provider.id, "engines");
        },
      });
    });
  }

  syncAppCommands() {
    const apps = window.YD_Apps?.getVisibleApps?.() ||
      (GOOGLE_APPS || []).filter((app) => app.name && app.name !== "divider");
    this.appCommands = apps.map((app) => ({
      id: `app-${app.id || app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: app.name,
      icon: "🚀",
      shortcut: "",
      action: () => {
        const targets = state.get("linkTargets") || {};
        window.open(app.url, targets.apps || "_blank");
      },
    }));
  }

  init() {
    this.createDomElements();
    this.registerEvents();
    state.subscribe((key) => {
      if (
        key === "hideVoiceSearch" ||
        key === "backgroundImage" ||
        key === "randomBgMode" ||
        key === "savedBgUrl" ||
        key === "disableAnimations" ||
        key === "customApps" ||
        key === "googleAppOverrides" ||
        key === "hiddenApps" ||
        key === "customAiTools" ||
        key === "customSearchEngines" ||
        key === "customSocialLinks"
      ) {
        if (key === "customAiTools" || key === "customSocialLinks") {
          this.syncCustomToolCommands();
        }
        if (key === "customSearchEngines") this.syncCustomSearchCommands();
        if (
          key === "customApps" ||
          key === "googleAppOverrides" ||
          key === "hiddenApps"
        ) {
          this.syncAppCommands();
        }
        this.filter(this.els.input?.value || "");
      }
      if (key === "commandPaletteShortcutUseCount") {
        this.syncShortcutBadge();
      }
    });
    window.YD_CommandPalette = this;
  }

  hasActiveBackground() {
    return Boolean(
      document.body.classList.contains("has-custom-bg") ||
        state.get("backgroundImage") ||
        state.get("randomBgMode") ||
        localStorage.getItem("has_idb_bg") === "true",
    );
  }

  isCommandVisible(command) {
    if (command?.id === "voice-search") {
      return state.get("hideVoiceSearch") !== true;
    }

    if (command?.id === "glow-effect") {
      return state.get("disableAnimations") !== true;
    }

    if (!BACKGROUND_COMMAND_IDS.has(command?.id)) return true;
    if (command.id === "bg-random-freeze") {
      return ["random", "freeze"].includes(state.get("randomBgMode"));
    }
    return this.hasActiveBackground();
  }

  getVisibleCommands(commands) {
    return commands.filter((command) => this.isCommandVisible(command));
  }

  createDomElements() {
    if (document.getElementById("cp-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "cp-modal-overlay";
    overlay.className = "hidden";
    overlay.inert = true;
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="cp-modal" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title">
        <div class="cp-header">
          <div class="cp-search-wrapper">
            <span class="cp-search-icon">🔍</span>
            <label id="cp-modal-title" class="visually-hidden">Command Palette</label>
            <input type="text" id="cp-search-input" aria-label="Search commands" placeholder="Type a command or search... (Esc to close)" autocomplete="off" />
          </div>
          <button type="button" class="cp-esc-badge" aria-label="Close command palette" title="Close command palette">Esc</button>
        </div>
        <div id="cp-command-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    this.els = {
      overlay,
      input: overlay.querySelector("#cp-search-input"),
      list: overlay.querySelector("#cp-command-list"),
      escapeBtn: overlay.querySelector(".cp-esc-badge")
    };
  }

  registerEvents() {
    const badge = document.getElementById("search-cp-badge");
    if (badge) {
      this.syncShortcutBadge();
      badge.setAttribute("role", "button");
      badge.tabIndex = 0;
      badge.setAttribute("aria-label", "Open command palette");
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        this.open();
      });
      badge.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.open();
        }
      });
    }

    this.els.overlay.addEventListener("click", (e) => {
      if (e.target === this.els.overlay) {
        this.close();
      }
    });

    this.els.escapeBtn.addEventListener("click", () => this.close());
    this.els.overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }
      if (e.key === "Tab") {
        const focusable = this.els.overlay.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])");
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
    });

    this.els.input.addEventListener("input", (e) => {
      this.filter(e.target.value);
    });

    this.els.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.filteredCommands.length === 0) return;
        this.activeIndex = (this.activeIndex + 1) % this.filteredCommands.length;
        this.render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.filteredCommands.length === 0) return;
        this.activeIndex = (this.activeIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
        this.render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        
        // Check for universal search command (/s) & bang engine shortcuts (!yt, /g, !sp, etc.)
        const isSearch = this.handleUniversalSearch(this.els.input.value);
        if (isSearch) return;

        this.execute();
      } else if (e.key === "Backspace" && this.els.input.value === "" && this.currentMenu !== "main") {
        e.preventDefault();
        this.switchMenu("main");
      }
    });
  }

  syncShortcutBadge() {
    const badge = document.getElementById("search-cp-badge");
    if (!badge) return;
    const hidden =
      (Number(state.get("commandPaletteShortcutUseCount")) || 0) >=
      COMMAND_PALETTE_SHORTCUT_USE_LIMIT;
    badge.hidden = hidden;
    badge.classList.toggle("hidden", hidden);
    badge.setAttribute("aria-hidden", String(hidden));
  }

  open() {
    this.isOpen = true;
    this.els.overlay.classList.remove("hidden");
    this.els.overlay.inert = false;
    this.els.overlay.setAttribute("aria-hidden", "false");
    this.els.input.value = "";
    this.currentMenu = "main";
    this.activeIndex = 0;
    this.filter("");
  }

  close() {
    this.isOpen = false;
    this.els.overlay.classList.add("hidden");
    this.els.overlay.inert = true;
    this.els.overlay.setAttribute("aria-hidden", "true");
  }

  switchMenu(menuName) {
    const validMenus = ["main", "search", "apps", "ai", "socials"];
    const targetMenu = validMenus.includes(menuName) ? menuName : "main";
    this.currentMenu = targetMenu;
    this.els.input.value = "";
    this.activeIndex = 0;
    
    const placeholders = {
      main: "Type a command or search... (Esc to close)",
      search: "Choose a search engine or platform... (Backspace to go back)",
      apps: "Search Google Apps... (Backspace to go back)",
      ai: "Search AI Tools... (Backspace to go back)",
      socials: "Search Social Links... (Backspace to go back)"
    };
    this.els.input.placeholder = placeholders[targetMenu];
    
    this.filter("");
  }

  getCommandUsage() {
    const usage = state.get("commandUsage");
    if (!usage || typeof usage !== "object" || Array.isArray(usage)) return {};

    return Object.fromEntries(
      Object.entries(usage).filter(
        ([, count]) => Number.isFinite(count) && count > 0,
      ),
    );
  }

  orderCommands(commands) {
    const usage = this.getCommandUsage();
    const indexed = commands.map((command, index) => ({ command, index }));

    indexed.sort((a, b) => {
      const aReserved = RESERVED_COMMAND_IDS.indexOf(a.command.id);
      const bReserved = RESERVED_COMMAND_IDS.indexOf(b.command.id);

      if (aReserved !== -1 || bReserved !== -1) {
        if (aReserved === -1) return 1;
        if (bReserved === -1) return -1;
        return aReserved - bReserved;
      }

      const usageDifference = (usage[b.command.id] || 0) - (usage[a.command.id] || 0);
      return usageDifference || a.index - b.index;
    });

    return indexed.map(({ command }) => command);
  }

  recordCommandUsage(command) {
    if (!command?.id || command.id === "cp-back-button") return;

    const usage = this.getCommandUsage();
    const current = usage[command.id] || 0;
    usage[command.id] = Math.min(current + 1, Number.MAX_SAFE_INTEGER);
    state.set("commandUsage", usage);
  }

  filter(text) {
    const query = text.toLowerCase().trim();

    if (this.currentMenu === "main" && query !== "") {
      // Unified search crawls all commands across all categories
      const allSearchable = this.orderCommands(this.getVisibleCommands([
        ...this.mainCommands.filter(c => c.id !== "submenu-apps" && c.id !== "submenu-ai" && c.id !== "submenu-socials" && c.id !== "submenu-search"),
        ...this.appCommands,
        ...this.aiCommands,
        ...this.socialCommands,
        ...this.searchCommands,
      ]));
      this.filteredCommands = allSearchable.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.id.toLowerCase().includes(query)
      );
    } else {
      let baseList = [];
      if (this.currentMenu === "main") {
        baseList = this.orderCommands(this.getVisibleCommands(this.mainCommands));
      } else if (this.currentMenu === "apps") {
        baseList = this.orderCommands(this.appCommands);
      } else if (this.currentMenu === "ai") {
        baseList = this.orderCommands(this.aiCommands);
      } else if (this.currentMenu === "socials") {
        baseList = this.orderCommands(this.socialCommands);
      } else if (this.currentMenu === "search") {
        baseList = this.orderCommands(this.searchCommands);
      }

      if (!query) {
        this.filteredCommands = [...baseList];
      } else {
        this.filteredCommands = baseList.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.id.toLowerCase().includes(query)
        );
      }
    }

    if (this.currentMenu !== "main") {
      this.filteredCommands.unshift({
        id: "cp-back-button",
        name: "← Back to Main Menu",
        icon: "↩️",
        shortcut: "Backspace",
        action: () => this.switchMenu("main")
      });
    }

    this.activeIndex = 0;
    this.render();
  }

  render() {
    this.els.list.innerHTML = "";

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cp-empty-msg";
      empty.textContent = "No commands matching search query.";
      this.els.list.appendChild(empty);
      return;
    }

    this.filteredCommands.forEach((c, idx) => {
      const item = document.createElement("div");
      item.className = `cp-item ${idx === this.activeIndex ? "active" : ""}`;
      item.id = `cp-command-${idx}`;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.setAttribute("aria-label", c.name);
      item.setAttribute("aria-selected", String(idx === this.activeIndex));
      
      const left = document.createElement("div");
      left.className = "cp-item-left";
      
      const icon = document.createElement("span");
      icon.className = "cp-item-icon";
      icon.textContent = c.icon;

      const name = document.createElement("span");
      name.className = "cp-item-name";
      name.textContent = c.name;

      left.appendChild(icon);
      left.appendChild(name);
      item.appendChild(left);

      const shortcut =
        typeof c.shortcut === "function" ? c.shortcut() : c.shortcut;
      if (shortcut) {
        const badge = document.createElement("span");
        badge.className = "cp-item-badge";
        badge.textContent = shortcut;
        const shortcutAction = this.getCommandShortcutAction(c);
        const binding = shortcutAction
          ? state.get("keyMap")?.[shortcutAction]
          : null;
        if (binding && !binding.enabled) {
          badge.classList.add("is-disabled");
          badge.title = `Shortcut ${shortcut} is disabled in Settings`;
        }
        item.appendChild(badge);
      }

      if (
        c.id === "search-engines-perplexity" &&
        (Number(state.get("perplexityUseCount")) || 0) < 1
      ) {
        const newBadge = document.createElement("span");
        newBadge.className = "cp-new-badge";
        newBadge.textContent = "NEW";
        newBadge.setAttribute("aria-label", "New");
        item.appendChild(newBadge);
      }

      item.addEventListener("click", () => {
        this.activeIndex = idx;
        this.execute();
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.activeIndex = idx;
          this.execute();
        }
      });

      this.els.list.appendChild(item);

      if (idx === this.activeIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  execute() {
    const cmd = this.filteredCommands[this.activeIndex];
    if (cmd) this.executeCommand(cmd);
  }

  executeCommand(command) {
    if (!command?.action) return false;
    if (
      !["submenu-apps", "submenu-ai", "submenu-socials", "submenu-search", "cp-back-button"].includes(
        command.id,
      )
    ) {
      this.close();
    }
    this.recordCommandUsage(command);
    command.action();
    return true;
  }

  clickBtn(id) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.click();
    }
  }

  /**
   * Universal Search Handler with Bang Search Engine Switching (!yt, /g, !sp, !ddg, /w, etc.)
   */
  handleUniversalSearch(query) {
    const trimmed = query.trim();
    const words = trimmed.split(/\s+/);
    const sIdx = words.findIndex(w => w === "/s");
    if (sIdx === -1) return false;

    // Remove "/s" token
    words.splice(sIdx, 1);

    // Look for target engine/platform bang shortcut starting with ! or / (e.g. !yt, /g, !sp, /w, !ddg)
    let targetEngine = null;
    const engineIdx = words.findIndex(w => {
      if (w.startsWith("/") || w.startsWith("!")) {
        const cmd = w.substring(1).toLowerCase();
        return BANG_MAP[cmd] !== undefined;
      }
      return false;
    });

    if (engineIdx !== -1) {
      const engineWord = words[engineIdx];
      const cmd = engineWord.substring(1).toLowerCase();
      targetEngine = BANG_MAP[cmd];
      words.splice(engineIdx, 1);
    }

    const searchQuery = words.join(" ").trim();

    if (window.YD_Search) {
      if (targetEngine) {
        window.YD_Search.setProvider(targetEngine.id, targetEngine.type);
      }
      this.close();
      
      window.YD_Search.els.input.value = searchQuery;
      window.YD_Search.handleSubmit(new Event("submit"));
      return true;
    }
    return false;
  }

  openHelpModal() {
    this.closeHelpModal(true);

    const overlay = document.createElement("div");
    overlay.id = "cp-help-modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "10900";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    overlay.style.backdropFilter = "blur(12px)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    const modal = document.createElement("div");
    modal.className = "modal-box cp-help-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "cp-help-modal-title");
    modal.style.maxWidth = "525px";
    modal.style.width = "90%";
    modal.style.boxShadow = "0 10px 40px rgba(0,0,0,0.6)";
    modal.style.background = "var(--bg-secondary)";
    modal.style.border = "1px solid var(--border-color)";
    modal.style.borderRadius = "16px";
    modal.style.padding = "2rem";
    modal.style.position = "relative";
    modal.addEventListener("click", (e) => e.stopPropagation());

    modal.innerHTML = `
      <button class="modal-close" id="cp-help-modal-close" aria-label="Close command palette help" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.6rem; color: var(--text-secondary); cursor: pointer;">&times;</button>
      <h2 id="cp-help-modal-title" style="color: var(--accent-color); margin-bottom: 0.5rem; text-align: center; font-size: 1.45rem; font-weight: 700;">🎹 Command Palette Guide</h2>
      <p class="modal-subtitle" style="text-align: center; color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 1.5rem;">Productivity Engine & Bang Shortcuts Guide</p>
      
      <div class="info-content" style="display: flex; flex-direction: column; gap: 1rem; max-height: 480px; overflow-y: auto;">
        <div class="info-item" style="background: rgba(0, 0, 0, 0.15); padding: 1.2rem; border-radius: 8px;">
          <strong style="display: block; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.95rem;">⌨️ Key Bindings</strong>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
            • <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">Ctrl + K</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">Cmd + K</code>: Toggle Palette anywhere<br>
            • <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">Arrow Up / Down</code>: Navigate commands list<br>
            • <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">Enter</code>: Execute selected command<br>
            • <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">Escape</code>: Close active panel or modal
          </p>
        </div>
        
        <div class="info-item" style="background: rgba(0, 0, 0, 0.15); padding: 1.2rem; border-radius: 8px;">
          <strong style="display: block; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.95rem;">🎯 Search Engine Bang Shortcuts (!yt, !g, /sp, /w, etc.)</strong>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!g</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/g</code>: Google<br>
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!yt</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/yt</code>: YouTube<br>
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!sp</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/sp</code>: Spotify<br>
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!ddg</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/ddg</code>: DuckDuckGo<br>
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!w</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/w</code>: Wikipedia<br>
            • Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">!r</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/r</code>: Reddit
          </p>
        </div>

        <div class="info-item" style="background: rgba(0, 0, 0, 0.15); padding: 1.2rem; border-radius: 8px;">
          <strong style="display: block; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.95rem;">⚡ Universal Search Syntax</strong>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
            • <strong style="color: var(--accent-color);">Direct Universal Search:</strong> Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/s &lt;query&gt;</code> inside the palette box to launch search on your active search engine.<br>
            • <strong style="color: var(--accent-color);">Targeted Engine Search:</strong> Type <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/s /yt &lt;query&gt;</code> or <code style="background: var(--bg-interactive); padding: 2px 6px; border-radius: 4px; color: var(--accent-color); font-family: monospace;">/s !sp &lt;query&gt;</code> anywhere to route targeted searches via YouTube, Spotify, Google, etc.
          </p>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      modal.classList.add("is-open");
    });

    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeHandler();
        return;
      }
      if (e.key === "Tab") {
        const focusable = overlay.querySelectorAll("button, a[href], input, select, textarea");
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
    let isClosing = false;
    let closeTimer = null;
    const closeHandler = (immediate = false) => {
      if (isClosing && !immediate) return;
      isClosing = true;
      document.removeEventListener("keydown", escHandler);
      overlay.classList.remove("is-open");
      overlay.classList.add("closing");
      const finishClose = () => {
        closeTimer = null;
        overlay.remove();
        if (this._helpModalClose === closeHandler) {
          this._helpModalClose = null;
        }
      };
      if (immediate) {
        if (closeTimer !== null) window.clearTimeout(closeTimer);
        finishClose();
      } else {
        closeTimer = window.setTimeout(finishClose, 250);
      }
    };

    this._helpModalClose = closeHandler;
    overlay
      .querySelector("#cp-help-modal-close")
      .addEventListener("click", closeHandler);
    overlay.addEventListener("click", closeHandler);
    document.addEventListener("keydown", escHandler);
  }

  getShortcutLabel(action) {
    const binding = state.get("keyMap")?.[action];
    if (!binding?.key) return "";
    return binding.key.toUpperCase();
  }

  getCommandShortcutAction(command) {
    const aliases = {
      "settings-full": "settings",
      "zen-mode": "zen",
      "voice-search": "voice",
      "clock-type": "clock",
      "date-visibility": "date",
      "auto-theme": "autoTheme",
      "temperature-display": "tempDisplay",
      "greeting-visibility": "hideGreetings",
      "editable-text-visibility": "showEditableText",
    };
    return aliases[command?.id] || command?.id || null;
  }

  toggleBooleanState(key, defaultValue) {
    const current = state.get(key);
    state.set(key, !(typeof current === "boolean" ? current : defaultValue));
  }

  closeHelpModal(immediate = false) {
    if (this._helpModalClose) {
      this._helpModalClose(immediate);
      return;
    }
    document.getElementById("cp-help-modal-overlay")?.remove();
  }
}
