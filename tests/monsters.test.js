import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, choose, restore, room, question, answer, proceed, stats } from '../engine.js';
import { battleRoster, enemyForRoom, enemyVariantKey } from '../enemies.js';
import { monsterEnemies } from '../monster-roster.js';
import { monsterFrames } from '../assets/monsters/frames.js';
import { monsterPose, monsterMotion, drawMonster } from '../monster-art.js';

test('all 27 variants spawn only in their home dungeon and survive route changes and reloads', () => {
  const all = new Set();
  assert.equal(battleRoster().length, 40);
  for (const dungeon of ['crypt', 'moss', 'runic']) {
    assert.equal(battleRoster(5, dungeon).length, 22);
    const seen = new Set();
    for (let n = 0; n < 80; n++) {
      let s = start(createRun('MONSTERS-' + n, 'ranger', undefined, dungeon));
      assert.equal(s.enemyRoster, 5);
      for (const rm of s.levels.flat()) {
        const e = enemyForRoom(rm);
        if (e?.monster) { assert.equal(e.dungeon, dungeon); seen.add(e.id); all.add(e.id); }
      }
      let previous = enemyVariantKey(room(s));
      for (let depth = 1; depth < 9; depth++) {
        s.phase = 'doors'; assert(choose(s, (n + depth) % 3));
        const e = enemyForRoom(room(s)), key = enemyVariantKey(room(s));
        if (e?.monster) assert.equal(e.dungeon, dungeon);
        if (key) { assert.notEqual(key, previous); previous = key; }
        const loaded = restore(JSON.stringify(s)); assert.deepEqual(loaded, s); s = loaded;
      }
    }
    assert.equal(seen.size, 9);
  }
  assert.deepEqual([...all].sort(), monsterEnemies.map(e => e.id).sort());
});

test('pre-monster saves preserve all encounters, progress and questions', () => {
  const saves = JSON.parse(readFileSync(new URL('./fixtures/pre-monster-saves.json', import.meta.url)));
  assert.equal(battleRoster(4).length, 13);
  for (const s of saves) assert.deepEqual(restore(JSON.stringify(s)), s);
  for (const version of [1, 2, 3, 4]) assert(!battleRoster(version).some(e => e.monster));
});

test('every new monster uses existing combat damage, rewards and equipment rules', () => {
  const seen = new Set();
  for (let n = 0; n < 1500 && seen.size < 27; n++) {
    const s = start(createRun('MONSTER-COMBAT-' + n, 'ranger'));
    const e = enemyForRoom(room(s));
    if (!e?.monster || seen.has(e.id)) continue;
    s.inventory = ['ironblade', 'oakshield']; s.equipment.weapon = 'ironblade'; s.equipment.armor = 'oakshield';
    const bonuses = stats(s);
    answer(s, 'wrong'); assert.equal(s.hp, 86); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 14);
    proceed(s); assert(answer(s, question(s).answer).cleared);
    assert.equal(s.gold, 30); assert(s.loot); assert.deepEqual(stats(s), bonuses);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    proceed(s); assert.equal(s.phase, 'doors'); seen.add(e.id);
  }
  assert.equal(seen.size, 27);
});

test('all 162 poses fit their actual PNGs and draw with finite, consistent scale', () => {
  assert.equal(Object.keys(monsterFrames).length, 27);
  for (const [model, sheet] of Object.entries(monsterFrames)) {
    assert.deepEqual(sheet.frames.map(f => f.state), ['idle', 'anticipation', 'attack', 'recovery', 'hurt', 'defeat']);
    for (let pose = 0; pose < 6; pose++) {
      const frame = sheet.frames[pose];
      const png = readFileSync(new URL('../assets/monsters/' + frame.file, import.meta.url));
      assert.equal(png[25], 6, model + ' preserves RGBA');
      const [x,y,w,h] = frame.rect;
      assert(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= png.readUInt32BE(16) && y+h <= png.readUInt32BE(20));
      let drawn;
      const ctx = {save(){},restore(){},translate(){},drawImage(...args){drawn=args;}};
      drawMonster(ctx, {}, {model,pose,x:716,feet:347});
      assert.deepEqual(drawn.slice(1,5), frame.rect); assert(drawn.slice(5).every(Number.isFinite));
      assert(Math.abs(drawn[7] / w - sheet.height / sheet.idleHeight) < 1e-10);
      assert(Math.abs(drawn[5] + frame.anchor[0] * sheet.height / sheet.idleHeight) < 1e-10);
    }
  }
});

test('pose timing follows impact, recovers to idle and honors reduced motion', () => {
  assert.deepEqual([.05,.15,.3,.65,.95].map(p => monsterPose({type:'hurt'},p)), [0,1,2,3,0]);
  assert.equal(monsterPose({type:'attack'},.45,false,.57),0);
  assert.equal(monsterPose({type:'attack'},.58,false,.57),4);
  assert.equal(monsterPose({type:'attack',cleared:true},.7,false,.57),5);
  assert.equal(monsterPose({type:'attack'},1),0);
  assert.equal(monsterPose(null,1),0);
  for (const model of Object.keys(monsterFrames)) {
    assert.deepEqual(monsterMotion(model,{type:'hurt'},.4,12,true), {dx:0,bob:0});
    assert.equal(monsterPose({type:'hurt'},.1,true),2);
    assert.equal(monsterPose({type:'attack',cleared:true},.1,true),5);
    assert.equal(monsterMotion(model,{type:'hurt'},.42).dx,-350);
    assert.equal(monsterMotion(model,{type:'hurt'},1).dx,0);
  }
});
