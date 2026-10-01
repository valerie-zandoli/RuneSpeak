import { monsterFrames } from './assets/monsters/frames.js';

const clamp = n => Math.max(0, Math.min(1, n));

// Events describe the hero: hurt is an enemy strike, attack is an enemy reaction.
export function monsterPose(event, progress, reduced = false, impact = .42) {
  if (!event) return 0;
  if (reduced) return event.type === 'hurt' ? 2 : event.type === 'attack' ? (event.cleared ? 5 : 4) : 0;
  if (event.type === 'hurt') {
    if (progress < .10 || progress >= .86) return 0;
    return progress < .22 ? 1 : progress < .50 ? 2 : 3;
  }
  if (event.type === 'attack') {
    if (event.cleared && progress >= Math.max(.62, impact + .12)) return 5;
    return progress >= impact && progress < .78 ? 4 : 0;
  }
  return 0;
}

export function monsterMotion(model, event, progress, time = 0, reduced = false) {
  if (reduced) return { dx: 0, bob: 0 };
  let dx = 0;
  if (event?.type === 'hurt') {
    // All nine families strike or bite at close range; hold contact through impact.
    const lunge = progress < .38 ? clamp((progress - .16) / .22) : 1 - clamp((progress - .46) / .36);
    dx = lunge ? -350 * lunge : 0;
  }
  const flying = Boolean(monsterFrames[model]?.hover);
  return { dx, bob: event ? 0 : Math.sin(time * (flying ? 2.6 : 2.2)) * (flying ? 3 : 1.2) };
}

export function drawMonster(ctx, image, { model, pose = 0, x, feet, alpha = 1, bob = 0 }) {
  const sheet = monsterFrames[model];
  if (!sheet) return;
  const frame = sheet.frames[pose] || sheet.frames[0];
  const [sx, sy, sw, sh] = frame.rect, [ax, ay] = frame.anchor;
  const scale = sheet.height / sheet.idleHeight;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(x, feet + bob - (pose === 5 ? 0 : sheet.hover));
  ctx.drawImage(image, sx, sy, sw, sh, -ax * scale, -ay * scale, sw * scale, sh * scale);
  ctx.restore();
}
