export const MAX_SHORTCUTS = 20;
export const MIN_SHORTCUTS = 5;
export const MAX_SHORTCUT_NAME_LENGTH = 35;
export const MAX_SHORTCUT_URL_LENGTH = 2048;
export const MAX_CUSTOM_TOOLS = 8;
export const MAX_CUSTOM_TOOL_NAME_LENGTH = 20;
export const MAX_CUSTOM_TOOL_URL_LENGTH = 500;
export const MAX_CUSTOM_TOOL_ICON_LENGTH = 1_000_000;
export const MAX_CUSTOM_SEARCH_ENGINES = 6;
export const MAX_CUSTOM_SEARCH_NAME_LENGTH = 35;
export const MAX_CUSTOM_SEARCH_URL_LENGTH = 2048;
export const MAX_CUSTOM_SEARCH_QUERY_PARAMS = 8;
export const MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH = 64;
export const MAX_CUSTOM_APPS = 20;
export const MAX_CUSTOM_APP_NAME_LENGTH = 35;
export const MAX_CUSTOM_APP_URL_LENGTH = 2048;

export const THEME_COLOR_KEYS = Object.freeze([
  "--bg-primary",
  "--bg-secondary",
  "--bg-tertiary",
  "--accent-color",
  "--text-primary",
  "--text-secondary",
  "--text-placeholder",
  "--glow-color",
]);

const MAX_STORED_BACKGROUND_URL_LENGTH = MAX_SHORTCUT_URL_LENGTH;
const MAX_STORED_PREVIEW_LENGTH = 2_000_000;
const MAX_SAVED_THEME_NAME_LENGTH = 35;
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,[a-z\d+/]+={0,2}$/i;
const COLOR_NUMBER = "[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?";
const COLOR_ALPHA = "[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?";
const COLOR_HUE = "[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:deg|grad|rad|turn)?";
const RGB_COLOR_PATTERN = new RegExp(
  "^rgba?\\(\\s*" +
    COLOR_NUMBER +
    "\\s*,\\s*" +
    COLOR_NUMBER +
    "\\s*,\\s*" +
    COLOR_NUMBER +
    "(?:\\s*,\\s*" +
    COLOR_ALPHA +
    ")?\\s*\\)$",
  "i",
);
const HSL_COLOR_PATTERN = new RegExp(
  "^hsla?\\(\\s*" +
    COLOR_HUE +
    "\\s*,\\s*" +
    COLOR_NUMBER +
    "\\s*,\\s*" +
    COLOR_NUMBER +
    "(?:\\s*,\\s*" +
    COLOR_ALPHA +
    ")?\\s*\\)$",
  "i",
);

export function normalizeHttpUrl(value, maxLength = MAX_SHORTCUT_URL_LENGTH) {
  let input = String(value || "").trim();
  if (!input) throw new TypeError("Enter a URL.");
  if (input.length > maxLength) {
    throw new TypeError("The URL is too long.");
  }
  if (!/^[a-z][a-z\d+.-]*:/i.test(input)) input = `https://${input}`;

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new TypeError("Enter a valid website URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new TypeError("Only HTTP and HTTPS website URLs are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError("URLs containing login credentials are not supported.");
  }
  if (parsed.href.length > maxLength) {
    throw new TypeError("The URL is too long.");
  }
  return parsed.href;
}

export function isValidImageDataUrl(value, maxLength = MAX_CUSTOM_TOOL_ICON_LENGTH) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    IMAGE_DATA_URL_PATTERN.test(value)
  );
}

export function isValidThemeColor(value) {
  if (typeof value !== "string") return false;
  const color = value.trim();
  return (
    color.length > 0 &&
    color.length <= 128 &&
    (color === "transparent" ||
      /^#[\da-f]{3,4}$/i.test(color) ||
      /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color) ||
      RGB_COLOR_PATTERN.test(color) ||
      HSL_COLOR_PATTERN.test(color))
  );
}

export function normalizeThemeColor(value) {
  const color = typeof value === "string" ? value.trim() : "";
  if (!isValidThemeColor(color)) {
    throw new TypeError("Invalid theme color.");
  }
  return color;
}

export function normalizeStoredBackgroundUrl(value) {
  if (value === null || value === "") return value;
  if (typeof value !== "string" || !/^https?:\/\//i.test(value.trim())) {
    throw new TypeError("Stored background URL must use HTTP or HTTPS.");
  }
  return normalizeHttpUrl(value, MAX_STORED_BACKGROUND_URL_LENGTH);
}

export function normalizeStoredImageDataUrl(
  value,
  maxLength = MAX_STORED_PREVIEW_LENGTH,
) {
  if (value === null || value === "") return value;
  if (!isValidImageDataUrl(value, maxLength)) {
    throw new TypeError("Invalid stored image data.");
  }
  return value;
}

export function normalizeStoredThemeColor(key, value) {
  const cssVariable = key.startsWith("custom-")
    ? key.slice("custom-".length)
    : "";
  if (!THEME_COLOR_KEYS.includes(cssVariable)) {
    throw new TypeError("Invalid custom theme property.");
  }
  return normalizeThemeColor(value);
}

export function isValidStoredIcon(
  value,
  maxDataLength = MAX_CUSTOM_TOOL_ICON_LENGTH,
) {
  if (typeof value !== "string") return false;
  if (value.startsWith("data:image/")) return isValidImageDataUrl(value, maxDataLength);
  if (value.length > MAX_SHORTCUT_URL_LENGTH) return false;

  try {
    const parsed = new URL(value);
    const keys = [...parsed.searchParams.keys()];
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "www.google.com" &&
      parsed.pathname === "/s2/favicons" &&
      parsed.searchParams.get("sz") === "64" &&
      Boolean(parsed.searchParams.get("domain")) &&
      keys.length === 2 &&
      keys.includes("sz") &&
      keys.includes("domain")
    );
  } catch {
    return false;
  }
}

export function sanitizeCustomTools(value, type) {
  if (!Array.isArray(value)) return [];
  const expectedPrefix = type === "social" ? "custom-social-" : "custom-ai-";
  const seenIds = new Set();
  const sanitized = [];

  for (const item of value) {
    if (sanitized.length >= MAX_CUSTOM_TOOLS) break;
    if (!item) continue;
    const id = String(item.id || "").trim();
    if (
      !id.startsWith(expectedPrefix) ||
      id.length > 160 ||
      !/^[a-z0-9-]+$/i.test(id) ||
      seenIds.has(id)
    ) continue;

    const name = String(item.name || "").trim();
    if (!name || name.length > MAX_CUSTOM_TOOL_NAME_LENGTH) continue;

    let url;
    try {
      url = normalizeHttpUrl(item.url, MAX_CUSTOM_TOOL_URL_LENGTH);
    } catch {
      continue;
    }

    if (!isValidStoredIcon(item.icon)) continue;

    seenIds.add(id);
    sanitized.push({ id, name, url, icon: item.icon });
  }

  return sanitized;
}

export function sanitizeCustomSearchEngines(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  const sanitized = [];
  const queryParamPattern = /^[a-z][a-z\d._-]*$/i;

  for (const item of value) {
    if (sanitized.length >= MAX_CUSTOM_SEARCH_ENGINES) break;
    if (!item) continue;

    const id = String(item.id || "").trim();
    if (
      !id.startsWith("custom-search-") ||
      id.length > 160 ||
      !/^[a-z0-9-]+$/i.test(id) ||
      seenIds.has(id)
    ) continue;

    const name = String(item.name || "").trim();
    if (!name || name.length > MAX_CUSTOM_SEARCH_NAME_LENGTH) continue;

    let url;
    try {
      url = normalizeHttpUrl(item.url, MAX_CUSTOM_SEARCH_URL_LENGTH);
    } catch {
      continue;
    }

    const rawParams = Array.isArray(item.queryParams)
      ? item.queryParams
      : [item.queryParam];
    const queryParams = [...new Set(
      rawParams
        .map((param) => String(param || "").trim())
        .filter(
          (param) =>
            param.length <= MAX_CUSTOM_SEARCH_QUERY_PARAM_LENGTH &&
            queryParamPattern.test(param),
        ),
    )].slice(0, MAX_CUSTOM_SEARCH_QUERY_PARAMS);
    if (!queryParams.length) continue;

    if (!isValidStoredIcon(item.icon)) continue;

    seenIds.add(id);
    sanitized.push({
      id,
      name,
      url,
      icon: item.icon,
      queryParams,
      queryParam: queryParams[0],
    });
  }

  return sanitized;
}

export function sanitizeCustomApps(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  const sanitized = [];

  for (const item of value) {
    if (sanitized.length >= MAX_CUSTOM_APPS) break;
    if (!item) continue;

    const id = String(item.id || "").trim();
    if (
      !id.startsWith("custom-app-") ||
      id.length > 160 ||
      !/^[a-z0-9-]+$/i.test(id) ||
      seenIds.has(id)
    ) continue;

    const name = String(item.name || "").trim();
    if (!name || name.length > MAX_CUSTOM_APP_NAME_LENGTH) continue;

    let url;
    try {
      url = normalizeHttpUrl(item.url, MAX_CUSTOM_APP_URL_LENGTH);
      const hostname = new URL(url).hostname;
      if (!hostname.includes(".") && hostname !== "localhost" && !hostname.includes(":")) {
        continue;
      }
    } catch {
      continue;
    }

    if (!isValidStoredIcon(item.icon)) continue;

    seenIds.add(id);
    sanitized.push({ id, name, url, icon: item.icon });
  }

  return sanitized;
}

export function sanitizeGoogleAppOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sanitized = {};

  Object.entries(value).forEach(([id, override]) => {
    if (!/^app-default-[a-z0-9-]+$/i.test(id) || !override || typeof override !== "object") {
      return;
    }
    const next = {};
    const name = String(override.name || "").trim();
    if (name && name.length <= MAX_CUSTOM_APP_NAME_LENGTH) next.name = name;
    if (isValidImageDataUrl(override.icon)) {
      next.icon = override.icon;
    }
    if (Object.keys(next).length) sanitized[id] = next;
  });

  return sanitized;
}

export function sanitizeHiddenApps(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sanitized = {};
  Object.entries(value).forEach(([id, hidden]) => {
    if (
      hidden === true &&
      /^(?:app-default-|custom-app-)[a-z0-9-]+$/i.test(id)
    ) {
      sanitized[id] = true;
    }
  });
  return sanitized;
}

export function sanitizeSavedThemes(value) {
  if (!Array.isArray(value)) return [];
  const sanitized = [];
  const seenIds = new Set();
  const allowedTypes = new Set(["dark", "light", "default-dark", "default-light"]);

  for (const item of value) {
    if (sanitized.length >= 5) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (
      !id ||
      id.length > 160 ||
      !/^[a-z0-9][a-z0-9_-]*$/i.test(id) ||
      seenIds.has(id) ||
      !name ||
      name.length > MAX_SAVED_THEME_NAME_LENGTH ||
      /[\u0000-\u001f\u007f]/.test(name) ||
      !item.colors ||
      typeof item.colors !== "object" ||
      Array.isArray(item.colors)
    ) continue;

    if (!THEME_COLOR_KEYS.every((key) => isValidThemeColor(item.colors[key]))) {
      continue;
    }

    const colors = Object.fromEntries(
      THEME_COLOR_KEYS.map((key) => [key, item.colors[key].trim()]),
    );
    const theme = { id, name, colors };
    if (allowedTypes.has(item.type)) theme.type = item.type;
    sanitized.push(theme);
    seenIds.add(id);
  }

  return sanitized;
}

export function sanitizeShortcuts(value) {
  if (!Array.isArray(value)) return [];
  const sanitized = [];
  for (const item of value) {
    if (sanitized.length >= MAX_SHORTCUTS) break;
    if (!item) continue;
    const name = String(item.name || "").trim().slice(0, MAX_SHORTCUT_NAME_LENGTH);
    if (!name) continue;
    try {
      const url = normalizeHttpUrl(item.url);
      const shortcut = { name, url };
      if (isValidStoredIcon(item.icon)) {
        shortcut.icon = item.icon;
      }
      if (
        isValidImageDataUrl(item.customIcon, 3_000_000)
      ) {
        shortcut.customIcon = item.customIcon;
      }
      sanitized.push(shortcut);
    } catch {
      // Invalid restored shortcuts are ignored instead of reaching the DOM.
    }
  }
  return sanitized;
}

export function getBindableKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = String(event.key || "").toLowerCase();
  if (key.length !== 1 || /^\s$/.test(key)) return null;
  return key;
}

export async function validateImageBlob(
  blob,
  {
    maxBytes = 15 * 1024 * 1024,
    maxWidth = 16_384,
    maxHeight = 16_384,
    maxPixels = 40_000_000,
  } = {},
) {
  const allowedTypes = new Set([
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  if (!(blob instanceof Blob) || !allowedTypes.has(blob.type)) {
    throw new TypeError("Choose a PNG, JPEG, WebP, GIF, or AVIF image.");
  }
  if (blob.size <= 0 || blob.size > maxBytes) {
    throw new TypeError(`The image must be smaller than ${Math.round(maxBytes / 1048576)} MB.`);
  }

  let width;
  let height;
  if (typeof createImageBitmap === "function") {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
    } catch {
      throw new TypeError("The image could not be decoded.");
    } finally {
      bitmap?.close();
    }
  } else {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new TypeError("The image could not be decoded."));
        image.src = objectUrl;
      });
      width = dimensions.width;
      height = dimensions.height;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  if (
    !width ||
    !height ||
    width > maxWidth ||
    height > maxHeight ||
    width * height > maxPixels
  ) {
    throw new TypeError("The image dimensions are too large.");
  }
  return { width, height };
}
