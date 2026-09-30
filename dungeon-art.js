// Flat, rounded architecture, drawn at canvas resolution for clean scaling.
export function paintDungeon(ctx, biome, open, time) {
  const colors=[['#e9e0f5','#d8c7eb','#b398d4','#f4eefb'],['#dfefdb','#c3deb8','#8dbb7a','#f0f8e9'],['#ddebf9','#bed4ef','#89aad3','#eef6ff']][biome];
  const [wall,stone,shade,floor]=colors;
  const box=(x,y,w,h,r,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  const oval=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  ctx.fillStyle=wall;ctx.fillRect(0,0,960,480);
  // Large shapes keep the scene readable at laptop sizes.
  for(let row=0;row<3;row++)for(let col=0;col<9;col++){
    const x=col*122+(row%2?-50:8),y=20+row*76;
    box(x,y,111,64,13,row%2?stone:wall);
    box(x+12,y+9,52,5,2,'#ffffff28');
  }
  box(0,226,960,30,9,shade);box(0,244,960,236,0,floor);
  box(0,249,960,13,0,stone);
  for(let i=0;i<8;i++){box(40+i*121,313+(i%3)*52,68,10,5,wall);box(69+i*117,426+(i%2)*23,48,8,4,wall);}
  [264,480,696].forEach((x,i)=>{
    box(x-53,95,106,159,[53,53,6,6],shade);
    box(x-39,110,78,137,[39,39,0,0],open?'#65458b':'#b398d4');
    if(open){box(x-24,134,48,114,[24,24,0,0],'#9069cd');box(x-11,157,22,91,[11,11,0,0],'#bca0de');}
    else{box(x-31,120,62,124,[31,31,0,0],'#a383c3');box(x-4,124,8,120,4,'#b398d4');oval(x+20,193,5,5,'#ffdf69');}
    box(x-60,248,120,12,6,stone);box(x-67,259,134,9,4,shade);
    if(open){box(x-14,81,28,27,10,'#fff');ctx.fillStyle='#7851b0';ctx.font='900 17px Nunito, sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),x,101);}
  });
  [67,858].forEach(x=>{box(x,55,35,211,12,stone);box(x-13,49,61,20,8,shade);box(x-11,250,57,19,8,shade);box(x+8,78,8,153,4,'#ffffff45');});
  [156,800].forEach((x,i)=>{
    box(x-7,180,14,46,7,shade);box(x-15,195,30,12,5,shade);
    const phase=time*6+i*2.1,sway=Math.sin(phase)*5,tip=137-Math.sin(phase*1.4)*7;
    ctx.save();const light=ctx.createRadialGradient(x,170,3,x,170,65);light.addColorStop(0,'#ffc80038');light.addColorStop(1,'#ffc80000');ctx.fillStyle=light;ctx.fillRect(x-65,105,130,130);
    ctx.fillStyle='#ff9600';ctx.beginPath();ctx.moveTo(x+sway,tip-5);ctx.bezierCurveTo(x-33,164,x-24,196,x,194);ctx.bezierCurveTo(x+29,194,x+27,165,x+sway,tip-5);ctx.fill();
    ctx.fillStyle='#ffc800';ctx.beginPath();ctx.moveTo(x+sway,tip);ctx.bezierCurveTo(x-29+sway,173,x-14,194,x,191);ctx.bezierCurveTo(x+23,191,x+21+sway,170,x+sway,tip);ctx.fill();
    ctx.fillStyle='#fff1ac';ctx.beginPath();ctx.moveTo(x-sway*.6,157+Math.sin(phase)*5);ctx.bezierCurveTo(x-14,181,x-8,188,x,187);ctx.bezierCurveTo(x+12,187,x+11,177,x-sway*.6,157+Math.sin(phase)*5);ctx.fill();
    if(time)for(let j=0;j<3;j++){const progress=(time*.8+j/3+i*.2)%1;ctx.globalAlpha=(1-progress)*.65;ctx.fillStyle='#ffb020';ctx.beginPath();ctx.arc(x+Math.sin(phase+j)*8,145-progress*32,2*(1-progress)+.6,0,Math.PI*2);ctx.fill();}ctx.restore();
  });
  // Keep the combat floor clear; only small stones remain.
  box(370,411,44,15,7,stone);box(404,422,25,10,5,shade);box(556,304,31,10,5,stone);
}

export function paintAtmosphere(ctx, biome, type, time) {
  ctx.save();
  // Soft banners and wall emblems make each region distinct.
  const color=['#a783e0','#78b85c','#79b9e8'][biome];
  [356,588].forEach(x=>{
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-19,106);ctx.lineTo(x+19,106);ctx.lineTo(x+19,166);ctx.quadraticCurveTo(x,156+Math.sin(time*1.5)*3,x-19,170);ctx.fill();
    ctx.strokeStyle='#ffffff88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,120);ctx.lineTo(x+8,133);ctx.lineTo(x,146);ctx.lineTo(x-8,133);ctx.closePath();ctx.stroke();
  });
  if(['spell','boss','shrine'].includes(type)){
    ctx.strokeStyle=type==='shrine'?'#8fd5be':'#c3a6e7';ctx.lineWidth=3;ctx.globalAlpha=.5;
    ctx.beginPath();ctx.ellipse(716,367,94,22,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(716,367,78,15,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<6;i++){const a=i*Math.PI/3+time*.25;ctx.fillStyle=i%2?'#ffc800':'#b08ae0';ctx.beginPath();ctx.arc(716+Math.cos(a)*94,367+Math.sin(a)*22,4,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=.55;
  for(let i=0;i<10;i++){
    const x=130+(i*137)%710+Math.sin(time*.5+i)*9,y=280+(i*41)%145-Math.sin(time*.8+i)*12;
    ctx.fillStyle=biome===1?'#b5d87a':biome===2?'#90c7ed':'#ccb2eb';ctx.beginPath();ctx.ellipse(x,y,biome===1?5:3,3,Math.sin(time+i),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
