import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, answer, proceed, question, room, restore, stats } from '../engine.js';
import { enemyForRoom, enemyLabel } from '../enemies.js';
import { slimePose, slimeMotion, drawSlime, slimeSheet } from '../slime-art.js';
import { slimeFrames } from '../assets/slimes/frames.js';

test('seeded slime encounters reach all nine combinations and survive reload', () => {
  const variants = new Set();
  for (let n = 0; n < 250; n++) {
    const s = createRun('SLIME-' + n);
    for (const rm of s.levels.flat()) {
      const enemy = enemyForRoom(rm);
      if (enemy?.slimeModel) variants.add(enemy.slimeModel + '-' + enemy.palette);
    }
    assert.deepEqual(restore(JSON.stringify(s)), s);
  }
  assert.equal(variants.size, 9);
  assert.equal(enemyForRoom({ type: 'battle', variant: 0 }).slimeModel, 'jelly');
  assert.equal(enemyForRoom({ type: 'battle', variant: 0 }).palette, 'green');
  assert.equal(enemyForRoom({ type: 'battle', variant: 1 }).id, 'cyclops-clubber');
});

test('every slime retains vocabulary combat, equipment, loot, and legacy save progress', () => {
  for (let variant = 0; variant < 3; variant++) for (const palette of ['green', 'blue', 'purple']) {
    const s = start(createRun('SLIME-COMBAT', 'knight'));
    Object.assign(room(s), { enemyId: 'slime', variant, palette });
    s.inventory = ['ironblade', 'oakshield']; s.equipment.weapon = 'ironblade'; s.equipment.armor = 'oakshield';
    assert.equal(question(s).kind, 'vocab');
    answer(s, 'wrong'); assert.equal(s.hp, 112); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 14);
    proceed(s); assert.equal(answer(s, question(s).answer).cleared, true);
    assert(s.loot); assert.match(enemyLabel(room(s)), /Slime$/);
    const legacy = structuredClone(s); delete legacy.enemyRoster;
    const restored = restore(JSON.stringify(legacy));
    assert.equal(restored.hp, s.hp); assert.equal(restored.gold, s.gold);
    assert.deepEqual(stats(restored), stats(s)); assert.deepEqual(restored.journal, s.journal);
  }
});

test('slime body-slam has windup, distinct action, recovery and return to idle', () => {
  assert.deepEqual([.05,.2,.45,.7,.95].map(p => slimePose({type:'hurt'},p)), [0,1,2,3,0]);
  assert.equal(slimePose({type:'attack'},.5),4);
  assert.equal(slimePose({type:'attack',cleared:true},.7),5);
  assert.equal(slimePose({type:'attack'},1),0);
  assert(slimeMotion({type:'hurt'},.5).dx < -300);
  assert(Math.abs(slimeMotion({type:'hurt'},1,0).dx) < 1e-10);
  assert.deepEqual(slimeMotion({type:'hurt'},.5,30,true),{dx:0,hop:0,squash:1});
  assert.equal(slimePose({type:'attack'},.5,true),4);
  assert.equal(slimePose({type:'attack',cleared:true},.5,true),5);
});

test('all poses use bounded source rectangles and palettes share exact geometry', () => {
  for (const [model,sheet] of Object.entries(slimeFrames)) {
    const png=readFileSync(new URL('../'+slimeSheet(model),import.meta.url));
    assert.equal(png[25],6); assert.equal(png.readUInt32BE(16),sheet.width); assert.equal(png.readUInt32BE(20),sheet.height);
    for (let pose=0;pose<6;pose++) {
      const frame=sheet.frames[pose], [x,y,w,h]=frame.rect;
      assert(x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      let baseline;
      for (const palette of ['green','blue','purple']) {
        let draw;
        const ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){draw=args.slice(1);}};
        drawSlime(ctx,{}, {model,palette,pose,x:716,feet:347});
        assert.deepEqual(draw.slice(0,4),frame.rect);
        assert(draw.every(Number.isFinite));
        if(baseline) assert.deepEqual(draw,baseline);
        baseline=draw;
      }
    }
  }
});
