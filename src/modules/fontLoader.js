import { FONT_OPTIONS } from "../config.js";

const DEFAULT_FONT_ID = "outfit";
const LEGACY_DISPLAY_FONT_ID = "inter";
const FONT_BY_ID = new Map(FONT_OPTIONS.map((font) => [font.id, font]));
const FONT_LINKS = new Map();

function resolveFontId(value) {
  const candidate = String(value || "");
  return FONT_BY_ID.has(candidate) ? candidate : DEFAULT_FONT_ID;
}

export function getFontOption(value) {
  return FONT_BY_ID.get(resolveFontId(value)) || FONT_BY_ID.get(DEFAULT_FONT_ID);
}

function getGoogleFontUrl(font) {
  const url = new URL("https://fonts.googleapis.com/css2");
  url.searchParams.set("family", font.googleFamily);
  url.searchParams.set("display", "swap");
  return url.toString();
}

export function ensureFontLoaded(value) {
  if (typeof document === "undefined") return null;
  const font = getFontOption(value);
  const linkId = `ydd-font-${font.id}`;
  const existing = FONT_LINKS.get(font.id) || document.getElementById(linkId);
  if (existing) {
    FONT_LINKS.set(font.id, existing);
    return existing;
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = getGoogleFontUrl(font);
  link.dataset.yddFont = font.id;
  link.dataset.loadState = "loading";
  link.addEventListener("load", () => {
    link.dataset.loadState = "loaded";
  }, { once: true });
  link.addEventListener("error", () => {
    link.dataset.loadState = "failed";
    console.warn(`[YDD] Could not load ${font.label}; using the system fallback.`);
  }, { once: true });
  document.head.appendChild(link);
  FONT_LINKS.set(font.id, link);
  return link;
}

export function applyFontFamily(value) {
  const font = getFontOption(value);
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--ydd-font-family", font.stack);
    document.documentElement.dataset.fontFamily = font.id;
    ensureFontLoaded(font.id);
    // Lexend keeps its legacy Inter display pairing when explicitly selected.
    if (font.id === "lexend") ensureFontLoaded(LEGACY_DISPLAY_FONT_ID);
  }
  return font.id;
}

export function syncFontSelect(select, value) {
  if (!select) return;
  const fontId = resolveFontId(value);
  if ([...select.options].some((option) => option.value === fontId)) {
    select.value = fontId;
  }
}
