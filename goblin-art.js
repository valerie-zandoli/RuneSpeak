// Approved single-pose cutouts. Motion is renderer feedback, not extra artwork.
export const goblinFrames = {
  skirmisher: { anchor: [680, 1208], top: 64, flip: false },
  shaman: { anchor: [740, 1210], top: 39, flip: true },
  fighter: { anchor: [690, 1207], top: 45, flip: false },
};
export const goblinHeight = 116;
const clamp = n => Math.max(0, Math.min(1, n));
export function goblinSheet(model) {
  return Object.hasOwn(goblinFrames, model) ? 'assets/goblins/' + model + '.png' : null;
}
export function goblinMotion(model, event, progress, reduced = false) {
  if (reduced) return { dx: 0, tilt: 0 };
  const attack = event?.type === 'hurt' ? Math.sin(clamp((progress - .1) / .7) * Math.PI) : 0;
  const recoil = event?.type === 'attack' ? Math.sin(clamp((progress - .4) / .4) * Math.PI) : 0;
  return { dx: model === 'shaman' ? recoil * 10 : -attack * 300 + recoil * 10,
    tilt: -attack * .05 + recoil * .06 };
}
export function drawGoblin(ctx, image, { model, x, feet, alpha = 1, tilt = 0, collapse = 0 }) {
  const frame = goblinFrames[model];
  if (!frame) return;
  const scale = goblinHeight / (frame.anchor[1] - frame.top);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, feet);
  ctx.rotate(tilt + collapse * .45); ctx.scale(frame.flip ? -1 : 1, 1 - collapse * .3);
  ctx.drawImage(image, 0, 0, 1254, 1254, -frame.anchor[0] * scale,
    -frame.anchor[1] * scale, 1254 * scale, 1254 * scale);
  ctx.restore();
}
export function goblinProjectile(model, event, progress, reduced = false) {
  if (reduced || model !== 'shaman' || event?.type !== 'hurt' || progress < .18 || progress >= .4) return null;
  const frame = goblinFrames.shaman, scale = goblinHeight / (frame.anchor[1] - frame.top);
  const origin = { x: 716 + (frame.anchor[0] - 174) * scale, y: 347 + (141 - frame.anchor[1]) * scale };
  const t = (progress - .18) / .22;
  return { x: origin.x + (258 - origin.x) * t, y: origin.y + (330 - origin.y) * t };
}
