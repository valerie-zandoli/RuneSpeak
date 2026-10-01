// Canvas adaptation of the approved October 2026 concept board.
// Door centers and thresholds match the renderer's walking animation.
const palettes = [
  { wall: '#e6daf5', stone: '#c9afe4', shade: '#ac8acb', floor: '#f1e9fb', door: '#9973bb', dark: '#765498', light: '#e0cdf2' },
  { wall: '#dcebd5', stone: '#b6cdae', shade: '#87a783', floor: '#edf5e7', door: '#70956d', dark: '#507650', light: '#d8e7ce' },
  { wall: '#d5e8f8', stone: '#aac9e9', shade: '#7ea4d0', floor: '#eaf5fe', door: '#6089b8', dark: '#426c9b', light: '#cde4f7' },
];
function shapes(ctx) {
  return {
    box(x,y,w,h,r,c) { ctx.fillStyle=c; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); },
    oval(x,y,rx,ry,c) { ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); },
    line(points,c,width=3) { ctx.strokeStyle=c; ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); },
    polygon(points,c) { ctx.fillStyle=c; ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fill(); },
  };
}
function crystal(ctx,x,y,size) {
  const {polygon}=shapes(ctx);
  polygon([[x,y-size],[x-size*.3,y-size*.48],[x-size*.24,y],[x+size*.24,y],[x+size*.3,y-size*.48]],'#73def5');
  polygon([[x,y-size],[x,y],[x-size*.24,y],[x-size*.3,y-size*.48]],'#b6f5ff');
  polygon([[x,y-size*.4],[x+size*.3,y-size*.48],[x+size*.24,y],[x,y]],'#40b6e3');
}
function leaf(ctx,x,y,size,angle,color) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,-size); ctx.quadraticCurveTo(size,size*.15,0,size); ctx.quadraticCurveTo(-size,size*.15,0,-size); ctx.fill();
  shapes(ctx).line([[0,-size*.5],[0,size*.6]],'#507e5644',2); ctx.restore();
}
function flame(ctx,x,y,time) {
  const {polygon,oval}=shapes(ctx), sway=Math.sin(time*5+x)*2;
  polygon([[x+sway,y-26],[x-12,y-6],[x-13,y+7],[x,y+14],[x+13,y+7],[x+12,y-6]],'#ffbc15');
  oval(x,y+4,12,11,'#ffbc15'); oval(x,y+4,6,9,'#fff1ac');
}
export function paintDungeon(ctx, biome, open = false, time = 0) {
  ctx.save();
  const p=palettes[biome] || palettes[0], {box,oval,line,polygon}=shapes(ctx);
  box(0,0,960,480,0,p.wall);
  // Leave the top-center clear for the encounter title overlay.
  const bricks=[[18,92,54],[140,42,64],[333,77,57],[579,92,62],[780,56,65],[881,103,61],[119,119,46],[346,184,62],[549,142,56],[796,214,54],[10,214,45],[882,164,54],[365,27,43],[568,30,42]];
  for(const [x,y,w] of bricks){box(x,y,w,24,7,p.stone);box(x+7,y+5,w*.48,4,2,p.light);}
  box(0,255,960,12,0,p.shade); box(0,267,960,213,0,p.floor); box(0,267,960,8,0,p.light);
  for(const [x,y,w] of [[22,330,70],[126,420,57],[360,338,52],[461,415,78],[797,370,67],[883,442,42],[530,305,49],[38,455,33],[805,310,36]]) box(x,y,w,9,5,p.wall);
  [264,480,696].forEach((x,i)=>{
    box(x-62,111,124,158,[62,62,5,5],p.shade);
    box(x-43,130,86,137,[43,43,0,0],p.dark);
    for(const side of [-1,1]) for(let j=0;j<3;j++) box(x+(side<0?-62:44),175+j*29,18,26,5,p.stone);
    for(let j=0;j<5;j++) {
      const a=Math.PI+j*Math.PI/5+.035,b=Math.PI+(j+1)*Math.PI/5-.035;
      ctx.fillStyle=j%2?p.shade:p.stone; ctx.beginPath(); ctx.arc(x,174,62,a,b);ctx.arc(x,174,45,b,a,true);ctx.closePath();ctx.fill();
    }
    box(x-10,114,20,5,3,p.light);
    if(open) {
      box(x-32,140,64,126,[32,32,0,0],p.door);box(x-19,157,38,109,[19,19,0,0],p.shade);
      box(x-11,183,22,83,[11,11,0,0],p.light);
      box(x-15,93,30,27,9,'#ffffff'); ctx.fillStyle=p.dark;ctx.font='900 17px Nunito, sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),x,112);
    } else {
      box(x-38,136,76,130,[38,38,0,0],p.door);
      for(const dx of [-15,0,15]) box(x+dx-2,dx===0?139:145,4,121,2,p.shade);
      for(const y of [190,237]) {box(x-37,y,12,16,4,p.dark);oval(x-31,y+6,2,2,p.shade);}
      oval(x+24,216,6,6,'#ffdc69');oval(x+22,214,2,2,'#fff0b6');
    }
    box(x-64,266,128,10,5,p.stone);box(x-70,276,140,9,5,p.shade);
  });
  for(const x of [79,881]) {
    box(x-19,63,38,212,8,p.stone);box(x-9,75,9,188,4,p.light);
    box(x-37,42,74,21,8,p.shade);box(x-31,64,62,7,3,p.stone);box(x-27,73,54,6,3,p.shade);
    box(x-29,263,58,8,3,p.stone);box(x-36,273,72,14,6,p.shade);box(x-26,276,32,4,2,p.stone);
  }
  if(biome===0) {
    for(const [x,skull] of [[18,false],[919,true]]) {
      box(x-11,220,44,62,[17,17,4,4],p.shade);box(x-6,224,34,54,[14,14,3,3],p.stone);
      if(skull){oval(x+11,239,11,11,p.door);oval(x+7,238,3,4,p.light);oval(x+15,238,3,4,p.light);box(x+5,246,12,5,2,p.door);}
      else{line([[x+11,233],[x+11,250]],p.door,4);line([[x+4,239],[x+18,239]],p.door,4);}
      line([[x+2,259],[x+20,259]],p.door,3);polygon([[x+11,265],[x+16,270],[x+11,275],[x+6,270]],p.door);
    }
    box(120,251,63,9,4,p.shade);
    for(const [x,h] of [[132,23],[149,17],[166,27]]) {
      box(x-5,250-h,11,h,3,'#ffe6a0');box(x-5,250-h,11,5,2,'#fff5cc');box(x-2,250-h,3,10,2,'#fff5cc');oval(x,244-h,3,5,'#ffbf25');
    }
    for(const x of [152,808]){box(x-6,187,12,29,4,p.shade);box(x-17,187,34,10,4,p.door);box(x-3,193,6,14,3,'#ffd46b');flame(ctx,x,169,time);}
    oval(367,127,17,20,p.door);oval(376,120,15,18,p.wall);
    for(const end of [[883,0],[907,35],[950,62]]) line([[959,0],end],p.shade,2);
    line([[924,0],[930,16],[943,25],[959,29]],p.shade,2);line([[900,0],[910,31],[933,45],[959,48]],p.shade,2);
    const sy=96+(time?Math.sin(time)*3:0);line([[945,46],[945,sy]],p.shade,2);oval(945,sy,6,7,p.door);
    for(const side of [-1,1]) for(const dy of [-3,3]) line([[945+side*3,sy+dy],[945+side*10,sy+dy+3],[945+side*10,sy+dy+6]],p.door,2);
  } else if(biome===1) {
    for(const [x,flip] of [[79,1],[881,-1]]) {
      ctx.strokeStyle='#b39270';ctx.lineWidth=20;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,266);ctx.bezierCurveTo(x-50*flip,210,x+60*flip,200,x+10*flip,150);ctx.bezierCurveTo(x-42*flip,108,x+24*flip,98,x+15*flip,85);ctx.stroke();
      for(const [dx,y,a] of [[-25,225,-.5],[31,174,.65],[-20,127,-.7]]) leaf(ctx,x+dx*flip,y,13,a*flip,'#6ea353');
    }
    for(const x of [175,787]) {
      line([[x,0],[x+3,48],[x-2,95]],'#7b9c58',4);
      for(let j=0;j<4;j++) leaf(ctx,x+(j%2?8:-8),14+j*23,11,j%2?.5:-.5,j%2?'#76a35a':'#8bb661');
    }
    for(const x of [244,474,702]) for(let j=0;j<3;j++) {oval(x+j*12,120+(j%2)*6,13,9,'#9ec667');oval(x+j*12-3,117+(j%2)*6,4,3,'#b3d57c');}
    for(const [x,flip] of [[28,1],[925,-1]]) {
      leaf(ctx,x,268,23,-.4*flip,'#568d4e');leaf(ctx,x+19*flip,271,19,.4*flip,'#78a85c');line([[x+28*flip,279],[x+44*flip,231]],'#6c985d',3);
      for(let j=0;j<4;j++) {leaf(ctx,x+(32+j*3)*flip,267-j*10,7,-.8*flip,'#6c985d');leaf(ctx,x+(42+j*3)*flip,265-j*10,7,.6*flip,'#6c985d');}
    }
    for(const [x,y,size] of [[928,254,17],[910,273,11]]) {
      box(x-4,y,8,26,4,'#fff0be');ctx.fillStyle='#ed9a50';ctx.beginPath();ctx.arc(x,y,size,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();oval(x-5,y-6,3,2,'#ffe1a4');oval(x+5,y-8,3,2,'#ffe1a4');
    }
    oval(120,284,13,8,p.shade);oval(120,281,7,3,p.light);
  } else {
    for(const x of [79,881]) {
      box(x-27,69,54,3,2,'#f7ce6f');box(x-29,266,58,3,2,'#f7ce6f');line([[x,123],[x,241]],'#a2f2ff',3);
      for(const y of [131,170]) {polygon([[x,y-13],[x+9,y],[x,y+13],[x-9,y]],'#a2f2ff');polygon([[x,y-5],[x+4,y],[x,y+5],[x-4,y]],p.shade);}
      oval(x,202,4,4,'#a2f2ff');
    }
    // Seal between doors leaves the encounter title legible.
    const sx=372,sy=137;
    for(const r of [28,16]) {ctx.strokeStyle='#f4ce73';ctx.lineWidth=4;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.stroke();}
    for(let j=0;j<4;j++){const a=j*Math.PI/2;oval(sx+Math.cos(a)*28,sy+Math.sin(a)*28,5,5,'#f4ce6f');}
    for(let j=0;j<8;j++){const a=j*Math.PI/4;line([[sx+Math.cos(a)*36,sy+Math.sin(a)*36],[sx+Math.cos(a)*40,sy+Math.sin(a)*40]],p.door,3);}
    polygon([[sx,sy-9],[sx+6,sy],[sx,sy+9],[sx-6,sy]],'#9dedff');
    for(const x of [157,805]){crystal(ctx,x,190,37);box(x-16,190,32,9,4,p.door);box(x-6,198,12,13,3,p.shade);box(x-2,198,4,10,2,'#f7ce6f');}
    for(const [x,size] of [[24,56],[44,38],[938,57],[915,34]]) crystal(ctx,x,281,size);
    oval(17,282,13,8,p.door);oval(944,285,13,8,p.door);
  }
  ctx.restore();
}
export function paintAtmosphere(ctx, biome, type, time) {
  ctx.save();
  if(['spell','boss','shrine'].includes(type)) {
    ctx.strokeStyle=biome===1?'#8bbf8b':biome===2?'#8fcde9':'#c3a6e7';ctx.lineWidth=2;ctx.globalAlpha=.45;
    for(const rx of [83,69]) {ctx.beginPath();ctx.ellipse(716,367,rx,rx*.2,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.globalAlpha=.4;
  for(let i=0;i<5;i++) {
    const x=110+(i*173)%750+Math.sin(time*.5+i)*6,y=292+(i*29)%130-Math.sin(time*.7+i)*6;
    ctx.fillStyle=['#bba1d5','#92b76b','#8bc5e8'][biome];ctx.beginPath();ctx.ellipse(x,y,biome===1?4:2,2,Math.sin(time+i),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
