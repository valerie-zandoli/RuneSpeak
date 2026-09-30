import { writeFile } from 'node:fs/promises';
import { wizardArt, treasureArt } from './ui-art.js';

// Original RuneSpeak assets. Fixed cells also serve existing inventory/hero UI.
const rect=(x,y,w,h,r,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const path=(d,c)=>`<path d="${d}" fill="${c}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const star=path('m50 8 10 27 28 9-28 10-10 28-10-28-28-10 28-9Z','#ffdf69');
const eyes=(y=44)=>rect(32,y,13,19,6,'white')+rect(58,y,13,19,6,'white')+rect(38,y+5,6,11,3,'#493362')+rect(59,y+5,6,11,3,'#493362');
const face=rect(26,28,50,45,20,'#ffcf9d')+eyes(40)+path('M43 63q8 10 16 0Z','#b46d49');
function hero(hunter=false){return rect(22,88,58,7,3,'#d8cce9')+rect(27,59,49,30,12,hunter?'#58a700':'#4aabd3')+rect(24,83,22,9,4,'#493362')+rect(59,83,22,9,4,'#493362')+face+(hunter?path('M16 37Q33 5 73 16L85 38Z','#78c82b')+rect(15,32,72,9,4,'#58a700')+path('M64 22Q60 5 79 5Q83 18 64 22','#ffc800'):rect(24,18,54,25,12,'#a6deed')+rect(23,29,56,13,6,'#69c3df')+rect(49,8,8,28,4,'#ffc800'))+(hunter?rect(21,61,13,19,6,'#58a700')+circle(26,78,6,'#ffcf9d'):path('M13 55h21v21q-10 18-21 0Z','#ffc800'))+(hunter?rect(70,61,13,19,6,'#58a700')+circle(77,78,6,'#ffcf9d'):rect(77,51,8,29,4,'#d5edf3'));}
function monster(color,accent,kind){return rect(19,88,64,7,3,'#c7b6db')+(kind==='bat'?path('M32 37Q2 13 4 61L28 52M68 37Q98 13 96 61L72 52',accent):'')+path('M20 84V49Q20 22 50 22T80 49V84Q65 94 50 86Q35 94 20 84',color)+path(kind==='horn'?'M24 33Q12 6 37 23M65 23Q90 4 77 34':'M24 35L26 13 44 27M58 27 76 13 78 35',accent)+eyes()+path('M40 72q10 8 20 0','#493362')+path('M40 71h7l-3 8ZM54 71h7l-3 8Z','white');}
const assets={
  84:`<svg width="100" height="100" viewBox="0 0 180 190">${wizardArt().split('aria-hidden="true">')[1].replace(/<\/svg>\s*$/,'')}</svg>`,
  97:hero(),112:hero(true),108:monster('#78c82b','#58a700','horn'),124:monster('#ce82ff','#a568cc','bat'),122:monster('#49c4d3','#259bab','ears'),
  121:rect(23,85,55,8,4,'#c7b6db')+path('M18 86L26 42Q30 14 51 14T77 42L85 86 68 80 51 90 35 80Z','#a783e0')+rect(30,39,44,30,15,'#65458b')+eyes(43)+path('m51 13 4 8 8 3-8 4-4 8-4-8-8-4 8-3Z','#ffdf69'),
  110:rect(10,88,80,8,4,'#c7b6db')+rect(13,33,75,57,17,'#a783e0')+rect(2,43,18,36,9,'#9069cd')+rect(82,43,16,36,8,'#9069cd')+rect(22,20,58,48,19,'#c9b2e4')+path('M21 30L15 10 39 20 51 6 64 20 86 10 80 32Z','#ffc800')+eyes(39)+path('M38 37l10 5M58 42l11-5','#493362')+path('m51 65 9 12-9 12-9-12Z','#ffdf69'),
  89:`<svg width="100" height="100" viewBox="0 0 110 90">${treasureArt().split('aria-hidden="true">')[1].replace(/<\/svg>\s*$/,'')}</svg>`,
  91:rect(16,12,68,29,9,'#ffcf46')+rect(23,18,54,18,5,'#7851b0')+rect(13,46,74,39,10,'#ed9315')+rect(12,43,77,11,4,'#ffcf46')+circle(34,44,10,'#ffdf69')+circle(54,41,12,'#ffc800')+circle(72,45,9,'#ffdf69')+rect(40,55,22,20,5,'#fff1ac'),
  32:rect(14,81,74,11,5,'#b398d4')+rect(30,60,42,25,8,'#c9b2e4')+path('M10 48H90Q89 74 50 74T10 48','#a783e0')+rect(17,44,66,10,5,'#6bd7ed')+path('M51 7Q17 42 51 45Q80 43 51 7','#1cb0f6')+path('M49 18Q34 37 49 36','#a6efff'),
  41:rect(7,76,87,13,6,'#b398d4')+path('M13 76L26 33Q29 29 31 34L40 76M37 76L49 22Q52 18 55 24L65 76M62 76L76 34Q79 29 82 35L90 76','#e7ddf1'),
  31:rect(7,76,87,13,6,'#b398d4')+rect(22,68,14,10,4,'#e7ddf1')+rect(47,67,14,11,4,'#e7ddf1')+rect(72,68,14,10,4,'#e7ddf1'),
  106:path('M47 8Q50 3 54 9L64 60H38Z','#a6deed')+rect(27,57,48,10,5,'#ffc800')+rect(45,67,13,25,5,'#9069cd'),
  105:path('M57 14Q67 47 49 64L34 57Z','#9be28a')+rect(27,56,35,9,4,'#58a700')+path('M36 65h15l-7 25H30Z','#9069cd'),
  130:rect(45,25,11,67,5,'#b398d4')+circle(50,25,21,'#9069cd')+path('m50 8 12 17-12 17-12-17Z','#ffdf69'),
  101:path('M16 17Q51 4 86 17V53Q85 80 51 94Q16 80 16 53Z','#ed9315')+path('M26 24Q51 14 76 24V53Q75 72 51 83Q26 72 26 53Z','#ffcf46')+rect(46,25,10,51,5,'#fff1ac'),
  56:path('M16 17Q51 4 86 17V53Q85 80 51 94Q16 80 16 53Z','#9069cd')+path('M26 24Q51 14 76 24V53Q75 72 51 83Q26 72 26 53Z','#c9b2e4')+path('m51 31 14 22-14 22-14-22Z','#fff1ac'),
  116:circle(51,49,35,'#9069cd')+circle(51,49,27,'#c9b2e4')+path('M60 27Q36 48 64 67Q25 69 30 43Q34 28 60 27','#fff1ac'),
  73:circle(51,51,36,'#ed9315')+circle(51,48,34,'#ffc800')+circle(51,48,25,'#ffdf69')+path('m51 30 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2Z','#ed9315'),
  65:rect(20,12,61,79,10,'#b398d4')+rect(26,17,49,66,6,'#e7ddf1')+rect(34,30,32,7,3,'#9069cd')+rect(34,44,24,7,3,'#9069cd')+rect(34,58,30,7,3,'#9069cd'),
  115:rect(39,9,23,15,5,'#ed9315')+path('M35 25H66V42Q89 54 83 77Q77 94 50 94T17 77Q11 54 35 42Z','#ce82ff')+rect(34,23,34,9,4,'#e7ddf1')+rect(27,60,47,7,3,'#e7b7ff')+rect(46,52,9,29,4,'white')+rect(36,62,29,9,4,'white'),
  61:star,24:rect(23,64,53,17,8,'#b398d4'),
};
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1100" viewBox="0 0 1200 1100">${Object.entries(assets).map(([n,art])=>`<g transform="translate(${n%12*100} ${Math.floor(n/12)*100})">${art}</g>`).join('')}</svg>`;
await writeFile('assets/runespeak-atlas.svg',svg);
console.log('Built original RuneSpeak vector atlas');
