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
  var bgTime = localStorage.getItem("randomBgTime");
  var imgUrl = null;

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
      imgUrl = (savedBg && savedBg !== '"null"') ? savedBg : ((bg && bg !== '"null"') ? bg : null);
    }
  } else if (bgMode === '"random"' && savedBg && savedBg !== '"null"') {
    imgUrl = savedBg;
  } else if (bg && bg !== '"null"' && bgMode !== '"random"') {
    imgUrl = bg;
  }

  if (imgUrl && imgUrl !== "null" && imgUrl !== '"null"') {
    var style = document.createElement("style");
    style.id = "ydd-remote-background";
    style.textContent = "body { background-image: url(" + imgUrl.replace(/^"|"$/g, "") + ") !important; background-size: cover !important; background-position: center !important; }";
    document.head.appendChild(style);
  }

  var hasIdbBg = localStorage.getItem("has_idb_bg") === "true";
  var fallback = THEME_COLORS[thId] || "#0a0a0a";
  if (hasIdbBg || (bgMode === '"random"' || bgMode === '"freeze"')) {
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
      var getRequest = store.get("current_bg");
      transaction.oncomplete = function() { db.close(); };
      transaction.onerror = function() { db.close(); };
      transaction.onabort = function() { db.close(); };
      
      getRequest.onsuccess = function(e) {
        if (e.target.result && preloadBackgroundEnabled) {
          releasePreloadObjectUrl();
          var objectUrl = URL.createObjectURL(e.target.result);
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
        }
        var p = document.getElementById("idb-preloader");
        if (p) p.remove();
      };
      getRequest.onerror = function() {
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
    var p = document.getElementById("idb-preloader");
    if (p) p.remove();
  };
} catch (e) {
  var p = document.getElementById("idb-preloader");
  if (p) p.remove();
}
// [src/theme-init.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
