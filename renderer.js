import { room, types, heroes, items, rng } from './engine.js';

export function createRenderer(canvas, getState) {
  const ctx = canvas.getContext('2d');
  const atlas = new Image();
  atlas.src = 'assets/dungeon.png';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let effect = null, frame, imageFailed = false;
  const clamp = n => Math.max(0, Math.min(1, n));

  function tile(n, x, y, size = 48, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, n % 12 * 16, Math.floor(n / 12) * 16, 16, 16, Math.round(x), Math.round(y), size, size);
    ctx.restore();
  }
  function glow(x, y, size, color) {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, size);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  function text(value, x, y, color = '#d9e6b6', size = 23) {
    ctx.font = `${size}px VT323, monospace`; ctx.textAlign = 'center';
    ctx.fillStyle = '#0b1715'; ctx.fillText(value, x + 2, y + 2);
    ctx.fillStyle = color; ctx.fillText(value, x, y);
  }
  function burst(x, y, p, color, count = 20) {
    if (p < 0 || p > 1) return;
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399, radius = (30 + i % 5 * 12) * p;
      ctx.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius + p * p * 30), 3 + i % 3, 3 + i % 3);
    }
    ctx.restore();
  }
  function draw(now) {
    frame = requestAnimationFrame(draw);
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
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (e?.type === 'hurt' && !reduced && p > .36 && p < .75) ctx.translate(Math.sin(p * 120) * 5, Math.cos(p * 90) * 2);
    ctx.fillStyle = '#101c1c'; ctx.fillRect(0, 0, 960, 480);

    for (let y = 3; y < 10; y++) for (let x = 1; x < 19; x++) tile([48, 48, 49, 50, 51][Math.floor(random() * 5)], x * 48, y * 48);
    ctx.fillStyle = ['#172d2ae0', '#22372be0', '#282239e0'][biome]; ctx.fillRect(48, 144, 864, 336);
    // Staggered wall and inset doorways are assembled from the original tile atlas.
    for (let x = 0; x < 20; x++) { tile(14, x * 48, 48); tile(14, x * 48, 96); tile(14, x * 48, 144); tile(26, x * 48, 192); }
    for (let y = 0; y < 10; y++) { tile(y < 4 ? 14 : 40, 0, y * 48); tile(y < 4 ? 14 : 40, 912, y * 48); }
    ctx.fillStyle = '#101d2455'; ctx.fillRect(0, 0, 960, 240);
    [240, 456, 672].forEach((x, i) => {
      tile(9, x, 144); tile(s.phase === 'doors' || e?.type === 'walk' ? 21 : 45, x, 192);
      if (s.phase === 'doors' || e?.type === 'walk') { glow(x + 24, 229, 95, '#cee6a42b'); text(String(i + 1), x + 24, 170, '#e5dda8', 18); }
    });
    [120, 792].forEach(x => { tile(29, x, 182); glow(x + 24, 200, 130, `rgba(245,168,66,${.22 + Math.sin(time * 5 + x) * .025})`); });
    [96, 816].forEach(x => { tile(biome === 2 ? 20 : 19, x, 96); tile(28, x, 144); });
    tile(82, 75, 327); tile(81, 831, 315);
    // Different biomes add columns, mossy idols, cracks, and ritual tiles.
    for (let i = 0; i < 8; i++) { const x = 110 + random() * 700, y = 255 + random() * 155; if (Math.abs(x - 265) > 80 && Math.abs(x - 718) > 65) tile(biome === 1 ? 24 : 12, x, y, 32, .3); }
    if (biome > 0) { tile(biome === 1 ? 20 : 56, 144, 270, 48, .8); tile(biome === 1 ? 20 : 56, 770, 270, 48, .8); }
    if (rm.type === 'spell' || rm.type === 'boss') { ctx.strokeStyle = '#a797d54d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(720, 363, 85, 27, 0, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) tile(61, 655 + i * 22, 360 + Math.sin(i) * 6, 16, .45); }

    let hx = 258, hy = 325, ex = 716, ey = 285;
    if (e?.type === 'enter' && !reduced) { hx -= (1 - p) * 100; hy += (1 - p) * 90; }
    if (e?.type === 'walk' && !reduced) { const ease = p * p * (3 - 2 * p); hx += ([264, 480, 696][e.lane] - hx) * ease; hy += (216 - hy) * ease; }
    const magical = e?.kind === 'grammar' || s.hero === 'arcanist';
    if (e?.type === 'attack' && !magical && !reduced) hx += Math.sin(clamp(p / .75) * Math.PI) * 335;
    if (e?.type === 'hurt' && combat && !reduced) ex -= Math.sin(clamp(p / .8) * Math.PI) * 310;
    if (e?.type === 'attack' && p > .4 && p < .75 && !reduced) ex += Math.sin(p * 95) * 5;
    const bob = Math.round(Math.sin(time * 3) * 2);
    ctx.fillStyle = '#07121499';
    for (const [x, y, width] of [[hx, hy + 45, 33], [ex, ey + 62, rm.type === 'boss' ? 47 : 32]]) { ctx.beginPath(); ctx.ellipse(x, y, width, 10, 0, 0, Math.PI * 2); ctx.fill(); }

    // Hero and equipped items remain visible, including during attack movement.
    const heroAlpha = s.phase === 'lost' ? .45 : e?.type === 'hurt' && p > .38 && p < .75 && Math.floor(p * 35) % 2 ? .35 : 1;
    tile(hero.tile, hx - 36, hy - 24 + bob, 72, heroAlpha);
    tile(s.equipment.weapon ? items[s.equipment.weapon].tile : hero.weapon, hx + 25, hy - 7 + bob, 40, heroAlpha);
    if (s.equipment.armor) tile(items[s.equipment.armor].tile, hx - 43, hy + 4 + bob, 28);
    if (s.equipment.charm) { tile(items[s.equipment.charm].tile, hx - 12, hy - 50 + bob, 21); glow(hx, hy - 35, 40, '#bad79e22'); }
    if (!e || ['enter', 'heal', 'equip'].includes(e.type)) text(hero.name.replace('The ', '').toUpperCase(), hx, hy + 74, hero.color, 17);

    const targetTile = rm.type === 'battle' ? [108, 124, 122][rm.variant] : types[rm.type].tile;
    const dying = e?.type === 'attack' && e.cleared;
    const showEnemy = combat && (s.enemyHp > 0 || (dying && p < .9));
    if (showEnemy) {
      const alpha = dying ? 1 - clamp((p - .5) * 2.5) : 1;
      const size = rm.type === 'boss' ? 112 : 80;
      if (rm.type === 'boss') glow(ex, ey + 40, 110, s.enemyHp < s.enemyMax / 2 ? '#e97f5033' : '#ae86e22b');
      tile(targetTile, ex - size / 2, ey - 12 - bob, size, alpha);
      if (rm.type === 'boss' && s.enemyHp < s.enemyMax / 2) { ctx.strokeStyle = '#f5c798'; ctx.beginPath(); ctx.moveTo(ex - 10, ey + 5); ctx.lineTo(ex + 2, ey + 28); ctx.lineTo(ex - 9, ey + 42); ctx.stroke(); }
    }
    if (!combat) {
      const resolved = s.enemyHp === 0 && (!e || p > .5);
      if (rm.type === 'treasure') { tile(resolved && s.feedback?.correct ? 91 : 89, ex - 40, ey + 5, 80); if (resolved && s.feedback?.correct) glow(ex, ey + 20, 100, '#fbd46d55'); }
      if (rm.type === 'shrine') { tile(32, ex - 40, ey, 80); glow(ex, ey + 20, 90, resolved && s.feedback?.correct ? '#96f6c766' : '#88c6bb22'); }
      if (rm.type === 'trap') { tile(resolved && s.feedback?.correct ? 31 : 41, ex - 40, ey + 22, 80); if (!resolved) tile(61, ex - 20, ey - 7 + bob, 40, .7); }
    }
    if (combat && s.enemyHp === 0 && (!e || p > .85)) tile(24, 690, 337, 48, .7);

    if (s.loot && s.phase === 'feedback' && s.equipment[items[s.loot].slot] !== s.loot && (!e || p > .78)) {
      glow(716, 352, 78, '#edd26a39');
      ctx.fillStyle = '#e0c26b20'; ctx.fillRect(709, 247, 14, 110);
      tile(items[s.loot].tile, 696, 313 + bob, 40);
      text('LOOT', 716, 390, '#edce84', 18);
    }

    if (e) {
      if (e.type === 'attack') {
        if (magical && p < .57) {
          const travel = clamp(p / .55), x = 290 + travel * 418, y = 321 - Math.sin(travel * Math.PI) * 54;
          glow(x, y, 45, '#cea5ff88'); tile(61, x - 14, y - 14, 28); ctx.fillStyle = '#d1a7ee'; for (let i = 0; i < 5; i++) ctx.fillRect(x - i * 10, y + Math.sin(i) * 3, 5, 5);
        }
        if (!magical && p > .35 && p < .65) { ctx.strokeStyle = '#e9eac4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(715, 308, 49, -1.2, 1.6); ctx.stroke(); }
        burst(716, 310, (p - .42) / .58, magical ? '#c4a1f0' : '#edce8b');
        if (p > .43) text(`−${e.dealt}`, 716, 277 - (p - .43) * 65, '#f4cd90', 34);
      }
      if (e.type === 'hurt') {
        burst(258, 330, (p - .4) / .6, '#e98a73');
        if (p > .4) text(e.damage ? `−${e.damage}` : 'BLOCKED', 258, 292 - p * 30, '#f69e88', 32);
        if (e.encounter === 'trap' && p > .15 && p < .7) for (let i = 0; i < 4; i++) tile(41, 186 + i * 38, 352 - Math.sin(p * Math.PI) * 25, 38);
      }
      if (e.type === 'treasure') { burst(716, 316, clamp((p - .2) / .8), '#f2d17b', 30); if (p > .3) text(`+${e.gain} GOLD`, 716, 269 - p * 25, '#f7d78b', 27); }
      if (e.type === 'shrine' || e.type === 'heal') { glow(hx, hy, 100, '#b1eaa544'); burst(hx, hy, p, '#bde8a2'); text(`+${e.heal} HP`, hx, hy - 36 - p * 45, '#bfe9a5', 28); }
      if (e.type === 'trap') { burst(716, 330, p, '#a7d1ac'); text('DISARMED', 716, 277 - p * 30, '#b9dbaa', 26); }
      if (e.type === 'equip') { glow(hx, hy, 100, '#f0d69a44'); burst(hx, hy, p, '#dccaa0'); }
    }
    const particleRng = rng(s.seed + 'motes');
    for (let i = 0; i < 18; i++) { const x = 90 + particleRng() * 780, y = 230 + particleRng() * 210; ctx.globalAlpha = .12 + Math.sin(time + i) ** 2 * .2; ctx.fillStyle = biome === 2 ? '#bba5e5' : '#d6d7a1'; ctx.fillRect(x, y - Math.sin(time * .4 + i) * 8, 2, 2); }
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(480, 270, 155, 480, 270, 560); vignette.addColorStop(0, '#08131500'); vignette.addColorStop(1, '#071218b0'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 960, 480);
    if (e?.type === 'walk' && p > .65) { ctx.fillStyle = `rgba(9,18,15,${(p - .65) / .35})`; ctx.fillRect(0, 0, 960, 480); }
    if (e?.type === 'enter' && p < .25) { ctx.fillStyle = `rgba(9,18,15,${1 - p * 4})`; ctx.fillRect(0, 0, 960, 480); }
    ctx.restore();
    if (effect && elapsed >= 1) { const done = effect.resolve; effect = null; done(); }
  }
  atlas.onerror = () => { imageFailed = true; };
  frame = requestAnimationFrame(draw);
  return {
    play(event) {
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
