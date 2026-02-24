import { state } from "../state.js";

export class TodoManager {
  constructor() {
    this.els = {
      btn: document.getElementById("todo-toggle-button"),
      popup: document.getElementById("todo-popup"),
      list: document.getElementById("todo-list"),
      form: document.getElementById("todo-add-form"),
      input: document.getElementById("todo-input"),
      pinnedWidget: document.getElementById("pinned-tasks-widget"),
      pinnedList: document.getElementById("pinned-tasks-list"),
    };

    if (!this.els.btn) return;

    this.init();
  }

  init() {
    this.render();

    this.els.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.add(this.els.input.value);
      this.els.input.value = "";
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
      if (key === "todos") this.render();
      if (key === "showTodo") this.updateVisibility();
    });

    this.updateVisibility();
  }

  toggle() {
    this.els.popup.classList.toggle("visible");
    this.els.btn.classList.toggle("is-open");
  }

  close() {
    this.els.popup.classList.remove("visible");
    this.els.btn.classList.remove("is-open");
  }

  add(text) {
    if (!text.trim()) return;
    if (text.trim().length > 50) {
      import("../utils.js").then(({ showCustomModal }) => {
        showCustomModal("Tasks cannot exceed 50 characters.");
      });
      return;
    }

    const todos = this.getNormalizedTodos();
    if (todos.length >= 20) {
      import("../utils.js").then(({ showCustomModal }) => {
        showCustomModal(
          "You can only have a maximum of 20 tasks. Please delete some before adding more.",
        );
      });
      return;
    }

    todos.push({
      id: Date.now(),
      text: text.trim(),
      completed: false,
      pinned: false,
    });
    state.set("todos", todos);
    this.render();
  }

  remove(index) {
    const todos = this.getNormalizedTodos();
    todos.splice(index, 1);
    state.set("todos", todos);
    this.render();
  }

  startNativeEdit(index, textElement, itemElement) {
    const todos = this.getNormalizedTodos();
    const currentText = todos[index].text;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.maxLength = 50;
    input.value = currentText;

    let saved = false;
    const saveEdit = () => {
      if (saved) return;
      saved = true;
      const newText = input.value.trim();
      if (newText !== "" && newText !== currentText) {
        if (newText.length > 50) {
          import("../utils.js").then(({ showCustomModal }) => {
            showCustomModal("Tasks cannot exceed 50 characters.");
          });
          this.render();
          return;
        }
        todos[index].text = newText;
        state.set("todos", todos);
      }
      this.render();
    };

    input.onblur = saveEdit;
    input.onkeydown = (e) => {
      if (e.key === "Enter") saveEdit();
      if (e.key === "Escape") this.render();
    };

    itemElement.replaceChild(input, textElement);
    input.focus();
  }

  toggleStatus(index) {
    const todos = this.getNormalizedTodos();
    todos[index].completed = !todos[index].completed;
    state.set("todos", todos);
    this.render();
  }

  togglePin(index) {
    const todos = this.getNormalizedTodos();

    if (!todos[index].pinned) {
      const pinnedCount = todos.filter((t) => t.pinned).length;
      if (pinnedCount >= 3) {
        import("../utils.js").then(({ showCustomModal }) => {
          showCustomModal(
            "You can only pin a maximum of 3 tasks to the dashboard.",
          );
        });
        return;
      }
    }

    todos[index].pinned = !todos[index].pinned;
    state.set("todos", todos);
    this.render();
  }

  getNormalizedTodos() {
    const rawTodos = state.get("todos") || [];
    return rawTodos.map((todo) => ({
      id: todo.id || Date.now() + Math.random(),
      text: todo.text || "",
      completed: !!todo.completed,
      pinned: !!todo.pinned,
    }));
  }

  render() {
    if (this.els.list) {
      this.els.list.innerHTML = "";
      const todos = this.getNormalizedTodos();

      todos.forEach((todo, index) => {
        const item = document.createElement("div");
        item.className = `todo-item ${todo.completed ? "completed" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = todo.completed;
        checkbox.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!todo.completed) {
            this.startNativeEdit(index, text, item);
          } else {
            this.toggleStatus(index);
          }
        };

        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;
        text.onclick = (e) => {
          e.stopPropagation();
          this.toggleStatus(index);
        };

        const pinBtn = document.createElement("button");
        pinBtn.className = `action-btn pin-btn ${todo.pinned ? "active" : ""}`;
        pinBtn.innerHTML = todo.pinned
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11.2V5h1V3H7v2h1v6.2l-2 3v2h5v6l1 1 1-1v-6h5v-2z"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 11.2V5h1V3H7v2h1v6.2l-2 3v2h5v6l1 1 1-1v-6h5v-2z"/></svg>';
        pinBtn.title = "Pin to Dashboard";
        pinBtn.onclick = (e) => {
          e.stopPropagation();
          this.togglePin(index);
        };

        const delBtn = document.createElement("button");
        delBtn.className = "action-btn delete-btn";
        delBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" fill="#EF4444"/><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9H20Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6H15.375M3 6H8.625M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6H15.375" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        delBtn.title = "Delete Task";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          this.remove(index);
        };

        item.draggable = true;
        item.ondragstart = (e) => {
          this.draggedIndex = index;
          item.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
        };
        item.ondragend = () => {
          item.classList.remove("dragging");
        };
        item.ondragover = (e) => {
          e.preventDefault();
          if (this.draggedIndex === index) return;
          item.classList.add("drag-over");
        };
        item.ondragleave = () => {
          item.classList.remove("drag-over");
        };
        item.ondrop = (e) => {
          e.preventDefault();
          item.classList.remove("drag-over");
          if (this.draggedIndex === null || this.draggedIndex === index) return;

          const todos = this.getNormalizedTodos();
          const draggedItem = todos.splice(this.draggedIndex, 1)[0];
          todos.splice(index, 0, draggedItem);
          state.set("todos", todos);
          this.draggedIndex = null;
          this.render();
        };

        item.appendChild(checkbox);
        item.appendChild(text);
        item.appendChild(pinBtn);
        item.appendChild(delBtn);
        this.els.list.appendChild(item);
      });
      if (todos.length > 1) {
        const footer = document.createElement("div");
        footer.className = "todo-footer";
        footer.innerHTML = "<span>Drag and drop to re-order tasks</span>";
        this.els.list.appendChild(footer);
      }
    }

    this.renderPinned();
  }

  renderPinned() {
    if (!this.els.pinnedWidget || !this.els.pinnedList) return;

    const todos = this.getNormalizedTodos();
    const pinnedTasks = todos.filter((t) => t.pinned && !t.completed);

    if (pinnedTasks.length === 0) {
      this.els.pinnedWidget.classList.add("hidden");
    } else {
      this.els.pinnedWidget.classList.remove("hidden");
      this.els.pinnedList.innerHTML = "";

      pinnedTasks.forEach((todo) => {
        const li = document.createElement("li");
        li.className = "pinned-task-item";

        const dot = document.createElement("span");
        dot.className = "pinned-task-dot";

        const txt = document.createElement("span");
        txt.className = "pinned-task-text";
        txt.textContent = todo.text;

        li.appendChild(dot);
        li.appendChild(txt);
        this.els.pinnedList.appendChild(li);
      });
    }
  }

  updateVisibility() {
    const show = state.get("showTodo");
    this.els.btn.classList.toggle("hidden", !show);
  }
}

// src/modules/todo.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
