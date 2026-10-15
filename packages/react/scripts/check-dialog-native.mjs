import { strict as assert } from "node:assert";

async function waitForFrame(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function assertUnlocked(page) {
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.style.overflow,
      document.body.style.overflow,
    ]),
    ["", ""],
  );
}

async function checkCanceledOpening(page, waitForFocus) {
  for (const mode of ["uncontrolled", "controlled", "retained"]) {
    const trigger = page.getByRole("button", { name: `Open ${mode} opening`, exact: true });
    const dialog = page.getByTestId(`${mode}-opening-dialog`);
    await trigger.click();
    await page.getByTestId(`${mode}-opening-attempts`).filter({ hasText: "1" }).waitFor();
    await waitForFrame(page);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    assert.equal(await page.getByTestId(`${mode}-opening-requests`).textContent(), "1");
    assert.equal(await page.getByTestId(`${mode}-opening-closes`).textContent(), "0");
    assert.equal(await page.locator("dialog:modal").count(), 0);
    await assertUnlocked(page);
    assert.equal(
      await page.getByTestId(`${mode}-opening-open`).textContent(),
      mode === "retained" ? "true" : "false",
    );
    if (mode === "retained") {
      await page.getByRole("button", { name: "Reset retained opening", exact: true }).click();
      await waitForFrame(page);
      assert.equal(await page.getByTestId(`${mode}-opening-attempts`).textContent(), "1");
    }
    await trigger.click();
    const child = page.getByRole("dialog", { name: `${mode} opening child`, exact: true });
    await child.waitFor({ state: "visible" });
    await waitForFrame(page);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await page.getByTestId(`${mode}-opening-attempts`).textContent(), "2");
    await page.keyboard.press("Escape");
    await child.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: `Finish ${mode} opening`, exact: true }).click();
    await waitForFocus(trigger);
    await page.getByTestId(`${mode}-opening-closes`).filter({ hasText: "1" }).waitFor();
    assert.equal(await page.getByTestId(`${mode}-opening-closes`).textContent(), "1");
    await assertUnlocked(page);
  }

  const trigger = page.getByRole("button", { name: "Open canceled reveal", exact: true });
  await trigger.click();
  await page.getByRole("textbox", { name: "Canceled reveal draft", exact: true }).fill("Draft");
  await page.getByRole("button", { name: "Suspend canceled reveal", exact: true }).click();
  const resolve = page.getByRole("button", { name: "Resolve canceled reveal", exact: true });
  await resolve.waitFor({ state: "visible" });
  await waitForFrame(page);
  await assertUnlocked(page);
  await resolve.click();
  await page.getByTestId("canceled-reveal-closes").filter({ hasText: "1" }).waitFor();
  await waitForFocus(trigger);
  assert.equal(await page.getByTestId("canceled-reveal-native-closes").textContent(), "0");
  await assertUnlocked(page);
  await trigger.click();
  await page.getByRole("textbox", { name: "Canceled reveal draft", exact: true }).waitFor();
  await page.getByRole("button", { name: "Finish canceled reveal", exact: true }).click();
  await waitForFocus(trigger);
  assert.equal(await page.getByTestId("canceled-reveal-closes").textContent(), "2");
  await assertUnlocked(page);

  const reopeningTrigger = page.getByRole("button", {
    name: "Open canceled reopening",
    exact: true,
  });
  await reopeningTrigger.click();
  await page.getByRole("textbox", { name: "Canceled reopening draft", exact: true }).press("F2");
  await page.getByTestId("canceled-reopening-closes").filter({ hasText: "1" }).waitFor();
  await page.getByTestId("canceled-reopening-child-closes").filter({ hasText: "1" }).waitFor();
  await waitForFocus(reopeningTrigger);
  assert.equal(await page.getByTestId("canceled-reopening-requests").textContent(), "1");
  assert.equal(await page.locator("dialog:modal").count(), 0);
  await assertUnlocked(page);
  await page.getByRole("button", { name: "Reset canceled reopening", exact: true }).click();
}

async function checkRemovedTriggers(page, waitForFocus) {
  for (const remove of ["first", "last"]) {
    const opener = page.getByRole("button", {
      name: `${remove === "first" ? "First" : "Last"} ${remove} removal trigger`,
      exact: true,
    });
    const remaining = page.getByRole("button", {
      name: `${remove === "first" ? "Last" : "First"} ${remove} removal trigger`,
      exact: true,
    });
    await opener.click();
    await page.getByRole("button", { name: `Remove ${remove} trigger`, exact: true }).click();
    await page.getByRole("button", { name: `Finish ${remove} removal`, exact: true }).click();
    await waitForFocus(remaining);
    await assertUnlocked(page);
  }
}

async function checkTriggerSessions(page, waitForFocus) {
  const first = page.getByRole("button", { name: "First trigger session trigger", exact: true });
  const last = page.getByRole("button", { name: "Last trigger session trigger", exact: true });
  const programmatic = page.getByRole("button", {
    name: "Open programmatic trigger session",
    exact: true,
  });
  const dialog = page.getByTestId("trigger-session-dialog");
  const input = page.getByRole("textbox", { name: "Trigger session draft", exact: true });
  let closes = 0;
  let nativeCloses = 0;
  let requests = 0;
  const assertCounters = async () => {
    for (const [id, expected] of [
      ["closes", closes],
      ["native-closes", nativeCloses],
      ["requests", requests],
    ]) {
      assert.equal(await page.getByTestId(`trigger-session-${id}`).textContent(), String(expected));
    }
  };
  const open = async (trigger) => {
    await trigger.click();
    await waitForFocus(input);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
  };
  const finish = async (target) => {
    await page.getByRole("button", { name: "Finish trigger session", exact: true }).click();
    closes += 1;
    nativeCloses += 1;
    requests += 1;
    await dialog.waitFor({ state: "hidden" });
    await waitForFocus(target);
    await waitForFrame(page);
    await assertCounters();
    await assertUnlocked(page);
  };
  const programmaticSession = async () => {
    await open(programmatic);
    await finish(last);
  };

  await programmaticSession();
  for (const trigger of [first, last, first]) {
    await open(trigger);
    await finish(trigger);
    await programmaticSession();
  }

  await open(first);
  await input.fill("Preserve trigger session draft");
  const savedInput = await input.elementHandle();
  assert.ok(savedInput);
  try {
    const suspend = page.getByRole("button", { name: "Suspend trigger session", exact: true });
    await suspend.click();
    const resolve = page.getByRole("button", { name: "Resolve trigger session", exact: true });
    await resolve.waitFor({ state: "visible" });
    await waitForFrame(page);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    await assertUnlocked(page);
    await assertCounters();
    await resolve.click();
    await waitForFocus(suspend);
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
    assert.equal(await input.inputValue(), "Preserve trigger session draft");
    await finish(first);
  } finally {
    await savedInput.dispose();
  }

  await open(first);
  await input.fill("Keep rejected trigger session draft");
  const reject = page.getByRole("button", {
    name: "Reject native trigger session close",
    exact: true,
  });
  await reject.click();
  nativeCloses += 1;
  requests += 1;
  await page
    .getByTestId("trigger-session-requests")
    .filter({ hasText: String(requests) })
    .waitFor();
  await waitForFocus(reject);
  await waitForFrame(page);
  assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
  assert.equal(await input.inputValue(), "Keep rejected trigger session draft");
  await assertCounters();
  await finish(first);

  await open(first);
  await input.fill("Previous trigger session draft");
  await page
    .getByRole("button", { name: "Reopen trigger session with last trigger", exact: true })
    .click();
  closes += 1;
  nativeCloses += 1;
  await waitForFocus(input);
  await waitForFrame(page);
  assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
  assert.equal(await input.inputValue(), "");
  await assertCounters();
  await finish(last);
  await programmaticSession();

  await page.getByRole("button", { name: "Cancel trigger session opening", exact: true }).click();
  requests += 1;
  await page.getByTestId("trigger-session-canceled-openings").filter({ hasText: "1" }).waitFor();
  await waitForFrame(page);
  assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
  await assertCounters();
  await assertUnlocked(page);
  await programmaticSession();

  await open(
    page.getByRole("button", { name: "Open explicit return trigger session", exact: true }),
  );
  await finish(page.getByRole("button", { name: "Trigger session return target", exact: true }));

  await open(last);
  await page.getByRole("button", { name: "Click first trigger while open", exact: true }).click();
  await finish(last);
  await programmaticSession();
}

async function checkRequestClose(page, waitForFocus) {
  for (const mode of ["accepted", "rejected", "prevented", "sync-accepted", "sync-rejected"]) {
    const accepted = mode === "accepted" || mode === "sync-accepted";
    const rejected = mode === "rejected" || mode === "sync-rejected";
    const trigger = page.getByRole("button", { name: `Open ${mode} request close`, exact: true });
    const dialog = page.getByRole("dialog", { name: `${mode} request close`, exact: true });
    const input = page.getByRole("textbox", { name: `${mode} request close draft`, exact: true });
    const requests = page.getByTestId(`${mode}-request-close-requests`);
    const closes = page.getByTestId(`${mode}-request-close-closes`);
    const nativeCloses = page.getByTestId(`${mode}-request-close-native-closes`);
    const result = page.getByTestId(`${mode}-request-close-result`);
    await trigger.click();
    await input.fill("Preserve request close draft");
    const savedInput = await input.elementHandle();
    assert.ok(savedInput);
    await input.press("F2");
    await waitForFrame(page);
    assert.equal(await requests.textContent(), mode === "prevented" ? "0" : "1");
    assert.equal(await nativeCloses.textContent(), mode === "prevented" ? "0" : "1");
    if (accepted) {
      await waitForFocus(trigger);
      assert.equal(await closes.textContent(), "1");
      assert.equal(await result.textContent(), "confirmed");
    } else {
      await waitForFocus(input);
      assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
      assert.equal(await input.evaluate((element, saved) => element === saved, savedInput), true);
      assert.equal(await input.inputValue(), "Preserve request close draft");
      assert.equal(await closes.textContent(), "0");
      assert.equal(await result.textContent(), mode === "prevented" ? "" : "confirmed");
      // A cancel without a native default action must not swallow a later close().
      await dialog.evaluate((element) =>
        element.dispatchEvent(new Event("cancel", { cancelable: true })),
      );
      await waitForFrame(page);
      await input.press("F3");
      await waitForFrame(page);
      assert.equal(await requests.textContent(), mode === "prevented" ? "1" : "3");
      if (rejected) {
        await waitForFocus(input);
        assert.equal(await input.inputValue(), "Preserve request close draft");
        await page
          .getByRole("button", { name: `Finish ${mode} request close`, exact: true })
          .click();
      }
      await waitForFocus(trigger);
      assert.equal(await closes.textContent(), "1");
      assert.equal(await nativeCloses.textContent(), mode === "prevented" ? "1" : "3");
      assert.equal(await result.textContent(), "direct");
    }
    await savedInput.dispose();
    await assertUnlocked(page);
  }

  const mode = "sync-reopened";
  const trigger = page.getByRole("button", { name: `Open ${mode} request close`, exact: true });
  const dialog = page.getByRole("dialog", { name: `${mode} request close`, exact: true });
  const input = page.getByRole("textbox", { name: `${mode} request close draft`, exact: true });
  await trigger.click();
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await input.fill("Previous session draft");
    await input.press("F2");
    await page
      .getByTestId(`${mode}-request-close-closes`)
      .filter({ hasText: String(attempt) })
      .waitFor();
    await waitForFrame(page);
    assert.equal(
      await page.getByTestId(`${mode}-request-close-requests`).textContent(),
      String(attempt),
    );
    assert.equal(
      await page.getByTestId(`${mode}-request-close-native-closes`).textContent(),
      String(attempt),
    );
    assert.equal(await page.getByTestId(`${mode}-request-close-result`).textContent(), "confirmed");
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await input.inputValue(), "");
    await waitForFocus(input);
    assert.equal(
      await page.locator("html").evaluate((element) => element.style.overflow),
      "hidden",
    );
    assert.equal(
      await page.locator("body").evaluate((element) => element.style.overflow),
      "hidden",
    );
  }
  await page.getByRole("button", { name: `Finish ${mode} request close`, exact: true }).click();
  await waitForFocus(trigger);
  assert.equal(await page.getByTestId(`${mode}-request-close-requests`).textContent(), "2");
  assert.equal(await page.getByTestId(`${mode}-request-close-closes`).textContent(), "3");
  assert.equal(await page.getByTestId(`${mode}-request-close-native-closes`).textContent(), "3");
  await assertUnlocked(page);
}

async function checkNativeCloseDuringSuspense(page, waitForFocus) {
  for (const source of ["api", "form"]) {
    for (const mode of ["accepted", "rejected", "fast", "reopened"]) {
      const name = `${source} ${mode} suspended close`;
      const trigger = page.getByRole("button", { name: `Open ${name}`, exact: true });
      const dialog = page.getByRole("dialog", { name, exact: true });
      const input = page.getByRole("textbox", { name: `${name} draft`, exact: true });
      const close = page.getByRole("button", { name: `Close ${name} and load`, exact: true });
      const nativeCloses = page.getByTestId(`${name}-native-closes`);
      const requests = page.getByTestId(`${name}-requests`);
      const closes = page.getByTestId(`${name}-closes`);
      await trigger.click();
      await waitForFocus(input);
      await input.fill("Keep suspended native draft");
      const savedInput = await input.elementHandle();
      assert.ok(savedInput);
      try {
        for (let attempt = 1; attempt <= (mode === "rejected" ? 2 : 1); attempt += 1) {
          if (attempt === 1) await close.click();
          else await input.press("F2");
          await nativeCloses.filter({ hasText: String(attempt) }).waitFor();
          await waitForFrame(page);
          assert.equal(await requests.textContent(), String(attempt), name);
          assert.equal(await page.getByTestId(`${name}-result`).textContent(), "saved");
          if (mode === "rejected") {
            const resolve = page.getByRole("button", {
              name: `Resolve ${name} load`,
              exact: true,
            });
            await resolve.waitFor({ state: "visible" });
            assert.equal(await closes.textContent(), "0");
            assert.equal(await page.locator("dialog:modal").count(), 0);
            await assertUnlocked(page);
            await resolve.click();
            await waitForFocus(attempt === 1 ? close : input);
            assert.equal(
              await input.evaluate((element, saved) => element === saved, savedInput),
              true,
            );
            assert.equal(await input.inputValue(), "Keep suspended native draft");
            assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
            assert.equal(
              await page.locator("html").evaluate((element) => element.style.overflow),
              "hidden",
            );
          } else if (mode === "reopened") {
            await waitForFocus(input);
            assert.equal(
              await input.evaluate((element, saved) => element === saved, savedInput),
              false,
            );
            assert.equal(await input.inputValue(), "");
            assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
            assert.equal(await closes.textContent(), "1");
          } else {
            await waitForFocus(trigger);
            assert.equal(await closes.textContent(), "1");
            await assertUnlocked(page);
            await page.getByRole("button", { name: `Complete ${name} load`, exact: true }).click();
            await waitForFrame(page);
            assert.equal(await page.locator("dialog:modal").count(), 0);
          }
          assert.equal(await requests.textContent(), String(attempt), name);
          assert.equal(await nativeCloses.textContent(), String(attempt), name);
        }
        if (mode === "rejected" || mode === "reopened") {
          await page.getByRole("button", { name: `Finish ${name}`, exact: true }).click();
          await waitForFocus(trigger);
          assert.equal(await closes.textContent(), mode === "rejected" ? "1" : "2");
        }
        await assertUnlocked(page);
      } finally {
        await savedInput.dispose();
      }
    }
  }
}

async function checkRequestCloseDuringReveal(page, waitForFocus) {
  const cases = [
    ...[
      "accepted",
      "rejected",
      "sync-accepted",
      "sync-rejected",
      "reopened",
      "uncontrolled",
      "prevented",
      "blocked",
      "canceled",
      "transition",
    ].map((mode) => ({ mode, reveal: "instant", nested: false })),
    ...["promise", "slow"].flatMap((reveal) =>
      ["accepted", "rejected"].map((mode) => ({ mode, reveal, nested: false })),
    ),
    ...["accepted", "rejected"].map((mode) => ({ mode, reveal: "instant", nested: true })),
    { mode: "sync-rejected", reveal: "slow", nested: false },
  ];
  for (const { mode, reveal, nested } of cases) {
    const name = `${mode} ${reveal} ${nested ? "nested " : ""}request reveal`;
    const blocked = mode === "prevented" || mode === "blocked";
    const retained = mode === "rejected" || mode === "sync-rejected" || mode === "transition";
    const trigger = page.getByRole("button", { name: `Open ${name}`, exact: true });
    const dialog = page.getByRole("dialog", { name, exact: true });
    const input = page.getByRole("textbox", { name: `${name} draft`, exact: true });
    const requests = page.getByTestId(`${name}-requests`);
    const closes = page.getByTestId(`${name}-closes`);
    const nativeCloses = page.getByTestId(`${name}-native-closes`);
    await trigger.click();
    await waitForFocus(input);
    await input.fill("Preserve reveal draft");
    const savedInput = await input.elementHandle();
    assert.ok(savedInput);
    try {
      await input.press("F2");
      if (!blocked) await requests.filter({ hasText: "1" }).waitFor();
      if (reveal === "slow" && retained) {
        await page.getByText(`Loading ${name}`, { exact: true }).waitFor();
        await waitForFrame(page);
        await assertUnlocked(page);
        if (mode === "sync-rejected") {
          await page.getByRole("button", { name: `Unmount ${name}`, exact: true }).click();
          await waitForFocus(trigger);
          await page.getByRole("button", { name: `Reveal ${name}`, exact: true }).click();
          await waitForFrame(page);
          assert.equal(await requests.textContent(), "1");
          assert.equal(await nativeCloses.textContent(), "1");
          assert.equal(await closes.textContent(), "1");
          assert.equal(await page.locator("dialog:modal").count(), 0);
          await assertUnlocked(page);
          continue;
        }
        await page.getByRole("button", { name: `Reveal ${name}`, exact: true }).click();
      }
      if (retained || blocked || mode === "reopened") {
        await waitForFocus(input);
        assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true, name);
        assert.equal(
          await input.evaluate((element, saved) => element === saved, savedInput),
          mode !== "reopened",
          name,
        );
        assert.equal(await input.inputValue(), mode === "reopened" ? "" : "Preserve reveal draft");
        assert.equal(await closes.textContent(), mode === "reopened" ? "1" : "0");
        if (nested) {
          const child = page.getByRole("dialog", { name: `${name} child`, exact: true });
          assert.equal(await child.evaluate((element) => element.matches(":modal")), true);
          assert.equal(await page.getByTestId(`${name}-child-closes`).textContent(), "0");
        }
        assert.equal(
          await page.locator("html").evaluate((element) => element.style.overflow),
          "hidden",
        );
      } else if (mode === "canceled") {
        await waitForFrame(page);
        assert.equal(await page.locator("dialog:modal").count(), 0);
        assert.equal(await closes.textContent(), "0");
        await assertUnlocked(page);
      } else {
        await waitForFocus(trigger);
        assert.equal(await page.locator("dialog:modal").count(), 0);
        assert.equal(await closes.textContent(), "1");
        if (nested) assert.equal(await page.getByTestId(`${name}-child-closes`).textContent(), "1");
        await assertUnlocked(page);
        if (reveal === "slow") {
          await page.getByRole("button", { name: `Reveal ${name}`, exact: true }).click();
          await waitForFrame(page);
          assert.equal(await page.locator("dialog:modal").count(), 0);
        }
      }
      await waitForFrame(page);
      assert.equal(await requests.textContent(), blocked ? "0" : "1", name);
      assert.equal(await nativeCloses.textContent(), blocked ? "0" : "1", name);
      assert.equal(await page.getByTestId(`${name}-result`).textContent(), blocked ? "" : "saved");
      assert.equal(
        await page.getByTestId(`${name}-request-result`).textContent(),
        blocked ? "" : "saved",
        `Record result before requesting ${name}`,
      );
      if (mode === "transition") {
        await page
          .getByRole("button", { name: `Cancel transition ${name}`, exact: true })
          .evaluate((element) => element.click());
        await waitForFrame(page);
        await waitForFocus(input);
        assert.equal(await input.inputValue(), "Preserve reveal draft");
        assert.equal(await closes.textContent(), "0");
        assert.equal(await requests.textContent(), "1");
        assert.equal(await nativeCloses.textContent(), "1");
        await input.press("F2");
        await requests.filter({ hasText: "2" }).waitFor();
        await nativeCloses.filter({ hasText: "2" }).waitFor();
        await waitForFocus(input);
        assert.equal(await closes.textContent(), "0");
        await page
          .getByRole("button", { name: `Resolve transition ${name}`, exact: true })
          .evaluate((element) => element.click());
        await waitForFocus(trigger);
        await waitForFrame(page);
        assert.equal(await requests.textContent(), "2");
        // The accepted transition closes a restored modal: this is another real native event.
        assert.equal(await nativeCloses.textContent(), "3");
        assert.equal(await closes.textContent(), "1");
        await assertUnlocked(page);
        continue;
      }
      if (retained || blocked || mode === "reopened" || mode === "canceled") {
        // Change the controlled owner directly, including when a child makes it inert.
        await page
          .getByRole("button", { name: `Finish ${name}`, exact: true })
          .evaluate((element) => element.click());
        await waitForFocus(trigger);
        assert.equal(await closes.textContent(), mode === "reopened" ? "2" : "1");
      }
      await assertUnlocked(page);
    } finally {
      await savedInput.dispose();
    }
  }
}

export async function checkDialogNative(page, waitForFocus) {
  await checkCanceledOpening(page, waitForFocus);
  await checkRemovedTriggers(page, waitForFocus);
  await checkTriggerSessions(page, waitForFocus);
  await checkRequestClose(page, waitForFocus);
  await checkNativeCloseDuringSuspense(page, waitForFocus);
  await checkRequestCloseDuringReveal(page, waitForFocus);
}
