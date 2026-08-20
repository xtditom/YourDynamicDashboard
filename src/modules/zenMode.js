import { state } from "../state.js";

const ACKNOWLEDGE_DELAY = 5000;
const MANUAL_CLOSE_DELAY = 7000;
const AUTO_CLOSE_DELAY = 10000;

export class ZenModeController {
  constructor() {
    this.notice = null;
    this.timers = [];

    this.apply(state.get("zenMode") === true);
    this.unsubscribe = state.subscribe((key, value) => {
      if (key === "zenMode") this.apply(value === true);
    });
  }

  apply(active) {
    document.body.classList.toggle("zen-mode", active);
    document.documentElement.classList.remove("zen-mode-preload");

    if (active) this.closeBorderUi();

    if (active && state.get("zenNoticeAcknowledged") !== true) {
      this.showNotice();
    } else {
      this.hideNotice();
    }
  }

  closeBorderUi() {
    document
      .querySelectorAll(".popup-container.visible")
      .forEach((popup) => popup.classList.remove("visible"));
    document
      .querySelectorAll(".corner-button.is-open")
      .forEach((button) => button.classList.remove("is-open"));

    if (window.__fullSettingsModalInstance?.isOpen) {
      window.__fullSettingsModalInstance.close();
    }
    if (window.YD_CommandPalette?.isOpen) window.YD_CommandPalette.close();

    window.YD_Search?.closeHistoryModal();
    window.YD_Search?._removeHistoryDropdown(true);
    window.YD_Search?.closeDropdown();
  }

  showNotice() {
    if (this.notice) return;

    const notice = document.createElement("aside");
    notice.className = "zen-mode-notice";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-live", "polite");
    notice.setAttribute("aria-labelledby", "zen-mode-notice-title");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "zen-notice-close";
    closeButton.textContent = "×";
    closeButton.disabled = true;
    closeButton.setAttribute("aria-label", "Close Zen Mode guidance");
    closeButton.title = "Close unlocks shortly";

    const content = document.createElement("div");
    content.className = "zen-notice-content";

    const title = document.createElement("strong");
    title.id = "zen-mode-notice-title";
    title.textContent = "Zen Mode is active";

    const message = document.createElement("p");
    message.append("Corner controls and shortcuts are hidden. Press ");
    const key = document.createElement("kbd");
    key.textContent = "Z";
    message.append(key, " at any time to leave Zen Mode and restore them.");

    const understandButton = document.createElement("button");
    understandButton.type = "button";
    understandButton.className = "zen-notice-understand hidden";
    understandButton.textContent = "I understand";

    const unlockClose = () => {
      closeButton.disabled = false;
      closeButton.title = "Close";
      notice.classList.add("close-unlocked");
    };

    closeButton.addEventListener("click", () => {
      if (!closeButton.disabled) this.hideNotice();
    });

    understandButton.addEventListener("click", () => {
      if (!state.set("zenNoticeAcknowledged", true)) return;
      understandButton.disabled = true;
      understandButton.textContent = "Understood ✓";
      unlockClose();
    });

    content.append(title, message, understandButton);
    notice.append(closeButton, content);
    document.body.appendChild(notice);
    this.notice = notice;

    this.timers.push(
      window.setTimeout(() => {
        if (this.notice === notice) {
          understandButton.classList.remove("hidden");
        }
      }, ACKNOWLEDGE_DELAY),
      window.setTimeout(() => {
        if (this.notice === notice) unlockClose();
      }, MANUAL_CLOSE_DELAY),
      window.setTimeout(() => {
        if (this.notice === notice) this.hideNotice();
      }, AUTO_CLOSE_DELAY),
    );

    window.requestAnimationFrame(() => notice.classList.add("visible"));
  }

  hideNotice() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];

    if (!this.notice) return;
    this.notice.remove();
    this.notice = null;
  }
}

// [src/modules/zenMode.js] YourDynamicDashboard V2.2
