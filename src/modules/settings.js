// src/modules/settings.js YourDynamicDashboard (Ditom Baroi Antu - 2025)
import { state } from '../state.js';
import { getIconUrl } from '../utils.js';
import { DEFAULT_KEY_MAP } from '../config.js'; 

// --- ALIEN DNA (Glass Palettes) ---
const ALIEN_LIGHT = {
    '--bg-secondary': 'rgba(255, 255, 255, 0.25)', 
    '--bg-tertiary': 'rgba(255, 255, 255, 0.35)',
    '--bg-interactive': 'rgba(255, 255, 255, 0.5)',
    '--text-primary': '#1a1a1a',
    '--text-secondary': '#333333',
    '--text-placeholder': '#555555',
    '--accent-color': '#1a1a1a', 
    '--glow-color': 'rgba(0,0,0,0.5)',
    '--icon-filter': 'grayscale(0%)',
    '--icon-opacity': '1'
};

const ALIEN_DARK = {
    '--bg-secondary': 'rgba(0, 0, 0, 0.25)', 
    '--bg-tertiary': 'rgba(0, 0, 0, 0.45)',
    '--bg-interactive': 'rgba(255, 255, 255, 0.1)',
    '--text-primary': '#f0f0f0',
    '--text-secondary': '#d1d5db',
    '--text-placeholder': '#9ca3af',
    '--accent-color': '#f0f0f0',
    '--glow-color': 'rgba(255,255,255,0.7)',
    '--icon-filter': 'grayscale(0%) brightness(1.0)',
    '--icon-opacity': '0.9'
};

const THEMES = {
    normal: [
        // YOUR CUSTOM DEFAULT LIGHT
        { id: 'default-light', type: 'light', name: 'Default Light', colors: { '--bg-primary': '#c3c3c3', '--bg-secondary': '#ffffff', '--bg-tertiary': '#e9e9e9', '--accent-color': '#1a1a1a', '--text-primary': '#1a1a1a', '--text-secondary': '#000000', '--text-placeholder': '#8a8d91', '--glow-color': '#000000' }},
        { id: 'default-dark', type: 'default-dark', name: 'Default Dark', colors: { '--bg-primary': '#000000', '--bg-secondary': '#3a3a3a', '--bg-tertiary': '#2d2d2d', '--accent-color': '#a1a1a1', '--text-primary': '#f9fafb', '--text-secondary': '#d1d5db', '--text-placeholder': '#9ca3af', '--glow-color': '#ffffff' }},
        { id: 'theme-1', type: 'dark', name: 'YDD Standard', colors: { '--bg-primary': '#000000', '--bg-secondary': '#141414', '--bg-tertiary': '#2d2d2d', '--accent-color': '#ff7300', '--text-primary': '#ff7300', '--text-secondary': '#ff7300', '--text-placeholder': '#ff7300', '--glow-color': '#ff7300' }},
        { id: 'theme-2', type: 'dark', name: 'Crimson Red', colors: { '--bg-primary': '#000000', '--bg-secondary': '#000000', '--bg-tertiary': '#2d0000', '--accent-color': '#ed0707', '--text-primary': '#ed0707', '--text-secondary': '#ed0707', '--text-placeholder': '#ed0707', '--glow-color': '#ed0707' }},
        { id: 'theme-3', type: 'light', name: 'Azure Sky', colors: { '--bg-primary': '#c4c4c4', '--bg-secondary': '#006eff', '--bg-tertiary': '#287ff0', '--accent-color': '#ffffff', '--text-primary': '#000000', '--text-secondary': '#ffffff', '--text-placeholder': '#ffffff', '--glow-color': '#006eff' }},
        { id: 'theme-4', type: 'light', name: 'Minty Fresh', colors: { '--bg-primary': '#90c69e', '--bg-secondary': '#FFFFFF', '--bg-tertiary': '#ccffd9', '--accent-color': '#328558', '--text-primary': '#2e8b57', '--text-secondary': '#555555', '--text-placeholder': '#008a10', '--glow-color': '#3cb371' }},
        { id: 'theme-5', type: 'light', name: 'Sakura', colors: { '--bg-primary': '#ffa9d2ff', '--bg-secondary': '#ffc7e3', '--bg-tertiary': '#FFFFFF', '--accent-color': '#ff4da6', '--text-primary': '#C71585', '--text-secondary': '#8B5765', '--text-placeholder': '#ff70a0', '--glow-color': '#5f0030ff' }},
        { id: 'theme-6', type: 'dark', name: 'Cyberpunk', colors: { '--bg-primary': '#0A043C', '--bg-secondary': '#140C4F', '--bg-tertiary': '#221B64', '--accent-color': '#00E5FF', '--text-primary': '#00e5ff', '--text-secondary': '#FF00FF', '--text-placeholder': '#ff00ff', '--glow-color': '#00E5FF' }},
        { id: 'theme-7', type: 'dark', name: 'Forest Mist', colors: { '--bg-primary': '#1A2A27', '--bg-secondary': '#243834', '--bg-tertiary': '#364D47', '--accent-color': '#A8D5BA', '--text-primary': '#E0EFE6', '--text-secondary': '#B0C9BE', '--text-placeholder': '#829E91', '--glow-color': '#A8D5BA' }}
    ],
    gradient: [
        { id: 'electric-sky', name: 'Electric Sky', colors: ['#1580FD', '#9B90FB'], ui: ALIEN_LIGHT },
        { id: 'cotton-candy', name: 'Cotton Candy', colors: ['#ffc0cb', '#ff67f2ff'], ui: ALIEN_LIGHT },
        { id: 'glacier', name: 'Glacier', colors: ['#20e3b2', '#0cb7ebff'], ui: ALIEN_LIGHT },
        { id: 'bio-lime', name: 'Bio Lime', colors: ['#a8ff78', '#007e11ff'], ui: ALIEN_LIGHT },
        { id: 'grey', name: 'Passion', colors: ['#c9c9c9', '#4e4e4e'], ui: ALIEN_DARK },
        { id: 'royal', name: 'Royal', colors: ['#9500ebff', '#257bfcff'], ui: ALIEN_DARK },
        { id: 'deep-space', name: 'Deep Space', colors: ['#302b63', '#0f0c29'], ui: ALIEN_DARK },
        { id: 'ember', name: 'Ember', colors: ['#480048', '#C04848'], ui: ALIEN_DARK },
        { id: 'forest', name: 'Forest', colors: ['#295038', '#0a3314'], ui: ALIEN_DARK }
    ]
};

export class SettingsManager {
    constructor() {
        this.els = {
            btn: document.getElementById('settings-toggle-button'),
            popup: document.getElementById('settings-popup'),
            tabs: document.querySelectorAll('.settings-tab-button'),
            panes: document.querySelectorAll('.settings-pane'),
            clockType: document.getElementById('clock-type-toggle'),
            clockFormat: document.getElementById('clock-format-toggle'),
            clockFormatRow: document.getElementById('clock-format-row'), 
            dateToggle: document.getElementById('date-visibility-toggle'), 
            tempUnit: document.getElementById('temp-unit-toggle'),
            todo: document.getElementById('todo-visibility-toggle'),
            apps: document.getElementById('apps-visibility-toggle'),
            ai: document.getElementById('ai-tools-visibility-toggle'),
            shortcuts: document.getElementById('shortcuts-toggle'),
            dark: document.getElementById('dark-mode-toggle'),
            autoThemeToggle: document.getElementById('auto-theme-toggle'), 
            quote: document.getElementById('quote-position-select'),
            colorControls: document.getElementById('advanced-color-controls'),
            themeColorNote: document.getElementById('theme-color-note'),
            normalContainer: document.getElementById('normal-themes-container'),
            gradientContainer: document.getElementById('gradient-themes-container'),
            savedContainer: document.getElementById('saved-themes-container'),
            saveThemeBtn: document.getElementById('save-current-theme-btn'),
            locInput: document.getElementById('custom-location-input'),
            locSave: document.getElementById('save-location-btn'),
            locDetect: document.getElementById('detect-location-btn'),
            shortcutList: document.getElementById('shortcuts-editor-list'),
            shortcutForm: document.getElementById('add-shortcut-form'),
            uploadBg: document.getElementById('upload-bg-button'),
            bgInput: document.getElementById('bg-file-input'),
            removeBg: document.getElementById('remove-bg-button'),
            backup: document.getElementById('backup-button'),
            restore: document.getElementById('restore-button'),
            restoreInput: document.getElementById('restore-file-input'),
            reset: document.getElementById('reset-button'),
            updateBtn: document.getElementById('check-for-updates-btn'),
            githubBtn: document.getElementById('github-repo-btn'),
            infoBtn: document.getElementById('info-btn'),
            infoOverlay: document.getElementById('info-modal-overlay'),
            infoClose: document.getElementById('info-modal-close'),
            editKeysBtn: document.getElementById('edit-keys-btn'),
            keyOverlay: document.getElementById('key-modal-overlay'),
            keyClose: document.getElementById('key-modal-close'),
            keyList: document.getElementById('key-list'),
            keyReset: document.getElementById('reset-keys-btn')
        };
        
        if (!this.els.btn) return;
        this.init();
    }

    init() {
        this.loadInitialState();
        this.setupEventListeners();
        this.renderThemes();
        this.renderSavedThemes(); 
        this.renderShortcutEditor();

        state.subscribe((key, value) => {
            if (key === 'autoTheme') {
                if (this.els.autoThemeToggle) {
                    this.els.autoThemeToggle.checked = value;
                }
                if (value) {
                    this.applyRandomTheme();
                }
            }
            if (key === 'showDate') {
                if (this.els.dateToggle) {
                    this.els.dateToggle.checked = value;
                }
            }
            if (key === 'clockType') {
                if (this.els.clockType) {
                    this.els.clockType.checked = (value === 'analog');
                }
                this.updateClockFormatState();
            }
        });
    }

    loadInitialState() {
        this.bindSimpleToggle(this.els.clockType, 'clockType', 'analog');
        this.bindSimpleToggle(this.els.clockFormat, 'clockFormat', '24');
        this.bindSimpleToggle(this.els.dateToggle, 'showDate', false); 
        this.bindSimpleToggle(this.els.tempUnit, 'tempUnit', 'imperial');
        this.bindSimpleToggle(this.els.todo, 'showTodo', true);
        this.bindSimpleToggle(this.els.apps, 'showApps', true);
        this.bindSimpleToggle(this.els.ai, 'showAiTools', true);
        this.bindSimpleToggle(this.els.shortcuts, 'showShortcuts', true);
        this.bindSimpleToggle(this.els.autoThemeToggle, 'autoTheme', false); 

        if (this.els.dark) {
            this.els.dark.checked = state.get('darkMode') === true; 
        }

        if (this.els.quote) this.els.quote.value = state.get('quotePosition');
        if (this.els.locInput) this.els.locInput.value = state.get('yd_city') || '';
        
        const bg = state.get('backgroundImage');
        if (bg) {
            document.body.style.backgroundImage = `url(${bg})`;
            if (this.els.removeBg) this.els.removeBg.classList.remove('hidden');
        }

        if (state.get('autoTheme')) {
            this.applyRandomTheme();
        } 
        else {
            const isGradient = state.get('gradientModeActive');
            if (isGradient) {
                const themeId = state.get('gradientThemeId');
                const theme = THEMES.gradient.find(t => t.id === themeId) || THEMES.gradient[0];
                this.applyGradientTheme(theme, false);
            } else {
                const savedId = state.get('normalThemeId');
                
                let theme = THEMES.normal.find(t => t.id === savedId);
                
                if (!theme) {
                    const savedPresets = state.get('userSavedThemes') || [];
                    theme = savedPresets.find(t => t.id === savedId);
                }

                if (theme) {
                    this.applyNormalTheme(theme);
                } else {
                    this.applyCustomColors();
                }
            }
        }
        
        this.updateClockFormatState();
        this.updateWarningText();
    }

    updateClockFormatState() {
        const isAnalog = state.get('clockType') === 'analog';
        if (this.els.clockFormatRow) {
            if (isAnalog) {
                this.els.clockFormatRow.classList.add('disabled');
                if (this.els.clockFormat) this.els.clockFormat.disabled = true;
            } else {
                this.els.clockFormatRow.classList.remove('disabled');
                if (this.els.clockFormat) this.els.clockFormat.disabled = false;
            }
        }
    }

    applyRandomTheme() {
        const pool = [
            ...THEMES.normal.map(t => ({...t, mode: 'normal'})),
            ...THEMES.gradient.map(t => ({...t, mode: 'gradient'}))
        ];
        
        const random = pool[Math.floor(Math.random() * pool.length)];
        
        if (random.mode === 'gradient') {
            this.applyGradientTheme(random, true); 
        } else {
            this.applyNormalTheme(random);
        }
        state.set('autoTheme', true); 
    }

    disableAutoTheme() {
        if (state.get('autoTheme')) {
            state.set('autoTheme', false);
            if (this.els.autoThemeToggle) {
                this.els.autoThemeToggle.checked = false;
            }
        }
    }

    setupEventListeners() {
        this.els.btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            this.els.popup.classList.toggle('visible'); 
            this.renderShortcutEditor();
            this.els.btn.classList.add('animating');
            setTimeout(() => this.els.btn.classList.remove('animating'), 400);
        });

        document.addEventListener('click', (e) => { if (this.els.popup.classList.contains('visible') && !this.els.popup.contains(e.target)) this.els.popup.classList.remove('visible'); });
        this.els.popup.addEventListener('click', (e) => e.stopPropagation());
        
        this.els.tabs.forEach((tab, index) => { 
            tab.addEventListener('click', () => { 
                this.els.tabs.forEach(t => t.classList.remove('active')); 
                this.els.panes.forEach(p => p.classList.remove('active')); 
                tab.classList.add('active'); 
                if (this.els.panes[index]) this.els.panes[index].classList.add('active'); 
            }); 
        });

        if(this.els.quote) this.els.quote.addEventListener('change', (e) => state.set('quotePosition', e.target.value));

        if (this.els.dark) {
            this.els.dark.addEventListener('change', () => {
                this.disableAutoTheme(); 
                const isChecked = this.els.dark.checked;
                state.set('darkMode', isChecked);
                
                const targetTheme = isChecked 
                    ? THEMES.normal.find(t => t.id === 'default-dark') 
                    : THEMES.normal.find(t => t.id === 'default-light');
                this.applyNormalTheme(targetTheme);
            });
        }

        if (this.els.autoThemeToggle) {
            this.els.autoThemeToggle.addEventListener('change', () => {
                if (this.els.autoThemeToggle.checked) {
                    this.applyRandomTheme();
                } else {
                    state.set('autoTheme', false);
                }
            });
        }

        if (this.els.colorControls) {
            this.els.colorControls.addEventListener('input', (e) => {
                if (e.target.classList.contains('color-picker')) {
                    this.disableAutoTheme();
                    
                    if (state.get('darkMode')) {
                        state.set('darkMode', false);
                        if (this.els.dark) this.els.dark.checked = false;
                    }

                    if (state.get('gradientModeActive')) {
                        state.set('gradientModeActive', false);
                        document.body.classList.remove('gradient-mode-active');
                        state.set('transparencyActive', false);
                        document.body.classList.remove('transparency-active');
                        
                        const lastId = state.get('normalThemeId') || 'default-light';
                        let lastTheme = THEMES.normal.find(t => t.id === lastId);
                        
                        if (!lastTheme) lastTheme = THEMES.normal[0];
                        
                        Object.entries(lastTheme.colors).forEach(([k, v]) => {
                            document.body.style.setProperty(k, v);
                            state.set(`custom-${k}`, v);
                        });
                        
                        state.set('normalThemeId', 'custom'); 
                    }
                    
                    const mapping = { 'bg-primary-picker': '--bg-primary', 'bg-secondary-picker': '--bg-secondary', 'bg-tertiary-picker': '--bg-tertiary', 'theme-color-picker': '--accent-color', 'text-primary-picker': '--text-primary', 'text-secondary-picker': '--text-secondary', 'text-placeholder-picker': '--text-placeholder', 'glow-color-picker': '--glow-color' };
                    const cssVar = mapping[e.target.id];
                    if (cssVar) {
                        document.body.style.setProperty(cssVar, e.target.value);
                        state.set(`custom-${cssVar}`, e.target.value);
                    }
                    state.set('normalThemeId', 'custom'); 
                    this.updateWarningText();
                }
            });
        }

        if (this.els.updateBtn) {
            this.els.updateBtn.addEventListener('click', () => { window.open('https://github.com/xtditom/YourDynamicDashboard/releases/latest', '_blank'); });
        }
        if (this.els.githubBtn) {
            this.els.githubBtn.addEventListener('click', () => { window.open('https://github.com/xtditom/YourDynamicDashboard', '_blank'); });
        }

        if (this.els.saveThemeBtn) {
            this.els.saveThemeBtn.addEventListener('click', () => this.saveCurrentTheme());
        }

        if (this.els.infoBtn) {
            this.els.infoBtn.addEventListener('click', () => this.els.infoOverlay.classList.remove('hidden'));
        }
        if (this.els.infoClose) {
            this.els.infoClose.addEventListener('click', () => this.els.infoOverlay.classList.add('hidden'));
        }

        if (this.els.editKeysBtn) {
            this.els.editKeysBtn.addEventListener('click', () => {
                this.renderKeyEditor();
                this.els.keyOverlay.classList.remove('hidden');
            });
        }
        if (this.els.keyClose) {
            this.els.keyClose.addEventListener('click', () => this.els.keyOverlay.classList.add('hidden'));
        }
        if (this.els.keyReset) {
            this.els.keyReset.addEventListener('click', () => {
                if(confirm('Reset keyboard shortcuts to default?')) {
                    state.set('keyMap', null);
                    this.renderKeyEditor();
                }
            });
        }

        this.setupMiscListeners();
    }

    renderKeyEditor() {
        if (!this.els.keyList) return;
        this.els.keyList.innerHTML = '';
        
        if (this.activeKeyCleanup) {
            this.activeKeyCleanup();
        }
        
        const map = state.get('keyMap');
        const labels = {
            todo: 'Toggle To-Do',
            ai: 'Toggle AI Tools',
            apps: 'Toggle Google Apps',
            settings: 'Toggle Settings',
            search: 'Focus Search',
            clock: 'Toggle Clock Mode',
            date: 'Toggle Date',
            autoTheme: 'Toggle Auto Theme'
        };

        Object.entries(labels).forEach(([action, labelText]) => {
            let data = map[action];
            if (!data || typeof data !== 'object') {
                 data = DEFAULT_KEY_MAP[action] || { key: '?', enabled: false };
            }

            const currentKey = data.key;
            const isEnabled = data.enabled;

            const row = document.createElement('div');
            row.className = 'key-row';
            
            const label = document.createElement('span');
            label.textContent = labelText;
            
            const controls = document.createElement('div');
            controls.className = 'key-controls';
            
            const btn = document.createElement('button');
            btn.className = `key-btn ${!isEnabled ? 'disabled' : ''}`;
            btn.textContent = currentKey.toUpperCase();
            btn.disabled = !isEnabled; 
            
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-switch mini';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isEnabled;
            const slider = document.createElement('span');
            slider.className = 'slider';
            
            toggleLabel.appendChild(checkbox);
            toggleLabel.appendChild(slider);

            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const newMap = { ...state.get('keyMap') };
                newMap[action] = { key: currentKey, enabled: checkbox.checked };
                state.set('keyMap', newMap);
                this.renderKeyEditor(); 
            });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.activeKeyCleanup) this.activeKeyCleanup();
                
                const originalText = btn.textContent;
                btn.textContent = '...';
                btn.classList.add('listening');
                btn.style.borderColor = 'var(--accent-color)';
                
                const handler = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    document.removeEventListener('keydown', handler, true);
                    this.activeKeyCleanup = null; 
                    btn.classList.remove('listening');
                    btn.style.borderColor = '';

                    const pressedKey = event.key.toLowerCase();
                    if (event.key === 'Escape') {
                        btn.textContent = originalText;
                        return;
                    }
                    if ((pressedKey >= '1' && pressedKey <= '9') || pressedKey === 'z' || pressedKey === 'v') {
                        btn.textContent = "Reserved!";
                        btn.style.borderColor = '#e53e3e';
                        setTimeout(() => { btn.textContent = originalText; btn.style.borderColor = ''; }, 1000);
                        return;
                    }
                    const currentMap = state.get('keyMap');
                    const existingAction = Object.keys(currentMap).find(k => {
                        const item = currentMap[k];
                        const itemKey = (typeof item === 'object') ? item.key : item; 
                        return itemKey === pressedKey && k !== action && item.enabled;
                    });

                    if (existingAction) {
                        btn.textContent = "Taken!";
                        btn.style.borderColor = '#e53e3e';
                        setTimeout(() => { btn.textContent = originalText; btn.style.borderColor = ''; }, 1000);
                        return;
                    }
                    const newMap = { ...currentMap };
                    newMap[action] = { key: pressedKey, enabled: true };
                    state.set('keyMap', newMap);
                    this.renderKeyEditor(); 
                };
                
                this.activeKeyCleanup = () => {
                    document.removeEventListener('keydown', handler, true);
                    btn.textContent = originalText;
                    btn.classList.remove('listening');
                    btn.style.borderColor = '';
                    this.activeKeyCleanup = null;
                };
                document.addEventListener('keydown', handler, { capture: true });
            });

            controls.appendChild(btn);
            controls.appendChild(toggleLabel);
            row.appendChild(label);
            row.appendChild(controls);
            this.els.keyList.appendChild(row);
        });
        
        const note = document.createElement('div');
        note.className = 'settings-note';
        note.style.marginTop = '1rem';
        note.innerHTML = '<p>Keys <strong>1-9</strong> are reserved for <strong>Shortcuts</strong>.<br>Press <strong>Z</strong> for <strong>Zen Mode</strong>, <strong>V</strong> for <strong>Voice Search</strong></p>';
        this.els.keyList.appendChild(note);
    }

    saveCurrentTheme() {
        if (state.get('gradientModeActive')) {
            alert("Cannot save Gradient themes as presets.");
            return;
        }

        const currentColors = {};
        const vars = ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--accent-color', '--text-primary', '--text-secondary', '--text-placeholder', '--glow-color'];
        
        vars.forEach(v => {
            currentColors[v] = state.get(`custom-${v}`) || getComputedStyle(document.body).getPropertyValue(v).trim();
        });

        const isMatch = THEMES.normal.some(t => JSON.stringify(t.colors) === JSON.stringify(currentColors));
        if (isMatch) {
            alert("This matches a built-in theme. No need to save.");
            return;
        }

        let savedThemes = state.get('userSavedThemes') || [];
        
        if (savedThemes.length >= 5) {
            savedThemes[4] = { id: `preset-${Date.now()}`, name: `Preset 5`, colors: currentColors };
        } else {
            savedThemes.push({ id: `preset-${Date.now()}`, name: `Preset ${savedThemes.length + 1}`, colors: currentColors });
        }

        state.set('userSavedThemes', savedThemes);
        this.renderSavedThemes();
    }

    renderSavedThemes() {
        if (!this.els.savedContainer) return;
        this.els.savedContainer.innerHTML = '';
        const savedThemes = state.get('userSavedThemes') || [];

        for (let i = 0; i < 5; i++) {
            const theme = savedThemes[i];
            const btn = document.createElement('div');
            btn.className = 'saved-preset-button';
            
            if (theme) {
                btn.classList.add('filled');
                btn.textContent = theme.name;
                btn.style.background = theme.colors['--bg-primary'];
                btn.style.color = theme.colors['--text-primary'];
                btn.style.borderColor = theme.colors['--accent-color'];
                
                btn.addEventListener('click', () => {
                    this.disableAutoTheme(); 
                    this.applyNormalTheme(theme); 
                });

                const del = document.createElement('div');
                del.className = 'delete-preset';
                del.innerHTML = '×';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newSaved = savedThemes.filter((_, idx) => idx !== i);
                    newSaved.forEach((t, idx) => t.name = `Preset ${idx + 1}`);
                    state.set('userSavedThemes', newSaved);
                    this.renderSavedThemes();
                });
                btn.appendChild(del);
            } else {
                btn.textContent = "Empty";
            }
            this.els.savedContainer.appendChild(btn);
        }
    }

    applyNormalTheme(theme) {
        state.set('gradientModeActive', false);
        state.set('transparencyActive', false);
        document.body.classList.remove('gradient-mode-active');
        document.body.classList.remove('transparency-active');
        
        if (theme.id) {
            state.set('normalThemeId', theme.id);
        } else {
            state.set('normalThemeId', 'custom');
        }
        
        Object.entries(theme.colors).forEach(([key, val]) => {
            document.body.style.setProperty(key, val);
            state.set(`custom-${key}`, val); 
        });

        if (theme.id === 'default-dark') {
            document.body.style.setProperty('--icon-filter', 'grayscale(100%)');
            document.body.style.setProperty('--icon-opacity', '0.99');
            
            state.set('darkMode', true);
            if (this.els.dark) this.els.dark.checked = true;
        } else {
            document.body.style.setProperty('--icon-filter', 'grayscale(0%)');
            document.body.style.setProperty('--icon-opacity', '1');
            
            state.set('darkMode', false);
            if (this.els.dark) this.els.dark.checked = false;
        }

        this.syncColorPickers(theme.colors);
        
        const isDarkType = theme.type === 'dark' || theme.type === 'default-dark';
        document.body.setAttribute('data-theme', isDarkType ? 'dark' : 'light');
        
        this.updateWarningText();
    }

    applyGradientTheme(theme, save = true) {
        if (save) {
            state.set('gradientModeActive', true);
            state.set('gradientThemeId', theme.id);
            state.set('transparencyActive', true);
        }
        
        state.set('darkMode', false);
        if (this.els.dark) this.els.dark.checked = false;
        
        document.body.style.setProperty('--gradient-color-1', theme.colors[0]);
        document.body.style.setProperty('--gradient-color-2', theme.colors[1]);
        
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        const timings = ['ease', 'linear', 'ease-in-out'];
        const randomAngle = angles[Math.floor(Math.random() * angles.length)];
        const randomTiming = timings[Math.floor(Math.random() * timings.length)];
        
        document.body.style.setProperty('--gradient-angle', `${randomAngle}deg`);
        document.body.style.setProperty('--gradient-timing', randomTiming);
        
        document.body.classList.add('gradient-mode-active');
        document.body.classList.add('transparency-active');
        document.body.removeAttribute('data-theme');

        Object.entries(theme.ui).forEach(([key, val]) => {
            document.body.style.setProperty(key, val);
        });

        this.updateWarningText();
    }

    applyCustomColors() {
        if (state.get('gradientModeActive')) return;
        
        const defaultFallback = THEMES.normal[1].colors; 
        
        const vars = ['--bg-primary', '--bg-secondary', '--accent-color', '--text-primary', '--bg-tertiary', '--text-secondary', '--text-placeholder', '--glow-color'];
        
        const colors = {};
        vars.forEach(v => {
            const saved = state.get(`custom-${v}`) || defaultFallback[v] || getComputedStyle(document.body).getPropertyValue(v).trim();
            if(saved) {
                document.body.style.setProperty(v, saved);
                colors[v] = saved;
            }
        });
        this.syncColorPickers(colors);
        document.body.style.setProperty('--icon-filter', 'grayscale(0%)');
        document.body.style.setProperty('--icon-opacity', '1');
    }

    async searchLocation() {
        const city = this.els.locInput.value.trim();
        if (!city) return;
        this.els.locSave.textContent = "...";
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const loc = data.results[0];
                state.set('yd_city', loc.name);
                state.set('yd_lat', loc.latitude);
                state.set('yd_lon', loc.longitude);
                state.set('locationUpdate', Date.now()); 
                this.els.locSave.textContent = "Saved";
                this.els.locInput.value = loc.name; 
                setTimeout(() => { this.els.locSave.textContent = "Save"; }, 2000);
            } else {
                alert(`Could not find city: "${city}".`);
                this.els.locSave.textContent = "Save";
            }
        } catch (e) {
            alert("Connection error.");
            this.els.locSave.textContent = "Save";
        }
    }

    updateWarningText() {
        const isGradient = state.get('gradientModeActive');
        if (this.els.themeColorNote) {
            this.els.themeColorNote.style.display = 'none';
        }
        
        if (this.els.colorControls) {
            if (isGradient) {
                this.els.colorControls.classList.add('disabled');
            } else {
                this.els.colorControls.classList.remove('disabled');
            }
        }
    }

    syncColorPickers(colors) {
        const mapping = { '--bg-primary': 'bg-primary-picker', '--bg-secondary': 'bg-secondary-picker', '--bg-tertiary': 'bg-tertiary-picker', '--accent-color': 'theme-color-picker', '--text-primary': 'text-primary-picker', '--text-secondary': 'text-secondary-picker', '--text-placeholder': 'text-placeholder-picker', '--glow-color': 'glow-color-picker' };
        Object.entries(colors).forEach(([key, val]) => { const id = mapping[key]; if (id) { const el = document.getElementById(id); if (el) el.value = val; } });
    }

    renderThemes() {
        const createBtn = (container, list, isGradient) => {
            if (!container) return;
            container.innerHTML = '';
            list.forEach(theme => {
                const btn = document.createElement('button');
                btn.className = `theme-preset-button ${isGradient ? 'gradient' : ''}`;
                btn.textContent = theme.name;
                if (isGradient) {
                    btn.style.background = `linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})`;
                } else {
                    btn.style.background = theme.colors['--bg-primary'];
                    btn.style.color = theme.colors['--text-primary'];
                    btn.style.borderColor = theme.colors['--accent-color'];
                }
                btn.addEventListener('click', () => {
                    this.disableAutoTheme(); 
                    if (isGradient) this.applyGradientTheme(theme);
                    else this.applyNormalTheme(theme);
                });
                container.appendChild(btn);
            });
        };
        createBtn(this.els.normalContainer, THEMES.normal, false);
        createBtn(this.els.gradientContainer, THEMES.gradient, true);
    }

    bindSimpleToggle(el, key, trueValue) {
        if (!el) return;
        const current = state.get(key);
        if (key === 'showDate') {
            if (current === undefined || current === null) {
                state.set(key, false);
                el.checked = false;
            } else {
                el.checked = current === true;
            }
        } else if (key === 'autoTheme') {
            if (current === undefined) {
                state.set(key, false);
                el.checked = false;
            } else {
                el.checked = current === true;
            }
        } else {
            if (typeof trueValue === 'boolean') {
                el.checked = current === trueValue;
            } else {
                el.checked = current === trueValue;
            }
        }

        el.addEventListener('change', () => {
            const val = typeof trueValue === 'boolean' ? el.checked : (el.checked ? trueValue : (key === 'clockFormat' ? '12' : 'digital'));
            if (key === 'tempUnit') state.set(key, el.checked ? 'imperial' : 'metric');
            else state.set(key, val);
        });
    }

    setupMiscListeners() {
        this.els.locSave.addEventListener('click', () => this.searchLocation());
        this.els.locDetect.addEventListener('click', () => {
            state.set('yd_city', ''); 
            this.els.locInput.value = '';
            state.set('locationUpdate', Date.now());
            alert("Auto-detection enabled.");
        });
        this.els.uploadBg.addEventListener('click', () => this.els.bgInput.click());
        this.els.bgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    state.set('backgroundImage', ev.target.result);
                    document.body.style.backgroundImage = `url(${ev.target.result})`;
                    this.els.removeBg.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
        this.els.removeBg.addEventListener('click', () => { state.set('backgroundImage', null); document.body.style.backgroundImage = ''; this.els.removeBg.classList.add('hidden'); });
        if (this.els.shortcutForm) {
            this.els.shortcutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const inputs = this.els.shortcutForm.querySelectorAll('input');
                this.addShortcut(inputs[0].value, inputs[1].value);
                inputs[0].value = '';
                inputs[1].value = '';
            });
        }
        this.els.backup.addEventListener('click', () => this.backup());
        this.els.restore.addEventListener('click', () => this.els.restoreInput.click());
        this.els.restoreInput.addEventListener('change', (e) => this.restore(e));
        this.els.reset.addEventListener('click', () => { if(confirm("Reset all settings?")) { localStorage.clear(); location.reload(); } });
    }

    renderShortcutEditor() {
        if (!this.els.shortcutList) return;
        this.els.shortcutList.innerHTML = '';
        const shortcuts = state.get('userShortcuts') || [];
        shortcuts.forEach((s, index) => {
            const div = document.createElement('div');
            div.className = 'shortcut-editor-item';
            div.draggable = true;
            div.dataset.index = index;
            div.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">☰</div>
                <img src="${s.icon}" class="icon">
                <div class="inputs">
                    <input type="text" class="name-input" value="${s.name}" placeholder="Name">
                    <input type="text" class="url-input" value="${s.url}" placeholder="URL">
                </div>
                <div class="actions">
                    <button class="action-btn save" title="Save"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></button>
                    <button class="action-btn delete" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
            `;
            const saveBtn = div.querySelector('.save');
            const delBtn = div.querySelector('.delete');
            const nameInput = div.querySelector('.name-input');
            const urlInput = div.querySelector('.url-input');
            saveBtn.addEventListener('click', () => { this.updateShortcut(index, nameInput.value, urlInput.value); saveBtn.style.color = 'var(--accent-color)'; setTimeout(() => saveBtn.style.color = '', 500); });
            delBtn.addEventListener('click', () => this.deleteShortcut(index));
            div.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); div.classList.add('dragging'); });
            div.addEventListener('dragend', () => { div.classList.remove('dragging'); });
            div.addEventListener('dragover', (e) => { e.preventDefault(); });
            div.addEventListener('drop', (e) => { e.preventDefault(); const fromIndex = parseInt(e.dataTransfer.getData('text/plain')); const toIndex = index; this.reorderShortcuts(fromIndex, toIndex); });
            this.els.shortcutList.appendChild(div);
        });
    }

    addShortcut(name, url) {
        if (!name || !url) return;
        const current = [...(state.get('userShortcuts') || [])];
        current.push({ name, url, icon: getIconUrl(url) });
        state.set('userShortcuts', current);
        this.renderShortcutEditor();
    }

    updateShortcut(index, name, url) {
        const current = [...(state.get('userShortcuts') || [])];
        if (current[index]) {
            current[index].name = name;
            current[index].url = url;
            current[index].icon = getIconUrl(url); 
            state.set('userShortcuts', current);
        }
    }

    deleteShortcut(index) {
        const current = [...(state.get('userShortcuts') || [])];
        current.splice(index, 1);
        state.set('userShortcuts', current);
        this.renderShortcutEditor();
    }

    reorderShortcuts(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        const current = [...(state.get('userShortcuts') || [])];
        const item = current.splice(fromIndex, 1)[0];
        current.splice(toIndex, 0, item);
        state.set('userShortcuts', current);
        this.renderShortcutEditor();
    }
    
    backup() { const data = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); data[key] = localStorage.getItem(key); } const blob = new Blob([JSON.stringify(data)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ydd-backup.json'; a.click(); }
    restore(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target.result); Object.keys(data).forEach(key => localStorage.setItem(key, data[key])); location.reload(); } catch (err) { alert("Invalid Backup File"); } }; reader.readAsText(file); }
}

// src/modules/settings.js YourDynamicDashboard (Ditom Baroi Antu - 2025)