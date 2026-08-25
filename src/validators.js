export const MAX_SHORTCUTS = 20;
export const MAX_SHORTCUT_NAME_LENGTH = 35;
export const MAX_SHORTCUT_URL_LENGTH = 2048;
export const MAX_CUSTOM_TOOLS = 50;
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

    if (
      typeof item.icon !== "string" ||
      !item.icon.startsWith("data:image/") ||
      item.icon.length > MAX_CUSTOM_TOOL_ICON_LENGTH
    ) {
      continue;
    }

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

    if (
      typeof item.icon !== "string" ||
      !item.icon.startsWith("data:image/") ||
      item.icon.length > MAX_CUSTOM_TOOL_ICON_LENGTH
    ) continue;

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

    if (
      typeof item.icon !== "string" ||
      !item.icon.startsWith("data:image/") ||
      item.icon.length > MAX_CUSTOM_TOOL_ICON_LENGTH
    ) continue;

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
    if (
      typeof override.icon === "string" &&
      override.icon.startsWith("data:image/") &&
      override.icon.length <= MAX_CUSTOM_TOOL_ICON_LENGTH
    ) {
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
      if (typeof item.icon === "string" && item.icon.length <= MAX_SHORTCUT_URL_LENGTH) {
        shortcut.icon = item.icon;
      }
      if (
        typeof item.customIcon === "string" &&
        item.customIcon.startsWith("data:image/") &&
        item.customIcon.length <= 3_000_000
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
