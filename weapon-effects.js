// Weapon centerlines measured in each pose's source crop; drawn in the hero's transform.
const paths = {
  knight: [ [[120,360],[42,470]], [[135,353],[72,461]], [[171,119],[281,16]], [[394,222],[565,211]], [[118,326],[246,402]], [[177,115],[210,4]] ],
  ranger: [ [[373,128],[387,218],[369,304],[335,376]], [[428,173],[413,276],[365,344],[271,403]], [[361,61],[420,129],[426,256],[374,371]], [[407,36],[450,142],[452,236],[398,359]], [[428,92],[410,205],[359,272],[275,326]], [[397,110],[421,199],[396,284],[337,391]] ],
  wizard: [ [[209,489],[184,340],[170,225],[151,153]], [[158,485],[161,290],[149,153]], [[228,421],[341,288],[403,201],[425,149]], [[417,174],[467,154],[510,126]], [[272,474],[239,282],[193,144]], [[196,473],[174,269],[153,144]] ],
};
const colors = { knight: '#73d8ff', ranger: '#93f976', wizard: '#ffd56e' };

export function weaponGlow(equipped, event, progress, time, reduced = false) {
  if (!equipped) return 0;
  if (reduced) return .65;
  const upgrade = event?.type === 'equip' && event.slot === 'weapon' && event.equipped;
  return upgrade ? .55 + Math.sin(Math.PI * progress) * .45 : .42 + (Math.sin(time * 3) + 1) * .1;
}

// Deterministic motes follow the weapon rather than leaving trails across rooms.
export function weaponMotes(hero, pose, ax, ay, scale, strength, time, reduced = false) {
  if (!strength) return [];
  const points = paths[hero][pose].map(([x,y]) => [(x-ax)*scale, (y-ay)*scale]);
  const lengths = points.slice(1).map((point,i) => Math.hypot(point[0]-points[i][0],point[1]-points[i][1]));
  const total = lengths.reduce((a,b)=>a+b,0);
  const surge = Math.max(0, (strength-.65)/.35);
  const count = reduced ? 10 : 24 + Math.round(surge*12);
  const clock = reduced ? 0 : time;
  return Array.from({length:count},(_,i)=>{
    const life = (i*.61803398875 + clock*.32)%1;
    let distance = ((i*.38196601125+clock*.12)%1)*total, segment = 0;
    while(segment<lengths.length-1 && distance>lengths[segment]) distance-=lengths[segment++];
    const a=points[segment],b=points[segment+1],length=lengths[segment];
    const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
    const side=i%2 ? 1 : -1;
    const orbit=clock*2.2+i*2.399;
    const offset=side*(8+Math.sin(orbit)*3+life*(8+surge*12));
    return {x:a[0]+dx*distance-dy*offset, y:a[1]+dy*distance+dx*offset-life*7,
      alpha:reduced ? .75 : .25+.75*Math.sin(life*Math.PI),
      size: i%6===0 ? 2.5 : 1.1+(i%3)*.45, rune:i%6===0,
      angle:orbit, dx, dy};
  });
}

// Aura and sparks sit behind the sprite, leaving the weapon's surface intact.
export function drawWeaponGlow(ctx, hero, pose, ax, ay, scale, strength, time = 0, reduced = false) {
  if (!strength) return;
  const points = paths[hero][pose];
  const color = colors[hero];
  ctx.save(); ctx.globalAlpha *= Math.min(1,strength+.25);
  const alpha = ctx.globalAlpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.beginPath();
  points.forEach(([x,y], i) => ctx[i ? 'lineTo' : 'moveTo']((x-ax)*scale, (y-ay)*scale));
  ctx.globalAlpha = alpha*.32;
  ctx.lineWidth = hero === 'knight' ? 15 : 11; ctx.stroke();
  for (const mote of weaponMotes(hero,pose,ax,ay,scale,strength,time,reduced)) {
    ctx.globalAlpha = alpha*mote.alpha;
    const halo=ctx.createRadialGradient(mote.x,mote.y,0,mote.x,mote.y,6);
    halo.addColorStop(0,color); halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo; ctx.fillRect(mote.x-6,mote.y-6,12,12);
    ctx.shadowBlur=7; ctx.fillStyle='#f6ffff'; ctx.strokeStyle=color;
    if(mote.rune){
      // Little diamond runes and starbursts make the enchantment readable at game scale.
      const r=mote.size+1;
      ctx.beginPath();ctx.moveTo(mote.x,mote.y-r);ctx.lineTo(mote.x+r*.65,mote.y);
      ctx.lineTo(mote.x,mote.y+r);ctx.lineTo(mote.x-r*.65,mote.y);ctx.closePath();
      ctx.lineWidth=1.3;ctx.stroke();
      ctx.fillRect(mote.x-.7,mote.y-.7,1.4,1.4);
    }else{
      ctx.beginPath();ctx.arc(mote.x,mote.y,mote.size,0,Math.PI*2);ctx.fill();
      if(!reduced){
        ctx.globalAlpha*=.5;ctx.lineWidth=1.2;ctx.beginPath();
        ctx.moveTo(mote.x,mote.y);ctx.lineTo(mote.x-mote.dx*4,mote.y-mote.dy*4+2);ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function knightSwordTip({x, feet, tilt = 0, squash = 1}) {
  const dx = (210-280)*146/512/squash, dy = (4-493)*146/512*squash;
  return {x: x + dx*Math.cos(tilt)-dy*Math.sin(tilt), y: feet + dx*Math.sin(tilt)+dy*Math.cos(tilt)};
}

export function knightMagicBolt(event, p, origin, target, reduced = false) {
  if (event?.type !== 'attack' || event.kind !== 'grammar' || p < .38 || p >= .57) return null;
  const travel = reduced ? 0 : (p-.38)/.19;
  return { x: origin.x + (target.x-origin.x)*travel, y: origin.y + (target.y-origin.y)*travel,
    angle: Math.atan2(target.y-origin.y, target.x-origin.x) };
}
