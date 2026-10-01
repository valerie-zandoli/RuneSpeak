// Measured crops include complete equipment, including poses crossing nominal cells.
export const skeletonFrames = {
  ranger: [
    { rect: [0, 0, 650, 640], anchor: [345, 617] },
    { rect: [650, 0, 604, 640], anchor: [990, 618] },
    { rect: [0, 640, 650, 614], anchor: [386, 1228] },
    { rect: [650, 640, 604, 614], anchor: [965, 1228] },
  ],
  warrior: [
    { rect: [0, 0, 650, 640], anchor: [369, 622] },
    { rect: [650, 0, 604, 640], anchor: [974, 623] },
    { rect: [0, 640, 650, 614], anchor: [443, 1161] },
    { rect: [650, 640, 604, 614], anchor: [990, 1165] },
  ],
  wizard: [
    { rect: [0, 0, 650, 640], anchor: [350, 611] },
    { rect: [650, 0, 604, 640], anchor: [914, 612] },
    { rect: [0, 640, 650, 614], anchor: [451, 1183] },
    { rect: [650, 640, 604, 614], anchor: [980, 1188] },
  ],
};
// Match the heroes' roughly 140px visible height, measured from idle hat to feet.
export const skeletonScale = { ranger: 140 / 561, warrior: 140 / 485, wizard: 140 / 568 };
const clamp = n => Math.max(0, Math.min(1, n));
export function skeletonSheet(model) {
  return Object.hasOwn(skeletonFrames, model) ? 'assets/skeletons/' + model + '-poses.png' : null;
}
export function skeletonPose(event, p) {
  if (event?.type === 'hurt') return p < .18 ? 1 : p < .55 ? 2 : p < .72 ? 1 : 0;
  if (event?.type === 'attack' && p >= .4 && p < (event.cleared ? .9 : .76)) return 3;
  return 0;
}
export function skeletonMotion(model, event, p, reduced = false) {
  if (reduced) return { dx: 0, tilt: 0 };
  const attack = event?.type === 'hurt' && p < .72 ? Math.sin(clamp(p / .72) * Math.PI) : 0;
  const recoil = event?.type === 'attack' ? Math.sin(clamp((p - .4) / .36) * Math.PI) : 0;
  return { dx: (model === 'warrior' ? -300 * attack : 0) + recoil * 8, tilt: recoil * .035 };
}
export function drawSkeleton(ctx, image, { model, x, feet, pose = 0, alpha = 1, tilt = 0, collapse = 0 }) {
  const frame = skeletonFrames[model]?.[pose];
  if (!frame) return;
  const [sx, sy, w, h] = frame.rect, [ax, ay] = frame.anchor, scale = skeletonScale[model];
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, feet);
  ctx.rotate(tilt + collapse * .35); ctx.scale(1, 1 - collapse * .2);
  ctx.drawImage(image, sx, sy, w, h, (sx - ax) * scale, (sy - ay) * scale, w * scale, h * scale);
  ctx.restore();
}
export function skeletonProjectile(model, event, p, reduced = false) {
  if (reduced || !['ranger', 'wizard'].includes(model) || event?.type !== 'hurt' || p < .18 || p >= .4) return null;
  const frame = skeletonFrames[model][2], scale = skeletonScale[model];
  // Visible release-frame bow grip / crystal tip, measured in source pixels.
  const tip = model === 'ranger' ? [121, 881] : [65, 876];
  const x = 716 + (tip[0] - frame.anchor[0]) * scale;
  const y = 347 + (tip[1] - frame.anchor[1]) * scale;
  const t = (p - .18) / .22;
  return { x: x + (258 - x) * t, y: y + (330 - y) * t, kind: model };
}
