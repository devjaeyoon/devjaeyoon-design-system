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
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, type ButtonProps } from "./Button.js";
import { IconButton } from "./IconButton.js";
import { useDialogBodyScroll } from "./useDialogBodyScroll.js";
import { useDialogLifecycle } from "./useDialogLifecycle.js";

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
  triggerRefs: RefObject<Set<HTMLButtonElement>>;
  pendingOpeningTriggerRef: RefObject<HTMLButtonElement | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);
const DialogContentContext = createContext<(() => boolean) | null>(null);

function subscribeToHydration() {
  return () => {};
}

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${component} must be rendered inside DialogRoot.`);
  return context;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") return ref(value);
  else if (ref) ref.current = value;
}

function useComposedRef<T>(internalRef: RefObject<T | null>, ref: Ref<T> | undefined) {
  return useCallback(
    (element: T | null) => {
      internalRef.current = element;
      const cleanup = setRef(ref, element);
      return () => {
        internalRef.current = null;
        if (typeof cleanup === "function") cleanup();
        else setRef(ref, null);
      };
    },
    [internalRef, ref],
  );
}

function DialogVisibility({
  onShow,
  onHide,
}: {
  onShow: () => void;
  onHide: () => (() => void) | undefined;
}) {
  const generationRef = useRef(0);
  useLayoutEffect(() => {
    const generation = ++generationRef.current;
    onShow();
    return () => {
      // Capture focus while the content is still visible.
      const suspend = onHide();
      // StrictMode reconnects immediately; Suspense leaves layout effects disconnected.
      // Only the generation that is still hidden may suspend the native modal.
      queueMicrotask(() => {
        if (generationRef.current === generation) suspend?.();
      });
    };
  }, [onHide, onShow]);
  return null;
}

function getClosestDialog(target: EventTarget | null) {
  if (!target || !("closest" in target) || typeof target.closest !== "function") return null;
  return target.closest("dialog");
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
  const triggerRefs = useRef(new Set<HTMLButtonElement>());
  const pendingOpeningTriggerRef = useRef<HTMLButtonElement>(null);

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
      triggerRefs,
      pendingOpeningTriggerRef,
    }),
    [closeOnEscape, closeOnInteractOutside, open, requestOpenChange],
  );

  return <DialogContext value={value}>{children}</DialogContext>;
}

export type DialogTriggerProps = ButtonProps;

export function DialogTrigger({ ref, onClick, ...props }: DialogTriggerProps) {
  const { open, requestOpenChange, triggerRefs, pendingOpeningTriggerRef } =
    useDialogContext("DialogTrigger");
  const composedRef = useCallback(
    (element: HTMLButtonElement | null) => {
      if (element) triggerRefs.current.add(element);
      const cleanup = setRef(ref, element);
      return () => {
        if (element) triggerRefs.current.delete(element);
        if (typeof cleanup === "function") cleanup();
        else setRef(ref, null);
      };
    },
    [triggerRefs, ref],
  );

  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !open) {
          pendingOpeningTriggerRef.current = event.currentTarget;
          requestOpenChange(true);
        }
      }}
      ref={composedRef}
    />
  );
}

export type DialogCloseAutoFocusEvent = Event;

export type DialogContentProps = Omit<
  ComponentPropsWithRef<"dialog">,
  | "aria-describedby"
  | "aria-labelledby"
  | "children"
  | "closedby"
  | "onCancel"
  | "onClose"
  | "open"
  | "title"
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
  onFocusCapture,
  onKeyDown,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
  ...dialogProps
}: DialogContentProps) {
  const context = useDialogContext("DialogContent");
  // Preserve SSR/hydration markup; client mounts children after the native modal opens.
  const renderBeforeModal = useSyncExternalStore(
    subscribeToHydration,
    () => false,
    () => true,
  );
  const openParentSession = useContext(DialogContentContext);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const pointerStartedOutsideRef = useRef<number | null>(null);
  const onSuspend = useCallback(() => {
    pointerStartedOutsideRef.current = null;
  }, []);
  const {
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
  } = useDialogLifecycle({
    context,
    openParentSession,
    initialFocusRef,
    returnFocusRef,
    onCloseAutoFocus,
    onCancel,
    onClose,
    onFocusCapture,
    onKeyDown,
    onSuspend,
  });
  const composedRef = useComposedRef(dialogRef, ref);

  const isOutsideSurface = (event: ReactPointerEvent<HTMLDialogElement>) => {
    // Native backdrop events target the dialog itself. Portaled descendants remain content,
    // even when their bounds extend beyond the surface.
    if (event.target !== event.currentTarget) return false;
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
      // Root owns dismissal; native light dismiss must not duplicate outside requests.
      closedby="closerequest"
      aria-describedby={
        context.open ? (describedBy ?? (description ? descriptionId : undefined)) : undefined
      }
      aria-labelledby={context.open ? (labelledBy ?? titleId) : undefined}
      aria-modal={context.open ? "true" : undefined}
      className={classes}
      onFocusCapture={handleFocusCapture}
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const targetDialog = getClosestDialog(event.target);
        if (targetDialog === event.currentTarget) pointerStartedOutsideRef.current = null;
        if (
          targetDialog === event.currentTarget &&
          event.isPrimary &&
          event.button === 0 &&
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
          event.isPrimary &&
          event.button === 0 &&
          !event.defaultPrevented &&
          context.closeOnInteractOutside &&
          pointerStartedOutsideRef.current === event.pointerId &&
          isOutsideSurface(event);
        pointerStartedOutsideRef.current = null;
        if (shouldClose) context.requestOpenChange(false);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        if (
          getClosestDialog(event.target) === event.currentTarget &&
          pointerStartedOutsideRef.current === event.pointerId
        ) {
          pointerStartedOutsideRef.current = null;
        }
      }}
      ref={composedRef}
    >
      {/* Resume before descendants mount so React autoFocus can focus inside the modal. */}
      <DialogVisibility onHide={suspendSession} onShow={resumeSession} />
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
          <DialogContentContext value={openSession}>
            {contentSessionId !== null || renderBeforeModal ? children : null}
          </DialogContentContext>
        </div>
      ) : null}
    </dialog>
  );
}

export type DialogBodyProps = ComponentPropsWithRef<"div">;

export function DialogBody({ className, onScroll, ref, tabIndex, ...props }: DialogBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRef(bodyRef, ref);

  const handleScroll = useDialogBodyScroll(bodyRef, tabIndex);

  return (
    <div className="djy-dialog__body-shell">
      <div
        {...props}
        className={["djy-dialog__body", className].filter(Boolean).join(" ")}
        onScroll={(event) => {
          handleScroll(event);
          onScroll?.(event);
        }}
        tabIndex={tabIndex}
        ref={composedRef}
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
