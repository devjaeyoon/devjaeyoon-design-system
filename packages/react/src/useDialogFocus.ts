import { type RefObject, useCallback, useEffect, useRef } from "react";
import {
  canFocus,
  focusFirstValid,
  getActiveElement,
  getMeaningfulActiveElement,
} from "./dialog-focus.js";
import { type DialogSession, getDialogSessions, getTopDialogSession } from "./dialog-session.js";

type DialogFocusOptions = {
  context: { triggerRefs: RefObject<Set<HTMLButtonElement>> };
  initialFocusRef: RefObject<HTMLElement | null> | undefined;
  returnFocusRef: RefObject<HTMLElement | null> | undefined;
  onCloseAutoFocus: ((event: Event) => void) | undefined;
};

function restoreDialogFocus(
  session: DialogSession,
  remainingSessions: readonly DialogSession[],
  focusBeforeRestore: HTMLElement | null,
  candidates: Array<HTMLElement | null | undefined>,
) {
  const document = session.dialog.ownerDocument;
  const currentTopSession = getTopDialogSession(document);
  // Existing children may finish closing before this frame; a newly opened modal takes priority.
  if (currentTopSession && !remainingSessions.includes(currentTopSession)) return;

  const currentFocus = getActiveElement(document);
  if (
    currentFocus !== focusBeforeRestore &&
    getMeaningfulActiveElement(document) === currentFocus
  ) {
    return;
  }
  focusFirstValid(candidates, document, currentTopSession?.dialog);
}

export function useDialogFocus({
  open,
  contentSessionId,
  sessionRef,
  optionsRef,
}: {
  open: boolean;
  contentSessionId: number | null;
  sessionRef: RefObject<DialogSession | null>;
  optionsRef: RefObject<DialogFocusOptions>;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pendingReturnFocusRef = useRef<{
    document: Document;
    frame: number;
    sessionId: number;
  } | null>(null);
  const cancelPendingReturnFocus = useCallback(() => {
    const pending = pendingReturnFocusRef.current;
    if (!pending) return;
    pending.document.defaultView?.cancelAnimationFrame(pending.frame);
    pendingReturnFocusRef.current = null;
  }, []);

  const restoreSessionFocus = useCallback(
    (session: DialogSession) => {
      const document = session.dialog.ownerDocument;
      const view = document.defaultView;
      const focusAfterNativeClose = getActiveElement(document);
      const EventConstructor = view?.Event ?? Event;
      const closeAutoFocusEvent = new EventConstructor("djy.dialog.closeAutoFocus", {
        cancelable: true,
      });
      optionsRef.current.onCloseAutoFocus?.(closeAutoFocusEvent);
      if (closeAutoFocusEvent.defaultPrevented) return;

      const focusAfterCallback = getActiveElement(document);
      if (
        focusAfterCallback !== focusAfterNativeClose &&
        getMeaningfulActiveElement(document) === focusAfterCallback
      ) {
        return;
      }

      const remainingSessions = getDialogSessions(document);
      const restoreFocus = () => {
        if (sessionRef.current && sessionRef.current.state !== "finalized") return;
        restoreDialogFocus(session, remainingSessions, focusAfterCallback, [
          optionsRef.current.returnFocusRef?.current,
          session.trigger,
          ...[...optionsRef.current.context.triggerRefs.current].reverse(),
          session.opener,
        ]);
      };

      if (!view) {
        restoreFocus();
        return;
      }

      cancelPendingReturnFocus();
      // Wait for native focus restoration and nested cleanup to finish. The frame
      // must still yield to a newer session or focus moved by the application.
      const frame = view.requestAnimationFrame(() => {
        const pending = pendingReturnFocusRef.current;
        if (!pending || pending.sessionId !== session.id) return;
        pendingReturnFocusRef.current = null;

        restoreFocus();
      });
      pendingReturnFocusRef.current = { document, frame, sessionId: session.id };
    },
    [cancelPendingReturnFocus, optionsRef, sessionRef],
  );

  useEffect(() => {
    const session = sessionRef.current;
    if (!open || !session || contentSessionId !== session.id) return;
    const { dialog } = session;
    const document = dialog.ownerDocument;
    const view = document.defaultView;
    const focusInitialTarget = () => {
      session.initialFocusFrame = null;
      if (dialog.hasAttribute("data-debug-autofocus")) {
        console.info("Dialog initial focus frame", {
          session: session.id,
          state: session.state,
          open: dialog.open,
          current: sessionRef.current?.id,
          top: getTopDialogSession(document)?.id,
          initial: optionsRef.current.initialFocusRef?.current?.id,
          active: document.activeElement?.id,
        });
      }
      if (
        session.state !== "active" ||
        sessionRef.current !== session ||
        !dialog.open ||
        getTopDialogSession(document)?.id !== session.id
      ) {
        return;
      }
      const autofocusTarget = Array.from(dialog.querySelectorAll<HTMLElement>("[autofocus]")).find(
        (element) => canFocus(element, document, dialog),
      );
      const mountedFocus = getMeaningfulActiveElement(document, dialog);
      focusFirstValid(
        [
          optionsRef.current.initialFocusRef?.current,
          autofocusTarget,
          mountedFocus !== session.nativeInitialFocus ? mountedFocus : null,
          titleRef.current,
        ],
        document,
        dialog,
        { preventScroll: false },
      );
    };

    if (view) session.initialFocusFrame = view.requestAnimationFrame(focusInitialTarget);
    else focusInitialTarget();
  }, [contentSessionId, open, optionsRef, sessionRef]);

  return { titleRef, cancelPendingReturnFocus, restoreSessionFocus };
}
