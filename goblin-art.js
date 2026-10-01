import { goblinFrames } from './assets/goblins/frames.js';
export { goblinFrames };
export const goblinHeight = 116;
const clamp = n => Math.max(0, Math.min(1, n));

export function goblinSheet(model, pose = 0) {
  const sheet = goblinFrames[model];
  return sheet ? 'assets/goblins/' + (sheet.frames[pose] || sheet.frames[0]).file : null;
}

// Events describe the hero: hurt is the goblin's attack.
export function goblinPose(event, progress, reduced = false, impact = .42) {
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

export function goblinMotion(model, event, progress, reduced = false, time = 0) {
  if (reduced) return { dx: 0, bob: 0 };
  let dx = 0;
  if (event?.type === 'hurt' && model !== 'shaman') {
    const lunge = progress < .38 ? clamp((progress - .16) / .22) : 1 - clamp((progress - .46) / .36);
    dx = lunge ? -350 * lunge : 0;
  }
  return { dx, bob: event ? 0 : Math.sin(time * 2.2) * 1.2 };
}

export function drawGoblin(ctx, image, { model, pose = 0, x, feet, alpha = 1, bob = 0 }) {
  const sheet = goblinFrames[model];
  if (!sheet) return;
  const frame = sheet.frames[pose] || sheet.frames[0];
  const [sx,sy,sw,sh] = frame.rect, [ax,ay] = frame.anchor;
  const scale = goblinHeight / sheet.idleHeight;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, feet + bob);
  ctx.drawImage(image, sx,sy,sw,sh, -ax*scale,-ay*scale,sw*scale,sh*scale);
  ctx.restore();
}

export function goblinProjectile(model, event, progress, reduced = false, x = 716, feet = 347) {
  if (reduced || model !== 'shaman' || event?.type !== 'hurt' || progress < .22 || progress >= .4) return null;
  const sheet = goblinFrames.shaman, frame = sheet.frames[2], scale = goblinHeight / sheet.idleHeight;
  const origin = {x:x+(sheet.emission[0]-frame.anchor[0])*scale, y:feet+(sheet.emission[1]-frame.anchor[1])*scale};
  const t = (progress-.22)/.18;
  return {x:origin.x+(258-origin.x)*t, y:origin.y+(330-origin.y)*t};
}
