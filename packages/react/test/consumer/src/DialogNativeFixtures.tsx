import {
  Button,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  TextField,
} from "@devjaeyoon-design-system/react";
import { Suspense, startTransition, use, useRef, useState } from "react";
import { flushSync } from "react-dom";

function CanceledOpening({ mode }: { mode: "uncontrolled" | "controlled" | "retained" }) {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const blockOpening = useRef(true);
  return (
    <section aria-label={`${mode} opening fixture`}>
      <span data-testid={`${mode}-opening-open`}>{String(open)}</span>
      <span data-testid={`${mode}-opening-attempts`}>{attempts}</span>
      <span data-testid={`${mode}-opening-requests`}>{requests}</span>
      <span data-testid={`${mode}-opening-closes`}>{closes}</span>
      <Button onClick={() => setOpen(false)}>Reset {mode} opening</Button>
      <DialogRoot
        {...(mode === "uncontrolled" ? {} : { open })}
        onOpenChange={(next) => {
          if (!next) setRequests((count) => count + 1);
          if (next || mode !== "retained") setOpen(next);
        }}
      >
        <DialogTrigger>Open {mode} opening</DialogTrigger>
        <DialogContent
          title={`${mode} opening`}
          data-testid={`${mode}-opening-dialog`}
          onBeforeToggle={(event) => {
            if (event.target !== event.currentTarget || event.newState !== "open") return;
            setAttempts((count) => count + 1);
            if (!blockOpening.current) return;
            blockOpening.current = false;
            event.preventDefault();
          }}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <DialogRoot defaultOpen>
              <DialogContent title={`${mode} opening child`}>
                <DialogBody>Nested content</DialogBody>
              </DialogContent>
            </DialogRoot>
            {mode === "retained" ? (
              <Button onClick={() => setOpen(false)}>Finish {mode} opening</Button>
            ) : (
              <DialogClose>Finish {mode} opening</DialogClose>
            )}
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function createRequest() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function RevealDraft({ request }: { request: ReturnType<typeof createRequest> }) {
  use(request.promise);
  return <TextField label="Canceled reveal draft" autoFocus />;
}

function CanceledReveal() {
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [request, setRequest] = useState(() => {
    const initial = createRequest();
    initial.resolve();
    return initial;
  });
  const blockReveal = useRef(false);
  return (
    <section aria-label="Canceled reveal fixture">
      <span data-testid="canceled-reveal-closes">{closes}</span>
      <span data-testid="canceled-reveal-native-closes">{nativeCloses}</span>
      <Suspense fallback={<Button onClick={request.resolve}>Resolve canceled reveal</Button>}>
        <DialogRoot open={open} onOpenChange={setOpen}>
          <DialogTrigger>Open canceled reveal</DialogTrigger>
          <DialogContent
            title="Canceled reveal"
            onBeforeToggle={(event) => {
              if (event.newState === "open" && blockReveal.current) {
                blockReveal.current = false;
                event.preventDefault();
              }
            }}
            onClose={() => setNativeCloses((count) => count + 1)}
            onCloseAutoFocus={() => setCloses((count) => count + 1)}
          >
            <DialogBody>
              <RevealDraft request={request} />
              <Button
                onClick={() => {
                  blockReveal.current = true;
                  setRequest(createRequest());
                }}
              >
                Suspend canceled reveal
              </Button>
              <DialogClose>Finish canceled reveal</DialogClose>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      </Suspense>
    </section>
  );
}

function RemovedTrigger({ remove }: { remove: "first" | "last" }) {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      {remove !== "first" || !removed ? (
        <DialogTrigger>First {remove} removal trigger</DialogTrigger>
      ) : null}
      {remove !== "last" || !removed ? (
        <DialogTrigger>Last {remove} removal trigger</DialogTrigger>
      ) : null}
      <DialogContent title={`${remove} trigger removal`}>
        <DialogBody>
          <Button onClick={() => setRemoved(true)}>Remove {remove} trigger</Button>
          <DialogClose>Finish {remove} removal</DialogClose>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function CanceledReopening() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [childCloses, setChildCloses] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const blockReopening = useRef(false);
  return (
    <section aria-label="Canceled reopening fixture">
      <span data-testid="canceled-reopening-requests">{requests}</span>
      <span data-testid="canceled-reopening-closes">{closes}</span>
      <span data-testid="canceled-reopening-child-closes">{childCloses}</span>
      <Button onClick={() => setOpen(false)}>Reset canceled reopening</Button>
      <DialogRoot
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else setRequests((count) => count + 1);
        }}
      >
        <DialogTrigger>Open canceled reopening</DialogTrigger>
        <DialogContent
          ref={ref}
          title="Canceled reopening"
          onBeforeToggle={(event) => {
            if (
              event.target === event.currentTarget &&
              event.newState === "open" &&
              blockReopening.current
            ) {
              blockReopening.current = false;
              event.preventDefault();
            }
          }}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <DialogRoot defaultOpen>
              <DialogContent
                title="Canceled reopening child"
                onCloseAutoFocus={() => setChildCloses((count) => count + 1)}
              >
                <DialogBody>
                  <TextField
                    label="Canceled reopening draft"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key !== "F2") return;
                      blockReopening.current = true;
                      ref.current?.close();
                    }}
                  />
                </DialogBody>
              </DialogContent>
            </DialogRoot>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

type RequestCloseMode =
  | "accepted"
  | "rejected"
  | "prevented"
  | "sync-accepted"
  | "sync-rejected"
  | "sync-reopened";

function RequestClose({ mode }: { mode: RequestCloseMode }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [result, setResult] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section aria-label={`${mode} request close fixture`}>
      <span data-testid={`${mode}-request-close-requests`}>{requests}</span>
      <span data-testid={`${mode}-request-close-closes`}>{closes}</span>
      <span data-testid={`${mode}-request-close-native-closes`}>{nativeCloses}</span>
      <span data-testid={`${mode}-request-close-result`}>{result}</span>
      <DialogRoot
        open={open}
        onOpenChange={(next) => {
          const update = () => {
            if (!next) setRequests((count) => count + 1);
            if (next || (mode !== "rejected" && mode !== "sync-rejected")) setOpen(next);
          };
          if (mode.startsWith("sync-")) flushSync(update);
          else update();
          if (!next && mode === "sync-reopened") flushSync(() => setOpen(true));
        }}
      >
        <DialogTrigger>Open {mode} request close</DialogTrigger>
        <DialogContent
          ref={ref}
          initialFocusRef={input}
          title={`${mode} request close`}
          onCancel={(event) => {
            if (mode === "prevented") event.preventDefault();
          }}
          onClose={(event) => {
            setNativeCloses((count) => count + 1);
            setResult(event.currentTarget.returnValue);
          }}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <TextField
              ref={input}
              label={`${mode} request close draft`}
              onKeyDown={(event) => {
                if (event.key === "F2") ref.current?.requestClose("confirmed");
                if (event.key === "F3") ref.current?.close("direct");
              }}
            />
            <Button onClick={() => setOpen(false)}>Finish {mode} request close</Button>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function NativeCloseLoading({ request }: { request: ReturnType<typeof createRequest> | null }) {
  if (request) use(request.promise);
  return null;
}

function TriggerSession() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ReturnType<typeof createRequest> | null>(null);
  const [explicitReturn, setExplicitReturn] = useState(false);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [requests, setRequests] = useState(0);
  const [canceledOpenings, setCanceledOpenings] = useState(0);
  const firstTriggerRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement>(null);
  const returnTargetRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelNextOpening = useRef(false);
  const rejectClose = useRef(false);
  return (
    <section aria-label="Trigger session fixture">
      <span data-testid="trigger-session-closes">{closes}</span>
      <span data-testid="trigger-session-native-closes">{nativeCloses}</span>
      <span data-testid="trigger-session-requests">{requests}</span>
      <span data-testid="trigger-session-canceled-openings">{canceledOpenings}</span>
      <Button
        onClick={() => {
          setExplicitReturn(false);
          setOpen(true);
        }}
      >
        Open programmatic trigger session
      </Button>
      <Button
        onClick={() => {
          setExplicitReturn(true);
          setOpen(true);
        }}
      >
        Open explicit return trigger session
      </Button>
      <Button
        onClick={() => {
          cancelNextOpening.current = true;
          firstTriggerRef.current?.click();
        }}
      >
        Cancel trigger session opening
      </Button>
      <Button ref={returnTargetRef}>Trigger session return target</Button>
      <Suspense fallback={<Button onClick={request?.resolve}>Resolve trigger session</Button>}>
        <DialogRoot
          open={open}
          onOpenChange={(next) => {
            if (next) setExplicitReturn(false);
            else setRequests((count) => count + 1);
            if (next || !rejectClose.current) setOpen(next);
          }}
        >
          <DialogTrigger ref={firstTriggerRef}>First trigger session trigger</DialogTrigger>
          <DialogTrigger ref={lastTriggerRef}>Last trigger session trigger</DialogTrigger>
          <DialogContent
            data-testid="trigger-session-dialog"
            title="Trigger session"
            ref={dialogRef}
            initialFocusRef={inputRef}
            {...(explicitReturn ? { returnFocusRef: returnTargetRef } : {})}
            onBeforeToggle={(event) => {
              if (event.newState !== "open" || !cancelNextOpening.current) return;
              cancelNextOpening.current = false;
              setCanceledOpenings((count) => count + 1);
              event.preventDefault();
            }}
            onClose={() => setNativeCloses((count) => count + 1)}
            onCloseAutoFocus={() => setCloses((count) => count + 1)}
          >
            <DialogBody>
              <TextField label="Trigger session draft" ref={inputRef} />
              <NativeCloseLoading request={request} />
              <Button onClick={() => setRequest(createRequest())}>Suspend trigger session</Button>
              <Button
                onClick={() => {
                  rejectClose.current = true;
                  dialogRef.current?.close("rejected");
                }}
              >
                Reject native trigger session close
              </Button>
              <Button
                onClick={() => {
                  flushSync(() => setOpen(false));
                  flushSync(() => lastTriggerRef.current?.click());
                }}
              >
                Reopen trigger session with last trigger
              </Button>
              <Button onClick={() => firstTriggerRef.current?.click()}>
                Click first trigger while open
              </Button>
              <DialogClose
                onClick={() => {
                  rejectClose.current = false;
                }}
              >
                Finish trigger session
              </DialogClose>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      </Suspense>
    </section>
  );
}

function NativeCloseDuringSuspense({
  source,
  mode,
}: {
  source: "api" | "form";
  mode: "accepted" | "rejected" | "fast" | "reopened";
}) {
  const name = `${source} ${mode} suspended close`;
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ReturnType<typeof createRequest> | null>(null);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [result, setResult] = useState("");
  const pendingRequest = useRef<ReturnType<typeof createRequest> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const closeAndLoad = () => {
    if (source === "api") dialogRef.current?.close("saved");
    else if (submitRef.current) formRef.current?.requestSubmit(submitRef.current);
    const nextRequest = createRequest();
    pendingRequest.current = nextRequest;
    if (mode === "fast") {
      flushSync(() => setRequest(nextRequest));
      queueMicrotask(nextRequest.resolve);
    } else setRequest(nextRequest);
  };

  return (
    <section aria-label={`${name} fixture`}>
      <span data-testid={`${name}-requests`}>{requests}</span>
      <span data-testid={`${name}-closes`}>{closes}</span>
      <span data-testid={`${name}-native-closes`}>{nativeCloses}</span>
      <span data-testid={`${name}-result`}>{result}</span>
      <Button onClick={() => pendingRequest.current?.resolve()}>Complete {name} load</Button>
      <Suspense fallback={<Button onClick={request?.resolve}>Resolve {name} load</Button>}>
        <DialogRoot
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setRequest(null);
              setOpen(true);
              return;
            }
            setRequests((count) => count + 1);
            if (mode === "rejected") return;
            if (mode === "reopened") {
              flushSync(() => setOpen(false));
              flushSync(() => {
                setRequest(null);
                setOpen(true);
              });
            } else setOpen(false);
          }}
        >
          <DialogTrigger>Open {name}</DialogTrigger>
          <DialogContent
            ref={dialogRef}
            initialFocusRef={inputRef}
            title={name}
            onClose={(event) => {
              setNativeCloses((count) => count + 1);
              setResult(event.currentTarget.returnValue);
            }}
            onCloseAutoFocus={() => setCloses((count) => count + 1)}
          >
            <DialogBody>
              <form method="dialog" ref={formRef}>
                <TextField
                  label={`${name} draft`}
                  ref={inputRef}
                  onKeyDown={(event) => {
                    if (event.key !== "F2") return;
                    event.preventDefault();
                    closeAndLoad();
                  }}
                />
                <button hidden ref={submitRef} type="submit" value="saved">
                  Submit native form
                </button>
              </form>
              <NativeCloseLoading request={request} />
              <Button onClick={closeAndLoad}>Close {name} and load</Button>
              <Button onClick={() => setOpen(false)}>Finish {name}</Button>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      </Suspense>
    </section>
  );
}

type RequestRevealMode =
  | "accepted"
  | "rejected"
  | "sync-accepted"
  | "sync-rejected"
  | "reopened"
  | "uncontrolled"
  | "prevented"
  | "blocked"
  | "canceled"
  | "transition";

function RequestCloseDuringReveal({
  mode,
  reveal = "instant",
  nested = false,
}: {
  mode: RequestRevealMode;
  reveal?: "instant" | "promise" | "slow";
  nested?: boolean;
}) {
  const name = `${mode} ${reveal} ${nested ? "nested " : ""}request reveal`;
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ReturnType<typeof createRequest> | null>(null);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [childCloses, setChildCloses] = useState(0);
  const [result, setResult] = useState("");
  const [requestResult, setRequestResult] = useState("");
  const [mounted, setMounted] = useState(true);
  const [closeTransition, setCloseTransition] = useState<ReturnType<typeof createRequest> | null>(
    null,
  );
  const pendingTransitionRef = useRef<ReturnType<typeof createRequest> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nativeResultDialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blockRestorationRef = useRef(false);
  const draft = (
    <TextField
      label={`${name} draft`}
      ref={inputRef}
      onKeyDown={(event) => {
        if (event.key === "F2") dialogRef.current?.requestClose("saved");
      }}
    />
  );

  return (
    <section aria-label={`${name} fixture`}>
      <span data-testid={`${name}-requests`}>{requests}</span>
      <span data-testid={`${name}-closes`}>{closes}</span>
      <span data-testid={`${name}-native-closes`}>{nativeCloses}</span>
      <span data-testid={`${name}-child-closes`}>{childCloses}</span>
      <span data-testid={`${name}-result`}>{result}</span>
      <span data-testid={`${name}-request-result`}>{requestResult}</span>
      <Button onClick={() => setOpen(false)}>Finish {name}</Button>
      <Button onClick={() => setMounted(false)}>Unmount {name}</Button>
      <Button onClick={() => setRequest(null)}>Reveal {name}</Button>
      {mode === "transition" ? (
        <>
          <Button
            onClick={() => {
              flushSync(() => {
                setOpen(true);
                setCloseTransition(null);
              });
              pendingTransitionRef.current?.resolve();
            }}
          >
            Cancel transition {name}
          </Button>
          <Button onClick={() => pendingTransitionRef.current?.resolve()}>
            Resolve transition {name}
          </Button>
        </>
      ) : null}
      <Suspense fallback={<p>Loading {name}</p>}>
        <DialogRoot
          {...(mode === "uncontrolled" ? {} : { open })}
          closeOnEscape={mode !== "blocked"}
          onOpenChange={(next) => {
            if (next) {
              setOpen(true);
              return;
            }
            const update = () => {
              setRequests((count) => count + 1);
              setRequestResult(nativeResultDialogRef.current?.returnValue ?? "");
              if (
                mode !== "rejected" &&
                mode !== "sync-rejected" &&
                mode !== "canceled" &&
                mode !== "transition"
              ) {
                setOpen(false);
              }
            };
            if (mode.startsWith("sync-") || mode === "reopened") flushSync(update);
            else update();
            if (mode === "transition") {
              const next = createRequest();
              pendingTransitionRef.current = next;
              startTransition(() => {
                setOpen(false);
                setCloseTransition(next);
              });
            }
            if (mode === "reopened") {
              flushSync(() => {
                setRequest(null);
                setOpen(true);
              });
            }
          }}
        >
          <DialogTrigger>Open {name}</DialogTrigger>
          {mounted ? (
            <DialogContent
              title={name}
              ref={dialogRef}
              {...(nested ? {} : { initialFocusRef: inputRef })}
              onBeforeToggle={(event) => {
                if (event.target !== event.currentTarget || event.newState !== "open") return;
                if (blockRestorationRef.current) {
                  blockRestorationRef.current = false;
                  event.preventDefault();
                }
              }}
              onCancel={(event) => {
                // Suspense disconnects host refs before the native result is recorded.
                nativeResultDialogRef.current = event.currentTarget;
                if (mode === "prevented") event.preventDefault();
                const next = createRequest();
                if (mode === "canceled") blockRestorationRef.current = true;
                flushSync(() => setRequest(next));
                if (reveal === "instant") {
                  queueMicrotask(() => flushSync(() => setRequest(null)));
                } else if (reveal === "promise") queueMicrotask(next.resolve);
              }}
              onClose={(event) => {
                setNativeCloses((count) => count + 1);
                setResult(event.currentTarget.returnValue);
              }}
              onCloseAutoFocus={() => setCloses((count) => count + 1)}
            >
              <DialogBody>
                {nested ? (
                  <DialogRoot defaultOpen>
                    <DialogContent
                      title={`${name} child`}
                      initialFocusRef={inputRef}
                      onCloseAutoFocus={() => setChildCloses((count) => count + 1)}
                    >
                      <DialogBody>{draft}</DialogBody>
                    </DialogContent>
                  </DialogRoot>
                ) : (
                  draft
                )}
                <NativeCloseLoading request={request} />
                <DialogClose>Close {name}</DialogClose>
              </DialogBody>
            </DialogContent>
          ) : null}
          <NativeCloseLoading request={closeTransition} />
        </DialogRoot>
      </Suspense>
    </section>
  );
}

export function DialogNativeFixtures() {
  return (
    <>
      <CanceledOpening mode="uncontrolled" />
      <CanceledOpening mode="controlled" />
      <CanceledOpening mode="retained" />
      <CanceledReveal />
      <CanceledReopening />
      <RemovedTrigger remove="first" />
      <RemovedTrigger remove="last" />
      <TriggerSession />
      <RequestClose mode="accepted" />
      <RequestClose mode="rejected" />
      <RequestClose mode="prevented" />
      <RequestClose mode="sync-accepted" />
      <RequestClose mode="sync-rejected" />
      <RequestClose mode="sync-reopened" />
      {(["api", "form"] as const).flatMap((source) =>
        (["accepted", "rejected", "fast", "reopened"] as const).map((mode) => (
          <NativeCloseDuringSuspense key={`${source}-${mode}`} source={source} mode={mode} />
        )),
      )}
      {(
        [
          "accepted",
          "rejected",
          "sync-accepted",
          "sync-rejected",
          "reopened",
          "uncontrolled",
          "prevented",
          "blocked",
          "canceled",
          "transition",
        ] as const
      ).map((mode) => (
        <RequestCloseDuringReveal key={mode} mode={mode} />
      ))}
      <RequestCloseDuringReveal mode="accepted" reveal="promise" />
      <RequestCloseDuringReveal mode="rejected" reveal="promise" />
      <RequestCloseDuringReveal mode="accepted" reveal="slow" />
      <RequestCloseDuringReveal mode="rejected" reveal="slow" />
      <RequestCloseDuringReveal mode="sync-rejected" reveal="slow" />
      <RequestCloseDuringReveal mode="accepted" nested />
      <RequestCloseDuringReveal mode="rejected" nested />
    </>
  );
}
