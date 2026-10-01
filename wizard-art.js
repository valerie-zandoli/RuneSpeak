import { drawWeaponGlow } from './weapon-effects.js';
export function wizardPose(event, progress, time, phase, reduced = false) {
  if (phase === 'won') return 5;
  if (reduced || !event) return 0;
  if (['walk', 'enter'].includes(event.type)) return Math.floor(time * 7) % 2;
  if (event.type === 'hurt') return progress > .16 && progress < .86 ? 4 : 0;
  if (event.type === 'attack') return progress < .1 || progress > .85 ? 0 : progress < .3 ? 2 : 3;
  if (['treasure', 'heal', 'shrine', 'equip'].includes(event.type) && progress > .22 && progress < .85) return 5;
  return 0;
}

export function drawWizard(ctx, image, { x, feet, pose, alpha, tilt, squash, hop = 0, weaponGlow = 0, weaponTime = 0, reduced = false }) {
  const scale = 146 / 512;
  const baseline = [506, 506, 504, 482, 480, 488][pose];
  // The casting staff extends into empty padding beside its cell; include its whole crystal.
  const width = pose === 3 ? 552 : 512;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(x, feet - hop); ctx.rotate(tilt); ctx.scale(1 / squash, squash);
  drawWeaponGlow(ctx, 'wizard', pose, 256, baseline, scale, weaponGlow, weaponTime, reduced);
  ctx.drawImage(image, pose % 3 * 512, Math.floor(pose / 3) * 512, width, 512,
    -73, -baseline * scale, width * scale, 146);
  ctx.restore();
}
