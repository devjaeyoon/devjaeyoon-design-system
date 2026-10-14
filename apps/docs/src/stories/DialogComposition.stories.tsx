import {
  Button,
  DialogBody,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  TextField,
} from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StrictMode, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Components/Dialog",
  component: DialogRoot,
  args: { children: null },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DialogRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

function PortalExample() {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [selections, setSelections] = useState(0);
  return (
    <DialogRoot closeOnInteractOutside>
      <DialogTrigger>Portal Dialog 열기</DialogTrigger>
      <DialogContent ref={setDialog} title="Portal 상호작용">
        <DialogBody>
          <TextField label="입력 내용" />
          <p>선택 횟수: {selections}</p>
          {dialog
            ? createPortal(
                <fieldset
                  aria-label="Portal 선택 항목"
                  style={{
                    position: "absolute",
                    left: "calc(100% + 8px)",
                    top: 0,
                    width: 160,
                    margin: 0,
                    padding: 8,
                    border: 0,
                    borderRadius: 8,
                    background: "var(--djy-color-bg-elevated)",
                  }}
                >
                  <Button onClick={() => setSelections((count) => count + 1)}>항목 선택</Button>
                </fieldset>,
                dialog,
              )
            : null}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

export const PortaledContent: Story = {
  render: () => <PortalExample />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Portal Dialog 열기" }));
    const dialog = canvas.getByRole("dialog", { name: "Portal 상호작용" });
    const input = canvas.getByRole("textbox", { name: "입력 내용" });
    const option = canvas.getByRole("button", { name: "항목 선택" });
    const surface = dialog.querySelector(".djy-dialog__surface");
    if (!surface) throw new Error("Dialog surface가 없습니다.");
    await userEvent.type(input, "작성 중인 내용");

    await step("본문 밖으로 펼쳐진 Portal을 클릭해도 모달과 입력을 유지한다", async () => {
      await expect(option.getBoundingClientRect().left).toBeGreaterThan(
        surface.getBoundingClientRect().right,
      );
      await userEvent.click(option);
      await expect(dialog.matches(":modal")).toBe(true);
      await expect(canvas.getByText("선택 횟수: 1")).toBeInTheDocument();
      await expect(input).toHaveValue("작성 중인 내용");
    });
  },
};

export const DarkPortaledContent: Story = { ...PortaledContent, globals: { theme: "dark" } };

function NestedCloseExample({ mode }: { mode: "parent" | "both" | "native" | "unmount" }) {
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [parentCloses, setParentCloses] = useState(0);
  const [childCloses, setChildCloses] = useState(0);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const parentRef = useRef<HTMLDialogElement>(null);
  return (
    <StrictMode>
      <Button ref={returnFocusRef}>작업 후 이동 위치</Button>
      <output data-testid="parent-closes">{parentCloses}</output>
      <output data-testid="child-closes">{childCloses}</output>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogTrigger>중첩 작업 열기</DialogTrigger>
        {mounted ? (
          <DialogContent
            ref={parentRef}
            returnFocusRef={returnFocusRef}
            title="부모 작업"
            onCloseAutoFocus={() => setParentCloses((count) => count + 1)}
          >
            <DialogBody>
              <DialogRoot open={childOpen} onOpenChange={setChildOpen}>
                <DialogContent
                  title="자식 작업"
                  onCloseAutoFocus={() => setChildCloses((count) => count + 1)}
                >
                  <DialogBody>
                    <Button
                      onClick={() => {
                        if (mode === "native") parentRef.current?.close();
                        else if (mode === "unmount") setMounted(false);
                        else {
                          setOpen(false);
                          if (mode === "both") setChildOpen(false);
                        }
                      }}
                    >
                      작업 완료
                    </Button>
                  </DialogBody>
                </DialogContent>
              </DialogRoot>
            </DialogBody>
          </DialogContent>
        ) : null}
      </DialogRoot>
    </StrictMode>
  );
}

export const NestedParentClose: Story = {
  render: () => <NestedCloseExample mode="parent" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "중첩 작업 열기" }));
    const child = canvas.getByRole("dialog", { name: "자식 작업" });
    await waitFor(() => expect(child.matches(":modal")).toBe(true));
    await userEvent.click(canvas.getByRole("button", { name: "작업 완료" }));
    await waitFor(() => expect(canvas.getByTestId("parent-closes")).toHaveTextContent("1"));
    await waitFor(() => expect(canvas.getByTestId("child-closes")).toHaveTextContent("1"));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "작업 후 이동 위치" })).toHaveFocus(),
    );
    await expect(canvasElement.querySelectorAll("dialog:modal")).toHaveLength(0);
    await expect(document.documentElement.style.overflow).toBe("");
    await expect(document.body.style.overflow).toBe("");
  },
};

export const NestedSimultaneousClose: Story = {
  ...NestedParentClose,
  render: () => <NestedCloseExample mode="both" />,
};

export const NestedNativeParentClose: Story = {
  ...NestedParentClose,
  render: () => <NestedCloseExample mode="native" />,
};

export const NestedParentUnmount: Story = {
  ...NestedParentClose,
  render: () => <NestedCloseExample mode="unmount" />,
};
