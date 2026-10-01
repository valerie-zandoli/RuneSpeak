# Approved dungeon monsters

27 variants in nine families, generated with the built-in image tool from user-approved RuneSpeak character concepts. The user approved all designs and requested animation and game integration. Animation prompts are retained alongside the artwork.

Crypt: Candlewisps, Vault Mimics, Belfry Bats. Mossbound: Sporecaps, Bramblekin, Lantern Snails. Runic: Runestone Golems, Crystal Scarabs, Spellbook Snappers. Each family has three variants with idle, anticipation, attack, recovery, hurt and defeat poses.

`frames.js` contains measured source rectangles and anchors **relative to each rectangle**, not absolute sheet coordinates. Mossbound poses are individual PNGs extracted from connected components with original RGBA preserved, preventing neighboring poses from entering the crops. Other families use measured crops from the original sheets. Keep the fixed per-variant scale across all six poses; do not normalize each pose independently. Grimoire anchors follow its lower cover rather than its tongue.

Artwork loads only when its monster is encountered. The game uses close-range strikes, six-pose event timing, a defeat fade, shared combat audio and static reduced-motion reactions. Combat stats, rewards and question rules remain room-based.

Roster 5 adds these monsters to their home dungeon while retaining the existing enemies. Unthemed expeditions include all variants. Rosters 1–4 retain their seed ordering and encounter pools, including when a saved run is restored.
