import { CONFIG, DEFAULT_KEY_MAP, SEARCH_PROVIDERS } from "./config.js";
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
