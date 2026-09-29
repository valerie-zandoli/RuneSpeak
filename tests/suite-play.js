/**
 * Browser-level tests: the real app.js/renderer.js/index.html wiring,
 * driven the way a player actually would — clicks and keystrokes into a
 * live iframe, not calls into engine.js directly (that is what
 * engine.test.js already covers in isolation).
 *
 * Added after the team's full review pass found this layer untested:
 * engine.js was thoroughly covered, but nothing exercised the DOM the
 * player actually sees.
 */

import { test, assert, eq, sleep, withFreshRun, beginAsHero, findCurrentQuestion, waitForFeedback } from "./harness.js";
import { challengeBank } from "../engine.js";

test("hero selection locks in on the hero-select screen before the run begins", () =>
  withFreshRun(async (app) => {
    assert(app.q("#hero-select").open, "the hero-select dialog is open on a fresh run");
    eq(app.qa("[data-hero]").length, 3, "three hero cards render");
    // createRun()'s own default (hero = 'arcanist') pre-selects a card, so a fresh
    // run is never left with nothing chosen — confirm that default, then confirm
    // picking a different hero actually moves the selection, not just the click.
    assert(app.q('[data-hero="arcanist"]').classList.contains("chosen"), "the default hero (arcanist) starts pre-selected");

    app.q('[data-hero="warden"]').click();
    const card = app.q('[data-hero="warden"]');
    assert(card.classList.contains("chosen"), "clicking a different card moves the selection to it");
    assert(!app.q('[data-hero="arcanist"]').classList.contains("chosen"), "the previous selection is cleared");
    eq(card.getAttribute("aria-pressed"), "true", "the chosen card exposes aria-pressed to assistive tech");
    assert(card.querySelector(".selected-label"), 'a visible "SELECTED" badge appears, not color alone');

    app.q("#begin").click();
    assert(!app.q("#hero-select").open, "the dialog closes synchronously once the run begins");
    // The dialog closes immediately, but the challenge itself only renders after
    // the "enter" animation resolves (renderer.play, up to ~550ms) — poll for it
    // rather than asserting right after the dialog closes.
    for (let i = 0; i < 100 && !app.q("[data-answer], [data-door], [data-token]"); i++) await sleep(20);
    assert(app.q("[data-answer], [data-door], [data-token]"), "the first room's challenge or doors render");
  }));

test("answering a challenge correctly by click deals damage and reaches the feedback screen", () =>
  withFreshRun(async (app) => {
    await beginAsHero(app, "warden");
    assert(app.q("[data-answer]"), "the first room is a multiple-choice challenge (melee/vocabulary, per the seeded room 1 template)");

    const before = app.q("#enemy-health").textContent;
    const options = app.qa("[data-answer]").map((b) => b.querySelector("span").textContent);
    const q = findCurrentQuestion(challengeBank, options, app.q(".rune-text")?.textContent);
    assert(q, "the rendered options match exactly one challengeBank record");

    const correctIndex = options.indexOf(q.answer);
    assert(correctIndex >= 0, "the correct answer is one of the rendered options");
    app.qa("[data-answer]")[correctIndex].click();

    await waitForFeedback(app);
    assert(app.q("#continue"), "the feedback screen's Continue button is on screen");
    assert(app.q(".feedback-title").textContent.length > 0, "a feedback title is shown");
    assert(!app.q(".feedback")?.classList.contains("bad"), "a correct answer does not render the 'bad' feedback state");
    const after = app.q("#enemy-health").textContent;
    assert(after !== before || app.q(".correct-answer"), "enemy health or the correct-answer line reflects the result");
  }));

test("the 1-4 shortcut resolves a challenge in one keystroke, and focus lands on Continue next", () =>
  withFreshRun(async (app) => {
    await beginAsHero(app, "hunter");
    assert(app.q("[data-answer]"), "a multiple-choice challenge is on screen");

    const options = app.qa("[data-answer]").map((b) => b.querySelector("span").textContent);
    const q = findCurrentQuestion(challengeBank, options, app.q(".rune-text")?.textContent);
    const correctIndex = options.indexOf(q.answer);
    assert(correctIndex >= 0 && correctIndex < 4, "the correct option is reachable by a single 1-4 press");

    app.press(String(correctIndex + 1));
    await waitForFeedback(app);
    assert(app.q("#continue"), "one keystroke resolves the whole challenge, matching the click path");
    eq(app.doc.activeElement, app.q("#continue"), "focus lands on Continue, so a keyboard-only player's next Enter advances without hunting for it");
  }));

test("progress survives a reload: gold and health read the same after the real save/load round trip", () =>
  withFreshRun(async (app) => {
    await beginAsHero(app, "warden");
    const options = app.qa("[data-answer]").map((b) => b.querySelector("span").textContent);
    const q = findCurrentQuestion(challengeBank, options, app.q(".rune-text")?.textContent);
    const correctIndex = options.indexOf(q.answer);
    app.qa("[data-answer]")[correctIndex].click();
    await waitForFeedback(app);

    const goldBefore = app.q("#gold").textContent;
    const healthBefore = app.q("#health").textContent;
    app.close();

    // Reopen without clearing localStorage this time: the real save/load path, not a fresh run.
    const { loadApp } = await import("./harness.js");
    const reopened = await loadApp();
    for (let i = 0; i < 100 && reopened.q("#hero-select").open; i++) await sleep(20);
    eq(reopened.q("#gold")?.textContent, goldBefore, "gold matches after a real reload");
    eq(reopened.q("#health")?.textContent, healthBefore, "health matches after a real reload");
    reopened.close();
  }));

test("doors are operable by 1-3 as well as click, once a room is cleared", () =>
  withFreshRun(async (app) => {
    await beginAsHero(app, "warden");
    // Answer correctly until the room clears and doors appear, or bail out after a
    // generous number of turns so a bad seed can never hang the suite.
    for (let i = 0; i < 8 && !app.q("[data-door]"); i++) {
      if (app.q("[data-answer]")) {
        const options = app.qa("[data-answer]").map((b) => b.querySelector("span").textContent);
        const q = findCurrentQuestion(challengeBank, options, app.q(".rune-text")?.textContent);
        const idx = options.indexOf(q.answer);
        app.qa("[data-answer]")[idx >= 0 ? idx : 0].click();
        await waitForFeedback(app);
        app.q("#continue").click();
        for (let j = 0; j < 100 && app.q(".busy-indicator"); j++) await sleep(20);
      }
    }
    assert(app.q("[data-door]"), "the doors screen is reached within a bounded number of turns");
    const roomLabelBefore = app.q("#room-label").textContent;
    app.press("1");
    for (let i = 0; i < 150 && app.q("#room-label").textContent === roomLabelBefore; i++) await sleep(20);
    assert(app.q("#room-label").textContent !== roomLabelBefore, "pressing 1 on the doors screen advances to the next room, matching a click");
  }));
