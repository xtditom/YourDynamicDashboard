import { CONFIG } from "./config.js";
import {
  normalizeStoredBackgroundUrl,
  normalizeStoredImageDataUrl,
  normalizeStoredThemeColor,
  sanitizeCustomApps,
  sanitizeCustomSearchEngines,
  sanitizeCustomTools,
  sanitizeGoogleAppOverrides,
  sanitizeSavedThemes,
  sanitizeShortcuts,
} from "./validators.js";

const EXTRA_STORAGE_KEYS = [
  "activeToolTab",
  "aiToolsOrder",
  "customAiTools",
  "customApps",
  "customSearchEngines",
  "customSocialLinks",
  "backgroundImage",
  "bgBlurIntensity",
  "bgSavedDate",
  "completedDefaultTaskIds",
  "defaultTasksPinned",
  "glowEffect",
  "googleAppsOrder",
  "gradientModeActive",
  "gradientThemeId",
  "has_idb_bg",
  "hideGpsConsent",
  "hideGreetings",
  "hideVoiceSearch",
  "keyMap",
  "lastSettingsView",
  "locationUpdate",
  "lowResBg",
  "randomBgMode",
  "randomBgCurrentPreview",
  "randomBgLastChangedAt",
  "randomBgLastChangedDate",
  "randomBgNextPreview",
  "randomBgNextUrl",
  "randomBgScheduleBadgeDismissed",
  "randomBgRefreshWarningDismissed",
  "randomBgSchedule",
  "randomBgTime",
  "savedBgUrl",
  "showDate",
  "showEditableText",
  "showShortcuts",
  "socialToolsOrder",
  "tempDisplayMode",
  "transparencyActive",
  "userName",
  "userSavedThemes",
  "userShortcuts",
  "welcomeRewardShown",
  "yd_city",
  "yd_lat",
  "yd_lon",
];

const YDD_STORAGE_KEYS = new Set([
  ...Object.keys(CONFIG.defaults),
  ...EXTRA_STORAGE_KEYS,
]);

const RAW_STORAGE_KEYS = new Set([
  "activeToolTab",
  "has_idb_bg",
  "hideGpsConsent",
  "lowResBg",
]);

const INTERNAL_STORAGE_KEYS = new Set(["ydd_daily_greeting"]);
const BACKGROUND_URL_KEYS = new Set([
  "backgroundImage",
  "savedBgUrl",
  "randomBgNextUrl",
]);
const BACKGROUND_PREVIEW_KEYS = new Set([
  "randomBgCurrentPreview",
  "randomBgNextPreview",
]);
const IMPORT_VALUE_NORMALIZERS = new Map([
  ["userShortcuts", (value) => requireArray(value, "shortcuts") && sanitizeShortcuts(value)],
  ["customAiTools", (value) => requireArray(value, "custom AI tools") && sanitizeCustomTools(value, "ai")],
  ["customSocialLinks", (value) => requireArray(value, "custom social links") && sanitizeCustomTools(value, "social")],
  ["customApps", (value) => requireArray(value, "custom apps") && sanitizeCustomApps(value)],
  ["customSearchEngines", (value) => requireArray(value, "custom search engines") && sanitizeCustomSearchEngines(value)],
  ["googleAppOverrides", (value) => requireObject(value, "Google app overrides") && sanitizeGoogleAppOverrides(value)],
  ["userSavedThemes", normalizeImportedSavedThemes],
]);

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError("Invalid " + label + ".");
  return true;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Invalid " + label + ".");
  }
  return true;
}

function normalizeImportedSavedThemes(value) {
  if (!Array.isArray(value)) throw new TypeError("Invalid saved themes.");
  const normalized = sanitizeSavedThemes(value);
  if (normalized.length !== value.length) {
    throw new TypeError("Invalid saved theme.");
  }
  return normalized;
}

function normalizeImportedJsonValue(key, value) {
  if (BACKGROUND_URL_KEYS.has(key)) return normalizeStoredBackgroundUrl(value);
  if (BACKGROUND_PREVIEW_KEYS.has(key)) return normalizeStoredImageDataUrl(value);
  if (key.startsWith("custom---")) return normalizeStoredThemeColor(key, value);
  return IMPORT_VALUE_NORMALIZERS.get(key)?.(value) ?? value;
}

function shouldNormalizeImportedValue(key) {
  return (
    BACKGROUND_URL_KEYS.has(key) ||
    BACKGROUND_PREVIEW_KEYS.has(key) ||
    key.startsWith("custom---") ||
    IMPORT_VALUE_NORMALIZERS.has(key)
  );
}

export function isYddStorageKey(key) {
  return (
    YDD_STORAGE_KEYS.has(key) ||
    key.startsWith("custom---") ||
    key.startsWith("welcomeShown_")
  );
}

export function getYddStorageEntries() {
  const entries = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && isYddStorageKey(key)) entries[key] = localStorage.getItem(key);
  }
  return entries;
}

export function clearYddLocalStorage() {
  const keys = new Set([
    ...Object.keys(getYddStorageEntries()),
    ...INTERNAL_STORAGE_KEYS,
  ]);
  keys.forEach((key) => localStorage.removeItem(key));
}

export function validateYddStorageEntries(entries) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    throw new TypeError("Backup settings must be an object.");
  }

  const filtered = {};
  Object.entries(entries).forEach(([key, rawValue]) => {
    if (!isYddStorageKey(key)) return;
    if (typeof rawValue !== "string") {
      throw new TypeError(`Invalid stored value for ${key}.`);
    }

    if (key === "activeToolTab" && !["ai", "social"].includes(rawValue)) {
      throw new TypeError("Invalid active tool tab.");
    }
    if (
      ["has_idb_bg", "hideGpsConsent"].includes(key) &&
      !["true", "false"].includes(rawValue)
    ) {
      throw new TypeError(`Invalid stored flag for ${key}.`);
    }
    if (!RAW_STORAGE_KEYS.has(key) && !key.startsWith("welcomeShown_")) {
      const parsedValue = JSON.parse(rawValue);
      if (shouldNormalizeImportedValue(key)) {
        filtered[key] = JSON.stringify(normalizeImportedJsonValue(key, parsedValue));
        return;
      }
    }
    filtered[key] = rawValue;
  });

  if (Object.keys(filtered).length === 0) {
    throw new TypeError("Backup contains no YourDynamicDashboard settings.");
  }

  return filtered;
}

// [src/storageKeys.js] YourDynamicDashboard V3.0.0
