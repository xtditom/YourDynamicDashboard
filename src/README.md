# Source

This folder contains the application's core JavaScript and shared runtime services.

- `main.js` bootstraps the new-tab dashboard and initializes feature modules.
- `config.js` stores defaults, providers, shortcuts, and fixed application data.
- `state.js`, `storageKeys.js`, and `validators.js` manage validated local state and persisted data.
- `secondStorage.js` handles larger IndexedDB-backed data such as backgrounds.
- `theme-init.js`, `keywords.js`, and `utils.js` provide startup, search, and shared utility behavior.
- `modules/` contains the individual dashboard features.

Keep persisted values behind the state and storage helpers so validation and migrations remain consistent.
