import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, room, answer, question, proceed, restore } from '../engine.js';
import { battleRoster, enemyForRoom, latestEnemyRoster } from '../enemies.js';
import { skeletonFrames, skeletonSheet, skeletonPose, skeletonMotion, skeletonProjectile, drawSkeleton } from '../skeleton-art.js';

test('new pool reaches all fallen heroes, old roster-two saves retain progress with active enemies', () => {
  const legacy = JSON.parse(readFileSync(new URL('./fixtures/pre-skeleton-save.json', import.meta.url)));
  assert.deepEqual({ ...restore(JSON.stringify(legacy)), levels: legacy.levels }, legacy);
  assert.equal(battleRoster(2).length, 9);
  assert.equal(battleRoster(1).length, 6);
  const seen = new Set();
  for (let n = 0; n < 80; n++) {
    const s = createRun('FALLEN-' + n);
    assert.equal(s.enemyRoster, latestEnemyRoster);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    for (const rm of s.levels.flat()) if (enemyForRoom(rm)?.skeleton) seen.add(rm.enemyId);
  }
  assert.deepEqual([...seen].sort(), ['fallen-ranger', 'fallen-warrior', 'fallen-wizard']);
});

test('fallen heroes retain vocabulary combat, ranger rewards and loot', () => {
  const tested = new Set();
  for (let n = 0; n < 200 && tested.size < 3; n++) {
    const s = start(createRun('FALLEN-' + n, 'ranger'));
    const model = enemyForRoom(room(s))?.skeleton;
    if (!model || tested.has(model)) continue;
    answer(s, 'wrong'); assert.equal(s.hp, 82); assert.equal(s.enemyHp, 48);
    proceed(s); answer(s, question(s).answer); assert.equal(s.enemyHp, 22);
    proceed(s); assert(answer(s, question(s).answer).cleared);
    assert.equal(s.gold, 30); assert.equal(s.inventory.length, 1);
    assert.deepEqual(restore(JSON.stringify(s)), s);
    proceed(s); assert.equal(s.phase, 'doors');
    tested.add(model);
  }
  assert.equal(tested.size, 3);
});

test('poses progress through anticipation, release, recovery, hurt and defeat', () => {
  assert.deepEqual([0, .2, .6, .9, 1].map(p => skeletonPose({type:'hurt'}, p)), [1,2,1,0,0]);
  assert.equal(skeletonPose({type:'attack'}, .5), 3);
  assert.equal(skeletonPose({type:'attack',cleared:true}, .85), 3);
  assert.equal(skeletonPose(null, 1), 0);
  for (const model of Object.keys(skeletonFrames)) {
    assert.deepEqual(skeletonMotion(model, {type:'hurt'}, .3, true), {dx:0,tilt:0});
    assert.equal(skeletonProjectile(model, {type:'hurt'}, .2, true), null);
    assert.equal(skeletonProjectile(model, {type:'hurt'}, .4), null);
    assert.equal(skeletonProjectile(model, null, .2), null);
  }
  assert(skeletonMotion('warrior', {type:'hurt'}, .3).dx < -250);
  for (const model of ['ranger','wizard']) {
    assert.equal(skeletonMotion(model, {type:'hurt'}, .3).dx, 0);
    const first = skeletonProjectile(model, {type:'hurt'}, .18);
    const last = skeletonProjectile(model, {type:'hurt'}, .399);
    assert(first.x > 600); assert(last.x < 265); assert(last.y > first.y);
  }
});

test('every consumed pose fits its transparent source and remains grounded', () => {
  for (const [model, frames] of Object.entries(skeletonFrames)) {
    const png = readFileSync(new URL('../' + skeletonSheet(model), import.meta.url));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(png[25], 6);
    frames.forEach((frame, pose) => {
      const [x,y,w,h] = frame.rect;
      assert(x >= 0 && y >= 0 && x+w <= width && y+h <= height);
      let drawn;
      const ctx = {save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){drawn=args;}};
      drawSkeleton(ctx, {}, {model,x:716,feet:347,pose});
      assert.deepEqual(drawn.slice(1,5), frame.rect);
      assert(drawn.slice(5).every(Number.isFinite));
      const scale = drawn[7]/w;
      assert(Math.abs(drawn[6] + (frame.anchor[1]-y)*scale) < .0001);
    });
  }
});
