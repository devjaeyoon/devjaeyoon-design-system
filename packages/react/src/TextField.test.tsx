import type { ComponentPropsWithRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { TextField, type TextFieldProps, type TextFieldType } from "./index";

describe("TextField", () => {
  it("preserves native input types while restricting type and children", () => {
    expectTypeOf<TextFieldProps["size"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TextFieldProps["ref"]>().toEqualTypeOf<ComponentPropsWithRef<"input">["ref"]>();
    expectTypeOf<Extract<keyof TextFieldProps, "children">>().toEqualTypeOf<never>();
    expectTypeOf<TextFieldType>().toEqualTypeOf<
      "text" | "email" | "password" | "search" | "tel" | "url"
    >();
  });

  it("renders native props and connects an explicit id during SSR", () => {
    const markup = renderToStaticMarkup(
      <TextField
        className="custom"
        defaultValue="Jaeyoon"
        id="name"
        label="이름"
        name="name"
        required
        size={24}
        style={{ width: "20rem" }}
      />,
    );
    expect(markup).toContain('for="name"');
    expect(markup).toContain("이름 (필수)");
    expect(markup).toContain('type="text"');
    expect(markup).toContain('value="Jaeyoon"');
    expect(markup).toContain('name="name"');
    expect(markup).toContain('size="24"');
    expect(markup).toMatch(/<input[^>]*class="djy-text-field__input custom"/u);
    expect(markup).toMatch(/<input[^>]*style="width:20rem"/u);
  });

  it("merges and deduplicates description ids while errors override aria-invalid", () => {
    const markup = renderToStaticMarkup(
      <TextField
        aria-describedby={"outside  name-description\toutside"}
        aria-invalid={false}
        description="도움말"
        error="오류"
        id="name"
        label="이름"
      />,
    );
    expect(markup).toContain('aria-describedby="outside name-description name-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="name-description"');
    expect(markup).toContain('id="name-error"');
    expect(markup).not.toContain("aria-live");
    expect(markup).not.toContain('role="alert"');
  });

  it.each([undefined, "", "   "])(
    "preserves caller validity without a nonempty error (%s)",
    (error) => {
      const markup = renderToStaticMarkup(
        <TextField
          aria-invalid="spelling"
          {...(error === undefined ? {} : { error })}
          id="name"
          label="이름"
        />,
      );
      expect(markup).toContain('aria-invalid="spelling"');
      expect(markup).not.toContain("aria-describedby");
      expect(markup).not.toContain('id="name-error"');
    },
  );
});
