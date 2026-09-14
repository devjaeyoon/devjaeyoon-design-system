import { Button, TextField } from "@devjaeyoon-design-system/react";
import { type SubmitEvent, useRef, useState } from "react";

export type Profile = { name: string; email: string };
export type ProfileFormProps = { onSave: (profile: Profile) => Promise<void> };

function validateName(input: HTMLInputElement) {
  return input.value.trim() ? "" : "이름을 입력해 주세요.";
}

function validateEmail(input: HTMLInputElement) {
  if (input.validity.valueMissing) return "이메일을 입력해 주세요.";
  if (input.validity.typeMismatch) return "올바른 이메일 주소를 입력해 주세요.";
  return "";
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>({ name: "김재윤", email: "jaeyoon@example.com" });
  const [errors, setErrors] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || !nameRef.current || !emailRef.current) return;
    setSubmitted(true);
    setResult("idle");
    const nextErrors = {
      name: validateName(nameRef.current),
      email: validateEmail(emailRef.current),
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) {
      (nextErrors.name ? nameRef.current : emailRef.current).focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await onSave({ name: profile.name.trim(), email: profile.email.trim() });
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      aria-label="프로필 수정"
      noValidate
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "var(--djy-space-4)", maxWidth: "28rem" }}
    >
      <h2 style={{ margin: 0 }}>프로필 수정</h2>
      <TextField
        autoComplete="name"
        error={errors.name}
        label="이름"
        name="name"
        onChange={(event) => {
          setProfile({ ...profile, name: event.currentTarget.value });
          setResult("idle");
          if (submitted) setErrors({ ...errors, name: validateName(event.currentTarget) });
        }}
        readOnly={saving}
        ref={nameRef}
        required
        value={profile.name}
      />
      <TextField
        autoComplete="email"
        description="연락받을 이메일 주소를 입력해 주세요."
        error={errors.email}
        label="이메일"
        name="email"
        onChange={(event) => {
          setProfile({ ...profile, email: event.currentTarget.value });
          setResult("idle");
          if (submitted) setErrors({ ...errors, email: validateEmail(event.currentTarget) });
        }}
        readOnly={saving}
        ref={emailRef}
        required
        type="email"
        value={profile.email}
      />
      <div>
        <Button loading={saving} type="submit">
          저장
        </Button>
      </div>
      <p role="status" style={{ margin: 0 }}>
        {result === "success" ? "프로필을 저장했습니다." : ""}
      </p>
      {result === "error" ? (
        <p role="alert" style={{ margin: 0, color: "var(--djy-color-fg-critical)" }}>
          저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
    </form>
  );
}
