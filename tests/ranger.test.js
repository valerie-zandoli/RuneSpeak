import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, start, answer, question, restore, stats, heroes } from '../engine.js';
import { rangerPose } from '../ranger-art.js';

test('Ranger preserves the gold passive and migrates legacy saves', () => {
  const s = start(createRun('RANGER', 'ranger'));
  answer(s, question(s).answer);
  const legacy = { ...s, hero: 'hunter', log: ['The Treasure Hunter enters the dungeon.'] };
  const restored = restore(JSON.stringify(legacy));
  assert.equal(restored.hero, 'ranger');
  assert.equal(heroes.ranger.maxHp, 100);
  assert.equal(stats(restored).gold, .5);
  assert.equal(restored.hp, s.hp);
  assert.equal(restored.enemyHp, s.enemyHp);
  assert.deepEqual(restored.inventory, s.inventory);
  assert.deepEqual(restored.feedback, s.feedback);
  assert.equal(restored.log[0], 'The Ranger enters the dungeon.');
});

test('Ranger draws then releases, reacts to damage, celebrates and respects reduced motion', () => {
  const pose = (type, p) => rangerPose({ type }, p, 1, 'feedback');
  assert.equal(pose('attack', .2), 2);
  assert.equal(pose('attack', .5), 3);
  assert.equal(pose('attack', .95), 0);
  assert.equal(pose('hurt', .5), 4);
  assert.equal(pose('treasure', .5), 5);
  assert.equal(pose('walk', .5), 1);
  assert.equal(rangerPose(null, 1, 0, 'won'), 5);
  assert.equal(rangerPose({ type: 'attack' }, .5, 1, 'feedback', true), 0);
});
