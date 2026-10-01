import { drawWeaponGlow } from './weapon-effects.js';
// Measured crops preserve the full sword in the strike and salute poses.
export const knightFrames = [
  { rect: [0, 0, 512, 512], anchor: [260, 505] },
  { rect: [512, 0, 512, 512], anchor: [260, 504] },
  { rect: [1024, 0, 512, 503], anchor: [260, 501] },
  { rect: [0, 512, 590, 512], anchor: [240, 481] },
  { rect: [590, 512, 434, 512], anchor: [190, 479] },
  { rect: [1024, 503, 512, 521], anchor: [280, 493] },
];
export function knightPose(event, progress, time, phase, reduced = false) {
  if (phase === 'won') return 5;
  if (!event || phase === 'lost') return phase === 'lost' ? 4 : 0;
  if (event.type === 'walk' || event.type === 'enter') return reduced ? 0 : Math.floor(time * 7) % 2;
  if (event.type === 'hurt') return progress > .16 && progress < .86 ? 4 : 0;
  if (event.type === 'attack') {
    if (progress <= .18 || progress >= .78) return 0;
    if (reduced) return event.kind === 'grammar' ? 5 : 3;
    if (progress < .38) return 2;
    if (progress < .64) return event.kind === 'grammar' ? 5 : 3;
    return 4;
  }
  if (['treasure', 'shrine', 'heal', 'equip'].includes(event.type) && progress > .22 && progress < .85) return 5;
  return 0;
}
export function drawKnight(ctx, image, { x, feet, pose, alpha, tilt, squash, hop = 0, weaponGlow = 0, weaponTime = 0, reduced = false }) {
  const { rect: [sx, sy, sw, sh], anchor: [ax, ay] } = knightFrames[pose] || knightFrames[0];
  const scale = 146 / 512;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(x, feet - hop); ctx.rotate(tilt); ctx.scale(1 / squash, squash);
  drawWeaponGlow(ctx, 'knight', pose, ax, ay, scale, weaponGlow, weaponTime, reduced);
  ctx.drawImage(image, sx, sy, sw, sh, -ax * scale, -ay * scale, sw * scale, sh * scale);
  ctx.restore();
}
