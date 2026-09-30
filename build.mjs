import {mkdir,cp,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','viewport.css','learning.css','portal.js','ui-art.js','quiz-engine.js','app.js','audio.js','engine.js','content.js','renderer.js','dungeon-art.js','assets'])await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static game built in dist/');
