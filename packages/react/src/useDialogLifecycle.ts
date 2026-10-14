import {
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  createDialogCloseState,
  type DialogCloseState,
  expireDialogCancel,
  hasDialogCloseRequest,
  markDialogCancelRequestSent,
  markNativeDialogCloseRequested,
  planDialogCancel,
} from "./dialog-close.js";
import { focusFirstValid, getActiveElement, getMeaningfulActiveElement } from "./dialog-focus.js";
import {
  activateDialogSession,
  createDialogSession,
  type DialogSession,
  deactivateDialogSession,
  reopenDialogSession,
} from "./dialog-session.js";
import { useDialogFocus } from "./useDialogFocus.js";

type DialogLifecycleOptions = {
  context: {
    open: boolean;
    closeOnEscape: boolean;
    requestOpenChange: (open: boolean) => void;
    triggerRefs: RefObject<Set<HTMLButtonElement>>;
    pendingOpeningTriggerRef: RefObject<HTMLButtonElement | null>;
  };
  openParentSession: (() => boolean) | null;
  initialFocusRef: RefObject<HTMLElement | null> | undefined;
  returnFocusRef: RefObject<HTMLElement | null> | undefined;
  onCloseAutoFocus: ((event: Event) => void) | undefined;
  onCancel: ComponentPropsWithRef<"dialog">["onCancel"];
  onClose: ComponentPropsWithRef<"dialog">["onClose"];
  onFocusCapture: ComponentPropsWithRef<"dialog">["onFocusCapture"];
  onKeyDown: ComponentPropsWithRef<"dialog">["onKeyDown"];
  onSuspend: () => void;
};

type InternalCloseReason = "finalize" | "suspend" | "reorder";

type NativeCloseRequest = {
  session: DialogSession;
  cancelState: DialogCloseState;
  token: symbol;
  sent: boolean;
};

export function useDialogLifecycle(options: DialogLifecycleOptions) {
  const { context, openParentSession, onCancel, onClose, onFocusCapture, onKeyDown } = options;
  const [contentSessionId, setContentSessionId] = useState<number | null>(null);
  const [committedRequestToken, setCommittedRequestToken] = useState<symbol | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sessionRef = useRef<DialogSession | null>(null);
  const internalCloseEventsRef = useRef<InternalCloseReason[]>([]);
  const closeStateRef = useRef<DialogCloseState>(createDialogCloseState());
  const nativeRequestRef = useRef<NativeCloseRequest | null>(null);
  const visibleRef = useRef(true);
  const mountedStateRef = useRef({ generation: 0, mounted: false });
  const openingCanceledRef = useRef(false);
  const escapeKeyRef = useRef<globalThis.KeyboardEvent | null>(null);
  const latestRef = useRef(options);
  // Suspended or abandoned renders must not change native-event decisions.
  useLayoutEffect(() => {
    latestRef.current = options;
  });

  const { titleRef, cancelPendingReturnFocus, restoreSessionFocus } = useDialogFocus({
    open: context.open,
    contentSessionId,
    sessionRef,
    optionsRef: latestRef,
  });

  const closeNativeDialog = useCallback(
    (dialog: HTMLDialogElement, reason: InternalCloseReason) => {
      if (!dialog.open) return;
      // close events are queued by the browser. Record the reason before closing;
      // keep it until the matching event arrives, even across session changes.
      internalCloseEventsRef.current.push(reason);
      dialog.close();
    },
    [],
  );

  const finalizeSession = useCallback(
    (session: DialogSession) => {
      if (session.state === "finalized") return;
      session.state = "finalized";
      closeStateRef.current = createDialogCloseState();
      nativeRequestRef.current = null;

      deactivateDialogSession(session);
      if (sessionRef.current === session) sessionRef.current = null;

      closeNativeDialog(session.dialog, "finalize");

      restoreSessionFocus(session);
    },
    [closeNativeDialog, restoreSessionFocus],
  );

  const requestNativeClose = useCallback((session: DialogSession, state: DialogCloseState) => {
    if (
      sessionRef.current !== session ||
      session.state === "finalized" ||
      closeStateRef.current !== state ||
      hasDialogCloseRequest(state)
    ) {
      return state;
    }
    const nextState =
      state.phase === "cancel-pending" && state.request === "pending"
        ? markDialogCancelRequestSent(state)
        : markNativeDialogCloseRequested(state);
    closeStateRef.current = nextState;
    const pendingRequest = nativeRequestRef.current;
    const request =
      pendingRequest?.session === session && pendingRequest.cancelState === state
        ? pendingRequest
        : null;
    if (request) request.sent = true;
    latestRef.current.context.requestOpenChange(false);
    // Even a rejecting owner needs a commit before reveal can restore its modal.
    // Keep the token in the opener's closure so child layout effects see that commit.
    if (request && nativeRequestRef.current === request && sessionRef.current === session) {
      setCommittedRequestToken(request.token);
    }
    return nextState;
  }, []);

  const openSession = useCallback(() => {
    // Descendant layout effects may open ancestors before their option refs update.
    // This callback belongs to the committed tree, so use its own open value.
    if (!context.open || openingCanceledRef.current) return false;
    const previousSession = sessionRef.current;
    if (previousSession?.state === "active") return true;
    if (previousSession?.state === "suspended") {
      if (!visibleRef.current) return false;
      const request = nativeRequestRef.current;
      if (
        request?.session === previousSession &&
        (!request.sent || committedRequestToken !== request.token)
      ) {
        return false;
      }
    }
    // On Suspense reveal, the visibility sibling runs before host refs reconnect.
    const dialog = dialogRef.current ?? previousSession?.dialog;
    if (!dialog) return false;

    // Child effects run first, so open ancestors before adding this dialog to the top layer.
    if (openParentSession && !openParentSession()) return false;

    const previousCloseState = closeStateRef.current;
    if (!previousSession) closeStateRef.current = createDialogCloseState();
    cancelPendingReturnFocus();
    const document = dialog.ownerDocument;
    const session: DialogSession =
      previousSession ??
      createDialogSession(
        dialog,
        context.pendingOpeningTriggerRef.current,
        () => closeNativeDialog(dialog, "reorder"),
        () => {
          openingCanceledRef.current = true;
          const alreadyRequested = hasDialogCloseRequest(closeStateRef.current);
          finalizeSession(session);
          if (!alreadyRequested) latestRef.current.context.requestOpenChange(false);
        },
      );
    // A new opening consumes its trigger before native callbacks can create another
    // request. Restoring the same session keeps its trigger, even after suspension.
    if (!previousSession) context.pendingOpeningTriggerRef.current = null;
    sessionRef.current = session;

    try {
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      sessionRef.current = previousSession;
      throw error;
    }
    // beforetoggle can cancel showModal() without throwing. A failed first opening
    // has no session to finalize; a canceled reveal retains its suspended session.
    if (!dialog.open || !dialog.matches(":modal")) {
      sessionRef.current = previousSession;
      openingCanceledRef.current = true;
      if (!hasDialogCloseRequest(previousCloseState)) context.requestOpenChange(false);
      return false;
    }
    session.state = "active";
    closeStateRef.current = createDialogCloseState();
    nativeRequestRef.current = null;
    session.nativeInitialFocus = getActiveElement(document);
    setContentSessionId(session.id);

    activateDialogSession(session);
    return true;
  }, [
    cancelPendingReturnFocus,
    closeNativeDialog,
    committedRequestToken,
    context.pendingOpeningTriggerRef,
    context.open,
    context.requestOpenChange,
    finalizeSession,
    openParentSession,
  ]);

  const suspendSession = useCallback(() => {
    const session = sessionRef.current;
    const focus =
      session?.state === "active"
        ? getMeaningfulActiveElement(session.dialog.ownerDocument, session.dialog)
        : null;
    return () => {
      visibleRef.current = false;
      if (session?.state !== "active") return;
      const wasNativeClosed = !session.dialog.open;
      const closeState = closeStateRef.current;
      session.state = "suspended";
      session.suspendedFocus = focus ?? (wasNativeClosed ? session.lastFocusedElement : null);
      latestRef.current.onSuspend();
      deactivateDialogSession(session);
      closeNativeDialog(session.dialog, "suspend");

      // A direct close()/form submission has no cancel plan. Its queued close event
      // may see a suspended or already revealed modal, so notify for this session
      // now, after the native result is available. Cancel plans keep their own path.
      if (
        wasNativeClosed &&
        closeState.phase === "idle" &&
        sessionRef.current === session &&
        latestRef.current.context.open
      ) {
        requestNativeClose(session, closeState);
      }
    };
  }, [closeNativeDialog, requestNativeClose]);

  const resumeSession = useCallback(() => {
    visibleRef.current = true;
    const session = sessionRef.current;
    if (session?.state !== "suspended") return;
    if (!openSession() || sessionRef.current?.state !== "active") return;
    focusFirstValid(
      [session.suspendedFocus, session.dialog.querySelector<HTMLElement>(".djy-dialog__title")],
      session.dialog.ownerDocument,
      session.dialog,
      { preventScroll: false },
    );
    session.suspendedFocus = null;
  }, [openSession]);

  useEffect(() => {
    const mountedState = mountedStateRef.current;
    mountedState.mounted = true;
    mountedState.generation += 1;

    return () => {
      mountedState.mounted = false;
      const cleanupGeneration = ++mountedState.generation;
      // StrictMode reconnects within this turn. A real unmount must finish the
      // session once, after layout cleanup has captured any suspended focus.
      queueMicrotask(() => {
        if (mountedState.mounted || mountedState.generation !== cleanupGeneration) return;
        const session = sessionRef.current;
        if (session) finalizeSession(session);
      });
    };
  }, [finalizeSession]);

  useEffect(() => {
    if (context.open) openSession();
    else {
      openingCanceledRef.current = false;
      setContentSessionId(null);
      const session = sessionRef.current;
      if (session) finalizeSession(session);
    }
  }, [context.open, finalizeSession, openSession]);

  const handleFocusCapture = (event: FocusEvent<HTMLDialogElement>) => {
    const session = sessionRef.current;
    if (session?.state === "active") {
      const focus = getMeaningfulActiveElement(session.dialog.ownerDocument, session.dialog);
      if (focus) session.lastFocusedElement = focus;
    }
    onFocusCapture?.(event);
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const session = sessionRef.current;
    onCancel?.(event);
    const fromEscape = escapeKeyRef.current !== null;
    escapeKeyRef.current = null;
    const { state: cancelState, nativeAction } = planDialogCancel(closeStateRef.current, {
      source: fromEscape ? "escape" : "native",
      trusted: event.isTrusted,
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      closeOnEscape: context.closeOnEscape,
      focus: getMeaningfulActiveElement(event.currentTarget.ownerDocument, event.currentTarget),
    });
    closeStateRef.current = cancelState;
    if (cancelState.request === "pending" && session && sessionRef.current === session) {
      nativeRequestRef.current = {
        session,
        cancelState,
        token: Symbol("dialog native close"),
        sent: false,
      };
    } else nativeRequestRef.current = null;
    // Store the plan before requesting the owner so a queued native close can reuse it.
    // Explicit native requests notify from close, after returnValue has been recorded.
    if (nativeAction === "prevent") event.preventDefault();
    if (hasDialogCloseRequest(cancelState)) context.requestOpenChange(false);
    const dialog = event.currentTarget;
    dialog.ownerDocument.defaultView?.setTimeout(() => {
      if (closeStateRef.current !== cancelState || sessionRef.current !== session || !session)
        return;
      // A close event may arrive while Suspense has suspended the session. Deliver
      // any remaining request after native default actions, before expiring it.
      // Microtasks can run before those actions and preempt requestClose's result.
      let settledState = cancelState;
      if (
        cancelState.request === "pending" &&
        (dialog.open || sessionRef.current?.state === "suspended")
      ) {
        const sentState = requestNativeClose(session, cancelState);
        if (sentState.phase === "cancel-pending") settledState = sentState;
      }
      // An active session with a closed native dialog still has its close event
      // queued. Let that event request once, after the owner can accept the close.
      if (closeStateRef.current === settledState && dialog.open) {
        closeStateRef.current = expireDialogCancel(settledState);
      }
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Run the consumer first: requestClose(result) inside its key handler remains
    // an explicit native request, even when that handler was triggered by Escape.
    onKeyDown?.(event);
    const target = event.target;
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      !("closest" in target) ||
      typeof target.closest !== "function" ||
      target.closest("dialog") !== event.currentTarget
    ) {
      return;
    }
    const key = event.nativeEvent;
    escapeKeyRef.current = key;
    event.currentTarget.ownerDocument.defaultView?.setTimeout(() => {
      if (escapeKeyRef.current === key) escapeKeyRef.current = null;
    }, 0);
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const internalClose = internalCloseEventsRef.current.shift();
    if (internalClose === "suspend" || internalClose === "reorder") return;
    const session = sessionRef.current;
    const wasReopened = event.currentTarget.open;
    onClose?.(event);
    if (internalClose) return;
    // Native close events are queued. Neither an earlier event nor its callback may
    // close a session that has since reopened.
    if (
      wasReopened ||
      sessionRef.current !== session ||
      !session ||
      session.state === "finalized"
    ) {
      return;
    }
    if (session.state === "suspended") {
      const request = nativeRequestRef.current;
      if (request?.session === session && !request.sent && latestRef.current.context.open) {
        requestNativeClose(session, request.cancelState);
      }
      return;
    }
    const closeState = closeStateRef.current;
    if (
      closeState.phase === "cancel-pending" &&
      closeState.recovery === "reopen" &&
      closeState.request !== "pending" &&
      latestRef.current.context.open
    ) {
      // Native closing may finish before the owner accepts the cancel request.
      // Keep the logical session (scroll lock, stack, and opener) until open becomes false.
      const reopened = reopenDialogSession(session);
      if (!reopened) return;
      closeStateRef.current = createDialogCloseState();
      nativeRequestRef.current = null;
      focusFirstValid(
        [
          reopened.focus,
          closeState.focus,
          titleRef.current,
          reopened.dialog.querySelector<HTMLElement>(".djy-dialog__title"),
        ],
        session.dialog.ownerDocument,
        reopened.dialog,
      );
      return;
    }
    if (latestRef.current.context.open) {
      requestNativeClose(session, closeStateRef.current);
    }
    // Let the owner's state update commit before deciding whether the close was accepted.
    // A rejected native close keeps its logical session, draft, and scroll lock.
    const previousFocus = session.lastFocusedElement;
    queueMicrotask(() => {
      if (sessionRef.current !== session || session.state !== "active") return;
      if (!latestRef.current.context.open) {
        finalizeSession(session);
        return;
      }
      const reopened = reopenDialogSession(session);
      if (!reopened) return;
      closeStateRef.current = createDialogCloseState();
      nativeRequestRef.current = null;
      focusFirstValid(
        [
          reopened.focus,
          previousFocus,
          titleRef.current,
          reopened.dialog.querySelector<HTMLElement>(".djy-dialog__title"),
        ],
        session.dialog.ownerDocument,
        reopened.dialog,
      );
    });
  };

  return {
    dialogRef,
    titleRef,
    contentSessionId,
    openSession,
    suspendSession,
    resumeSession,
    handleFocusCapture,
    handleKeyDown,
    handleCancel,
    handleClose,
  };
}
