import { state } from "../state.js";
import { getIconUrl } from "../utils.js";
import { CONFIG } from "../config.js";

export class Shortcuts {
  constructor() {
    this.container = document.getElementById("shortcuts-container");
    this.defaults = [
      { name: "YouTube", url: "https://www.youtube.com" },
      { name: "LinkedIn", url: "https://www.linkedin.com/" },
      { name: "Facebook", url: "https://www.facebook.com" },
      { name: "Reddit", url: "https://www.reddit.com" },
      { name: "Amazon", url: "https://www.amazon.com" },
    ];

    this.init();
  }

  init() {
    const current = state.get("userShortcuts");

    if (!current || !Array.isArray(current)) {
      const withIcons = this.defaults.map((s) => ({
        ...s,
        icon: getIconUrl(s.url),
      }));
      state.set("userShortcuts", withIcons);
    }

    this.render();

    state.subscribe((key) => {
      if (key === "userShortcuts") {
        this.render();
      }
      if (key === "shortcutsPosition" || key === "showShortcuts") this.updateVisibility();
      if (key === "linkTargets") this.render();
    });

    this.updateVisibility();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = "";

    const shortcuts = state.get("userShortcuts") || [];

    shortcuts.forEach((shortcut, index) => {
      const link = document.createElement("a");
      link.href = shortcut.url;
      link.className = "shortcut-item";
      const targets = state.get("linkTargets") || CONFIG.defaults.linkTargets;
      link.target = targets.shortcuts || "_blank";
      link.style.transitionDelay = `${index * 50}ms`;

      const iconDiv = document.createElement("div");
      iconDiv.className = "shortcut-icon";

      const img = document.createElement("img");
      img.src =
        shortcut.customIcon || shortcut.icon || getIconUrl(shortcut.url);
      img.alt = shortcut.name;
      img.onerror = () => {
        img.style.display = "none";
        const span = document.createElement("span");
        span.className = "shortcut-fallback-text";
        span.textContent = shortcut.name.charAt(0).toUpperCase();
        iconDiv.appendChild(span);
      };

      const label = document.createElement("span");
      label.className = "shortcut-label";
      label.textContent = shortcut.name;

      iconDiv.appendChild(img);
      link.appendChild(iconDiv);
      link.appendChild(label);
      this.container.appendChild(link);
    });
  }

  updateVisibility() {
    if (!this.container) return;
    
    let position = state.get("shortcutsPosition");
    if (!position) {
      const showLegacy = state.get("showShortcuts");
      if (showLegacy === false) {
        position = "hide";
        state.set("shortcutsPosition", "hide");
      } else {
        position = "bottom";
        state.set("shortcutsPosition", "bottom");
      }
    }

    if (position === "hide") {
      this.container.classList.add("hidden");
    } else {
      this.container.classList.remove("hidden");
      if (position === "top") {
        this.container.classList.add("position-top");
      } else {
        this.container.classList.remove("position-top");
      }
    }
  }
}
// [src/modules/shortcuts.js] YourDynamicDashboard V2.2 (Ditom Baroi Antu - 2025-26)
