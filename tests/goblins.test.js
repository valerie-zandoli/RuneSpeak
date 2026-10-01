import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, room, answer, question, proceed, restore } from '../engine.js';
import { battleEnemies, enemyForRoom, enemyLabel } from '../enemies.js';
import { goblinFrames, goblinSheet, goblinMotion, goblinProjectile, drawGoblin } from '../goblin-art.js';

test('all goblins are reachable in deterministic new runs and survive reload', () => {
  const seen = new Set();
  for (let n = 0; n < 100; n++) {
    const s = createRun('GOBLIN-' + n);
    assert.deepEqual(s.levels, createRun(s.seed).levels);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    for (const rm of s.levels.flat()) if (enemyForRoom(rm)?.goblin) seen.add(rm.enemyId);
  }
  assert.deepEqual([...seen].sort(), ['goblin-fighter', 'goblin-shaman', 'goblin-skirmisher']);
  assert.equal(new Set(battleEnemies.map(e => e.id)).size, battleEnemies.length);
});

test('a pre-goblin roster-one save replaces retired encounters and retains all progress', () => {
  const original = JSON.parse(readFileSync(new URL('./fixtures/pre-goblin-save.json', import.meta.url)));
  assert.equal(original.enemyRoster, 1);
  assert.deepEqual({ ...restore(JSON.stringify(original)), levels: original.levels }, original);
  const legacy = structuredClone(original);
  delete legacy.enemyRoster;
  for (const rm of legacy.levels.flat()) { delete rm.enemyId; delete rm.palette; }
  assert.deepEqual({ ...restore(JSON.stringify(legacy)), levels: legacy.levels }, legacy);
});

test('all three goblins preserve existing vocabulary damage, loot and rewards', () => {
  for (const seed of ['GOBLIN-2', 'GOBLIN-3', 'GOBLIN-19']) {
    const s = start(createRun(seed, 'ranger', 2));
    assert.match(enemyLabel(room(s)), /^Goblin /);
    assert.equal(question(s).kind, 'vocab');
    answer(s, 'wrong'); assert.equal(s.hp, 82); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 22);
    proceed(s); assert.equal(answer(s, question(s).answer).cleared, true);
    assert.equal(s.gold, 30); assert.equal(s.inventory.length, 1);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    proceed(s); assert.equal(s.phase, 'doors');
  }
});

test('approved goblin PNGs draw as one grounded pose with their full source bounds', () => {
  for (const model of Object.keys(goblinFrames)) {
    const png = readFileSync(new URL('../' + goblinSheet(model), import.meta.url));
    assert.equal(png.readUInt32BE(16), 1254); assert.equal(png.readUInt32BE(20), 1254);
    assert.equal(png[25], 6);
    let drawn;
    const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage(...args) { drawn = args; } };
    drawGoblin(ctx, {}, { model, x: 716, feet: 347 });
    assert.deepEqual(drawn.slice(1, 5), [0, 0, 1254, 1254]);
    assert(drawn.slice(5).every(Number.isFinite));
  }
  assert.equal(goblinSheet('unknown'), null);
});

test('Shaman stays at range and all feedback respects reduced motion and recovery', () => {
  const event = { type: 'hurt' };
  assert.equal(goblinMotion('shaman', event, .4).dx, 0);
  assert(goblinMotion('fighter', event, .4).dx < -250);
  assert(goblinProjectile('shaman', event, .25));
  assert.equal(goblinProjectile('fighter', event, .25), null);
  assert.equal(goblinProjectile('shaman', event, .41), null);
  for (const model of Object.keys(goblinFrames)) {
    assert.deepEqual(goblinMotion(model, event, .4, true), { dx: 0, tilt: 0 });
    assert.equal(goblinProjectile(model, event, .25, true), null);
    assert.deepEqual(goblinMotion(model, null, 1), { dx: 0, tilt: 0 });
  }
});
