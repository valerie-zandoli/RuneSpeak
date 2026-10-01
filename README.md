# RuneSpeak

**Words are your magic.** A playable Spanish-learning dungeon crawler with seeded encounters, rounded illustrated artwork, and bite-sized language challenges.

## Play

**[Play RuneSpeak](https://wiltobuild.github.io/RuneSpeak/)**

Choose a route through nine rooms. Translate vocabulary, complete grammar inscriptions, and arrange words into Spanish spells. Correct answers earn gold; wrong answers cost health. Survive the final champion to escape.

- 52 authored beginner Spanish challenges, with explanations after every answer
- Seeded branching encounters: monster lairs, treasuries, sanctuaries, and traps
- Nine-room expeditions with multi-turn combat and a final guardian
- Healing potions, gold, streak bonuses, vocabulary review, and local autosave
- Optional synthesized spell sounds and browser Spanish pronunciation
- Mouse, touch, and keyboard controls; responsive layout and reduced-motion support
- Illustrated heroes, enemies, and themed scenery; original Kenney assets remain bundled

## Choose an expedition

In Adventure, first choose a hero from the large character cards. Choosing a hero replaces that screen with the dungeon picker. Use Change Character to go back, or pick a dungeon and begin the expedition. Every dungeon is available immediately and lasts nine rooms. The selected theme stays for the entire run, including its final guardian.

| Dungeon | Quirk | Route choices |
| --- | --- | --- |
| The Whispering Crypt | A missed combat question repeats until answered correctly. Correcting the echo adds 12 attack power. | More traps; echoes do not retry treasure, traps, or shrines. |
| The Mossbound Halls | Every second consecutive correct answer restores up to 8 health. Mistakes reset the healing streak. | More shrines; thorn traps deal 4 additional damage before armor. |
| The Runic Depths | Correct grammar stores one charge. The next correct non-grammar combat answer releases it for 18 additional attack power. | More spell rooms; a mistake dispels the charge. Charges persist across rooms and never stack. |

The same seed, hero, and dungeon reproduce the expedition. Dungeon rules and active bonuses appear above the challenge; damage previews and door risks include applicable bonuses and armor. Choose **New run** to change the dungeon after an expedition has begun. Existing saved expeditions without a dungeon choice retain their original routes, enemy roster, rules, and three-region progression.

The approved background concepts are adapted in `themed-dungeon-art.js` as scalable canvas scenery, with opening doors, subtle motion, and static reduced-motion rendering. `dungeons.js` defines the three choices. The original background renderer remains available for older saved expeditions.

## Run locally

Requires Node.js 20 or newer. No package installation or API keys needed.

```sh
npm run dev
```

Open http://localhost:4173. Use a web server rather than opening `index.html` directly, because the game uses JavaScript modules.

```sh
npm test
npm run build
```

Deploy the generated `dist/` directory on any static host. The included GitHub Actions workflow tests and publishes to GitHub Pages on pushes to `main` (Pages source must be GitHub Actions).

## Controls and rules

| Action | Control |
| --- | --- |
| Pick an answer | Click/tap or 1–4 |
| Pick a door | Click/tap or 1–3 |
| Build a sentence | Click words in order; Clear words resets |
| Heal | Potion button or H |
| Review vocabulary | Word journal |
| Replay a dungeon | New adventure, then enter its seed |

You begin with 100 health and two potions. Potions restore up to 35 health. Correct treasure answers grant a potion and 30 gold; sanctuaries restore up to 25 health and grant 10 gold. Battles grant 18 gold; traps grant 24. The boss grants 60 per correct answer. A streak of at least three adds 5 gold. Wrong answers cost the risk displayed on each door (10–25 health). You can proceed after a wrong answer if still alive. Gold is the run score, not a currency shop.

Progress and the current run's journal save only in this browser. Starting another run replaces both. Browser storage may be unavailable in private browsing; the game still runs without saving. Pronunciation depends on installed/browser-provided Spanish voices and may need a network connection. Google Fonts are optional; system fallbacks preserve gameplay when unavailable.

## Structure

- `engine.js`: deterministic generation and game-state transitions
- `content.js`: Spanish vocabulary, grammar, and sentence challenges
- `renderer.js`: animated Canvas 2D dungeon using a bundled tile atlas
- `app.js`: accessible HTML controls, feedback, journal, and persistence
- `tests/engine.test.js`: generation, victory/defeat, rewards, input gating, and save tests (Node, `npm test`)
- `tests/suite-play.js`: the real app driven by real clicks and keystrokes in a live iframe — hero selection, answering by click and by keyboard, focus, and the save/reload round trip (browser, see `tests/README.md`)

Dependencies run one way: `content.js` → `engine.js` → `renderer.js` and `app.js` (`app.js` is the only file that imports both `engine.js` and `renderer.js`). `engine.js` has no DOM and no import from `renderer.js` or `app.js`, which is what lets `tests/engine.test.js` test game logic in isolation.

This is a compact demo, not a complete Spanish curriculum. Rooms share a tile-based chamber template with randomized details and encounters; navigation is by door selection, not free movement.

## Art and licensing

**Tiny Dungeon (1.0) by [Kenney](https://kenney.nl/assets/tiny-dungeon)** — [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Includes tiles, hero, monsters, doors, chests, and items. Downloaded from [the author's OpenGameArt listing](https://opengameart.org/content/tiny-dungeon). Original license: [`assets/Kenney-LICENSE.txt`](assets/Kenney-LICENSE.txt).

DM Sans and Fraunces fonts are served optionally by Google Fonts under the SIL Open Font License. RuneSpeak code and original challenge content are MIT licensed; see [LICENSE](LICENSE).
