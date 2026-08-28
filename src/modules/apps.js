import { CONFIG, GOOGLE_APPS } from "../config.js";
import { state } from "../state.js";
import { makeKeyboardInteractive, showCustomModal } from "../utils.js";
import {
  MAX_CUSTOM_APPS,
  MAX_CUSTOM_APP_NAME_LENGTH,
  MAX_CUSTOM_APP_URL_LENGTH,
  MAX_CUSTOM_TOOL_ICON_LENGTH,
  normalizeHttpUrl,
  validateImageBlob,
} from "../validators.js";

const CUSTOM_APP_ICON_SIZE = 128;
const CUSTOM_APP_ICON_MAX_BYTES = 5 * 1024 * 1024;
const APP_DIVIDER_ID = "app-divider";
const APP_EDIT_HINT_LIMIT = 10;
const APP_EDIT_HINT_DURATION = 7000;
const MIN_VISIBLE_APPS = 12;
const CUSTOM_APP_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

const getDefaultAppId = (name) =>
  `app-default-${String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

export class AppGrid {
  constructor() {
    this.els = {
      btn: document.getElementById("apps-toggle-button"),
      popup: document.getElementById("apps-popup"),
      grid: document.getElementById("apps-grid"),
      editBtn: document.getElementById("apps-edit-button"),
      addBtn: document.getElementById("apps-add-button"),
      moreBtn: document.getElementById("apps-more-button"),
      hint: document.getElementById("apps-edit-hint"),
    };

    if (!this.els.btn || !this.els.popup || !this.els.grid) return;
    this.isEditMode = false;
    this.selectedIds = new Set();
    this.appModal = null;
    this._actionModalOpen = false;
    this._hintTimer = null;
    this._dragOccurred = false;
    this._popupObserver = null;
    window.YD_Apps = this;
    this.init();
  }

  init() {
    this.initializeOrderState();
    this.enforceMinimumVisibleApps();
    this.render();

    this.els.btn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.els.editBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleEditMode();
    });
    this.els.addBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openAppModal();
    });
    this.els.moreBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openSelectionActions();
    });

    document.addEventListener("click", (event) => {
      if (this._actionModalOpen || this.appModal) return;
      if (
        this.els.popup.classList.contains("visible") &&
        !this.els.popup.contains(event.target)
      ) {
        this.close();
      }
    });
    this.els.popup.addEventListener("click", (event) => event.stopPropagation());
    if (window.MutationObserver) {
      this._popupObserver = new MutationObserver(() => {
        if (!this.els.popup.classList.contains("visible") && this.isEditMode) {
          this.setEditMode(false);
        }
      });
      this._popupObserver.observe(this.els.popup, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    state.subscribe((key) => {
      if (key === "showApps") this.updateVisibility();
      if (key === "linkTargets") this.render();
      if (key === "customApps") this.initializeOrderState();
      if (key === "hiddenApps") this.enforceMinimumVisibleApps();
      if (
        key === "customApps" ||
        key === "googleAppOverrides" ||
        key === "hiddenApps" ||
        key === "googleAppsOrder"
      ) {
        this.render();
      }
    });
    this.updateVisibility();
  }

  getDefaultApps() {
    const overrides = state.get("googleAppOverrides") || {};
    return GOOGLE_APPS.map((app) => {
      if (app.name === "divider") {
        return { id: APP_DIVIDER_ID, name: "divider", isDivider: true };
      }
      const id = getDefaultAppId(app.name);
      const override = overrides[id] || {};
      return {
        ...app,
        id,
        originalName: app.name,
        name: override.name || app.name,
        icon: override.icon || app.icon,
        isCustom: false,
      };
    });
  }

  getAllApps() {
    const customApps = (state.get("customApps") || []).map((app) => ({
      ...app,
      isCustom: true,
    }));
    return [...this.getDefaultApps(), ...customApps];
  }

  getVisibleApps() {
    const hiddenApps = state.get("hiddenApps") || {};
    return this.getAllApps().filter(
      (app) => !app.isDivider && hiddenApps[app.id] !== true,
    );
  }

  getAppById(id) {
    return this.getAllApps().find((app) => app.id === id) || null;
  }

  getAppIconUrl(app) {
    if (!app?.icon) return `${CONFIG.paths.icons}icon32.png`;
    return app.icon.startsWith("data:image/") || app.icon.includes("/")
      ? app.icon
      : `${CONFIG.paths.apps}${app.icon}`;
  }

  initializeOrderState() {
    const apps = this.getAllApps();
    const validIds = new Set(apps.map((app) => app.id));
    const oldNames = new Map(
      apps.map((app) => [app.originalName || app.name, app.id]),
    );
    oldNames.set("divider", APP_DIVIDER_ID);

    const rawOrder = state.get("googleAppsOrder");
    const normalized = [];
    const seen = new Set();
    (Array.isArray(rawOrder) ? rawOrder : []).forEach((entry) => {
      const id = validIds.has(entry) ? entry : oldNames.get(entry);
      if (!id || seen.has(id)) return;
      seen.add(id);
      normalized.push(id);
    });
    apps.forEach((app) => {
      if (seen.has(app.id)) return;
      seen.add(app.id);
      normalized.push(app.id);
    });

    if (
      !Array.isArray(rawOrder) ||
      rawOrder.length !== normalized.length ||
      rawOrder.some((entry, index) => entry !== normalized[index])
    ) {
      state.set("googleAppsOrder", normalized);
    }
    return normalized;
  }

  enforceMinimumVisibleApps() {
    const appMap = new Map(this.getAllApps().map((app) => [app.id, app]));
    const orderedApps = this.initializeOrderState()
      .map((id) => appMap.get(id))
      .filter((app) => app && !app.isDivider);
    const hiddenApps = { ...(state.get("hiddenApps") || {}) };
    const visibleCount = orderedApps.filter(
      (app) => hiddenApps[app.id] !== true,
    ).length;
    if (visibleCount >= MIN_VISIBLE_APPS) return;

    let restoredCount = visibleCount;
    orderedApps.forEach((app) => {
      if (restoredCount >= MIN_VISIBLE_APPS) return;
      if (hiddenApps[app.id] === true) {
        delete hiddenApps[app.id];
        restoredCount += 1;
      }
    });
    state.set("hiddenApps", hiddenApps);
  }

  toggle() {
    const visible = !this.els.popup.classList.contains("visible");
    if (!visible) {
      this.close();
      return;
    }
    this.els.popup.classList.toggle("visible", visible);
    this.els.btn.classList.toggle("is-open", visible);
    this.els.btn.setAttribute("aria-expanded", String(visible));
    this.els.popup.setAttribute("aria-hidden", String(!visible));
  }

  close() {
    this.els.popup.classList.remove("visible");
    this.els.btn.classList.remove("is-open");
    this.els.btn.setAttribute("aria-expanded", "false");
    this.els.popup.setAttribute("aria-hidden", "true");
    if (this.isEditMode) this.setEditMode(false);
    this.closeAppModal(true);
  }

  toggleEditMode() {
    this.setEditMode(!this.isEditMode);
  }

  setEditMode(enabled) {
    const entering = enabled && !this.isEditMode;
    this.isEditMode = Boolean(enabled);
    this.selectedIds.clear();
    this.els.popup.classList.toggle("edit-mode", this.isEditMode);
    this.els.editBtn?.setAttribute("aria-pressed", String(this.isEditMode));
    if (entering) this.showEditHint();
    if (!this.isEditMode) {
      this.hideEditHint(true);
      this.closeAppModal(true);
    }
    this.render();
  }

  showEditHint() {
    if (!this.els.hint) return;
    const count = Math.max(0, Number(state.get("appsEditHintCount")) || 0);
    if (count >= APP_EDIT_HINT_LIMIT) return;
    state.set("appsEditHintCount", count + 1);

    clearTimeout(this._hintTimer);
    const timer = document.createElement("div");
    timer.className = "apps-edit-hint-timer";
    timer.setAttribute("aria-hidden", "true");
    this.els.hint.replaceChildren(
      document.createTextNode(
        "Click apps to modify, hide, or delete them. Use the + icon to add a new app.",
      ),
      timer,
    );
    this.els.hint.style.setProperty(
      "--apps-hint-duration",
      `${APP_EDIT_HINT_DURATION}ms`,
    );
    this.els.hint.classList.remove("hidden");
    window.requestAnimationFrame(() => this.els.hint.classList.add("is-visible"));
    this._hintTimer = window.setTimeout(
      () => this.hideEditHint(),
      APP_EDIT_HINT_DURATION,
    );
  }

  hideEditHint(immediate = false) {
    if (!this.els.hint) return;
    clearTimeout(this._hintTimer);
    this._hintTimer = null;
    this.els.hint.classList.remove("is-visible");
    const finish = () => this.els.hint?.classList.add("hidden");
    if (immediate) finish();
    else window.setTimeout(finish, 180);
  }

  render() {
    const apps = this.getAllApps();
    const appMap = new Map(apps.map((app) => [app.id, app]));
    const order = this.initializeOrderState();
    const hiddenApps = state.get("hiddenApps") || {};

    this.selectedIds.forEach((id) => {
      if (!appMap.has(id)) this.selectedIds.delete(id);
    });
    this.els.grid.innerHTML = "";

    order
      .map((id) => appMap.get(id))
      .filter(Boolean)
      .forEach((app) => {
        if (app.isDivider) {
          const divider = document.createElement("div");
          divider.className = "apps-grid-divider";
          divider.dataset.appId = app.id;
          this.els.grid.appendChild(divider);
          return;
        }

        const isHidden = hiddenApps[app.id] === true;
        if (isHidden && !this.isEditMode) return;

        const slot = document.createElement("div");
        slot.className = "app-slot";
        slot.dataset.appId = app.id;

        const item = document.createElement("div");
        item.className = "app-item";
        item.dataset.appId = app.id;
        item.dataset.name = app.id;
        item.classList.toggle("is-selected", this.selectedIds.has(app.id));
        item.classList.toggle("is-hidden", isHidden);

        if (this.isEditMode) {
          item.setAttribute("role", "button");
          item.tabIndex = 0;
          item.setAttribute("aria-pressed", String(this.selectedIds.has(app.id)));
          item.setAttribute("aria-label", `Select ${app.name}`);
          item.addEventListener("click", () => {
            if (this._dragOccurred) return;
            this.toggleSelection(app.id);
          });
          item.addEventListener("keydown", (event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              this.moveItem(app.id, event.key === "ArrowUp" ? -1 : 1);
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              this.toggleSelection(app.id);
            }
          });
        } else {
          const openApp = () => {
            if (this._dragOccurred) return;
            const targets = state.get("linkTargets") || CONFIG.defaults.linkTargets;
            window.open(app.url, targets.apps || "_blank");
          };
          item.addEventListener("click", openApp);
          makeKeyboardInteractive(item, openApp, `Open ${app.name}`);
        }
        item.style.cursor = "pointer";

        const img = document.createElement("img");
        img.className = "app-icon ydd-asset-image";
        img.src = this.getAppIconUrl(app);
        img.alt = app.name;
        if (!app.icon?.startsWith("data:image/")) {
          if (app.width) img.style.width = app.width;
          if (app.height) img.style.height = app.height;
        }

        const name = document.createElement("span");
        name.className = "app-name";
        name.textContent = app.name;
        item.append(img, name);

        if (isHidden) {
          const hiddenLabel = document.createElement("span");
          hiddenLabel.className = "app-hidden-label";
          hiddenLabel.textContent = "Hidden";
          item.appendChild(hiddenLabel);
        }

        slot.appendChild(item);
        this.els.grid.appendChild(slot);
      });

    this.enableDragAndDrop();
    this.updateEditorControls();
  }

  updateEditorControls() {
    const pencil = this.els.editBtn?.querySelector(".icon-pencil");
    const check = this.els.editBtn?.querySelector(".icon-check");
    pencil?.classList.toggle("hidden", this.isEditMode);
    check?.classList.toggle("hidden", !this.isEditMode);
    this.els.addBtn?.classList.toggle(
      "hidden",
      !this.isEditMode || this.selectedIds.size > 0,
    );
    this.els.moreBtn?.classList.toggle(
      "hidden",
      !this.isEditMode || this.selectedIds.size === 0,
    );
    this.els.moreBtn?.setAttribute(
      "aria-label",
      `Actions for ${this.selectedIds.size} selected app${this.selectedIds.size === 1 ? "" : "s"}`,
    );
  }

  toggleSelection(id) {
    if (!this.isEditMode) return;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);

    const item = this.els.grid.querySelector(
      `.app-item[data-app-id="${CSS.escape(id)}"]`,
    );
    item?.classList.toggle("is-selected", this.selectedIds.has(id));
    item?.setAttribute("aria-pressed", String(this.selectedIds.has(id)));
    this.updateEditorControls();
  }

  getSelectedApps() {
    const selected = this.selectedIds;
    return this.getAllApps().filter(
      (app) => !app.isDivider && selected.has(app.id),
    );
  }

  async openSelectionActions() {
    const selected = this.getSelectedApps();
    if (!selected.length || this._actionModalOpen) return;

    const hiddenApps = state.get("hiddenApps") || {};
    const allHidden = selected.every((app) => hiddenApps[app.id] === true);
    const allCustom = selected.every((app) => app.isCustom);
    const buttons = [
      {
        text: allHidden ? "Show" : "Hide",
        value: "toggle-visibility",
        width: "90px",
      },
    ];
    if (allCustom) {
      buttons.push({
        text: "Delete",
        value: "delete",
        width: "90px",
        className: "settings-button danger",
      });
    }
    if (selected.length === 1) {
      buttons.push({ text: "Modify", value: "modify", width: "90px" });
    }
    buttons.push({
      text: "Cancel",
      value: "cancel",
      width: "90px",
      style: "background: var(--bg-interactive); color: var(--text-primary);",
    });

    this._actionModalOpen = true;
    try {
      const action = await showCustomModal(
        `${selected.length} app${selected.length === 1 ? "" : "s"} selected.`,
        false,
        false,
        buttons,
      );
      if (action === "toggle-visibility") this.toggleSelectedVisibility(selected);
      if (action === "delete") await this.deleteSelectedApps(selected);
      if (action === "modify" && selected.length === 1) {
        this.openAppModal(selected[0]);
      }
    } finally {
      this._actionModalOpen = false;
    }
  }

  toggleSelectedVisibility(selected = this.getSelectedApps()) {
    if (!selected.length) return;
    const next = { ...(state.get("hiddenApps") || {}) };
    const shouldShow = selected.every((app) => next[app.id] === true);

    if (shouldShow) {
      selected.forEach((app) => delete next[app.id]);
    } else {
      const appMap = new Map(this.getAllApps().map((app) => [app.id, app]));
      const visibleIds = this.initializeOrderState()
        .map((id) => appMap.get(id))
        .filter((app) => app && !app.isDivider && next[app.id] !== true)
        .map((app) => app.id);
      const selectedVisibleIds = new Set(
        selected
          .filter((app) => next[app.id] !== true)
          .map((app) => app.id),
      );
      const remainingVisibleCount = visibleIds.filter(
        (id) => !selectedVisibleIds.has(id),
      ).length;
      const requiredToKeep = Math.max(
        0,
        MIN_VISIBLE_APPS - remainingVisibleCount,
      );
      const protectedIds = new Set(
        visibleIds
          .filter((id) => selectedVisibleIds.has(id))
          .slice(0, requiredToKeep),
      );
      const hideableSelected = selected.filter(
        (app) => !protectedIds.has(app.id) && next[app.id] !== true,
      );

      if (!hideableSelected.length) {
        showCustomModal(
          `At least ${MIN_VISIBLE_APPS} apps must remain visible.`,
          false,
          false,
        );
        return;
      }
      hideableSelected.forEach((app) => {
        next[app.id] = true;
      });
    }
    this.selectedIds.clear();
    state.set("hiddenApps", next);
  }

  async resetModifiedDefaultApp(app) {
    if (!app || app.isCustom || !app.id) return;
    const overrides = { ...(state.get("googleAppOverrides") || {}) };
    if (!overrides[app.id]) return;
    const confirmed = await showCustomModal(
      `Reset "${app.name}" to its original icon and name?`,
      true,
      false,
    );
    if (!confirmed) return;
    delete overrides[app.id];
    if (!state.set("googleAppOverrides", overrides)) {
      await showCustomModal("The app could not be reset. Check browser storage.");
      return;
    }
    this.selectedIds.clear();
    this.closeAppModal();
  }

  async deleteSelectedApps(selected = this.getSelectedApps()) {
    if (!selected.length || selected.some((app) => !app.isCustom)) return;
    const names = selected.map((app) => app.name).join(", ");
    const confirmed = await showCustomModal(
      selected.length === 1
        ? `Delete "${names}" forever? This cannot be undone.`
        : `Delete these ${selected.length} apps forever?\n${names}\n\nThis cannot be undone.`,
      true,
      true,
    );
    if (!confirmed) return;

    const ids = new Set(selected.map((app) => app.id));
    const current = state.get("customApps") || [];
    if (!state.set("customApps", current.filter((app) => !ids.has(app.id)))) {
      await showCustomModal("The selected apps could not be deleted. Check browser storage.");
      return;
    }
    const nextHidden = { ...(state.get("hiddenApps") || {}) };
    ids.forEach((id) => delete nextHidden[id]);
    state.set("hiddenApps", nextHidden);
    state.set(
      "googleAppsOrder",
      (state.get("googleAppsOrder") || []).filter((id) => !ids.has(id)),
    );
    this.selectedIds.clear();
    this.render();
  }

  createCustomAppId() {
    const existing = new Set(
      (state.get("customApps") || []).map((app) => app.id),
    );
    let id;
    do {
      const randomPart =
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      id = `custom-app-${randomPart}`;
    } while (existing.has(id));
    return id;
  }

  normalizeAppUrl(value) {
    const normalized = normalizeHttpUrl(value, MAX_CUSTOM_APP_URL_LENGTH);
    const hostname = new URL(normalized).hostname;
    if (!hostname.includes(".") && hostname !== "localhost" && !hostname.includes(":")) {
      throw new TypeError("Enter a valid website URL, such as https://example.com.");
    }
    return normalized;
  }

  async createScaledIconData(file) {
    const fileType = file?.type?.toLowerCase();
    if (!file || !CUSTOM_APP_IMAGE_TYPES.has(fileType)) {
      throw new TypeError("Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG icon.");
    }
    if (file.size <= 0 || file.size > CUSTOM_APP_ICON_MAX_BYTES) {
      throw new TypeError("The icon must be smaller than 5 MB.");
    }
    if (fileType !== "image/svg+xml") {
      await validateImageBlob(file, {
        maxBytes: CUSTOM_APP_ICON_MAX_BYTES,
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
        CUSTOM_APP_ICON_SIZE / width,
        CUSTOM_APP_ICON_SIZE / height,
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The icon could not be processed.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > MAX_CUSTOM_TOOL_ICON_LENGTH) {
        throw new TypeError("The processed icon is too large.");
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  openAppModal(app = null) {
    if (this.appModal) return;
    const isEditing = Boolean(app?.id);
    const isDefault = isEditing && !app.isCustom;

    const overlay = document.createElement("div");
    overlay.className = "ydd-add-tool-overlay";
    overlay.setAttribute("role", "presentation");
    const modal = document.createElement("section");
    modal.className = "ydd-add-tool-modal ydd-add-app-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ydd-add-app-title");

    const title = document.createElement("h2");
    title.id = "ydd-add-app-title";
    title.textContent = isEditing ? "Modify App" : "Add a new App";
    const subtitle = document.createElement("p");
    subtitle.className = "ydd-add-tool-subtitle";
    subtitle.textContent = isDefault
      ? "Change the app name or icon. Built-in app URLs cannot be changed."
      : isEditing
        ? "Change this custom app's icon, name, or URL."
        : "Add any website or web app to the Apps window.";

    const form = document.createElement("form");
    form.noValidate = true;
    const iconLabel = document.createElement("label");
    iconLabel.className = "ydd-tool-icon-picker";
    iconLabel.tabIndex = 0;
    iconLabel.setAttribute("aria-label", "Choose an app icon image");
    const iconPreview = document.createElement("span");
    iconPreview.className = "ydd-tool-icon-preview";
    const iconHint = document.createElement("span");
    iconHint.className = "ydd-tool-icon-hint";
    iconHint.textContent = isEditing ? "Change icon" : "Choose icon";
    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml";
    iconInput.className = "visually-hidden";
    iconInput.setAttribute("aria-label", "Choose an app icon image");
    iconLabel.append(iconPreview, iconHint, iconInput);

    if (isEditing) {
      const preview = document.createElement("img");
      preview.className = "ydd-asset-image";
      preview.src = this.getAppIconUrl(app);
      preview.alt = `${app.name} icon`;
      iconPreview.appendChild(preview);
    } else {
      iconPreview.textContent = "+";
    }

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
      "e.g. My App",
      MAX_CUSTOM_APP_NAME_LENGTH,
    );
    const urlField = createField(
      "URL",
      "url",
      "https://example.com",
      MAX_CUSTOM_APP_URL_LENGTH,
    );
    nameField.input.value = app?.name || "";
    urlField.input.value = app?.url || "";
    if (isDefault) {
      urlField.input.readOnly = true;
      urlField.input.setAttribute("aria-readonly", "true");
      urlField.wrapper.classList.add("is-readonly");
    }

    const formError = document.createElement("p");
    formError.className = "ydd-add-tool-form-error";
    formError.setAttribute("aria-live", "polite");
    const actions = document.createElement("div");
    actions.className = "ydd-add-tool-actions";
    const hasDefaultOverride =
      isDefault &&
      Object.keys(state.get("googleAppOverrides")?.[app.id] || {}).length > 0;
    if (hasDefaultOverride) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "settings-button danger ydd-add-app-reset";
      resetButton.textContent = "Reset";
      resetButton.addEventListener("click", () => {
        this.resetModifiedDefaultApp(app);
      });
      actions.appendChild(resetButton);
    }
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "settings-button ydd-add-tool-cancel";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "settings-button";
    saveButton.textContent = isEditing ? "Save" : "Add";
    actions.append(cancelButton, saveButton);
    form.append(iconLabel, nameField.wrapper, urlField.wrapper, formError, actions);
    modal.append(title, subtitle, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let iconData = app?.icon?.startsWith("data:image/") ? app.icon : null;
    let iconChanged = false;
    let closing = false;
    this.appModal = {
      overlay,
      close: (immediate = false) => closeModal(immediate),
    };

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
    updateCount(nameField);
    updateCount(urlField);

    const validateFields = () => {
      let valid = true;
      const name = nameField.input.value.trim();
      if (!name) {
        setFieldError(nameField, "Enter a name.");
        valid = false;
      } else if (nameField.input.value.length > MAX_CUSTOM_APP_NAME_LENGTH) {
        setFieldError(
          nameField,
          `Name must be ${MAX_CUSTOM_APP_NAME_LENGTH} characters or fewer.`,
        );
        valid = false;
      } else {
        setFieldError(nameField);
      }

      if (!isDefault) {
        if (!urlField.input.value.trim()) {
          setFieldError(urlField, "Enter a URL.");
          valid = false;
        } else {
          try {
            this.normalizeAppUrl(urlField.input.value);
            setFieldError(urlField);
          } catch (error) {
            setFieldError(urlField, error.message);
            valid = false;
          }
        }
      }

      if (!isEditing && !iconData) {
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
        overlay.remove();
        if (this.appModal?.overlay === overlay) this.appModal = null;
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
      const focusable = modal.querySelectorAll(
        "button, input, [tabindex]:not([tabindex='-1'])",
      );
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
        nameField.input.value.length > MAX_CUSTOM_APP_NAME_LENGTH
          ? `Name must be ${MAX_CUSTOM_APP_NAME_LENGTH} characters or fewer.`
          : "",
      );
    });
    urlField.input.addEventListener("input", () => {
      updateCount(urlField);
      if (!isDefault) setFieldError(urlField);
    });
    iconInput.addEventListener("change", async () => {
      const file = iconInput.files?.[0];
      if (!file) return;
      iconInput.value = "";
      iconInput.disabled = true;
      try {
        iconData = await this.createScaledIconData(file);
        iconChanged = true;
        const preview = document.createElement("img");
        preview.className = "ydd-asset-image";
        preview.src = iconData;
        preview.alt = "Selected icon preview";
        iconPreview.replaceChildren(preview);
        iconHint.textContent = "Change icon";
        iconLabel.classList.remove("is-invalid");
        formError.textContent = "";
      } catch (error) {
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

    let submitting = false;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (submitting) return;
      formError.textContent = "";
      if (!validateFields()) return;
      submitting = true;
      saveButton.disabled = true;
      try {
        const name = nameField.input.value.trim();
        if (!isEditing) {
          const current = state.get("customApps") || [];
          if (current.length >= MAX_CUSTOM_APPS) {
            formError.textContent = `You can add up to ${MAX_CUSTOM_APPS} custom apps.`;
            return;
          }
          const newApp = {
            id: this.createCustomAppId(),
            name,
            url: this.normalizeAppUrl(urlField.input.value),
            icon: iconData,
          };
          if (!state.set("customApps", [...current, newApp])) {
            formError.textContent = "The app could not be saved. Check browser storage.";
            return;
          }
        } else if (app.isCustom) {
          const current = state.get("customApps") || [];
          const updated = current.map((item) =>
            item.id === app.id
              ? {
                  ...item,
                  name,
                  url: this.normalizeAppUrl(urlField.input.value),
                  icon: iconChanged ? iconData : item.icon,
                }
              : item,
          );
          if (!state.set("customApps", updated)) {
            formError.textContent = "The app could not be updated. Check browser storage.";
            return;
          }
        } else {
          const overrides = { ...(state.get("googleAppOverrides") || {}) };
          const existing = overrides[app.id] || {};
          const next = { ...existing, name };
          if (iconChanged) next.icon = iconData;
          if (name === app.originalName) delete next.name;
          if (Object.keys(next).length) overrides[app.id] = next;
          else delete overrides[app.id];
          if (!state.set("googleAppOverrides", overrides)) {
            formError.textContent = "The app could not be updated. Check browser storage.";
            return;
          }
        }
        this.selectedIds = isEditing ? new Set([app.id]) : new Set();
        closeModal();
      } catch (error) {
        formError.textContent = error.message || "The app could not be saved.";
      } finally {
        submitting = false;
        saveButton.disabled = false;
      }
    });

    document.addEventListener("keydown", keyHandler, true);
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-open");
    });
  }

  closeAppModal(immediate = false) {
    this.appModal?.close?.(immediate);
  }

  enableDragAndDrop() {
    const items = this.els.grid.querySelectorAll(".app-item");
    const slots = this.els.grid.querySelectorAll(".app-slot");
    items.forEach((item) => {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", (event) => {
        this._dragOccurred = true;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.dataset.appId);
        item.classList.add("dragging");
        this.els.grid.classList.add("is-reordering");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        this.els.grid.classList.remove("is-reordering");
        slots.forEach((slot) => slot.classList.remove("drag-over"));
        window.setTimeout(() => {
          this._dragOccurred = false;
        }, 180);
      });
    });

    slots.forEach((slot) => {
      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (event) => {
        event.stopPropagation();
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain");
        const targetId = slot.dataset.appId;
        if (sourceId && targetId && sourceId !== targetId) {
          this.reorderItems(sourceId, targetId);
        }
      });
    });
  }

  reorderItems(sourceId, targetId) {
    const order = [...(state.get("googleAppsOrder") || [])];
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    [order[sourceIndex], order[targetIndex]] = [
      order[targetIndex],
      order[sourceIndex],
    ];
    state.set("googleAppsOrder", order);
  }

  moveItem(id, delta) {
    const order = [...(state.get("googleAppsOrder") || [])];
    const index = order.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    state.set("googleAppsOrder", order);
  }

  updateVisibility() {
    const show = state.get("showApps");
    this.els.btn.classList.toggle("hidden", !show);
  }
}
// [src/modules/apps.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
