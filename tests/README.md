# Tests

Two ways to run them.

## Logic tests (Node)

Covers `engine.js`: deterministic generation, combat, loot, equipment, saves. No DOM.

```sh
npm test
```

See `engine.test.js` for what each test covers.

## Browser tests

Covers what `engine.test.js` cannot see: the real `app.js`/`renderer.js`/`index.html` wiring, driven by real clicks and keystrokes in a live iframe.

```sh
npm run dev
```

Then open `http://localhost:4173/tests/` — results appear on the page and in `window.__testResults`.

| File | What it covers |
|---|---|
| `suite-play.js` | Hero selection and the "SELECTED" badge; answering a challenge by click and by the 1-4 keyboard shortcut; keyboard focus landing on Continue after the shortcut; doors operable by keyboard as well as click; the real save/reload round trip through localStorage |

Each test runs against a fresh run and restores whatever real save was in the browser before and after, so running the suite is safe even with an in-progress dungeon run open in another tab.

Added after the team's full review pass found this layer untested — `engine.test.js` alone could not have caught a DOM-wiring bug like the keyboard-focus one fixed in `duolingo-lite` the same week.

To add a suite, create `tests/suite-<name>.js`, register tests with `test(...)` from `harness.js`, and import the file in `browser-tests.js`.
