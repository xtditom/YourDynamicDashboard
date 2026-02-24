export function formatTime(number) {
  return String(number).padStart(2, "0");
}

export function getIconUrl(url) {
  try {
    const urlObject = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${urlObject.hostname}`;
  } catch (e) {
    return "assets/icons/default.png";
  }
}

export function createEl(tag, className, text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function showCustomModal(
  message,
  isConfirm = false,
  isDanger = false,
  customButtons = null,
  isCelebration = false,
) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "hidden";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: flex; justify-content: center;
      align-items: center; z-index: 9999; opacity: 0; transition: opacity 0.3s;
    `;

    // 2. Create Modal Box
    const box = document.createElement("div");
    box.className = "modal-box"; // Uses existing CSS
    box.style.cssText = `
      max-width: 400px; text-align: center;
      transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const title = document.createElement("h2");
    title.style.cssText = "color: var(--accent-color); margin-bottom: 1rem;";
    if (isCelebration) {
      title.textContent = "🎉 Congratulations 🎊";
      title.style.fontSize = "1.8rem";
    } else {
      title.textContent = isConfirm ? "Confirm Action" : "Notice";
    }

    const text = document.createElement("p");
    text.style.cssText =
      "color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem;";

    if (isCelebration) {
      text.style.fontSize = "1.2rem";
      text.style.lineHeight = "1.6";
      box.style.maxWidth = "550px";
      box.style.padding = "2.5rem 2rem";
    }

    text.textContent = message;

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;";

    const cleanup = (result) => {
      overlay.style.opacity = "0";
      box.style.transform = "scale(0.9)";
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(result);
      }, 300);
    };

    if (customButtons && Array.isArray(customButtons)) {
      customButtons.forEach((btnData) => {
        const btn = document.createElement("button");
        btn.className = btnData.className || "settings-button";
        btn.style.width = btnData.width || "auto";
        if (btnData.style) btn.style.cssText += btnData.style;
        btn.textContent = btnData.text;
        btn.onclick = () => cleanup(btnData.value);
        btnContainer.appendChild(btn);
      });
    } else {
      const okBtn = document.createElement("button");
      okBtn.className = "settings-button";
      if (isDanger) okBtn.classList.add("danger-hover");
      okBtn.style.width = "120px";
      okBtn.textContent = isConfirm ? "Yes" : "OK";
      okBtn.addEventListener("click", () => cleanup(true));
      btnContainer.appendChild(okBtn);

      if (isConfirm) {
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "settings-button";
        cancelBtn.style.cssText =
          "width: 120px; background-color: var(--bg-interactive); color: var(--text-primary);";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => cleanup(false));
        btnContainer.appendChild(cancelBtn);
      }
    }

    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.offsetHeight;
    overlay.classList.remove("hidden");
    overlay.style.opacity = "1";
    box.style.transform = "scale(1)";
  });
}

export function showCustomPrompt(message, defaultValue = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "hidden";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: flex; justify-content: center;
      align-items: center; z-index: 9999; opacity: 0; transition: opacity 0.3s;
    `;

    // 2. Create Modal Box
    const box = document.createElement("div");
    box.className = "modal-box"; // Uses existing CSS
    box.style.cssText = `
      width: 400px; max-width: 90%; text-align: left;
      transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const title = document.createElement("p");
    title.style.cssText =
      "color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.8rem; font-weight: 500;";
    title.textContent = "Hello there, I'm YourDynamicDashboard";

    const text = document.createElement("p");
    text.style.cssText =
      "color: var(--text-primary); font-size: 1rem; margin-bottom: 1rem;";
    text.textContent = message;

    const input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue;
    input.style.cssText =
      "width: 100%; box-sizing: border-box; margin-bottom: 1.5rem; padding: 10px; border-radius: 8px; border: 1px solid var(--bg-interactive); background: var(--bg-secondary); color: var(--text-primary); outline: none; transition: border-color 0.3s;";
    input.onfocus = () =>
      (input.style.border = "1px solid var(--accent-color)");
    input.onblur = () =>
      (input.style.border = "1px solid var(--bg-interactive)");

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "display: flex; gap: 10px; justify-content: flex-end;";

    const okBtn = document.createElement("button");
    okBtn.className = "settings-button";
    okBtn.style.cssText = "width: auto; padding: 8px 24px;";
    okBtn.textContent = "OK";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "settings-button";
    cancelBtn.style.cssText =
      "width: auto; padding: 8px 24px; background-color: var(--bg-interactive); color: var(--text-primary);";
    cancelBtn.textContent = "Cancel";

    btnContainer.appendChild(okBtn);
    btnContainer.appendChild(cancelBtn);

    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(input);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.offsetHeight;
    overlay.classList.remove("hidden");
    overlay.style.opacity = "1";
    box.style.transform = "scale(1)";

    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    const cleanup = (result) => {
      overlay.style.opacity = "0";
      box.style.transform = "scale(0.9)";
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(result);
      }, 300);
    };

    okBtn.addEventListener("click", () => cleanup(input.value));
    cancelBtn.addEventListener("click", () => cleanup(null));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") cleanup(input.value);
      if (e.key === "Escape") cleanup(null);
    });
  });
}

import { state } from "./state.js";

export function completeDefaultTask(taskIdOrText) {
  if (!state.get("defaultTasksPinned")) return;

  const todos = state.get("todos") || [];
  const index = todos.findIndex(
    (t) => t.id === taskIdOrText || t.text === taskIdOrText,
  );
  if (index !== -1) {
    const taskToComplete = todos[index];
    todos.splice(index, 1);
    state.set("todos", todos);

    const completedIds = state.get("completedDefaultTaskIds") || [];
    const idStr = String(taskToComplete.id);
    if (!completedIds.includes(idStr)) {
      completedIds.push(idStr);
      state.set("completedDefaultTaskIds", completedIds);
    }

    progressDefaultTasks();
  }
}

export function progressDefaultTasks() {
  if (!state.get("defaultTasksPinned")) return;

  let todos = state.get("todos") || [];

  const defaultTaskSequence = ["dt-1", "dt-2", "dt-3", "dt-4", "dt-5"];

  const remainingDefaults = todos.filter(
    (t) => defaultTaskSequence.includes(String(t.id)) && !t.completed,
  );

  let completedDefaultsCount = 0;
  defaultTaskSequence.forEach((id) => {
    const task = todos.find((t) => String(t.id) === id);
    if (!task || task.completed) {
      completedDefaultsCount++;
    }
  });

  const pinnedDefaultsCount = remainingDefaults.filter((t) => t.pinned).length;

  if (pinnedDefaultsCount < 2 && remainingDefaults.length > 0) {
    let tasksToPin = 2 - pinnedDefaultsCount;
    for (const id of defaultTaskSequence) {
      if (tasksToPin <= 0) break;
      const taskIndex = todos.findIndex((t) => String(t.id) === id);
      if (
        taskIndex !== -1 &&
        !todos[taskIndex].completed &&
        !todos[taskIndex].pinned
      ) {
        todos[taskIndex].pinned = true;
        tasksToPin--;
      }
    }
    state.set("todos", todos);
  }

  const completedIds = state.get("completedDefaultTaskIds") || [];
  let validCompletions = completedIds.length;
  defaultTaskSequence.forEach((id) => {
    const task = todos.find((t) => String(t.id) === id);
    if (task && task.completed && !completedIds.includes(id)) {
      validCompletions++;
    }
  });

  const rewardShown = state.get("welcomeRewardShown");
  if (completedDefaultsCount === 5 && !rewardShown) {
    state.set("welcomeRewardShown", true);

    if (validCompletions >= 3) {
      setTimeout(() => {
        showCustomModal(
          "You have completed the Welcome Tasks. We are happy to see you are here. Feel free to give a review on Store after using YourDynamicDashboard.",
          false,
          false,
          null,
          true,
        );
      }, 500);
    }
  }
}

// src/utils.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
