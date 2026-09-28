import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, start, room, question, answer, proceed, choose, selectHero, equip, drink, buyPotion, stats, maxHealth, heroes, items, restore, challengeBank } from '../engine.js';

function resolveRoom(s) {
  let count = 0;
  while (!['doors', 'won', 'lost'].includes(s.phase) && count++ < 30) {
    if (s.phase === 'challenge') answer(s, question(s).answer);
    else if (s.phase === 'feedback') proceed(s);
  }
  assert(count < 30, 'Room should not get stuck');
}
function enterType(type, hero = 'arcanist') {
  const s = start(createRun('TEST', hero));
  resolveRoom(s);
  s.levels[1][0].type = type;
  choose(s, 0);
  return s;
}

test('character selection changes health and locks after entry', () => {
  const s = createRun('HERO');
  assert(selectHero(s, 'warden')); assert.equal(s.hp, 120);
  assert(!selectHero(s, 'missing')); start(s);
  assert(!selectHero(s, 'hunter')); assert.equal(s.hero, 'warden');
});
test('seeded routes are reproducible and room two offers loot and spell paths', () => {
  assert.deepEqual(createRun('HOLA'), createRun('HOLA'));
  assert.notDeepEqual(createRun('HOLA').levels, createRun('OTRO').levels);
  assert.deepEqual(createRun('HOLA').levels[1].map(r => r.type), ['spell', 'treasure', 'shrine']);
});
test('all three classes can complete 60 seeded runs with combat, loot, and final boss', () => {
  for (const hero of Object.keys(heroes)) for (let n = 0; n < 60; n++) {
    const s = start(createRun(String(n), hero));
    let guard = 0;
    while (s.phase !== 'won' && guard++ < 160) {
      if (s.phase === 'challenge') answer(s, question(s).answer);
      else if (s.phase === 'feedback') { if (s.loot && s.equipment[items[s.loot].slot] !== s.loot) equip(s, s.loot); proceed(s); }
      else if (s.phase === 'doors') choose(s, n % 3);
      else assert.fail(s.phase);
    }
    assert.equal(s.phase, 'won'); assert.equal(s.depth, 8); assert.equal(s.enemyHp, 0);
    assert.equal(s.path.length, 9); assert.equal(s.hp, maxHealth(s)); assert(s.inventory.length > 0);
  }
});
test('every encounter draws the intended problem type, boss cycles disciplines', () => {
  for (const [type, kind] of Object.entries({ battle: 'vocab', spell: 'grammar', treasure: 'order', trap: 'reverse', shrine: 'order' })) {
    const s = enterType(type);
    assert.equal(question(s).kind, kind);
    answer(s, 'wrong'); proceed(s);
    if (s.phase === 'challenge') assert.equal(question(s).kind, kind);
  }
  const boss = enterType('boss');
  for (const kind of ['vocab', 'grammar', 'order', 'vocab']) { assert.equal(question(boss).kind, kind); answer(boss, question(boss).answer); proceed(boss); }
});
test('combat requires enough successful attacks and wrong answers do not damage enemy', () => {
  const s = start(createRun('COMBAT', 'hunter'));
  const first = question(s).id;
  answer(s, 'wrong'); assert.equal(s.enemyHp, 48); assert.equal(s.hp, 82);
  proceed(s); assert.notEqual(question(s).id, first);
  answer(s, question(s).answer); assert.equal(s.enemyHp, 22); assert.equal(s.gold, 0);
  proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 0); assert.equal(s.gold, 30);
  assert.equal(s.inventory.length, 1); assert.equal(items[s.loot].slot, 'weapon');
});
test('Warden blocks 6 damage and Arcanist adds 12 only to grammar damage', () => {
  const warden = start(createRun('CLASS', 'warden'));
  answer(warden, 'wrong'); assert.equal(warden.hp, 108); assert.equal(warden.feedback.damage, 12);
  const mage = enterType('spell'); answer(mage, question(mage).answer); assert.equal(mage.enemyHp, 0);
  const hunter = enterType('spell', 'hunter'); answer(hunter, question(hunter).answer); assert.equal(hunter.enemyHp, 10);
});
test('equipment slots replace instead of stacking, preserve inventory, and reject unowned loot', () => {
  const s = start(createRun('GEAR'));
  assert(!equip(s, 'ironblade'));
  s.inventory = ['ironblade', 'thornblade', 'oakshield', 'mooncharm'];
  equip(s, 'ironblade'); assert.equal(stats(s).attack, 34);
  equip(s, 'thornblade'); assert.equal(stats(s).attack, 38); assert.equal(s.inventory.length, 4);
  equip(s, 'thornblade'); assert.equal(stats(s).attack, 26);
  equip(s, 'oakshield'); answer(s, 'wrong'); assert.equal(s.feedback.damage, 14);
  proceed(s); equip(s, 'mooncharm'); answer(s, question(s).answer); assert.equal(s.feedback.heal, 4);
});
test('staff, tablet, and gold charm provide their stated effects', () => {
  const s = enterType('spell'); s.inventory = ['runestaff', 'sagecharm', 'goldcharm'];
  equip(s, 'runestaff'); equip(s, 'sagecharm'); assert.equal(stats(s).spell, 38);
  equip(s, 'goldcharm'); assert.equal(stats(s).spell, 28); assert.equal(stats(s).gold, .25);
  answer(s, question(s).answer); assert.equal(s.feedback.gain, 39); // (26 + streak bonus 5) * 1.25
});
test('treasure drops equipment and potion only for a correct sentence; shrine heals', () => {
  const t = enterType('treasure'); const before = t.potions;
  answer(t, question(t).answer); assert.equal(t.inventory.length, 2); assert.equal(t.potions, before + 1);
  const failed = enterType('treasure'); answer(failed, 'wrong'); assert.equal(failed.inventory.length, 1); assert.equal(failed.loot, null); proceed(failed); assert.equal(failed.phase, 'doors');
  const shrine = enterType('shrine'); shrine.hp = 50; answer(shrine, question(shrine).answer); assert.equal(shrine.hp, 80);
});
test('potions cap healing and purchases are restricted to safe rooms and sufficient gold', () => {
  const s = start(createRun('HEAL')); assert.equal(drink(s), 0); assert.equal(buyPotion(s), false);
  answer(s, 'wrong'); assert.equal(drink(s), 18); assert.equal(s.hp, 100); assert.equal(s.potions, 1);
  resolveRoom(s); s.gold = 40; assert(buyPotion(s)); assert.equal(s.gold, 0); assert.equal(s.potions, 2); assert(!buyPotion(s));
});
test('double answers and premature door clicks cannot duplicate rewards or skip combat', () => {
  const s = start(createRun('GATES')); assert(!choose(s, 1)); answer(s, question(s).answer);
  const snapshot = JSON.stringify(s); assert.equal(answer(s, question(s).answer), null); assert.equal(JSON.stringify(s), snapshot);
  assert(!choose(s, 2)); resolveRoom(s); assert(!choose(s, 4)); assert(!choose(s, 1.5)); assert(choose(s, 1));
});
test('repeated failures end the run, and terminal states cannot heal or equip', () => {
  const s = start(createRun('DEFEAT'));
  while (s.phase !== 'lost') { if (s.phase === 'challenge') answer(s, 'wrong'); else proceed(s); }
  assert.equal(s.hp, 0); assert.equal(drink(s), 0); assert(!proceed(s)); assert(!choose(s, 0));
  s.inventory.push('ironblade'); assert(!equip(s, 'ironblade'));
});
test('save preserves equipped bonuses, challenge, and progress; rejects corrupt and legacy saves', () => {
  const s = start(createRun('SAVE')); resolveRoom(s); equip(s, s.loot); choose(s, 1);
  assert.deepEqual(restore(JSON.stringify(s)), s);
  for (const raw of ['oops', 'null', '{}', JSON.stringify({ ...s, version: 1 }), JSON.stringify({ ...s, depth: 99 }), JSON.stringify({ ...s, equipment: { weapon: 'fake' } })]) assert.equal(restore(raw), null);
});
test('all 84 challenge records have unique IDs and valid answer choices', () => {
  assert.equal(challengeBank.length, 84); assert.equal(new Set(challengeBank.map(q => q.id)).size, 84);
  for (const q of challengeBank) { if (q.type === 'choice') { assert(q.options.includes(q.answer)); assert.equal(new Set(q.options).size, 4); } else assert.equal(q.options.join(' '), q.answer); }
});
