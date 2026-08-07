import { state } from "../state.js";
import { GOOGLE_APPS, AI_TOOLS, SOCIAL_LINKS } from "../config.js";

// Complete Bang Mapping for Search Engines & Platforms
export const BANG_MAP = {
  // Search Engines
  "g": { id: "google", type: "engines" },
  "google": { id: "google", type: "engines" },
  "b": { id: "bing", type: "engines" },
  "bing": { id: "bing", type: "engines" },
  "y": { id: "yahoo", type: "engines" },
  "yahoo": { id: "yahoo", type: "engines" },
  "br": { id: "brave", type: "engines" },
  "brave": { id: "brave", type: "engines" },
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

export class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.activeIndex = 0;
    this.currentMenu = "main"; // "main", "apps", "ai", "socials"

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
          const infoOverlay = document.getElementById("info-modal-overlay");
          if (infoOverlay) infoOverlay.classList.remove("hidden");
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
      }
    ];

    // 2. Google Apps commands
    this.appCommands = [];
    (GOOGLE_APPS || []).forEach(app => {
      if (app.name && app.name !== "divider") {
        this.appCommands.push({
          id: `app-${app.name.toLowerCase()}`,
          name: app.name,
          icon: "🚀",
          shortcut: "",
          action: () => {
            const targets = state.get("linkTargets") || {};
            window.open(app.url, targets.apps || "_blank");
          }
        });
      }
    });

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

    this.filteredCommands = [...this.mainCommands];
    this.init();
  }

  init() {
    this.createDomElements();
    this.registerEvents();
    window.YD_CommandPalette = this;
  }

  createDomElements() {
    if (document.getElementById("cp-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "cp-modal-overlay";
    overlay.className = "hidden";

    overlay.innerHTML = `
      <div class="cp-modal">
        <div class="cp-header">
          <div class="cp-search-wrapper">
            <span class="cp-search-icon">🔍</span>
            <input type="text" id="cp-search-input" placeholder="Type a command or search... (Esc to close)" autocomplete="off" />
          </div>
          <span class="cp-esc-badge">Esc</span>
        </div>
        <div id="cp-command-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    this.els = {
      overlay,
      input: overlay.querySelector("#cp-search-input"),
      list: overlay.querySelector("#cp-command-list")
    };
  }

  registerEvents() {
    const badge = document.getElementById("search-cp-badge");
    if (badge) {
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        this.open();
      });
    }

    this.els.overlay.addEventListener("click", (e) => {
      if (e.target === this.els.overlay) {
        this.close();
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      } else if (e.key === "Backspace" && this.els.input.value === "" && this.currentMenu !== "main") {
        e.preventDefault();
        this.switchMenu("main");
      }
    });
  }

  open() {
    this.isOpen = true;
    this.els.overlay.classList.remove("hidden");
    this.els.input.value = "";
    this.currentMenu = "main";
    this.activeIndex = 0;
    this.filter("");
    
    setTimeout(() => {
      this.els.input.focus();
    }, 50);
  }

  close() {
    this.isOpen = false;
    this.els.overlay.classList.add("hidden");
    this.els.input.blur();
  }

  switchMenu(menuName) {
    const validMenus = ["main", "apps", "ai", "socials"];
    const targetMenu = validMenus.includes(menuName) ? menuName : "main";
    this.currentMenu = targetMenu;
    this.els.input.value = "";
    this.activeIndex = 0;
    
    const placeholders = {
      main: "Type a command or search... (Esc to close)",
      apps: "Search Google Apps... (Backspace to go back)",
      ai: "Search AI Tools... (Backspace to go back)",
      socials: "Search Social Links... (Backspace to go back)"
    };
    this.els.input.placeholder = placeholders[targetMenu];
    
    this.filter("");
    setTimeout(() => {
      this.els.input.focus();
    }, 50);
  }

  filter(text) {
    const query = text.toLowerCase().trim();

    if (this.currentMenu === "main" && query !== "") {
      // Unified search crawls all commands across all categories
      const allSearchable = [
        ...this.mainCommands.filter(c => c.id !== "submenu-apps" && c.id !== "submenu-ai" && c.id !== "submenu-socials"),
        ...this.appCommands,
        ...this.aiCommands,
        ...this.socialCommands
      ];
      this.filteredCommands = allSearchable.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.id.toLowerCase().includes(query)
      );
    } else {
      let baseList = [];
      if (this.currentMenu === "main") {
        baseList = this.mainCommands;
      } else if (this.currentMenu === "apps") {
        baseList = this.appCommands;
      } else if (this.currentMenu === "ai") {
        baseList = this.aiCommands;
      } else if (this.currentMenu === "socials") {
        baseList = this.socialCommands;
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

      if (c.shortcut) {
        const badge = document.createElement("span");
        badge.className = "cp-item-badge";
        badge.textContent = c.shortcut;
        item.appendChild(badge);
      }

      item.addEventListener("click", () => {
        this.activeIndex = idx;
        this.execute();
      });

      this.els.list.appendChild(item);

      if (idx === this.activeIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  execute() {
    const cmd = this.filteredCommands[this.activeIndex];
    if (cmd && cmd.action) {
      if (cmd.id !== "submenu-apps" && cmd.id !== "submenu-ai" && cmd.id !== "submenu-socials" && cmd.id !== "cp-back-button") {
        this.close();
      }
      cmd.action();
    }
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
    const existing = document.getElementById("cp-help-modal-overlay");
    if (existing) existing.remove();

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
    modal.className = "modal-box";
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
      <button class="modal-close" id="cp-help-modal-close" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.6rem; color: var(--text-secondary); cursor: pointer;">&times;</button>
      <h2 style="color: var(--accent-color); margin-bottom: 0.5rem; text-align: center; font-size: 1.45rem; font-weight: 700;">🎹 Command Palette Guide</h2>
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

    const closeHandler = () => overlay.remove();

    overlay.querySelector("#cp-help-modal-close").addEventListener("click", closeHandler);
    overlay.addEventListener("click", closeHandler);

    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeHandler();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }
}
