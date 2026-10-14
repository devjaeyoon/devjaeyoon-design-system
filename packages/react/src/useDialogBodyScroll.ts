import { type RefObject, type UIEvent, useEffect } from "react";
import { keepDialogFocusVisible } from "./dialog-focus.js";

function updateScrollState(
  body: HTMLDivElement,
  dialog: HTMLDialogElement,
  tabIndex: number | undefined,
) {
  const { scrollTop, scrollHeight, clientHeight } = body;
  const scrolledStart = String(scrollTop > 1);
  const overflowEnd = String(scrollHeight - clientHeight - scrollTop > 1);
  if (dialog.dataset.scrolledStart !== scrolledStart) dialog.dataset.scrolledStart = scrolledStart;
  if (dialog.dataset.overflowEnd !== overflowEnd) dialog.dataset.overflowEnd = overflowEnd;
  if (tabIndex !== undefined) return;
  if (scrollHeight > clientHeight + 1) {
    if (body.getAttribute("tabindex") !== "0") body.tabIndex = 0;
  } else if (body.hasAttribute("tabindex")) body.removeAttribute("tabindex");
}

export function useDialogBodyScroll(
  bodyRef: RefObject<HTMLDivElement | null>,
  tabIndex: number | undefined,
) {
  useEffect(() => {
    const body = bodyRef.current;
    const dialog = body?.closest<HTMLDialogElement>(".djy-dialog");
    if (!body || !dialog) return;
    const view = body.ownerDocument.defaultView;
    const nodeFilter = view?.NodeFilter ?? globalThis.NodeFilter;

    const update = () => updateScrollState(body, dialog, tabIndex);
    update();
    const ResizeObserverConstructor = view?.ResizeObserver ?? globalThis.ResizeObserver;
    const observer = ResizeObserverConstructor
      ? new ResizeObserverConstructor((entries) => {
          update();
          // Header/footer reflow can shrink the body even when the viewport size is unchanged.
          if (entries.some((entry) => entry.target === body)) keepDialogFocusVisible(dialog);
        })
      : null;
    observer?.observe(body);
    const observedElements = new Set<Element>();
    const visitSubtree = (node: Node, visit: (element: Element) => void) => {
      if (node.nodeType !== node.ELEMENT_NODE) return;
      // Use the body's realm and skip a nested dialog's entire subtree.
      const walker = body.ownerDocument.createTreeWalker(node, nodeFilter.SHOW_ELEMENT, {
        acceptNode: (candidate) =>
          (candidate as Element).localName === "dialog"
            ? nodeFilter.FILTER_REJECT
            : nodeFilter.FILTER_ACCEPT,
      });
      const root = node as Element;
      if (root.localName === "dialog") return;
      visit(root);
      for (let descendant = walker.nextNode(); descendant; descendant = walker.nextNode()) {
        visit(descendant as Element);
      }
    };
    const observeElement = (element: Element) => {
      if (
        !body.contains(element) ||
        element.closest("dialog") !== dialog ||
        observedElements.has(element)
      ) {
        return;
      }
      observer?.observe(element, { box: "border-box" });
      observedElements.add(element);
    };
    const unobserveElement = (element: Element) => {
      if (!observedElements.delete(element)) return;
      observer?.unobserve(element);
    };
    for (const child of body.children) visitSubtree(child, observeElement);
    const MutationObserverConstructor = view?.MutationObserver ?? globalThis.MutationObserver;
    const mutationObserver = !MutationObserverConstructor
      ? null
      : new MutationObserverConstructor((records) => {
          // Automatic tabindex updates must not trigger another measurement cycle.
          if (
            records.every(
              (record) =>
                record.type === "attributes" &&
                record.target === body &&
                record.attributeName === "tabindex",
            )
          ) {
            return;
          }
          // Only changed subtrees need observation updates, including DOM moves.
          for (const record of records) {
            if (record.type !== "childList") continue;
            for (const node of record.removedNodes) visitSubtree(node, unobserveElement);
          }
          for (const record of records) {
            if (record.type !== "childList") continue;
            for (const node of record.addedNodes) visitSubtree(node, observeElement);
          }
          update();
        });
    mutationObserver?.observe(body, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
    });
    // Intrinsic image sizes can change scrollHeight without resizing a fixed wrapper
    // or mutating its DOM. Resource load/error events do not bubble, so use capture.
    body.addEventListener("load", update, true);
    body.addEventListener("error", update, true);
    view?.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      observedElements.clear();
      mutationObserver?.disconnect();
      body.removeEventListener("load", update, true);
      body.removeEventListener("error", update, true);
      view?.removeEventListener("resize", update);
      delete dialog.dataset.scrolledStart;
      delete dialog.dataset.overflowEnd;
    };
  }, [bodyRef, tabIndex]);

  return (event: UIEvent<HTMLDivElement>) => {
    const body = event.currentTarget;
    const dialog = body.closest<HTMLDialogElement>(".djy-dialog");
    if (dialog) updateScrollState(body, dialog, tabIndex);
  };
}
