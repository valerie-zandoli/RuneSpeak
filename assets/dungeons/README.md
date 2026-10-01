# Dungeon background direction

`approved-concepts.png` is the user's approved concept board generated with the built-in image tool on October 1, 2026. The final revision requested a small increase in detail while retaining RuneSpeak's rounded geometry, pastel fills and clear combat floor.

The runtime art is an editable Canvas 2D adaptation in `themed-dungeon-art.js`, not a stretched concept-board image. It preserves the three palettes and visual motifs: memorials, candles and cobwebs; roots, moss and mushrooms; and crystals, pillar runes and a gold seal. Emblems are positioned between doorways to leave room for the encounter title. Door centers remain at x=264, 480 and 696 in the existing 960×480 scene so travel animations align with the entrances.

`paintDungeon` supplies both the selection-card previews and gameplay background. Opening doors and subtle flame/spider motion use the existing animation clock; reduced motion passes time=0. `paintAtmosphere` supplies restrained themed particles and encounter rings. No external image/font assets are required by this scenery.

The original `dungeon-art.js` remains in use for saved expeditions without a dungeon ID. New expeditions store a stable dungeon ID and use the new renderer for all nine rooms.
