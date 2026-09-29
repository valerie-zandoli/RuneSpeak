/**
 * Tiny in-browser test harness. No dependencies — ported from
 * duolingo-lite's tests/harness.js, adapted for RuneSpeak's single
 * localStorage save (SAVE_KEY below) instead of separate state modules.
 *
 * A suite file imports { test, todo, ... } from here and registers tests.
 * browser-tests.js imports every suite, then calls run().
 */

const registered = [];

/** Register a test. `fn` may be async; throw (or call assert) to fail. */
export function test(name, fn) {
  registered.push({ name, fn, todo: false });
}

/** Register a known gap. It runs and reports, but a failure does not fail the run. */
export function todo(name, fn) {
  registered.push({ name, fn, todo: true });
}

export function assert(condition, message = "assertion failed") {
  if (!condition) throw new Error(message);
}

export function eq(actual, expected, message = "") {
  if (actual !== expected) {
    throw new Error(`${message ? message + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function run() {
  const out = document.getElementById("results");
  const summary = document.getElementById("summary");
  const results = [];

  for (const t of registered) {
    let status = "pass";
    let detail = "";
    try {
      await t.fn();
    } catch (err) {
      status = t.todo ? "todo" : "fail";
      detail = err.message;
    }
    if (t.todo && status === "pass") detail = "(known gap now passes: promote it to a normal test)";
    results.push({ name: t.name, status, detail });
    const line = document.createElement("div");
    line.className = status;
    line.textContent = `${status.toUpperCase().padEnd(4)}  ${t.name}${detail ? "\n        " + detail : ""}`;
    out.appendChild(line);
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  const failed = count("fail");
  summary.textContent = `${count("pass")} passed, ${failed} failed, ${count("todo")} known gaps`;
  summary.className = failed ? "fail" : "pass";
  window.__testResults = { passed: count("pass"), failed, todo: count("todo"), results };
  return window.__testResults;
}

// ---------------------------------------------------------------------------
// Shared fixtures

export const SAVE_KEY = "runespeak-v2";

/**
 * Load the real app in an iframe. Resolves once the hero-select dialog
 * has rendered its three cards (the app's first paint on a fresh save).
 */
export async function loadApp(width = 960, height = 760) {
  const frame = document.createElement("iframe");
  frame.style.cssText = `width:${width}px;height:${height}px`;
  frame.src = "../index.html";
  document.getElementById("frames").appendChild(frame);
  await new Promise((resolve) => (frame.onload = resolve));

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  for (let i = 0; i < 100 && !doc.querySelector("#hero-cards [data-hero]"); i++) await sleep(20);

  const errors = [];
  win.addEventListener("error", (e) => errors.push(e.message));
  win.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

  const q = (selector) => doc.querySelector(selector);
  const qa = (selector) => [...doc.querySelectorAll(selector)];
  const press = (key) => doc.dispatchEvent(new win.KeyboardEvent("keydown", { key, bubbles: true }));
  return { frame, win, doc, q, qa, press, errors, close: () => frame.remove() };
}

/**
 * Run `fn(app)` against a fresh run (no prior save), then restore
 * whatever real save was in this browser before and after — the same
 * pattern duolingo-lite's XP tests use, so running the suite never
 * touches a real, in-progress dungeon run on the machine that runs it.
 */
export async function withFreshRun(fn, { width, height } = {}) {
  const realSave = localStorage.getItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY);
  const app = await loadApp(width, height);
  try {
    await fn(app);
  } finally {
    app.close();
    if (realSave === null) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, realSave);
  }
}

/** Pick a hero and start the run. Waits for the first challenge (or doors) screen. */
export async function beginAsHero(app, heroId = "warden") {
  app.q(`[data-hero="${heroId}"]`).click();
  app.q("#begin").click();
  for (let i = 0; i < 100 && !app.q("[data-answer], [data-door], [data-token]"); i++) await sleep(20);
}

/**
 * Find the challengeBank record matching the options currently on screen,
 * by comparing the *set* of rendered option labels against each record's
 * options — robust to shuffled order, and does not require reading the
 * app's internal state (which app.js keeps module-private).
 */
export function findCurrentQuestion(challengeBank, renderedOptions) {
  const set = new Set(renderedOptions);
  return challengeBank.find((q) => q.options?.length === renderedOptions.length && q.options.every((o) => set.has(o)));
}

/** Wait until the feedback screen (#continue) is on screen. */
export async function waitForFeedback(app) {
  for (let i = 0; i < 150 && !app.q("#continue"); i++) await sleep(20);
}
