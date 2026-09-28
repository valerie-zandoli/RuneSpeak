import { createRun, start, room, types, heroes, items, stats, maxHealth, selectHero, question, answer, proceed, choose, drink, equip, buyPotion, restore, challengeBank } from './engine.js';
import { createRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seed = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const SAVE_KEY = 'runespeak-v2';
let state;
try { state = restore(localStorage.getItem(SAVE_KEY)); } catch {}
state ||= createRun(seed());
let busy = false, sound = false, selected = [], toastTimer;
const renderer = createRenderer($('dungeon'), () => state);

function sprite(n) { return `<span class="sprite" data-tile="${n}" aria-hidden="true"></span>`; }
function paintSprites() { document.querySelectorAll('[data-tile]').forEach(el => { const n = +el.dataset.tile; el.style.backgroundPosition = `-${n % 12 * 32}px -${Math.floor(n / 12) * 32}px`; }); }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); $('save-status').textContent = 'Progress saved on this device'; } catch { $('save-status').textContent = 'Storage unavailable · progress will not survive reload'; } }
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible'); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2200); }
function modal(html) { $('modal-content').innerHTML = html; if (!$('modal').open) $('modal').showModal(); paintSprites(); }
function tone(correct) {
  if (!sound) return;
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(), osc = ac.createOscillator(), gain = ac.createGain(); osc.connect(gain); gain.connect(ac.destination); osc.type = 'triangle'; osc.frequency.setValueAtTime(correct ? 330 : 150, ac.currentTime); osc.frequency.exponentialRampToValueAtTime(correct ? 660 : 70, ac.currentTime + .22); gain.gain.setValueAtTime(.05, ac.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .4); osc.start(); osc.stop(ac.currentTime + .4); osc.onended = () => ac.close(); } catch {}
}
function speak() {
  if (!('speechSynthesis' in window)) return toast('Spanish pronunciation is unavailable in this browser.');
  const q = question(state); if (!q || q.kind === 'reverse') return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(q.kind === 'grammar' ? q.es.replace('___', '…') : q.es);
  utterance.lang = 'es-ES'; utterance.rate = .85; speechSynthesis.speak(utterance);
}

function renderHud() {
  const hero = heroes[state.hero], t = types[room(state).type], bonuses = stats(state);
  $('hero-portrait').innerHTML = sprite(hero.tile); $('hero-name').textContent = hero.name;
  $('hero-passive').textContent = `${hero.passive} · ${hero.description}`;
  $('health').textContent = `${state.hp} / ${maxHealth(state)}`;
  $('health-fill').style.width = `${state.hp / maxHealth(state) * 100}%`;
  $('health-bar').setAttribute('aria-valuenow', state.hp); $('health-bar').setAttribute('aria-valuemin', 0); $('health-bar').setAttribute('aria-valuemax', maxHealth(state));
  $('gold').textContent = `◈ ${state.gold}`; $('streak').textContent = `${state.streak} ×`;
  $('potions').textContent = `${state.potions} left · +35 HP`;
  $('potion').disabled = busy || !state.potions || state.hp >= maxHealth(state) || ['select', 'won', 'lost'].includes(state.phase);
  $('inventory').disabled = busy; $('new-run').disabled = busy;
  $('biome').textContent = ['I · THE WHISPERING CRYPT', 'II · THE MOSSBOUND HALLS', 'III · THE RUNIC DEPTHS'][Math.floor(state.depth / 3)];
  $('room-label').textContent = `ROOM ${String(state.depth + 1).padStart(2, '0')} / 09`;
  $('room-name').textContent = state.phase === 'select' ? 'The adventure awaits' : t.name;
  $('encounter-type').textContent = state.phase === 'select' ? 'CHOOSE YOUR HERO' : `${t.label} / ${t.mechanic.toUpperCase()}`;
  const combat = ['battle', 'spell', 'boss'].includes(room(state).type);
  $('enemy-status').hidden = !combat || ['select', 'doors', 'won'].includes(state.phase) || (state.enemyHp === 0 && !busy);
  $('enemy-name').textContent = room(state).type === 'boss' ? (state.enemyHp < state.enemyMax / 2 ? 'GUARDIAN · ENRAGED' : 'RUNE GUARDIAN') : room(state).type === 'spell' ? 'RUNE SENTINEL' : ['CRYPT SLIME', 'DUST REAPER', 'STONE BRUTE'][room(state).variant];
  $('enemy-fill').style.width = `${state.enemyHp / state.enemyMax * 100}%`; $('enemy-health').textContent = `${state.enemyHp} / ${state.enemyMax} HP`;
  $('enemy-fill').parentElement.classList.toggle('boss', room(state).type === 'boss');
  $('canvas-hint').textContent = state.phase === 'doors' ? 'THE PASSAGES ARE OPEN · CHOOSE YOUR PATH BELOW' : state.phase === 'won' ? 'THE LAST SEAL IS BROKEN. YOU ARE FREE.' : state.phase === 'lost' ? 'THE CRYPT REMEMBERS YOUR COURAGE.' : t.hint.toUpperCase();
  $('seed-label').textContent = `SEED ${state.seed}`;
  $('map').innerHTML = Array.from({ length: 9 }, (_, i) => `<span class="map-node ${i === state.depth ? 'current' : ''} ${i < state.depth || state.phase === 'won' ? 'done' : ''}" aria-label="Room ${i + 1}${i === state.depth ? ', current' : ''}">${i < state.depth || state.phase === 'won' ? '·' : i === 8 ? '♜' : i + 1}</span>`).join('');
  $('equipment').innerHTML = ['weapon', 'armor', 'charm'].map((slot, i) => {
    const item = items[state.equipment[slot]];
    return `<button class="gear-slot ${item ? '' : 'empty'}" data-slot="${slot}" ${busy ? 'disabled' : ''} aria-label="${slot}: ${item ? esc(item.name) + '. ' + esc(item.effect) : 'empty'}. Open backpack"><span class="slot-icon">${sprite(item?.tile ?? [heroes[state.hero].weapon, 101, 56][i])}</span><span><small>${slot.toUpperCase()}</small><strong>${item ? esc(item.name) : 'Empty slot'}</strong><span class="gear-bonus">${item ? esc(item.effect) : 'Find loot in the dungeon'}</span></span></button>`;
  }).join('');
  $('combat-stats').innerHTML = `<span>ATK <b>${bonuses.attack}</b></span><span>SPELL <b>+${bonuses.spell}</b></span><span>BLOCK <b>${bonuses.armor}</b></span><span>GOLD <b>+${Math.round(bonuses.gold * 100)}%</b></span>`;
  $('bag-count').textContent = `${state.inventory.length} / 8`;
  $('trait-card').innerHTML = `<div class="trait-name">${hero.passive}</div><div class="trait-desc">${hero.description}</div><div class="trait-tag">PASSIVE · ALWAYS ACTIVE</div>`;
  $('log').innerHTML = state.log.map(line => `<li>${esc(line)}</li>`).join('');
  document.querySelectorAll('[data-slot]').forEach(button => button.onclick = showInventory);
}

function render() {
  renderHud();
  const q = question(state), t = types[room(state).type];
  const names = { vocab: '⚔ MELEE / VOCABULARY', grammar: '✦ SPELL / SENTENCE COMPLETION', order: 'ᚱ RUNE / WORD ORDER', reverse: '⌁ DISARM / TRANSLATION' };
  $('challenge-kind').textContent = state.phase === 'doors' ? '↟ THE WAY FORWARD' : names[q?.kind] || '✦ YOUR ADVENTURE';
  $('turn-label').textContent = ['won', 'lost'].includes(state.phase) ? 'EXPEDITION COMPLETE' : state.phase === 'doors' ? '1–3 TO CHOOSE' : `TURN ${state.turn + 1} · NO TIMER`;
  if (busy) { $('challenge').innerHTML = '<div class="busy-indicator" id="challenge-heading">The runes answer…</div>'; paintSprites(); return; }
  if (state.phase === 'select') {
    $('challenge').innerHTML = '<h2 id="challenge-heading">A new adventurer approaches.</h2><p>Choose a hero. Learn their strengths. Enter the crypt.</p>';
  } else if (['won', 'lost'].includes(state.phase)) renderEnding();
  else if (state.phase === 'doors') renderDoors();
  else if (state.phase === 'feedback') renderFeedback();
  else {
    const spell = q.kind === 'grammar';
    const instructions = q.kind === 'order' ? q.prompt : q.kind === 'reverse' ? 'Disarm the trap: which Spanish word matches?' : spell ? 'Complete the sentence to cast your spell.' : 'Translate the word to strike your opponent.';
    $('challenge').innerHTML = `<div class="challenge-layout"><div><h2 id="challenge-heading">${spell ? 'Complete the incantation.' : q.kind === 'order' ? 'Arrange the ancient words.' : q.kind === 'reverse' ? 'Read the warning.' : 'Choose your strike.'}</h2><p class="prompt">${esc(instructions)}</p>${q.kind !== 'order' ? `<div class="rune-text" ${q.kind !== 'reverse' ? 'lang="es"' : ''}>${esc(q.es).replace('___', '<span class="blank">?</span>')}</div>` : ''}${['vocab', 'grammar'].includes(q.kind) ? '<button class="listen-button" id="listen">♪ Hear the inscription</button>' : ''}<div class="challenge-note">${['battle', 'spell', 'boss'].includes(room(state).type) ? `${stats(state).attack + (spell ? stats(state).spell : 0)} damage on a correct answer` : t.action + ' the room'} · ${Math.max(0, t.damage - stats(state).armor)} HP at risk</div></div><div id="answer-area"></div></div>`;
    if ($('listen')) $('listen').onclick = speak;
    if (q.type === 'order') renderTokens(q);
    else {
      $('answer-area').innerHTML = `<div class="answers ${q.kind}">${q.options.map((option, i) => `<button class="answer" data-answer="${i}"><kbd>${i + 1}</kbd><span ${q.kind !== 'vocab' ? 'lang="es"' : ''}>${esc(option)}</span></button>`).join('')}</div><div class="challenge-note">CHOOSE AN ANSWER · 1–4 OR CLICK</div>`;
      document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => submit(q.options[+button.dataset.answer]));
    }
  }
  paintSprites();
}

function renderTokens(q) {
  $('answer-area').innerHTML = `<div class="sentence" lang="es" aria-label="Your sentence" aria-live="polite">${selected.map((index, pos) => `<button data-remove="${pos}" aria-label="Remove ${esc(q.options[index])}">${esc(q.options[index])}</button>`).join('')}</div><div class="tokens">${q.options.map((word, i) => `<button class="token" lang="es" data-token="${i}" ${selected.includes(i) ? 'disabled' : ''}>${esc(word)}</button>`).join('')}</div><div class="token-actions"><button class="secondary" id="clear-words">RESET</button><button class="primary" id="cast" ${selected.length !== q.options.length ? 'disabled' : ''}>${types[room(state).type].action.toUpperCase()} →</button></div>`;
  document.querySelectorAll('[data-token]').forEach(button => button.onclick = () => { selected.push(+button.dataset.token); renderTokens(q); });
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { selected.splice(+button.dataset.remove, 1); renderTokens(q); });
  $('clear-words').onclick = () => { selected = []; renderTokens(q); };
  $('cast').onclick = () => submit(selected.map(i => q.options[i]).join(' '));
}

function lootCard() {
  if (!state.loot) return '';
  const item = items[state.loot], equipped = state.equipment[item.slot] === state.loot;
  return `<div class="loot-card">${sprite(item.tile)}<div><span class="rarity">${item.rarity} ${item.slot.toUpperCase()} · FOUND</span><strong>${item.name}</strong><small>${item.effect}</small></div><button id="equip-drop" ${equipped ? 'disabled' : ''}>${equipped ? 'EQUIPPED' : 'EQUIP'}</button></div>`;
}
function renderFeedback() {
  const f = state.feedback;
  const title = !f.correct ? (f.damage ? 'A mistake. A chance to learn.' : 'The blessing slips away.') : f.cleared ? 'Encounter cleared!' : 'A clean hit. Keep fighting.';
  const rewards = [f.dealt && ['battle', 'spell', 'boss'].includes(room(state).type) ? `${f.dealt} DAMAGE` : '', f.damage ? `−${f.damage} HP` : '', f.heal ? `+${f.heal} HP` : '', f.gain ? `+${f.gain} GOLD` : '', f.correct && room(state).type === 'treasure' ? '+1 POTION' : ''].filter(Boolean).join(' · ');
  $('challenge').innerHTML = `<div class="feedback ${f.correct ? '' : 'bad'}"><div><h2 id="challenge-heading" class="feedback-title">${title}</h2><div class="correct-answer">${esc(f.answer)}</div><p>${esc(f.explanation)}</p><div class="reward-line">${rewards}</div></div><div class="feedback-actions">${lootCard()}<button class="primary" id="continue">${state.enemyHp > 0 ? 'NEXT ATTACK →' : state.depth === 8 ? 'LEAVE THE CRYPT →' : 'CHOOSE A PASSAGE →'}</button>${state.loot ? '<span class="challenge-note">Loot is in your backpack. Equip now or later.</span>' : ''}</div></div>`;
  if ($('equip-drop')) $('equip-drop').onclick = () => equipItem(state.loot);
  $('continue').onclick = () => { if (busy) return; proceed(state); selected = []; save(); render(); $('scene-banner').textContent = ''; };
}

function renderDoors() {
  $('challenge').innerHTML = `<div class="doors-heading"><h2 id="challenge-heading">Choose your next encounter.</h2><p>Door labels reveal the challenge.<br>Risk includes your armor.</p></div><div class="doors">${state.levels[state.depth + 1].map((r, i) => { const t = types[r.type]; return `<button class="door" data-door="${i}">${sprite(t.tile)}<span><strong><kbd>${i + 1}</kbd> ${t.label}</strong><small>${t.mechanic}</small><em>${Math.max(0, t.damage - stats(state).armor)} HP RISK${r.type === 'treasure' ? ' · LOOT' : r.type === 'shrine' ? ' · +30 HP' : ''}</em></span></button>`; }).join('')}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:10px"><span class="challenge-note">Prepare your gear before moving on.</span><button id="buy-potion" class="secondary" ${state.gold < 40 ? 'disabled' : ''}>BUY POTION · 40 GOLD</button></div>`;
  document.querySelectorAll('[data-door]').forEach(button => button.onclick = () => moveTo(+button.dataset.door));
  $('buy-potion').onclick = () => { if (buyPotion(state)) { save(); render(); toast('Potion purchased · −40 gold'); } };
}

function renderEnding() {
  const won = state.phase === 'won';
  $('challenge').innerHTML = `<div class="end-screen"><h2 id="challenge-heading">${won ? 'The crypt has met its match.' : 'Your story is not over.'}</h2><p>${won ? 'The guardian crumbles. Your words have opened the way home. ¡Muy bien!' : 'The dungeon won this round. Your journal keeps the words you discovered.'}</p>${!won && state.feedback ? `<p>Last answer: <b>${esc(state.feedback.answer)}</b> · ${esc(state.feedback.explanation)}</p>` : ''}<div class="end-stats"><div><strong>${state.correct}/${state.attempts}</strong><small>correct answers</small></div><div><strong>${state.gold}</strong><small>gold found</small></div><div><strong>${state.inventory.length}</strong><small>relics found</small></div></div><div class="end-actions"><button id="again" class="primary">CHOOSE A NEW HERO →</button><button id="review" class="secondary">REVIEW YOUR JOURNAL</button></div></div>`;
  $('again').onclick = resetRun; $('review').onclick = showJournal;
}

async function submit(value) {
  if (busy || state.phase !== 'challenge') return;
  busy = true;
  const event = answer(state, value); selected = []; save();
  document.querySelector('.stage').classList.add('resolving'); render();
  $('scene-banner').className = `scene-banner ${event.correct ? 'positive' : 'negative'}`;
  $('scene-banner').textContent = event.correct ? (event.kind === 'grammar' ? '¡CONJURO!' : '¡MUY BIEN!') : event.damage ? 'THE DUNGEON STRIKES BACK' : 'THE BLESSING FADES';
  tone(event.correct); await renderer.play(event);
  busy = false; document.querySelector('.stage').classList.remove('resolving');
  $('scene-banner').textContent = event.cleared && event.correct ? (event.loot ? 'VICTORY · LOOT FOUND' : 'ENCOUNTER CLEARED') : '';
  render();
  $('continue')?.focus({ preventScroll: true });
}
async function moveTo(lane) {
  if (busy || state.phase !== 'doors') return;
  busy = true; render(); $('scene-banner').textContent = '';
  await renderer.play({ type: 'walk', lane });
  choose(state, lane); selected = []; save(); render();
  await renderer.play({ type: 'enter' }); busy = false; render();
}
async function equipItem(id) {
  if (busy || !equip(state, id)) return;
  save(); render(); tone(true);
  toast(state.equipment[items[id].slot] === id ? `${items[id].name} equipped · ${items[id].effect}` : `${items[id].name} unequipped`);
  renderer.play({ type: 'equip' });
}
function showInventory() {
  if (busy) return;
  modal(`<div class="modal-kicker">BACKPACK / ${state.inventory.length} RELICS</div><h2>Your spoils of adventure.</h2><p>Equip one weapon, one armor, and one charm. Swapped items stay in your backpack. Bonuses apply immediately to the next answer.</p>${state.inventory.length ? `<div class="inventory-grid">${state.inventory.map(id => { const item = items[id], active = state.equipment[item.slot] === id; return `<div class="inventory-item ${active ? 'equipped' : ''}">${sprite(item.tile)}<div><div class="modal-kicker">${item.slot.toUpperCase()} · ${item.rarity}</div><strong>${item.name}</strong><p>${item.effect}</p><p>${item.lore}</p><button data-equip="${id}" ${['won', 'lost'].includes(state.phase) ? 'disabled' : ''}>${active ? 'UNEQUIP' : 'EQUIP'}</button></div></div>`; }).join('')}</div>` : '<p>Defeat your first enemy for a guaranteed weapon. Treasure rooms always drop equipment when unlocked.</p>'}`);
  document.querySelectorAll('[data-equip]').forEach(button => button.onclick = () => { equipItem(button.dataset.equip); showInventory(); });
}
function showJournal() {
  modal(`<div class="modal-kicker">FIELD JOURNAL</div><h2>Knowledge survives the dungeon.</h2><p>${state.correct} correct answers from ${state.attempts} attempts this run.</p>${[...new Set(state.journal.map(entry => entry.id))].map(id => { const q = challengeBank.find(q => q.id === id); if (!q) return ''; const learned = state.journal.filter(entry => entry.id === id).at(-1).correct; return `<div class="journal-row"><div><strong>${esc(q.kind === 'order' ? q.answer : q.es)} → ${esc(q.answer)}</strong><p>${esc(q.explanation)}</p></div><span>${learned ? '✓ LEARNED' : '↶ PRACTICE'}</span></div>`; }).join('') || '<p>Your first discovery is waiting behind the dungeon door.</p>'}`);
}
function showSelection() {
  $('hero-cards').innerHTML = Object.entries(heroes).map(([id, h]) => `<button class="hero-card ${state.hero === id ? 'chosen' : ''}" data-hero="${id}" aria-pressed="${state.hero === id}">${state.hero === id ? '<span class="selected-label">SELECTED</span>' : ''}<div class="hero-art">${sprite(h.tile)}</div><div class="hero-info"><h3>${h.name}</h3><div class="hero-title">${h.title}</div><b>${h.passive}</b><p>${h.description}</p><small>${h.detail}</small></div></button>`).join('');
  document.querySelectorAll('[data-hero]').forEach(button => button.onclick = () => { selectHero(state, button.dataset.hero); save(); render(); showSelection(); document.querySelector(`[data-hero="${state.hero}"]`).focus(); });
  if (!$('hero-select').open) $('hero-select').showModal(); paintSprites();
}
function resetRun() { $('modal').close(); state = createRun(seed(), state.hero); selected = []; $('seed-input').value = ''; save(); render(); showSelection(); }
function newRun() { if (busy) return; if (['won', 'lost', 'select'].includes(state.phase)) return resetRun(); modal('<div class="modal-kicker">RETURN TO CAMP</div><h2>Start a new expedition?</h2><p>Your current health, equipment, and journal will be replaced by a fresh run.</p><button class="primary" id="confirm-reset">CHOOSE A NEW HERO →</button>'); $('confirm-reset').onclick = resetRun; }

$('begin').onclick = async () => {
  if (busy || state.phase !== 'select') return;
  const customSeed = $('seed-input').value.trim().toUpperCase();
  if (customSeed) state = createRun(customSeed, state.hero);
  start(state); save(); $('hero-select').close(); busy = true; render();
  await renderer.play({ type: 'enter' }); busy = false; render();
};
$('hero-select').addEventListener('cancel', event => event.preventDefault());
$('potion').onclick = async () => { if (busy) return; const heal = drink(state); if (!heal) return; busy = true; save(); render(); await renderer.play({ type: 'heal', heal }); busy = false; render(); toast(`+${heal} health · potion used`); };
$('inventory').onclick = showInventory; $('journal').onclick = showJournal; $('new-run').onclick = newRun;
$('sound').onclick = () => { sound = !sound; $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? 'Disable sound' : 'Enable sound'); tone(true); toast(sound ? 'Battle sounds on' : 'Battle sounds off'); };
$('help').onclick = () => modal('<div class="modal-kicker">ADVENTURER’S HANDBOOK</div><h2>Your words have consequences.</h2><p>Defeat enemies by reducing their health to zero. A correct answer attacks; a wrong answer makes the enemy retaliate. There is no timer.</p><ul><li><b>Melee:</b> translate Spanish vocabulary.</li><li><b>Spell duels:</b> fill in a missing word in a Spanish sentence.</li><li><b>Treasure and sanctuaries:</b> arrange Spanish words. Treasure grants equipment and a potion; sanctuaries restore 30 HP.</li><li><b>Traps:</b> translate English into Spanish.</li><li><b>Guardian:</b> cycles vocabulary, sentence completion, and word ordering.</li></ul><p>Equip loot in your backpack (I). Weapons improve attacks, armor reduces damage, and charms add passive bonuses. Gold buys potions between rooms. Press H to heal, J for your journal, and 1–4 for answers. Click sentence words to add or remove them.</p><p>Progress saves in this browser. This local version uses a separate save from the original demo. Sound is optional, and reduced-motion settings shorten animations.</p>');
$('credits').onclick = () => modal('<div class="modal-kicker">ART & CREDITS</div><h2>Built with open pixel art.</h2><p>Characters, creatures, tiles, and equipment: <a href="https://kenney.nl/assets/tiny-dungeon" target="_blank" rel="noopener">Tiny Dungeon by Kenney</a>, CC0 1.0. Original license is bundled with the game.</p><p>Fonts: VT323, MedievalSharp, and Space Grotesk from Google Fonts (SIL Open Font License). System fonts are used if unavailable. RuneSpeak code is MIT licensed.</p>');
$('close-modal').onclick = () => $('modal').close();
document.addEventListener('keydown', event => {
  if (busy || $('modal').open || $('hero-select').open || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === 'h') $('potion').click(); if (key === 'i') showInventory(); if (key === 'j') showJournal();
  const index = Number(key) - 1;
  if (index >= 0 && index < 4) document.querySelector(state.phase === 'doors' ? `[data-door="${index}"]` : `[data-answer="${index}"]`)?.click();
});
render();
if (state.phase === 'select') showSelection();
