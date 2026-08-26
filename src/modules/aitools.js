import { CONFIG, AI_TOOLS, SOCIAL_LINKS } from "../config.js";
import { state } from "../state.js";
import { makeKeyboardInteractive, showCustomModal } from "../utils.js";
import {
  MAX_CUSTOM_TOOLS,
  MAX_CUSTOM_TOOL_NAME_LENGTH,
  MAX_CUSTOM_TOOL_URL_LENGTH,
  normalizeHttpUrl,
  validateImageBlob,
} from "../validators.js";
import { classifyToolUrl } from "../keywords.js";

const CUSTOM_TOOL_ICON_SIZE = 128;
const CUSTOM_TOOL_ICON_MAX_BYTES = 5 * 1024 * 1024;
const CUSTOM_TOOL_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);
const LEGACY_DEFAULT_HIDDEN_TOOLS = [
  "ai-deepseek",
  "ai-qwen",
  "ai-mistral",
  "social-snapchat",
  "social-linkedin",
  "social-tiktok",
];
const MIN_VISIBLE_TOOLS = 2;

export class AiTools {
  constructor() {
    this.els = {
      btn: document.getElementById("ai-tools-toggle-button"),
      popup: document.getElementById("ai-tools-popup"),
      aiList: document.getElementById("ai-tools-list"),
      socialList: document.getElementById("social-tools-list"),
      tabs: document.querySelectorAll(".tool-tab-button"),
      editBtn: document.getElementById("tool-edit-button"),
      addBtn: document.getElementById("tool-add-button"),
    };

    if (!this.els.btn) return;

    this.activeTab = localStorage.getItem("activeToolTab") || "ai";
    this.isEditMode = false;
    this.addToolModal = null;
    const savedHiddenTools = { ...(state.get("hiddenTools") || {}) };
    if (state.get("hiddenToolsDefaultsMigrated") !== true) {
      LEGACY_DEFAULT_HIDDEN_TOOLS.forEach((toolId) => {
        delete savedHiddenTools[toolId];
      });
      state.set("hiddenTools", savedHiddenTools);
      state.set("hiddenToolsDefaultsMigrated", true);
    }
    this.hiddenTools = {
      ...(CONFIG.defaults.hiddenTools || {}),
      ...savedHiddenTools,
    };
    state.set("hiddenTools", this.hiddenTools);

    this.init();
  }

  init() {
    this.initializeOrderState();
    this.enforceMinimumVisibleTools();
    this.renderAll();

    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();

      // --- ANIMATION FIX ---
      this.els.btn.classList.add("animating");
      setTimeout(() => this.els.btn.classList.remove("animating"), 400);
    });

    this.els.editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleEditMode();
    });

    this.els.addBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openAddToolModal(this.activeTab);
    });

    this.els.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        this.switchTab(tab.dataset.tab);
      });
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest?.(".ydd-custom-modal-overlay")) return;
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(e.target) &&
        !this.addToolModal?.overlay?.contains(e.target)
      ) {
        this.close();
      }
    });

    this.els.popup.addEventListener("click", (e) => e.stopPropagation());

    state.subscribe((key) => {
      if (key === "showAiTools") this.updateVisibility();
      if (key === "linkTargets") this.renderAll();
      if (key === "hiddenTools") {
        this.hiddenTools = { ...(state.get("hiddenTools") || {}) };
        this.enforceMinimumVisibleTools();
        this.renderAll();
      }
      if (
        key === "aiToolsOrder" ||
        key === "socialToolsOrder" ||
        key === "customAiTools" ||
        key === "customSocialLinks"
      ) {
        this.initializeOrderState();
        this.enforceMinimumVisibleTools();
        this.renderAll();
      }
    });

    this.switchTab(this.activeTab === "social" ? "social" : "ai");

    this.updateVisibility();
  }

  initializeOrderState() {
    const syncOrder = (key, ids) => {
      const stored = state.get(key);
      const existing = Array.isArray(stored) ? stored : [];
      const next = [
        ...existing.filter((id) => ids.includes(id)),
        ...ids.filter((id) => !existing.includes(id)),
      ];
      if (!stored || JSON.stringify(stored) !== JSON.stringify(next)) {
        state.set(key, next);
      }
    };

    syncOrder("aiToolsOrder", this.getAllToolIds("ai"));
    syncOrder("socialToolsOrder", this.getAllToolIds("social"));
  }

  getCustomTools(type) {
    const key = type === "social" ? "customSocialLinks" : "customAiTools";
    return (state.get(key) || []).map((tool) => ({ ...tool, isCustom: true }));
  }

  getAllTools(type) {
    return type === "social"
      ? [...SOCIAL_LINKS, ...this.getCustomTools("social")]
      : [...AI_TOOLS, ...this.getCustomTools("ai")];
  }

  getAllToolIds(type) {
    return this.getAllTools(type).map((tool) => tool.id);
  }

  getOrderedToolIds(type) {
    const orderKey = type === "social" ? "socialToolsOrder" : "aiToolsOrder";
    const validIds = new Set(this.getAllToolIds(type));
    const storedOrder = state.get(orderKey);
    const order = Array.isArray(storedOrder) ? storedOrder : [];
    return [
      ...order.filter((id) => validIds.has(id)),
      ...this.getAllToolIds(type).filter((id) => !order.includes(id)),
    ];
  }

  getProtectedToolIds(type) {
    return new Set(this.getOrderedToolIds(type).slice(0, MIN_VISIBLE_TOOLS));
  }

  enforceMinimumVisibleTools(type = null) {
    const types = type ? [type] : ["ai", "social"];
    const nextHiddenTools = { ...(state.get("hiddenTools") || {}) };
    let changed = false;

    types.forEach((toolType) => {
      const orderedIds = this.getOrderedToolIds(toolType);
      orderedIds.slice(0, MIN_VISIBLE_TOOLS).forEach((id) => {
        if (nextHiddenTools[id] === true) {
          delete nextHiddenTools[id];
          changed = true;
        }
      });
      let visibleCount = orderedIds.filter(
        (id) => nextHiddenTools[id] !== true,
      ).length;
      if (visibleCount >= MIN_VISIBLE_TOOLS) return;

      orderedIds.forEach((id) => {
        if (visibleCount >= MIN_VISIBLE_TOOLS) return;
        if (nextHiddenTools[id] === true) {
          delete nextHiddenTools[id];
          visibleCount += 1;
          changed = true;
        }
      });
    });

    if (changed && state.set("hiddenTools", nextHiddenTools)) {
      this.hiddenTools = { ...nextHiddenTools };
    }
    return !changed || this.hiddenTools;
  }

  toggle() {
    this.els.popup.classList.toggle("visible");
    const visible = this.els.popup.classList.contains("visible");
    this.els.btn.setAttribute("aria-expanded", String(visible));
    this.els.popup.setAttribute("aria-hidden", String(!visible));
  }

  close() {
    this.els.popup.classList.remove("visible");
    this.els.btn.setAttribute("aria-expanded", "false");
    this.els.popup.setAttribute("aria-hidden", "true");
    if (this.isEditMode) this.toggleEditMode();
    this.closeAddToolModal(true);
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.els.popup.classList.toggle("edit-mode", this.isEditMode);
    this.els.editBtn.setAttribute("aria-pressed", String(this.isEditMode));

    const pencil = this.els.editBtn.querySelector(".icon-pencil");
    const check = this.els.editBtn.querySelector(".icon-check");

    if (pencil) pencil.classList.toggle("hidden", this.isEditMode);
    if (check) check.classList.toggle("hidden", !this.isEditMode);
    this.els.addBtn?.classList.toggle("hidden", !this.isEditMode);
    this.els.addBtn?.setAttribute(
      "aria-label",
      `Add a new ${this.activeTab === "social" ? "social tool" : "AI tool"}`,
    );

    this.updateFooter();
    this.renderAll();
    if (!this.isEditMode) this.closeAddToolModal(true);
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
    this.els.addBtn?.setAttribute(
      "aria-label",
      `Add a new ${tabName === "social" ? "social tool" : "AI tool"}`,
    );

    this.els.tabs.forEach((t) =>
      {
        const selected = t.dataset.tab === tabName;
        t.classList.toggle("active", selected);
        t.setAttribute("aria-selected", String(selected));
      },
    );

    if (tabName === "ai") {
      this.els.aiList.classList.add("active");
      this.els.aiList.setAttribute("aria-hidden", "false");
      this.els.socialList.classList.remove("active");
      this.els.socialList.setAttribute("aria-hidden", "true");
      this.els.btn.querySelector(".ai-icon").classList.remove("hidden");
      this.els.btn.querySelector(".social-icon").classList.add("hidden");
    } else {
      this.els.aiList.classList.remove("active");
      this.els.aiList.setAttribute("aria-hidden", "true");
      this.els.socialList.classList.add("active");
      this.els.socialList.setAttribute("aria-hidden", "false");
      this.els.btn.querySelector(".ai-icon").classList.add("hidden");
      this.els.btn.querySelector(".social-icon").classList.remove("hidden");
    }
  }

  renderAll() {
    const aiTools = this.getAllTools("ai");
    const socialTools = this.getAllTools("social");
    const aiOrder = state.get("aiToolsOrder") || aiTools.map((t) => t.id);
    const socialOrder =
      state.get("socialToolsOrder") || socialTools.map((t) => t.id);

    this.renderList(
      this.els.aiList,
      aiTools,
      aiOrder,
      CONFIG.paths.ai,
      "ai",
    );
    this.renderList(
      this.els.socialList,
      socialTools,
      socialOrder,
      CONFIG.paths.social,
      "social",
    );

    if (this.isEditMode) {
      this.enableDragAndDrop();
    }
  }

  renderList(container, allItems, orderList, pathPrefix, type) {
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
      a.className = `ai-tool-item${tool.isCustom ? " custom-tool-item" : ""}`;
      a.dataset.id = tool.id;
      if (!this.isEditMode) {
        const openTool = () => {
          this.recordFeatureUse(tool.id);
          const targets =
            state.get("linkTargets") || CONFIG.defaults.linkTargets;
          window.open(tool.url, targets.ai || "_blank");
        };
        a.onclick = openTool;
        makeKeyboardInteractive(a, openTool, `Open ${tool.name}`);
        a.style.cursor = "pointer";
      }

      if (this.isEditMode) {
        a.classList.add("edit-mode-item");
        if (isHidden) a.classList.add("is-hidden");
        a.setAttribute("role", "button");
        a.tabIndex = 0;
        a.setAttribute("aria-label", `Reorder ${tool.name}`);
        a.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          this.moveItem(tool.id, event.key === "ArrowUp" ? -1 : 1);
        });
      }

      const iconDiv = document.createElement("div");
      iconDiv.className = "ai-tool-icon";
      const img = document.createElement("img");
      img.src = tool.isCustom ? tool.icon : pathPrefix + tool.icon;
      img.alt = tool.name;

      if (this.isEditMode) {
        const overlay = document.createElement("div");
        overlay.className = `edit-overlay${tool.isCustom ? " custom-tool-action" : ""}`;
        const protectedTool = this.getProtectedToolIds(type).has(tool.id);
        if (protectedTool) overlay.classList.add("is-protected");
        const action = tool.isCustom
          ? () => this.handleCustomToolAction(tool, type)
          : () => this.toggleToolVisibility(tool.id, type);
        makeKeyboardInteractive(
          overlay,
          action,
          tool.isCustom
            ? `${isHidden ? "Enable" : "Disable or delete"} ${tool.name}`
            : protectedTool
              ? `Keep ${tool.name} visible`
              : `${isHidden ? "Show" : "Hide"} ${tool.name}`,
        );

        const actionIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        actionIcon.setAttribute("viewBox", "0 0 24 24");
        actionIcon.setAttribute("fill", "none");
        actionIcon.setAttribute("stroke", "currentColor");
        actionIcon.setAttribute("stroke-width", "2.8");
        actionIcon.setAttribute("stroke-linecap", "round");
        actionIcon.setAttribute("aria-hidden", "true");
        const firstPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        firstPath.setAttribute("d", isHidden ? "M12 5v14" : "M7 7l10 10");
        const secondPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        secondPath.setAttribute("d", isHidden ? "M5 12h14" : "M17 7 7 17");
        actionIcon.append(firstPath, secondPath);
        overlay.appendChild(actionIcon);

        overlay.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          action();
        });
        a.appendChild(overlay);
      }

      iconDiv.appendChild(img);
      a.appendChild(iconDiv);
      const name = document.createElement("span");
      name.className = "tool-name";
      name.textContent = tool.name;
      a.appendChild(name);

      const featureKey =
        tool.id === "ai-mistral"
          ? "mistralToolUseCount"
          : tool.id === "social-tiktok"
            ? "tiktokToolUseCount"
            : null;
      if (featureKey && (Number(state.get(featureKey)) || 0) < 1) {
        const badge = document.createElement("span");
        badge.className = "tool-new-badge";
        badge.textContent = "NEW";
        badge.setAttribute("aria-label", "New");
        a.appendChild(badge);
      }

      container.appendChild(a);
    });
  }

  toggleToolVisibility(id, type = this.activeTab) {
    const nextHiddenTools = { ...this.hiddenTools };
    const normalizedType = type === "social" ? "social" : "ai";
    const orderedIds = this.getOrderedToolIds(normalizedType);
    const protectedIds = new Set(orderedIds.slice(0, MIN_VISIBLE_TOOLS));
    const isCurrentlyVisible = nextHiddenTools[id] !== true;

    if (isCurrentlyVisible && protectedIds.has(id)) {
      void showCustomModal(
        `The first ${MIN_VISIBLE_TOOLS} ${normalizedType === "social" ? "social links" : "AI tools"} must remain visible.`,
      );
      return false;
    }

    if (isCurrentlyVisible) {
      const visibleCount = orderedIds.filter(
        (toolId) => nextHiddenTools[toolId] !== true,
      ).length;
      if (visibleCount <= MIN_VISIBLE_TOOLS) {
        void showCustomModal(
          `At least ${MIN_VISIBLE_TOOLS} ${normalizedType === "social" ? "social links" : "AI tools"} must remain visible.`,
        );
        return false;
      }
    }

    if (nextHiddenTools[id]) {
      nextHiddenTools[id] = false;
    } else {
      nextHiddenTools[id] = true;
    }

    if (!state.set("hiddenTools", nextHiddenTools)) return;
    this.hiddenTools = { ...(state.get("hiddenTools") || {}) };
    this.renderAll();
  }

  async handleCustomToolAction(tool, type) {
    const isDisabled = this.hiddenTools[tool.id] === true;
    const action = await showCustomModal(
      `${tool.name} is a custom ${type === "social" ? "social tool" : "AI tool"}. Would you like to ${isDisabled ? "enable" : "disable"} it or delete it?`,
      false,
      false,
      [
        {
          text: isDisabled ? "Enable" : "Disable",
          value: "toggle",
          width: "110px",
        },
        {
          text: "Delete",
          value: "delete",
          width: "110px",
          className: "settings-button danger",
        },
        {
          text: "Cancel",
          value: "cancel",
          width: "110px",
          style:
            "background: var(--bg-interactive); color: var(--text-primary);",
        },
      ],
    );

    if (action === "toggle") {
      this.toggleToolVisibility(tool.id, type);
    } else if (action === "delete") {
      this.deleteCustomTool(tool.id, type);
    }
  }

  deleteCustomTool(id, type) {
    const toolsKey = type === "social" ? "customSocialLinks" : "customAiTools";
    const orderKey = type === "social" ? "socialToolsOrder" : "aiToolsOrder";
    const current = state.get(toolsKey) || [];
    const next = current.filter((tool) => tool.id !== id);
    if (next.length === current.length || !state.set(toolsKey, next)) return false;

    const nextHidden = { ...(state.get("hiddenTools") || {}) };
    delete nextHidden[id];
    state.set("hiddenTools", nextHidden);

    const nextOrder = (state.get(orderKey) || []).filter((toolId) => toolId !== id);
    state.set(orderKey, nextOrder);
    return true;
  }

  createCustomToolId(type) {
    const prefix = type === "social" ? "custom-social-" : "custom-ai-";
    const existing = new Set(
      this.getCustomTools(type).map((tool) => tool.id),
    );
    let id;
    do {
      const randomPart = globalThis.crypto?.randomUUID?.() ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      id = `${prefix}${randomPart}`;
    } while (existing.has(id));
    return id;
  }

  async createScaledIconData(file) {
    const fileType = file?.type?.toLowerCase();
    if (!file || !CUSTOM_TOOL_IMAGE_TYPES.has(fileType)) {
      throw new TypeError("Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG icon.");
    }
    if (file.size <= 0 || file.size > CUSTOM_TOOL_ICON_MAX_BYTES) {
      throw new TypeError("The icon must be smaller than 5 MB.");
    }
    if (fileType !== "image/svg+xml") {
      await validateImageBlob(file, {
        maxBytes: CUSTOM_TOOL_ICON_MAX_BYTES,
        maxWidth: 8192,
        maxHeight: 8192,
        maxPixels: 40_000_000,
      });
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new TypeError("The icon could not be decoded."));
        element.src = objectUrl;
      });
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height || width * height > 40_000_000) {
        throw new TypeError("The icon dimensions are too large.");
      }

      const scale = Math.min(
        1,
        CUSTOM_TOOL_ICON_SIZE / width,
        CUSTOM_TOOL_ICON_SIZE / height,
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The icon could not be processed.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > 1_000_000) {
        throw new TypeError("The processed icon is too large.");
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  openAddToolModal(type = this.activeTab) {
    if (this.addToolModal) return;

    const isSocial = type === "social";
    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "ydd-add-tool-overlay";
    overlay.setAttribute("role", "presentation");

    const modal = document.createElement("section");
    modal.className = "ydd-add-tool-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ydd-add-tool-title");

    const title = document.createElement("h2");
    title.id = "ydd-add-tool-title";
    title.textContent = `Add a new ${isSocial ? "Social" : "AI"}`;

    const subtitle = document.createElement("p");
    subtitle.className = "ydd-add-tool-subtitle";
    subtitle.textContent = `Add a custom ${isSocial ? "social link" : "AI tool"} to your dashboard.`;

    const form = document.createElement("form");
    form.noValidate = true;

    const iconLabel = document.createElement("label");
    iconLabel.className = "ydd-tool-icon-picker";
    iconLabel.tabIndex = 0;
    iconLabel.setAttribute("aria-label", "Choose an icon image");
    const iconPreview = document.createElement("span");
    iconPreview.className = "ydd-tool-icon-preview";
    iconPreview.textContent = "+";
    const iconHint = document.createElement("span");
    iconHint.className = "ydd-tool-icon-hint";
    iconHint.textContent = "Choose icon";
    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml";
    iconInput.className = "visually-hidden";
    iconInput.setAttribute("aria-label", "Choose an icon image");
    iconLabel.append(iconPreview, iconHint, iconInput);

    const createField = (labelText, inputType, placeholder, limit) => {
      const wrapper = document.createElement("label");
      wrapper.className = "ydd-add-tool-field";
      const labelRow = document.createElement("span");
      labelRow.className = "ydd-add-tool-label-row";
      const label = document.createElement("span");
      label.textContent = labelText;
      const count = document.createElement("span");
      count.className = "ydd-add-tool-count";
      count.textContent = `0/${limit}`;
      labelRow.append(label, count);
      const input = document.createElement("input");
      input.type = inputType;
      input.placeholder = placeholder;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.limit = String(limit);
      input.setAttribute("aria-label", labelText);
      const error = document.createElement("span");
      error.className = "ydd-add-tool-error";
      error.setAttribute("aria-live", "polite");
      wrapper.append(labelRow, input, error);
      return { wrapper, input, count, error };
    };

    const nameField = createField(
      "Name",
      "text",
      isSocial ? "e.g. Mastodon" : "e.g. My AI",
      MAX_CUSTOM_TOOL_NAME_LENGTH,
    );
    const urlField = createField(
      "Link",
      "url",
      "https://example.com",
      MAX_CUSTOM_TOOL_URL_LENGTH,
    );
    const formError = document.createElement("p");
    formError.className = "ydd-add-tool-form-error";
    formError.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "ydd-add-tool-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "settings-button ydd-add-tool-cancel";
    cancelButton.textContent = "Cancel";
    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.className = "settings-button";
    addButton.textContent = "Add";
    actions.append(cancelButton, addButton);

    form.append(iconLabel, nameField.wrapper, urlField.wrapper, formError, actions);
    modal.append(title, subtitle, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.addToolModal = {
      overlay,
      previousFocus,
      close: (immediate = false) => closeModal(immediate),
    };

    let iconData = null;
    let closing = false;
    const setFieldError = (field, message = "") => {
      field.input.classList.toggle("is-invalid", Boolean(message));
      field.input.setAttribute("aria-invalid", String(Boolean(message)));
      field.error.textContent = message;
    };
    const updateCount = (field) => {
      const length = field.input.value.length;
      field.count.textContent = `${length}/${field.input.dataset.limit}`;
      field.count.classList.toggle(
        "is-over-limit",
        length > Number(field.input.dataset.limit),
      );
    };
    const validateFields = () => {
      let valid = true;
      const name = nameField.input.value.trim();
      const rawUrl = urlField.input.value.trim();
      updateCount(nameField);
      updateCount(urlField);

      if (!name) {
        setFieldError(nameField, "Enter a name.");
        valid = false;
      } else if (nameField.input.value.length > MAX_CUSTOM_TOOL_NAME_LENGTH) {
        setFieldError(nameField, `Name must be ${MAX_CUSTOM_TOOL_NAME_LENGTH} characters or fewer.`);
        valid = false;
      } else {
        setFieldError(nameField);
      }

      if (!rawUrl) {
        setFieldError(urlField, "Enter a link.");
        valid = false;
      } else if (urlField.input.value.length > MAX_CUSTOM_TOOL_URL_LENGTH) {
        setFieldError(urlField, `Link must be ${MAX_CUSTOM_TOOL_URL_LENGTH} characters or fewer.`);
        valid = false;
      } else {
        try {
          normalizeHttpUrl(rawUrl, MAX_CUSTOM_TOOL_URL_LENGTH);
          setFieldError(urlField);
        } catch (error) {
          setFieldError(urlField, error.message);
          valid = false;
        }
      }

      if (!iconData) {
        iconLabel.classList.add("is-invalid");
        formError.textContent = "Choose an icon image.";
        valid = false;
      } else {
        iconLabel.classList.remove("is-invalid");
        if (formError.textContent === "Choose an icon image.") formError.textContent = "";
      }
      return valid;
    };

    const closeModal = (immediate = false) => {
      if (closing) return;
      closing = true;
      document.removeEventListener("keydown", keyHandler, true);
      overlay.classList.remove("is-open");
      const remove = () => {
        if (overlay.isConnected) overlay.remove();
        if (this.addToolModal?.overlay === overlay) this.addToolModal = null;
        const focusTarget =
          previousFocus?.isConnected && !previousFocus.classList.contains("hidden")
            ? previousFocus
            : this.els.editBtn;
        if (focusTarget?.focus) window.setTimeout(() => focusTarget.focus(), 0);
      };
      if (immediate) remove();
      else window.setTimeout(remove, 220);
    };
    const keyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = modal.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])");
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
    };

    nameField.input.addEventListener("input", () => {
      updateCount(nameField);
      setFieldError(
        nameField,
        nameField.input.value.length > MAX_CUSTOM_TOOL_NAME_LENGTH
          ? `Name must be ${MAX_CUSTOM_TOOL_NAME_LENGTH} characters or fewer.`
          : "",
      );
    });
    urlField.input.addEventListener("input", () => {
      updateCount(urlField);
      setFieldError(
        urlField,
        urlField.input.value.length > MAX_CUSTOM_TOOL_URL_LENGTH
          ? `Link must be ${MAX_CUSTOM_TOOL_URL_LENGTH} characters or fewer.`
          : "",
      );
    });
    iconInput.addEventListener("change", async () => {
      const file = iconInput.files?.[0];
      if (!file) return;
      iconInput.value = "";
      iconInput.disabled = true;
      try {
        iconData = await this.createScaledIconData(file);
        const preview = document.createElement("img");
        preview.src = iconData;
        preview.alt = "Selected icon preview";
        iconPreview.replaceChildren(preview);
        iconHint.textContent = "Change icon";
        iconLabel.classList.remove("is-invalid");
        if (formError.textContent === "Choose an icon image.") formError.textContent = "";
      } catch (error) {
        iconData = null;
        iconPreview.textContent = "+";
        iconLabel.classList.add("is-invalid");
        formError.textContent = error.message || "The icon could not be processed.";
      } finally {
        iconInput.disabled = false;
      }
    });
    iconLabel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        iconInput.click();
      }
    });
    cancelButton.addEventListener("click", () => closeModal());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal();
    });
    let isSubmitting = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      formError.textContent = "";
      if (!validateFields()) return;

      isSubmitting = true;
      addButton.disabled = true;
      try {
        const toolsKey = isSocial ? "customSocialLinks" : "customAiTools";
        const orderKey = isSocial ? "socialToolsOrder" : "aiToolsOrder";
        const current = state.get(toolsKey) || [];
        if (current.length >= MAX_CUSTOM_TOOLS) {
          formError.textContent = `You can add up to ${MAX_CUSTOM_TOOLS} custom tools in this tab.`;
          return;
        }

        const cleanName = nameField.input.value.trim();
        let cleanUrl;
        try {
          cleanUrl = normalizeHttpUrl(urlField.input.value, MAX_CUSTOM_TOOL_URL_LENGTH);
        } catch (error) {
          setFieldError(urlField, error.message);
          return;
        }

        const urlClassification = classifyToolUrl(cleanUrl, type);

        if (!urlClassification.matched) {
          const previousOverlayZIndex = overlay.style.zIndex;
          overlay.style.zIndex = "11900";
          let confirmation;
          try {
            confirmation = await showCustomModal(
              `No known ${isSocial ? "social-platform or social-tool" : "AI-tool"} keyword was found in this link. This does not prove the link is invalid.\n\nDo you still want to add it? Only continue if you trust this website.`,
              false,
              false,
              [
                {
                  text: "Add anyway",
                  value: "add-anyway",
                  width: "120px",
                },
                {
                  text: "Cancel",
                  value: "cancel",
                  width: "120px",
                  style:
                    "background: var(--bg-interactive); color: var(--text-primary);",
                },
              ],
            );
          } finally {
            overlay.style.zIndex = previousOverlayZIndex;
          }
          if (confirmation !== "add-anyway") return;
        }

        const tool = {
          id: this.createCustomToolId(type),
          name: cleanName,
          url: cleanUrl,
          icon: iconData,
        };
        if (!state.set(toolsKey, [...current, tool])) {
          formError.textContent = "The tool could not be saved. Check browser storage.";
          return;
        }
        const nextOrder = [...(state.get(orderKey) || [])].filter((id) => id !== tool.id);
        nextOrder.push(tool.id);
        if (!state.set(orderKey, nextOrder)) {
          state.set(toolsKey, current);
          formError.textContent = "The tool order could not be saved.";
          return;
        }
        closeModal();
      } finally {
        isSubmitting = false;
        addButton.disabled = false;
      }
    });

    document.addEventListener("keydown", keyHandler, true);
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      iconLabel.focus();
    });
  }

  closeAddToolModal(immediate = false) {
    this.addToolModal?.close?.(immediate);
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
    }
  }

  recordFeatureUse(toolId) {
    const key =
      toolId === "ai-mistral"
        ? "mistralToolUseCount"
        : toolId === "social-tiktok"
          ? "tiktokToolUseCount"
          : null;
    if (!key || (Number(state.get(key)) || 0) >= 1) return;
    if (!state.set(key, 1)) return;
    this.renderAll();
  }

  moveItem(id, delta) {
    const orderKey = this.activeTab === "ai" ? "aiToolsOrder" : "socialToolsOrder";
    const order = [...(state.get(orderKey) || [])];
    const index = order.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    state.set(orderKey, order);
    this.els.popup.querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus();
  }
}
// [src/modules/aitools.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
