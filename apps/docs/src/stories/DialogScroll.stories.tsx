import {
  Button,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTrigger,
} from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { act, StrictMode, Suspense, use, useRef, useState } from "react";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Components/Dialog",
  component: DialogRoot,
  args: { children: null },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DialogRoot>;

export default meta;
type Story = StoryObj<typeof meta>;
type TransitionProperty = "height" | "paddingBottom" | "borderBottomWidth";

function createRequest() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function LoadingContent({ request }: { request: ReturnType<typeof createRequest> | null }) {
  if (request) use(request.promise);
  return null;
}

function TransitionBody({
  property,
  tabIndex,
  suspend,
}: {
  property: TransitionProperty;
  tabIndex: number | undefined;
  suspend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [present, setPresent] = useState(true);
  const cssProperty = {
    height: "height",
    paddingBottom: "padding-bottom",
    borderBottomWidth: "border-bottom-width",
  }[property];
  return (
    <>
      <DialogBody
        data-testid="transition-body"
        data-explicit-tabindex={tabIndex}
        style={{ height: 160 }}
        {...(tabIndex === undefined ? {} : { tabIndex })}
      >
        <div data-testid="transition-wrapper" style={{ height: 32 }}>
          {present ? (
            <div
              data-testid="transition-content"
              style={{
                boxSizing: "content-box",
                height: 32,
                paddingBottom: 0,
                borderBottom: "0 solid var(--djy-color-stroke-neutral-subtle)",
                transition: `${cssProperty} 2s linear`,
                [property]: expanded ? 600 : property === "height" ? 32 : 0,
              }}
            >
              높이가 변하는 내용
            </div>
          ) : null}
        </div>
        <Button variant="ghost">내용 확인</Button>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => setExpanded(true)}>내용 늘리기</Button>
        <Button onClick={() => setExpanded(false)}>내용 줄이기</Button>
        <Button onClick={() => setPresent(false)}>내용 제거</Button>
        <Button onClick={() => setPresent(true)}>내용 재삽입</Button>
        <Button onClick={suspend}>콘텐츠 일시 숨기기</Button>
        <DialogClose>크기 변경 닫기</DialogClose>
      </DialogFooter>
    </>
  );
}

function TransitionDialog({
  property = "height",
  tabIndex,
  nested = false,
}: {
  property?: TransitionProperty;
  tabIndex?: number;
  nested?: boolean;
}) {
  const [request, setRequest] = useState<ReturnType<typeof createRequest> | null>(null);
  const pendingRequest = useRef<ReturnType<typeof createRequest> | null>(null);
  const contents = (
    <>
      <LoadingContent request={request} />
      <TransitionBody
        property={property}
        tabIndex={tabIndex}
        suspend={() => {
          const next = createRequest();
          pendingRequest.current = next;
          setRequest(next);
        }}
      />
    </>
  );
  return (
    <StrictMode>
      <Suspense
        fallback={<Button onClick={() => pendingRequest.current?.resolve()}>콘텐츠 복원</Button>}
      >
        <DialogRoot>
          <DialogTrigger>크기 변경 Dialog 열기</DialogTrigger>
          <DialogContent title={nested ? "부모 크기 변경" : "크기 변경"}>
            {nested ? (
              <DialogBody data-testid="transition-parent-body" style={{ height: 160 }}>
                <DialogRoot>
                  <DialogTrigger>자식 크기 변경 Dialog 열기</DialogTrigger>
                  <DialogContent title="자식 크기 변경">{contents}</DialogContent>
                </DialogRoot>
              </DialogBody>
            ) : (
              contents
            )}
          </DialogContent>
        </DialogRoot>
      </Suspense>
    </StrictMode>
  );
}

async function pauseTransition(element: HTMLElement, progress: number) {
  await waitFor(() => expect(element.getAnimations()).toHaveLength(1));
  const animation = element.getAnimations()[0];
  if (!animation) throw new Error("크기 transition이 없습니다.");
  animation.pause();
  await animation.ready;
  const duration = animation.effect?.getComputedTiming().duration;
  if (typeof duration !== "number") throw new Error("transition 길이를 확인할 수 없습니다.");
  animation.currentTime = duration * progress;
  return animation;
}

async function clickSuspenseButton(element: HTMLElement) {
  // Await Suspense retries instead of Storybook's synchronous event act wrapper.
  const previousEnvironment = Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  try {
    await act(async () => {
      element.focus();
      fireEvent.click(element);
    });
  } finally {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", previousEnvironment);
  }
}

export const TransitioningContent: Story = {
  render: () => <TransitionDialog />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "크기 변경 Dialog 열기" });
    await userEvent.click(trigger);
    const childTrigger = canvas.queryByRole("button", { name: "자식 크기 변경 Dialog 열기" });
    if (childTrigger) await userEvent.click(childTrigger);
    const body = canvas.getByTestId("transition-body");
    const wrapper = canvas.getByTestId("transition-wrapper");
    const dialog = body.closest("dialog");
    const parentBody = canvas.queryByTestId("transition-parent-body");
    const parent = parentBody?.closest("dialog");
    if (!dialog) throw new Error("스크롤 Dialog가 없습니다.");
    const explicitTabIndex = body.getAttribute("data-explicit-tabindex");
    const assertScroll = async (overflow: boolean) => {
      await waitFor(() => {
        expect(body.scrollHeight > body.clientHeight + 1).toBe(overflow);
        expect(dialog).toHaveAttribute("data-overflow-end", String(overflow));
        expect(body.getAttribute("tabindex")).toBe(explicitTabIndex ?? (overflow ? "0" : null));
      });
      await expect(body.clientHeight).toBe(160);
      await expect(wrapper.clientHeight).toBe(32);
      if (parent) {
        await expect(parent).toHaveAttribute("data-overflow-end", "false");
        await expect(parentBody).not.toHaveAttribute("tabindex");
      }
    };
    await assertScroll(false);

    await step("고정 wrapper 안의 transition 중에도 스크롤과 키보드 접근을 갱신한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "내용 늘리기" }));
      const content = canvas.getByTestId("transition-content");
      const growing = await pauseTransition(content, 0.5);
      await assertScroll(true);
      await expect(growing.playState).toBe("paused");
      growing.finish();
      await growing.finished;

      await clickSuspenseButton(canvas.getByRole("button", { name: "콘텐츠 일시 숨기기" }));
      const reveal = await canvas.findByRole("button", { name: "콘텐츠 복원" });
      await waitFor(() => expect(dialog.matches(":modal")).toBe(false));
      await clickSuspenseButton(reveal);
      await waitFor(() => expect(dialog.matches(":modal")).toBe(true));
      await expect(canvas.getByTestId("transition-content")).toBe(content);
      await assertScroll(true);

      await userEvent.click(canvas.getByRole("button", { name: "내용 줄이기" }));
      const shrinking = await pauseTransition(content, 0.98);
      await assertScroll(false);
      await expect(shrinking.playState).toBe("paused");
      shrinking.finish();
      await shrinking.finished;
    });

    await step("transition 취소와 콘텐츠 제거·재삽입 뒤에도 상태를 갱신한다", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "내용 늘리기" }));
      const growing = await pauseTransition(canvas.getByTestId("transition-content"), 0.5);
      await assertScroll(true);
      growing.cancel();
      await assertScroll(true);
      await userEvent.click(canvas.getByRole("button", { name: "내용 제거" }));
      await assertScroll(false);
      await userEvent.click(canvas.getByRole("button", { name: "내용 줄이기" }));
      await userEvent.click(canvas.getByRole("button", { name: "내용 재삽입" }));
      await assertScroll(false);
      await userEvent.click(canvas.getByRole("button", { name: "내용 늘리기" }));
      const reinserted = await pauseTransition(canvas.getByTestId("transition-content"), 0.5);
      await assertScroll(true);
      reinserted.finish();
      await reinserted.finished;
    });

    await userEvent.click(canvas.getByRole("button", { name: "크기 변경 닫기" }));
    await waitFor(() => expect(dialog.matches(":modal")).toBe(false));
    if (childTrigger) {
      await userEvent.click(childTrigger);
      await waitFor(() =>
        expect(canvas.getByTestId("transition-body")).not.toHaveAttribute("tabindex"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "크기 변경 닫기" }));
      await userEvent.click(canvas.getByRole("button", { name: "닫기" }));
    } else {
      await userEvent.click(trigger);
      await waitFor(() =>
        expect(canvas.getByTestId("transition-body").getAttribute("tabindex")).toBe(
          explicitTabIndex,
        ),
      );
      await userEvent.click(canvas.getByRole("button", { name: "크기 변경 닫기" }));
    }
    await waitFor(() => expect(document.documentElement.style.overflow).toBe(""));
  },
};

export const TransitioningPadding: Story = {
  ...TransitioningContent,
  render: () => <TransitionDialog property="paddingBottom" />,
};

export const TransitioningBorder: Story = {
  ...TransitioningContent,
  render: () => <TransitionDialog property="borderBottomWidth" />,
};

export const ExplicitScrollTabIndex: Story = {
  ...TransitioningContent,
  render: () => <TransitionDialog tabIndex={-1} />,
};

export const NestedTransitioningContent: Story = {
  ...TransitioningContent,
  render: () => <TransitionDialog nested />,
};

export const DarkTransitioningContent: Story = {
  ...TransitioningContent,
  globals: { theme: "dark" },
};
