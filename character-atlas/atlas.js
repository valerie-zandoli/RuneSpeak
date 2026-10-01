import {roster, groups, poseAt} from './roster.js';
import {dragonBreath, drawDragonBreath} from '../dragon-art.js';
const $=s=>document.querySelector(s);
const imageCache=new Map(), cards=new Map();
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
$('#gentle').checked=reducedQuery.matches;
let selectedGroup='all',speed=1,detail=null,last=performance.now();
const duration=1400;
const assetURL=file=>new URL('../'+file,import.meta.url).href;
const groupFor=e=>groups.find(g=>g.id===e.group);
function load(file){
 if(!imageCache.has(file)){
  const image=new Image();const record={image,status:'loading'};
  record.ready=new Promise(resolve=>{image.onload=()=>{record.status='ready';resolve(image)};image.onerror=()=>{record.status='error';resolve(null)};image.src=assetURL(file)});
  imageCache.set(file,record);
 }
 return imageCache.get(file);
}
function prepare(e){return Promise.all([...new Set(e.frames.map(f=>f.file))].map(f=>load(f).ready));}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function state(e){return {entry:e,action:'idle',elapsed:0,playing:false,loop:false,still:null,visible:false,pose:0};}
function act(s,action,loop=false){s.action=action;s.elapsed=0;s.playing=action!=='idle';s.loop=loop;s.still=null;if(action!=='idle')prepare(s.entry);if(s.card)updateCard(s)}
function updateCard(s){s.card.classList.toggle('is-playing',s.playing);s.playButton.textContent=s.playing?'■ Stop':'▶ Attack';s.playButton.setAttribute('aria-pressed',String(s.playing));s.playButton.setAttribute('aria-label',`${s.playing?'Stop':'Loop attack for'} ${s.entry.name}${s.entry.variant?' '+s.entry.variant:''}`)}
function advance(s,dt){if(!s.playing)return;s.elapsed+=dt*speed;if(s.elapsed>=duration){if(s.loop)s.elapsed%=duration;else{s.elapsed=duration;s.playing=false;if(s.action!=='defeat')s.action='idle';if(s.card)updateCard(s)}}}
function geometry(e,width,height){
 if(!e.bounds){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const f of e.frames){left=Math.min(left,-f.anchor[0]);right=Math.max(right,f.rect[2]-f.anchor[0]);top=Math.min(top,-f.anchor[1]);bottom=Math.max(bottom,f.rect[3]-f.anchor[1])}e.bounds={left,right,top,bottom}}
 const b=e.bounds,k=Math.min(width*.76/(b.right-b.left),height*.76/(b.bottom-b.top));
 return {k,x:width/2-(b.left+b.right)*k/2,feet:height*.85-b.bottom*k};
}
function paint(canvas,s,t,forcedPose=null,thumbnail=false){
 const e=s.entry,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const progress=Math.min(1,s.elapsed/duration),gentle=$('#gentle').checked;
 const pose=forcedPose??s.still??poseAt(e,s.action,progress,t/1000);
 const f=e.frames[pose]||e.frames[0];s.pose=pose;canvas.dataset.pose=String(pose);canvas.dataset.action=s.action;
 ctx.clearRect(0,0,w,h);
 if(!thumbnail){ctx.fillStyle='#cbb9dd30';ctx.beginPath();ctx.ellipse(w/2,h*.875,w*.2,h*.017,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c9b7d533';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.12,h*.91);ctx.lineTo(w*.88,h*.91);ctx.stroke();}
 const cached=load(f.file);
 if(cached.status!=='ready'){ctx.fillStyle='#9a80b8';ctx.font=`bold ${thumbnail?12:16}px Nunito, sans-serif`;ctx.textAlign='center';ctx.fillText(cached.status==='error'?'Artwork unavailable':'Summoning…',w/2,h*.55);return;}
 const {k,x,feet}=geometry(e,w,h);
 let dx=0,dy=0,rotation=0,alpha=1;
 const live=forcedPose===null&&s.still===null;
 if(live&&!gentle){
  if(s.action==='attack'){const ranged=e.kind==='dragon'||['wizard','ranger','shaman','rockthrower'].includes(e.model);dx=(e.kind==='hero'?1:-1)*Math.sin(progress*Math.PI)*(ranged?4:w*.045);}
  else if(s.action==='hurt')dx=Math.sin(progress*Math.PI*3)*w*.012;
  else if(s.action==='idle')dy=Math.sin(t/650)*h*.004;
  else if(s.action==='travel')dx=Math.sin(progress*Math.PI*2)*w*.04;
  else if(s.action==='celebrate')dy=-Math.max(0,Math.sin(progress*Math.PI*3))*h*.04;
 }
 if(live&&s.action==='defeat') {alpha=1-Math.max(0,progress-.65)*1.6;if(!gentle&&['hero','skeleton'].includes(e.kind))rotation=progress*.25;}
 ctx.save();ctx.translate(x+dx,feet+dy);ctx.rotate(rotation);if(e.flip)ctx.scale(-1,1);ctx.globalAlpha=alpha;ctx.filter=e.filter||'none';
 if(f.exclude){ctx.beginPath();ctx.rect(-f.anchor[0]*k,-f.anchor[1]*k,f.rect[2]*k,f.rect[3]*k);ctx.rect((f.exclude[0]-f.anchor[0])*k,(f.exclude[1]-f.anchor[1])*k,f.exclude[2]*k,f.exclude[3]*k);ctx.clip('evenodd')}
 ctx.drawImage(cached.image,...f.rect,-f.anchor[0]*k,-f.anchor[1]*k,f.rect[2]*k,f.rect[3]*k);ctx.restore();
 if(live&&s.action==='attack'&&e.kind==='dragon'&&f.mouth){
  const origin={x:x+dx+(f.mouth[0]-f.rect[0]-f.anchor[0])*k,y:feet+dy+(f.mouth[1]-f.rect[1]-f.anchor[1])*k};
  drawDragonBreath(ctx,dragonBreath(e.breath,{type:'hurt'},progress,origin,{x:w*.05,y:origin.y+8},gentle));
 }
 if(live&&s.action==='attack'&&e.kind!=='dragon'&&['wizard','ranger','shaman','rockthrower'].includes(e.model)&&progress>.33&&progress<.66&&!gentle){
  const q=(progress-.33)/.33,dir=e.kind==='hero'?1:-1,px=w*.5+dir*w*(.12+q*.29),py=h*.51;
  ctx.save();ctx.globalAlpha=Math.sin(q*Math.PI);ctx.fillStyle=e.model==='wizard'||e.model==='shaman'?'#a278d7':e.model==='ranger'?'#b38a51':'#89949a';ctx.beginPath();ctx.ellipse(px,py,e.model==='ranger'?w*.027:w*.013,h*.012,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
}
const observer=new IntersectionObserver(items=>{for(const item of items){const s=cards.get(item.target.dataset.id);s.visible=item.isIntersecting;if(s.visible)prepare(s.entry)}},{rootMargin:'180px'});
function build(){
 $('#model-count').textContent=new Set(roster.map(e=>e.baseId)).size;$('#appearance-count').textContent=roster.length;
 const nav=$('#categories');
 for(const g of [{id:'all',name:'All characters'},...groups]){
  const b=document.createElement('button');b.dataset.group=g.id;b.setAttribute('aria-pressed',String(g.id==='all'));const n=roster.filter(e=>g.id==='all'||e.group===g.id).length;b.innerHTML=`${g.id==='all'?'✦ ':''}${g.name}<span>${n}</span>`;
  b.onclick=()=>{selectedGroup=g.id;filter();};nav.append(b);
 }
 let number=0;
 for(const g of groups){
  const section=document.createElement('section');section.className='collection-section';section.dataset.group=g.id;section.style.setProperty('--accent',g.color);
  section.innerHTML=`<div class="section-head"><span class="section-mark" aria-hidden="true">${g.id==='heroes'?'✦':g.id==='dragons'?'♜':'✧'}</span><div><h2>${g.name}</h2><p>${g.description}</p></div><span class="section-count"></span></div><div class="card-grid"></div>`;
  $('#collection').append(section);
  for(const e of roster.filter(e=>e.group===g.id)){
   const s=state(e);cards.set(e.id,s);const card=document.createElement('article');s.card=card;card.className='character-card';card.dataset.id=e.id;card.setAttribute('aria-label',e.name+(e.variant?' · '+e.variant:''));
   card.innerHTML=`<div class="card-stage"><span class="card-number">${String(++number).padStart(2,'0')}</span><span class="playing-dot" aria-label="Playing"></span><canvas width="400" height="300" role="img" aria-label="${e.name} animation"></canvas></div><div class="card-body"><h3>${e.name}</h3><div class="card-meta"><span class="variant">${e.variant||e.description||groupFor(e).name.replace(/^The /,'')}</span><span>${e.frames.length} ${e.frames.length===1?'pose':'poses'}</span></div><div class="card-buttons"><button class="play" aria-pressed="false">▶ Attack</button><button class="inspect" aria-label="Inspect ${e.name}${e.variant?' '+e.variant:''}">Explore ↗</button></div></div>`;
   s.canvas=card.querySelector('canvas');s.playButton=card.querySelector('.play');s.playButton.onclick=()=>{if(s.playing)act(s,'idle');else act(s,'attack',true)};card.querySelector('.inspect').onclick=()=>openDetail(e);updateCard(s);section.querySelector('.card-grid').append(card);observer.observe(card);
  }
 }
 filter();
}
function filter(){
 const query=$('#search').value.toLocaleLowerCase().trim(),variants=$('#variants').checked,seen=new Set();let count=0;
 for(const s of cards.values()){
  const e=s.entry,isPrimary=!seen.has(e.baseId);seen.add(e.baseId);
  const show=(selectedGroup==='all'||e.group===selectedGroup)&&(variants||isPrimary)&&`${e.name} ${e.variant} ${e.model} ${groupFor(e).name} ${e.description||''}`.toLocaleLowerCase().includes(query);
  s.card.hidden=!show;if(show)count++;else if(s.playing)act(s,'idle');
 }
 for(const section of document.querySelectorAll('.collection-section')){const n=[...section.querySelectorAll('.character-card')].filter(c=>!c.hidden).length;section.hidden=!n;section.querySelector('.section-count').textContent=`${n} ${n===1?'appearance':'appearances'}`}
 for(const b of $('#categories').children)b.setAttribute('aria-pressed',String(b.dataset.group===selectedGroup));
 $('#result-count').textContent=`${count} of ${roster.length} appearances`;$('#empty').hidden=count>0;$('#loop-all').disabled=count===0;
}
async function openDetail(e){
 detail=state(e);const current=detail;act(detail,'attack',true);$('#detail-title').textContent=e.name+(e.variant?' · '+e.variant:'');$('#detail-group').textContent=groupFor(e).name;$('#inspector').style.setProperty('--accent',groupFor(e).color);$('#detail-loop').checked=true;$('#pause-detail').textContent='Pause';$('#pose-count').textContent=`${e.frames.length} original ${e.frames.length===1?'pose':'poses'}`;
 $('#detail-note').textContent=e.kind==='goblin'?'Six distinct poses: idle, wind-up, attack, recovery, hurt and defeat. The Shaman casts at range; the blade fighters lunge.':e.kind==='hero'?'Explore travel, attacks and celebrations. Defeat reuses the hurt pose with a fade, just as the game does.':e.kind==='skeleton'?'Four original poses. The hurt pose also serves as the defeat reaction.':'Original in-game poses, using the game’s animation timing. Select a pose below to hold it still.';
 document.querySelectorAll('.hero-only').forEach(b=>b.hidden=e.kind!=='hero');$('#pose-strip').replaceChildren();
 e.frames.forEach((f,i)=>{const button=document.createElement('button');button.setAttribute('aria-label',`Show ${e.labels[i]} pose`);button.setAttribute('aria-pressed','false');const cv=document.createElement('canvas');cv.width=220;cv.height=200;button.append(cv,document.createTextNode(e.labels[i]));button.onclick=()=>{detail.still=i;detail.playing=false;$('#pause-detail').textContent='Resume';updateDetailControls()};$('#pose-strip').append(button)});
 $('#sheet-link').href=assetURL(e.frames[0].file);if(!$('#inspector').open)$('#inspector').showModal();updateDetailControls();
 await prepare(e);if(detail!==current)return;[...$('#pose-strip').children].forEach((b,i)=>paint(b.querySelector('canvas'),detail,0,i,true));
}
function updateDetailControls(){if(!detail)return;document.querySelectorAll('button[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(detail.still===null&&b.dataset.action===detail.action)));[...$('#pose-strip').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(detail.still===i)));}
$('#close-detail').onclick=()=>$('#inspector').close();$('#inspector').addEventListener('close',()=>{detail=null});$('#inspector').addEventListener('click',e=>{if(e.target===$('#inspector')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
document.querySelectorAll('button[data-action]').forEach(b=>b.onclick=()=>{act(detail,b.dataset.action,$('#detail-loop').checked);$('#pause-detail').textContent=detail.playing?'Pause':'Resume';updateDetailControls()});
$('#detail-loop').onchange=e=>{if(detail)detail.loop=e.target.checked};$('#pause-detail').onclick=()=>{if(!detail)return;if(detail.still!==null||detail.action==='idle'||detail.elapsed>=duration){act(detail,'attack',$('#detail-loop').checked)}else detail.playing=!detail.playing;$('#pause-detail').textContent=detail.playing?'Pause':'Resume';updateDetailControls()};
$('#timeline').oninput=e=>{detail.still=null;if(detail.action==='idle')detail.action='attack';detail.elapsed=Number(e.target.value)/1000*duration;detail.playing=false;$('#pause-detail').textContent='Resume';updateDetailControls()};
$('#search').oninput=filter;$('#variants').onchange=filter;$('#speed').onchange=e=>{speed=Number(e.target.value)};
$('#gentle').onchange=()=>{if(detail)[...$('#pose-strip').children].forEach((b,i)=>paint(b.querySelector('canvas'),detail,0,i,true))};
$('#clear-search').onclick=()=>{$('#search').value='';selectedGroup='all';filter()};
$('#loop-all').onclick=()=>{let n=0;for(const s of cards.values())if(!s.card.hidden){act(s,'attack',true);n++}notify(`Looping ${n} attack animations`)};
$('#stop-all').onclick=()=>{for(const s of cards.values())act(s,'idle');if(detail){act(detail,'idle');updateDetailControls()}notify('All animations stopped')};
// One clock, shared image cache, and viewport-aware drawing keep the complete sheet light.
function tick(now){const dt=document.hidden?0:Math.min(now-last,100);last=now;if(!document.hidden){
 if(detail){advance(detail,dt);paint($('#detail-canvas'),detail,now);const label=detail.entry.labels[detail.pose]||'Idle';$('#pose-status').textContent=label;$('#sheet-link').href=assetURL(detail.entry.frames[detail.pose].file);$('#timeline').value=String(Math.round(detail.elapsed/duration*1000));$('#progress-label').textContent=`${Math.round(detail.elapsed/duration*100)}%`;$('#pause-detail').textContent=detail.playing?'Pause':'Resume';}
 else for(const s of cards.values())if(s.visible&&!s.card.hidden){advance(s,dt);paint(s.canvas,s,now)}
 }requestAnimationFrame(tick)}
async function cover(){const cv=$('#cover-art'),ctx=cv.getContext('2d');const heroes=roster.filter(e=>e.kind==='hero');await Promise.all(heroes.map(prepare));ctx.clearRect(0,0,700,400);for(const [i,e] of heroes.entries()){const temp=document.createElement('canvas');temp.width=250;temp.height=340;paint(temp,state(e),0,0,true);ctx.drawImage(temp,15+i*210,i===1?25:50,250,340)}}
build();cover();requestAnimationFrame(tick);


