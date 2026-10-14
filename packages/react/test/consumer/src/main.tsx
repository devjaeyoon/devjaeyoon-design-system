import { applyThemePreference } from "@devjaeyoon-design-system/css";
import {
  Button,
  type ButtonProps,
  type ButtonTone,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTrigger,
  IconButton,
  type IconButtonProps,
  TextField,
  type TextFieldProps,
} from "@devjaeyoon-design-system/react";
import {
  type CSSProperties,
  lazy,
  type ReactNode,
  StrictMode,
  Suspense,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { DialogBoundaryFixtures } from "./DialogBoundaryFixtures";

type Theme = "light" | "dark";

function AutofocusTarget({
  children,
  hidden,
  testId,
}: {
  children: ReactNode;
  hidden?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    ref.current?.setAttribute("autofocus", "");
  }, []);

  return (
    <button data-testid={testId} hidden={hidden} ref={ref} type="button">
      {children}
    </button>
  );
}

function ReactAutofocusInput() {
  return <TextField autoFocus label="Interaction autofocus" />;
}

function DialogInteractionFixture() {
  const [revision, setRevision] = useState(0);
  return (
    <DialogRoot closeOnInteractOutside>
      {["First", "Second"].map((label) => (
        <DialogTrigger
          key={label}
          ref={(element) => {
            if (element) element.dataset.revision = String(revision);
          }}
        >
          {label} interaction trigger
        </DialogTrigger>
      ))}
      <DialogContent title="Interaction dialog">
        <DialogBody>
          <input aria-label="Ordinary input" />
          <ReactAutofocusInput />
          <Button onClick={() => setRevision((value) => value + 1)}>
            Rerender interaction triggers
          </Button>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function HydrationFixture() {
  return (
    <DialogRoot defaultOpen>
      <DialogTrigger>Hydrated parent trigger</DialogTrigger>
      <DialogContent title="Hydrated parent">
        <DialogBody>
          <input id="hydration-input" aria-label="Hydrated draft" defaultValue="SSR draft" />
          <DialogRoot defaultOpen>
            <DialogTrigger>Hydrated child trigger</DialogTrigger>
            <DialogContent title="Hydrated child">
              <DialogBody>
                <TextField autoFocus label="Hydrated autofocus" />
              </DialogBody>
            </DialogContent>
          </DialogRoot>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function createSuspenseRequest() {
  let resolve = () => {};
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function SuspenseInput({ request }: { request: ReturnType<typeof createSuspenseRequest> }) {
  use(request.promise);
  return <TextField autoFocus label="Suspense draft" />;
}

function DialogSuspenseFixture() {
  const [content] = useState(() => {
    const request = createSuspenseRequest();
    return {
      Component: lazy(() => request.promise.then(() => ({ default: SuspenseInput }))),
      resolve: request.resolve,
    };
  });
  const [request, setRequest] = useState(createSuspenseRequest);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [closeCount, setCloseCount] = useState(0);
  const [nativeCloseCount, setNativeCloseCount] = useState(0);
  return (
    <section aria-label="Dialog Suspense fixture">
      <span data-testid="suspense-close-count">{closeCount}</span>
      <span data-testid="suspense-native-close-count">{nativeCloseCount}</span>
      <Suspense
        fallback={
          <div>
            <Button
              onClick={() => {
                content.resolve();
                request.resolve();
              }}
            >
              Resolve Suspense content
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel Suspense loading</Button>
            <Button onClick={() => setMounted(false)}>Unmount suspended dialog</Button>
          </div>
        }
      >
        <DialogRoot
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setRequest(createSuspenseRequest());
          }}
        >
          <DialogTrigger>Open Suspense dialog</DialogTrigger>
          {mounted ? (
            <DialogContent
              data-testid="suspense-dialog"
              onClose={() => setNativeCloseCount((count) => count + 1)}
              onCloseAutoFocus={() => setCloseCount((count) => count + 1)}
              title="Suspense dialog"
            >
              <DialogBody>
                <content.Component request={request} />
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setRequest(createSuspenseRequest())}>
                  Reload Suspense content
                </Button>
                <DialogClose>Close Suspense dialog</DialogClose>
              </DialogFooter>
            </DialogContent>
          ) : null}
        </DialogRoot>
      </Suspense>
    </section>
  );
}

function DialogLifecycleFixture() {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [closeAutoFocusCount, setCloseAutoFocusCount] = useState(0);
  const invalidInitialRef = useRef<HTMLButtonElement>(null);
  const invalidReturnRef = useRef<HTMLSpanElement>(null);
  const reopenOnCloseRef = useRef(false);

  return (
    <section aria-label="Dialog lifecycle fixture">
      <button disabled ref={invalidInitialRef} type="button">
        Invalid initial target
      </button>
      <span ref={invalidReturnRef}>Invalid return target</span>
      <span data-testid="dialog-close-count">{closeAutoFocusCount}</span>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogTrigger data-testid="lifecycle-dialog-trigger">Open lifecycle dialog</DialogTrigger>
        {mounted ? (
          <DialogContent
            initialFocusRef={invalidInitialRef}
            onCloseAutoFocus={() => {
              setCloseAutoFocusCount((count) => count + 1);
              if (reopenOnCloseRef.current) {
                reopenOnCloseRef.current = false;
                setOpen(true);
              }
            }}
            returnFocusRef={invalidReturnRef}
            title="Lifecycle dialog"
          >
            <DialogBody>
              <AutofocusTarget hidden>Hidden autofocus target</AutofocusTarget>
              <AutofocusTarget testId="valid-autofocus-target">
                Valid autofocus target
              </AutofocusTarget>
              <Button
                data-testid="rapid-reopen"
                onClick={() => {
                  reopenOnCloseRef.current = true;
                  setOpen(false);
                }}
              >
                Close and reopen
              </Button>
              <Button data-testid="unmount-dialog" onClick={() => setMounted(false)}>
                Unmount dialog
              </Button>
            </DialogBody>
          </DialogContent>
        ) : null}
      </DialogRoot>
    </section>
  );
}

function NestedDialogFixture() {
  return (
    <DialogRoot>
      <DialogTrigger data-testid="parent-dialog-trigger">Open parent dialog</DialogTrigger>
      <DialogContent title="Parent dialog">
        <DialogBody>
          <p>Parent content</p>
          <DialogRoot>
            <DialogTrigger data-testid="child-dialog-trigger">Open child dialog</DialogTrigger>
            <DialogContent title="Child dialog">
              <DialogBody>Child content</DialogBody>
            </DialogContent>
          </DialogRoot>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function SimultaneousNestedDialogFixture({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [mounted, setMounted] = useState(!initiallyOpen);
  const [open, setOpen] = useState(initiallyOpen);
  const prefix = initiallyOpen ? "initial" : "simultaneous";

  return (
    <section aria-label={`${prefix} nested fixture`}>
      {initiallyOpen ? (
        <Button data-testid="initial-nested-mount" onClick={() => setMounted(true)}>
          Mount initially open dialogs
        </Button>
      ) : null}
      {mounted ? (
        <DialogRoot open={open} onOpenChange={setOpen}>
          <DialogTrigger data-testid={`${prefix}-parent-trigger`}>
            Open {prefix} parent
          </DialogTrigger>
          <DialogContent title={`${prefix} parent dialog`}>
            <DialogBody>
              <DialogRoot defaultOpen>
                <DialogTrigger data-testid={`${prefix}-child-trigger`}>
                  Open {prefix} child
                </DialogTrigger>
                <DialogContent title={`${prefix} child dialog`}>
                  <DialogBody>The child opens together with its parent.</DialogBody>
                </DialogContent>
              </DialogRoot>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      ) : null}
    </section>
  );
}

function DialogPolicyFixture() {
  const customFocusRef = useRef<HTMLButtonElement>(null);
  const preventedReturnRef = useRef<HTMLButtonElement>(null);

  return (
    <section aria-label="Dialog policy fixture">
      <DialogRoot closeOnEscape={false}>
        <DialogTrigger data-testid="escape-disabled-trigger">Open fixed dialog</DialogTrigger>
        <DialogContent title="Escape disabled dialog">
          <DialogBody>This dialog ignores Escape.</DialogBody>
          <DialogFooter>
            <DialogClose>Close fixed dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <DialogRoot>
        <DialogTrigger data-testid="cancel-prevented-trigger">Open guarded dialog</DialogTrigger>
        <DialogContent
          onCancel={(event) => {
            if (event.cancelable) event.preventDefault();
          }}
          title="Cancel prevented dialog"
        >
          <DialogBody>The consumer prevents the native cancel event.</DialogBody>
          <DialogFooter>
            <DialogClose>Close guarded dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <button data-testid="custom-focus-target" ref={customFocusRef} type="button">
        Custom focus target
      </button>
      <DialogRoot>
        <DialogTrigger data-testid="custom-focus-trigger">Open custom focus dialog</DialogTrigger>
        <DialogContent
          onCloseAutoFocus={() => customFocusRef.current?.focus({ preventScroll: true })}
          title="Custom focus dialog"
        >
          <DialogBody>Focus is moved by the consumer after close.</DialogBody>
          <DialogFooter>
            <DialogClose>Close custom focus dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <button data-testid="prevented-return-target" ref={preventedReturnRef} type="button">
        Prevented return target
      </button>
      <DialogRoot>
        <DialogTrigger data-testid="prevented-return-trigger">
          Open prevented return dialog
        </DialogTrigger>
        <DialogContent
          onCloseAutoFocus={(event) => event.preventDefault()}
          returnFocusRef={preventedReturnRef}
          title="Prevented return dialog"
        >
          <DialogBody>The consumer prevents the component's scheduled focus return.</DialogBody>
          <DialogFooter>
            <DialogClose>Close prevented return dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function ControlledEscapeDialogFixture() {
  const [open, setOpen] = useState(false);
  const [closeRequestCount, setCloseRequestCount] = useState(0);
  const [closeCount, setCloseCount] = useState(0);
  const acceptCloseRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-label="Controlled Escape fixture">
      <span data-testid="controlled-escape-requests">{closeRequestCount}</span>
      <span data-testid="controlled-escape-close-count">{closeCount}</span>
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            acceptCloseRef.current = false;
            setOpen(true);
          } else {
            setCloseRequestCount((count) => count + 1);
            if (acceptCloseRef.current) setOpen(false);
          }
        }}
      >
        <DialogTrigger data-testid="controlled-escape-trigger">
          Open controlled dialog
        </DialogTrigger>
        <DialogContent
          initialFocusRef={inputRef}
          onCloseAutoFocus={() => setCloseCount((count) => count + 1)}
          title="Controlled Escape dialog"
        >
          <DialogBody>
            <TextField label="Controlled draft" ref={inputRef} />
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => {
                acceptCloseRef.current = true;
              }}
            >
              Allow Escape close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function NativeCloseDialogFixture() {
  const [open, setOpen] = useState(false);
  const [closeRequestCount, setCloseRequestCount] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <section aria-label="Native close fixture">
      <span data-testid="native-close-count">{closeRequestCount}</span>
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCloseRequestCount((count) => count + 1);
          setOpen(nextOpen);
        }}
      >
        <DialogTrigger data-testid="native-close-trigger">Open native close dialog</DialogTrigger>
        <DialogContent ref={dialogRef} title="Native close dialog">
          <DialogBody>
            <Button onClick={() => dialogRef.current?.close()}>Close with native API</Button>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function OpenerReturnDialogFixture() {
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="Opener return fixture">
      <Button data-testid="opener-only-trigger" onClick={() => setOpen(true)}>
        Open without DialogTrigger
      </Button>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent title="Opener return dialog">
          <DialogBody>There is no DialogTrigger in this root.</DialogBody>
          <DialogFooter>
            <DialogClose>Close opener return dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function ExplicitReturnDialogFixture() {
  const returnFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <section aria-label="Explicit return fixture">
      <button data-testid="explicit-return-target" ref={returnFocusRef} type="button">
        Explicit return target
      </button>
      <DialogRoot>
        <DialogTrigger data-testid="explicit-return-trigger">
          Open explicit return dialog
        </DialogTrigger>
        <DialogContent returnFocusRef={returnFocusRef} title="Explicit return dialog">
          <DialogBody>The explicit return target has priority over the trigger.</DialogBody>
          <DialogFooter>
            <DialogClose>Close explicit return dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function DialogRefFixture() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [version, setVersion] = useState(0);
  const [renders, setRenders] = useState(0);
  const eventsRef = useRef<string[]>([]);
  const outputRef = useRef<HTMLOutputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => {
    const track = (name: string) => (element: HTMLElement | null) => {
      const record = (phase: string) => {
        eventsRef.current.push(`${name}:${version}:${phase}`);
        if (outputRef.current) outputRef.current.value = JSON.stringify(eventsRef.current);
      };
      if (!element) {
        record("null");
        return;
      }
      record("attach");
      if (version < 2) return () => record("cleanup");
    };
    return { trigger: track("trigger"), content: track("content"), body: track("body") };
  }, [version]);

  useEffect(() => {
    const output = outputRef.current;
    if (!output) return;
    output.value = JSON.stringify(eventsRef.current);
    output.dataset.objectRefs = JSON.stringify([
      triggerRef.current !== null,
      contentRef.current !== null,
      bodyRef.current !== null,
    ]);
  });

  return (
    <section aria-label="Dialog ref fixture">
      <output data-testid="ref-events" hidden ref={outputRef} />
      {!mounted ? <Button onClick={() => setMounted(true)}>Remount ref dialog</Button> : null}
      {mounted ? (
        <DialogRoot open={open} onOpenChange={setOpen}>
          <DialogTrigger
            data-testid="ref-dialog-trigger"
            ref={version === 3 ? triggerRef : refs.trigger}
          >
            Open ref dialog
          </DialogTrigger>
          <DialogContent
            ref={version === 3 ? contentRef : refs.content}
            title="Ref lifecycle dialog"
          >
            <DialogBody ref={version === 3 ? bodyRef : refs.body}>
              <Button onClick={() => setRenders((count) => count + 1)}>
                Rerender refs {renders}
              </Button>
              <Button onClick={() => setVersion((count) => count + 1)}>Replace refs</Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  setMounted(false);
                }}
              >
                Unmount ref dialog
              </Button>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      ) : null}
    </section>
  );
}

function ConsumerApp() {
  const [name, setName] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyThemePreference(document.documentElement, theme);
  }, [theme]);

  const fieldProps: TextFieldProps = {
    autoComplete: "name",
    description: "Enter the name saved with this profile.",
    id: "consumer-name",
    label: "Name",
    name: "name",
    onChange: (event) => setName(event.currentTarget.value),
    placeholder: "Ada Lovelace",
    ref: inputRef,
    required: true,
    value: name,
  };
  const submitProps: ButtonProps = {
    children: "Save profile",
    name: "intent",
    type: "submit",
    value: "save",
  };

  const [actions, setActions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  const tone: ButtonTone = "danger";
  const actionProps: IconButtonProps = {
    "aria-label": "Delete item",
    children: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    ),
    loading,
    disabled,
    loadingLabel: "Deleting item",
    variant: "outline",
    tone,
    size: "large",
    ref: actionRef,
    name: "intent",
    value: "delete",
    onClick: () => {
      setActions((value) => value + 1);
      actionRef.current?.setAttribute("data-ref", "received");
    },
  };

  return (
    <main
      style={{
        background: "var(--djy-color-bg-canvas)",
        color: "var(--djy-color-fg-neutral)",
        fontFamily: "var(--djy-font-family-sans)",
        minHeight: "100vh",
        padding: "var(--djy-space-6)",
      }}
    >
      <h1 style={{ overflowWrap: "anywhere" }}>Installed package consumer</h1>
      <DialogLifecycleFixture />
      <NestedDialogFixture />
      <SimultaneousNestedDialogFixture initiallyOpen />
      <SimultaneousNestedDialogFixture />
      <DialogPolicyFixture />
      <ControlledEscapeDialogFixture />
      <NativeCloseDialogFixture />
      <OpenerReturnDialogFixture />
      <ExplicitReturnDialogFixture />
      <DialogRefFixture />
      <DialogInteractionFixture />
      <DialogSuspenseFixture />
      <DialogBoundaryFixtures />
      <Button
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        type="button"
        variant="secondary"
      >
        {theme === "light" ? "Use dark theme" : "Use light theme"}
      </Button>
      <DialogRoot>
        <DialogTrigger data-testid="dialog-trigger" variant="outline">
          Review workout
        </DialogTrigger>
        <DialogContent
          description="Review the workout before adding it to today."
          title="Workout details"
        >
          <DialogBody data-testid="dialog-body">
            {Array.from({ length: 20 }, (_, index) => (
              <p key={index}>Workout set {index + 1}</p>
            ))}
          </DialogBody>
          <DialogFooter>
            <DialogClose>Cancel review</DialogClose>
            <Button>Import workout</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedName(name);
        }}
        style={{
          display: "grid",
          gap: "var(--djy-space-4)",
          marginBlock: "var(--djy-space-6)",
          maxWidth: "24rem",
        }}
      >
        <TextField {...fieldProps} />
        <Button {...submitProps} />
        <Button variant="outline" onClick={() => setActions((value) => value + 1)}>
          Preview profile
        </Button>
        <IconButton {...actionProps} />
      </form>
      <Button variant="secondary" onClick={() => setLoading((value) => !value)}>
        Toggle loading
      </Button>
      <Button variant="secondary" onClick={() => setDisabled((value) => !value)}>
        Toggle disabled
      </Button>
      <section
        aria-label="Button states"
        style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
      >
        {(["default", "danger"] as const).map((tone) =>
          (["primary", "secondary", "outline", "ghost"] as const).map((variant) => (
            <Button
              key={`${tone}-${variant}`}
              tone={tone}
              variant={variant}
              data-testid={`${tone}-${variant}`}
            >
              {tone} {variant}
            </Button>
          )),
        )}
      </section>
      <section
        aria-label="Neutral theme"
        style={
          {
            "--djy-color-bg-brand-solid": "var(--djy-color-bg-neutral-solid)",
            "--djy-color-bg-brand-solid-hover": "var(--djy-color-bg-neutral-solid-hover)",
            "--djy-color-bg-brand-solid-pressed": "var(--djy-color-bg-neutral-solid-pressed)",
            "--djy-color-fg-on-brand": "var(--djy-color-fg-on-neutral)",
          } as CSSProperties
        }
      >
        <Button data-testid="neutral-primary">Neutral save</Button>
        <IconButton aria-label="Neutral add" variant="primary" data-testid="neutral-icon">
          <span>+</span>
        </IconButton>
        <Button data-testid="neutral-danger" tone="danger">
          Neutral delete
        </Button>
      </section>
      <p data-testid="actions">Actions: {actions}</p>
      <Button data-testid="long-label" size="large" style={{ width: "100%", maxWidth: "20rem" }}>
        Review and save all changes to the selected items before continuing to the next step
      </Button>
      <p aria-live="polite" role="status">
        {submittedName ? `Saved ${submittedName}` : "No profile saved yet."}
      </p>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Expected the consumer app root element.");

if (location.pathname.endsWith("/hydration.html")) {
  hydrateRoot(
    rootElement,
    <StrictMode>
      <HydrationFixture />
    </StrictMode>,
  );
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ConsumerApp />
    </StrictMode>,
  );
}
