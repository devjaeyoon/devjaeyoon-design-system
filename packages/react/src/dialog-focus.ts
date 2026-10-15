export function getActiveElement(document: Document): HTMLElement | null {
  const element = document.activeElement;
  return element && "focus" in element ? (element as HTMLElement) : null;
}

export function canFocus(
  element: HTMLElement | null | undefined,
  document: Document,
  scope?: HTMLElement,
): element is HTMLElement {
  if (
    !element?.isConnected ||
    element.ownerDocument !== document ||
    (scope && !scope.contains(element)) ||
    element.matches(":disabled") ||
    element.hasAttribute("disabled")
  ) {
    return false;
  }

  const view = document.defaultView;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (
      current.hidden ||
      current.hasAttribute("inert") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }
    if (view) {
      const style = view.getComputedStyle(current);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse"
      ) {
        return false;
      }
    }
  }
  return true;
}

export function focusFirstValid(
  candidates: Array<HTMLElement | null | undefined>,
  document: Document,
  scope?: HTMLElement,
  options: FocusOptions = { preventScroll: true },
) {
  for (const candidate of candidates) {
    if (!canFocus(candidate, document, scope)) continue;
    candidate.focus(options);
    if (document.activeElement === candidate) return true;
  }
  return false;
}

export function getMeaningfulActiveElement(document: Document, scope?: HTMLElement) {
  const activeElement = getActiveElement(document);
  if (
    activeElement === document.body ||
    activeElement === document.documentElement ||
    !canFocus(activeElement, document, scope)
  ) {
    return null;
  }
  return activeElement;
}

function getScrollDelta(start: number, end: number, visibleStart: number, visibleEnd: number) {
  if (start < visibleStart) return start - visibleStart;
  if (end > visibleEnd) return Math.min(end - visibleEnd, start - visibleStart);
  return 0;
}

export function keepDialogFocusVisible(dialog: HTMLDialogElement) {
  const focus = getMeaningfulActiveElement(dialog.ownerDocument, dialog);
  const view = dialog.ownerDocument.defaultView;
  if (!focus || !view || !dialog.matches(":modal") || focus.closest("dialog") !== dialog) return;

  // Scroll only ancestors inside the modal; scrolling the document would move the background.
  for (
    let container = focus.parentElement;
    container && container !== dialog;
    container = container.parentElement
  ) {
    const style = view.getComputedStyle(container);
    const bounds = container.getBoundingClientRect();
    const target = focus.getBoundingClientRect();
    const top = bounds.top + container.clientTop;
    const left = bounds.left + container.clientLeft;
    const deltaY = /^(auto|scroll)$/u.test(style.overflowY)
      ? getScrollDelta(target.top, target.bottom, top, top + container.clientHeight)
      : 0;
    const deltaX = /^(auto|scroll)$/u.test(style.overflowX)
      ? getScrollDelta(target.left, target.right, left, left + container.clientWidth)
      : 0;
    if (deltaX || deltaY) {
      container.scrollTo({
        top: container.scrollTop + deltaY,
        left: container.scrollLeft + deltaX,
        behavior: "instant",
      });
    }
  }
}
