import { getMeaningfulActiveElement, keepDialogFocusVisible } from "./dialog-focus.js";

export type DialogSession = {
  id: number;
  dialog: HTMLDialogElement;
  opener: HTMLElement | null;
  trigger: HTMLButtonElement | null;
  nativeInitialFocus: HTMLElement | null;
  lastFocusedElement: HTMLElement | null;
  initialFocusFrame: number | null;
  cleanupViewport: () => void;
  unlockScroll: () => void;
  closeForReorder: () => void;
  onOpeningCanceled: () => void;
  state: "active" | "suspended" | "finalized";
  suspendedFocus: HTMLElement | null;
};

const overflowProperties = new Set([
  "overflow",
  "overflow-x",
  "overflow-y",
  "overflow-block",
  "overflow-inline",
]);

type OverflowStyle = Array<{ property: string; value: string; priority: string }>;

type ScrollLockState = {
  count: number;
  documentOverflow: OverflowStyle;
  bodyOverflow: OverflowStyle;
};

const dialogStacks = new WeakMap<Document, DialogSession[]>();
const scrollLocks = new WeakMap<Document, ScrollLockState>();
let nextDialogSessionId = 0;

function getDialogStack(document: Document) {
  let stack = dialogStacks.get(document);
  if (!stack) {
    stack = [];
    dialogStacks.set(document, stack);
  }
  return stack;
}

function removeDialogSession(session: DialogSession) {
  const document = session.dialog.ownerDocument;
  const stack = dialogStacks.get(document);
  if (!stack) return;
  const index = stack.indexOf(session);
  if (index >= 0) stack.splice(index, 1);
  if (stack.length === 0) dialogStacks.delete(document);
}

export function getTopDialogSession(document: Document) {
  const stack = dialogStacks.get(document);
  return stack?.[stack.length - 1] ?? null;
}

export function createDialogSession(
  dialog: HTMLDialogElement,
  trigger: HTMLButtonElement | null,
  closeForReorder: () => void,
  onOpeningCanceled: () => void,
): DialogSession {
  return {
    id: ++nextDialogSessionId,
    dialog,
    opener: getMeaningfulActiveElement(dialog.ownerDocument),
    trigger,
    nativeInitialFocus: null,
    lastFocusedElement: null,
    initialFocusFrame: null,
    cleanupViewport: () => {},
    unlockScroll: () => {},
    closeForReorder,
    onOpeningCanceled,
    state: "active",
    suspendedFocus: null,
  };
}

export function getDialogSessions(document: Document): readonly DialogSession[] {
  return [...(dialogStacks.get(document) ?? [])];
}

export function reopenDialogSession(session: DialogSession) {
  const document = session.dialog.ownerDocument;
  const stack = getDialogSessions(document);
  const index = stack.indexOf(session);
  const above =
    index < 0
      ? []
      : stack
          .slice(index + 1)
          .filter((candidate) => candidate.state === "active" && candidate.dialog.open);
  const top = above[above.length - 1] ?? session;
  // showModal() adds a dialog at the top, so temporarily remove higher modals first.
  // Keep their logical sessions, React content, callbacks, and document resources intact.
  const focus = getMeaningfulActiveElement(document, top.dialog) ?? top.lastFocusedElement;
  if (!session.dialog.open) {
    for (const candidate of [...above].reverse()) candidate.closeForReorder();
    const canceled: HTMLDialogElement[] = [];
    for (const candidate of [session, ...above]) {
      if (!canceled.some((ancestor) => ancestor.contains(candidate.dialog))) {
        candidate.dialog.showModal();
        if (candidate.dialog.matches(":modal")) continue;
      }
      // A canceled ancestor cannot host an interactive modal. Finish its dependent
      // sessions too, while independent higher dialogs may still be restored.
      canceled.push(candidate.dialog);
      candidate.onOpeningCanceled();
    }
  }
  const restoredTop = getTopDialogSession(document);
  if (!restoredTop?.dialog.matches(":modal")) return null;
  return { dialog: restoredTop.dialog, focus };
}

export function activateDialogSession(session: DialogSession) {
  const { dialog } = session;
  const document = dialog.ownerDocument;
  const view = document.defaultView;
  getDialogStack(document).push(session);
  session.unlockScroll = lockBackgroundScroll(document);

  let visibilityFrame: number | null = null;
  const updateViewport = () => {
    const viewport = view?.visualViewport;
    dialog.style.setProperty(
      "--djy-dialog-viewport-height",
      `${viewport?.height ?? view?.innerHeight ?? 0}px`,
    );
    dialog.style.setProperty("--djy-dialog-viewport-offset", `${viewport?.offsetTop ?? 0}px`);
    if (!view) return;
    if (visibilityFrame !== null) view.cancelAnimationFrame(visibilityFrame);
    // Measure after the new viewport variables have changed the body and surface layout.
    visibilityFrame = view.requestAnimationFrame(() => {
      visibilityFrame = null;
      if (session.state === "active" && getTopDialogSession(document) === session) {
        keepDialogFocusVisible(dialog);
      }
    });
  };
  updateViewport();
  view?.visualViewport?.addEventListener("resize", updateViewport);
  view?.visualViewport?.addEventListener("scroll", updateViewport);
  view?.addEventListener("resize", updateViewport);
  session.cleanupViewport = () => {
    view?.visualViewport?.removeEventListener("resize", updateViewport);
    view?.visualViewport?.removeEventListener("scroll", updateViewport);
    view?.removeEventListener("resize", updateViewport);
    if (visibilityFrame !== null) view?.cancelAnimationFrame(visibilityFrame);
  };
}

export function deactivateDialogSession(session: DialogSession) {
  if (session.initialFocusFrame !== null) {
    session.dialog.ownerDocument.defaultView?.cancelAnimationFrame(session.initialFocusFrame);
    session.initialFocusFrame = null;
  }
  session.cleanupViewport();
  session.cleanupViewport = () => {};
  session.unlockScroll();
  session.unlockScroll = () => {};
  removeDialogSession(session);
}

function captureOverflow(element: HTMLElement) {
  const saved: OverflowStyle = [];
  const shorthand = element.style.getPropertyValue("overflow");
  let capturedShorthand = false;
  for (const property of Array.from(element.style)) {
    if (!overflowProperties.has(property)) continue;
    const value = element.style.getPropertyValue(property);
    // A var() shorthand exposes empty longhands, but its expression is available
    // as long as both axes remain part of that shorthand.
    if (!value && shorthand && (property === "overflow-x" || property === "overflow-y")) {
      if (!capturedShorthand) {
        saved.push({
          property: "overflow",
          value: shorthand,
          priority: element.style.getPropertyPriority("overflow"),
        });
        capturedShorthand = true;
      }
      continue;
    }
    // After an axis override, CSSOM can lose the shorthand expression entirely.
    // Preserve that pending axis's effective value and priority instead of losing it.
    const restoredValue =
      value ||
      element.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue(property);
    if (restoredValue)
      saved.push({
        property,
        value: restoredValue,
        priority: element.style.getPropertyPriority(property),
      });
  }
  return saved;
}

function clearOverflow(style: CSSStyleDeclaration) {
  for (const property of overflowProperties) style.removeProperty(property);
}

function restoreOverflow(style: CSSStyleDeclaration, saved: OverflowStyle) {
  clearOverflow(style);
  // Restore only these properties: round-tripping cssText can also erase unrelated
  // pending shorthands, and replacing an old style would discard current updates.
  for (const { property, value, priority } of saved) style.setProperty(property, value, priority);
}

function lockBackgroundScroll(document: Document) {
  let state = scrollLocks.get(document);
  if (!state) {
    state = {
      count: 0,
      documentOverflow: captureOverflow(document.documentElement),
      bodyOverflow: captureOverflow(document.body),
    };
    scrollLocks.set(document, state);
    clearOverflow(document.documentElement.style);
    clearOverflow(document.body.style);
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.body.style.setProperty("overflow", "hidden", "important");
  }
  state.count += 1;

  return () => {
    const current = scrollLocks.get(document);
    if (!current) return;
    current.count = Math.max(0, current.count - 1);
    if (current.count === 0) {
      restoreOverflow(document.documentElement.style, current.documentOverflow);
      restoreOverflow(document.body.style, current.bodyOverflow);
      scrollLocks.delete(document);
    }
  };
}
