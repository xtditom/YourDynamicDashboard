// settings.js (Ditom Baroi Antu)

// --- NEW: Normal Theme Presets (PLACEHOLDER COLORS) ---
const normalThemes = [
    // You can replace these color codes with your own
    { id: 'default-light', name: 'Default Light', colors: { '--bg-primary': '#bdbdbd', '--bg-secondary': '#ffffff', '--bg-tertiary': '#ffffff', '--accent-color': '#1a1a1a', '--text-primary': '#1a1a1a', '--text-secondary': '#65676b', '--text-placeholder': '#8a8d91', '--glow-color': '#000000' }},
    { id: 'default-dark', name: 'Default Dark', colors: { '--bg-primary': '#000000', '--bg-secondary': '#3a3a3a', '--bg-tertiary': '#2d2d2d', '--accent-color': '#a1a1a1', '--text-primary': '#f9fafb', '--text-secondary': '#d1d5db', '--text-placeholder': '#9ca3af', '--glow-color': '#ffffff' }},
    { id: 'theme-1', name: 'YDD Standard', colors: { '--bg-primary': '#000000', '--bg-secondary': '#141414', '--bg-tertiary': '#2d2d2d', '--accent-color': '#ff7300', '--text-primary': '#ff7300', '--text-secondary': '#ff7300', '--text-placeholder': '#ff7300', '--glow-color': '#ff7300' }},
    { id: 'theme-2', name: 'Crimson Red', colors: { '--bg-primary': '#000000', '--bg-secondary': '#000000', '--bg-tertiary': '#2d0000', '--accent-color': '#ed0707', '--text-primary': '#ed0707', '--text-secondary': '#ed0707', '--text-placeholder': '#ed0707', '--glow-color': '#ed0707' }},
    { id: 'theme-3', name: 'Azure Sky', colors: { '--bg-primary': '#f5f5f5', '--bg-secondary': '#006eff', '--bg-tertiary': '#006eff', '--accent-color': '#ffffff', '--text-primary': '#000000', '--text-secondary': '#ffffff', '--text-placeholder': '#ffffff', '--glow-color': '#006eff' }},
    { id: 'theme-4', name: 'Minty Fresh', colors: { '--bg-primary': '#c2d6c7', '--bg-secondary': '#FFFFFF', '--bg-tertiary': '#E6F8EB', '--accent-color': '#3CB371', '--text-primary': '#2E8B57', '--text-secondary': '#555555', '--text-placeholder': '#888888', '--glow-color': '#3CB371' }},
    { id: 'theme-5', name: 'Sakura', colors: { '--bg-primary': '#FFc7e2', '--bg-secondary': '#FFdbed', '--bg-tertiary': '#FFECF0', '--accent-color': '#FF69B4', '--text-primary': '#C71585', '--text-secondary': '#8B5765', '--text-placeholder': '#A9818E', '--glow-color': '#FF69B4' }},
    { id: 'theme-6', name: 'Cyberpunk', colors: { '--bg-primary': '#0A043C', '--bg-secondary': '#140C4F', '--bg-tertiary': '#221B64', '--accent-color': '#00E5FF', '--text-primary': '#00e5ff', '--text-secondary': '#FF00FF', '--text-placeholder': '#ff00ff', '--glow-color': '#00E5FF' }},
    { id: 'theme-7', name: 'Forest Mist', colors: { '--bg-primary': '#1A2A27', '--bg-secondary': '#243834', '--bg-tertiary': '#364D47', '--accent-color': '#A8D5BA', '--text-primary': '#E0EFE6', '--text-secondary': '#B0C9BE', '--text-placeholder': '#829E91', '--glow-color': '#A8D5BA' }}
];

const gradientThemes = [
    { id: 'oceanic', name: 'Oceanic', colors: ['#5eaeffff', '#ae8bffff'], type: 'light' },
    { id: 'sunset', name: 'Sunset', colors: ['#fddb92', '#ff67f2ff'], type: 'light' },
    { id: 'meadow', name: 'Meadow', colors: ['#c5cbe6ff', '#5effe1ff'], type: 'light' },
    { id: 'lush', name: 'Lush', colors: ['#2acf09ff', '#b7df4aff'], type: 'light' },
    { id: 'grey', name: 'Passion', colors: ['#c9c9c9', '#4e4e4e'], type: 'dark' },
    { id: 'royal', name: 'Royal', colors: ['#6b03cc', '#2575fc'], type: 'dark' },
    { id: 'cosmic', name: 'Cosmic', colors: ['#141e30', '#243b55'], type: 'dark' },
    { id: 'ember', name: 'Ember', colors: ['#480048', '#C04848'], type: 'dark' },
    { id: 'forest', name: 'Forest', colors: ['#295038', '#0a3314ff'], type: 'dark' }
];

function renderNormalThemes() {
    const container = document.getElementById('normal-themes-container');
    if (!container) return;
    container.innerHTML = '';
    const currentThemeId = localStorage.getItem('normalThemeId');

    normalThemes.forEach(theme => {
        const button = document.createElement('button');
        button.className = 'theme-preset-button';
        button.dataset.themeId = theme.id;
        button.title = theme.name;
        button.style.background = theme.colors['--bg-primary'];
        button.style.borderColor = theme.colors['--accent-color'];
        button.style.color = theme.colors['--text-primary'];
        button.textContent = theme.name;

        if (theme.id === currentThemeId) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}

function renderGradientThemes() {
    const container = document.getElementById('gradient-themes-container');
    if (!container) return;
    container.innerHTML = '';
    const currentThemeId = localStorage.getItem('gradientThemeId');

    gradientThemes.forEach(theme => {
        const button = document.createElement('button');
        button.className = 'theme-preset-button gradient';
        button.dataset.themeId = theme.id;
        button.title = theme.name;
        button.style.background = `linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})`;
        
        if (theme.id === currentThemeId) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}

function renderShortcutEditor() {
    const editorList = document.getElementById('shortcuts-editor-list');
    if (!editorList) return;
    editorList.innerHTML = '';
    userShortcuts.forEach((shortcut, index) => {
        const item = document.createElement('div');
        item.className = 'shortcut-editor-item';
        item.innerHTML = `
            <img src="${shortcut.icon}" class="icon" alt="">
            <div class="inputs">
                <input type="text" class="shortcut-edit-name" value="${shortcut.name}" data-index="${index}">
                <input type="url" class="shortcut-edit-url" value="${shortcut.url}" data-index="${index}">
            </div>
            <div class="actions">
                <button class="save-shortcut-btn" data-index="${index}" title="Save Changes">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </button>
                <button class="delete-shortcut-btn" data-index="${index}" title="Delete Shortcut">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        editorList.appendChild(item);
    });
}


document.addEventListener('DOMContentLoaded', () => {

    const settingsToggleButton = document.getElementById('settings-toggle-button');
    const settingsPopup = document.getElementById('settings-popup');
    const clockTypeToggle = document.getElementById('clock-type-toggle');
    const clockFormatRow = document.getElementById('clock-format-row');
    const clockFormatToggle = document.getElementById('clock-format-toggle');
    const tempUnitToggle = document.getElementById('temp-unit-toggle');
    const shortcutsToggle = document.getElementById('shortcuts-toggle');
    const aiToolsVisibilityToggle = document.getElementById('ai-tools-visibility-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const uploadBgButton = document.getElementById('upload-bg-button');
    const bgFileInput = document.getElementById('bg-file-input');
    const removeBgButton = document.getElementById('remove-bg-button');
    const todoVisibilityToggle = document.getElementById('todo-visibility-toggle');
    const appsVisibilityToggle = document.getElementById('apps-visibility-toggle');
    
    const backupButton = document.getElementById('backup-button');
    const restoreButton = document.getElementById('restore-button');
    const restoreFileInput = document.getElementById('restore-file-input');
    const resetButton = document.getElementById('reset-button');

    const updateButton = document.getElementById('check-for-updates-btn');
    if (updateButton) {
    updateButton.addEventListener('click', () => {
        window.open('https://github.com/xtditom/YourDynamicDashboard/releases/latest');
    });
    }
    
    const weatherApiKeyInput = document.getElementById('weather-api-key-input');
    const saveApiKeyButton = document.getElementById('save-api-key-button');

    const functionsTab = document.getElementById('functions-tab');
    const appearanceTab = document.getElementById('appearance-tab');
    const shortcutsTab = document.getElementById('shortcuts-tab');
    const functionsContent = document.getElementById('functions-content');
    const appearanceContent = document.getElementById('appearance-content');
    const shortcutsContent = document.getElementById('shortcuts-content');

    const addShortcutForm = document.getElementById('add-shortcut-form');
    const shortcutNameInput = document.getElementById('shortcut-name-input');
    const shortcutUrlInput = document.getElementById('shortcut-url-input');
    const shortcutsEditorList = document.getElementById('shortcuts-editor-list');

    const normalThemesContainer = document.getElementById('normal-themes-container');
    const gradientThemesContainer = document.getElementById('gradient-themes-container');
    
    const advancedColorControls = document.getElementById('advanced-color-controls');
    
    // --- NEW: Get the note element ---
    const themeColorNote = document.getElementById('theme-color-note');

    const advancedColorPickers = [
        { id: 'bg-primary-picker', variable: '--bg-primary' },
        { id: 'bg-secondary-picker', variable: '--bg-secondary' },
        { id: 'bg-tertiary-picker', variable: '--bg-tertiary' },
        { id: 'theme-color-picker', variable: '--accent-color' },
        { id: 'text-primary-picker', variable: '--text-primary' },
        { id: 'text-secondary-picker', variable: '--text-secondary' },
        { id: 'text-placeholder-picker', variable: '--text-placeholder' },
        { id: 'glow-color-picker', variable: '--glow-color' }
    ];
    
    const pickerMap = new Map(advancedColorPickers.map(p => [p.variable, p.id]));

    const settingsKeys = [
        'clockFormat', 'clockType', 'tempUnit', 'darkMode', 'showTodo', 'showApps', 
        'showShortcuts', 'showAiTools', 'welcomeText', 'userShortcuts', 'todos', 
        'currentSearch', 'backgroundImage', 'weatherApiKey', 'welcomeShown',
        'gradientModeActive', 'transparencyActive', 'gradientThemeId', 'gradientThemeType', 'normalThemeId'
    ].concat(advancedColorPickers.map(p => `custom-${p.variable}`));

    function saveSetting(key, value) {
        localStorage.setItem(key, value);
    }
    
    // --- NEW: Function to control visibility of note and advanced controls ---
    function updateAppearanceControlsState() {
        if (!themeColorNote || !advancedColorControls) return;

        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        const isGradientMode = localStorage.getItem('gradientModeActive') === 'true';
        const isAdvancedDisabled = isDarkMode || isGradientMode;

        advancedColorControls.classList.toggle('disabled', isAdvancedDisabled);
        themeColorNote.classList.toggle('hidden', !isAdvancedDisabled);
    }

    function loadSettings() {
        const clockType = localStorage.getItem('clockType') || 'digital';
        if (clockTypeToggle) clockTypeToggle.checked = clockType === 'analog';
        if (clockFormatRow) clockFormatRow.classList.toggle('disabled', clockType === 'analog');

        if (clockFormatToggle) clockFormatToggle.checked = (localStorage.getItem('clockFormat') || '12') === '24';
        if (tempUnitToggle) tempUnitToggle.checked = (localStorage.getItem('tempUnit') || 'metric') === 'imperial';
        
        if (weatherApiKeyInput) {
            weatherApiKeyInput.value = localStorage.getItem('weatherApiKey') || '';
        }

        if (todoVisibilityToggle) todoVisibilityToggle.checked = localStorage.getItem('showTodo') !== 'false';
        if (appsVisibilityToggle) appsVisibilityToggle.checked = localStorage.getItem('showApps') !== 'false';

        if (shortcutsToggle) shortcutsToggle.checked = localStorage.getItem('showShortcuts') !== 'false';
        if (aiToolsVisibilityToggle) aiToolsVisibilityToggle.checked = localStorage.getItem('showAiTools') !== 'false';
        
        const darkMode = localStorage.getItem('darkMode') !== 'false';
        if (darkModeToggle) darkModeToggle.checked = darkMode;

        const savedBg = localStorage.getItem('backgroundImage');
        if (removeBgButton) removeBgButton.classList.toggle('hidden', !savedBg);

        const rootStyles = getComputedStyle(document.documentElement);
        advancedColorPickers.forEach(picker => {
            const element = document.getElementById(picker.id);
            if (element) {
                const savedValue = localStorage.getItem(`custom-${picker.variable}`);
                element.value = savedValue || rootStyles.getPropertyValue(picker.variable).trim();
            }
        });
        
        updateAppearanceControlsState(); // Call on load
    }

    function dispatchSettingChange(key, value) {
        const event = new CustomEvent('settingChanged', { detail: { key, value } });
        document.dispatchEvent(event);
    }
    
    function applyNormalTheme(theme) {
        saveSetting('gradientModeActive', 'false');
        dispatchSettingChange('gradientModeActive', false);
        saveSetting('transparencyActive', 'false');
        dispatchSettingChange('transparencyActive', false);

        Object.entries(theme.colors).forEach(([variable, color]) => {
            saveSetting(`custom-${variable}`, color);
            document.documentElement.style.setProperty(variable, color);
            
            const pickerId = pickerMap.get(variable);
            if (pickerId) {
                const pickerElement = document.getElementById(pickerId);
                if (pickerElement) pickerElement.value = color;
            }
        });

        const isDark = theme.id.includes('dark');
        saveSetting('darkMode', isDark);
        dispatchSettingChange('darkMode', isDark);
        if (darkModeToggle) darkModeToggle.checked = isDark;
    }

    function backupSettings() {
        const settingsToBackup = {};
        settingsKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                settingsToBackup[key] = value;
            }
        });

        const blob = new Blob([JSON.stringify(settingsToBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ydd-settings-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function restoreSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredSettings = JSON.parse(e.target.result);
                localStorage.clear();
                Object.keys(restoredSettings).forEach(key => {
                    if (settingsKeys.includes(key)) {
                        localStorage.setItem(key, restoredSettings[key]);
                    }
                });
                location.reload();
            } catch (error) {
                console.error("Error parsing restore file:", error);
                alert("Error: Could not restore settings. The file might be corrupt.");
            }
        };
        reader.readAsText(file);
    }

    function resetSettings() {
        if (confirm("Are you sure you want to reset all settings? This action cannot be undone.")) {
            localStorage.clear();
            location.reload();
        }
    }

    function manageSettingsEvents() {
        if (settingsToggleButton) {
            settingsToggleButton.addEventListener('click', (event) => {
                event.stopPropagation();
                settingsPopup.classList.toggle('visible');
                renderShortcutEditor();
                settingsToggleButton.classList.add('animating');
                setTimeout(() => settingsToggleButton.classList.remove('animating'), 400);
            });
        }
        
        if (clockTypeToggle) clockTypeToggle.addEventListener('change', () => {
            const newType = clockTypeToggle.checked ? 'analog' : 'digital';
            saveSetting('clockType', newType);
            dispatchSettingChange('clockType', newType);
            if (clockFormatRow) clockFormatRow.classList.toggle('disabled', newType === 'analog');
        });

        if (clockFormatToggle) clockFormatToggle.addEventListener('change', () => {
            const newFormat = clockFormatToggle.checked ? '24' : '12';
            saveSetting('clockFormat', newFormat);
            dispatchSettingChange('clockFormat', newFormat);
        });
        if (tempUnitToggle) tempUnitToggle.addEventListener('change', () => {
            const newUnit = tempUnitToggle.checked ? 'imperial' : 'metric';
            saveSetting('tempUnit', newUnit);
            dispatchSettingChange('tempUnit', newUnit);
        });

        if (saveApiKeyButton) {
            saveApiKeyButton.addEventListener('click', () => {
                const newApiKey = weatherApiKeyInput.value.trim();
                saveSetting('weatherApiKey', newApiKey);
                dispatchSettingChange('weatherApiKey', newApiKey);
                saveApiKeyButton.textContent = 'Saved!';
                setTimeout(() => {
                    saveApiKeyButton.textContent = 'Save';
                }, 1500);
            });
        }

        if (todoVisibilityToggle) todoVisibilityToggle.addEventListener('change', () => {
            const isVisible = todoVisibilityToggle.checked;
            saveSetting('showTodo', isVisible);
            dispatchSettingChange('showTodo', isVisible);
        });
        if (appsVisibilityToggle) appsVisibilityToggle.addEventListener('change', () => {
            const isVisible = appsVisibilityToggle.checked;
            saveSetting('showApps', isVisible);
            dispatchSettingChange('showApps', isVisible);
        });

        if (shortcutsToggle) shortcutsToggle.addEventListener('change', () => {
            const isVisible = shortcutsToggle.checked;
            saveSetting('showShortcuts', isVisible);
            dispatchSettingChange('showShortcuts', isVisible);
        });
        if (aiToolsVisibilityToggle) aiToolsVisibilityToggle.addEventListener('change', () => {
            const isVisible = aiToolsVisibilityToggle.checked;
            saveSetting('showAiTools', isVisible);
            dispatchSettingChange('showAiTools', isVisible);
        });
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => {
                const isEnabled = darkModeToggle.checked;
                saveSetting('darkMode', isEnabled);
                dispatchSettingChange('darkMode', isEnabled);
                
                localStorage.removeItem('normalThemeId');
                document.querySelectorAll('#normal-themes-container .theme-preset-button').forEach(btn => btn.classList.remove('active'));
                
                updateAppearanceControlsState(); // Call on change
            });
        }
        if (uploadBgButton && bgFileInput) {
            uploadBgButton.addEventListener('click', () => bgFileInput.click());
            bgFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        saveSetting('backgroundImage', event.target.result);
                        document.body.style.backgroundImage = `url(${event.target.result})`;
                        if (removeBgButton) removeBgButton.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        if (removeBgButton) {
            removeBgButton.addEventListener('click', () => {
                localStorage.removeItem('backgroundImage');
                document.body.style.backgroundImage = '';
                removeBgButton.classList.add('hidden');
            });
        }

        if (normalThemesContainer) {
            normalThemesContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.theme-preset-button');
                if (!button) return;

                const themeId = button.dataset.themeId;
                const selectedTheme = normalThemes.find(t => t.id === themeId);
                
                if (selectedTheme) {
                    saveSetting('normalThemeId', themeId);
                    localStorage.removeItem('gradientThemeId');
                    applyNormalTheme(selectedTheme);
                    updateAppearanceControlsState(); // Call on change
                }

                document.querySelectorAll('.theme-preset-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        }

        if (gradientThemesContainer) {
            gradientThemesContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.theme-preset-button');
                if (!button) return;

                const themeId = button.dataset.themeId;
                const selectedTheme = gradientThemes.find(t => t.id === themeId);
                
                if (selectedTheme) {
                    saveSetting('gradientThemeId', themeId);
                    saveSetting('gradientThemeType', selectedTheme.type);
                    localStorage.removeItem('normalThemeId');

                    saveSetting('gradientModeActive', 'true');
                    dispatchSettingChange('gradientModeActive', true);
                    saveSetting('transparencyActive', 'true');
                    dispatchSettingChange('transparencyActive', true);
                    
                    dispatchSettingChange('gradientThemeChanged', selectedTheme);
                    updateAppearanceControlsState(); // Call on change
                }

                document.querySelectorAll('.theme-preset-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        }

        if (backupButton) backupButton.addEventListener('click', backupSettings);
        if (restoreButton) restoreButton.addEventListener('click', () => restoreFileInput.click());
        if (restoreFileInput) restoreFileInput.addEventListener('change', restoreSettings);
        if (resetButton) resetButton.addEventListener('click', resetSettings);

        if (advancedColorControls) {
            advancedColorControls.addEventListener('input', (e) => {
                if (e.target.classList.contains('color-picker')) {
                    const picker = advancedColorPickers.find(p => p.id === e.target.id);
                    if (picker) {
                        const newColor = e.target.value;
                        saveSetting(`custom-${picker.variable}`, newColor);
                        document.documentElement.style.setProperty(picker.variable, newColor);

                        saveSetting('gradientModeActive', 'false');
                        dispatchSettingChange('gradientModeActive', false);
                        saveSetting('transparencyActive', 'false');
                        dispatchSettingChange('transparencyActive', false);
                        localStorage.removeItem('normalThemeId');
                        localStorage.removeItem('gradientThemeId');
                        document.querySelectorAll('.theme-preset-button').forEach(btn => btn.classList.remove('active'));
                        updateAppearanceControlsState(); // Call on change
                    }
                }
            });
        }

        if (addShortcutForm) {
            addShortcutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addShortcut(shortcutNameInput.value, shortcutUrlInput.value);
                shortcutNameInput.value = '';
                shortcutUrlInput.value = '';
            });
        }

        if (shortcutsEditorList) {
            shortcutsEditorList.addEventListener('click', (e) => {
                const saveButton = e.target.closest('.save-shortcut-btn');
                const deleteButton = e.target.closest('.delete-shortcut-btn');

                if (saveButton) {
                    const index = saveButton.dataset.index;
                    const nameInput = shortcutsEditorList.querySelector(`.shortcut-edit-name[data-index="${index}"]`);
                    const urlInput = shortcutsEditorList.querySelector(`.shortcut-edit-url[data-index="${index}"]`);
                    updateShortcut(index, nameInput.value, urlInput.value);
                }

                if (deleteButton) {
                    const index = deleteButton.dataset.index;
                    deleteShortcut(index);
                }
            });
        }

        const tabs = [functionsTab, appearanceTab, shortcutsTab];
        const panes = [functionsContent, appearanceContent, shortcutsContent];

        tabs.forEach((tab, index) => {
            if (tab) {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    panes.forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    if (panes[index]) panes[index].classList.add('active');
                });
            }
        });
    }

    console.log("Settings module loaded.");
    loadSettings();
    manageSettingsEvents();
    renderNormalThemes();
    renderGradientThemes();
});

// settings.js (Ditom Baroi Antu)