import { CONFIG, AI_TOOLS, SOCIAL_LINKS } from "../config.js";
import { state } from "../state.js";

export class AiTools {
  constructor() {
    this.els = {
      btn: document.getElementById("ai-tools-toggle-button"),
      popup: document.getElementById("ai-tools-popup"),
      aiList: document.getElementById("ai-tools-list"),
      socialList: document.getElementById("social-tools-list"),
      tabs: document.querySelectorAll(".tool-tab-button"),
      editBtn: document.getElementById("tool-edit-button"),
    };

    if (!this.els.btn) return;

    this.activeTab = localStorage.getItem("activeToolTab") || "ai";
    this.isEditMode = false;
    this.hiddenTools = state.get("hiddenTools") || {};

    this.init();
  }

  init() {
    this.renderAll();

    // Main Toggle with ANIMATION
    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();

      // --- ANIMATION FIX ---
      this.els.btn.classList.add("animating");
      setTimeout(() => this.els.btn.classList.remove("animating"), 400);
    });

    // Edit Button
    this.els.editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleEditMode();
    });

    // Tab Switching
    this.els.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        this.switchTab(tab.dataset.tab);
      });
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
      if (key === "showAiTools") this.updateVisibility();
      if (key === "linkTargets") this.renderAll();
    });

    this.initializeOrderState();

    this.updateVisibility();
  }

  initializeOrderState() {
    // AI Tools Order
    let aiOrder = state.get("aiToolsOrder");

    const configAiIds = AI_TOOLS.map((t) => t.id);
    if (!aiOrder) {
      aiOrder = configAiIds;
      state.set("aiToolsOrder", aiOrder);
    } else {
      const newTools = configAiIds.filter((id) => !aiOrder.includes(id));
      if (newTools.length > 0) {
        aiOrder = [...aiOrder, ...newTools];
        state.set("aiToolsOrder", aiOrder);
      }
    }

    // Social Tools Order
    let socialOrder = state.get("socialToolsOrder");
    const configSocialIds = SOCIAL_LINKS.map((t) => t.id);
    if (!socialOrder) {
      socialOrder = configSocialIds;
      state.set("socialToolsOrder", socialOrder);
    } else {
      const newLinks = configSocialIds.filter(
        (id) => !socialOrder.includes(id),
      );
      if (newLinks.length > 0) {
        socialOrder = [...socialOrder, ...newLinks];
        state.set("socialToolsOrder", socialOrder);
      }
    }
  }

  toggle() {
    this.els.popup.classList.toggle("visible");
  }

  close() {
    this.els.popup.classList.remove("visible");
    if (this.isEditMode) this.toggleEditMode();
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.els.popup.classList.toggle("edit-mode", this.isEditMode);

    const pencil = this.els.editBtn.querySelector(".icon-pencil");
    const check = this.els.editBtn.querySelector(".icon-check");

    if (pencil) pencil.classList.toggle("hidden", this.isEditMode);
    if (check) check.classList.toggle("hidden", !this.isEditMode);

    this.updateFooter();
    this.renderAll();
  }

  updateFooter() {
    let footer = this.els.popup.querySelector(".ai-tools-footer");
    if (this.isEditMode) {
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "ai-tools-footer";
        footer.textContent = "Drag and drop to re-order";
        this.els.popup.appendChild(footer);
      }
    } else {
      if (footer) {
        footer.remove();
      }
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    localStorage.setItem("activeToolTab", tabName);

    this.els.tabs.forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === tabName),
    );

    if (tabName === "ai") {
      this.els.aiList.classList.add("active");
      this.els.socialList.classList.remove("active");
      this.els.btn.querySelector(".ai-icon").classList.remove("hidden");
      this.els.btn.querySelector(".social-icon").classList.add("hidden");
    } else {
      this.els.aiList.classList.remove("active");
      this.els.socialList.classList.add("active");
      this.els.btn.querySelector(".ai-icon").classList.add("hidden");
      this.els.btn.querySelector(".social-icon").classList.remove("hidden");
    }
  }

  renderAll() {
    const aiOrder = state.get("aiToolsOrder") || AI_TOOLS.map((t) => t.id);
    const socialOrder =
      state.get("socialToolsOrder") || SOCIAL_LINKS.map((t) => t.id);

    this.renderList(this.els.aiList, AI_TOOLS, aiOrder, CONFIG.paths.ai);
    this.renderList(
      this.els.socialList,
      SOCIAL_LINKS,
      socialOrder,
      CONFIG.paths.social,
    );

    if (this.isEditMode) {
      this.enableDragAndDrop();
    }
  }

  renderList(container, allItems, orderList, pathPrefix) {
    container.innerHTML = "";

    const itemMap = {};
    allItems.forEach((item) => (itemMap[item.id] = item));

    const sortedItems = orderList
      .map((id) => itemMap[id])
      .filter((item) => item !== undefined);

    const toolsToRender = this.isEditMode
      ? sortedItems
      : sortedItems.filter((t) => !this.hiddenTools[t.id]);

    toolsToRender.forEach((tool) => {
      const isHidden = this.hiddenTools[tool.id];

      const a = document.createElement("div");
      a.className = "ai-tool-item";
      a.dataset.id = tool.id;
      if (!this.isEditMode) {
        a.onclick = (e) => {
          const targets =
            state.get("linkTargets") || CONFIG.defaults.linkTargets;
          window.open(tool.url, targets.ai || "_blank");
        };
        a.style.cursor = "pointer";
      }

      if (this.isEditMode) {
        a.classList.add("edit-mode-item");
        if (isHidden) a.classList.add("is-hidden");
      }

      const iconDiv = document.createElement("div");
      iconDiv.className = "ai-tool-icon";
      const img = document.createElement("img");
      img.src = pathPrefix + tool.icon;

      // Edit Overlay
      if (this.isEditMode) {
        const overlay = document.createElement("div");
        overlay.className = "edit-overlay";

        const span = document.createElement("span");
        span.className = isHidden ? "icon-add" : "icon-remove";
        span.textContent = isHidden ? "+" : "×";
        overlay.appendChild(span);

        overlay.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleToolVisibility(tool.id);
        });
        a.appendChild(overlay);
      }

      iconDiv.appendChild(img);
      a.appendChild(iconDiv);
      a.appendChild(document.createTextNode(tool.name));

      container.appendChild(a);
    });
  }

  toggleToolVisibility(id) {
    if (this.hiddenTools[id]) {
      delete this.hiddenTools[id];
    } else {
      this.hiddenTools[id] = true;
    }
    state.set("hiddenTools", this.hiddenTools);
    this.renderAll();
  }

  updateVisibility() {
    const show = state.get("showAiTools");
    this.els.btn.classList.toggle("hidden", !show);
  }

  // --- Drag & Drop Logic ---

  enableDragAndDrop() {
    if (!this.isEditMode) return;

    const items = this.els.popup.querySelectorAll(".ai-tool-item");
    items.forEach((item) => {
      item.setAttribute("draggable", "true");

      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.dataset.id);
        e.dataTransfer.setData("source-tab", this.activeTab);
        item.classList.add("dragging");
        this.dragSrcEl = item;
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        items.forEach((i) => i.classList.remove("drag-over"));
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        item.classList.add("drag-over");
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (this.dragSrcEl === item) return;

        const sourceTab = e.dataTransfer.getData("source-tab");
        if (sourceTab !== this.activeTab) return;

        const sourceId = e.dataTransfer.getData("text/plain");
        const targetId = item.dataset.id;

        this.reorderItems(sourceId, targetId);
      });
    });
  }

  reorderItems(sourceId, targetId) {
    const orderKey =
      this.activeTab === "ai" ? "aiToolsOrder" : "socialToolsOrder";
    const currentOrder = [...(state.get(orderKey) || [])];

    const removeIndex = currentOrder.indexOf(sourceId);
    const insertIndex = currentOrder.indexOf(targetId);

    if (removeIndex >= 0 && insertIndex >= 0) {
      const [item] = currentOrder.splice(removeIndex, 1);
      currentOrder.splice(insertIndex, 0, item);
      state.set(orderKey, currentOrder);
      this.renderAll();
    }
  }
}

// src/modules/aitools.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
