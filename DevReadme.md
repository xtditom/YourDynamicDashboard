# YourDynamicDashboard — Development README

YourDynamicDashboard (YDD) is a Manifest V3 new-tab dashboard built with vanilla JavaScript and CSS. This branch is the development codebase: it may contain unfinished features, changing contracts, experimental UI, and behavior that is not yet suitable for a store release.

Do not treat this README as a stable-release manual. Store listings and packaged releases are maintained separately.

## Development status

- Development version: `3.0.0` codebase, with ongoing fixes and feature work.
- Build system: none. The extension is loaded directly from source.
- Runtime: browser DOM, Web Storage, IndexedDB, Fetch, Web Speech API, optional geolocation, and browser-controlled host permissions for News Feeds.
- Frameworks: none; modules are native ES modules.
- Automated test suite: not currently included in this source snapshot; use the syntax checks and manual browser verification below.
- Data policy: settings, shortcuts, themes, search history, tasks, backgrounds, News metadata, and suggestion cache data are intended to remain local to the browser. Optional online requests are documented in `privacy-policy.html`.

## Requirements

- A Chromium-based browser with Manifest V3 support (Chrome, Edge, Brave, etc.), or a Gecko browser with MV3 support (Firefox, Zen, LibreWolf, etc.).
- Node.js only for the optional JavaScript syntax checks. No `npm install` or build step is required.
- Node.js and `npx wrangler` are needed only when deploying the optional online suggestion Worker.
- A secure browser context for voice search. Extension pages normally qualify; a local development page should be served from `localhost` rather than an insecure remote origin.

## Repository layout

```text
.
├── README.md               # Public and release-facing project README
├── DevReadme.md            # Development workflow and architecture guide
├── index.html              # New-tab document and static mini-settings markup
├── manifest.json           # Chromium extension manifest
├── firefox-manifest.json   # Gecko-specific development manifest
├── assets/                 # Icons, badges, promotional media, and sounds
│   ├── ai-tools/           # AI service icons
│   ├── google-apps/        # Google app icons
│   ├── search-tools/       # Search engine and platform icons
│   ├── socials/            # Social service icons
│   ├── icons/              # Extension icons used by the manifests
│   ├── promo/              # Promotional README images
│   ├── the-showcase/       # Theme and feature showcase images
│   ├── badges/             # README and store badges
│   ├── sounds/             # UI sound effects
│   └── README.md           # Asset usage guide
├── css/                    # Modular stylesheets imported by css/main.css
│   ├── main.css            # CSS entrypoint and cross-theme overrides
│   └── README.md           # CSS responsibility guide
├── src/
│   ├── main.js             # Application bootstrap and module initialization
│   ├── config.js           # Defaults, providers, fixed shortcuts, and tasks
│   ├── state.js            # Validated localStorage state manager
│   ├── storageKeys.js      # Persisted-key allow-list and migration helpers
│   ├── validators.js       # URL, shortcut, image, and key validation
│   ├── secondStorage.js    # IndexedDB background storage
│   ├── theme-init.js       # Early theme/background preload
│   ├── modules/            # Settings, search, palette, weather, news, and widgets
│   │   ├── README.md       # Feature-module responsibility guide
│   │   └── *.js            # Feature-level native ES modules
│   └── README.md           # Core source responsibility guide
├── worker/suggestions/     # Local, Git-ignored Cloudflare Worker workspace
├── privacy-policy.html     # User-facing privacy policy
└── releasenotes.md         # Release-focused notes
```

Folder-specific guides are available in [`assets/README.md`](assets/README.md), [`css/README.md`](css/README.md), [`src/README.md`](src/README.md), and [`src/modules/README.md`](src/modules/README.md).

The `worker/` directory and Wrangler's `.wrangler/` state are excluded by `.gitignore`; never commit local deployment credentials or generated worker state.

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

## Deploy the optional online suggestion relay

Online suggestions can use the Cloudflare Worker in `worker/suggestions`. A
free `workers.dev` address is sufficient; no domain or paid autocomplete API is
required. The local Worker workspace is ignored by Git and is not part of the
extension package.

1. Create a free Cloudflare account.
2. From `worker/suggestions`, run `npx wrangler login` and approve the browser login.
3. Run `npx wrangler deploy` and copy the resulting `https://...workers.dev` URL.
4. Set `ONLINE_SUGGESTION_ENDPOINT` in `src/modules/suggestions.js` to the
   deployed `/suggest` URL, then reload the extension.
5. Open `<worker-url>/suggest?q=today` and verify that it returns a JSON
   `suggestions` array.

The Worker is deliberately not a general CORS proxy: it accepts only `GET`
requests for `/suggest`, validates a two-to-256-character query, returns at
most ten results, and contacts only DuckDuckGo. It does not write queries or
results to a database. Cloudflare may cache responses for up to five minutes,
while the extension caches online results locally for up to 24 hours. If the
Worker is unavailable or its free quota is exhausted, YDD falls back to local
search history.

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

- `src/main.js` initializes the dashboard modules in browser order and gates optional Weather, News, settings, keyboard, and palette features behind their runtime conditions.
- `config.js` defines defaults, fixed providers, AI/social tools, Google Apps, search providers, News sources, categories, and supported UI limits.
- `state.js` is the single state boundary for localStorage. New persisted keys should be added to `storageKeys.js` and given a compatible default in `config.js`.
- `storageKeys.js` owns the persisted-key allow-list, reset behavior, import normalization, and backup validation.
- `secondStorage.js` stores the active background and random-background queue/current records in IndexedDB. Background operations must remain serialized and object URLs must be released when replaced.
- `SettingsManager` owns mini settings, theme application, background lifecycle, shortcut editing, and backup/restore integration.
- `FullSettingsModal` dynamically builds the full settings dialog and synchronizes through the shared state manager.
- `Search` owns provider selection, history, voice search, Google AI/custom search controls, and search overlays. `src/modules/suggestions.js` owns consent, custom-relay validation, and the optional online autocomplete cache.
- `NewsManager` owns direct RSS/RDF and CNN API retrieval, freshness filtering, local News caching, rendering, refresh scheduling, consent, and optional publisher host permissions.
- `AiTools` and `AppGrid` combine built-in entries with validated custom AI, social, and app entries.
- `CommandPalette` exposes dashboard actions, custom commands, and bang search routing; `KeyboardManager` handles its `Ctrl+K`/`Cmd+K` toggle and configurable shortcuts.
- CSS is split by responsibility and imported through `css/main.css`; theme-specific overrides live in `css/themes.css`.

## Current development contracts

- Users can save up to **20 shortcuts**. The numeric keyboard launcher remains `1`–`9`; the remaining saved shortcuts are available from the shortcuts bar and settings editor.
- `Z` toggles Zen Mode and `V` starts voice search. These fixed actions must not be rebound through the shortcut editor.
- Theme presets are selected from Full Settings. Mini Settings keeps a smaller curated theme set.
- Gradient themes use the transparency/glass UI contract. Custom backgrounds and gradient themes intentionally restrict controls that would conflict with their rendering.
- Full Settings must close on `Escape`, restore focus, and cancel an active key-capture listener.
- Resetting one key binding must not silently create a duplicate active key. If a default key is occupied, the UI must explain the conflict before swapping bindings.
- Search history, custom backgrounds, saved themes, News metadata, and suggestion cache data are local browser data. Search suggestions default to History Only. Online modes require consent, send only the current typed prefix to the built-in Worker or a user-provided HTTPS relay, and cache returned suggestions locally for up to 24 hours; the suggestion cache is not included in backups.
- News is disabled by default. Enabling it requires consent and browser access to the selected publisher hosts. RSS/RDF feeds and CNN's publisher API are fetched directly, story metadata is cached locally, and images load directly from publisher servers.
- Backups are user-triggered and use format version `2`; they include validated localStorage data and the active IndexedDB background as a data URL when available. Online suggestion cache data is excluded, and invalid imports must preserve the existing state through rollback.
- Custom AI/social tools, search engines, and apps must pass the shared validators before entering state or the command palette.

## Manual verification checklist

Before considering a development change complete, check the affected behavior in both light and dark themes, and in glass/gradient mode when relevant:

- Fresh profile startup and reload with existing state.
- Full Settings open/close, `Escape`, focus restoration, and drag behavior.
- Mini Settings and Full Settings synchronization.
- Theme changes, custom backgrounds, random/frozen backgrounds, and Auto Theme.
- Search provider changes, Perplexity/Google AI controls, custom search engines, history expiry, History Only/local/online suggestions, relay validation, stale autocomplete responses, keyboard/palette overlays, and voice permission failure.
- News consent, selected provider/category changes, optional host permission grant/removal, source failures, stale stories, image fallback behavior, refresh cooldowns, and local cache reuse.
- Shortcut add/edit/delete/reorder, custom icon reset, URL validation, and the 20-item limit.
- Custom AI/social tools and apps, command-palette synchronization, and malformed custom-entry rejection.
- Backup/restore with an active background, missing IndexedDB, invalid image data, invalid stored URLs/themes/icons, and rollback after a failed import.
- Chromium unpacked loading and Firefox temporary loading when manifest changes are involved.

## Debugging common development problems

### Voice search does not start

Check the browser page permission, the extension/new-tab context, and the DevTools console. Brave-style privacy blocking or a denied microphone permission can throw a synchronous `DOMException`; the UI should recover and leave the search control usable.

### Settings appear to reset

Inspect localStorage for the affected key and check the browser’s “clear data on exit” setting. Background images and larger blobs are stored separately in IndexedDB.

### News or online suggestions do not load

For News, check that the feature is enabled, at least one selected provider and
supported category remain selected, and the browser still grants the selected
host permissions. For online suggestions, check consent, the configured HTTPS
relay, and the `/suggest?q=...` response shape. Both features can fall back to
local data when a request fails.

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

YDD is licensed under GPLv3; see [LICENSE](LICENSE). The project is designed for local-first use. Weather location detection calls the browser’s Geolocation API only after a user clicks a GPS control and accepts the privacy notice, and the browser or operating system controls the location decision. Optional online search suggestions use the built-in DuckDuckGo relay or a user-provided HTTPS relay only after explicit opt-in; prefixes and returned results are cached locally for up to 24 hours, and the built-in Worker may be cached at Cloudflare for up to five minutes. Optional News Feeds fetch RSS/RDF or CNN feed data and story image URLs directly from user-selected publishers after explicit opt-in; News metadata is cached locally and no YDD news relay or account is used. Shortcut icons may use Google’s favicon service, and the selected dashboard font may be loaded on demand from Google Fonts; Lexend mode also loads Inter for the legacy clock and temperature display. Voice recognition is provided by the browser’s Web Speech API, with processing location determined by the browser. See [privacy-policy.html](https://ditom.me/YourDynamicDashboard/privacy-policy.html) for the user-facing policy.

## Stable-release references

- Repository: <https://github.com/xtditom/YourDynamicDashboard>
- Live demo: <https://ditom.me/YourDynamicDashboard/>
- Release notes: [releasenotes.md](releasenotes.md)
