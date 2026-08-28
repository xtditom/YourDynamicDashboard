import { state } from "../state.js";
import { applyFontFamily, syncFontSelect } from "./fontLoader.js";
import {
  chooseGeocodingResult,
  completeDefaultTask,
  getGeocodingResults,
  getIconUrl,
  makeKeyboardInteractive,
  showCustomModal,
} from "../utils.js";
import { secondStorage } from "../secondStorage.js";
import {
  clearYddLocalStorage,
  getYddStorageEntries,
  validateYddStorageEntries,
} from "../storageKeys.js";
import {
  requestSearchSuggestionConsent,
  syncSuggestionModeSelect,
} from "./suggestions.js";
import {
  MIN_SHORTCUTS,
  MAX_SHORTCUTS,
  MAX_SHORTCUT_NAME_LENGTH,
  normalizeHttpUrl,
  validateImageBlob,
} from "../validators.js";

const RANDOM_BG_QUEUE_TARGET = 2;
const RANDOM_BG_PREVIEW_WIDTH = 480;
const RANDOM_BG_FETCH_TIMEOUT_MS = 12000;
const RANDOM_BG_SCHEDULES = Object.freeze({
  refresh: { label: "Every refresh", interval: null },
  "30s": { label: "Every 30 seconds", interval: 30_000 },
  "1m": { label: "Every minute", interval: 60_000 },
  "1h": { label: "Every hour", interval: 3_600_000 },
  "6h": { label: "Every 6 hours", interval: 21_600_000 },
  day: { label: "Every day", interval: null },
});
const RANDOM_BG_REFRESH_WARNING =
  "Every refresh background mode is enabled.\n\n" +
  "You need more than 20 Mbps to experience a new background on every refresh. " +
  "On slower connections, background fetching may struggle or take longer.\n\n" +
  "We recommend choosing a timed option if your connection is not fast or stable.";

// --- ALIEN DNA (Glass Palettes) ---
const ALIEN_LIGHT = {
  "--bg-secondary": "rgba(255, 255, 255, 0.25)",
  "--bg-tertiary": "rgba(255, 255, 255, 0.35)",
  "--bg-interactive": "rgba(255, 255, 255, 0.5)",
  "--text-primary": "#1a1a1a",
  "--text-secondary": "#333333",
  "--text-placeholder": "#555555",
  "--accent-color": "#1a1a1a",
  "--glow-color": "rgba(0,0,0,0.5)",
  "--border-color": "rgba(28, 35, 54, 0.72)",
  "--switch-bg": "rgba(38, 47, 74, 0.62)",
  "--switch-border": "rgba(255, 255, 255, 0.82)",
  "--switch-thumb": "#ffffff",
  "--switch-active-bg": "#20263d",
  "--form-control-bg": "rgba(255, 255, 255, 0.76)",
  "--form-control-text": "#172033",
  "--form-control-placeholder": "#37455f",
  "--form-control-border": "rgba(28, 35, 54, 0.72)",
  "--widget-bg": "rgba(255, 255, 255, 0.15)",
  "--widget-border": "rgba(255, 255, 255, 0.35)",
  "--text-color": "#1a1a1a",
  "--text-shadow": "0 1px 2px rgba(255, 255, 255, 0.35)",
  "--icon-filter": "grayscale(0%)",
  "--icon-opacity": "1",
};

const ALIEN_DARK = {
  "--bg-secondary": "rgba(0, 0, 0, 0.25)",
  "--bg-tertiary": "rgba(0, 0, 0, 0.45)",
  "--bg-interactive": "rgba(255, 255, 255, 0.1)",
  "--text-primary": "#f0f0f0",
  "--text-secondary": "#d1d5db",
  "--text-placeholder": "#9ca3af",
  "--accent-color": "#f0f0f0",
  "--glow-color": "rgba(255,255,255,0.7)",
  "--border-color": "rgba(255, 255, 255, 0.5)",
  "--switch-bg": "rgba(255, 255, 255, 0.34)",
  "--switch-border": "rgba(255, 255, 255, 0.76)",
  "--switch-thumb": "#f8fafc",
  "--switch-active-bg": "#84a8ff",
  "--form-control-bg": "rgba(0, 0, 0, 0.36)",
  "--form-control-text": "#ffffff",
  "--form-control-placeholder": "rgba(255, 255, 255, 0.8)",
  "--form-control-border": "rgba(255, 255, 255, 0.62)",
  "--widget-bg": "rgba(0, 0, 0, 0.25)",
  "--widget-border": "rgba(255, 255, 255, 0.18)",
  "--text-color": "#f0f0f0",
  "--text-shadow": "0 2px 4px rgba(0, 0, 0, 0.7)",
  "--icon-filter": "grayscale(0%) brightness(1.0)",
  "--icon-opacity": "0.9",
};

const makeDarkGradientUI = (switchActiveBg) => ({
  ...ALIEN_DARK,
  "--switch-active-bg": switchActiveBg,
});

const GENERATED_THEME_COLOR_KEYS = Object.freeze([
  "--bg-primary",
  "--bg-secondary",
  "--bg-tertiary",
  "--accent-color",
  "--text-primary",
  "--text-secondary",
  "--text-placeholder",
  "--glow-color",
]);

const GENERATED_THEME_RECIPES = Object.freeze([
  { hue: 202, saturation: 68, accentOffset: 8, surfaceOffset: 24, lightPrimary: 76, lightSecondary: 89, lightTertiary: 68 },
  { hue: 258, saturation: 64, accentOffset: -8, surfaceOffset: 18, lightPrimary: 80, lightSecondary: 91, lightTertiary: 73 },
  { hue: 332, saturation: 70, accentOffset: 10, surfaceOffset: -18, lightPrimary: 78, lightSecondary: 88, lightTertiary: 67 },
  { hue: 38, saturation: 78, accentOffset: -8, surfaceOffset: 18, lightPrimary: 80, lightSecondary: 91, lightTertiary: 71 },
  { hue: 146, saturation: 58, accentOffset: 12, surfaceOffset: -16, lightPrimary: 73, lightSecondary: 87, lightTertiary: 65 },
  { hue: 188, saturation: 72, accentOffset: -10, surfaceOffset: 22, lightPrimary: 77, lightSecondary: 89, lightTertiary: 69 },
  { hue: 16, saturation: 74, accentOffset: 8, surfaceOffset: -20, lightPrimary: 75, lightSecondary: 87, lightTertiary: 64 },
]);

let generatedThemeIndex = 0;

function clampColorChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hslToHex(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h * 6) % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 1 / 6) [red, green, blue] = [chroma, x, 0];
  else if (h < 2 / 6) [red, green, blue] = [x, chroma, 0];
  else if (h < 3 / 6) [red, green, blue] = [0, chroma, x];
  else if (h < 4 / 6) [red, green, blue] = [0, x, chroma];
  else if (h < 5 / 6) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return `#${[red, green, blue]
    .map((channel) => clampColorChannel((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToHsl(color) {
  const value = String(color || "").replace("#", "");
  if (![3, 4, 6, 8].includes(value.length) || !/^[\da-f]+$/i.test(value)) return null;
  const shortValue = value.length === 3 || value.length === 4;
  const rgbValue = value.slice(0, shortValue ? 3 : 6);
  const expanded = shortValue
    ? rgbValue.split("").map((v) => v + v).join("")
    : rgbValue;
  const red = parseInt(expanded.slice(0, 2), 16) / 255;
  const green = parseInt(expanded.slice(2, 4), 16) / 255;
  const blue = parseInt(expanded.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

function relativeLuminance(color) {
  const value = String(color || "").replace("#", "");
  if (![3, 4, 6, 8].includes(value.length) || !/^[\da-f]+$/i.test(value)) return 0;
  const shortValue = value.length === 3 || value.length === 4;
  const rgbValue = value.slice(0, shortValue ? 3 : 6);
  const expanded = shortValue
    ? rgbValue.split("").map((v) => v + v).join("")
    : rgbValue;
  const channels = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function classifyGradientType(colors) {
  const usable = (Array.isArray(colors) ? colors : [])
    .map((color) => relativeLuminance(color))
    .filter((value) => Number.isFinite(value));
  const average = usable.length
    ? usable.reduce((sum, value) => sum + value, 0) / usable.length
    : 0;
  return average >= 0.22 ? "light" : "dark";
}

function isHexColor(value) {
  return Boolean(normalizeHexColor(value));
}

function normalizeHexColor(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(raw.length) || !/^[\da-f]+$/i.test(raw)) {
    return "";
  }
  const rgb = raw.length <= 4 ? raw.slice(0, 3) : raw.slice(0, 6);
  const expanded = rgb.length === 3
    ? rgb.split("").map((channel) => channel + channel).join("")
    : rgb;
  return `#${expanded.toLowerCase()}`;
}

function contrastRatio(foreground, background) {
  const foregroundLum = relativeLuminance(foreground);
  const backgroundLum = relativeLuminance(background);
  const lighter = Math.max(foregroundLum, backgroundLum);
  const darker = Math.min(foregroundLum, backgroundLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrast(foreground, background, minimum, preferLighter) {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const hsl = hexToHsl(foreground);
  if (!hsl) return foreground;

  for (let step = 1; step <= 80; step += 1) {
    const lightness = preferLighter
      ? Math.min(98, hsl.lightness + step)
      : Math.max(2, hsl.lightness - step);
    const candidate = hslToHex(hsl.hue, hsl.saturation, lightness);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return preferLighter ? "#ffffff" : "#111111";
}

function adjustHexColor(color, hueOffset = 0, saturationScale = 1, lightnessOffset = 0) {
  const hsl = hexToHsl(color);
  if (!hsl) return color;
  return hslToHex(
    hsl.hue + hueOffset,
    hsl.saturation * saturationScale,
    hsl.lightness + lightnessOffset,
  );
}

function colorOrFallback(color, fallback) {
  return hexToHsl(color) ? color : fallback;
}

function deriveCustomThemeUI(colors, isDark) {
  const primary = colorOrFallback(colors["--bg-primary"], isDark ? "#101722" : "#f1f4f8");
  const secondary = colorOrFallback(colors["--bg-secondary"], isDark ? "#1d2938" : "#ffffff");
  const tertiary = colorOrFallback(colors["--bg-tertiary"], isDark ? "#2c3a4c" : "#e1e7ee");
  const accent = colorOrFallback(colors["--accent-color"], isDark ? "#8fc7ff" : "#245d9c");
  const primaryText = colorOrFallback(colors["--text-primary"], isDark ? "#f5f8fc" : "#17202a");
  const secondaryText = colorOrFallback(colors["--text-secondary"], isDark ? "#d3deea" : "#344454");
  const placeholder = colorOrFallback(colors["--text-placeholder"], isDark ? "#aebdce" : "#647384");

  const interactive = adjustHexColor(tertiary, 0, 0.92, isDark ? 7 : -7);
  const interactiveHover = adjustHexColor(tertiary, 0, 0.98, isDark ? 14 : -14);
  const switchBg = adjustHexColor(tertiary, 0, 0.9, isDark ? 11 : -20);
  const formBg = adjustHexColor(tertiary, 0, 0.92, isDark ? 3 : -3);
  const border = ensureContrast(accent, secondary, 2, isDark);
  const switchBorder = ensureContrast(primaryText, switchBg, 2, isDark);
  const activeSwitch = ensureContrast(accent, primary, 3, isDark);
  const formText = ensureContrast(primaryText, formBg, 4.5, isDark);
  const formPlaceholder = ensureContrast(placeholder, formBg, 3, isDark);

  return {
    "--bg-interactive": interactive,
    "--bg-interactive-hover": interactiveHover,
    "--bg-hover-translucent": isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    "--border-color": border,
    "--switch-bg": switchBg,
    "--switch-border": switchBorder,
    "--switch-thumb": isDark ? "#ffffff" : "#ffffff",
    "--switch-active-bg": activeSwitch,
    "--form-control-bg": formBg,
    "--form-control-text": formText,
    "--form-control-placeholder": formPlaceholder,
    "--form-control-border": border,
    "--widget-bg": secondary,
    "--widget-border": border,
    "--text-color": primaryText,
    "--text-shadow": isDark ? "0 1px 2px rgba(0, 0, 0, 0.45)" : "none",
  };
}

function createRecipeGeneratedTheme(mode, recipe) {
  const isDark = mode === "dark";
  const {
    hue,
    saturation,
    accentOffset,
    surfaceOffset,
    lightPrimary = 76,
    lightSecondary = 89,
    lightTertiary = 68,
  } = recipe;
  const colors = isDark
    ? {
        "--bg-primary": hslToHex(hue, saturation * 0.7, 7),
        "--bg-secondary": hslToHex(hue + surfaceOffset, saturation * 0.78, 19),
        "--bg-tertiary": hslToHex(hue - 14, saturation * 0.86, 30),
        "--accent-color": hslToHex(hue + accentOffset, saturation, 66),
        "--text-primary": hslToHex(hue + 8, saturation * 0.35, 94),
        "--text-secondary": hslToHex(hue + surfaceOffset, saturation * 0.3, 79),
        "--text-placeholder": hslToHex(hue + surfaceOffset, saturation * 0.25, 68),
        "--glow-color": hslToHex(hue + accentOffset, saturation, 72),
      }
    : {
        "--bg-primary": hslToHex(hue, saturation * 0.82, lightPrimary),
        "--bg-secondary": hslToHex(hue + surfaceOffset, saturation * 0.64, lightSecondary),
        "--bg-tertiary": hslToHex(hue - 14, saturation * 0.9, lightTertiary),
        "--accent-color": hslToHex(hue + accentOffset, saturation, 42),
        "--text-primary": hslToHex(hue + 8, saturation * 0.58, 18),
        "--text-secondary": hslToHex(hue + surfaceOffset, saturation * 0.45, 34),
        "--text-placeholder": hslToHex(hue + surfaceOffset, saturation * 0.35, 45),
        "--glow-color": hslToHex(hue + accentOffset, saturation, 54),
      };

  colors["--text-primary"] = ensureContrast(
    colors["--text-primary"],
    colors["--bg-primary"],
    4.5,
    isDark,
  );
  colors["--text-secondary"] = ensureContrast(
    colors["--text-secondary"],
    colors["--bg-secondary"],
    4.5,
    isDark,
  );
  colors["--text-placeholder"] = ensureContrast(
    colors["--text-placeholder"],
    colors["--bg-secondary"],
    3,
    isDark,
  );
  colors["--accent-color"] = ensureContrast(
    colors["--accent-color"],
    colors["--bg-primary"],
    3,
    isDark,
  );

  return colors;
}

function getGenerationSourceTheme(mode, sourceIndex) {
  const sourceThemes = THEMES.normal.filter(
    (theme) => !["default-light", "default-dark"].includes(theme.id),
  );
  const normalizedIndex = Math.floor(sourceIndex);
  const source = sourceThemes[normalizedIndex % sourceThemes.length];
  if (!source) return null;

  if (source.id === "default-light" || source.id === "default-dark") {
    const defaultId = mode === "dark" ? "default-dark" : "default-light";
    return sourceThemes.find((theme) => theme.id === defaultId) || source;
  }

  const sourceIsDark = source.type === "dark";
  if ((mode === "dark") === sourceIsDark) return source;

  const variantColors = mode === "dark"
    ? LIGHT_THEME_DARK_VARIANTS[source.id]
    : DARK_THEME_LIGHT_VARIANTS[source.id];
  return variantColors ? { ...source, type: mode, colors: { ...source.colors, ...variantColors } } : source;
}

function createSourceThemeVariation(mode, sourceTheme, variationIndex) {
  const isDark = mode === "dark";
  const sourceColors = sourceTheme?.colors || {};
  const sourceHsl = Object.fromEntries(
    GENERATED_THEME_COLOR_KEYS.map((role) => [role, hexToHsl(sourceColors[role])]),
  );
  const anchor = [
    sourceHsl["--accent-color"],
    sourceHsl["--glow-color"],
    sourceHsl["--text-primary"],
    sourceHsl["--text-secondary"],
    sourceHsl["--bg-primary"],
  ].find((hsl) => hsl && hsl.saturation >= 8) || {
    hue: isDark ? 215 : 205,
    saturation: 55,
    lightness: isDark ? 55 : 42,
  };
  const normalizedVariationIndex = Math.floor(variationIndex);
  const phase = normalizedVariationIndex % 4;
  const mutationPlans = [
    ["--accent-color"],
    ["--accent-color", "--glow-color"],
    ["--bg-tertiary", "--accent-color", "--text-placeholder"],
    ["--bg-primary", "--bg-secondary", "--bg-tertiary", "--accent-color", "--glow-color"],
  ];
  const mutatedRoles = new Set(mutationPlans[phase]);
  const hueJumps = [132, -112, 76, 178];
  const hueJump = hueJumps[phase];
  const colors = {};

  GENERATED_THEME_COLOR_KEYS.forEach((role) => {
    const source = sourceHsl[role];
    const fallback = {
      "--bg-primary": isDark ? 8 : 76,
      "--bg-secondary": isDark ? 20 : 89,
      "--bg-tertiary": isDark ? 33 : 68,
      "--accent-color": isDark ? 64 : 44,
      "--text-primary": isDark ? 94 : 18,
      "--text-secondary": isDark ? 79 : 34,
      "--text-placeholder": isDark ? 67 : 45,
      "--glow-color": isDark ? 72 : 56,
    }[role];
    const base = source || {
      hue: anchor.hue,
      saturation: anchor.saturation,
      lightness: fallback,
    };

    if (!mutatedRoles.has(role)) {
      // Preserve the source theme's identity for untouched roles.
      colors[role] = sourceColors[role] || hslToHex(base.hue, base.saturation, fallback);
      return;
    }

    const isSurface = role.startsWith("--bg-");
    const roleHueOffset = role === "--accent-color" ? 0 : role === "--glow-color" ? 24 : -18;
    const targetLightness = isSurface
      ? (role === "--bg-primary" ? (isDark ? 9 : 76) : role === "--bg-secondary" ? (isDark ? 21 : 88) : (isDark ? 34 : 68))
      : role === "--accent-color"
        ? (isDark ? 64 : 44)
        : role === "--glow-color"
          ? (isDark ? 72 : 56)
          : fallback;
    const targetSaturation = isSurface ? 62 : 88;
    colors[role] = hslToHex(
      base.hue + hueJump + roleHueOffset,
      Math.min(96, Math.max(targetSaturation, base.saturation * 0.86)),
      targetLightness,
    );
  });

  colors["--text-primary"] = ensureContrast(colors["--text-primary"], colors["--bg-primary"], 4.5, isDark);
  colors["--text-secondary"] = ensureContrast(colors["--text-secondary"], colors["--bg-secondary"], 4.5, isDark);
  colors["--text-placeholder"] = ensureContrast(colors["--text-placeholder"], colors["--bg-secondary"], 3, isDark);
  colors["--accent-color"] = ensureContrast(colors["--accent-color"], colors["--bg-primary"], 3, isDark);
  return colors;
}

function createWildGeneratedTheme(mode, recipe, generationIndex) {
  const isDark = mode === "dark";
  let seed = (generationIndex + 1) * 97 + recipe.hue * 13;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const baseHue = recipe.hue + (next() - 0.5) * 55;
  const colors = {
    "--bg-primary": hslToHex(baseHue + (next() - 0.5) * 42, 48 + next() * 28, isDark ? 6 + next() * 7 : 70 + next() * 14),
    "--bg-secondary": hslToHex(baseHue + 60 + (next() - 0.5) * 70, 42 + next() * 30, isDark ? 17 + next() * 9 : 84 + next() * 10),
    "--bg-tertiary": hslToHex(baseHue - 46 + (next() - 0.5) * 58, 48 + next() * 32, isDark ? 27 + next() * 10 : 62 + next() * 16),
    "--accent-color": hslToHex(baseHue + 120 + (next() - 0.5) * 55, 62 + next() * 28, isDark ? 57 + next() * 17 : 35 + next() * 18),
    "--text-primary": hslToHex(baseHue + 14, 20 + next() * 28, isDark ? 91 + next() * 6 : 12 + next() * 12),
    "--text-secondary": hslToHex(baseHue - 22, 18 + next() * 28, isDark ? 73 + next() * 15 : 25 + next() * 18),
    "--text-placeholder": hslToHex(baseHue + 80, 20 + next() * 28, isDark ? 62 + next() * 14 : 36 + next() * 16),
    "--glow-color": hslToHex(baseHue + 180 + (next() - 0.5) * 65, 62 + next() * 28, isDark ? 65 + next() * 15 : 45 + next() * 18),
  };
  colors["--text-primary"] = ensureContrast(colors["--text-primary"], colors["--bg-primary"], 4.5, isDark);
  colors["--text-secondary"] = ensureContrast(colors["--text-secondary"], colors["--bg-secondary"], 4.5, isDark);
  colors["--text-placeholder"] = ensureContrast(colors["--text-placeholder"], colors["--bg-secondary"], 3, isDark);
  colors["--accent-color"] = ensureContrast(colors["--accent-color"], colors["--bg-primary"], 3, isDark);
  return colors;
}

function createGeneratedTheme(mode, recipe, generationIndex) {
  // Deterministic 10-generation distribution:
  // 4 source mutations, 3 curated recipes, and 3 bounded wild palettes.
  const generationPattern = [
    "source",
    "recipe",
    "wild",
    "source",
    "recipe",
    "wild",
    "source",
    "recipe",
    "source",
    "wild",
  ];
  const cycleIndex = generationIndex % generationPattern.length;
  const style = generationPattern[cycleIndex];

  if (style === "wild") {
    return createWildGeneratedTheme(mode, recipe, generationIndex);
  }

  if (style === "source") {
    const sourcePositions = [0, 3, 6, 8];
    const cycleNumber = Math.floor(generationIndex / generationPattern.length);
    const sourceSlot =
      cycleNumber * sourcePositions.length + sourcePositions.indexOf(cycleIndex);
    const sourceTheme = getGenerationSourceTheme(mode, sourceSlot);
    if (sourceTheme) return createSourceThemeVariation(mode, sourceTheme, generationIndex);
  }

  return createRecipeGeneratedTheme(mode, recipe);
}

function isUsableThemeColor(value) {
  const color = String(value || "").trim();
  return (
    color === "transparent" ||
    /^#[\da-f]{3,4}$/i.test(color) ||
    /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color) ||
    /^(?:rgb|hsl)a?\([^)]*\)$/i.test(color)
  );
}

export function getThemeRightColor(theme) {
  if (!theme || !theme.colors) return "#ffffff";
  if (theme.id === "theme-3" || theme.name === "Azure Sky") return "#006EFF";
  if (theme.id === "theme-7" || theme.name === "Phosphor") return "#91AA5B";
  return (
    theme.colors["--accent-color"] ||
    theme.colors["--text-primary"] ||
    "#ffffff"
  );
}
window.__getThemeRightColor = getThemeRightColor;

export const THEMES = {
  normal: [
    {
      id: "default-light",
      type: "light",
      name: "Light",
      colors: {
        "--bg-primary": "#c3c3c3",
        "--bg-secondary": "#ffffff",
        "--bg-tertiary": "#e9e9e9",
        "--accent-color": "#1a1a1a",
        "--text-primary": "#1a1a1a",
        "--text-secondary": "#000000",
        "--text-placeholder": "#8a8d91",
        "--glow-color": "#7f7f7f",
      },
    },
    {
      id: "default-dark",
      type: "default-dark",
      name: "Dark",
      colors: {
        "--bg-primary": "#0a0a0a",
        "--bg-secondary": "#3a3a3a",
        "--bg-tertiary": "#2d2d2d",
        "--accent-color": "#ffffff",
        "--text-primary": "#f9fafb",
        "--text-secondary": "#d1d5db",
        "--text-placeholder": "#9ca3af",
        "--glow-color": "#c8c8c8",
      },
    },
    {
      id: "theme-1",
      type: "dark",
      name: "Crimson Red",
      colors: {
        "--bg-primary": "#000000",
        "--bg-secondary": "#000000",
        "--bg-tertiary": "#000000",
        "--accent-color": "#ff1010",
        "--text-primary": "#ff1010",
        "--text-secondary": "#ff1010",
        "--text-placeholder": "#ff1010",
        "--glow-color": "#ff1010",
      },
    },
    {
      id: "theme-2",
      type: "dark",
      name: "Radioactive",
      colors: {
        "--bg-primary": "#000000",
        "--bg-secondary": "#648112",
        "--bg-tertiary": "#292929",
        "--accent-color": "#c8ff00",
        "--text-primary": "#ffffff",
        "--text-secondary": "#ffffff",
        "--text-placeholder": "#c8ff00",
        "--glow-color": "#38ff6a",
      },
    },
    {
      id: "theme-3",
      type: "light",
      name: "Azure Sky",
      colors: {
        "--bg-primary": "#bebebe",
        "--bg-secondary": "#006eff",
        "--bg-tertiary": "#287ff0",
        "--accent-color": "#ffffff",
        "--text-primary": "#f0f0f0",
        "--text-secondary": "#ffffff",
        "--text-placeholder": "#ffffff",
        "--glow-color": "#006eff",
      },
    },
    {
      id: "theme-4",
      type: "light",
      name: "Minty Fresh",
      colors: {
        "--bg-primary": "#90c69e",
        "--bg-secondary": "#FFFFFF",
        "--bg-tertiary": "#ccffd9",
        "--accent-color": "#328558",
        "--text-primary": "#2e8b57",
        "--text-secondary": "#555555",
        "--text-placeholder": "#008a10",
        "--glow-color": "#3cb371",
      },
    },
    {
      id: "theme-5",
      type: "light",
      name: "Sakura",
      colors: {
        "--bg-primary": "#ffa9d2ff",
        "--bg-secondary": "#ffc7e3",
        "--bg-tertiary": "#FFFFFF",
        "--accent-color": "#ff4da6",
        "--text-primary": "#C71585",
        "--text-secondary": "#8B5765",
        "--text-placeholder": "#ff70a0",
        "--glow-color": "#5f0030ff",
      },
    },
    {
      id: "theme-6",
      type: "dark",
      name: "Cyberpunk",
      colors: {
        "--bg-primary": "#0A043C",
        "--bg-secondary": "#140C4F",
        "--bg-tertiary": "#221B64",
        "--accent-color": "#00E5FF",
        "--text-primary": "#00e5ff",
        "--text-secondary": "#FF00FF",
        "--text-placeholder": "#ff00ff",
        "--glow-color": "#00E5FF",
      },
    },
    {
      id: "theme-7",
      type: "dark",
      name: "Phosphor",
      colors: {
        "--bg-primary": "#0f0f15",
        "--bg-secondary": "#2a2931",
        "--bg-tertiary": "#2d2d35",
        "--accent-color": "#fcfdfb",
        "--text-primary": "#8ea659",
        "--text-secondary": "#59b560",
        "--text-placeholder": "#717a8a",
        "--glow-color": "#828282",
      },
    },
    {
      id: "theme-8",
      type: "light",
      name: "Lavender Mist",
      colors: {
        "--bg-primary": "#ded6ff",
        "--bg-secondary": "#ffffff",
        "--bg-tertiary": "#cdc1fb",
        "--accent-color": "#6953b8",
        "--text-primary": "#33265f",
        "--text-secondary": "#5a4b7a",
        "--text-placeholder": "#887aa8",
        "--glow-color": "#9b87d3",
      },
    },
  ],
  gradient: [
    {
      id: "electric-sky",
      name: "Electric Sky",
      colors: ["#1580FD", "#9B90FB"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "cotton-candy",
      name: "Cotton Candy",
      colors: ["#eb76beff", "#d14ac6ff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "glacier",
      name: "Glacier",
      colors: ["#20e3b2", "#0c7febff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "bio-lime",
      name: "Bio Lime",
      colors: ["#42bd00ff", "#087416ff"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "dawn-bloom",
      name: "Dawn Bloom",
      colors: ["#ffd6a5", "#ffafcc"],
      ui: ALIEN_LIGHT,
      type: "light",
    },
    {
      id: "grey",
      name: "Passion",
      colors: ["#c9c9c9", "#4e4e4e"],
      ui: makeDarkGradientUI("#050505"),
      type: "dark",
    },
    {
      id: "royal",
      name: "Royal",
      colors: ["#9500ebff", "#257bfcff"],
      ui: makeDarkGradientUI("#6b16b8"),
      type: "dark",
    },
    {
      id: "deep-space",
      name: "Deep Space",
      colors: ["#302b63", "#1d0838ff"],
      ui: makeDarkGradientUI("#30255f"),
      type: "dark",
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#480048", "#C04848"],
      ui: makeDarkGradientUI("#8f3158"),
      type: "dark",
    },
    {
      id: "forest",
      name: "Forest",
      colors: ["#295038", "#10491eff"],
      ui: makeDarkGradientUI("#1b6b3a"),
      type: "dark",
    },
  ],
};

const DARK_MODE_THEME_IDS = new Set([
  "default-light",
  "default-dark",
  "theme-1",
  "theme-2",
  "theme-3",
  "theme-4",
  "theme-5",
  "theme-6",
  "theme-7",
  "theme-8",
]);

const LIGHT_THEME_DARK_VARIANTS = {
  "theme-3": {
    "--bg-primary": "#1c2635",
    "--bg-secondary": "#12345e",
    "--bg-tertiary": "#1d4f88",
    "--accent-color": "#d9f0ff",
    "--text-primary": "#eff9ff",
    "--text-secondary": "#c0def2",
    "--text-placeholder": "#9fc6e2",
    "--glow-color": "#55b7ff",
  },
  "theme-4": {
    "--bg-primary": "#14291d",
    "--bg-secondary": "#1c3e29",
    "--bg-tertiary": "#2b583b",
    "--accent-color": "#b9ffd1",
    "--text-primary": "#e6ffed",
    "--text-secondary": "#bde4c8",
    "--text-placeholder": "#9bcaab",
    "--glow-color": "#58cf83",
  },
  "theme-5": {
    "--bg-primary": "#321727",
    "--bg-secondary": "#4a1f3b",
    "--bg-tertiary": "#672850",
    "--accent-color": "#ffd1e8",
    "--text-primary": "#ffeaf4",
    "--text-secondary": "#f1b9d2",
    "--text-placeholder": "#df91b5",
    "--glow-color": "#ff6db2",
  },
  "theme-8": {
    "--bg-primary": "#211d3b",
    "--bg-secondary": "#322b56",
    "--bg-tertiary": "#483d70",
    "--accent-color": "#e4dcff",
    "--text-primary": "#f2efff",
    "--text-secondary": "#d1c8f2",
    "--text-placeholder": "#aca0dc",
    "--glow-color": "#9a84f0",
  },
};

const DARK_THEME_LIGHT_VARIANTS = {
  "theme-1": {
    "--bg-primary": "#f4f4f4",
    "--bg-secondary": "#ffffff",
    "--bg-tertiary": "#ffe5e5",
    "--accent-color": "#d40000",
    "--text-primary": "#b00000",
    "--text-secondary": "#7a1f1f",
    "--text-placeholder": "#d21f1f",
    "--glow-color": "#ff4545",
  },
  "theme-2": {
    "--bg-primary": "#c9d378",
    "--bg-secondary": "#fffaf0",
    "--bg-tertiary": "#a2af41",
    "--accent-color": "#627500",
    "--text-primary": "#5a2d00",
    "--text-secondary": "#7a4100",
    "--text-placeholder": "#a15d00",
    "--glow-color": "#ff8a00",
  },
  "theme-6": {
    "--bg-primary": "#b8eaea",
    "--bg-secondary": "#89e4e6",
    "--bg-tertiary": "#33d8db",
    "--accent-color": "#007b8a",
    "--text-primary": "#004b63",
    "--text-secondary": "#a00068",
    "--text-placeholder": "#7030a0",
    "--glow-color": "#00aabd",
  },
  "theme-7": {
    "--bg-primary": "#d9e2c5",
    "--bg-secondary": "#dedede",
    "--bg-tertiary": "#adc47e",
    "--accent-color": "#294b27",
    "--text-primary": "#396b2f",
    "--text-secondary": "#2f7d3a",
    "--text-placeholder": "#5b7448",
    "--glow-color": "#648f3e",
  },
};

export class SettingsManager {
  static instance = null;
  static THEMES = null;

  constructor() {
    if (SettingsManager.instance) {
      return SettingsManager.instance;
    }
    SettingsManager.instance = this;
    SettingsManager.THEMES = THEMES;
    this._backgroundOperationId = 0;
    this._backgroundReady = Promise.resolve();
    this._randomBgScheduleTimer = null;
    this._activeBackgroundObjectUrl = null;
    this._locationRequestId = 0;
    this._locationController = null;
    this._gpsRequestId = 0;
    this._infoKeyHandler = null;
    window.addEventListener(
      "pagehide",
      () => {
        this._releaseActiveBackgroundObjectUrl();
        if (this._randomBgScheduleTimer) {
          window.clearTimeout(this._randomBgScheduleTimer);
          this._randomBgScheduleTimer = null;
        }
      },
      { once: true },
    );

    // Expose for full settings modal module
    window.__settingsManagerInstance = this;
    window.__YDD_THEMES = THEMES;

    this.els = {
      btn: document.getElementById("settings-toggle-button"),
      popup: document.getElementById("settings-popup"),
      tabs: document.querySelectorAll(".settings-tab-button"),
      panes: document.querySelectorAll(".settings-pane"),
      clockType: document.getElementById("clock-type-toggle"),
      clockFormat: document.getElementById("clock-format-toggle"),
      clockFormatRow: document.getElementById("clock-format-row"),
      hideGreetings: document.getElementById("hide-greetings-toggle"),
      dateToggle: document.getElementById("date-visibility-toggle"),
      tempUnit: document.getElementById("temp-unit-toggle"),
      todo: document.getElementById("todo-visibility-toggle"),
      apps: document.getElementById("apps-visibility-toggle"),
      ai: document.getElementById("ai-tools-visibility-toggle"),
      shortcutsPosition: document.getElementById("shortcuts-position-select"),
      newsEnabled: document.getElementById("news-enabled-toggle"),
      newsBadge: document.getElementById("news-feeds-new-sticker"),
      configureNews: document.getElementById("configure-news-btn"),
      searchSuggestionMode: document.getElementById("search-suggestion-mode-select"),
      dark: document.getElementById("dark-mode-toggle"),
      autoThemeToggle: document.getElementById("auto-theme-toggle"),
      glowToggle: document.getElementById("glow-effect-toggle"),
      fontFamily: document.getElementById("font-family-select"),
      editableTextToggle: document.getElementById("editable-text-toggle"),
      widgetControl: document.getElementById("widget-control-select"),
      colorControls: document.getElementById("advanced-color-controls"),
      themeColorNote: document.getElementById("theme-color-note"),
      normalContainer: document.getElementById("normal-themes-container"),
      gradientContainer: document.getElementById("gradient-themes-container"),
      savedContainer: document.getElementById("saved-themes-container"),
      saveThemeBtn: document.getElementById("save-current-theme-btn"),
      locInput: document.getElementById("custom-location-input"),
      locSave: document.getElementById("save-location-btn"),
      locDetect: document.getElementById("settings-gps-btn"),
      tempDisplayToggle: document.getElementById("temp-display-toggle"),
      shortcutList: document.getElementById("shortcuts-editor-list"),
      shortcutForm: document.getElementById("add-shortcut-form"),
      uploadBg: document.getElementById("upload-bg-button"),
      bgInput: document.getElementById("bg-file-input"),
      removeBg: document.getElementById("remove-bg-button"),
      randomBgFreeze: document.getElementById("random-bg-freeze-btn"),
      randomBgRnd: document.getElementById("random-bg-rnd-btn"),
      randomBgSchedule: document.getElementById("random-bg-schedule-select"),
      randomBgUpdatedSticker: document.getElementById("random-bg-updated-sticker"),
      backup: document.getElementById("backup-button"),
      restore: document.getElementById("restore-button"),
      restoreInput: document.getElementById("restore-file-input"),
      reset: document.getElementById("reset-button"),
      updateBtn: document.getElementById("check-for-updates-btn"),
      githubBtn: document.getElementById("github-repo-btn"),
      infoBtn: document.getElementById("info-btn"),
      infoOverlay: document.getElementById("info-modal-overlay"),
      infoClose: document.getElementById("info-modal-close"),
      bgBlurSelect: document.getElementById("bg-blur-select"),
      blurRow: document.getElementById("blur-intensity-row"),
    };
    if (this.els.infoOverlay) this.els.infoOverlay.inert = true;

    if (!this.els.btn) return;
    this.init();
  }

  init() {
    if (!this.els.glowToggle) {
      this.els.glowToggle = document.getElementById("glow-effect-toggle");
    }

    this.loadInitialState();
    this.setupEventListeners();
    this.renderThemes();
    this.renderSavedThemes();
    this.renderMiniThemes();
    this.renderShortcutEditor();

    state.subscribe((key, value) => {
      if (
        key === "widgetControl" ||
        key === "yd_city" ||
        key === "yd_lat" ||
        key === "yd_lon" ||
        key === "locationUpdate"
      ) {
        if (key === "widgetControl" && this.els.widgetControl) {
          this.els.widgetControl.value = value || "all";
        }
        this.updateTempTogglesState();
      }
      if (key === "autoTheme") {
        if (this.els.autoThemeToggle) {
          this.els.autoThemeToggle.checked = value;
        }
        if (value) {
          this.applyRandomTheme();
        }
      }
      if (key === "yd_city") {
        if (this.els.locInput) this.els.locInput.value = value || "";
      }
      if (key === "showDate") {
        if (this.els.dateToggle) {
          this.els.dateToggle.checked = value;
        }
      }
      if (key === "searchSuggestionMode" && this.els.searchSuggestionMode) {
        this.els.searchSuggestionMode.value = value || "history-only";
        syncSuggestionModeSelect(this.els.searchSuggestionMode);
      }
      if (key === "searchSuggestionBadgeDismissed") {
        const badge = document.getElementById("search-suggestion-new-sticker");
        if (badge) badge.hidden = value === true;
      }
      if (key === "newsBadgeDismissed" && this.els.newsBadge) {
        this.els.newsBadge.hidden = value === true;
      }
      if (key === "hideGreetings") {
        if (this.els.hideGreetings) {
          this.els.hideGreetings.checked = value === true;
        }
      }
      if (key === "clockType") {
        if (this.els.clockType) {
          this.els.clockType.checked = value === "analog";
        }
        this.updateClockFormatState();
      }
      if (key === "showEditableText" && this.els.editableTextToggle) {
        this.els.editableTextToggle.checked = value === false;
      }
      if (key === "userSavedThemes") {
        this.renderSavedThemes();
        this.renderMiniThemes();
      }
      if (
        key === "gradientModeActive" ||
        key === "backgroundImage" ||
        key === "randomBgMode" ||
        key === "disableAnimations" ||
        key === "randomBgScheduleBadgeDismissed" ||
        key === "normalThemeId" ||
        key === "gradientThemeId"
      ) {
        this.updateAutoThemeGlowState();
        this.updateWarningText();
        this.updateDarkModeControlState();
      }
      if (key === "glowEffect") {
        const isGlowOn = value !== false;
        if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;
        document.body.classList.toggle("no-glow", !isGlowOn);

        const glowPicker = document.getElementById("glow-color-picker");
        if (glowPicker) {
          glowPicker.disabled = !isGlowOn;
          glowPicker.style.opacity = isGlowOn ? "1" : "0.5";
          glowPicker.style.cursor = isGlowOn ? "pointer" : "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) {
            if (!isGlowOn) parentRow.classList.add("disabled");
            else parentRow.classList.remove("disabled");
          }
        }
      }
      if (key === "randomBgScheduleBadgeDismissed") {
        this.updateRandomBgButtons();
        window.__fullSettingsModalInstance?.updateRandomBackgroundBadge?.();
      }
      if (key === "newsEnabled" && this.els.newsEnabled) {
        this.els.newsEnabled.checked = value === true;
      }
      if (key === "fontFamily") {
        const fontId = applyFontFamily(value);
        syncFontSelect(this.els.fontFamily, fontId);
      }
    });
  }

  whenBackgroundReady() {
    return this._backgroundReady || Promise.resolve();
  }

  loadInitialState() {
    this.bindSimpleToggle(this.els.clockType, "clockType", "analog");
    this.bindSimpleToggle(this.els.clockFormat, "clockFormat", "24");
    this.bindSimpleToggle(this.els.hideGreetings, "hideGreetings", false);
    this.bindSimpleToggle(this.els.dateToggle, "showDate", false);
    this.bindSimpleToggle(this.els.tempUnit, "tempUnit", "imperial");
    this.bindSimpleToggle(this.els.tempDisplayToggle, "tempDisplayMode", true);
    this.bindSimpleToggle(this.els.todo, "showTodo", true);
    this.bindSimpleToggle(this.els.apps, "showApps", true);
    this.bindSimpleToggle(this.els.ai, "showAiTools", true);
    this.bindSimpleToggle(this.els.autoThemeToggle, "autoTheme", false);
    this.bindHideToggle(this.els.editableTextToggle, "showEditableText");

    if (this.els.shortcutsPosition) {
      this.els.shortcutsPosition.value =
        state.get("shortcutsPosition") || "bottom";
      if (
        state.get("showShortcuts") === false &&
        !state.get("shortcutsPosition")
      ) {
        this.els.shortcutsPosition.value = "hide";
        state.set("shortcutsPosition", "hide");
      }
    }
    if (this.els.newsEnabled) {
      this.els.newsEnabled.checked = state.get("newsEnabled") === true;
    }
    if (this.els.searchSuggestionMode) {
      this.els.searchSuggestionMode.value = state.get("searchSuggestionMode") || "history-only";
      syncSuggestionModeSelect(this.els.searchSuggestionMode);
      this.els.searchSuggestionMode.addEventListener("focus", () =>
        syncSuggestionModeSelect(this.els.searchSuggestionMode, true),
      );
      this.els.searchSuggestionMode.addEventListener("blur", () =>
        syncSuggestionModeSelect(this.els.searchSuggestionMode),
      );
    }
    const searchSuggestionBadge = document.getElementById("search-suggestion-new-sticker");
    if (searchSuggestionBadge) {
      searchSuggestionBadge.hidden = state.get("searchSuggestionBadgeDismissed") === true;
    }
    if (this.els.newsBadge) {
      this.els.newsBadge.hidden = state.get("newsBadgeDismissed") === true;
    }

    this.bindSimpleToggle(this.els.glowToggle, "glowEffect", true);
    if (this.els.fontFamily) {
      const savedFont = state.get("fontFamily") || "lexend";
      applyFontFamily(savedFont);
      syncFontSelect(this.els.fontFamily, savedFont);
      this.els.fontFamily.addEventListener("change", () => {
        const previousFont = state.get("fontFamily") || "lexend";
        if (!state.set("fontFamily", this.els.fontFamily.value)) {
          syncFontSelect(this.els.fontFamily, previousFont);
        }
      });
    }

    if (this.els.dark) {
      this.els.dark.checked = state.get("darkMode") === true;
    }
    this.updateDarkModeUpdatedBadge();
    this.updateWeatherLocationBadge();

    if (this.els.widgetControl)
      this.els.widgetControl.value = state.get("widgetControl") || "all";
    if (this.els.locInput) this.els.locInput.value = state.get("yd_city") || "";

    if (this.els.bgBlurSelect) {
      const savedBlur = state.get("bgBlurIntensity") || "0";
      this.els.bgBlurSelect.value = savedBlur;

      const blurMap = {
        0: 0,
        10: 2,
        20: 4,
        30: 6,
        40: 8,
        50: 10,
      };
      const blurPx = blurMap[savedBlur] || 0;
      document.documentElement.style.setProperty("--bg-blur", blurPx + "px");

      if (
        savedBlur === "10" ||
        savedBlur === "20" ||
        savedBlur === "30" ||
        savedBlur === "40" ||
        savedBlur === "50"
      ) {
        document.documentElement.classList.add("high-bg-blur");
      } else {
        document.documentElement.classList.remove("high-bg-blur");
      }
    }

    const bg = state.get("backgroundImage");
    const randomBgMode = state.get("randomBgMode");
    const randomBgTime = state.get("randomBgTime");
    let backgroundReady = Promise.resolve();

    if (randomBgMode === "random") {
      document.body.classList.add("has-custom-bg");
      backgroundReady = this.initializeRandomBackground();
    } else if (randomBgMode === "freeze") {
      document.body.classList.add("has-custom-bg");
      if (randomBgTime === -1) {
        if (state.get("savedBgUrl")) {
          document.body.style.backgroundImage = `url(${state.get("savedBgUrl")})`;
        } else if (bg) {
          document.body.style.backgroundImage = `url(${bg})`;
        }
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      } else if (randomBgTime && Date.now() - randomBgTime > 259200000) {
        backgroundReady = this.fetchRandomBackground("startup");
      } else if (state.get("savedBgUrl")) {
        document.body.style.backgroundImage = `url(${state.get("savedBgUrl")})`;
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      } else if (bg) {
        document.body.style.backgroundImage = `url(${bg})`;
        if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
      }
    } else if (bg) {
      document.body.classList.add("has-custom-bg");
      document.body.style.backgroundImage = `url(${bg})`;
      if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
    } else {
      document.body.classList.remove("has-custom-bg");
    }

    const storedBackgroundReady = secondStorage
      .getImage()
      .then((blob) => {
        if (blob) {
          document.body.classList.add("has-custom-bg");
          if (this.els.removeBg) this.els.removeBg.classList.remove("hidden");
          this.updateAutoThemeGlowState();
        }
      })
      .catch((err) => console.error("IndexedDB load error:", err));
    this._backgroundReady = Promise.allSettled([
      backgroundReady,
      storedBackgroundReady,
    ]).then(() => undefined);

    this.updateRandomBgButtons();
    this.updateAutoThemeGlowState();

    const currentGlow = state.get("glowEffect");
    const isGlowOn = currentGlow !== false;
    document.body.classList.toggle("no-glow", !isGlowOn);
    if (this.els.glowToggle) this.els.glowToggle.checked = isGlowOn;

    if (state.get("autoTheme")) {
      if (document.body.classList.contains("has-custom-bg")) {
        this.disableAutoTheme();
      } else {
        this.applyRandomTheme();
      }
    } else {
      const isGradient = state.get("gradientModeActive");
      if (isGradient) {
        const themeId = state.get("gradientThemeId");
        const theme =
          THEMES.gradient.find((t) => t.id === themeId) || THEMES.gradient[0];
        this.applyGradientTheme(theme, false);
      } else {
        const savedId = state.get("normalThemeId");

        let theme = THEMES.normal.find((t) => t.id === savedId);

        if (!theme) {
          const savedPresets = state.get("userSavedThemes") || [];
          theme = savedPresets.find((t) => t.id === savedId);
        }

        if (theme) {
          const themeToApply = this.isDarkModeAvailableForTheme(theme)
            ? this.getDarkModeTheme(theme, state.get("darkMode") === true)
            : theme;
          this.applyNormalTheme(themeToApply);
        } else {
          this.applyCustomColors();
        }
      }
    }

    this.updateClockFormatState();
    this.updateTempTogglesState();
    this.updateWarningText();
    this.updateDarkModeControlState();
  }

  updateClockFormatState() {
    const isAnalog = state.get("clockType") === "analog";
    if (this.els.clockFormatRow) {
      if (isAnalog) {
        this.els.clockFormatRow.classList.add("disabled");
        if (this.els.clockFormat) this.els.clockFormat.disabled = true;
      } else {
        this.els.clockFormatRow.classList.remove("disabled");
        if (this.els.clockFormat) this.els.clockFormat.disabled = false;
      }
    }
  }

  updateTempTogglesState() {
    const widgetControl = state.get("widgetControl") || "all";
    const lat = state.get("yd_lat");
    const lon = state.get("yd_lon");

    const hasLocation =
      lat !== null &&
      lat !== undefined &&
      lat !== "" &&
      lon !== null &&
      lon !== undefined &&
      lon !== "" &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lon)) &&
      Number(lat) >= -90 &&
      Number(lat) <= 90 &&
      Number(lon) >= -180 &&
      Number(lon) <= 180;

    const weatherHidden = [
      "search-only",
      "quote-only",
      "search-quote",
      "nothing",
    ].includes(widgetControl);
    const shouldDisable = weatherHidden || !hasLocation;

    [this.els.tempUnit, this.els.tempDisplayToggle].forEach((toggleEl) => {
      if (toggleEl) {
        toggleEl.disabled = shouldDisable;
        const row = toggleEl.closest(".setting-row");
        if (row) {
          if (shouldDisable) {
            row.classList.add("disabled");
          } else {
            row.classList.remove("disabled");
          }
        }
      }
    });
  }

  generateCuratedTheme() {
    const hasBackground = this.hasCustomBackground();
    if (state.get("gradientModeActive") === true || hasBackground) return false;

    const mode = state.get("darkMode") === true ? "dark" : "light";
    const generationIndex = generatedThemeIndex;
    const recipe =
      GENERATED_THEME_RECIPES[generationIndex % GENERATED_THEME_RECIPES.length];
    generatedThemeIndex += 1;

    this.disableAutoTheme();
    this.applyNormalTheme({
      name: "Generated Theme",
      type: mode,
      colors: createGeneratedTheme(mode, recipe, generationIndex),
    });
    return true;
  }

  isValidSavedTheme(theme) {
    return Boolean(
      theme &&
        typeof theme.id === "string" &&
        theme.id &&
        theme.colors &&
        typeof theme.colors === "object" &&
        GENERATED_THEME_COLOR_KEYS.every(
          (key) => isUsableThemeColor(theme.colors[key]),
        ),
    );
  }

  buildAutoThemePool() {
    const pool = [];
    const seen = new Set();
    const add = (theme, mode, key) => {
      if (!theme || seen.has(key)) return;
      seen.add(key);
      pool.push({ ...theme, mode, autoKey: key });
    };

    THEMES.normal.forEach((theme) => {
      const baseMode = this.getThemeType(theme);
      add(theme, "normal", `normal:${theme.id}:${baseMode}`);

      const opposite = this.getDarkModeTheme(theme, baseMode !== "dark");
      const hasDifferentColors =
        opposite &&
        JSON.stringify(opposite.colors) !== JSON.stringify(theme.colors);
      if (hasDifferentColors) {
        add(
          opposite,
          "normal",
          `normal:${theme.id}:${this.getThemeType(opposite)}`,
        );
      }
    });

    THEMES.gradient.forEach((theme) =>
      add(theme, "gradient", `gradient:${theme.id}`),
    );

    (state.get("userSavedThemes") || []).forEach((theme) => {
      if (!this.isValidSavedTheme(theme)) return;
      add(
        theme,
        "normal",
        `saved:${theme.id}:${this.getThemeType(theme)}`,
      );
    });

    return pool;
  }

  getCurrentAutoThemeKey() {
    if (state.get("gradientModeActive") === true) {
      return `gradient:${state.get("gradientThemeId") || ""}`;
    }
    const normalThemeId = state.get("normalThemeId") || "custom";
    const saved = (state.get("userSavedThemes") || []).some(
      (theme) => theme?.id === normalThemeId && this.isValidSavedTheme(theme),
    );
    return `${saved ? "saved" : "normal"}:${normalThemeId}:${
      state.get("darkMode") === true ? "dark" : "light"
    }`;
  }

  applyRandomTheme() {
    const pool = this.buildAutoThemePool();
    if (pool.length === 0) return false;

    const currentKey = this.getCurrentAutoThemeKey();
    const candidates = pool.filter((theme) => theme.autoKey !== currentKey);
    const available = candidates.length > 0 ? candidates : pool;
    const random = available[Math.floor(Math.random() * available.length)];

    if (random.mode === "gradient") this.applyGradientTheme(random);
    else this.applyNormalTheme(random);
    return true;
  }

  disableAutoTheme() {
    if (state.get("autoTheme")) {
      state.set("autoTheme", false);
      if (this.els.autoThemeToggle) {
        this.els.autoThemeToggle.checked = false;
      }
    }
  }

  setupEventListeners() {
    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.els.btn.classList.add("animating");

      const fullModal = window.__fullSettingsModalInstance;
      const isFullOpen = fullModal && fullModal.isOpen;
      const isMiniOpen =
        this.els.popup && this.els.popup.classList.contains("visible");

      if (isFullOpen) {
        fullModal.close();
        state.set("lastSettingsView", "full");
      } else if (isMiniOpen) {
        this.els.popup.classList.remove("visible");
        this.els.btn.setAttribute("aria-expanded", "false");
        this.els.popup.setAttribute("aria-hidden", "true");
        state.set("lastSettingsView", "mini");
      } else {
        const lastView = state.get("lastSettingsView") || "mini";
        if (lastView === "full" && fullModal) {
          fullModal.open();
        } else {
          this.els.popup.classList.add("visible");
          this.els.btn.setAttribute("aria-expanded", "true");
          this.els.popup.setAttribute("aria-hidden", "false");
          state.set("lastSettingsView", "mini");
          this.handleMiniSettingsOpened();
        }
      }

      this.renderShortcutEditor();

      // --- DYNAMIC VIBE: DELETE FIRST DEFAULT TASK ---
      if (state.get("defaultTasksPinned")) {
        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-1");
        });
      }

      setTimeout(() => this.els.btn.classList.remove("animating"), 400);
    });

    if (this.els.bgBlurSelect) {
      this.els.bgBlurSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        state.set("bgBlurIntensity", val);

        const blurMap = {
          0: 0,
          10: 2,
          20: 4,
          30: 6,
          40: 8,
          50: 10,
        };
        const blurPx = blurMap[val] || 0;
        document.documentElement.style.setProperty("--bg-blur", blurPx + "px");

        if (
          val === "10" ||
          val === "20" ||
          val === "30" ||
          val === "40" ||
          val === "50"
        ) {
          document.documentElement.classList.add("high-bg-blur");
        } else {
          document.documentElement.classList.remove("high-bg-blur");
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest?.(".ydd-custom-modal-overlay, #custom-modal-overlay")) {
        return;
      }
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(e.target) &&
        !this.els.btn.contains(e.target)
      ) {
        this.els.popup.classList.remove("visible");
        this.els.btn.setAttribute("aria-expanded", "false");
        this.els.popup.setAttribute("aria-hidden", "true");
        state.set("lastSettingsView", "mini");
      }
    });
    this.els.popup.addEventListener("click", (e) => e.stopPropagation());

    const glowToggle = document.getElementById("glow-effect-toggle");
    if (glowToggle) {
      glowToggle.addEventListener("change", (e) => {
        console.log("GLOW TOGGLE CHANGED:", e.target.checked);
        state.set("glowEffect", e.target.checked);
        document.body.classList.toggle("no-glow", !e.target.checked);
      });
    } else {
      console.error("GLOW TOGGLE NOT FOUND IN DOM");
    }

    this.els.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        this.els.tabs.forEach((t) => t.classList.remove("active"));
        this.els.tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
        this.els.panes.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        if (this.els.panes[index])
          this.els.panes[index].classList.add("active");
      });
    });

    if (this.els.widgetControl)
      this.els.widgetControl.addEventListener("change", (e) =>
        state.set("widgetControl", e.target.value),
      );

    if (this.els.shortcutsPosition) {
      this.els.shortcutsPosition.addEventListener("change", (e) => {
        state.set("shortcutsPosition", e.target.value);
      });
    }

    if (this.els.newsEnabled) {
      this.els.newsEnabled.addEventListener("change", async (event) => {
        const enabled = event.target.checked;
        const success = await window.__newsFeedInstance?.setEnabledFromUser(enabled);
        if (!success) {
          event.target.checked = state.get("newsEnabled") === true;
          if (enabled && !(state.get("newsProviderIds") || []).length) {
            window.__fullSettingsModalInstance?.openTab?.("fs-tab-news");
          }
        }
      });
    }
    this.els.configureNews?.addEventListener("click", () => {
      window.__fullSettingsModalInstance?.openTab?.("fs-tab-news");
    });

    if (this.els.searchSuggestionMode) {
      this.els.searchSuggestionMode.addEventListener("change", async (event) => {
        const select = event.currentTarget;
        const requestedMode = select.value;
        if (requestedMode === "history-online" && !(await requestSearchSuggestionConsent())) {
          select.value = state.get("searchSuggestionMode") || "history-only";
          syncSuggestionModeSelect(select);
          return;
        }
        state.set("searchSuggestionMode", requestedMode);
        select.value = requestedMode;
        syncSuggestionModeSelect(select);
      });
    }

    if (this.els.dark) {
      this.els.dark.addEventListener("change", () => {
        if (!this.isDarkModeAvailable()) {
          this.updateDarkModeControlState();
          return;
        }
        this.disableAutoTheme();
        this.applyDarkModePreference(this.els.dark.checked);
        this.recordDarkModeToggleUse();

        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.addEventListener("change", () => {
        if (this.els.autoThemeToggle.checked) {
          state.set("autoTheme", true);
        } else {
          state.set("autoTheme", false);
        }

        import("../utils.js").then((utils) => {
          utils.completeDefaultTask("dt-5");
        });
      });
    }

    if (this.els.colorControls) {
      this.els.colorControls.addEventListener("input", (e) => {
        if (e.target.classList.contains("color-picker")) {
          const isGradient =
            document.body.classList.contains("gradient-mode-active") ||
            state.get("gradientModeActive") === true;
          if (isGradient) {
            const gradientIndex = e.target.id === "gradient-color-1-picker" ? 0 :
              e.target.id === "gradient-color-2-picker" ? 1 : -1;
            if (gradientIndex >= 0) {
              this.updateGradientColor(gradientIndex, e.target.value);
            }
            return;
          }
          this.disableAutoTheme();

          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-5");
          });

          if (state.get("darkMode")) {
            state.set("darkMode", false);
            if (this.els.dark) this.els.dark.checked = false;
          }

          const mapping = {
            "bg-primary-picker": "--bg-primary",
            "bg-secondary-picker": "--bg-secondary",
            "bg-tertiary-picker": "--bg-tertiary",
            "theme-color-picker": "--accent-color",
            "text-primary-picker": "--text-primary",
            "text-secondary-picker": "--text-secondary",
            "text-placeholder-picker": "--text-placeholder",
            "glow-color-picker": "--glow-color",
          };
          const cssVar = mapping[e.target.id];
          if (cssVar) {
            document.body.style.setProperty(cssVar, e.target.value);
            state.set(`custom-${cssVar}`, e.target.value);
            if (cssVar === "--bg-tertiary")
              this.updateIconInversion(e.target.value);
          }
          state.set("normalThemeId", "custom");
          this.applyCustomThemeUI();
          this.updateWarningText();
        }
      });
    }

    if (this.els.updateBtn) {
      this.els.updateBtn.addEventListener("click", () => {
        window.open(
          "https://github.com/xtditom/YourDynamicDashboard/releases/latest",
          "_blank",
        );
      });
    }
    if (this.els.githubBtn) {
      this.els.githubBtn.addEventListener("click", () => {
        window.open(
          "https://github.com/xtditom/YourDynamicDashboard",
          "_blank",
        );
      });
    }

    if (this.els.saveThemeBtn) {
      this.els.saveThemeBtn.addEventListener("click", () =>
        this.saveCurrentTheme(),
      );
    }

    if (this.els.infoBtn) {
      this.els.infoBtn.addEventListener("click", () => {
        this.openInfoModal();

        // --- DYNAMIC VIBE: DELETE SECOND DEFAULT TASK ---
        if (state.get("defaultTasksPinned")) {
          import("../utils.js").then((utils) => {
            utils.completeDefaultTask("dt-2");
          });
        }
      });
    }
    if (this.els.infoClose) {
      this.els.infoClose.addEventListener("click", () => this.closeInfoModal());
    }
    if (this.els.infoOverlay) {
      this.els.infoOverlay.addEventListener("click", (event) => {
        if (event.target === this.els.infoOverlay) this.closeInfoModal();
      });
    }
    this.setupMiscListeners();

    if (this.els.randomBgFreeze) {
      this.els.randomBgFreeze.addEventListener("click", () => {
        this.freezeRandomBackground();
      });
    }
    if (this.els.randomBgRnd) {
      this.els.randomBgRnd.addEventListener("click", () => {
        this.fetchRandomBackground();
      });
    }
    if (this.els.randomBgSchedule) {
      this.els.randomBgSchedule.addEventListener("change", async (event) => {
        const previous = this.getRandomBackgroundSchedule();
        const accepted = await this.setRandomBackgroundSchedule(
          event.target.value,
        );
        if (!accepted) event.target.value = previous;
      });
    }
  }

  handleMiniSettingsOpened() {
    if (state.get("fullSettingsEverOpened") === true) return;

    const previousCount = Number(state.get("miniSettingsOpenCount")) || 0;
    const openCount = previousCount + 1;
    if (!state.set("miniSettingsOpenCount", openCount)) return;

    const shouldShowFirstHint =
      openCount === 1 && state.get("miniSettingsHintShown") !== true;
    const shouldShowRepeatHint = openCount % 8 === 0;
    if (shouldShowFirstHint || shouldShowRepeatHint) {
      this.showMiniSettingsHint();
    }
  }

  showThemeGenerationHint() {
    if (state.get("themeGenerationHintShown") === true) return;
    if (!state.set("themeGenerationHintShown", true)) return;

    const hint = document.createElement("div");
    hint.className = "mini-settings-hint";
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    hint.textContent = "Use “Save Current Theme” to save this generated theme.";
    const timer = document.createElement("div");
    timer.className = "zen-notice-timer";
    timer.setAttribute("aria-hidden", "true");
    hint.style.setProperty("--zen-notice-duration", "7000ms");
    hint.appendChild(timer);
    document.body.appendChild(hint);

    window.requestAnimationFrame(() => hint.classList.add("visible"));
    window.setTimeout(() => {
      hint.classList.remove("visible");
      window.setTimeout(() => hint.remove(), 300);
    }, 7000);
  }

  showMiniSettingsHint() {
    if (state.get("fullSettingsEverOpened") === true) return;
    state.set("miniSettingsHintShown", true);

    const hint = document.createElement("div");
    hint.className = "mini-settings-hint";
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    hint.textContent = "Need more control? Click the top-right button to open Full Settings.";
    const timer = document.createElement("div");
    timer.className = "zen-notice-timer";
    timer.setAttribute("aria-hidden", "true");
    hint.style.setProperty("--zen-notice-duration", "7000ms");
    hint.appendChild(timer);
    document.body.appendChild(hint);

    window.requestAnimationFrame(() => hint.classList.add("visible"));
    window.setTimeout(() => {
      hint.classList.remove("visible");
      window.setTimeout(() => hint.remove(), 300);
    }, 7000);
  }

  openInfoModal() {
    if (!this.els.infoOverlay) return;
    if (!this.els.infoOverlay.classList.contains("hidden")) return;
    this.els.infoOverlay.classList.remove("hidden");
    this.els.infoOverlay.inert = false;
    this.els.infoOverlay.setAttribute("aria-hidden", "false");
    this._infoKeyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeInfoModal();
      } else if (event.key === "Tab") {
        const focusable = this.els.infoOverlay.querySelectorAll("button, a[href], input, select, textarea");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", this._infoKeyHandler);
  }

  closeInfoModal() {
    if (!this.els.infoOverlay) return;
    this.els.infoOverlay.classList.add("hidden");
    this.els.infoOverlay.inert = true;
    this.els.infoOverlay.setAttribute("aria-hidden", "true");
    if (this._infoKeyHandler) {
      document.removeEventListener("keydown", this._infoKeyHandler);
      this._infoKeyHandler = null;
    }
  }

  saveCurrentTheme() {
    if (state.get("gradientModeActive")) {
      showCustomModal("You cannot save Gradient themes as presets.");
      return;
    }

    const currentColors = {};
    const vars = [
      "--bg-primary",
      "--bg-secondary",
      "--bg-tertiary",
      "--accent-color",
      "--text-primary",
      "--text-secondary",
      "--text-placeholder",
      "--glow-color",
    ];

    vars.forEach((v) => {
      currentColors[v] =
        state.get(`custom-${v}`) ||
        getComputedStyle(document.body).getPropertyValue(v).trim();
    });

    const isMatch = THEMES.normal.some(
      (t) => JSON.stringify(t.colors) === JSON.stringify(currentColors),
    );
    if (isMatch) {
      showCustomModal("This matches a built-in theme. No need to save.");
      return;
    }

    let savedThemes = state.get("userSavedThemes") || [];
    const type =
      document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";

    if (savedThemes.length >= 5) {
      savedThemes[4] = {
        id: `preset-${Date.now()}`,
        name: `Preset 5`,
        colors: currentColors,
        type,
      };
    } else {
      savedThemes.push({
        id: `preset-${Date.now()}`,
        name: `Preset ${savedThemes.length + 1}`,
        colors: currentColors,
        type,
      });
    }

    state.set("userSavedThemes", savedThemes);
    this.renderSavedThemes();
  }

  renderSavedThemes() {
    if (this.els.savedContainer) {
      this.els.savedContainer.innerHTML = "";
      const savedThemes = state.get("userSavedThemes") || [];

      for (let i = 0; i < 5; i++) {
        const theme = savedThemes[i];
        const btn = document.createElement("div");
        btn.className = "saved-preset-button";

        if (theme) {
          btn.classList.add("filled");
          btn.textContent = theme.name;
          const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
          const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
          const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
          btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";

          const applySavedTheme = async () => {
            await this.applySelectedTheme(theme);
          };
          btn.addEventListener("click", applySavedTheme);
          makeKeyboardInteractive(btn, applySavedTheme, `Apply ${theme.name}`);

          const del = document.createElement("button");
          del.className = "delete-preset";
          del.textContent = "×";
          del.setAttribute("aria-label", `Delete ${theme.name}`);
          del.addEventListener("click", (e) => {
            e.stopPropagation();
            const newSaved = savedThemes.filter((_, idx) => idx !== i);
            newSaved.forEach((t, idx) => (t.name = `Preset ${idx + 1}`));
            state.set("userSavedThemes", newSaved);
            this.renderSavedThemes();
          });
          btn.appendChild(del);
        } else {
          btn.textContent = "Empty";
        }
        this.els.savedContainer.appendChild(btn);
      }
    }
    this.renderMiniThemes();
  }

  renderMiniThemes() {
    const container = document.getElementById("mini-themes-grid");
    if (!container) return;
    container.innerHTML = "";

    const targetNormalIds = ["theme-1", "theme-7", "theme-5"]; // Crimson Red, Phosphor, Sakura
    const targetGradientIds = ["glacier", "bio-lime", "deep-space"]; // Glacier, Bio Lime, Deep Space

    targetNormalIds.forEach((id) => {
      const theme = THEMES.normal.find((t) => t.id === id);
      if (!theme) return;
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      btn.title = theme.name;
      const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
      const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
      const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
      btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
      btn.addEventListener("click", async () => {
        await this.applySelectedTheme(theme);
      });
      container.appendChild(btn);
    });

    targetGradientIds.forEach((id) => {
      const theme = THEMES.gradient.find((t) => t.id === id);
      if (!theme) return;
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      btn.title = theme.name;
      btn.style.background = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;
      btn.addEventListener("click", async () => {
        await this.applySelectedTheme(theme, true);
      });
      container.appendChild(btn);
    });

    const savedThemes = state.get("userSavedThemes") || [];
    for (let i = 0; i < 3; i++) {
      const theme = savedThemes[i];
      const btn = document.createElement("button");
      btn.className = "mini-theme-swatch";
      if (theme) {
        btn.title = theme.name;
        const rightColor = window.__getThemeRightColor
          ? window.__getThemeRightColor(theme)
          : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]);
        btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
        btn.addEventListener("click", async () => {
          await this.applySelectedTheme(theme);
        });
      } else {
        btn.classList.add("empty");
        btn.title = `Preset ${i + 1} (Empty)`;
      }
      container.appendChild(btn);
    }
  }

  hasCustomBackground() {
    return (
      document.body.classList.contains("has-custom-bg") ||
      !!state.get("backgroundImage") ||
      !!state.get("randomBgMode") ||
      localStorage.getItem("has_idb_bg") === "true"
    );
  }

  async applySelectedTheme(theme, isGradient = false) {
    if (this.hasCustomBackground()) {
      const decision = await showCustomModal(
        "Applying this theme will permanently delete your custom background. Continue?",
        true,
        true,
        [
          { text: "OK", value: "ok", width: "110px" },
          {
            text: "No",
            value: "no",
            width: "110px",
            style:
              "background: var(--bg-interactive); color: var(--text-primary);",
          },
        ],
      );
      if (decision !== "ok") return false;
      if (!(await this.removeCustomBg())) return false;
    }

    this.disableAutoTheme();
    if (isGradient) this.applyGradientTheme(theme);
    else this.applyNormalTheme(theme);
    completeDefaultTask("dt-5");
    return true;
  }

  applyNormalTheme(theme) {
    [
      "--bg-interactive",
      "--bg-interactive-hover",
      "--bg-hover-translucent",
      "--border-color",
      "--switch-bg",
      "--switch-border",
      "--switch-thumb",
      "--switch-active-bg",
      "--form-control-bg",
      "--form-control-text",
      "--form-control-placeholder",
      "--form-control-border",
      "--widget-bg",
      "--widget-border",
      "--text-color",
      "--text-shadow",
    ].forEach((property) => document.body.style.removeProperty(property));

    state.set("gradientModeActive", false);
    state.set("transparencyActive", false);
    document.body.classList.remove("gradient-mode-active");
    document.body.classList.remove("gradient-dark");
    document.body.classList.remove("gradient-light");
    document.body.classList.remove("transparency-active");

    if (theme.id) {
      state.set("normalThemeId", theme.id);
    } else {
      state.set("normalThemeId", "custom");
    }

    Object.entries(theme.colors).forEach(([key, val]) => {
      document.body.style.setProperty(key, val);
      state.set(`custom-${key}`, val);
      if (key === "--bg-tertiary") this.updateIconInversion(val);
    });

    const isDarkType = this.getThemeType(theme) === "dark";
    const isBuiltInTheme = THEMES.normal.some((builtIn) => builtIn.id === theme.id);
    if (!isBuiltInTheme) {
      Object.entries(deriveCustomThemeUI(theme.colors, isDarkType)).forEach(([key, val]) => {
        document.body.style.setProperty(key, val);
      });
    }

    this.syncColorPickers(theme.colors);

    state.set("darkMode", isDarkType);
    if (this.els.dark) this.els.dark.checked = isDarkType;
    document.body.setAttribute("data-theme", isDarkType ? "dark" : "light");
    this.syncThemeIdentity(theme.id || "custom");
    if (theme.colors["--bg-tertiary"]) {
      this.updateIconInversion(theme.colors["--bg-tertiary"]);
    }

    this.updateWarningText();
    this.updateAutoThemeGlowState();
    this.updateDarkModeControlState();
    document.body.classList.remove("force-white-text");
  }

  applyCustomThemeUI(colors = {}) {
    if (state.get("gradientModeActive") === true || this.hasCustomBackground()) return;

    const colorKeys = [
      "--bg-primary",
      "--bg-secondary",
      "--bg-tertiary",
      "--accent-color",
      "--text-primary",
      "--text-secondary",
      "--text-placeholder",
    ];
    const resolvedColors = { ...colors };
    colorKeys.forEach((key) => {
      if (!resolvedColors[key]) {
        resolvedColors[key] =
          document.body.style.getPropertyValue(key).trim() ||
          getComputedStyle(document.body).getPropertyValue(key).trim();
      }
    });

    Object.entries(
      deriveCustomThemeUI(resolvedColors, state.get("darkMode") === true),
    ).forEach(([key, val]) => {
      document.body.style.setProperty(key, val);
    });
  }

  isDarkModeAvailableForTheme(theme) {
    return (
      state.get("gradientModeActive") !== true &&
      !!theme?.id &&
      DARK_MODE_THEME_IDS.has(theme.id)
    );
  }

  getDarkModeTheme(theme, enabled) {
    if (!theme?.id) return theme;

    const baseTheme =
      THEMES.normal.find((item) => item.id === theme.id) || theme;

    if (theme.id === "default-light" || theme.id === "default-dark") {
      return THEMES.normal.find((item) =>
        enabled ? item.id === "default-dark" : item.id === "default-light",
      );
    }

    const variantColors = enabled
      ? LIGHT_THEME_DARK_VARIANTS[theme.id]
      : DARK_THEME_LIGHT_VARIANTS[theme.id];
    if (!variantColors) return baseTheme;

    return {
      ...baseTheme,
      type: enabled ? "dark" : "light",
      darkVariant: true,
      colors: { ...baseTheme.colors, ...variantColors },
    };
  }

  applyDarkModePreference(enabled) {
    if (!this.isDarkModeAvailable()) {
      this.updateDarkModeControlState();
      return;
    }

    const themeId = state.get("normalThemeId");
    const baseTheme = THEMES.normal.find((theme) => theme.id === themeId);
    if (!baseTheme) return;

    this.applyNormalTheme(this.getDarkModeTheme(baseTheme, enabled));
  }

  applyGradientTheme(theme, save = true, preserveMotion = false) {
    if (!theme?.colors?.length || theme.colors.length < 2) return;
    const storedThemeId = state.get("gradientColorThemeId");
    const storedColors = [
      normalizeHexColor(state.get("gradientColor1")),
      normalizeHexColor(state.get("gradientColor2")),
    ];
    const hasStoredColors =
      !save &&
      storedThemeId === theme.id &&
      storedColors.every((color) => isHexColor(color));
    const gradientColors = hasStoredColors
      ? storedColors
      : theme.colors.slice(0, 2).map(normalizeHexColor);

    if (save) {
      state.set("gradientModeActive", true);
      state.set("gradientThemeId", theme.id);
      state.set("transparencyActive", true);
      state.set("gradientColorThemeId", theme.id);
      state.set("gradientColor1", gradientColors[0]);
      state.set("gradientColor2", gradientColors[1]);
    } else if (!storedThemeId) {
      state.set("gradientColorThemeId", theme.id);
      state.set("gradientColor1", gradientColors[0]);
      state.set("gradientColor2", gradientColors[1]);
    }

    const builtInTheme = THEMES.gradient.find((item) => item.id === theme.id);
    const colorsWereCustomized =
      Boolean(builtInTheme) &&
      gradientColors.some(
        (color, index) => color !== normalizeHexColor(builtInTheme.colors[index]),
      );
    const gradientType = colorsWereCustomized
      ? classifyGradientType(gradientColors)
      : theme.type || classifyGradientType(gradientColors);
    const isDarkType = gradientType === "dark";
    state.set("darkMode", isDarkType);
    if (this.els.dark) this.els.dark.checked = isDarkType;

    document.body.style.setProperty("--gradient-color-1", gradientColors[0]);
    document.body.style.setProperty("--gradient-color-2", gradientColors[1]);

    if (!preserveMotion) {
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const timings = ["ease", "linear", "ease-in-out"];
      const randomAngle = angles[Math.floor(Math.random() * angles.length)];
      const randomTiming = timings[Math.floor(Math.random() * timings.length)];

      document.body.style.setProperty("--gradient-angle", `${randomAngle}deg`);
      document.body.style.setProperty("--gradient-timing", randomTiming);
    }

    document.body.classList.add("gradient-mode-active");
    document.body.classList.add("transparency-active");

    document.body.classList.remove("gradient-dark", "gradient-light");
    if (isDarkType) {
      document.body.classList.add("gradient-dark");
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.classList.add("gradient-light");
      document.body.setAttribute("data-theme", "light");
    }

    if (!isDarkType) {
      document.body.classList.add("force-white-text");
    } else {
      document.body.classList.remove("force-white-text");
    }

    const useCustomGradientUI = colorsWereCustomized;
    const gradientUI = useCustomGradientUI
      ? isDarkType
        ? ALIEN_DARK
        : ALIEN_LIGHT
      : theme.ui;
    Object.entries(gradientUI).forEach(([key, val]) => {
      document.body.style.setProperty(key, val);
    });
    this.syncThemeIdentity(`gradient-${theme.id || "gradient"}`);

    this.updateWarningText();
    this.updateAutoThemeGlowState();
    this.updateDarkModeControlState();
  }

  updateGradientColor(index, value) {
    const color = String(value || "").trim();
    if (![0, 1].includes(index) || !isHexColor(color)) return false;
    const themeId = state.get("gradientThemeId") || state.get("gradientColorThemeId");
    const theme = THEMES.gradient.find((item) => item.id === themeId) || THEMES.gradient[0];
    const current = [
      normalizeHexColor(state.get("gradientColor1")) || normalizeHexColor(theme.colors[0]),
      normalizeHexColor(state.get("gradientColor2")) || normalizeHexColor(theme.colors[1]),
    ];
    current[index] = color;
    state.set("gradientColorThemeId", theme.id);
    state.set("gradientColor1", current[0]);
    state.set("gradientColor2", current[1]);
    this.applyGradientTheme({ ...theme, colors: current }, false, true);
    return true;
  }

  isDarkModeAvailable() {
    return (
      state.get("gradientModeActive") !== true &&
      !this.hasCustomBackground() &&
      DARK_MODE_THEME_IDS.has(state.get("normalThemeId"))
    );
  }

  isDefaultThemeModeAvailable() {
    return this.isDarkModeAvailable();
  }

  updateDarkModeControlState() {
    const available = this.isDarkModeAvailable();
    const input = this.els.dark;
    const row = input?.closest(".setting-row");
    if (input) {
      input.disabled = !available;
      input.checked = available && state.get("darkMode") === true;
    }
    row?.classList.toggle("disabled", !available);

    window.__fullSettingsModalInstance?._updateControlAvailability?.();
  }

  updateDarkModeUpdatedBadge() {
    const hidden =
      (Number(state.get("darkModeToggleUseCount")) || 0) >= 20;
    const miniSticker = document.getElementById("dark-mode-updated-sticker");
    if (miniSticker) miniSticker.hidden = hidden;
    window.__fullSettingsModalInstance?.updateDarkModeUpdatedBadge?.(hidden);
  }

  updateWeatherLocationBadge() {
    const hidden =
      (Number(state.get("weatherLocationSaveCount")) || 0) >= 2;
    const miniSticker = document.getElementById(
      "weather-location-updated-sticker",
    );
    if (miniSticker) miniSticker.hidden = hidden;
    window.__fullSettingsModalInstance?.updateWeatherLocationBadge?.(hidden);
  }

  recordWeatherLocationSaveUse() {
    const currentCount = Math.max(
      0,
      Number(state.get("weatherLocationSaveCount")) || 0,
    );
    const nextCount = Math.min(2, currentCount + 1);
    if (!state.set("weatherLocationSaveCount", nextCount)) return;
    this.updateWeatherLocationBadge();
  }

  recordThemePresetUse(themeId) {
    const key =
      themeId === "theme-8"
        ? "lavenderMistThemeUseCount"
        : themeId === "dawn-bloom"
          ? "dawnBloomThemeUseCount"
          : null;
    if (!key || (Number(state.get(key)) || 0) >= 1) return;
    if (!state.set(key, 1)) return;
    window.__fullSettingsModalInstance?.updateThemeBadges?.();
  }

  recordThemeGeneratorUse() {
    if ((Number(state.get("themeGeneratorUseCount")) || 0) >= 1) return;
    if (!state.set("themeGeneratorUseCount", 1)) return;
    window.__fullSettingsModalInstance?.updateThemeGeneratorBadge?.(true);
  }

  recordDarkModeToggleUse() {
    const currentCount = Math.max(
      0,
      Number(state.get("darkModeToggleUseCount")) || 0,
    );
    const nextCount = Math.min(20, currentCount + 1);
    if (!state.set("darkModeToggleUseCount", nextCount)) return;
    this.updateDarkModeUpdatedBadge();
  }

  applyCustomColors() {
    if (state.get("gradientModeActive")) return;

    const defaultFallback = THEMES.normal[1].colors;

    const vars = [
      "--bg-primary",
      "--bg-secondary",
      "--accent-color",
      "--text-primary",
      "--bg-tertiary",
      "--text-secondary",
      "--text-placeholder",
      "--glow-color",
    ];

    const colors = {};
    vars.forEach((v) => {
      const saved =
        state.get(`custom-${v}`) ||
        defaultFallback[v] ||
        getComputedStyle(document.body).getPropertyValue(v).trim();
      if (saved) {
        document.body.style.setProperty(v, saved);
        colors[v] = saved;
        if (v === "--bg-tertiary") this.updateIconInversion(saved);
      }
    });
    this.applyCustomThemeUI(colors);
    this.syncColorPickers(colors);
    document.body.style.setProperty("--icon-filter", "grayscale(0%)");
    document.body.style.setProperty("--icon-opacity", "1");
    this.syncThemeIdentity("custom");
  }

  syncThemeIdentity(themeId) {
    const id = themeId || "custom";
    document.body.setAttribute("data-theme-id", id);
    document.documentElement.setAttribute("data-theme-id", id);
    const isDefaultDark = id === "default-dark" && !state.get("gradientModeActive");
    document.body.style.setProperty(
      "--icon-filter",
      isDefaultDark ? "grayscale(100%) brightness(1)" : "grayscale(0%)",
    );
    document.body.style.setProperty("--icon-opacity", isDefaultDark ? "0.8" : "1");
  }

  async searchLocation() {
    const city = this.els.locInput.value.trim();
    if (!city) return;

    const requestId = ++this._locationRequestId;
    this._locationController?.abort();
    const controller = new AbortController();
    this._locationController = controller;
    this.els.locInput.disabled = true;
    if (this.els.locSave) this.els.locSave.textContent = "...";
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
      const results = getGeocodingResults(await res.json());
      if (requestId !== this._locationRequestId) return;
      if (results.length === 0) {
        showCustomModal(
          `Could not find any city with name "${city}". Try another name.`,
        );
        return;
      }
      const loc = await chooseGeocodingResult(results, city);
      if (requestId !== this._locationRequestId || !loc) return;
      {
        state.set("yd_city", loc.name);
        state.set("yd_lat", Number(loc.latitude));
        state.set("yd_lon", Number(loc.longitude));
        state.set("locationUpdate", Date.now());
        this.els.locInput.value = loc.name;
        if (this.els.locSave) {
          this.els.locSave.textContent = "Saved";
          setTimeout(() => {
            if (requestId === this._locationRequestId) {
              this.els.locSave.textContent = "Save";
            }
          }, 2000);
        }
      }
    } catch (e) {
      if (e?.name !== "AbortError" && requestId === this._locationRequestId) {
        console.error("Geocoding Error:", e);
        showCustomModal("Could not look up that location. Check your connection and try again.");
      }
    } finally {
      if (requestId === this._locationRequestId) {
        this.els.locInput.disabled = false;
        if (this.els.locSave && this.els.locSave.textContent === "...") {
          this.els.locSave.textContent = "Save";
        }
      }
    }
  }

  async reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
      const data = await res.json();
      if (!data || typeof data !== "object") throw new TypeError("Invalid reverse geocoding response");
      return [data.city, data.locality, data.principalSubdivision]
        .find((value) => typeof value === "string" && value.trim()) || "Unknown Location";
    } catch (e) {
      return `${parseFloat(lat).toFixed(1)}, ${parseFloat(lon).toFixed(1)}`;
    }
  }

  async freezeRandomBackground() {
    const currentMode = state.get("randomBgMode");
    if (currentMode === "freeze") {
      if (await this.fetchRandomBackground("user", null, { preserveSchedule: true })) {
        state.set("randomBgTime", null);
      }
    } else {
      const result = await showCustomModal(
        "Freeze current background? You can save it for 72 hours or forever.",
        false,
        false,
        [
          { text: "Save Forever", value: "forever", width: "140px" },
          { text: "72 Hours", value: "ok", width: "120px" },
          {
            text: "Cancel",
            value: "cancel",
            width: "100px",
            style:
              "background: var(--bg-interactive); color: var(--text-primary);",
          },
        ],
      );

      if (result === "cancel" || !result) return;

      if (
        !state.get("savedBgUrl") ||
        !document.body.classList.contains("has-custom-bg")
      ) {
        if (!(await this.fetchRandomBackground())) return;
      }

      state.set("randomBgMode", "freeze");
      await this._clearRandomBackgroundQueue();
      state.set("randomBgTime", result === "forever" ? -1 : Date.now());
      this.updateRandomBgButtons();

      const message =
        result === "forever"
          ? "Background is saved forever! It won't change until you manually update it."
          : "Background is freezed for the next 72 hours.";

      setTimeout(() => showCustomModal(message), 10);
    }
    if (window.__fullSettingsModalInstance) {
      window.__fullSettingsModalInstance._updateBgState();
    }
  }

  async detectLocation() {
    if (!navigator.geolocation) {
      showCustomModal("Geolocation not supported by your browser.");
      return;
    }

    // If user previously opted out of our consent modal, go straight
    // to the browser's native location prompt
    if (localStorage.getItem("hideGpsConsent") === "true") {
      this._requestBrowserLocation();
      return;
    }

    // Show our own privacy-info consent modal first
    const result = await showCustomModal(
      "Your coordinates are used strictly to fetch local weather data. " +
        "When you proceed, your browser will securely ping Open-Meteo " +
        "(for weather) and BigDataCloud (for the city name).\n\n" +
        "This data is saved locally on your device. We do not track you " +
        "in the background, and we have no server to store your location data.\n\n" +
        "Select Remember choice to skip this notice next time. Your browser still controls location permission.",
      false,
      false,
      [
        {
          text: "I Agree",
          value: ({ checkboxChecked }) => ({
            action: "agree",
            remember: checkboxChecked,
          }),
          width: "130px",
        },
        {
          text: "Cancel",
          value: "cancel",
          width: "130px",
          style:
            "background: var(--bg-interactive); color: var(--text-primary);",
        },
      ],
      false,
      {
        title: "Please Read",
        checkbox: {
          label: "Remember choice",
        },
        italicText:
          "Select Remember choice to skip this notice next time. Your browser still controls location permission.",
      },
    );

    if (!result || result === "cancel" || result.action !== "agree") return;

    if (result.remember) {
      localStorage.setItem("hideGpsConsent", "true");
    }

    // This triggers the browser's native "Allow location?" prompt
    this._requestBrowserLocation();
  }

  /** Calls the standard Web Geolocation API — the browser handles the permission prompt. */
  _requestBrowserLocation() {
    const requestId = ++this._gpsRequestId;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const gpsLat = pos.coords.latitude;
        const gpsLon = pos.coords.longitude;
        if (
          requestId !== this._gpsRequestId ||
          !Number.isFinite(gpsLat) ||
          !Number.isFinite(gpsLon) ||
          gpsLat < -90 ||
          gpsLat > 90 ||
          gpsLon < -180 ||
          gpsLon > 180
        ) return;
        const gpsCity = await this.reverseGeocode(gpsLat, gpsLon);
        if (requestId !== this._gpsRequestId) return;
        state.set("yd_city", gpsCity);
        state.set("yd_lat", gpsLat);
        state.set("yd_lon", gpsLon);
        state.set("locationUpdate", Date.now());
        if (this.els.locInput) this.els.locInput.value = gpsCity;
        if (
          window.__fullSettingsModalInstance &&
          window.__fullSettingsModalInstance.els.fsLocInput
        ) {
          window.__fullSettingsModalInstance.els.fsLocInput.value = gpsCity;
        }
      },
      (err) =>
        showCustomModal(
          "Geolocation error: " +
            err.message +
            ". Please enable location services.",
        ),
    );
  }

  updateWarningText() {
    const isGradient = state.get("gradientModeActive");
    const animationsDisabled = state.get("disableAnimations") === true;
    if (this.els.themeColorNote) {
      this.els.themeColorNote.style.display = "none";
    }

    const glowPicker = document.getElementById("glow-color-picker");
    if (this.els.glowToggle) {
      const glowDisabled = isGradient || animationsDisabled;
      this.els.glowToggle.disabled = glowDisabled;
      const glowRow = this.els.glowToggle.closest(".setting-row");

      if (glowDisabled) {
        if (glowRow) glowRow.classList.add("disabled");

        if (glowPicker) {
          glowPicker.disabled = true;
          glowPicker.style.opacity = "0.5";
          glowPicker.style.cursor = "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) parentRow.classList.add("disabled");
        }
      } else {
        if (glowRow) glowRow.classList.remove("disabled");

        const isGlowOn = this.els.glowToggle.checked;
        if (glowPicker) {
          glowPicker.disabled = !isGlowOn;
          glowPicker.style.opacity = isGlowOn ? "1" : "0.5";
          glowPicker.style.cursor = isGlowOn ? "pointer" : "not-allowed";
          const parentRow = glowPicker.closest(".setting-row");
          if (parentRow) {
            if (!isGlowOn) parentRow.classList.add("disabled");
            else parentRow.classList.remove("disabled");
          }
        }
      }
    }
  }

  syncColorPickers(colors) {
    const mapping = {
      "--bg-primary": "bg-primary-picker",
      "--bg-secondary": "bg-secondary-picker",
      "--bg-tertiary": "bg-tertiary-picker",
      "--accent-color": "theme-color-picker",
      "--text-primary": "text-primary-picker",
      "--text-secondary": "text-secondary-picker",
      "--text-placeholder": "text-placeholder-picker",
      "--glow-color": "glow-color-picker",
    };
    Object.entries(colors).forEach(([key, val]) => {
      const id = mapping[key];
      if (id) {
        const el = document.getElementById(id);
        if (el) el.value = val;
      }
    });
  }

  renderThemes() {
    const createBtn = (container, list, isGradient) => {
      if (!container) return;
      container.innerHTML = "";
      list.forEach((theme) => {
        const btn = document.createElement("button");
        btn.className = `theme-preset-button ${isGradient ? "gradient" : ""}`;
        btn.textContent = theme.name;
        if (isGradient) {
          btn.style.background = `linear-gradient(to top right, ${theme.colors[0]} 50%, ${theme.colors[1]} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        } else {
          const isAzureSky = theme.name === "Azure Sky" || theme.id === "theme-3";
          const isPhosphor = theme.name === "Phosphor" || theme.id === "theme-7";
          const rightColor = isAzureSky ? "#006EFF" : (isPhosphor ? "#91AA5B" : (theme.colors["--accent-color"] || theme.colors["--bg-secondary"]));
          btn.style.background = `linear-gradient(to top right, ${theme.colors["--bg-primary"]} 50%, ${rightColor} 50%)`;
          btn.style.color = "#ffffff";
          btn.style.textShadow =
            "0 1px 3px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)";
        }
        btn.addEventListener("click", async () => {
          await this.applySelectedTheme(theme, isGradient);
        });
        container.appendChild(btn);
      });
    };
    createBtn(this.els.normalContainer, THEMES.normal, false);
    createBtn(this.els.gradientContainer, THEMES.gradient, true);
  }

  bindSimpleToggle(el, key, trueValue) {
    if (!el) return;
    const current = state.get(key);
    if (key === "showDate" || key === "hideGreetings") {
      if (current === undefined || current === null) {
        state.set(key, false);
        el.checked = false;
      } else {
        el.checked = current === true;
      }
    } else if (key === "autoTheme") {
      if (current === undefined) {
        state.set(key, false);
        el.checked = false;
      } else {
        el.checked = current === true;
      }
    } else {
      if (typeof trueValue === "boolean") {
        el.checked = current === trueValue;
      } else {
        el.checked = current === trueValue;
      }
    }

    el.addEventListener("change", () => {
      const val =
        typeof trueValue === "boolean"
          ? el.checked
          : el.checked
            ? trueValue
            : key === "clockFormat"
              ? "12"
              : "digital";
      if (key === "tempUnit")
        state.set(key, el.checked ? "imperial" : "metric");
      else state.set(key, val);
    });
  }

  bindHideToggle(el, key) {
    if (!el) return;
    el.checked = state.get(key) === false;
    el.addEventListener("change", () => {
      state.set(key, !el.checked);
    });
  }

  setupMiscListeners() {
    if (this.els.locInput) {
      this.els.locInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.searchLocation();
      });
    }
    if (this.els.locSave) {
      this.els.locSave.addEventListener("click", () => {
        this.recordWeatherLocationSaveUse();
        this.searchLocation();
      });
    }
    if (this.els.locDetect) {
      this.els.locDetect.addEventListener("click", () => this.detectLocation());
    }
    if (this.els.uploadBg) {
      this.els.uploadBg.addEventListener("click", () => {
        this.els.bgInput.value = "";
        this.els.bgInput.click();
      });
    }
    if (this.els.bgInput) {
      this.els.bgInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) await this.handleBgUpload(file);
        this.els.bgInput.value = "";
      });
    }
    if (this.els.removeBg) {
      this.els.removeBg.addEventListener("click", async () => {
        await this.removeCustomBg();
      });
    }
    if (this.els.shortcutForm) {
      this.els.shortcutForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputs = this.els.shortcutForm.querySelectorAll("input");
        if (await this.addShortcut(inputs[0].value, inputs[1].value)) {
          inputs[0].value = "";
          inputs[1].value = "";
        }
      });
    }
    if (this.els.backup) {
      this.els.backup.addEventListener("click", () => this.backup());
    }
    if (this.els.restore && this.els.restoreInput) {
      this.els.restore.addEventListener("click", () =>
        this.els.restoreInput.click(),
      );
      this.els.restoreInput.addEventListener("change", (e) => this.restore(e));
    }
    if (this.els.reset) {
      this.els.reset.addEventListener("click", () => this.resetAll());
    }
  }

  _releaseActiveBackgroundObjectUrl() {
    if (this._activeBackgroundObjectUrl) {
      URL.revokeObjectURL(this._activeBackgroundObjectUrl);
      this._activeBackgroundObjectUrl = null;
    }
    window.__releaseYddPreloadBackground?.();
  }

  _removePreloadedBackgroundStyles() {
    document.getElementById("ydd-remote-background")?.remove();
    document.getElementById("ydd-idb-background")?.remove();
    document.getElementById("idb-preloader")?.remove();
  }

  _applyBackgroundUrl(url) {
    document.body.classList.add("has-custom-bg");
    document.body.style.setProperty(
      "background-image",
      `url("${String(url).replaceAll('"', "%22")}")`,
      "important",
    );
    document.body.style.setProperty("background-size", "cover", "important");
    document.body.style.setProperty(
      "background-position",
      "center",
      "important",
    );
  }

  _syncBackgroundControls() {
    const hasBackground = document.body.classList.contains("has-custom-bg");
    if (this.els.removeBg) {
      this.els.removeBg.classList.toggle("hidden", !hasBackground);
    }
    this.updateRandomBgButtons();
    this.updateAutoThemeGlowState();
    window.__fullSettingsModalInstance?._updateBgState();
  }

  getRandomBackgroundSchedule() {
    const schedule = state.get("randomBgSchedule");
    return Object.prototype.hasOwnProperty.call(RANDOM_BG_SCHEDULES, schedule)
      ? schedule
      : "refresh";
  }

  _getRandomBackgroundDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _isRandomBackgroundDue(schedule = this.getRandomBackgroundSchedule()) {
    if (schedule === "refresh") return false;
    if (schedule === "day") {
      return state.get("randomBgLastChangedDate") !== this._getRandomBackgroundDateKey();
    }

    const interval = RANDOM_BG_SCHEDULES[schedule]?.interval;
    const lastChangedAt = Number(state.get("randomBgLastChangedAt")) || 0;
    return !lastChangedAt || Date.now() - lastChangedAt >= interval;
  }

  _getRandomBackgroundCurrentPreview() {
    const value = state.get("randomBgCurrentPreview");
    return typeof value === "string" && value.startsWith("data:image/")
      ? value
      : null;
  }

  _getRandomBackgroundCurrentUrls() {
    return [state.get("savedBgUrl"), state.get("backgroundImage")].filter(
      (url) => typeof url === "string" && url,
    );
  }

  _getRandomBackgroundIdentity(url) {
    if (typeof url !== "string" || !url) return null;
    try {
      const parsed = new URL(url);
      const picsumId = parsed.pathname.match(/\/id\/([^/]+)/)?.[1];
      return picsumId
        ? `picsum:${picsumId}`
        : `${parsed.origin}${parsed.pathname}`;
    } catch (error) {
      return url;
    }
  }

  _getRandomBackgroundFallbackCurrent() {
    const url = state.get("savedBgUrl") || state.get("backgroundImage");
    if (typeof url !== "string" || !url.trim()) return null;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return {
        url: parsed.href,
        blob: null,
        preview: this._getRandomBackgroundCurrentPreview(),
      };
    } catch (error) {
      return null;
    }
  }

  async _getStoredRandomBackgroundCurrent() {
    try {
      const current = await secondStorage.getRandomBackgroundCurrent();
      return this._normalizeRandomBackgroundEntry(current);
    } catch (error) {
      console.warn("Current random background could not be read:", error);
      return null;
    }
  }

  async _persistRandomBackgroundCurrent(entry) {
    const normalized = this._normalizeRandomBackgroundEntry(entry);
    if (!normalized) return false;

    state.set("randomBgCurrentPreview", normalized.preview || "");
    try {
      await secondStorage.saveRandomBackgroundCurrent(normalized);
      return true;
    } catch (error) {
      console.warn("Current random background could not be saved:", error);
      return false;
    }
  }

  async _clearRandomBackgroundCurrent() {
    state.set("randomBgCurrentPreview", "");
    try {
      await secondStorage.deleteRandomBackgroundCurrent();
    } catch (error) {
      console.warn("Current random background could not be cleared:", error);
    }
  }

  _markRandomBackgroundChanged() {
    state.set("randomBgLastChangedAt", Date.now());
    state.set("randomBgLastChangedDate", this._getRandomBackgroundDateKey());
  }

  async setRandomBackgroundSchedule(schedule) {
    if (!Object.prototype.hasOwnProperty.call(RANDOM_BG_SCHEDULES, schedule)) {
      return false;
    }
    if (state.get("randomBgMode") !== "random") return false;

    if (
      schedule === "refresh" &&
      state.get("randomBgRefreshWarningDismissed") !== true
    ) {
      const result = await showCustomModal(
        RANDOM_BG_REFRESH_WARNING,
        false,
        false,
        [
          {
            text: "OK",
            value: ({ checkboxChecked }) => ({
              action: "ok",
              remember: checkboxChecked,
            }),
            width: "120px",
          },
          {
            text: "Cancel",
            value: () => "cancel",
            width: "120px",
            style:
              "background: var(--bg-interactive); color: var(--text-primary);",
          },
        ],
        false,
        {
          checkbox: {
            label: "Don't show this warning again",
          },
        },
      );
      if (!result || (result !== "ok" && result.action !== "ok")) {
        return false;
      }
      if (result.remember === true) {
        state.set("randomBgRefreshWarningDismissed", true);
      }
    }

    this.dismissRandomBackgroundScheduleBadge();
    state.set("randomBgSchedule", schedule);
    if (schedule !== "refresh") this._markRandomBackgroundChanged();
    this.updateRandomBgButtons();
    this._scheduleRandomBackgroundRefresh();
    return true;
  }

  dismissRandomBackgroundScheduleBadge() {
    if (state.get("randomBgScheduleBadgeDismissed") === true) return;
    state.set("randomBgScheduleBadgeDismissed", true);
    if (this.els.randomBgUpdatedSticker) {
      this.els.randomBgUpdatedSticker.hidden = true;
    }
    window.__fullSettingsModalInstance?.updateRandomBackgroundBadge?.(true);
  }

  _scheduleRandomBackgroundRefresh() {
    if (this._randomBgScheduleTimer) {
      window.clearTimeout(this._randomBgScheduleTimer);
      this._randomBgScheduleTimer = null;
    }
    if (state.get("randomBgMode") !== "random") return;

    const schedule = this.getRandomBackgroundSchedule();
    if (schedule === "refresh") return;

    let delay;
    if (schedule === "day") {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setHours(24, 0, 0, 0);
      delay = Math.max(1000, nextDay.getTime() - now.getTime() + 100);
    } else {
      const interval = RANDOM_BG_SCHEDULES[schedule].interval;
      const lastChangedAt = Number(state.get("randomBgLastChangedAt")) || 0;
      delay = lastChangedAt
        ? Math.max(1000, interval - (Date.now() - lastChangedAt))
        : 1000;
    }

    this._randomBgScheduleTimer = window.setTimeout(async () => {
      this._randomBgScheduleTimer = null;
      if (
        state.get("randomBgMode") === "random" &&
        this._isRandomBackgroundDue()
      ) {
        await this._advanceRandomBackground("schedule");
      }
      this._scheduleRandomBackgroundRefresh();
    }, delay);
  }

  _getRandomBackgroundNextUrl() {
    const value = state.get("randomBgNextUrl");
    if (typeof value !== "string" || !value.trim()) return null;

    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.href;
    } catch (error) {
      return null;
    }
  }

  _getRandomBackgroundNextPreview() {
    const value = state.get("randomBgNextPreview");
    return typeof value === "string" && value.startsWith("data:image/")
      ? value
      : null;
  }

  _setRandomBackgroundNextUrl(url) {
    return state.set("randomBgNextUrl", url || null);
  }

  _setRandomBackgroundNextMetadata(entry) {
    this._setRandomBackgroundNextUrl(entry?.url || null);
    state.set("randomBgNextPreview", entry?.preview || null);
  }

  _normalizeRandomBackgroundEntry(entry) {
    if (!entry || typeof entry.url !== "string" || !entry.url.trim()) return null;

    let url;
    try {
      url = new URL(entry.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    } catch (error) {
      return null;
    }

    return {
      url: url.href,
      blob: entry.blob instanceof Blob ? entry.blob : null,
      preview:
        typeof entry.preview === "string" && entry.preview.startsWith("data:image/")
          ? entry.preview
          : null,
    };
  }

  async _persistRandomBackgroundQueue(queue) {
    const limitedQueue = queue.slice(0, RANDOM_BG_QUEUE_TARGET);
    this._setRandomBackgroundNextMetadata(limitedQueue[0] || null);

    try {
      await secondStorage.saveRandomBackgroundQueue(limitedQueue);
      return true;
    } catch (error) {
      console.warn("Random background queue could not be saved:", error);
      return false;
    }
  }

  async _clearRandomBackgroundQueue() {
    this._setRandomBackgroundNextMetadata(null);
    try {
      await secondStorage.deleteRandomBackgroundQueue();
    } catch (error) {
      console.warn("Random background queue could not be cleared:", error);
    }
  }

  _applyRandomBackgroundAsCurrent(url, displayUrl = url) {
    this._releaseActiveBackgroundObjectUrl();
    this._removePreloadedBackgroundStyles();
    this._applyBackgroundUrl(displayUrl);
    state.set("savedBgUrl", url);
    state.set("backgroundImage", url);
    state.set("randomBgMode", "random");
    state.set("randomBgTime", null);
  }

  async _waitForImageDecode(url) {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Background image could not be decoded."));
    });
    image.src = url;

    if (typeof image.decode === "function") {
      try {
        await image.decode();
        return true;
      } catch (error) {
        // Fall back to the load event for browsers with incomplete decode support.
      }
    }
    await loaded;
    return true;
  }

  async _createRandomBackgroundPreview(blob) {
    let source = null;
    let objectUrl = null;
    try {
      if (typeof createImageBitmap === "function") {
        source = await createImageBitmap(blob);
      } else {
        objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.src = objectUrl;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error("Preview image could not be decoded."));
        });
        source = image;
      }

      const sourceWidth = source.width || source.naturalWidth;
      const sourceHeight = source.height || source.naturalHeight;
      if (!sourceWidth || !sourceHeight) return null;

      const scale = Math.min(1, RANDOM_BG_PREVIEW_WIDTH / sourceWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.58);
    } catch (error) {
      return null;
    } finally {
      source?.close?.();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  async _useRandomBackgroundEntry(
    entry,
    operationId,
    { markChanged = true, persistCurrent = true } = {},
  ) {
    let displayUrl = entry.url;
    let objectUrl = null;

    if (entry.blob) {
      try {
        objectUrl = URL.createObjectURL(entry.blob);
        await this._waitForImageDecode(objectUrl);
        displayUrl = objectUrl;
      } catch (error) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    }

    if (operationId !== this._backgroundOperationId) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return false;
    }

    this._applyRandomBackgroundAsCurrent(entry.url, displayUrl);
    this._activeBackgroundObjectUrl = objectUrl;
    if (persistCurrent) await this._persistRandomBackgroundCurrent(entry);
    if (markChanged) this._markRandomBackgroundChanged();
    return true;
  }

  async _getStoredRandomBackgroundQueue() {
    try {
      const storedQueue = await secondStorage.getRandomBackgroundQueue();
      return storedQueue.map((entry) => this._normalizeRandomBackgroundEntry(entry)).filter(Boolean);
    } catch (error) {
      console.warn("Random background queue could not be read:", error);
      return [];
    }
  }

  async _takeRandomBackgroundQueue() {
    try {
      const result = await secondStorage.takeRandomBackgroundQueue();
      const remainingQueue = (result?.queue || [])
        .map((entry) => this._normalizeRandomBackgroundEntry(entry))
        .filter(Boolean);
      this._setRandomBackgroundNextMetadata(remainingQueue[0] || null);
      return {
        hadEntry: Boolean(result?.entry),
        queueExists: result?.queueExists === true,
        entry: this._normalizeRandomBackgroundEntry(result?.entry),
        queue: remainingQueue,
      };
    } catch (error) {
      console.warn("Random background queue item could not be consumed:", error);
      return { hadEntry: false, queueExists: false, entry: null, queue: [] };
    }
  }

  async _takeNextDistinctRandomBackground(excludedUrls = []) {
    const excluded = new Set(
      (Array.isArray(excludedUrls) ? excludedUrls : []).filter(
        (url) => typeof url === "string" && url,
      ).map((url) => this._getRandomBackgroundIdentity(url)),
    );
    let consumed = await this._takeRandomBackgroundQueue();
    while (
      consumed.hadEntry &&
      (!consumed.entry ||
        excluded.has(this._getRandomBackgroundIdentity(consumed.entry.url)))
    ) {
      consumed = await this._takeRandomBackgroundQueue();
    }
    return consumed;
  }

  async _fetchRandomWallpaper(excludedUrls = [], { priority = "high" } = {}) {
    const width = Math.max(800, Math.min(1920, Math.round(window.innerWidth)));
    const height = Math.max(600, Math.min(1080, Math.round(window.innerHeight)));
    const excluded = new Set(
      (Array.isArray(excludedUrls) ? excludedUrls : []).filter(
        (url) => typeof url === "string" && url,
      ).map((url) => this._getRandomBackgroundIdentity(url)),
    );

    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const cacheKey = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        RANDOM_BG_FETCH_TIMEOUT_MS,
      );
      try {
        const response = await fetch(
          `https://picsum.photos/${width}/${height}?random=${cacheKey}`,
          {
            signal: controller.signal,
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            priority,
          },
        );
        if (!response.ok) {
          throw new Error(`Wallpaper service returned ${response.status}.`);
        }

        const finalUrl = response.url;
        if (!finalUrl) throw new Error("Wallpaper service returned no image URL.");
        if (excluded.has(this._getRandomBackgroundIdentity(finalUrl))) {
          await response.body?.cancel?.();
          continue;
        }

        const wallpaperBlob = await response.blob();
        await validateImageBlob(wallpaperBlob, {
          maxBytes: 20 * 1024 * 1024,
          maxWidth: 4096,
          maxHeight: 4096,
          maxPixels: 20_000_000,
        });
        return {
          url: finalUrl,
          blob: wallpaperBlob,
          preview: await this._createRandomBackgroundPreview(wallpaperBlob),
        };
      } catch (error) {
        lastError = error?.name === "AbortError"
          ? new Error("Wallpaper request timed out.")
          : error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Wallpaper service repeatedly returned the current image.");
  }

  async _advanceRandomBackground(origin = "schedule", operationId = null) {
    const activeOperationId = operationId || ++this._backgroundOperationId;
    try {
      const consumedQueue = await this._takeNextDistinctRandomBackground(
        this._getRandomBackgroundCurrentUrls(),
      );
      if (activeOperationId !== this._backgroundOperationId) return false;

      if (consumedQueue.entry) {
        if (
          !(await this._useRandomBackgroundEntry(
            consumedQueue.entry,
            activeOperationId,
          ))
        ) {
          return false;
        }
        this._syncBackgroundControls();
        void this._fillRandomBackgroundQueue(
          activeOperationId,
          consumedQueue.queue,
        );
        return true;
      }

      const entry = await this._fetchRandomWallpaper([
        ...this._getRandomBackgroundCurrentUrls(),
      ]);
      if (activeOperationId !== this._backgroundOperationId) return false;
      if (!(await this._useRandomBackgroundEntry(entry, activeOperationId))) {
        return false;
      }
      await this._persistRandomBackgroundQueue([]);
      this._syncBackgroundControls();
      void this._fillRandomBackgroundQueue(activeOperationId, []);
      return true;
    } catch (error) {
      if (activeOperationId === this._backgroundOperationId) {
        console.warn(`Random background ${origin} update failed:`, error);
      }
      return false;
    }
  }

  async initializeRandomBackground() {
    const operationId = ++this._backgroundOperationId;
    const schedule = this.getRandomBackgroundSchedule();

    if (schedule !== "refresh") {
      const currentEntry =
        (await this._getStoredRandomBackgroundCurrent()) ||
        this._getRandomBackgroundFallbackCurrent();
      if (operationId !== this._backgroundOperationId) return;

      if (currentEntry && !this._isRandomBackgroundDue(schedule)) {
        if (
          !(await this._useRandomBackgroundEntry(currentEntry, operationId, {
            markChanged: false,
          }))
        ) {
          return;
        }
        const queue = await this._getStoredRandomBackgroundQueue();
        if (operationId !== this._backgroundOperationId) return;
        this._syncBackgroundControls();
        void this._fillRandomBackgroundQueue(operationId, queue);
        this._scheduleRandomBackgroundRefresh();
        return;
      }

      await this._advanceRandomBackground("schedule", operationId);
      this._scheduleRandomBackgroundRefresh();
      return;
    }

    const consumedQueue = await this._takeNextDistinctRandomBackground(
      this._getRandomBackgroundCurrentUrls(),
    );
    if (operationId !== this._backgroundOperationId) return;

    if (consumedQueue.entry) {
      if (!(await this._useRandomBackgroundEntry(consumedQueue.entry, operationId))) {
        return;
      }
      this._syncBackgroundControls();
      void this._fillRandomBackgroundQueue(operationId, consumedQueue.queue);
      return;
    }

    const queuedUrl = this._getRandomBackgroundNextUrl();
    const queuedUrlIsCurrent = this._getRandomBackgroundCurrentUrls()
      .map((url) => this._getRandomBackgroundIdentity(url))
      .includes(this._getRandomBackgroundIdentity(queuedUrl));
    if (queuedUrl && !queuedUrlIsCurrent && !consumedQueue.queueExists) {
      const legacyEntry = {
        url: queuedUrl,
        preview: this._getRandomBackgroundNextPreview(),
      };
      if (!(await this._useRandomBackgroundEntry(legacyEntry, operationId))) return;
      await this._persistRandomBackgroundQueue([]);
      this._syncBackgroundControls();
      void this._fillRandomBackgroundQueue(operationId, []);
      return;
    }
    if (queuedUrl) this._setRandomBackgroundNextMetadata(null);

    try {
      const currentUrls = this._getRandomBackgroundCurrentUrls();
      const currentEntry = await this._fetchRandomWallpaper(currentUrls, {
        priority: "high",
      });
      if (operationId !== this._backgroundOperationId) return;
      if (!(await this._useRandomBackgroundEntry(currentEntry, operationId))) return;
      await this._persistRandomBackgroundQueue([]);
      this._syncBackgroundControls();
      // The current wallpaper is the foreground operation. Refill the queue
      // afterward at low priority so it cannot compete with weather or RSS.
      void this._fillRandomBackgroundQueue(operationId, []);
    } catch (error) {
      if (operationId === this._backgroundOperationId) {
        console.error("Initial random background failed:", error);
      }
    }
  }

  async _fillRandomBackgroundQueue(operationId, queue = []) {
    let storedQueue = Array.isArray(queue)
      ? queue.slice(0, RANDOM_BG_QUEUE_TARGET)
      : [];

    while (storedQueue.length < RANDOM_BG_QUEUE_TARGET) {
      try {
        if (
          operationId !== this._backgroundOperationId ||
          state.get("randomBgMode") !== "random"
        ) {
          return storedQueue.length > 0;
        }

        storedQueue = await this._getStoredRandomBackgroundQueue();
        if (storedQueue.length >= RANDOM_BG_QUEUE_TARGET) break;

        const entry = await this._fetchRandomWallpaper(
          [
            ...this._getRandomBackgroundCurrentUrls(),
            ...storedQueue.map((item) => item.url),
          ],
          { priority: "low" },
        );
        if (
          operationId !== this._backgroundOperationId ||
          state.get("randomBgMode") !== "random"
        ) {
          return storedQueue.length > 0;
        }

        storedQueue = await secondStorage.appendRandomBackgroundQueue(
          [entry],
          RANDOM_BG_QUEUE_TARGET,
        );
        storedQueue = storedQueue
          .map((item) => this._normalizeRandomBackgroundEntry(item))
          .filter(Boolean);
        this._setRandomBackgroundNextMetadata(storedQueue[0] || null);
      } catch (error) {
        if (operationId === this._backgroundOperationId) {
          console.warn("Random background prefetch failed:", error);
        }
        break;
      }
    }

    return storedQueue.length > 0;
  }

  async handleBgUpload(file) {
    if (!file) return false;
    const operationId = ++this._backgroundOperationId;
    try {
      await validateImageBlob(file);
      if (operationId !== this._backgroundOperationId) return false;
      await secondStorage.saveImage(file);
      if (operationId !== this._backgroundOperationId) return false;
      await this._clearRandomBackgroundQueue();
      await this._clearRandomBackgroundCurrent();

      const objectUrl = URL.createObjectURL(file);
      this._releaseActiveBackgroundObjectUrl();
      this._activeBackgroundObjectUrl = objectUrl;
      this._removePreloadedBackgroundStyles();
      this._applyBackgroundUrl(objectUrl);

      localStorage.setItem("has_idb_bg", "true");
      localStorage.removeItem("lowResBg");
      state.set("randomBgMode", null);
      state.set("randomBgTime", null);
      state.set("savedBgUrl", null);
      state.set("backgroundImage", null);
      this.disableAutoTheme();
      this._syncBackgroundControls();
      return true;
    } catch (error) {
      if (operationId === this._backgroundOperationId) {
        console.error("Background upload failed:", error);
        await showCustomModal(
          error instanceof TypeError
            ? error.message
            : "The background could not be saved. Your current background was kept.",
        );
      }
      return false;
    }
  }

  async removeCustomBg() {
    const operationId = ++this._backgroundOperationId;
    try {
      await secondStorage.deleteImage();
      if (operationId !== this._backgroundOperationId) return false;
      await this._clearRandomBackgroundQueue();
      await this._clearRandomBackgroundCurrent();
      this._releaseActiveBackgroundObjectUrl();
      this._removePreloadedBackgroundStyles();
      state.set("backgroundImage", null);
      state.set("savedBgUrl", null);
      state.set("randomBgMode", null);
      state.set("randomBgTime", null);
      localStorage.removeItem("has_idb_bg");
      localStorage.removeItem("lowResBg");
      document.documentElement.classList.remove("ydd-custom-bg-pending");
      document.body.classList.remove("has-custom-bg");
      document.body.style.removeProperty("background-image");
      document.body.style.removeProperty("background-size");
      document.body.style.removeProperty("background-position");
      this._syncBackgroundControls();
      return true;
    } catch (error) {
      if (operationId === this._backgroundOperationId) {
        console.error("Background removal failed:", error);
        await showCustomModal(
          "The saved background could not be removed. Nothing was changed.",
        );
      }
      return false;
    }
  }

  async resetAll() {
    if (
      await showCustomModal(
        "Resetting all deletes everything. Make sure you have backed up your settings. Are you sure you want to continue?",
        true,
        true,
      )
    ) {
      try {
        await secondStorage.deleteImage();
        await secondStorage.deleteRandomBackgroundQueue();
        await secondStorage.deleteRandomBackgroundCurrent();
      } catch (e) {
        console.error("Failed to wipe IndexedDB:", e);
      }
      clearYddLocalStorage();
      location.reload();
    }
  }

  renderShortcutEditor() {
    if (!this.els.shortcutList) return;
    this.els.shortcutList.innerHTML = "";
    const shortcuts = state.get("userShortcuts") || [];
    shortcuts.forEach((s, index) => {
      const div = document.createElement("div");
      div.className = "shortcut-editor-item";
      div.draggable = true;
      div.dataset.index = index;

      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.title = "Drag to reorder";
      dragHandle.textContent = "☰";

      const iconContainer = document.createElement("div");
      iconContainer.className = "icon-container";
      iconContainer.style.position = "relative";
      iconContainer.style.cursor = "pointer";
      iconContainer.title = "Click to upload custom icon";

      const img = document.createElement("img");
      img.src = s.customIcon || s.icon || getIconUrl(s.url);
      img.className = "icon ydd-asset-image";
      img.alt = `${s.name} icon`;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.setAttribute("aria-label", `Choose custom icon for ${s.name}`);

      iconContainer.appendChild(img);
      iconContainer.appendChild(fileInput);

      const chooseIcon = () => fileInput.click();
      iconContainer.addEventListener("click", chooseIcon);
      makeKeyboardInteractive(iconContainer, chooseIcon, `Change ${s.name} icon`);

      const inputsDiv = document.createElement("div");
      inputsDiv.className = "inputs";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "name-input";
      nameInput.value = s.name;
      nameInput.placeholder = "Name";
      nameInput.setAttribute("aria-label", `${s.name} shortcut name`);
      nameInput.maxLength = 35;

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "url-input";
      urlInput.value = s.url;
      urlInput.placeholder = "URL";
      urlInput.setAttribute("aria-label", `${s.name} shortcut URL`);
      urlInput.maxLength = 2048;

      const triggerSave = () => {
        this.updateShortcut(index, nameInput.value, urlInput.value);
      };

      nameInput.addEventListener("blur", triggerSave);
      nameInput.addEventListener("change", triggerSave);
      urlInput.addEventListener("blur", triggerSave);
      urlInput.addEventListener("change", triggerSave);

      inputsDiv.appendChild(nameInput);
      inputsDiv.appendChild(urlInput);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "actions";

      const resetBtn = document.createElement("button");
      resetBtn.className = "action-btn reset";
      resetBtn.title = "Reset Icon";
      const resetSvgString =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
      const resetParsedSvg = new DOMParser().parseFromString(
        resetSvgString,
        "image/svg+xml",
      );
      resetBtn.appendChild(resetParsedSvg.documentElement);

      if (!s.customIcon) {
        resetBtn.style.display = "none";
      }

      resetBtn.addEventListener("click", () => {
        this.updateShortcut(index, nameInput.value, urlInput.value, null, true);
        const autoIcon = getIconUrl(urlInput.value);
        img.src = autoIcon;
        resetBtn.style.display = "none";
      });

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await validateImageBlob(file, {
            maxBytes: 2 * 1024 * 1024,
            maxWidth: 4096,
            maxHeight: 4096,
            maxPixels: 16_000_000,
          });
        } catch (error) {
          await showCustomModal(error.message);
          fileInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const tempImg = new window.Image();
          tempImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(tempImg, 0, 0, 256, 256);
            const dataUrl = canvas.toDataURL("image/png");

            img.src = dataUrl;
            this.updateShortcut(
              index,
              nameInput.value,
              urlInput.value,
              dataUrl,
            );
            resetBtn.style.display = "";
          };
          tempImg.onerror = () => showCustomModal("The icon could not be decoded.");
          tempImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });

      const delBtn = document.createElement("button");
      delBtn.className = "action-btn delete";
      delBtn.title = "Delete";
      const delSvgString =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const delParsedSvg = new DOMParser().parseFromString(
        delSvgString,
        "image/svg+xml",
      );
      delBtn.appendChild(delParsedSvg.documentElement);

      actionsDiv.appendChild(resetBtn);
      actionsDiv.appendChild(delBtn);

      div.appendChild(dragHandle);
      div.appendChild(iconContainer);
      div.appendChild(inputsDiv);
      div.appendChild(actionsDiv);

      delBtn.addEventListener("click", () => this.deleteShortcut(index));
      div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", index);
        div.classList.add("dragging");
        this.els.shortcutList.classList.add("is-reordering");
      });
      div.addEventListener("dragend", () => {
        div.classList.remove("dragging");
        this.els.shortcutList.classList.remove("is-reordering");
      });
      div.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      div.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = index;
        this.reorderShortcuts(fromIndex, toIndex);
      });
      this.els.shortcutList.appendChild(div);
    });
  }

  async addShortcut(name, url) {
    const current = [...(state.get("userShortcuts") || [])];
    if (current.length >= MAX_SHORTCUTS) {
      await showCustomModal(`You can add up to ${MAX_SHORTCUTS} shortcuts.`);
      return false;
    }
    const cleanName = String(name || "").trim().slice(0, MAX_SHORTCUT_NAME_LENGTH);
    if (!cleanName) {
      await showCustomModal("Enter a shortcut name.");
      return false;
    }
    try {
      url = normalizeHttpUrl(url);
    } catch (error) {
      await showCustomModal(error.message);
      return false;
    }
    current.push({ name: cleanName, url, icon: getIconUrl(url) });
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  updateShortcut(
    index,
    name,
    url,
    customIconData = undefined,
    removeCustomIcon = false,
  ) {
    const current = [...(state.get("userShortcuts") || [])];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return false;
    }
    const cleanName = String(name || "").trim().slice(0, MAX_SHORTCUT_NAME_LENGTH);
    if (!cleanName) {
      void showCustomModal("Enter a shortcut name.");
      return false;
    }
    try {
      url = normalizeHttpUrl(url);
    } catch (error) {
      void showCustomModal(error.message);
      return false;
    }
    if (current[index]) {
      current[index].name = cleanName;
      const oldUrl = current[index].url;
      current[index].url = url;

      if (!current[index].customIcon && !customIconData) {
        if (oldUrl !== url) {
          current[index].icon = getIconUrl(url);
        }
      }

      if (customIconData !== undefined && customIconData !== null) {
        if (
          typeof customIconData !== "string" ||
          !customIconData.startsWith("data:image/") ||
          customIconData.length > 3_000_000
        ) {
          void showCustomModal("The processed shortcut icon is too large.");
          return false;
        }
        current[index].customIcon = customIconData;
      }
      if (removeCustomIcon) {
        delete current[index].customIcon;
        current[index].icon = getIconUrl(url);
      }
      return state.set("userShortcuts", current);
    }
    return false;
  }

  deleteShortcut(index) {
    const current = [...(state.get("userShortcuts") || [])];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return false;
    }
    if (current.length <= MIN_SHORTCUTS) {
      void showCustomModal(`There must be at least ${MIN_SHORTCUTS} shortcuts.`);
      return false;
    }
    current.splice(index, 1);
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  reorderShortcuts(fromIndex, toIndex) {
    const current = [...(state.get("userShortcuts") || [])];
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= current.length ||
      toIndex >= current.length
    ) {
      return false;
    }
    if (fromIndex === toIndex) return true;
    const item = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, item);
    if (!state.set("userShortcuts", current)) return false;
    this.renderShortcutEditor();
    return true;
  }

  async backup() {
    try {
      let backgroundBlob = null;
      try {
        backgroundBlob = await secondStorage.getImage();
      } catch (error) {
        if (localStorage.getItem("has_idb_bg") === "true") throw error;
        console.warn("IndexedDB was unavailable during backup:", error);
      }
      const data = {
        format: "YourDynamicDashboard",
        version: 2,
        createdAt: new Date().toISOString(),
        localStorage: getYddStorageEntries(),
        backgroundImage: backgroundBlob
          ? await this.blobToDataUrl(backgroundBlob)
          : null,
      };
      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ydd-backup.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error("Backup failed:", error);
      showCustomModal(
        "The backup could not be created. Your data was not changed.",
      );
    }
  }

  getThemeType(theme) {
    if (theme?.type === "dark" || theme?.type === "default-dark") return "dark";
    if (theme?.type === "light") return "light";

    const color = String(theme?.colors?.["--bg-primary"] || "").trim();
    let channels = null;
    if (/^#[\da-f]{3}$/i.test(color)) {
      channels = [color[1], color[2], color[3]].map((value) =>
        parseInt(value + value, 16),
      );
    } else if (/^#[\da-f]{6}/i.test(color)) {
      channels = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ];
    } else if (/^rgba?\(/i.test(color)) {
      const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (values?.length === 3 && values.every(Number.isFinite)) channels = values;
    }
    if (channels) {
      const [r, g, b] = channels;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
        ? "dark"
        : "light";
    }
    return document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  async restore(e) {
    const file = e.target.files[0];
    if (!file) return;

    let previousEntries = {};
    let previousBackground = null;
    let mutationStarted = false;
    try {
      previousEntries = getYddStorageEntries();
      try {
        previousBackground = await secondStorage.getImage();
      } catch (error) {
        if (localStorage.getItem("has_idb_bg") === "true") {
          throw new Error(
            "The existing background could not be read safely before restore.",
            { cause: error },
          );
        }
        console.warn("IndexedDB was unavailable before restore:", error);
      }
      const data = JSON.parse(await file.text());
      const isCurrentFormat =
        data?.format === "YourDynamicDashboard" && data?.version === 2;
      const entries = validateYddStorageEntries(
        isCurrentFormat ? data.localStorage : data,
      );

      let restoredBackground = null;
      if (isCurrentFormat && data.backgroundImage !== null) {
        if (
          typeof data.backgroundImage !== "string" ||
          !data.backgroundImage.startsWith("data:image/")
        ) {
          throw new TypeError("Invalid background image in backup.");
        }
        restoredBackground = await this.dataUrlToBlob(data.backgroundImage);
        await validateImageBlob(restoredBackground);
      }

      mutationStarted = true;
      clearYddLocalStorage();
      Object.entries(entries).forEach(([key, value]) =>
        localStorage.setItem(key, value),
      );

      if (isCurrentFormat) {
        if (restoredBackground) {
          await secondStorage.saveImage(restoredBackground);
          localStorage.setItem("has_idb_bg", "true");
        } else {
          await secondStorage.deleteImage();
          localStorage.removeItem("has_idb_bg");
        }
      } else if (entries.has_idb_bg === "true" && !previousBackground) {
        localStorage.removeItem("has_idb_bg");
      }

      await secondStorage.deleteRandomBackgroundQueue();
      await secondStorage.deleteRandomBackgroundCurrent();

      location.reload();
    } catch (error) {
      console.error("Restore failed:", error);
      let rollbackSucceeded = true;
      if (mutationStarted) {
        try {
          clearYddLocalStorage();
          Object.entries(previousEntries).forEach(([key, value]) =>
            localStorage.setItem(key, value),
          );
          if (previousBackground) {
            await secondStorage.saveImage(previousBackground);
          } else {
            await secondStorage.deleteImage();
          }
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error("Restore rollback failed:", rollbackError);
        }
      }
      showCustomModal(
        rollbackSucceeded
          ? "Invalid or incomplete backup. Your current data was preserved."
          : "Restore failed and some previous data could not be recovered. " +
            "Reload the tab before making more changes.",
      );
    } finally {
      e.target.value = "";
    }
  }

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new TypeError("Could not decode backup background.");
    return response.blob();
  }

  async fetchRandomBackground(origin = "user", triggerButton = null, options = {}) {
    const operationId = ++this._backgroundOperationId;
    const fullSettingsButton =
      triggerButton || window.__fullSettingsModalInstance?.els?.fsRndBtn;
    const loadingButtons =
      origin === "startup"
        ? []
        : [this.els.randomBgRnd, fullSettingsButton].filter(Boolean);
    const originalButtonContents = new Map();
    loadingButtons.forEach((button) => {
      originalButtonContents.set(button, {
        nodes: Array.from(button.childNodes),
        title: button.getAttribute("title"),
      });
      button.replaceChildren();
      const loadingIndicator = document.createElement("span");
      const animationsDisabled =
        state.get("disableAnimations") === true ||
        document.documentElement.classList.contains("disable-animations");
      loadingIndicator.className = animationsDisabled
        ? "background-loading-indicator"
        : "background-loading-spinner";
      loadingIndicator.setAttribute("aria-hidden", "true");
      if (animationsDisabled) loadingIndicator.textContent = "⌛";
      button.appendChild(loadingIndicator);
      button.disabled = true;
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      button.setAttribute("title", "Fetching a wallpaper...");
    });

    try {
      const entry = await this._fetchRandomWallpaper(
        this._getRandomBackgroundCurrentUrls(),
      );
      if (operationId !== this._backgroundOperationId) return false;

      await secondStorage.deleteImage();
      if (operationId !== this._backgroundOperationId) return false;

      if (!(await this._useRandomBackgroundEntry(entry, operationId))) return false;
      await this._persistRandomBackgroundQueue([]);
      localStorage.removeItem("has_idb_bg");
      localStorage.removeItem("lowResBg");
      this.disableAutoTheme();
      this._syncBackgroundControls();
      void this._fillRandomBackgroundQueue(operationId, []);
      this._scheduleRandomBackgroundRefresh();
      return true;
    } catch (err) {
      if (operationId === this._backgroundOperationId) {
        console.error("Random background failed:", err);
        await showCustomModal(
          "A new background could not be loaded. Your current background was kept.",
        );
      }
      return false;
    } finally {
      loadingButtons.forEach((button) => {
        const original = originalButtonContents.get(button);
        button.replaceChildren(...original.nodes);
        button.disabled = false;
        button.classList.remove("is-loading");
        button.removeAttribute("aria-busy");
        if (original.title === null) button.removeAttribute("title");
        else button.setAttribute("title", original.title);
      });
    }
  }

  updateRandomBgButtons() {
    const mode = state.get("randomBgMode");
    const schedule = this.getRandomBackgroundSchedule();

    if (this.els.randomBgFreeze) {
      if (mode === "freeze") {
        this.els.randomBgFreeze.textContent = "Unfreeze";
        this.els.randomBgFreeze.style.color = "var(--accent-color)";
        this.els.randomBgFreeze.style.borderColor = "var(--accent-color)";
        this.els.randomBgFreeze.classList.remove("hidden");
      } else if (mode === "random") {
        this.els.randomBgFreeze.textContent = "Freeze";
        this.els.randomBgFreeze.style.color = "";
        this.els.randomBgFreeze.style.borderColor = "";
        this.els.randomBgFreeze.classList.remove("hidden");
      } else {
        this.els.randomBgFreeze.textContent = "Freeze";
        this.els.randomBgFreeze.style.color = "";
        this.els.randomBgFreeze.style.borderColor = "";
        this.els.randomBgFreeze.classList.add("hidden");
      }
    }

    if (this.els.randomBgRnd) {
      this.els.randomBgRnd.classList.toggle("hidden", mode === "random");
      this.els.randomBgRnd.style.color =
        mode === "random" ? "var(--accent-color)" : "";
      this.els.randomBgRnd.style.borderColor =
        mode === "random" ? "var(--accent-color)" : "";
    }
    if (this.els.randomBgSchedule) {
      this.els.randomBgSchedule.value = schedule;
      this.els.randomBgSchedule.classList.toggle("hidden", mode !== "random");
    }
    if (this.els.randomBgUpdatedSticker) {
      this.els.randomBgUpdatedSticker.hidden =
        state.get("randomBgScheduleBadgeDismissed") === true;
    }
  }

  updateAutoThemeGlowState() {
    const hasBg = document.body.classList.contains("has-custom-bg");
    const isGradient = document.body.classList.contains("gradient-mode-active");
    const animationsDisabled = state.get("disableAnimations") === true;
    const autoThemeDisabled = hasBg;
    const colorControlsDisabled = hasBg;
    const glowDisabled = colorControlsDisabled || animationsDisabled;

    if (this.els.blurRow) {
      if (hasBg) {
        this.els.blurRow.classList.remove("hidden");
      } else {
        this.els.blurRow.classList.add("hidden");
      }
    }

    if (this.els.autoThemeToggle) {
      this.els.autoThemeToggle.disabled = autoThemeDisabled;
      const parentRow = this.els.autoThemeToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = autoThemeDisabled ? "0.5" : "1";
    }

    if (this.els.glowToggle) {
      this.els.glowToggle.disabled = glowDisabled;
      const parentRow = this.els.glowToggle.closest(".setting-row");
      if (parentRow) parentRow.style.opacity = glowDisabled ? "0.5" : "1";
    }

    const advancedColorsContainer = document.getElementById(
      "advanced-color-controls",
    );
    const themeColorNote = document.getElementById("theme-color-note");
    const advancedColorWarning = document.getElementById(
      "advanced-color-warning",
    );

    if (advancedColorsContainer) {
      const colorInputs = advancedColorsContainer.querySelectorAll("input");
      if (colorControlsDisabled) {
        advancedColorsContainer.classList.add("advanced-colors-disabled");
        advancedColorsContainer.classList.add("disabled");
        advancedColorsContainer.style.opacity = "0.5";
        colorInputs.forEach((input) => (input.disabled = true));
        if (themeColorNote) {
          themeColorNote.style.color = "#ff6b6b";
          themeColorNote.style.fontWeight = "bold";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.remove("hidden");
        }
      } else {
        advancedColorsContainer.classList.remove("advanced-colors-disabled");
        advancedColorsContainer.classList.remove("disabled");
        advancedColorsContainer.style.opacity = "1";
        colorInputs.forEach((input) => (input.disabled = false));
        if (themeColorNote) {
          themeColorNote.style.color = "";
          themeColorNote.style.fontWeight = "normal";
        }
        if (advancedColorWarning) {
          advancedColorWarning.classList.add("hidden");
        }
      }
    }

    if (hasBg) {
      document.body.classList.add("no-glow");
    } else {
      const isGlowOn = state.get("glowEffect") !== false;
      document.body.classList.toggle("no-glow", !isGlowOn);
    }
  }

  updateIconInversion(colorVal) {
    if (!colorVal) return;
    let r, g, b;
    const color = colorVal.trim().toLowerCase();

    if (color.startsWith("#")) {
      let hex = color.substring(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (color.startsWith("rgb")) {
      const match = color.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      }
    }

    if (r !== undefined && g !== undefined && b !== undefined) {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      document.body.classList.toggle("dark-popups", luminance < 128);
    }
  }
}
// [src/modules/settings.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
