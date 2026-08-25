import { CONFIG } from "./config.js";

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
  Object.keys(getYddStorageEntries()).forEach((key) =>
    localStorage.removeItem(key),
  );
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
      JSON.parse(rawValue);
    }
    filtered[key] = rawValue;
  });

  if (Object.keys(filtered).length === 0) {
    throw new TypeError("Backup contains no YourDynamicDashboard settings.");
  }

  return filtered;
}

// [src/storageKeys.js] YourDynamicDashboard V3.0.0
