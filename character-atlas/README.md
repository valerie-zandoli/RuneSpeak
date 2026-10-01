# RuneSpeak Character Atlas

Open `character-atlas/index.html` through the game's local server (for example, `http://localhost:4173/character-atlas/index.html`). The static build includes this artifact at the same path.

The atlas reads the live hero/enemy registries and original frame metadata. It expands every slime and cyclops palette into its own appearance, includes all themed monsters and dragon bosses, and fails explicitly if a new enemy needs an artwork adapter.

- Search and collection navigation; optional color-variant hiding.
- Loop all filtered attacks, loop one character, stop all, and adjust playback speed.
- Explore a character in the inspector: attack, hurt, defeat, idle, and hero travel/celebration; loop, pause, scrub, and inspect individual poses.
- Reduced motion disables spatial movement while retaining pose changes initiated by the user. Attack animations start only when requested.
- The original game pose-selection functions control animation timing. Movement is scaled to the atlas stage; this is an artwork reference, not a combat simulator. Goblins use one pose plus motion, and are labeled accordingly.
- Images are cached once, animation uses one shared clock, offscreen drawing pauses, and background tabs do not advance playback.

No game save or audio settings are read or changed. No build dependencies are required.

