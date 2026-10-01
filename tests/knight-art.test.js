import test from 'node:test';
import assert from 'node:assert/strict';
import { knightPose, knightFrames, drawKnight } from '../knight-art.js';
test('Knight attacks have anticipation, strike, recovery and return to idle', () => {
  for (const kind of ['vocab', 'grammar']) {
    const pose = p => knightPose({ type: 'attack', kind }, p, 1, 'feedback');
    assert.deepEqual([.1,.25,.5,.7,.95].map(pose), [0,2,kind === 'grammar' ? 5 : 3,4,0]);
  }
});
test('Knight reactions cover travel, defense, rewards and terminal states', () => {
  for (const type of ['heal','equip','treasure','shrine']) assert.equal(knightPose({type},.5,1,'feedback'),5);
  assert.equal(knightPose({type:'hurt'},.5,1,'feedback'),4);
  assert.equal(knightPose({type:'hurt'},.95,1,'feedback'),0);
  assert.equal(knightPose({type:'walk'},.5,1,'doors'),1);
  assert.equal(knightPose({type:'walk'},.5,2,'doors'),0);
  assert.equal(knightPose(null,1,1,'won'),5);
  assert.equal(knightPose(null,1,1,'lost'),4);
});
test('reduced motion retains static feedback without time-dependent travel', () => {
  for (const t of [0,1,2]) {
    assert.equal(knightPose({type:'walk'},.5,t,'doors',true),0);
    assert.equal(knightPose({type:'attack'},.5,t,'feedback',true),3);
    assert.equal(knightPose({type:'hurt'},.5,t,'feedback',true),4);
  }
});
test('source rectangles stay within sheet and align measured feet anchors', () => {
  knightFrames.forEach(({rect:[sx,sy,sw,sh],anchor:[ax,ay]},pose) => {
    assert.ok(sx>=0 && sy>=0 && sx+sw<=1536 && sy+sh<=1024);
    let args;
    const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...a){args=a;}};
    drawKnight(ctx,{}, {x:200,feet:370,pose,alpha:1,tilt:0,squash:1});
    assert.equal(args[5]+ax*146/512,0);
    assert.equal(args[6]+ay*146/512,0);
  });
});
