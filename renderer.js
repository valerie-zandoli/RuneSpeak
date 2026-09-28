import {room,types,rng} from './engine.js';
export function createRenderer(canvas,getState){const ctx=canvas.getContext('2d'),img=new Image();img.src='assets/dungeon.png';let raf;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tile(n,x,y,size=48){ctx.drawImage(img,n%12*16,Math.floor(n/12)*16,16,16,x,y,size,size);}function draw(time=0){const s=getState();if(!img.complete||!img.naturalWidth){raf=requestAnimationFrame(draw);return;}ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111b20';ctx.fillRect(0,0,768,432);const r=rng(s.seed+':'+s.depth+':'+s.lane);const t=time/1000;
 // A tiled room, built from Kenney's original CC0 pixel art.
 for(let y=0;y<9;y++)for(let x=0;x<16;x++){if(y>=3&&x>0&&x<15){tile([48,48,49,50,51][Math.floor(r()*5)],x*48,y*48);}}
 ctx.fillStyle='#17292be0';ctx.fillRect(48,144,672,288);
 for(let x=0;x<16;x++){tile(14,x*48,48);tile(14,x*48,96);tile(26,x*48,144);}
 for(let y=0;y<9;y++){tile(y<3?14:40,0,y*48);tile(y<3?14:40,720,y*48);}
 ctx.fillStyle='#101b2070';ctx.fillRect(0,0,768,192);
 [192,360,528].forEach((x,i)=>{tile(9,x,96);tile(s.phase==='doors'?21:45,x,144);tile(48,x,192);ctx.fillStyle='#1b2d2ad9';ctx.fillRect(x,192,48,48);if(s.phase==='doors'){ctx.fillStyle='#abdcb323';ctx.fillRect(x,172,48,85);}});
 [96,624].forEach(x=>{tile(28,x,144);tile(29,x,144);const glow=ctx.createRadialGradient(x+24,164,0,x+24,164,105);glow.addColorStop(0,`rgba(249,166,69,${.21+(reduced?0:Math.sin(t*5+x)*.025)})`);glow.addColorStop(1,'rgba(249,166,69,0)');ctx.fillStyle=glow;ctx.fillRect(x-90,50,230,240);});
 // Furniture and rubble vary with the room seed, without flickering frame to frame.
 tile(82,74,255);tile(81,650,261);tile(24,120+Math.floor(r()*2)*48,330);tile(24,560,350);tile(19,48,96);tile(20,672,96);
 const bob=reduced?0:Math.round(Math.sin(t*2.7)*2);ctx.fillStyle='#090f1777';ctx.beginPath();ctx.ellipse(244,339,24,9,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(507,287,29,10,0,0,7);ctx.fill();
 tile(84,216,281+bob,64);const rm=room(s);const enemy=rm.type==='battle'?[108,121,124][rm.variant]:types[rm.type].tile;tile(enemy,475,220-bob,rm.type==='boss'?80:64);
 if(rm.type==='shrine'){const g=ctx.createRadialGradient(506,256,2,506,256,80);g.addColorStop(0,'#78e5c044');g.addColorStop(1,'#78e5c000');ctx.fillStyle=g;ctx.fillRect(420,170,180,180);}
 ctx.fillStyle='#b4dabc';for(let i=0;i<11;i++){const x=80+r()*610,y=190+r()*190;ctx.globalAlpha=.15+.2*Math.sin(t+i)**2;ctx.fillRect(x,y-(reduced?0:Math.sin(t*.6+i)*6),2,2);}ctx.globalAlpha=1;
 const vignette=ctx.createRadialGradient(384,250,90,384,250,430);vignette.addColorStop(0,'#09131a00');vignette.addColorStop(1,'#09131acc');ctx.fillStyle=vignette;ctx.fillRect(0,0,768,432);raf=requestAnimationFrame(draw);}
 img.onload=()=>{cancelAnimationFrame(raf);draw();};img.onerror=()=>{ctx.fillStyle='#eee9dc';ctx.fillText('Dungeon artwork could not load. Challenges still work.',40,230);};draw();return()=>cancelAnimationFrame(raf);}
