// settings.js (Ditom Baroi Antu)

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
    const themeColorNote = document.getElementById('theme-color-note');

    const addShortcutForm = document.getElementById('add-shortcut-form');
    const shortcutNameInput = document.getElementById('shortcut-name-input');
    const shortcutUrlInput = document.getElementById('shortcut-url-input');
    const shortcutsEditorList = document.getElementById('shortcuts-editor-list');


    const advancedColorPickers = [
        { id: 'bg-primary-picker', key: 'custom-bg-primary', variable: '--bg-primary' },
        { id: 'bg-secondary-picker', key: 'custom-bg-secondary', variable: '--bg-secondary' },
        { id: 'bg-tertiary-picker', key: 'custom-bg-tertiary', variable: '--bg-tertiary' },
        { id: 'theme-color-picker', key: 'themeColor', variable: '--accent-color' },
        { id: 'text-primary-picker', key: 'custom-text-primary', variable: '--text-primary' },
        { id: 'text-secondary-picker', key: 'custom-text-secondary', variable: '--text-secondary' },
        { id: 'text-placeholder-picker', key: 'custom-text-placeholder', variable: '--text-placeholder' },
        { id: 'glow-color-picker', key: 'custom-glow-color', variable: '--glow-color' }
    ];

    const settingsKeys = [
        'clockFormat', 'clockType', 'tempUnit', 'darkMode', 'showTodo', 'showApps', 
        'showShortcuts', 'showAiTools', 'welcomeText', 'userShortcuts', 'todos', 
        'currentSearch', 'backgroundImage', 'weatherApiKey', 'welcomeShown'
    ].concat(advancedColorPickers.map(p => p.key));

    function saveSetting(key, value) {
        localStorage.setItem(key, value);
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
        if (themeColorNote) themeColorNote.classList.toggle('hidden', !darkMode);

        const savedBg = localStorage.getItem('backgroundImage');
        if (removeBgButton) removeBgButton.classList.toggle('hidden', !savedBg);

        const rootStyles = getComputedStyle(document.documentElement);
        advancedColorPickers.forEach(picker => {
            const element = document.getElementById(picker.id);
            if (element) {
                const savedValue = localStorage.getItem(picker.key);
                element.value = savedValue || rootStyles.getPropertyValue(picker.variable).trim();
            }
        });
    }

    function dispatchSettingChange(key, value) {
        const event = new CustomEvent('settingChanged', { detail: { key, value } });
        document.dispatchEvent(event);
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
        if (window.confirm("Are you sure you want to reset all settings? This action cannot be undone.")) {
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
                document.body.setAttribute('data-theme', isEnabled ? 'dark' : 'light');
                if (themeColorNote) themeColorNote.classList.toggle('hidden', !isEnabled);

                const newThemeStyles = getComputedStyle(document.documentElement);
                advancedColorPickers.forEach(picker => {
                    const element = document.getElementById(picker.id);
                    const isCustomColorSaved = localStorage.getItem(picker.key);
                    if (!isCustomColorSaved && element) {
                        element.value = newThemeStyles.getPropertyValue(picker.variable).trim();
                    }
                });
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
                document.body.style.backgroundImage = 'none';
                removeBgButton.classList.add('hidden');
            });
        }

        if (backupButton) backupButton.addEventListener('click', backupSettings);
        if (restoreButton) restoreButton.addEventListener('click', () => restoreFileInput.click());
        if (restoreFileInput) restoreFileInput.addEventListener('change', restoreSettings);
        if (resetButton) resetButton.addEventListener('click', resetSettings);

        advancedColorPickers.forEach(picker => {
            const element = document.getElementById(picker.id);
            if (element) {
                element.addEventListener('input', (e) => {
                    const newColor = e.target.value;
                    saveSetting(picker.key, newColor);
                    document.documentElement.style.setProperty(picker.variable, newColor);
                });
            }
        });

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
});

// settings.js (Ditom Baroi Antu)