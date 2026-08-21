import { CONFIG, DEFAULT_KEY_MAP, SEARCH_PROVIDERS } from "./config.js";
import { sanitizeShortcuts } from "./validators.js";

class StateManager {
  constructor() {
    this.cache = {};
    this.listeners = [];
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

        if (key === "keyMap") {
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new TypeError("Invalid key map");
          }
          const migrated = { ...DEFAULT_KEY_MAP };
          Object.keys(parsed).forEach((action) => {
            const savedVal = parsed[action];
            if (typeof savedVal === "string") {
              migrated[action] = { key: savedVal, enabled: true };
            } else {
              migrated[action] = { ...migrated[action], ...savedVal };
            }
          });
          this.cache[key] = migrated;
          return this.clone(migrated);
        }

        if (key === "searchProvider") {
          const providers = SEARCH_PROVIDERS[parsed?.type];
          const isValid =
            Array.isArray(providers) &&
            providers.some((provider) => provider.id === parsed.id);
          if (!isValid) throw new TypeError("Invalid search provider");
        }

        if (key === "searchHistory") {
          if (!Array.isArray(parsed)) {
            throw new TypeError("Invalid search history");
          }
          const sanitized = parsed.filter(
            (item) =>
              item &&
              typeof item.query === "string" &&
              typeof item.engineId === "string" &&
              Number.isFinite(item.timestamp),
          );
          if (sanitized.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(sanitized));
          }
          this.cache[key] = sanitized;
          return this.clone(sanitized);
        }

        if (key === "userShortcuts") {
          const sanitized = sanitizeShortcuts(parsed);
          if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
            localStorage.setItem(key, JSON.stringify(sanitized));
          }
          this.cache[key] = sanitized;
          return this.clone(sanitized);
        }

        const fallback = CONFIG.defaults[key];
        if (fallback !== undefined && !this.isCompatible(fallback, parsed)) {
          throw new TypeError(`Invalid value for ${key}`);
        }

        this.cache[key] = parsed;
        return this.clone(parsed);
      } catch (e) {
        console.warn(`Corrupt state for ${key}, resetting to its default.`, e);
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.warn(`Could not remove corrupt state for ${key}.`, removeError);
        }
      }
    }

    if (key === "keyMap") return this.clone(DEFAULT_KEY_MAP);

    return this.clone(CONFIG.defaults[key]);
  }

  set(key, value) {
    if (key === "userShortcuts") value = sanitizeShortcuts(value);
    const previous = this.get(key);
    const isPrimitive =
      value === null || (typeof value !== "object" && typeof value !== "function");

    // Primitive no-op writes must not notify. Besides avoiding unnecessary work,
    // this prevents subscribers from recursively re-setting the same flag.
    if (isPrimitive && Object.is(previous, value)) return true;

    try {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) {
          throw new TypeError(`The value for ${key} is not serializable.`);
        }
        localStorage.setItem(key, serialized);
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
// [src/state.js] YourDynamicDashboard V2.2 (Ditom Baroi Antu - 2025-26)
