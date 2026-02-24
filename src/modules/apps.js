import { CONFIG, GOOGLE_APPS } from "../config.js";
import { state } from "../state.js";

export class AppGrid {
  constructor() {
    this.els = {
      btn: document.getElementById("apps-toggle-button"),
      popup: document.getElementById("apps-popup"),
      grid: document.getElementById("apps-grid"),
    };

    if (!this.els.btn) return;
    this.init();
  }

  init() {
    this.initializeOrderState();
    this.render();

    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener("click", (e) => {
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(e.target)
      ) {
        this.close();
      }
    });

    this.els.popup.addEventListener("click", (e) => e.stopPropagation());

    state.subscribe((key) => {
      if (key === "showApps") this.updateVisibility();
      if (key === "linkTargets") this.render();
    });
    this.updateVisibility();
  }

  initializeOrderState() {
    let order = state.get("googleAppsOrder");
    const configNames = GOOGLE_APPS.map((a) => a.name);
    if (!order) {
      order = configNames;
      state.set("googleAppsOrder", order);
    } else {
      const newApps = configNames.filter((name) => !order.includes(name));
      if (newApps.length > 0) {
        order = [...order, ...newApps];
        state.set("googleAppsOrder", order);
      }
    }
  }

  toggle() {
    this.els.popup.classList.toggle("visible");
    this.els.btn.classList.toggle("is-open");
  }

  close() {
    this.els.popup.classList.remove("visible");
    this.els.btn.classList.remove("is-open");
  }

  render() {
    this.els.grid.innerHTML = "";
    const order =
      state.get("googleAppsOrder") || GOOGLE_APPS.map((a) => a.name);

    const appMap = {};
    GOOGLE_APPS.forEach((app) => (appMap[app.name] = app));

    const sortedApps = order
      .map((name) => appMap[name])
      .filter((a) => a !== undefined);

    sortedApps.forEach((app) => {
      if (app.name === "divider") {
        const div = document.createElement("div");
        div.className = "apps-grid-divider";
        div.dataset.name = "divider";
        this.els.grid.appendChild(div);
        return;
      }

      const slot = document.createElement("div");
      slot.className = "app-slot";

      const a = document.createElement("div");
      a.className = "app-item";
      a.dataset.name = app.name;
      a.onclick = (e) => {
        const targets = state.get("linkTargets") || CONFIG.defaults.linkTargets;
        window.open(app.url, targets.apps || "_blank");
      };
      a.style.cursor = "pointer";

      const img = document.createElement("img");
      img.className = "app-icon";
      img.src = CONFIG.paths.apps + app.icon;
      img.alt = app.name;

      if (app.width) img.style.width = app.width;
      if (app.height) img.style.height = app.height;

      const span = document.createElement("span");
      span.className = "app-name";
      span.textContent = app.name;

      a.appendChild(img);
      a.appendChild(span);

      slot.appendChild(a);
      this.els.grid.appendChild(slot);
    });

    this.enableDragAndDrop();
  }

  enableDragAndDrop() {
    const items = this.els.grid.querySelectorAll(".app-item");
    const slots = this.els.grid.querySelectorAll(".app-slot");

    items.forEach((item) => {
      item.setAttribute("draggable", "true");

      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.dataset.name);
        item.classList.add("dragging");
        this.dragSrcEl = item;
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        slots.forEach((s) => s.classList.remove("drag-over"));
      });
    });

    slots.forEach((slot) => {
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("drag-over");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("drag-over");
      });

      slot.addEventListener("drop", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const targetItem = slot.querySelector(".app-item");
        if (!targetItem) return;

        const sourceName = e.dataTransfer.getData("text/plain");
        const targetName = targetItem.dataset.name;

        if (sourceName !== targetName) {
          this.reorderItems(sourceName, targetName);
        }
      });
    });
  }

  reorderItems(sourceName, targetName) {
    const currentOrder = [...(state.get("googleAppsOrder") || [])];
    const idx1 = currentOrder.indexOf(sourceName);
    const idx2 = currentOrder.indexOf(targetName);

    if (idx1 >= 0 && idx2 >= 0) {
      [currentOrder[idx1], currentOrder[idx2]] = [
        currentOrder[idx2],
        currentOrder[idx1],
      ];

      state.set("googleAppsOrder", currentOrder);
      this.render();
    }
  }

  updateVisibility() {
    const show = state.get("showApps");
    this.els.btn.classList.toggle("hidden", !show);
  }
}

// src/modules/apps.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
