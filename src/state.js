// src/state.js YourDynamicDashboard (Ditom Baroi Antu - 2025)

import { CONFIG, DEFAULT_KEY_MAP } from './config.js';

class StateManager {
    constructor() {
        this.cache = {};
        this.listeners = [];
    }

    get(key) {
        // 1. Check Cache
        if (this.cache[key] !== undefined) {
            return this.cache[key];
        }

        // 2. Check Disk (localStorage)
        const fromDisk = localStorage.getItem(key);
        if (fromDisk !== null) {
            try {
                const parsed = JSON.parse(fromDisk);
                
                // KeyMap Migration Logic (Handle old string vs new object)
                if (key === 'keyMap') {
                    const migrated = { ...DEFAULT_KEY_MAP };
                    Object.keys(parsed).forEach(action => {
                        const savedVal = parsed[action];
                        if (typeof savedVal === 'string') {
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

        // 3. Fallback to Defaults
        if (key === 'keyMap') return { ...DEFAULT_KEY_MAP };
        
        return CONFIG.defaults[key];
    }

    set(key, value) {
        this.cache[key] = value;
        
        // Only remove if UNDEFINED. Null is a valid value (used for custom themes).
        if (value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
        
        this.notify(key, value);
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify(key, value) {
        this.listeners.forEach(callback => callback(key, value));
    }
}

export const state = new StateManager();

// src/state.js YourDynamicDashboard (Ditom Baroi Antu - 2025)