import { createRun, start, room, types, heroes, items, stats, maxHealth, selectHero, selectDungeon, incomingDamage, attackPower, question, answer, proceed, choose, drink, equip, buyPotion, shopStock, buyRelic, leaveShop, restore, challengeBank } from './engine.js';
import { dungeons, dungeonFor, dungeonBiome, dungeonStatus } from './dungeons.js';
import { paintDungeon } from './themed-dungeon-art.js';
import { createRenderer } from './renderer.js';
import { audio } from './audio.js';
import { enemyLabel, enemyForRoom, latestEnemyRoster } from './enemies.js';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seed = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const SAVE_KEY = 'runespeak-v2';
let state;
try { state = restore(localStorage.getItem(SAVE_KEY)); } catch {}
state ||= createRun(seed(), 'wizard', latestEnemyRoster, 'crypt');
if (state.phase === 'select' && !state.dungeon) selectDungeon(state, 'crypt');
let busy = false, selected = [], toastTimer;
const renderer = createRenderer($('dungeon'), () => state);

function sprite(n) { return n === 97 ? '<span class="sprite knight-sprite" aria-hidden="true"></span>' : n === 112 ? '<span class="sprite ranger-sprite" aria-hidden="true"></span>' : n === 84 ? '<span class="sprite wizard-sprite" aria-hidden="true"></span>' : `<span class="sprite" data-tile="${n}" aria-hidden="true"></span>`; }
function paintSprites() { document.querySelectorAll('[data-tile]').forEach(el => { const n = +el.dataset.tile; el.style.backgroundPosition = `-${n % 12 * 32}px -${Math.floor(n / 12) * 32}px`; }); }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); $('save-status').textContent = 'Progress saved on this device'; } catch { $('save-status').textContent = 'Storage unavailable · progress will not survive reload'; } }
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible'); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2200); }
function modal(html) { $('modal-content').innerHTML = html; if (!$('modal').open) $('modal').showModal(); paintSprites(); }
function speak() {
  if (!('speechSynthesis' in window)) return toast('Spanish pronunciation is unavailable in this browser.');
  const q = question(state); if (!q || q.kind === 'reverse') return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(q.kind === 'grammar' ? q.es.replace('___', '…') : q.es);
  utterance.lang = 'es-ES'; utterance.rate = .85; speechSynthesis.speak(utterance);
}

function renderHud() {
  audio.scene(dungeonBiome(state),room(state).type==='boss',['won','lost','select'].includes(state.phase));
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
  $('biome').textContent = dungeonFor(state)?.name.toUpperCase() || ['I · THE WHISPERING CRYPT', 'II · THE MOSSBOUND HALLS', 'III · THE RUNIC DEPTHS'][dungeonBiome(state)];
  document.querySelector('.masthead .edition').textContent = dungeonFor(state)?.name.toUpperCase() || 'ORIGINAL EXPEDITION';
  document.querySelector('.game-shell').dataset.region = state.dungeon || ['crypt', 'moss', 'runic'][dungeonBiome(state)];
  $('dungeon-rule').textContent = dungeonStatus(state);
  $('dungeon-rule').title = dungeonFor(state) ? `${dungeonFor(state).description} ${dungeonFor(state).tradeoff}` : dungeonStatus(state);
  $('room-label').textContent = `ROOM ${String(state.depth + 1).padStart(2, '0')} / 09`;
  $('room-name').textContent = state.phase === 'select' ? 'The adventure awaits' : room(state).type === 'boss' ? enemyLabel(room(state)) : t.name;
  $('encounter-type').textContent = state.phase === 'select' ? 'CHOOSE YOUR HERO' : `${t.label} / ${(room(state).type === 'boss' ? enemyForRoom(room(state)).breathLabel : t.mechanic).toUpperCase()}`;
  const combat = ['battle', 'spell', 'boss'].includes(room(state).type);
  $('enemy-status').hidden = !combat || ['select', 'doors', 'won'].includes(state.phase) || (state.enemyHp === 0 && !busy);
  $('enemy-name').textContent = room(state).type === 'boss' && state.enemyHp < state.enemyMax / 2 ? enemyLabel(room(state)).toUpperCase() + ' · ENRAGED' : enemyLabel(room(state)).toUpperCase();
  $('enemy-status').classList.toggle('cyclops', Boolean(enemyForRoom(room(state))?.model));
  $('enemy-status').classList.toggle('slime', Boolean(enemyForRoom(room(state))?.slimeModel));
  $('enemy-status').classList.toggle('goblin', Boolean(enemyForRoom(room(state))?.goblin));
  $('enemy-status').classList.toggle('skeleton', Boolean(enemyForRoom(room(state))?.skeleton));
  $('enemy-status').classList.toggle('dragon', Boolean(enemyForRoom(room(state))?.dragon));
  $('enemy-status').classList.toggle('kobold', Boolean(enemyForRoom(room(state))?.kobold));
  $('enemy-fill').style.width = `${state.enemyHp / state.enemyMax * 100}%`; $('enemy-health').textContent = `${state.enemyHp} / ${state.enemyMax} HP`;
  $('enemy-fill').parentElement.classList.toggle('boss', room(state).type === 'boss');
  $('canvas-hint').textContent = state.phase === 'doors' ? 'THE PASSAGES ARE OPEN · CHOOSE YOUR PATH BELOW' : state.phase === 'won' ? 'THE LAST SEAL IS BROKEN. YOU ARE FREE.' : state.phase === 'lost' ? 'THE DUNGEON REMEMBERS YOUR COURAGE.' : t.hint.toUpperCase();
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
  $('challenge-kind').textContent = state.phase === 'doors' ? '↟ THE WAY FORWARD' : room(state).type === 'shop' ? '◈ MERCHANT / TRANSLATION' : names[q?.kind] || '✦ YOUR ADVENTURE';
  $('turn-label').textContent = ['won', 'lost'].includes(state.phase) ? 'EXPEDITION COMPLETE' : state.phase === 'doors' ? '1–3 TO CHOOSE' : `TURN ${state.turn + 1} · NO TIMER`;
  if (busy) { $('challenge').innerHTML = '<div class="busy-indicator" id="challenge-heading">The runes answer…</div>'; paintSprites(); return; }
  if (state.phase === 'select') {
    $('challenge').innerHTML = '<h2 id="challenge-heading">A new adventurer approaches.</h2><p>Choose a hero and a dungeon. Learn their strengths. Begin your expedition.</p>';
  } else if (['won', 'lost'].includes(state.phase)) renderEnding();
  else if (state.phase === 'doors') renderDoors();
  else if (state.phase === 'feedback') renderFeedback();
  else {
    const spell = q.kind === 'grammar';
    const shopping = room(state).type === 'shop';
    const instructions = shopping ? 'Help the merchant translate this word into Spanish to unlock the relic shop.' : q.kind === 'order' ? q.prompt : q.kind === 'reverse' ? 'Disarm the trap: which Spanish word matches?' : spell ? 'Complete the sentence to cast your spell.' : 'Translate the word to strike your opponent.';
    $('challenge').innerHTML = `<div class="challenge-layout"><div><h2 id="challenge-heading">${shopping ? 'Speak the merchant’s language.' : spell ? 'Complete the incantation.' : q.kind === 'order' ? 'Arrange the ancient words.' : q.kind === 'reverse' ? 'Read the warning.' : 'Choose your strike.'}</h2><p class="prompt">${esc(instructions)}</p>${q.kind !== 'order' ? `<div class="rune-text" ${q.kind !== 'reverse' ? 'lang="es"' : ''}>${esc(q.es).replace('___', '<span class="blank">?</span>')}</div>` : ''}${['vocab', 'grammar'].includes(q.kind) ? '<button class="listen-button" id="listen">♪ Hear the inscription</button>' : ''}<div class="challenge-note">${['battle', 'spell', 'boss'].includes(room(state).type) ? `${Math.min(state.enemyHp, attackPower(state, q))} damage on a correct answer` : shopping ? 'Correct answer unlocks the shop' : t.action + ' the room'} · ${incomingDamage(state)} HP at risk</div></div><div id="answer-area"></div></div>`;
    if ($('listen')) $('listen').onclick = speak;
    if (q.type === 'order') renderTokens(q);
    else {
      $('answer-area').innerHTML = `<div class="answers ${q.kind}">${q.options.map((option, i) => `<button class="answer" data-answer="${i}"><kbd>${i + 1}</kbd><span ${q.kind !== 'vocab' ? 'lang="es"' : ''}>${esc(option)}</span></button>`).join('')}</div><div class="challenge-note">CHOOSE AN ANSWER · 1–4 OR CLICK</div>`;
      document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => submit(q.options[+button.dataset.answer]));
    }
  }
  if (room(state).type === 'shop' && state.phase === 'challenge') {
    $('challenge').insertAdjacentHTML('beforeend', '<button class="secondary" id="leave-shop">LEAVE SHOP →</button>');
    $('leave-shop').onclick = exitShop;
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
function exitShop() {
  if (busy || !leaveShop(state)) return;
  selected = []; save(); render(); $('scene-banner').textContent = '';
}
function renderShop() {
  const unlocked = state.feedback.correct;
  $('challenge').innerHTML = `<section class="shop-panel"><h2 id="challenge-heading">${unlocked ? 'Welcome to the relic shop.' : 'A little practice before we trade.'}</h2><p class="correct-answer">${esc(state.feedback.answer)}</p><p>${esc(state.feedback.explanation)}</p>
    ${unlocked ? `<p><strong>${state.gold} gold available</strong> · Relics go into your backpack. Equip them whenever you like.</p><div class="shop-stock">${shopStock(state).map(({id,price}) => {
      const item = items[id], owned = state.inventory.includes(id), short = Math.max(0,price-state.gold);
      return `<article class="shop-relic">${sprite(item.tile)}<small>${item.rarity} · ${item.slot.toUpperCase()}</small><h3>${item.name}</h3><p>${item.effect}</p><button data-buy-relic="${id}" ${owned || short ? 'disabled' : ''}>${owned ? 'IN BACKPACK' : 'BUY · '+price+' GOLD'}</button>${!owned && short ? '<small>Need '+short+' more gold</small>' : ''}${owned ? '<button class="secondary" data-shop-equip="'+id+'">'+(state.equipment[item.slot]===id ? 'UNEQUIP' : 'EQUIP')+'</button>' : ''}</article>`;
    }).join('')}</div>` : '<p>No health or gold lost. Try another translation, or continue your journey.</p><button class="primary" id="continue">TRY AGAIN →</button>'}
    <button class="secondary" id="leave-shop">LEAVE SHOP →</button></section>`;
  $('leave-shop').onclick = exitShop;
  if ($('continue')) $('continue').onclick = () => { if(busy) return; proceed(state); save(); render(); };
  document.querySelectorAll('[data-buy-relic]').forEach(button => button.onclick = () => {
    const id = button.dataset.buyRelic;
    if (busy || !buyRelic(state,id)) return;
    save(); render(); toast(items[id].name + ' purchased · added to backpack');
  });
  document.querySelectorAll('[data-shop-equip]').forEach(button => button.onclick = () => equipItem(button.dataset.shopEquip));
}
function renderFeedback() {
  if (room(state).type === 'shop') return renderShop();
  const f = state.feedback;
  const title = !f.correct ? (f.damage ? 'A mistake. A chance to learn.' : 'The blessing slips away.') : f.cleared ? 'Encounter cleared!' : 'A clean hit. Keep fighting.';
  const rewards = [f.dealt && ['battle', 'spell', 'boss'].includes(room(state).type) ? `${f.dealt} DAMAGE` : '', f.damage ? `−${f.damage} HP` : '', f.heal ? `+${f.heal} HP` : '', f.gain ? `+${f.gain} GOLD` : '', f.correct && room(state).type === 'treasure' ? '+1 POTION' : ''].filter(Boolean).join(' · ');
  $('challenge').innerHTML = `<div class="feedback ${f.correct ? '' : 'bad'}"><div><h2 id="challenge-heading" class="feedback-title">${title}</h2><div class="correct-answer">${esc(f.answer)}</div><p>${esc(f.explanation)}</p><div class="reward-line">${rewards}</div>${f.quirk ? `<p class="quirk-feedback">${esc(f.quirk)}</p>` : ''}</div><div class="feedback-actions">${lootCard()}<button class="primary" id="continue">${state.enemyHp > 0 ? 'NEXT ATTACK →' : state.depth === 8 ? 'LEAVE THE DUNGEON →' : 'CHOOSE A PASSAGE →'}</button>${state.loot ? '<span class="challenge-note">Loot is in your backpack. Equip now or later.</span>' : ''}</div></div>`;
  if ($('equip-drop')) $('equip-drop').onclick = () => equipItem(state.loot);
  $('continue').onclick = () => { if (busy) return; proceed(state); selected = []; save(); render(); $('scene-banner').textContent = ''; };
}

function renderDoors() {
  $('challenge').innerHTML = `<div class="doors-heading"><h2 id="challenge-heading">Choose your next encounter.</h2><p>Door labels reveal the challenge.<br>Risk includes your armor.</p></div><div class="doors">${state.levels[state.depth + 1].map((r, i) => { const t = types[r.type]; return `<button class="door" data-door="${i}">${r.type === 'boss' ? `<span class="dragon-door-art" style="background-image:url('assets/dragons/${enemyForRoom(r).dragon}-approved.png')" aria-hidden="true"></span>` : sprite(t.tile)}<span><strong><kbd>${i + 1}</kbd> ${r.type === 'boss' ? enemyLabel(r) : t.label}</strong><small>${r.type === 'boss' ? enemyForRoom(r).breathLabel : t.mechanic}</small><em>${incomingDamage(state, r.type)} HP RISK${r.type === 'treasure' ? ' · LOOT' : r.type === 'shrine' ? ' · +30 HP' : r.type === 'shop' ? ' · RELICS FOR GOLD' : ''}</em></span></button>`; }).join('')}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:10px"><span class="challenge-note">Prepare your gear before moving on.</span><button id="buy-potion" class="secondary" ${state.gold < 40 ? 'disabled' : ''}>BUY POTION · 40 GOLD</button></div>`;
  document.querySelectorAll('[data-door]').forEach(button => button.onclick = () => moveTo(+button.dataset.door));
  $('buy-potion').onclick = () => { if (buyPotion(state)) { save(); render(); toast('Potion purchased · −40 gold'); } };
}

function renderEnding() {
  const won = state.phase === 'won';
  $('challenge').innerHTML = `<div class="end-screen"><h2 id="challenge-heading">${won ? 'The dungeon has met its match.' : 'Your story is not over.'}</h2><p>${won ? 'The final champion falls. Your words have opened the way home. ¡Muy bien!' : 'The dungeon won this round. Your journal keeps the words you discovered.'}</p>${!won && state.feedback ? `<p>Last answer: <b>${esc(state.feedback.answer)}</b> · ${esc(state.feedback.explanation)}</p>` : ''}<div class="end-stats"><div><strong>${state.correct}/${state.attempts}</strong><small>correct answers</small></div><div><strong>${state.gold}</strong><small>gold found</small></div><div><strong>${state.inventory.length}</strong><small>relics found</small></div></div><div class="end-actions"><button id="again" class="primary">CHOOSE AN EXPEDITION →</button><button id="review" class="secondary">REVIEW YOUR JOURNAL</button></div></div>`;
  $('again').onclick = resetRun; $('review').onclick = showJournal;
}

async function submit(value) {
  if (busy || state.phase !== 'challenge') return;
  busy = true;
  const event = answer(state, value); selected = []; save();
  document.querySelector('.stage').classList.add('resolving'); render();
  $('scene-banner').className = `scene-banner ${event.correct ? 'positive' : 'negative'}`;
  $('scene-banner').textContent = event.correct ? (event.kind === 'grammar' ? '¡CONJURO!' : '¡MUY BIEN!') : event.damage ? 'THE DUNGEON STRIKES BACK' : event.encounter === 'shop' ? 'TRY THE TRANSLATION AGAIN' : 'THE BLESSING FADES';
  await renderer.play(event);
  busy = false; document.querySelector('.stage').classList.remove('resolving');
  $('scene-banner').textContent = event.cleared && event.correct ? (event.loot ? 'VICTORY · LOOT FOUND' : event.encounter === 'shop' ? 'SHOP OPEN · RELICS FOR GOLD' : 'ENCOUNTER CLEARED') : '';
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
  save(); render();
  toast(state.equipment[items[id].slot] === id ? `${items[id].name} equipped · ${items[id].effect}` : `${items[id].name} unequipped`);
  renderer.play({ type: 'equip', slot: items[id].slot, equipped: state.equipment[items[id].slot] === id });
}
function showInventory() {
  if (busy) return;
  modal(`<div class="modal-kicker">BACKPACK / ${state.inventory.length} RELICS</div><h2>Your spoils of adventure.</h2><p>Equip one weapon, one armor, and one charm. Swapped items stay in your backpack. Bonuses apply immediately to the next answer.</p>${state.inventory.length ? `<div class="inventory-grid">${state.inventory.map(id => { const item = items[id], active = state.equipment[item.slot] === id; return `<div class="inventory-item ${active ? 'equipped' : ''}">${sprite(item.tile)}<div><div class="modal-kicker">${item.slot.toUpperCase()} · ${item.rarity}</div><strong>${item.name}</strong><p>${item.effect}</p><p>${item.lore}</p><button data-equip="${id}" ${['won', 'lost'].includes(state.phase) ? 'disabled' : ''}>${active ? 'UNEQUIP' : 'EQUIP'}</button></div></div>`; }).join('')}</div>` : '<p>Defeat your first enemy for a guaranteed weapon. Treasure rooms always drop equipment when unlocked.</p>'}`);
  document.querySelectorAll('[data-equip]').forEach(button => button.onclick = () => {
    const id = button.dataset.equip;
    equipItem(id);
    if (items[id].slot === 'weapon' && state.equipment.weapon === id) $('modal').close();
    else showInventory();
  });
}
function showJournal() {
  modal(`<div class="modal-kicker">FIELD JOURNAL</div><h2>Knowledge survives the dungeon.</h2><p>${state.correct} correct answers from ${state.attempts} attempts this run.</p>${[...new Set(state.journal.map(entry => entry.id))].map(id => { const q = challengeBank.find(q => q.id === id); if (!q) return ''; const learned = state.journal.filter(entry => entry.id === id).at(-1).correct; return `<div class="journal-row"><div><strong>${esc(q.kind === 'order' ? q.answer : q.es)} → ${esc(q.answer)}</strong><p>${esc(q.explanation)}</p></div><span>${learned ? '✓ LEARNED' : '↶ PRACTICE'}</span></div>`; }).join('') || '<p>Your first discovery is waiting behind the dungeon door.</p>'}`);
}
function showSelection(step = 'hero', focusHeading = false) {
  const pickingHero = step === 'hero';
  $('hero-select').dataset.step = step;
  $('hero-choice-step').hidden = !pickingHero;
  $('dungeon-choice-step').hidden = pickingHero;
  $('selection-title').textContent = pickingHero ? 'Choose your adventurer.' : 'Choose your dungeon.';
  $('selection-subtitle').textContent = pickingHero ? 'Who will you take into the dungeon? Pick a hero to continue.' : 'Three places. Three kinds of magic. Choose your next expedition.';
  $('hero-step-label').setAttribute('aria-current', pickingHero ? 'step' : 'false');
  $('dungeon-step-label').setAttribute('aria-current', pickingHero ? 'false' : 'step');
  $('selected-adventurer').innerHTML = `${sprite(heroes[state.hero].tile)}<span><small>YOUR ADVENTURER</small><strong>${heroes[state.hero].name}</strong></span>`;
  $('change-hero').onclick = () => showSelection('hero', true);
  $('hero-cards').innerHTML = Object.entries(heroes).map(([id, h]) => `<button class="hero-card ${state.hero === id ? 'chosen' : ''}" data-hero="${id}" aria-label="Choose ${h.name}"><div class="hero-art">${sprite(h.tile)}</div><div class="hero-info"><h3>${h.name}</h3><div class="hero-title">${h.title}</div><b>${h.passive}</b><p>${h.description}</p><small>${h.detail}</small><span class="hero-choose">CHOOSE ${h.name.replace('The ', '').toUpperCase()} →</span></div></button>`).join('');
  document.querySelectorAll('[data-hero]').forEach(button => button.onclick = () => { selectHero(state, button.dataset.hero); save(); render(); showSelection('dungeon', true); });
  $('dungeon-cards').innerHTML = Object.entries(dungeons).map(([id, d]) => `<button class="dungeon-card ${state.dungeon === id ? 'chosen' : ''}" data-dungeon-choice="${id}" aria-pressed="${state.dungeon === id}" style="--dungeon-color:${d.color}"><canvas width="480" height="240" aria-hidden="true"></canvas><span class="dungeon-card-copy"><strong>${d.name}</strong><span class="dungeon-focus">${state.dungeon === id ? '✓ SELECTED · ' : ''}${d.focus}</span><b>${d.trait}</b><span>${d.description}</span><small>${d.tradeoff}</small></span></button>`).join('');
  document.querySelectorAll('[data-dungeon-choice]').forEach(button => {
    const ctx = button.querySelector('canvas').getContext('2d');
    ctx.scale(.5, .5); paintDungeon(ctx, dungeons[button.dataset.dungeonChoice].biome, false, 0);
    button.onclick = () => { selectDungeon(state, button.dataset.dungeonChoice); save(); render(); showSelection('dungeon'); document.querySelector(`[data-dungeon-choice="${state.dungeon}"]`).focus({ preventScroll: true }); };
  });
  $('begin').textContent = 'BEGIN EXPEDITION →';
  if (!$('hero-select').open) $('hero-select').showModal(); paintSprites();
  if (focusHeading) { $('hero-select').scrollTop = 0; $('selection-title').focus({ preventScroll: true }); }
}
function resetRun() { $('modal').close(); state = createRun(seed(), state.hero, latestEnemyRoster, state.dungeon || 'crypt'); selected = []; $('seed-input').value = ''; save(); render(); showSelection(); }
function newRun() { if (busy) return; if (['won', 'lost', 'select'].includes(state.phase)) return resetRun(); modal('<div class="modal-kicker">RETURN TO CAMP</div><h2>Start a new expedition?</h2><p>Your current health, equipment, and journal will be replaced by a fresh run.</p><button class="primary" id="confirm-reset">CHOOSE AN EXPEDITION →</button>'); $('confirm-reset').onclick = resetRun; }

$('begin').onclick = async () => {
  if (busy || state.phase !== 'select' || $('hero-select').dataset.step !== 'dungeon') return;
  const customSeed = $('seed-input').value.trim().toUpperCase();
  if (customSeed) state = createRun(customSeed, state.hero, latestEnemyRoster, state.dungeon || 'crypt');
  start(state); save(); $('hero-select').close(); busy = true; render();
  await renderer.play({ type: 'enter' }); busy = false; render();
};
$('hero-select').addEventListener('cancel', event => event.preventDefault());
$('potion').onclick = async () => { if (busy) return; const heal = drink(state); if (!heal) return; busy = true; save(); render(); await renderer.play({ type: 'heal', heal }); busy = false; render(); toast(`+${heal} health · potion used`); };
$('inventory').onclick = showInventory; $('journal').onclick = showJournal; $('new-run').onclick = newRun;
$('inventory-short').onclick = showInventory;
$('sound').textContent='♫ Audio';
$('sound').setAttribute('aria-label','Music and sound settings');
$('sound').onclick=()=>{
  const prefs=audio.settings;
  modal('<div class="modal-kicker">SET THE MOOD</div><h2>A little dungeon music?</h2><p>Original, gentle adventure music and playful sounds. Your settings stay on this device.</p><div class="audio-settings">'+['music','effects'].map(key=>'<section><label><span>'+ (key==='music'?'Background music':'Game sound effects')+'</span><input type="checkbox" id="audio-'+key+'" '+(prefs[key]?'checked':'')+'></label><label class="audio-volume"><span>Volume</span><input type="range" min="0" max="100" value="'+Math.round(prefs[key+'Volume']*100)+'" id="volume-'+key+'" aria-label="'+key+' volume"><output>'+Math.round(prefs[key+'Volume']*100)+'%</output></label></section>').join('')+'</div><div class="sound-previews" aria-label="Preview action sounds"><button data-preview-sound="attack">⚔ Attack</button><button data-preview-sound="hurt">Hit</button><button data-preview-sound="walk">Door</button><button data-preview-sound="treasure">Treasure</button></div><p id="audio-status" role="status">Music pauses when you leave the dungeon or switch tabs.</p>');
  document.querySelectorAll('[data-preview-sound]').forEach(b=>b.onclick=async()=>{if(!await audio.unlock())return;audio.set('effects',true);$('audio-effects').checked=true;if(audio.settings.effectsVolume===0){audio.set('effectsVolume',.7);$('volume-effects').value=70;$('volume-effects').nextElementSibling.textContent='70%';}audio.effect({type:b.dataset.previewSound});$('audio-status').textContent=b.textContent+' sound preview · effects enabled';});
  ['music','effects'].forEach(key=>{
    $('audio-'+key).onchange=async e=>{const on=e.target.checked;if(on&&!await audio.unlock()){e.target.checked=false;$('audio-status').textContent='Audio is unavailable in this browser.';return;}audio.set(key,on);if(key==='effects'&&on)audio.effect({type:'equip'});};
    $('volume-'+key).oninput=e=>{audio.set(key+'Volume',+e.target.value/100);e.target.nextElementSibling.textContent=e.target.value+'%';};
  });
};
$('help').onclick = () => modal('<div class="modal-kicker">ADVENTURER’S HANDBOOK</div><h2>Your words have consequences.</h2><p>Defeat enemies by reducing their health to zero. A correct answer attacks; a wrong answer makes the enemy retaliate. There is no timer.</p><ul><li><b>Melee:</b> translate Spanish vocabulary.</li><li><b>Spell duels:</b> fill in a missing word in a Spanish sentence.</li><li><b>Treasure and sanctuaries:</b> arrange Spanish words. Treasure grants equipment and a potion; sanctuaries restore 30 HP.</li><li><b>Traps:</b> translate English into Spanish.</li><li><b>Guardian:</b> cycles vocabulary, sentence completion, and word ordering.</li></ul><p>Equip loot in your backpack (I). Weapons improve attacks, armor reduces damage, and charms add passive bonuses. Gold buys potions between rooms. Press H to heal, J for your journal, and 1–4 for answers. Click sentence words to add or remove them.</p><p><b>Choose your dungeon:</b> The Whispering Crypt repeats missed combat questions with +12 recovery attack power. The Mossbound Halls heals 8 health every second consecutive correct answer, but traps deal 4 extra damage. The Runic Depths stores a charge on correct grammar for +18 on the next correct non-grammar combat hit; a mistake loses it.</p><p>Progress saves in this browser. This local version uses a separate save from the original demo. Sound is optional, and reduced-motion settings shorten animations.</p>');
$('credits').onclick = () => modal('<div class="modal-kicker">ART & CREDITS</div><h2>Original art. Open-source roots.</h2><p>The Knight, Ranger, Wizard, cyclopes, and classic slimes use animated artwork generated from their approved character designs. Slimes share identical poses across green, blue, and purple reshades. The Fallen Ranger, Fallen Warrior, and Fallen Wizard use animated poses derived from their approved simplified skeleton artwork. The Kobold Skirmisher, Scout, and Shaman use six animated poses derived from their approved simplified enemy designs. The three goblins use approved single-pose generated illustrations with combat motion and effects. Cindermaw, Rimecoil, and Vesperthorn use six animated poses derived from their approved dragon designs, with procedural fire, blue fire, and acid breath. Other creatures, scenery, and equipment are original RuneSpeak vector artwork. The earlier pixel-art demo used <a href="https://kenney.nl/assets/tiny-dungeon" target="_blank" rel="noopener">Tiny Dungeon by Kenney</a> (CC0 1.0); its original assets and license remain bundled.</p><p>Fonts: Nunito, VT323, MedievalSharp, and Space Grotesk from Google Fonts (SIL Open Font License). System fonts are used if unavailable. RuneSpeak code is MIT licensed.</p>');
$('close-modal').onclick = () => $('modal').close();
document.addEventListener('keydown', event => {
  if (document.body.dataset.view !== 'dungeon' || busy || $('modal').open || $('hero-select').open || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === 'h') $('potion').click(); if (key === 'i') showInventory(); if (key === 'j') showJournal();
  const index = Number(key) - 1;
  if (index >= 0 && index < 4) document.querySelector(state.phase === 'doors' ? `[data-door="${index}"]` : `[data-answer="${index}"]`)?.click();
});
render();
document.addEventListener('runespeak:enter', () => { if(audio.settings.music||audio.settings.effects)audio.unlock(); render(); if (state.phase === 'select') showSelection(); });
