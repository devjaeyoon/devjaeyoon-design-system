import { describe, expect, it } from "vitest";
import {
  createDialogCloseState,
  expireDialogCancel,
  hasDialogCloseRequest,
  markDialogCancelRequestSent,
  markNativeDialogCloseRequested,
  planDialogCancel,
} from "./dialog-close.js";

const nativeCancel = {
  source: "native",
  trusted: true,
  cancelable: true,
  defaultPrevented: false,
  closeOnEscape: true,
  focus: null,
} as const;

describe("Dialog close decisions", () => {
  it.each([
    {
      source: "native",
      trusted: true,
      request: "pending",
      nativeAction: "allow",
      recovery: "reopen",
    },
    {
      source: "native",
      trusted: false,
      request: "sent",
      nativeAction: "allow",
      recovery: "reopen",
    },
    { source: "escape", trusted: true, request: "sent", nativeAction: "prevent", recovery: "none" },
    {
      source: "escape",
      trusted: false,
      request: "sent",
      nativeAction: "prevent",
      recovery: "none",
    },
  ] as const)("plans $source cancel with trusted=$trusted", (expected) => {
    const plan = planDialogCancel(createDialogCloseState(), {
      ...nativeCancel,
      source: expected.source,
      trusted: expected.trusted,
    });
    expect(plan.nativeAction).toBe(expected.nativeAction);
    expect(plan.state).toMatchObject({
      decision: "allowed",
      request: expected.request,
      recovery: expected.recovery,
    });
    expect(hasDialogCloseRequest(plan.state)).toBe(expected.request === "sent");
  });

  it.each([
    { defaultPrevented: true, closeOnEscape: true },
    { defaultPrevented: false, closeOnEscape: false },
  ])("does not request a blocked cancel: %j", (options) => {
    const plan = planDialogCancel(createDialogCloseState(), { ...nativeCancel, ...options });
    expect(plan.nativeAction).toBe("prevent");
    expect(plan.state.decision).toBe("blocked");
    expect(hasDialogCloseRequest(plan.state)).toBe(false);
    expect(markDialogCancelRequestSent(plan.state)).toBe(plan.state);
  });

  it("retains a blocked decision after expiration and a direct native close", () => {
    const blocked = planDialogCancel(createDialogCloseState(), {
      ...nativeCancel,
      defaultPrevented: true,
    }).state;
    const expired = expireDialogCancel(blocked);
    const requested = markNativeDialogCloseRequested(expired);
    for (const previous of [blocked, expired, requested]) {
      const followup = planDialogCancel(previous, { ...nativeCancel, cancelable: false });
      expect(followup.nativeAction).toBe("prevent");
      expect(followup.state.recovery).toBe("reopen");
      expect(hasDialogCloseRequest(followup.state)).toBe(false);
    }
    expect(hasDialogCloseRequest(requested)).toBe(true);
  });

  it("allows a new cancelable request after a previously blocked cancel", () => {
    const blocked = planDialogCancel(createDialogCloseState(), {
      ...nativeCancel,
      closeOnEscape: false,
    }).state;
    const next = planDialogCancel(expireDialogCancel(blocked), nativeCancel);
    expect(next.nativeAction).toBe("allow");
    expect(next.state.request).toBe("pending");
  });

  it("records a pending request once without changing its cancel decision", () => {
    const pending = Object.freeze(planDialogCancel(createDialogCloseState(), nativeCancel).state);
    const sent = markDialogCancelRequestSent(pending);
    expect(hasDialogCloseRequest(pending)).toBe(false);
    expect(hasDialogCloseRequest(sent)).toBe(true);
    expect(sent).toMatchObject({ decision: "allowed", recovery: "reopen", focus: null });
    expect(markDialogCancelRequestSent(sent)).toBe(sent);
    expect(pending.request).toBe("pending");
  });

  it("expires request and focus information while keeping the last decision", () => {
    const pending = planDialogCancel(createDialogCloseState(), nativeCancel).state;
    const sent = markDialogCancelRequestSent(pending);
    if (sent.phase !== "cancel-pending") throw new Error("Expected a cancel plan.");
    const expired = expireDialogCancel(sent);
    expect(expired).toEqual({ phase: "idle", lastCancel: "allowed" });
    expect(hasDialogCloseRequest(expired)).toBe(false);
    expect(expired).not.toHaveProperty("focus");
    expect(markDialogCancelRequestSent(expired)).toBe(expired);
  });

  it("starts a new session without the previous cancel or request", () => {
    const previous = markNativeDialogCloseRequested(
      planDialogCancel(createDialogCloseState(), { ...nativeCancel, closeOnEscape: false }).state,
    );
    expect(hasDialogCloseRequest(previous)).toBe(true);
    const next = createDialogCloseState();
    expect(hasDialogCloseRequest(next)).toBe(false);
    expect(planDialogCancel(next, { ...nativeCancel, cancelable: false }).state.decision).toBe(
      "allowed",
    );
  });
});
