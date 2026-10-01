import { cyclopsFrames } from './assets/cyclops/frames.js';

const clamp = n => Math.max(0, Math.min(1, n));

// Combat event names describe the hero: "hurt" means the enemy retaliates.
export function cyclopsPose(event, progress, time = 0, reduced = false) {
  if (reduced) return event?.type === 'attack' && event.cleared ? 5 : 0;
  if (!event) return 0;
  if (event.type === 'enter') return progress < .7 ? Math.floor(time * 7) % 2 : 0;
  if (event.type === 'hurt') return progress < .12 || progress >= .84 ? 0 : progress < .33 ? 2 : progress < .64 ? 3 : 1;
  if (event.type === 'attack') {
    if (event.cleared && progress >= .62) return 5;
    return progress >= .4 && progress < .8 ? 4 : 0;
  }
  return 0;
}

export function cyclopsMotion(model, event, progress, time = 0, reduced = false) {
  if (reduced) return { dx: 0, tilt: 0, squash: 1 };
  const attacking = event?.type === 'hurt';
  const swing = attacking ? Math.sin(clamp((progress - .12) / .7) * Math.PI) : 0;
  const recoil = event?.type === 'attack' ? Math.sin(clamp((progress - .4) / .4) * Math.PI) : 0;
  return {
    dx: model === 'rockthrower' ? swing * 10 + recoil * 12 : -swing * (model === 'ironhide' ? 275 : 300) + recoil * 12,
    tilt: swing * (model === 'ironhide' ? -.07 : -.04) + recoil * .07,
    squash: 1 + Math.sin(time * 2.3) * .009 - swing * (model === 'ironhide' ? .035 : .012),
  };
}

export function cyclopsProjectile(model, event, progress, reduced = false) {
  if (reduced || model !== 'rockthrower' || event?.type !== 'hurt' || progress < .33 || progress >= .52) return null;
  const p = (progress - .33) / .19;
  return { x: 676 + (282 - 676) * p, y: 228 + p * 90 - Math.sin(p * Math.PI) * 44, rotation: -p * 6 };
}

export function drawCyclops(ctx, image, { model, palette = 'teal', x, feet, pose = 0, alpha = 1, tilt = 0, squash = 1 }) {
  const sheet = cyclopsFrames[model + '-' + palette];
  if (!sheet) return;
  const frame = sheet.frames[pose] || sheet.frames[0];
  const [sx, sy, sw, sh] = frame.rect, [anchorX, anchorY] = frame.anchor;
  const scale = 162 / sheet.idleHeight;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(x, feet); ctx.rotate(tilt); ctx.scale(1 / squash, squash);
  // Two Ironhide silhouettes share horizontal padding at different heights.
  // Clip only the neighboring pose's area, preserving the full club and feet.
  if (frame.exclude) {
    const [cx, cy, cw, ch] = frame.exclude;
    ctx.beginPath(); ctx.rect((sx - anchorX) * scale, (sy - anchorY) * scale, sw * scale, sh * scale);
    ctx.rect((cx - anchorX) * scale, (cy - anchorY) * scale, cw * scale, ch * scale); ctx.clip('evenodd');
  }
  ctx.drawImage(image, sx, sy, sw, sh, (sx - anchorX) * scale, (sy - anchorY) * scale, sw * scale, sh * scale);
  ctx.restore();
}

export function drawCyclopsStone(ctx, projectile) {
  if (!projectile) return;
  ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(projectile.rotation);
  ctx.fillStyle = '#6b6d76'; ctx.beginPath();
  ctx.moveTo(-13, -7); ctx.lineTo(-4, -14); ctx.lineTo(10, -9); ctx.lineTo(14, 4); ctx.lineTo(3, 12); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#92959e'; ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(-4, -14); ctx.lineTo(10, -9); ctx.lineTo(0, 1); ctx.closePath(); ctx.fill();
  ctx.restore();
}
