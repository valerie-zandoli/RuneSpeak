import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, start, choose, answer, question, proceed, restore, stats, room } from '../engine.js';
import { dragonBosses, battleRoster, enemyForRoom } from '../enemies.js';
import { dragonPose, dragonBreath, dragonMouth, dragonSheet, drawDragon } from '../dragon-art.js';
import { dragonFrames } from '../assets/dragons/frames.js';

test('every final route has one distinct dragon and ordinary rooms never use dragons', () => {
  for (const version of [1,2,3,4]) for (let i=0;i<30;i++) {
    const s=createRun('DRAGON-'+i,'knight',version);
    assert.deepEqual(s.levels[8].map(r=>enemyForRoom(r).id), dragonBosses.map(b=>b.id));
    assert(!s.levels.slice(0,8).flat().some(r=>enemyForRoom(r)?.dragon));
    assert(!battleRoster(version).some(b=>b.dragon));
    assert.deepEqual(restore(JSON.stringify(s)),s);
  }
});
test('legacy boss migration preserves health, questions, loot, equipment and bonuses', () => {
  for (let lane=0;lane<3;lane++) {
    const s=start(createRun('OLD-BOSS','knight',1));
    s.depth=7;s.phase='doors';s.path=Array(7).fill(1);choose(s,lane);
    s.inventory=['ironblade','oakshield'];s.equipment.weapon='ironblade';s.equipment.armor='oakshield';
    answer(s,'incorrect');proceed(s);
    s.levels[8].forEach(r=>r.enemyId='goblin-shaman');
    const loaded=restore(JSON.stringify(s));
    assert.deepEqual({...loaded,levels:s.levels},s);
    assert.deepEqual(stats(loaded),stats(s));
    assert.equal(enemyForRoom(room(loaded)).id,dragonBosses[lane].id);
    assert.equal(loaded.enemyMax,132);assert.equal(loaded.hp,105);
    assert.deepEqual(restore(JSON.stringify(loaded)),loaded);
  }
});
test('bosses keep damage, mixed challenges, rewards and terminal victory', () => {
  for(let lane=0;lane<3;lane++){
    const s=start(createRun('BOSS-FIGHT','wizard'));
    s.depth=7;s.phase='doors';s.path=Array(7).fill(1);choose(s,lane);
    assert.equal(answer(s,'incorrect').damage,25);proceed(s);
    const kinds=new Set();
    while(s.phase!=='won'){
      kinds.add(question(s).kind);answer(s,question(s).answer);proceed(s);
    }
    assert.deepEqual([...kinds].sort(),['grammar','order','vocab']);
    assert(s.gold>=90);assert.equal(s.enemyHp,0);
  }
});
test('breath has distinct anticipation, release, recovery and no lingering effects', () => {
  const event={type:'hurt'};
  assert.deepEqual([.01,.15,.4,.76,.95].map(p=>dragonPose(event,p)),[0,1,2,3,0]);
  assert.equal(dragonPose({type:'attack'},.5),4);
  assert.equal(dragonPose({type:'attack',cleared:true},.8),5);
  for(const boss of dragonBosses){
    const origin=dragonMouth(boss.id,716,347),target={x:258,y:320};
    assert(origin.x<716 && origin.x>500);
    for(const p of [0,.29,.7,1])assert.equal(dragonBreath(boss.breath,event,p,origin,target),null);
    const start=dragonBreath(boss.breath,event,.3,origin,target);
    assert.deepEqual(start.end,origin);
    assert.deepEqual(dragonBreath(boss.breath,event,.5,origin,target).end,target);
    assert.equal(dragonBreath(boss.breath,{type:'enter'},.5,origin,target),null);
    const reduced=dragonBreath(boss.breath,event,.5,origin,target,true);
    assert.equal(reduced.reduced,true);assert.deepEqual(reduced.end,target);
  }
  assert.equal(dragonPose(event,.2,true),2);
  assert.equal(dragonPose(null,0,true),0);
});
test('every pose fits its PNG, preserves ground anchor, and uses actual measured bounds', () => {
  for(const boss of dragonBosses){
    const png=readFileSync(new URL('../'+dragonSheet(boss.id),import.meta.url));
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    const sheet=dragonFrames[boss.id];assert.equal(sheet.frames.length,6);
    for(let pose=0;pose<6;pose++){
      const f=sheet.frames[pose], [x,y,w,h]=f.rect;
      assert(x>=0&&y>=0&&x+w<=width&&y+h<=height);
      assert(f.anchor[0]>=x&&f.anchor[0]<=x+w&&f.anchor[1]>=y&&f.anchor[1]<=y+h);
      const calls=[],ctx={save(){},restore(){},drawImage(...a){calls.push(a);}};
      drawDragon(ctx,{}, {model:boss.id,x:716,feet:347,pose,reduced:true});
      assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1,5),f.rect);
    }
  }
});
