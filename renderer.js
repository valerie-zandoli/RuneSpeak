import { room, types, heroes, items, rng } from './engine.js';
import { paintDungeon, paintAtmosphere } from './dungeon-art.js';
import { audio } from './audio.js';

export function createRenderer(canvas, getState) {
  const ctx = canvas.getContext('2d');
  const atlas = new Image();
  atlas.src = 'assets/runespeak-atlas.svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let effect = null, frame, imageFailed = false;
  const clamp = n => Math.max(0, Math.min(1, n));

  function tile(n, x, y, size = 48, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, n % 12 * 100, Math.floor(n / 12) * 100, 100, 100, Math.round(x), Math.round(y), size, size);
    ctx.restore();
  }
  function actor(n,x,y,size,alpha=1,tilt=0,squash=1){
    ctx.save();ctx.translate(x,y+size);ctx.rotate(tilt);ctx.scale(1/squash,squash);tile(n,-size/2,-size,size,alpha);ctx.restore();
  }
  function ring(x,y,p,color){if(p<0||p>1)return;ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle=color;ctx.lineWidth=5*(1-p)+1;ctx.beginPath();ctx.ellipse(x,y,20+p*100,8+p*30,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  function glow(x, y, size, color) {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, size);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  function text(value, x, y, color = '#d9e6b6', size = 23) {
    ctx.font = `900 ${size}px Nunito, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(value, x, y);
    ctx.fillStyle = color; ctx.fillText(value, x, y);
  }
  function burst(x, y, p, color, count = 20) {
    if (p < 0 || p > 1) return;
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399, radius = (30 + i % 5 * 12) * p;
      ctx.beginPath();ctx.arc(x+Math.cos(angle)*radius,y+Math.sin(angle)*radius+p*p*30,2+i%3,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function draw(now) {
    frame = requestAnimationFrame(draw);
    if (document.hidden || (document.body.dataset.view && document.body.dataset.view !== 'dungeon')) return;
    if (!atlas.complete || !atlas.naturalWidth) {
      ctx.fillStyle = '#14211b'; ctx.fillRect(0, 0, 960, 480);
      text(imageFailed ? 'Artwork unavailable · challenges still work' : 'Lighting the torches…', 480, 240);
      return;
    }
    const s = getState(), rm = room(s), hero = heroes[s.hero];
    const elapsed = effect ? (now - effect.start) / effect.duration : 1;
    const e = effect, p = clamp(elapsed), time = reduced ? 0 : now / 1000;
    const biome = Math.floor(s.depth / 3), random = rng(`${s.seed}:room:${s.depth}:${s.lane}`);
    const combat = ['battle', 'spell', 'boss'].includes(rm.type);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (e?.type === 'hurt' && !reduced && p > .36 && p < .75) ctx.translate(Math.sin(p * 120) * 5, Math.cos(p * 90) * 2);
    paintDungeon(ctx, biome, s.phase === 'doors' || e?.type === 'walk', time);

    paintAtmosphere(ctx, biome, rm.type, time);

    let hx = 258, hy = 325, ex = 716, ey = 285;
    if (e?.type === 'enter' && !reduced) { hx -= (1 - p) * 100; hy += (1 - p) * 90; }
    if (e?.type === 'walk' && !reduced) { const ease = p * p * (3 - 2 * p); hx += ([264, 480, 696][e.lane] - hx) * ease; hy += (216 - hy) * ease; }
    const magical = e?.kind === 'grammar' || s.hero === 'arcanist';
    if (e?.type === 'attack' && !magical && !reduced) hx += Math.sin(clamp(p / .75) * Math.PI) * 335;
    if (e?.type === 'hurt' && combat && !reduced) ex -= Math.sin(clamp(p / .8) * Math.PI) * 310;
    if (e?.type === 'attack' && p > .4 && p < .75 && !reduced) ex += Math.sin(p * 95) * 5;
    const bob = Math.round(Math.sin(time * 3) * 2);
    ctx.fillStyle = '#c7b6db88';
    for (const [x, y, width] of [[hx, hy + 45, 33], [ex, ey + 62, rm.type === 'boss' ? 47 : 32]]) { ctx.beginPath(); ctx.ellipse(x, y, width, 10, 0, 0, Math.PI * 2); ctx.fill(); }

    // Equipment lives in the loadout UI; keep the hero silhouette uncluttered.
    const heroAlpha = s.phase === 'lost' ? .45 : e?.type === 'hurt' && p > .38 && p < .75 && Math.floor(p * 35) % 2 ? .35 : 1;
    const running=e&&['walk','enter'].includes(e.type);
    const tilt=reduced?0:running?Math.sin(time*18)*.07:e?.type==='attack'&&!magical?Math.sin(p*Math.PI*2)*.12:Math.sin(time*2)*.015;
    const squash=reduced?1:1+Math.sin(time*(running?18:3))*(running?.035:.012);
    actor(hero.tile,hx,hy-69+bob,120,heroAlpha,tilt,squash);
    if (!e || ['enter', 'heal', 'equip'].includes(e.type)) text(hero.name.replace('The ', '').toUpperCase(), hx, hy + 74, '#7851b0', 17);

    const targetTile = rm.type === 'battle' ? [108, 124, 122][rm.variant] : types[rm.type].tile;
    const dying = e?.type === 'attack' && e.cleared;
    const showEnemy = combat && (s.enemyHp > 0 || (dying && p < .9));
    if (showEnemy) {
      const alpha = dying ? 1 - clamp((p - .5) * 2.5) : 1;
      const size = rm.type === 'boss' ? 150 : 120;
      if (rm.type === 'boss') glow(ex, ey + 40, 110, s.enemyHp < s.enemyMax / 2 ? '#e97f5033' : '#ae86e22b');
      const collapse=dying&&!reduced?clamp((p-.5)*2):0;
      actor(targetTile,ex,ey-37-bob+collapse*50,size*(1-collapse*.35),alpha,reduced?0:dying?collapse*.5:Math.sin(time*2.3)*.035,reduced?1:1+Math.sin(time*3.4)*.025);
      if(e?.type==='attack'&&!reduced)ring(ex,ey+60,(p-.42)/.58,magical?'#b38ae3':'#ffc800');
    }
    if (!combat) {
      const resolved = s.enemyHp === 0 && (!e || p > .5);
      if (rm.type === 'treasure') { tile(resolved && s.feedback?.correct ? 91 : 89, ex - 60, ey - 12, 120); if (resolved && s.feedback?.correct) glow(ex, ey + 20, 100, '#fbd46d55'); }
      if (rm.type === 'shrine') { tile(32, ex - 60, ey - 12, 120); glow(ex, ey + 20, 90, resolved && s.feedback?.correct ? '#96f6c766' : '#88c6bb22'); }
      if (rm.type === 'trap') { tile(resolved && s.feedback?.correct ? 31 : 41, ex - 60, ey + 4, 120); if (!resolved) tile(61, ex - 20, ey - 7 + bob, 40, .7); }
    }
    if (combat && s.enemyHp === 0 && (!e || p > .85)) tile(24, 690, 337, 48, .7);

    if (s.loot && s.phase === 'feedback' && s.equipment[items[s.loot].slot] !== s.loot && (!e || p > .78)) {
      glow(716, 352, 78, '#edd26a39');
      ctx.fillStyle = '#e0c26b20'; ctx.fillRect(709, 247, 14, 110);
      tile(items[s.loot].tile, 696, 313 + bob, 40);
      text('LOOT', 716, 390, '#c68b00', 18);
    }

    if (e) {
      if (e.type === 'attack') {
        if (magical && p < .57) {
          const travel = clamp(p / .55), x = 290 + travel * 418, y = 321 - Math.sin(travel * Math.PI) * 54;
          glow(x, y, 45, '#cea5ff88'); tile(61, x - 14, y - 14, 28); ctx.fillStyle = '#d1a7ee'; for (let i = 0; i < 5; i++) ctx.fillRect(x - i * 10, y + Math.sin(i) * 3, 5, 5);
        }
        if (!magical && p > .35 && p < .65) { ctx.strokeStyle = '#e9eac4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(715, 308, 49, -1.2, 1.6); ctx.stroke(); }
        burst(716, 310, (p - .42) / .58, magical ? '#c4a1f0' : '#edce8b');
        if (p > .43) text(`−${e.dealt}`, 716, 277 - (p - .43) * 65, '#ed9315', 30);
      }
      if (e.type === 'hurt') {
        burst(258, 330, (p - .4) / .6, '#e98a73');
        if (p > .4) text(e.damage ? `−${e.damage}` : 'BLOCKED', 258, 292 - p * 30, '#ea2b2b', 28);
        if (e.encounter === 'trap' && p > .15 && p < .7) for (let i = 0; i < 4; i++) tile(41, 186 + i * 38, 352 - Math.sin(p * Math.PI) * 25, 38);
      }
      if (e.type === 'treasure') { if(!reduced)for(let i=0;i<7;i++){const q=clamp((p-i*.035)/.8);if(q>0&&q<1)tile(73,700+Math.sin(i*2.4)*q*105,300-Math.sin(q*Math.PI)*100+q*20,22,1-q*.6);} burst(716, 316, clamp((p - .2) / .8), '#f2d17b', 30); if (p > .3) text(`+${e.gain} GOLD`, 716, 269 - p * 25, '#f7d78b', 27); }
      if (e.type === 'shrine' || e.type === 'heal') { if(!reduced){ring(hx,hy+43,p,'#78c82b');ring(hx,hy+43,clamp(p-.2),'#9be28a');} glow(hx, hy, 100, '#b1eaa544'); burst(hx, hy, p, '#bde8a2'); text(`+${e.heal} HP`, hx, hy - 36 - p * 45, '#bfe9a5', 28); }
      if (e.type === 'trap') { burst(716, 330, p, '#a7d1ac'); text('DISARMED', 716, 277 - p * 30, '#b9dbaa', 26); }
      if (e.type === 'equip') { glow(hx, hy, 100, '#f0d69a44'); burst(hx, hy, p, '#dccaa0'); }
    }
    const particleRng = rng(s.seed + 'motes');
    for (let i = 0; i < 18; i++) { const x = 90 + particleRng() * 780, y = 230 + particleRng() * 210; ctx.globalAlpha = .12 + Math.sin(time + i) ** 2 * .2; ctx.fillStyle = biome === 2 ? '#bba5e5' : '#d6d7a1'; ctx.fillRect(x, y - Math.sin(time * .4 + i) * 8, 2, 2); }
    ctx.globalAlpha = 1;
    if (e?.type === 'walk' && p > .65) { ctx.fillStyle = `rgba(9,18,15,${(p - .65) / .35})`; ctx.fillRect(0, 0, 960, 480); }
    if (e?.type === 'enter' && p < .25) { ctx.fillStyle = `rgba(9,18,15,${1 - p * 4})`; ctx.fillRect(0, 0, 960, 480); }
    ctx.restore();
    if (effect && elapsed >= 1) { const done = effect.resolve; effect = null; done(); }
  }
  atlas.onerror = () => { imageFailed = true; };
  frame = requestAnimationFrame(draw);
  return {
    async play(event) {
      if(audio.settings.effects || audio.settings.music) await audio.unlock();
      audio.effect(event);
      if (effect) { effect.resolve(); effect = null; }
      return new Promise(resolve => {
        effect = { ...event, start: performance.now(), duration: reduced ? 100 : event.type === 'walk' ? 650 : event.type === 'enter' ? 550 : 1050, resolve };
        // Keep gameplay available even when the tab is backgrounded or artwork fails.
        const current = effect;
        setTimeout(() => { if (effect === current) { effect = null; resolve(); } }, current.duration + 150);
      });
    },
    stop() { cancelAnimationFrame(frame); effect?.resolve(); effect = null; },
  };
}
