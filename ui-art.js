// Crop pose sheets explicitly; shared illustration styles allow SVG overflow.
export function wizardArt(mood = 'happy', portrait = false) {
  return `<svg class="rune-guide ${mood}" style="overflow:hidden" viewBox="${portrait ? '170 70 260 260' : '0 0 512 512'}" aria-hidden="true"><image href="assets/wizard-poses.png" width="1536" height="1024"/></svg>`;
}
export function adventureHeroes() {
  return `<div class="adventure-party" aria-hidden="true">${portalArt()}<svg class="adventure-hero party-knight" viewBox="0 0 512 512" style="overflow:hidden"><image href="assets/knight-poses.png" width="1536" height="1024"/></svg><svg class="adventure-hero party-ranger" viewBox="0 0 512 512" style="overflow:hidden"><image href="assets/ranger-poses.png" width="1536" height="1024"/></svg></div>`;
}
export function portalArt() {
  return `<svg class="portal-art" viewBox="0 0 280 145" aria-hidden="true"><rect x="24" y="123" width="233" height="11" rx="5.5" fill="#e1d2f1"/><rect x="85" y="13" width="115" height="116" rx="48" fill="#b398d4"/><path d="M99 129V68a43 43 0 0 1 86 0v61" fill="#493362"/><path d="M113 129V72a29 29 0 0 1 58 0v57" fill="#65458b"/><path d="M125 129V74a17 17 0 0 1 34 0v55" fill="#9069cd"/><rect x="72" y="113" width="139" height="16" rx="6" fill="#c9b2e4"/><rect x="64" y="128" width="155" height="9" rx="4" fill="#b398d4"/><rect x="47" y="67" width="11" height="37" rx="5" fill="#b398d4"/><path d="M52 39Q33 66 52 77Q72 67 52 39" fill="#ffc800"/><path d="M52 54Q43 68 52 72Q63 66 52 54" fill="#ffedac"/><rect x="225" y="67" width="11" height="37" rx="5" fill="#b398d4"/><path d="M230 39Q211 66 230 77Q250 67 230 39" fill="#ffc800"/><path d="m142 40 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#ffdf69"/><path d="m20 28 3 6 6 3-6 3-3 6-3-6-6-3 6-3Zm230-11 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#c3a7e5"/></svg>`;
}
export function treasureArt() {
  return `<svg class="treasure-art" viewBox="0 0 110 90" aria-hidden="true"><rect x="10" y="80" width="90" height="7" rx="3.5" fill="#ffe7a3"/><rect x="15" y="23" width="80" height="58" rx="13" fill="#ffb020"/><path d="M15 50h80v18q0 13-13 13H28q-13 0-13-13Z" fill="#ed9315"/><rect x="24" y="30" width="12" height="44" rx="5" fill="#ffdf69"/><rect x="74" y="30" width="12" height="44" rx="5" fill="#ffdf69"/><rect x="11" y="43" width="88" height="13" rx="5" fill="#ffcf46"/><rect x="44" y="43" width="23" height="26" rx="6" fill="#fff1ac"/><circle cx="56" cy="53" r="4" fill="#ed9315"/><rect x="54" y="53" width="4" height="9" rx="2" fill="#ed9315"/><path d="m56 1 3 7 7 3-7 3-3 7-3-7-7-3 7-3" fill="#ffc800"/></svg>`;
}
