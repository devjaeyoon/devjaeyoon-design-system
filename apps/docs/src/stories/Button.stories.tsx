import type { ButtonProps } from "@devjaeyoon-design-system/react";
import { Button } from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

const buttonRowStyle = { alignItems: "center", display: "flex", gap: "1rem" };

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
      options: ["primary", "secondary", "ghost"],
    },
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
};
