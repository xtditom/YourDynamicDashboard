// src/main.js YourDynamicDashboard (Ditom Baroi Antu - 2025)

import { state } from './state.js';
import { Clock } from './modules/clock.js';
import { Weather } from './modules/weather.js';
import { Search } from './modules/search.js';
import { QuoteWidget } from './modules/quotes.js';
import { TodoManager } from './modules/todo.js';
import { AppGrid } from './modules/apps.js';
import { AiTools } from './modules/aitools.js';
import { Shortcuts } from './modules/shortcuts.js';
import { SettingsManager } from './modules/settings.js';
import { KeyboardManager } from './modules/keyboard.js'; 

document.addEventListener('DOMContentLoaded', () => {

    try {
        new Clock();
        new Weather();
        new Search();
        new QuoteWidget();
        new TodoManager();
        new AppGrid();
        new AiTools();
        new Shortcuts();
        new SettingsManager();
        new KeyboardManager(); 
        
        manageWelcomePopup();
        
    } catch (error) {
        console.error("CRITICAL MODULE ERROR:", error);
    }

    // --- VISUAL CONTROLLER ---
    // Handle global visual states like transparency and gradient mode
    if (state.get('transparencyActive')) document.body.classList.add('transparency-active');
    
    if (state.get('gradientModeActive')) {
        document.body.classList.add('gradient-mode-active');
        document.body.removeAttribute('data-theme');
    } else {
        if (state.get('darkMode')) document.body.setAttribute('data-theme', 'dark');
    }
    
    // Subscribe to state changes for realtime updates
    state.subscribe((key, value) => {
        if (key === 'transparencyActive') {
            document.body.classList.toggle('transparency-active', value);
        }
        if (key === 'gradientModeActive') {
            document.body.classList.toggle('gradient-mode-active', value);
            if (value) {
                document.body.removeAttribute('data-theme');
            } else {
                document.body.setAttribute('data-theme', state.get('darkMode') ? 'dark' : 'light');
            }
        }
        if (key === 'darkMode') {
            if (!state.get('gradientModeActive')) {
                document.body.setAttribute('data-theme', value ? 'dark' : 'light');
            }
        }
        if (key === 'zenMode') {
            document.body.classList.toggle('zen-mode', value);
        }
    });
    
    // --- WELCOME TEXT ---
    const welcomeEl = document.getElementById('welcome-text');
    if (welcomeEl) {
        welcomeEl.textContent = state.get('welcomeText');
        welcomeEl.addEventListener('blur', () => state.set('welcomeText', welcomeEl.textContent));
        welcomeEl.addEventListener('keydown', (e) => { if(e.key === 'Enter') e.target.blur(); });
    }

    setTimeout(() => document.body.classList.add('loaded'), 100);
});

// --- POPUP MANAGER ---
function manageWelcomePopup() {
    const overlay = document.getElementById('welcome-modal-overlay');
    const closeBtn = document.getElementById('welcome-modal-close');
    
    if (!overlay || !closeBtn) return;

    // Version key for showing update modal
    const versionKey = 'welcomeShown_v2.0_widescreen'; 
    const alreadyShown = localStorage.getItem(versionKey);
    
    if (!alreadyShown) {
        overlay.classList.remove('hidden');
    }

    // Close logic
    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        localStorage.setItem(versionKey, 'true');
    });
}

// src/main.js YourDynamicDashboard (Ditom Baroi Antu - 2025)