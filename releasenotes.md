# YourDynamicDashboard - Release Notes

All notable changes to this project will be documented in this file.

---

## [2.1.0] - 2026-02-24 (**MASSIVE UPDATE**)

The **Polish, Privacy & Productivity Update** is here! We rebuilt the UI interactions, squashed critical storage bugs, and added massive customization features to give you total control over your dashboard.

### ✨ New Features

* 📌 **Advanced To-Do List:** Upgraded the task manager with a new Pinning feature to keep high-priority items at the Dashboard.
* 🖱️ **Drag & Drop Engine:** Fully interactive reordering enabled for To-Do tasks, AI Tools, Socials, and Google Apps.
* 🎲 **Random Backgrounds:** Fetch random wallpapers automatically, featuring a new 'Freeze' option to lock in ones you like.
* 👋 **Interactive Onboarding:** Built a reactive Welcome Task system to guide new users through features.
* 🌟 **Glow Control:** Added a dedicated Glow Effect toggle in the Appearance settings.
* 🌡️ **Weather Expansion:** The weather widget now displays daily minimum and maximum temperatures.
* 🔗 **Link Direction:** Added a new setting to control exactly how and where your Shortcuts, AI, Google Apps, etc., open.
* 🎨 **Toxic Palettes:** Added new 'Radioactive' and 'Phosphor' color schemes to the Theme Presets.

### 🚀 Improvements

* **Privacy First:** Hardened the extension's architecture for an even stricter **Privacy-Focused Experience**.
* **Custom Modals:** Completely ripped out ugly native JavaScript alert boxes and replaced them with sleek, theme-matched Custom Modals.
* **SVG Overhaul:** Replaced outdated graphics with crisp, new SVG icons across the UI.
* **Fluid Animations:** Added a new suite of animations to make dashboard interactions feel significantly smoother.
* **Gradient Clarity:** Recalculated Gradient Themes to provide much higher visual clarity and text contrast.
* **Shortcut Expansion:** Added new keyboard shortcuts and improved the responsiveness of the existing hotkeys.
* **Platform Refresh:** Updated the default lineup of AI Tools and Social Media platforms to reflect current trends.
* **Date Formatting:** Upgraded the Day-Date widget to display the full month name for better readability.
* **Core Logic:** Restructured backend execution logic to deliver the **Ultimate User Experience**.

### 🔧 Fixes

* Solved the `localStorage` crash caused by massive Custom Backgrounds by implementing an auto-compression engine.
* Fixed the Voice Search silent failure issue by adding graceful error handling for privacy browsers (like Brave).
* Fixed icon visibility issues for Grok, ChatGPT, X (Twitter), and NotebookLM when used against dark backgrounds.
* Executed a massive sweep of minor UI misalignments and UX friction points.

---

## [2.0.2] - 2026-02-13

This version fixes some common issues.

### 🔧 Fixes

- updated for 2026.
- removed unnecessary files that takes unnecessary storage.
- common bug fixes.

---

## [2.0.1] - 2026-01-16

This version fixes a little bug or issue.

### 🔧 Fixes

- removed unnecessary permission "storage".

---

## [2.0.0] - 2025-12-07 (**MAJOR UPDATE**)

**The Productivity Update** is here! This major release transforms YourDynamicDashboard into a powerful, privacy-first command center with voice controls, instant weather, and deep personalization.

### ✨ New Features

* **🎙️ Voice Search:** Hands-free browsing! Click the microphone icon or press `V` to search using your voice.
* **🧘 Zen Mode:** Overwhelmed? Press `Z` to instantly hide all widgets and focus purely on the clock and wallpaper.
* **☁️ Instant Weather:** No API keys required! We switched to Open-Meteo for privacy-friendly, zero-setup local weather.
* **⌨️ God Mode (Shortcuts):** Navigate without a mouse. Use keys `1-9` for apps, `T` for To-Do, `S` for Settings, and more.
* **🎨 Auto Theme Shuffle:** Automatically cycles through fresh color palettes and gradients on every new tab.
* **👋 Personal Greeting:** Double-click the "Good Morning" text to set your custom nickname.
* **❝ Daily Quotes:** A new motivational quote greets you every time you open a tab.
* **💾 Save Presets:** Created the perfect color combo? Save it as a custom preset.
* **📅 Date & Day:** Added a toggleable display for the current date and day below the clock.

### 🚀 Improvements

* **Smart Search:** Direct "Open" buttons for platforms like YouTube to visit sites without searching.
* **Gradient Themes:** Added a collection of stunning, animated gradient backgrounds.
* **Info Button:** Added a quick-access info button in settings for tips and help.
* **UI/UX Polish:** Significant improvements to animations, button states, and overall smoothness.

### 🔧 Fixes

* **Google Apps Icons:** Fixed sizing inconsistencies where some icons appeared too large or small.
* **Duplicate Contacts:** Resolved a bug where "Google Contacts" appeared twice in the apps menu.
* **Greeting Position:** Corrected the alignment of the greeting text to prevent overlapping.
* **Dark Mode Logic:** Fixed issues where Dark Mode would desync with custom themes.
* **General Stability:** Addressed various reported bugs and performance issues.

---

## [1.1.0] - 2025-08-21

This new version 1.1.0 comes with two new features.

### ✨ New Features

- Added Theme Presets with Colorful Gradient Theme Presets for easy theme choosing.
- Added Social Media along with AI Tools with custom option to select them.

### 🔧 Fixes

- General UI fixes with some minor adjustments.

---

## [1.0.1] - 2025-08-02

This version fixes some issues with new features.

### ✨ New Features

- Added a button in the setting to check for updates.
- Added **Privacy Policy**.

### 🔧 Fixes

- Search result will show in the same tab instead of a new tab (same goes for shortcut open)

---

## [1.0.0] - 2025-08-01

This is the first official stable release of YourDynamicDashboard!

### ✨ New Features

- Dual Clock Modes: Analog and Digital clocks with glow effects.
- Live Weather Widget with geolocation support.
- Fully customizable search with engine and platform switching.
- To-Do List, AI Tools, and Google Apps quick-access panels.
- Personalized shortcuts bar with full add/edit/delete functionality.
- Deep Theming: Dark/Light modes and advanced color pickers for full customization.
- Custom background wallpaper support.
- Settings Backup, Restore, and Reset functionality.

### 🎨 Improvements

- Clean, modern user interface with dynamic effects and animations.
- Optimized for a smooth and responsive user experience.
- Added a one-time welcome popup for new users.
- Included a detailed guide on acquiring a free weather API key.

---

## Development & Beta History

The following notes are from the pre-release development cycle.

### [0.7.0] - _Unreleased_

- **fix:** Addressed overall visual and functional issues and glitches.
- **fix:** Resolved almost all leftover bugs for stability.

### [0.6.0] - _Unreleased_

- **feat:** Added search engines and platforms with a Weather API key input system.
- **fix:** Corrected bugs and some critical errors.

### [0.5.0] - _Unreleased_

- **feat:** Added backup/restore and shortcuts editing features in the settings panel.
- **fix:** Improved overall visual experience with compact and comfort views.
- **docs:** Created all necessary documentation and project files.

### [0.4.0] - _Unreleased_

- **feat:** Added dark/light modes with an Advanced Colors feature.
- **feat:** Implemented a fully functional weather widget and analog clock.
- **fix:** Refined dynamic animations and effects.

### [0.3.0] - _Unreleased_

- **feat:** Implemented the settings panel with basic options.
- **fix:** Corrected display issues with the digital clock on different screen sizes.
- **fix:** Stabilized the extension by fixing critical code errors.

### [0.2.0] - _Unreleased_

- **feat:** Added AI Tools, To-Do-List, and Google Apps panels.
- **feat:** Developed the advanced color picker system for theming.

### [0.1.0] - _Unreleased_

- **chore:** Initial project setup.
- **feat:** Core implementation of the digital clock, greeting text, basic search bar, and a non-functional weather widget placeholder.
