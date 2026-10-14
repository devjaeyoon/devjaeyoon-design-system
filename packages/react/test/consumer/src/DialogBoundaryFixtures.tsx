import {
  Button,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTrigger,
  TextField,
} from "@devjaeyoon-design-system/react";
import {
  type ComponentPropsWithRef,
  type RefObject,
  Suspense,
  use,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { DialogNativeFixtures } from "./DialogNativeFixtures.js";

function RootDismissalDialog({
  closedby,
  mode,
}: {
  closedby: "any" | "none";
  mode: "outside-blocked" | "accepted" | "rejected" | "escape-blocked";
}) {
  const name = `${closedby} ${mode} dismissal`;
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [closes, setCloses] = useState(0);
  // Typed spreads model JavaScript/legacy consumers that bypass excess-prop checks.
  const nativeProps: Pick<ComponentPropsWithRef<"dialog">, "closedby"> = { closedby };
  return (
    <section aria-label={`${name} fixture`}>
      <span data-testid={`${name}-requests`}>{requests}</span>
      <span data-testid={`${name}-native-closes`}>{nativeCloses}</span>
      <span data-testid={`${name}-closes`}>{closes}</span>
      <DialogRoot
        open={open}
        closeOnInteractOutside={mode !== "outside-blocked"}
        closeOnEscape={mode !== "escape-blocked"}
        onOpenChange={(next) => {
          if (!next) setRequests((count) => count + 1);
          if (next || mode !== "rejected") setOpen(next);
        }}
      >
        <DialogTrigger>Open {name}</DialogTrigger>
        <DialogContent
          {...nativeProps}
          title={name}
          onClose={() => setNativeCloses((count) => count + 1)}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <TextField label={`${name} draft`} />
            <Button onClick={() => setOpen(false)}>Finish {name}</Button>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function NativeCloseDialog({ mode }: { mode: "api" | "form" | "reopen" | "callback" }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [renders, setRenders] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptCloseRef = useRef(mode === "reopen" || mode === "callback");
  const reopen = () => {
    flushSync(() => setOpen(false));
    flushSync(() => setOpen(true));
  };

  return (
    <section aria-label={`${mode} native close fixture`}>
      <span data-testid={`${mode}-native-requests`}>{requests}</span>
      <span data-testid={`${mode}-native-closes`}>{closes}</span>
      <span data-testid={`${mode}-native-events`}>{nativeCloses}</span>
      <span data-testid={`${mode}-native-open`}>{String(open)}</span>
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRequests((count) => count + 1);
          if (nextOpen || acceptCloseRef.current) setOpen(nextOpen);
        }}
      >
        <DialogTrigger>Open {mode} native close</DialogTrigger>
        <DialogContent
          initialFocusRef={inputRef}
          ref={dialogRef}
          title={`${mode} native close`}
          onClose={() => {
            setNativeCloses((count) => count + 1);
            if (mode === "callback" && !acceptCloseRef.current) {
              acceptCloseRef.current = true;
              reopen();
            }
          }}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <form method="dialog">
              <TextField
                label={`${mode} native draft`}
                ref={inputRef}
                onKeyDown={(event) => {
                  if (event.key !== "F2") return;
                  event.preventDefault();
                  if (mode === "callback") acceptCloseRef.current = false;
                  dialogRef.current?.close();
                  if (mode === "reopen") reopen();
                }}
              />
              <Button type="submit">Submit {mode} native form</Button>
            </form>
            <Button onClick={() => setRenders((count) => count + 1)}>
              Rerender {mode} native {renders}
            </Button>
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => {
                acceptCloseRef.current = true;
                dialogRef.current?.close();
              }}
            >
              Accept {mode} native close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function PortalDialog() {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [selections, setSelections] = useState(0);
  return (
    <DialogRoot closeOnInteractOutside>
      <DialogTrigger>Open portal dialog</DialogTrigger>
      <span data-testid="portal-selections">{selections}</span>
      <DialogContent ref={setDialog} title="Portal dialog">
        <DialogBody>
          <TextField label="Portal draft" />
          {dialog
            ? createPortal(
                <fieldset
                  aria-label="Portaled options"
                  style={{
                    position: "absolute",
                    left: "calc(100% + 8px)",
                    top: 0,
                    width: 160,
                    margin: 0,
                    padding: 0,
                    border: 0,
                  }}
                >
                  <Button onClick={() => setSelections((count) => count + 1)}>
                    Choose portal option
                  </Button>
                </fieldset>,
                dialog,
              )
            : null}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function NestedCloseDialog() {
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [nextOpen, setNextOpen] = useState(false);
  const [parentCloses, setParentCloses] = useState(0);
  const [childCloses, setChildCloses] = useState(0);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const callbackFocusRef = useRef<HTMLButtonElement>(null);
  const useCallbackFocusRef = useRef(false);
  const nextInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDialogElement>(null);

  return (
    <section aria-label="Nested close fixture">
      <Button ref={returnFocusRef}>Nested return target</Button>
      <Button ref={callbackFocusRef}>Nested callback target</Button>
      <span data-testid="nested-parent-closes">{parentCloses}</span>
      <span data-testid="nested-child-closes">{childCloses}</span>
      {!mounted ? (
        <Button
          onClick={() => {
            setOpen(false);
            setChildOpen(false);
            setMounted(true);
          }}
        >
          Remount nested parent
        </Button>
      ) : null}
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setChildOpen(false);
        }}
      >
        <DialogTrigger>Open close parent</DialogTrigger>
        {mounted ? (
          <DialogContent
            ref={parentRef}
            returnFocusRef={returnFocusRef}
            title="Close parent"
            onCloseAutoFocus={() => {
              setParentCloses((count) => count + 1);
              if (useCallbackFocusRef.current) {
                useCallbackFocusRef.current = false;
                callbackFocusRef.current?.focus();
              }
            }}
          >
            <DialogBody>
              <DialogRoot open={childOpen} onOpenChange={setChildOpen}>
                <DialogTrigger>Open close child</DialogTrigger>
                <DialogContent
                  title="Close child"
                  onCloseAutoFocus={() => setChildCloses((count) => count + 1)}
                >
                  <DialogBody>
                    <Button onClick={() => setOpen(false)}>Close parent from child</Button>
                    <Button
                      onClick={() => {
                        setOpen(false);
                        setChildOpen(false);
                      }}
                    >
                      Close both dialogs
                    </Button>
                    <Button onClick={() => parentRef.current?.close()}>Close native parent</Button>
                    <Button onClick={() => setMounted(false)}>Unmount nested parent</Button>
                    <Button
                      onClick={() => {
                        useCallbackFocusRef.current = true;
                        setOpen(false);
                      }}
                    >
                      Close with callback focus
                    </Button>
                    <Button
                      onClick={() => {
                        setOpen(false);
                        setNextOpen(true);
                      }}
                    >
                      Open next dialog
                    </Button>
                  </DialogBody>
                </DialogContent>
              </DialogRoot>
            </DialogBody>
            <DialogFooter>
              <DialogClose>Finish close parent</DialogClose>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </DialogRoot>
      <DialogRoot open={nextOpen} onOpenChange={setNextOpen}>
        <DialogTrigger>Next dialog trigger</DialogTrigger>
        <DialogContent initialFocusRef={nextInputRef} title="Next dialog">
          <DialogBody>
            <TextField label="Next dialog draft" ref={nextInputRef} />
          </DialogBody>
          <DialogFooter>
            <DialogClose>Finish next dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function RejectedParentCloseDialog() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  const [childNativeCloses, setChildNativeCloses] = useState(0);
  const [childCloses, setChildCloses] = useState(0);
  const parentRef = useRef<HTMLDialogElement>(null);
  const closeParent = (cancel: boolean) => {
    const parent = parentRef.current;
    if (!parent) return;
    if (cancel) parent.dispatchEvent(new Event("cancel", { cancelable: false }));
    parent.close();
  };
  const draft = (name: string) => (
    <TextField
      label={`${name} retained draft`}
      onKeyDown={(event) => {
        if (event.key !== "F2" && event.key !== "F3") return;
        event.preventDefault();
        closeParent(event.key === "F3");
      }}
    />
  );
  const childCallbacks = {
    onClose: () => setChildNativeCloses((count) => count + 1),
    onCloseAutoFocus: () => setChildCloses((count) => count + 1),
  };
  return (
    <section aria-label="Rejected parent close fixture">
      <span data-testid="retained-parent-requests">{requests}</span>
      <span data-testid="retained-parent-native-closes">{nativeCloses}</span>
      <span data-testid="retained-child-native-closes">{childNativeCloses}</span>
      <span data-testid="retained-child-closes">{childCloses}</span>
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
          else setRequests((count) => count + 1);
        }}
      >
        <DialogTrigger>Open retained parent</DialogTrigger>
        <DialogContent
          ref={parentRef}
          title="Retained parent"
          onClose={() => setNativeCloses((count) => count + 1)}
        >
          <DialogBody>
            <DialogRoot>
              <DialogTrigger>Open retained child</DialogTrigger>
              <DialogContent title="Retained child" {...childCallbacks}>
                <DialogBody>
                  {draft("Child")}
                  <DialogRoot>
                    <DialogTrigger>Open retained grandchild</DialogTrigger>
                    <DialogContent title="Retained grandchild" {...childCallbacks}>
                      <DialogBody>{draft("Grandchild")}</DialogBody>
                    </DialogContent>
                  </DialogRoot>
                </DialogBody>
              </DialogContent>
            </DialogRoot>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Finish retained parent</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}

function AsyncImageDialog() {
  return (
    <DialogRoot>
      <DialogTrigger>Open async image</DialogTrigger>
      <DialogContent title="Async image">
        <DialogBody data-testid="async-image-body" style={{ height: 160 }}>
          <div style={{ height: 80 }}>
            <img src="/dialog-image.svg" alt="Delayed scroll content" />
          </div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

function KeyboardDialog() {
  const firstRef = useRef<HTMLInputElement>(null);
  return (
    <DialogRoot>
      <DialogTrigger>Open keyboard dialog</DialogTrigger>
      <DialogContent initialFocusRef={firstRef} showCloseButton={false} title="Keyboard dialog">
        <DialogBody>
          <TextField label="First keyboard field" ref={firstRef} />
          <Button disabled>Disabled keyboard action</Button>
          <Button hidden>Hidden keyboard action</Button>
          <TextField label="Second keyboard field" />
        </DialogBody>
        <DialogFooter>
          <DialogClose>Finish keyboard dialog</DialogClose>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function createRequest() {
  let resolve = () => {};
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function RaceDraft({ name, request }: { name: string; request: ReturnType<typeof createRequest> }) {
  use(request.promise);
  return <TextField label={`${name} race draft`} />;
}

function PendingTransition({ request }: { request: ReturnType<typeof createRequest> | null }) {
  if (request) use(request.promise);
  return null;
}

function TransitionDialog() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ReturnType<typeof createRequest> | null>(null);
  const [pending, startTransition] = useTransition();
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const pendingRequestRef = useRef<ReturnType<typeof createRequest> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-label="Pending transition fixture">
      <span data-testid="transition-pending">{String(pending)}</span>
      <span data-testid="transition-requests">{requests}</span>
      <span data-testid="transition-closes">{closes}</span>
      <Suspense fallback={<p>Loading transition</p>}>
        <span data-testid="transition-open">{String(open)}</span>
        <DialogRoot
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) setOpen(true);
            else setRequests((count) => count + 1);
          }}
        >
          <DialogTrigger>Open transition dialog</DialogTrigger>
          <DialogContent
            ref={dialogRef}
            initialFocusRef={inputRef}
            title="Transition dialog"
            onCloseAutoFocus={() => setCloses((count) => count + 1)}
          >
            <DialogBody>
              <TextField
                label="Transition draft"
                ref={inputRef}
                onKeyDown={(event) => {
                  if (event.key !== "F2") return;
                  event.preventDefault();
                  dialogRef.current?.close();
                }}
              />
              <Button
                onClick={() => {
                  const nextRequest = createRequest();
                  pendingRequestRef.current = nextRequest;
                  startTransition(() => {
                    setOpen(false);
                    setRequest(nextRequest);
                  });
                }}
              >
                Begin close transition
              </Button>
              <Button
                onClick={() => {
                  setOpen(true);
                  setRequest(null);
                  pendingRequestRef.current?.resolve();
                }}
              >
                Cancel close transition
              </Button>
              <Button onClick={() => pendingRequestRef.current?.resolve()}>
                Resolve close transition
              </Button>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Finish transition dialog</Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
        {/* Suspend after Dialog has rendered new options, before that render can commit. */}
        <PendingTransition request={request} />
      </Suspense>
    </section>
  );
}

function CloseRaceDialog({ name, controlled = false }: { name: string; controlled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [request, setRequest] = useState(() => {
    const initial = createRequest();
    initial.resolve();
    return initial;
  });
  const [requests, setRequests] = useState(0);
  const [closes, setCloses] = useState(0);
  const [nativeCloses, setNativeCloses] = useState(0);
  return (
    <section aria-label={`${name} close race fixture`}>
      <span data-testid={`${name}-race-requests`}>{requests}</span>
      <span data-testid={`${name}-race-closes`}>{closes}</span>
      <span data-testid={`${name}-race-native-closes`}>{nativeCloses}</span>
      <Suspense
        fallback={
          <div>
            <Button onClick={request.resolve}>Resolve {name} race</Button>
            <Button onClick={() => setOpen(false)}>Cancel {name} race</Button>
            <Button onClick={() => setMounted(false)}>Unmount {name} race</Button>
          </div>
        }
      >
        <DialogRoot
          closeOnEscape={controlled}
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) {
              request.resolve();
              setOpen(true);
            } else setRequests((count) => count + 1);
          }}
        >
          <DialogTrigger>Open {name} race</DialogTrigger>
          {mounted ? (
            <DialogContent
              data-testid={`${name}-race-dialog`}
              title={`${name} close race`}
              onCancel={(event) => {
                if (event.cancelable && name !== "Native") return;
                if (!event.cancelable) event.currentTarget.close();
                setRequest(createRequest());
              }}
              onClose={() => setNativeCloses((count) => count + 1)}
              onCloseAutoFocus={() => setCloses((count) => count + 1)}
            >
              <DialogBody>
                <RaceDraft name={name} request={request} />
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Finish {name} race</Button>
              </DialogFooter>
            </DialogContent>
          ) : null}
        </DialogRoot>
      </Suspense>
    </section>
  );
}

function ViewportContents({
  name,
  long,
  inputRef,
  request,
  reload,
}: {
  name: string;
  long: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  request: ReturnType<typeof createRequest> | null;
  reload: () => void;
}) {
  if (request) use(request.promise);
  return (
    <>
      {name === "Async" ? <TextField autoFocus label="Async competing autofocus" /> : null}
      {long ? (
        Array.from({ length: 40 }, (_, index) => <p key={index}>안내 항목 {index + 1}</p>)
      ) : (
        <p>계정 정보를 입력하세요.</p>
      )}
      <TextField
        label={`${name} viewport draft`}
        ref={inputRef}
        onKeyDown={(event) => {
          if (event.key === "F2") {
            event.preventDefault();
            reload();
          }
        }}
      />
      <p>입력한 내용을 확인하세요.</p>
    </>
  );
}

function ViewportDialog({
  long = false,
  deferred = false,
}: {
  long?: boolean;
  deferred?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [request, setRequest] = useState(() => (deferred ? createRequest() : null));
  const name = deferred ? "Async" : long ? "Long" : "Compact";
  return (
    <Suspense
      fallback={<Button onClick={() => request?.resolve()}>Resolve {name} viewport</Button>}
    >
      <DialogRoot>
        <DialogTrigger>Open {name} viewport</DialogTrigger>
        <DialogContent
          description="변경할 정보를 확인한 뒤 저장하세요."
          initialFocusRef={inputRef}
          title="계정 정보 수정"
          data-testid={`${name}-viewport-dialog`}
        >
          <DialogBody data-testid={`${name}-viewport-body`}>
            <ViewportContents
              name={name}
              long={long}
              inputRef={inputRef}
              request={request}
              reload={() => setRequest(createRequest())}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose>Cancel {name} viewport</DialogClose>
            <Button>변경 사항 저장</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Suspense>
  );
}

export function DialogBoundaryFixtures() {
  return (
    <>
      <DialogNativeFixtures />
      {(["any", "none"] as const).flatMap((closedby) =>
        (["outside-blocked", "accepted", "rejected", "escape-blocked"] as const).map((mode) => (
          <RootDismissalDialog key={`${closedby}-${mode}`} closedby={closedby} mode={mode} />
        )),
      )}
      <PortalDialog />
      <NestedCloseDialog />
      <RejectedParentCloseDialog />
      <AsyncImageDialog />
      <KeyboardDialog />
      <NativeCloseDialog mode="api" />
      <NativeCloseDialog mode="form" />
      <NativeCloseDialog mode="reopen" />
      <NativeCloseDialog mode="callback" />
      <TransitionDialog />
      <CloseRaceDialog name="Blocked" />
      <CloseRaceDialog name="Controlled" controlled />
      <CloseRaceDialog name="Native" controlled />
      <DialogRoot>
        <DialogTrigger>Open race parent</DialogTrigger>
        <DialogContent title="Race parent">
          <DialogBody>
            <CloseRaceDialog name="Nested" />
          </DialogBody>
        </DialogContent>
      </DialogRoot>
      <ViewportDialog />
      <ViewportDialog long />
      <ViewportDialog long deferred />
    </>
  );
}
