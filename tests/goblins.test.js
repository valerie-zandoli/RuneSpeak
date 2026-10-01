import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, room, answer, question, proceed, restore } from '../engine.js';
import { battleEnemies, enemyForRoom, enemyLabel } from '../enemies.js';
import { goblinFrames, goblinSheet, goblinPose, goblinMotion, goblinProjectile, drawGoblin } from '../goblin-art.js';

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

test('all 18 goblin poses draw complete, bounded artwork with one scale per model', () => {
  for (const model of Object.keys(goblinFrames)) {
   const sheet=goblinFrames[model];
   assert.deepEqual(sheet.frames.map(f=>f.state),['idle','anticipation','attack','recovery','hurt','defeat']);
   for(let pose=0;pose<6;pose++) {
    const frame=sheet.frames[pose];
    const png = readFileSync(new URL('../' + goblinSheet(model,pose), import.meta.url));
    assert.equal(png.readUInt32BE(16), frame.rect[2]); assert.equal(png.readUInt32BE(20), frame.rect[3]);
    assert.equal(png[25], 6);
    let drawn;
    const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage(...args) { drawn = args; } };
    drawGoblin(ctx, {}, { model, pose, x: 716, feet: 347 });
    assert.deepEqual(drawn.slice(1, 5), frame.rect);
    assert(drawn.slice(5).every(Number.isFinite));
    assert(Math.abs(drawn[7]/frame.rect[2]-116/sheet.idleHeight)<1e-10);
   }
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
    assert.deepEqual(goblinMotion(model, event, .4, true), { dx: 0, bob: 0 });
    assert.equal(goblinProjectile(model, event, .25, true), null);
    assert.deepEqual(goblinMotion(model, null, 1), { dx: 0, bob: 0 });
  }
});

test('goblin pose rigs anticipate, strike, recover, react at impact and defeat',()=>{
 assert.deepEqual([.05,.15,.3,.65,.95].map(p=>goblinPose({type:'hurt'},p)),[0,1,2,3,0]);
 assert.equal(goblinPose({type:'attack'},.5),4);
 assert.equal(goblinPose({type:'attack'},.5,false,.57),0);
 assert.equal(goblinPose({type:'attack'},.6,false,.57),4);
 assert.equal(goblinPose({type:'attack',cleared:true},.7),5);
 assert.equal(goblinPose(null,1),0);
 assert.equal(goblinPose({type:'hurt'},.1,true),2);
 assert.equal(goblinPose({type:'attack',cleared:true},.1,true),5);
});

test('Shaman projectile starts at its measured action crystal and ends at impact',()=>{
 const sheet=goblinFrames.shaman,frame=sheet.frames[2],scale=116/sheet.idleHeight;
 const shot=goblinProjectile('shaman',{type:'hurt'},.22,false,700,350);
 assert.equal(shot.x,700+(sheet.emission[0]-frame.anchor[0])*scale);
 assert.equal(shot.y,350+(sheet.emission[1]-frame.anchor[1])*scale);
 assert(goblinProjectile('shaman',{type:'hurt'},.39).x<shot.x);
 assert.equal(goblinProjectile('shaman',{type:'hurt'},.4),null);
 assert.equal(goblinProjectile('shaman',null,.3),null);
});
