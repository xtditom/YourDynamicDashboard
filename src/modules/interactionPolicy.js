const INSTALLED_POLICIES = new WeakMap();

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isElement(value) {
  return value?.nodeType === 1;
}

function getEventPath(event) {
  if (typeof event.composedPath === "function") {
    return event.composedPath();
  }

  const path = [];
  let current = event.target;
  while (current) {
    path.push(current);
    current = current.parentNode || current.host || null;
  }
  return path;
}

function isNativeTextEditor(element) {
  if (!isElement(element)) return false;

  const tagName = element.localName;
  if (tagName === "textarea") return true;

  if (tagName === "input") {
    const type = String(element.getAttribute("type") || "text").toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }

  if (element.isContentEditable) return true;
  return element.getAttribute("role")?.toLowerCase() === "textbox";
}

/**
 * Resolves whether selection/copy/cut should be allowed for an event path.
 * Explicit deny wins globally, followed by explicit allow and native editors.
 */
export function isTextInteractionAllowed(path) {
  const elements = path.filter(isElement);

  if (
    elements.some(
      (element) => element.getAttribute("data-ydd-selection") === "deny",
    )
  ) {
    return false;
  }

  if (
    elements.some(
      (element) => element.getAttribute("data-ydd-selection") === "allow",
    )
  ) {
    return true;
  }

  return elements.some(isNativeTextEditor);
}

function isIntentionalDrag(path) {
  return path.some((item) => {
    if (!isElement(item)) return false;
    if (item.getAttribute("data-ydd-drag") === "allow") return true;
    return item.getAttribute("draggable")?.toLowerCase() === "true";
  });
}

function blockEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

/**
 * Installs the dashboard's delegated interaction policy exactly once per root.
 * The returned controller can remove every listener through destroy().
 */
export function installInteractionPolicy(root = document) {
  const existing = INSTALLED_POLICIES.get(root);
  if (existing) return existing;

  const abortController = new AbortController();
  const listenerOptions = {
    capture: true,
    signal: abortController.signal,
  };

  const handleTextInteraction = (event) => {
    if (!isTextInteractionAllowed(getEventPath(event))) blockEvent(event);
  };

  const handleDragStart = (event) => {
    const path = getEventPath(event);
    if (isTextInteractionAllowed(path) || isIntentionalDrag(path)) return;
    blockEvent(event);
  };

  root.addEventListener("selectstart", handleTextInteraction, listenerOptions);
  root.addEventListener("copy", handleTextInteraction, listenerOptions);
  root.addEventListener("cut", handleTextInteraction, listenerOptions);
  root.addEventListener("dragstart", handleDragStart, listenerOptions);

  const controller = {
    destroy() {
      if (INSTALLED_POLICIES.get(root) !== controller) return;
      abortController.abort();
      INSTALLED_POLICIES.delete(root);
    },
  };

  INSTALLED_POLICIES.set(root, controller);
  return controller;
}

// [src/modules/interactionPolicy.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
