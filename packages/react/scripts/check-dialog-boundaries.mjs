import { strict as assert } from "node:assert";
import { checkDialogNative } from "./check-dialog-native.mjs";

async function checkRootDismissalPolicy(page, waitForFocus) {
  for (const closedby of ["any", "none"]) {
    for (const mode of ["outside-blocked", "accepted", "rejected", "escape-blocked"]) {
      const name = `${closedby} ${mode} dismissal`;
      const trigger = page.getByRole("button", { name: `Open ${name}`, exact: true });
      const dialog = page.getByRole("dialog", { name, exact: true });
      const input = page.getByRole("textbox", { name: `${name} draft`, exact: true });
      const requests = page.getByTestId(`${name}-requests`);
      const nativeCloses = page.getByTestId(`${name}-native-closes`);
      const closes = page.getByTestId(`${name}-closes`);
      await trigger.click();
      await input.fill("Keep dismissal draft");
      assert.equal(await dialog.getAttribute("closedby"), "closerequest");

      if (mode === "escape-blocked") {
        await page.keyboard.press("Escape");
        await waitForFrame(page);
        assert.equal(await requests.textContent(), "0");
        assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await input.inputValue(), "Keep dismissal draft");
      }
      await page.mouse.click(1, 1);
      await waitForFrame(page);
      if (mode === "outside-blocked" || mode === "rejected") {
        assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await requests.textContent(), mode === "rejected" ? "1" : "0");
        assert.equal(await nativeCloses.textContent(), "0");
        assert.equal(await closes.textContent(), "0");
        assert.equal(await input.inputValue(), "Keep dismissal draft");
        assert.equal(
          await page.locator("html").evaluate((element) => element.style.overflow),
          "hidden",
        );
        await input.focus();
        await page.keyboard.press("Escape");
        if (mode === "rejected") {
          await waitForFrame(page);
          assert.equal(await requests.textContent(), "2");
          assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
          assert.equal(await input.inputValue(), "Keep dismissal draft");
          assert.equal(await closes.textContent(), "0");
          await page.getByRole("button", { name: `Finish ${name}`, exact: true }).click();
        }
      }
      await dialog.waitFor({ state: "hidden" });
      await waitForFocus(trigger);
      await waitForFrame(page);
      assert.equal(await requests.textContent(), mode === "rejected" ? "2" : "1");
      assert.equal(await nativeCloses.textContent(), "1");
      assert.equal(await closes.textContent(), "1");
      assert.equal(await page.locator("dialog:modal").count(), 0);
      assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
    }
  }
}

async function checkNativeCloseSynchronization(page, waitForFocus) {
  for (const mode of ["api", "form", "reopen", "callback"]) {
    const trigger = page.getByRole("button", { name: `Open ${mode} native close`, exact: true });
    const dialog = page.getByRole("dialog", { name: `${mode} native close`, exact: true });
    const input = page.getByRole("textbox", { name: `${mode} native draft`, exact: true });
    const requests = page.getByTestId(`${mode}-native-requests`);
    const closes = page.getByTestId(`${mode}-native-closes`);
    const nativeEvents = page.getByTestId(`${mode}-native-events`);
    await trigger.click();
    await waitForFocus(input);
    await input.fill("Keep native draft");
    const denied = mode === "api" || mode === "form";
    for (let attempt = 1; attempt <= (denied ? 2 : 1); attempt += 1) {
      await input.press(mode === "form" ? "Enter" : "F2");
      await nativeEvents.filter({ hasText: String(attempt) }).waitFor();
      await waitForFrame(page);
      assert.equal(await page.getByTestId(`${mode}-native-open`).textContent(), "true");
      assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
      assert.equal(await requests.textContent(), denied ? String(attempt) : "0");
      assert.equal(await closes.textContent(), denied ? "0" : "1");
      await waitForFocus(input);
      if (denied) assert.equal(await input.inputValue(), "Keep native draft");
      assert.equal(
        await page.locator("html").evaluate((element) => element.style.overflow),
        "hidden",
      );
      assert.equal(
        await page.locator("body").evaluate((element) => element.style.overflow),
        "hidden",
      );
    }
    await page.getByRole("button", { name: `Rerender ${mode} native 0`, exact: true }).click();
    await waitForFrame(page);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    await page.getByRole("button", { name: `Accept ${mode} native close`, exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await waitForFocus(trigger);
    assert.equal(await page.getByTestId(`${mode}-native-open`).textContent(), "false");
    assert.equal(await requests.textContent(), denied ? "3" : "1");
    assert.equal(await closes.textContent(), denied ? "1" : "2");
    assert.equal(await nativeEvents.textContent(), denied ? "3" : "2");
    assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
    assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  }
}

async function waitForFrame(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function checkPendingTransition(page, waitForFocus) {
  const trigger = page.getByRole("button", { name: "Open transition dialog", exact: true });
  const dialog = page.getByRole("dialog", { name: "Transition dialog", exact: true });
  const input = page.getByRole("textbox", { name: "Transition draft", exact: true });

  for (const [index, action] of ["Cancel", "Resolve"].entries()) {
    await trigger.click();
    await input.fill("Preserved transition draft");
    const savedInput = await input.elementHandle();
    assert.ok(savedInput);
    try {
      await page.getByRole("button", { name: "Begin close transition", exact: true }).click();
      await page.getByTestId("transition-pending").filter({ hasText: "true" }).waitFor();
      await waitForFrame(page);
      assert.equal(await page.getByTestId("transition-open").textContent(), "true");
      await input.focus();
      await input.press("F2");
      await page
        .getByTestId("transition-requests")
        .filter({ hasText: String(index + 1) })
        .waitFor();
      await waitForFrame(page);
      assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
      assert.equal(await page.getByTestId("transition-closes").textContent(), String(index));
      assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
      assert.equal(await input.inputValue(), "Preserved transition draft");
      await waitForFocus(input);
      assert.equal(
        await page.locator("html").evaluate((element) => element.style.overflow),
        "hidden",
      );

      await page.getByRole("button", { name: `${action} close transition`, exact: true }).click();
      await page.getByTestId("transition-pending").filter({ hasText: "false" }).waitFor();
      if (action === "Cancel") {
        assert.equal(await page.getByTestId("transition-open").textContent(), "true");
        assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
        assert.equal(await input.inputValue(), "Preserved transition draft");
        assert.equal(await page.getByTestId("transition-closes").textContent(), "0");
        await page.getByRole("button", { name: "Finish transition dialog", exact: true }).click();
      }
      await dialog.waitFor({ state: "hidden" });
      await waitForFocus(trigger);
      assert.equal(await page.getByTestId("transition-open").textContent(), "false");
      assert.equal(await page.getByTestId("transition-closes").textContent(), String(index + 1));
      assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
      assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
    } finally {
      await savedInput.dispose();
    }
  }
}

async function checkDialogComposition(page, waitForFocus) {
  const originalTheme = await page.locator("html").getAttribute("data-theme");
  try {
    for (const theme of ["light", "dark"]) {
      await page.locator("html").evaluate((element, value) => {
        element.dataset.theme = value;
      }, theme);

      const portalTrigger = page.getByRole("button", { name: "Open portal dialog", exact: true });
      const portalDialog = page.getByRole("dialog", { name: "Portal dialog", exact: true });
      await portalTrigger.click();
      const draft = page.getByRole("textbox", { name: "Portal draft", exact: true });
      await draft.fill("Keep portal draft");
      const option = page.getByRole("button", { name: "Choose portal option", exact: true });
      const optionBounds = await option.boundingBox();
      const surfaceBounds = await portalDialog.locator(".djy-dialog__surface").boundingBox();
      assert.ok(optionBounds && surfaceBounds);
      assert.ok(optionBounds.x > surfaceBounds.x + surfaceBounds.width);
      await option.click();
      assert.equal(
        await page.getByTestId("portal-selections").textContent(),
        theme === "light" ? "1" : "2",
      );
      assert.equal(await portalDialog.evaluate((element) => element.matches(":modal")), true);
      assert.equal(await draft.inputValue(), "Keep portal draft");
      await page.mouse.move(optionBounds.x + 8, optionBounds.y + 8);
      await page.mouse.down();
      await page.mouse.move(1, 1);
      await page.mouse.up();
      assert.equal(await portalDialog.evaluate((element) => element.matches(":modal")), true);
      await page.mouse.click(1, 1);
      await portalDialog.waitFor({ state: "hidden" });
      await waitForFocus(portalTrigger);

      const keyboardTrigger = page.getByRole("button", {
        name: "Open keyboard dialog",
        exact: true,
      });
      const keyboardDialog = page.getByRole("dialog", { name: "Keyboard dialog", exact: true });
      const first = page.getByRole("textbox", { name: "First keyboard field", exact: true });
      const second = page.getByRole("textbox", { name: "Second keyboard field", exact: true });
      const finish = page.getByRole("button", { name: "Finish keyboard dialog", exact: true });
      await keyboardTrigger.click();
      await waitForFocus(first);
      await page.keyboard.press("Tab");
      await waitForFocus(second);
      await page.keyboard.press("Tab");
      await waitForFocus(finish);
      for (const [key, boundary] of [
        ["Tab", finish],
        ["Shift+Tab", first],
      ]) {
        await boundary.evaluate((element) => element.focus());
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await page.keyboard.press(key);
          // Native dialog boundaries may retain focus, wrap it, or allow browser chrome.
          // Background controls must remain outside the sequential focus order.
          const focus = await keyboardDialog.evaluate((element) => ({
            inside: element.contains(document.activeElement),
            browserChrome: !document.hasFocus() || document.activeElement === document.body,
          }));
          assert.ok(focus.inside || focus.browserChrome);
        }
      }
      await finish.evaluate((element) => element.focus());
      await page.keyboard.press("Shift+Tab");
      await waitForFocus(second);
      await page.keyboard.press("Shift+Tab");
      await waitForFocus(first);
      await keyboardTrigger.evaluate((element) => element.focus());
      await waitForFocus(first);
      await page.keyboard.press("Escape");
      await keyboardDialog.waitFor({ state: "hidden" });
      await waitForFocus(keyboardTrigger);
    }
  } finally {
    await page.locator("html").evaluate((element, theme) => {
      if (theme === null) element.removeAttribute("data-theme");
      else element.dataset.theme = theme;
    }, originalTheme);
  }

  const parentTrigger = page.getByRole("button", { name: "Open close parent", exact: true });
  const parent = page.getByRole("dialog", { name: "Close parent", exact: true });
  const child = page.getByRole("dialog", { name: "Close child", exact: true });
  const returnTarget = page.getByRole("button", { name: "Nested return target", exact: true });
  let closes = 0;
  for (const action of [
    "Close parent from child",
    "Close both dialogs",
    "Close native parent",
    "Unmount nested parent",
    "Close with callback focus",
    "Open next dialog",
  ]) {
    closes += 1;
    await parentTrigger.click();
    const childTrigger = page.getByRole("button", { name: "Open close child", exact: true });
    await childTrigger.click();
    await child.waitFor({ state: "visible" });
    await page.getByRole("button", { name: action, exact: true }).click();
    await parent.waitFor({ state: "hidden" });
    await child.waitFor({ state: "hidden" });
    await page
      .getByTestId("nested-parent-closes")
      .filter({ hasText: String(closes) })
      .waitFor();
    await page
      .getByTestId("nested-child-closes")
      .filter({ hasText: String(closes) })
      .waitFor();
    if (action === "Open next dialog") {
      const nextDraft = page.getByRole("textbox", { name: "Next dialog draft", exact: true });
      await waitForFocus(nextDraft);
      await waitForFrame(page);
      await waitForFocus(nextDraft);
      assert.equal(await page.locator("dialog:modal").count(), 1);
      assert.equal(
        await page.locator("html").evaluate((element) => element.style.overflow),
        "hidden",
      );
      await page.getByRole("button", { name: "Finish next dialog", exact: true }).click();
      await waitForFocus(page.getByRole("button", { name: "Next dialog trigger", exact: true }));
    } else {
      const target =
        action === "Close with callback focus"
          ? page.getByRole("button", { name: "Nested callback target", exact: true })
          : returnTarget;
      await waitForFocus(target);
      await waitForFrame(page);
      await waitForFocus(target);
      if (action === "Unmount nested parent") {
        assert.equal(await parent.count(), 0);
        await page.getByRole("button", { name: "Remount nested parent", exact: true }).click();
      }
    }
    assert.equal(await page.locator("dialog:modal").count(), 0);
    assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
    assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  }
}

async function assertVisibleFocus(locator) {
  const result = await locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const inside = (container) => {
      const clip = container.getBoundingClientRect();
      return bounds.top >= clip.top - 1 && bounds.bottom <= clip.bottom + 1;
    };
    return {
      focused: document.activeElement === element,
      viewport: bounds.top >= 0 && bounds.bottom <= innerHeight,
      body: inside(element.closest(".djy-dialog__body")),
      surface: inside(element.closest(".djy-dialog__surface")),
    };
  });
  assert.deepEqual(
    result,
    { focused: true, viewport: true, body: true, surface: true },
    JSON.stringify(
      await locator.evaluate((element) => ({
        label: element.getAttribute("aria-label") ?? element.id,
        target: element.getBoundingClientRect().toJSON(),
        body: element.closest(".djy-dialog__body").getBoundingClientRect().toJSON(),
        surface: element.closest(".djy-dialog__surface").getBoundingClientRect().toJSON(),
        viewport: [innerWidth, innerHeight],
      })),
    ),
  );
}

async function checkRejectedParentClose(page, waitForFocus) {
  let requests = 0;
  let nativeCloses = 0;
  let childCloses = 0;
  const parentTrigger = page.getByRole("button", { name: "Open retained parent", exact: true });
  const parent = page.getByRole("dialog", { name: "Retained parent", exact: true });
  const child = page.getByRole("dialog", { name: "Retained child", exact: true });
  for (const key of ["F2", "F3"]) {
    for (const nested of [false, true]) {
      await parentTrigger.click();
      const childTrigger = page.getByRole("button", { name: "Open retained child", exact: true });
      await childTrigger.click();
      if (nested) {
        await page.getByRole("button", { name: "Open retained grandchild", exact: true }).click();
      }
      const name = nested ? "Grandchild" : "Child";
      const top = page.getByRole("dialog", {
        name: `Retained ${name.toLowerCase()}`,
        exact: true,
      });
      const input = page.getByRole("textbox", { name: `${name} retained draft`, exact: true });
      await input.fill("Keep nested draft");
      const savedInput = await input.elementHandle();
      assert.ok(savedInput);
      // Repeat without accepting the close to catch queued reorder events as well.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        requests += 1;
        nativeCloses += 1;
        await input.press(key);
        await page
          .getByTestId("retained-parent-requests")
          .filter({ hasText: String(requests) })
          .waitFor();
        await waitForFrame(page);
        assert.equal(await parent.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await top.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
        assert.equal(await input.inputValue(), "Keep nested draft");
        await waitForFocus(input);
        assert.equal(
          await page.getByTestId("retained-parent-native-closes").textContent(),
          String(nativeCloses),
        );
        assert.equal(
          await page.getByTestId("retained-child-native-closes").textContent(),
          String(childCloses),
        );
        assert.equal(
          await page.getByTestId("retained-child-closes").textContent(),
          String(childCloses),
        );
        assert.equal(
          await page.locator("html").evaluate((element) => element.style.overflow),
          "hidden",
        );
      }
      await page.keyboard.press("Escape");
      await top.waitFor({ state: "hidden" });
      childCloses += 1;
      if (nested) {
        await waitForFocus(
          page.getByRole("button", { name: "Open retained grandchild", exact: true }),
        );
        assert.equal(await child.evaluate((element) => element.matches(":modal")), true);
        await page.keyboard.press("Escape");
        await child.waitFor({ state: "hidden" });
        childCloses += 1;
      }
      await waitForFocus(childTrigger);
      await page.getByRole("button", { name: "Finish retained parent", exact: true }).click();
      nativeCloses += 1;
      await parent.waitFor({ state: "hidden" });
      await waitForFocus(parentTrigger);
      assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
      assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
      await savedInput.dispose();
    }
  }
}

async function checkAsyncImageScroll(page, waitForFocus) {
  let receivedImage = () => {};
  let imageRequest;
  let imageHandled = false;
  const imageReady = new Promise((resolve) => {
    receivedImage = resolve;
  });
  const imageRoute = (route) => {
    imageRequest = route;
    receivedImage();
  };
  await page.route("**/dialog-image.svg", imageRoute);
  try {
    const trigger = page.getByRole("button", { name: "Open async image", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Async image", exact: true });
    const body = page.getByTestId("async-image-body");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="async-image-body"]')?.closest("dialog")?.dataset
          .overflowEnd === "false",
    );
    assert.equal(await body.getAttribute("tabindex"), null);
    await imageReady;
    await imageRequest.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="1000"><rect width="200" height="1000" fill="gray"/></svg>',
    });
    imageHandled = true;
    await page.waitForFunction(
      () => document.querySelector('[data-testid="async-image-body"] img')?.naturalHeight === 1000,
    );
    await waitForFrame(page);
    assert.ok(await body.evaluate((element) => element.scrollHeight > element.clientHeight));
    assert.equal(await dialog.getAttribute("data-overflow-end"), "true");
    assert.equal(await body.getAttribute("tabindex"), "0");
    assert.notEqual(
      await dialog
        .locator(".djy-dialog__scroll-fog")
        .evaluate((element) => getComputedStyle(element).backgroundImage),
      "none",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await waitForFocus(trigger);
  } finally {
    if (imageRequest && !imageHandled) await imageRequest.abort();
    await page.unroute("**/dialog-image.svg", imageRoute);
  }
}

async function checkScrollLockRestoration(page, waitForFocus) {
  const originalStyles = await page.evaluate(() =>
    [document.documentElement, document.body].map((element) => element.getAttribute("style")),
  );
  const readOverflow = () =>
    page.evaluate(() =>
      [document.documentElement, document.body].map((element) => {
        const computed = getComputedStyle(element);
        return {
          declarations: [
            "overflow",
            "overflow-x",
            "overflow-y",
            "overflow-block",
            "overflow-inline",
          ].map((property) => ({
            property,
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
          })),
          computed: [computed.overflowX, computed.overflowY],
        };
      }),
    );
  const assertLocked = async () => {
    assert.deepEqual(
      await page.evaluate(() =>
        [document.documentElement, document.body].map((element) => {
          const style = getComputedStyle(element);
          return [style.overflowX, style.overflowY];
        }),
      ),
      [
        ["hidden", "hidden"],
        ["hidden", "hidden"],
      ],
    );
  };
  try {
    for (const mode of [
      "important",
      "mixed",
      "variable",
      "variable-mixed",
      "axis-variable",
      "logical",
      "absent",
    ]) {
      await page.evaluate((mode) => {
        for (const element of [document.documentElement, document.body]) {
          element.style.removeProperty("overflow");
          element.style.removeProperty("overflow-block");
          element.style.removeProperty("overflow-inline");
          element.style.setProperty("--consumer-dialog-overflow", "scroll");
          element.style.setProperty("--consumer-padding", "12px");
          element.style.setProperty("padding", "var(--consumer-padding)");
          element.style.setProperty("padding-left", "0px");
          if (mode === "important") element.style.setProperty("overflow", "auto", "important");
          if (mode === "mixed") {
            element.style.setProperty("overflow-x", "hidden", "important");
            element.style.setProperty("overflow-y", "scroll");
          }
          if (mode === "variable" || mode === "variable-mixed") {
            element.style.setProperty("overflow", "var(--consumer-dialog-overflow)", "important");
            if (mode === "variable-mixed") element.style.setProperty("overflow-y", "auto");
          }
          if (mode === "axis-variable") {
            element.style.setProperty("overflow-x", "var(--consumer-dialog-overflow)", "important");
            element.style.setProperty("overflow-y", "auto");
          }
          if (mode === "logical") {
            element.style.setProperty("overflow-y", "scroll");
            element.style.setProperty("overflow-block", "hidden", "important");
            element.style.setProperty("overflow-inline", "auto", "important");
          }
        }
      }, mode);
      const before = await readOverflow();
      const paddingBefore = await page.evaluate(() =>
        [document.documentElement, document.body].map((element) => {
          const style = getComputedStyle(element);
          return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
        }),
      );
      const parentTrigger = page.getByTestId("parent-dialog-trigger");
      const childTrigger = page.getByTestId("child-dialog-trigger");
      await parentTrigger.click();
      await assertLocked();
      await childTrigger.click();
      await assertLocked();
      await page.evaluate(() => {
        for (const element of [document.documentElement, document.body]) {
          element.style.setProperty("--consumer-during-dialog", "preserved");
        }
      });
      await page.keyboard.press("Escape");
      await waitForFocus(childTrigger);
      await assertLocked();
      await page.keyboard.press("Escape");
      await waitForFocus(parentTrigger);
      const after = await readOverflow();
      if (mode === "variable-mixed") {
        // CSSOM cannot recover a shorthand's variable expression once only one
        // pending longhand remains. Its effective value and priority must survive.
        assert.deepEqual(
          after.map((style) => style.computed),
          before.map((style) => style.computed),
        );
        assert.deepEqual(
          after.map((style) => style.declarations.map((declaration) => declaration.priority)),
          before.map((style) => style.declarations.map((declaration) => declaration.priority)),
        );
      } else {
        assert.deepEqual(after, before, `Restore overflow declarations: ${mode}`);
      }
      assert.deepEqual(
        await page.evaluate(() =>
          [document.documentElement, document.body].map((element) =>
            element.style.getPropertyValue("--consumer-during-dialog"),
          ),
        ),
        ["preserved", "preserved"],
      );
      assert.deepEqual(
        await page.evaluate(() =>
          [document.documentElement, document.body].map((element) => {
            const style = getComputedStyle(element);
            return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
          }),
        ),
        paddingBefore,
        "Preserve unrelated pending shorthand values",
      );
      if (mode === "variable" || mode === "axis-variable") {
        await page.evaluate(() => {
          for (const element of [document.documentElement, document.body]) {
            element.style.setProperty("--consumer-dialog-overflow", "hidden");
          }
        });
        assert.deepEqual(
          await page.evaluate(() =>
            [document.documentElement, document.body].map((element) => {
              const style = getComputedStyle(element);
              return [style.overflowX, style.overflowY];
            }),
          ),
          mode === "variable"
            ? [
                ["hidden", "hidden"],
                ["hidden", "hidden"],
              ]
            : [
                ["hidden", "auto"],
                ["hidden", "auto"],
              ],
          `Keep overflow connected to its CSS variable: ${mode}`,
        );
      }
    }
  } finally {
    await page.evaluate((styles) => {
      [document.documentElement, document.body].forEach((element, index) => {
        const style = styles[index];
        if (style === null) element.removeAttribute("style");
        else element.setAttribute("style", style);
      });
    }, originalStyles);
  }
}

export async function checkDialogBoundaries(page, waitForFocus) {
  await checkRootDismissalPolicy(page, waitForFocus);
  await checkDialogNative(page, waitForFocus);
  await checkDialogComposition(page, waitForFocus);
  await checkNativeCloseSynchronization(page, waitForFocus);
  await checkPendingTransition(page, waitForFocus);
  await checkRejectedParentClose(page, waitForFocus);
  await checkAsyncImageScroll(page, waitForFocus);
  for (const name of ["Blocked", "Controlled", "Native", "Nested"]) {
    const nested = name === "Nested";
    const parentTrigger = page.getByRole("button", { name: "Open race parent", exact: true });
    const parent = page.getByRole("dialog", { name: "Race parent", exact: true });
    if (nested) {
      await parentTrigger.click();
      await parent.waitFor({ state: "visible" });
    }
    const trigger = page.getByRole("button", { name: `Open ${name} race`, exact: true });
    const dialog = page.getByTestId(`${name}-race-dialog`);
    const input = page.getByRole("textbox", { name: `${name} race draft`, exact: true });
    await trigger.click();
    await input.fill("Preserved draft");
    const savedInput = await input.elementHandle();
    assert.ok(savedInput);
    let cycle = 0;
    for (const action of ["Resolve", "Cancel", "Unmount"]) {
      cycle += 1;
      if (action === "Unmount") {
        await trigger.click();
        await input.waitFor({ state: "visible" });
      }
      // Exercise the non-cancelable native close ordering on every CI browser,
      // independently of its Escape activation budget.
      await dialog.evaluate((element, nativeRequest) => {
        if (nativeRequest) element.requestClose("confirmed");
        else element.dispatchEvent(new Event("cancel", { cancelable: false }));
      }, name === "Native");
      const resolve = page.getByRole("button", { name: `Resolve ${name} race`, exact: true });
      await resolve.waitFor({ state: "visible" });
      await page
        .getByTestId(`${name}-race-native-closes`)
        .filter({ hasText: String(cycle) })
        .waitFor();
      assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
      assert.equal(
        await page.getByTestId(`${name}-race-closes`).textContent(),
        cycle === 3 ? "1" : "0",
      );
      assert.equal(
        await page.getByTestId(`${name}-race-requests`).textContent(),
        name === "Controlled" || name === "Native" ? String(cycle) : "0",
      );
      if (name === "Native") {
        assert.equal(await dialog.evaluate((element) => element.returnValue), "confirmed");
      }
      assert.equal(
        await page.locator("html").evaluate((element) => element.style.overflow),
        nested ? "hidden" : "",
      );
      assert.equal(
        await page.locator("body").evaluate((element) => element.style.overflow),
        nested ? "hidden" : "",
      );
      if (nested) assert.equal(await parent.evaluate((element) => element.matches(":modal")), true);

      // Physical clicks also verify native inertness, not just DOM visibility.
      await page.getByRole("button", { name: `${action} ${name} race`, exact: true }).click();
      if (action === "Resolve") {
        await dialog.waitFor({ state: "visible" });
        assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
        assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
        assert.equal(await input.inputValue(), "Preserved draft");
        assert.equal(
          await page.locator("html").evaluate((element) => element.style.overflow),
          "hidden",
        );
      } else {
        await waitForFocus(trigger);
        assert.equal(
          await page.getByTestId(`${name}-race-closes`).textContent(),
          action === "Cancel" ? "1" : "2",
        );
        if (action === "Unmount") assert.equal(await dialog.count(), 0);
      }
    }
    await savedInput.dispose();
    if (nested) {
      await page.keyboard.press("Escape");
      await parent.waitFor({ state: "hidden" });
      await waitForFocus(parentTrigger);
    }
    assert.equal(await page.locator("dialog:modal").count(), 0);
    assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
    assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  }

  const originalViewport = page.viewportSize();
  const originalFontSize = await page.locator("html").evaluate((element) => element.style.fontSize);
  try {
    for (const name of ["Compact", "Long", "Async"]) {
      await page.setViewportSize({ width: 1280, height: 800 });
      const trigger = page.getByRole("button", { name: `Open ${name} viewport`, exact: true });
      const input = page.getByRole("textbox", { name: `${name} viewport draft`, exact: true });
      const dialog = page.getByTestId(`${name}-viewport-dialog`);
      const body = page.getByTestId(`${name}-viewport-body`);
      await trigger.scrollIntoViewIfNeeded();
      const backgroundScroll = await page.evaluate(() => scrollY);
      await trigger.click();
      if (name === "Async") {
        await page.getByRole("button", { name: "Resolve Async viewport", exact: true }).click();
      }
      await waitForFocus(input);
      await assertVisibleFocus(input);
      if (name !== "Async") assert.equal(await page.evaluate(() => scrollY), backgroundScroll);

      for (const [width, height, fontSize] of [
        [390, 320, 16],
        [390, 844, 16],
        [844, 390, 16],
        [390, 320, 32],
        [320, 240, 32],
        [1280, 800, 16],
      ]) {
        // Focus before resizing; a click afterwards would hide a missing scroll correction.
        await input.evaluate((element) => element.focus());
        await waitForFocus(input);
        await page.setViewportSize({ width, height });
        await page.locator("html").evaluate((element, size) => {
          element.style.fontSize = `${size}px`;
        }, fontSize);
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        assert.ok(await body.evaluate((element) => element.parentElement.clientHeight > 0));
        await assertVisibleFocus(input);
        await input.fill(`${width}x${height}`);
        await assertVisibleFocus(input);
        await page.keyboard.press("Tab");
        await waitForFocus(
          page.getByRole("button", { name: `Cancel ${name} viewport`, exact: true }),
        );
      }
      if (name === "Async") {
        await input.click();
        const savedInput = await input.elementHandle();
        assert.ok(savedInput);
        await input.press("F2");
        const resolve = page.getByRole("button", { name: "Resolve Async viewport", exact: true });
        await resolve.waitFor({ state: "visible" });
        await page.setViewportSize({ width: 390, height: 320 });
        await page.locator("html").evaluate((element) => {
          element.style.fontSize = "32px";
        });
        await resolve.click();
        await waitForFocus(input);
        await assertVisibleFocus(input);
        assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
        assert.equal(await input.inputValue(), "1280x800");
        await savedInput.dispose();
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.locator("html").evaluate((element) => {
          element.style.fontSize = "16px";
        });
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await waitForFocus(trigger);
      assert.equal(await page.locator("html").evaluate((element) => element.style.overflow), "");
      // A fresh session must also scroll the explicit initial target into view.
      await trigger.click();
      await waitForFocus(input);
      await assertVisibleFocus(input);
      await page.keyboard.press("Escape");
      await waitForFocus(trigger);
    }
  } finally {
    await page.locator("html").evaluate((element, size) => {
      element.style.fontSize = size;
    }, originalFontSize);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
  await checkScrollLockRestoration(page, waitForFocus);
}
