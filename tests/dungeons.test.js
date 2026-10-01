import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, start, selectDungeon, selectHero, question, answer, proceed, choose, restore, incomingDamage, attackPower, heroes, room } from '../engine.js';
import { dungeons, dungeonBiome } from '../dungeons.js';

const run = (id, hero = 'ranger') => start(createRun('THEMES', hero, 2, id));
function clear(s) {
  for (let n = 0; n < 40 && !['doors', 'won', 'lost'].includes(s.phase); n++) {
    if (s.phase === 'challenge') answer(s, question(s).answer);
    else proceed(s);
  }
  assert(['doors', 'won', 'lost'].includes(s.phase));
}
function enterType(s, type) {
  clear(s); s.levels[s.depth + 1][0].type = type; choose(s, 0); return s;
}

test('all dungeons can be selected with every hero, and choices lock at entry', () => {
  const s = createRun('SELECT');
  for (const id of Object.keys(dungeons)) for (const hero of Object.keys(heroes)) {
    assert(selectHero(s, hero)); assert(selectDungeon(s, id));
    assert.equal(s.hero, hero); assert.equal(s.hp, heroes[hero].maxHp);
    assert.equal(s.dungeon, id); assert.deepEqual(restore(JSON.stringify(s)), s);
  }
  assert(!selectDungeon(s, 'missing')); start(s);
  assert(!selectDungeon(s, 'crypt')); assert(!selectHero(s, 'knight'));
});

test('themed routes are deterministic, offer favored rooms, and keep one theme to the boss', () => {
  for (const [id, d] of Object.entries(dungeons)) {
    const s = createRun('ROUTES', 'knight', 2, id);
    assert.deepEqual(s.levels, createRun('ROUTES', 'knight', 2, id).levels);
    for (let depth = 2; depth < 8; depth++) {
      assert(s.levels[depth].some(r => r.type === d.route));
      assert.equal(new Set(s.levels[depth].map(r => r.type)).size, 3);
    }
    for (let depth = 0; depth < 9; depth++) { s.depth = depth; assert.equal(dungeonBiome(s), d.biome); }
    assert(s.levels[8].every(r => r.type === 'boss'));
  }
});

test('crypt repeats missed combat questions across reloads and adds recovery damage once', () => {
  let s = run('crypt'); const id = question(s).id;
  answer(s, 'wrong'); assert.equal(s.hp, 82);
  s = restore(JSON.stringify(s)); proceed(s);
  assert.equal(question(s).id, id); assert.equal(attackPower(s), 38);
  answer(s, question(s).answer); assert.equal(s.feedback.dealt, 38); assert.equal(s.echoQuestionId, null);
  proceed(s); assert.notEqual(question(s).id, id); assert.equal(attackPower(s), 26);
  const treasure = enterType(s, 'treasure'); answer(treasure, 'wrong'); proceed(treasure);
  assert.equal(treasure.phase, 'doors'); assert.equal(treasure.echoQuestionId, null);
});

test('moss heals on pairs of correct answers, caps health, resets on error and exposes thorn risk', () => {
  const s = run('moss'); s.hp = 65;
  answer(s, question(s).answer); assert.equal(s.hp, 65); proceed(s);
  answer(s, question(s).answer); assert.equal(s.hp, 73); assert.equal(s.feedback.heal, 8);
  enterType(s, 'battle'); answer(s, 'wrong'); assert.equal(s.streak, 0); proceed(s);
  const hp = s.hp; answer(s, question(s).answer); assert.equal(s.hp, hp);
  proceed(s); s.hp = 98; answer(s, question(s).answer); assert.equal(s.hp, 100); assert.equal(s.feedback.heal, 2);
  enterType(s, 'trap'); assert.equal(incomingDamage(s), 28); answer(s, 'wrong'); assert.equal(s.feedback.damage, 28);
  assert.equal(incomingDamage(run('moss', 'knight'), 'trap'), 22);
});

test('runic charge survives rooms and reloads, releases on non-grammar combat and breaks on mistakes', () => {
  let s = enterType(run('runic'), 'spell');
  answer(s, question(s).answer); assert.equal(s.runeCharge, true); proceed(s);
  answer(s, question(s).answer); assert.equal(s.runeCharge, true); assert.match(s.feedback.quirk, /do not stack/);
  // Move through actual generated routes for a faithful save round trip.
  proceed(s); const lane = s.levels[s.depth + 1].findIndex(r => r.type !== 'spell'); choose(s, lane);
  s = restore(JSON.stringify(s)); assert.equal(s.runeCharge, true);
  enterType(s, 'treasure'); answer(s, question(s).answer); assert.equal(s.runeCharge, true);
  enterType(s, 'battle'); assert.equal(attackPower(s), 44);
  answer(s, question(s).answer); assert.equal(s.feedback.dealt, 44); assert.equal(s.runeCharge, false);
  enterType(s, 'spell'); answer(s, question(s).answer); assert.equal(s.runeCharge, true);
  proceed(s); answer(s, 'wrong'); assert.equal(s.runeCharge, false); assert.match(s.feedback.quirk, /lost/);
});

test('original expedition saves keep routes, questions, enemy roster and original rules', () => {
  for (const enemyRoster of [1, 2]) {
    const s = start(createRun('ORIGINAL', 'knight', enemyRoster));
    answer(s, 'wrong'); const id = s.questionId;
    const loaded = restore(JSON.stringify(s)); assert.deepEqual(loaded, s);
    proceed(loaded); assert.notEqual(loaded.questionId, id); assert.equal(loaded.dungeon, undefined);
    assert.equal(incomingDamage(loaded, 'trap'), 18);
    for (let depth = 0; depth < 9; depth++) { loaded.depth = depth; assert.equal(dungeonBiome(loaded), Math.floor(depth / 3)); }
  }
});

test('all heroes can complete all dungeons with deterministic saves at every phase', () => {
  for (const id of Object.keys(dungeons)) for (const hero of Object.keys(heroes)) for (let seed = 0; seed < 12; seed++) {
    let s = start(createRun(String(seed), hero, 2, id)), guard = 0;
    while (s.phase !== 'won' && guard++ < 150) {
      const loaded = restore(JSON.stringify(s)); assert.deepEqual(loaded, s); s = loaded;
      if (s.phase === 'challenge') answer(s, question(s).answer);
      else if (s.phase === 'feedback') proceed(s);
      else if (s.phase === 'doors') choose(s, seed % 3);
      else assert.fail(s.phase);
    }
    assert.equal(s.phase, 'won'); assert.equal(s.path.length, 9); assert.equal(room(s).type, 'boss');
  }
});

test('invalid dungeon IDs and malformed saved quirk state are rejected', () => {
  const s = run('crypt');
  for (const patch of [{ dungeon: 'missing' }, { dungeon: '__proto__' }, { runeCharge: 1 }, { runeCharge: true }, { echoQuestionId: 'missing' }]) assert.equal(restore(JSON.stringify({ ...s, ...patch })), null);
});
