import {
  CONFIG,
  NEWS_CARD_COUNTS,
  NEWS_CATEGORIES,
  NEWS_MIN_REFETCH_MS,
  NEWS_PROVIDERS,
  NEWS_REFRESH_INTERVALS,
} from "../config.js";
import { state } from "../state.js";
import { showCustomModal } from "../utils.js";

// News configuration
const MAX_ITEMS = Math.max(...NEWS_CARD_COUNTS);
const IMAGE_PARSER_VERSION = 6;
const IMAGE_TARGET_WIDTH = 960;
const MAX_NEWS_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const LOCK_KEY = "ydd_news_fetch_lock";
const LOCK_TTL_MS = 30000;
const NEWS_PERMISSION_MODEL_VERSION = 1;
const PAGE_START_TIME = globalThis.performance?.now?.() ?? Date.now();
const CNN_SEARCH_ENDPOINT = "https://search.prod.di.api.cnn.io/content";
const CNN_CATEGORY_PATHS = Object.freeze({
  world: /\/(?:world|middleeast|europe|asia|china|africa|americas)\//,
  politics: /\/politics\//,
  business: /\/(?:business|economy|markets|money)\//,
  technology: /\/(?:tech|technology)\//,
  science: /\/science\//,
  health: /\/health\//,
  sports: /\/(?:sport|sports)\//,
  entertainment: /\/(?:entertainment|style|culture)\//,
  travel: /\/travel\//,
});
const NEWS_PERMISSION_ORIGINS = Object.freeze([
  ...new Set(
    NEWS_PROVIDERS.map((provider) => provider.permission).filter(Boolean),
  ),
]);

// Permission helpers
function getExtensionPermissionApi() {
  if (globalThis.browser?.permissions?.request) {
    return { api: globalThis.browser, promiseBased: true };
  }
  if (globalThis.chrome?.permissions?.request) {
    return { api: globalThis.chrome, promiseBased: false };
  }
  return null;
}

function callPermissionApi(methodName, details) {
  const extension = getExtensionPermissionApi();
  const method = extension?.api?.permissions?.[methodName];
  if (typeof method !== "function") return Promise.resolve(false);

  if (extension.promiseBased) {
    try {
      return Promise.resolve(method.call(extension.api.permissions, details));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      method.call(extension.api.permissions, details, (value) => {
        const runtimeError = extension.api.runtime?.lastError;
        if (runtimeError) reject(new Error(runtimeError.message));
        else resolve(value);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function permissionOriginsForProviders(providers) {
  return [
    ...new Set(
      (Array.isArray(providers) ? providers : [])
        .map((provider) => provider?.permission)
        .filter(Boolean),
    ),
  ];
}

async function hasNewsHostAccess(providers) {
  const origins = permissionOriginsForProviders(providers);
  if (!origins.length || !getExtensionPermissionApi()) return false;
  try {
    return Boolean(await callPermissionApi("contains", { origins }));
  } catch (error) {
    console.warn("[YDD] Could not check News publisher access.", error);
    return false;
  }
}

async function requestNewsHostAccess(providers) {
  const origins = permissionOriginsForProviders(providers);
  if (!origins.length || !getExtensionPermissionApi()) return false;
  try {
    return Boolean(await callPermissionApi("request", { origins }));
  } catch (error) {
    console.warn("[YDD] News publisher permission request failed.", error);
    return false;
  }
}

async function removeNewsHostAccess(origins) {
  const uniqueOrigins = [...new Set((origins || []).filter(Boolean))];
  if (!uniqueOrigins.length) return true;
  if (!getExtensionPermissionApi()) return false;

  let completed = true;
  for (const origin of uniqueOrigins) {
    try {
      const details = { origins: [origin] };
      const isGranted = Boolean(await callPermissionApi("contains", details));
      if (!isGranted) continue;
      const removed = Boolean(await callPermissionApi("remove", details));
      if (!removed) {
        completed = false;
        console.warn(`[YDD] Browser retained News access for ${origin}`);
      }
    } catch (error) {
      completed = false;
      console.warn(`[YDD] Could not remove News access for ${origin}`, error);
    }
  }
  return completed;
}

// Feed parsing helpers
function safeUrl(value, baseUrl = "") {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  try {
    const url = baseUrl ? new URL(rawValue, baseUrl) : new URL(rawValue);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function firstText(node, selectors) {
  for (const selector of selectors) {
    const value = selector.includes(":")
      ? [...node.getElementsByTagName("*")].find(
        (element) => element.localName === selector.split(":").pop(),
      )?.textContent?.trim()
      : node.querySelector(selector)?.textContent?.trim();
    if (value) return value;
  }
  return "";
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}

function looksLikeVideoUrl(url) {
  try {
    return /\.(?:avi|m4v|m3u8|mkv|mov|mp4|mpeg|mpg|webm|wmv)$/i.test(
      new URL(url).pathname,
    );
  } catch {
    return false;
  }
}

function isUsableImageUrl(url, type = "", medium = "") {
  if (!url || looksLikeVideoUrl(url)) return false;
  const normalizedType = String(type).toLowerCase();
  const normalizedMedium = String(medium).toLowerCase();
  return normalizedType.startsWith("image/") ||
    normalizedMedium === "image" ||
    looksLikeImageUrl(url);
}

function elementUrls(
  element,
  baseUrl = "",
  attributes = ["url", "href", "src"],
) {
  const urls = [];
  const srcSet = bestSrcSetUrl(
    element.getAttribute("srcset") || element.getAttribute("data-srcset"),
    baseUrl,
  );
  if (srcSet) urls.push(srcSet);
  attributes.forEach((attribute) => {
    const url = safeUrl(element.getAttribute(attribute), baseUrl);
    if (url) urls.push(url);
  });
  const childUrl = [...element.getElementsByTagName("*")].find(
    (child) => child.localName === "url",
  );
  const nestedUrl = safeUrl(childUrl?.textContent, baseUrl);
  if (nestedUrl) urls.push(nestedUrl);
  return uniqueUrls(urls);
}

function compareImageResolution(left, right) {
  const leftWidth = Number(left.getAttribute("width")) || 0;
  const rightWidth = Number(right.getAttribute("width")) || 0;
  const bucket = (width) => {
    if (!width) return 3;
    if (width < 640) return 2;
    if (width > 1200) return 1;
    return 0;
  };
  const leftBucket = bucket(leftWidth);
  const rightBucket = bucket(rightWidth);
  if (leftBucket !== rightBucket) return leftBucket - rightBucket;
  if (leftBucket === 0) {
    return Math.abs(leftWidth - IMAGE_TARGET_WIDTH) -
      Math.abs(rightWidth - IMAGE_TARGET_WIDTH);
  }
  if (leftBucket === 1) return leftWidth - rightWidth;
  if (leftBucket === 2) return rightWidth - leftWidth;
  return 0;
}

function imageCandidatesFromHtml(html, baseUrl = "") {
  if (!html) return [];
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const candidates = [];
  const add = (url, type = "", medium = "") => {
    if (isUsableImageUrl(url, type, medium)) candidates.push(url);
  };
  documentNode.querySelectorAll("img").forEach((image) => {
    elementUrls(image, baseUrl, ["src", "data-src", "data-original"]).forEach((
      url,
    ) => add(url, "image/*"));
  });
  documentNode.querySelectorAll("source").forEach((source) => {
    const type = source.getAttribute("type") || "";
    elementUrls(source, baseUrl, ["src", "data-src"]).forEach((url) =>
      add(url, type)
    );
  });
  documentNode.querySelectorAll("video").forEach((video) => {
    elementUrls(video, baseUrl, ["poster"]).forEach((url) =>
      add(url, "image/*")
    );
  });
  return uniqueUrls(candidates);
}

function bestSrcSetUrl(srcSet, baseUrl = "") {
  if (!srcSet) return "";
  const candidates = String(srcSet).split(",").map((candidate) => {
    const parts = candidate.trim().split(/\s+/);
    const url = safeUrl(parts[0], baseUrl);
    const descriptor = parts[1] || "";
    const width = descriptor.endsWith("w")
      ? Number.parseInt(descriptor, 10)
      : 0;
    const density = descriptor.endsWith("x")
      ? Number.parseFloat(descriptor)
      : 0;
    return { url, width, density };
  }).filter((candidate) => candidate.url);
  if (!candidates.length) return "";
  candidates.sort((left, right) =>
    (left.width || left.density * 640) - (right.width || right.density * 640)
  );
  const target = candidates.find((candidate) =>
    (candidate.width || candidate.density * 640) >= IMAGE_TARGET_WIDTH
  );
  return (target || candidates[candidates.length - 1]).url;
}

function looksLikeImageUrl(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(path) ||
      /(?:image|img|photo|thumb|thumbnail)/i.test(url);
  } catch {
    return false;
  }
}

function itemImageCandidates(item, baseUrl = "") {
  const elements = [...item.getElementsByTagName("*")];
  const thumbnailCandidates = [];
  const posterCandidates = [];
  const mediaImageCandidates = [];
  const enclosureCandidates = [];
  const richContentCandidates = [];

  elements.filter((element) => element.localName === "thumbnail")
    .sort(compareImageResolution)
    .forEach((element) => {
      elementUrls(element, baseUrl).forEach((url) => {
        if (isUsableImageUrl(url, "image/*")) thumbnailCandidates.push(url);
      });
    });

  elements.filter((element) => element.localName === "content")
    .sort(compareImageResolution)
    .forEach((element) => {
      const type = element.getAttribute("type") || "";
      const medium = element.getAttribute("medium") || "";
      const video = medium.toLowerCase() === "video" ||
        type.toLowerCase().startsWith("video/");
      ["poster", "thumbnail", "thumbnailUrl"].forEach((attribute) => {
        const url = safeUrl(element.getAttribute(attribute), baseUrl);
        if (url && !looksLikeVideoUrl(url)) posterCandidates.push(url);
      });
      if (video) return;
      if (
        type.toLowerCase().startsWith("image/") ||
        medium.toLowerCase() === "image"
      ) {
        elementUrls(element, baseUrl).forEach((url) => {
          if (isUsableImageUrl(url, type, medium)) {
            mediaImageCandidates.push(url);
          }
        });
      }
    });

  elements.filter((element) => element.localName === "image")
    .sort(compareImageResolution)
    .forEach((element) => {
      elementUrls(element, baseUrl, ["href", "url", "src"]).forEach((url) => {
        if (isUsableImageUrl(url, "image/*")) mediaImageCandidates.push(url);
      });
    });

  elements.filter((element) => element.localName === "enclosure")
    .sort(compareImageResolution)
    .forEach((enclosure) => {
      const type = enclosure.getAttribute("type") || "";
      elementUrls(enclosure, baseUrl, ["url", "href"]).forEach((url) => {
        if (
          type.toLowerCase().startsWith("image/") ||
          !type && isUsableImageUrl(url)
        ) {
          enclosureCandidates.push(url);
        }
      });
    });

  const richContent = elements
    .filter((element) =>
      ["encoded", "description", "summary", "content"].includes(
        element.localName,
      )
    )
    .map((element) => element.textContent || element.innerHTML || "");
  for (const content of richContent) {
    richContentCandidates.push(...imageCandidatesFromHtml(content, baseUrl));
  }

  return uniqueUrls([
    ...mediaImageCandidates,
    ...thumbnailCandidates,
    ...posterCandidates,
    ...enclosureCandidates,
    ...richContentCandidates,
  ]);
}

function guardianLegacyImageCandidates(item, baseUrl = "") {
  const elements = [...item.getElementsByTagName("*")];
  const mediaCandidates = [];
  const thumbnailCandidates = [];
  const candidates = [];
  const add = (url, type = "", medium = "", target = candidates) => {
    if (
      !url || String(type).toLowerCase().startsWith("video/") ||
      String(medium).toLowerCase() === "video"
    ) return;
    if (!looksLikeVideoUrl(url)) target.push(url);
  };

  elements.filter((element) =>
    ["thumbnail", "image"].includes(element.localName) ||
    element.localName === "content"
  )
    .sort(compareImageResolution)
    .forEach((element) => {
      const type = element.getAttribute("type") || "";
      const medium = element.getAttribute("medium") || "";
      const target = element.localName === "content"
        ? mediaCandidates
        : thumbnailCandidates;
      elementUrls(element, baseUrl, ["url", "href", "src"]).forEach((url) =>
        add(url, type, medium, target)
      );
    });

  elements.filter((element) => element.localName === "enclosure").forEach(
    (element) => {
      const type = element.getAttribute("type") || "";
      if (type.toLowerCase().startsWith("image/") || !type) {
        elementUrls(element, baseUrl, ["url", "href"]).forEach((url) =>
          add(url, type, "", candidates)
        );
      }
    },
  );

  elements
    .filter((element) =>
      ["encoded", "description", "summary", "content"].includes(
        element.localName,
      )
    )
    .map((element) => element.textContent || element.innerHTML || "")
    .forEach((content) =>
      candidates.push(...imageCandidatesFromHtml(content, baseUrl))
    );

  return uniqueUrls([
    ...mediaCandidates,
    ...thumbnailCandidates,
    ...candidates,
  ]);
}

// Feed parsers
function parseFeed(xmlText, source) {
  const documentNode = new DOMParser().parseFromString(
    xmlText,
    "application/xml",
  );
  if (documentNode.querySelector("parsererror")) {
    throw new Error("Invalid RSS or Atom XML");
  }
  return [...documentNode.querySelectorAll("item, entry")].map(
    (item, index) => {
      const linkNode = item.querySelector("link");
      const link = safeUrl(
        linkNode?.getAttribute("href") || linkNode?.textContent,
        source.url,
      );
      const title = firstText(item, ["title"]).replace(/\s+/g, " ").slice(
        0,
        300,
      );
      const published = firstText(item, [
        "pubDate",
        "published",
        "updated",
        "dc\\:date",
      ]);
      const guid = firstText(item, ["guid", "id"]);
      const imageCandidates = itemImageCandidates(item, source.url);
      const compatibilityCandidates = source.provider.id === "guardian"
        ? guardianLegacyImageCandidates(item, source.url)
        : [];
      return {
        id: (guid || link || `${source.provider.id}-${index}`).slice(0, 500),
        title,
        url: link,
        imageCandidates: uniqueUrls([
          ...imageCandidates,
          ...compatibilityCandidates,
        ]),
        providerId: source.provider.id,
        providerName: source.provider.name,
        publishedAt: Number.isFinite(Date.parse(published))
          ? Date.parse(published)
          : 0,
      };
    },
  ).map((item) => ({
    ...item,
    imageUrl: item.imageCandidates[0] || "",
  })).filter((item) => item.title && item.url && isFreshStory(item));
}

function parseCnnSearch(payload, source) {
  const results = Array.isArray(payload?.result) ? payload.result : [];
  const categoryMatcher = CNN_CATEGORY_PATHS[source.categoryId];
  return results
    .filter((item) => item?.type === "NewsArticle")
    .filter((item) => {
      if (source.categoryId === "top") return true;
      const articleUrl = safeUrl(item.url || item.path);
      if (!articleUrl || !categoryMatcher) return false;
      try {
        return categoryMatcher.test(new URL(articleUrl).pathname.toLowerCase());
      } catch {
        return false;
      }
    })
    .map((item, index) => {
      const articleUrl = safeUrl(item.url || item.path);
      const title = String(item.headline || "")
        .replace(/\s*\|\s*CNN\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      const imageUrl = safeUrl(item.thumbnail);
      const publishedAt = Date.parse(item.lastModifiedDate || "");
      return {
        id: String(item.stellarID || articleUrl || `cnn-${index}`).slice(
          0,
          500,
        ),
        title,
        url: articleUrl,
        imageCandidates: imageUrl ? [imageUrl] : [],
        imageUrl,
        providerId: source.provider.id,
        providerName: source.provider.name,
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      };
    })
    .filter((item) => item.title && item.url && isFreshStory(item));
}

// Story selection and freshness
function storyKeys(item) {
  const normalizedTitle = String(item.title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return uniqueUrls([
    item.url,
    item.id,
    normalizedTitle,
  ]);
}

function selectBalancedStories(items, providers, limit) {
  const providerIds = providers.map((provider) => provider.id);
  const buckets = new Map(providerIds.map((providerId) => [providerId, []]));
  items.forEach((item) => {
    if (buckets.has(item.providerId)) buckets.get(item.providerId).push(item);
  });
  buckets.forEach((bucket) => {
    bucket.sort((left, right) => right.publishedAt - left.publishedAt);
  });

  const selected = [];
  const selectedKeys = new Set();
  while (selected.length < limit) {
    let addedThisRound = false;
    providerIds.forEach((providerId) => {
      if (selected.length >= limit) return;
      const bucket = buckets.get(providerId);
      while (bucket?.length) {
        const candidate = bucket.shift();
        const keys = storyKeys(candidate);
        if (keys.some((key) => selectedKeys.has(key))) continue;
        keys.forEach((key) => selectedKeys.add(key));
        selected.push(candidate);
        addedThisRound = true;
        break;
      }
    });
    if (!addedThisRound) break;
  }
  return selected;
}

function formatRelativeAge(timestamp) {
  if (!timestamp) return "";
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

function getAgeMinutes(timestamp) {
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}
function isFreshStory(item, now = Date.now()) {
  const publishedAt = Number(item?.publishedAt);

  return !Number.isFinite(publishedAt) ||
    publishedAt <= 0 ||
    now - publishedAt < MAX_NEWS_AGE_MS;
}

function filterFreshStories(items, now = Date.now()) {
  return Array.isArray(items)
    ? items.filter((item) => isFreshStory(item, now))
    : [];
}

// News consent
async function requestNewsConsent(providers) {
  if (state.get("newsConsentRemembered") === true) {
    return requestNewsHostAccess(providers);
  }
  const result = await showCustomModal(
    "News Feeds connects directly to the news endpoints of publishers you select. It retrieves headlines, publication times, and available images; YDD uses no relay, account, tracking profile, or custom server. Feed metadata is stored locally, while images load from publisher servers. Your browser will ask for access only to the selected publisher hosts. Denying the browser prompt keeps News off; disabling News or deselecting a publisher removes that host access.\n\nSelect Remember choice to skip this notice next time.",
    false,
    false,
    [
      {
        text: "I Agree",
        value: ({ checkboxChecked }) => ({
          action: "agree",
          remember: checkboxChecked,

          permissionRequest: requestNewsHostAccess(providers),
        }),
        width: "130px",
      },
      {
        text: "Cancel",
        value: "cancel",
        width: "130px",
        style: "background: var(--bg-interactive); color: var(--text-primary);",
      },
    ],
    false,
    {
      title: "Please Read",
      checkbox: { label: "Remember choice" },
      italicText: "Select Remember choice to skip this notice next time.",
    },
  );
  if (!result || result === "cancel" || result.action !== "agree") return false;
  if (result.remember) state.set("newsConsentRemembered", true);
  return Boolean(await result.permissionRequest);
}

// News manager
export class NewsManager {
  constructor() {
    this.container = document.getElementById("news-feed-container");
    this.pageLoadedAt = PAGE_START_TIME;
    this.timer = null;
    this.ageTimer = null;
    this.lastRenderedCacheKey = "";
    this.fetching = false;
    this.cnnSearchPromise = null;
    this.ownerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.__newsFeedInstance = this;
    if (!this.container) return;

    state.subscribe((key, value) => {
      if (["newsEnabled", "newsPosition", "shortcutsPosition"].includes(key)) {
        this.updatePlacement();
      }
      if (
        [
          "newsEnabled",
          "newsProviderIds",
          "newsCategoryIds",
          "newsShowHeadlines",
          "newsHeadlineOpacity",
          "newsTotalCards",
          "newsRefreshIntervalMinutes",
        ].includes(key)
      ) {
        this.render();
        this.scheduleAutoRefresh();
      }
      if (key === "newsCache") {
        if (this.lastRenderedCacheKey === this.getRenderCacheKey(value)) {
          this.updateLiveAge();
        } else this.render();
      }
      if (key === "linkTargets") this.render();
    });
    window.addEventListener("storage", (event) => {
      if (["newsCache", LOCK_KEY].includes(event.key)) {
        const previousCacheKey = this.lastRenderedCacheKey;
        state.clearCache?.("newsCache");
        const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
        if (
          event.key === "newsCache" &&
          previousCacheKey === this.getRenderCacheKey(cache)
        ) {
          this.updateLiveAge();
        } else {
          this.render();
        }
        this.scheduleAutoRefresh();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
        const interval = Number(state.get("newsRefreshIntervalMinutes"));
        if (
          state.get("newsEnabled") === true &&
          NEWS_REFRESH_INTERVALS.includes(interval) &&
          Date.now() >= cache.lastAttemptAt + interval * 60000
        ) void this.refresh({ reason: "automatic" });
        else this.scheduleAutoRefresh();
      }
    });
    const permissionEvents = getExtensionPermissionApi()?.api?.permissions;
    permissionEvents?.onRemoved?.addListener?.((permissions) => {
      this.handleNewsPermissionRemoval(permissions);
    });
    this.updatePlacement();
    this.render();
    void this.initializeNewsPermissions().catch((error) => {
      console.error("[YDD] Could not initialize News publisher access.", error);
    });
  }

  getSelection() {
    const providerIds = state.get("newsProviderIds") || [];
    const requestedCategoryIds = state.get("newsCategoryIds") || [];
    const providers = NEWS_PROVIDERS.filter((provider) =>
      providerIds.includes(provider.id)
    );
    const categoryIds = NEWS_CATEGORIES
      .filter((category) => requestedCategoryIds.includes(category.id))
      .filter((category) =>
        providers.some((provider) => provider.feeds[category.id])
      )
      .map((category) => category.id);
    const sources = [];
    const seen = new Set();
    providers.forEach((provider) => {
      categoryIds.forEach((categoryId) => {
        const url = provider.feeds[categoryId];
        if (!url || seen.has(url)) return;
        seen.add(url);
        sources.push({ provider, categoryId, url });
      });
    });
    const selectionKey = JSON.stringify({
      sourceVersion: 3,
      providers: providers.map((provider) => provider.id).sort(),
      categories: [...categoryIds].sort(),
    });
    return { providers, sources, selectionKey };
  }

  getTotalCards() {
    const configured = Number(state.get("newsTotalCards"));
    return NEWS_CARD_COUNTS.includes(configured)
      ? configured
      : CONFIG.defaults.newsTotalCards;
  }

  getEffectivePosition() {
    const shortcutsPosition = state.get("shortcutsPosition") || "bottom";
    if (shortcutsPosition === "top") return "bottom";
    if (shortcutsPosition === "bottom") return "top";
    return state.get("newsPosition") === "top" ? "top" : "bottom";
  }

  updatePlacement() {
    if (!this.container) return;
    document.body.classList.remove("news-at-top", "news-at-bottom");
    this.container.classList.remove("position-top", "position-bottom");
    const visible = state.get("newsEnabled") === true;
    this.container.classList.toggle("hidden", !visible);
    if (!visible) return;
    const position = this.getEffectivePosition();
    this.container.classList.add(`position-${position}`);
    document.body.classList.add(`news-at-${position}`);
  }

  getRefreshIntervalMs() {
    const interval = Number(state.get("newsRefreshIntervalMinutes"));
    return NEWS_REFRESH_INTERVALS.includes(interval)
      ? interval * 60000
      : NEWS_MIN_REFETCH_MS;
  }

  getCooldownRemaining() {
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    const intervalMs = this.getRefreshIntervalMs();
    return Math.max(0, intervalMs - (Date.now() - cache.lastAttemptAt));
  }

  getRenderCacheKey(cache) {
    const {
      ageMinutes: _ageMinutes,
      ageHours: _ageHours,
      ...renderCache
    } = cache || {};
    return JSON.stringify(renderCache);
  }

  clearAgeTicker() {
    window.clearTimeout(this.ageTimer);
    this.ageTimer = null;
  }

  updateLiveAge({ persist = true } = {}) {
    if (!this.container) return;
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    const status = this.container.querySelector(".news-feed-header span");
    if (status) {
      status.textContent = cache.fetchedAt
        ? `Updated ${formatRelativeAge(cache.fetchedAt)} ago`
        : "Waiting for first update";
    }
    this.container.querySelectorAll(".news-card-source[data-published-at]")
      .forEach((source) => {
        const publishedAt = Number(source.dataset.publishedAt) || 0;
        source.textContent = `${source.dataset.providerName || ""}${
          publishedAt ? ` · ${formatRelativeAge(publishedAt)}` : ""
        }`;
      });
    if (persist && cache.fetchedAt) {
      const ageMinutes = getAgeMinutes(cache.fetchedAt);
      if (cache.ageMinutes !== ageMinutes) {
        state.set("newsCache", { ...cache, ageMinutes });
      }
    }
  }

  scheduleAgeTicker() {
    this.clearAgeTicker();
    if (!this.container || state.get("newsEnabled") !== true) return;
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    if (!cache.fetchedAt) return;
    const timestamps = [
      cache.fetchedAt,
      ...(Array.isArray(cache.items)
        ? cache.items.map((item) => item.publishedAt)
        : []),
    ].filter((timestamp) =>
      Number.isFinite(Number(timestamp)) && Number(timestamp) > 0
    );
    const now = Date.now();
    const delay = Math.min(...timestamps.map((timestamp) => {
      const numericTimestamp = Number(timestamp);
      const elapsed = Math.max(0, now - numericTimestamp);
      const interval = getAgeMinutes(numericTimestamp) < 60 ? 60000 : 3600000;
      return Math.max(1000, interval - (elapsed % interval) + 50);
    }));
    this.ageTimer = window.setTimeout(() => {
      this.updateLiveAge();
      this.scheduleAgeTicker();
    }, Math.min(delay, 2147483647));
  }

  emitStatus(message = "") {
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    window.dispatchEvent(
      new CustomEvent("ydd-news-status", {
        detail: {
          fetching: this.fetching,
          message,
          fetchedAt: cache.fetchedAt,
          cooldownRemaining: this.getCooldownRemaining(),
        },
      }),
    );
  }

  // Permission lifecycle
  async initializeNewsPermissions() {
    const savedPermissionModel = Number(
      state.get("newsPermissionModelVersion"),
    ) || 0;
    if (savedPermissionModel < NEWS_PERMISSION_MODEL_VERSION) {
      const wasEnabled = state.get("newsEnabled") === true;
      if (wasEnabled) state.set("newsEnabled", false);
      await removeNewsHostAccess(NEWS_PERMISSION_ORIGINS);
      state.set("newsPermissionModelVersion", NEWS_PERMISSION_MODEL_VERSION);
      if (wasEnabled) {
        this.emitStatus(
          "News was turned off so you can approve the new browser-controlled publisher permissions.",
        );
      }
      return;
    }
    if (state.get("newsEnabled") !== true) return;
    const { providers } = this.getSelection();
    if (providers.length && await hasNewsHostAccess(providers)) {
      await this.handlePageVisit();
      return;
    }
    await this.disableNewsForMissingPermissions(
      "News was turned off because publisher access is not granted. Enable News again to choose in the browser prompt.",
    );
  }

  async disableNewsForMissingPermissions(message) {
    const wasEnabled = state.get("newsEnabled") === true;
    if (wasEnabled) state.set("newsEnabled", false);
    await removeNewsHostAccess(NEWS_PERMISSION_ORIGINS);
    if (wasEnabled) this.emitStatus(message);
  }

  async revokeAllPublisherAccess() {
    return removeNewsHostAccess(NEWS_PERMISSION_ORIGINS);
  }

  handleNewsPermissionRemoval(permissions) {
    if (state.get("newsEnabled") !== true) return;
    const removedOrigins = new Set(permissions?.origins || []);
    const selectedOrigins = permissionOriginsForProviders(
      this.getSelection().providers,
    );
    if (!selectedOrigins.some((origin) => removedOrigins.has(origin))) return;
    void this.disableNewsForMissingPermissions(
      "News was turned off because publisher access was removed in the browser.",
    );
  }

  async applyConfiguration({
    enabled,
    providerIds,
    categoryIds,
    showHeadlines = true,
    headlineOpacity = 50,
    totalCards = CONFIG.defaults.newsTotalCards,
    intervalMinutes,
    position,
    refreshReason = "configuration",
    forceRefresh = false,
    refreshOnChange = true,
  }) {
    const wasEnabled = state.get("newsEnabled") === true;
    const requestedProviderIds = Array.isArray(providerIds) ? providerIds : [];
    const providers = NEWS_PROVIDERS.filter((provider) =>
      requestedProviderIds.includes(provider.id)
    );
    const supportedCategoryIds = new Set(
      NEWS_CATEGORIES
        .filter((category) =>
          providers.some((provider) => provider.feeds[category.id])
        )
        .map((category) => category.id),
    );
    const requestedCategoryIds = Array.isArray(categoryIds) ? categoryIds : [];
    const normalizedCategoryIds = [
      ...new Set(
        requestedCategoryIds.filter((categoryId) =>
          supportedCategoryIds.has(categoryId)
        ),
      ),
    ];
    if (enabled && !providers.length) {
      await showCustomModal("Choose at least one news provider.");
      return false;
    }
    if (enabled && !requestedCategoryIds.length) {
      await showCustomModal("Choose at least one news type.");
      return false;
    }
    if (
      enabled &&
      !normalizedCategoryIds.length
    ) {
      await showCustomModal(
        "The selected providers do not publish any of the selected news types. Choose another provider or type.",
      );
      return false;
    }
    if (enabled && !wasEnabled && !(await requestNewsConsent(providers))) {
      return false;
    }
    if (enabled && wasEnabled && !(await requestNewsHostAccess(providers))) {
      await showCustomModal(
        "Browser access was not granted for the selected publishers. Your existing News settings were kept.",
      );
      return false;
    }
    const previousKey = this.getSelection().selectionKey;
    state.set("newsProviderIds", requestedProviderIds);
    state.set("newsCategoryIds", normalizedCategoryIds);
    state.set("newsShowHeadlines", showHeadlines !== false);
    state.set("newsHeadlineOpacity", Number(headlineOpacity));
    state.set("newsTotalCards", Number(totalCards));
    state.set("newsRefreshIntervalMinutes", Number(intervalMinutes));
    state.set("newsPosition", position);
    state.set("newsEnabled", enabled === true);
    if (enabled === true) state.set("newsBadgeDismissed", true);
    const retainedOrigins = new Set(
      enabled ? permissionOriginsForProviders(providers) : [],
    );
    const unusedAccessRemoved = await removeNewsHostAccess(
      NEWS_PERMISSION_ORIGINS.filter((origin) => !retainedOrigins.has(origin)),
    );
    if (!unusedAccessRemoved) {
      await showCustomModal(
        "News settings were saved, but the browser retained access to one or more unselected publishers. Remove that site access from the extension's browser settings.",
      );
    }
    const changed = previousKey !== this.getSelection().selectionKey;
    if (enabled && refreshOnChange && (changed || forceRefresh)) {
      await this.refresh({ reason: refreshReason });
    } else if (enabled && refreshOnChange) {
      await this.handlePageVisit();
    }
    return true;
  }

  async setEnabledFromUser(enabled) {
    const savedProviderIds = state.get("newsProviderIds") || [];
    const providerIds = enabled && !savedProviderIds.length
      ? [...CONFIG.defaults.newsProviderIds]
      : savedProviderIds;
    return this.applyConfiguration({
      enabled,
      providerIds,
      categoryIds: state.get("newsCategoryIds") || [],
      showHeadlines: state.get("newsShowHeadlines") !== false,
      headlineOpacity: state.get("newsHeadlineOpacity") ?? 50,
      totalCards: state.get("newsTotalCards") || CONFIG.defaults.newsTotalCards,
      intervalMinutes: state.get("newsRefreshIntervalMinutes") || 2,
      position: state.get("newsPosition") || "bottom",
    });
  }

  acquireLock() {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
      if (
        existing?.expiresAt > Date.now() && existing.ownerId !== this.ownerId
      ) return false;
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          ownerId: this.ownerId,
          expiresAt: Date.now() + LOCK_TTL_MS,
        }),
      );
      return JSON.parse(localStorage.getItem(LOCK_KEY) || "null")?.ownerId ===
        this.ownerId;
    } catch {
      return true;
    }
  }

  releaseLock() {
    try {
      const lock = JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
      if (lock?.ownerId === this.ownerId) localStorage.removeItem(LOCK_KEY);
    } catch {
    }
  }

  // Feed retrieval
  async fetchCnnSearch() {
    if (this.cnnSearchPromise) return this.cnnSearchPromise;
    this.cnnSearchPromise = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        FETCH_TIMEOUT_MS,
      );
      try {
        const requestId = globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const url = new URL(CNN_SEARCH_ENDPOINT);
        url.searchParams.set("q", "");
        url.searchParams.set("size", "100");
        url.searchParams.set("from", "0");
        url.searchParams.set("sort", "newest");
        url.searchParams.set("types", "article");
        url.searchParams.set("request_id", `ydd-news-${requestId}`);
        url.searchParams.set("site", "cnn");
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "omit",
          cache: "no-cache",
          referrerPolicy: "no-referrer",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload?.result)) {
          throw new Error("Invalid CNN response");
        }
        return payload;
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return this.cnnSearchPromise;
  }

  async fetchSource(source) {
    if (source.provider.format === "cnn-search-json") {
      return parseCnnSearch(await this.fetchCnnSearch(), source);
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS,
    );
    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        credentials: "omit",
        cache: "no-cache",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseFeed(await response.text(), source);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Refresh cycle
  async refresh({ reason = "manual" } = {}) {
    if (state.get("newsEnabled") !== true || this.fetching) return false;
    const selection = this.getSelection();
    if (!selection.sources.length) {
      this.emitStatus(
        "Choose at least one provider and news type in News Settings.",
      );
      this.render();
      return false;
    }
    if (!(await hasNewsHostAccess(selection.providers))) {
      await this.disableNewsForMissingPermissions(
        "News was turned off because the browser no longer grants access to every selected publisher.",
      );
      return false;
    }
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    if (reason !== "manual" && this.getCooldownRemaining() > 0) {
      this.emitStatus(
        "News was fetched recently. Waiting for the selected interval.",
      );
      return false;
    }
    if (!this.acquireLock()) {
      this.emitStatus("Another dashboard tab is updating news.");
      return false;
    }

    this.fetching = true;
    this.emitStatus("Updating news…");
    const attemptAt = Date.now();
    this.cnnSearchPromise = null;
    try {
      const results = await Promise.allSettled(
        selection.sources.map((source) => this.fetchSource(source)),
      );
      const items = [];
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") items.push(...result.value);
        else {failures.push(
            `${selection.sources[index].provider.name}: ${
              result.reason?.message || "Fetch failed"
            }`,
          );}
      });
      const eligibleProviders = selection.providers.filter((provider) =>
        selection.sources.some((source) => source.provider.id === provider.id)
      );
      const deduped = filterFreshStories(
        selectBalancedStories(items, eligibleProviders, MAX_ITEMS),
        Date.now(),
      );
      const itemsForSelection = cache.selectionKey === selection.selectionKey
        ? filterFreshStories(cache.items, Date.now())
        : [];
      const fetchedAt = deduped.length
        ? Date.now()
        : itemsForSelection.length
        ? cache.fetchedAt
        : 0;
      state.set("newsCache", {
        version: 2,
        imageParserVersion: IMAGE_PARSER_VERSION,
        selectionKey: selection.selectionKey,
        lastAttemptAt: attemptAt,
        fetchedAt,
        ageMinutes: getAgeMinutes(fetchedAt),
        items: deduped.length ? deduped : itemsForSelection,
        failures,
      });
      this.emitStatus(
        deduped.length
          ? `Updated ${deduped.length} stories.`
          : "Could not update news; showing saved stories.",
      );
      return deduped.length > 0;
    } catch (error) {
      const fallbackItems = cache.selectionKey === selection.selectionKey
        ? filterFreshStories(cache.items, Date.now())
        : [];
      const fallbackFetchedAt = fallbackItems.length ? cache.fetchedAt : 0;
      state.set("newsCache", {
        ...cache,
        selectionKey: selection.selectionKey,
        lastAttemptAt: attemptAt,
        fetchedAt: fallbackFetchedAt,
        ageMinutes: getAgeMinutes(fallbackFetchedAt),
        items: fallbackItems,
        failures: [error.message],
      });
      this.emitStatus("Could not update news; showing saved stories.");
      return false;
    } finally {
      this.cnnSearchPromise = null;
      this.fetching = false;
      this.releaseLock();
      this.render();
      this.scheduleAutoRefresh();
    }
  }

  async handlePageVisit() {
    if (state.get("newsEnabled") !== true) return;
    let cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    const selection = this.getSelection();
    if (!selection.sources.length) return;
    const freshItems = filterFreshStories(cache.items);
    if (freshItems.length !== cache.items.length) {
      const fetchedAt = freshItems.length ? cache.fetchedAt : 0;
      cache = {
        ...cache,
        items: freshItems,
        fetchedAt,
        ageMinutes: getAgeMinutes(fetchedAt),
        lastAttemptAt: 0,
      };
      state.set("newsCache", cache);
    }
    if (
      cache.items.length && cache.imageParserVersion !== IMAGE_PARSER_VERSION
    ) {
      cache = {
        ...cache,
        imageParserVersion: IMAGE_PARSER_VERSION,
        lastAttemptAt: 0,
      };
      state.set("newsCache", cache);
    }
    if (
      cache.selectionKey !== selection.selectionKey ||
      Date.now() - cache.lastAttemptAt >= this.getRefreshIntervalMs()
    ) {
      await this.refresh({ reason: "page-visit" });
    } else {
      this.scheduleAutoRefresh();
    }
  }

  scheduleAutoRefresh() {
    window.clearTimeout(this.timer);
    this.timer = null;
    if (state.get("newsEnabled") !== true) return;
    const interval = Number(state.get("newsRefreshIntervalMinutes"));
    if (!NEWS_REFRESH_INTERVALS.includes(interval)) return;
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    const dueAt = (cache.lastAttemptAt || Date.now()) + interval * 60000;
    const delay = Math.max(1000, dueAt - Date.now());
    this.timer = window.setTimeout(() => {
      if (document.hidden) this.timer = null;
      else void this.refresh({ reason: "automatic" });
    }, Math.min(delay, 2147483647));
  }

  // News rendering
  render() {
    if (!this.container) return;
    this.clearAgeTicker();
    this.container.classList.remove("news-intro-ready");
    this.updatePlacement();
    this.container.innerHTML = "";
    if (state.get("newsEnabled") !== true) {
      this.lastRenderedCacheKey = "";
      this.container.removeAttribute("data-total-cards");
      return;
    }
    const cache = state.get("newsCache") || CONFIG.defaults.newsCache;
    const selection = this.getSelection();
    const totalCards = this.getTotalCards();
    this.container.dataset.totalCards = String(totalCards);
    const items = cache.selectionKey === selection.selectionKey
      ? filterFreshStories(cache.items).slice(0, totalCards)
      : [];
    const showHeadlines = state.get("newsShowHeadlines") !== false;
    const headlineOpacity = Math.max(
      0,
      Math.min(1, Number(state.get("newsHeadlineOpacity") ?? 50) / 100),
    );

    const header = document.createElement("div");
    header.className = "news-feed-header";
    const status = document.createElement("span");
    const currentTime = globalThis.performance?.now?.() ?? Date.now();
    status.style.setProperty(
      "--news-status-delay",
      `${Math.max(0, 1750 - (currentTime - this.pageLoadedAt))}ms`,
    );
    status.textContent = cache.fetchedAt
      ? `Updated ${formatRelativeAge(cache.fetchedAt)} ago`
      : "Waiting for first update";
    header.append(status);

    const list = document.createElement("div");
    list.className = "news-feed-list";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "news-feed-empty";
      if (selection.sources.length) {
        const message = document.createElement("span");
        message.textContent = this.fetching
          ? "Updating news…"
          : "No saved stories yet";
        empty.appendChild(message);
        if (!this.fetching) {
          const refreshButton = document.createElement("button");
          refreshButton.type = "button";
          refreshButton.className = "news-feed-empty-refresh";
          refreshButton.textContent = "Refresh news";
          refreshButton.setAttribute("aria-label", "Refresh news");
          refreshButton.addEventListener("click", () => {
            void this.refresh({ reason: "manual" });
          });
          empty.appendChild(refreshButton);
        }
      } else {
        empty.textContent = "Choose providers and news types in News Settings.";
      }
      list.appendChild(empty);
    }
    const target = state.get("linkTargets")?.news || "_blank";
    items.forEach((item, index) => {
      const provider = NEWS_PROVIDERS.find((entry) =>
        entry.id === item.providerId
      );
      const card = document.createElement("a");
      card.className = "news-card";
      const animationsDisabled = state.get("disableAnimations") === true ||
        document.documentElement.classList.contains("disable-animations");
      if (!animationsDisabled) {
        card.classList.add("news-card-entering");
        card.addEventListener(
          "animationend",
          (event) => {
            if (!event.animationName.startsWith("news-card-intro-")) return;
            card.classList.remove("news-card-entering");
            card.style.removeProperty("--news-intro-delay");
          },
          { once: true },
        );
      }
      card.style.setProperty("--news-intro-delay", `${160 + index * 115}ms`);
      card.href = item.url;
      card.target = target;
      card.rel = "noopener noreferrer";
      card.referrerPolicy = "no-referrer";
      card.setAttribute("aria-label", `${item.title} — ${item.providerName}`);

      const visual = document.createElement("div");
      visual.className = "news-card-visual";
      visual.style.setProperty(
        "--news-provider-color",
        provider?.color || "var(--accent-color)",
      );
      const imageCandidates = [
        ...new Set([
          item.imageUrl,
          ...(Array.isArray(item.imageCandidates) ? item.imageCandidates : []),
        ].filter(Boolean)),
      ];
      if (imageCandidates.length) {
        const image = document.createElement("img");
        image.alt = "";
        image.loading = index < 3 ? "eager" : "lazy";
        image.fetchPriority = index < 2 ? "high" : "auto";
        image.sizes = "(max-width: 700px) 44vw, (max-width: 1100px) 30vw, 15vw";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        let candidateIndex = 0;
        const loadNextImage = () => {
          const nextCandidate = imageCandidates[candidateIndex++];
          if (nextCandidate) image.src = nextCandidate;
          else image.remove();
        };
        image.addEventListener("error", loadNextImage);
        loadNextImage();
        visual.appendChild(image);
      }
      const content = document.createElement("div");
      content.className = "news-card-content";
      const source = document.createElement("span");
      source.className = "news-card-source";
      source.dataset.providerName = item.providerName;
      source.dataset.publishedAt = String(item.publishedAt || 0);
      source.textContent = `${item.providerName}${
        item.publishedAt ? ` · ${formatRelativeAge(item.publishedAt)}` : ""
      }`;
      const headline = document.createElement("span");
      content.appendChild(source);
      if (showHeadlines) {
        headline.className = "news-card-headline";
        headline.style.setProperty(
          "--news-headline-opacity",
          String(headlineOpacity),
        );
        headline.textContent = item.title;
        content.appendChild(headline);
      }
      card.append(visual, content);
      list.appendChild(card);
    });
    this.container.append(header, list);
    this.lastRenderedCacheKey = this.getRenderCacheKey(cache);
    this.updateLiveAge({ persist: false });
    this.scheduleAgeTicker();
    window.requestAnimationFrame(() => {
      if (this.container) this.container.classList.add("news-intro-ready");
    });
  }
}
// [src/modules/news.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
