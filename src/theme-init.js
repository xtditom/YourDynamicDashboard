try {
  var THEME_COLORS = {
    "default-light": "#c3c3c3",
    "default-dark": "#030303",
    "theme-1": "#000000",
    "theme-2": "#000000",
    "theme-3": "#bebebe",
    "theme-4": "#90c69e",
    "theme-5": "#ffa9d2",
    "theme-6": "#0A043C",
    "theme-7": "#0f0f15"
  };

  var dm = localStorage.getItem("darkMode");
  var gm = localStorage.getItem("gradientModeActive");
  var thId = (localStorage.getItem("normalThemeId") || '"default-dark"').replace(/^"|"$/g, "");

  if (dm === null || dm === "true") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.style.setProperty("--bg-primary", THEME_COLORS[thId] || "#030303");
    document.documentElement.style.backgroundColor = THEME_COLORS[thId] || "#030303";
  } 
  else if (gm === "true") {
    document.documentElement.classList.add("gradient-mode-active");
    document.documentElement.style.backgroundColor = "#302b63"; 
  } 
  else {
    document.documentElement.setAttribute("data-theme", "light");
    if (thId === "custom") {
      var rawBgp = localStorage.getItem("custom---bg-primary");
      if (rawBgp) {
        document.documentElement.style.setProperty("--bg-primary", rawBgp.replace(/^"|"$/g, ""));
        document.documentElement.style.backgroundColor = rawBgp.replace(/^"|"$/g, "");
      }
    } else {
      var color = THEME_COLORS[thId] || "#c3c3c3";
      document.documentElement.style.setProperty("--bg-primary", color);
      document.documentElement.style.backgroundColor = color;
    }
  }

  var bgMode = localStorage.getItem("randomBgMode");
  var bg = localStorage.getItem("backgroundImage");
  var savedBg = localStorage.getItem("savedBgUrl");
  var bgTime = localStorage.getItem("randomBgTime");
  var imgUrl = null;

  if (bgMode === '"freeze"') {
    if (bgTime === "null" || bgTime === '"-1"' || Date.now() - parseInt(bgTime) <= 259200000) {
      imgUrl = (savedBg && savedBg !== '"null"') ? savedBg : ((bg && bg !== '"null"') ? bg : null);
    }
  } else if (bg && bg !== '"null"' && bgMode !== '"random"') {
    imgUrl = bg;
  }

  if (imgUrl && imgUrl !== "null" && imgUrl !== '"null"') {
    var style = document.createElement("style");
    style.textContent = "body { background-image: url(" + imgUrl.replace(/^"|"$/g, "") + ") !important; background-size: cover !important; background-position: center !important; }";
    document.head.appendChild(style);
  }

  var hasIdbBg = localStorage.getItem("has_idb_bg") === "true";
  if (hasIdbBg) {
    var preloader = document.createElement("style");
    preloader.id = "idb-preloader";
    preloader.textContent = "body { background-color: #000000 !important; background-image: none !important; transition: none !important; }";
    document.head.appendChild(preloader);
  }

  var request = indexedDB.open("YDD_Storage", 1);
  request.onsuccess = function(event) {
    var db = event.target.result;
    if (db.objectStoreNames.contains("images")) {
      var transaction = db.transaction("images", "readonly");
      var store = transaction.objectStore("images");
      var getRequest = store.get("current_bg");
      
      getRequest.onsuccess = function(e) {
        if (e.target.result) {
          var objectUrl = URL.createObjectURL(e.target.result);
          var style = document.createElement("style");
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

// src/theme-init.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)