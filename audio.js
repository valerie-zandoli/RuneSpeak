// Original procedural score and effects. One shared audio graph, no downloads.
const defaults = { music: false, effects: true, musicVolume: .24, effectsVolume: .7 };
let settings = { ...defaults };
try { const saved=JSON.parse(localStorage.getItem('runespeak-audio')); for(const key of Object.keys(defaults))if(typeof saved?.[key]===typeof defaults[key])settings[key]=saved[key]; } catch {}
settings.musicVolume=Math.max(0,Math.min(1,settings.musicVolume));settings.effectsVolume=Math.max(0,Math.min(1,settings.effectsVolume));
// The earlier preview shipped silent. Enable the requested action audio once;
// subsequent explicit mute choices are preserved.
try { if(localStorage.getItem('runespeak-action-audio')!=='2'){settings.effects=true;settings.effectsVolume=.7;localStorage.setItem('runespeak-action-audio','2');localStorage.setItem('runespeak-audio',JSON.stringify(settings));} } catch {}
let ctx, musicBus, effectsBus, timer, next=0, step=0, active=false, biome=0, boss=false, finished=false;
const voices=new Set();
function persist(){try{localStorage.setItem('runespeak-audio',JSON.stringify(settings));}catch{}}
function note(midi, at, length, level, type, bus, slide=0){
  if(!ctx)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
  const frequency=440*2**((midi-69)/12);osc.frequency.setValueAtTime(frequency,at);
  if(slide)osc.frequency.exponentialRampToValueAtTime(frequency*2**(slide/12),at+length);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.018);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);gain.connect(bus);voices.add({osc,bus});const entry=[...voices].at(-1);
  osc.onended=()=>{voices.delete(entry);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+length+.03);
}
function stopMusic(){clearInterval(timer);timer=null;for(const v of voices)if(v.bus===musicBus){try{v.osc.stop();}catch{}}}
function noise(at,length,level,frequency=1000){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,at);filter.frequency.exponentialRampToValueAtTime(frequency*.35,at+length);filter.Q.value=.7;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  source.connect(filter);filter.connect(gain);gain.connect(effectsBus);const entry={osc:source,bus:effectsBus};voices.add(entry);
  source.onended=()=>{voices.delete(entry);source.disconnect();filter.disconnect();gain.disconnect();};source.start(at);source.stop(at+length+.02);
}
function schedule(){
  const melody=[0,7,12,14,12,7,4,7,2,7,11,14,11,7,2,null,0,4,9,12,9,4,0,4,2,5,9,14,9,5,2,null];
  const roots=[0,-5,-3,-7],root=[48,53,50][biome],beat=boss?.23:.34;
  while(next<ctx.currentTime+.25){
    const i=step%32,chord=roots[Math.floor(i/8)],m=melody[i];
    if(m!==null)note(root+12+m,next,.55,boss?.14:.12,'sine',musicBus);
    if(i%4===0){note(root+chord-12,next,beat*4,.18,'triangle',musicBus);note(root+chord+7,next,beat*3,.06,'sine',musicBus);}
    if(boss&&i%2===0)note(root-24,next,.15,.16,'triangle',musicBus,-5);
    next+=beat;step++;
  }
}
function sync(){
  if(!ctx)return;
  musicBus.gain.setTargetAtTime(settings.musicVolume,ctx.currentTime,.06);effectsBus.gain.setTargetAtTime(settings.effectsVolume,ctx.currentTime,.025);
  if(!settings.music||!active||finished||document.hidden){stopMusic();return;}
  if(!timer){next=ctx.currentTime+.08;step=0;schedule();timer=setInterval(schedule,100);}
}
export const audio={
  get settings(){return {...settings};},
  async unlock(){
    try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();musicBus=ctx.createGain();effectsBus=ctx.createGain();const master=ctx.createDynamicsCompressor();musicBus.connect(master);effectsBus.connect(master);master.connect(ctx.destination);}
      if(ctx.state==='suspended')await ctx.resume();sync();return ctx.state==='running';
    }catch{return false;}
  },
  set(key,value){if(!(key in defaults))return;settings[key]=typeof defaults[key]==='boolean'?!!value:Math.max(0,Math.min(1,Number(value)));persist();sync();},
  scene(region,isBoss,isFinished){const changed=biome!==region||boss!==isBoss;biome=region;boss=isBoss;finished=isFinished;if(changed)stopMusic();sync();},
  effect(event){
    if(!ctx||ctx.state!=='running'||!settings.effects||!active||document.hidden)return;
    const t=ctx.currentTime+.015,type=event.type;
    const play=(notes,length=.23)=>notes.forEach((n,i)=>note(n,t+i*.095,length,.18,'sine',effectsBus));
    if(type==='attack'){if(event.kind==='grammar'){play([72,79,84],.32);noise(t+.3,.22,.23,2400);}else{noise(t+.12,.22,.5,1800);note(58,t,.15,.3,'triangle',effectsBus,14);noise(t+.4,.13,.55,450);note(43,t+.4,.22,.4,'triangle',effectsBus,-12);}if(event.cleared)[72,76,79,84].forEach((n,i)=>note(n,t+.62+i*.09,.35,.24,'sine',effectsBus));}
    else if(type==='hurt' && event.dragonBreath){
      const release=event.reducedMotion?0:.315,hit=event.reducedMotion?0:.42;
      const acid=event.dragonBreath==='acid',blue=event.dragonBreath==='blue-fire';
      noise(t+release,event.reducedMotion?.08:.4,acid?.32:.42,acid?3200:blue?1800:900);
      if(acid)[0,.07,.14].forEach(d=>note(68,t+release+d,.1,.12,'sine',effectsBus,-15));
      else note(blue?43:34,t+release,.34,.18,'triangle',effectsBus,-7);
      noise(t+hit,.18,.4,acid?1700:400);
    }
    else if(type==='hurt'){const hit=(event.enemyKobold || event.enemyMonster)?(event.reducedMotion?0:.42):.3;if(event.enemyKobold==='shaman'&&!event.reducedMotion)note(79,t+.231,.18,.16,'sine',effectsBus,-12);noise(t+hit,.2,.55,350);note(47,t+hit,.32,.4,'triangle',effectsBus,-9);note(66,t+hit+.05,.19,.12,'sawtooth',effectsBus,-7);}
    else if(type==='treasure'){noise(t,.18,.3,750);[72,79,84,88,91].forEach((n,i)=>{note(n,t+.2+i*.11,.42,.3,'sine',effectsBus);note(n+12,t+.2+i*.11,.12,.08,'triangle',effectsBus);});}
    else if(type==='heal'||type==='shrine')play([67,72,76,79],.5);
    else if(type==='equip')play([76,84],.2);
    else if(type==='trap')play([67,74,79]);
    else if(type==='walk'){noise(t,.42,.36,500);note(37,t,.4,.15,'sawtooth',effectsBus,7);noise(t+.4,.09,.38,1100);[.12,.29,.46].forEach(d=>note(40,t+d,.09,.23,'triangle',effectsBus,-4));}
    else if(type==='enter')play(boss?[48,55,60]:[60+biome*2,67+biome*2],.5);
  },
};
document.addEventListener('runespeak:view',e=>{active=e.detail==='dungeon';if(!active){stopMusic();for(const v of voices){try{v.osc.stop();}catch{}}}sync();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic();ctx?.suspend();}else if(ctx){ctx.resume().then(sync).catch(()=>{});}});
window.addEventListener('pagehide',()=>{stopMusic();ctx?.suspend();});
