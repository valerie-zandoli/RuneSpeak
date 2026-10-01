// Stable IDs are saved with an expedition. Missing IDs mean the original tour.
export const dungeons = {
  crypt: {
    name: 'The Whispering Crypt', biome: 0, color: '#9069cd',
    trait: 'Second chance', focus: 'Learn from echoes', route: 'trap',
    description: 'Missed combat questions repeat. Correct the echo for +12 damage.',
    tradeoff: 'More trap passages. Echoes only help in combat.',
  },
  moss: {
    name: 'The Mossbound Halls', biome: 1, color: '#56854e',
    trait: 'Living rhythm', focus: 'Build a healing streak', route: 'shrine',
    description: 'Every second correct answer in a streak restores 8 health.',
    tradeoff: 'More shrines, but thorn traps deal 4 extra damage.',
  },
  runic: {
    name: 'The Runic Depths', biome: 2, color: '#477caf',
    trait: 'Stored magic', focus: 'Charge your next strike', route: 'spell',
    description: 'Correct grammar stores +18 damage for your next correct non-grammar combat answer.',
    tradeoff: 'More spell passages. A mistake loses your charge; charges do not stack.',
  },
};

export const dungeonFor = s => dungeons[s.dungeon] || null;
export const dungeonBiome = s => dungeonFor(s)?.biome ?? Math.floor(s.depth / 3);
export function dungeonStatus(s) {
  if (s.dungeon === 'crypt') return s.echoQuestionId ? 'Echo ready · correct this question for +12 damage.' : 'Missed combat questions echo back with +12 recovery damage.';
  if (s.dungeon === 'moss') return `${s.streak % 2 ? '1 correct answer' : '2 correct answers'} until the next +8 health bloom. Thorn traps: +4 damage.`;
  if (s.dungeon === 'runic') return s.runeCharge ? 'Rune charged · next correct non-grammar combat hit gets +18 damage.' : 'Answer grammar correctly to store +18 damage. Mistakes lose the charge.';
  return 'Original expedition · travel through all three regions.';
}
