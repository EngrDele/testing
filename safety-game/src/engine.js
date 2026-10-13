// Site Life shared 3D engine (textures, materials, people, vehicles, props, mesh merging).
// Used by the factory game (src/factory.html) and the kids games (src/kids-game.js). Built into pages by src/build.py.
// ================== 3D (realistic) ==================
let G = null;
const X = x => x*K, Z = y => y*K;
const lin = c => new THREE.Color(c).convertSRGBToLinear();
let RENDERER = null;

// ---------- texture helpers ----------
function mkCanvas(w,h,fn){ const c=document.createElement('canvas'); c.width=w; c.height=h; if(fn) fn(c.getContext('2d'),w,h); return c; }
function tex(canvas, rx=1, ry=1, srgb=true){
  const t=new THREE.CanvasTexture(canvas); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry);
  t.anisotropy=RENDERER?Math.min(8,RENDERER.capabilities.getMaxAnisotropy()):4; if(srgb) t.encoding=THREE.sRGBEncoding; return t;
}
function normalFrom(src, strength=3){
  const w=src.width,h=src.height,d=src.getContext('2d').getImageData(0,0,w,h).data;
  const out=mkCanvas(w,h), ctx=out.getContext('2d'), img=ctx.createImageData(w,h);
  const L=(x,y)=>{x=(x+w)%w;y=(y+h)%h;const i=(y*w+x)*4;return (d[i]+d[i+1]+d[i+2])/765;};
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const dx=(L(x+1,y)-L(x-1,y))*strength, dy=(L(x,y+1)-L(x,y-1))*strength, l=Math.hypot(dx,dy,1), i=(y*w+x)*4;
    img.data[i]=(-dx/l*.5+.5)*255; img.data[i+1]=(dy/l*.5+.5)*255; img.data[i+2]=(1/l*.5+.5)*255; img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0); return out;
}
const rnd=(a,b)=>a+Math.random()*(b-a);
function noise(c,w,h,n,alpha,size=2,dark=true){ for(let i=0;i<n;i++){ c.fillStyle=dark?`rgba(0,0,0,${Math.random()*alpha})`:`rgba(255,255,255,${Math.random()*alpha})`; c.fillRect(Math.random()*w,Math.random()*h,size,size);} }

const TX = {};
function buildTextures(){
  // interlocking paving stones (Lagos compound classic)
  const pav=mkCanvas(512,512,(c,w,h)=>{
    c.fillStyle='#4a4642'; c.fillRect(0,0,w,h);
    const cols=['#8f8a84','#9a948c','#857f78','#a09a92','#7f6f68','#8a7a70'];
    const bw=64,bh=32;
    for(let y=0;y<h;y+=bh) for(let x=-(y/bh%2)*bw/2;x<w;x+=bw){
      c.fillStyle=cols[Math.floor(Math.random()*cols.length)]; c.beginPath(); c.roundRect? c.roundRect(x+2,y+2,bw-4,bh-4,5) : c.rect(x+2,y+2,bw-4,bh-4); c.fill();
    }
    noise(c,w,h,9000,.12,2); noise(c,w,h,3000,.08,2,false);
  });
  TX.pavers=pav; TX.paversN=normalFrom(pav,4);
  const asp=mkCanvas(512,512,(c,w,h)=>{ c.fillStyle='#3d3e40'; c.fillRect(0,0,w,h); noise(c,w,h,30000,.25,2); noise(c,w,h,9000,.15,2,false);
    c.strokeStyle='rgba(0,0,0,.25)'; c.lineWidth=1.5; for(let i=0;i<4;i++){ c.beginPath(); let x=Math.random()*w,y=Math.random()*h; c.moveTo(x,y); for(let k=0;k<8;k++){x+=rnd(-30,30);y+=rnd(-30,30);c.lineTo(x,y);} c.stroke(); } });
  TX.asphalt=asp; TX.asphaltN=normalFrom(asp,2);
  const con=mkCanvas(512,512,(c,w,h)=>{ c.fillStyle='#a8a59e'; c.fillRect(0,0,w,h); noise(c,w,h,20000,.1,2); noise(c,w,h,6000,.1,3,false);
    for(let i=0;i<6;i++){ c.fillStyle=`rgba(60,50,40,${rnd(.03,.08)})`; c.beginPath(); c.arc(rnd(0,w),rnd(0,h),rnd(20,90),0,7); c.fill(); }
    c.strokeStyle='rgba(40,40,40,.5)'; c.lineWidth=2; c.strokeRect(1,1,w-2,h-2); });
  TX.concrete=con; TX.concreteN=normalFrom(con,2);
  const grass=mkCanvas(512,512,(c,w,h)=>{ c.fillStyle='#4f6b2e'; c.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){ const g=Math.floor(rnd(70,140)); c.strokeStyle=`rgba(${g-40},${g},${Math.floor(g*.4)},.8)`; c.lineWidth=1; const x=rnd(0,w),y=rnd(0,h); c.beginPath(); c.moveTo(x,y); c.lineTo(x+rnd(-3,3),y-rnd(4,10)); c.stroke(); }
    for(let i=0;i<20;i++){ c.fillStyle='rgba(120,100,60,.15)'; c.beginPath(); c.arc(rnd(0,w),rnd(0,h),rnd(10,40),0,7); c.fill(); } });
  TX.grass=grass;
  const plaster=mkCanvas(512,512,(c,w,h)=>{ c.fillStyle='#f4f1ea'; c.fillRect(0,0,w,h); noise(c,w,h,40000,.06,2); noise(c,w,h,8000,.08,1,false);
    const g=c.createLinearGradient(0,h*.7,0,h); g.addColorStop(0,'rgba(90,70,50,0)'); g.addColorStop(1,'rgba(90,70,50,.12)'); c.fillStyle=g; c.fillRect(0,0,w,h); });
  TX.plaster=plaster; TX.plasterN=normalFrom(plaster,1.5);
  const corr=mkCanvas(256,256,(c,w,h)=>{ for(let x=0;x<w;x++){ const v=Math.floor(170+60*Math.sin(x/w*Math.PI*2*8)); c.fillStyle=`rgb(${v},${v},${v})`; c.fillRect(x,0,1,h);} noise(c,w,h,3000,.08,2);
    c.fillStyle='rgba(120,70,30,.10)'; for(let i=0;i<10;i++) c.fillRect(rnd(0,w),rnd(0,h),rnd(2,6),rnd(20,80)); });
  TX.corr=corr; TX.corrN=normalFrom(corr,6);
  const shutter=mkCanvas(256,256,(c,w,h)=>{ for(let y=0;y<h;y++){ const v=Math.floor(150+70*Math.sin(y/h*Math.PI*2*16)); c.fillStyle=`rgb(${v},${v},${v+5})`; c.fillRect(0,y,w,1);} noise(c,w,h,2000,.1,2); });
  TX.shutter=shutter; TX.shutterN=normalFrom(shutter,6);
  const block=mkCanvas(512,256,(c,w,h)=>{ c.fillStyle='#e8e0cf'; c.fillRect(0,0,w,h); noise(c,w,h,20000,.07,2);
    c.strokeStyle='rgba(120,110,90,.35)'; c.lineWidth=2; for(let y=0;y<h;y+=64){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); for(let x=(y/64%2)*64;x<w;x+=128){ c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+64); c.stroke(); } }
    const g=c.createLinearGradient(0,h*.6,0,h); g.addColorStop(0,'rgba(80,60,40,0)'); g.addColorStop(1,'rgba(80,60,40,.25)'); c.fillStyle=g; c.fillRect(0,0,w,h); });
  TX.block=block; TX.blockN=normalFrom(block,2);
}
function ankara(base,acc,acc2){
  return mkCanvas(256,256,(c,w,h)=>{ c.fillStyle=base; c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=64) for(let x=(y/64%2)*32;x<w+32;x+=64){
      c.fillStyle=acc; c.beginPath(); c.arc(x,y+32,22,0,7); c.fill();
      c.fillStyle=acc2; c.beginPath(); c.arc(x,y+32,12,0,7); c.fill();
      c.fillStyle=base; c.beginPath(); c.arc(x,y+32,5,0,7); c.fill();
      c.fillStyle=acc2; c.beginPath(); c.moveTo(x+32,y); c.lineTo(x+44,y+12); c.lineTo(x+32,y+24); c.lineTo(x+20,y+12); c.fill(); }
  });
}
function signCanvas(kind, title, sub=''){
  return mkCanvas(256,320,(c,w,h)=>{
    c.fillStyle='#fafafa'; c.fillRect(0,0,w,h); c.strokeStyle='#222'; c.lineWidth=4; c.strokeRect(2,2,w-4,h-4);
    const cx=w/2, cy=110;
    if(kind==='mandatory'){ c.fillStyle='#1f5fbf'; c.beginPath(); c.arc(cx,cy,85,0,7); c.fill(); c.strokeStyle='#fff'; c.lineWidth=10; c.beginPath(); c.arc(cx,cy-5,40,Math.PI,0); c.stroke(); c.fillStyle='#fff'; c.fillRect(cx-55,cy-10,26,42); c.fillRect(cx+29,cy-10,26,42); }
    if(kind==='warning'){ c.fillStyle='#f6c21b'; c.strokeStyle='#111'; c.lineWidth=10; c.beginPath(); c.moveTo(cx,cy-85); c.lineTo(cx+95,cy+75); c.lineTo(cx-95,cy+75); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#111'; c.beginPath(); c.moveTo(cx+10,cy-40); c.lineTo(cx-22,cy+12); c.lineTo(cx,cy+12); c.lineTo(cx-12,cy+55); c.lineTo(cx+24,cy-2); c.lineTo(cx+2,cy-2); c.closePath(); c.fill(); }
    if(kind==='prohibit'){ c.fillStyle='#fff'; c.beginPath(); c.arc(cx,cy,85,0,7); c.fill(); c.fillStyle='#222'; c.fillRect(cx-55,cy-8,90,16); c.fillStyle='#e67e22'; c.fillRect(cx+35,cy-8,18,16);
      c.strokeStyle='#888'; c.lineWidth=4; c.beginPath(); c.moveTo(cx+45,cy-14); c.quadraticCurveTo(cx+60,cy-40,cx+45,cy-60); c.stroke();
      c.strokeStyle='#d0021b'; c.lineWidth=16; c.beginPath(); c.arc(cx,cy,80,0,7); c.stroke(); c.beginPath(); c.moveTo(cx-56,cy-56); c.lineTo(cx+56,cy+56); c.stroke(); }
    if(kind==='safe'){ c.fillStyle='#14853d'; c.fillRect(20,25,w-40,170); c.fillStyle='#fff';
      for(const [dx,dy] of [[-45,0],[0,-25],[45,0],[0,30]]){ c.beginPath(); c.arc(cx+dx,cy+dy-12,12,0,7); c.fill(); c.fillRect(cx+dx-8,cy+dy,16,28); }
      c.strokeStyle='#fff'; c.lineWidth=6; c.beginPath(); c.arc(cx,cy,78,0,7); c.stroke(); }
    if(kind==='fire'){ c.fillStyle='#c8102e'; c.fillRect(20,25,w-40,170); c.fillStyle='#fff'; c.fillRect(cx-18,cy-50,36,95); c.fillRect(cx-8,cy-68,16,20); }
    if(kind==='aid'){ c.fillStyle='#14853d'; c.fillRect(20,25,w-40,170); c.fillStyle='#fff'; c.fillRect(cx-18,cy-55,36,110); c.fillRect(cx-55,cy-18,110,36); }
    c.fillStyle='#111'; c.textAlign='center'; c.font='bold 30px system-ui'; c.fillText(title,cx,250); c.font='bold 22px system-ui'; c.fillText(sub,cx,288);
  });
}
function boardCanvas(text,bg='#12355b',fg='#ffffff'){
  if(typeof tr==='function') text=tr(text);
  const m=mkCanvas(10,10).getContext('2d'); m.font='bold 64px system-ui'; const tw=m.measureText(text).width;
  return mkCanvas(Math.ceil(tw+80),110,(c,w,h)=>{ c.fillStyle=bg; c.fillRect(0,0,w,h); c.fillStyle='rgba(255,255,255,.08)'; c.fillRect(0,0,w,h/2);
    c.strokeStyle='#c9c9c9'; c.lineWidth=6; c.strokeRect(3,3,w-6,h-6); c.fillStyle=fg; c.font='bold 64px system-ui'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(text,w/2,h/2+3); });
}
function labelSprite(text,h=.28){
  if(typeof tr==='function') text=tr(text);
  const m=mkCanvas(10,10).getContext('2d'); m.font='600 40px system-ui'; const tw=Math.ceil(m.measureText(text).width)+30;
  const c=mkCanvas(tw,60,(x,w,hh)=>{ x.fillStyle='rgba(15,20,25,.6)'; x.beginPath(); x.moveTo(14,0); x.arcTo(w,0,w,hh,14); x.arcTo(w,hh,0,hh,14); x.arcTo(0,hh,0,0,14); x.arcTo(0,0,w,0,14); x.fill(); x.fillStyle='#fff'; x.font='600 40px system-ui'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,w/2,hh/2+2); });
  const t=tex(c); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false})); s.scale.set(h*tw/60,h,1); return s;
}
function blobTex(){ return tex(mkCanvas(128,128,(c)=>{ const g=c.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(0,0,0,.55)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,128,128); }),1,1,false); }
function aoTex(wm,dm,pad){
  const S=4, cw=Math.ceil((wm+pad*2)*S), ch=Math.ceil((dm+pad*2)*S);
  return tex(mkCanvas(cw,ch,(c)=>{ const img=c.createImageData(cw,ch);
    for(let y=0;y<ch;y++) for(let x=0;x<cw;x++){ const px=x/S-pad, py=y/S-pad; const dx=Math.max(0,-px,px-wm), dy=Math.max(0,-py,py-dm); const dd=Math.hypot(dx,dy); const a=Math.max(0,1-dd/pad); const i=(y*cw+x)*4; img.data[i+3]=Math.floor(a*a*150); }
    c.putImageData(img,0,0); }),1,1,false);
}

// ---------- materials ----------
function std(color,o={}){ const m=new THREE.MeshStandardMaterial({color:lin(color),roughness:o.r??0.85,metalness:o.m??0}); for(const k of ['map','normalMap','transparent','opacity','side','emissive','emissiveIntensity','depthWrite']) if(o[k]!==undefined) m[k]= k==='emissive'?lin(o[k]):o[k]; if(o.ns) m.normalScale=new THREE.Vector2(o.ns,o.ns); return m; }

// ---------- geometry helpers ----------
function mesh(geo,mat,x=0,y=0,z=0,shadow=true){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=shadow; m.receiveShadow=true; return m; }
function bx(w,h,d,mat,x,y,z,shadow=true){ return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,shadow); }
function cyl(rt,rb,h,mat,x,y,z,seg=16,shadow=true){ return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z,shadow); }
function sph(r,mat,x,y,z,seg=16){ return mesh(new THREE.SphereGeometry(r,seg,Math.max(8,seg*0.75|0)),mat,x,y,z); }
// instancing collector
const INST = {};
function inst(key,geo,mat,matrix){ (INST[key]=INST[key]||{geo,mat,list:[]}).list.push(matrix.clone()); }
function flushInst(scene){ for(const k in INST){ const {geo,mat,list}=INST[k]; const im=new THREE.InstancedMesh(geo,mat,list.length); list.forEach((m,i)=>im.setMatrixAt(i,m)); im.castShadow=true; im.receiveShadow=true; im.frustumCulled=false; scene.add(im); } }
const M4=(x,y,z,ry=0,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(sx,sy,sz));


// ---------- mesh consolidation (fewer draw calls) ----------
function mergeGeos(list){
  let vC=0,iC=0; for(const {geo} of list){ vC+=geo.attributes.position.count; iC+=geo.index?geo.index.count:geo.attributes.position.count; }
  const pos=new Float32Array(vC*3), nor=new Float32Array(vC*3), uv=new Float32Array(vC*2), idx=new Uint32Array(iC);
  let vo=0, io=0; const v=new THREE.Vector3(), nm=new THREE.Matrix3();
  for(const {geo,matrix} of list){ const P=geo.attributes.position, N=geo.attributes.normal, U=geo.attributes.uv; nm.getNormalMatrix(matrix);
    for(let i=0;i<P.count;i++){ v.fromBufferAttribute(P,i).applyMatrix4(matrix); pos[(vo+i)*3]=v.x; pos[(vo+i)*3+1]=v.y; pos[(vo+i)*3+2]=v.z;
      if(N){ v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize(); nor[(vo+i)*3]=v.x; nor[(vo+i)*3+1]=v.y; nor[(vo+i)*3+2]=v.z; }
      if(U){ uv[(vo+i)*2]=U.getX(i); uv[(vo+i)*2+1]=U.getY(i); } }
    if(geo.index){ for(let i=0;i<geo.index.count;i++) idx[io+i]=geo.index.getX(i)+vo; io+=geo.index.count; } else { for(let i=0;i<P.count;i++) idx[io+i]=vo+i; io+=P.count; }
    vo+=P.count; }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.BufferAttribute(nor,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeBoundingSphere(); return g;
}
function consolidate(root){
  const groups=[]; root.traverse(o=>{ if(o.children && o.children.length) groups.push(o); });
  for(const grp of groups){
    const buckets=new Map();
    for(const c of grp.children.slice()){ if(!c.isMesh || c.isInstancedMesh || c.children.length || c.userData.keep || Array.isArray(c.material)) continue; const k=c.material.uuid; if(!buckets.has(k)) buckets.set(k,[]); buckets.get(k).push(c); }
    for(const arr of buckets.values()){ if(arr.length<2) continue; arr.forEach(m=>m.updateMatrix());
      const nmsh=new THREE.Mesh(mergeGeos(arr.map(m=>({geo:m.geometry,matrix:m.matrix}))),arr[0].material); nmsh.castShadow=arr.some(m=>m.castShadow); nmsh.receiveShadow=true; arr.forEach(m=>grp.remove(m)); grp.add(nmsh); }
  }
  return root;
}

// ---------- humans ----------
let HTX=null;
function humanTex(){
  if(HTX) return HTX;
  const weave=mkCanvas(128,128,(c,w,h)=>{ c.fillStyle='#808080'; c.fillRect(0,0,w,h); for(let y=0;y<h;y+=2){ c.fillStyle=`rgba(0,0,0,${(y/2)%2?.10:.2})`; c.fillRect(0,y,w,1);} for(let x=0;x<w;x+=2){ c.fillStyle='rgba(255,255,255,.08)'; c.fillRect(x,0,1,h);} noise(c,w,h,1500,.1,1); });
  const pores=mkCanvas(128,128,(c,w,h)=>{ c.fillStyle='#808080'; c.fillRect(0,0,w,h); noise(c,w,h,5000,.18,1); noise(c,w,h,2500,.15,1,false); });
  const coil=mkCanvas(128,128,(c,w,h)=>{ c.fillStyle='#808080'; c.fillRect(0,0,w,h); for(let i=0;i<1400;i++){ c.strokeStyle=Math.random()<.5?'rgba(0,0,0,.55)':'rgba(255,255,255,.4)'; c.lineWidth=1.1; c.beginPath(); c.arc(rnd(0,w),rnd(0,h),rnd(1.2,3),0,7); c.stroke(); } });
  const braid=mkCanvas(64,128,(c,w,h)=>{ c.fillStyle='#808080'; c.fillRect(0,0,w,h); for(let y=0;y<h;y+=8){ for(const s of [-1,1]){ c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(w/2+s*8,y+4,9,4,s*.6,0,7); c.fill(); c.fillStyle='rgba(0,0,0,.4)'; c.fillRect(0,y,w,1);} } });
  const vestCol=(base)=>mkCanvas(256,256,(c,w,h)=>{ c.fillStyle=base; c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=3) for(let x=(y/3%2)*1.5;x<w;x+=3){ c.fillStyle='rgba(0,0,0,.10)'; c.fillRect(x,y,1.2,1.2);}
    c.fillStyle='#c9cdd2'; for(const v of [.38,.62]) c.fillRect(0,h*v,w,h*.075);
    for(const u of [.12,.88,.42,.58]) c.fillRect(w*u-9,0,18,h*.40);
    c.fillStyle='rgba(255,255,255,.35)'; for(const v of [.38,.62]) for(let x=0;x<w;x+=6) c.fillRect(x,h*v+2,3,h*.075-4); });
  const vestRough=mkCanvas(256,256,(c,w,h)=>{ c.fillStyle='#ffffff'; c.fillRect(0,0,w,h); c.fillStyle='#2a2a2a'; for(const v of [.38,.62]) c.fillRect(0,h*v,w,h*.075); for(const u of [.12,.88,.42,.58]) c.fillRect(w*u-9,0,18,h*.40); });
  const vestMetal=mkCanvas(256,256,(c,w,h)=>{ c.fillStyle='#000'; c.fillRect(0,0,w,h); c.fillStyle='#d0d0d0'; for(const v of [.38,.62]) c.fillRect(0,h*v,w,h*.075); for(const u of [.12,.88,.42,.58]) c.fillRect(w*u-9,0,18,h*.40); });
  const logo=mkCanvas(128,64,(c,w,h)=>{ c.fillStyle='rgba(0,0,0,0)'; c.clearRect(0,0,w,h); c.fillStyle='#0f5132'; c.beginPath(); c.arc(32,32,26,0,7); c.fill(); c.fillStyle='#fff'; c.font='bold 30px system-ui'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('A',32,34); c.fillStyle='#111'; c.font='bold 22px system-ui'; c.fillText('ACME',92,34); });
  HTX={weave,weaveN:normalFrom(weave,2),pores,poresN:normalFrom(pores,1.2),coilN:normalFrom(coil,3),braidN:normalFrom(braid,3),vestCol,vestRough,vestMetal,logo,vestTexCache:{}};
  return HTX;
}
function fabric(color,o={}){ const T=humanTex(); const m=new THREE.MeshStandardMaterial({color:lin(color),roughness:o.r??.92,metalness:0}); if(o.map) m.map=tex(o.map,2,2); m.normalMap=tex(T.weave? T.weaveN:null,o.rep||6,o.rep||6,false); m.normalScale=new THREE.Vector2(.35,.35); if(o.side) m.side=o.side; return m; }
function latheMesh(prof,mat,seg=28,sz=1,phiStart=0,phiLen=Math.PI*2){ if(prof[0][1]>prof[prof.length-1][1]) prof=prof.slice().reverse(); const g=new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),seg,phiStart,phiLen); if(sz!==1) g.scale(1,1,sz); return mesh(g,mat); }

function makeHuman(o){
  const T=humanTex();
  const g=new THREE.Group(), female=o.sex==='f', heavy=o.build==='heavy';
  const skin=new THREE.MeshStandardMaterial({color:lin(o.skin),roughness:.52,metalness:0}); skin.normalMap=tex(T.poresN,8,8,false); skin.normalScale=new THREE.Vector2(.12,.12);
  const skinDark=new THREE.MeshStandardMaterial({color:lin(o.skin).multiplyScalar(.62),roughness:.5});
  const topM = o.topMap? fabric('#ffffff',{map:o.topMap,rep:4}) : fabric(o.top||'#ddd');
  const botM = o.botMap? fabric('#ffffff',{map:o.botMap,rep:4}) : fabric(o.bottom||'#2a2f3a');
  const hairM=new THREE.MeshStandardMaterial({color:lin(o.hairColor||'#0e0c0b'),roughness:.95}); hairM.normalMap=tex(T.coilN,6,6,false);
  const eyeW=std('#ece6dc',{r:.15}), iris=std('#2a170c',{r:.12}), pupil=std('#050505',{r:.1});
  const lipM=new THREE.MeshStandardMaterial({color:lin(o.skin).multiplyScalar(female?.55:.7).lerp(lin('#5a1e22'),female?.35:.1),roughness:female?.3:.45});
  const longSleeve=!!o.longSleeve;
  const sw = heavy? 1.14 : 1;
  const hips=new THREE.Group(); hips.position.y=.95; g.add(hips);
  // pelvis & torso
  const pel=sph(.155*sw,botM,0,.03,0,22); pel.scale.set(female?1.08:1,.72,.74); hips.add(pel);
  const prof = female
    ? [[.135,0],[.128,.08],[.122,.16],[.135,.26],[.158,.33],[.165,.38],[.155,.44],[.16,.48],[.15,.52],[.1,.56],[.055,.585]]
    : [[.148,0],[.148,.1],[.152,.2],[.17,.3],[.185,.4],[.195,.47],[.19,.52],[.13,.565],[.055,.59]];
  const tp=prof.map(([r,y])=>[r*(heavy&&y<.4?1.18:sw>1?1.06:1),y]);
  const torso=latheMesh(tp,topM,32,heavy?.78:.68); torso.position.y=.02; hips.add(torso);
  if(female){ for(const s of [-1,1]){ const b=sph(.062,topM,s*.065,.36,-.075,18); b.scale.set(1,.9,.85); hips.add(b); } }
  // shirt details
  if(o.outfit!=='dress' && o.outfit!=='coverall'){ const btnM=std('#e8e8e8',{r:.4}); for(let i=0;i<4;i++) hips.add(sph(.008,btnM,0,.22+i*.09,-(tp[4][0]*(heavy?.78:.68))-.003,6)); }
  if(o.outfit==='coverall'){ const ref=std('#d6dade',{r:.25,m:.6}); hips.add(bx(.02,.5,.012,std('#222',{r:.5}),0,.3,-.135,false)); }
  if(female && o.dress){ const sk=latheMesh([[.135,0],[.165,-.1],[.2,-.28],[.235,-.48],[.24,-.56],[.0,-.56]],topM,32,.82); sk.material=topM; topM.side=THREE.DoubleSide; sk.position.y=.04; hips.add(sk); }
  // neck + trapezius
  hips.add(cyl(.048,.052,.1,skin,0,.625,0,16));
  const trap=cyl(.06,.17*sw,.07,topM,0,.565,0,24); trap.scale.z=.6; hips.add(trap);
  if(o.collar){ const col=mesh(new THREE.TorusGeometry(.062,.016,8,20,Math.PI*1.6),topM,0,.592,0); col.rotation.set(Math.PI/2,0,Math.PI*1.2); hips.add(col); }
  // head
  const head=new THREE.Group(); head.position.y=.76; hips.add(head);
  const skull=sph(.104,skin,0,0,.004,32); skull.scale.set(.9,1.08,1.02); head.add(skull);
  const jaw=sph(.078,skin,0,-.058,-.014,26); jaw.scale.set(female?.9:1,.78,.98); head.add(jaw);
  const chin=sph(.03,skin,0,-.105,-.05,14); chin.scale.set(1.2,.8,.9); head.add(chin);
  for(const s of [-1,1]){
    const cheek=sph(.032,skin,s*.052,-.022,-.068,14); cheek.scale.set(1,.8,.8); head.add(cheek);
    const ew=sph(.0165,eyeW,s*.035,.012,-.083,16); ew.scale.set(1,.85,.7); head.add(ew);
    head.add(sph(.0095,iris,s*.035,.012,-.094,12)); head.add(sph(.0048,pupil,s*.035,.012,-.0995,8));
    const hl=new THREE.Mesh(new THREE.SphereGeometry(.0018,6,4),new THREE.MeshBasicMaterial({color:'#ffffff'})); hl.position.set(s*.035+.003,.016,-.1); head.add(hl);
    const lid=mesh(new THREE.SphereGeometry(.0175,16,8,0,Math.PI*2,0,Math.PI*.42),skinDark,s*.035,.013,-.083); lid.rotation.x=-.35; lid.scale.set(1.05,1,.8); head.add(lid);
    const brow=mesh(new THREE.TorusGeometry(.024,.0045,4,10,Math.PI*.8),hairM,s*.036,.036,-.09); brow.rotation.z=Math.PI*.1; brow.scale.set(1,.55,1); head.add(brow);
    const ear=mesh(new THREE.TorusGeometry(.019,.008,8,14),skin,s*.096,.0,.008); ear.rotation.y=Math.PI/2; ear.scale.set(1,1.35,1); head.add(ear);
    head.add(sph(.009,skinDark,s*.012,-.04,-.104,8));
  }
  const ridge=sph(.06,skin,0,.033,-.07,16); ridge.scale.set(1.25,.35,.55); head.add(ridge);
  const bridge=bx(.016,.045,.02,skin,0,-.005,-.1); head.add(bridge);
  const tip=sph(.021,skin,0,-.032,-.103,14); tip.scale.set(1.25,.85,.9); head.add(tip);
  const ul=sph(.024,lipM,0,-.058,-.092,14); ul.scale.set(1.5,.42,.6); head.add(ul);
  const ll=sph(.024,lipM,0,-.07,-.09,14); ll.scale.set(1.4,.5,.65); head.add(ll);
  // hair styles
  const hs=o.hair||(female?'bun':'low');
  if(hs==='low'||hs==='afro'){ const r=hs==='afro'?.122:.108; const cap=mesh(new THREE.SphereGeometry(r,26,16,0,Math.PI*2,0,Math.PI*.55),hairM,0,.006,.01); cap.scale.set(.92,1.08,1.04); head.add(cap);
    for(const s of [-1,1]){ const side=sph(.05,hairM,s*.085,-.005,.03,10); side.scale.set(.35,.9,1); head.add(side); } }
  if(hs==='bun'||hs==='braids'){ const cap=mesh(new THREE.SphereGeometry(.111,26,16,0,Math.PI*2,0,Math.PI*.6),hairM,0,.004,.01); cap.scale.set(.93,1.08,1.04); head.add(cap);
    if(hs==='bun'){ const bun=sph(.058,hairM,0,.07,.098,16); head.add(bun); }
    else { const bm=hairM.clone(); bm.normalMap=tex(T.braidN,1,3,false); for(let i=0;i<14;i++){ const a=(i/13-.5)*2.2; const br=cyl(.011,.008,.32,bm,Math.sin(a)*.085,-.12,.04+Math.cos(a)*.07,8); br.rotation.x=.15; head.add(br);} } }
  if(o.beard){ const bm=new THREE.MeshStandardMaterial({color:lin('#0d0b0a'),roughness:1,transparent:true,opacity:.8}); bm.normalMap=tex(T.coilN,4,4,false); const bd=mesh(new THREE.SphereGeometry(.082,22,12,0,Math.PI*2,Math.PI*.55,Math.PI*.4),bm,0,-.05,-.012); bd.scale.set(1.02,.9,1.0); head.add(bd); }
  if(o.gele){ const gm=std('#ffffff',{map:tex(o.gele,3,3),r:.55}); const band=mesh(new THREE.TorusGeometry(.102,.042,12,28),gm,0,.06,.004); band.rotation.x=Math.PI/2+.22; head.add(band);
    const crown=sph(.12,gm,0,.12,.02,22); crown.scale.set(1.18,.78,1.12); head.add(crown); const fan=sph(.12,gm,0,.17,.085,18); fan.scale.set(1.6,.62,.45); fan.rotation.x=-.5; head.add(fan);
    const fan2=sph(.08,gm,.09,.2,.02,14); fan2.scale.set(1,.5,1.4); fan2.rotation.z=-.6; head.add(fan2); }
  if(o.hat==='chef'){ const cm=fabric('#fafafa'); head.add(cyl(.098,.098,.1,cm,0,.1,0,22)); const puff=sph(.125,cm,0,.2,0,22); puff.scale.y=.75; head.add(puff); }
  if(o.hat==='cap'){ const cm=fabric(o.hatColor||'#1b2a44'); head.add(mesh(new THREE.SphereGeometry(.113,22,10,0,Math.PI*2,0,Math.PI/2.2),cm,0,.028,.004)); const vis=sph(.07,cm,0,.04,-.11,14); vis.scale.set(1.2,.12,.9); head.add(vis); }
  // ----- PPE: hard hat -----
  const ppe={};
  { const hh=new THREE.Group(); const hm=new THREE.MeshPhysicalMaterial({color:lin(o.hatColor||'#f6f6f2'),roughness:.32,metalness:0,clearcoat:1,clearcoatRoughness:.12});
    const shell=latheMesh([[.128,0],[.127,.025],[.121,.06],[.107,.095],[.083,.122],[.05,.14],[.0,.147]],hm,36,1.1); hh.add(shell);
    const rim=mesh(new THREE.TorusGeometry(.128,.007,8,36),hm,0,0,0); rim.rotation.x=Math.PI/2; rim.scale.set(1,1.1,1); hh.add(rim);
    const peak=mesh(new THREE.SphereGeometry(.12,24,8,Math.PI*.15,Math.PI*.7,Math.PI*.5,Math.PI*.12),hm,0,.02,0); peak.rotation.y=Math.PI; peak.scale.set(1.05,.6,1.45); hh.add(peak);
    const rib=mesh(new THREE.TorusGeometry(.14,.011,8,24,Math.PI*.95),hm,0,0,.0); rib.rotation.y=Math.PI/2; rib.rotation.z=.08; rib.scale.set(1.08,.98,1); hh.add(rib);
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(.075,.0375),new THREE.MeshStandardMaterial({map:tex(T.logo),transparent:true,roughness:.4})); lg.position.set(0,.085,-.112); lg.rotation.x=-.45; lg.rotation.y=Math.PI; hh.add(lg);
    const band=cyl(.105,.105,.02,std('#222',{r:.6}),0,.005,0,24); band.scale.z=1.1; hh.add(band);
    hh.position.y=.045; head.add(hh); ppe.hat=hh; }
  // goggles
  { const gg=new THREE.Group(); const lens=new THREE.MeshPhysicalMaterial({color:lin('#dfeef5'),roughness:.05,metalness:0,transparent:true,opacity:.35,clearcoat:1});
    const l=mesh(new THREE.CylinderGeometry(.103,.103,.042,28,1,true,Math.PI*.62,Math.PI*.76),lens,0,.012,0); l.rotation.y=Math.PI; l.scale.set(.96,1,1.0); gg.add(l);
    const fr=std('#1d1d1d',{r:.5}); for(const yy of [-.009,.033]){ const e=mesh(new THREE.TorusGeometry(.103,.0035,4,28,Math.PI*.76),fr,0,yy,0); e.rotation.set(Math.PI/2,0,Math.PI*1.12); gg.add(e); }
    const strap=mesh(new THREE.TorusGeometry(.104,.007,4,28),std('#1a3a6a',{r:.8}),0,.012,.002); strap.rotation.x=Math.PI/2; strap.scale.set(.93,1.04,1); gg.add(strap);
    head.add(gg); ppe.goggles=gg; }
  // ear defenders
  { const ed=new THREE.Group(); const cupM=new THREE.MeshPhysicalMaterial({color:lin('#d62020'),roughness:.35,clearcoat:.6}), padM=std('#151515',{r:.8});
    for(const s of [-1,1]){ const cup=sph(.045,cupM,s*.112,-.005,.005,18); cup.scale.set(.6,1,.82); ed.add(cup); const pad=cyl(.04,.04,.015,padM,s*.1,-.005,.005,16); pad.rotation.z=Math.PI/2; ed.add(pad);
      const arm=bx(.008,.1,.02,std('#222',{r:.4,m:.6}),s*.13,.055,.005); arm.rotation.z=-s*.25; ed.add(arm); }
    head.add(ed); ppe.muffs=ed; }
  // arms
  const arms=[]; const sx=female?.178:.205*sw;
  const gloveM=std(o.gloveColor||'#7a7f86',{r:.85}); const cuffM=std('#e2780e',{r:.8});
  const handMeshes=[], gloveMeshes=[];
  for(const s of [-1,1]){
    const delt=sph(.064*sw,topM,s*sx,.505,0,18); delt.scale.set(1,.9,.95); hips.add(delt);
    const sh=new THREE.Group(); sh.position.set(s*(sx+.008),.5,0); hips.add(sh);
    const ua=latheMesh([[.048,0],[.052,-.08],[.05,-.17],[.043,-.28],[.04,-.3]].map(([r,y])=>[r*sw,y]),topM,18); sh.add(ua);
    const el=new THREE.Group(); el.position.y=-.29; sh.add(el);
    const fm=longSleeve?topM:skin;
    el.add(sph(.04,fm,0,0,0,12));
    el.add(latheMesh([[.04,0],[.043,-.06],[.037,-.16],[.03,-.25]],fm,18));
    if(!longSleeve){ sh.add(cyl(.057*sw,.054*sw,.13,topM,0,-.06,0,18)); }
    // hand: palm + fingers + thumb
    const hand=new THREE.Group(); hand.position.y=-.27; el.add(hand);
    const bare=new THREE.Group(); hand.add(bare);
    const palm=sph(.036,skin,0,-.02,0,14); palm.scale.set(.85,1.15,.45); bare.add(palm);
    const fing=sph(.03,skin,0,-.075,-.004,12); fing.scale.set(.95,1.5,.42); bare.add(fing);
    const th=cyl(.011,.009,.05,skin,-s*.0,-.03,-.03,8); th.rotation.x=.6; bare.add(th);
    handMeshes.push(bare);
    const gl=new THREE.Group(); const gp=sph(.039,gloveM,0,-.022,0,14); gp.scale.set(.88,1.18,.5); const gf=sph(.033,gloveM,0,-.077,-.004,12); gf.scale.set(.98,1.5,.48); const gc=cyl(.038,.036,.05,cuffM,0,.02,0,14); gl.add(gp,gf,gc); hand.add(gl); gloveMeshes.push(gl);
    sh.rotation.z=s*.07; arms.push({sh,el,hand});
  }
  // legs
  const legs=[]; const shoeM=std(o.shoe||'#1a1716',{r:.35}), bootM=std('#1d1a17',{r:.5}), soleM=std('#2b2b2b',{r:.9}), stitchM=std('#d9a400',{r:.6});
  for(const s of [-1,1]){
    const hp=new THREE.Group(); hp.position.set(s*(female?.088:.088*sw),0,0); hips.add(hp);
    const thM=(female&&o.dress)?skin:botM, shM=(female&&o.dress)?skin:botM;
    hp.add(latheMesh([[.074*sw,0],[.078*sw,-.06],[.068*sw,-.25],[.055,-.44],[.052,-.46]],thM,20));
    const kn=new THREE.Group(); kn.position.y=-.45; hp.add(kn);
    kn.add(sph(.052,shM,0,0,0,14));
    kn.add(latheMesh([[.05,0],[.056,-.1],[.05,-.2],[.036,-.38],[.034,-.42]],shM,20));
    const shoe=new THREE.Group(); shoe.position.y=-.44; kn.add(shoe);
    const sole=bx(.1,.025,.27,soleM,0,-.035,-.045); shoe.add(sole);
    const up=sph(.055,shoeM,0,-.005,-.07,16); up.scale.set(.9,.6,1.9); shoe.add(up); shoe.add(sph(.045,shoeM,0,.01,.03,12));
    const boot=new THREE.Group(); boot.position.y=-.44; kn.add(boot);
    boot.add(bx(.112,.04,.29,soleM,0,-.04,-.05)); const bu=sph(.06,bootM,0,-.0,-.075,16); bu.scale.set(.95,.72,1.9); boot.add(bu);
    boot.add(cyl(.05,.056,.13,bootM,0,.05,.01,16)); const toe=sph(.05,bootM,0,-.01,-.15,14); toe.scale.set(1.05,.75,.9); boot.add(toe);
    const st=mesh(new THREE.TorusGeometry(.056,.003,4,20),stitchM,0,-.018,-.06); st.rotation.x=Math.PI/2; st.scale.set(1,2.1,1); boot.add(st);
    legs.push({hp,kn,shoe,boot});
  }
  // hi-vis vest (open front, reflective tape)
  { const vc=o.vestColor||'#d6f21b'; const key=vc; if(!T.vestTexCache[key]) T.vestTexCache[key]=T.vestCol(vc);
    const vm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.75,metalness:0,side:THREE.DoubleSide});
    vm.map=tex(T.vestTexCache[key],1,1); vm.roughnessMap=tex(T.vestRough,1,1,false); vm.metalnessMap=tex(T.vestMetal,1,1,false); vm.metalness=.9;
    vm.emissive=lin(vc); vm.emissiveIntensity=.12;
    const vp=tp.filter(([r,y])=>y>=.1&&y<=.565).map(([r,y])=>[r*1.075+.006,y]);
    const vest=latheMesh(vp,vm,32,heavy?.8:.71,Math.PI+.28,Math.PI*2-.56); vest.position.y=.02; hips.add(vest);
    ppe.vest=vest; }
  // reflective bands on coveralls
  if(o.outfit==='coverall'){ const ref=std('#d6dade',{r:.25,m:.7}); for(const L of legs){ const b=mesh(new THREE.TorusGeometry(.058,.008,6,20),ref,0,-.2,0); b.rotation.x=Math.PI/2; L.kn.add(b);} for(const A of arms){ const b=mesh(new THREE.TorusGeometry(.046,.008,6,20),ref,0,-.12,0); b.rotation.x=Math.PI/2; A.el.add(b);} }
  if(o.label){ const l=labelSprite(o.label); l.position.y=2.2; g.add(l); g.userData.label=l; }
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:BLOB,transparent:true,depthWrite:false})); blob.rotation.x=-Math.PI/2; blob.position.y=.015; blob.userData.keep=true; blob.userData.blob=true; g.add(blob);
  if(female) g.scale.setScalar(.955); if(o.height) g.scale.multiplyScalar(o.height);
  torso.userData.keep=true;
  g.traverse(m=>{ if(m.isMesh && m!==blob) m.castShadow=true; });
  consolidate(g);
  g.userData={...g.userData,hips,head,torso,arms,legs,ppe,handMeshes,gloveMeshes};
  setPPE(g,{hat:o.hat==='hard',vest:!!o.vest,goggles:!!o.goggles,muffs:!!o.muffs,gloves:!!o.gloves,boots:o.boots!==false&&(o.boots||o.vest||o.hat==='hard')});
  return g;
}
function setPPE(g,p){
  const u=g.userData; if(!u.ppe) return;
  u.ppe.hat.visible=!!p.hat; u.ppe.vest.visible=!!p.vest; u.ppe.goggles.visible=!!p.goggles; u.ppe.muffs.visible=!!p.muffs;
  u.handMeshes.forEach(m=>m.visible=!p.gloves); u.gloveMeshes.forEach(m=>m.visible=!!p.gloves);
  u.legs.forEach(l=>{ l.shoe.visible=!p.boots; l.boot.visible=!!p.boots; });
  if(p.muffs && p.hat){ u.ppe.muffs.position.y=0; }
}
function animHuman(g,step,moving,t,seated){
  const u=g.userData; if(u.gltf){ animGLTF(u,moving&&!seated,t); return; }
  if(!u.legs) return;
  if(seated){ u.legs.forEach(l=>{l.hp.rotation.x=1.45; l.kn.rotation.x=-1.45;}); u.arms.forEach(a=>{a.sh.rotation.x=.9; a.el.rotation.x=.35;}); return; }
  const s=step, a=moving? Math.sin(s):0;
  u.legs[0].hp.rotation.x= a*.42; u.legs[1].hp.rotation.x=-a*.42;
  u.legs[0].kn.rotation.x= moving? -Math.max(0,Math.sin(s+Math.PI*.5))*.7-.04 : -.02;
  u.legs[1].kn.rotation.x= moving? -Math.max(0,Math.sin(s-Math.PI*.5))*.7-.04 : -.02;
  u.arms[0].sh.rotation.x=-a*.36; u.arms[1].sh.rotation.x=a*.36;
  u.arms.forEach((x,i)=>{ x.el.rotation.x= moving? .32 : .1+Math.sin(t*1.3+i)*.03; });
  u.hips.position.y = .95 + (moving? Math.abs(Math.cos(s))*.022 : Math.sin(t*2.2)*.003);
  u.hips.rotation.y = moving? a*.06 : 0;
  u.torso.scale.x = 1 + Math.sin(t*2.2)*.006;
  if(!moving) u.head.rotation.y = Math.sin(t*.45)*.18;
}

// ---------- vehicles & props ----------
function wheel(r,w,x,y,z,mats){ const g=new THREE.Group(); const tire=cyl(r,r,w,mats.tire,0,0,0,20); tire.rotation.z=Math.PI/2; g.add(tire); const rim=cyl(r*.6,r*.6,w+.01,mats.rim,0,0,0,14); rim.rotation.z=Math.PI/2; g.add(rim); g.position.set(x,y,z); return g; }
function makeCar(color,len=4.4,wid=1.8,ht=1.45,van=false){
  const g=new THREE.Group(), body=std(color,{r:.25,m:.6}), glass=std('#1c2630',{r:.05,m:.9}), mats={tire:std('#151515',{r:.8}),rim:std('#9a9a9a',{r:.3,m:.9})};
  g.add(bx(wid,ht*.45,len,body,0,ht*.38,0));
  const cab=bx(wid*.92,ht*(van?.5:.42),len*(van?.86:.55),body,0,ht*(van?.82:.78),van?.15:.1); g.add(cab);
  g.add(bx(wid*.94,ht*(van?.36:.32),len*(van?.84:.5),glass,0,ht*(van?.84:.79),van?.15:.1,false));
  for(const sx of [-1,1]) for(const sz of [-1,1]) g.add(wheel(.33,.24,sx*wid*.46,.33,sz*len*.32,mats));
  const tl=std('#550000',{emissive:'#ff1010',emissiveIntensity:.3}); g.add(bx(.25,.12,.04,tl,-wid*.35,ht*.5,len/2), bx(.25,.12,.04,tl,wid*.35,ht*.5,len/2));
  const hl=std('#fffbe0',{emissive:'#fff6cc',emissiveIntensity:.2}); g.add(bx(.25,.12,.04,hl,-wid*.35,ht*.5,-len/2), bx(.25,.12,.04,hl,wid*.35,ht*.5,-len/2));
  consolidate(g); g.userData.tail=tl; return g;
}
function makeDanfo(){
  const g=makeCar('#f2b705',5,2,2.1,true);
  const stripe=std('#111',{r:.6}); for(const s of [-1,1]) g.add(bx(.02,.12,4.9,stripe,s*1.005,.95,0,false));
  return g;
}
function makeOkada(){
  const g=new THREE.Group(), mats={tire:std('#151515',{r:.8}),rim:std('#888',{r:.3,m:.9})}, fr=std('#b3121b',{r:.3,m:.5});
  g.add(wheel(.3,.08,0,.3,-.65,mats), wheel(.3,.08,0,.3,.65,mats));
  g.add(bx(.12,.25,1.1,fr,0,.6,0)); g.add(bx(.3,.12,.6,std('#111',{r:.7}),0,.78,.2)); g.add(bx(.25,.3,.3,std('#333',{r:.4,m:.6}),0,.45,-.05));
  const bar=cyl(.02,.02,.7,std('#999',{m:.9,r:.3}),0,1,-.55,8); bar.rotation.z=Math.PI/2; g.add(bar);
  return g;
}
function makeForklift(){
  const g=new THREE.Group(), orange=std('#e8890c',{r:.45,m:.3}), dark=std('#2a2a2a',{r:.6,m:.4}), mats={tire:std('#111',{r:.9}),rim:std('#e8890c',{r:.4})};
  g.add(bx(2.0,.9,1.25,orange,0,.75,0)); g.add(bx(.7,1.0,1.25,dark,-.95,.9,0));
  for(const [x,z] of [[-.8,-.55],[-.8,.55],[.25,-.55],[.25,.55]]){ g.add(cyl(.04,.04,1.3,dark,x,1.85,z,8)); }
  g.add(bx(1.2,.06,1.25,dark,-.28,2.5,0));
  for(const z of [-.4,.4]) g.add(bx(.12,2.8,.08,dark,1.08,1.45,z));
  g.add(bx(.06,.5,1,dark,1.16,.45,0)); g.add(bx(1.1,.05,.12,dark,1.7,.18,-.35)); g.add(bx(1.1,.05,.12,dark,1.7,.18,.35));
  const pal=std('#9b7448',{r:.95}); g.add(bx(1.1,.14,1.1,pal,1.72,.28,0));
  const box=std('#b98b5a',{r:.9}); g.add(bx(1,.5,1,box,1.72,.6,0), bx(.9,.4,.9,box,1.72,1.05,0));
  for(const [x,z,r] of [[.6,-.62,.32],[.6,.62,.32],[-.7,-.62,.27],[-.7,.62,.27]]){ const w=wheel(r,.22,0,0,0,mats); w.rotation.y=Math.PI/2; w.position.set(x,r,z); g.add(w); }
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshBasicMaterial({color:'#ff9900'})); beacon.position.set(-.3,2.6,0); g.add(beacon);
  const drv=makeHuman({sex:'m',skin:'#4a2e1e',top:'#24508a',bottom:'#24508a',outfit:'coverall',vest:true,hat:'hard',hatColor:'#f1c40f',longSleeve:true,gloves:true,boots:true}); drv.scale.setScalar(.95); drv.position.set(-.45,.45,0); drv.rotation.y=-Math.PI/2; animHuman(drv,0,false,0,true); g.add(drv);
  beacon.userData.keep=true; consolidate(g); g.userData.beacon=beacon; return g;
}
function propLabel(g){ g.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); if(!g.userData.spin) consolidate(g); return g; }
function makeProp(kind){
  const g=new THREE.Group();
  const carton=std('#b8895a',{r:.95}), steel=std('#9da3a8',{r:.35,m:.85}), red=std('#c8102e',{r:.4,m:.2}), wood=std('#9b7448',{r:.95}), black=std('#1b1b1b',{r:.6});
  const post=(h=1.6)=>cyl(.035,.035,h,steel,0,h/2,0,8);
  const signPlate=(cv,y=1.5,w=.42)=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(w,w*1.25),std('#fff',{map:tex(cv),r:.5,side:THREE.DoubleSide})); p.position.y=y; return p; };
  switch(kind){
    case '🧯': { g.add(post(1.7)); g.add(signPlate(signCanvas('fire','FIRE','EXTINGUISHER'),1.55,.32)); const e=cyl(.085,.085,.5,red,.15,.27,0,16); g.add(e); g.add(cyl(.03,.03,.08,black,.15,.56,0,8)); g.add(bx(.02,.25,.02,black,.24,.4,0,false));
      g.add(bx(.55,.45,.45,carton,.15,.23,-.42), bx(.5,.4,.42,carton,.12,.65,-.42), bx(.5,.45,.45,carton,-.45,.23,-.35)); break; }
    case '🔌': { const pts=[]; for(let i=0;i<7;i++) pts.push(new THREE.Vector3(-1.5+i*.5,.02,Math.sin(i*1.3)*.35)); const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.016,8),std('#e2780e',{r:.5})); g.add(cable);
      g.add(bx(.12,.06,.08,std('#eee',{r:.4}),-1.55,.03,0)); const cu=std('#c87533',{r:.3,m:1}); for(let i=0;i<5;i++){ const w=cyl(.003,.003,.12,cu,1.55+rnd(0,.06),.03,rnd(-.04,.04),4,false); w.rotation.z=Math.PI/2+rnd(-.5,.5); g.add(w);}
      g.add(bx(.4,.35,.3,std('#ddd',{r:.5}),-1.7,.18,.25)); break; }
    case '🚪': { const wall=std('#efe9dc',{map:tex(TX.plaster,1,1),r:.9}); g.add(bx(3,3,.25,wall,0,1.5,.3)); g.add(bx(1.1,2.2,.06,std('#5a6b74',{r:.4,m:.6}),0,1.1,.16));
      const es=new THREE.Mesh(new THREE.PlaneGeometry(.8,.3),std('#0b8a3c',{emissive:'#11c95a',emissiveIntensity:.6,map:tex(boardCanvas('FIRE EXIT','#0b8a3c'))})); es.position.set(0,2.45,.17); es.rotation.y=Math.PI; g.add(es);
      for(let i=0;i<4;i++) g.add(bx(1.2,.14,1,wood,rnd(-.1,.1),.07+i*.15,-.35)); g.add(bx(1,.6,.8,carton,.1,.92,-.35)); break; }
    case '⚙️': { g.add(bx(1.2,.9,.7,std('#3d6b4f',{r:.5,m:.4}),0,.45,0)); const wheelG=cyl(.28,.28,.06,std('#8c8c8c',{r:.7}),.3,1.12,0,24); wheelG.rotation.x=Math.PI/2; g.add(wheelG); g.userData.spin=wheelG;
      const guard=mesh(new THREE.CylinderGeometry(.32,.32,.12,20,1,true,0,Math.PI),std('#e3b81e',{r:.5,side:THREE.DoubleSide}),-.7,.1,.5); guard.rotation.z=Math.PI/2; g.add(guard);
      g.add(bx(.3,.3,.3,steel,-.3,1.05,0)); break; }
    case '🧴': { g.add(bx(.9,.05,.55,wood,0,.8,0)); for(const [x,z] of [[-.4,-.22],[.4,-.22],[-.4,.22],[.4,.22]]) g.add(bx(.05,.8,.05,wood,x,.4,z));
      g.add(cyl(.045,.05,.26,std('#d8eef5',{r:.05,transparent:true,opacity:.45}),.1,.96,0,14)); g.add(cyl(.04,.045,.16,std('#c9e8a0',{r:.1,transparent:true,opacity:.6}),.1,.9,0,12)); g.add(cyl(.02,.02,.04,std('#1b5fbf',{r:.4}),.1,1.11,0,8));
      g.add(bx(.18,.25,.14,std('#eeeeee',{r:.5}),-.2,.95,0)); break; }
    case '🪜': { g.add(bx(1.4,1.6,.9,carton,0,.8,.6)); const lad=new THREE.Group(); const al=std('#bfc4c8',{r:.35,m:.85}); lad.add(bx(.05,2.6,.05,al,-.22,1.3,0), bx(.05,2.6,.05,al,.22,1.3,0));
      for(let i=0;i<8;i++){ if(i===4) continue; const r=bx(.44,.04,.04,al,0,.3+i*.3,0); if(i===5){ r.rotation.z=.5; r.position.x=.08; } lad.add(r); } lad.rotation.x=.22; lad.position.z=-.25; g.add(lad); break; }
    case '🛢️': { const sp=new THREE.Mesh(new THREE.CircleGeometry(1,32),std('#0c0b0a',{r:.05,m:.2,transparent:true,opacity:.92})); sp.rotation.x=-Math.PI/2; sp.scale.set(1.3,.8,1); sp.position.y=.012; sp.receiveShadow=true; g.add(sp);
      const dr=cyl(.29,.29,.88,std('#1f4f9a',{r:.45,m:.3}),-1.2,.29,0,20); dr.rotation.z=Math.PI/2; g.add(dr); break; }
    case '🔥': { const pipe=cyl(.09,.09,3,std('#7a6a5a',{r:.5,m:.7}),0,.9,0,14); pipe.rotation.z=Math.PI/2; g.add(pipe); g.add(bx(.08,.9,.08,steel,-1.2,.45,0), bx(.08,.9,.08,steel,1.2,.45,0));
      const rag=std('#5b4a33',{r:1}); for(let i=0;i<8;i++){ const r=mesh(new THREE.IcosahedronGeometry(rnd(.1,.18),0),rag,rnd(-.4,.4),rnd(.08,.3),rnd(-.15,.2)); r.rotation.set(rnd(0,3),rnd(0,3),0); g.add(r);}
      const hs=new THREE.Mesh(new THREE.PlaneGeometry(.35,.44),std('#fff',{map:tex(signCanvas('warning','HOT','SURFACE')),r:.5})); hs.position.set(0,1.25,.1); hs.rotation.y=Math.PI; g.add(hs); break; }
    case '🩹': { g.add(post(1.7)); const b=bx(.4,.4,.15,std('#f5f5f5',{r:.4}),0,1.35,0); g.add(b); g.add(bx(.08,.26,.01,std('#14853d'),0,1.35,-.08,false), bx(.26,.08,.01,std('#14853d'),0,1.35,-.08,false)); break; }
    case '🗑️': { g.add(cyl(.28,.24,.9,std('#2c7a3a',{r:.6}),0,.45,0,18)); g.add(cyl(.3,.3,.06,std('#245f2f',{r:.6}),0,.92,0,18)); break; }
    case '🚿': { g.add(post(1.4)); g.add(cyl(.18,.12,.12,std('#2db35d',{r:.4}),0,1.1,0,16)); g.add(signPlate(signCanvas('safe','EYE WASH',''),1.75,.32)); break; }
    case '📞': { g.add(post(1.9)); g.add(bx(.35,.5,.25,std('#f3c010',{r:.4}),0,1.4,0)); g.add(bx(.08,.22,.06,black,0,1.4,-.14)); break; }
    case '🪧': { g.add(post(2.4)); const es=new THREE.Mesh(new THREE.PlaneGeometry(.8,.3),std('#0b8a3c',{emissive:'#11c95a',emissiveIntensity:.7,side:THREE.DoubleSide,map:tex(boardCanvas('EXIT ➜','#0b8a3c'))})); es.position.y=2.3; g.add(es); break; }
    case '🧤': { const rack=std('#5d6d7e',{r:.4,m:.6}); g.add(bx(1,1.6,.4,rack,0,.8,.2)); g.add(bx(.95,.03,.38,std('#ccc'),0,.7,.0), bx(.95,.03,.38,std('#ccc'),0,1.2,0));
      for(let i=0;i<3;i++){ const h=mesh(new THREE.SphereGeometry(.12,14,8,0,Math.PI*2,0,Math.PI/2),std('#f1c40f',{r:.35}),-.3+i*.3,1.22,0); g.add(h); g.add(bx(.12,.04,.18,std('#e67e22',{r:.8}),-.3+i*.3,.74,0)); } break; }
  }
  return propLabel(g);
}


// ---------- glTF models (ROADMAP 12/13): rigged avatars and scanned client buildings ----------
// Everything here is optional and lazy: nothing is fetched unless a glTF URL is given (opts.gltf,
// a global SL_AVATAR_URL, or placeSiteModel). On any failure (offline, blocked CDN, bad file) it
// logs one warning per URL and keeps the procedural fallback.
const GLTF_LIB='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
const GLTF_SKEL='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js';
const _gltf={cache:{}, scripts:{}, warned:new Set(), loader:null};
function loadScriptOnce(src){
  return _gltf.scripts[src] || (_gltf.scripts[src]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=()=>rej(new Error('could not load '+src)); document.head.appendChild(s); }));
}
function gltfWarn(url,e){ if(_gltf.warned.has(url)) return; _gltf.warned.add(url); console.warn('Site Life: glTF '+url+' not loaded, using the built-in model ('+((e&&e.message)||e)+')'); }
// Resolves the loaded glTF scene (with .animations); the same object for every call with that URL, so clone it to place it twice.
function loadGLTF(url){
  if(_gltf.cache[url]) return _gltf.cache[url];
  const p=(async()=>{
    if(!window.THREE) throw new Error('three.js missing');
    if(navigator.onLine===false && !/^(blob|data):/.test(url)) throw new Error('offline');
    if(!THREE.GLTFLoader) await loadScriptOnce(GLTF_LIB);
    if(!_gltf.loader) _gltf.loader=new THREE.GLTFLoader();
    const g=await new Promise((res,rej)=>_gltf.loader.load(url,res,undefined,rej));
    g.scene.animations=g.animations||[]; return g.scene;
  })();
  p.catch(e=>gltfWarn(url,e)); // stays cached as failed: one warning, no retry storm
  return (_gltf.cache[url]=p);
}
// Copy a loaded glTF scene; skinned (rigged) models need SkeletonUtils so each copy has its own skeleton.
async function cloneGLTF(src){
  let skinned=false; src.traverse(o=>{ if(o.isSkinnedMesh) skinned=true; });
  if(skinned && !THREE.SkeletonUtils) { try{ await loadScriptOnce(GLTF_SKEL); }catch(e){} }
  const c=(skinned && THREE.SkeletonUtils)? THREE.SkeletonUtils.clone(src) : src.clone(true);
  c.animations=src.animations||[]; return c;
}
// makeHuman() now, swapped for the glTF avatar (opts.gltf or SL_AVATAR_URL) when it loads.
// Extra opts: gltf (URL), gltfHeight (m, default 1.75), gltfFacing ('+z' default glTF convention, or '-z').
function makeHumanGLTF(o={}){
  const g=makeHuman(o);
  const url=o.gltf || (typeof window!=='undefined' && window.SL_AVATAR_URL) || '';
  if(!url) return g;
  loadGLTF(url).then(cloneGLTF).then(model=>{
    const box=new THREE.Box3().setFromObject(model), h=(box.max.y-box.min.y)||1, s=(o.gltfHeight||1.75)/h;
    const holder=new THREE.Group(); holder.add(model); holder.scale.setScalar(s); holder.position.y=-box.min.y*s;
    if(o.gltfFacing!=='-z') holder.rotation.y=Math.PI; // glTF faces +Z; our people face -Z
    model.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false; } });
    const u=g.userData;
    g.children.forEach(ch=>{ if(!(ch===u.label || (ch.userData&&ch.userData.blob))) ch.visible=false; });
    g.add(holder); u.gltf=holder;
    const clips=model.animations||[];
    if(clips.length){
      const mixer=new THREE.AnimationMixer(model), find=re=>clips.find(c=>re.test(c.name));
      const idle=find(/idle|stand|breath/i)||clips[0], walk=find(/walk/i)||find(/run/i);
      u.mixer=mixer; u.gltfActs={idle:mixer.clipAction(idle), walk:walk?mixer.clipAction(walk):null};
      u.gltfActs.idle.play(); u._act='idle';
    }
  }).catch(()=>{}); // warned in loadGLTF; procedural body stays
  return g;
}
function animGLTF(u,moving,t){
  if(!u.mixer) return;
  const dt=u._t==null?0:Math.min(.1,Math.max(0,t-u._t)); u._t=t;
  const want=moving&&u.gltfActs.walk?'walk':'idle';
  if(want!==u._act){ const from=u.gltfActs[u._act], to=u.gltfActs[want]; to.reset().play(); if(from) from.crossFadeTo(to,.25,false); u._act=want; }
  u.mixer.update(dt);
}
// Drop a scanned building (e.g. a Polycam glTF/GLB export) into the world at map coordinates.
// opts: x, y (map units), rot (radians about Y), scale (default 1), elev (m, default 0). Resolves the model, or null on failure.
// Collision is still the game's 2D solids: add a rectangle there for walls the player must not walk through.
function placeSiteModel(scene,url,o={}){
  return loadGLTF(url).then(cloneGLTF).then(m=>{
    m.position.set(X(o.x||0),o.elev||0,Z(o.y||0)); m.rotation.y=o.rot||0; m.scale.setScalar(o.scale||1);
    m.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    scene.add(m); return m;
  }).catch(()=>null);
}

// ---------- WebXR VR mode (ROADMAP 14) ----------
// XR.setup(renderer, scene, camera, opts) shows a "🥽 Enter VR" button only when the browser has an
// immersive-vr device; otherwise it does nothing else (no objects, no listeners).
// opts: frame(t)       one game frame (update + render3D); called from renderer.setAnimationLoop in VR.
//                      Without it XR renders scene/camera itself.
//       getPlayer()    -> {x, y} map position; the VR viewpoint (rig) follows it.
//       getYaw()       -> camera yaw when entering VR (0 = north / -Z).
//       onTeleport(x,y) map position the user pointed at on the floor (trigger, or flick the thumbstick forward).
//       interactive    array of meshes/groups the controller can select; onSelect(obj, hit) is called.
//       modalRoot      element holding the game's DOM modals (default #ovl): while in VR every open modal is
//                      mirrored as a 3D panel and the chosen button is clicked. Set mirror:false to turn off.
//       onStart(), onEnd()
// XR.showPanel(title, options[], cb(index), {text}) shows a question panel in front of the user.
const XR=(()=>{
  const st={active:false, supported:false, interactive:[]};
  let R=null, SC=null, CAM=null, O={}, btn=null, session=null, rig=null, ctrls=[], panel=null, marker=null, mo=null, moT=0, ray=null, tmpM=null, lastSig='';
  function setup(renderer,scene,camera,opts={}){
    R=renderer; SC=scene; CAM=camera; O=opts;
    if(!navigator.xr || typeof navigator.xr.isSessionSupported!=='function') return Promise.resolve(false);
    return navigator.xr.isSessionSupported('immersive-vr').then(ok=>{ st.supported=!!ok; if(ok) addButton(); return !!ok; }).catch(()=>false);
  }
  function addButton(){
    if(btn) return;
    btn=document.createElement('button'); btn.id='xrBtn'; btn.className='fbtn'; btn.textContent='🥽 Enter VR';
    btn.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:30;padding:8px 14px;font-weight:700;border-radius:999px';
    btn.onclick=()=>{ session? session.end() : enter().catch(e=>console.warn('Site Life: VR could not start',e)); };
    (O.buttonParent||document.body).appendChild(btn);
  }
  async function enter(){
    const sess=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
    R.xr.enabled=true; R.xr.setReferenceSpaceType('local-floor');
    try{ await R.xr.setSession(sess); }catch(e){ R.xr.enabled=false; sess.end().catch(()=>{}); throw e; }
    session=sess; st.active=true; btn&&(btn.textContent='Exit VR');
    ray=new THREE.Raycaster(); tmpM=new THREE.Matrix4();
    rig=new THREE.Group(); rig.rotation.y=O.getYaw?O.getYaw():0; SC.add(rig); rig.add(CAM); CAM.position.set(0,0,0); CAM.rotation.set(0,0,0);
    marker=new THREE.Mesh(new THREE.RingGeometry(.22,.3,32),new THREE.MeshBasicMaterial({color:0x22e07a,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
    marker.rotation.x=-Math.PI/2; marker.visible=false; SC.add(marker);
    ctrls=[0,1].map(i=>{
      const c=R.xr.getController(i);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0xffffff,toneMapped:false}));
      line.scale.z=5; c.add(line); c.userData.line=line; c.userData.lock={turn:false,tele:false};
      if(!c.userData.slBound){ c.userData.slBound=true; // getController returns the same object every session
        c.addEventListener('connected',e=>{ c.userData.src=e.data; });
        c.addEventListener('disconnected',()=>{ c.userData.src=null; });
        c.addEventListener('select',()=>{ if(st.active) select(c); }); }
      rig.add(c); return c;
    });
    sess.addEventListener('end',onEnd);
    R.setAnimationLoop(frame);
    watchModals();
    O.onStart&&O.onStart();
  }
  function onEnd(){
    st.active=false; session=null; R.setAnimationLoop(null);
    if(mo){ mo.disconnect(); mo=null; } hidePanel();
    ctrls.forEach(c=>{ const l=c.userData.line; if(l){ c.remove(l); l.geometry.dispose(); } });
    if(rig){ rig.remove(CAM); ctrls.forEach(c=>rig.remove(c)); SC.remove(rig); rig=null; }
    if(marker){ SC.remove(marker); marker.geometry.dispose(); marker=null; }
    ctrls=[]; R.xr.enabled=false; CAM.updateProjectionMatrix(); btn&&(btn.textContent='🥽 Enter VR');
    O.onEnd&&O.onEnd();
  }
  function aim(c){ tmpM.identity().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0,0,-1).applyMatrix4(tmpM); return ray; }
  function floorHit(c){ const p=new THREE.Vector3(); const r=aim(c).ray; if(r.direction.y>-.05) return null; if(!r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p)) return null; return p.distanceTo(r.origin)<30?p:null; }
  function panelHit(c){
    if(!panel) return null;
    const h=aim(c).intersectObject(panel.mesh,false)[0]; if(!h||!h.uv) return null;
    const px=h.uv.x*panel.W, py=(1-h.uv.y)*panel.H;
    const i=panel.rects.findIndex(r=>px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h);
    return {i,dist:h.distance};
  }
  function select(c){
    const ph=panelHit(c);
    if(ph){ if(ph.i>=0){ const cb=panel.cb; hidePanel(); cb&&cb(ph.i); } return; }
    if(panel) return; // a question is open: ignore the world
    const list=st.interactive.concat(O.interactive||[]);
    if(list.length){
      const h=aim(c).intersectObjects(list,true)[0];
      if(h){ let o=h.object; while(o&&!list.includes(o)) o=o.parent; O.onSelect&&O.onSelect(o||h.object,h); return; }
    }
    teleportFrom(c);
  }
  function teleportFrom(c){ const p=floorHit(c); if(p&&O.onTeleport) O.onTeleport(p.x/K,p.z/K); }
  function frame(t){
    const p=O.getPlayer&&O.getPlayer(); if(p&&rig) rig.position.set(X(p.x),0,Z(p.y));
    if(O.frame) O.frame(t); else R.render(SC,CAM);
    pointers();
  }
  function pointers(){
    let showMarker=false;
    for(const c of ctrls){
      const ph=panelHit(c), line=c.userData.line;
      if(ph){ line.scale.z=ph.dist; if(ph.i!==panel.hover){ panel.hover=ph.i; drawPanel(); } continue; }
      const fp=!panel?floorHit(c):null;
      line.scale.z=fp?fp.distanceTo(ray.ray.origin):5;
      if(fp&&marker){ marker.position.set(fp.x,.03,fp.z); showMarker=true; }
      // thumbstick: flick forward = teleport to the pointed spot, left/right = snap turn 30°
      const gp=c.userData.src&&c.userData.src.gamepad; if(!gp||!gp.axes) continue;
      const ax=gp.axes.length>=4?gp.axes[2]:gp.axes[0]||0, ay=gp.axes.length>=4?gp.axes[3]:gp.axes[1]||0, L=c.userData.lock;
      if(Math.abs(ax)>.7&&!L.turn){ L.turn=true; rig.rotation.y-=Math.sign(ax)*Math.PI/6; } else if(Math.abs(ax)<.3) L.turn=false;
      if(ay<-.7&&!L.tele){ L.tele=true; if(!panel) teleportFrom(c); } else if(ay>-.3) L.tele=false;
    }
    if(marker) marker.visible=showMarker;
  }
  // ----- question panels (canvas texture, no DOM) -----
  function wrap(c,text,maxW){ const out=[]; for(const para of String(text).split('\n')){ let line=''; for(const w of para.split(/\s+/)){ const t2=line?line+' '+w:w; if(c.measureText(t2).width>maxW&&line){ out.push(line); line=w; } else line=t2; } out.push(line); } return out; }
  function layout(){
    const W=1024, pad=40, c=document.createElement('canvas').getContext('2d'), P=panel, rows=[];
    let y=pad;
    c.font='bold 46px system-ui,sans-serif'; for(const l of wrap(c,P.title,W-pad*2)){ rows.push({t:l,y:y+46,f:c.font,col:'#ffffff'}); y+=56; }
    if(P.text){ y+=8; c.font='32px system-ui,sans-serif'; for(const l of wrap(c,P.text,W-pad*2).slice(0,9)){ rows.push({t:l,y:y+32,f:c.font,col:'#dfe7ec'}); y+=42; } }
    y+=16; P.rects=[]; c.font='bold 34px system-ui,sans-serif';
    P.options.forEach((o,i)=>{ const ls=wrap(c,(i+1)+'. '+o,W-pad*2-40).slice(0,3), h=ls.length*42+28; P.rects.push({x:pad,y,w:W-pad*2,h,ls}); y+=h+14; });
    P.W=W; P.H=Math.ceil(y+pad-14); P.rows=rows;
  }
  function drawPanel(){
    const P=panel, cv=P.canvas; cv.width=P.W; cv.height=P.H; const c=cv.getContext('2d');
    c.fillStyle='rgba(16,26,32,.94)'; rr(c,0,0,P.W,P.H,36); c.fill(); c.strokeStyle='#0f7a4f'; c.lineWidth=8; rr(c,4,4,P.W-8,P.H-8,32); c.stroke();
    for(const r of P.rows){ c.font=r.f; c.fillStyle=r.col; c.fillText(r.t,40,r.y); }
    c.font='bold 34px system-ui,sans-serif';
    P.rects.forEach((r,i)=>{ c.fillStyle=i===P.hover?'#ffd400':'#2b3b45'; rr(c,r.x,r.y,r.w,r.h,18); c.fill(); c.fillStyle=i===P.hover?'#1d1f22':'#ffffff'; r.ls.forEach((l,k)=>c.fillText(l,r.x+20,r.y+14+34+k*42)); });
    P.tex.needsUpdate=true;
  }
  function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function showPanel(title,options,cb,o={}){
    if(!st.active) return null;
    hidePanel();
    const canvas=document.createElement('canvas'), tx=new THREE.CanvasTexture(canvas); tx.encoding=THREE.sRGBEncoding;
    panel={title:String(title||''),text:o.text||'',options:(options||[]).map(String),cb,hover:-1,canvas,tex:tx};
    layout(); drawPanel();
    const w=1.3, h=w*panel.H/panel.W;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
    m.renderOrder=999; panel.mesh=m;
    // 1.4 m in front of the head, at eye height, facing the user
    const head=new THREE.Vector3(), dir=new THREE.Vector3(); CAM.getWorldPosition(head); CAM.getWorldDirection(dir); dir.y=0; if(dir.lengthSq()<1e-4) dir.set(0,0,-1); dir.normalize();
    m.position.copy(head).addScaledVector(dir,1.4); m.position.y=Math.max(.9,head.y-.05); m.lookAt(head.x,m.position.y,head.z);
    SC.add(m);
    return {close:hidePanel};
  }
  function hidePanel(){ if(!panel) return; SC&&SC.remove(panel.mesh); panel.mesh.geometry.dispose(); panel.mesh.material.dispose(); panel.tex.dispose(); panel=null; lastSig=''; }
  // ----- mirror the game's DOM modals as panels while in VR -----
  function watchModals(){
    if(O.mirror===false) return;
    const root=O.modalRoot||document.getElementById('ovl'); if(!root) return;
    mo=new MutationObserver(()=>{ clearTimeout(moT); moT=setTimeout(()=>mirror(root),60); });
    mo.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});
    mirror(root);
  }
  function mirror(root){
    if(!st.active) return;
    const m=root.querySelector('.modal');
    if(!m){ if(panel&&panel.mirrored) hidePanel(); return; }
    const btns=[...m.querySelectorAll('button:not([disabled]), a.btnlink')].filter(b=>b.getClientRects().length && (b.textContent||'').trim()).slice(0,8); // colour swatches etc. have no text
    const title=((m.querySelector('h1,h2')||{}).textContent||'').trim();
    const fb=m.querySelector('#fb .fb'), p=m.querySelector('p.qt')||[...m.querySelectorAll('p')].find(x=>!x.classList.contains('muted'));
    const text=[p&&p.textContent.trim(), fb&&fb.textContent.trim()].filter(Boolean).join('\n').slice(0,420);
    const labels=btns.map(b=>b.textContent.trim());
    const sig=title+'|'+text+'|'+labels.join('|');
    if(sig===lastSig) return;
    showPanel(title,labels,i=>{ const b=btns[i]; if(b&&b.isConnected) b.click(); },{text});
    if(panel){ panel.mirrored=true; lastSig=sig; }
  }
  return { setup, showPanel, hidePanel, enter, get active(){ return st.active; }, get supported(){ return st.supported; }, interactive:st.interactive, _mirror:mirror };
})();
