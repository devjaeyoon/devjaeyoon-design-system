import { Button, TextField } from "@devjaeyoon-design-system/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { expect, userEvent, within } from "storybook/test";

const stackStyle = { display: "grid", gap: "1.5rem", maxWidth: "28rem" };

const meta = {
  title: "Components/TextField",
  component: TextField,
  args: { label: "이름", placeholder: "이름을 입력해 주세요" },
  argTypes: {
    type: { control: "select", options: ["text", "email", "password", "search", "tel", "url"] },
  },
  decorators: [
    (Story) => (
      <div style={stackStyle}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { description: "프로필에 표시할 이름입니다." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("이름", { selector: "label" }));
    const input = canvas.getByRole("textbox", { name: "이름" });
    await expect(input).toHaveFocus();
    await expect(input).toHaveAccessibleDescription("프로필에 표시할 이름입니다.");
    await expect(input).not.toHaveAttribute("aria-invalid");
  },
};

export const Uncontrolled: Story = {
  args: { defaultValue: "김재윤", required: true, name: "name", size: 24, maxLength: 10 },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "이름 (필수)" });
    await expect(input).toBeRequired();
    await expect(input).toHaveValue("김재윤");
    await expect(input).toHaveAttribute("size", "24");
    await expect(input).toHaveAttribute("name", "name");
    await userEvent.clear(input);
    await userEvent.type(input, "abcdefghijkl");
    await expect(input).toHaveValue("abcdefghij");
  },
};

function ControlledExample() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("이름을 확인해 주세요.");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <p id="external-help">외부 안내입니다.</p>
      <TextField
        aria-describedby="external-help explicit-description external-help"
        aria-invalid="grammar"
        className="consumer-input"
        description="프로필에 표시할 이름입니다."
        error={error}
        id="explicit"
        label="직접 관리하는 이름"
        onChange={(event) => {
          setValue(event.currentTarget.value);
          setError("");
        }}
        ref={inputRef}
        style={{ maxWidth: "20rem" }}
        value={value}
      />
      <Button
        onClick={() => {
          setValue("김재윤");
          inputRef.current?.focus();
        }}
      >
        이름 채우기
      </Button>
    </>
  );
}

export const ControlledAndRef: Story = {
  render: () => <ControlledExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "직접 관리하는 이름" });
    await expect(input).toHaveAttribute("id", "explicit");
    await expect(input).toHaveAttribute(
      "aria-describedby",
      "external-help explicit-description explicit-error",
    );
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(
      "외부 안내입니다. 프로필에 표시할 이름입니다. 이름을 확인해 주세요.",
    );
    await expect(input).toHaveClass("consumer-input");
    await expect(input.style.maxWidth).toBe("20rem");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(input, "새 이름");
    await expect(input).toHaveValue("새 이름");
    await expect(input).toHaveFocus();
    await expect(input).toHaveAttribute("aria-invalid", "grammar");
    await expect(input).toHaveAttribute("aria-describedby", "external-help explicit-description");
    await expect(canvas.queryByText("이름을 확인해 주세요.")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "이름 채우기" }));
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue("김재윤");
  },
};

export const AutomaticIds: Story = {
  render: () => (
    <>
      <TextField description="첫 번째 안내" label="첫 번째 이름" />
      <TextField description="두 번째 안내" error="두 번째 오류" label="두 번째 이름" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole("textbox", { name: "첫 번째 이름" });
    const second = canvas.getByRole("textbox", { name: "두 번째 이름" });
    await expect(first.id).toBeTruthy();
    await expect(second.id).toBeTruthy();
    await expect(first.id).not.toBe(second.id);
    await expect(first).toHaveAccessibleDescription("첫 번째 안내");
    await expect(second).toHaveAccessibleDescription("두 번째 안내 두 번째 오류");
    await userEvent.click(canvas.getByText("두 번째 이름", { selector: "label" }));
    await expect(second).toHaveFocus();
  },
};

export const KeyboardNavigation: Story = {
  render: () => (
    <>
      <TextField label="이름" />
      <TextField defaultValue="비활성 값" disabled label="비활성" />
      <TextField defaultValue="읽기 전용 값" label="읽기 전용" readOnly />
      <TextField label="이메일" type="email" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole("textbox", { name: "이름" });
    const disabled = canvas.getByRole("textbox", { name: "비활성" });
    const readOnly = canvas.getByRole("textbox", { name: "읽기 전용" });
    name.focus();
    await userEvent.tab();
    await expect(readOnly).toHaveFocus();
    await expect(readOnly).toHaveAttribute("readonly");
    await userEvent.keyboard("변경");
    await expect(readOnly).toHaveValue("읽기 전용 값");
    if (!(readOnly instanceof HTMLInputElement)) throw new Error("Expected an input");
    readOnly.select();
    await expect(readOnly.selectionStart).toBe(0);
    await expect(readOnly.selectionEnd).toBe(readOnly.value.length);
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "이메일" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(readOnly).toHaveFocus();
    await expect(disabled).toBeDisabled();
    await userEvent.type(disabled, "변경");
    await expect(disabled).toHaveValue("비활성 값");
  },
};

function FieldStates() {
  return (
    <>
      <TextField
        description="프로필에 표시할 이름입니다."
        label="기본"
        placeholder="이름을 입력해 주세요"
      />
      <TextField
        description="연락받을 주소입니다."
        error="이메일 주소를 확인해 주세요."
        label="오류"
        placeholder="name@example.com"
        type="email"
      />
      <TextField defaultValue="수정할 수 없는 값" disabled label="비활성" />
      <TextField defaultValue="선택할 수 있는 값" label="읽기 전용" readOnly />
    </>
  );
}

export const LightStates: Story = { globals: { theme: "light" }, render: () => <FieldStates /> };
export const DarkStates: Story = { globals: { theme: "dark" }, render: () => <FieldStates /> };
