// ================== KIDS GAME (home→bus, school) ==================
const PARAMS = new URLSearchParams(location.search);
const WORLD = PARAMS.get('world')==='school' ? 'school' : 'home';
let S=null, paused=true, started=false, guideOn=true, firstPerson=false, muted=false, audio=null;
let yaw=0, pitch=.42; const keys={}; let joy=null, look=null;
const kid = {name:'', sex:'f', skin:'#5a3825', uni:'#1f4e8c'};
const SKINS=['#3b2416','#5a3825','#7b4a2e','#a0663f'], UNIS=['#1f4e8c','#7a1f2b','#1f6b3a','#6b4f8a','#c46a12'];

// ---------- audio & voice ----------
function ensureAudio(){ if(!audio){ try{ audio=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
function beep(f=880,d=.12,type='square',v=.05){ if(muted||!audio) return; try{ const o=audio.createOscillator(), g=audio.createGain(); o.type=type; o.frequency.value=f; o.connect(g); g.connect(audio.destination); const t=audio.currentTime; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.start(t); o.stop(t+d);}catch(e){} }
const chime=()=>{ beep(660,.12,'sine',.08); setTimeout(()=>beep(990,.18,'sine',.08),110); setTimeout(()=>beep(1320,.2,'sine',.06),230); };
const buzz=()=>beep(150,.35,'sawtooth',.06);
function speak(text){ if(muted) return; SL.speak(tr(text)); }

// ---------- UI ----------
function toast(msg,kind=''){ const d=document.createElement('div'); d.className='tst '+kind; d.textContent=msg; $('toast').appendChild(d); setTimeout(()=>d.remove(),3600); while($('toast').children.length>2) $('toast').firstChild.remove(); }
function openModal(html){ paused=true; joy=null; look=null; $('joy').classList.add('hidden'); for(const k in keys) keys[k]=false; $('ovl').innerHTML=`<div class="ov"><div class="modal">${html}</div></div>`; return $('ovl').querySelector('.modal'); }
function closeModal(){ $('ovl').innerHTML=''; paused=false; last=performance.now(); try{ speechSynthesis.cancel(); }catch(e){} }

// ================== WORLD DATA ==================
const SOLIDS=[]; const ROADS=[]; const ZEBRAS=[];
let WW=1500, WH=1200;
const DATA = {
home: {
  title:'Home to School Bus Safety', icon:'🏠🚌', start:{x:260,y:185,face:0},
  intro:'Good morning! Get ready for school. Visit every yellow ring, answer the questions, find the hidden dangers, and catch the school bus safely.',
  escort:{label:'Mummy · follow me', look:{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:'g1',topMap:'a1',shoe:'#5a1d1d'}},
  missions:[
    {id:'charger', name:'Bedroom', x:300,y:222,r:60, q:{e:'🔌',who:'Your bedroom',text:'Your phone charger wire is cut and you can see the copper inside. What should you do?',
      o:[{t:'Use it quickly, it still works',ok:false,heart:true,why:'Broken wires can shock you or start a fire. Never touch them.'},{t:'Do not touch it. Unplug nothing. Tell Mummy or Daddy',ok:true,why:'Correct! Always tell an adult about broken wires.'}]}},
    {id:'bathroom', name:'Bathroom', x:430,y:200,r:55, q:{e:'🛁',who:'Bathroom',text:'The bathroom floor is wet and soapy. What do you do?',
      o:[{t:'Run and slide, it is fun!',ok:false,heart:true,why:'Wet floors are slippery. You can fall and hit your head.'},{t:'Walk slowly, hold on, and dry the floor or tell an adult',ok:true,why:'Well done! Walk slowly on wet floors.'}]}},
    {id:'kitchen', name:'Kitchen', x:610,y:220,r:60, q:{e:'🍲',who:'Mummy in the kitchen',text:'A pot of stew is boiling on the gas cooker and the handle is sticking out. What should you do?',
      o:[{t:'Grab the handle to look inside',ok:false,heart:true,why:'Hot pots can fall and burn you badly. Stay away from the cooker.'},{t:'Stay away from the cooker and tell Mummy about the handle',ok:true,why:'Correct! Keep away from hot things in the kitchen.'}]}},
    {id:'candle', name:'Sitting room', x:300,y:380,r:60, q:{e:'🕯️',who:'Your brother',text:'NEPA has taken light. Your brother put a lit candle next to the curtain. What do you do?',
      o:[{t:'Leave it, the candle is small',ok:false,heart:true,why:'Curtains catch fire very fast. A small flame can burn the whole house.'},{t:'Tell an adult to move it away and use a rechargeable lamp',ok:true,why:'Great! Keep flames away from curtains, or use a rechargeable lamp.'}]}},
    {id:'medicine', name:'Store room', x:660,y:445,r:55, q:{e:'💊',who:'Store room',text:'You see some sweet-looking tablets on the table. What should you do?',
      o:[{t:'Taste one, it looks like sweets',ok:false,heart:true,why:'Medicine can make you very sick. Only take medicine from a parent or doctor.'},{t:'Do not touch. Tell an adult to keep it out of reach',ok:true,why:'Correct! Never eat medicine on your own.'}]}},
    {id:'generator', name:'Generator', x:820,y:420,r:60, q:{e:'⛽',who:'Generator',text:'Daddy\'s generator is running close to the kitchen window. What should you do?',
      o:[{t:'Go and touch it to see if it is hot',ok:false,heart:true,why:'Generators are very hot and the smoke is poison (carbon monoxide).'},{t:'Stay away and tell Daddy it must be far from windows and doors',ok:true,why:'Correct! Generator smoke can kill. It must be outside, far from windows.'}]}},
    {id:'well', name:'Well', x:200,y:560,r:60, q:{e:'🕳️',who:'The well',text:'The cover of the well is open. Your ball rolled next to it. What do you do?',
      o:[{t:'Run and get the ball',ok:false,heart:true,why:'You could fall into the well. Always stay away from open wells.'},{t:'Stay away and call an adult to get the ball and close the well',ok:true,why:'Correct! Never play near an open well or soakaway.'}]}},
    {id:'gate', name:'Gate', x:450,y:640,r:55, q:{e:'🚪',who:'A stranger at the gate',text:'"Hello! Your Mummy sent me to take you to school. Come with me."',
      o:[{t:'Go with him, he knows Mummy',ok:false,heart:true,why:'Never go with someone you do not know. Strangers can say anything.'},{t:'Do not open the gate. Run back and tell Mummy',ok:true,why:'Excellent! Never go with a stranger. Always tell your parents.'}]}},
    {id:'pavement', name:'Walkway', x:640,y:750,r:55, q:{e:'🚶',who:'Walking to the bus stop',text:'Where should you walk on the street?',
      o:[{t:'In the middle of the road',ok:false,heart:true,why:'Cars, okadas and kekes use the road. You could be hit.'},{t:'On the walkway, holding an adult\'s hand',ok:true,why:'Correct! Walk on the walkway and hold an adult\'s hand.'}]}},
    {id:'kerb', name:'Zebra crossing', x:905,y:755,r:50, q:{e:'🦓',who:'Crossing guard',text:'You want to cross the road. What do you do first?',
      o:[{t:'Run across quickly',ok:false,heart:true,why:'Running across the road is very dangerous.'},{t:'Stop at the zebra, look left, right, left again, and wait for the cars to stop',ok:true,why:'Well done! Stop, look and listen before you cross.'}]}},
    {id:'zebra', name:'Cross at the zebra', x:930,y:880,r:0, hint:'Cross the road on the zebra crossing'},
    {id:'busstop', name:'Bus stop', x:1150,y:1015,r:55, q:{e:'🚌',who:'Bus stop',text:'The school bus is coming. Where should you stand?',
      o:[{t:'At the edge of the road, ready to jump in',ok:false,heart:true,why:'You could fall or be hit by the bus. Stay back.'},{t:'Behind the yellow line until the bus stops completely',ok:true,why:'Correct! Wait behind the line until the bus stops.'}]}},
    {id:'board', name:'Board the bus', x:1130,y:985,r:55, when:()=>S.bus.state==='parked', q:{e:'💺',who:'Bus attendant',text:'You are on the bus. What should you do?',
      o:[{t:'Stand up and put your head out of the window',ok:false,heart:true,why:'Never put your head or hands out of a moving bus.'},{t:'Sit down, fasten your seatbelt and keep hands inside',ok:true,why:'Excellent! Sit down and wear your seatbelt.'}]}},
  ],
  hazards:[
    {k:'plugs',e:'🔌',t:'Too many plugs in one socket',x:135,y:330,h:1},{k:'knife',e:'🔪',t:'A sharp knife at the edge of the table',x:610,y:330,h:1},
    {k:'bleach',e:'🧴',t:'Bleach in a drink bottle on the floor',x:470,y:255,h:1},{k:'bag',e:'🛍️',t:'A plastic bag (can stop breathing)',x:330,y:200,h:1},
    {k:'iron',e:'♨️',t:'A hot pressing iron left on',x:160,y:255,h:1},{k:'toys',e:'🧸',t:'Toys on the floor by the door',x:340,y:440,h:1},
    {k:'gutter',e:'🕳️',t:'Open gutter with no cover',x:600,y:690,h:1},
    {k:'ext',e:'🧯',t:'Fire extinguisher',x:740,y:125,h:0},{k:'aid',e:'🩹',t:'First-aid box',x:735,y:445,h:0},{k:'lamp',e:'🔦',t:'Rechargeable lamp',x:540,y:300,h:0},{k:'bin',e:'🗑️',t:'Covered dustbin',x:680,y:520,h:0},
  ],
  hazPick:5, decoyPick:3,
},
school: {
  title:'School Safety', icon:'🏫', start:{x:750,y:1150,face:0},
  intro:'Welcome to school! Visit every yellow ring, answer the questions, and find the hidden dangers. Listen for the fire drill!',
  escort:{label:'Teacher · follow me', look:{sex:'f',skin:'#3b2416',top:'#f1e3c6',bottom:'#2b3a55',longSleeve:true,hair:'bun',collar:true}},
  missions:[
    {id:'gate', name:'School gate', x:750,y:1030,r:60, q:{e:'🚗',who:'A man in a car outside',text:'"Your Daddy is busy. I will take you home. Get in my car."',
      o:[{t:'Get in, he looks nice',ok:false,heart:true,why:'Never go with someone who is not on your pick-up list.'},{t:'Say NO, stay inside, and tell the gatekeeper or teacher',ok:true,why:'Excellent! Only go home with people your parents chose.'}]}},
    {id:'assembly', name:'Assembly ground', x:750,y:760,r:60, q:{e:'📢',who:'Teacher',text:'"This is our fire assembly point." If the fire alarm rings, where do you go?',
      o:[{t:'Hide under my desk',ok:false,heart:true,why:'In a fire you must leave the building. Hiding is dangerous.'},{t:'Walk quickly to the assembly point and line up with my class',ok:true,why:'Correct! Remember this place.'}]}},
    {id:'class1', name:'Classroom 1', x:205,y:300,r:60, q:{e:'⚡',who:'Classroom 1',text:'The socket near your desk is sparking and smells like burning.',
      o:[{t:'Pull out the plug yourself',ok:false,heart:true,why:'You could get an electric shock.'},{t:'Move away and tell the teacher immediately',ok:true,why:'Correct! Never touch sparking sockets.'}]}},
    {id:'class2', name:'Classroom 2', x:415,y:300,r:60, q:{e:'🪑',who:'Your classmate',text:'Your classmate is leaning back on two chair legs.',
      o:[{t:'Do it too, it is fun',ok:false,heart:true,why:'The chair can fall back and you can hit your head.'},{t:'Sit with all four chair legs on the floor and tell him to stop',ok:true,why:'Well done! Sit properly on your chair.'}]}},
    {id:'corridor', name:'Corridor', x:310,y:445,r:55, q:{e:'🔔',who:'Corridor',text:'The break bell rings and everyone rushes out.',
      o:[{t:'Push to be the first one out',ok:false,heart:true,why:'Pushing causes falls and injuries.'},{t:'Walk, keep to the right, and do not push',ok:true,why:'Correct! Walk calmly in corridors.'}]}},
    {id:'bully', name:'Behind the block', x:585,y:260,r:60, q:{e:'😢',who:'A younger pupil',text:'Some big pupils are pushing a small boy and taking his snacks.',
      o:[{t:'Join them and laugh',ok:false,heart:true,why:'Bullying hurts people. Never join in.'},{t:'Do not join. Go and tell a teacher at once',ok:true,why:'Brave and kind! Always tell a teacher about bullying.'}]}},
    {id:'lab', name:'Science lab', x:1150,y:345,r:60, q:{e:'🧪',who:'Science lab',text:'There are bottles of coloured liquid on the bench and no teacher.',
      o:[{t:'Smell or taste them',ok:false,heart:true,why:'Chemicals can burn your skin, eyes and mouth.'},{t:'Do not touch. Wait for the teacher',ok:true,why:'Correct! Only use the lab with a teacher.'}]}},
    {id:'toilet', name:'Toilets', x:1380,y:350,r:55, q:{e:'🧼',who:'Toilets',text:'You have used the toilet. What next?',
      o:[{t:'Go straight back to class',ok:false,why:'Germs on your hands can make you and others sick.'},{t:'Wash hands with soap and water for 20 seconds',ok:true,why:'Great! Clean hands stop germs.'}]}},
    {id:'canteen', name:'Canteen', x:1150,y:585,r:60, q:{e:'🍛',who:'Canteen',text:'Someone spilled hot pepper soup on the floor.',
      o:[{t:'Jump over it and run',ok:false,heart:true,why:'You could slip and get burnt.'},{t:'Walk around it and tell the canteen staff',ok:true,why:'Correct! Report spills so they can be cleaned.'}]}},
    {id:'playground', name:'Playground', x:300,y:760,r:65, q:{e:'🛝',who:'Playground',text:'One chain on the swing is broken.',
      o:[{t:'Swing anyway, very high',ok:false,heart:true,why:'Broken swings can throw you to the ground.'},{t:'Do not use it. Tell a teacher it is broken',ok:true,why:'Well done! Report broken play equipment.'}]}},
    {id:'sickbay', name:'Sick bay', x:1200,y:820,r:55, q:{e:'🩹',who:'School nurse',text:'You fell and cut your knee. It is bleeding.',
      o:[{t:'Hide it so nobody knows',ok:false,why:'A cut can get infected. Adults can help you.'},{t:'Tell a teacher and go to the sick bay',ok:true,why:'Correct! Always report injuries.'}]}},
    {id:'buspark', name:'Bus park', x:1200,y:940,r:60, q:{e:'🚌',who:'Bus park',text:'Your school bus is parking. Where do you wait?',
      o:[{t:'Behind the bus where the driver cannot see me',ok:false,heart:true,why:'The driver cannot see behind the bus. You could be hit.'},{t:'Behind the yellow line, where the driver can see me',ok:true,why:'Correct! Stay where the driver can see you.'}]}},
  ],
  hazards:[
    {k:'glass',e:'🪟',t:'Broken window glass on the ground',x:540,y:470,h:1},{k:'gutter',e:'🕳️',t:'Open gutter with no cover',x:930,y:990,h:1},
    {k:'wire',e:'⚡',t:'Naked electric wire hanging down',x:985,y:350,h:1},{k:'nail',e:'📌',t:'A nail sticking out of a bench',x:470,y:520,h:1},
    {k:'wet',e:'💧',t:'Wet floor with no warning sign',x:1300,y:400,h:1},{k:'snake',e:'🐍',t:'A snake in the long grass',x:130,y:1000,h:1},
    {k:'bottle',e:'🍾',t:'Broken bottle on the field',x:960,y:700,h:1},
    {k:'ext',e:'🧯',t:'Fire extinguisher',x:540,y:130,h:0},{k:'aid',e:'🩹',t:'First-aid box',x:1310,y:880,h:0},{k:'wash',e:'🚰',t:'Hand-washing station',x:1320,y:500,h:0},{k:'bin',e:'🗑️',t:'Covered dustbin',x:980,y:560,h:0},
  ],
  hazPick:5, decoyPick:3,
}}[WORLD];

// ================== STATE ==================
function newGame(){
  const hz=shuffle(DATA.hazards.filter(h=>h.h)).slice(0,DATA.hazPick), dc=shuffle(DATA.hazards.filter(h=>!h.h)).slice(0,DATA.decoyPick);
  S={p:{x:DATA.start.x,y:DATA.start.y,face:DATA.start.face,step:0,moving:false}, hearts:3, stars:0, results:{}, mistakes:[], items:[...hz,...dc].map(h=>({...h,done:null})),
     hazTotal:hz.length, hazFound:0, t:0, over:false, phase:'play', bus:{state:'away',x:2300}, drill:null, guide:null, roadWarned:false, lastHit:-9, escort:{x:DATA.start.x+40,y:DATA.start.y+30,face:0,step:0,moving:false}};
  yaw=0; pitch=.42;
}
const MISS = DATA.missions;
const missionActive = m => !(m.id in S.results) && (!m.when || m.when());

function ask(m, onDone){
  const q=m.q; const opts=shuffle(q.o.map((o,i)=>({o,i})));
  const mm=openModal(`<div class="who"><span class="av">${q.e}</span><div><div class="muted" style="font-size:.85rem">${esc(q.who)}</div><h2>${esc(m.name)}</h2></div><button class="spk" id="spk" title="Read aloud">🔊</button></div>
    <p class="qt">${esc(q.text)}</p><div class="opts">${opts.map(({o,i})=>`<button data-i="${i}">${esc(o.t)}</button>`).join('')}</div><div id="fb"></div>`);
  speak(tr(q.text)+'. '+opts.map(({o},k)=>tr('Option')+' '+(k+1)+': '+tr(o.t)).join('. '));
  mm.querySelector('#spk').onclick=()=>{ const v=SL.settings.voice; SL.settings.voice=true; speak(q.text); SL.settings.voice=v; };
  mm.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{
    const o=q.o[+b.dataset.i]; mm.querySelectorAll('[data-i]').forEach(x=>x.disabled=true);
    if(o.ok){ S.stars++; chime(); } else { buzz(); S.mistakes.push({where:m.name,why:o.why}); if(o.heart) loseHeart(); }
    mm.querySelector('#fb').innerHTML=`<div class="fb ${o.ok?'':'bad'}">${o.ok?'⭐ ':'❌ '}${esc(o.why)}</div><div style="margin-top:10px"><button class="primary" id="cont">Continue</button></div>`;
    speak(o.why);
    mm.querySelector('#cont').onclick=()=>{ closeModal(); S.results[m.id]=o.ok; onDone&&onDone(o); afterMission(m.id); };
  });
}
function loseHeart(){ S.hearts=Math.max(0,S.hearts-1); G.shake=.4; if(S.hearts===0) setTimeout(()=>{ if(!S.over) endGame(false); },400); }
function afterMission(id){
  if(WORLD==='home' && id==='well'){ const left=S.items.filter(i=>i.h&&!i.done).length; if(left) toast('🔎 Before you leave home: '+left+' hidden danger'+(left>1?'s are':' is')+' still in the house or compound! Follow the hot/cold hint.'); }
  if(WORLD==='home' && id==='busstop'){ S.bus.state='arriving'; toast('🚌 The school bus is coming! Wait behind the yellow line.'); }
  if(WORLD==='home' && id==='board'){ startRide(); }
  if(WORLD==='school' && MISS.every(m=>m.id in S.results) && !S.drill){ setTimeout(startDrill,2500); toast('📚 Great job! Your teacher says: "Let us practise a fire drill soon."'); }
}

// ================== INTERACTIONS ==================
function interactables(){
  const L=[];
  for(const m of MISS){ if(!m.r||!missionActive(m)||!m.q) continue; L.push({x:m.x,y:m.y,r:m.r,label:'TALK',name:m.name,auto:true,run:()=>ask(m)}); }
  for(const it of S.items){ if(!it.done) L.push({x:it.x,y:it.y,r:48,label:'LOOK',name:'Look closely',run:()=>inspect(it)}); }
  if(S.drill && !S.drill.bagDone) L.push({x:205,y:300,r:55,label:'BAG',name:'Your school bag',auto:true,run:()=>{
    const m=openModal(`<div class="who"><span class="av">🎒</span><h2>Your school bag</h2></div><p class="qt">The fire alarm is ringing. Your school bag is under your desk.</p><div class="opts"><button id="b1">Go back and get my bag</button><button id="b2">Leave it and walk to the assembly point</button></div>`);
    speak('The fire alarm is ringing. Your school bag is under your desk.');
    m.querySelector('#b1').onclick=()=>{ S.drill.bagDone=true; S.mistakes.push({where:'Fire drill',why:'Never go back for your bag in a fire. Things can be replaced; you cannot.'}); loseHeart(); buzz(); closeModal(); toast('❌ Never go back for your bag in a fire!','bad'); };
    m.querySelector('#b2').onclick=()=>{ S.drill.bagDone=true; S.stars++; chime(); closeModal(); toast('⭐ Correct! Leave your bag and go.'); };
  }});
  return L;
}
function inspect(it){
  const m=openModal(`<div class="who"><span class="av">${it.e}</span><h2>Look closely</h2><button class="spk" id="spk">🔊</button></div><p class="qt">You see: <b>${esc(it.t)}</b></p>
    <div class="opts"><button id="r1">⚠️ That is dangerous! Tell an adult</button><button id="r2">👍 That is safe</button></div><div id="fb"></div>`);
  speak(tr('You see:')+' '+tr(it.t)+'. '+tr('Is it dangerous or safe?')); m.querySelector('#spk').onclick=()=>{ const v=SL.settings.voice; SL.settings.voice=true; speak(it.t); SL.settings.voice=v; };
  const fin=(rep)=>{ m.querySelectorAll('.opts button').forEach(b=>b.disabled=true); let ok=true,msg;
    if(it.h&&rep){ S.hazFound++; S.stars++; msg='Well spotted! You found a danger. ⭐'; }
    else if(it.h){ ok=false; S.mistakes.push({where:'Danger missed',why:'"'+it.t+'" is dangerous. Always tell an adult.'}); msg='Oh no! That is dangerous. Always tell an adult.'; }
    else if(rep){ msg='Good thinking, but that one is safe. It helps keep us safe!'; } else { S.stars++; msg='Correct! That is safe. ⭐'; }
    it.done=(it.h&&rep)?'tag':'seen'; ok?chime():buzz(); speak(msg);
    m.querySelector('#fb').innerHTML=`<div class="fb ${ok?'':'bad'}">${esc(msg)}</div><div style="margin-top:10px"><button class="primary" id="cont">Continue</button></div>`; m.querySelector('#cont').onclick=closeModal; };
  m.querySelector('#r1').onclick=()=>fin(true); m.querySelector('#r2').onclick=()=>fin(false);
}

// ================== COLLISION & GUIDE ==================
function blocked(x,y,r){ for(const b of SOLIDS){ const cx=clamp(x,b.x,b.x+b.w), cy=clamp(y,b.y,b.y+b.h); if((x-cx)**2+(y-cy)**2<r*r) return true; } return x<5||y<5||x>WW-5||y>WH-5; }
const inRect=(x,y,r)=>x>r.x1&&x<r.x2&&y>r.y1&&y<r.y2;
const GS=20; let GRID=null, GW=0, GH=0;
function buildGrid(){ GW=Math.ceil(WW/GS); GH=Math.ceil(WH/GS); GRID=new Uint8Array(GW*GH); for(let y=0;y<GH;y++) for(let x=0;x<GW;x++) GRID[y*GW+x]=blocked(x*GS+GS/2,y*GS+GS/2,11)?1:0; }
function cellCost(x,y){ const cx=x*GS+GS/2, cy=y*GS+GS/2; if(ROADS.some(r=>inRect(cx,cy,r))) return ZEBRAS.some(z=>inRect(cx,cy,z))?1:60; return 1; }
function freeCell(cx,cy){ if(!GRID[cy*GW+cx]) return [cx,cy]; for(let r=1;r<6;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const x=cx+dx,y=cy+dy; if(x>=0&&y>=0&&x<GW&&y<GH&&!GRID[y*GW+x]) return [x,y]; } return [cx,cy]; }
function findPath(sx,sy,tx,ty){
  if(!GRID) buildGrid();
  const [ax,ay]=freeCell(clamp(Math.floor(sx/GS),0,GW-1),clamp(Math.floor(sy/GS),0,GH-1)), [bx,by]=freeCell(clamp(Math.floor(tx/GS),0,GW-1),clamp(Math.floor(ty/GS),0,GH-1));
  const N=GW*GH, g=new Float32Array(N).fill(1e9), from=new Int32Array(N).fill(-1), closed=new Uint8Array(N), heap=[];
  const h=i=>Math.hypot(i%GW-bx,((i/GW)|0)-by);
  const push=(i,f)=>{ heap.push([f,i]); let k=heap.length-1; while(k>0){ const pk=(k-1)>>1; if(heap[pk][0]<=heap[k][0]) break; [heap[pk],heap[k]]=[heap[k],heap[pk]]; k=pk; } };
  const pop=()=>{ const top=heap[0], lst=heap.pop(); if(heap.length){ heap[0]=lst; let k=0; for(;;){ const l=2*k+1,r=l+1; let m=k; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===k) break; [heap[m],heap[k]]=[heap[k],heap[m]]; k=m; } } return top; };
  const st=ay*GW+ax, goal=by*GW+bx; g[st]=0; push(st,h(st));
  while(heap.length){ const [,i]=pop(); if(closed[i]) continue; closed[i]=1; if(i===goal) break; const x=i%GW,y=(i/GW)|0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=GW||ny>=GH) continue; const j=ny*GW+nx; if(GRID[j]||closed[j]) continue; if(dx&&dy&&(GRID[y*GW+nx]||GRID[ny*GW+x])) continue;
      const ng=g[i]+(dx&&dy?1.414:1)*cellCost(nx,ny); if(ng<g[j]){ g[j]=ng; from[j]=i; push(j,ng+h(j)); } } }
  if(from[goal]<0&&goal!==st) return null;
  const c=[]; for(let i=goal;i!==-1;i=from[i]) c.push([(i%GW)*GS+GS/2,((i/GW)|0)*GS+GS/2]); c.reverse(); c[0]=[sx,sy]; c.push([tx,ty]); return c;
}
const pathLen=p=>{ let L=0; for(let i=1;i<p.length;i++) L+=dist(p[i-1][0],p[i-1][1],p[i][0],p[i][1]); return L; };
function nextTarget(){
  if(S.drill&&!S.drill.done) return {id:'assembly-drill',name:'ASSEMBLY POINT',x:750,y:760};
  const m=MISS.find(missionActive); if(m) return {id:m.id,name:m.name,x:m.x,y:m.y};
  if(WORLD==='home' && !('board' in S.results) && S.bus.state!=='parked') return {id:'busstop-wait',name:'Bus stop (wait)',x:1150,y:1015};
  return null;
}
function guideUpdate(dt){
  const p=S.p, T=guideOn?nextTarget():null; S.guide=S.guide||{t:0,key:'',path:null,said:''}; const gd=S.guide; gd.target=T; gd.t-=dt;
  if(!T){ gd.path=null; return; }
  if(T.id!==gd.key||gd.t<=0||!gd.path){ gd.path=findPath(p.x,p.y,T.x,T.y); gd.key=T.id; gd.t=.6; }
  if(gd.said!==T.id){ gd.said=T.id; toast((WORLD==='home'?'👩🏾 Mummy':'👩🏾‍🏫 Teacher')+': "Follow me to the '+T.name+'."'); }
  const e=S.escort, pth=gd.path; if(!pth) return;
  let acc=0, goal=pth[pth.length-1]; for(let i=1;i<pth.length;i++){ acc+=dist(pth[i-1][0],pth[i-1][1],pth[i][0],pth[i][1]); if(acc>=60){ goal=pth[i]; break; } }
  const dP=dist(e.x,e.y,p.x,p.y), dG=dist(e.x,e.y,goal[0],goal[1]), behind=dist(e.x,e.y,T.x,T.y)>dist(p.x,p.y,T.x,T.y)+30; e.moving=false;
  if(dP>360){ e.x=p.x+(goal[0]-p.x)*.4; e.y=p.y+(goal[1]-p.y)*.4; }
  else if((dP<150||behind)&&dG>12){ const sp=(behind?150:90)*dt, k=Math.min(1,sp/dG), dx=(goal[0]-e.x)*k, dy=(goal[1]-e.y)*k; e.x+=dx; e.y+=dy; e.face=Math.atan2(-dx,-dy); e.step+=dt*9; e.moving=true; }
  else e.face=Math.atan2(-(p.x-e.x),-(p.y-e.y));
}

// ================== VEHICLES (home street) ==================
const LANES={A:{y:835,dir:1},B:{y:930,dir:-1}};
let VEH=[];
function vehiclesUpdate(dt){
  const p=S.p, onZebra=ZEBRAS.some(z=>inRect(p.x,p.y,z)), inRoad=ROADS.some(r=>inRect(p.x,p.y,r));
  for(const v of VEH){
    const L=LANES[v.lane]; let stop=false;
    const zx=930, ahead=(zx-v.x)*L.dir;
    if((onZebra||(inRoad&&Math.abs(p.x-v.x)<260)) && ahead>40 && ahead<260) stop=true;
    for(const o of VEH){ if(o!==v && o.lane===v.lane){ const d=(o.x-v.x)*L.dir; if(d>0&&d<v.len+60) stop=true; } }
    if(v.bus){ if(S.bus.state==='arriving'){ if(v.x<=1150){ v.x=1150; S.bus.state='parked'; toast('🚌 The bus has stopped. Now you can get on.'); beep(500,.2,'sine',.06); } }
      else if(S.bus.state==='parked'||S.bus.state==='away'){ stop=true; } }
    v.speed += ((stop?0:v.max)-v.speed)*Math.min(1,dt*(stop?4:1.5));
    if(!(v.bus&&S.bus.state==='away')) v.x += L.dir*v.speed*dt;
    if(!v.bus){ if(L.dir>0&&v.x>WW+400) v.x=-400; if(L.dir<0&&v.x<-400) v.x=WW+400; }
    if(inRoad && !onZebra && Math.abs(p.y-L.y)<55 && Math.abs(p.x-v.x)<v.len/2+25 && S.t-S.lastHit>2 && v.speed>20){
      S.lastHit=S.t; loseHeart(); buzz(); toast('💥 Beep! A '+v.name+' nearly hit you! Only cross at the zebra.','bad'); S.mistakes.push({where:'Road',why:'You were nearly hit. Stay on the walkway and cross only at the zebra.'}); p.y = p.y<880?770:1000; }
  }
  if(inRoad && !onZebra && !S.roadWarned){ S.roadWarned=true; complete('zebra',false); S.mistakes.push({where:'Road',why:'Never walk on the road. Cross only at the zebra crossing.'}); toast('⚠️ Get off the road! Only cross at the zebra crossing.','bad'); buzz(); speak('Get off the road! Only cross at the zebra crossing.'); }
  if(onZebra && !('zebra' in S.results)){ complete('zebra',true); S.stars++; chime(); toast('⭐ Well done! You crossed at the zebra and the cars stopped.'); }
}
function complete(id,ok){ if(!(id in S.results)) S.results[id]=ok; }

// ================== FINALES ==================
function startRide(){ S.phase='ride'; S.rideT=0; toast('🚌 Off to school! Seatbelt on.'); }
function startDrill(){ if(S.over) return; if(paused){ setTimeout(startDrill,1000); return; }
  S.drill={left:40,done:false,bagDone:false,smokeR:30}; $('alarmv').classList.remove('hidden'); $('timer').classList.remove('hidden');
  const m=openModal(`<h1 style="margin:0">🚨 FIRE DRILL!</h1><p class="qt">The fire alarm is ringing! There is smoke coming from the science lab. Walk quickly to the <b>assembly point</b> in the middle of the school. Do not go back for anything!</p><button class="primary" id="go">GO!</button>`);
  speak('Fire drill! Walk quickly to the assembly point. Do not go back for anything.'); m.querySelector('#go').onclick=closeModal; }
function endGame(win){
  if(S.over) return; S.over=true; paused=true; $('alarmv').classList.add('hidden'); $('timer').classList.add('hidden');
  const total=MISS.filter(m=>m.q).length + S.hazTotal + DATA.decoyPick + (WORLD==='home'?1:1);
  const level = !win? '' : S.stars>=total-2 ? 'GOLD' : S.stars>=total-6 ? 'SILVER' : 'BRONZE';
  const txt=`${DATA.title.toUpperCase()} – SAFETY STAR\nName: ${kid.name}\nResult: ${win?level+' ⭐ '+S.stars+' stars':'Try again'}\nDangers found: ${S.hazFound}/${S.hazTotal}\nDate: ${new Date().toLocaleString()}`;
  win?chime():buzz();
  SL.post({game:WORLD,name:kid.name,role:'Pupil',result:win?level:'TRY AGAIN',hazards:S.hazFound+'/'+S.hazTotal,mistakes:S.mistakes.length,where:[...new Set(S.mistakes.map(x=>x.where))],stars:S.stars,date:new Date().toLocaleString()});
  const m=openModal(`<h1 style="margin:.1em 0">${win?'🎉 You did it!':'😮 Oops! Let\'s try again'}</h1>
    ${win?`<div class="cert"><div class="big">🏅 ${level} SAFETY STAR</div><div class="muted">${esc(DATA.title)}</div><div class="nm">${esc(kid.name)}</div><div>⭐ ${S.stars} stars · 🔎 ${S.hazFound}/${S.hazTotal} dangers found · ❤️ ${S.hearts} hearts left</div><div class="muted">${new Date().toLocaleDateString()}</div></div>`
          :`<p class="qt">You ran out of hearts. Every mistake is a chance to learn!</p>`}
    <h2 style="margin-top:12px">What we learned</h2>
    ${S.mistakes.length?`<ul>${S.mistakes.map(x=>`<li><b>${esc(x.where)}:</b> ${esc(x.why)}</li>`).join('')}</ul>`:'<p>Perfect! No mistakes at all. 🌟</p>'}
    <div class="row" style="margin-top:12px"><button class="primary" id="again">${win?'Play again':'Try again'}</button><a class="btnlink wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">💬 Send to Mummy/Daddy</a><a class="btnlink" href="index.html">◀ All games</a></div>`);
  speak(win? 'Well done '+kid.name+'! You are a '+level+' safety star!' : 'Oops! Let us try again.');
  m.querySelector('#again').onclick=()=>{ closeModal(); showStart(); };
}

// ================== UPDATE ==================
function update(dt){
  S.t+=dt; const p=S.p;
  if(S.phase==='ride'){ S.rideT+=dt; const v=VEH.find(v=>v.bus); v.x-=Math.min(160,40+S.rideT*60)*dt; if(S.rideT>5) endGame(true); return; }
  if(keys.ArrowLeft) yaw+=2.2*dt; if(keys.ArrowRight) yaw-=2.2*dt;
  let fwd=0,str=0; if(keys.KeyW||keys.ArrowUp) fwd+=1; if(keys.KeyS||keys.ArrowDown) fwd-=1; if(keys.KeyD) str+=1; if(keys.KeyA) str-=1; if(joy){ fwd=-joy.dy; str=joy.dx; }
  const fx=-Math.sin(yaw), fy=-Math.cos(yaw), rx=Math.cos(yaw), ry=-Math.sin(yaw); let mx=fx*fwd+rx*str, my=fy*fwd+ry*str; const len=Math.hypot(mx,my); p.moving=len>.1;
  if(p.moving){ const sp=95*(len>1?1/len:1); mx*=sp; my*=sp; if(!blocked(p.x+mx*dt,p.y,10)) p.x+=mx*dt; if(!blocked(p.x,p.y+my*dt,10)) p.y+=my*dt; p.face=Math.atan2(-mx,-my); p.step+=dt*11; }
  if(WORLD==='home') vehiclesUpdate(dt);
  if(S.drill&&!S.drill.done){ const d=S.drill; d.left-=dt; d.smokeR+=dt*8; if(Math.floor(S.t*1.5)%2===0) beep(Math.floor(S.t*1.5)%4<2?900:700,.05,'square',.02);
    $('timer').textContent='🚨 '+Math.max(0,Math.ceil(d.left))+'s';
    if(dist(p.x,p.y,1150,240)<d.smokeR && S.t-S.lastHit>3){ S.lastHit=S.t; loseHeart(); toast('😷 Smoke! Move away from the lab!','bad'); }
    if(dist(p.x,p.y,750,760)<70){ d.done=true; S.stars++; toast('⭐ You reached the assembly point. Your teacher counted you!'); endGame(true); return; }
    if(d.left<=0){ S.mistakes.push({where:'Fire drill',why:'You did not reach the assembly point in time. Know where it is before you need it.'}); endGame(false); return; } }
  guideUpdate(dt);
  const near=interactables().filter(i=>dist(p.x,p.y,i.x,i.y)<i.r).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0]; S.near=near;
  if(near&&near.auto&&!paused&&dist(p.x,p.y,near.x,near.y)<near.r*.75){ near.run(); return; }
  if(near){ $('prompt').textContent=near.name; $('prompt').classList.remove('hidden'); $('act').textContent=near.label; $('act').disabled=false; }
  else { $('prompt').classList.add('hidden'); $('act').textContent='E'; $('act').disabled=true; }
}
function doAct(){ if(!paused&&S&&S.near){ ensureAudio(); S.near.run(); } }

// ================== 3D SCENE ==================
let BLOB=null, _smokeTex=null;
function SMOKE_TEX(){ if(!_smokeTex) _smokeTex=tex(mkCanvas(128,128,(c)=>{ for(let i=0;i<6;i++){ const x=rnd(40,88),y=rnd(40,88),r=rnd(25,45); const g=c.createRadialGradient(x,y,2,x,y,r); g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(0,0,128,128);} }),1,1); return _smokeTex; }
function tileTex(a,b,n=8){ return mkCanvas(256,256,(c,w,h)=>{ const s=w/n; for(let y=0;y<n;y++) for(let x=0;x<n;x++){ c.fillStyle=(x+y)%2?a:b; c.fillRect(x*s,y*s,s,s);} c.strokeStyle='rgba(0,0,0,.18)'; c.lineWidth=2; for(let i=0;i<=n;i++){ c.beginPath(); c.moveTo(i*s,0); c.lineTo(i*s,h); c.stroke(); c.beginPath(); c.moveTo(0,i*s); c.lineTo(w,i*s); c.stroke(); } noise(c,w,h,3000,.05,2); }); }
function woodTex(){ return mkCanvas(256,256,(c,w,h)=>{ c.fillStyle='#a8743f'; c.fillRect(0,0,w,h); for(let y=0;y<h;y+=32){ c.fillStyle=`rgba(60,30,10,${rnd(.05,.2)})`; c.fillRect(0,y,w,30); c.fillStyle='rgba(40,20,5,.4)'; c.fillRect(0,y+30,w,2);} for(let i=0;i<300;i++){ c.strokeStyle='rgba(60,30,10,.15)'; c.beginPath(); const y=rnd(0,h); c.moveTo(0,y); c.bezierCurveTo(w*.3,y+rnd(-4,4),w*.6,y+rnd(-4,4),w,y); c.stroke(); } }); }
let MAT={};
function plane(scene,w,d,mat,x,z,y=0){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat); m.rotation.x=-Math.PI/2; m.position.set(x,y,z); m.receiveShadow=true; scene.add(m); return m; }
function floorRect(scene,x1,y1,x2,y2,mat,y=.006,rep=2){ const w=X(x2-x1), d=Z(y2-y1); const m=mat.clone(); if(mat.map){ m.map=mat.map.clone(); m.map.needsUpdate=true; m.map.repeat.set(w/rep,d/rep);} if(mat.normalMap){ m.normalMap=mat.normalMap.clone(); m.normalMap.needsUpdate=true; m.normalMap.repeat.set(w/rep,d/rep);} return plane(scene,w,d,m,X((x1+x2)/2),Z((y1+y2)/2),y); }
function wall(scene,x1,y1,x2,y2,o={}){ // axis-aligned wall with optional gaps [a,b]
  const h=o.h??1.35, t=o.t??6, mat=o.mat||MAT.wall, gaps=(o.gaps||[]).slice().sort((a,b)=>a[0]-b[0]); const horiz=y1===y2; const a0=horiz?Math.min(x1,x2):Math.min(y1,y2), a1=horiz?Math.max(x1,x2):Math.max(y1,y2);
  let segs=[], cur=a0; for(const [ga,gb] of gaps){ if(ga>cur) segs.push([cur,ga]); cur=Math.max(cur,gb); } if(cur<a1) segs.push([cur,a1]);
  for(const [s,e] of segs){ const L=e-s; if(L<=0) continue;
    if(horiz){ scene.add(bx(X(L),h,X(t),mat,X(s+L/2),h/2,Z(y1))); scene.add(bx(X(L)+.02,.06,X(t)+.06,MAT.cope,X(s+L/2),h+.03,Z(y1),false)); SOLIDS.push({x:s,y:y1-t/2,w:L,h:t}); }
    else { scene.add(bx(X(t),h,Z(L),mat,X(x1),h/2,Z(s+L/2))); scene.add(bx(X(t)+.06,.06,Z(L)+.02,MAT.cope,X(x1),h+.03,Z(s+L/2),false)); SOLIDS.push({x:x1-t/2,y:s,w:t,h:L}); } }
}
function place(scene,obj,x,y,ry=0,solid=null){ obj.position.set(X(x),obj.position.y,Z(y)); obj.rotation.y=ry; obj.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); consolidate(obj); scene.add(obj); if(solid) SOLIDS.push({x:x-solid[0]/2,y:y-solid[1]/2,w:solid[0],h:solid[1]}); return obj; }
function grp(){ return new THREE.Group(); }
function sprite(e,size=.5){ const t=tex(mkCanvas(128,128,(c)=>{ c.font='96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(e,64,70); }),1,1); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false})); s.scale.set(size,size,1); return s; }
function signBoard(text,bg='#12355b',h=.4){ const c=boardCanvas(text,bg); const p=new THREE.Mesh(new THREE.PlaneGeometry(c.width/110*h,h),std('#fff',{map:tex(c),r:.5,side:THREE.DoubleSide})); return p; }

// ---------- furniture & props ----------
const F={
  bed(){ const g=grp(); g.add(bx(1.5,.35,2.1,std('#6b4a2b',{r:.7}),0,.2,0), bx(1.4,.2,2,std('#f2f2f2',{r:.9}),0,.47,0), bx(1.42,.06,1.4,fabricLike('#3a6fb0'),0,.6,.28), bx(.6,.12,.35,std('#ffffff',{r:.9}),0,.62,-.75), bx(1.5,.8,.08,std('#5a3a1f',{r:.7}),0,.55,-1.04)); return g; },
  wardrobe(){ const g=grp(); g.add(bx(1.2,2,.6,std('#7a5230',{r:.6}),0,1,0), bx(.02,1.8,.02,std('#222'),0,1,-.31)); return g; },
  desk(){ const g=grp(); const w=std('#8a6a44',{r:.7}); g.add(bx(1.1,.05,.55,w,0,.72,0)); for(const [x,z] of [[-.5,-.24],[.5,-.24],[-.5,.24],[.5,.24]]) g.add(bx(.05,.72,.05,w,x,.36,z)); return g; },
  chair(c='#2a5d9f'){ const g=grp(); const m=std(c,{r:.6}); g.add(bx(.42,.04,.42,m,0,.45,0), bx(.42,.45,.04,m,0,.68,.2)); for(const [x,z] of [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]]) g.add(bx(.03,.45,.03,std('#555',{m:.7,r:.4}),x,.22,z)); return g; },
  sofa(){ const g=grp(); const m=fabricLike('#7a2e2e'); g.add(bx(2.2,.45,.9,m,0,.3,0), bx(2.2,.5,.2,m,0,.75,.35), bx(.2,.35,.9,m,-1,.6,0), bx(.2,.35,.9,m,1,.6,0)); return g; },
  tv(){ const g=grp(); g.add(bx(1.6,.5,.45,std('#4a3020',{r:.6}),0,.25,0), bx(1.3,.75,.06,std('#111',{r:.15,m:.4}),0,.92,0)); return g; },
  table(){ const g=grp(); const w=std('#6b4a2b',{r:.6}); g.add(bx(1.6,.06,.9,w,0,.76,0)); for(const [x,z] of [[-.72,-.38],[.72,-.38],[-.72,.38],[.72,.38]]) g.add(bx(.06,.76,.06,w,x,.38,z)); return g; },
  counter(){ const g=grp(); g.add(bx(3,.9,.65,std('#e8e4dc',{r:.5}),0,.45,0), bx(3.02,.05,.68,std('#4b4b4b',{r:.3,m:.2}),0,.92,0)); return g; },
  cooker(){ const g=grp(); g.add(bx(.6,.9,.6,std('#d9d9d9',{r:.35,m:.4}),0,.45,0), bx(.6,.02,.6,std('#222',{r:.4}),0,.91,0)); const pot=cyl(.17,.15,.2,std('#9aa0a6',{r:.3,m:.9}),.1,1.02,.05,16); g.add(pot); const hd=bx(.25,.03,.04,std('#222'),.32,1.08,.05); g.add(hd); const st=sprite('♨️',.35); st.position.set(.1,1.35,.05); g.add(st); return g; },
  fridge(){ const g=grp(); g.add(bx(.7,1.7,.7,std('#f4f4f4',{r:.3,m:.2}),0,.85,0), bx(.03,.4,.03,std('#888',{m:.8}),-.3,1.1,-.36)); return g; },
  gas(){ const g=grp(); g.add(cyl(.18,.18,.6,std('#1b5fbf',{r:.4,m:.3}),0,.3,0,16), cyl(.05,.05,.1,std('#aaa',{m:.8}),0,.65,0,8)); return g; },
  toilet(){ const g=grp(); const m=std('#fbfbfb',{r:.2}); g.add(cyl(.2,.17,.4,m,0,.2,0,16), bx(.4,.45,.18,m,0,.55,.25)); return g; },
  sink(){ const g=grp(); g.add(bx(.6,.15,.45,std('#fbfbfb',{r:.2}),0,.85,0), bx(.1,.8,.1,std('#eee'),0,.4,0)); return g; },
  bucket(){ const g=grp(); g.add(cyl(.2,.16,.35,std('#2a7fd4',{r:.4}),0,.17,0,16)); return g; },
  shelf(){ const g=grp(); const w=std('#7a5230',{r:.7}); g.add(bx(1.2,1.6,.4,w,0,.8,0)); for(let i=0;i<3;i++) g.add(bx(1.1,.04,.38,std('#a07850'),0,.4+i*.45,-.01)); for(let i=0;i<5;i++) g.add(bx(.18,.25,.18,std(['#c0392b','#2e86c1','#f1c40f','#27ae60','#8e44ad'][i]),-.45+i*.22,.97,-.05)); return g; },
  generator(){ const g=grp(); g.add(bx(1,.7,.6,std('#c0392b',{r:.5,m:.3}),0,.4,0), bx(1.05,.1,.65,std('#222'),0,.05,0), cyl(.04,.04,.4,std('#555',{m:.8}),.4,.9,0,8)); return g; },
  well(){ const g=grp(); g.add(cyl(.75,.8,.6,std('#9e9a90',{map:tex(TX.concrete,2,1),r:.9}),0,.3,0,20)); const hole=new THREE.Mesh(new THREE.CircleGeometry(.6,20),std('#050505',{r:1})); hole.rotation.x=-Math.PI/2; hole.position.y=.61; g.add(hole); const lid=bx(1,.06,1,std('#7a7a7a',{r:.8}),1.1,.03,.2); lid.rotation.y=.4; g.add(lid); const ball=sph(.12,std('#e74c3c',{r:.4}),.95,.12,-.6,14); g.add(ball); return g; },
  car(c='#c0392b'){ return makeCar(c,4.4,1.8,1.45); },
  swing(){ const g=grp(); const m=std('#c0392b',{r:.5,m:.4}); for(const x of [-1.2,1.2]){ const a=cyl(.05,.05,2.6,m,x,1.25,-.5,8); a.rotation.x=.2; const b=cyl(.05,.05,2.6,m,x,1.25,.5,8); b.rotation.x=-.2; g.add(a,b); } const top=cyl(.05,.05,2.5,m,0,2.45,0,8); top.rotation.z=Math.PI/2; g.add(top);
    for(const x of [-.5,.5]){ g.add(bx(.45,.04,.2,std('#222'),x,.55,0)); g.add(cyl(.01,.01,1.9,std('#aaa',{m:.9}),x-.2,1.5,0,4), cyl(.01,.01,x>0?1.0:1.9,std('#aaa',{m:.9}),x+.2,x>0?2:1.5,0,4)); } return g; },
  slide(){ const g=grp(); const m=std('#f1c40f',{r:.4}); const s=bx(.6,.05,3,m,0,1,0); s.rotation.x=-.55; g.add(s); g.add(bx(.7,.05,.7,std('#2e86c1'),0,1.75,-1.5)); for(const [x,z] of [[-.3,-1.8],[.3,-1.8],[-.3,-1.2],[.3,-1.2]]) g.add(cyl(.04,.04,1.75,std('#2e86c1'),x,.87,z,8)); return g; },
  seesaw(){ const g=grp(); g.add(bx(.3,.4,.3,std('#2e86c1'),0,.2,0)); const b=bx(3,.06,.3,std('#e67e22',{r:.5}),0,.45,0); b.rotation.z=.15; g.add(b); return g; },
  flag(){ const g=grp(); g.add(cyl(.05,.05,6,std('#ccc',{m:.8,r:.3}),0,3,0,8)); const fl=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.7),std('#fff',{side:THREE.DoubleSide,map:tex(mkCanvas(120,70,(c)=>{ c.fillStyle='#008751'; c.fillRect(0,0,40,70); c.fillRect(80,0,40,70); c.fillStyle='#fff'; c.fillRect(40,0,40,70); }))})); fl.position.set(.62,5.5,0); g.add(fl); return g; },
  blackboard(){ const g=grp(); g.add(bx(2.6,1.1,.06,std('#1f3a2e',{r:.8}),0,1.4,0), bx(2.7,.05,.12,std('#7a5230'),0,.83,-.05)); return g; },
  bench(){ const g=grp(); g.add(bx(2.4,.9,.7,std('#5d6d7e',{r:.5,m:.3}),0,.45,0)); for(let i=0;i<4;i++) g.add(cyl(.05,.06,.2,std(['#e74c3c','#3498db','#27ae60','#f1c40f'][i],{transparent:true,opacity:.75,r:.1}),-.8+i*.5,1,0,10)); return g; },
  cubicle(){ const g=grp(); g.add(bx(1,2,.05,std('#5dade2',{r:.4}),0,1,-.5), bx(.05,2,1,std('#5dade2',{r:.4}),-.5,1,0)); g.add(F.toilet()); return g; },
  canteenTable(){ const g=grp(); g.add(F.table()); for(const z of [-.75,.75]) g.add(bx(1.6,.05,.3,std('#6b4a2b'),0,.45,z)); return g; },
  bed2(){ const g=grp(); g.add(bx(.9,.5,1.9,std('#ecf0f1',{r:.6}),0,.25,0), bx(.9,.12,1.9,std('#ffffff',{r:.9}),0,.56,0)); return g; },
  tree(){ const g=grp(); g.add(cyl(.18,.26,2.4,std('#6d5a43',{r:1}),0,1.2,0,8)); for(let i=0;i<5;i++){ g.add(mesh(new THREE.IcosahedronGeometry(rnd(1,1.5),1),std('#3c6a2c',{r:.9}),rnd(-.8,.8),rnd(2.5,3.5),rnd(-.8,.8))); } return g; },
  palm(){ const g=grp(); g.add(cyl(.15,.22,6,std('#6d5a43',{r:1}),0,3,0,8)); for(let i=0;i<9;i++){ const fr=new THREE.Mesh(new THREE.PlaneGeometry(.6,2.8,1,4),std('#3e6b2a',{r:.85,side:THREE.DoubleSide})); const pos=fr.geometry.attributes.position; for(let k=0;k<pos.count;k++){ const yy=pos.getY(k); pos.setZ(k,-Math.pow((yy+1.4)/2.8,2)*1.1);} fr.geometry.computeVertexNormals(); fr.position.set(0,6,0); fr.rotation.set(-1,i/9*Math.PI*2,0,'YXZ'); fr.translateY(1.2); g.add(fr);} return g; },
  keke(){ const g=grp(); const y=std('#e3c21b',{r:.4,m:.3}); g.add(bx(1.3,1,2.4,y,0,.9,0), bx(1.35,.08,2.5,std('#1f6b3a',{r:.5}),0,1.75,0)); g.add(bx(1.2,.5,.05,std('#1c2630',{r:.05,m:.9}),0,1.25,-1.2)); for(const [x,z] of [[0,-1],[-.55,.8],[.55,.8]]){ const w=cyl(.25,.25,.15,std('#151515',{r:.8}),x,.25,z,14); w.rotation.z=Math.PI/2; g.add(w);} return g; },
  bus(){ const g=makeCar('#f2b705',9,2.4,2.9,true); const s=signBoard('SCHOOL BUS','#111',.45); s.position.set(-1.22,1.9,0); s.rotation.y=-Math.PI/2; g.add(s); const s2=s.clone(); s2.position.x=1.22; s2.rotation.y=Math.PI/2; g.add(s2); return g; },
};
function fabricLike(c){ return std(c,{r:.95}); }
function hazardProp(it){
  const g=grp(); const k=it.k;
  if(k==='plugs'){ g.add(bx(.3,.2,.08,std('#f5f5f5'),0,.35,0)); for(let i=0;i<4;i++) g.add(bx(.08,.12,.12,std('#222'),-.1+i*.07,.35+(i%2)*.08,-.08)); g.add(bx(.2,.08,.25,std('#eee'),.15,.04,-.3)); }
  else if(k==='knife'){ g.add(F.table()); const kn=bx(.04,.01,.32,std('#ccc',{m:.9,r:.2}),.75,.8,.3); kn.rotation.y=.4; g.add(kn); }
  else if(k==='bleach'){ g.add(cyl(.05,.06,.28,std('#c9e8a0',{transparent:true,opacity:.7,r:.1}),0,.14,0,12)); }
  else if(k==='bag'){ const b=sph(.22,std('#f5f5f5',{transparent:true,opacity:.75,r:.3}),0,.12,0,10); b.scale.y=.5; g.add(b); }
  else if(k==='iron'){ g.add(bx(.9,.8,.35,std('#8a6a44'),0,.4,0)); g.add(bx(.25,.1,.12,std('#d35400',{emissive:'#ff5500',emissiveIntensity:.5}),0,.85,0)); }
  else if(k==='toys'){ for(let i=0;i<4;i++) g.add(bx(.15,.15,.15,std(['#e74c3c','#3498db','#f1c40f','#2ecc71'][i]),rnd(-.4,.4),.075,rnd(-.3,.3))); g.add(sph(.12,std('#e67e22'),.2,.12,.2,12)); }
  else if(k==='gutter'||k==='hole'){ const h=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.5),std('#0a0a0a',{r:1})); h.rotation.x=-Math.PI/2; h.position.y=.012; g.add(h); const sl=bx(.7,.05,.55,std('#8a8a8a',{r:.8}),1.2,.03,.2); sl.rotation.y=.5; g.add(sl); }
  else if(k==='glass'){ for(let i=0;i<6;i++){ const s=bx(rnd(.1,.25),.01,rnd(.1,.2),std('#cfe8f5',{transparent:true,opacity:.6,r:.05,m:.5}),rnd(-.4,.4),.01,rnd(-.3,.3)); s.rotation.y=rnd(0,3); g.add(s);} }
  else if(k==='wire'){ g.add(cyl(.04,.04,2.6,std('#888',{m:.8}),0,1.3,0,8)); const w=cyl(.012,.012,1.4,std('#c0392b'),.1,1.6,0,6); w.rotation.z=.4; g.add(w); g.add(bx(.03,.03,.06,std('#c87533',{m:1}),.38,1,0)); }
  else if(k==='nail'){ g.add(bx(2,.45,.4,std('#7a5230'),0,.22,0)); g.add(cyl(.01,.01,.06,std('#999',{m:1}),.3,.48,0,6)); }
  else if(k==='wet'){ const w=new THREE.Mesh(new THREE.CircleGeometry(.9,20),std('#9fc4dd',{r:.03,transparent:true,opacity:.6})); w.rotation.x=-Math.PI/2; w.position.y=.012; w.scale.set(1.3,.8,1); g.add(w); }
  else if(k==='snake'){ const pts=[]; for(let i=0;i<8;i++) pts.push(new THREE.Vector3(i*.15-.5,.05,Math.sin(i*1.2)*.15)); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.04,8),std('#3d4a1e',{r:.6}))); for(let i=0;i<10;i++) g.add(cyl(.01,.03,rnd(.5,.9),std('#5a7a2a'),rnd(-.6,.6),.3,rnd(-.4,.4),5)); }
  else if(k==='bottle'){ for(let i=0;i<4;i++){ const s=bx(rnd(.06,.12),.01,rnd(.08,.15),std('#2e7d32',{transparent:true,opacity:.75,r:.05}),rnd(-.25,.25),.01,rnd(-.2,.2)); s.rotation.y=rnd(0,3); g.add(s);} g.add(cyl(.04,.04,.12,std('#2e7d32',{transparent:true,opacity:.8}),.1,.06,0,10)); }
  else if(k==='ext'){ g.add(cyl(.09,.09,.5,std('#c8102e',{r:.4}),0,.25,0,14)); }
  else if(k==='aid'){ g.add(bx(.4,.3,.15,std('#f5f5f5'),0,1.2,0), bx(.08,.2,.01,std('#14853d'),0,1.2,-.08), bx(.2,.08,.01,std('#14853d'),0,1.2,-.08), cyl(.03,.03,1.1,std('#888',{m:.8}),0,.55,0,6)); }
  else if(k==='lamp'){ g.add(bx(.15,.25,.12,std('#2c3e50'),0,.4,0), bx(.4,.4,.35,std('#8a6a44'),0,.2,0)); }
  else if(k==='bin'){ g.add(cyl(.25,.22,.75,std('#2c7a3a',{r:.6}),0,.37,0,16), cyl(.27,.27,.05,std('#245f2f'),0,.77,0,16)); }
  else if(k==='wash'){ g.add(bx(.8,.9,.4,std('#2e86c1'),0,.45,0), cyl(.2,.2,.4,std('#ecf0f1'),0,1.1,0,14)); }
  const badge=sprite(it.e,.42); badge.position.y=1.5; badge.visible=false; g.add(badge); g.userData.badge=badge;
  return g;
}

function initScene(){
  const canvas=$('game');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true}); RENDERER=renderer;
  const LOW=Math.min(innerWidth,innerHeight)<700||/Android|iPhone|iPad/i.test(navigator.userAgent);
  renderer.setPixelRatio(LOW?1:Math.min(1.5,devicePixelRatio||1)); renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.62; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  buildTextures(); BLOB=blobTex();
  const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(60,1,.08,700); camera.rotation.order='YXZ';
  const pmrem=new THREE.PMREMGenerator(renderer); const sunDir=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(40),THREE.MathUtils.degToRad(150));
  if(THREE.Sky){ const sky=new THREE.Sky(); sky.scale.setScalar(4500); const u=sky.material.uniforms; u.turbidity.value=3.2; u.rayleigh.value=1.1; u.mieCoefficient.value=.004; u.mieDirectionalG.value=.8; u.sunPosition.value.copy(sunDir); scene.add(sky);
    const tmp=new THREE.Scene(); const s2=new THREE.Sky(); s2.scale.setScalar(4500); Object.keys(u).forEach(k=>{ if(s2.material.uniforms[k]) s2.material.uniforms[k].value = u[k].value.clone? u[k].value.clone(): u[k].value; }); tmp.add(s2); scene.environment=pmrem.fromScene(tmp).texture; }
  else scene.background=lin('#a8c7e0');
  scene.fog=new THREE.Fog(lin('#bfd0de'),70,300);
  scene.add(new THREE.HemisphereLight(lin('#dfeaf5'),lin('#6b6150'),.4));
  const sun=new THREE.DirectionalLight(lin('#fff1d6'),2.4); sun.castShadow=true; sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048); const sc=sun.shadow.camera; sc.left=-30; sc.right=30; sc.top=30; sc.bottom=-30; sc.near=1; sc.far=150; sun.shadow.bias=-.0004; sun.shadow.normalBias=.03; scene.add(sun,sun.target);
  // materials
  const gm=(t,n,r=.9)=>{ const m=std('#ffffff',{r}); m.map=tex(t,1,1); if(n){ m.normalMap=tex(n,1,1,false); m.normalScale=new THREE.Vector2(.7,.7);} return m; };
  MAT={ grass:gm(TX.grass,null,.95), pavers:gm(TX.pavers,TX.paversN,.85), asphalt:gm(TX.asphalt,TX.asphaltN,.92), concrete:gm(TX.concrete,TX.concreteN,.9),
    tiles:gm(tileTex('#e9e4da','#d8d1c4'),null,.35), tiles2:gm(tileTex('#cfe3ea','#ffffff',10),null,.25), wood:gm(woodTex(),null,.6), tiles3:gm(tileTex('#d9c7a8','#c9b48f',6),null,.4),
    wall:(()=>{ const m=std('#efe6d2',{r:.92}); m.map=tex(TX.plaster,1,1); return m; })(), wall2:(()=>{ const m=std('#cfe0ef',{r:.92}); m.map=tex(TX.plaster,1,1); return m; })(), wall3:(()=>{ const m=std('#f3d9b1',{r:.92}); m.map=tex(TX.plaster,1,1); return m; })(), block:(()=>{ const m=std('#efe6d2',{r:.92}); m.map=tex(TX.block,3,1); m.normalMap=tex(TX.blockN,3,1,false); return m; })(), cope:std('#cfc8b8',{r:.9}) };
  if(WORLD==='home') buildHome(scene); else buildSchool(scene);
  // markers, items, escort, player
  const ringM=new THREE.MeshBasicMaterial({color:SL.markerColor(),transparent:true,opacity:.75,depthWrite:false});
  const markers=MISS.filter(m=>m.r).map(m=>{ const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.68,32),ringM.clone()); ring.rotation.x=-Math.PI/2; ring.position.set(X(m.x),.03,Z(m.y)); scene.add(ring); const s=labelSprite('!',.36); s.material.color=new THREE.Color(SL.markerColor()); s.position.set(X(m.x),2.1,Z(m.y)); scene.add(s); return {m,ring,s}; });
  const chev=new THREE.Shape([[-.3,-.22],[0,.12],[.3,-.22],[.3,-.05],[0,.3],[-.3,-.05]].map(([x,y])=>new THREE.Vector2(x,y))); const cg=new THREE.ShapeGeometry(chev); cg.rotateX(-Math.PI/2);
  const arrows=new THREE.InstancedMesh(cg,new THREE.MeshBasicMaterial({color:'#ffd21a',transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),60); arrows.frustumCulled=false; arrows.count=0; scene.add(arrows);
  const escort=makeHuman({...DATA.escort.look, label:DATA.escort.label, topMap: DATA.escort.look.topMap? ankara('#c0392b','#f1c40f','#1abc9c'):null, gele: DATA.escort.look.gele? ankara('#f1c40f','#c0392b','#ffffff'):null}); scene.add(escort);
  // smoke for school drill
  const smoke=[]; if(WORLD==='school'){ const st=SMOKE_TEX(); for(let i=0;i<30;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:st,transparent:true,depthWrite:false,opacity:.85,color:lin('#555')})); s.userData={a:Math.random()*Math.PI*2,r:Math.sqrt(Math.random()),h:Math.random()}; s.visible=false; scene.add(s); smoke.push(s);} }
  flushInst(scene);
  G={renderer,scene,camera,sun,markers,arrows,escort,smoke,player:null,items:[],veh:[],shake:0};
  addEventListener('resize',resize3D); resize3D(); applyQuality();
  SL.fps.cb=()=>{ applyQuality(); toast(tr('Graphics set to Low to keep the game smooth on this device. Change it in ⚙️ Settings.')); };
}

function applyQuality(){
  if(!G) return; const q=SL.quality(), r=G.renderer;
  r.setPixelRatio(q==='low'?Math.min(1,devicePixelRatio||1)*.8:q==='medium'?1:Math.min(1.5,devicePixelRatio||1)); resize3D();
  const shadows=q!=='low'; if(r.shadowMap.enabled!==shadows){ r.shadowMap.enabled=shadows; G.scene.traverse(o=>{ if(o.material) [].concat(o.material).forEach(m=>m.needsUpdate=true); }); }
  G.scene.traverse(o=>{ if(o.userData&&o.userData.decor) o.visible=q!=='low'; });
}
function applyMarkerColor(){ if(!G) return; const c=new THREE.Color(SL.markerColor()); G.markers.forEach(m=>{ m.ring.material.color.copy(c); m.s.material.color.copy(c); }); G.arrows.material.color.set(SL.settings.cb?'#1f77ff':'#ffd21a'); }
function openSettings(after){ SL.openSettings(openModal, ()=>{ closeModal(); after&&after(); }, k=>{ if(k==='lang'){ const u=new URL(location.href); u.searchParams.set('lang',SL.lang); location.href=u.href; } if(k==='quality') applyQuality(); if(k==='cb') applyMarkerColor(); }); }
function resize3D(){ if(!G) return; G.renderer.setSize(innerWidth,innerHeight,false); G.camera.aspect=innerWidth/innerHeight; G.camera.fov=innerWidth<innerHeight?70:60; G.camera.updateProjectionMatrix(); }
function makeKid(){
  const g=makeHuman({sex:kid.sex, skin:kid.skin, top:kid.sex==='f'?'#ffffff':'#f5f5f5', bottom:kid.uni, dress:kid.sex==='f', outfit:kid.sex==='f'?'dress':'shirt', topMap:kid.sex==='f'?mkCanvas(64,64,(c)=>{ c.fillStyle=kid.uni; c.fillRect(0,0,64,64); c.fillStyle='rgba(255,255,255,.25)'; c.fillRect(0,0,64,6); }):null,
    hair:kid.sex==='f'?'braids':'low', collar:true, shoe:'#2b1d14', height:.68});
  const bag=bx(.3,.36,.14,std('#b03a2e',{r:.7}),0,.32,.19); g.userData.hips.add(bag); return g;
}
function resetDynamic(){
  const {scene}=G; G.items.forEach(i=>scene.remove(i.g)); G.items=[];
  for(const it of S.items){ const g=hazardProp(it); g.position.set(X(it.x),0,Z(it.y)); g.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); scene.add(g); const glint=labelSprite('?',.26); glint.position.y=1.3; g.add(glint); const tag=labelSprite('TOLD AN ADULT ✓',.22); tag.position.y=1.2; tag.visible=false; g.add(tag); G.items.push({it,g,glint,tag}); }
  if(G.player) scene.remove(G.player); G.player=makeKid(); scene.add(G.player);
  G.veh.forEach(v=>scene.remove(v.mesh)); G.veh=[]; VEH=[];
  if(WORLD==='home'){
    const defs=[['car','A',-200,'car','#c0392b',4.4],['okada','A',500,'okada',null,2],['danfo','B',1300,'danfo',null,5],['keke','B',300,'keke',null,2.6],['car','A',1100,'car','#e9e9e9',4.4]];
    for(const [kind,lane,x,name,col,len] of defs){ const mesh=kind==='car'?makeCar(col):kind==='danfo'?makeDanfo():kind==='okada'?makeOkada():F.keke(); consolidate(mesh); if(kind==='okada'){ const r=makeHuman({sex:'m',skin:'#3b2416',top:'#6b2d2d',bottom:'#222',longSleeve:true}); r.position.y=.35; animHuman(r,0,false,0,true); mesh.add(r); }
      scene.add(mesh); const v={kind,lane,x,name:name==='danfo'?'danfo bus':name,len:len/K,max:kind==='okada'?150:120,speed:100,mesh}; VEH.push(v); G.veh.push(v); }
    const bus=F.bus(); consolidate(bus); scene.add(bus); const bv={kind:'bus',bus:true,lane:'B',x:2300,name:'school bus',len:9/K,max:110,speed:0,mesh:bus}; VEH.push(bv); G.veh.push(bv);
  }
}

// ---------- HOME WORLD ----------
function buildHome(scene){
  WW=1500; WH=1150;
  plane(scene,600,600,MAT.grass,X(WW/2),Z(WH/2),-.03).material=(()=>{ const m=MAT.grass.clone(); m.map=MAT.grass.map.clone(); m.map.needsUpdate=true; m.map.repeat.set(150,150); return m; })();
  floorRect(scene,40,40,900,700,MAT.pavers,.004,1.6);
  floorRect(scene,120,100,760,460,MAT.tiles,.008,1.2);
  floorRect(scene,360,100,500,280,MAT.tiles2,.01,.8); floorRect(scene,500,100,760,280,MAT.tiles3,.01,1); floorRect(scene,120,100,360,280,MAT.wood,.01,1.5);
  floorRect(scene,-500,780,2000,980,MAT.asphalt,.005,4); floorRect(scene,-500,712,2000,780,MAT.concrete,.006,3); floorRect(scene,-500,980,2000,1060,MAT.concrete,.006,3);
  ROADS.push({x1:-500,y1:780,x2:2000,y2:980}); ZEBRAS.push({x1:900,y1:780,x2:960,y2:980});
  // markings
  const mk=mkCanvas(1024,256,(c)=>{ c.fillStyle='rgba(255,255,255,.9)'; for(let y=8;y<256;y+=28) c.fillRect(0,y,1024,14); });
  const zeb=new THREE.Mesh(new THREE.PlaneGeometry(X(60),Z(200)),new THREE.MeshStandardMaterial({map:(()=>{ const t=tex(mkCanvas(64,256,(c)=>{ c.fillStyle='rgba(255,255,255,.92)'; for(let y=6;y<256;y+=26) c.fillRect(0,y,64,13); }),1,1); return t; })(),transparent:true,roughness:.7,depthWrite:false}));
  zeb.rotation.x=-Math.PI/2; zeb.position.set(X(930),.012,Z(880)); scene.add(zeb);
  const dash=mkCanvas(512,16,(c)=>{ c.fillStyle='rgba(255,255,255,.85)'; for(let x=0;x<512;x+=64) c.fillRect(x,4,36,8); }); const dm=new THREE.Mesh(new THREE.PlaneGeometry(X(2500),.25),new THREE.MeshStandardMaterial({map:tex(dash,20,1),transparent:true,depthWrite:false})); dm.rotation.x=-Math.PI/2; dm.position.set(X(750),.011,Z(880)); scene.add(dm);
  const yl=new THREE.Mesh(new THREE.PlaneGeometry(X(160),.15),new THREE.MeshBasicMaterial({color:'#f1c40f'})); yl.rotation.x=-Math.PI/2; yl.position.set(X(1150),.013,Z(995)); scene.add(yl);
  // bus stop shelter
  const sh=grp(); sh.add(bx(3.2,.08,1.4,std('#2e86c1',{r:.4,m:.4}),0,2.4,0)); for(const x of [-1.5,1.5]) sh.add(cyl(.05,.05,2.4,std('#888',{m:.8}),x,1.2,.6,8)); sh.add(bx(3,.4,.3,std('#7a5230'),0,.45,.5)); const bs=signBoard('BUS STOP','#2e86c1',.35); bs.position.set(0,2.65,-.6); sh.add(bs); place(scene,sh,1150,1035,Math.PI,[160,30]);
  // compound walls (block, with razor) and gate gap 400..500
  const bw={h:2.4,t:10,mat:MAT.block};
  wall(scene,40,40,900,40,bw); wall(scene,40,40,40,700,bw); wall(scene,900,40,900,700,bw); wall(scene,40,700,900,700,{...bw,gaps:[[400,500]]});
  const gate=grp(); for(let i=0;i<14;i++) gate.add(bx(.04,2,.04,std('#1d1f22',{r:.5,m:.7}),i*.33,1,0)); gate.add(bx(4.5,.08,.08,std('#1d1f22'),2.1,.1,0), bx(4.5,.08,.08,std('#1d1f22'),2.1,1.95,0)); place(scene,gate,505,712,0);
  // house walls (cutaway, low)
  const hw={h:1.35,t:6,mat:MAT.wall3};
  wall(scene,120,100,760,100,hw); wall(scene,120,100,120,460,hw); wall(scene,760,100,760,460,hw);
  wall(scene,120,460,760,460,{...hw,gaps:[[290,350]]}); // front door
  wall(scene,360,100,360,280,{...hw,gaps:[[200,250]]}); wall(scene,500,100,500,280,{...hw,gaps:[[200,250]]});
  wall(scene,120,280,760,280,{...hw,gaps:[[200,250],[395,445],[600,650]]}); wall(scene,560,280,560,460,{...hw,gaps:[[350,400]]});
  // roof hint: porch slab
  scene.add(bx(X(120),.12,Z(70),std('#8a8580'),X(320),2.6,Z(495))); for(const x of [270,370]) scene.add(cyl(.08,.08,2.6,MAT.cope,X(x),1.3,Z(525),10));
  // furniture
  place(scene,F.bed(),190,160,0,[80,110]); place(scene,F.wardrobe(),330,120,Math.PI,[60,30]); place(scene,F.desk(),300,250,0,[56,30]);
  place(scene,F.toilet(),470,130,Math.PI,[20,30]); place(scene,F.sink(),390,125,Math.PI,[30,22]); place(scene,F.bucket(),470,215,0,[18,18]);
  place(scene,F.counter(),630,118,Math.PI,[150,34]); place(scene,F.cooker(),720,160,-Math.PI/2,[32,32]); place(scene,F.fridge(),530,125,Math.PI,[36,36]); place(scene,F.gas(),735,215,0,[18,18]);
  place(scene,F.sofa(),250,430,Math.PI,[110,46]); place(scene,F.tv(),330,300,0,[80,24]); place(scene,F.table(),420,380,0,[80,46]);
  const curt=bx(.05,1.2,1.2,std('#c0392b',{r:.9}),0,.75,0); const cg=grp(); cg.add(curt); const cnd=cyl(.03,.03,.15,std('#fff'),.25,.45,0,8); const fl=sprite('🔥',.22); fl.position.set(.25,.62,0); cg.add(cnd,fl); place(scene,cg,128,370,0);
  place(scene,F.shelf(),700,300,Math.PI,[60,22]); const pills=grp(); pills.add(F.table()); for(let i=0;i<5;i++) pills.add(sph(.025,std(['#e74c3c','#f1c40f','#3498db'][i%3]),rnd(-.3,.3),.8,rnd(-.2,.2),8)); place(scene,pills,660,380,0,[80,46]);
  // compound
  place(scene,F.generator(),845,330,0,[50,30]); place(scene,F.well(),200,600,0,[80,80]); place(scene,F.car('#2e4053'),690,600,Math.PI/2,[100,46]);
  for(const [x,z] of [[80,640],[860,80],[80,80]]) place(scene,F.tree(),x,z,0,[20,20]);
  for(let x=-300;x<1900;x+=260) place(scene,F.palm(),x,1100,0).userData.decor=true;
  // NPCs
  G_NPC.push({look:{sex:'m',skin:'#3d2416',top:'#5d6d7e',bottom:'#2a2f3a',longSleeve:true,beard:true,label:'Stranger'},x:450,y:745,face:0});
  G_NPC.push({look:{sex:'f',skin:'#3b2416',top:'#f2f2f2',bottom:'#1f2a40',vest:true,vestColor:'#ff7a00',hat:'cap',hatColor:'#ffffff',label:'Crossing guard',longSleeve:true},x:880,y:770,face:Math.PI/2,lolly:true});
  G_NPC.push({look:{sex:'m',skin:'#5a3825',top:'#e67e22',bottom:'#2a2f3a',height:.62,label:'Brother'},x:200,y:330,face:Math.PI});
  G_NPC.push({look:{sex:'m',skin:'#4a2e1e',top:'#1f4e8c',bottom:'#1f2a40',longSleeve:true,beard:true,label:'Daddy'},x:850,y:450,face:Math.PI});
  // houses across the street
  for(let i=0;i<7;i++){ const w=rnd(10,15),h=rnd(4,8); const m=std(['#e8d9b8','#d7e3e8','#f0e0d0'][i%3],{r:.92}); m.map=tex(TX.plaster,w/4,h/4); scene.add(bx(w,h,9,m,-10+i*17,h/2,Z(1060)+12)); }
}
// ---------- SCHOOL WORLD ----------
function buildSchool(scene){
  WW=1500; WH=1250;
  const gm=MAT.grass.clone(); gm.map=MAT.grass.map.clone(); gm.map.needsUpdate=true; gm.map.repeat.set(150,150); plane(scene,600,600,gm,X(WW/2),Z(WH/2),-.03);
  floorRect(scene,40,40,1460,1060,MAT.grass,.003,3);
  floorRect(scene,550,600,950,900,MAT.concrete,.006,3); floorRect(scene,700,900,800,1060,MAT.concrete,.006,3); floorRect(scene,80,430,950,470,MAT.concrete,.006,3); floorRect(scene,950,380,1460,420,MAT.concrete,.006,3);
  floorRect(scene,980,860,1440,1040,MAT.asphalt,.006,4); floorRect(scene,-500,1080,2000,1240,MAT.asphalt,.005,4);
  floorRect(scene,100,100,520,400,MAT.tiles,.008,1.2); floorRect(scene,1000,100,1300,330,MAT.tiles2,.008,1); floorRect(scene,1320,100,1440,330,MAT.tiles2,.008,.8); floorRect(scene,1000,500,1300,660,MAT.tiles3,.008,1.2); floorRect(scene,1100,760,1300,900,MAT.tiles2,.008,1);
  // assembly circle + line on bus park
  const ac=new THREE.Mesh(new THREE.RingGeometry(X(60),X(70),40),new THREE.MeshBasicMaterial({color:'#27ae60'})); ac.rotation.x=-Math.PI/2; ac.position.set(X(750),.012,Z(760)); scene.add(ac);
  const acs=signBoard('FIRE ASSEMBLY POINT','#14853d',.4); acs.position.set(X(750),2.6,Z(690)); scene.add(acs); scene.add(cyl(.05,.05,2.4,std('#888',{m:.8}),X(750),1.2,Z(688),8));
  const yl=new THREE.Mesh(new THREE.PlaneGeometry(X(400),.15),new THREE.MeshBasicMaterial({color:'#f1c40f'})); yl.rotation.x=-Math.PI/2; yl.position.set(X(1220),.013,Z(905)); scene.add(yl);
  // fence & gate
  const bw={h:2.2,t:10,mat:MAT.block};
  wall(scene,40,40,1460,40,bw); wall(scene,40,40,40,1060,bw); wall(scene,1460,40,1460,1060,bw); wall(scene,40,1060,1460,1060,{...bw,gaps:[[700,800]]});
  const gs=signBoard('BRIGHT FUTURE SCHOOL','#7a1f2b',.55); gs.position.set(X(600),2.6,Z(1066)); scene.add(gs);
  // gatehouse
  const gh=grp(); gh.add(bx(2.5,2.6,2.5,MAT.wall2,0,1.3,0), bx(2.8,.15,2.8,std('#8a8580'),0,2.65,0)); place(scene,gh,880,990,0,[50,50]);
  // classroom block (cutaway)
  const cw={h:1.4,t:6,mat:MAT.wall};
  wall(scene,100,100,520,100,cw); wall(scene,100,100,100,400,cw); wall(scene,520,100,520,400,cw); wall(scene,310,100,310,400,cw);
  wall(scene,100,400,520,400,{...cw,gaps:[[180,230],[390,440]]});
  for(const cx of [205,415]){ place(scene,F.blackboard(),cx,108,0); for(let r=0;r<3;r++) for(let c=0;c<3;c++){ place(scene,F.desk(),cx-60+c*60,170+r*55,0,[40,22]); place(scene,F.chair(),cx-60+c*60,188+r*55,0); } }
  // lab, toilets, sick bay (cutaway)
  wall(scene,1000,100,1300,100,cw); wall(scene,1000,100,1000,330,cw); wall(scene,1300,100,1300,330,cw); wall(scene,1000,330,1300,330,{...cw,gaps:[[1125,1175]]});
  place(scene,F.bench(),1080,180,0,[100,36]); place(scene,F.bench(),1220,180,0,[100,36]); const ls=signBoard('SCIENCE LAB','#12355b',.35); ls.position.set(X(1150),1.8,Z(334)); scene.add(ls);
  wall(scene,1320,100,1440,100,cw); wall(scene,1320,100,1320,330,cw); wall(scene,1440,100,1440,330,cw); wall(scene,1320,330,1440,330,{...cw,gaps:[[1355,1405]]});
  place(scene,F.cubicle(),1350,140,0); place(scene,F.cubicle(),1410,140,0); place(scene,F.sink(),1380,290,0,[30,22]); const ts=signBoard('TOILETS','#12355b',.3); ts.position.set(X(1380),1.8,Z(334)); scene.add(ts);
  wall(scene,1100,760,1300,760,{...cw,gaps:[[1180,1230]]}); wall(scene,1100,760,1100,900,cw); wall(scene,1300,760,1300,900,cw); wall(scene,1100,900,1300,900,cw);
  place(scene,F.bed2(),1150,840,0,[46,96]); place(scene,F.bed2(),1250,840,0,[46,96]); const sb=signBoard('SICK BAY','#c0392b',.3); sb.position.set(X(1205),1.8,Z(756)); scene.add(sb);
  // canteen (open-sided, roof on posts)
  scene.add(bx(X(300),.12,Z(160),std('#9da2a6',{r:.4,m:.6}),X(1150),3,Z(580))); for(const [x,y] of [[1005,505],[1295,505],[1005,655],[1295,655]]){ scene.add(cyl(.08,.08,3,MAT.cope,X(x),1.5,Z(y),10)); SOLIDS.push({x:x-6,y:y-6,w:12,h:12}); }
  place(scene,F.canteenTable(),1080,580,0,[80,60]); place(scene,F.canteenTable(),1220,580,0,[80,60]); place(scene,F.counter(),1150,515,Math.PI,[150,34]);
  // playground
  place(scene,F.swing(),300,700,0,[130,40]); place(scene,F.slide(),180,870,0,[40,90]); place(scene,F.seesaw(),400,880,0,[150,20]);
  place(scene,F.flag(),750,640,0,[10,10]);
  // bus park: school bus
  const bus=F.bus(); place(scene,bus,1250,990,Math.PI/2,[190,52]);
  // trees
  for(const [x,y] of [[80,1000],[1440,560],[560,560],[960,820],[80,560]]) place(scene,F.tree(),x,y,0,[20,20]);
  for(let x=-300;x<1900;x+=260) place(scene,F.palm(),x,1230,0).userData.decor=true;
  // NPCs
  G_NPC.push({look:{sex:'m',skin:'#3b2416',top:'#2b3f66',bottom:'#1f2a40',hat:'cap',hatColor:'#1b2538',longSleeve:true,beard:true,label:'Gatekeeper'},x:840,y:1030,face:Math.PI});
  G_NPC.push({look:{sex:'m',skin:'#5a3825',top:'#555',bottom:'#222',longSleeve:true,label:'Stranger'},x:700,y:1130,face:0});
  G_NPC.push({look:{sex:'m',skin:'#3b2416',top:'#fff',bottom:'#1f4e8c',height:.75,label:'Big pupil'},x:600,y:230,face:-Math.PI/2});
  G_NPC.push({look:{sex:'m',skin:'#7b4a2e',top:'#fff',bottom:'#1f4e8c',height:.6,label:'Small pupil'},x:565,y:235,face:Math.PI/2});
  G_NPC.push({look:{sex:'f',skin:'#5a3825',top:'#ffffff',bottom:'#ffffff',dress:true,outfit:'dress',hair:'bun',label:'Nurse'},x:1200,y:800,face:0});
  G_NPC.push({look:{sex:'f',skin:'#4a2e1e',top:'#f6f6f2',bottom:'#2b2b2b',hat:'chef',longSleeve:true,label:'Canteen staff'},x:1150,y:540,face:Math.PI});
}
const G_NPC=[];
function spawnNPCs(){ G.npcs=G_NPC.map(n=>{ const g=makeHuman(n.look); g.position.set(X(n.x),0,Z(n.y)); g.rotation.y=n.face; if(n.lolly){ const lp=grp(); lp.add(cyl(.02,.02,1.4,std('#ddd',{m:.8}),0,.7,0,6)); const disc=new THREE.Mesh(new THREE.CircleGeometry(.25,20),std('#fff',{side:THREE.DoubleSide,map:tex(mkCanvas(64,64,(c)=>{ c.fillStyle='#c0392b'; c.beginPath(); c.arc(32,32,31,0,7); c.fill(); c.fillStyle='#fff'; c.font='bold 16px system-ui'; c.textAlign='center'; c.fillText('STOP',32,38); }))})); disc.position.y=1.5; lp.add(disc); lp.position.set(.3,0,-.1); g.add(lp); } G.scene.add(g); return {g,n}; }); }

// ================== RENDER ==================
function render3D(dt){
  const {scene,camera}=G, t=S.t, p=S.p, P=new THREE.Vector3(X(p.x),0,Z(p.y));
  G.sun.position.set(P.x+16,38,P.z+10); G.sun.target.position.copy(P);
  const pl=G.player; pl.position.copy(P); pl.rotation.y=p.face; animHuman(pl,p.step,p.moving&&!paused,t); pl.visible=!firstPerson && S.phase!=='ride';
  if(S.phase==='ride'){ const v=VEH.find(v=>v.bus); const bp=new THREE.Vector3(X(v.x),0,Z(LANES.B.y)); camera.position.set(bp.x+3,4,bp.z+9); camera.lookAt(bp.x,1.5,bp.z); }
  else if(firstPerson){ camera.position.set(P.x,1.15+(p.moving?Math.sin(p.step*2)*.03:0),P.z); camera.rotation.set(-(pitch-.42),yaw,0); }
  else { const d=4.6, el=.1+pitch; camera.position.set(P.x+Math.sin(yaw)*d*Math.cos(el),1.0+d*Math.sin(el),P.z+Math.cos(yaw)*d*Math.cos(el)); camera.lookAt(P.x-Math.sin(yaw)*1,1.0,P.z-Math.cos(yaw)*1); }
  if(G.shake>0){ G.shake-=dt; camera.position.x+=(Math.random()-.5)*.2; camera.position.y+=(Math.random()-.5)*.2; }
  G.markers.forEach(({m,ring,s})=>{ const on=missionActive(m); ring.visible=on; s.visible=on; s.position.y=2.1+Math.sin(t*3)*.1; ring.material.opacity=.45+Math.sin(t*4)*.25; });
  G.items.forEach(({it,g,glint,tag})=>{ const dd=dist(p.x,p.y,it.x,it.y); tag.visible=it.done==='tag'; glint.visible=!it.done&&dd<260; glint.material.opacity=.5+.5*Math.sin(t*5); g.userData.badge.visible=!it.done&&dd<70; });
  G.npcs.forEach(({g,n})=>{ const dd=dist(p.x,p.y,n.x,n.y); if(dd<220){ const tg=Math.atan2(-(p.x-n.x),-(p.y-n.y)); g.rotation.y+=((((tg-g.rotation.y)+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*3); } animHuman(g,0,false,t+n.x); if(g.userData.label) g.userData.label.visible=dd<200; });
  for(const v of G.veh){ v.mesh.position.set(X(v.x),0,Z(LANES[v.lane].y)); v.mesh.rotation.y = LANES[v.lane].dir>0? -Math.PI/2 : Math.PI/2; }
  const gd=S.guide, gOn=guideOn&&gd&&gd.path&&gd.target&&!S.over&&S.phase==='play';
  if(gOn){ const pth=gd.path; let n=0,acc=0,nextAt=34; const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(), up=new THREE.Vector3(0,1,0);
    for(let i=1;i<pth.length&&n<60;i++){ const [x0,y0]=pth[i-1],[x1,y1]=pth[i], L=dist(x0,y0,x1,y1); while(acc+L>=nextAt&&n<60){ const f=(nextAt-acc)/L, x=x0+(x1-x0)*f, y=y0+(y1-y0)*f; q.setFromAxisAngle(up,Math.atan2(-(x1-x0),-(y1-y0))); const pu=.75+.35*Math.max(0,Math.sin(t*6-n*.5)); ps.set(X(x),.04,Z(y)); sc.set(pu,1,pu); m4.compose(ps,q,sc); G.arrows.setMatrixAt(n++,m4); nextAt+=30; } acc+=L; }
    G.arrows.count=n; G.arrows.instanceMatrix.needsUpdate=true; } else G.arrows.count=0;
  const e=S.escort; G.escort.visible=guideOn&&S.phase==='play'; G.escort.position.set(X(e.x),0,Z(e.y)); G.escort.rotation.y=e.face; animHuman(G.escort,e.step,e.moving,t);
  if(G.smoke.length){ const on=!!(S.drill&&!S.drill.done); G.smoke.forEach(s=>{ s.visible=on; if(on){ const u=s.userData, r=u.r*S.drill.smokeR; s.position.set(X(1150+Math.cos(u.a)*r),1+u.h*3,Z(240+Math.sin(u.a)*r)); const sz=3+S.drill.smokeR*K*.25; s.scale.set(sz,sz,1);} }); }
  G.renderer.render(scene,camera);
}
function renderIntro(t){ const c=G.camera, a=t*.05, cx=X(WW/2), cz=Z(WH/2); c.position.set(cx+Math.sin(a)*45,26,cz+Math.cos(a)*38); c.lookAt(cx,0,cz); G.sun.position.set(cx+30,60,cz+20); G.sun.target.position.set(cx,0,cz); if(G.player) G.player.visible=false; G.renderer.render(G.scene,c); }
function drawHUD(){
  $('hearts').textContent='❤️'.repeat(S.hearts)+'🤍'.repeat(3-S.hearts); $('stars').textContent='⭐ '+S.stars;
  $('prog').textContent='✅ '+MISS.filter(m=>m.id in S.results).length+'/'+MISS.length+'  🔎 '+S.hazFound+'/'+S.hazTotal;
  const m=$('mini'), c=m.getContext('2d'), sx=m.width/WW, sy=m.height/WH; c.fillStyle='#9bbf7a'; c.fillRect(0,0,m.width,m.height);
  ROADS.forEach(r=>{ c.fillStyle='#555'; c.fillRect(r.x1*sx,r.y1*sy,(r.x2-r.x1)*sx,(r.y2-r.y1)*sy); }); c.fillStyle='#8a7f72'; SOLIDS.forEach(b=>c.fillRect(b.x*sx,b.y*sy,Math.max(1,b.w*sx),Math.max(1,b.h*sy)));
  MISS.forEach(mm=>{ if(!mm.r||!missionActive(mm)) return; c.fillStyle='#e0b800'; c.fillRect(mm.x*sx-2,mm.y*sy-2,4,4); });
  if(S.guide&&S.guide.path&&guideOn){ c.strokeStyle='#0f7a4f'; c.lineWidth=2; c.setLineDash([3,2]); c.beginPath(); S.guide.path.forEach(([x,y],i)=>i?c.lineTo(x*sx,y*sy):c.moveTo(x*sx,y*sy)); c.stroke(); c.setLineDash([]); }
  c.fillStyle='#e00'; c.beginPath(); c.arc(S.p.x*sx,S.p.y*sy,3.5,0,7); c.fill();
  const gp=$('guidePanel'), T=S.guide&&S.guide.target;
  if(guideOn&&T&&S.guide.path&&started&&!S.over&&$('prompt').classList.contains('hidden')&&S.phase==='play'){ gp.classList.remove('hidden'); const pth=S.guide.path, nx=pth[Math.min(3,pth.length-1)], dx=nx[0]-S.p.x, dy=nx[1]-S.p.y, fx=-Math.sin(yaw), fy=-Math.cos(yaw); $('gArrow').style.transform=`rotate(${Math.atan2(fx*dy-fy*dx,fx*dx+fy*dy)}rad)`; $('gText').textContent=`Next: ${T.name} · ${Math.max(1,Math.round(pathLen(pth)*K))} m`; } else gp.classList.add('hidden');
  // hazard hint: warmer/colder for remaining dangers
  const left=S.items.filter(i=>i.h&&!i.done); const doneQ=MISS.filter(m=>m.id in S.results).length; if(left.length && (WORLD==='home'? doneQ>=5 && !('gate' in S.results) : MISS.filter(m=>m.q).every(m=>m.id in S.results))){ const dmin=Math.min(...left.map(i=>dist(S.p.x,S.p.y,i.x,i.y))); $('hint2').classList.remove('hidden'); $('hint2').textContent= dmin<120?'🔥 Hot! A danger is very close':dmin<300?'🌡️ Warm, keep looking':'❄️ Cold, look somewhere else'; } else $('hint2').classList.add('hidden');
}

// ================== LOOP & INPUT ==================
let last=performance.now(), hudT=0;
function loop(now){ const dt=Math.min(.05,(now-last)/1000); last=now; if(G&&S){ if(!started) renderIntro(now/1000); else { if(!paused) SL.fps.tick(dt); if(!paused&&!S.over) update(dt); render3D(dt); hudT+=dt; if(hudT>.12){ hudT=0; drawHUD(); } } } requestAnimationFrame(loop); }
addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'||paused) return; keys[e.code]=true; if(e.code==='KeyE'||e.code==='Space'||e.code==='Enter'){ e.preventDefault(); doAct(); } if(e.code==='KeyV') firstPerson=!firstPerson; if(e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup',e=>{ keys[e.code]=false; });
function bindInput(){ const cv=$('game');
  cv.addEventListener('pointerdown',e=>{ ensureAudio(); if(paused||!started) return; cv.setPointerCapture(e.pointerId); if(e.pointerType!=='mouse'&&e.clientX<innerWidth*.5&&!joy){ joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0}; const j=$('joy'); j.style.left=e.clientX+'px'; j.style.top=e.clientY+'px'; j.classList.remove('hidden'); j.firstElementChild.style.transform=''; } else if(!look) look={id:e.pointerId,x:e.clientX,y:e.clientY}; });
  cv.addEventListener('pointermove',e=>{ if(joy&&e.pointerId===joy.id){ let dx=e.clientX-joy.ox, dy=e.clientY-joy.oy; const l=Math.hypot(dx,dy), m=50; if(l>m){dx=dx/l*m; dy=dy/l*m;} joy.dx=dx/m; joy.dy=dy/m; $('joy').firstElementChild.style.transform=`translate(${dx}px,${dy}px)`; } else if(look&&e.pointerId===look.id){ yaw-=(e.clientX-look.x)*.006; pitch=clamp(pitch+(e.clientY-look.y)*.004,.12,1.1); look.x=e.clientX; look.y=e.clientY; } });
  const end=e=>{ if(joy&&e.pointerId===joy.id){ joy=null; $('joy').classList.add('hidden'); } if(look&&e.pointerId===look.id) look=null; }; cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
  $('act').onclick=doAct; $('camBtn').onclick=()=>{ if(!paused) firstPerson=!firstPerson; };
  $('guideBtn').onclick=()=>{ guideOn=!guideOn; $('guideBtn').textContent='🧭 Guide: '+(guideOn?'ON':'OFF'); };
  const vb=()=>{ $('voiceBtn').textContent=SL.settings.voice?'🗣️ Voice: ON':'🗣️ Voice: OFF'; }; vb();
  $('voiceBtn').onclick=()=>{ SL.settings.voice=!SL.settings.voice; SL.store.set('settings',SL.settings); vb(); if(!SL.settings.voice) SL.stopSpeak(); };
  $('setBtn').onclick=()=>{ if(!paused) openSettings(); };
  $('muteBtn').onclick=()=>{ muted=!muted; $('muteBtn').textContent=muted?'🔇':'🔊'; };
  $('tasksBtn').onclick=()=>{ if(paused) return; const m=openModal(`<h2>📋 My jobs</h2><ul class="tasks">${MISS.map(mm=>{ const r=S.results[mm.id]; return `<li><span>${r===true?'✅':r===false?'⚠️':'⬜'}</span><span>${esc(mm.hint||mm.name)}</span></li>`; }).join('')}<li><span>🔎</span><span>Find ${S.hazTotal} hidden dangers (tap LOOK when you see a ❓)</span></li></ul><button class="primary" id="cl">Close</button>`); m.querySelector('#cl').onclick=closeModal; };
}
function setHud(on){ ['hud','act','camBtn','guideBtn','voiceBtn','muteBtn','setBtn','tasksBtn'].forEach(id=>$(id).classList.toggle('hidden',!on)); if(!on){ $('prompt').classList.add('hidden'); $('guidePanel').classList.add('hidden'); $('hint2').classList.add('hidden'); } }

// ================== START ==================
function showStart(){
  setHud(false); started=false; newGame(); if(G) resetDynamic(); paused=true;
  const m=openModal(`<div class="row" style="justify-content:space-between"><a class="btnlink" href="index.html">◀ All games</a><span class="pill">For children 6–12</span></div>
    <h1 style="margin:.4em 0 .1em">${DATA.icon} ${esc(DATA.title)}</h1><p class="muted">${esc(DATA.intro)}</p>
    <p><b>Your name</b></p><input id="nm" maxlength="24" placeholder="e.g. Ada" value="${esc(kid.name)}">
    <p><b>I am a</b></p><div class="row"><button data-x="f" class="${kid.sex==='f'?'primary':''}">👧🏾 Girl</button><button data-x="m" class="${kid.sex==='m'?'primary':''}">👦🏾 Boy</button></div>
    <p class="muted" style="margin:.6em 0 .3em">Uniform colour and skin tone</p>
    <div class="row">${UNIS.map(c=>`<button class="sw ${c===kid.uni?'on':''}" data-u="${c}" style="background:${c}"></button>`).join('')}</div>
    <div class="row" style="margin-top:6px">${SKINS.map(c=>`<button class="sw ${c===kid.skin?'on':''}" data-s="${c}" style="background:${c}"></button>`).join('')}</div>
    ${SL.consent.html(true)}
    <div class="row" style="margin-top:14px"><button class="primary big2" id="start">Let's go! ▶</button><button id="stSet">⚙️ Language &amp; settings</button></div>
    <p class="muted" style="font-size:.85rem;margin-top:10px">🎮 Drag the left side of the screen to walk, drag the right side to look. Questions pop up when you reach a yellow ring. Tap LOOK when you see a ❓. 🗣️ Questions are read aloud.</p>`);
  m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ kid.sex=b.dataset.x; m.querySelectorAll('[data-x]').forEach(x=>x.classList.toggle('primary',x===b)); });
  m.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{ kid.uni=b.dataset.u; m.querySelectorAll('[data-u]').forEach(x=>x.classList.toggle('on',x===b)); });
  m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ kid.skin=b.dataset.s; m.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',x===b)); });
  SL.consent.bind(m,null); m.querySelector('#stSet').onclick=()=>openSettings(showStart);
  m.querySelector('#start').onclick=()=>{ if(!SL.consent.ok()){ const c=m.querySelector('.consent'); c.style.outline='3px solid var(--bad)'; c.scrollIntoView({block:'center'}); toast(tr('Please ask a parent or teacher to tick the privacy box.'),'bad'); return; } ensureAudio(); kid.name=(m.querySelector('#nm').value.trim()||'Safety Star').slice(0,24); resetDynamic(); started=true; closeModal(); setHud(true);
    toast(WORLD==='home'?'☀️ Good morning, '+kid.name+'! Follow Mummy and the yellow arrows.':'🏫 Welcome to school, '+kid.name+'! Follow your teacher and the yellow arrows.'); speak(DATA.intro); };
}
window.addEventListener('load',()=>{
  if(!window.THREE){ $('loading').innerHTML='Could not load the 3D engine. Please check your internet connection.'; return; }
  try{ newGame(); initScene(); spawnNPCs(); }catch(err){ $('loading').textContent='Your device could not start 3D.'; console.error(err); return; }
  $('loading').remove(); document.title=DATA.title; bindInput(); showStart(); requestAnimationFrame(loop);
});
