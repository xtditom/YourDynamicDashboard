import {
  CONFIG,
  DEFAULT_KEY_MAP,
  FONT_OPTIONS,
  NEWS_CATEGORIES,
  NEWS_CARD_COUNTS,
  NEWS_HEADLINE_OPACITIES,
  NEWS_PROVIDERS,
  NEWS_REFRESH_INTERVALS,
  SEARCH_PROVIDERS,
  SEARCH_SUGGESTION_MODES,
} from "./config.js";
import {
  sanitizeCustomSearchEngines,
  sanitizeCustomApps,
  sanitizeGoogleAppOverrides,
  sanitizeHiddenApps,
  sanitizeCustomTools,
  sanitizeShortcuts,
} from "./validators.js";

const STATE_SCHEMA_VERSION = 1;
const VERSION_PREFIX = "ydd_state_version:";

class StateManager {
  constructor() {
    this.cache = {};
    this.listeners = [];
    this.storageWarningPending = false;
  }

  versionKey(key) {
    return `${VERSION_PREFIX}${key}`;
  }

  areEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (
      left === null ||
      right === null ||
      typeof left !== "object" ||
      typeof right !== "object"
    ) return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(right, key) && this.areEqual(left[key], right[key]),
    );
  }

  normalizeValue(key, value) {
    if (key === "fontFamily") {
      const savedFontId = String(value || "");
      const legacyFontAliases = {
        poppins: "manrope",
        "dm-sans": "outfit",
        montserrat: "outfit",
      };
      const fontId = legacyFontAliases[savedFontId] || savedFontId;
      if (!FONT_OPTIONS.some((font) => font.id === fontId)) {
        throw new TypeError("Invalid font family");
      }
      return fontId;
    }
    if (key === "newsProviderIds") {
      if (!Array.isArray(value)) throw new TypeError("Invalid news providers");
      const allowed = new Set(NEWS_PROVIDERS.map((provider) => provider.id));
      const normalized = [
        ...new Set(value.filter((id) => typeof id === "string" && allowed.has(id))),
      ];
      const legacyDefault = ["bbc", "guardian", "voa", "npr"];
      if (
        value.length === legacyDefault.length &&
        legacyDefault.every((id) => value.includes(id))
      ) {
        return [...CONFIG.defaults.newsProviderIds];
      }
      return normalized;
    }
    if (key === "newsCategoryIds") {
      if (!Array.isArray(value)) throw new TypeError("Invalid news categories");
      const allowed = new Set(NEWS_CATEGORIES.map((category) => category.id));
      return [...new Set(value.filter((id) => typeof id === "string" && allowed.has(id)))];
    }
    if (key === "newsShowHeadlines" && typeof value !== "boolean") {
      throw new TypeError("Invalid news headline visibility");
    }
    if (key === "newsHeadlineOpacity") {
      const opacity = Number(value);
      if (opacity === 80) return 70;
      if (!NEWS_HEADLINE_OPACITIES.includes(opacity)) {
        throw new TypeError("Invalid news headline opacity");
      }
      return opacity;
    }
    if (key === "newsTotalCards" && !NEWS_CARD_COUNTS.includes(Number(value))) {
      throw new TypeError("Invalid news card count");
    }
    if (
      key === "newsRefreshIntervalMinutes" &&
      !NEWS_REFRESH_INTERVALS.includes(Number(value))
    ) {
      throw new TypeError("Invalid news refresh interval");
    }
    if (key === "newsPosition" && !["top", "bottom"].includes(value)) {
      throw new TypeError("Invalid news position");
    }
    if (key === "newsCache") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Invalid news cache");
      }
      const safeUrl = (candidate) => {
        try {
          const url = new URL(candidate);
          return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
        } catch {
          return "";
        }
      };
      const safeImageUrl = (candidate) => {
        const url = safeUrl(candidate);
        try {
          return url && !/\.(?:avi|m4v|m3u8|mkv|mov|mp4|mpeg|mpg|webm|wmv)$/i.test(
            new URL(url).pathname,
          )
            ? url
            : "";
        } catch {
          return "";
        }
      };
      const items = Array.isArray(value.items)
        ? value.items.slice(0, 30).map((item) => {
            const imageCandidates = [...new Set([
              item?.imageUrl,
              ...(Array.isArray(item?.imageCandidates) ? item.imageCandidates : []),
            ].map(safeImageUrl).filter(Boolean))].slice(0, 8);
            return {
              id: String(item?.id || "").slice(0, 500),
              title: String(item?.title || "").trim().slice(0, 300),
              url: safeUrl(item?.url),
              imageUrl: imageCandidates[0] || "",
              imageCandidates,
              providerId: String(item?.providerId || "").slice(0, 40),
              providerName: String(item?.providerName || "").slice(0, 80),
              publishedAt: Number.isFinite(Number(item?.publishedAt))
                ? Number(item.publishedAt)
                : 0,
            };
          }).filter((item) => item.title && item.url)
        : [];
      return {
        version: 2,
        imageParserVersion: Math.max(0, Number(value.imageParserVersion) || 0),
        ageMinutes: Math.max(0, Number(value.ageMinutes) || 0),
        selectionKey: String(value.selectionKey || "").slice(0, 1000),
        lastAttemptAt: Math.max(0, Number(value.lastAttemptAt) || 0),
        fetchedAt: Math.max(0, Number(value.fetchedAt) || 0),
        items,
        failures: Array.isArray(value.failures)
          ? value.failures.slice(0, 20).map((failure) => String(failure).slice(0, 200))
          : [],
      };
    }
    if (key === "searchSuggestionMode") {
      if (value === "history-local-online") return SEARCH_SUGGESTION_MODES.HISTORY_ONLINE;
      if (value === "history-local") return SEARCH_SUGGESTION_MODES.HISTORY_ONLY;
    }
    if (key === "searchSuggestionProxyUrl") {
      if (value === "") return value;
      const url = new URL(value);
      if (url.protocol !== "https:") throw new TypeError("Suggestion proxy must use HTTPS");
      return url.toString();
    }
    if (key === "userShortcuts") return sanitizeShortcuts(value);
    if (key === "customAiTools") return sanitizeCustomTools(value, "ai");
    if (key === "customApps") return sanitizeCustomApps(value);
    if (key === "googleAppOverrides") return sanitizeGoogleAppOverrides(value);
    if (key === "hiddenApps") return sanitizeHiddenApps(value);
    if (key === "customSearchEngines") return sanitizeCustomSearchEngines(value);
    if (key === "customSocialLinks") return sanitizeCustomTools(value, "social");
    if (key === "searchHistory") {
      if (!Array.isArray(value)) throw new TypeError("Invalid search history");
      return value.filter(
        (item) =>
          item &&
          typeof item.query === "string" &&
          typeof item.engineId === "string" &&
          Number.isFinite(item.timestamp),
      );
    }
    if (key === "searchProvider") {
      const providers = SEARCH_PROVIDERS[value?.type];
      const isCustomSearchEngine =
        value?.type === "engines" &&
        typeof value?.id === "string" &&
        value.id.startsWith("custom-search-");
      if (
        !value ||
        (!isCustomSearchEngine &&
          (!Array.isArray(providers) ||
            !providers.some((provider) => provider.id === value.id))) ||
        (isCustomSearchEngine && !/^custom-search-[a-z0-9-]+$/i.test(value.id))
      ) throw new TypeError("Invalid search provider");
    }
    if (
      key === "shortcutsDisplayMode" &&
      !["shortcuts", "most-visited", "both"].includes(value)
    ) {
      throw new TypeError("Invalid shortcut display mode");
    }
    if (
      key === "searchSuggestionMode" &&
      !Object.values(SEARCH_SUGGESTION_MODES).includes(value)
    ) {
      throw new TypeError("Invalid search suggestion mode");
    }
    if (key === "keyMap") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Invalid key map");
      }
      const migrated = { ...DEFAULT_KEY_MAP };
      Object.keys(value).forEach((action) => {
        const saved = value[action];
        if (typeof saved === "string") migrated[action] = { key: saved, enabled: true };
        else if (saved && typeof saved === "object") {
          migrated[action] = { ...migrated[action], ...saved };
        }
      });
      return migrated;
    }
    const fallback = CONFIG.defaults[key];
    if (fallback !== undefined && !this.isCompatible(fallback, value)) {
      throw new TypeError(`Invalid value for ${key}`);
    }
    return value;
  }

  writeValue(key, value) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError(`The value for ${key} is not serializable.`);
    }
    localStorage.setItem(key, serialized);
    localStorage.setItem(this.versionKey(key), String(STATE_SCHEMA_VERSION));
  }

  get(key) {
    if (this.cache[key] !== undefined) {
      return this.clone(this.cache[key]);
    }

    let fromDisk = null;
    try {
      fromDisk = localStorage.getItem(key);
    } catch (error) {
      console.error(`Could not read ${key} from localStorage:`, error);
      this.showStorageWarning();
      return key === "keyMap"
        ? this.clone(DEFAULT_KEY_MAP)
        : this.clone(CONFIG.defaults[key]);
    }
    if (fromDisk !== null) {
      try {
        const parsed = JSON.parse(fromDisk);

        const storedVersion = Number(localStorage.getItem(this.versionKey(key)) || 0);
        if (!Number.isFinite(storedVersion) || storedVersion > STATE_SCHEMA_VERSION) {
          throw new TypeError(`Unsupported state version for ${key}`);
        }
        const normalized = this.normalizeValue(key, parsed);
        this.cache[key] = normalized;
        if (storedVersion !== STATE_SCHEMA_VERSION || !this.areEqual(normalized, parsed)) {
          try {
            this.writeValue(key, normalized);
          } catch (writeError) {
            console.warn(`Could not persist normalized state for ${key}.`, writeError);
            this.showStorageWarning();
          }
        }
        return this.clone(normalized);
      } catch (e) {
        console.warn(`Corrupt state for ${key}, resetting to its default.`, e);
        try {
          localStorage.removeItem(key);
          localStorage.removeItem(this.versionKey(key));
        } catch (removeError) {
          console.warn(`Could not remove corrupt state for ${key}.`, removeError);
        }
      }
    }

    if (key === "keyMap") return this.clone(DEFAULT_KEY_MAP);

    return this.clone(CONFIG.defaults[key]);
  }

  set(key, value) {
    if (value !== undefined) {
      try {
        value = this.normalizeValue(key, value);
      } catch (error) {
        console.warn(`Rejected invalid state for ${key}.`, error);
        return false;
      }
    }
    const previous = this.get(key);
    if (this.areEqual(previous, value)) return true;

    try {
      if (value === undefined) {
        localStorage.removeItem(key);
        localStorage.removeItem(this.versionKey(key));
      } else {
        this.writeValue(key, value);
      }
    } catch (err) {
      console.error(`Failed to save ${key} to localStorage:`, err);
      this.showStorageWarning();
      return false;
    }

    this.cache[key] = this.clone(value);
    this.notify(key, this.cache[key]);
    return true;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  clearCache(key) {
    delete this.cache[key];
  }

  notify(key, value) {
    this.listeners.forEach((callback) => {
      try {
        callback(key, this.clone(value));
      } catch (error) {
        console.error(`State subscriber failed while handling ${key}:`, error);
      }
    });
  }

  isCompatible(fallback, value) {
    if (fallback === null) return value === null;
    if (Array.isArray(fallback)) return Array.isArray(value);
    if (fallback && typeof fallback === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    return typeof value === typeof fallback;
  }

  clone(value) {
    if (value === undefined || value === null || typeof value !== "object") {
      return value;
    }
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  showStorageWarning() {
    if (this.storageWarningPending) return;
    this.storageWarningPending = true;
    import("./utils.js")
      .then(({ showCustomModal }) =>
        showCustomModal(
          "Your change could not be saved. Browser storage may be full or unavailable. No in-memory setting was changed.",
        ),
      )
      .catch(() => {})
      .finally(() => {
        this.storageWarningPending = false;
      });
  }
}

export const state = new StateManager();
// [src/state.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
