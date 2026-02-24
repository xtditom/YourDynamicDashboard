import { CONFIG, DEFAULT_KEY_MAP } from "./config.js";

class StateManager {
  constructor() {
    this.cache = {};
    this.listeners = [];
  }

  get(key) {
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }

    const fromDisk = localStorage.getItem(key);
    if (fromDisk !== null) {
      try {
        const parsed = JSON.parse(fromDisk);

        if (key === "keyMap") {
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
          return migrated;
        }

        this.cache[key] = parsed;
        return parsed;
      } catch (e) {
        console.warn(`Corrupt state for ${key}, ignoring.`);
      }
    }

    if (key === "keyMap") return { ...DEFAULT_KEY_MAP };

    return CONFIG.defaults[key];
  }

  set(key, value) {
    this.cache[key] = value;

    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error(`Failed to save ${key} to localStorage:`, err);
        if (key === "backgroundImage") {
          import("./utils.js").then(({ showCustomModal }) => {
            showCustomModal(
              "Warning: Image is too large to save permanently, it will reset on refresh.",
            );
          });
        }
      }
    }

    this.notify(key, value);
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify(key, value) {
    this.listeners.forEach((callback) => callback(key, value));
  }
}

export const state = new StateManager();

// src/state.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
