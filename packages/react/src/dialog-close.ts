type DialogCancelDecision = "allowed" | "blocked";

type DialogCancelState = Readonly<{
  phase: "cancel-pending";
  decision: DialogCancelDecision;
  request: "none" | "pending" | "sent";
  recovery: "none" | "reopen";
  focus: HTMLElement | null;
}>;

export type DialogCloseState =
  | Readonly<{ phase: "idle"; lastCancel: DialogCancelDecision }>
  | DialogCancelState
  | Readonly<{ phase: "native-close-requested"; lastCancel: DialogCancelDecision }>;

export function createDialogCloseState(): DialogCloseState {
  return { phase: "idle", lastCancel: "allowed" };
}

function getLastCancelDecision(state: DialogCloseState) {
  return state.phase === "cancel-pending" ? state.decision : state.lastCancel;
}

export function planDialogCancel(
  previousState: DialogCloseState,
  {
    source,
    trusted,
    cancelable,
    defaultPrevented,
    closeOnEscape,
    focus,
  }: {
    source: "escape" | "native";
    trusted: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    closeOnEscape: boolean;
    focus: HTMLElement | null;
  },
): { state: DialogCancelState; nativeAction: "prevent" | "allow" } {
  const decision =
    defaultPrevented ||
    !closeOnEscape ||
    (!cancelable && getLastCancelDecision(previousState) === "blocked")
      ? "blocked"
      : "allowed";
  const nativeAction = decision === "blocked" || source === "escape" ? "prevent" : "allow";

  return {
    state: {
      phase: "cancel-pending",
      decision,
      // Trusted native requests must record returnValue before an owner can flush
      // open=false. Synthetic cancels have no native default action to wait for.
      request:
        decision === "blocked" ? "none" : nativeAction === "allow" && trusted ? "pending" : "sent",
      // A non-cancelable event can close even a blocked dialog. Explicit native
      // requests also need recovery if the controlled owner rejects the close.
      recovery: !cancelable || (decision === "allowed" && source === "native") ? "reopen" : "none",
      focus,
    },
    // Escape is closed through React so native CloseWatcher groups do not also
    // close hydrated ancestors. Explicit requests retain their native returnValue.
    nativeAction,
  };
}

export function expireDialogCancel(state: DialogCancelState): DialogCloseState {
  // Clear the pending request and focus without forgetting a blocked cancel:
  // the browser can follow it with a non-cancelable Escape.
  return { phase: "idle", lastCancel: state.decision };
}

export function markNativeDialogCloseRequested(state: DialogCloseState): DialogCloseState {
  return { phase: "native-close-requested", lastCancel: getLastCancelDecision(state) };
}

export function markDialogCancelRequestSent(state: DialogCloseState): DialogCloseState {
  return state.phase === "cancel-pending" && state.request === "pending"
    ? { ...state, request: "sent" }
    : state;
}

export function hasDialogCloseRequest(state: DialogCloseState) {
  return (
    state.phase === "native-close-requested" ||
    (state.phase === "cancel-pending" && state.request === "sent")
  );
}
