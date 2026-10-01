import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, room, answer, question, proceed, restore, stats, choose } from '../engine.js';
import { battleRoster, enemyForRoom, latestEnemyRoster, enemyVariantKey } from '../enemies.js';
import { koboldPose, koboldMotion, koboldSheet, koboldProjectile, drawKobold } from '../kobold-art.js';
import { koboldFrames } from '../assets/kobolds/frames.js';

test('new runs reach each kobold; roster-three saves keep encounters and progress', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/pre-kobold-save.json', import.meta.url)));
  const loaded = restore(JSON.stringify(old));
  // The separate dragon update migrates final bosses; kobolds preserve all other encounters.
  assert.deepEqual(loaded.levels.slice(0,8), old.levels.slice(0,8));
  assert.deepEqual({...loaded, levels:old.levels}, old);
  assert.equal(battleRoster(3).length, 10);
  assert(!battleRoster(3).some(e => e.kobold));
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    const s = createRun('KOBOLD-' + i);
    assert.equal(s.enemyRoster, latestEnemyRoster);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    for (const rm of s.levels.flat()) if (enemyForRoom(rm)?.kobold) seen.add(rm.enemyId);
  }
  assert.deepEqual([...seen].sort(), ['kobold-scout', 'kobold-shaman', 'kobold-skirmisher']);
});

test('the expanded pool keeps repeat prevention across routes and reloads', () => {
  for (let n=0;n<80;n++) {
    let s=start(createRun('KOBOLD-ROUTE-'+n));
    let previous=enemyVariantKey(room(s));
    for (let depth=1;depth<9;depth++) {
      s.phase='doors'; assert(choose(s,(n+depth)%3));
      const key=enemyVariantKey(room(s));
      if(key){assert.notEqual(key,previous);previous=key;}
      const loaded=restore(JSON.stringify(s));assert.deepEqual(loaded,s);s=loaded;
    }
  }
});

test('kobolds retain vocabulary damage, equipped bonuses, loot and reloads', () => {
  const seen = new Set();
  for (let i = 0; i < 200 && seen.size < 3; i++) {
    const s = start(createRun('KOBOLD-' + i, 'ranger'));
    const model = enemyForRoom(room(s))?.kobold;
    if (!model || seen.has(model)) continue;
    s.inventory = ['ironblade', 'oakshield'];
    s.equipment.weapon = 'ironblade'; s.equipment.armor = 'oakshield';
    const bonuses = stats(s);
    assert.equal(question(s).kind, 'vocab');
    answer(s, 'wrong'); assert.equal(s.hp, 86); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 14);
    proceed(s); assert(answer(s, question(s).answer).cleared);
    assert.equal(s.gold, 30); assert(s.loot);
    assert.deepEqual(stats(s), bonuses); assert.deepEqual(restore(JSON.stringify(s)), s);
    proceed(s); assert.equal(s.phase, 'doors'); seen.add(model);
  }
  assert.equal(seen.size, 3);
});

test('kobold events have distinct anticipation, action, recovery, hurt and defeat', () => {
  assert.deepEqual([.05,.15,.3,.65,.95].map(p => koboldPose({type:'hurt'},p)), [0,1,2,3,0]);
  assert.equal(koboldPose({type:'attack'},.5),4);
  assert.equal(koboldPose({type:'attack',cleared:true},.7),5);
  assert.equal(koboldPose({type:'attack'},1),0);
  assert.equal(koboldPose(null,1),0);
  for (const model of Object.keys(koboldFrames)) {
    assert.deepEqual(koboldMotion(model,{type:'hurt'},.4,12,true),{dx:0,bob:0});
    assert.equal(koboldPose({type:'hurt'},.1,true),2);
    assert.equal(koboldPose({type:'attack',cleared:true},.1,true),5);
    assert.equal(koboldMotion(model,{type:'hurt'},1).dx,0);
  }
  assert.equal(koboldMotion('shaman',{type:'hurt'},.4).dx,0);
  assert.equal(koboldMotion('skirmisher',{type:'hurt'},.4).dx,-350);
});

test('shaman projectile starts at measured action staff tip and expires at impact', () => {
  const shot = koboldProjectile('shaman',{type:'hurt'},.22);
  assert(Math.abs(shot.x - (716+(1135-1320)*116/355)) < .001);
  assert(Math.abs(shot.y - (347+(184-457)*116/355)) < .001);
  assert(koboldProjectile('shaman',{type:'hurt'},.39).x < shot.x);
  assert.equal(koboldProjectile('shaman',{type:'hurt'},.4),null);
  assert.equal(koboldProjectile('shaman',null,.3),null);
  assert.equal(koboldProjectile('scout',{type:'hurt'},.3),null);
  assert.equal(koboldProjectile('shaman',{type:'hurt'},.3,true),null);
});

test('all six poses draw inside their PNG bounds with measured feet anchors', () => {
  for (const [model,sheet] of Object.entries(koboldFrames)) {
    const png=readFileSync(new URL('../'+koboldSheet(model),import.meta.url));
    assert.equal(png.readUInt32BE(16),1536); assert.equal(png.readUInt32BE(20),1024);
    assert.equal(png[25],6);
    for (let pose=0;pose<6;pose++) {
      let drawn;
      const ctx={save(){},restore(){},translate(){},drawImage(...args){drawn=args;}};
      drawKobold(ctx,{}, {model,pose,x:716,feet:347});
      assert.deepEqual(drawn.slice(1,5),sheet.frames[pose].rect);
      assert(drawn.slice(5).every(Number.isFinite));
      const [x,y,w,h]=sheet.frames[pose].rect;
      assert(x>=0&&y>=0&&x+w<=1536&&y+h<=1024);
    }
  }
});
