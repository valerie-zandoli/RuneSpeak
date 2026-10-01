import { drawWeaponGlow } from './weapon-effects.js';
export function rangerPose(event, progress, time, phase, reduced = false) {
  if (phase === 'won') return 5;
  if (reduced || !event) return 0;
  if (['walk', 'enter'].includes(event.type)) return Math.floor(time * 7) % 2;
  if (event.type === 'hurt') return progress > .16 && progress < .86 ? 4 : 0;
  if (event.type === 'attack') return progress < .12 || progress > .85 ? 0 : progress < .34 ? 2 : 3;
  if (['treasure', 'heal', 'shrine', 'equip'].includes(event.type) && progress > .22 && progress < .85) return 5;
  return 0;
}

export function drawRanger(ctx, image, { x, feet, pose, alpha, tilt, squash, hop = 0, weaponGlow = 0, weaponTime = 0, reduced = false }) {
  const baseline = [496, 496, 496, 486, 480, 488][pose];
  const scale = 146 / 512;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, feet - hop);
  ctx.rotate(tilt);
  ctx.scale(1 / squash, squash);
  drawWeaponGlow(ctx, 'ranger', pose, 256, baseline, scale, weaponGlow, weaponTime, reduced);
  ctx.drawImage(image, pose % 3 * 512, Math.floor(pose / 3) * 512, 512, 512,
    -73, -baseline * scale, 146, 146);
  ctx.restore();
}
