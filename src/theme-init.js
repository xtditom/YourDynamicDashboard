try {
  var preloadObjectUrl = null;
  var preloadBackgroundEnabled = true;
  var releasePreloadObjectUrl = function() {
    if (preloadObjectUrl) {
      URL.revokeObjectURL(preloadObjectUrl);
      preloadObjectUrl = null;
      window.__yddPreloadBackgroundUrl = null;
    }
  };
  var cancelPreloadBackground = function() {
    preloadBackgroundEnabled = false;
    releasePreloadObjectUrl();
  };
  window.addEventListener("pagehide", cancelPreloadBackground, { once: true });
  window.__releaseYddPreloadBackground = cancelPreloadBackground;
  if (localStorage.getItem("zenMode") === "true") {
    document.documentElement.classList.add("zen-mode-preload");
  }

  var THEME_COLORS = {
    "default-light": "#c3c3c3",
    "default-dark": "#030303",
    "theme-1": "#000000",
    "theme-2": "#000000",
    "theme-3": "#bebebe",
    "theme-4": "#90c69e",
    "theme-5": "#ffa9d2",
    "theme-6": "#0A043C",
    "theme-7": "#0f0f15",
    "theme-8": "#ded6ff"
  };

  var THEME_DARK_COLORS = {
    "theme-3": "#1c2635",
    "theme-4": "#14291d",
    "theme-5": "#321727",
    "theme-8": "#211d3b"
  };

  var THEME_LIGHT_COLORS = {
    "theme-1": "#f4f4f4",
    "theme-2": "#e7f3d0",
    "theme-6": "#d8f7f7",
    "theme-7": "#d9e2c5"
  };

  var dm = localStorage.getItem("darkMode");
  var gm = localStorage.getItem("gradientModeActive");
  var thId = (localStorage.getItem("normalThemeId") || '"default-dark"').replace(/^"|"$/g, "");

  if (gm !== "true" && (dm === null || dm === "true")) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("data-theme-id", thId);
    var preloadColor = (dm === null || dm === "true")
      ? (THEME_DARK_COLORS[thId] || THEME_COLORS[thId] || "#030303")
      : (THEME_LIGHT_COLORS[thId] || THEME_COLORS[thId] || "#c3c3c3");
    document.documentElement.style.setProperty("--bg-primary", preloadColor);
    document.documentElement.style.backgroundColor = preloadColor;
  } 
  else if (gm === "true") {
    document.documentElement.classList.add("gradient-mode-active");
    var gradientId = (localStorage.getItem("gradientThemeId") || "gradient").replace(/^"|"$/g, "");
    document.documentElement.setAttribute("data-theme-id", "gradient-" + gradientId);
    document.documentElement.style.backgroundColor = "#302b63"; 
  } 
  else {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.setAttribute("data-theme-id", thId);
    if (thId === "custom") {
      var rawBgp = localStorage.getItem("custom---bg-primary");
      if (rawBgp) {
        document.documentElement.style.setProperty("--bg-primary", rawBgp.replace(/^"|"$/g, ""));
        document.documentElement.style.backgroundColor = rawBgp.replace(/^"|"$/g, "");
      }
    } else {
      var color = THEME_LIGHT_COLORS[thId] || THEME_COLORS[thId] || "#c3c3c3";
      document.documentElement.style.setProperty("--bg-primary", color);
      document.documentElement.style.backgroundColor = color;
    }
  }

  var bgMode = localStorage.getItem("randomBgMode");
  var bg = localStorage.getItem("backgroundImage");
  var savedBg = localStorage.getItem("savedBgUrl");
  var randomBgSchedule = localStorage.getItem("randomBgSchedule");
  var randomBgCurrentPreview = localStorage.getItem("randomBgCurrentPreview");
  var randomBgNextPreview = localStorage.getItem("randomBgNextPreview");
  var randomBgNext = localStorage.getItem("randomBgNextUrl");
  var bgTime = localStorage.getItem("randomBgTime");
  var imgUrl = null;
  var RANDOM_BG_MAX_WIDTH = 1920;
  var RANDOM_BG_MAX_HEIGHT = 1080;

  var readStoredUrl = function(value) {
    if (!value || value === "null" || value === '"null"') return null;
    var parsed = value;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      // Support older or manually-entered unquoted URL values.
    }
    if (typeof parsed !== "string" || !parsed) return null;
    try {
      var url = new URL(parsed, document.baseURI);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.href;
    } catch (error) {
      return null;
    }
  };

  var isCompatiblePicsumUrl = function(value) {
    var parsed;
    try {
      parsed = new URL(value);
    } catch (error) {
      return true;
    }
    if (!/(^|\.)picsum\.photos$/i.test(parsed.hostname)) return true;

    var segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return true;
    var width = Number(segments[segments.length - 2]);
    var height = Number(
      segments[segments.length - 1].replace(/\.[a-z\d]+$/i, ""),
    );
    if (!Number.isInteger(width) || !Number.isInteger(height)) return true;
    return (
      width > 0 &&
      height > 0 &&
      width <= RANDOM_BG_MAX_WIDTH &&
      height <= RANDOM_BG_MAX_HEIGHT
    );
  };

  var readStoredRandomUrl = function(value) {
    var url = readStoredUrl(value);
    return url && isCompatiblePicsumUrl(url) ? url : null;
  };

  var isSafeStoredRandomEntryUrl = function(value) {
    if (typeof value !== "string" || !value) return false;
    return isCompatiblePicsumUrl(value);
  };

  var randomBgNextUrl = readStoredRandomUrl(randomBgNext);
  var readStoredString = function(value, fallback) {
    if (!value || value === "null" || value === '"null"') return fallback;
    var parsed = value;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      // Support older or manually-entered values.
    }
    return typeof parsed === "string" && parsed ? parsed : fallback;
  };

  var parsedRandomBgSchedule = readStoredString(randomBgSchedule, "1m");
  var randomBgCurrentPreviewUrl = (function(value) {
    var parsed = readStoredString(value, null);
    return typeof parsed === "string" && parsed.startsWith("data:image/")
      ? parsed
      : null;
  })(randomBgCurrentPreview);
  var randomBgNextPreviewUrl = (function(value) {
    if (!value || value === "null" || value === '"null"') return null;
    var parsed = value;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      // Support older or manually-entered preview values.
    }
    return typeof parsed === "string" && parsed.startsWith("data:image/")
      ? parsed
      : null;
  })(randomBgNextPreview);

  if (!["refresh", "30s", "1m", "1h", "6h", "day"].includes(parsedRandomBgSchedule)) {
    parsedRandomBgSchedule = "refresh";
  }
  var readStoredNumber = function(value, fallback) {
    var parsed = value;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      parsed = Number(value);
    }
    return Number.isFinite(Number(parsed)) ? Number(parsed) : fallback;
  };
  var localDateKey = function(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  var randomBgLastChangedAt = readStoredNumber(
    localStorage.getItem("randomBgLastChangedAt"),
    0,
  );
  var randomBgLastChangedDate = readStoredString(
    localStorage.getItem("randomBgLastChangedDate"),
    "",
  );
  var randomBgTimedChangeDue = false;
  if (parsedRandomBgSchedule === "day") {
    randomBgTimedChangeDue = randomBgLastChangedDate !== localDateKey(new Date());
  } else if (parsedRandomBgSchedule !== "refresh") {
    var randomBgIntervals = {
      "30s": 30000,
      "1m": 60000,
      "1h": 3600000,
      "6h": 21600000,
    };
    randomBgTimedChangeDue =
      !randomBgLastChangedAt ||
      Date.now() - randomBgLastChangedAt >=
        randomBgIntervals[parsedRandomBgSchedule];
  }

  var bgBlur = localStorage.getItem("bgBlurIntensity");
  if (bgBlur) {
    var cleanBlur = bgBlur.replace(/^"|"$/g, "");
    var blurMap = { "0": 0, "10": 2, "20": 4, "30": 6, "40": 8, "50": 10 };
    var blurPx = blurMap[cleanBlur] || 0;
    document.documentElement.style.setProperty("--bg-blur", blurPx + "px");

    if (cleanBlur === "10" || cleanBlur === "20" || cleanBlur === "30" || cleanBlur === "40" || cleanBlur === "50") {
      document.documentElement.classList.add("high-bg-blur");
    } else {
      document.documentElement.classList.remove("high-bg-blur");
    }
  }

  if (bgMode === '"freeze"') {
    if (bgTime === "null" || bgTime === '"-1"' || Date.now() - parseInt(bgTime) <= 259200000) {
      imgUrl = readStoredRandomUrl(savedBg) || readStoredRandomUrl(bg);
    }
  } else if (bgMode === '"random"') {
    if (parsedRandomBgSchedule === "refresh") {
      imgUrl =
        randomBgNextPreviewUrl ||
        randomBgNextUrl ||
        readStoredRandomUrl(savedBg) ||
        readStoredRandomUrl(bg);
    } else {
      var queuedTimedPreview = randomBgTimedChangeDue
        ? randomBgNextPreviewUrl || randomBgNextUrl
        : null;
      imgUrl =
        queuedTimedPreview ||
        randomBgCurrentPreviewUrl ||
        readStoredRandomUrl(savedBg) ||
        readStoredRandomUrl(bg) ||
        randomBgNextPreviewUrl ||
        randomBgNextUrl;
    }
  } else if (bg && bg !== '"null"' && bgMode !== '"random"') {
    imgUrl = bg;
  }

  if (imgUrl && imgUrl !== "null" && imgUrl !== '"null"') {
    var style = document.createElement("style");
    style.id = "ydd-remote-background";
    var cssUrl = String(imgUrl)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\)/g, "\\)");
    style.textContent = "body { background-image: url(\"" + cssUrl.replace(/^"|"$/g, "") + "\") !important; background-size: cover !important; background-position: center !important; }";
    document.head.appendChild(style);
  }

  var hasIdbBg = localStorage.getItem("has_idb_bg") === "true";
  if (imgUrl || hasIdbBg) {
    // Mark the custom-background state before IndexedDB finishes loading so
    // checked controls do not briefly inherit a normal theme's accent color.
    document.documentElement.classList.add("ydd-custom-bg-pending");
  }
  var fallback = THEME_COLORS[thId] || "#0a0a0a";
  var randomModeWithoutImage = bgMode === '"random"' && !imgUrl;
  if ((hasIdbBg && bgMode !== '"random"') || bgMode === '"freeze"' || randomModeWithoutImage) {
    var preloader = document.createElement("style");
    preloader.id = "idb-preloader";
    var pColor = fallback || "#0a0a0a";
    preloader.textContent = "body { background-color: " + pColor + " !important; background-image: none !important; transition: none !important; }";
    document.head.appendChild(preloader);
  }

  var request = indexedDB.open("YDD_Storage", 2);
  request.onupgradeneeded = function(event) {
    var db = event.target.result;
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images");
    }
  };
  request.onsuccess = function(event) {
    var db = event.target.result;
    if (db.objectStoreNames.contains("images")) {
      var transaction = db.transaction("images", "readonly");
      var store = transaction.objectStore("images");
      var randomUsesCurrentRecord =
        bgMode === '"random"' &&
        parsedRandomBgSchedule !== "refresh" &&
        !(randomBgTimedChangeDue && (randomBgNextPreviewUrl || randomBgNextUrl));
      var getRequest = store.get(
        randomUsesCurrentRecord ? "random_bg_current" : "current_bg",
      );
      transaction.oncomplete = function() { db.close(); };
      transaction.onerror = function() { db.close(); };
      transaction.onabort = function() { db.close(); };
      
      getRequest.onsuccess = function(e) {
        var storedBackground = e.target.result;
        var storedRandomBlob =
          randomUsesCurrentRecord && storedBackground?.blob instanceof Blob
            && isSafeStoredRandomEntryUrl(storedBackground?.url)
            ? storedBackground.blob
            : null;
        var usableBackground = storedRandomBlob || storedBackground;
        if (usableBackground && preloadBackgroundEnabled && (bgMode !== '"random"' || randomUsesCurrentRecord)) {
          releasePreloadObjectUrl();
          var objectUrl = URL.createObjectURL(usableBackground);
          preloadObjectUrl = objectUrl;
          window.__yddPreloadBackgroundUrl = objectUrl;
          var style = document.createElement("style");
          style.id = "ydd-idb-background";
          style.textContent = "body { background-image: url(" + objectUrl + ") !important; background-size: cover !important; background-position: center !important; }";
          document.head.appendChild(style);
          if (document.body) {
            document.body.classList.add("has-custom-bg");
          } else {
            document.addEventListener("DOMContentLoaded", function() {
              document.body.classList.add("has-custom-bg");
            });
          }
        } else if (!imgUrl) {
          document.documentElement.classList.remove("ydd-custom-bg-pending");
        }
        var p = document.getElementById("idb-preloader");
        if (p) p.remove();
      };
      getRequest.onerror = function() {
        if (!imgUrl) document.documentElement.classList.remove("ydd-custom-bg-pending");
        var p = document.getElementById("idb-preloader");
        if (p) p.remove();
      };
    } else {
      db.close();
      var p = document.getElementById("idb-preloader");
      if (p) p.remove();
    }
  };
  request.onerror = function() {
    if (!imgUrl) document.documentElement.classList.remove("ydd-custom-bg-pending");
    var p = document.getElementById("idb-preloader");
    if (p) p.remove();
  };
} catch (e) {
  var p = document.getElementById("idb-preloader");
  if (p) p.remove();
}
// [src/theme-init.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
