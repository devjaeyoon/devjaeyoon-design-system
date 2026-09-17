import type { ButtonProps } from "@devjaeyoon-design-system/react";
import { Button, IconButton } from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, createRef, useId, useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

const buttonRowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
};

function LoadingTransitionExample({ onSave }: { onSave: ButtonProps["onClick"] }) {
  const [loading, setLoading] = useState(false);

  return (
    <div style={buttonRowStyle}>
      <Button variant="ghost">이전</Button>
      <Button
        loading={loading}
        onClick={(event) => {
          onSave?.(event);
          setLoading(true);
        }}
      >
        저장
      </Button>
      <Button onClick={() => setLoading(false)} variant="secondary">
        작업 완료
      </Button>
    </div>
  );
}

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    children: "저장",
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "outline", "ghost"],
    },
    tone: { control: "inline-radio", options: ["default", "danger"] },
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const KeyboardNavigation: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => (
    <div style={buttonRowStyle}>
      <Button variant="ghost">이전</Button>
      <Button {...args}>저장</Button>
      <Button disabled onClick={args.onClick}>
        비활성
      </Button>
      <Button loading onClick={args.onClick}>
        로딩 중
      </Button>
      <Button variant="ghost">다음</Button>
    </div>
  ),
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const previousButton = canvas.getByRole("button", { name: "이전" });
    const saveButton = canvas.getByRole("button", { name: "저장" });
    const disabledButton = canvas.getByRole("button", { name: "비활성" });
    const loadingButton = canvas.getByRole("button", { name: /로딩 중/u });
    const nextButton = canvas.getByRole("button", { name: "다음" });

    await step("Tab과 Shift+Tab으로 활성 버튼 사이를 이동한다", async () => {
      previousButton.focus();
      await expect(previousButton).toHaveFocus();

      await userEvent.tab();
      await expect(saveButton).toHaveFocus();

      await userEvent.tab();
      await expect(nextButton).toHaveFocus();

      await userEvent.tab({ shift: true });
      await expect(saveButton).toHaveFocus();
    });

    await step("Enter와 Space로 버튼을 실행한다", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(args.onClick).toHaveBeenCalledTimes(1);

      await userEvent.keyboard(" ");
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });

    await step("disabled와 loading 버튼은 실행되지 않는다", async () => {
      await expect(disabledButton).toBeDisabled();
      await expect(loadingButton).toBeDisabled();
      await expect(loadingButton).toHaveAttribute("aria-busy", "true");

      await userEvent.click(disabledButton);
      await userEvent.click(loadingButton);
      await expect(args.onClick).toHaveBeenCalledTimes(2);

      previousButton.focus();
      await userEvent.tab();
      await userEvent.tab();
      await expect(nextButton).toHaveFocus();

      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

export const LoadingTransition: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => <LoadingTransitionExample onSave={args.onClick} />,
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const previousButton = canvas.getByRole("button", { name: "이전" });
    const saveButton = canvas.getByRole("button", { name: "저장" });
    const completeButton = canvas.getByRole("button", { name: "작업 완료" });

    await step("저장하면 loading 상태로 전환한다", async () => {
      await userEvent.click(saveButton);
      await expect(args.onClick).toHaveBeenCalledTimes(1);
      await expect(saveButton).toBeDisabled();
      await expect(saveButton).toHaveAttribute("aria-busy", "true");
    });

    await step("loading 중에는 추가 실행과 Tab 접근을 차단한다", async () => {
      await userEvent.click(saveButton);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      await expect(args.onClick).toHaveBeenCalledTimes(1);

      previousButton.focus();
      await userEvent.tab();
      await expect(completeButton).toHaveFocus();
    });

    await step("완료 후 키보드로 다시 실행할 수 있다", async () => {
      await userEvent.click(completeButton);
      await expect(saveButton).not.toBeDisabled();
      await expect(saveButton).not.toHaveAttribute("aria-busy");

      previousButton.focus();
      await userEvent.tab();
      await expect(saveButton).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(args.onClick).toHaveBeenCalledTimes(2);

      await userEvent.click(completeButton);
      previousButton.focus();
      await userEvent.tab();
      await userEvent.keyboard(" ");
      await expect(args.onClick).toHaveBeenCalledTimes(3);

      await userEvent.click(completeButton);
      await expect(saveButton).not.toBeDisabled();
    });
  },
};

export const DarkTheme: Story = {
  args: {
    variant: "secondary",
  },
  globals: {
    theme: "dark",
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={buttonRowStyle}>
      <Button {...args} size="small">
        Small
      </Button>
      <Button {...args} size="medium">
        Medium
      </Button>
      <Button {...args} size="large">
        Large
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [name, height, font, padding] of [
      ["Small", 32, 12, 12],
      ["Medium", 40, 14, 16],
      ["Large", 52, 16, 20],
    ] as const) {
      const style = getComputedStyle(canvas.getByRole("button", { name }));
      await expect(style.minHeight).toBe(`${height}px`);
      await expect(style.fontSize).toBe(`${font}px`);
      await expect(style.paddingInlineStart).toBe(`${padding}px`);
      await expect(style.borderRadius).toBe("12px");
      await expect(style.fontWeight).toBe("600");
      await expect(style.gap).toBe("8px");
    }
  },
};

function ExampleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

export const Outline: Story = { args: { variant: "outline" } };

const variants = ["primary", "secondary", "outline", "ghost"] as const;
const tones = ["default", "danger"] as const;

export const VariantTones: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {tones.map((tone) => (
        <div key={tone} style={buttonRowStyle}>
          {variants.map((variant) => (
            <Button key={variant} variant={variant} tone={tone}>
              {tone} {variant}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const tone of tones) {
      for (const variant of variants) {
        const button = canvas.getByRole("button", { name: `${tone} ${variant}` });
        const family = tone === "danger" ? "critical" : "brand";
        const bg =
          variant === "primary"
            ? `${family}-solid`
            : variant === "secondary"
              ? `${tone === "danger" ? "critical" : "neutral"}-weak`
              : "transparent";
        await expectColor(button, "backgroundColor", `--djy-color-bg-${bg}`);
        await expectColor(
          button,
          "color",
          `--djy-color-fg-${variant === "primary" ? `on-${family}` : tone === "danger" ? "critical" : "neutral"}`,
        );
        if (variant === "outline")
          await expectColor(
            button,
            "borderTopColor",
            `--djy-color-stroke-${tone === "danger" ? "critical" : "neutral"}-solid`,
          );
      }
    }
  },
};

async function expectColor(
  element: HTMLElement,
  property: "backgroundColor" | "color" | "borderTopColor" | "outlineColor",
  token: string,
) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  element.append(probe);
  const expected = getComputedStyle(probe).color;
  probe.remove();
  await waitFor(() => expect(getComputedStyle(element)[property]).toBe(expected));
}

export const DarkVariantTones: Story = { ...VariantTones, globals: { theme: "dark" } };

export const WithIcons: Story = {
  render: () => (
    <div style={buttonRowStyle}>
      <Button startIcon={<ExampleIcon />}>항목 추가</Button>
      <Button variant="outline" endIcon={<ExampleIcon />}>
        다음 단계
      </Button>
      <Button startIcon={<ExampleIcon />} endIcon={<ExampleIcon />}>
        앞뒤 아이콘
      </Button>
      <Button loading startIcon={<ExampleIcon />} endIcon={<ExampleIcon />} loadingLabel="저장 중">
        변경 저장
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const saving = within(canvasElement).getByRole("button", { name: "변경 저장" });
    await expect(saving).toHaveAccessibleDescription("저장 중");
    await expect(saving.querySelectorAll(".djy-button__spinner")).toHaveLength(1);
    await expect(saving.querySelectorAll(".djy-button__icon")).toHaveLength(1);
  },
};

export const IconButtons: Story = {
  render: () => (
    <div style={buttonRowStyle}>
      {(["small", "medium", "large"] as const).map((size) => (
        <IconButton key={size} aria-label={`${size} 항목 추가`} size={size}>
          <ExampleIcon />
        </IconButton>
      ))}
      {tones.map((tone) =>
        variants.map((variant) => (
          <IconButton
            key={`${tone}-${variant}`}
            tone={tone}
            variant={variant}
            aria-label={`${tone} ${variant} 항목 추가`}
          >
            <ExampleIcon />
          </IconButton>
        )),
      )}
      <IconButton aria-label="저장" loading>
        <ExampleIcon />
      </IconButton>
      <IconButton aria-label="삭제" disabled tone="danger">
        <ExampleIcon />
      </IconButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [size, pixels, icon] of [
      ["small", 32, 16],
      ["medium", 40, 20],
      ["large", 52, 24],
    ] as const) {
      const button = canvas.getByRole("button", { name: `${size} 항목 추가` });
      const style = getComputedStyle(button);
      await expect(style.width).toBe(`${pixels}px`);
      await expect(style.height).toBe(`${pixels}px`);
      await expect(style.borderRadius).toBe("12px");
      await expect(button.querySelector("svg")?.getBoundingClientRect().width).toBe(icon);
    }
    const saving = canvas.getByRole("button", { name: "저장" });
    await expect(saving).toHaveAccessibleDescription("처리 중");
    await expect(saving.querySelector("svg")).toBeNull();
    await expect(saving).toBeDisabled();
  },
};

export const DarkIconButtons: Story = { ...IconButtons, globals: { theme: "dark" } };

export const LongLabel: Story = {
  render: () => (
    <div style={{ width: "100%", maxWidth: "16rem" }}>
      <Button size="large" startIcon={<ExampleIcon />} style={{ width: "100%" }}>
        선택한 모든 항목의 변경 사항을 검토하고 저장합니다
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
    await expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight);
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(52);
  },
};

const neutralTheme = {
  "--djy-color-bg-brand-solid": "var(--djy-color-bg-neutral-solid)",
  "--djy-color-bg-brand-solid-hover": "var(--djy-color-bg-neutral-solid-hover)",
  "--djy-color-bg-brand-solid-pressed": "var(--djy-color-bg-neutral-solid-pressed)",
  "--djy-color-fg-on-brand": "var(--djy-color-fg-on-neutral)",
} as CSSProperties;

export const NeutralTheme: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ ...neutralTheme, ...buttonRowStyle }}>
        <Button>중립 저장</Button>
        <IconButton variant="primary" aria-label="중립 추가">
          <ExampleIcon />
        </IconButton>
        <Button tone="danger">영역 안 삭제</Button>
      </div>
      <div style={buttonRowStyle}>
        <Button>기본 저장</Button>
        <Button tone="danger">영역 밖 삭제</Button>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const neutral = canvas.getByRole("button", { name: "중립 저장" });
    await expectColor(neutral, "backgroundColor", "--djy-color-bg-neutral-solid");
    await expectColor(
      canvas.getByRole("button", { name: "중립 추가" }),
      "backgroundColor",
      "--djy-color-bg-neutral-solid",
    );
    await expectColor(
      canvas.getByRole("button", { name: "기본 저장" }),
      "backgroundColor",
      "--djy-color-bg-brand-solid",
    );
    for (const name of ["영역 안 삭제", "영역 밖 삭제"])
      await expectColor(
        canvas.getByRole("button", { name }),
        "backgroundColor",
        "--djy-color-bg-critical-solid",
      );
  },
};
export const DarkNeutralTheme: Story = { ...NeutralTheme, globals: { theme: "dark" } };

export const NativeContract: Story = {
  render: () => {
    const ref = createRef<HTMLButtonElement>();
    const iconRef = createRef<HTMLButtonElement>();
    return (
      <form
        aria-label="버튼 동작"
        onSubmit={(event) => {
          event.preventDefault();
          event.currentTarget.dataset.submitted = "true";
        }}
      >
        <Button
          ref={ref}
          name="intent"
          value="preview"
          title="미리보기"
          data-testid="native"
          onClick={() => ref.current?.setAttribute("data-ref", "received")}
        >
          미리보기
        </Button>
        <IconButton
          ref={iconRef}
          aria-label="추가"
          name="intent"
          value="add"
          onClick={() => iconRef.current?.setAttribute("data-ref", "received")}
        >
          <ExampleIcon />
        </IconButton>
        <Button type="submit">제출</Button>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = canvas.getByRole("form");
    for (const name of ["미리보기", "추가"]) {
      const button = canvas.getByRole("button", { name });
      await userEvent.click(button);
      await expect(button).toHaveAttribute("type", "button");
      await expect(button).toHaveAttribute("data-ref", "received");
      await expect(button).toHaveAttribute("name", "intent");
      await expect(form).not.toHaveAttribute("data-submitted");
      await userEvent.tab({ shift: true });
      await userEvent.tab();
      await expect(getComputedStyle(button).outlineWidth).toBe("3px");
      await expect(getComputedStyle(button).outlineOffset).toBe("2px");
      await expectColor(button, "outlineColor", "--djy-color-stroke-focus");
    }
    await userEvent.click(canvas.getByRole("button", { name: "제출" }));
    await expect(form).toHaveAttribute("data-submitted", "true");
  },
};

function StateControls({ onAction }: { onAction: ButtonProps["onClick"] }) {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const descriptionId = useId();
  return (
    <div style={buttonRowStyle}>
      <p id={descriptionId} style={{ flexBasis: "100%", margin: 0 }}>
        선택 항목에 적용합니다.
      </p>
      <Button onClick={() => setDisabled((value) => !value)} variant="secondary">
        비활성 전환
      </Button>
      <Button onClick={() => setLoading((value) => !value)} variant="secondary">
        로딩 전환
      </Button>
      <Button
        aria-describedby={descriptionId}
        disabled={disabled}
        loading={loading}
        loadingLabel="작업 처리 중"
        onClick={onAction}
      >
        실행
      </Button>
      <IconButton
        aria-describedby={descriptionId}
        aria-label="아이콘 실행"
        disabled={disabled}
        loading={loading}
        loadingLabel="아이콘 작업 처리 중"
        onClick={onAction}
      >
        <ExampleIcon />
      </IconButton>
    </div>
  );
}

export const StateTransitions: Story = {
  args: { onClick: fn() },
  globals: { theme: "light" },
  render: (args) => <StateControls onAction={args.onClick} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole("button", { name: "실행" });
    const icon = canvas.getByRole("button", { name: "아이콘 실행" });
    const description = canvas.getByText("선택 항목에 적용합니다.");
    const buttons = [
      { button: action, name: "실행", loadingLabel: "작업 처리 중" },
      { button: icon, name: "아이콘 실행", loadingLabel: "아이콘 작업 처리 중" },
    ];
    for (const { button, name } of buttons) {
      await expect(button).toHaveAccessibleName(name);
      await expect(button).toHaveAccessibleDescription("선택 항목에 적용합니다.");
      await expect(button).toHaveAttribute("aria-describedby", description.id);
    }
    let calls = 0;
    for (const toggle of ["비활성 전환", "로딩 전환"]) {
      const loadingRegions: HTMLElement[] = [];
      await userEvent.click(canvas.getByRole("button", { name: toggle }));
      for (const { button, name, loadingLabel } of buttons) {
        await expect(button).toBeDisabled();
        await expect(button).toHaveAccessibleName(name);
        if (toggle === "로딩 전환") {
          await expect(button).toHaveAttribute("aria-busy", "true");
          await expect(button).toHaveAccessibleDescription(
            `선택 항목에 적용합니다. ${loadingLabel}`,
          );
          const statusId = button
            .getAttribute("aria-describedby")
            ?.split(/\s+/u)
            .find((id) => id !== description.id);
          const region = statusId ? document.getElementById(statusId) : null;
          if (!region) throw new Error("Expected a connected loading live region");
          await expect(canvasElement).toContainElement(region);
          await expect(button).not.toContainElement(region);
          await expect(region).toHaveAttribute("aria-live", "polite");
          await expect(region).toHaveTextContent(loadingLabel);
          loadingRegions.push(region);
        } else {
          await expect(button).not.toHaveAttribute("aria-busy");
          await expect(button).toHaveAccessibleDescription("선택 항목에 적용합니다.");
          await expect(button).toHaveAttribute("aria-describedby", description.id);
        }
        await userEvent.click(button);
        await expect(args.onClick).toHaveBeenCalledTimes(calls);
        const background =
          toggle === "비활성 전환" ? "disabled" : button === action ? "brand-solid" : "transparent";
        await expectColor(button, "backgroundColor", `--djy-color-bg-${background}`);
      }
      await userEvent.click(canvas.getByRole("button", { name: toggle }));
      for (const { button, name } of buttons) {
        await expect(button).not.toBeDisabled();
        await expect(button).toHaveAccessibleName(name);
        await expect(button).not.toHaveAttribute("aria-busy");
        await expect(button).toHaveAccessibleDescription("선택 항목에 적용합니다.");
        await expect(button).toHaveAttribute("aria-describedby", description.id);
        await userEvent.click(button);
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard(" ");
        calls += 3;
        await expect(args.onClick).toHaveBeenCalledTimes(calls);
      }
      for (const region of loadingRegions) {
        await expect(region).toBeInTheDocument();
        await expect(region).toBeEmptyDOMElement();
      }
    }
    await userEvent.unhover(icon);
  },
};
export const DarkStateTransitions: Story = { ...StateTransitions, globals: { theme: "dark" } };
