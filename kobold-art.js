import { koboldFrames } from './assets/kobolds/frames.js';

const clamp = n => Math.max(0, Math.min(1, n));
export const koboldSheet = model => Object.hasOwn(koboldFrames, model) ? `assets/kobolds/${model}-poses.png` : null;

// Game events describe the hero: hurt means the enemy attacks.
export function koboldPose(event, progress, reduced = false) {
  if (!event) return 0;
  if (reduced) return event.type === 'hurt' ? 2 : event.type === 'attack' ? (event.cleared ? 5 : 4) : 0;
  if (event.type === 'hurt') {
    if (progress < .10 || progress >= .86) return 0;
    return progress < .22 ? 1 : progress < .50 ? 2 : 3;
  }
  if (event.type === 'attack') {
    if (event.cleared && progress >= .62) return 5;
    return progress >= .40 && progress < .78 ? 4 : 0;
  }
  return 0;
}

export function koboldMotion(model, event, progress, time = 0, reduced = false) {
  if (reduced) return { dx: 0, bob: 0 };
  let dx = 0;
  if (event?.type === 'hurt' && model !== 'shaman') {
    // Hold contact near the hero's existing .4 impact, then retreat.
    const lunge = progress < .38 ? clamp((progress - .16) / .22) : 1 - clamp((progress - .46) / .36);
    dx = lunge ? -350 * lunge : 0;
  }
  if (event?.type === 'attack') dx = Math.sin(clamp((progress - .4) / .38) * Math.PI) * 9;
  return { dx, bob: event ? 0 : Math.sin(time * 2.2) * 1.2 };
}

export function drawKobold(ctx, image, { model, pose = 0, x, feet, alpha = 1, bob = 0 }) {
  const sheet = koboldFrames[model];
  if (!sheet) return;
  const frame = sheet.frames[pose] || sheet.frames[0];
  const [sx, sy, sw, sh] = frame.rect, [ax, ay] = frame.anchor;
  const scale = sheet.height / sheet.idleHeight;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, feet + bob);
  ctx.drawImage(image, sx, sy, sw, sh, (sx - ax) * scale, (sy - ay) * scale, sw * scale, sh * scale);
  ctx.restore();
}

export function koboldProjectile(model, event, progress, reduced = false, x = 716, feet = 347) {
  if (reduced || model !== 'shaman' || event?.type !== 'hurt' || progress < .22 || progress >= .4) return null;
  const sheet = koboldFrames.shaman, frame = sheet.frames[2], scale = sheet.height / sheet.idleHeight;
  const origin = { x: x + (sheet.emission[0] - frame.anchor[0]) * scale,
    y: feet + (sheet.emission[1] - frame.anchor[1]) * scale };
  const t = (progress - .22) / .18;
  return { x: origin.x + (258 - origin.x) * t, y: origin.y + (330 - origin.y) * t };
}
