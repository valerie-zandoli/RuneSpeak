import { dragonFrames } from './assets/dragons/frames.js';

const clamp = n => Math.max(0, Math.min(1, n));
export const breathColors = {
  fire: ['#e94d20', '#ff9a22', '#fff0a0'],
  'blue-fire': ['#2464ed', '#31bbff', '#d6ffff'],
  acid: ['#568b16', '#a1dc28', '#e1ff8b'],
};
export function dragonSheet(model) { return dragonFrames[model] ? `assets/dragons/${model}-poses.png` : null; }
// Events describe the hero: hurt is the dragon's retaliation.
export function dragonPose(event, p, reduced = false) {
  if (event?.type === 'attack' && event.cleared && (reduced || p >= .62)) return 5;
  if (event?.type === 'hurt') {
    if (reduced) return 2;
    return p < .08 || p >= .9 ? 0 : p < .3 ? 1 : p < .7 ? 2 : 3;
  }
  if (event?.type === 'attack' && p >= .4 && p < .8) return 4;
  return 0;
}
export function dragonMouth(model, x, feet, pose = 2) {
  const sheet = dragonFrames[model];
  if (!sheet) return null;
  const frame = sheet.frames[pose] || sheet.frames[0], scale = 222 / sheet.height;
  return { x: x + (frame.mouth[0] - frame.anchor[0]) * scale,
    y: feet + (frame.mouth[1] - frame.anchor[1]) * scale };
}
export function drawDragon(ctx, image, { model, x, feet, pose = 0, alpha = 1, time = 0, reduced = false }) {
  const sheet = dragonFrames[model];
  if (!sheet) return;
  const frame = sheet.frames[pose] || sheet.frames[0], scale = 222 / sheet.height;
  const [sx, sy, sw, sh] = frame.rect, [ax, ay] = frame.anchor;
  // No transform during breath: the measured mouth and effect origin remain locked.
  const bob = !reduced && pose === 0 ? Math.sin(time * 2) * 1.2 : 0;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sw, sh, x + (sx - ax) * scale,
    feet + (sy - ay) * scale + bob, sw * scale, sh * scale);
  ctx.restore();
}
export function dragonBreath(kind, event, p, origin, target, reduced = false) {
  if (!breathColors[kind] || !origin || event?.type !== 'hurt') return null;
  if (!reduced && (p < .3 || p >= .7)) return null;
  const reach = reduced ? 1 : clamp((p - .3) / .1);
  return { kind, origin, target, end: { x: origin.x + (target.x - origin.x) * reach,
    y: origin.y + (target.y - origin.y) * reach }, colors: breathColors[kind],
    progress: reduced ? .5 : (p - .3) / .4, reduced, alpha: reduced ? .7 : Math.min(1, (.7 - p) / .08) };
}
export function drawDragonBreath(ctx, breath) {
  if (!breath) return;
  const { origin, end, colors, progress, reduced, kind, alpha } = breath;
  const dx = end.x - origin.x, dy = end.y - origin.y, len = Math.hypot(dx, dy);
  if (len < 1) return;
  ctx.save(); ctx.translate(origin.x, origin.y); ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = alpha;
  if (kind === 'acid') {
    // A narrow liquid jet and round droplets distinguish acid from both flames.
    ctx.lineCap = 'round';
    for (const [i, width] of [13, 7, 2].entries()) {
      ctx.strokeStyle = colors[i]; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .55, -6, len, 0); ctx.stroke();
    }
    if (!reduced) for (let i = 0; i < 9; i++) {
      const t = ((i / 9 + progress * 1.5) % 1), x = len * t;
      ctx.fillStyle = colors[i % 2]; ctx.beginPath();
      ctx.ellipse(x, Math.sin(i * 2.4) * t * 15, 3 + t * 4, 2 + t * 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    for (let layer = 0; layer < 3; layer++) {
      const width = [30, 21, 10][layer]; ctx.fillStyle = colors[layer];
      ctx.beginPath(); ctx.moveTo(0, -3 + layer);
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, ripple = reduced ? 0 : Math.sin(i * 2.1 - progress * 30) * 5 * t;
        ctx.lineTo(len * t, -width * t + ripple);
      }
      for (let i = 12; i >= 1; i--) {
        const t = i / 12, ripple = reduced ? 0 : Math.cos(i * 2.1 - progress * 30) * 5 * t;
        ctx.lineTo(len * t, width * t + ripple);
      }
      ctx.lineTo(0, 3 - layer); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
