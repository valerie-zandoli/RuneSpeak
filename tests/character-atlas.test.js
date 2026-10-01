import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {roster,poseAt} from '../character-atlas/roster.js';
import {heroes} from '../engine.js';
import {battleEnemies,dragonBosses,slimeModels,slimePalettes,cyclopsPalettes} from '../enemies.js';

test('atlas covers every live hero, enemy, boss and visible palette exactly once',()=>{
 const expected=[...Object.keys(heroes),...dragonBosses.map(e=>e.id)];
 for(const e of battleEnemies){if(e.id==='slime')for(const model of slimeModels)for(const p of slimePalettes)expected.push(`slime-${model}-${p}`);else if(e.model)for(const p of cyclopsPalettes)expected.push(e.id+'-'+p);else expected.push(e.id)}
 assert.deepEqual(roster.map(e=>e.id).sort(),expected.sort());assert.equal(new Set(roster.map(e=>e.id)).size,expected.length);
});
test('every animation frame points to an existing sheet and stays within its pixels',()=>{
 const sizes=new Map();for(const e of roster)for(const f of e.frames){const url=new URL('../'+f.file,import.meta.url);assert.ok(existsSync(url),`${e.id}: ${f.file}`);if(!sizes.has(f.file)){const b=readFileSync(url);sizes.set(f.file,[b.readUInt32BE(16),b.readUInt32BE(20)])}const [w,h]=sizes.get(f.file),[x,y,sw,sh]=f.rect;assert.ok(x>=0&&y>=0&&sw>0&&sh>0&&x+sw<=w&&y+sh<=h,`${e.id}: ${f.rect} in ${w}x${h}`);assert.ok(f.anchor.every(Number.isFinite))}
});
test('all attack cycles return valid poses and multi-pose actors change artwork',()=>{
 for(const e of roster){const seen=new Set();for(const action of ['attack','hurt','defeat','idle'])for(let i=0;i<=100;i++){const pose=poseAt(e,action,i/100,i/10);assert.ok(e.frames[pose],`${e.id}: ${action} -> ${pose}`);if(action==='attack')seen.add(pose)}if(e.frames.length>1)assert.ok(seen.size>1,`${e.id} has a static attack`)}
});
