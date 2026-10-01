import { slimeFrames } from './assets/slimes/frames.js';

const clamp = n => Math.max(0, Math.min(1, n));
export const slimeFilters = { green: 'none', blue: 'hue-rotate(100deg)', purple: 'hue-rotate(140deg)' };
export const slimeSheet = model => 'assets/slimes/' + (slimeFrames[model] ? model : 'jelly') + '.png';

// Events describe the hero: hurt is an enemy attack; attack is an enemy hit.
export function slimePose(event, progress, reduced = false) {
  if (!event) return 0;
  if (reduced) return event.type === 'attack' ? (event.cleared ? 5 : 4) : event.type === 'hurt' ? 2 : 0;
  if (event.type === 'hurt') {
    if (progress < .12 || progress >= .88) return 0;
    return progress < .32 ? 1 : progress < .58 ? 2 : 3;
  }
  if (event.type === 'attack') {
    if (event.cleared && progress >= .62) return 5;
    return progress >= .4 && progress < .8 ? 4 : 0;
  }
  if (event.type === 'enter' && progress < .6) return 3;
  return 0;
}

export function slimeMotion(event, progress, time = 0, reduced = false) {
  if (reduced) return { dx: 0, hop: 0, squash: 1 };
  const lunge = event?.type === 'hurt' ? Math.sin(clamp((progress - .25) / .55) * Math.PI) : 0;
  const recoil = event?.type === 'attack' ? Math.sin(clamp((progress - .4) / .4) * Math.PI) : 0;
  return { dx: -lunge * 350 + recoil * 12, hop: lunge * 18, squash: 1 + Math.sin(time * 2.4) * .018 };
}

export function drawSlime(ctx, image, { model = 'jelly', palette = 'green', pose = 0, x, feet, alpha = 1, hop = 0, squash = 1 }) {
  const sheet = slimeFrames[model] || slimeFrames.jelly;
  const frame = sheet.frames[pose] || sheet.frames[0];
  const [sx, sy, sw, sh] = frame.rect, [ax, ay] = frame.anchor;
  const scale = sheet.displayWidth / sheet.idleWidth;
  ctx.save(); ctx.globalAlpha = alpha;
  // Every palette uses the same pixels, alpha, pose rectangles and anchors.
  ctx.filter = slimeFilters[palette] || 'none';
  ctx.translate(x, feet - hop); ctx.scale(1 / squash, squash);
  ctx.drawImage(image, sx, sy, sw, sh, (sx - ax) * scale, (sy - ay) * scale, sw * scale, sh * scale);
  ctx.restore();
}
