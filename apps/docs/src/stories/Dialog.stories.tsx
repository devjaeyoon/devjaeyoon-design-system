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
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

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
