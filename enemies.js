import { monsterEnemies } from './monster-roster.js';

// Choose models before palettes so recolors do not crowd the original enemies out.
export const cyclopsPalettes = ['teal', 'moss', 'violet', 'ember'];
export const slimeModels = ['jelly', 'droplet', 'puddle'];
export const slimePalettes = ['green', 'blue', 'purple'];
export const battleEnemies = [
  { id: 'slime', name: 'Crypt Slime', tile: 108 },
  { id: 'cyclops-clubber', name: 'Cyclops Clubber', model: 'clubber', tile: 122 },
  { id: 'cyclops-rockthrower', name: 'Cyclops Rockthrower', model: 'rockthrower', tile: 122 },
  { id: 'cyclops-ironhide', name: 'Cyclops Ironhide', model: 'ironhide', tile: 122 },
  { id: 'goblin-skirmisher', name: 'Goblin Skirmisher', goblin: 'skirmisher', tile: 124 },
  { id: 'goblin-shaman', name: 'Goblin Shaman', goblin: 'shaman', tile: 121 },
  { id: 'goblin-fighter', name: 'Goblin Fighter', goblin: 'fighter', tile: 122 },
  { id: 'fallen-ranger', name: 'Fallen Ranger', skeleton: 'ranger', tile: 124 },
  { id: 'fallen-warrior', name: 'Fallen Warrior', skeleton: 'warrior', tile: 122 },
  { id: 'fallen-wizard', name: 'Fallen Wizard', skeleton: 'wizard', tile: 121 },
  { id: 'kobold-skirmisher', name: 'Kobold Skirmisher', kobold: 'skirmisher', tile: 124 },
  { id: 'kobold-scout', name: 'Kobold Scout', kobold: 'scout', tile: 124 },
  { id: 'kobold-shaman', name: 'Kobold Shaman', kobold: 'shaman', tile: 121 },
  ...monsterEnemies,
];

// Preserve legacy seed slots while replacing retired enemies.
const rosterOneIds = ['slime', 'reaper', 'brute', 'cyclops-clubber', 'cyclops-rockthrower', 'cyclops-ironhide'];
const rosterTwoIds = [...rosterOneIds, 'goblin-skirmisher', 'goblin-shaman', 'goblin-fighter'];
const rosterThreeIds = ['slime', 'cyclops-clubber', 'cyclops-rockthrower', 'cyclops-ironhide',
  'goblin-skirmisher', 'goblin-shaman', 'goblin-fighter', 'fallen-ranger', 'fallen-warrior', 'fallen-wizard'];
const rosterFourIds = [...rosterThreeIds, 'kobold-skirmisher', 'kobold-scout', 'kobold-shaman'];
export const latestEnemyRoster = 5;
export function battleRoster(version = latestEnemyRoster, dungeon = null) {
  const ids = version === 1 ? rosterOneIds : version === 2 ? rosterTwoIds : version === 3 ? rosterThreeIds : version === 4 ? rosterFourIds : null;
  return ids ? ids.map(id => battleEnemies.find(enemy => enemy.id === ({ reaper: 'goblin-skirmisher', brute: 'cyclops-clubber' }[id] || id))) : battleEnemies.filter(enemy => !dungeon || !enemy.monster || enemy.dungeon === dungeon);
}

export const dragonBosses = [
  { id: 'cindermaw', name: 'Cindermaw', dragon: 'cindermaw', breath: 'fire', breathLabel: 'Fire breath', tile: 110 },
  { id: 'rimecoil', name: 'Rimecoil', dragon: 'rimecoil', breath: 'blue-fire', breathLabel: 'Blue fire breath', tile: 110 },
  { id: 'vesperthorn', name: 'Vesperthorn', dragon: 'vesperthorn', breath: 'acid', breathLabel: 'Acid breath', tile: 110 },
];

export function enemyForRoom(room) {
  if (room.type === 'boss') return dragonBosses.find(enemy => enemy.id === room.enemyId)
    || dragonBosses[Number.isInteger(room.variant) ? ((room.variant % 3) + 3) % 3 : 0];
  if (!['battle', 'spell', 'boss'].includes(room.type)) return null;
  const enemy = battleEnemies.find(enemy => enemy.id === room.enemyId)
    || battleEnemies[Number.isInteger(room.variant) && room.variant >= 0 && room.variant < 3 ? room.variant : 0];
  if (enemy.id === 'slime') {
    // Reuse seeded room fields, preserving encounter odds and existing saves.
    const slimeModel = slimeModels[room.variant] || 'jelly';
    const palette = slimePalettes.includes(room.palette) ? room.palette
      : ({ teal: 'green', moss: 'green', ember: 'blue', violet: 'purple' }[room.palette] || 'green');
    const name = { jelly: 'Round Jelly Slime', droplet: 'Tall Droplet Slime', puddle: 'Wide Puddle Slime' }[slimeModel];
    return { ...enemy, name, slimeModel, palette };
  }
  return { ...enemy, palette: cyclopsPalettes.includes(room.palette) ? room.palette : 'teal' };
}

// Only visible differences count: goblin/skeleton palettes are not recolors.
export function enemyVariantKey(room) {
  const enemy = enemyForRoom(room);
  return enemy ? [enemy.id, enemy.slimeModel || '', enemy.model || enemy.slimeModel ? enemy.palette : ''].join(':') : null;
}

export function enemyLabel(room) {
  const enemy = enemyForRoom(room);
  if (!enemy) return '';
  return enemy.model || enemy.slimeModel ? enemy.palette[0].toUpperCase() + enemy.palette.slice(1) + ' ' + enemy.name : enemy.name;
}

export function cyclopsSheet(model, palette = 'teal') {
  if (!battleEnemies.some(enemy => enemy.model === model)) return null;
  return 'assets/cyclops/' + model + '-' + (cyclopsPalettes.includes(palette) ? palette : 'teal') + '.png';
}
