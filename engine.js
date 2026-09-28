import { questions } from './content.js';

export function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

export const heroes = {
  warden: { name: 'The Warden', title: 'Steel & resolve', tile: 97, color: '#e6c88a', maxHp: 120, passive: 'Iron resolve', description: 'Block 6 damage from every failed challenge.', detail: '120 health · a forgiving first adventure', weapon: 106 },
  arcanist: { name: 'The Arcanist', title: 'Words & wonder', tile: 84, color: '#bea1ed', maxHp: 100, passive: 'Fluent fire', description: '+12 damage when you complete a grammar spell.', detail: '100 health · break magical defenses faster', weapon: 130 },
  hunter: { name: 'The Treasure Hunter', title: 'Fortune & instinct', tile: 112, color: '#9cd7a7', maxHp: 100, passive: 'Finders keepers', description: 'Find 50% more gold in every encounter.', detail: '100 health · turn gold into extra potions', weapon: 105 },
};
export const items = {
  ironblade: { name: 'Ironfang', slot: 'weapon', tile: 106, rarity: 'UNCOMMON', effect: '+8 attack damage', attack: 8, lore: 'A blade that remembers every word.' },
  runestaff: { name: 'Ember staff', slot: 'weapon', tile: 130, rarity: 'RARE', effect: '+16 grammar-spell damage', spell: 16, lore: 'Conjugate. Ignite. Repeat.' },
  thornblade: { name: 'Thorn dagger', slot: 'weapon', tile: 105, rarity: 'RARE', effect: '+12 attack damage', attack: 12, lore: 'Small blade. A very sharp point.' },
  oakshield: { name: 'Oakguard', slot: 'armor', tile: 101, rarity: 'UNCOMMON', effect: 'Block 4 incoming damage', armor: 4, lore: 'Sturdy enough for a few mistakes.' },
  runeshield: { name: 'Runic aegis', slot: 'armor', tile: 56, rarity: 'RARE', effect: 'Block 7 incoming damage', armor: 7, lore: 'Old runes hold the line.' },
  mooncharm: { name: 'Moonstone', slot: 'charm', tile: 116, rarity: 'RARE', effect: 'Heal 4 on every correct answer', heal: 4, lore: 'A little light for the long way home.' },
  goldcharm: { name: 'Lucky doubloon', slot: 'charm', tile: 73, rarity: 'UNCOMMON', effect: '+25% gold rewards', gold: .25, lore: 'Fortune favors the well-spoken.' },
  sagecharm: { name: 'Sage’s tablet', slot: 'charm', tile: 65, rarity: 'RARE', effect: '+10 grammar-spell damage', spell: 10, lore: 'The margins are full of helpful notes.' },
};
export const types = {
  battle: { name: 'Monster lair', label: 'MELEE', mechanic: 'Vocabulary', action: 'Strike', kind: 'vocab', tile: 108, hp: 48, damage: 18, gold: 20, hint: 'Translate the word to land a hit.' },
  spell: { name: 'Spellbound sentinel', label: 'SPELL DUEL', mechanic: 'Fill the sentence', action: 'Cast', kind: 'grammar', tile: 121, hp: 36, damage: 20, gold: 26, hint: 'Complete the sentence to cast a spell.' },
  treasure: { name: 'The sealed treasury', label: 'TREASURE', mechanic: 'Word order', action: 'Unlock', kind: 'order', tile: 89, hp: 1, damage: 10, gold: 35, hint: 'Build a sentence to break the chest’s seal.' },
  trap: { name: 'The whispering trap', label: 'TRAP', mechanic: 'Reverse translation', action: 'Disarm', kind: 'reverse', tile: 41, hp: 1, damage: 24, gold: 28, hint: 'Choose the Spanish translation to disarm the trap.' },
  shrine: { name: 'The healing fountain', label: 'SANCTUARY', mechanic: 'Word order', action: 'Restore', kind: 'order', tile: 32, hp: 1, damage: 0, gold: 12, hint: 'Arrange a blessing to restore 30 health.' },
  boss: { name: 'The Rune Guardian', label: 'FINAL BOSS', mechanic: 'All three disciplines', action: 'Attack', kind: 'mixed', tile: 110, hp: 132, damage: 25, gold: 90, hint: 'Vocabulary, grammar, and word order. Break every seal.' },
};
const reverseQuestions = questions.filter(q => q.id.startsWith('v')).map(q => ({ ...q, id: `r${q.id.slice(1)}`, kind: 'reverse', prompt: 'Choose the Spanish translation.', es: q.answer, answer: q.es, options: q.options.map(en => questions.find(v => v.id.startsWith('v') && v.answer === en).es) }));
export const challengeBank = [...questions.map(q => ({ ...q, kind: q.id.startsWith('g') ? 'grammar' : q.type === 'order' ? 'order' : 'vocab' })), ...reverseQuestions];
export const room = s => s.levels[s.depth][s.lane];
export const maxHealth = s => heroes[s.hero].maxHp;
export function stats(s) {
  const result = { attack: 26, spell: s.hero === 'arcanist' ? 12 : 0, armor: s.hero === 'warden' ? 6 : 0, heal: 0, gold: s.hero === 'hunter' ? .5 : 0 };
  for (const id of Object.values(s.equipment)) { if (!items[id]) continue; for (const key of Object.keys(result)) result[key] += items[id][key] || 0; }
  return result;
}
export function createRun(seed, hero = 'arcanist') {
  if (!heroes[hero]) hero = 'arcanist';
  const levels = Array.from({ length: 9 }, (_, depth) => {
    let trio = shuffle(['battle', 'spell', 'treasure', 'trap', 'shrine'], rng(`${seed}:routes:${depth}`)).slice(0, 3);
    if (depth === 0) trio = ['battle', 'battle', 'battle'];
    if (depth === 1) trio = ['spell', 'treasure', 'shrine'];
    if (depth === 8) trio = ['boss', 'boss', 'boss'];
    return trio.map((type, lane) => ({ type, variant: Math.floor(rng(`${seed}:${depth}:${lane}`)() * 3) }));
  });
  return { version: 2, seed, hero, levels, depth: 0, lane: 1, hp: heroes[hero].maxHp, gold: 0, potions: 2, streak: 0, bestStreak: 0, correct: 0, attempts: 0, phase: 'select', enemyHp: 48, enemyMax: 48, turn: 0, questionId: null, journal: [], path: [], used: [], inventory: [], equipment: { weapon: null, armor: null, charm: null }, loot: null, feedback: null, log: ['A new adventurer arrives at the crypt.'] };
}
export function selectHero(s, hero) { if (s.phase !== 'select' || !heroes[hero]) return false; s.hero = hero; s.hp = maxHealth(s); return true; }
export function challengeKind(s) { const type = types[room(s).type]; return type.kind === 'mixed' ? ['vocab', 'grammar', 'order'][s.turn % 3] : type.kind; }
function nextQuestion(s) {
  const pool = challengeBank.filter(q => q.kind === challengeKind(s));
  let candidates = pool.filter(q => !s.used.includes(q.id));
  if (!candidates.length) { s.used = s.used.filter(id => !pool.some(q => q.id === id)); candidates = pool.filter(q => q.id !== s.questionId); }
  s.questionId = shuffle(candidates, rng(`${s.seed}:${s.depth}:${s.lane}:${s.attempts}`))[0].id;
}
export function question(s) { const q = challengeBank.find(q => q.id === s.questionId); return q ? { ...q, options: shuffle(q.options, rng(`${s.seed}:${s.questionId}:${s.attempts}`)) } : null; }
function enter(s) {
  const t = types[room(s).type];
  s.enemyMax = t.hp + (['battle', 'spell'].includes(room(s).type) ? Math.floor(s.depth / 3) * 8 : 0);
  s.enemyHp = s.enemyMax; s.turn = 0; s.loot = null; s.feedback = null; s.phase = 'challenge'; nextQuestion(s);
}
export function start(s) { if (s.phase === 'select') { enter(s); addLog(s, `${heroes[s.hero].name} enters the dungeon.`); } return s; }
function addLog(s, text) { s.log = [...s.log, text].slice(-5); }
function dropLoot(s) {
  const available = Object.keys(items).filter(id => !s.inventory.includes(id));
  if (!available.length) return;
  const pool = s.depth === 0 ? available.filter(id => items[id].slot === 'weapon') : available;
  const id = shuffle(pool, rng(`${s.seed}:loot:${s.depth}:${s.lane}`))[0];
  s.inventory.push(id); s.loot = id; addLog(s, `Found ${items[id].name}.`);
}
export function answer(s, value) {
  if (s.phase !== 'challenge') return null;
  const q = question(s), type = room(s).type, t = types[type], bonuses = stats(s);
  const correct = value === q.answer, combat = ['battle', 'spell', 'boss'].includes(type);
  s.attempts++; s.correct += Number(correct); s.streak = correct ? s.streak + 1 : 0; s.bestStreak = Math.max(s.bestStreak, s.streak); s.used.push(q.id); s.journal.push({ id: q.id, correct });
  let damage = 0, dealt = 0, heal = 0, gain = 0;
  if (correct) {
    dealt = Math.min(s.enemyHp, combat ? bonuses.attack + (q.kind === 'grammar' ? bonuses.spell : 0) : 1);
    s.enemyHp = Math.max(0, s.enemyHp - dealt);
    heal = Math.min(maxHealth(s) - s.hp, bonuses.heal + (type === 'shrine' ? 30 : 0)); s.hp += heal;
  } else {
    damage = Math.max(0, t.damage - bonuses.armor); s.hp = Math.max(0, s.hp - damage);
    if (!combat) s.enemyHp = 0;
  }
  const cleared = s.enemyHp === 0;
  if (correct && cleared) {
    gain = Math.round((t.gold + (s.streak >= 3 ? 5 : 0)) * (1 + bonuses.gold)); s.gold += gain;
    if (type === 'treasure') s.potions++;
    if (type === 'treasure' || s.depth === 0 || (combat && rng(`${s.seed}:drop:${s.depth}:${s.lane}`)() < .55)) dropLoot(s);
  }
  s.feedback = { correct, answer: q.answer, explanation: q.explanation, gain, heal, damage, dealt, cleared, kind: q.kind };
  s.phase = s.hp === 0 ? 'lost' : 'feedback';
  addLog(s, correct ? (combat ? `Hit for ${dealt}${cleared ? ' · enemy defeated' : ''}.` : `${t.action} successful.`) : `${damage ? `Took ${damage} damage` : 'The blessing fades'} · ${q.answer}.`);
  return { type: correct ? (combat ? 'attack' : type) : 'hurt', correct, kind: q.kind, dealt, damage, heal, gain, cleared, loot: s.loot, encounter: type };
}
export function proceed(s) {
  if (s.phase !== 'feedback') return false;
  if (s.enemyHp > 0) { s.turn++; s.phase = 'challenge'; s.feedback = null; nextQuestion(s); }
  else if (s.depth === 8) { s.phase = 'won'; s.path.push(s.lane); }
  else s.phase = 'doors';
  return true;
}
export function choose(s, lane) {
  if (s.phase !== 'doors' || !Number.isInteger(lane) || lane < 0 || lane > 2) return false;
  s.path.push(s.lane); s.depth++; s.lane = lane; enter(s); addLog(s, `Entered ${types[room(s).type].name.toLowerCase()}.`); return true;
}
export function equip(s, id) {
  if (!s.inventory.includes(id) || !items[id] || ['select', 'won', 'lost'].includes(s.phase)) return false;
  const item = items[id]; s.equipment[item.slot] = s.equipment[item.slot] === id ? null : id;
  addLog(s, `${s.equipment[item.slot] ? 'Equipped' : 'Unequipped'} ${item.name}.`); return true;
}
export function drink(s) {
  if (!s.potions || s.hp >= maxHealth(s) || ['select', 'won', 'lost'].includes(s.phase)) return 0;
  const heal = Math.min(35, maxHealth(s) - s.hp); s.hp += heal; s.potions--; addLog(s, `Drank a potion · +${heal} health.`); return heal;
}
export function buyPotion(s) {
  if (s.phase !== 'doors' || s.gold < 40) return false;
  s.gold -= 40; s.potions++; addLog(s, 'Bought a potion for 40 gold.'); return true;
}
export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 2 || typeof s.seed !== 'string' || s.seed.length > 32 || !heroes[s.hero]) return null;
    if (!['select', 'challenge', 'feedback', 'doors', 'won', 'lost'].includes(s.phase)) return null;
    for (const key of ['depth', 'lane', 'hp', 'gold', 'potions', 'streak', 'bestStreak', 'correct', 'attempts', 'enemyHp', 'enemyMax', 'turn']) if (!Number.isSafeInteger(s[key]) || s[key] < 0) return null;
    if (s.depth > 8 || s.lane > 2 || s.hp > maxHealth(s) || s.enemyHp > s.enemyMax) return null;
    for (const key of ['inventory', 'journal', 'path', 'used', 'log']) if (!Array.isArray(s[key])) return null;
    if (s.inventory.some(id => !items[id]) || !s.equipment) return null;
    for (const slot of ['weapon', 'armor', 'charm']) { const id = s.equipment[slot]; if (id !== null && (!s.inventory.includes(id) || items[id].slot !== slot)) return null; }
    if (s.phase !== 'select' && !challengeBank.some(q => q.id === s.questionId)) return null;
    if (['feedback', 'lost'].includes(s.phase) && (!s.feedback || typeof s.feedback.correct !== 'boolean')) return null;
    if (s.loot !== null && !s.inventory.includes(s.loot)) return null;
    s.levels = createRun(s.seed, s.hero).levels; return s;
  } catch { return null; }
}
