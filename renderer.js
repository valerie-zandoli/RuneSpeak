import { dragonSheet, dragonPose, drawDragon, dragonMouth, dragonBreath, drawDragonBreath } from './dragon-art.js';
import { weaponGlow, knightSwordTip, knightMagicBolt } from './weapon-effects.js';
import { room, types, heroes, items, rng } from './engine.js';
import { paintDungeon, paintAtmosphere } from './dungeon-art.js';
import { paintDungeon as paintThemedDungeon, paintAtmosphere as paintThemedAtmosphere } from './themed-dungeon-art.js';
import { dungeonBiome } from './dungeons.js';
import { audio } from './audio.js';
import { knightPose, drawKnight } from './knight-art.js';
import { rangerPose, drawRanger } from './ranger-art.js';
import { wizardPose, drawWizard } from './wizard-art.js';
import { enemyForRoom, cyclopsSheet } from './enemies.js';
import { cyclopsPose, cyclopsMotion, cyclopsProjectile, drawCyclops, drawCyclopsStone } from './cyclops-art.js';
import { slimeSheet, slimePose, slimeMotion, drawSlime } from './slime-art.js';
import { goblinSheet, goblinMotion, drawGoblin, goblinProjectile } from './goblin-art.js';
import { skeletonSheet, skeletonPose, skeletonMotion, skeletonProjectile, drawSkeleton } from './skeleton-art.js';
import { koboldSheet, koboldPose, koboldMotion, koboldProjectile, drawKobold } from './kobold-art.js';

export function createRenderer(canvas, getState) {
  const ctx = canvas.getContext('2d');
  const atlas = new Image();
  atlas.src = 'assets/runespeak-atlas.svg';
  const knight = new Image();
  knight.src = 'assets/knight-poses.png';
  const ranger = new Image();
  ranger.src = 'assets/ranger-poses.png';
  const wizard = new Image();
  wizard.src = 'assets/wizard-poses.png';
  const dragonImages = new Map();
  function dragonImage(model) {
    if (!dragonImages.has(model)) {
      const image = new Image(); image.src = dragonSheet(model); dragonImages.set(model, image);
    }
    return dragonImages.get(model);
  }
  const cyclopsImages = new Map();
  const skeletonImages = new Map();
  const koboldImages = new Map();
  function koboldImage(model) {
    if (!koboldImages.has(model)) {
      const image = new Image();
      image.src = koboldSheet(model); koboldImages.set(model, image);
    }
    return koboldImages.get(model);
  }
  function skeletonImage(model) {
    if (!skeletonImages.has(model)) {
      const image = new Image();
      image.src = skeletonSheet(model); skeletonImages.set(model, image);
    }
    return skeletonImages.get(model);
  }
  const goblinImages = new Map();
  function goblinImage(model) {
    if (!goblinImages.has(model)) {
      const image = new Image();
      image.src = goblinSheet(model); goblinImages.set(model, image);
    }
    return goblinImages.get(model);
  }
  const slimeImages = new Map();
  function slimeImage(model) {
    if (!slimeImages.has(model)) {
      const image = new Image();
      image.src = slimeSheet(model);
      slimeImages.set(model, image);
    }
    return slimeImages.get(model);
  }
  function cyclopsImage(model, palette) {
    const src = cyclopsSheet(model, palette);
    if (!cyclopsImages.has(src)) {
      const image = new Image();
      // A missing palette falls back to the same model in teal, never another enemy.
      image.onerror = () => {
        if (palette !== 'teal' && !image.fallback) { image.fallback = true; image.src = cyclopsSheet(model); }
      };
      image.src = src; cyclopsImages.set(src, image);
    }
    return cyclopsImages.get(src);
  }
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
    const enemy = enemyForRoom(rm);
    const dragon = enemy?.dragon ? dragonImage(enemy.dragon) : null;
    const skeleton = enemy?.skeleton ? skeletonImage(enemy.skeleton) : null;
    const kobold = enemy?.kobold ? koboldImage(enemy.kobold) : null;
    const goblin = enemy?.goblin ? goblinImage(enemy.goblin) : null;
    const cyclops = enemy?.model ? cyclopsImage(enemy.model, enemy.palette) : null;
    const slime = enemy?.slimeModel ? slimeImage(enemy.slimeModel) : null;
    const elapsed = effect ? (now - effect.start) / effect.duration : 1;
    const e = effect, p = clamp(elapsed), time = reduced ? 0 : now / 1000;
    const enemyMotion = enemy?.model ? cyclopsMotion(enemy.model, e, p, time, reduced)
      : enemy?.kobold ? koboldMotion(enemy.kobold, e, p, time, reduced)
      : enemy?.skeleton ? skeletonMotion(enemy.skeleton, e, p, reduced)
      : enemy?.goblin ? goblinMotion(enemy.goblin, e, p, reduced)
      : enemy?.slimeModel ? slimeMotion(e, p, time, reduced) : null;
    const biome = dungeonBiome(s), random = rng(`${s.seed}:room:${s.depth}:${s.lane}`);
    const combat = ['battle', 'spell', 'boss'].includes(rm.type);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (e?.type === 'hurt' && !reduced && p > .36 && p < .75) ctx.translate(Math.sin(p * 120) * 5, Math.cos(p * 90) * 2);
    (s.dungeon ? paintThemedDungeon : paintDungeon)(ctx, biome, s.phase === 'doors' || e?.type === 'walk', time);

    (s.dungeon ? paintThemedAtmosphere : paintAtmosphere)(ctx, biome, rm.type, time);

    let hx = s.phase === 'doors' ? 105 : 258, hy = 325, ex = 716, ey = 285;
    if (enemyMotion) ex += enemyMotion.dx;
    if (e?.type === 'enter' && !reduced) { hx -= (1 - p) * 100; hy += (1 - p) * 90; }
    if (e?.type === 'walk' && !reduced) { const ease = p * p * (3 - 2 * p); hx += ([264, 480, 696][e.lane] - hx) * ease; hy += (216 - hy) * ease; }
    const weaponLight = weaponGlow(s.equipment.weapon, e, p, time, reduced);
    const magical = e?.kind === 'grammar' || s.hero === 'wizard';
    const ranged = s.hero === 'ranger';
    const impact = s.hero === 'knight' && magical ? .57 : .42;
    if (e?.type === 'attack' && !magical && !ranged && !reduced) hx += Math.sin(clamp(p / .75) * Math.PI) * 335;
    if (e?.type === 'hurt' && combat && !enemy?.model && !enemy?.slimeModel && !enemy?.goblin && !enemy?.skeleton && !enemy?.kobold && !enemy?.dragon && !reduced) ex -= Math.sin(clamp(p / .8) * Math.PI) * 310;
    if (e?.type === 'attack' && p > impact && p < .75 && !reduced) ex += Math.sin(p * 95) * 5;
    const bob = Math.round(Math.sin(time * 3) * 2);
    ctx.fillStyle = '#c7b6db88';
    for (const [x, y, width] of [[hx, hy + 45, 33], [ex, ey + 62, rm.type === 'boss' ? 47 : 32]]) { ctx.beginPath(); ctx.ellipse(x, y, width, 10, 0, 0, Math.PI * 2); ctx.fill(); }

    // Equipment lives in the loadout UI; keep the hero silhouette uncluttered.
    const heroAlpha = s.phase === 'lost' ? .45 : e?.type === 'hurt' && p > .38 && p < .75 && Math.floor(p * 35) % 2 ? .35 : 1;
    const running=e&&['walk','enter'].includes(e.type);
    const tilt=reduced?0:running?Math.sin(time*18)*.07:e?.type==='attack'&&!magical?Math.sin(p*Math.PI*2)*.12:Math.sin(time*2)*.015;
    const squash=reduced?1:1+Math.sin(time*(running?18:3))*(running?.035:.012);
    if (s.hero === 'knight' && knight.complete && knight.naturalWidth) {
      const pose = knightPose(e, p, time, s.phase, reduced);
      const recoil = !reduced && e?.type === 'hurt' ? Math.sin(p * Math.PI) : 0;
      const hop = !reduced && (s.phase === 'won' || e?.type === 'treasure') ? Math.max(0, Math.sin(time * 5)) * 7 : 0;
      drawKnight(ctx, knight, { x: hx - recoil * 14, feet: hy + 45 + bob, pose,
        alpha: heroAlpha, tilt: tilt - recoil * .09, squash, hop, weaponGlow: weaponLight, weaponTime: time, reduced });
    } else if (ranged && ranger.complete && ranger.naturalWidth) {
      const recoil = !reduced && e?.type === 'hurt' ? Math.sin(p * Math.PI) : 0;
      const hop = !reduced && (s.phase === 'won' || e?.type === 'treasure') ? Math.max(0, Math.sin(time * 5)) * 7 : 0;
      drawRanger(ctx, ranger, { x: hx - recoil * 14, feet: hy + 45 + bob,
        pose: rangerPose(e, p, time, s.phase, reduced), alpha: heroAlpha,
        tilt: (running ? tilt : 0) - recoil * .09, squash, hop, weaponGlow: weaponLight, weaponTime: time, reduced });
    } else if (s.hero === 'wizard' && wizard.complete && wizard.naturalWidth) {
      const recoil = !reduced && e?.type === 'hurt' ? Math.sin(p * Math.PI) : 0;
      const hop = !reduced && (s.phase === 'won' || e?.type === 'treasure') ? Math.max(0, Math.sin(time * 5)) * 7 : 0;
      drawWizard(ctx, wizard, { x: hx - recoil * 14, feet: hy + 45 + bob,
        pose: wizardPose(e, p, time, s.phase, reduced), alpha: heroAlpha,
        tilt: (running ? tilt : 0) - recoil * .09, squash, hop, weaponGlow: weaponLight, weaponTime: time, reduced });
    } else if (s.hero !== 'knight' && s.hero !== 'wizard' && !ranged) {
      actor(hero.tile,hx,hy-69+bob,120,heroAlpha,tilt,squash);
    } else {
      text((ranged ? rangerFailed : s.hero === 'wizard' ? wizardFailed : knightFailed) ? 'Hero artwork unavailable' : 'Preparing your hero…', hx, hy, '#7851b0', 13);
    }
    if (!e || ['enter', 'heal', 'equip'].includes(e.type)) text(hero.name.replace('The ', '').toUpperCase(), hx, hy + 74, '#7851b0', 17);

    const targetTile = enemy?.tile || types[rm.type].tile;
    const dying = e?.type === 'attack' && e.cleared;
    const showEnemy = combat && (s.enemyHp > 0 || (dying && p < .9));
    if (showEnemy) {
      const alpha = dying ? 1 - clamp((p - .5) * 2.5) : 1;
      const size = rm.type === 'boss' ? 150 : 120;
      if (rm.type === 'boss') glow(ex, ey + 40, 110, s.enemyHp < s.enemyMax / 2 ? '#e97f5033' : '#ae86e22b');
      const collapse=dying&&!reduced?clamp((p-.5)*2):0;
      if (enemy?.dragon) {
        if (dragon.complete && dragon.naturalWidth) {
          drawDragon(ctx, dragon, { model: enemy.dragon, x: ex, feet: ey + 62,
            pose: dragonPose(e, p, reduced), alpha, time, reduced });
        } else text(dragon.complete ? 'Dragon artwork unavailable' : 'A dragon approaches…', ex, ey + 30, '#7851b0', 13);
      } else if (enemy?.kobold) {
        if (kobold.complete && kobold.naturalWidth) {
          drawKobold(ctx, kobold, { model: enemy.kobold, x: ex, feet: ey + 62,
            pose: koboldPose(e, p, reduced), bob: enemyMotion.bob,
            alpha: dying ? 1 - clamp((p - .76) / .14) : 1 });
        } else text(kobold.complete ? 'Kobold artwork unavailable' : 'A kobold approaches…', ex, ey + 30, '#7851b0', 13);
      } else if (enemy?.skeleton) {
        if (skeleton.complete && skeleton.naturalWidth) {
          drawSkeleton(ctx, skeleton, { model: enemy.skeleton, x: ex, feet: ey + 62,
            pose: skeletonPose(e, p), alpha, tilt: enemyMotion.tilt, collapse });
        } else text(skeleton.complete ? 'Skeleton artwork unavailable' : 'A fallen hero approaches…', ex, ey + 30, '#7851b0', 13);
      } else if (enemy?.goblin) {
        if (goblin.complete && goblin.naturalWidth) {
          drawGoblin(ctx, goblin, { model: enemy.goblin, x: ex, feet: ey + 62,
            alpha, tilt: enemyMotion.tilt, collapse });
        } else text(goblin.complete ? 'Goblin artwork unavailable' : 'A goblin approaches…', ex, ey + 30, '#7851b0', 13);
      } else if (enemy?.slimeModel) {
        if (slime.complete && slime.naturalWidth) {
          const motion = enemyMotion;
          drawSlime(ctx, slime, { model: enemy.slimeModel, palette: enemy.palette,
            x: ex, feet: ey + 62, pose: slimePose(e, p, reduced),
            alpha: dying ? 1 - clamp((p - .75) / .15) : 1, hop: motion.hop, squash: motion.squash });
        } else text(slime.complete ? 'Slime artwork unavailable' : 'A slime approaches…', ex, ey + 30, '#7851b0', 13);
      } else if (enemy?.model) {
        if (cyclops.complete && cyclops.naturalWidth) {
          drawCyclops(ctx, cyclops, { model: enemy.model, palette: cyclops.fallback ? 'teal' : enemy.palette,
            x: ex, feet: ey + 62, pose: cyclopsPose(e, p, time, reduced),
            alpha: dying ? 1 - clamp((p - .72) / .18) : 1, tilt: enemyMotion.tilt, squash: enemyMotion.squash });
        } else text(cyclops.complete ? 'Cyclops artwork unavailable' : 'A cyclops approaches…', ex, ey + 30, '#7851b0', 13);
      } else {
        actor(targetTile,ex,ey-37-bob+collapse*50,size*(1-collapse*.35),alpha,reduced?0:dying?collapse*.5:Math.sin(time*2.3)*.035,reduced?1:1+Math.sin(time*3.4)*.025);
      }
      if(e?.type==='attack'&&!reduced)ring(ex,ey+60,(p-impact)/(1-impact),magical?'#b38ae3':'#ffc800');
    }
    if (!combat) {
      if (rm.type === 'shop') {
        // A striped relic stall fits the existing hand-drawn dungeon palette.
        ctx.save();
        ctx.fillStyle = '#885d48'; ctx.fillRect(628,254,8,112); ctx.fillRect(796,254,8,112);
        ctx.fillStyle = '#f3c86e'; ctx.fillRect(616,240,200,28);
        ctx.fillStyle = '#9763ba'; for(let i=0;i<5;i++)ctx.fillRect(616+i*40,240,20,28);
        ctx.fillStyle = '#ba8557';ctx.fillRect(616,321,200,38);
        ctx.fillStyle = '#f5d98b';ctx.fillRect(610,315,212,10);
        for(const [i,n] of [106,116,65].entries())tile(n,636+i*54,280,36);
        text(s.enemyHp === 0 && s.feedback?.correct ? 'SHOP OPEN' : 'RELIC SHOP',716,222,'#94651e',18);
        ctx.restore();
      }
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
        if (ranged && p >= .34 && p < .57) {
          const travel = clamp((p - .34) / .23), x = hx + 58 + travel * (716 - hx - 58), y = hy - 34 + travel * 19;
          ctx.save(); ctx.translate(x, y); ctx.rotate(.05);
          if (magical) glow(0, 0, 25, '#cea5ff88');
          ctx.strokeStyle = '#865431'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.fillStyle = magical ? '#b38ae3' : '#d2dce6'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-3, -5); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        if (s.hero === 'wizard' && p >= .3 && p < .57) {
          const travel = clamp((p - .3) / .27), x = hx + 78 + travel * (716 - hx - 78), y = hy - 54 + travel * 39;
          glow(x, y, 32, '#ffce6088'); tile(61, x - 12, y - 12, 24);
        }
        if (s.hero === 'knight' && magical) {
          const origin = knightSwordTip({ x: hx, feet: hy + 45 + bob, tilt, squash });
          const shot = knightMagicBolt(e, p, origin, { x: 716, y: 310 }, reduced);
          if (p >= .38 && p < .57) glow(origin.x, origin.y, 24, '#73d8ffaa');
          if (shot) {
            ctx.save(); ctx.translate(shot.x, shot.y); ctx.rotate(shot.angle);
            glow(0, 0, 26, '#73d8ffaa');
            ctx.strokeStyle = '#73d8ff'; ctx.shadowColor = '#73d8ff'; ctx.shadowBlur = 14;
            ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
            ctx.moveTo(reduced ? -5 : -22, 0); ctx.lineTo(3, 0); ctx.stroke();
            ctx.strokeStyle = '#efffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
          }
        }
        if (!magical && !ranged && p > .35 && p < .65) { ctx.strokeStyle = '#e9eac4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(715, 308, 49, -1.2, 1.6); ctx.stroke(); }
        burst(716, 310, (p - impact) / (1 - impact), magical ? '#c4a1f0' : '#edce8b');
        if (p > impact) text(`−${e.dealt}`, 716, 277 - (p - .43) * 65, '#ed9315', 30);
      }
      if (e.type === 'hurt') {
        if (enemy?.dragon && dragon.complete && dragon.naturalWidth) {
          const origin = dragonMouth(enemy.dragon, ex, ey + 62, dragonPose(e, p, reduced));
          drawDragonBreath(ctx, dragonBreath(enemy.breath, e, p, origin, { x: hx, y: hy - 5 }, reduced));
        }
        const shot = skeletonProjectile(enemy?.skeleton, e, p, reduced);
        if (shot) {
          if (shot.kind === 'wizard') {
            glow(shot.x, shot.y, 22, '#44d8db88');
            ctx.fillStyle = '#82f2ea'; ctx.beginPath(); ctx.arc(shot.x, shot.y, 6, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.strokeStyle = '#865431'; ctx.lineWidth = 3; ctx.beginPath();
            ctx.moveTo(shot.x + 24, shot.y); ctx.lineTo(shot.x, shot.y); ctx.stroke();
            ctx.fillStyle = '#d2dce6'; ctx.beginPath(); ctx.moveTo(shot.x - 7, shot.y);
            ctx.lineTo(shot.x + 3, shot.y - 4); ctx.lineTo(shot.x + 3, shot.y + 4); ctx.closePath(); ctx.fill();
          }
        }
        const spell = koboldProjectile(enemy?.kobold, e, p, reduced, ex, ey + 62)
          || goblinProjectile(enemy?.goblin, e, p, reduced);
        if (spell) {
          glow(spell.x, spell.y, 22, '#44d8db88');
          ctx.fillStyle = '#82f2ea'; ctx.beginPath(); ctx.arc(spell.x, spell.y, 6, 0, Math.PI * 2); ctx.fill();
        }
        drawCyclopsStone(ctx, cyclopsProjectile(enemy?.model, e, p, reduced));
        burst(258, 330, (p - .4) / .6, '#e98a73');
        if (p > .4) text(e.damage ? `−${e.damage}` : 'BLOCKED', 258, 292 - p * 30, '#ea2b2b', 28);
        if (e.encounter === 'trap' && p > .15 && p < .7) for (let i = 0; i < 4; i++) tile(41, 186 + i * 38, 352 - Math.sin(p * Math.PI) * 25, 38);
      }
      if (e.type === 'treasure') { if(!reduced)for(let i=0;i<7;i++){const q=clamp((p-i*.035)/.8);if(q>0&&q<1)tile(73,700+Math.sin(i*2.4)*q*105,300-Math.sin(q*Math.PI)*100+q*20,22,1-q*.6);} burst(716, 316, clamp((p - .2) / .8), '#f2d17b', 30); if (p > .3) text(`+${e.gain} GOLD`, 716, 269 - p * 25, '#f7d78b', 27); }
      if (e.type === 'shrine' || e.type === 'heal') { if(!reduced){ring(hx,hy+43,p,'#78c82b');ring(hx,hy+43,clamp(p-.2),'#9be28a');} glow(hx, hy, 100, '#b1eaa544'); burst(hx, hy, p, '#bde8a2'); text(`+${e.heal} HP`, hx, hy - 36 - p * 45, '#bfe9a5', 28); }
      if (e.type === 'shop') { if(!reduced) burst(716,290,p,'#f2cd6e'); }
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
  let knightFailed = false;
  knight.onerror = () => { knightFailed = true; };
  let rangerFailed = false;
  ranger.onerror = () => { rangerFailed = true; };
  let wizardFailed = false;
  wizard.onerror = () => { wizardFailed = true; };
  frame = requestAnimationFrame(draw);
  return {
    async play(event) {
      // Audio unlock can remain pending in a hidden tab; never block combat.
      if(audio.settings.effects || audio.settings.music) {
        await Promise.race([audio.unlock().catch(() => false), new Promise(resolve => setTimeout(resolve, 200))]);
      }
      audio.effect({ ...event, enemyKobold: enemyForRoom(room(getState()))?.kobold, dragonBreath: enemyForRoom(room(getState()))?.breath, reducedMotion: reduced });
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
