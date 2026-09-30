import type { ComponentPropsWithRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  Button,
  DialogBody,
  DialogClose,
  DialogContent,
  type DialogContentProps,
  DialogFooter,
  DialogRoot,
  type DialogSize,
  DialogTrigger,
} from "./index";

describe("Dialog", () => {
  it("exposes native dialog props and its two public sizes", () => {
    expectTypeOf<DialogContentProps["ref"]>().toEqualTypeOf<
      ComponentPropsWithRef<"dialog">["ref"]
    >();
    expectTypeOf<DialogSize>().toEqualTypeOf<"medium" | "large">();
  });

  it("renders an inert shell while closed during SSR", () => {
    const markup = renderToStaticMarkup(
      <DialogRoot>
        <DialogTrigger>열기</DialogTrigger>
        <DialogContent title="프로필 수정">
          <DialogBody>내용</DialogBody>
        </DialogContent>
      </DialogRoot>,
    );

    expect(markup).toContain("열기");
    expect(markup).toContain('<dialog class="djy-dialog djy-dialog--medium"></dialog>');
    expect(markup).not.toContain("프로필 수정");
    expect(markup).not.toContain("내용");
    expect(markup).not.toContain(" open");
  });

  it("connects the title and description and renders composed regions when initially open", () => {
    const markup = renderToStaticMarkup(
      <DialogRoot defaultOpen>
        <DialogContent description="변경할 내용을 입력하세요." size="large" title="프로필 수정">
          <DialogBody className="custom-body">내용</DialogBody>
          <DialogFooter className="custom-footer">
            <DialogClose>취소</DialogClose>
            <Button>저장</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>,
    );

    expect(markup).toContain("djy-dialog--large");
    expect(markup).toMatch(/<dialog[^>]*aria-describedby="[^"]+"[^>]*aria-labelledby="[^"]+"/u);
    expect(markup).toContain('class="djy-dialog__body custom-body"');
    expect(markup).toContain('class="djy-dialog__footer custom-footer"');
    expect(markup).toContain('aria-label="닫기"');
    expect(markup).toContain("프로필 수정");
    expect(markup).toContain("변경할 내용을 입력하세요.");
    expect(markup).toContain("취소");
    expect(markup).toContain("저장");
  });
});
