import {
  Button,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTrigger,
} from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StrictMode, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Components/Dialog",
  component: DialogRoot,
  args: { children: null },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DialogRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

function ProgrammaticReopenExample() {
  const [open, setOpen] = useState(false);
  return (
    <StrictMode>
      <Button onClick={() => setOpen(true)}>상태로 Dialog 열기</Button>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogTrigger>첫 번째 세션 Trigger</DialogTrigger>
        <DialogTrigger>두 번째 세션 Trigger</DialogTrigger>
        <DialogContent title="세션별 포커스 복귀">
          <DialogBody>
            <p>상태로 다시 열면 이전 세션의 Trigger 대신 최근 등록된 Trigger로 복귀합니다.</p>
            <DialogClose>세션 닫기</DialogClose>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </StrictMode>
  );
}

export const ProgrammaticReopen: Story = {
  render: () => <ProgrammaticReopenExample />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const programmatic = canvas.getByRole("button", { name: "상태로 Dialog 열기" });
    const first = canvas.getByRole("button", { name: "첫 번째 세션 Trigger" });
    const last = canvas.getByRole("button", { name: "두 번째 세션 Trigger" });
    const closeAndExpectFocus = async (target: HTMLElement) => {
      await waitFor(() =>
        expect(canvas.getByRole("heading", { name: "세션별 포커스 복귀" })).toHaveFocus(),
      );
      await userEvent.click(canvas.getByRole("button", { name: "세션 닫기" }));
      await waitFor(() => expect(target).toHaveFocus());
    };

    await step(
      "Trigger 클릭 이력이 없어도 상태로 연 세션은 최근 등록된 Trigger로 복귀한다",
      async () => {
        await userEvent.click(programmatic);
        await closeAndExpectFocus(last);
      },
    );
    await step("실제 Trigger로 연 세션의 복귀 대상을 다음 세션에 남기지 않는다", async () => {
      for (const trigger of [first, last, first]) {
        await userEvent.click(trigger);
        await closeAndExpectFocus(trigger);
        await userEvent.click(programmatic);
        await closeAndExpectFocus(last);
      }
    });
  },
};

function CanceledOpeningExample() {
  const blockOpening = useRef(true);
  const [closes, setCloses] = useState(0);
  return (
    <StrictMode>
      <output data-testid="canceled-opening-closes">{closes}</output>
      <DialogRoot>
        <DialogTrigger>열기 재시도</DialogTrigger>
        <DialogContent
          title="열기 취소 후 재시도"
          onBeforeToggle={(event) => {
            if (event.newState === "open" && blockOpening.current) {
              blockOpening.current = false;
              event.preventDefault();
            }
          }}
          onCloseAutoFocus={() => setCloses((count) => count + 1)}
        >
          <DialogBody>
            <p>첫 열기는 취소되고, 다음 시도에서 Dialog가 열립니다.</p>
            <DialogClose>재시도 작업 닫기</DialogClose>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </StrictMode>
  );
}

export const CanceledOpening: Story = {
  render: () => <CanceledOpeningExample />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "열기 재시도" });
    await step("열기 취소는 닫기 콜백과 배경 잠금을 남기지 않는다", async () => {
      await userEvent.click(trigger);
      await waitFor(() => expect(canvasElement.querySelector("dialog:modal")).toBeNull());
      await expect(canvas.getByTestId("canceled-opening-closes")).toHaveTextContent("0");
      await expect(document.documentElement.style.overflow).toBe("");
    });
    await step("다시 열고 닫으면 정상적으로 포커스를 복귀한다", async () => {
      await userEvent.click(trigger);
      await waitFor(() =>
        expect(canvas.getByRole("dialog", { name: "열기 취소 후 재시도" }).matches(":modal")).toBe(
          true,
        ),
      );
      await userEvent.click(canvas.getByRole("button", { name: "재시도 작업 닫기" }));
      await waitFor(() => expect(trigger).toHaveFocus());
      await expect(canvas.getByTestId("canceled-opening-closes")).toHaveTextContent("1");
    });
  },
};

function RemovedTriggerExample({ remove }: { remove: "first" | "last" }) {
  const [removed, setRemoved] = useState(false);
  return (
    <StrictMode>
      <DialogRoot>
        {remove !== "first" || !removed ? <DialogTrigger>첫 번째 열기</DialogTrigger> : null}
        {remove !== "last" || !removed ? <DialogTrigger>마지막 열기</DialogTrigger> : null}
        <DialogContent title="열기 버튼 제거">
          <DialogBody>
            <Button onClick={() => setRemoved(true)}>현재 열기 버튼 제거</Button>
            <DialogClose>제거 작업 닫기</DialogClose>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </StrictMode>
  );
}

export const RemovedFirstTrigger: Story = {
  render: () => <RemovedTriggerExample remove="first" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "첫 번째 열기" }));
    await userEvent.click(canvas.getByRole("button", { name: "현재 열기 버튼 제거" }));
    await userEvent.click(canvas.getByRole("button", { name: "제거 작업 닫기" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "마지막 열기" })).toHaveFocus());
  },
};

export const RemovedLastTrigger: Story = {
  render: () => <RemovedTriggerExample remove="last" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "마지막 열기" }));
    await userEvent.click(canvas.getByRole("button", { name: "현재 열기 버튼 제거" }));
    await userEvent.click(canvas.getByRole("button", { name: "제거 작업 닫기" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "첫 번째 열기" })).toHaveFocus());
  },
};
