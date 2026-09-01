# CSS

This folder contains the dashboard's modular stylesheets. `main.css` is the entry stylesheet and imports the other files.

- `variables.css` and `themes.css` define shared tokens and theme behavior.
- Layout, widgets, shortcuts, settings, popups, modals, and feature-specific styles are separated by responsibility.
- `responsive.css`, `animations.css`, and `zen-mode.css` handle cross-cutting presentation behavior.

Add new rules to the stylesheet that owns the relevant feature, then ensure it is imported through `main.css`.
