import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders an SSR-safe button with the default variant", () => {
    const markup = renderToStaticMarkup(<Button>Save</Button>);

    expect(markup).toContain("djy-button--primary");
    expect(markup).toContain(">Save<");
    expect(markup).not.toContain("disabled");
  });

  it("disables the button and announces loading state", () => {
    const markup = renderToStaticMarkup(<Button loading>Save</Button>);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("처리 중");
  });
});
