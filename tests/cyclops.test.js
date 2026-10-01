import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, restore, room, answer, question, proceed } from '../engine.js';
import { battleEnemies, cyclopsPalettes, enemyForRoom, enemyLabel, cyclopsSheet } from '../enemies.js';
import { cyclopsPose, cyclopsMotion, cyclopsProjectile, drawCyclops } from '../cyclops-art.js';
import { cyclopsFrames } from '../assets/cyclops/frames.js';

test('seeded encounter pool reaches all models and every cyclops palette', () => {
  const models = new Set(), variants = new Set();
  for (let n = 0; n < 200; n++) {
    const run = createRun('CYCLOPS-' + n);
    assert.deepEqual(run, createRun('CYCLOPS-' + n));
    for (const rm of run.levels.flat()) {
      const enemy = enemyForRoom(rm);
      if (!['battle', 'spell', 'boss'].includes(rm.type)) { assert.equal(rm.enemyId, undefined); continue; }
      if (!enemy.dragon) models.add(enemy.id);
      if (enemy.model) variants.add(enemy.model + '-' + enemy.palette);
    }
  }
  assert.deepEqual([...models].sort(), battleEnemies.map(e => e.id).sort());
  assert.equal(variants.size, 12);
});

test('new saves preserve model, color and combat, old saves retain progress with active enemies', () => {
  const s = start(createRun('CYCLOPS-0'));
  answer(s, 'wrong'); proceed(s);
  const restored = restore(JSON.stringify(s));
  assert.deepEqual(restored, s);
  assert.deepEqual(enemyForRoom(room(restored)), enemyForRoom(room(s)));
  const legacy = structuredClone(s); delete legacy.enemyRoster;
  for (const rm of legacy.levels.flat()) { delete rm.enemyId; delete rm.palette; }
  assert.deepEqual({ ...restore(JSON.stringify(legacy)), levels: legacy.levels }, legacy);
  assert.equal(restore(JSON.stringify({ ...s, enemyRoster: 99 })), null);
  assert.equal(enemyForRoom({ type: 'battle', variant: 1 }).id, 'cyclops-clubber');
});

test('every cyclops still uses the existing vocabulary combat and reward rules', () => {
  for (const enemy of battleEnemies.filter(e => e.model)) {
    const s = start(createRun('CYCLOPS-COMBAT', 'ranger'));
    Object.assign(room(s), { enemyId: enemy.id, palette: 'violet' });
    assert.equal(question(s).kind, 'vocab');
    answer(s, 'wrong'); assert.equal(s.hp, 82); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 22);
    proceed(s); const hit = answer(s, question(s).answer);
    assert.equal(hit.cleared, true); assert.equal(s.enemyHp, 0); assert.equal(s.gold, 30);
    proceed(s); assert.equal(s.phase, 'doors');
    assert.match(enemyLabel(room(s)), /^Violet Cyclops /);
  }
});

test('retaliation winds up and attacks; player hits cause recoil and defeat', () => {
  assert.equal(cyclopsPose({ type: 'hurt' }, .2), 2);
  assert.equal(cyclopsPose({ type: 'hurt' }, .45), 3);
  assert.equal(cyclopsPose({ type: 'hurt' }, .7), 1);
  assert.equal(cyclopsPose({ type: 'hurt' }, .95), 0);
  assert.equal(cyclopsPose({ type: 'attack' }, .5), 4);
  assert.equal(cyclopsPose({ type: 'attack', cleared: true }, .7), 5);
  assert.equal(cyclopsPose({ type: 'attack' }, .95), 0);
  assert.equal(cyclopsPose({ type: 'enter' }, .4, .2), 1);
  assert.equal(cyclopsPose(null, 1), 0);
  assert(cyclopsMotion('clubber', { type: 'hurt' }, .45).dx < -250);
  assert(cyclopsMotion('rockthrower', { type: 'hurt' }, .45).dx >= 0);
  const rock = cyclopsProjectile('rockthrower', { type: 'hurt' }, .4);
  assert(rock.x < 676 && rock.x > 282);
  assert.equal(cyclopsProjectile('clubber', { type: 'hurt' }, .4), null);
  assert.equal(cyclopsProjectile('rockthrower', { type: 'hurt' }, .6), null);
});

test('reduced motion disables movement and projectiles while retaining a static defeat', () => {
  for (const type of ['hurt', 'attack', 'enter']) {
    assert.equal(cyclopsPose({ type }, .5, 100, true), 0);
    assert.deepEqual(cyclopsMotion('clubber', { type }, .5, 100, true), { dx: 0, tilt: 0, squash: 1 });
    assert.equal(cyclopsProjectile('rockthrower', { type }, .4, true), null);
  }
  assert.equal(cyclopsPose({ type: 'attack', cleared: true }, .5, 100, true), 5);
});

test('all twelve transparent sheets ship with six bounded, grounded drawing frames', () => {
  for (const enemy of battleEnemies.filter(e => e.model)) for (const palette of cyclopsPalettes) {
    const path = cyclopsSheet(enemy.model, palette);
    const png = readFileSync(new URL('../' + path, import.meta.url));
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(png[25], 6, 'RGBA PNG');
    const metadata = cyclopsFrames[enemy.model + '-' + palette];
    assert.equal(metadata.frames.length, 6);
    for (let pose = 0; pose < 6; pose++) {
      const f = metadata.frames[pose], [x, y, w, h] = f.rect;
      assert(x >= 0 && y >= 0 && x + w <= width && y + h <= height);
      assert(f.anchor[1] >= y && f.anchor[1] <= y + h);
      let drawn;
      const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, drawImage(...args) { drawn = args; } };
      drawCyclops(ctx, {}, { model: enemy.model, palette, x: 700, feet: 350, pose });
      assert.deepEqual(drawn.slice(1, 5), f.rect);
      assert(drawn.slice(5).every(Number.isFinite));
    }
  }
});
