import {mkdir,cp,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','viewport.css','app.js','engine.js','content.js','renderer.js','assets'])await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static game built in dist/');

