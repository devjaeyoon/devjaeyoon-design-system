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
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StrictMode, useRef, useState } from "react";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Components/Dialog",
  component: DialogRoot,
  args: { children: null },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DialogRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

function fireNativeCancel(dialog: HTMLElement) {
  const EventConstructor = dialog.ownerDocument.defaultView?.Event ?? Event;
  fireEvent(dialog, new EventConstructor("cancel", { cancelable: true }));
}

export const Default: Story = {
  render: () => (
    <DialogRoot>
      <DialogTrigger>Dialog 열기</DialogTrigger>
      <DialogContent description="필요한 내용을 확인한 뒤 닫을 수 있습니다." title="운동 안내">
        <DialogBody>
          <p style={{ margin: 0 }}>오늘의 운동 기록은 이 기기에 자동으로 저장됩니다.</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose>확인</DialogClose>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Dialog 열기" });
    await userEvent.click(trigger);
    const dialog = canvas.getByRole("dialog", { name: "운동 안내" });

    await step("제목으로 초기 포커스를 옮기고 설명을 연결한다", async () => {
      await waitFor(() => expect(dialog).toHaveAttribute("open"));
      await expect(dialog).toHaveAccessibleDescription("필요한 내용을 확인한 뒤 닫을 수 있습니다.");
      await expect(canvas.getByRole("heading", { name: "운동 안내" })).toHaveFocus();
    });

    await step("Escape로 닫고 Trigger로 포커스를 복귀한다", async () => {
      fireNativeCancel(dialog);
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  },
};

function FormDialog() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedName, setSavedName] = useState("");
  return (
    <>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogTrigger>템플릿 저장</DialogTrigger>
        <DialogContent
          description="앞뒤 공백을 제외하고 1~50자로 입력해 주세요."
          initialFocusRef={inputRef}
          showCloseButton={false}
          title="템플릿으로 저장"
        >
          <DialogBody>
            <form
              id="template-form"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setSavedName(String(data.get("name") ?? ""));
                setOpen(false);
              }}
            >
              <TextField label="템플릿 이름" name="name" ref={inputRef} required />
            </form>
          </DialogBody>
          <DialogFooter>
            <DialogClose>취소</DialogClose>
            <Button form="template-form" type="submit">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <p aria-live="polite">{savedName ? `${savedName} 저장 완료` : ""}</p>
    </>
  );
}

export const Form: Story = {
  render: () => <FormDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "템플릿 저장" }));
    const input = canvas.getByRole("textbox", { name: "템플릿 이름 (필수)" });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.type(input, "하체 루틴");
    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    await expect(canvas.getByText("하체 루틴 저장 완료")).toBeInTheDocument();
  },
};

function ControlledEscapeDialog() {
  const [open, setOpen] = useState(false);
  const [closeRequests, setCloseRequests] = useState(0);
  const [closeCount, setCloseCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <span data-testid="controlled-close-requests">{closeRequests}</span>
      <span data-testid="controlled-close-count">{closeCount}</span>
      <DialogRoot
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
          else setCloseRequests((count) => count + 1);
        }}
      >
        <DialogTrigger>작업 Dialog 열기</DialogTrigger>
        <DialogContent
          initialFocusRef={inputRef}
          onCloseAutoFocus={() => setCloseCount((count) => count + 1)}
          title="작업 완료까지 유지"
        >
          <DialogBody>
            <TextField label="작업 내용" ref={inputRef} />
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>작업 완료</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}

export const ControlledEscape: Story = {
  render: () => <ControlledEscapeDialog />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "작업 Dialog 열기" });
    await userEvent.click(trigger);
    const dialog = canvas.getByRole("dialog", { name: "작업 완료까지 유지" });
    const input = canvas.getByRole("textbox", { name: "작업 내용" });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.type(input, "진행 중인 작업");

    await step("부모가 닫기 요청을 수락하지 않으면 열린 상태를 유지한다", async () => {
      fireNativeCancel(dialog);
      await expect(canvas.getByTestId("controlled-close-requests")).toHaveTextContent("1");
      await expect(dialog).toHaveAttribute("open");
    });

    await step("취소할 수 없는 native 닫기에서도 세션과 입력 포커스를 유지한다", async () => {
      const EventConstructor = dialog.ownerDocument.defaultView?.Event ?? Event;
      fireEvent(dialog, new EventConstructor("cancel", { cancelable: false }));
      // Simulate the browser's unavoidable default action after a non-cancelable cancel.
      if (!(dialog instanceof HTMLDialogElement)) throw new Error("Expected a native dialog.");
      dialog.close();
      await waitFor(() => expect(dialog).toHaveAttribute("open"));
      await expect(dialog.matches(":modal")).toBe(true);
      await expect(canvas.getByTestId("controlled-close-requests")).toHaveTextContent("2");
      await expect(canvas.getByTestId("controlled-close-count")).toHaveTextContent("0");
      await expect(dialog.ownerDocument.documentElement.style.overflow).toBe("hidden");
      await expect(input).toHaveValue("진행 중인 작업");
      await expect(input).toHaveFocus();
    });

    await step("부모가 open을 false로 변경하면 한 번 닫고 포커스를 복귀한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "작업 완료" }));
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      await expect(canvas.getByTestId("controlled-close-count")).toHaveTextContent("1");
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  },
};

export const Scrollable: Story = {
  render: () => (
    <DialogRoot defaultOpen>
      <DialogContent
        description="본문만 스크롤되고 제목과 작업은 유지됩니다."
        size="large"
        title="긴 운동 기록"
      >
        <DialogBody>
          {Array.from({ length: 24 }, (_, index) => (
            <p key={index}>세트 {index + 1}: 중량과 횟수, 휴식 시간을 확인합니다.</p>
          ))}
        </DialogBody>
        <DialogFooter>
          <DialogClose>닫기</DialogClose>
          <Button>오늘로 불러오기</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  ),
};

function TextUpdateDialog({ nested = false }: { nested?: boolean }) {
  const [longText, setLongText] = useState(false);
  const text = longText
    ? "운동 기록의 중량과 횟수를 확인합니다.\n".repeat(40)
    : "짧은 운동 기록입니다.";

  return (
    <DialogRoot>
      <DialogTrigger>본문 갱신 Dialog 열기</DialogTrigger>
      <DialogContent title="본문 갱신">
        <DialogBody data-testid="dynamic-text-body" style={{ height: 160, whiteSpace: "pre-wrap" }}>
          {nested ? (
            <div style={{ height: 80 }}>
              <p style={{ margin: 0 }}>{text}</p>
            </div>
          ) : (
            text
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setLongText(true)}>본문 늘리기</Button>
          <Button onClick={() => setLongText(false)}>본문 줄이기</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export const DynamicText: Story = {
  render: () => <TextUpdateDialog />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "본문 갱신 Dialog 열기" }));
    const dialog = canvas.getByRole("dialog", { name: "본문 갱신" });
    const body = canvas.getByTestId("dynamic-text-body");
    const textContainer = body.querySelector("p") ?? body;
    const textNode = textContainer.firstChild;
    const bodyHeight = body.clientHeight;
    const wrapper = body.firstElementChild;
    const wrapperHeight = wrapper?.clientHeight;
    const header = dialog.querySelector<HTMLElement>(".djy-dialog__header");
    const fog = dialog.querySelector<HTMLElement>(".djy-dialog__scroll-fog");
    if (!header || !fog) throw new Error("스크롤 표시 요소가 없습니다.");
    const transparentBorder = getComputedStyle(header).borderBottomColor;

    await step("기존 텍스트 노드만 길어져도 스크롤 표시와 키보드 접근을 갱신한다", async () => {
      await waitFor(() => expect(dialog).toHaveAttribute("data-overflow-end", "false"));
      await expect(body).not.toHaveAttribute("tabindex");
      await userEvent.click(canvas.getByRole("button", { name: "본문 늘리기" }));
      await expect(textContainer.firstChild).toBe(textNode);
      await expect(body.clientHeight).toBe(bodyHeight);
      await expect(wrapper?.clientHeight).toBe(wrapperHeight);
      await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      await waitFor(() => expect(dialog).toHaveAttribute("data-overflow-end", "true"));
      await expect(body).toHaveAttribute("tabindex", "0");
      await expect(getComputedStyle(fog).backgroundImage).not.toBe("none");

      body.scrollTop = 24;
      fireEvent.scroll(body);
      await expect(dialog).toHaveAttribute("data-scrolled-start", "true");
      await expect(getComputedStyle(header).borderBottomColor).not.toBe(transparentBorder);
    });

    await step("텍스트가 다시 짧아지면 스크롤 표시와 자동 tabindex를 제거한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "본문 줄이기" }));
      await expect(textContainer.firstChild).toBe(textNode);
      await waitFor(() => expect(dialog).toHaveAttribute("data-overflow-end", "false"));
      await expect(dialog).toHaveAttribute("data-scrolled-start", "false");
      await expect(body).not.toHaveAttribute("tabindex");
      await expect(getComputedStyle(header).borderBottomColor).toBe(transparentBorder);
      await expect(getComputedStyle(fog).backgroundImage).toBe("none");
    });

    fireNativeCancel(dialog);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  },
};

export const NestedDynamicText: Story = {
  ...DynamicText,
  render: () => <TextUpdateDialog nested />,
};

function DialogLifecycleStory() {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [closeCount, setCloseCount] = useState(0);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const invalidReturnFocusRef = useRef<HTMLSpanElement>(null);
  const reopenOnCloseRef = useRef(false);

  return (
    <StrictMode>
      <span ref={invalidReturnFocusRef}>포커스를 받을 수 없는 복귀 대상</span>
      <span data-testid="close-count">{closeCount}</span>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogTrigger>수명 주기 Dialog 열기</DialogTrigger>
        {mounted ? (
          <DialogContent
            initialFocusRef={initialFocusRef}
            onCloseAutoFocus={() => {
              setCloseCount((count) => count + 1);
              if (reopenOnCloseRef.current) {
                reopenOnCloseRef.current = false;
                setOpen(true);
              }
            }}
            returnFocusRef={invalidReturnFocusRef}
            title="수명 주기 확인"
          >
            <DialogBody>
              <Button ref={initialFocusRef}>초기 포커스 대상</Button>
              <Button
                onClick={() => {
                  reopenOnCloseRef.current = true;
                  setOpen(false);
                }}
              >
                닫고 즉시 다시 열기
              </Button>
              <Button onClick={() => setMounted(false)}>열린 Content 제거</Button>
            </DialogBody>
          </DialogContent>
        ) : null}
      </DialogRoot>
    </StrictMode>
  );
}

export const FocusLifecycle: Story = {
  render: () => <DialogLifecycleStory />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole("dialog", { name: "수명 주기 확인" });
    const initialTarget = canvas.getByRole("button", { name: "초기 포커스 대상" });
    const trigger = canvas.getByRole("button", { name: "수명 주기 Dialog 열기" });
    const closeCount = canvas.getByTestId("close-count");

    await step("StrictMode의 재실행은 닫힘으로 처리하지 않는다", async () => {
      await waitFor(() => expect(dialog).toHaveAttribute("open"));
      await waitFor(() => expect(initialTarget).toHaveFocus());
      await expect(closeCount).toHaveTextContent("0");
    });

    await step("빠르게 다시 열 때 이전 복귀 작업이 새 포커스를 덮지 않는다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "닫고 즉시 다시 열기" }));
      await waitFor(() => expect(closeCount).toHaveTextContent("1"));
      await waitFor(() => expect(dialog).toHaveAttribute("open"));
      await waitFor(() =>
        expect(canvas.getByRole("button", { name: "초기 포커스 대상" })).toHaveFocus(),
      );
    });

    await step("열린 Content가 제거되어도 한 번 닫고 Trigger로 복귀한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "열린 Content 제거" }));
      await waitFor(() => expect(closeCount).toHaveTextContent("2"));
      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  },
};

export const Nested: Story = {
  render: () => (
    <DialogRoot>
      <DialogTrigger>부모 Dialog 열기</DialogTrigger>
      <DialogContent title="부모 Dialog">
        <DialogBody>
          <p style={{ marginBlockStart: 0 }}>부모 작업을 진행하고 있습니다.</p>
          <DialogRoot>
            <DialogTrigger>자식 Dialog 열기</DialogTrigger>
            <DialogContent title="자식 Dialog">
              <DialogBody>자식 작업을 먼저 완료합니다.</DialogBody>
            </DialogContent>
          </DialogRoot>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const parentTrigger = canvas.getByRole("button", { name: "부모 Dialog 열기" });
    await userEvent.click(parentTrigger);
    const parentDialog = canvas.getByRole("dialog", { name: "부모 Dialog" });
    await waitFor(() => expect(parentDialog).toHaveAttribute("open"));

    const childTrigger = canvas.getByRole("button", { name: "자식 Dialog 열기" });
    await userEvent.click(childTrigger);
    const childDialog = canvas.getByRole("dialog", { name: "자식 Dialog" });
    await waitFor(() => expect(childDialog).toHaveAttribute("open"));

    await step("Escape는 맨 위 자식만 닫고 부모 안으로 복귀한다", async () => {
      fireNativeCancel(childDialog);
      await waitFor(() => expect(childDialog).not.toHaveAttribute("open"));
      await expect(parentDialog).toHaveAttribute("open");
      await waitFor(() => expect(childTrigger).toHaveFocus());
    });

    await step("다음 Escape는 부모를 닫고 바깥 Trigger로 복귀한다", async () => {
      fireNativeCancel(parentDialog);
      await waitFor(() => expect(parentDialog).not.toHaveAttribute("open"));
      await waitFor(() => expect(parentTrigger).toHaveFocus());
    });
  },
};

function NestedScrollDialog() {
  const [longChild, setLongChild] = useState(false);

  return (
    <DialogRoot>
      <DialogTrigger>스크롤 부모 열기</DialogTrigger>
      <DialogContent title="스크롤 부모">
        <DialogBody data-testid="scroll-parent-body" style={{ maxHeight: 240 }}>
          <DialogRoot>
            <DialogTrigger>스크롤 자식 열기</DialogTrigger>
            <DialogContent title="스크롤 자식">
              <div>
                <DialogBody data-testid="scroll-child-body" style={{ maxHeight: 200 }}>
                  <Button onClick={() => setLongChild(true)}>자식 본문 늘리기</Button>
                  {longChild ? (
                    Array.from({ length: 20 }, (_, index) => (
                      <p key={index}>자식 기록 {index + 1}</p>
                    ))
                  ) : (
                    <p>짧은 자식 본문입니다.</p>
                  )}
                </DialogBody>
              </div>
            </DialogContent>
          </DialogRoot>
          {Array.from({ length: 20 }, (_, index) => (
            <p key={index}>부모 기록 {index + 1}</p>
          ))}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

export const NestedScroll: Story = {
  render: () => <NestedScrollDialog />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "스크롤 부모 열기" }));
    const parentDialog = canvas.getByRole("dialog", { name: "스크롤 부모" });
    const parentBody = canvas.getByTestId("scroll-parent-body");
    const parentHeader = parentDialog.querySelector<HTMLElement>(".djy-dialog__header");
    const parentFog = parentDialog.querySelector<HTMLElement>(".djy-dialog__scroll-fog");
    if (!parentHeader || !parentFog) throw new Error("부모 스크롤 표시 요소가 없습니다.");
    const transparentBorder = getComputedStyle(parentHeader).borderBottomColor;

    await step("부모의 스크롤 표시가 짧은 자식에 적용되지 않는다", async () => {
      await waitFor(() => expect(parentDialog).toHaveAttribute("data-overflow-end", "true"));
      parentBody.scrollTop = 16;
      fireEvent.scroll(parentBody);
      await userEvent.click(canvas.getByRole("button", { name: "스크롤 자식 열기" }));
      const childDialog = canvas.getByRole("dialog", { name: "스크롤 자식" });
      const childHeader = childDialog.querySelector<HTMLElement>(".djy-dialog__header");
      const childFog = childDialog.querySelector<HTMLElement>(".djy-dialog__scroll-fog");
      if (!childHeader || !childFog) throw new Error("자식 스크롤 표시 요소가 없습니다.");

      parentBody.scrollTop = 16;
      fireEvent.scroll(parentBody);
      await waitFor(() => expect(parentDialog).toHaveAttribute("data-scrolled-start", "true"));
      await expect(parentDialog).toHaveAttribute("data-overflow-end", "true");
      await waitFor(() => expect(childDialog).toHaveAttribute("data-scrolled-start", "false"));
      await expect(childDialog).toHaveAttribute("data-overflow-end", "false");
      await expect(getComputedStyle(parentHeader).borderBottomColor).not.toBe(transparentBorder);
      await expect(getComputedStyle(parentFog).backgroundImage).not.toBe("none");
      await expect(getComputedStyle(childHeader).borderBottomColor).toBe(transparentBorder);
      await expect(getComputedStyle(childFog).backgroundImage).toBe("none");
    });

    await step("감싼 자식 본문도 자체 스크롤 상태에 따라 표시한다", async () => {
      const childDialog = canvas.getByRole("dialog", { name: "스크롤 자식" });
      const childBody = canvas.getByTestId("scroll-child-body");
      const childHeader = childDialog.querySelector<HTMLElement>(".djy-dialog__header");
      const childFog = childDialog.querySelector<HTMLElement>(".djy-dialog__scroll-fog");
      if (!childHeader || !childFog) throw new Error("자식 스크롤 표시 요소가 없습니다.");

      await userEvent.click(canvas.getByRole("button", { name: "자식 본문 늘리기" }));
      await waitFor(() => expect(childDialog).toHaveAttribute("data-overflow-end", "true"));
      childBody.scrollTop = 16;
      fireEvent.scroll(childBody);
      await waitFor(() => expect(childDialog).toHaveAttribute("data-scrolled-start", "true"));
      parentBody.scrollTop = 0;
      fireEvent.scroll(parentBody);

      await expect(parentDialog).toHaveAttribute("data-scrolled-start", "false");
      await expect(getComputedStyle(parentHeader).borderBottomColor).toBe(transparentBorder);
      await expect(getComputedStyle(childHeader).borderBottomColor).not.toBe(transparentBorder);
      await expect(getComputedStyle(childFog).backgroundImage).not.toBe("none");

      parentBody.scrollTop = parentBody.scrollHeight;
      fireEvent.scroll(parentBody);
      await expect(parentDialog).toHaveAttribute("data-overflow-end", "false");
      await expect(getComputedStyle(parentFog).backgroundImage).toBe("none");
      await expect(getComputedStyle(childFog).backgroundImage).not.toBe("none");
    });

    fireNativeCancel(canvas.getByRole("dialog", { name: "스크롤 자식" }));
    await waitFor(() => expect(canvas.queryByRole("dialog", { name: "스크롤 자식" })).toBeNull());
    fireNativeCancel(parentDialog);
    await waitFor(() => expect(parentDialog).not.toHaveAttribute("open"));
  },
};

export const NestedInitiallyOpen: Story = {
  render: () => (
    <StrictMode>
      <DialogRoot defaultOpen>
        <DialogTrigger>초기 부모 Dialog 열기</DialogTrigger>
        <DialogContent title="초기 부모 Dialog">
          <DialogBody>
            <DialogRoot defaultOpen>
              <DialogTrigger>초기 자식 Dialog 열기</DialogTrigger>
              <DialogContent title="초기 자식 Dialog">
                <DialogBody>두 Dialog가 함께 열려도 자식부터 작업합니다.</DialogBody>
              </DialogContent>
            </DialogRoot>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </StrictMode>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const parentDialog = canvas.getByRole("dialog", { name: "초기 부모 Dialog" });
    const childDialog = canvas.getByRole("dialog", { name: "초기 자식 Dialog" });

    await step("동시에 열린 자식이 초기 포커스를 받는다", async () => {
      await waitFor(() => expect(parentDialog).toHaveAttribute("open"));
      await waitFor(() => expect(childDialog).toHaveAttribute("open"));
      await waitFor(() =>
        expect(canvas.getByRole("heading", { name: "초기 자식 Dialog" })).toHaveFocus(),
      );
    });

    await step("자식만 닫고 부모의 Trigger로 복귀한다", async () => {
      fireNativeCancel(childDialog);
      await waitFor(() => expect(childDialog).not.toHaveAttribute("open"));
      await expect(parentDialog).toHaveAttribute("open");
      await waitFor(() =>
        expect(canvas.getByRole("button", { name: "초기 자식 Dialog 열기" })).toHaveFocus(),
      );
      await expect(parentDialog.ownerDocument.documentElement.style.overflow).toBe("hidden");
    });

    await step("부모까지 닫으면 바깥 Trigger로 복귀한다", async () => {
      fireNativeCancel(parentDialog);
      await waitFor(() => expect(parentDialog).not.toHaveAttribute("open"));
      await waitFor(() =>
        expect(canvas.getByRole("button", { name: "초기 부모 Dialog 열기" })).toHaveFocus(),
      );
    });
  },
};

function createRefSpy() {
  const cleanup = fn<() => void>();
  const setup = fn((element: HTMLElement | null) => {
    if (element) return cleanup;
  });
  return { setup, cleanup };
}

const refSpies = {
  trigger: createRefSpy(),
  content: createRefSpy(),
  body: createRefSpy(),
};

function RefCleanupDialog() {
  const [mounted, setMounted] = useState(true);
  const [renders, setRenders] = useState(0);
  return (
    <StrictMode>
      {mounted ? (
        <DialogRoot defaultOpen>
          <DialogTrigger ref={refSpies.trigger.setup}>Ref Dialog 열기</DialogTrigger>
          <DialogContent ref={refSpies.content.setup} title="Ref 수명 주기">
            <DialogBody ref={refSpies.body.setup}>
              <Button onClick={() => setRenders((count) => count + 1)}>
                다시 렌더링 {renders}
              </Button>
              <Button onClick={() => setMounted(false)}>Ref 요소 제거</Button>
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      ) : (
        <p>Ref 요소가 제거되었습니다.</p>
      )}
    </StrictMode>
  );
}

export const RefCleanup: Story = {
  render: () => <RefCleanupDialog />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole("heading", { name: "Ref 수명 주기" })).toHaveFocus(),
    );
    const spies = Object.values(refSpies);
    const before = spies.map(({ setup, cleanup }) => ({
      setups: setup.mock.calls.length,
      cleanups: cleanup.mock.calls.length,
    }));

    await step("StrictMode에서도 각 ref는 하나의 연결만 유지한다", async () => {
      for (const { setup, cleanup } of spies) {
        await expect(setup.mock.calls.every(([element]) => element !== null)).toBe(true);
        await expect(setup.mock.calls.length - cleanup.mock.calls.length).toBe(1);
      }
    });

    await step("같은 ref로 다시 렌더링하면 다시 연결하지 않는다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "다시 렌더링 0" }));
      await expect(canvas.getByRole("button", { name: "다시 렌더링 1" })).toBeInTheDocument();
      await expect(
        spies.map(({ setup, cleanup }) => ({
          setups: setup.mock.calls.length,
          cleanups: cleanup.mock.calls.length,
        })),
      ).toEqual(before);
    });

    await step("제거할 때 null 대신 반환한 cleanup을 호출한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Ref 요소 제거" }));
      await expect(canvas.getByText("Ref 요소가 제거되었습니다.")).toBeInTheDocument();
      for (const { setup, cleanup } of spies) {
        await expect(setup.mock.calls.every(([element]) => element !== null)).toBe(true);
        await expect(setup.mock.calls.length - cleanup.mock.calls.length).toBe(0);
      }
    });
  },
};
