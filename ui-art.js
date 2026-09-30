// Original RuneSpeak vector artwork. The dungeon retains its Kenney pixel art.
export function wizardArt(mood = 'happy') {
  return `<svg class="rune-guide ${mood}" viewBox="0 0 180 190" aria-hidden="true">
    <rect x="39" y="176" width="105" height="9" rx="4.5" fill="#e9dff6"/>
    <g class="guide-body">
      <path d="M56 112Q90 94 121 116L135 163Q139 174 124 174H53Q39 174 44 162Z" fill="#9069cd"/>
      <path d="M91 119L105 174H125Q139 174 135 163L121 116Z" fill="#7851b0"/>
      <rect x="48" y="166" width="32" height="13" rx="6" fill="#493362"/><rect x="103" y="166" width="32" height="13" rx="6" fill="#493362"/>
      <path d="M58 122L38 139" stroke="#9069cd" stroke-width="22" stroke-linecap="round"/>
      <path d="M121 122L144 106" stroke="#9069cd" stroke-width="22" stroke-linecap="round"/>
      <circle cx="146" cy="105" r="11" fill="#ffcf9d"/>
      <rect x="55" y="56" width="72" height="68" rx="29" fill="#ffcf9d"/>
      <path d="M60 79Q61 61 77 61H116Q124 60 126 80V61H58Z" fill="#493362"/>
      <rect x="69" y="83" width="13" height="19" rx="6.5" fill="white"/><rect x="100" y="83" width="13" height="19" rx="6.5" fill="white"/>
      <rect x="74" y="87" width="7" height="12" rx="3.5" fill="#493362"/><rect x="101" y="87" width="7" height="12" rx="3.5" fill="#493362"/>
      ${mood==='thinking'?'<path d="M86 110h10" stroke="#b46d49" stroke-width="4" stroke-linecap="round"/>':'<path d="M83 107Q91 118 100 107" fill="#b46d49"/>'}
      <path d="M47 64L84 9Q89 2 94 10L125 64Z" fill="#9069cd"/>
      <path d="M94 10L111 64H125Z" fill="#7851b0"/>
      <rect x="41" y="58" width="96" height="18" rx="9" fill="#a783e0"/>
      <path d="m87 29 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#ffdf69"/>
      <rect x="24" y="123" width="37" height="36" rx="6" transform="rotate(-12 24 123)" fill="#58cc02"/>
      <path d="m32 133 23-5m-21 12 16-4" stroke="#d7ffb8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="39" cy="147" r="9" fill="#ffcf9d"/>
    </g>
    <path class="guide-spark" d="m152 64 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#ffc800"/>
  </svg>`;
}
export function portalArt() {
  return `<svg class="portal-art" viewBox="0 0 280 145" aria-hidden="true"><rect x="24" y="123" width="233" height="11" rx="5.5" fill="#e1d2f1"/><rect x="85" y="13" width="115" height="116" rx="48" fill="#b398d4"/><path d="M99 129V68a43 43 0 0 1 86 0v61" fill="#493362"/><path d="M113 129V72a29 29 0 0 1 58 0v57" fill="#65458b"/><path d="M125 129V74a17 17 0 0 1 34 0v55" fill="#9069cd"/><rect x="72" y="113" width="139" height="16" rx="6" fill="#c9b2e4"/><rect x="64" y="128" width="155" height="9" rx="4" fill="#b398d4"/><rect x="47" y="67" width="11" height="37" rx="5" fill="#b398d4"/><path d="M52 39Q33 66 52 77Q72 67 52 39" fill="#ffc800"/><path d="M52 54Q43 68 52 72Q63 66 52 54" fill="#ffedac"/><rect x="225" y="67" width="11" height="37" rx="5" fill="#b398d4"/><path d="M230 39Q211 66 230 77Q250 67 230 39" fill="#ffc800"/><path d="m142 40 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#ffdf69"/><path d="m20 28 3 6 6 3-6 3-3 6-3-6-6-3 6-3Zm230-11 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#c3a7e5"/></svg>`;
}
export function treasureArt() {
  return `<svg class="treasure-art" viewBox="0 0 110 90" aria-hidden="true"><rect x="10" y="80" width="90" height="7" rx="3.5" fill="#ffe7a3"/><rect x="15" y="23" width="80" height="58" rx="13" fill="#ffb020"/><path d="M15 50h80v18q0 13-13 13H28q-13 0-13-13Z" fill="#ed9315"/><rect x="24" y="30" width="12" height="44" rx="5" fill="#ffdf69"/><rect x="74" y="30" width="12" height="44" rx="5" fill="#ffdf69"/><rect x="11" y="43" width="88" height="13" rx="5" fill="#ffcf46"/><rect x="44" y="43" width="23" height="26" rx="6" fill="#fff1ac"/><circle cx="56" cy="53" r="4" fill="#ed9315"/><rect x="54" y="53" width="4" height="9" rx="2" fill="#ed9315"/><path d="m56 1 3 7 7 3-7 3-3 7-3-7-7-3 7-3" fill="#ffc800"/></svg>`;
}
