# YourDynamicDashboard — Development README

YourDynamicDashboard (YDD) is a Manifest V3 new-tab dashboard built with vanilla JavaScript and CSS. This branch is the development codebase: it may contain unfinished features, changing contracts, experimental UI, and behavior that is not yet suitable for a store release.

Do not treat this README as a stable-release manual. Store listings and packaged releases are maintained separately.

## Development status

- Development version: `3.0.0` codebase, with ongoing fixes and feature work.
- Build system: none. The extension is loaded directly from source.
- Runtime: browser DOM, Web Storage, IndexedDB, Fetch, Web Speech API, and optional geolocation.
- Frameworks: none; modules are native ES modules.
- Automated test suite: not currently included in this source snapshot; use the syntax checks and manual browser verification below.
- Data policy: settings, shortcuts, themes, search history, tasks, and backgrounds are intended to remain local to the browser.

## Requirements

- A Chromium-based browser with Manifest V3 support (Chrome, Edge, Brave, etc.), or a Gecko browser with MV3 support (Firefox, Zen, LibreWolf, etc.).
- Node.js only for the optional JavaScript syntax checks. No `npm install` or build step is required.
- A secure browser context for voice search. Extension pages normally qualify; a local development page should be served from `localhost` rather than an insecure remote origin.

## Repository layout

```text
.
├── index.html              # New-tab document and static mini-settings markup
├── manifest.json           # Chromium extension manifest
├── firefox-manifest.json   # Gecko-specific development manifest
├── css/                    # Modular stylesheets imported by css/main.css
├── src/
│   ├── main.js             # Application bootstrap and module initialization
│   ├── config.js           # Defaults, providers, fixed shortcuts, and tasks
│   ├── state.js            # Validated localStorage state manager
│   ├── storageKeys.js      # Persisted-key allow-list and migration helpers
│   ├── validators.js       # URL, shortcut, image, and key validation
│   ├── secondStorage.js    # IndexedDB background storage
│   ├── theme-init.js       # Early theme/background preload
│   └── modules/            # Settings, search, palette, weather, widgets, etc.
├── assets/                 # Icons, search providers, themes, and screenshots
├── worker/suggestions/     # Free Cloudflare Worker for online autocomplete
├── privacy-policy.html     # User-facing privacy policy
└── releasenotes.md         # Release-focused notes; this README is dev-focused
```

## Load the development extension

### Chromium

1. Open `chrome://extensions` or the equivalent page in Edge/Brave.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the repository root—the folder containing `manifest.json` and `index.html`.
5. Open a new tab. After source changes, press the extension page’s **Reload** button and open a fresh tab.

### Firefox, Zen, or another Gecko browser

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `firefox-manifest.json` from the repository root.
4. Open a new tab and inspect the page from the browser’s extension tools.

Temporary Gecko installations are removed when the browser restarts. For a persistent test install, package and sign the extension according to the target browser’s rules.

## Deploy the free search-suggestion relay

Online suggestions use the Cloudflare Worker in `worker/suggestions`. A free
`workers.dev` address is sufficient; no domain or paid autocomplete API is
required.

1. Create a free Cloudflare account.
2. From `worker/suggestions`, run `npx wrangler login` and approve the browser login.
3. Run `npx wrangler deploy` and copy the resulting `https://...workers.dev` URL.
4. In `src/modules/suggestions.js`, replace `YOUR-SUBDOMAIN` in
   `ONLINE_SUGGESTION_ENDPOINT` with the assigned subdomain.
5. Open `<worker-url>/suggest?q=today` and verify that it returns a JSON
   `suggestions` array, then reload the extension.

The Worker is deliberately not a general CORS proxy: it accepts only `/suggest`
requests and contacts only DuckDuckGo. Cloudflare observability is disabled in
its configuration, and neither the Worker nor the extension persist prefixes or
results. If the Worker is unavailable or its free quota is exhausted, YDD falls
back silently to local search history.

Users may configure their own HTTPS suggestion endpoint in Full Settings. It
must accept a `q` query parameter, allow extension CORS requests, and return
`{"suggestions":[...]}`. Online results are cached locally with creation and
expiry timestamps for up to 24 hours, then automatically removed.

## Development workflow

1. Edit source files directly; there is no bundler or transpiler.
2. Keep Chromium and Gecko manifest changes synchronized when permissions, icons, resources, or extension metadata change.
3. Reload the unpacked extension after JavaScript or manifest changes.
4. Use the new-tab page DevTools console for runtime errors and the extension manager’s error page for manifest/API errors.
5. Verify both a clean profile and a profile with existing saved state. State migrations and corrupt data handling are part of the application contract.

### Syntax validation

From PowerShell at the repository root:

```powershell
$files = rg --files -g '*.js'
foreach ($file in $files) { node --check $file }
git diff --check
```

Do not start a local server unless the feature under test specifically requires one. The extension itself should be tested from an unpacked browser installation because extension permissions and Web Speech behavior differ from ordinary web pages.

## Architecture notes

- `src/main.js` initializes the dashboard modules in browser order.
- `state.js` is the single state boundary for localStorage. New persisted keys should be added to `storageKeys.js` and given a compatible default in `config.js`.
- `secondStorage.js` stores larger background/theme data in IndexedDB. Background operations must remain serialized and object URLs must be released when replaced.
- `SettingsManager` owns mini settings, theme application, backgrounds, shortcuts, and legacy integration points.
- `FullSettingsModal` dynamically builds the full settings dialog and synchronizes through the shared state manager.
- `Search` owns provider selection, history, voice search, and search overlays. `src/modules/suggestions.js` owns the optional relay-backed DuckDuckGo autocomplete adapter.
- `CommandPalette` exposes command actions and must use the same state contracts as visible controls.
- CSS is split by responsibility and imported through `css/main.css`; theme-specific overrides live in `css/themes.css`.

## Current development contracts

- Users can save up to **20 shortcuts**. The numeric keyboard launcher remains `1`–`9`; the remaining saved shortcuts are available from the shortcuts bar and settings editor.
- `Z` toggles Zen Mode and `V` starts voice search. These fixed actions must not be rebound through the shortcut editor.
- Theme presets are selected from Full Settings. Mini Settings keeps a smaller curated theme set.
- Gradient themes use the transparency/glass UI contract. Custom backgrounds and gradient themes intentionally restrict controls that would conflict with their rendering.
- Full Settings must close on `Escape`, restore focus, and cancel an active key-capture listener.
- Resetting one key binding must not silently create a duplicate active key. If a default key is occupied, the UI must explain the conflict before swapping bindings.
- Search history, custom backgrounds, and saved themes are local browser data. Search suggestions default to history only. The optional online mode sends only the current typed prefix through YDD's Cloudflare Worker to DuckDuckGo, never saves the returned suggestions, and must not be changed into telemetry or remote persistence without an explicit product decision.

## Manual verification checklist

Before considering a development change complete, check the affected behavior in both light and dark themes, and in glass/gradient mode when relevant:

- Fresh profile startup and reload with existing state.
- Full Settings open/close, `Escape`, focus restoration, and drag behavior.
- Mini Settings and Full Settings synchronization.
- Theme changes, custom backgrounds, random/frozen backgrounds, and Auto Theme.
- Search provider changes, history expiry, history-only/local/online suggestions, stale autocomplete responses, keyboard/palette overlays, and voice permission failure.
- Shortcut add/edit/delete/reorder, custom icon reset, URL validation, and the 20-item limit.
- Chromium unpacked loading and Firefox temporary loading when manifest changes are involved.

## Debugging common development problems

### Voice search does not start

Check the browser page permission, the extension/new-tab context, and the DevTools console. Brave-style privacy blocking or a denied microphone permission can throw a synchronous `DOMException`; the UI should recover and leave the search control usable.

### Settings appear to reset

Inspect localStorage for the affected key and check the browser’s “clear data on exit” setting. Background images and larger blobs are stored separately in IndexedDB.

### A manifest change is not visible

Reload the extension from the browser extension manager. A normal page refresh does not reload the manifest.

### A stale UI remains after a change

Close and reopen the relevant overlay, then test from a fresh new tab. Avoid manually editing storage during normal verification unless testing migration or corruption recovery.

## Pull requests and commits

Keep changes focused and describe the user-visible contract being changed. Include:

- affected files and state keys;
- browser contexts manually checked;
- migration or compatibility behavior for existing users;
- a note when verification was limited to syntax/static checks.

Do not commit generated build output, browser profiles, local screenshots, or private storage exports.

## License and privacy

YDD is licensed under GPLv3; see [LICENSE](LICENSE). The project is designed for local-first use. Weather uses Open-Meteo, optional online search suggestions use DuckDuckGo only after explicit opt-in, and optional News Feeds fetch RSS and story images directly from user-selected publishers after explicit opt-in. News metadata is cached locally and no news relay or account is used. Shortcut icons may use Google’s favicon service, and the dashboard typography uses Google Fonts. Voice recognition is provided by the browser’s Web Speech API (with processing location determined by the browser). See [privacy-policy.html](https://ditom.me/YourDynamicDashboard/privacy-policy.html) for the user-facing policy.

## Stable-release references

- Repository: <https://github.com/xtditom/YourDynamicDashboard>
- Live demo: <https://ditom.me/YourDynamicDashboard/>
- Release notes: [releasenotes.md](releasenotes.md)
