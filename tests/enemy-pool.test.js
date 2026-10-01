import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, start, choose, restore, room } from '../engine.js';
import { battleRoster, enemyForRoom, enemyVariantKey } from '../enemies.js';

const retired = new Set(['reaper', 'brute', 'sentinel', 'guardian']);

test('all rosters and combat room types exclude retired enemies, including legacy saves', () => {
  for (const version of [undefined, 1, 2, 3]) {
    assert(battleRoster(version).every(e => e && !retired.has(e.id)));
    for (let n = 0; n < 60; n++) {
      const original = createRun('POOL-' + n, 'wizard', version);
      if (version === undefined) delete original.enemyRoster;
      const saved = restore(JSON.stringify(original));
      for (const rm of saved.levels.flat()) {
        const enemy = enemyForRoom(rm);
        if (['battle', 'spell', 'boss'].includes(rm.type)) assert(enemy && !retired.has(enemy.id));
        else assert.equal(enemy, null);
      }
      assert.deepEqual(restore(JSON.stringify(saved)), saved);
    }
  }
});

test('chosen encounters never repeat a visible variant across routes, noncombat rooms and reloads', () => {
  for (const dungeon of [null, 'crypt', 'moss', 'runic']) for (let n = 0; n < 120; n++) {
    let s = start(createRun('REPEAT-' + n, 'wizard', 3, dungeon));
    let previous = enemyVariantKey(room(s));
    for (let depth = 1; depth < 9; depth++) {
      s.phase = 'doors';
      assert(choose(s, (n + depth) % 3));
      const key = enemyVariantKey(room(s));
      if (key) { assert.notEqual(key, previous); previous = key; }
      const loaded = restore(JSON.stringify(s));
      assert.deepEqual(loaded, s);
      s = loaded;
    }
  }
});

test('repeat prevention uses visible variants and keeps memory through noncombat rooms', () => {
  const s = start(createRun('FORCED'));
  Object.assign(room(s), { enemyId: 'goblin-shaman', palette: 'teal' });
  s.levels[1][0].type = 'treasure';
  s.phase = 'doors'; choose(s, 0);
  Object.assign(s.levels[2][0], { type: 'spell', enemyId: 'goblin-shaman', palette: 'violet' });
  s.phase = 'doors'; choose(s, 0);
  assert.notEqual(enemyForRoom(room(s)).id, 'goblin-shaman');
  assert.notEqual(enemyVariantKey({ type: 'battle', enemyId: 'slime', variant: 0, palette: 'green' }),
    enemyVariantKey({ type: 'battle', enemyId: 'slime', variant: 1, palette: 'green' }));
  assert.notEqual(enemyVariantKey({ type: 'battle', enemyId: 'cyclops-clubber', palette: 'teal' }),
    enemyVariantKey({ type: 'battle', enemyId: 'cyclops-clubber', palette: 'violet' }));
});
