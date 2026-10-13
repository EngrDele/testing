// ================== LITTLE STARS (children 3–6) ==================
// Tap-only safety scenes for young children who play with a parent. Built into little.html by src/build.py
// (src/little-shell.html + common.js + room.js + engine.js + this file).
// Design rules: no reading needed (every instruction is spoken with SL.speak and shown as pictures), tap only,
// no losing (wrong taps get a gentle retry and, after 2 misses, the right thing pulses), 30–60 s per scene,
// a sticker per scene (saved on this device) and a one-line tip for the parent.
// Sections: STATE → AUDIO & VOICE → PICTURES → 3D SETUP → PROPS → SCENES → RUNTIME → INPUT → SCREENS → LOOP → TEST HOOK
const LPARAMS = new URLSearchParams(location.search);
const cleanClass = v => String(v||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,20);
let lsClass = cleanClass(LPARAMS.get('class')); const CLASS_FROM_URL = lsClass;
let BLOB = null;                       // shadow blob texture used by makeHuman (engine.js)

// ================== STATE ==================
const kid = Object.assign({name:'', sex:'f', who:'Mummy', parent:''}, SL.store.get('little-kid', {}));
// The parent's phone number is kept ONLY in this browser (localStorage) for the sing-along. It is never sent anywhere.
let kidPhone = SL.store.get('little-phone', '');
let stickers = SL.store.get('little-stickers', {});          // {sceneId: date}
if(!SL.store.get('little-voice-init', false)){ SL.settings.voice = true; SL.settings.captions = true; SL.store.set('settings', SL.settings); SL.store.set('little-voice-init', true); }
let muted=false, audio=null, paused=true, started=false;
let SC=null;          // the scene being played
let RUN=null;         // {ids, i, done:[], times:{}}
const TIMERS=[];      // game-time timers (see later())

// ================== AUDIO & VOICE ==================
function ensureAudio(){ if(!audio){ try{ audio=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(audio&&audio.state==='suspended') audio.resume().catch(()=>{}); }
function tone(f,d=.15,type='sine',v=.07,at=0){ if(muted||!audio) return; try{ const o=audio.createOscillator(), g=audio.createGain(), t=audio.currentTime+at; o.type=type; o.frequency.value=f; o.connect(g); g.connect(audio.destination); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.start(t); o.stop(t+d+.02); }catch(e){} }
const chime=()=>{ tone(660,.14,'sine',.08); tone(990,.16,'sine',.08,.1); tone(1320,.25,'sine',.06,.2); };
const boop=()=>{ tone(330,.18,'triangle',.07); tone(262,.28,'triangle',.06,.15); };
const click=()=>{ tone(1800,.05,'square',.04); tone(900,.06,'square',.03,.06); };
const fanfare=()=>[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i>3?.4:.2,'sine',.07,i*.13));
// "Twinkle twinkle little star" – the sing-along and scrub song
const TWINKLE=[[262,.4],[262,.4],[392,.4],[392,.4],[440,.4],[440,.4],[392,.8],[349,.4],[349,.4],[330,.4],[330,.4],[294,.4],[294,.4],[262,.8]];
function tune(notes=TWINKLE,v=.05){ let at=0; for(const [f,d] of notes){ tone(f,d*.9,'triangle',v,at); tone(f*2,d*.5,'sine',v*.3,at); at+=d; } return at; }

// Spoken lines go through a queue so they do not cut each other off. Lines are already translated (L()).
const fill=(s,...a)=>String(s).replace(/\{(\d)\}/g,(_,i)=>a[+i]!=null?a[+i]:'');
const L=(s,...a)=>fill(tr(s),...a);                 // translate the pattern, then insert names/numbers
let sayQ=[], sayT=0, lastSaid=[];
const estimate=s=>.8+String(s).split(/\s+/).length*.36;
function say(...lines){ lines=lines.filter(Boolean); if(!lines.length) return; lastSaid=lines.slice(); sayQ=lines.slice(); sayT=0; nextSay(); }
function nextSay(){ const s=sayQ.shift(); if(s==null){ sayT=0; return; } const d=estimate(s); if(!muted) SL.speak(s); SL.caption(s, d*1000+900); sayT=d; if(SC) SC.talk=d; }
function later(sec,fn){ TIMERS.push({t:sec,fn}); }

// ================== PICTURES (drawn, so they show without an emoji font) ==================
const ART={};
function art(id){ if(ART[id]) return ART[id]; const C={hot:'#ff7a59',water:'#3fa7ff',medicine:'#9b7bff',socket:'#ffb300',road:'#5cc97b',fire:'#ff5a5a',lost:'#ff8fb1',body:'#36c2b4',hands:'#4fb3ff',seat:'#f2994a'};
  const cv=mkCanvas(160,160,(c,w,h)=>{ const g=c.createRadialGradient(60,50,10,80,80,80); g.addColorStop(0,'#fff'); g.addColorStop(.25,C[id]||'#ffd23f'); g.addColorStop(1,shade(C[id]||'#ffd23f',-.25)); c.fillStyle=g; c.beginPath(); c.arc(80,80,78,0,7); c.fill();
    c.lineWidth=6; c.strokeStyle='#fff'; c.beginPath(); c.arc(80,80,72,0,7); c.stroke(); c.lineCap='round'; c.lineJoin='round';
    const W='#ffffff', D='#2a2340';
    const rr=(x,y,w2,h2,r,f)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w2,y,x+w2,y+h2,r); c.arcTo(x+w2,y+h2,x,y+h2,r); c.arcTo(x,y+h2,x,y,r); c.arcTo(x,y,x+w2,y,r); c.closePath(); c.fillStyle=f; c.fill(); };
    if(id==='hot'){ rr(38,78,84,46,16,'#c0392b'); c.fillStyle='#e74c3c'; c.fillRect(32,72,96,12); c.fillStyle=D; c.fillRect(122,82,22,8); c.strokeStyle=W; c.lineWidth=7; for(const x of [58,80,102]){ c.beginPath(); c.moveTo(x,64); c.bezierCurveTo(x-10,52,x+10,44,x,30); c.stroke(); } }
    if(id==='water'){ c.fillStyle=W; c.beginPath(); c.moveTo(80,26); c.bezierCurveTo(112,70,120,92,110,110); c.arc(80,104,32,0.2,Math.PI-0.2); c.bezierCurveTo(40,92,48,70,80,26); c.fill(); c.fillStyle='#bfe6ff'; c.beginPath(); c.arc(70,104,9,0,7); c.fill(); }
    if(id==='medicine'){ c.save(); c.translate(80,80); c.rotate(-.6); rr(-50,-20,100,40,20,W); c.fillStyle='#ff5a7a'; c.beginPath(); c.moveTo(0,-20); c.lineTo(-30,-20); c.arc(-30,0,20,-Math.PI/2,Math.PI/2,true); c.lineTo(0,20); c.fill(); c.restore(); }
    if(id==='socket'){ rr(42,42,76,76,18,W); c.fillStyle=D; c.fillRect(62,62,10,22); c.fillRect(88,62,10,22); c.beginPath(); c.arc(80,100,7,0,7); c.fill(); c.fillStyle='#ffd23f'; c.beginPath(); c.moveTo(122,30); c.lineTo(104,62); c.lineTo(118,62); c.lineTo(100,94); c.lineTo(132,54); c.lineTo(118,54); c.closePath(); c.fill(); }
    if(id==='road'){ rr(30,40,100,80,10,'#4a4f57'); c.fillStyle=W; for(let i=0;i<4;i++) c.fillRect(40+i*24,48,13,64); }
    if(id==='fire'){ c.fillStyle='#ffd23f'; c.beginPath(); c.moveTo(80,22); c.bezierCurveTo(130,70,124,128,80,130); c.bezierCurveTo(36,128,30,80,58,56); c.bezierCurveTo(60,76,70,80,72,80); c.bezierCurveTo(70,58,76,40,80,22); c.fill(); c.fillStyle='#fff3b0'; c.beginPath(); c.moveTo(80,72); c.bezierCurveTo(104,96,100,124,80,124); c.bezierCurveTo(60,124,58,100,80,72); c.fill(); }
    if(id==='lost'){ rr(50,30,60,100,14,D); rr(56,40,48,70,6,'#bfe6ff'); c.fillStyle=W; c.beginPath(); c.arc(80,120,5,0,7); c.fill(); c.fillStyle='#ffd23f'; c.beginPath(); c.arc(116,58,9,0,7); c.fill(); c.fillRect(122,30,5,28); }
    if(id==='body'){ c.fillStyle=W; c.beginPath(); c.moveTo(80,128); c.bezierCurveTo(20,90,30,36,80,58); c.bezierCurveTo(130,36,140,90,80,128); c.fill(); c.fillStyle=C.body; c.beginPath(); c.moveTo(80,112); c.bezierCurveTo(44,88,52,56,80,72); c.bezierCurveTo(108,56,116,88,80,112); c.fill(); }
    if(id==='hands'){ c.fillStyle=W; c.beginPath(); c.arc(78,96,30,0,7); c.fill(); for(let i=0;i<4;i++){ rr(52+i*14,40+Math.abs(i-1.5)*6,12,50,6,W); } rr(100,84,30,12,6,W); c.fillStyle='rgba(255,255,255,.85)'; for(const [x,y,r] of [[124,40,10],[134,64,7],[36,52,8]]){ c.beginPath(); c.arc(x,y,r,0,7); c.fill(); } }
    if(id==='seat'){ rr(48,28,64,78,16,D); rr(40,100,80,30,12,D); c.strokeStyle='#ffd23f'; c.lineWidth=11; c.beginPath(); c.moveTo(56,40); c.lineTo(100,112); c.stroke(); rr(90,104,24,16,4,'#ff5a5a'); }
  });
  return (ART[id]=cv.toDataURL());
}
function shade(hex,k){ const c=new THREE.Color(hex); const t=k<0?0:1, f=Math.abs(k); c.r+=(t-c.r)*f; c.g+=(t-c.g)*f; c.b+=(t-c.b)*f; return '#'+c.getHexString(); }

// shared sprite textures (never disposed)
const SHARED=new Set(); const STX={};
function sharedTex(name,draw,size=128){ if(!STX[name]){ STX[name]=tex(mkCanvas(size,size,draw),1,1); SHARED.add(STX[name]); } return STX[name]; }
const softTex=()=>sharedTex('soft',(c,w)=>{ const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.45,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(0,0,w,w); });
const starTex=()=>sharedTex('star',(c,w)=>{ c.fillStyle='#fff'; c.beginPath(); for(let i=0;i<10;i++){ const r=i%2?w*.2:w*.48, a=-Math.PI/2+i*Math.PI/5; c.lineTo(w/2+Math.cos(a)*r,w/2+Math.sin(a)*r); } c.closePath(); c.fill(); });
const checkTex=()=>sharedTex('check',(c,w)=>{ c.fillStyle='#2fbf5b'; c.beginPath(); c.arc(w/2,w/2,w*.46,0,7); c.fill(); c.strokeStyle='#fff'; c.lineWidth=w*.07; c.beginPath(); c.arc(w/2,w/2,w*.4,0,7); c.stroke(); c.lineWidth=w*.11; c.lineCap='round'; c.lineJoin='round'; c.beginPath(); c.moveTo(w*.3,w*.52); c.lineTo(w*.45,w*.66); c.lineTo(w*.72,w*.36); c.stroke(); });
const germTex=()=>sharedTex('germ',(c,w)=>{ c.translate(w/2,w/2); c.fillStyle='#5cbf3a'; c.strokeStyle='#5cbf3a'; c.lineWidth=8; c.lineCap='round'; for(let i=0;i<9;i++){ const a=i*Math.PI*2/9; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(a)*54,Math.sin(a)*54); c.stroke(); c.beginPath(); c.arc(Math.cos(a)*54,Math.sin(a)*54,7,0,7); c.fill(); } c.beginPath(); c.arc(0,0,38,0,7); c.fill(); c.fillStyle='#8be05f'; c.beginPath(); c.arc(-10,-12,14,0,7); c.fill(); c.fillStyle='#fff'; for(const x of [-13,13]){ c.beginPath(); c.arc(x,-4,9,0,7); c.fill(); } c.fillStyle='#222'; for(const x of [-11,15]){ c.beginPath(); c.arc(x,-3,4.5,0,7); c.fill(); } c.strokeStyle='#2c6b1a'; c.lineWidth=4; c.beginPath(); c.arc(0,10,10,.2,Math.PI-.2); c.stroke(); });
const noteTex=()=>sharedTex('note',(c,w)=>{ c.fillStyle='#fff'; c.strokeStyle='#fff'; c.beginPath(); c.ellipse(w*.38,w*.72,w*.16,w*.12,-.4,0,7); c.fill(); c.lineWidth=w*.07; c.beginPath(); c.moveTo(w*.52,w*.7); c.lineTo(w*.52,w*.18); c.lineTo(w*.78,w*.3); c.stroke(); });
const bubbleTex=()=>sharedTex('bubble',(c,w)=>{ c.strokeStyle='rgba(255,255,255,.95)'; c.lineWidth=w*.06; c.fillStyle='rgba(200,235,255,.35)'; c.beginPath(); c.arc(w/2,w/2,w*.42,0,7); c.fill(); c.stroke(); c.fillStyle='#fff'; c.beginPath(); c.arc(w*.36,w*.34,w*.08,0,7); c.fill(); });
const flameTex=()=>sharedTex('flame',(c,w)=>{ const g=c.createRadialGradient(w/2,w*.65,2,w/2,w*.6,w*.45); g.addColorStop(0,'#fff7c2'); g.addColorStop(.4,'#ffb12b'); g.addColorStop(1,'rgba(255,80,20,0)'); c.fillStyle=g; c.beginPath(); c.moveTo(w/2,w*.05); c.bezierCurveTo(w*.95,w*.5,w*.85,w*.95,w/2,w*.95); c.bezierCurveTo(w*.15,w*.95,w*.05,w*.5,w/2,w*.05); c.fill(); });
function bgTex(){ return sharedTex('bg',(c,w,h)=>{ const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#9fd8ff'); g.addColorStop(.6,'#d8f0ff'); g.addColorStop(1,'#fff3d6'); c.fillStyle=g; c.fillRect(0,0,w,h); for(const [x,y,r] of [[30,30,14],[48,26,18],[66,32,13],[150,52,12],[166,46,16],[184,54,11]]){ c.fillStyle='rgba(255,255,255,.85)'; c.beginPath(); c.arc(x,y,r,0,7); c.fill(); } },256); }
function spr(t,size,color='#ffffff',o={}){ const m=new THREE.SpriteMaterial({map:t,color:new THREE.Color(color),transparent:true,depthWrite:false,opacity:o.opacity??1,toneMapped:false}); if(o.add) m.blending=THREE.AdditiveBlending; if(o.noDepth) m.depthTest=false; const s=new THREE.Sprite(m); s.scale.set(size,size,1); return s; }

// ================== 3D SETUP ==================
let LOOK=null;
function initScene(){
  const canvas=$('game');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true}); RENDERER=renderer;
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  BLOB=blobTex();
  const scene=new THREE.Scene(); scene.background=bgTex();
  const camera=new THREE.PerspectiveCamera(48,1,.1,200);
  const hemi=new THREE.HemisphereLight(lin('#ffffff'),lin('#ffe0b5'),.95); scene.add(hemi);
  const sun=new THREE.DirectionalLight(lin('#fff3df'),1.35); sun.position.set(4,11,7); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
  const sc=sun.shadow.camera; sc.left=-7; sc.right=7; sc.top=7; sc.bottom=-7; sc.near=1; sc.far=30; sun.shadow.bias=-.0006; sun.shadow.normalBias=.02; scene.add(sun,sun.target);
  G={renderer,scene,camera,sun,hemi,root:null,fx:[],t:0};
  LOOK=new THREE.Vector3();
  addEventListener('resize',resize3D); resize3D(); applyQuality();
  SL.fps.cb=()=>{ applyQuality(); toast(tr('Graphics set to Low to keep the game smooth on this device. Change it in ⚙️ Settings.')); };
}
function resize3D(){ if(!G) return; G.renderer.setSize(innerWidth,innerHeight,false); G.camera.aspect=innerWidth/innerHeight; G.camera.updateProjectionMatrix(); }
function applyQuality(){
  if(!G) return; const q=SL.quality(), r=G.renderer, dpr=devicePixelRatio||1;
  r.setPixelRatio(q==='low'?Math.min(1,dpr)*.75:q==='medium'?Math.min(1.25,dpr):Math.min(1.75,dpr)); resize3D();
  const shadows=q!=='low'; if(r.shadowMap.enabled!==shadows){ r.shadowMap.enabled=shadows; G.scene.traverse(o=>{ if(o.material) [].concat(o.material).forEach(m=>m.needsUpdate=true); }); }
  G.sun.castShadow=shadows;
  if(G.root) G.root.traverse(o=>{ if(o.userData&&o.userData.decor) o.visible=q!=='low'; });
}
// Dollhouse camera: fits the scene's view box into the screen area between the top bar and the picture cards,
// and sways very gently. No dragging.
// A step may set `view` to zoom on where the action is; the camera glides there.
const CAMP=new THREE.Vector3(), CAML=new THREE.Vector3(); let camSnap=true;
function placeCamera(t,dt=1){
  const cam=G.camera, v=Object.assign({x:0,z:0,w:7,d:6,h:2.4},SC&&SC.def.view,SC&&SC.st&&SC.st.view), W=innerWidth, H=innerHeight, portrait=W<H;
  const top=74, bottom=W<=600?150:162, hu=Math.max(180,H-top-bottom);
  const fov=portrait?56:44; if(cam.fov!==fov){ cam.fov=fov; }
  const el=(portrait?.95:.64)+Math.sin(t*.13)*.015, yaw=Math.sin(t*.09)*.05+(v.yaw||0)*(portrait?.5:1);
  const tanV=Math.tan(fov*Math.PI/360), aspect=W/H;
  const dW=(v.w*(portrait?.43:.5))/(tanV*aspect)+(v.d/2)*Math.cos(el)*.5;   // portrait: crop the board's edges a little so things are bigger
  const dH=((v.d/2)*Math.sin(el)+(v.h/2)*Math.cos(el))/(tanV*hu/H);
  const d=Math.max(dW,dH)*1.04;
  LOOK.set(v.x,v.h*.32,v.z); const P=new THREE.Vector3(LOOK.x+Math.sin(yaw)*Math.cos(el)*d,LOOK.y+Math.sin(el)*d,LOOK.z+Math.cos(yaw)*Math.cos(el)*d);
  const k=camSnap||dt>=1?1:1-Math.exp(-dt*2.2); camSnap=false; CAMP.lerp(P,k); CAML.lerp(LOOK,k);
  cam.position.copy(CAMP); cam.lookAt(CAML); cam.setViewOffset(W,H,0,(bottom-top)/2,W,H);
  G.sun.position.set(v.x+4,11,v.z+7); G.sun.target.position.set(v.x,0,v.z);
}

// ================== PROPS ==================
// Everything is built for one scene into G.root and disposed when the scene ends (low-end phones).
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const mt=(c,o={})=>std(c,{r:o.r??.55,...o});
const grp=(...ch)=>{ const g=new THREE.Group(); ch.forEach(c=>c&&g.add(c)); return g; };
const at=(o,x,y,z,ry=0,s=1)=>{ o.position.set(x,y,z); o.rotation.y=ry; if(s!==1) o.scale.setScalar(s); return o; };
const decor=o=>{ o.userData.decor=true; return o; };
function addR(o){ G.root.add(o); return o; }
function faceTo(o,x,z){ o.rotation.y=Math.atan2(-(x-o.position.x),-(z-o.position.z)); }
function canvasTex(w,h,draw,rx=1,ry=1){ return tex(mkCanvas(w,h,draw),rx,ry); }
function roundRect(w,d,r){ const s=new THREE.Shape(), x=-w/2, y=-d/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+d-r); s.quadraticCurveTo(x+w,y+d,x+w-r,y+d); s.lineTo(x+r,y+d); s.quadraticCurveTo(x,y+d,x,y+d-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; }
const FLOORS={
  tiles:(a,b)=>canvasTex(128,128,(c,w)=>{ for(let y=0;y<4;y++) for(let x=0;x<4;x++){ c.fillStyle=(x+y)%2?a:b; c.fillRect(x*32,y*32,32,32); } c.strokeStyle='rgba(0,0,0,.06)'; c.lineWidth=2; for(let i=0;i<=4;i++){ c.beginPath(); c.moveTo(i*32,0); c.lineTo(i*32,128); c.moveTo(0,i*32); c.lineTo(128,i*32); c.stroke(); } },1,1),
  planks:(a)=>canvasTex(128,128,(c,w)=>{ c.fillStyle=a; c.fillRect(0,0,128,128); for(let y=0;y<128;y+=21){ c.fillStyle='rgba(120,70,20,.12)'; c.fillRect(0,y,128,2); c.fillRect((y*37)%128,y,2,21); } }),
  grass:()=>canvasTex(128,128,(c)=>{ c.fillStyle='#8fd16a'; c.fillRect(0,0,128,128); for(let i=0;i<260;i++){ c.fillStyle=Math.random()<.5?'rgba(255,255,255,.12)':'rgba(40,110,30,.13)'; c.beginPath(); c.arc(Math.random()*128,Math.random()*128,1+Math.random()*2.5,0,7); c.fill(); } }),
  pavers:()=>canvasTex(128,128,(c)=>{ c.fillStyle='#e9dcc4'; c.fillRect(0,0,128,128); c.strokeStyle='rgba(150,120,90,.35)'; c.lineWidth=2; for(let y=0;y<128;y+=32){ c.beginPath(); c.moveTo(0,y); c.lineTo(128,y); c.stroke(); for(let x=(y/32%2)*32;x<128;x+=64){ c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+32); c.stroke(); } } }),
  sand:()=>canvasTex(128,128,(c)=>{ c.fillStyle='#f1d9a6'; c.fillRect(0,0,128,128); for(let i=0;i<300;i++){ c.fillStyle='rgba(150,110,60,.12)'; c.fillRect(Math.random()*128,Math.random()*128,2,2); } }),
};
// The play board: a rounded slab with a floor, optional back + left walls (cut-away dollhouse) and a window.
function board(o={}){
  const w=o.w||8, d=o.d||6, h=.35;
  const slabG=new THREE.ExtrudeGeometry(roundRect(w,d,.5),{depth:h,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:2,curveSegments:6}); slabG.rotateX(-Math.PI/2); slabG.translate(0,-h-.06,0);
  const slab=new THREE.Mesh(slabG,mt(o.side||'#f2b98a',{r:.8})); slab.receiveShadow=true; addR(slab);
  const ft=o.floor||FLOORS.planks('#f7d6a6'); ft.repeat.set(1/(o.rep||1.2),1/(o.rep||1.2));
  const top=new THREE.Mesh(new THREE.ShapeGeometry(roundRect(w-.08,d-.08,.46),6),mt('#ffffff',{map:ft,r:.85})); top.rotation.x=-Math.PI/2; top.position.y=.004; top.receiveShadow=true; addR(top);
  if(o.walls!==false){
    const wm=mt(o.wall||'#ffe6a8',{r:.9}), trim=mt(o.trim||'#ffffff',{r:.6}), wh=o.wallH||2.3;
    addR(bx(w-.6,wh,.22,wm,0,wh/2,-d/2+.2)); addR(bx(w-.6,.1,.3,trim,0,wh+.04,-d/2+.2));
    if(o.left!==false){ addR(bx(.22,wh,d-.6,wm,-w/2+.2,wh/2,0)); addR(bx(.3,.1,d-.6,trim,-w/2+.2,wh+.04,0)); }
    addR(bx(w-.6,.14,.26,trim,0,.07,-d/2+.22));
    if(o.window!==false){ const wx=o.winX??1.3; addR(bx(1.5,1.0,.06,mt('#bfe9ff',{r:.1,emissive:'#9fd8ff',emissiveIntensity:.35}),wx,1.45,-d/2+.32)); for(const [x,y,ww,hh] of [[0,.5,1.62,.1],[0,-.5,1.62,.1],[-.76,0,.1,1.1],[.76,0,.1,1.1],[0,0,.06,1.0]]) addR(bx(ww,hh,.1,trim,wx+x,1.45+y,-d/2+.34)); }
  }
}
function plantPot(x,z,s=1){ const g=grp(cyl(.22,.17,.36,mt('#d9774a'),0,.18,0,14)); for(let i=0;i<5;i++){ const l=sph(.17,mt('#3fae5a'),Math.cos(i*1.3)*.13,.5+i*.07,Math.sin(i*1.3)*.13,10); l.scale.set(1,1.5,.6); l.rotation.y=i; g.add(l); } return addR(decor(at(g,x,0,z,0,s))); }
function rug(x,z,w,d,col1,col2){ const t=canvasTex(128,64,(c)=>{ c.fillStyle=col1; c.fillRect(0,0,128,64); c.fillStyle=col2; for(let i=0;i<128;i+=16) c.fillRect(i,0,8,64); c.strokeStyle='#fff'; c.lineWidth=4; c.strokeRect(4,4,120,56); }); const m=new THREE.Mesh(new THREE.ShapeGeometry(roundRect(w,d,.2)),mt('#fff',{map:t,r:.95})); m.geometry.computeBoundingBox(); const uv=m.geometry.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,(uv.getX(i)+w/2)/w,(uv.getY(i)+d/2)/d); m.rotation.x=-Math.PI/2; m.position.set(x,.012,z); m.receiveShadow=true; return addR(decor(m)); }
function tree(x,z,s=1){ const g=grp(cyl(.12,.16,1.4,mt('#9b6a3c'),0,.7,0,8)); for(const [dx,dy,dz,r] of [[0,1.7,0,.7],[.4,1.4,.1,.5],[-.4,1.5,-.1,.5]]) g.add(sph(r,mt('#4cbf63'),dx,dy,dz,12)); return addR(decor(at(g,x,0,z,0,s))); }
function table(x,z,w=1.2,d=.7,h=.7,col='#c98a4b'){ const m=mt(col); const g=grp(bx(w,.07,d,m,0,h,0)); for(const sx of [-1,1]) for(const sz of [-1,1]) g.add(cyl(.04,.04,h,m,sx*(w/2-.08),h/2,sz*(d/2-.08),8)); consolidate(g); return addR(at(g,x,0,z)); }
function stool(x,z,h=.45,col='#5cc97b'){ const g=grp(cyl(.24,.24,.06,mt(col),0,h,0,18)); for(let i=0;i<3;i++){ const a=i*2.09; g.add(cyl(.03,.03,h,mt(col),Math.cos(a)*.15,h/2,Math.sin(a)*.15,6)); } consolidate(g); return addR(at(g,x,0,z)); }
function waterDisc(r,y,col='#6fc8ff',sz=1){ const m=new THREE.Mesh(new THREE.CircleGeometry(r,24),mt(col,{r:.08,m:.1,transparent:true,opacity:.92,emissive:'#4fb3ff',emissiveIntensity:.15})); m.rotation.x=-Math.PI/2; m.position.y=y; m.scale.y=sz; return m; }
function steam(parent,x,y,z,n=3,col='#ffffff'){ const t=softTex(); for(let i=0;i<n;i++){ const s=spr(t,.3,col,{opacity:.6}); s.userData.st={x,y,z,ph:i/n}; parent.add(s); SC.ticks.push((tt)=>{ const u=s.userData.st, k=(tt*.45+u.ph)%1; s.position.set(u.x+Math.sin(tt*2+u.ph*6)*.06,u.y+k*.7,u.z); s.material.opacity=.65*(1-k); const sz=.18+k*.35; s.scale.set(sz,sz,1); }); } }
// People
function mummy(x,z){ return makeHuman({sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:ankara('#f1c40f','#c0392b','#ffffff'),topMap:ankara('#c0392b','#f1c40f','#1abc9c'),shoe:'#5a1d1d'}); }
function teacher(){ return makeHuman({sex:'f',skin:'#3b2416',top:'#f1e3c6',bottom:'#2b3a55',longSleeve:true,hair:'bun',collar:true}); }
function childFig(o={}){ const f=(o.sex||kid.sex)==='f'; return makeHuman(f?{sex:'f',skin:o.skin||'#5a3825',dress:true,outfit:'dress',topMap:ankara(o.c1||'#ff8fb1',o.c2||'#ffd23f','#ffffff'),hair:'braids',height:.6,shoe:'#c0392b'}
  :{sex:'m',skin:o.skin||'#5a3825',top:o.top||'#3fa7ff',bottom:'#1f4e8c',hair:'low',height:.6,shoe:'#2b1d14'}); }
function guide(kind,x,z){ const g=kind==='teacher'?teacher():mummy(); at(g,x,0,z); g.rotation.y=Math.PI-.35; addR(g); SC.guide=g; return g; }
function child(x,z,o){ const g=childFig(o); g.rotation.order='YXZ'; at(g,x,0,z); g.rotation.y=Math.PI; addR(g); SC.child=g; return g; }
// Vehicles and seats
function makeKeke(driver=true,roofOn=true){
  const g=new THREE.Group(), yel=mt('#f2c318',{r:.35,m:.25}), grn=mt('#1f7a3a',{r:.4,m:.2}), blk=mt('#161616',{r:.7}), roof=mt('#1d2a22',{r:.9}), seat=mt('#5a3a28',{r:.8}), steel=mt('#9a9a9a',{r:.3,m:.8}), mats={tire:mt('#151515',{r:.8}),rim:mt('#8a8a8a',{r:.3,m:.8})};
  g.add(bx(1.2,.12,2.3,blk,0,.42,0), bx(1.3,.5,.9,yel,0,.72,.68), bx(1.32,.1,.92,grn,0,.95,.68), bx(1.16,.12,.5,seat,0,1.02,.62), bx(1.16,.55,.1,seat,0,1.33,1.0));
  g.add(bx(.95,.75,.45,yel,0,.85,-.95), bx(.97,.08,.47,grn,0,1.05,-.95));
  if(roofOn){ g.add(bx(1.42,.07,2.25,roof,0,1.92,-.05), bx(1.44,.12,.06,grn,0,1.86,-1.17), bx(1.44,.12,.06,grn,0,1.86,1.07));
  for(const [x,z] of [[-.64,-1.05],[.64,-1.05],[-.64,1.02],[.64,1.02]]) g.add(cyl(.025,.025,1.5,steel,x,1.17,z,6)); }
  else for(const [x,z] of [[-.64,-1.05],[.64,-1.05]]) g.add(cyl(.025,.025,.6,steel,x,1.35,z,6));
  g.add(bx(.4,.1,.38,seat,0,.98,-.42));
  g.add(wheel(.23,.12,0,.23,-1.0,mats), wheel(.23,.14,-.62,.23,.72,mats), wheel(.23,.14,.62,.23,.72,mats));
  if(driver){ const d=makeHuman({sex:'m',skin:'#3b2416',top:'#2d4a6b',bottom:'#222',longSleeve:true,hat:'cap',hatColor:'#7a1f2b'}); d.position.set(0,.2,-.4); animHuman(d,0,false,0,true); g.add(d); }
  consolidate(g); return g;
}

// ================== SCENES ==================
// Each scene: id, title, sticker art (art(id)), intro, steps, rule, tip (for the parent).
// A step: say (spoken prompt), ok (ids to tap; 3D objects or picture cards), decoys (wrong 3D objects),
// cards [{id, e (emoji), t (short caption for the parent)}], order (ok must be tapped in this order),
// yes/no {id: line}, need (taps needed; default ok.length), enter(), onOk(id), check(id) -> wait message.
const GENERIC_NO='Hmm, not that one. Let\'s try again.';
const PRAISE=['Yes! Well done!','Super!','Good job!','You are a star!'];
const SCENES=[
// ---------- 1. Hot! Ouch! ----------
{ id:'hot', title:'Hot! Ouch!', guide:'mummy', view:{x:0,z:-.3,w:6.6,d:5.2,h:2.2},
  intro:'This is Mummy\'s kitchen. Some things here are very hot. Hot things can burn you.',
  build(){ board({floor:FLOORS.tiles('#fff7e6','#ffe3c4'),wall:'#ffe39a',side:'#f2a36b',winX:.6});
    // gas cooker on a cabinet, pot with the handle sticking out
    const cab=grp(bx(1.3,.8,.7,mt('#f7f2ea'),0,.4,0), bx(1.2,.08,.62,mt('#2d2d2d',{r:.4,m:.3}),0,.84,0), cyl(.13,.13,.03,mt('#555'),-.3,.89,0,16), cyl(.13,.13,.03,mt('#555'),.3,.89,0,16), bx(.9,.05,.04,mt('#ddd'),0,.62,.36)); consolidate(cab); addR(at(cab,-2.2,0,-2.0));
    const flame=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,16),new THREE.MeshBasicMaterial({color:'#3fa7ff'})); flame.rotation.x=Math.PI/2; flame.position.set(-1.9,.91,-2.0); addR(flame);
    const pot=grp(cyl(.27,.24,.32,mt('#e2553f',{r:.35,m:.3}),0,.16,0,20), cyl(.29,.29,.04,mt('#c94632',{r:.35,m:.3}),0,.33,0,20), sph(.05,mt('#333'),0,.38,0,10), bx(.42,.05,.07,mt('#333'),0,.22,.4)); consolidate(pot);
    tapObj('pot',at(pot,-1.9,.9,-2.0)); steam(G.root,-1.9,1.35,-2.0,4);
    // ironing board + hot iron with a hanging cord
    const ib=grp(bx(1.5,.05,.45,mt('#7fc8f8'),0,.86,0)); const lg=mt('#888',{m:.6,r:.4}); for(const s of [-1,1]){ const l=bx(.04,1.0,.04,lg,s*.18,.43,0); l.rotation.z=s*.45; ib.add(l); } consolidate(ib); addR(at(ib,1.7,0,-1.7));
    const iron=grp(bx(.42,.12,.22,mt('#f2f2f7',{r:.3}),0,.06,0), bx(.4,.03,.2,mt('#9aa4ad',{m:.8,r:.25}),0,0,0), bx(.24,.05,.05,mt('#5b6cff'),0,.22,0), bx(.04,.1,.04,mt('#5b6cff'),-.09,.15,0), bx(.04,.1,.04,mt('#5b6cff'),.09,.15,0), sph(.03,new THREE.MeshBasicMaterial({color:'#ff3b30'}),.14,.13,.08,8)); consolidate(iron);
    tapObj('iron',at(iron,1.5,.9,-1.7,.3)); steam(G.root,1.5,1.05,-1.7,2);
    const cord=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(1.72,.98,-1.75),V3(2.3,.9,-1.6),V3(2.45,.4,-1.5),V3(2.5,.03,-1.2),V3(2.2,.03,-.9)]),40,.018,6),mt('#333')); addR(cord);
    // small table: hot tea; stool: cold water
    table(-.6,-.6,.9,.7,.62,'#d9a066');
    const tea=grp(cyl(.13,.1,.2,mt('#ffffff',{r:.3}),0,.1,0,18), cyl(.11,.11,.01,mt('#8a4b1c',{r:.2}),0,.195,0,18), cyl(.2,.2,.02,mt('#ffffff'),0,0,0,18)); const hd=mesh(new THREE.TorusGeometry(.06,.018,6,12),mt('#ffffff'),.15,.1,0); tea.add(hd); consolidate(tea);
    tapObj('tea',at(tea,-.75,.66,-.6)); steam(G.root,-.75,.92,-.6,3);
    stool(.9,.3,.45,'#5cc97b');
    const water=grp(cyl(.12,.1,.26,mt('#d8f1ff',{r:.05,transparent:true,opacity:.55}),0,.13,0,16), cyl(.1,.09,.18,mt('#6fc8ff',{r:.1,transparent:true,opacity:.75}),0,.1,0,16), bx(.06,.06,.06,mt('#ffffff',{r:.1}),.03,.2,0), bx(.05,.05,.05,mt('#ffffff',{r:.1}),-.03,.22,.03)); consolidate(water);
    tapObj('water',at(water,.9,.49,.3));
    // kerosene (hurricane) lamp on a stool
    stool(-2.6,.4,.4,'#ff8fb1');
    const lamp=grp(cyl(.16,.19,.14,mt('#c0392b',{r:.4,m:.4}),0,.07,0,16), cyl(.07,.07,.08,mt('#888',{m:.7}),0,.17,0,10), cyl(.12,.16,.06,mt('#c0392b',{r:.4,m:.4}),0,.52,0,14));
    const glass=sph(.15,mt('#fff3c4',{r:.05,transparent:true,opacity:.45}),0,.34,0,16); glass.scale.y=1.25; lamp.add(glass);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:'#ffb12b'})); fl.scale.y=2; fl.position.y=.32; fl.userData.keep=true; lamp.add(fl);
    const ring=mesh(new THREE.TorusGeometry(.14,.012,6,16,Math.PI),mt('#888',{m:.7}),0,.6,0); lamp.add(ring); consolidate(lamp);
    tapObj('lamp',at(lamp,-2.6,.43,.4)); const lg2=spr(softTex(),.7,'#ffcc66',{add:true,opacity:.6}); lg2.position.set(-2.6,.77,.4); addR(lg2);
    // decoys: banana and teddy on a mat
    rug(.1,1.5,2.6,1.2,'#9b7bff','#b9a3ff');
    const ban=grp(); const bm=mesh(new THREE.TorusGeometry(.2,.06,8,18,Math.PI*.75),mt('#ffd93b',{r:.5})); bm.rotation.z=Math.PI*.12; ban.add(bm); ban.add(sph(.03,mt('#6b4a1f'),.19,.07,0,6)); ban.rotation.x=-Math.PI/2; const banW=grp(ban); tapObj('banana',at(banW,.9,.08,1.6));
    tapObj('teddy',at(teddy(),-.7,0,1.5,.3));
    plantPot(2.9,-2.2); guide('mummy',2.7,.9); child(.1,.9);
  },
  steps:[
    { say:'Tap the hot things. Can you find four hot things?', ok:['pot','iron','tea','lamp'], decoys:['banana','teddy','water'],
      yes:{pot:'Yes! The pot on the cooker is hot.',iron:'Yes! The iron is hot.',tea:'Yes! Hot tea can burn you.',lamp:'Yes! The lamp has fire. It is hot.'},
      no:{banana:'That is a banana. It is not hot. Let\'s try again.',teddy:'That is Teddy. Teddy is not hot. Let\'s try again.',water:'That is cold water. It is not hot. Let\'s try again.'} },
    { say:'If something is hot, what do we do?', ok:['notouch','call'], cards:[{id:'notouch',e:'✋',t:'Don\'t touch'},{id:'touch',e:'👆',t:'Touch it'},{id:'call',e:'🙋🏾',t:'Call a big person'}],
      yes:{notouch:'Yes! Don\'t touch hot things.',call:'Yes! Call a big person.'}, no:{touch:'Ouch! That is hot. Let\'s try again.'} },
  ],
  rule:'Hot things: don\'t touch! Call a big person.',
  tip:'Turn pot handles to the back of the cooker. Keep hot drinks, the iron and its cord out of reach. Keep children out of the cooking area.' },

// ---------- 2. Water at home ----------
{ id:'water', title:'Water at home', guide:'mummy', view:{x:0,z:-.3,w:6.6,d:5.2,h:2},
  intro:'Water is fun, but a small child can fall into water. Even a little water in a bucket is dangerous.',
  build(){ board({floor:FLOORS.pavers(),walls:false,side:'#c9a27a'});
    const wl=mt('#f6e3c0',{r:.9}); addR(decor(bx(7.4,1.2,.2,wl,0,.6,-2.75))); addR(decor(bx(7.4,.08,.26,mt('#d96c4a'),0,1.24,-2.75)));
    tree(-3.3,-2.2,.9); plantPot(3.3,-2.2);
    const bucket=grp(cyl(.3,.24,.52,mt('#2e86de',{r:.4}),0,.26,0,20), mesh(new THREE.TorusGeometry(.3,.025,6,24),mt('#1f6fbf'),0,.52,0)); bucket.children[1].rotation.x=Math.PI/2; bucket.add(waterDisc(.28,.525)); const hdl=mesh(new THREE.TorusGeometry(.3,.012,6,20,Math.PI),mt('#999',{m:.7}),0,.52,0); bucket.add(hdl); consolidate(bucket);
    tapObj('bucket',at(bucket,-2.4,0,.4));
    const drum=grp(cyl(.45,.45,1.0,mt('#1f5fbf',{r:.4}),0,.5,0,24)); for(const y of [.3,.7]){ const r=mesh(new THREE.TorusGeometry(.455,.025,6,28),mt('#174f9f'),0,y,0); r.rotation.x=Math.PI/2; drum.add(r); } drum.add(waterDisc(.42,1.005)); consolidate(drum);
    tapObj('drum',at(drum,-1.0,0,-1.8));
    const lid=grp(cyl(.47,.47,.06,mt('#1f5fbf',{r:.4}),0,0,0,24), cyl(.1,.1,.06,mt('#174f9f'),0,.05,0,12)); lid.children.forEach(c=>c.userData.keep=true);
    tapObj('lid',at(lid,.1,.04,-1.3)); lid.rotation.x=.12;
    const well=grp(); const st=mt('#b9ada0',{r:.95}); const wallG=new THREE.CylinderGeometry(.7,.75,.6,24,1,true); const wm=new THREE.Mesh(wallG,mt('#b9ada0',{r:.95,side:THREE.DoubleSide})); wm.position.y=.3; wm.castShadow=true; well.add(wm);
    const rim=mesh(new THREE.TorusGeometry(.72,.07,8,28),st,0,.6,0); rim.rotation.x=Math.PI/2; well.add(rim); well.add(waterDisc(.68,.18,'#23628f'));
    for(const s of [-1,1]) well.add(bx(.08,1.2,.08,mt('#9b6a3c'),s*.8,.6,0)); const bar=cyl(.04,.04,1.7,mt('#9b6a3c'),0,1.15,0,8); bar.rotation.z=Math.PI/2; well.add(bar); well.add(cyl(.008,.008,.6,mt('#d8c08a'),0,.85,0,4));
    tapObj('well',at(well,1.8,0,-1.5));
    const bath=grp(cyl(.55,.45,.32,mt('#ff9ecb',{r:.4}),0,.16,0,24)); const br=mesh(new THREE.TorusGeometry(.55,.04,6,28),mt('#ff7ab3'),0,.32,0); br.rotation.x=Math.PI/2; bath.add(br); bath.add(waterDisc(.52,.325)); bath.scale.z=.7; consolidate(bath);
    tapObj('bath',at(bath,1.2,0,.9));
    const ball=sph(.25,mt('#ffffff',{r:.4,map:canvasTex(64,32,(c)=>{ ['#ff5a5a','#ffd23f','#3fa7ff','#5cc97b'].forEach((col,i)=>{ c.fillStyle=col; c.fillRect(i*16,0,16,32); }); })}),0,.25,0,18);
    tapObj('ball',at(grp(ball),-.6,0,1.5));
    const fl=grp(cyl(.2,.16,.3,mt('#d9774a'),0,.15,0,14)); ['#ff5a7a','#ffd23f','#9b7bff','#ff8fb1'].forEach((c2,i)=>{ fl.add(cyl(.012,.012,.35,mt('#3fae5a'),Math.cos(i*1.6)*.08,.45,Math.sin(i*1.6)*.08,4)); fl.add(sph(.08,mt(c2),Math.cos(i*1.6)*.1,.63,Math.sin(i*1.6)*.1,10)); }); consolidate(fl);
    tapObj('flowers',at(fl,2.9,0,.5));
    guide('mummy',2.9,1.6); child(-1.1,.6);
  },
  steps:[
    { say:'Tap the water that is not safe. Can you find four?', ok:['bucket','drum','well','bath'], decoys:['ball','flowers'],
      yes:{bucket:'Yes! An open bucket of water is not safe.',drum:'Yes! The drum has no cover.',well:'Yes! The well has no cover. It is very deep.',bath:'Yes! Bath water is not safe when no big person is there.'},
      no:{ball:'That is a ball. It is safe. Let\'s try again.',flowers:'Those are flowers. They are safe. Let\'s try again.'} },
    { say:'Let\'s help Mummy. Tap the lid to cover the drum.', ok:['lid'], yes:{lid:'Yes! Now the drum is covered.'},
      onOk(){ const l=ENT.lid.obj, p0=l.position.clone(), r0=l.rotation.x; anim(.8,k=>{ l.position.set(p0.x+(-1.0-p0.x)*k,p0.y+(1.03-p0.y)*k+Math.sin(k*Math.PI)*.6,p0.z+(-1.8-p0.z)*k); l.rotation.x=r0*(1-k); }); } },
    { say:'When can you play near water?', ok:['bigp'], cards:[{id:'bigp',e:'🧑🏾‍🧒🏾',t:'Only with a big person'},{id:'alone',e:'🧒🏾',t:'Alone'}],
      yes:{bigp:'Yes! Only with a big person.'}, no:{alone:'No! Never play near water alone. Let\'s try again.'} },
  ],
  rule:'Play near water only with a big person.',
  tip:'Empty buckets and baths after use. Cover water drums and wells. Never leave a young child alone near water, even shallow water, not even for a minute.' },

// ---------- 3. Medicine is not sweets ----------
{ id:'medicine', title:'Medicine is not sweets', guide:'mummy', view:{x:0,z:-.4,w:6.2,d:5,h:2.6},
  intro:'Some things look like sweets or drinks, but they are medicine or poison. Let\'s sort them.',
  build(){ board({floor:FLOORS.tiles('#f2f7ff','#dfeaff'),wall:'#d9ccff',side:'#a58be8',winX:-1.2});
    table(0,-.5,1.9,.9,.72,'#ff9ecb');
    const bk=grp(cyl(.55,.42,.4,mt('#d9a35b',{r:.9,map:canvasTex(64,64,(c)=>{ c.fillStyle='#d9a35b'; c.fillRect(0,0,64,64); c.strokeStyle='#b07a35'; c.lineWidth=3; for(let i=0;i<64;i+=8){ c.beginPath(); c.moveTo(0,i); c.lineTo(64,i); c.stroke(); c.beginPath(); c.moveTo(i,0); c.lineTo(i,64); c.stroke(); } },4,1)}),0,.2,0,22));
    const hb=mesh(new THREE.TorusGeometry(.5,.035,6,24,Math.PI),mt('#b07a35'),0,.4,0); bk.add(hb); for(const [x,z,c2] of [[-.2,0,'#ff5a3d'],[.15,.1,'#ffd93b'],[0,-.18,'#5cc97b']]) bk.add(sph(.13,mt(c2),x,.45,z,12)); consolidate(bk);
    tapObj('food',at(bk,-2.3,0,.6));
    const cup=grp(bx(1.1,.9,.45,mt('#8e5a3c',{r:.7}),0,0,0), bx(.02,.8,.02,mt('#5a3a26'),0,0,.23), bx(.16,.14,.06,mt('#ffcc33',{m:.7,r:.3}),.12,-.05,.25)); const sh=mesh(new THREE.TorusGeometry(.05,.015,6,12,Math.PI),mt('#bbb',{m:.8}),.12,.03,.25); cup.add(sh);
    const crs=grp(bx(.22,.07,.02,mt('#ff3b30'),0,.28,.24), bx(.07,.22,.02,mt('#ff3b30'),0,.28,.24)); cup.add(crs); consolidate(cup);
    tapObj('mummy',at(cup,2.0,1.75,-2.46));
    const ITEMS={ sweets:()=>{ const g=grp(); [['#ff5a7a',-.12],['#3fa7ff',0],['#ffd23f',.12]].forEach(([c2,x])=>{ g.add(sph(.06,mt(c2,{r:.25}),x,.06,0,10)); for(const s of [-1,1]){ const k=cyl(0,.04,.06,mt(c2,{r:.25}),x+s*.08,.06,0,6); k.rotation.z=s*Math.PI/2; g.add(k); } }); return g; },
      orange:()=>grp(sph(.13,mt('#ff9a1f',{r:.6}),0,.13,0,14), sph(.03,mt('#3fae5a'),0,.26,0,6)),
      tablets:()=>{ const g=grp(bx(.34,.025,.2,mt('#d6dde5',{m:.7,r:.3}),0,.015,0)); for(let i=0;i<3;i++) for(let j=0;j<2;j++) g.add(sph(.03,mt(i%2?'#ff8fb1':'#ffffff',{r:.3}),-.1+i*.1,.035,-.05+j*.1,8)); return g; },
      syrup:()=>grp(cyl(.07,.07,.2,mt('#8a3d12',{r:.15,transparent:true,opacity:.9}),0,.1,0,14), cyl(.03,.05,.05,mt('#8a3d12'),0,.22,0,10), cyl(.035,.035,.04,mt('#ffffff'),0,.26,0,10), cyl(.071,.071,.08,mt('#ffffff'),0,.1,0,14)),
      bleach:()=>grp(bx(.2,.28,.13,mt('#f6f6f6',{r:.4}),0,.14,0), cyl(.035,.035,.05,mt('#e53935'),.04,.3,0,10), bx(.201,.09,.131,mt('#3f6fd8'),0,.13,0)),
      kero:()=>grp(cyl(.06,.065,.24,mt('#cfe9ff',{r:.05,transparent:true,opacity:.45}),0,.12,0,14), cyl(.055,.06,.17,mt('#b9a6ff',{r:.1,transparent:true,opacity:.8}),0,.09,0,14), cyl(.066,.066,.07,mt('#e53935'),0,.15,0,14), cyl(.02,.04,.05,mt('#cfe9ff',{transparent:true,opacity:.5}),0,.26,0,10), cyl(.025,.025,.03,mt('#e53935'),0,.3,0,10)) };
    const order=['sweets','tablets','orange','syrup','bleach','kero'];
    order.forEach((k,i)=>{ const g=ITEMS[k](); g.scale.setScalar(1.6); consolidate(g); at(g,-.75+i*.3,.76,-.75); addR(g); SC.items[k]=g; });
    guide('mummy',2.4,1.1); child(-.6,1.2);
  },
  steps:['sweets','tablets','orange','syrup','bleach','kero'].map(k=>{ const food=k==='sweets'||k==='orange';
    const SAY={sweets:'Look! Sweets. Is it yummy food, or only Mummy gives this?',tablets:'Look! Tablets. Is it yummy food, or only Mummy gives this?',orange:'Look! An orange. Is it yummy food, or only Mummy gives this?',syrup:'Look! Cough syrup. Is it yummy food, or only Mummy gives this?',bleach:'Look! Bleach. Is it yummy food, or only Mummy gives this?',kero:'Look! A drink bottle with kerosene inside. Is it yummy food, or only Mummy gives this?'};
    const YES={sweets:'Yes! Sweets are food.',orange:'Yes! An orange is good food.',tablets:'Yes! Tablets are medicine. Only Mummy gives medicine.',syrup:'Yes! Syrup is medicine. Only Mummy gives it.',bleach:'Yes! Bleach is poison. Never touch it.',kero:'Yes! It looks like a drink, but it is kerosene. Never drink it!'};
    const NO={sweets:'Sweets are food. Let\'s try again.',orange:'An orange is food. Let\'s try again.',tablets:'No! Tablets look like sweets, but they are medicine. Let\'s try again.',syrup:'No! Syrup is medicine, not a drink. Let\'s try again.',bleach:'No! Bleach is poison. Let\'s try again.',kero:'No! That is kerosene, not a drink. Let\'s try again.'};
    const ok=food?'food':'mummy', bad=food?'mummy':'food';
    return { say:SAY[k], ok:[ok], decoys:[bad], tap3d:true, cards:[{id:'food',e:'🍎',t:'Yum, food'},{id:'mummy',e:'🔒',t:'Only Mummy gives this'}], yes:{[ok]:YES[k]}, no:{[bad]:NO[k]},
      enter(){ const g=SC.items[k], p0=g.position.clone(); anim(.5,e=>{ g.position.set(p0.x+(0-p0.x)*e,p0.y+.35*Math.sin(e*Math.PI)+(.76-p0.y)*e,p0.z+(-.25-p0.z)*e); g.scale.setScalar(1.6+1.0*e); }); },
      onOk(){ const g=SC.items[k], p0=g.position.clone(), to=food?V3(-2.3+(Math.random()-.5)*.3,.42,.6):V3(2.0,1.75,-2.3); anim(.7,e=>{ g.position.set(p0.x+(to.x-p0.x)*e,p0.y+(to.y-p0.y)*e+Math.sin(e*Math.PI)*.8,p0.z+(to.z-p0.z)*e); g.scale.setScalar(food?2.6-1.6*e:Math.max(.001,2.6*(1-e))); }); } }; }),
  rule:'Medicine is not sweets. Only Mummy or a big person gives medicine. Never drink from a bottle you don\'t know.',
  tip:'Keep medicines and chemicals locked up high, out of reach. Never keep kerosene or chemicals in drink bottles.' },

// ---------- 4. Electricity bites ----------
{ id:'socket', title:'Electricity bites', guide:'mummy', view:{x:.2,z:-.4,w:6.6,d:5,h:2.3},
  intro:'Electricity is strong. It can bite you and hurt you badly.',
  build(){ board({floor:FLOORS.planks('#f5d2a0'),wall:'#c8f0d4',side:'#7fcf98',winX:-1.6});
    const out=new THREE.Mesh(new THREE.PlaneGeometry(1.6,5.2),mt('#ffffff',{map:FLOORS.grass(),r:.95})); out.rotation.x=-Math.PI/2; out.position.set(3.15,.008,0); addR(out);
    addR(bx(.2,1.0,4.6,mt('#c8f0d4',{r:.9}),2.3,.5,-.3)); addR(bx(.26,.08,4.6,mt('#fff'),2.3,1.02,-.3));
    rug(-.4,.3,3,1.8,'#ffd23f','#ffe680');
    const sock=grp(bx(.4,.4,.06,mt('#ffffff',{r:.35}),0,0,0), bx(.05,.12,.02,mt('#333'),-.08,.05,.035), bx(.05,.12,.02,mt('#333'),.08,.05,.035), cyl(.03,.03,.02,mt('#333'),0,-.1,.035,10)); sock.children.slice(1,3).forEach(c=>c.position.z=.035); const cylH=sock.children[3]; cylH.rotation.x=Math.PI/2; consolidate(sock);
    tapObj('socket',at(sock,-.3,.55,-2.66),{r:.5});
    const wire=grp(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-1.2,.03,-2.4),V3(-1.3,.03,-1.4),V3(-.9,.03,-.9),V3(-1.4,.03,-.5)]),40,.03,6),mt('#e2780e')));
    for(let i=0;i<5;i++){ const c=cyl(.006,.006,.16,mt('#c87533',{m:1,r:.3}),-1.4+(Math.random()-.5)*.05,.04,-.45+(Math.random()-.5)*.04,4); c.rotation.z=Math.PI/2+(Math.random()-.5); c.rotation.y=Math.random()*3; wire.add(c); } consolidate(wire);
    tapObj('wire',wire,{center:V3(-1.35,.1,-.6),r:.5});
    const sp=[]; for(let i=0;i<4;i++){ const s=spr(starTex(),.14,'#ffe14a',{add:true}); addR(s); sp.push(s); } SC.ticks.push(t=>sp.forEach((s,i)=>{ const on=Math.sin(t*13+i*2)>.2; s.visible=on; s.position.set(-1.42+Math.sin(i*2.3+t*5)*.12,.12+Math.abs(Math.sin(t*7+i))*.15,-.44+Math.cos(i*1.7+t*4)*.1); }));
    const gen=grp(bx(1.0,.6,.62,mt('#e74c3c',{r:.45,m:.2}),0,.42,0), bx(1.06,.05,.05,mt('#555'),0,.75,.31), bx(1.06,.05,.05,mt('#555'),0,.75,-.31), bx(.06,.6,.06,mt('#555'),-.5,.42,.31), bx(.06,.6,.06,mt('#555'),.5,.42,.31), bx(.06,.6,.06,mt('#555'),-.5,.42,-.31), bx(.06,.6,.06,mt('#555'),.5,.42,-.31), cyl(.12,.12,.1,mt('#ffd23f'),.3,.78,0,14), bx(.36,.22,.02,mt('#f2f2f2'),.2,.45,.32), cyl(.05,.05,.25,mt('#555',{m:.6}),-.35,.85,-.15,8), bx(1,.08,.6,mt('#222'),0,.08,0)); consolidate(gen);
    tapObj('gen',at(gen,3.1,0,-1.4,-.3)); steam(G.root,2.8,1.05,-1.55,3,'#9a9a9a');
    const ext=grp(bx(.5,.08,.16,mt('#ffffff',{r:.4}),0,.04,0), bx(.06,.02,.06,mt('#333'),-.12,.085,0), bx(.06,.02,.06,mt('#333'),.08,.085,0)); consolidate(ext); addR(at(ext,1.2,0,-2.1));
    const ph=grp(bx(.2,.03,.38,mt('#222',{r:.3}),0,.015,0), bx(.17,.005,.32,new THREE.MeshBasicMaterial({color:'#5fb8ff'}),0,.033,0)); const cord2=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-.15,.02,-.2),V3(-.1,.02,-.55),V3(.1,.02,-.8),V3(.0,.06,-1.05)]),30,.015,6),mt('#ffffff')); ph.add(cord2); consolidate(ph);
    tapObj('charger',at(ph,1.15,0,-1.05,0),{center:V3(1.15,.1,-1.3),r:.5});
    const car=grp(bx(.5,.16,.26,mt('#ff3b30',{r:.3}),0,.14,0), bx(.28,.12,.24,mt('#ff3b30',{r:.3}),-.04,.26,0), bx(.22,.09,.25,mt('#bfe9ff',{r:.1}),-.04,.27,0)); for(const sx of [-1,1]) for(const sz of [-1,1]){ const w=cyl(.07,.07,.05,mt('#222'),sx*.16,.07,sz*.13,12); w.rotation.x=Math.PI/2; car.add(w); } consolidate(car);
    tapObj('car',at(car,.3,0,1.3,.4),{r:.45});
    const book=grp(bx(.5,.04,.36,mt('#3f6fd8'),0,.02,0), bx(.23,.03,.32,mt('#ffffff'),-.12,.055,0), bx(.23,.03,.32,mt('#ffffff'),.12,.055,0)); consolidate(book);
    tapObj('book',at(book,-2.4,0,1.2,-.3),{r:.45});
    plantPot(-3.2,-2.2); guide('mummy',3.25,1.2); child(-.6,.9);
  },
  steps:[
    { say:'Tap the things we must not touch, and say no! Can you find four?', ok:['socket','wire','gen','charger'], decoys:['car','book'],
      yes:{socket:'No touching the socket!',wire:'No! A naked wire can bite you.',gen:'No! The generator is hot and its smoke is bad.',charger:'No playing with the charger wire!'},
      no:{car:'That is a toy car. It is safe. Let\'s try again.',book:'That is a book. It is safe. Let\'s try again.'} },
    { say:'If you see a naked wire, what do you do?', ok:['tell'], cards:[{id:'pull',e:'✊',t:'Pull it'},{id:'tell',e:'🙋🏾',t:'Tell a big person'},{id:'poke',e:'🥢',t:'Poke it with a stick'}],
      yes:{tell:'Yes! Tell a big person.'}, no:{pull:'No! Never touch wires. Let\'s try again.',poke:'No! Never poke a socket or a wire. Let\'s try again.'} },
  ],
  rule:'Sockets, wires and the generator: don\'t touch! Tell a big person.',
  tip:'Use socket covers and fix naked wires quickly. Keep children away from the generator: it is hot, it can shock, and its fumes can kill. Never run it indoors.' },

// ---------- 5. Hold hands at the road ----------
{ id:'road', title:'Hold hands at the road', guide:'mummy', view:{x:.3,z:-.2,w:6.2,d:5.6,h:1.8},
  intro:'We are going across the road with Mummy. The road is busy!',
  build(){ board({floor:FLOORS.pavers(),walls:false,side:'#b8a58a'});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(7.9,2.2),mt('#5a5f66',{r:.9})); road.rotation.x=-Math.PI/2; road.position.set(0,.01,-.55); road.receiveShadow=true; addR(road);
    for(const z of [.55,-1.65]) addR(bx(7.9,.08,.12,mt('#f2f2f2'),0,.04,z));
    for(let i=0;i<6;i++) addR(bx(1.4,.012,.2,mt('#ffffff',{r:.6}),.9,.02,.25-i*.36));
    for(let x=-3.6;x<3.8;x+=.9) if(Math.abs(x-.9)>.9) addR(bx(.45,.012,.06,mt('#ffd23f'),x,.02,-.55));
    const shop=grp(bx(2.4,1.5,.9,mt('#ffb86b',{r:.9}),0,.75,0), bx(2.6,.1,1.2,mt('#3fa7ff'),0,1.55,.15), bx(.6,1.0,.05,mt('#7a4a2a'),-.5,.5,.46), bx(.8,.5,.05,mt('#bfe9ff',{emissive:'#9fd8ff',emissiveIntensity:.3}),.5,.85,.46)); consolidate(shop); addR(decor(at(shop,-1.8,0,-2.45)));
    tree(2.6,-2.4,.8); tree(-3.4,2.4,.45);
    const pole=grp(cyl(.04,.04,1.8,mt('#888',{m:.6}),0,.9,0,8)); const sign=new THREE.Mesh(new THREE.CircleGeometry(.24,24),mt('#ffffff',{map:canvasTex(64,64,(c)=>{ c.fillStyle='#1f6fd8'; c.fillRect(0,0,64,64); c.fillStyle='#fff'; c.beginPath(); c.moveTo(32,8); c.lineTo(58,54); c.lineTo(6,54); c.closePath(); c.fill(); c.fillStyle='#222'; c.beginPath(); c.arc(32,26,5,0,7); c.fill(); c.fillRect(29,32,6,14); for(let i=0;i<4;i++) c.fillRect(16+i*9,50,6,3); }),side:THREE.DoubleSide})); sign.position.y=1.75; pole.add(sign); addR(decor(at(pole,2.0,0,.9)));
    const m=guide('mummy',1.25,1.35); m.rotation.y=Math.PI-.2;
    tapObj('hand',m,{center:V3(1.05,.85,1.35),r:.55});
    child(.45,1.45);
    SC.veh=[]; SC.zx=.9;
  },
  enterScene(){ SC.ticks.push((t,dt)=>{ for(const v of SC.veh){ if(!v.alive) continue; v.x+=v.dir*v.speed*dt; const edge=Math.abs(v.x)>4.1; const s=edge?Math.max(0,1-(Math.abs(v.x)-4.1)/.5):Math.min(1,v.s+dt*2); v.s=s; v.mesh.scale.setScalar(v.base*Math.max(.001,s)); v.mesh.position.x=v.x; if(Math.abs(v.x)>4.6){ v.alive=false; v.mesh.visible=false; } } }); },
  steps:[
    { say:'First, hold Mummy\'s hand. Tap Mummy\'s hand.', ok:['hand'], yes:{hand:'Good! Always hold a big person\'s hand near the road.'},
      onOk(){ const c=SC.child; anim(.6,k=>{ c.position.x=.45+.25*k; }); SC.holding=true; } },
    { say:'Look! A danfo is coming. What do we do?', ok:['stop'], cards:[{id:'go',e:'🚶🏾',t:'Go'},{id:'stop',e:'✋',t:'Stop'}],
      enter(){ spawnVeh('danfo',-4.3,1,-.05,1.15); }, yes:{stop:'Yes! We stop and wait at the side of the road.'}, no:{go:'Wait! The danfo is coming. Let\'s try again.'} },
    { say:'Now look both ways. Tap the eyes.', ok:['look'], cards:[{id:'look',e:'👀',t:'Look'}],
      enter(){ spawnVeh('keke',4.3,-1,-1.1,1.5); }, yes:{look:'Look this way, look that way, and look again!'},
      onOk(){ SC.lookT=0; SC.ticks.push((t,dt)=>{ if(SC.lookT==null) return; SC.lookT+=dt; SC.headTurn=SC.lookT>3?null:Math.sin(SC.lookT*3.2)*1.0; if(SC.lookT>3) SC.lookT=null; }); } },
    { say:'Is the road clear? Tap GO when nothing is coming.', ok:['go'], cards:[{id:'stop',e:'✋',t:'Stop'},{id:'go',e:'🚶🏾',t:'Go'}],
      check(id){ if(id!=='go') return null; const v=comingVeh(); return v?L('Wait! The {0} is coming.',tr(v.name)):null; },
      yes:{go:'The road is clear. Let\'s cross at the zebra together!'}, no:{stop:'Waiting is good. When the road is clear, tap GO.'}, gentle:true,
      onOk(){ const c=SC.child, m=SC.guide; const c0=c.position.clone(), m0=m.position.clone(); c.rotation.y=0; m.rotation.y=0; SC.walk=true; anim(3,k=>{ c.position.z=c0.z-3.4*k; m.position.z=m0.z-3.4*k; c.position.x=c0.x+(SC.zx-.2-c0.x)*Math.min(1,k*3); m.position.x=m0.x+(SC.zx+.4-m0.x)*Math.min(1,k*3); if(k>=1) SC.walk=false; }); } },
  ],
  rule:'Hold a big person\'s hand. Stop, look both ways, and cross at the zebra when the road is clear.',
  tip:'Always hold your child\'s hand near roads. Children under 7 cannot judge how fast cars are coming. Cross at a zebra crossing when you can.' },

// ---------- 6. Fire and smoke ----------
{ id:'fire', title:'Fire and smoke', guide:'mummy', view:{x:.3,z:-.2,w:7.2,d:5.6,h:2.3,yaw:-.28},
  intro:'Oh no! There is smoke coming from the kitchen.',
  build(){ board({floor:FLOORS.planks('#f7d6a6'),wall:'#ffd6c9',side:'#e89b84',winX:-.4});
    const out=new THREE.Mesh(new THREE.PlaneGeometry(1.5,5.2),mt('#ffffff',{map:FLOORS.grass(),r:.95})); out.rotation.x=-Math.PI/2; out.position.set(3.2,.008,0); addR(out);
    const wm=mt('#ffd6c9',{r:.9}); addR(bx(.2,1.9,1.5,wm,2.4,.95,-2.15)); addR(bx(.2,1.9,1.6,wm,2.4,.95,.25)); addR(bx(.2,.3,1.1,wm,2.4,1.75,-.85)); addR(bx(.26,.08,4.2,mt('#fff'),2.4,1.92,-.6));
    const door=grp(bx(.08,1.58,1.0,mt('#2ecc71',{r:.5}),0,.79,-.5), sph(.06,mt('#ffd23f',{m:.6}),-.06,.8,-.88,8), sph(.06,mt('#ffd23f',{m:.6}),.06,.8,-.88,8)); door.children.forEach(c=>c.userData.keep=true); tapObj('door',at(door,2.42,0,-.35),{center:V3(2.42,.9,-.85),r:.6});
    tree(3.4,-2.2,.7);
    const cab=grp(bx(1.3,.8,.7,mt('#f7f2ea'),0,.4,0), bx(1.2,.08,.62,mt('#2d2d2d',{r:.4,m:.3}),0,.84,0), cyl(.27,.24,.3,mt('#555',{r:.4,m:.3}),-.3,1.03,0,16)); consolidate(cab); addR(at(cab,-2.4,0,-2.1));
    const gas=grp(cyl(.22,.22,.6,mt('#e53935',{r:.4,m:.2}),0,.3,0,16), sph(.22,mt('#e53935',{r:.4,m:.2}),0,.6,0,16), cyl(.05,.05,.12,mt('#999',{m:.7}),0,.86,0,8)); consolidate(gas); addR(at(gas,-1.4,0,-2.2));
    const smoke=[]; for(let i=0;i<16;i++){ const s=spr(softTex(),1,'#5d6168',{opacity:.8}); s.userData.sm={a:Math.random()*6,r:Math.random(),ph:Math.random()}; addR(s); smoke.push(s); }
    SC.smoke=smoke; SC.ticks.push((t)=>smoke.forEach((s,i)=>{ const u=s.userData.sm; s.visible=SC.smokeOn!==false; const k=(t*.12+u.ph)%1; s.position.set(-2.4+k*3.6+Math.sin(u.a+t)*.3,1.15+k*.6+u.r*.5+Math.sin(t+u.a)*.1,-2.1+k*1.4+u.r*.6); const sz=.7+k*1.1; s.scale.set(sz,sz*.75,1); s.material.opacity=.85*(1-k*.7); }));
    const gasCloud=[]; for(let i=0;i<5;i++){ const s=spr(softTex(),.5,'#a8e06b',{opacity:.5}); s.visible=false; addR(s); gasCloud.push(s); } SC.gasCloud=gasCloud; SC.ticks.push(t=>gasCloud.forEach((s,i)=>{ s.position.set(-1.4+Math.sin(t*1.3+i)*.35,1.0+((t*.3+i/5)%1)*.8,-2.0+Math.cos(t+i)*.2); }));
    const flames=[]; for(let i=0;i<3;i++){ const s=spr(flameTex(),.25,'#ffffff'); s.visible=false; addR(s); flames.push(s); } SC.flames=flames;
    guide('mummy',3.4,1.8); child(-.3,.6);
  },
  steps:[
    { say:'Smoke! What do we do?', ok:['low'], cards:[{id:'hide',e:'🛏️',t:'Hide under the bed'},{id:'low',e:'🐢',t:'Get low and go out'},{id:'toys',e:'🧸',t:'Get my toys'}],
      yes:{low:'Yes! Smoke goes up, so we crawl low under it.'}, no:{hide:'No! Never hide. Get low and go out. Let\'s try again.',toys:'No! Leave your toys. Get out fast. Let\'s try again.'},
      onOk(){ const c=SC.child, p0=c.position.clone(); faceTo(c,1.9,-.85); SC.crawl=true; anim(2.2,k=>{ c.position.set(p0.x+(1.9-p0.x)*k,0,p0.z+(-.85-p0.z)*k); }); } },
    { say:'Crawl to the door. Tap the door to go outside.', ok:['door'], view:{x:1.2,z:-.4,w:5.4,d:4.4}, yes:{door:'Good! You are outside. Stay outside.'},
      onOk(){ const d=ENT.door.obj; anim(.6,k=>{ d.rotation.y=-k*1.4; }); const c=SC.child; later(.6,()=>{ const p0=c.position.clone(); SC.crawl=false; c.rotation.x=0; c.position.y=0; faceTo(c,3.1,-.2); anim(1.4,k=>{ c.position.set(p0.x+(3.1-p0.x)*k,0,p0.z+(-.2-p0.z)*k); if(k>=1) c.rotation.y=Math.PI; }); }); } },
    { say:'You are outside. What do you do now?', ok:['help'], view:{x:2.3,z:0,w:4.6,d:4}, cards:[{id:'back',e:'🏠',t:'Go back inside'},{id:'help',e:'📣',t:'Shout for help'}],
      yes:{help:'Yes! Shout "Fire! Fire!" and tell a big person.'}, no:{back:'No! Never go back inside. Stay outside. Let\'s try again.'} },
    { say:'If your clothes catch fire: Stop, Drop and Roll! Tap them in order.', ok:['stop','drop','roll'], order:true, view:{x:2.3,z:0,w:4.6,d:4}, cards:[{id:'stop',e:'✋',t:'Stop'},{id:'drop',e:'⬇️',t:'Drop'},{id:'roll',e:'🔄',t:'Roll'}],
      enter(){ SC.smokeOn=false; SC.flames.forEach(f=>f.visible=true); SC.ticks.push(t=>{ const c=SC.child; SC.flames.forEach((f,i)=>{ if(!f.visible) return; f.position.set(c.position.x+(i-1)*.12,(SC.lying?.25:.55)+Math.sin(t*9+i)*.04,c.position.z+.15); const s=.22+Math.sin(t*12+i*2)*.04; f.scale.set(s,s*1.3,1); }); }); },
      yes:{stop:'Stop! Don\'t run.',drop:'Drop to the ground and cover your face.',roll:'Roll, roll, roll! The fire is out.'}, wrongOrder:'First Stop, then Drop, then Roll. Let\'s try again.',
      onOk(id){ const c=SC.child; if(id==='drop'){ SC.lying=true; anim(.5,k=>{ c.rotation.set(0,Math.PI,k*Math.PI/2); c.position.y=k*.18; }); }
        if(id==='roll'){ anim(1.6,k=>{ c.rotation.set(Math.sin(k*Math.PI*3)*1.2,Math.PI,Math.PI/2); c.position.x=3.1+Math.sin(k*Math.PI*3)*.3; if(k>.6) SC.flames.forEach(f=>f.visible=false); if(k>=1){ c.rotation.set(0,Math.PI,0); c.position.y=0; SC.lying=false; } }); } } },
    { say:'Another day, you smell gas in the kitchen. Sniff, sniff! What do you do?', ok:['tellm'], view:{x:-.8,z:-.9,w:5.4,d:4.4}, cards:[{id:'switch',e:'💡',t:'Touch the light switch'},{id:'tellm',e:'🙋🏾',t:'Tell Mummy'},{id:'match',e:'🔥',t:'Play with matches'}],
      enter(){ SC.gasCloud.forEach(s=>s.visible=true); const c=SC.child; c.position.set(-.6,0,-.6); c.rotation.set(0,Math.PI,0); SC.guide.position.set(.8,0,.4); },
      yes:{tellm:'Yes! Tell Mummy fast, and go outside.'}, no:{switch:'No! Don\'t touch switches when you smell gas. Let\'s try again.',match:'No! Never play with matches. Let\'s try again.'} },
  ],
  rule:'Smoke? Get low and go out. Stay out and shout for help. Clothes on fire? Stop, drop and roll.',
  tip:'Fit a smoke alarm, plan a way out of your home and practise it, and keep matches and lighters locked away.' },

// ---------- 7. My name and Mummy's number ----------
{ id:'lost', title:'My name and Mummy\'s number', guide:'none', view:{x:0,z:-.4,w:6.6,d:5.2,h:2.2},
  intro:'Let\'s sing a song about your name and Mummy\'s phone number.',
  build(){ board({floor:FLOORS.sand(),walls:false,side:'#d9b27a'});
    const stall=(x,z,c1,c2)=>{ const g=grp(bx(1.2,.08,.7,mt('#b07a35'),0,.75,0)); for(const sx of [-1,1]) for(const sz of [-1,1]) g.add(cyl(.03,.03,.75,mt('#7a4a2a'),sx*.55,.37,sz*.3,6)); g.add(cyl(.03,.03,1.9,mt('#ddd',{m:.5}),0,.95,0,6));
      const can=mesh(new THREE.ConeGeometry(.95,.45,8,1,true),mt('#ffffff',{map:canvasTex(64,8,(c)=>{ for(let i=0;i<8;i++){ c.fillStyle=i%2?c1:c2; c.fillRect(i*8,0,8,8); } }),side:THREE.DoubleSide}),0,1.95,0); g.add(can);
      [['#e53935',-.35],['#ff9a1f',-.1],['#5cc97b',.15],['#ffd23f',.38]].forEach(([c3,dx])=>{ for(let i=0;i<3;i++) g.add(sph(.07,mt(c3),dx+(i-1)*.05,.86+(i===1?.06:0),(i-1)*.08,8)); }); consolidate(g); return addR(decor(at(g,x,0,z))); };
    stall(-2.6,-1.6,'#ff5a5a','#ffffff'); stall(-.4,-2.4,'#3fa7ff','#ffffff'); stall(2.8,1.4,'#5cc97b','#ffffff');
    // market mummy with her children
    const mm=grp(); const w=makeHuman({sex:'f',skin:'#3b2416',dress:true,outfit:'dress',hair:'none',gele:ankara('#9b7bff','#ffd23f','#ffffff'),topMap:ankara('#1f4e8c','#f1c40f','#ffffff')}); mm.add(w);
    const k1=makeHuman({sex:'m',skin:'#4a2e1e',top:'#ffd23f',bottom:'#1f2a40',height:.55}); k1.position.set(.45,0,.1); mm.add(k1); const k2=makeHuman({sex:'f',skin:'#5a3825',dress:true,outfit:'dress',topMap:ankara('#5cc97b','#ffffff','#ff8fb1'),hair:'braids',height:.5}); k2.position.set(-.42,0,.15); mm.add(k2);
    tapObj('mamma',at(mm,-2.3,0,-.4,Math.PI-.5),{center:V3(-2.3,.9,-.4),r:.7});
    const pol=makeHuman({sex:'m',skin:'#3b2416',top:'#1b2538',bottom:'#1b2538',longSleeve:true,hat:'cap',hatColor:'#1b2538'}); tapObj('police',at(pol,2.3,0,-.5,Math.PI+.5),{center:V3(2.3,.9,-.5),r:.65});
    const kiosk=grp(bx(1.6,1.0,.6,mt('#ff8fb1',{r:.8}),0,.5,0), bx(1.7,.08,.7,mt('#ffffff'),0,1.04,0), bx(1.8,.1,.9,mt('#9b7bff'),0,2.0,.1), cyl(.03,.03,1,mt('#ddd'),-.8,1.5,.45,6), cyl(.03,.03,1,mt('#ddd'),.8,1.5,.45,6)); consolidate(kiosk);
    const sk=makeHuman({sex:'f',skin:'#5a3825',top:'#ffd23f',bottom:'#333',hair:'bun'}); sk.position.set(0,0,-.55); kiosk.add(sk);
    tapObj('shop',at(kiosk,.8,0,-2.3),{center:V3(.8,1,-2.2),r:.75});
    const str=makeHuman({sex:'m',skin:'#4a2e1e',top:'#7f8c8d',bottom:'#2a2f3a',longSleeve:true}); tapObj('stranger',at(str,-1.3,0,-1.9,0),{r:.6}); SC.ticks.push((t,dt)=>{ str.position.z=-1.6-((t*.2)%1)*.9; animHuman(str,t*5,true,t); });
    const gate=grp(bx(.25,2.1,.25,mt('#c97b4a'),-.75,1.05,0), bx(.25,2.1,.25,mt('#c97b4a'),.75,1.05,0), bx(1.8,.3,.3,mt('#c97b4a'),0,2.2,0), bx(1.25,.01,1.0,mt('#5a5f66'),0,.012,-.4)); consolidate(gate);
    tapObj('gate',at(gate,3.0,0,-2.3,-.2),{center:V3(3.0,1,-2.3),r:.75});
    child(0,1.1); SC.notes=[]; for(let i=0;i<6;i++){ const s=spr(noteTex(),.3,['#ff5a7a','#3fa7ff','#ffd23f','#5cc97b','#9b7bff','#ff9a1f'][i]); s.visible=false; addR(s); SC.notes.push(s); }
    SC.ticks.push(t=>SC.notes.forEach((s,i)=>{ if(!SC.singing){ s.visible=false; return; } s.visible=true; const k=(t*.5+i/6)%1; s.position.set(SC.child.position.x+Math.sin(i*2+t)*.6,1.1+k*1.3,SC.child.position.z); s.material.opacity=1-k; }));
    SC.ticks.push(t=>{ SC.headTurn=SC.k>=1&&SC.k<=2?Math.sin(t*1.5)*.6:null; });
  },
  steps:[
    { say:'Tap the music to sing with me!', ok:['sing'], cards:[{id:'sing',e:'🎵',t:'Sing'}], sing:true },
    { say:'Oh no! You can\'t see Mummy in the market. What do you do first?', ok:['still'], cards:[{id:'run',e:'🏃🏾',t:'Run and look'},{id:'still',e:'🧍🏾',t:'Stand still'}],
      yes:{still:'Yes! Stand still. Mummy will look for you.'}, no:{run:'No! If you run, Mummy cannot find you. Stand still. Let\'s try again.'} },
    { say:'Who can help you? Tap the helpers. Can you find three?', ok:['mamma','police','shop'], decoys:['stranger','gate'],
      yes:{mamma:'Yes! A mummy with children can help you.',police:'Yes! A police officer can help you.',shop:'Yes! The lady at the shop can help you.'},
      no:{stranger:'Not him. He is walking away. Find a mummy with children or a police officer.',gate:'No! Don\'t leave the market. Stay where you are. Let\'s try again.'} },
    { say:'What do you tell the helper?', ok:['tellnum'], cards:[{id:'nothing',e:'🤐',t:'Nothing'},{id:'tellnum',e:'📞',t:'My name and Mummy\'s number'}],
      yes:{tellnum:'Yes! Now they can call Mummy. Here she comes!'}, no:{nothing:'Tell them your name and Mummy\'s number, so they can call her. Let\'s try again.'},
      onOk(){ const m=mummy(); at(m,4.2,0,1.4); addR(m); SC.guide=m; faceTo(m,0,1.1); SC.walkIn=true; anim(2.2,k=>{ m.position.x=4.2-3.4*k; if(k>=1){ SC.walkIn=false; m.rotation.y=Math.PI-.6; } }); } },
  ],
  rule:'If you are lost: stand still, find a mummy with children or a police officer, and say your name and Mummy\'s number.',
  tip:'Teach your child your phone number and full name, and agree a meeting point when you go to a busy place like a market.' },

// ---------- 8. My body is mine ----------
// REVIEW NEEDED: this body-safety scene must be reviewed by a child-protection professional before use in schools.
// It is deliberately gentle: no adult figure, nothing graphic, simple icons only (NSPCC "PANTS" / "Underwear Rule" style).
{ id:'body', title:'My body is mine', guide:'mummy', view:{x:0,z:-.2,w:5.6,d:4.8,h:2.4},
  review:'This scene is waiting for review by a child-protection professional before use in schools.',
  intro:'Your body belongs to you. Let\'s learn how to keep it safe.',
  build(){ board({floor:FLOORS.planks('#ffe2c4'),wall:'#cfe9ff',side:'#8cc6f2',winX:1.4});
    rug(0,.3,2.6,2.0,'#ffd23f','#fff1a8'); plantPot(-3.2,-2.2); plantPot(3.2,-2.2,.8);
    const bed=grp(bx(1.6,.4,1.0,mt('#ff9ecb'),0,.2,0), bx(1.5,.15,.95,mt('#ffffff'),0,.47,0), bx(.4,.12,.7,mt('#fff'),-.5,.6,0), bx(.1,.8,1.0,mt('#ff7ab3'),-.8,.4,0)); consolidate(bed); addR(decor(at(bed,-2.4,0,-1.6)));
    // simple round doll in a swimsuit (not a realistic body)
    const sk=mt('#7b4a2e',{r:.6}), suit=mt('#ffffff',{r:.5,map:canvasTex(64,64,(c)=>{ c.fillStyle='#3fa7ff'; c.fillRect(0,0,64,64); c.fillStyle='#ffffff'; for(let y=6;y<64;y+=16) for(let x=(y/16%2)*8+4;x<64;x+=16){ c.beginPath(); c.arc(x,y,3.5,0,7); c.fill(); } },2,2)});
    const doll=grp(); doll.add(sph(.2,sk,0,1.0,0,18)); const hair=sph(.205,mt('#1a120d',{r:.9}),0,1.06,.02,18); hair.scale.set(1,.75,1); doll.add(hair);
    for(const s of [-1,1]){ doll.add(sph(.025,mt('#1a120d'),s*.07,1.0,-.18,8)); doll.add(sph(.03,mt('#ff9ab0'),s*.11,.95,-.165,8)); }
    const smile=mesh(new THREE.TorusGeometry(.05,.012,6,12,Math.PI),mt('#5a1d1d'),0,.94,-.19); smile.rotation.z=Math.PI; doll.add(smile);
    const body=cyl(.17,.19,.42,suit,0,.62,0,18); doll.add(body); doll.add(sph(.19,suit,0,.42,0,16));
    for(const s of [-1,1]){ const a=cyl(.045,.045,.36,sk,s*.25,.62,0,10); a.rotation.z=s*.35; doll.add(a); doll.add(sph(.055,sk,s*.31,.45,0,10)); doll.add(cyl(.06,.06,.36,sk,s*.09,.17,0,10)); doll.add(sph(.065,sk,s*.09,.0,-.03,10)); }
    doll.children.forEach(c=>c.userData.keep=true); SC.doll=doll;
    tapObj('swimsuit',at(doll,0,.03,.2,Math.PI,1.25),{center:V3(0,.75,.2),r:.45});
    const gift=grp(bx(.4,.35,.4,mt('#ff5a7a'),0,.18,0), bx(.42,.06,.08,mt('#ffd23f'),0,.36,0), bx(.08,.06,.42,mt('#ffd23f'),0,.36,0)); consolidate(gift); gift.visible=false; addR(at(gift,1.1,0,.6)); SC.gift=gift;
    const bal=[]; ['#ff5a7a','#3fa7ff','#ffd23f'].forEach((c2,i)=>{ const b=grp(sph(.2,mt(c2,{r:.3}),0,0,0,14), cyl(.005,.005,.8,mt('#999'),0,-.55,0,4)); b.visible=false; addR(at(b,1.0+i*.25,1.6+i*.15,.3)); bal.push(b); }); SC.balloons=bal;
    const cloud=spr(softTex(),1,'#9aa3b5',{opacity:.9}); cloud.visible=false; addR(cloud); cloud.position.set(0,1.95,.2); SC.cloud=cloud;
    const sun=spr(starTex(),.6,'#ffd23f',{add:true}); sun.visible=false; addR(sun); sun.position.set(0,1.95,.2); SC.sunS=sun;
    SC.ticks.push(t=>{ SC.balloons.forEach((b,i)=>{ b.position.y=1.6+i*.15+Math.sin(t*1.5+i)*.08; }); SC.cloud.scale.set(1.1+Math.sin(t)*.05,.6,1); });
    guide('mummy',1.9,.2);
  },
  steps:[
    { say:'Tap the swimsuit.', ok:['swimsuit'], yes:{swimsuit:'Yes! The parts under your swimsuit are private. They are just for you.'} },
    { say:'If someone wants to see or touch your private parts, or says "Don\'t tell Mummy", what do you do? Say NO, go away, and tell. Tap them in order.', ok:['no','away','tell'], order:true,
      cards:[{id:'no',e:'🙅🏾',t:'Say NO'},{id:'away',e:'🚶🏾',t:'Go away'},{id:'tell',e:'🗣️',t:'Tell Mummy or teacher'},{id:'keep',e:'🤫',t:'Keep it secret'}],
      yes:{no:'Say NO, loudly!',away:'Go away to a safe place.',tell:'Tell Mummy or your teacher. It is never your fault.'}, wrongOrder:'First say NO, then go away, then tell. Let\'s try again.',
      no:{keep:'No. You never keep that kind of secret. Telling is brave. Let\'s try again.'} },
    { say:'A surprise party for Daddy\'s birthday makes everyone happy. Is it a good surprise?', ok:['good'], cards:[{id:'good',e:'🎁',t:'Good surprise'},{id:'bad',e:'😟',t:'Bad secret'}],
      enter(){ SC.gift.visible=true; SC.balloons.forEach(b=>b.visible=true); },
      yes:{good:'Yes! A happy surprise is fine, because everyone will know soon.'}, no:{bad:'A party makes everyone happy. It is a good surprise. Let\'s try again.'} },
    { say:'A secret that makes you feel bad or scared. What do you do?', ok:['tell2'], cards:[{id:'keep2',e:'🤫',t:'Keep it'},{id:'tell2',e:'🗣️',t:'Tell a big person'}],
      enter(){ SC.gift.visible=false; SC.balloons.forEach(b=>b.visible=false); SC.cloud.visible=true; },
      onOk(){ SC.cloud.visible=false; SC.sunS.visible=true; },
      yes:{tell2:'Yes! Always tell. Telling is brave.'}, no:{keep2:'No. Bad secrets must be told. Tell a big person you trust. Let\'s try again.'} },
  ],
  rule:'Your body belongs to you. Say NO, go away, and tell a big person you trust. Never keep a secret that makes you feel bad.',
  tip:'Use the correct names for body parts. Tell your child that no one should ask them to keep secrets about their body, and listen calmly when they tell you something.' },

// ---------- 9. Clean hands ----------
{ id:'hands', title:'Clean hands', guide:'teacher', view:{x:0,z:-.4,w:6,d:5,h:2.2},
  intro:'Germs are tiny. We cannot see them, but they can make us sick. Let\'s wash our hands!',
  build(){ board({floor:FLOORS.tiles('#e6fbff','#c8f1fa'),wall:'#fff1a8',side:'#7fd3e8',winX:.6});
    // Veronica bucket on a stand with a tap and a basin
    const vb=grp(); const fr=mt('#555',{m:.6,r:.4}); for(const sx of [-1,1]) for(const sz of [-1,1]) vb.add(bx(.05,1.0,.05,fr,sx*.3,.5,sz*.3)); vb.add(bx(.66,.05,.66,fr,0,1.0,0), bx(.66,.04,.66,fr,0,.35,0));
    vb.add(cyl(.32,.28,.6,mt('#2e86de',{r:.4}),0,1.32,0,20), cyl(.34,.34,.06,mt('#1f6fbf'),0,1.65,0,20), cyl(.4,.32,.18,mt('#9ad8ff',{r:.3}),0,.46,0,20)); consolidate(vb); addR(at(vb,-2.2,0,-1.6));
    const tap=grp(cyl(.03,.03,.16,mt('#c0c6cc',{m:.85,r:.25}),0,0,0,8), cyl(.03,.03,.14,mt('#c0c6cc',{m:.85,r:.25}),0,-.05,.07,8), bx(.12,.03,.04,mt('#e53935'),0,.06,0)); tap.children[0].rotation.x=Math.PI/2; tap.children[0].position.z=.0; consolidate(tap); tapObj('tap',at(tap,-2.2,1.12,-1.25),{r:.45});
    const stream=cyl(.025,.025,.5,mt('#8fd8ff',{r:.05,transparent:true,opacity:.7,emissive:'#6fc8ff',emissiveIntensity:.3}),-2.2,.82,-1.18,8); stream.visible=false; addR(stream); SC.stream=stream;
    stool(-.6,-1.8,.5,'#ff8fb1'); const soap=grp(cyl(.18,.16,.04,mt('#ffffff'),0,.02,0,16)); const bar=bx(.22,.08,.13,mt('#ff9ecb',{r:.3}),0,.08,0); soap.add(bar); consolidate(soap); tapObj('soap',at(soap,-.6,.53,-1.8),{r:.42});
    const rail=grp(bx(.05,1.1,.05,mt('#999',{m:.6}),-.45,.55,0), bx(.05,1.1,.05,mt('#999',{m:.6}),.45,.55,0), cyl(.025,.025,.95,mt('#999',{m:.6}),0,1.05,0,8), bx(.6,.7,.04,mt('#ff8fb1',{r:.9}),0,.72,0), bx(.6,.06,.045,mt('#ffffff'),0,.5,0)); rail.children[2].rotation.z=Math.PI/2; consolidate(rail); tapObj('towel',at(rail,2.0,0,-1.6),{center:V3(2,.75,-1.6),r:.55});
    // big cartoon hands
    const hm=mt('#8a5534',{r:.55}); const hands=grp();
    for(const s of [-1,1]){ const h=grp(); const palm=sph(.24,hm,0,0,0,16); palm.scale.set(1,1.15,.45); h.add(palm); for(let i=0;i<4;i++){ const f=cyl(.055,.05,.26,hm,-.16+i*.105,.3+(i===0||i===3?-.04:0),0,8); h.add(f); h.add(sph(.052,hm,-.16+i*.105,.43+(i===0||i===3?-.04:0),0,8)); } const th=cyl(.055,.05,.2,hm,.24,.02,0,8); th.rotation.z=-.9; h.add(th); h.scale.x=s; h.position.set(s*.33,0,0); h.rotation.z=-s*.12; hands.add(h); }
    hands.children.forEach(h=>h.children.forEach(c=>c.userData.keep=true));
    tapObj('hands',at(hands,0,.85,.7,0,1.7),{r:.75}); SC.hands=hands;
    SC.germs=[]; for(let i=0;i<10;i++){ const g=spr(germTex(),.3); g.position.set((i%5-2)*.24,.8+Math.floor(i/5)*.36+Math.random()*.08,.9); addR(g); SC.germs.push(g); }
    SC.bubbles=[]; for(let i=0;i<14;i++){ const b=spr(bubbleTex(),.2); b.visible=false; b.position.set((Math.random()-.5)*1.4,.7+Math.random()*.9,.95); addR(b); SC.bubbles.push(b); }
    SC.ticks.push(t=>{ SC.germs.forEach((g,i)=>{ g.material.rotation=Math.sin(t*2+i)*.3; }); SC.bubbles.forEach((b,i)=>{ if(b.visible){ b.position.y+=Math.sin(t*3+i)*.0015; } }); SC.hands.rotation.z=SC.scrubT>0?Math.sin(t*25)*.06:0; if(SC.scrubT>0) SC.scrubT-=1/60; });
    guide('teacher',2.8,.6);
  },
  steps:[
    { say:'First, wet your hands. Tap the tap.', ok:['tap'], yes:{tap:'Splash! Hands are wet.'}, onOk(){ SC.stream.visible=true; later(1.4,()=>SC.stream.visible=false); } },
    { say:'Now tap the soap.', ok:['soap'], yes:{soap:'Soap makes bubbles!'}, onOk(){ SC.bubbles.slice(0,6).forEach(b=>b.visible=true); } },
    { say:'Scrub, scrub, scrub! Tap the hands fast and sing!', ok:['hands'], need:10, repeat:true, scrub:true, yes:{hands:'All the germs are gone!'},
      onTap(n){ SC.scrubT=.4; if(n===1) tune(TWINKLE.slice(0,7),.04); const g=SC.germs[n-1]; if(g) anim(.3,k=>{ g.scale.setScalar(.3*(1-k)+.001); if(k>=1) g.visible=false; }); SC.bubbles.slice(0,Math.min(14,6+n)).forEach(b=>b.visible=true); } },
    { say:'Now rinse. Tap the tap again.', ok:['tap'], yes:{tap:'Rinse the bubbles away.'}, onOk(){ SC.stream.visible=true; later(1.4,()=>SC.stream.visible=false); SC.bubbles.forEach(b=>b.visible=false); } },
    { say:'Dry your hands. Tap the towel.', ok:['towel'], yes:{towel:'Nice and dry!'}, onOk(){ burst(SC.hands.position,'#bfe9ff'); } },
    { say:'When do we wash our hands? Can you find three times?', ok:['eat','toilet','play'], cards:[{id:'eat',e:'🍛',t:'Before eating'},{id:'tv',e:'📺',t:'Watching TV'},{id:'toilet',e:'🚽',t:'After the toilet'},{id:'play',e:'⚽',t:'After playing outside'}],
      yes:{eat:'Yes! Before eating.',toilet:'Yes! After the toilet.',play:'Yes! After playing outside.'}, no:{tv:'We don\'t need to wash for TV. Find another time. Let\'s try again.'} },
  ],
  rule:'Wash with soap and water, and scrub while you sing a song. Wash before eating and after the toilet.',
  tip:'Wash hands with soap and water for 20 seconds (sing a short song together), especially before eating and after using the toilet.' },

// ---------- 10. Car and keke seat ----------
{ id:'seat', title:'Car and keke seat', guide:'mummy', view:{x:0,z:-.2,w:7,d:5,h:2},
  intro:'We are going out in the car and in a keke. Let\'s sit safely.',
  build(){ board({floor:FLOORS.pavers(),walls:false,side:'#b8a58a'});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(7.9,2.4),mt('#5a5f66',{r:.9})); road.rotation.x=-Math.PI/2; road.position.set(0,.01,-1.4); addR(road);
    tree(3.4,1.9,.6); tree(-3.4,1.8,.55);
    // open-top toy car (seats visible), facing left
    const red=mt('#e74c3c',{r:.35,m:.2}), seatM=mt('#3a3f4a',{r:.8}), car=grp();
    car.add(bx(1.5,.2,2.8,red,0,.35,0), bx(.1,.45,2.8,red,-.72,.65,0), bx(.1,.45,2.8,red,.72,.65,0), bx(1.5,.45,.1,red,0,.65,1.36), bx(1.5,.6,.7,red,0,.6,-1.05));
    const ws=bx(1.3,.3,.04,mt('#bfe9ff',{r:.05,transparent:true,opacity:.5}),0,1.02,-.72); ws.rotation.x=-.5; car.add(ws);
    for(const sx of [-1,1]) for(const sz of [-.95,.95]){ const w=cyl(.3,.3,.2,mt('#222'),sx*.75,.3,sz,16); w.rotation.z=Math.PI/2; car.add(w); }
    car.add(bx(.5,.12,.5,seatM,.35,.55,-.25), bx(.5,.5,.1,seatM,.35,.8,-.02)); const sw=mesh(new THREE.TorusGeometry(.14,.025,6,16),mt('#222'),.35,.98,-.6); sw.rotation.x=-.9; car.add(sw);
    car.add(bx(1.3,.12,.5,seatM,0,.55,.85), bx(1.3,.5,.1,seatM,0,.8,1.1)); consolidate(car);
    at(car,-1.7,0,-.6,Math.PI/2); addR(car); car.updateMatrixWorld(true);
    const front=grp(bx(.5,.14,.5,mt('#ffd23f',{r:.6}),0,0,0), bx(.5,.5,.1,mt('#ffd23f',{r:.6}),0,.25,.23)); consolidate(front);
    const fp=V3(-.35,.62,-.25).applyMatrix4(car.matrixWorld); tapObj('front',at(front,fp.x,fp.y,fp.z,Math.PI/2),{r:.42});
    const cs=grp(bx(.46,.12,.46,mt('#3fa7ff',{r:.6}),0,0,0), bx(.46,.6,.08,mt('#3fa7ff',{r:.6}),0,.3,.22), bx(.06,.4,.46,mt('#3fa7ff',{r:.6}),-.23,.2,0), bx(.06,.4,.46,mt('#3fa7ff',{r:.6}),.23,.2,0)); consolidate(cs);
    const bp=V3(-.35,.62,.85).applyMatrix4(car.matrixWorld); tapObj('back',at(cs,bp.x,bp.y,bp.z,Math.PI/2),{r:.42}); SC.backSeat=bp;
    const bk=grp(bx(.12,.06,.08,mt('#e53935',{r:.4}),0,0,0), bx(.06,.03,.05,mt('#ccc',{m:.8}),0,.04,0)); consolidate(bk); tapObj('buckle',at(bk,bp.x+.02,bp.y+.38,bp.z+.3),{r:.36});
    const belt=bx(.06,.5,.02,mt('#2a2a2a'),0,0,0); belt.visible=false; addR(belt); SC.belt=belt;
    // keke, facing left
    const kk=makeKeke(true,false); at(kk,1.9,0,-.7,Math.PI/2,1.2); addR(kk); kk.updateMatrixWorld(true); SC.keke=kk;
    const kp=(x)=>V3(x,1.06,.62).applyMatrix4(kk.matrixWorld);
    const mid=kp(0), edge=kp(-.42); SC.kmid=mid; SC.kedge=edge;
    const pad=(c2)=>{ const g=grp(bx(.3,.05,.3,mt(c2,{r:.6}),0,0,0)); return g; };
    tapObj('middle',at(pad('#5cc97b'),mid.x,mid.y+.06,mid.z),{r:.3}); tapObj('edge',at(pad('#ffd23f'),edge.x,edge.y+.06,edge.z),{r:.3});
    const sib=makeHuman({sex:'m',skin:'#4a2e1e',top:'#ff9a1f',bottom:'#1f2a40',height:.55}); sib.visible=false; animHuman(sib,0,false,0,true); addR(sib); SC.sib=sib;
        guide('mummy',.3,1.3); child(-1.0,1.4);
  },
  steps:[
    { say:'Where do children sit in the car? Tap the right seat.', ok:['back'], view:{x:-1.2,z:-.3,w:5.4,d:4}, decoys:['front'], yes:{back:'Yes! Children sit in the back seat.'}, no:{front:'The front seat is for big people. Children sit at the back. Let\'s try again.'},
      onOk(){ const c=SC.child, p0=c.position.clone(), to=SC.backSeat; c.rotation.y=-Math.PI/2; anim(1,k=>{ c.position.set(p0.x+(to.x-p0.x)*k,(to.y-.5)*k+Math.sin(k*Math.PI)*.5,p0.z+(to.z-p0.z)*k); if(k>=1){ SC.seated=true; c.rotation.y=Math.PI/2; } }); } },
    { say:'Click! Tap the buckle to put on your seat belt.', ok:['buckle'], view:{x:-1.3,z:-.3,w:5,d:3.8}, yes:{buckle:'Click! Seat belt on.'},
      onOk(){ click(); const b=SC.belt, p=SC.backSeat; b.position.set(p.x+.03,p.y+.42,p.z); b.rotation.set(.0,0,.0); b.rotation.x=.6; b.visible=true; } },
    { say:'Now we ride in a keke. Where do you sit? Tap the safe seat.', ok:['middle'], view:{x:1.4,z:-.3,w:5.4,d:4}, decoys:['edge'], yes:{middle:'Yes! Sit in the middle, away from the open side.'}, no:{edge:'Not by the open side. You can fall out. Sit in the middle. Let\'s try again.'},
      enter(){ SC.belt.visible=false; },
      onOk(){ const c=SC.child, p0=c.position.clone(), to=SC.kmid; anim(1.1,k=>{ c.position.set(p0.x+(to.x-p0.x)*k,p0.y+(to.y-.55-p0.y)*k+Math.sin(k*Math.PI)*.8,p0.z+(to.z-p0.z)*k); }); } },
    { say:'Oh no! A hand is sticking out of the keke. Tap the hand to bring it inside.', ok:['arm'], view:{x:1.4,z:-.3,w:5,d:3.8},
      enter(){ const s=SC.sib, e=SC.kedge; s.visible=true; s.position.set(e.x,e.y-.5,e.z+.05); s.rotation.y=Math.PI/2; const a=s.userData.arms[0]; a.sh.rotation.set(.2,0,-2.3); s.updateMatrixWorld(true); const hp=new THREE.Vector3(); a.hand.getWorldPosition(hp); tapObj('arm',s,{center:hp,r:.4}); ENT.arm.ring.visible=false; ENT.arm.halo.position.copy(hp); setTargets(); },
      yes:{arm:'Good! Hands and head stay inside.'}, onOk(){ const a=SC.sib.userData.arms[0]; anim(.5,k=>{ a.sh.rotation.set(.2+.7*k,0,-2.3+2.3*k); }); } },
  ],
  rule:'Sit in the back, buckle up, and keep your hands and head inside.',
  tip:'Children should ride in the back seat in a child seat or seat belt, and never on an okada.' },
];
const SCENE=Object.fromEntries(SCENES.map(s=>[s.id,s]));
function teddy(){ const b=mt('#b9783f',{r:.9}), l=mt('#e8c49a',{r:.9}), d=mt('#222'); const g=grp(sph(.2,b,0,.2,0,14), sph(.15,b,0,.47,0,14), sph(.055,b,-.11,.6,0,8), sph(.055,b,.11,.6,0,8), sph(.06,l,0,.44,.12,8), sph(.018,d,-.05,.5,.13,6), sph(.018,d,.05,.5,.13,6), sph(.065,b,-.17,.26,.05,8), sph(.065,b,.17,.26,.05,8), sph(.075,b,-.1,.05,.1,8), sph(.075,b,.1,.05,.1,8)); g.children[0].scale.y=1.1; consolidate(g); return g; }

// ================== RUNTIME ==================
let ENT={};            // tappable 3D things in the current scene: id -> {obj, hit, ring, halo, off, r, found}
const HITMAT=new THREE.MeshBasicMaterial({visible:false});
function tapObj(id,obj,o={}){
  if(!obj.parent) addR(obj); obj.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(obj), c=o.center||box.getCenter(new THREE.Vector3()), s=box.getSize(new THREE.Vector3());
  const r=o.r!=null?o.r:Math.max(.38,Math.min(.9,Math.max(s.x,s.z)*.6));
  const hit=new THREE.Mesh(new THREE.SphereGeometry(Math.max(r,s.y*.5),10,8),HITMAT); hit.position.copy(c); hit.userData.id=id; G.root.add(hit);
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.85,r*1.05,32),new THREE.MeshBasicMaterial({color:'#ffd23f',transparent:true,opacity:.8,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.set(c.x,(o.center?Math.max(.02,box.min.y):box.min.y)+.02,c.z); ring.renderOrder=2; G.root.add(ring);
  const halo=spr(softTex(),r*2.6,'#fff1a0',{add:true,opacity:.5}); halo.position.copy(c); G.root.add(halo);
  const chk=spr(checkTex(),.34,'#ffffff',{noDepth:true}); chk.renderOrder=5; chk.position.set(c.x,Math.max(box.max.y,c.y)+.3,c.z); chk.visible=false; G.root.add(chk);
  ENT[id]={id,obj,hit,ring,halo,chk,off:c.clone().sub(obj.position),r,found:false,wob:0,ry:obj.rotation.z};
  ring.visible=halo.visible=false; return obj;
}
function anim(dur,fn){ if(SC) SC.anims.push({t:0,dur,fn}); else fn(1); }
function burst(p,color='#ffd23f'){ const cols=['#ffd23f','#ff5a7a','#3fa7ff','#5cc97b','#9b7bff',color]; for(let i=0;i<14;i++){ const s=spr(starTex(),.16,cols[i%cols.length],{noDepth:true}); s.renderOrder=6; s.position.copy(p); const a=Math.random()*Math.PI*2, up=1.5+Math.random()*1.5; G.scene.add(s); G.fx.push({s,v:V3(Math.cos(a)*1.4,up,Math.sin(a)*1.4),t:0}); } }
function spawnVeh(kind,x,dir,z,speed){ const mesh=kind==='danfo'?makeDanfo():kind==='keke'?makeKeke(true):makeOkada(); const base=kind==='keke'?.7:.6; mesh.rotation.y=dir>0?-Math.PI/2:Math.PI/2; mesh.position.set(x,0,z); mesh.scale.setScalar(.001); addR(mesh); SC.veh.push({kind,name:kind==='danfo'?'danfo':kind,x,dir,speed,mesh,alive:true,s:0,base}); }
function comingVeh(){ if(!SC||!SC.veh) return null; return SC.veh.find(v=>v.alive&&(v.dir>0?v.x<SC.zx+1.3:v.x>SC.zx-1.3))||null; }
function disposeRoot(){
  if(!G.root) return; G.scene.remove(G.root);
  G.root.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) [].concat(o.material).forEach(m=>{ if(m===HITMAT) return; for(const k of ['map','normalMap','roughnessMap','metalnessMap']) if(m[k]&&!SHARED.has(m[k])) m[k].dispose(); m.dispose(); }); });
  G.root=null; ENT={}; G.fx.forEach(f=>{ G.scene.remove(f.s); f.s.material.dispose(); }); G.fx=[];
}
function startScene(id){
  const def=SCENE[id]; if(!def) return; disposeRoot(); TIMERS.length=0; sayQ=[]; ensureAudio();
  G.root=new THREE.Group(); G.scene.add(G.root); camSnap=true;
  SC={def,id,k:-1,st:null,got:new Set(),count:0,misses:0,totalMisses:0,hint:false,busy:true,ticks:[],anims:[],t:0,t0:performance.now(),items:{},talk:0,focus:-1};
  def.build(); if(def.enterScene) def.enterScene();
  G.root.traverse(o=>{ if(o.isMesh&&o.material!==HITMAT&&!o.isSprite){ if(!(o.material&&o.material.transparent)) o.castShadow=true; o.receiveShadow=true; } });
  applyQuality(); paused=false; started=true;
  showPlayUI(true); $('sceneT').textContent=tr(def.title); drawDots();
  document.querySelectorAll('.confetti').forEach(d=>d.remove());
  say(tr(def.title),L(def.intro)); later(Math.min(6,estimate(tr(def.title))+estimate(tr(def.intro))),()=>beginStep(0));
}
function curList(st){ return st.ok.concat(st.decoys||[]); }
function beginStep(k){
  if(!SC) return; const st=SC.def.steps[k]; SC.k=k; SC.st=st; SC.got=new Set(); SC.count=0; SC.misses=0; SC.hint=false; SC.busy=false; SC.focus=-1;
  for(const id of curList(st)) if(ENT[id]){ ENT[id].found=false; ENT[id].chk.visible=false; }
  if(st.enter) st.enter(); setTargets(); renderCards(); drawDots();
  $('scrubBar').classList.toggle('hidden',!st.scrub); if(st.scrub) $('scrubBar').firstElementChild.style.width='0%';
  say(L(st.say));
}
function setTargets(){ const st=SC.st, ids=new Set(st&&(!st.cards||st.tap3d)?curList(st):[]); for(const id in ENT){ const e=ENT[id]; const on=ids.has(id)&&!e.found; e.on=on; e.ring.visible=on&&id!=='arm'; e.halo.visible=on; } }
function renderCards(){
  const st=SC&&SC.st, box=$('cards');
  if(!st||!st.cards){ box.classList.add('hidden'); box.innerHTML=''; return; }
  box.innerHTML=st.cards.map((c,i)=>`<button class="card c${i%5}" data-card="${esc(c.id)}" aria-label="${esc(tr(c.t))}"><span class="e" aria-hidden="true">${c.e}</span><span>${esc(tr(c.t))}</span></button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{ ensureAudio(); tapId(b.dataset.card); });
}
function drawDots(){ const d=$('dots'); if(!SC){ d.innerHTML=''; return; } d.innerHTML=SC.def.steps.map((_,i)=>`<i class="${i<SC.k||(i===SC.k&&SC.busy&&SC.got.size)?'on':''}"></i>`).join(''); }
// The one entry point for every tap (3D object, picture card, keyboard or test hook)
function tapId(id){
  if(!SC||SC.busy||!SC.st||$('ovl').innerHTML) return false;
  const st=SC.st, card=st.cards&&st.cards.some(c=>c.id===id), is3d=!!ENT[id]&&ENT[id].on;
  if(!card&&!is3d) return false;
  if(st.check){ const w=st.check(id); if(w){ say(w); wobble(id); boop(); return 'wait'; } }
  if(st.ok.includes(id)&&(st.repeat||!SC.got.has(id))){
    if(st.order&&id!==st.ok[SC.got.size]){ miss(id,st.wrongOrder||GENERIC_NO); return 'order'; }
    SC.count++; if(!st.repeat) SC.got.add(id);
    if(st.repeat){ if(st.onTap) st.onTap(SC.count); tone(500+SC.count*60,.08,'sine',.05); $('scrubBar').firstElementChild.style.width=Math.min(100,SC.count/(st.need||1)*100)+'%'; if(SC.count<(st.need||1)) return 'more'; }
    success(id); return 'ok';
  }
  if(SC.got.has(id)){ say(L('You found that one already!')); return 'again'; }
  miss(id,(st.no&&st.no[id])||GENERIC_NO); return 'no';
}
function success(id){
  const st=SC.st; chime(); const e=ENT[id];
  if(e){ if(!st.tap3d&&!st.repeat) e.found=true; burst(e.obj.position.clone().add(e.off)); if(!st.repeat&&!st.cards&&st.ok.length>1){ e.chk.visible=true; e.chk.scale.setScalar(.01); anim(.35,k=>e.chk.scale.setScalar(.34*k+.001)); } }
  const cb=document.querySelector(`[data-card="${CSS.escape(id)}"]`); if(cb){ cb.classList.add('ok'); cb.classList.remove('hint'); const r=cb.getBoundingClientRect(); confetti(8,r.left+r.width/2); }
  SC.hint=false; $('ring').classList.add('hidden'); document.querySelectorAll('.card.hint').forEach(c=>c.classList.remove('hint'));
  const line=L((st.yes&&st.yes[id])||PRAISE[Math.floor(Math.random()*PRAISE.length)]);
  if(st.onOk) st.onOk(id);
  const need=st.need||st.ok.length, done=st.repeat?SC.count>=need:SC.got.size>=need;
  setTargets();
  if(!done){ say(line); return; }
  SC.busy=true; drawDots();
  if(st.sing){ sing(); return; }
  say(line); later(Math.max(1.6,estimate(line)+.2),nextStep);
}
function nextStep(){ if(!SC) return; $('scrubBar').classList.add('hidden'); const k=SC.k+1; if(k<SC.def.steps.length) beginStep(k); else sceneDone(); }
function miss(id,line){
  SC.misses++; SC.totalMisses++; boop(); wobble(id); say(L(line));
  if(SC.misses>=2&&!SC.hint){ SC.hint=true; later(estimate(L(line)),()=>{ if(SC&&SC.hint) say(L('Look! I will help you. Tap the one that is jumping.')); }); }
  showHint();
}
function wobble(id){ const e=ENT[id]; if(e) e.wob=.6; const cb=document.querySelector(`[data-card="${CSS.escape(id)}"]`); if(cb){ cb.classList.remove('no'); void cb.offsetWidth; cb.classList.add('no'); } }
function nextOk(){ const st=SC&&SC.st; if(!st) return null; if(st.repeat) return st.ok[0]; return st.order?st.ok[SC.got.size]:st.ok.find(x=>!SC.got.has(x)); }
function showHint(){ if(!SC||!SC.hint) return; const id=nextOk(); document.querySelectorAll('.card.hint').forEach(c=>c.classList.remove('hint')); const cb=id&&document.querySelector(`[data-card="${CSS.escape(id)}"]`); if(cb&&!(ENT[id]&&ENT[id].on)) cb.classList.add('hint'); }
function sing(){
  SC.singing=true; const len=tune(TWINKLE,.05);
  const who=kid.who==='Daddy'?'Daddy':'Mummy';
  const lines=[L('My name is {0}!',kid.name||tr('Little Star'))];
  if(kid.parent) lines.push(L(who==='Daddy'?'My Daddy\'s name is {0}!':'My Mummy\'s name is {0}!',kid.parent));
  const digits=String(kidPhone||'').replace(/[^0-9+]/g,'');
  lines.push(digits?L(who==='Daddy'?'Daddy\'s number is {0}.':'Mummy\'s number is {0}.',digits.split('').join(' ')):L('Ask Mummy to teach you her phone number.'));
  lines.push(L('Now you sing it too!'));
  say(...lines);
  later(Math.max(len,lines.reduce((a,s)=>a+estimate(s),0))+.3,()=>{ if(!SC) return; SC.singing=false; nextStep(); });
}
function sceneDone(){
  const def=SC.def, secs=Math.round((performance.now()-SC.t0)/100)/10;
  stickers[def.id]=new Date().toISOString().slice(0,10); SL.store.set('little-stickers',stickers);
  fanfare(); confetti(40); burst(V3(0,1.5,0));
  if(RUN){ RUN.done.push(def.id); RUN.times[def.title]=secs; RUN.i++; }
  const last=!RUN||RUN.i>=RUN.ids.length;
  if(last) postRun();
  say(L('Well done, {0}! You got a sticker!',kid.name||tr('Little Star')),L(def.rule));
  later(1.2,()=>endCard(def,last));
}
function postRun(){
  if(!RUN||!RUN.done.length||RUN.posted) return; RUN.posted=true;
  // Never include the phone number: only the first name, class code and what was played.
  SL.post({game:'little',name:kid.name||'Little Star',role:'Child 3-6',result:'COMPLETE',stars:RUN.done.length,scenes:RUN.done.slice(),...(lsClass?{class:lsClass}:{}),zoneTimes:Object.assign({},RUN.times),lang:SL.lang,score:100,date:new Date().toLocaleString()},
    r=>{ const link=SL.certLink(r&&r.id), row=$('lsEndRow'); RUN&&(RUN.cert=link); if(link&&row&&!row.querySelector('.cert-link')) row.insertAdjacentHTML('beforeend',`<a class="btnlink cert-link" target="_blank" rel="noopener" href="${link}">🖨️ ${esc(tr('Print certificate'))}</a>`); });
}
function leaveScene(){ disposeRoot(); SC=null; TIMERS.length=0; sayQ=[]; showPlayUI(false); }

// ================== INPUT ==================
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function screenOf(p){ const v=p.clone().project(G.camera); return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight,front:v.z<1}; }
function pickAt(x,y){
  if(!SC||!SC.st) return null; const live=Object.values(ENT).filter(e=>e.on); if(!live.length) return null;
  ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ndc,G.camera);
  const hits=ray.intersectObjects(live.map(e=>e.hit),false); if(hits.length) return hits[0].object.userData.id;
  let best=null, bd=72; for(const e of live){ const s=screenOf(e.obj.position.clone().add(e.off)); const d=Math.hypot(s.x-x,s.y-y); if(d<bd){ bd=d; best=e.id; } } return best;   // generous: anything within 72 px
}
function bindInput(){
  const cv=$('game');
  cv.addEventListener('pointerdown',e=>{ ensureAudio(); if(!SC||$('ovl').innerHTML) return; const id=pickAt(e.clientX,e.clientY); if(id) tapId(id); });
  $('sayBtn').onclick=()=>{ ensureAudio(); if(SC&&SC.st) say(L(SC.st.say)); else if(lastSaid.length) say(...lastSaid); };
  $('homeBtn').onclick=()=>{ RUN=null; leaveScene(); showBook(); };
  $('setBtn2').onclick=()=>openSettings();
  addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||$('ovl').innerHTML||!SC||!SC.st) return;
    const st=SC.st, list=st.cards&&!st.tap3d?st.cards.map(c=>c.id):curList(st).filter(id=>ENT[id]&&ENT[id].on);
    if(/^Digit[1-9]$/.test(e.code)){ const id=list[+e.code.slice(5)-1]; if(id){ e.preventDefault(); tapId(id); } }
    else if(e.code==='ArrowRight'||e.code==='ArrowLeft'||e.code==='Tab'&&!st.cards){ if(!list.length) return; e.preventDefault(); SC.focus=(SC.focus+(e.code==='ArrowLeft'?-1:1)+list.length)%list.length; const id=list[SC.focus], cb=document.querySelector(`[data-card="${CSS.escape(id)}"]`); if(cb) cb.focus(); }
    else if((e.code==='Enter'||e.code==='Space')&&SC.focus>=0&&!(document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.card)){ e.preventDefault(); tapId(list[SC.focus]); }
    else if(e.code==='KeyR'){ $('sayBtn').click(); }
  });
}

// ================== SCREENS ==================
function toast(msg,kind=''){ const d=document.createElement('div'); d.className='tst '+kind; d.textContent=msg; $('toast').appendChild(d); setTimeout(()=>d.remove(),3600); while($('toast').children.length>2) $('toast').firstChild.remove(); }
function openModal(html){ $('ovl').innerHTML=`<div class="ov"><div class="modal">${html}</div></div>`; return $('ovl').querySelector('.modal'); }
function closeModal(){ $('ovl').innerHTML=''; }
function openSettings(after){ SL.openSettings(openModal,()=>{ closeModal(); after&&after(); },k=>{ if(k==='lang'){ const u=new URL(location.href); u.searchParams.set('lang',SL.lang); location.href=u.href; } if(k==='quality') applyQuality(); }); }
function showPlayUI(on){ ['homeBtn','setBtn2','topPill','sayBtn'].forEach(id=>$(id).classList.toggle('hidden',!on)); if(!on){ $('cards').classList.add('hidden'); $('ring').classList.add('hidden'); $('scrubBar').classList.add('hidden'); } }
function confetti(n=30,x0){ const cols=['#ffd23f','#ff5a7a','#3fa7ff','#5cc97b','#9b7bff','#ff9a1f']; for(let i=0;i<n;i++){ const d=document.createElement('div'); d.className='confetti'; d.style.left=((x0!=null?x0+(Math.random()-.5)*160:Math.random()*innerWidth))+'px'; d.style.background=cols[i%cols.length]; d.style.animationDelay=(Math.random()*.6)+'s'; d.style.animationDuration=(1.8+Math.random()*1.4)+'s'; document.body.appendChild(d); setTimeout(()=>d.remove(),4000); } }
const stickerCount=()=>SCENES.filter(s=>stickers[s.id]).length;
function pickFive(){ const notDone=SCENES.filter(s=>!stickers[s.id]).map(s=>s.id); const rest=SCENES.map(s=>s.id).filter(id=>!notDone.includes(id)); return notDone.concat(rest.sort(()=>Math.random()-.5)).slice(0,5); }
function play(ids){ RUN={ids:ids.slice(),i:0,done:[],times:{}}; $('book').classList.add('hidden'); document.body.classList.remove('inbook'); closeModal(); startScene(ids[0]); }
let hoverT=0;
function showBook(){
  leaveScene(); const b=$('book'); b.classList.remove('hidden'); document.body.classList.add('inbook');
  const n=stickerCount();
  b.innerHTML=`<div class="in"><div class="bookbar" style="justify-content:space-between"><h1>⭐ ${esc(tr('Sticker Book'))}</h1><div class="bookbar"><span class="stk" data-notr>⭐ ${n} / ${SCENES.length}</span><button class="lbtn" style="position:static" id="bkSet" title="${esc(tr('Settings'))}" aria-label="${esc(tr('Settings'))}">⚙️</button></div></div>
    <p class="muted" style="margin:2px 0 6px">${esc(L('Hello {0}! Tap a picture to play.',kid.name||tr('Little Star')))}</p>
    <div class="bookbar"><button class="bigbtn go" id="five">▶ ${esc(tr('Play 5 in a row'))}</button><button class="bigbtn soft" id="grown">👤 ${esc(tr('Grown-ups'))}</button></div>
    <div class="tiles">${SCENES.map((s,i)=>`<button class="tile ${stickers[s.id]?'done':''}" data-scene="${s.id}" aria-label="${esc(tr(s.title))}"><span class="n">${i+1}</span><span class="pic" style="background-image:url(${art(s.id)})"></span><span>${esc(tr(s.title))}</span>${stickers[s.id]?`<small>⭐ ${esc(tr('Sticker earned'))}</small>`:''}</button>`).join('')}</div>
    <div class="parent"><h3>👪 ${esc(tr('For Mummy/Daddy'))}</h3>${esc(tr('Play together. Each game takes about one minute. Talk about the safety rule at the end, then try it at home.'))}</div></div>`;
  b.querySelectorAll('[data-scene]').forEach(t=>{ t.onclick=()=>{ ensureAudio(); play([t.dataset.scene]); }; t.onmouseenter=()=>{ const now=performance.now(); if(now-hoverT<700) return; hoverT=now; say(tr(SCENE[t.dataset.scene].title)); }; });
  b.querySelector('#five').onclick=()=>{ ensureAudio(); play(pickFive()); };
  b.querySelector('#grown').onclick=()=>showStart();
  b.querySelector('#bkSet').onclick=()=>openSettings(showBook);
  say(L('Hello {0}! Tap a picture to play.',kid.name||tr('Little Star')));
}
function endCard(def,last){
  if(!SC) return; $('cards').classList.add('hidden'); $('ring').classList.add('hidden');
  const runStickers=RUN?RUN.done:[def.id];
  const m=openModal(`<div class="lmodal"><h1 style="margin:.1em 0">🎉 ${esc(tr('You got a sticker!'))}</h1>
    <div class="stbig" style="background-image:url(${art(def.id)})"></div><div style="font-weight:800;font-size:1.1rem">${esc(tr(def.title))}</div>
    <p class="qt" style="margin:8px 0">⭐ ${esc(tr(def.rule))}</p>
    ${last&&RUN&&RUN.ids.length>1?`<p style="margin:6px 0;font-weight:800">${esc(L('You are a little safety star, {0}!',kid.name||tr('Little Star')))}</p><div class="mini">${runStickers.map(id=>`<span style="background-image:url(${art(id)})"></span>`).join('')}</div>`:''}
    <div class="tip"><b>👪 ${esc(tr('For Mummy/Daddy'))}</b>${esc(tr(def.tip))}${def.review?`<span class="rev">⚠️ ${esc(tr(def.review))}</span>`:''}</div>
    <div class="row" id="lsEndRow" style="justify-content:center;margin-top:12px">${last?`<button class="bigbtn" id="toBook">📖 ${esc(tr('Sticker book'))}</button><button class="bigbtn soft" id="again">🔁 ${esc(tr('Play again'))}</button>`
      :`<button class="bigbtn go" id="next">${esc(tr('Next ▶'))}</button><button class="bigbtn soft" id="toBook">📖 ${esc(tr('Sticker book'))}</button>`}${last&&RUN&&RUN.cert?`<a class="btnlink cert-link" target="_blank" rel="noopener" href="${RUN.cert}">🖨️ ${esc(tr('Print certificate'))}</a>`:''}</div>
    <p class="muted" style="font-size:.8rem;margin-top:10px">${esc(tr('Stickers are saved on this device.'))}</p></div>`);
  const nx=m.querySelector('#next'); if(nx) nx.onclick=()=>{ closeModal(); startScene(RUN.ids[RUN.i]); };
  m.querySelector('#toBook').onclick=()=>{ closeModal(); RUN=null; showBook(); };
  const ag=m.querySelector('#again'); if(ag) ag.onclick=()=>{ closeModal(); play([def.id]); };
}
function showStart(){
  leaveScene(); $('book').classList.remove('hidden');
  const nm=kid.name||SL.lms.studentName().split(' ')[0]||'';
  const m=openModal(`<div class="row" style="justify-content:space-between"><a class="btnlink" href="index.html">◀ ${esc(tr('All games'))}</a><span class="pill">${esc(tr('For children 3–6'))}</span>${CLASS_FROM_URL?`<span class="pill">🏷️ ${esc(tr('Class'))}: <span data-notr>${esc(CLASS_FROM_URL)}</span></span>`:''}</div>
    <p class="muted" style="margin:8px 0 6px;font-weight:700">${esc(tr('Choose a kids game'))}</p><div class="games"><span class="gcard on"><span class="gi">⭐🧸</span><b>${esc(tr('Little Stars 3–6'))}</b><small>${esc(tr('Playing now'))}</small></span><a class="gcard" href="kids.html?world=home"><span class="gi">🏠🚌</span><b>${esc(tr('Home → School Bus'))}</b><small>${esc(tr('Kids 6–12'))}</small></a><a class="gcard" href="kids.html?world=school"><span class="gi">🏫</span><b>${esc(tr('School Safety'))}</b><small>${esc(tr('Kids 6–12'))}</small></a></div>
    <h1 style="margin:.3em 0 .1em">⭐ ${esc(tr('Little Stars'))}</h1><p class="muted">${esc(tr('Safety games for children aged 3 to 6. A grown-up sets up and plays along. Everything is spoken and shown with pictures, so no reading is needed.'))}</p>
    <p><b>${esc(tr('Child\'s first name'))}</b></p><input id="nm" maxlength="24" placeholder="${esc(tr('e.g. Ada'))}" value="${esc(nm)}">
    <div class="row" style="margin-top:8px"><button data-x="f" class="${kid.sex==='f'?'primary':''}">👧🏾 ${esc(tr('Girl'))}</button><button data-x="m" class="${kid.sex==='m'?'primary':''}">👦🏾 ${esc(tr('Boy'))}</button></div>
    <p><b>${esc(tr('Who is playing with the child?'))}</b></p><div class="row"><button data-w="Mummy" class="${kid.who!=='Daddy'?'primary':''}">👩🏾 ${esc(tr('Mummy'))}</button><button data-w="Daddy" class="${kid.who==='Daddy'?'primary':''}">👨🏾 ${esc(tr('Daddy'))}</button></div>
    <p><b>${esc(tr('Mummy or Daddy\'s name, for the song'))}</b> <span class="muted">${esc(tr('(optional)'))}</span></p><input id="pn" maxlength="24" placeholder="${esc(tr('e.g. Mummy Ngozi'))}" value="${esc(kid.parent||'')}">
    <p><b>${esc(tr('Phone number, for the song'))}</b> <span class="muted">${esc(tr('(optional)'))}</span></p><input id="ph" type="tel" inputmode="tel" maxlength="16" placeholder="080…" value="${esc(kidPhone)}">
    <p class="muted" style="font-size:.85rem;margin:4px 0">🔒 ${esc(tr('The phone number is saved only on this device to help your child learn it. It is never sent anywhere.'))}</p>
    <p><b>${esc(tr('Class or family code'))}</b> <span class="muted">${esc(tr('(optional, from your teacher)'))}</span></p><input id="cls" maxlength="20" placeholder="${esc(tr('e.g. NURSERY-2'))}" value="${esc(lsClass)}">
    ${SL.consent.html(true)}
    <div class="row" style="margin-top:14px"><button class="primary big2" id="start">${esc(tr('Let\'s go! ▶'))}</button><button id="stSet">⚙️ ${esc(tr('Language & settings'))}</button></div>`);
  m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ kid.sex=b.dataset.x; m.querySelectorAll('[data-x]').forEach(x=>x.classList.toggle('primary',x===b)); });
  m.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{ kid.who=b.dataset.w; m.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('primary',x===b)); });
  m.querySelectorAll('.gcard[href]').forEach(a=>{ const u=new URL(a.getAttribute('href'),location.href); for(const [k,v] of SL.QS) if(!['world'].includes(k)) u.searchParams.set(k,v); a.href=u.href; });
  SL.consent.bind(m,null); m.querySelector('#stSet').onclick=()=>openSettings(showStart);
  m.querySelector('#start').onclick=()=>{
    if(!SL.consent.ok()){ const c=m.querySelector('.consent'); c.style.outline='3px solid var(--bad)'; c.scrollIntoView({block:'center'}); toast(tr('Please ask a parent or teacher to tick the privacy box.'),'bad'); return; }
    ensureAudio(); kid.name=(m.querySelector('#nm').value.trim()||'').slice(0,24); kid.parent=m.querySelector('#pn').value.trim().slice(0,24);
    kidPhone=m.querySelector('#ph').value.replace(/[^0-9+ ]/g,'').trim().slice(0,16); SL.store.set('little-phone',kidPhone);
    lsClass=cleanClass(m.querySelector('#cls').value); SL.store.set('little-kid',{name:kid.name,sex:kid.sex,who:kid.who,parent:kid.parent});
    closeModal(); showBook(); };
}

// ================== UPDATE & LOOP ==================
function update(dt){
  G.t+=dt;
  for(let i=0;i<TIMERS.length;i++){ const tm=TIMERS[i]; tm.t-=dt; if(tm.t<=0){ TIMERS.splice(i--,1); tm.fn(); } }
  if(sayT>0){ sayT-=dt; if(sayT<=0) nextSay(); }
  for(let i=G.fx.length-1;i>=0;i--){ const f=G.fx[i]; f.t+=dt; f.v.y-=4*dt; f.s.position.addScaledVector(f.v,dt); f.s.material.opacity=Math.max(0,1-f.t/1.1); if(f.t>1.1){ G.scene.remove(f.s); f.s.material.dispose(); G.fx.splice(i,1); } }
  if(!SC) return;
  SC.t+=dt; const t=SC.t;
  for(let i=SC.anims.length-1;i>=0;i--){ const a=SC.anims[i]; a.t+=dt; const k=Math.min(1,a.t/a.dur), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; a.fn(e); if(k>=1) SC.anims.splice(i,1); }
  SC.ticks.forEach(f=>f(t,dt));
  const nid=SC.hint&&nextOk();
  for(const id in ENT){ const e=ENT[id]; if(!e.on&&!e.wob) continue; const c=e.obj.position.clone().add(e.off);
    const hint=id===nid, pu=hint?1.25+Math.sin(t*8)*.2:1+Math.sin(t*3.2)*.08; e.halo.position.copy(c); const hs=e.r*2.6*pu; e.halo.scale.set(hs,hs,1); e.halo.material.opacity=hint?.9:.45+Math.sin(t*3.2)*.12;
    e.ring.scale.setScalar(pu); e.ring.material.opacity=hint?1:.55+Math.sin(t*3.2)*.25; e.ring.material.color.set(hint?'#ff9f1a':'#ffd23f'); e.hit.position.copy(c);
    if(e.wob>0){ e.wob=Math.max(0,e.wob-dt); e.obj.rotation.z=e.ry+Math.sin(e.wob*30)*.12*e.wob/.6; } }
  // people
  if(SC.talk>0) SC.talk-=dt;
  if(SC.guide){ const g=SC.guide; animHuman(g,G.t*5,!!SC.walkIn||!!SC.walk,t); const a=g.userData.arms;
    if(a){ const fc=Math.cos(g.rotation.y)<0, hold=SC.holding?a[fc?1:0]:null, wave=hold===a[0]?a[1]:a[0]; a[0].sh.rotation.z=-.07; a[1].sh.rotation.z=.07;
      if(hold){ hold.sh.rotation.x=.1; hold.sh.rotation.z=hold===a[1]?.3:-.3; }
      if(SC.talk>0&&!SC.walk&&!SC.walkIn){ const s2=wave===a[1]?1:-1; wave.sh.rotation.z=s2*(2.2+Math.sin(t*7)*.25); wave.el.rotation.x=.3; } } }
  if(SC.child){ const c=SC.child; if(SC.seated) animHuman(c,0,false,t,true); else if(SC.crawl){ animHuman(c,G.t*6,true,t); c.rotation.x=-1.15; c.position.y=.28; }
    else { animHuman(c,G.t*6,!!SC.walk,t); const a=c.userData.arms; if(a){ a[0].sh.rotation.z=-.07; a[1].sh.rotation.z=.07; if(SC.holding){ const fc=Math.cos(c.rotation.y)<0, h=a[fc?0:1]; h.sh.rotation.x=.1; h.sh.rotation.z=fc?-.45:.45; } } }
    if(SC.headTurn!=null&&c.userData.head) c.userData.head.rotation.y=SC.headTurn; }
  // hint ring on screen
  const ring=$('ring');
  if(nid&&ENT[nid]&&ENT[nid].on){ const s=screenOf(ENT[nid].obj.position.clone().add(ENT[nid].off)); ring.style.left=s.x+'px'; ring.style.top=s.y+'px'; ring.className=''; }
  else if(SC.focus>=0&&SC.st&&!(SC.st.cards&&!SC.st.tap3d)){ const list=curList(SC.st).filter(id=>ENT[id]&&ENT[id].on), e=ENT[list[SC.focus]]; if(e){ const s=screenOf(e.obj.position.clone().add(e.off)); ring.style.left=s.x+'px'; ring.style.top=s.y+'px'; ring.className='focus'; } else ring.className='hidden'; }
  else ring.className='hidden';
  if(SC.hint) showHint();
  placeCamera(G.t,dt);
}
function render(){ if(!SC||!G.root) return; G.renderer.render(G.scene,G.camera); }
let last=performance.now();
function tick(now){ const dt=Math.min(.1,(now-last)/1000); last=now; if(!G) return; if(SC&&!$('ovl').innerHTML) SL.fps.tick(dt); update(dt); render(); }
function loop(now){ tick(now); requestAnimationFrame(loop); }

window.addEventListener('load',()=>{
  if(!window.THREE){ $('loading').innerHTML=esc(tr('Could not load the 3D engine. Please check your internet connection.')); return; }
  try{ initScene(); }catch(err){ $('loading').textContent=tr('Your device could not start 3D.'); console.error(err); return; }
  $('loading').remove(); document.title=tr('Little Stars'); bindInput(); showStart();
  requestAnimationFrame(loop);
});

// ================== TEST HOOK ==================
// Used by tests/playthrough.js: LS.play(ids), LS.next() (the right id to tap now, or null while waiting),
// LS.tapId(id), LS.flush() (run pending timers and speech at once), LS.step(n, dt), LS.state().
window.LS={
  play, tapId, startScene, showBook,
  next(){ if(!SC||SC.busy||!SC.st) return null; const id=nextOk(); if(SC.st.check&&SC.st.check(id)) return null; return id; },
  flush(){ for(let n=0;n<60&&(TIMERS.length||sayQ.length||sayT>0||(SC&&SC.anims.length));n++){ update(5); } },
  step(n=1,dt=.1){ for(let i=0;i<n;i++) update(dt); render(); },
  render(){ placeCamera(G.t,1); G.renderer.render(G.scene,G.camera); },
  state(){ return {scene:SC&&SC.id,step:SC?SC.k:-1,steps:SC?SC.def.steps.length:0,busy:SC?SC.busy:false,misses:SC?SC.misses:0,hint:SC?SC.hint:false,ended:!SC||!!$('ovl').innerHTML,stickers:Object.keys(stickers),run:RUN&&{ids:RUN.ids,done:RUN.done,i:RUN.i},modal:!!$('ovl').innerHTML,caption:($('slCaption')||{}).textContent||''}; },
  scenes:SCENES.map(s=>s.id),
};
