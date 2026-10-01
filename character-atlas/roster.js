import { heroes } from '../engine.js';
import { battleEnemies, dragonBosses, slimeModels, slimePalettes, cyclopsPalettes } from '../enemies.js';
import { knightFrames, knightPose } from '../knight-art.js';
import { rangerPose } from '../ranger-art.js';
import { wizardPose } from '../wizard-art.js';
import { slimeFrames } from '../assets/slimes/frames.js';
import { cyclopsFrames } from '../assets/cyclops/frames.js';
import { goblinFrames, goblinPose } from '../goblin-art.js';
import { skeletonFrames, skeletonPose } from '../skeleton-art.js';
import { koboldFrames } from '../assets/kobolds/frames.js';
import { dragonFrames } from '../assets/dragons/frames.js';
import { monsterFrames } from '../assets/monsters/frames.js';
import { slimePose, slimeFilters } from '../slime-art.js';
import { cyclopsPose } from '../cyclops-art.js';
import { koboldPose } from '../kobold-art.js';
import { monsterPose } from '../monster-art.js';
import { dragonPose } from '../dragon-art.js';

export const groups = [
 ['heroes','The adventurers','Three heroes. A thousand adventures.','#9069cd'],
 ['slimes','Small, squishy trouble','Three silhouettes, three colors, plenty of bounce.','#58a700'],
 ['cyclopes','The heavy hitters','Clubbers, rockthrowers and armored ironhides.','#1899d6'],
 ['goblins','The goblin warband','Quick blades, sturdy shields and a little mischief.','#8b9f3c'],
 ['skeletons','The fallen heroes','Familiar classes, back for one more adventure.','#a785c8'],
 ['kobolds','Small but formidable','A colorful trio with sharp instincts.','#ed8d3b'],
 ['crypt','The whispering crypt','Candlelight, hungry treasure and things with wings.','#9069cd'],
 ['moss','The mossbound ruins','A wild little world of spores, thorns and lanterns.','#58a700'],
 ['runic','The runic sanctum','Living stone, brilliant crystals and unruly books.','#1cb0f6'],
 ['dragons','The final encounter','Three dragons. Three very different kinds of trouble.','#df7562'],
].map(([id,name,description,color])=>({id,name,description,color}));
const title = s => s[0].toUpperCase()+s.slice(1);
const six = ['Idle','Wind-up','Attack','Recovery','Hurt','Defeat'];
const heroLabels = ['Idle','Travel','Wind-up','Attack','Hurt','Celebrate'];
// All anchors below are normalized to the top-left of their source rectangle.
function normalize(frames, file, absolute=true) {
 return frames.map(f=>({...f,file:f.file ? 'assets/monsters/'+f.file : file,
  anchor:absolute ? [f.anchor[0]-f.rect[0],f.anchor[1]-f.rect[1]] : f.anchor,
  exclude:f.exclude ? [f.exclude[0]-f.rect[0],f.exclude[1]-f.rect[1],...f.exclude.slice(2)] : null}));
}
const entries=[];
function add(e) {entries.push({...e,labels:e.labels||six,variant:e.variant||'',baseId:e.baseId||e.id});}
for (const [id,hero] of Object.entries(heroes)) {
 const frames=id==='knight'?knightFrames:Array.from({length:6},(_,i)=>({rect:[i%3*512,Math.floor(i/3)*512,id==='wizard'&&i===3?552:512,512],anchor:[256,(id==='wizard'?[506,506,504,482,480,488]:[496,496,496,486,480,488])[i]]}));
 add({id,name:hero.name,group:'heroes',kind:'hero',model:id,description:hero.title,frames:normalize(frames,`assets/${id}-poses.png`,false),labels:heroLabels});
}
for(const e of battleEnemies) {
 if(e.id==='slime') for(const model of slimeModels) for(const palette of slimePalettes) add({id:`slime-${model}-${palette}`,baseId:`slime-${model}`,name:{jelly:'Round Jelly Slime',droplet:'Tall Droplet Slime',puddle:'Wide Puddle Slime'}[model],variant:title(palette),group:'slimes',kind:'slime',model,palette,filter:slimeFilters[palette],frames:normalize(slimeFrames[model].frames,`assets/slimes/${model}.png`)});
 else if(e.model) for(const palette of cyclopsPalettes) add({id:e.id+'-'+palette,baseId:e.id,name:e.name,variant:title(palette),group:'cyclopes',kind:'cyclops',model:e.model,palette,frames:normalize(cyclopsFrames[e.model+'-'+palette].frames,`assets/cyclops/${e.model}-${palette}.png`),labels:['Idle','Travel','Wind-up','Attack','Hurt','Defeat']});
 else if(e.goblin) add({id:e.id,name:e.name,group:'goblins',kind:'goblin',model:e.goblin,frames:goblinFrames[e.goblin].frames.map(f=>({...f,file:'assets/goblins/'+f.file})),description:'Six simplified combat poses'});
 else if(e.skeleton) add({id:e.id,name:e.name,group:'skeletons',kind:'skeleton',model:e.skeleton,frames:normalize(skeletonFrames[e.skeleton],`assets/skeletons/${e.skeleton}-poses.png`),labels:['Idle','Wind-up','Attack','Hurt']});
 else if(e.kobold) add({id:e.id,name:e.name,group:'kobolds',kind:'kobold',model:e.kobold,frames:normalize(koboldFrames[e.kobold].frames,`assets/kobolds/${e.kobold}-poses.png`)});
 else if(e.monster) add({id:e.id,name:e.name,group:e.dungeon,kind:'monster',model:e.monster,frames:normalize(monsterFrames[e.monster].frames,null,false)});
 else throw new Error(`Atlas needs an artwork adapter for ${e.id}`);
}
for(const e of dragonBosses) add({id:e.id,name:e.name,group:'dragons',kind:'dragon',model:e.dragon,breath:e.breath,description:e.breathLabel,frames:normalize(dragonFrames[e.dragon].frames,`assets/dragons/${e.dragon}-poses.png`)});
export const roster=entries;
export function poseAt(e,action,p,t=0) {
 if(action==='idle')return 0;
 if(e.kind==='hero') {
  if(action==='defeat')return 4;
  return ({knight:knightPose,ranger:rangerPose,wizard:wizardPose}[e.model])({type:action==='hurt'?'hurt':action==='celebrate'?'treasure':action==='travel'?'walk':'attack',kind:e.model==='wizard'?'grammar':'vocab'},p,t,'challenge',false);
 }
 const event={type:action==='attack'?'hurt':'attack',cleared:action==='defeat'};
 if(e.kind==='goblin')return goblinPose(event,p);
 if(e.kind==='slime')return slimePose(event,p);
 if(e.kind==='cyclops')return cyclopsPose(event,p,t);
 if(e.kind==='skeleton')return skeletonPose(event,p);
 if(e.kind==='kobold')return koboldPose(event,p);
 if(e.kind==='dragon')return dragonPose(event,p);
 return monsterPose(event,p);
}
