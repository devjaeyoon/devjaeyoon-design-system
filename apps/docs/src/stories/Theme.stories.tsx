import { themes } from "@devjaeyoon-design-system/design-token";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

const meta = {
  title: "Foundations/Theme",
  render: () => <p>이 텍스트는 테마의 기본 글자색을 상속합니다.</p>,
  play: async ({ canvasElement, globals }) => {
    const theme = globals.theme === "dark" ? "dark" : "light";
    const tokens = themes[theme];
    const document = canvasElement.ownerDocument;
    const canvas = within(canvasElement);
    const expectedStyle = {
      color: tokens["color-fg-neutral"],
      backgroundColor: tokens["color-bg-canvas"],
    };

    await expect(document.documentElement).toHaveAttribute("data-theme", theme);
    await expect(document.body).toHaveStyle(expectedStyle);
    await expect(canvasElement.querySelector(".djy-story-canvas")).toHaveStyle(expectedStyle);
    await expect(canvas.getByText("이 텍스트는 테마의 기본 글자색을 상속합니다.")).toHaveStyle({
      color: tokens["color-fg-neutral"],
    });
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  globals: {
    theme: "light",
  },
};

export const Dark: Story = {
  globals: {
    theme: "dark",
  },
};
