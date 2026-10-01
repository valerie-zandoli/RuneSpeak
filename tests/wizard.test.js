import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, start, answer, question, restore, stats, heroes } from '../engine.js';
import { wizardPose } from '../wizard-art.js';

test('Wizard preserves spell bonus and migrates existing Arcanist runs', () => {
  const s = start(createRun('WIZARD', 'wizard'));
  answer(s, question(s).answer);
  const loaded = restore(JSON.stringify({ ...s, hero: 'arcanist', log: ['The Arcanist enters the dungeon.'] }));
  assert.equal(loaded.hero, 'wizard');
  assert.equal(heroes.wizard.maxHp, 100);
  assert.equal(stats(loaded).spell, 12);
  assert.equal(loaded.hp, s.hp);
  assert.deepEqual(loaded.feedback, s.feedback);
  assert.equal(loaded.questionId, s.questionId);
  assert.equal(loaded.log[0], 'The Wizard enters the dungeon.');
});

test('Wizard anticipates then casts, reacts, celebrates and respects reduced motion', () => {
  const pose = (type, p) => wizardPose({ type }, p, 1, 'feedback');
  assert.equal(pose('attack', .2), 2);
  assert.equal(pose('attack', .5), 3);
  assert.equal(pose('attack', .95), 0);
  assert.equal(pose('hurt', .5), 4);
  assert.equal(pose('walk', .5), 1);
  assert.equal(pose('treasure', .5), 5);
  assert.equal(wizardPose(null, 1, 0, 'won'), 5);
  assert.equal(wizardPose({ type: 'attack' }, .5, 1, 'feedback', true), 0);
});
