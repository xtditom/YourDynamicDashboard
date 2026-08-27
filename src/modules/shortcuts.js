import { state } from "../state.js";
import { getIconUrl, showCustomModal } from "../utils.js";
import { CONFIG } from "../config.js";
import { MIN_SHORTCUTS } from "../validators.js";

function isMicrosoftEdgeBrowser() {
  const userAgent = String(globalThis.navigator?.userAgent || "");
  return /(?:^|[\s;(])(?:Edg|EdgA|EdgiOS|Edge)\/\d/i.test(userAgent);
}

export class Shortcuts {
  constructor() {
    this.container = document.getElementById("shortcuts-container");
    this._renderId = 0;
    this._topSitesCache = null;
    this._topSitesCacheAt = 0;
    this._isEdgeBrowser = isMicrosoftEdgeBrowser();
    this.defaults = [
      { name: "YouTube", url: "https://www.youtube.com" },
      { name: "LinkedIn", url: "https://www.linkedin.com/" },
      { name: "Facebook", url: "https://www.facebook.com" },
      { name: "Reddit", url: "https://www.reddit.com" },
      { name: "Amazon", url: "https://www.amazon.com" },
    ];

    window.__shortcutsInstance = this;
    this.init();
  }

  init() {
    const current = state.get("userShortcuts");

    if (
      this._isEdgeBrowser &&
      state.get("shortcutsDisplayMode") !== "shortcuts"
    ) {
      state.set("shortcutsDisplayMode", "shortcuts");
    }

    this.ensureMinimumShortcuts(current);

    this.render();

    state.subscribe((key) => {
      if (key === "userShortcuts") {
        this.ensureMinimumShortcuts();
        this.render();
      }
      if (key === "shortcutsDisplayMode") {
        this.render();
      }
      if (key === "shortcutsPosition" || key === "showShortcuts") this.updateVisibility();
      if (key === "linkTargets") this.render();
    });

    this.updateVisibility();
  }

  ensureMinimumShortcuts(current = state.get("userShortcuts")) {
    const next = Array.isArray(current) ? [...current] : [];
    if (next.length >= MIN_SHORTCUTS) return true;

    const existingUrls = new Set(next.map((shortcut) => shortcut.url));
    for (const shortcut of this.defaults) {
      if (next.length >= MIN_SHORTCUTS) break;
      if (existingUrls.has(shortcut.url)) continue;
      next.push({
        ...shortcut,
        icon: getIconUrl(shortcut.url),
      });
      existingUrls.add(shortcut.url);
    }

    return next.length >= MIN_SHORTCUTS && state.set("userShortcuts", next);
  }

  _getExtensionApi() {
    if (this._isEdgeBrowser) return null;
    if (globalThis.browser?.permissions) return globalThis.browser;
    if (globalThis.chrome?.permissions) return globalThis.chrome;
    return null;
  }

  async _requestMostVisitedAccess() {
    const api = this._getExtensionApi();
    if (!api) return false;

    try {
      const permission = { permissions: ["topSites"] };
      if (api.permissions?.contains) {
        const alreadyGranted = await api.permissions.contains(permission);
        if (alreadyGranted) return true;
      }
      if (!api.permissions?.request) return Boolean(api.topSites?.get);
      return Boolean(await api.permissions.request(permission));
    } catch (error) {
      console.warn("Could not request topSites permission:", error);
      return false;
    }
  }

  async setDisplayMode(mode) {
    const validModes = ["shortcuts", "most-visited", "both"];
    if (!validModes.includes(mode)) return false;
    if (mode === "shortcuts") return state.set("shortcutsDisplayMode", mode);

    if (this._isEdgeBrowser) {
      await showCustomModal(
        "Microsoft Edge does not support the browser API required for Most Visited Sites. Your manual shortcuts will remain unchanged.",
      );
      return false;
    }

    const granted = await this._requestMostVisitedAccess();
    const api = this._getExtensionApi();
    if (!granted || !api?.topSites?.get) {
      await showCustomModal(
        "Most Visited Sites is unavailable because your browser might not support the required API or the permission was not granted. Your manual shortcuts will remain unchanged.",
      );
      return false;
    }

    return state.set("shortcutsDisplayMode", mode);
  }

  _getHostKey(url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return "";
      return parsed.hostname.toLowerCase().replace(/^www\./, "");
    } catch (error) {
      return "";
    }
  }

  async _getTopSites() {
    const now = Date.now();
    if (this._topSitesCache && now - this._topSitesCacheAt < 60_000) {
      return this._topSitesCache;
    }

    const api = this._getExtensionApi();
    if (!api?.topSites?.get) return [];

    let normalized = [];
    try {
      const sites = await api.topSites.get();
      const seenHosts = new Set();
      normalized = (Array.isArray(sites) ? sites : [])
        .map((site) => {
          const hostKey = this._getHostKey(site?.url);
          if (!hostKey || seenHosts.has(hostKey)) return null;
          seenHosts.add(hostKey);
          let parsed;
          try {
            parsed = new URL(site.url);
          } catch (error) {
            return null;
          }
          return {
            name: String(site.title || parsed.hostname || "Website").trim(),
            url: site.url,
            icon: getIconUrl(site.url),
            source: "most-visited",
            hostKey,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.warn("Could not load top sites:", error);
    }
    this._topSitesCache = normalized;
    this._topSitesCacheAt = now;
    return normalized;
  }

  _getDisplayItems(shortcuts, topSites, mode) {
    const manualItems = shortcuts.map((shortcut) => ({
      ...shortcut,
      source: "shortcut",
      hostKey: this._getHostKey(shortcut.url),
    }));
    if (mode === "shortcuts") return manualItems;
    if (mode === "most-visited") return topSites.slice(0, 10);

    const manualHosts = new Set(
      manualItems.map((item) => item.hostKey).filter(Boolean),
    );
    const topLimit = Math.max(5, 10 - manualItems.length);
    const availableTopSites = topSites.filter(
      (site) => !manualHosts.has(site.hostKey),
    );
    return [...manualItems, ...availableTopSites.slice(0, topLimit)];
  }

  _renderItems(items, renderId) {
    if (!this.container) return;
    this.container.innerHTML = "";

    items.forEach((shortcut, index) => {
      const link = document.createElement("a");
      link.href = shortcut.url;
      link.className = "shortcut-item";
      link.dataset.source = shortcut.source || "shortcut";
      const targets = state.get("linkTargets") || CONFIG.defaults.linkTargets;
      link.target = targets.shortcuts || "_blank";
      link.style.transitionDelay = `${index * 50}ms`;

      const iconDiv = document.createElement("div");
      iconDiv.className = "shortcut-icon";

      const img = document.createElement("img");
      img.className = "ydd-asset-image";
      img.src =
        shortcut.customIcon || shortcut.icon || getIconUrl(shortcut.url);
      img.alt = shortcut.name;
      img.onerror = () => {
        img.style.display = "none";
        const span = document.createElement("span");
        span.className = "shortcut-fallback-text";
        span.textContent = shortcut.name.charAt(0).toUpperCase();
        iconDiv.appendChild(span);
      };

      const label = document.createElement("span");
      label.className = "shortcut-label";
      label.textContent = shortcut.name;

      iconDiv.appendChild(img);
      link.appendChild(iconDiv);
      link.appendChild(label);
      this.container.appendChild(link);
    });
  }

  async render() {
    if (!this.container) return;
    const renderId = ++this._renderId;
    const shortcuts = state.get("userShortcuts") || [];
    const mode = state.get("shortcutsDisplayMode") || "shortcuts";
    const topSites = mode === "shortcuts" ? [] : await this._getTopSites();
    if (renderId !== this._renderId) return;
    this._renderItems(this._getDisplayItems(shortcuts, topSites, mode), renderId);
  }

  updateVisibility() {
    if (!this.container) return;
    
    let position = state.get("shortcutsPosition");
    if (!position) {
      const showLegacy = state.get("showShortcuts");
      if (showLegacy === false) {
        position = "hide";
        state.set("shortcutsPosition", "hide");
      } else {
        position = "bottom";
        state.set("shortcutsPosition", "bottom");
      }
    }

    document.body.classList.remove(
      "shortcuts-at-top",
      "shortcuts-at-bottom",
      "shortcuts-at-left",
      "shortcuts-at-right",
    );
    this.container.classList.remove(
      "position-top",
      "position-bottom",
      "position-left",
      "position-right",
    );

    if (position === "hide") {
      this.container.classList.add("hidden");
    } else {
      this.container.classList.remove("hidden");
      if (position === "top") {
        this.container.classList.add("position-top");
        document.body.classList.add("shortcuts-at-top");
      } else if (position === "left") {
        this.container.classList.add("position-left");
        document.body.classList.add("shortcuts-at-left");
      } else if (position === "right") {
        this.container.classList.add("position-right");
        document.body.classList.add("shortcuts-at-right");
      } else {
        this.container.classList.add("position-bottom");
        document.body.classList.add("shortcuts-at-bottom");
      }
    }
  }
}
// [src/modules/shortcuts.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
