import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,start,choose,room,answer,question,proceed,restore,rng,selectDungeon} from '../engine.js';
import {enemyForRoom} from '../enemies.js';

test('every treasure slot uses a stable independent 50/50 roll across all dungeons',()=>{
  let chests=0,mimics=0; const variants=new Set();
  for(const dungeon of ['crypt','moss','runic'])for(let n=0;n<200;n++){
    const seed='CHEST-'+n, old=createRun(seed,'ranger',5,dungeon,1,0), current=createRun(seed,'ranger',5,dungeon);
    for(let depth=0;depth<9;depth++)for(let lane=0;lane<3;lane++){
      const before=old.levels[depth][lane], after=current.levels[depth][lane];
      if(before.type!=='treasure'){assert.deepEqual(after,before);continue;}
      chests++;
      const expected=rng(seed+':mimic:'+depth+':'+lane)()<.5;
      assert.equal(Boolean(after.treasureMimic),expected);
      if(expected){mimics++;assert.equal(after.type,'battle');assert.equal(enemyForRoom(after).family,'vault-mimic');variants.add(after.enemyId);}
      else assert.deepEqual(after,before);
    }
    assert.deepEqual(restore(JSON.stringify(current)),current);
    assert.deepEqual(restore(JSON.stringify(old)),old);
  }
  assert(mimics/chests>.45&&mimics/chests<.55);assert.equal(variants.size,3);
});

test('mimics require combat, survive reload, and award chest loot and a potion only once',()=>{
  let s;
  for(let n=0;n<100;n++){
    const candidate=start(createRun('CHEST-'+n,'ranger',5,'moss'));
    if(candidate.levels[1][1].treasureMimic){s=candidate;break;}
  }
  assert(s);s.phase='doors';assert(choose(s,1));
  assert(room(s).treasureMimic);assert.equal(s.enemyHp,48);
  const potions=s.potions;const hp=s.hp;
  assert.equal(answer(s,'wrong').type,'hurt');assert.equal(s.hp,hp-18);assert.equal(s.enemyHp,48);
  assert.equal(s.potions,potions);assert.equal(s.loot,null);
  s=restore(JSON.stringify(s));assert(room(s).treasureMimic);proceed(s);
  assert.equal(answer(s,question(s).answer).cleared,false);assert.equal(s.potions,potions);
  proceed(s);const victory=answer(s,question(s).answer);
  assert.equal(victory.type,'attack');assert(victory.cleared);assert(s.loot);
  assert.equal(s.potions,potions+1);assert.equal(s.gold,53);
  assert.equal(answer(s,question(s).answer),null);assert.equal(s.potions,potions+1);
  assert.deepEqual(restore(JSON.stringify(s)),s);proceed(s);assert.equal(s.phase,'doors');
});

test('legacy roster-five runs retain treasure rooms and the feature survives dungeon selection',()=>{
  const old=createRun('LEGACY-CHESTS','wizard',5,'crypt',1,0);
  assert(!('chestMimics' in old));assert.deepEqual(restore(JSON.stringify(old)),old);
  assert(selectDungeon(old,'moss'));assert(!old.levels.flat().some(r=>r.treasureMimic));
  const current=createRun('NEW-CHESTS');assert(selectDungeon(current,'runic'));assert.equal(current.chestMimics,1);
  assert.equal(restore(JSON.stringify({...current,chestMimics:2})),null);
});
