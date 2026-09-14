import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { type Profile, ProfileForm } from "./ProfileForm";

function deferredSave() {
  let resolve = () => {};
  let reject = (_reason: Error) => {};
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const meta = {
  title: "Examples/ProfileForm",
  component: ProfileForm,
  args: { onSave: fn<(profile: Profile) => Promise<void>>().mockResolvedValue(undefined) },
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Save: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = deferredSave();
    args.onSave.mockImplementationOnce(() => pending.promise);
    const name = canvas.getByRole("textbox", { name: "이름 (필수)" });
    const email = canvas.getByRole("textbox", { name: "이메일 (필수)" });
    await userEvent.clear(name);
    await userEvent.type(name, "  새 이름  ");
    await userEvent.clear(email);
    await userEvent.type(email, "  new@example.com  ");
    await userEvent.keyboard("{Enter}");
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect(args.onSave).toHaveBeenCalledWith({
      name: "새 이름",
      email: "new@example.com",
    });
    await expect(name).toHaveAttribute("readonly");
    await expect(email).toHaveAttribute("readonly");
    pending.resolve();
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("프로필을 저장했습니다."),
    );
    await expect(name).toHaveValue("  새 이름  ");
    await expect(email).toHaveValue("new@example.com");
    await expect(name).not.toHaveAttribute("readonly");
    await expect(email).not.toHaveAttribute("readonly");
    await expect(canvas.getByRole("button", { name: "저장" })).toBeEnabled();
  },
};

export const Validation: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole("textbox", { name: "이름 (필수)" });
    const email = canvas.getByRole("textbox", { name: "이메일 (필수)" });
    const save = canvas.getByRole("button", { name: "저장" });

    await step("빈 제출에서 오류를 표시하고 이름으로 포커스를 옮긴다", async () => {
      await userEvent.clear(name);
      await userEvent.clear(email);
      await expect(name).not.toHaveAttribute("aria-invalid");
      await expect(email).not.toHaveAttribute("aria-invalid");
      await userEvent.click(save);
      await expect(name).toHaveFocus();
      await expect(name).toHaveAccessibleDescription("이름을 입력해 주세요.");
      await expect(email).toHaveAccessibleDescription(
        "연락받을 이메일 주소를 입력해 주세요. 이메일을 입력해 주세요.",
      );
      await expect(name).toHaveAttribute("aria-invalid", "true");
      await expect(email).toHaveAttribute("aria-invalid", "true");
      await expect(args.onSave).not.toHaveBeenCalled();
    });

    await step("제출 이후에는 변경한 필드만 다시 검증한다", async () => {
      await userEvent.type(name, "   ");
      await expect(name).toHaveAttribute("aria-invalid", "true");
      await userEvent.clear(name);
      await userEvent.type(name, "김재윤");
      await expect(name).not.toHaveAttribute("aria-invalid");
      await expect(email).toHaveAttribute("aria-invalid", "true");
      await userEvent.type(email, "invalid");
      await expect(email).toHaveAccessibleDescription(
        "연락받을 이메일 주소를 입력해 주세요. 올바른 이메일 주소를 입력해 주세요.",
      );
      await userEvent.click(save);
      await expect(email).toHaveFocus();
      await expect(args.onSave).not.toHaveBeenCalled();
    });

    await step("오류를 수정하고 Enter로 제출한다", async () => {
      await userEvent.clear(email);
      await userEvent.type(email, "fixed@example.com");
      await expect(email).not.toHaveAttribute("aria-invalid");
      await expect(email).toHaveAccessibleDescription("연락받을 이메일 주소를 입력해 주세요.");
      await userEvent.keyboard("{Enter}");
      await expect(args.onSave).toHaveBeenCalledTimes(1);
      await expect(args.onSave).toHaveBeenCalledWith({
        name: "김재윤",
        email: "fixed@example.com",
      });
      await waitFor(() =>
        expect(canvas.getByRole("status")).toHaveTextContent("프로필을 저장했습니다."),
      );
    });
  },
};

export const Saving: Story = {
  play: async ({ args, canvasElement }) => {
    const pending = deferredSave();
    args.onSave.mockImplementationOnce(() => pending.promise);
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "저장" });
    const name = canvas.getByRole("textbox", { name: "이름 (필수)" });
    const email = canvas.getByRole("textbox", { name: "이메일 (필수)" });
    const form = canvas.getByRole("form", { name: "프로필 수정" });
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    await userEvent.click(save);
    await expect(save).toBeDisabled();
    await expect(save).toHaveAttribute("aria-busy", "true");
    await expect(name).toHaveAttribute("readonly");
    await expect(email).toHaveAttribute("readonly");
    await userEvent.type(name, "변경");
    await expect(name).toHaveValue("김재윤");
    await userEvent.tab();
    await expect(email).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(save);
    // Exercise the handler guard even when the disabled submit button blocks native submission.
    form.requestSubmit();
    form.requestSubmit();
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect(canvas.getByRole("status")).toBeEmptyDOMElement();
    // Keep this story pending so the saving state remains available for inspection and axe.
  },
};

export const RetryAfterFailure: Story = {
  play: async ({ args, canvasElement }) => {
    const first = deferredSave();
    const retry = deferredSave();
    args.onSave
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => retry.promise);
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "저장" });
    await userEvent.click(save);
    first.reject(new Error("Example save failed"));
    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent(
        "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      ),
    );
    await expect(save).toBeEnabled();
    const name = canvas.getByRole("textbox", { name: "이름 (필수)" });
    await expect(name).not.toHaveAttribute("readonly");
    await expect(name).toHaveValue("김재윤");
    await userEvent.click(save);
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(args.onSave).toHaveBeenCalledTimes(2);
    retry.resolve();
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("프로필을 저장했습니다."),
    );
    await expect(save).toBeEnabled();
  },
};
