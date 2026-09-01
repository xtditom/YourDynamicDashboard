# Feature Modules

This folder contains the feature-level ES modules used by the dashboard. Each module owns a focused area such as search, settings, weather, news, shortcuts, tasks, the command palette, or theme-related UI.

Modules are initialized by `src/main.js` and share application data through `src/state.js`. Keep DOM event handling near the feature it controls, reuse shared utilities, and avoid writing directly to persisted storage outside the state and storage helpers.
