import { questions } from './content.js';
import { battleRoster, dragonBosses, cyclopsPalettes, enemyVariantKey, enemyForRoom, latestEnemyRoster } from './enemies.js';
import { dungeons, dungeonFor } from './dungeons.js';

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
  knight: { name: 'The Knight', title: 'Steel & resolve', tile: 97, color: '#4388ce', maxHp: 120, passive: 'Iron resolve', description: 'Block 6 damage from every failed challenge.', detail: '120 health · a forgiving first adventure', weapon: 106 },
  wizard: { name: 'The Wizard', title: 'Words & wonder', tile: 84, color: '#bea1ed', maxHp: 100, passive: 'Fluent fire', description: '+12 damage when you complete a grammar spell.', detail: '100 health · break magical defenses faster', weapon: 130 },
  ranger: { name: 'The Ranger', title: 'Fortune & instinct', tile: 112, color: '#9cd7a7', maxHp: 100, passive: 'Finders keepers', description: 'Find 50% more gold in every encounter.', detail: '100 health · turn gold into extra potions', weapon: 105 },
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
  shop: { name: 'The wandering merchant', label: 'SHOP', mechanic: 'Translate to trade', action: 'Trade', kind: 'reverse', tile: 73, hp: 1, damage: 0, gold: 0, hint: 'Pass a translation challenge to buy relics with gold. Retry or leave freely.' },
  battle: { name: 'Monster lair', label: 'MELEE', mechanic: 'Vocabulary', action: 'Strike', kind: 'vocab', tile: 108, hp: 48, damage: 18, gold: 20, hint: 'Translate the word to land a hit.' },
  spell: { name: 'Spell duel', label: 'SPELL DUEL', mechanic: 'Fill the sentence', action: 'Cast', kind: 'grammar', tile: 121, hp: 36, damage: 20, gold: 26, hint: 'Complete the sentence to cast a spell.' },
  treasure: { name: 'The sealed treasury', label: 'TREASURE', mechanic: 'Word order', action: 'Unlock', kind: 'order', tile: 89, hp: 1, damage: 10, gold: 35, hint: 'Build a sentence to break the chest’s seal.' },
  trap: { name: 'The whispering trap', label: 'TRAP', mechanic: 'Reverse translation', action: 'Disarm', kind: 'reverse', tile: 41, hp: 1, damage: 24, gold: 28, hint: 'Choose the Spanish translation to disarm the trap.' },
  shrine: { name: 'The healing fountain', label: 'SANCTUARY', mechanic: 'Word order', action: 'Restore', kind: 'order', tile: 32, hp: 1, damage: 0, gold: 12, hint: 'Arrange a blessing to restore 30 health.' },
  boss: { name: 'The final champion', label: 'FINAL BOSS', mechanic: 'All three disciplines', action: 'Attack', kind: 'mixed', tile: 110, hp: 132, damage: 25, gold: 90, hint: 'Vocabulary, grammar, and word order. Break every seal.' },
};
const reverseQuestions = questions.filter(q => q.id.startsWith('v')).map(q => ({ ...q, id: `r${q.id.slice(1)}`, kind: 'reverse', prompt: 'Choose the Spanish translation.', es: q.answer, answer: q.es, options: q.options.map(en => questions.find(v => v.id.startsWith('v') && v.answer === en).es) }));
export const challengeBank = [...questions.map(q => ({ ...q, kind: q.id.startsWith('g') ? 'grammar' : q.type === 'order' ? 'order' : 'vocab' })), ...reverseQuestions];
export const room = s => s.levels[s.depth][s.lane];
export const maxHealth = s => heroes[s.hero].maxHp;
export function stats(s) {
  const result = { attack: 26, spell: s.hero === 'wizard' ? 12 : 0, armor: s.hero === 'knight' ? 6 : 0, heal: 0, gold: s.hero === 'ranger' ? .5 : 0 };
  for (const id of Object.values(s.equipment)) { if (!items[id]) continue; for (const key of Object.keys(result)) result[key] += items[id][key] || 0; }
  return result;
}
export function createRun(seed, hero = 'wizard', enemyRoster = latestEnemyRoster, dungeon = null, shopRoutes = 1) {
  if (!heroes[hero]) hero = 'wizard';
  if (dungeon !== null && !Object.hasOwn(dungeons, dungeon)) throw new RangeError('Unknown dungeon');
  const battleEnemies = battleRoster(enemyRoster);
  const levels = Array.from({ length: 9 }, (_, depth) => {
    let trio = shuffle(['battle', 'spell', 'treasure', 'trap', 'shrine', ...(shopRoutes ? ['shop'] : [])], rng(`${seed}:routes:${depth}`)).slice(0, 3);
    if (depth === 0) trio = ['battle', 'battle', 'battle'];
    if (depth === 1) trio = ['spell', 'treasure', 'shrine'];
    if (depth === 8) trio = ['boss', 'boss', 'boss'];
    // Original saves use the unmodified seeded pool. Themed routes have a
    // reliable opportunity to use their quirk without removing other choices.
    const favored = dungeons[dungeon]?.route;
    if (favored && depth > 1 && depth < 8 && !trio.includes(favored)) trio[depth % 3] = favored;
    // Offer a guaranteed mid-run merchant without removing the theme's favored room.
    if (shopRoutes && depth === 3 && !trio.includes('shop')) trio[trio.findIndex(type => type !== favored)] = 'shop';
    return trio.map((type, lane) => ({
      type, variant: Math.floor(rng(`${seed}:${depth}:${lane}`)() * 3),
      ...(['battle', 'spell', 'boss'].includes(type) ? {
        enemyId: type === 'boss' ? dragonBosses[lane].id : battleEnemies[Math.floor(rng(`${seed}:enemy:${depth}:${lane}`)() * battleEnemies.length)].id,
        palette: cyclopsPalettes[Math.floor(rng(`${seed}:palette:${depth}:${lane}`)() * cyclopsPalettes.length)],
      } : {}),
    }));
  });
  return { version: 2, ...(shopRoutes ? { shopRoutes: 1 } : {}), enemyRoster, ...(dungeon ? { dungeon, runeCharge: false, echoQuestionId: null } : {}), seed, hero, levels, depth: 0, lane: 1, hp: heroes[hero].maxHp, gold: 0, potions: 2, streak: 0, bestStreak: 0, correct: 0, attempts: 0, phase: 'select', enemyHp: 48, enemyMax: 48, turn: 0, questionId: null, journal: [], path: [], used: [], inventory: [], equipment: { weapon: null, armor: null, charm: null }, loot: null, feedback: null, log: ['A new adventurer arrives at camp.'] };
}
export function selectDungeon(s, dungeon) {
  if (s.phase !== 'select' || !Object.hasOwn(dungeons, dungeon)) return false;
  Object.assign(s, createRun(s.seed, s.hero, s.enemyRoster ?? 2, dungeon));
  return true;
}
export function selectHero(s, hero) { if (s.phase !== 'select' || !heroes[hero]) return false; s.hero = hero; s.hp = maxHealth(s); return true; }
export function challengeKind(s) { const type = types[room(s).type]; return type.kind === 'mixed' ? ['vocab', 'grammar', 'order'][s.turn % 3] : type.kind; }
function nextQuestion(s) {
  if (s.dungeon === 'crypt' && s.echoQuestionId) { s.questionId = s.echoQuestionId; return; }
  const pool = challengeBank.filter(q => q.kind === challengeKind(s));
  let candidates = pool.filter(q => !s.used.includes(q.id));
  if (!candidates.length) { s.used = s.used.filter(id => !pool.some(q => q.id === id)); candidates = pool.filter(q => q.id !== s.questionId); }
  s.questionId = shuffle(candidates, rng(`${s.seed}:${s.depth}:${s.lane}:${s.attempts}`))[0].id;
}
export function question(s) { const q = challengeBank.find(q => q.id === s.questionId); return q ? { ...q, options: shuffle(q.options, rng(`${s.seed}:${s.questionId}:${s.attempts}`)) } : null; }
// Replay the route so reloads reproduce replacements without trusting saved levels.
function avoidEnemyRepeats(s) {
  let previous = null;
  for (let depth = 0; depth <= s.depth; depth++) {
    const lane = depth === s.depth ? s.lane : s.path[depth];
    const rm = s.levels[depth]?.[lane];
    if (!rm) continue;
    let key = enemyVariantKey(rm);
    if (!key) continue;
    if (key === previous && rm.type !== 'boss') {
      const candidates = battleRoster(s.enemyRoster ?? 1).filter(enemy => enemy.id !== enemyForRoom(rm).id);
      rm.enemyId = candidates[Math.floor(rng(s.seed + ':no-repeat:' + depth + ':' + lane)() * candidates.length)].id;
      key = enemyVariantKey(rm);
    }
    previous = key;
  }
}
function enter(s) {
  avoidEnemyRepeats(s);
  if (s.dungeon) s.echoQuestionId = null;
  const t = types[room(s).type];
  s.enemyMax = t.hp + (['battle', 'spell'].includes(room(s).type) ? Math.floor(s.depth / 3) * 8 : 0);
  s.enemyHp = s.enemyMax; s.turn = 0; s.loot = null; s.feedback = null; s.phase = 'challenge'; nextQuestion(s);
}
export function start(s) { if (s.phase === 'select') { enter(s); addLog(s, `${heroes[s.hero].name} enters ${dungeonFor(s)?.name || 'the dungeon'}.`); } return s; }
export function incomingDamage(s, type = room(s).type) {
  return Math.max(0, types[type].damage + (s.dungeon === 'moss' && type === 'trap' ? 4 : 0) - stats(s).armor);
}
export function attackPower(s, q = question(s)) {
  const bonuses = stats(s);
  return bonuses.attack + (q?.kind === 'grammar' ? bonuses.spell : 0)
    + (s.dungeon === 'crypt' && q && s.echoQuestionId === q.id ? 12 : 0)
    + (s.dungeon === 'runic' && s.runeCharge && q?.kind !== 'grammar' ? 18 : 0);
}
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
  let damage = 0, dealt = 0, heal = 0, gain = 0, quirk = '';
  if (correct) {
    dealt = Math.min(s.enemyHp, combat ? attackPower(s, q) : 1);
    s.enemyHp = Math.max(0, s.enemyHp - dealt);
    const bloom = s.dungeon === 'moss' && s.streak % 2 === 0 ? 8 : 0;
    heal = Math.min(maxHealth(s) - s.hp, bonuses.heal + (type === 'shrine' ? 30 : 0) + bloom); s.hp += heal;
    if (bloom) quirk = 'Living rhythm · healing bloom (+8 health, up to full health).';
    if (s.dungeon === 'crypt' && s.echoQuestionId === q.id) {
      quirk = 'Echo corrected · +12 attack power.'; s.echoQuestionId = null;
    }
    if (s.dungeon === 'runic') {
      if (q.kind === 'grammar') {
        quirk = s.runeCharge ? 'Rune remains charged · charges do not stack.' : 'Rune charged · +18 on your next non-grammar combat hit.';
        s.runeCharge = true;
      } else if (combat && s.runeCharge) {
        s.runeCharge = false; quirk = 'Rune released · +18 attack power.';
      }
    }
  } else {
    damage = incomingDamage(s); s.hp = Math.max(0, s.hp - damage);
    if (s.dungeon === 'crypt' && combat) {
      s.echoQuestionId = q.id; quirk = 'Listen to the echo · this question returns with +12 recovery damage.';
    }
    if (s.dungeon === 'moss') quirk = type === 'trap' ? 'Thorn trap · 4 extra damage. Healing streak reset.' : 'Healing streak reset · start a new pair of correct answers.';
    if (s.dungeon === 'runic' && s.runeCharge) { s.runeCharge = false; quirk = 'Rune charge lost · correct grammar can restore it.'; }
    if (!combat && type !== 'shop') s.enemyHp = 0;
  }
  const cleared = s.enemyHp === 0;
  if (correct && cleared && type !== 'shop') {
    gain = Math.round((t.gold + (s.streak >= 3 ? 5 : 0)) * (1 + bonuses.gold)); s.gold += gain;
    if (type === 'treasure') s.potions++;
    if (type === 'treasure' || s.depth === 0 || (combat && rng(`${s.seed}:drop:${s.depth}:${s.lane}`)() < .55)) dropLoot(s);
  }
  s.feedback = { correct, answer: q.answer, explanation: q.explanation, gain, heal, damage, dealt, cleared, kind: q.kind, ...(quirk ? { quirk } : {}) };
  s.phase = s.hp === 0 ? 'lost' : 'feedback';
  addLog(s, correct ? (combat ? `Hit for ${dealt}${cleared ? ' · enemy defeated' : ''}.` : `${t.action} successful.`) : `${damage ? `Took ${damage} damage` : type === 'shop' ? 'Try the merchant’s translation again' : 'The blessing fades'} · ${q.answer}.`);
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
export function shopStock(s) {
  if (room(s).type !== 'shop') return [];
  return shuffle(Object.keys(items), rng(s.seed + ':shop:' + s.depth + ':' + s.lane)).slice(0, 3)
    .map(id => ({ id, price: items[id].rarity === 'RARE' ? 65 : 40 }));
}
export function buyRelic(s, id) {
  if (s.phase !== 'feedback' || room(s).type !== 'shop' || !s.feedback?.correct || s.enemyHp !== 0) return false;
  const offer = shopStock(s).find(offer => offer.id === id);
  if (!offer || s.inventory.includes(id) || s.gold < offer.price) return false;
  s.gold -= offer.price; s.inventory.push(id);
  addLog(s, 'Bought ' + items[id].name + ' for ' + offer.price + ' gold.');
  return true;
}
export function leaveShop(s) {
  if (room(s).type !== 'shop' || !['challenge', 'feedback'].includes(s.phase)) return false;
  s.phase = 'doors'; s.enemyHp = 0; s.feedback = null;
  return true;
}
export function buyPotion(s) {
  if (s.phase !== 'doors' || s.gold < 40) return false;
  s.gold -= 40; s.potions++; addLog(s, 'Bought a potion for 40 gold.'); return true;
}
export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (s?.hero === 'arcanist') s.hero = 'wizard';
    if (Array.isArray(s?.log)) s.log = s.log.map(line => typeof line === 'string' ? line.replace(/The Arcanist/g, 'The Wizard') : line);
    if (s?.hero === 'hunter') s.hero = 'ranger';
    if (Array.isArray(s?.log)) s.log = s.log.map(line => typeof line === 'string' ? line.replace(/The Treasure Hunter/g, 'The Ranger') : line);
    // Preserve existing expeditions when the hero's public identity changes.
    if (s?.hero === 'warden') {
      s.hero = 'knight';
      if (Array.isArray(s.log)) s.log = s.log.map(line => typeof line === 'string' ? line.replace(/The Warden/g, 'The Knight') : line);
    }
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
    if (s.enemyRoster !== undefined && ![1, 2, 3, 4].includes(s.enemyRoster)) return null;
    if (s.dungeon !== undefined) {
      if (!Object.hasOwn(dungeons, s.dungeon) || typeof s.runeCharge !== 'boolean') return null;
      if (s.runeCharge && s.dungeon !== 'runic') return null;
      if (s.echoQuestionId !== null && (s.dungeon !== 'crypt' || s.echoQuestionId !== s.questionId || !challengeBank.some(q => q.id === s.echoQuestionId))) return null;
    }
    if (s.shopRoutes !== undefined && s.shopRoutes !== 1) return null;
    s.levels = createRun(s.seed, s.hero, s.enemyRoster ?? 1, s.dungeon ?? null, s.shopRoutes ?? 0).levels;
    avoidEnemyRepeats(s);
    return s;
  } catch { return null; }
}
