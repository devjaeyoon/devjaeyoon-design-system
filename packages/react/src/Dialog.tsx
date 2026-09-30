import {
  type ComponentPropsWithRef,
  createContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "./Button.js";
import { IconButton } from "./IconButton.js";

export type DialogSize = "medium" | "large";

export type DialogRootProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnInteractOutside?: boolean;
  closeOnEscape?: boolean;
};

type DialogContextValue = {
  open: boolean;
  closeOnInteractOutside: boolean;
  closeOnEscape: boolean;
  requestOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${component} must be rendered inside DialogRoot.`);
  return context;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

type DialogSession = {
  id: number;
  dialog: HTMLDialogElement;
  opener: HTMLElement | null;
  initialFocusFrame: number | null;
  cleanupViewport: () => void;
  unlockScroll: () => void;
  finalized: boolean;
};

type ScrollLockState = {
  count: number;
  documentOverflow: string;
  bodyOverflow: string;
};

const dialogStacks = new WeakMap<Document, DialogSession[]>();
const scrollLocks = new WeakMap<Document, ScrollLockState>();
let nextDialogSessionId = 0;

function getActiveElement(document: Document): HTMLElement | null {
  const element = document.activeElement;
  return element && "focus" in element ? (element as HTMLElement) : null;
}

function canFocus(
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

function focusFirstValid(
  candidates: Array<HTMLElement | null | undefined>,
  document: Document,
  scope?: HTMLElement,
) {
  for (const candidate of candidates) {
    if (!canFocus(candidate, document, scope)) continue;
    candidate.focus({ preventScroll: true });
    if (document.activeElement === candidate) return true;
  }
  return false;
}

function getMeaningfulActiveElement(document: Document, scope?: HTMLElement) {
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

function getClosestDialog(target: EventTarget | null) {
  if (!target || !("closest" in target) || typeof target.closest !== "function") return null;
  return target.closest("dialog");
}

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

function getTopDialogSession(document: Document) {
  const stack = dialogStacks.get(document);
  return stack?.[stack.length - 1] ?? null;
}

function lockBackgroundScroll(document: Document) {
  let state = scrollLocks.get(document);
  if (!state) {
    state = {
      count: 0,
      documentOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
    };
    scrollLocks.set(document, state);
  }
  if (state.count === 0) {
    state.documentOverflow = document.documentElement.style.overflow;
    state.bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  state.count += 1;

  return () => {
    const current = scrollLocks.get(document);
    if (!current) return;
    current.count = Math.max(0, current.count - 1);
    if (current.count === 0) {
      document.documentElement.style.overflow = current.documentOverflow;
      document.body.style.overflow = current.bodyOverflow;
      scrollLocks.delete(document);
    }
  };
}

export function DialogRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  closeOnInteractOutside = false,
  closeOnEscape = true,
}: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === open) return;
      if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange, open],
  );

  const value = useMemo(
    () => ({
      open,
      closeOnInteractOutside,
      closeOnEscape,
      requestOpenChange,
      triggerRef,
    }),
    [closeOnEscape, closeOnInteractOutside, open, requestOpenChange],
  );

  return <DialogContext value={value}>{children}</DialogContext>;
}

export type DialogTriggerProps = ButtonProps;

export function DialogTrigger({ ref, onClick, ...props }: DialogTriggerProps) {
  const { requestOpenChange, triggerRef } = useDialogContext("DialogTrigger");

  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) requestOpenChange(true);
      }}
      ref={(element) => {
        triggerRef.current = element;
        setRef(ref, element);
      }}
    />
  );
}

export type DialogCloseAutoFocusEvent = Event;

export type DialogContentProps = Omit<
  ComponentPropsWithRef<"dialog">,
  "aria-describedby" | "aria-labelledby" | "children" | "onCancel" | "onClose" | "open" | "title"
> & {
  children: ReactNode;
  title: string;
  description?: string;
  size?: DialogSize;
  showCloseButton?: boolean;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onCloseAutoFocus?: (event: DialogCloseAutoFocusEvent) => void;
  onCancel?: ComponentPropsWithRef<"dialog">["onCancel"];
  onClose?: ComponentPropsWithRef<"dialog">["onClose"];
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
};

export function DialogContent({
  children,
  title,
  description,
  size = "medium",
  showCloseButton = true,
  closeLabel = "닫기",
  initialFocusRef,
  returnFocusRef,
  onCloseAutoFocus,
  className,
  ref,
  onCancel,
  onClose,
  onPointerDown,
  onPointerUp,
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
  ...dialogProps
}: DialogContentProps) {
  const context = useDialogContext("DialogContent");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const pointerStartedOutsideRef = useRef<number | null>(null);
  const sessionRef = useRef<DialogSession | null>(null);
  const internalCloseEventsRef = useRef(0);
  const pendingReturnFocusRef = useRef<{
    document: Document;
    frame: number;
    sessionId: number;
  } | null>(null);
  const mountedStateRef = useRef({ generation: 0, mounted: false });
  const latestRef = useRef({ context, initialFocusRef, returnFocusRef, onCloseAutoFocus });
  latestRef.current = { context, initialFocusRef, returnFocusRef, onCloseAutoFocus };

  const cancelPendingReturnFocus = useCallback(() => {
    const pending = pendingReturnFocusRef.current;
    if (!pending) return;
    pending.document.defaultView?.cancelAnimationFrame(pending.frame);
    pendingReturnFocusRef.current = null;
  }, []);

  const finalizeSession = useCallback(
    (session: DialogSession) => {
      if (session.finalized) return;
      session.finalized = true;

      const document = session.dialog.ownerDocument;
      const view = document.defaultView;
      if (session.initialFocusFrame !== null) {
        view?.cancelAnimationFrame(session.initialFocusFrame);
        session.initialFocusFrame = null;
      }
      session.cleanupViewport();
      session.cleanupViewport = () => {};
      session.unlockScroll();
      session.unlockScroll = () => {};
      removeDialogSession(session);
      if (sessionRef.current === session) sessionRef.current = null;

      if (session.dialog.open) {
        internalCloseEventsRef.current += 1;
        session.dialog.close();
      }

      const focusAfterNativeClose = getActiveElement(document);
      const EventConstructor = view?.Event ?? Event;
      const closeAutoFocusEvent = new EventConstructor("djy.dialog.closeAutoFocus", {
        cancelable: true,
      });
      latestRef.current.onCloseAutoFocus?.(closeAutoFocusEvent);
      if (closeAutoFocusEvent.defaultPrevented) return;

      const focusAfterCallback = getActiveElement(document);
      if (
        focusAfterCallback !== focusAfterNativeClose &&
        getMeaningfulActiveElement(document) === focusAfterCallback
      ) {
        return;
      }

      const remainingSession = getTopDialogSession(document);
      const expectedTopSessionId = remainingSession?.id ?? null;
      const focusBeforeRestore = focusAfterCallback;

      if (!view) {
        focusFirstValid(
          [
            latestRef.current.returnFocusRef?.current,
            latestRef.current.context.triggerRef.current,
            session.opener,
          ],
          document,
          remainingSession?.dialog,
        );
        return;
      }

      cancelPendingReturnFocus();
      const frame = view.requestAnimationFrame(() => {
        const pending = pendingReturnFocusRef.current;
        if (!pending || pending.sessionId !== session.id) return;
        pendingReturnFocusRef.current = null;

        if (sessionRef.current && !sessionRef.current.finalized) return;
        const currentTopSession = getTopDialogSession(document);
        if ((currentTopSession?.id ?? null) !== expectedTopSessionId) return;

        const currentFocus = getActiveElement(document);
        if (
          currentFocus !== focusBeforeRestore &&
          getMeaningfulActiveElement(document) === currentFocus
        ) {
          return;
        }

        focusFirstValid(
          [
            latestRef.current.returnFocusRef?.current,
            latestRef.current.context.triggerRef.current,
            session.opener,
          ],
          document,
          currentTopSession?.dialog,
        );
      });
      pendingReturnFocusRef.current = { document, frame, sessionId: session.id };
    },
    [cancelPendingReturnFocus],
  );

  const openSession = useCallback(() => {
    if (sessionRef.current && !sessionRef.current.finalized) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    cancelPendingReturnFocus();
    const document = dialog.ownerDocument;
    const view = document.defaultView;
    const session: DialogSession = {
      id: ++nextDialogSessionId,
      dialog,
      opener: getMeaningfulActiveElement(document),
      initialFocusFrame: null,
      cleanupViewport: () => {},
      unlockScroll: () => {},
      finalized: false,
    };
    sessionRef.current = session;

    try {
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      sessionRef.current = null;
      throw error;
    }

    getDialogStack(document).push(session);
    session.unlockScroll = lockBackgroundScroll(document);

    const updateViewport = () => {
      const viewport = view?.visualViewport;
      dialog.style.setProperty(
        "--djy-dialog-viewport-height",
        `${viewport?.height ?? view?.innerHeight ?? 0}px`,
      );
      dialog.style.setProperty("--djy-dialog-viewport-offset", `${viewport?.offsetTop ?? 0}px`);
    };
    updateViewport();
    view?.visualViewport?.addEventListener("resize", updateViewport);
    view?.visualViewport?.addEventListener("scroll", updateViewport);
    session.cleanupViewport = () => {
      view?.visualViewport?.removeEventListener("resize", updateViewport);
      view?.visualViewport?.removeEventListener("scroll", updateViewport);
    };

    const focusInitialTarget = () => {
      session.initialFocusFrame = null;
      if (
        session.finalized ||
        sessionRef.current !== session ||
        !dialog.open ||
        getTopDialogSession(document)?.id !== session.id
      ) {
        return;
      }
      const autofocusTarget = Array.from(dialog.querySelectorAll<HTMLElement>("[autofocus]")).find(
        (element) => canFocus(element, document, dialog),
      );
      focusFirstValid(
        [latestRef.current.initialFocusRef?.current, autofocusTarget, titleRef.current],
        document,
        dialog,
      );
    };

    if (view) session.initialFocusFrame = view.requestAnimationFrame(focusInitialTarget);
    else focusInitialTarget();
  }, [cancelPendingReturnFocus]);

  useEffect(() => {
    const mountedState = mountedStateRef.current;
    mountedState.mounted = true;
    mountedState.generation += 1;

    return () => {
      mountedState.mounted = false;
      const cleanupGeneration = ++mountedState.generation;
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
      const session = sessionRef.current;
      if (session) finalizeSession(session);
    }
  }, [context.open, finalizeSession, openSession]);

  const isOutsideSurface = (event: ReactPointerEvent<HTMLDialogElement>) => {
    const surface = surfaceRef.current;
    if (!surface) return false;
    const bounds = surface.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  };

  const classes = ["djy-dialog", `djy-dialog--${size}`, className].filter(Boolean).join(" ");

  return (
    <dialog
      {...dialogProps}
      aria-describedby={
        context.open ? (describedBy ?? (description ? descriptionId : undefined)) : undefined
      }
      aria-labelledby={context.open ? (labelledBy ?? titleId) : undefined}
      aria-modal={context.open ? "true" : undefined}
      className={classes}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        onCancel?.(event);
        const shouldClose = !event.defaultPrevented && context.closeOnEscape;
        event.preventDefault();
        if (shouldClose) context.requestOpenChange(false);
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        onClose?.(event);
        if (internalCloseEventsRef.current > 0) {
          internalCloseEventsRef.current -= 1;
          return;
        }
        const session = sessionRef.current;
        if (session) finalizeSession(session);
        if (latestRef.current.context.open) {
          latestRef.current.context.requestOpenChange(false);
        }
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const targetDialog = getClosestDialog(event.target);
        if (
          targetDialog === event.currentTarget &&
          !event.defaultPrevented &&
          isOutsideSurface(event)
        ) {
          pointerStartedOutsideRef.current = event.pointerId;
        }
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        const targetDialog = getClosestDialog(event.target);
        const shouldClose =
          targetDialog === event.currentTarget &&
          !event.defaultPrevented &&
          context.closeOnInteractOutside &&
          pointerStartedOutsideRef.current === event.pointerId &&
          isOutsideSurface(event);
        pointerStartedOutsideRef.current = null;
        if (shouldClose) context.requestOpenChange(false);
      }}
      ref={(element) => {
        dialogRef.current = element;
        setRef(ref, element);
      }}
    >
      {context.open ? (
        <div className="djy-dialog__surface" ref={surfaceRef}>
          <header className="djy-dialog__header">
            <div className="djy-dialog__heading">
              <h2 className="djy-dialog__title" id={titleId} ref={titleRef} tabIndex={-1}>
                {title}
              </h2>
              {description ? (
                <p className="djy-dialog__description" id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            {showCloseButton ? (
              <IconButton
                aria-label={closeLabel}
                className="djy-dialog__close"
                onClick={() => context.requestOpenChange(false)}
                size="medium"
                type="button"
                variant="ghost"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </IconButton>
            ) : null}
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export type DialogBodyProps = ComponentPropsWithRef<"div">;

export function DialogBody({ className, onScroll, ref, tabIndex, ...props }: DialogBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const dialog = body?.closest<HTMLDialogElement>(".djy-dialog");
    if (!body || !dialog) return;
    const view = body.ownerDocument.defaultView;

    const update = () => {
      dialog.dataset.scrolledStart = String(body.scrollTop > 1);
      dialog.dataset.overflowEnd = String(
        body.scrollHeight - body.clientHeight - body.scrollTop > 1,
      );
      if (tabIndex === undefined) {
        if (body.scrollHeight > body.clientHeight + 1) body.tabIndex = 0;
        else body.removeAttribute("tabindex");
      }
    };
    update();
    const ResizeObserverConstructor = view?.ResizeObserver ?? globalThis.ResizeObserver;
    const observer = ResizeObserverConstructor ? new ResizeObserverConstructor(update) : null;
    observer?.observe(body);
    for (const child of body.children) observer?.observe(child);
    const MutationObserverConstructor = view?.MutationObserver ?? globalThis.MutationObserver;
    const mutationObserver = !MutationObserverConstructor
      ? null
      : new MutationObserverConstructor(() => {
          for (const child of body.children) observer?.observe(child);
          update();
        });
    mutationObserver?.observe(body, { childList: true });
    view?.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
      view?.removeEventListener("resize", update);
      delete dialog.dataset.scrolledStart;
      delete dialog.dataset.overflowEnd;
    };
  }, [tabIndex]);

  return (
    <div className="djy-dialog__body-shell">
      <div
        {...props}
        className={["djy-dialog__body", className].filter(Boolean).join(" ")}
        onScroll={(event) => {
          const body = event.currentTarget;
          const dialog = body.closest<HTMLDialogElement>(".djy-dialog");
          if (dialog) {
            dialog.dataset.scrolledStart = String(body.scrollTop > 1);
            dialog.dataset.overflowEnd = String(
              body.scrollHeight - body.clientHeight - body.scrollTop > 1,
            );
          }
          onScroll?.(event);
        }}
        tabIndex={tabIndex}
        ref={(element) => {
          bodyRef.current = element;
          setRef(ref, element);
        }}
      />
      <div aria-hidden="true" className="djy-dialog__scroll-fog" />
    </div>
  );
}

export type DialogFooterProps = ComponentPropsWithRef<"footer">;

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <footer {...props} className={["djy-dialog__footer", className].filter(Boolean).join(" ")} />
  );
}

export type DialogCloseProps = ButtonProps;

export function DialogClose({ onClick, variant = "secondary", ...props }: DialogCloseProps) {
  const { requestOpenChange } = useDialogContext("DialogClose");
  return (
    <Button
      {...props}
      onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) requestOpenChange(false);
      }}
      variant={variant}
    />
  );
}
