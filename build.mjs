import {mkdir,cp,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','viewport.css','learning.css','portal.js','ui-art.js','quiz-engine.js','app.js','audio.js','engine.js','enemies.js','dragon-art.js','cyclops-art.js','goblin-art.js','skeleton-art.js','kobold-art.js','monster-art.js','monster-roster.js','slime-art.js','content.js','renderer.js','weapon-effects.js','knight-art.js','ranger-art.js','wizard-art.js','dungeon-art.js','themed-dungeon-art.js','dungeons.js','dungeons.css','game-window.css','character-atlas','assets'])await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static game built in dist/');
