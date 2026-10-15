// ================== KIDS GAME (home→bus, school, market, water, online) ==================
const PARAMS = new URLSearchParams(location.search);
const KID_WORLDS=['home','school','market','water','online'];
const WORLD = KID_WORLDS.includes(PARAMS.get('world')) ? PARAMS.get('world') : 'home';
const cleanClass = v => String(v||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,20);
let kidClass = cleanClass(PARAMS.get('class')); const CLASS_FROM_URL = kidClass;
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
const lastMission = id => () => MISS.every(m => m.id===id || m.id in S.results);   // final mission: active once all others are done
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
},
...EXTRA_DATA()}[WORLD];

// ================== EXTRA WORLDS: DATA (market, water, online) ==================
// Called inside the DATA literal above, so it may only use things defined before DATA (lastMission).
function EXTRA_DATA(){ return {
market: {
  title:'Market & Road Safety', icon:'🛒🛺', start:{x:110,y:640,face:0}, final:'keke', midHint:'gutter', extraStars:1,
  guideName:'👩🏾 Mummy', welcome:n=>'🛒 Market day, '+n+'! Stay close to Mummy and follow the yellow arrows.',
  outroMsg:'🛺 Hands inside, hold on! Off home with Mummy.',
  intro:'Mummy is taking you to the big market. Stay close to her, answer the questions, find the hidden dangers, then cross the road and go home in a keke.',
  escort:{label:'Mummy · follow me', look:{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:'g1',topMap:'a1',shoe:'#5a1d1d'}},
  missions:[
    {id:'hand', name:'Busy market', x:230,y:460,r:60, q:{e:'🤝',who:'Mummy',text:'The market is very crowded today. Mummy says: "Hold my hand." What do you do?',
      o:[{t:'Let go and run to look at the toys',ok:false,heart:true,why:'In a crowd you can get lost in one second. Stay close to Mummy.'},{t:'Hold Mummy\'s hand and stay close to her',ok:true,why:'Correct! In a crowd, always hold an adult\'s hand.'}]}},
    {id:'sweets', name:'Sweet seller', x:560,y:460,r:60, q:{e:'🍬',who:'A man you do not know',text:'"Hello! Take this sweet. It is free. Come, I have more for you."',
      o:[{t:'Take it and eat it quickly',ok:false,heart:true,why:'Never eat food or sweets from strangers. It can make you sick, or it can be a trick.'},{t:'Say "No, thank you" and stay with Mummy',ok:true,why:'Well done! Only eat food that Mummy or Daddy gives you.'}]}},
    {id:'lost', name:'Lost in the market', x:900,y:245,r:60, q:{e:'😟',who:'Oh no! Where is Mummy?',text:'You stopped to look at shoes. Now you cannot see Mummy anywhere. What do you do?',
      o:[{t:'Walk around everywhere to look for her',ok:false,heart:true,why:'If you walk around, you get more lost. Mummy will come back to where she last saw you.'},{t:'Go with anybody who says they know Mummy',ok:false,heart:true,why:'Never go with someone you do not know, even if they say they know Mummy.'},{t:'Stay where I am. If she does not come, go to a market woman at her stall or a security man in uniform',ok:true,why:'Correct! Stay where you are, or ask a market woman or a security man in uniform for help.'}]}},
    {id:'security', name:'Security post', x:1250,y:245,r:60, q:{e:'👮🏾',who:'Market security',text:'"Do not worry, I will help you find Mummy. Do you know her phone number?"',
      o:[{t:'No. It is inside Mummy\'s phone',ok:false,why:'Learn Mummy\'s or Daddy\'s phone number by heart. Practise saying it at home every day.'},{t:'Yes! I know Mummy\'s number by heart',ok:true,why:'Excellent! Security can call Mummy quickly. Keep practising your parents\' number at home.'}]}},
    {id:'gutter', name:'Big gutter', x:1250,y:650,r:60, q:{e:'🕳️',who:'Big open gutter',text:'It rained this morning. The big gutter is full of fast, dirty water. Your slipper fell inside. What do you do?',
      o:[{t:'Climb into the gutter to get it',ok:false,heart:true,why:'Gutter water is fast and dirty. Children can fall, get sick, or be carried away.'},{t:'Stay away from the edge and tell Mummy. A slipper can be replaced',ok:true,why:'Correct! Stay far from open gutters, especially after rain.'}]}},
    {id:'kerb', name:'Roadside', x:730,y:730,r:50, q:{e:'🦓',who:'Mummy at the road',text:'We need to cross the road to the motor park. How do we cross?',
      o:[{t:'Run across between the cars',ok:false,heart:true,why:'Running across between cars is very dangerous. Drivers cannot stop fast.'},{t:'Hold Mummy\'s hand, use the zebra, look left, right, left again',ok:true,why:'Well done! Cross at the zebra, with an adult, after looking both ways.'}]}},
    {id:'zebra', name:'Cross at the zebra', x:730,y:850,r:0, hint:'Cross the road on the zebra crossing with Mummy'},
    {id:'okada', name:'Okada', x:900,y:1015,r:55, q:{e:'🏍️',who:'Okada rider',text:'"Small one, come! I will carry you and Mummy on my okada. No helmet. It is very close!"',
      o:[{t:'Jump on, it is faster',ok:false,heart:true,why:'Okada is not safe for children. Many people are hurt in okada crashes, mostly without helmets.'},{t:'Say no. Children should not ride okada. We will take a keke',ok:true,why:'Correct! Children should not ride okada. Nobody should ride without a helmet.'}]}},
    {id:'keke', name:'Keke home', x:1150,y:1085,r:55, when:lastMission('keke'), q:{e:'🛺',who:'Keke driver',text:'Mummy stops a keke to go home. How do you ride?',
      o:[{t:'Stand up and hold the roof so I can see',ok:false,heart:true,why:'Standing in a moving keke is dangerous. You can fall out.'},{t:'Sit at the edge with my arm outside',ok:false,heart:true,why:'Arms and heads outside a keke can be hit by other vehicles.'},{t:'Sit inside next to Mummy, hold on, and keep my hands and head inside',ok:true,why:'Excellent! Sit inside, hold on, hands and head in.'}]}},
  ],
  hazards:[
    {k:'gutter2',e:'🕳️',t:'Open gutter with a broken cover',x:420,y:708,h:1},{k:'genwire',e:'⚡',t:'A stall generator with naked wires',x:620,y:250,h:1},
    {k:'glass',e:'🪟',t:'Broken glass on the ground',x:1020,y:460,h:1},{k:'oil',e:'🍳',t:'A big pot of hot oil where children run',x:560,y:650,h:1},
    {k:'keke3',e:'🛺',t:'A keke with too many people and loads',x:1340,y:1070,h:1},{k:'nail',e:'📌',t:'A bench with a rusty nail sticking out',x:1250,y:460,h:1},
    {k:'ext',e:'🧯',t:'Fire extinguisher at a stall',x:180,y:245,h:0},{k:'bin',e:'🗑️',t:'Covered dustbin',x:950,y:640,h:0},{k:'aid',e:'🩹',t:'First-aid box at the security post',x:1345,y:290,h:0},
  ],
  hazPick:5, decoyPick:2,
},
water: {
  title:'Beach & Pool Safety', icon:'🏖️🏊', start:{x:100,y:490,face:0}, final:'boat', midHint:'drown', extraStars:0,
  guideName:'🧑🏾 Coach Bisi', welcome:n=>'🏊 Welcome to the pool and beach, '+n+'! Follow Coach Bisi and the yellow arrows.',
  outroMsg:'🦺 Life jacket on and buckled. Enjoy the boat ride!',
  intro:'A fun day at the swimming pool and the beach! Visit every yellow ring, answer the questions, find the hidden dangers, then go on a safe boat ride.',
  escort:{label:'Coach Bisi · follow me', look:{sex:'f',skin:'#4a2e1e',top:'#d62828',bottom:'#1f2a40',hair:'braids',hat:'cap',hatColor:'#ffffff'}},
  missions:[
    {id:'buddy', name:'Shallow end', x:150,y:420,r:55, q:{e:'👫',who:'Shallow end',text:'You want to swim, but your friends went to buy snacks. Nobody is watching you. What do you do?',
      o:[{t:'Jump in alone, I will be quick',ok:false,heart:true,why:'Never swim alone. Drowning is fast and quiet. Nobody may see you.'},{t:'Wait. Only swim with a buddy and when a lifeguard or adult is watching',ok:true,why:'Correct! Always swim with a buddy, with an adult watching.'}]}},
    {id:'run', name:'Wet pool deck', x:450,y:500,r:55, q:{e:'🏃',who:'Pool deck',text:'Your friends are racing round the pool. The tiles are wet and shiny.',
      o:[{t:'Race them. I am the fastest!',ok:false,heart:true,why:'Wet tiles are very slippery. You can fall, hit your head, or fall into the pool.'},{t:'Walk slowly. Never run near the pool',ok:true,why:'Well done! Walk, do not run, on wet tiles.'}]}},
    {id:'deep', name:'Deep end', x:780,y:250,r:60, q:{e:'🌊',who:'Deep end',text:'The water here is deeper than Daddy is tall. You are still learning to swim.',
      o:[{t:'Jump in. I can hold the side',ok:false,heart:true,why:'In deep water you can sink fast. Stay where your feet touch the floor.'},{t:'Stay in the shallow end where my feet can touch the floor',ok:true,why:'Correct! Stay in the shallow end until you can swim well.'}]}},
    {id:'drown', name:'Friend in trouble', x:450,y:110,r:60, q:{e:'🆘',who:'Your friend in the water',text:'Your friend is splashing and cannot keep her head up. She is drowning! What do you do?',
      o:[{t:'Jump in and pull her out myself',ok:false,heart:true,why:'You could drown too. A drowning person can pull you under.'},{t:'Shout for the lifeguard or an adult, and throw her a float or ring',ok:true,why:'Correct! Shout for help and throw something that floats. Do not jump in.'}]}},
    {id:'sun', name:'Under the umbrella', x:440,y:730,r:60, q:{e:'☀️',who:'Hot beach sun',text:'The sun is very hot at the beach. You feel thirsty and your head hurts.',
      o:[{t:'Keep playing in the sun. I will drink later',ok:false,why:'Too much sun can make you sick. Drink water before you feel thirsty.'},{t:'Drink clean water, rest in the shade and wear a hat',ok:true,why:'Great! Water, shade and a hat keep you safe in the sun.'}]}},
    {id:'lifeguard', name:'Lifeguard tower', x:800,y:790,r:60, q:{e:'🛟',who:'Lifeguard',text:'"Welcome to the beach! Where is it safe to swim?"',
      o:[{t:'Anywhere I like. The sea is big',ok:false,heart:true,why:'The sea has strong waves and currents. Swim only where a lifeguard can see you.'},{t:'Only between the flags, where the lifeguard is watching',ok:true,why:'Correct! Swim only between the flags, near the lifeguard.'}]}},
    {id:'flag', name:'Red flag', x:1160,y:800,r:60, q:{e:'🚩',who:'Red flag',text:'There is a red flag on the beach today and the waves are big. What does the red flag mean?',
      o:[{t:'The water is extra fun today',ok:false,heart:true,why:'A red flag means danger. The sea is too rough to swim.'},{t:'Red flag means NO swimming. Stay out of the water',ok:true,why:'Correct! Red flag: no swimming at all.'}]}},
    {id:'boat', name:'Boat ride', x:1380,y:810,r:55, when:lastMission('boat'), q:{e:'🦺',who:'Boat man',text:'"We are going on a boat ride!" What must you wear before you get in?',
      o:[{t:'Nothing. I will sit still',ok:false,heart:true,why:'Boats can tip over. A life jacket keeps you floating.'},{t:'A life jacket that fits me, buckled up',ok:true,why:'Excellent! Always wear a life jacket in a boat.'}]}},
  ],
  hazards:[
    {k:'drain',e:'🕳️',t:'Pool drain with no cover',x:330,y:480,h:1},{k:'tile',e:'🧱',t:'Broken, sharp pool tile',x:620,y:480,h:1},
    {k:'nosign',e:'🚫',t:'Deep end with no depth sign',x:740,y:425,h:1},{k:'cable',e:'🔌',t:'Music speaker plugged in next to the water',x:300,y:110,h:1},
    {k:'rip',e:'🌀',t:'Rip current: a calm-looking gap in the waves',x:1010,y:905,h:1},{k:'net',e:'🕸️',t:'Old fishing net with hooks in the sand',x:620,y:860,h:1},
    {k:'ring',e:'🛟',t:'Life ring ready on its stand',x:110,y:250,h:0},{k:'aid',e:'🩹',t:'First-aid box',x:960,y:760,h:0},{k:'shower',e:'🚿',t:'Beach shower',x:260,y:690,h:0},
  ],
  hazPick:5, decoyPick:2,
},
online: {
  title:'Online Safety', icon:'📱💻', start:{x:600,y:560,face:0}, final:'tell', midHint:'photo', extraStars:0,
  guideName:'👨🏾 Daddy', welcome:n=>'📱 Hello '+n+'! Daddy will show you how to stay safe on phones and computers.',
  outroMsg:'🎉 You know how to stay safe online!',
  intro:'Phones, tablets and computers are fun, but some people online are not kind or honest. Visit every yellow ring, read the messages, and find the risky things on the screens.',
  escort:{label:'Daddy · follow me', look:{sex:'m',skin:'#4a2e1e',top:'#1f4e8c',bottom:'#1f2a40',longSleeve:true,beard:true}},
  missions:[
    {id:'coins', name:'Free coins pop-up', x:560,y:250,r:55, q:{e:'🪙',who:'Pop-up on your tablet',text:'A pop-up says you can get free game coins. What do you do?',
      chat:{app:'Game', from:'FREE COINS!!!', msgs:[{t:'🎁 Get 10,000 FREE game coins today!'},{t:'Click the link and type Mummy\'s card number: bit.ly/free-coinz'}]},
      o:[{t:'Click the link and get the coins',ok:false,heart:true,why:'Free-coin links are tricks. They steal money and passwords, or put viruses on the phone.'},{t:'Do not click. Close it and show Mummy or Daddy',ok:true,why:'Correct! If it sounds too good to be true, it is a trick.'}]}},
    {id:'screen', name:'Screen time', x:850,y:250,r:55, q:{e:'⏰',who:'Late at night',text:'It is 10 o\'clock at night. You have been on the phone since after school. Your eyes hurt.',
      o:[{t:'One more hour. I am winning!',ok:false,why:'Too much screen time hurts your eyes and sleep. Sleep helps you learn.'},{t:'Stop, put the phone outside my room, and go to sleep',ok:true,why:'Well done! Keep to the screen time Mummy and Daddy agree with you.'}]}},
    {id:'address', name:'Prize quiz', x:980,y:170,r:55, q:{e:'🏫',who:'A quiz website',text:'A website says: "Win a new phone! Tell us your school name, home address and class."',
      chat:{app:'Browser', from:'win-big-prize.xyz', msgs:[{t:'🎉 Congratulations! You can WIN a new phone!'},{t:'Type your full name, school, class and home address below.'}]},
      o:[{t:'Type it all, I want the prize',ok:false,heart:true,why:'Bad people can use your address and school to find you. Never share them online.'},{t:'Never share my address, school or phone number online. Ask an adult',ok:true,why:'Correct! Keep private things private.'}]}},
    {id:'photo', name:'Photo request', x:330,y:250,r:55, q:{e:'📸',who:'New chat message',text:'Someone you do not know in real life asks for your photo.',
      chat:{app:'Chat', from:'Tolu_12 (online friend)', msgs:[{t:'Hi! I am 12 too 😊 You are so cool.'},{t:'Send me a photo of you in your school uniform. Don\'t tell your mum, it is our secret.'}]},
      o:[{t:'Send a photo, they are 12 too',ok:false,heart:true,why:'People online can lie about who they are. Never send photos to people you do not know.'},{t:'Do not send it. Block them and tell Mummy or Daddy',ok:true,why:'Correct! A grown-up asking for secrets is a big warning sign.'}]}},
    {id:'mean', name:'Mean messages', x:170,y:260,r:55, q:{e:'😢',who:'Class group chat',text:'Someone in your class group chat keeps sending you mean messages.',
      chat:{app:'Chat', from:'Primary 5B group', msgs:[{t:'Nobody likes you 😂😂'},{t:'Don\'t come to school tomorrow'},{me:true,t:'...'}]},
      o:[{t:'Send a meaner message back',ok:false,heart:true,why:'Replying makes it worse. Bullying is never your fault.'},{t:'Do not reply. Keep the messages, block them and tell a trusted adult',ok:true,why:'Brave and wise! Tell a trusted adult. They can help stop it.'}]}},
    {id:'password', name:'Password', x:270,y:500,r:55, q:{e:'🔑',who:'A message from a friend',text:'A friend wants your game password.',
      chat:{app:'Chat', from:'Chidi (classmate)', msgs:[{t:'Send me your game password. I will help you win levels!'},{t:'We are best friends, abi?'}]},
      o:[{t:'Send it. He is my best friend',ok:false,heart:true,why:'Keep passwords secret, even from friends. Friends can fall out, or share it by mistake.'},{t:'Say no. My password is only for me and my parents',ok:true,why:'Correct! Passwords are like your toothbrush: do not share them.'}]}},
    {id:'meet', name:'Meeting an online friend', x:610,y:840,r:55, q:{e:'🤝',who:'Message from Tolu_12',text:'Your online friend wants to meet you in person, alone.',
      chat:{app:'Chat', from:'Tolu_12 (online friend)', msgs:[{t:'Let us meet at the shop near your house today!'},{t:'Come alone. Don\'t tell your parents 🤫'}]},
      o:[{t:'Go quietly. They are my friend',ok:false,heart:true,why:'People online can lie about their age and name. Never meet an online friend without your parents.'},{t:'Do not go. Show the message to Mummy or Daddy',ok:true,why:'Excellent! Never meet online friends alone. Always tell your parents.'}]}},
    {id:'tell', name:'Family talk', x:700,y:580,r:55, when:lastMission('tell'), q:{e:'👩🏾',who:'Mummy',text:'"If something online makes you scared, sad or confused, what will you do?"',
      o:[{t:'Keep it to myself and delete it',ok:false,why:'Hiding it does not help. A trusted adult can help you, and you will not be in trouble.'},{t:'Tell a trusted adult: Mummy, Daddy or my teacher',ok:true,why:'Perfect! You can always tell us. You will not be in trouble.'}]}},
  ],
  hazards:[
    {k:'popup',e:'💻',t:'Laptop: "YOU WON! Click here" pop-up',x:560,y:130,h:1},{k:'friendreq',e:'👤',t:'Friend request from a stranger',x:1010,y:560,h:1},
    {k:'webcam',e:'📹',t:'Video call from an unknown number',x:140,y:450,h:1},{k:'pwnote',e:'🔑',t:'Password written on a note on the computer',x:400,y:600,h:1},
    {k:'charger',e:'🔋',t:'Phone charging under the pillow (it can get very hot)',x:240,y:120,h:1},{k:'location',e:'📍',t:'App asking to share your live location with everyone',x:900,y:720,h:1},
    {k:'mummsg',e:'💬',t:'A message from Mummy',x:520,y:600,h:0},{k:'portal',e:'🏫',t:'Your school\'s real website, opened by Daddy',x:180,y:600,h:0},{k:'controls',e:'🛡️',t:'Tablet with Kids Mode turned on',x:760,y:330,h:0},
  ],
  hazPick:5, decoyPick:2,
}}; }

// ================== STATE ==================
function newGame(){
  const hz=shuffle(DATA.hazards.filter(h=>h.h)).slice(0,DATA.hazPick), dc=shuffle(DATA.hazards.filter(h=>!h.h)).slice(0,DATA.decoyPick);
  S={p:{x:DATA.start.x,y:DATA.start.y,face:DATA.start.face,step:0,moving:false}, hearts:3, stars:0, results:{}, mistakes:[], items:[...hz,...dc].map(h=>({...h,done:null})),
     hazTotal:hz.length, hazFound:0, zt:{}, lastDone:performance.now(), t:0, over:false, phase:'play', bus:{state:'away',x:2300}, drill:null, guide:null, roadWarned:false, lastHit:-9, escort:{x:DATA.start.x+40,y:DATA.start.y+30,face:0,step:0,moving:false}};
  yaw=0; pitch=.42;
}
const MISS = DATA.missions;
const missionActive = m => !(m.id in S.results) && (!m.when || m.when());

function ask(m, onDone){
  const q=m.q; const opts=shuffle(q.o.map((o,i)=>({o,i})));
  const mm=openModal(`<div class="who"><span class="av">${q.e}</span><div><div class="muted" style="font-size:.85rem">${esc(q.who)}</div><h2>${esc(m.name)}</h2></div><button class="spk" id="spk" title="Read aloud">🔊</button></div>
    ${q.chat?chatHtml(q.chat):''}<p class="qt">${esc(q.text)}</p><div class="opts">${opts.map(({o,i})=>`<button data-i="${i}">${esc(o.t)}</button>`).join('')}</div><div id="fb"></div>`);
  speak(tr(q.text)+'. '+opts.map(({o},k)=>tr('Option')+' '+(k+1)+': '+tr(o.t)).join('. '));
  mm.querySelector('#spk').onclick=()=>{ const v=SL.settings.voice; SL.settings.voice=true; speak(q.text); SL.settings.voice=v; };
  mm.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{
    const o=q.o[+b.dataset.i]; mm.querySelectorAll('[data-i]').forEach(x=>x.disabled=true);
    if(o.ok){ S.stars++; chime(); } else { buzz(); S.mistakes.push({where:m.name,why:o.why}); if(o.heart) loseHeart(); }
    mm.querySelector('#fb').innerHTML=`<div class="fb ${o.ok?'':'bad'}">${o.ok?'⭐ ':'❌ '}${esc(o.why)}</div><div style="margin-top:10px"><button class="primary" id="cont">Continue</button></div>`;
    speak(o.why);
    mm.querySelector('#cont').onclick=()=>{ closeModal(); S.results[m.id]=o.ok; stamp(m.id); onDone&&onDone(o); afterMission(m.id); };
  });
}
function loseHeart(){ S.hearts=Math.max(0,S.hearts-1); G.shake=.4; if(S.hearts===0) setTimeout(()=>{ if(!S.over) endGame(false); },400); }
function afterMission(id){
  if(WORLD==='home' && id==='well'){ const left=S.items.filter(i=>i.h&&!i.done).length; if(left) toast('🔎 Before you leave home: '+left+' hidden danger'+(left>1?'s are':' is')+' still in the house or compound! Follow the hot/cold hint.'); }
  if(WORLD==='home' && id==='busstop'){ S.bus.state='arriving'; toast('🚌 The school bus is coming! Wait behind the yellow line.'); }
  if(WORLD==='home' && id==='board'){ startRide(); }
  if(DATA.midHint===id){ const left=S.items.filter(i=>i.h&&!i.done).length; if(left) toast('🔎 '+left+' hidden danger'+(left>1?'s are':' is')+' still waiting to be found! Follow the hot/cold hint.'); }
  if(DATA.final===id) startOutro();
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
  if(gd.said!==T.id){ gd.said=T.id; toast((DATA.guideName||(WORLD==='home'?'👩🏾 Mummy':'👩🏾‍🏫 Teacher'))+': "Follow me to the '+T.name+'."'); }
  const e=S.escort, pth=gd.path; if(!pth) return;
  let acc=0, goal=pth[pth.length-1]; for(let i=1;i<pth.length;i++){ acc+=dist(pth[i-1][0],pth[i-1][1],pth[i][0],pth[i][1]); if(acc>=60){ goal=pth[i]; break; } }
  const dP=dist(e.x,e.y,p.x,p.y), dG=dist(e.x,e.y,goal[0],goal[1]), behind=dist(e.x,e.y,T.x,T.y)>dist(p.x,p.y,T.x,T.y)+30; e.moving=false;
  if(dP>360){ e.x=p.x+(goal[0]-p.x)*.4; e.y=p.y+(goal[1]-p.y)*.4; }
  else if((dP<150||behind)&&dG>12){ const sp=(behind?150:90)*dt, k=Math.min(1,sp/dG), dx=(goal[0]-e.x)*k, dy=(goal[1]-e.y)*k; e.x+=dx; e.y+=dy; e.face=Math.atan2(-dx,-dy); e.step+=dt*9; e.moving=true; }
  else e.face=Math.atan2(-(p.x-e.x),-(p.y-e.y));
}

// ================== VEHICLES (home street) ==================
const LANES={A:{y:835,dir:1},B:{y:930,dir:-1}};
const ROADC={zx:930,mid:880,n:770,s:1000};   // zebra x, road middle, kerb y to push back to (north/south); market overrides
let VEH=[];
function vehiclesUpdate(dt){
  const p=S.p, onZebra=ZEBRAS.some(z=>inRect(p.x,p.y,z)), inRoad=ROADS.some(r=>inRect(p.x,p.y,r));
  for(const v of VEH){
    const L=LANES[v.lane]; let stop=false;
    const zx=ROADC.zx, ahead=(zx-v.x)*L.dir;
    if((onZebra||(inRoad&&Math.abs(p.x-v.x)<260)) && ahead>40 && ahead<260) stop=true;
    for(const o of VEH){ if(o!==v && o.lane===v.lane){ const d=(o.x-v.x)*L.dir; if(d>0&&d<v.len+60) stop=true; } }
    if(v.bus){ if(S.bus.state==='arriving'){ if(v.x<=1150){ v.x=1150; S.bus.state='parked'; toast('🚌 The bus has stopped. Now you can get on.'); beep(500,.2,'sine',.06); } }
      else if(S.bus.state==='parked'||S.bus.state==='away'){ stop=true; } }
    v.speed += ((stop?0:v.max)-v.speed)*Math.min(1,dt*(stop?4:1.5));
    if(!(v.bus&&S.bus.state==='away')) v.x += L.dir*v.speed*dt;
    if(!v.bus){ if(L.dir>0&&v.x>WW+400) v.x=-400; if(L.dir<0&&v.x<-400) v.x=WW+400; }
    if(inRoad && !onZebra && Math.abs(p.y-L.y)<55 && Math.abs(p.x-v.x)<v.len/2+25 && S.t-S.lastHit>2 && v.speed>20){
      S.lastHit=S.t; loseHeart(); buzz(); toast('💥 Beep! A '+v.name+' nearly hit you! Only cross at the zebra.','bad'); S.mistakes.push({where:'Road',why:'You were nearly hit. Stay on the walkway and cross only at the zebra.'}); p.y = p.y<ROADC.mid?ROADC.n:ROADC.s; }
  }
  if(inRoad && !onZebra && !S.roadWarned){ S.roadWarned=true; complete('zebra',false); S.mistakes.push({where:'Road',why:'Never walk on the road. Cross only at the zebra crossing.'}); toast('⚠️ Get off the road! Only cross at the zebra crossing.','bad'); buzz(); speak('Get off the road! Only cross at the zebra crossing.'); }
  if(onZebra && !('zebra' in S.results)){ complete('zebra',true); S.stars++; chime(); toast('⭐ Well done! You crossed at the zebra and the cars stopped.'); }
}
function complete(id,ok){ if(!(id in S.results)){ S.results[id]=ok; stamp(id); } }
function stamp(id){ const m=MISS.find(x=>x.id===id), now=performance.now(); S.zt[m?m.name:id]=Math.round((now-S.lastDone)/100)/10; S.lastDone=now; }

// ================== FINALES ==================
function startRide(){ S.phase='ride'; S.rideT=0; toast('🚌 Off to school! Seatbelt on.'); }
function startDrill(){ if(S.over) return; if(paused){ setTimeout(startDrill,1000); return; }
  S.drill={left:40,done:false,bagDone:false,smokeR:30}; $('alarmv').classList.remove('hidden'); $('timer').classList.remove('hidden');
  const m=openModal(`<h1 style="margin:0">🚨 FIRE DRILL!</h1><p class="qt">The fire alarm is ringing! There is smoke coming from the science lab. Walk quickly to the <b>assembly point</b> in the middle of the school. Do not go back for anything!</p><button class="primary" id="go">GO!</button>`);
  speak('Fire drill! Walk quickly to the assembly point. Do not go back for anything.'); m.querySelector('#go').onclick=closeModal; }
function endGame(win){
  if(S.over) return; S.over=true; paused=true; $('alarmv').classList.add('hidden'); $('timer').classList.add('hidden');
  const total=MISS.filter(m=>m.q).length + S.hazTotal + DATA.decoyPick + (DATA.extraStars??1);
  const level = !win? '' : S.stars>=total-2 ? 'GOLD' : S.stars>=total-6 ? 'SILVER' : 'BRONZE';
  const txt=`${DATA.title.toUpperCase()} – SAFETY STAR\nName: ${kid.name}\n${kidClass?'Class: '+kidClass+'\n':''}Result: ${win?level+' ⭐ '+S.stars+' stars':'Try again'}\nDangers found: ${S.hazFound}/${S.hazTotal}\nDate: ${new Date().toLocaleString()}`;
  win?chime():buzz();
  SL.post({game:WORLD,name:kid.name,role:'Pupil',result:win?level:'TRY AGAIN',hazards:S.hazFound+'/'+S.hazTotal,mistakes:S.mistakes.length,where:[...new Set(S.mistakes.map(x=>x.where))],stars:S.stars,date:new Date().toLocaleString(),...(kidClass?{class:kidClass}:{}),zoneTimes:S.zt,missed:S.items.filter(i=>i.h&&i.done!=='tag').map(i=>i.t),lang:SL.lang,score:win?100:0},
    r=>{ const link=win&&SL.certLink(r&&r.id), row=$('kidEndRow'); if(link&&row) row.insertAdjacentHTML('beforeend',`<a class="btnlink" target="_blank" rel="noopener" href="${link}">🖨️ Print certificate</a>`); });
  const m=openModal(`<h1 style="margin:.1em 0">${win?'🎉 You did it!':'😮 Oops! Let\'s try again'}</h1>
    ${win?`<div class="cert"><div class="big">🏅 ${level} SAFETY STAR</div><div class="muted">${esc(DATA.title)}</div><div class="nm">${esc(kid.name)}</div>${kidClass?`<div class="muted">Class: ${esc(kidClass)}</div>`:''}<div>⭐ ${S.stars} stars · 🔎 ${S.hazFound}/${S.hazTotal} dangers found · ❤️ ${S.hearts} hearts left</div><div class="muted">${new Date().toLocaleDateString()}</div></div>`
          :`<p class="qt">You ran out of hearts. Every mistake is a chance to learn!</p>`}
    <h2 style="margin-top:12px">What we learned</h2>
    ${S.mistakes.length?`<ul>${S.mistakes.map(x=>`<li><b>${esc(x.where)}:</b> ${esc(x.why)}</li>`).join('')}</ul>`:'<p>Perfect! No mistakes at all. 🌟</p>'}
    <div class="row" id="kidEndRow" style="margin-top:12px"><button class="primary" id="again">${win?'Play again':'Try again'}</button><a class="btnlink wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">💬 Send to Mummy/Daddy</a><a class="btnlink" href="index.html">◀ All games</a></div>`);
  speak(win? 'Well done '+kid.name+'! You are a '+level+' safety star!' : 'Oops! Let us try again.');
  m.querySelector('#again').onclick=()=>{ closeModal(); showStart(); };
}

// ================== UPDATE ==================
function update(dt){
  S.t+=dt; const p=S.p;
  if(S.phase==='ride'){ S.rideT+=dt; const v=VEH.find(v=>v.bus); v.x-=Math.min(160,40+S.rideT*60)*dt; if(S.rideT>5) endGame(true); return; }
  if(S.phase==='outro'){ outroUpdate(dt); return; }
  if(keys.ArrowLeft) yaw+=2.2*dt; if(keys.ArrowRight) yaw-=2.2*dt;
  let fwd=0,str=0; if(keys.KeyW||keys.ArrowUp) fwd+=1; if(keys.KeyS||keys.ArrowDown) fwd-=1; if(keys.KeyD) str+=1; if(keys.KeyA) str-=1; if(joy){ fwd=-joy.dy; str=joy.dx; }
  const fx=-Math.sin(yaw), fy=-Math.cos(yaw), rx=Math.cos(yaw), ry=-Math.sin(yaw); let mx=fx*fwd+rx*str, my=fy*fwd+ry*str; const len=Math.hypot(mx,my); p.moving=len>.1;
  if(p.moving){ const sp=95*(len>1?1/len:1); mx*=sp; my*=sp; if(!blocked(p.x+mx*dt,p.y,10)) p.x+=mx*dt; if(!blocked(p.x,p.y+my*dt,10)) p.y+=my*dt; p.face=Math.atan2(-mx,-my); p.step+=dt*11; }
  if(WORLD==='home'||WORLD==='market') vehiclesUpdate(dt);
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
  if(XPROP[k]) XPROP[k](g,it);
  else if(k==='plugs'){ g.add(bx(.3,.2,.08,std('#f5f5f5'),0,.35,0)); for(let i=0;i<4;i++) g.add(bx(.08,.12,.12,std('#222'),-.1+i*.07,.35+(i%2)*.08,-.08)); g.add(bx(.2,.08,.25,std('#eee'),.15,.04,-.3)); }
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
  if(WORLD==='home') buildHome(scene); else if(WORLD==='school') buildSchool(scene); else EXTRA_BUILD[WORLD](scene);
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
  resetExtra(scene);
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
function spawnNPCs(){ G.npcs=G_NPC.map(n=>{ const g=makeHuman(n.look); g.position.set(X(n.x),0,Z(n.y)); g.rotation.y=n.face; if(n.lolly){ const lp=grp(); lp.add(cyl(.02,.02,1.4,std('#ddd',{m:.8}),0,.7,0,6)); const disc=new THREE.Mesh(new THREE.CircleGeometry(.25,20),std('#fff',{side:THREE.DoubleSide,map:tex(mkCanvas(64,64,(c)=>{ c.fillStyle='#c0392b'; c.beginPath(); c.arc(32,32,31,0,7); c.fill(); c.fillStyle='#fff'; c.font='bold 16px system-ui'; c.textAlign='center'; c.fillText('STOP',32,38); }))})); disc.position.y=1.5; lp.add(disc); lp.position.set(.3,0,-.1); g.add(lp); } if(n.decor) g.userData.decor=true; G.scene.add(g); return {g,n}; }); if(G_NPC.some(n=>n.decor)) applyQuality(); }

// ================== EXTRA WORLDS: RUNTIME & 3D (market, water, online) ==================
const TICK=[];        // per-frame animations (water, crowd); run from render3D
let OUTRO=null;       // end ride: {obj, p0, dx, dz, cam:[x,y,z], v, seats:[[x,y,z,who]], jacket}
const EXTRA_BUILD={ market:buildMarket, water:buildWater, online:buildOnline };

function startOutro(){
  if(S.over) return; S.phase='outro'; S.rideT=0; $('prompt').classList.add('hidden'); $('guidePanel').classList.add('hidden'); $('hint2').classList.add('hidden');
  if(OUTRO&&OUTRO.obj){ OUTRO.riders=OUTRO.seats.map(([x,y,z,who])=>{ const h= who==='kid'? makeKid() : makeHuman({...DATA.escort.look, label:null, topMap: DATA.escort.look.topMap? ankara('#c0392b','#f1c40f','#1abc9c'):null, gele: DATA.escort.look.gele? ankara('#f1c40f','#c0392b','#ffffff'):null});
      if(OUTRO.jacket) h.userData.hips.add(bx(.36,.34,.26,std('#ff6a00',{r:.6}),0,.34,0)); animHuman(h,0,false,0,true); h.position.set(x,y,z); h.traverse(m=>{ if(m.isMesh) m.castShadow=true; }); OUTRO.obj.add(h); return h; }); }
  toast(DATA.outroMsg||'🎉 Well done!'); chime();
}
function outroUpdate(dt){ S.rideT+=dt; const o=OUTRO&&OUTRO.obj; if(o){ const sp=Math.min(OUTRO.v||6,.5+S.rideT*2.2); o.position.x+=OUTRO.dx*sp*dt; o.position.z+=OUTRO.dz*sp*dt; } if(S.rideT>(o?4.5:1.2)) endGame(true); }
function resetExtra(scene){
  if(OUTRO&&OUTRO.obj){ OUTRO.obj.position.copy(OUTRO.p0); (OUTRO.riders||[]).forEach(r=>OUTRO.obj.remove(r)); OUTRO.riders=null; }
  if(WORLD!=='market') return;
  const defs=[['keke','A',-100],['car','A',500,'#2e86c1'],['okada','A',1100],['danfo','B',1400],['car','B',300,'#e9e9e9']];
  for(const [kind,lane,x,col] of defs){
    const mesh= kind==='car'?makeCar(col): kind==='danfo'?makeDanfo(): kind==='okada'?makeOkada(): makeKeke(true);
    if(kind==='okada'){ const r=makeHuman({sex:'m',skin:'#3b2416',top:'#6b2d2d',bottom:'#222',longSleeve:true}); r.position.y=.35; animHuman(r,0,false,0,true); mesh.add(r); }
    scene.add(mesh); const len= kind==='car'?4.4:kind==='danfo'?5:kind==='okada'?2:2.6;
    const v={kind,lane,x,name:kind==='danfo'?'danfo bus':kind,len:len/K,max:kind==='okada'?150:115,speed:100,mesh}; VEH.push(v); G.veh.push(v);
  }
}

// ---------- chat bubbles in the question box ----------
function chatHtml(c){ return `<div class="phone"><div class="ph-top"><span class="ph-app">${esc(c.app)}</span> <b>${esc(c.from)}</b></div><div class="ph-body">${c.msgs.map(m=>`<div class="bub ${m.me?'me':''}">${esc(m.t)}</div>`).join('')}</div></div>`; }

// ---------- start-screen world selector ----------
const KID_CARDS=[['home','🏠🚌','Home → School Bus'],['school','🏫','School Safety'],['market','🛒🛺','Market & Road'],['water','🏖️🏊','Beach & Pool'],['online','📱💻','Online Safety']];
function worldCards(){
  const pg=location.pathname.split('/').pop()||'kids.html';
  return `<p class="muted" style="margin:8px 0 6px;font-weight:700">Choose a kids game</p><div class="games">${KID_CARDS.map(([w,i,t])=>{ const u=new URLSearchParams(location.search); u.set('world',w);
    return w===WORLD?`<span class="gcard on"><span class="gi">${i}</span><b>${esc(t)}</b><small>Playing now</small></span>`:`<a class="gcard" href="${esc(pg+'?'+u)}"><span class="gi">${i}</span><b>${esc(t)}</b><small>Kids 6–12</small></a>`; }).join('')}${littleCard()}${warehouseCard()}</div>`;
}

// Warehouse Shift (adults) is its own page as well; build.py points the offline copy at warehouse-offline.html
const WAREHOUSE_PAGE='warehouse.html';
function warehouseCard(){ const u=new URLSearchParams(location.search); u.delete('world'); const q=u.toString(); return `<a class="gcard" href="${esc(WAREHOUSE_PAGE+(q?'?'+q:''))}"><span class="gi">🏬📦</span><b>Warehouse Shift</b><small>Adults</small></a>`; }

// Little Stars (ages 3–6) lives in its own page; build.py points the offline copy at little-offline.html
const LITTLE_PAGE='little.html';
function littleCard(){ const u=new URLSearchParams(location.search); u.delete('world'); const q=u.toString(); return `<a class="gcard" href="${esc(LITTLE_PAGE+(q?'?'+q:''))}"><span class="gi">⭐🧸</span><b>Little Stars 3–6</b><small>Kids 3–6</small></a>`; }

// ---------- local instancing (so decor instances can be hidden on Low) ----------
const XI={}, XIM={};
function xi(key,geo,mat,m4,decor=false){ const e=(XI[key]=XI[key]||{geo,mat,decor,list:[]}); e.list.push(m4); return e.list.length-1; }
function xiFlush(scene){ for(const k in XI){ const {geo,mat,list,decor}=XI[k]; const im=new THREE.InstancedMesh(geo,mat,list.length); list.forEach((m,i)=>im.setMatrixAt(i,m)); im.castShadow=true; im.receiveShadow=true; im.frustumCulled=false; if(decor) im.userData.decor=true; scene.add(im); XIM[k]=im; delete XI[k]; } }
const M4r=(x,y,z,rx,ry,rz,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
let UBOX,USPH,UCYL; function initU(){ if(!UBOX){ UBOX=new THREE.BoxGeometry(1,1,1); USPH=new THREE.SphereGeometry(1,10,8); UCYL=new THREE.CylinderGeometry(1,1,1,12); } }

// ---------- materials & textures ----------
function xm(color,cv,ncv,r=.9){ const m=std(color,{r}); if(cv) m.map=tex(cv,1,1); if(ncv){ m.normalMap=tex(ncv,1,1,false); m.normalScale=new THREE.Vector2(.7,.7); } return m; }
let _sand=null; function sandCv(){ return _sand||(_sand=mkCanvas(512,512,(c,w,h)=>{ c.fillStyle='#e2cfa6'; c.fillRect(0,0,w,h); noise(c,w,h,40000,.12,2); noise(c,w,h,15000,.2,2,false);
  c.strokeStyle='rgba(130,100,60,.12)'; c.lineWidth=3; for(let i=0;i<34;i++){ const y=rnd(0,h); c.beginPath(); c.moveTo(0,y); for(let x=0;x<=w;x+=16) c.lineTo(x,y+Math.sin(x/37+i)*5); c.stroke(); } })); }
let _wn=null; function waterN(){ if(!_wn){ const hc=mkCanvas(256,256,(c,w,h)=>{ c.fillStyle='#808080'; c.fillRect(0,0,w,h);
    for(let i=0;i<320;i++){ const x=rnd(0,w),y=rnd(0,h),r=rnd(6,28),v=Math.random()<.5?255:0; for(const dx of [-w,0,w]) for(const dy of [-h,0,h]){ const g=c.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r); g.addColorStop(0,`rgba(${v},${v},${v},.22)`); g.addColorStop(1,`rgba(${v},${v},${v},0)`); c.fillStyle=g; c.fillRect(x+dx-r,y+dy-r,2*r,2*r); } } });
  _wn=normalFrom(hc,7); } return _wn; }
function waterMat(color,rx,ry,op=.9,speed=1){ const m=std(color,{r:.05,m:.1,transparent:true,opacity:op}); m.normalMap=tex(waterN(),rx,ry,false); m.normalScale=new THREE.Vector2(.55,.55); m.envMapIntensity=1.3;
  const n2=m.normalMap; TICK.push(t=>{ n2.offset.set(t*.018*speed,t*.011*speed); }); return m; }
function stripeCv(cols,n=12){ return mkCanvas(256,32,(c,w,h)=>{ for(let i=0;i<n;i++){ c.fillStyle=cols[i%cols.length]; c.fillRect(i*w/n,0,w/n+1,h); } noise(c,w,h,600,.08,2); }); }
function textCv(lines,o={}){ const W=o.w||256,H=o.h||448; return mkCanvas(W,H,(c,w,h)=>{
  c.fillStyle=o.bg||'#ece5dd'; c.fillRect(0,0,w,h); c.fillStyle=o.bar||'#075e54'; c.fillRect(0,0,w,Math.round(h*.13)); c.fillStyle='#fff'; c.font=`bold ${Math.round(h*.055)}px system-ui`; c.textBaseline='middle'; c.fillText(o.title||'',12,Math.round(h*.065));
  let y=h*.17; const fs=Math.round(h*.045); c.font=`${fs}px system-ui`;
  for(const L of lines){ const me=L.me, words=String(L.t).split(' '), rows=[]; let cur=''; for(const wd of words){ const tryS=cur?cur+' '+wd:wd; if(c.measureText(tryS).width>w*.66&&cur){ rows.push(cur); cur=wd; } else cur=tryS; } rows.push(cur);
    const bh=rows.length*fs*1.25+fs*.7, bw=Math.min(w*.74,Math.max(...rows.map(r=>c.measureText(r).width))+fs*1.2), x0=me?w-bw-10:10; c.fillStyle=L.c||(me?'#dcf8c6':'#ffffff'); c.beginPath(); c.roundRect?c.roundRect(x0,y,bw,bh,10):c.rect(x0,y,bw,bh); c.fill();
    c.fillStyle=L.fc||'#111'; rows.forEach((r,i)=>c.fillText(r,x0+fs*.6,y+fs*.95+i*fs*1.25)); y+=bh+fs*.6; }
  if(o.btn){ c.fillStyle=o.btnC||'#e53935'; c.beginPath(); c.roundRect?c.roundRect(w*.1,h*.8,w*.8,h*.11,12):c.rect(w*.1,h*.8,w*.8,h*.11); c.fill(); c.fillStyle='#fff'; c.font=`bold ${Math.round(h*.05)}px system-ui`; c.textAlign='center'; c.fillText(o.btn,w/2,h*.855); } }); }
function screenMat(cv){ return new THREE.MeshBasicMaterial({map:tex(cv),toneMapped:false}); }

// ---------- reusable models ----------
function sb2(text,bg,h){ const g=grp(), a=signBoard(text,bg,h); a.material.side=THREE.FrontSide; const b=a.clone(); b.rotation.y=Math.PI; b.position.z=-.005; g.add(a,b); return g; }   // sign readable from both sides
function makeKeke(driver=true){
  const g=grp(), yel=std('#f2c318',{r:.35,m:.25}), grn=std('#1f7a3a',{r:.4,m:.2}), blk=std('#161616',{r:.7}), roof=std('#1d2a22',{r:.9}), seat=std('#3a2a20',{r:.8}), steel=std('#9a9a9a',{r:.3,m:.8}), mats={tire:std('#151515',{r:.8}),rim:std('#8a8a8a',{r:.3,m:.8})};
  g.add(bx(1.2,.12,2.3,blk,0,.42,0), bx(1.3,.5,.9,yel,0,.72,.68), bx(1.32,.1,.92,grn,0,.95,.68), bx(1.16,.12,.5,seat,0,1.02,.62), bx(1.16,.55,.1,seat,0,1.33,1.0));
  g.add(bx(.95,.75,.45,yel,0,.85,-.95), bx(.97,.08,.47,grn,0,1.05,-.95), bx(1.05,.5,.03,std('#2a3a44',{r:.05,m:.9,transparent:true,opacity:.5}),0,1.47,-1.08,false));
  g.add(bx(1.42,.07,2.25,roof,0,1.92,-.05), bx(1.44,.12,.06,grn,0,1.86,-1.17), bx(1.44,.12,.06,grn,0,1.86,1.07));
  for(const [x,z] of [[-.64,-1.05],[.64,-1.05],[-.64,1.02],[.64,1.02]]) g.add(cyl(.025,.025,1.5,steel,x,1.17,z,6));
  g.add(bx(.4,.1,.38,seat,0,.98,-.42)); const bar=cyl(.02,.02,.62,steel,0,1.28,-.78,6); bar.rotation.z=Math.PI/2; g.add(bar);
  g.add(wheel(.23,.12,0,.23,-1.0,mats), wheel(.23,.14,-.62,.23,.72,mats), wheel(.23,.14,.62,.23,.72,mats));
  g.add(bx(.2,.12,.04,std('#fffbe0',{emissive:'#fff6cc',emissiveIntensity:.3}),0,1.0,-1.19));
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(.5,.13),std('#fff',{map:tex(boardCanvas('LAGOS','#f2c318','#1f7a3a')),r:.5})); pl.position.set(0,.62,1.135); g.add(pl);
  if(driver){ const d=makeHuman({sex:'m',skin:'#3b2416',top:'#2d4a6b',bottom:'#222',longSleeve:true,hat:'cap',hatColor:'#7a1f2b'}); d.position.set(0,.2,-.4); animHuman(d,0,false,0,true); g.add(d); }
  consolidate(g); return g;
}
let UCONE=null; const _umbT={};
// Roofs and umbrella canopies between the camera and the child are hidden, so the child is always visible.
const OCC=[]; let ZERO4=null;
function segDist(px,pz,ax,az,bx_,bz){ const dx=bx_-ax, dz=bz-az, L=dx*dx+dz*dz||1, f=clamp(((px-ax)*dx+(pz-az)*dz)/L,0,1); return Math.hypot(px-(ax+dx*f),pz-(az+dz*f)); }
function occlude(){ if(!G||!S) return; const c=G.camera.position, ax=c.x, az=c.z, bx_=X(S.p.x), bz=Z(S.p.y), fp=firstPerson; const dirty=new Set(); ZERO4=ZERO4||new THREE.Matrix4().makeScale(0,0,0);
  for(const o of OCC){ let hide=false; if(!fp){ if(o.mesh) hide=segRect(ax,az,bx_,bz,o); else hide=segDist(o.x,o.z,ax,az,bx_,bz)<o.r || Math.hypot(o.x-ax,o.z-az)<o.r+.9; }
    if(hide!==o.hid){ o.hid=hide; if(o.mesh) o.mesh.visible=!hide; else { const im=XIM[o.key]; if(im){ im.setMatrixAt(o.idx,hide?ZERO4:o.m4); dirty.add(im); } } } }
  dirty.forEach(im=>im.instanceMatrix.needsUpdate=true); }
function segRect(ax,az,bx_,bz,o){ for(let i=0;i<=12;i++){ const f=i/12, x=ax+(bx_-ax)*f, z=az+(bz-az)*f; if(x>o.x1-.3&&x<o.x2+.3&&z>o.z1-.3&&z<o.z2+.3) return true; } return false; }
function umbI(x,y,cols,r=1.5,h=2.3,solid=true){ // instanced umbrella (pole + striped canopy)
  if(!UCONE) UCONE=new THREE.ConeGeometry(1,.55,12,1,true); const key=cols.join(); _umbT[key]=_umbT[key]||std('#fff',{map:tex(stripeCv(cols),1,1),r:.85,side:THREE.DoubleSide});
  xi('um_pole',UCYL,std('#d8d8d8',{r:.4,m:.7}),M4(X(x),h/2,Z(y),0,.03,h,.03)); const m4=M4(X(x),h+.1,Z(y),rnd(0,3),r,1,r), idx=xi('um_'+key,UCONE,_umbT[key],m4); OCC.push({key:'um_'+key,idx,m4,x:X(x),z:Z(y),r:r+.3,hid:false}); if(solid) SOLIDS.push({x:x-4,y:y-4,w:8,h:8}); }
function umbrella(cols,r=1.5,h=2.3){ const g=grp(), key=cols.join(); g.add(cyl(.03,.03,h,std('#d8d8d8',{r:.4,m:.7}),0,h/2,0,8));
  const can=new THREE.Mesh(new THREE.ConeGeometry(r,.55,12,1,true),(_umbT[key]=_umbT[key]||std('#fff',{map:tex(stripeCv(cols),1,1),r:.85,side:THREE.DoubleSide}))); can.position.y=h+.1; can.castShadow=true; g.add(can); return g; }
const GOODS={ tomato:['#c62d1f',.065], pepper:['#d94e14',.045], onion:['#7a3b55',.06], orange:['#e08a1e',.075], lime:['#5d8f2a',.055], egg:['#efe3c8',.05] };
function goodsOn(x,z,top,kind,decor){ // piles of produce in enamel trays, yams, cloth, sacks; x,z world coords of table centre
  const g=GOODS[kind];
  if(g){ const mat=std(g[0],{r:.5}); const tray=std(['#e9e9e9','#2e86c1','#c0392b'][Math.floor(Math.random()*3)],{r:.35,m:.2});
    for(let p=0;p<4;p++){ const px=x+(-.8+p*.53), pz=z+rnd(-.1,.1); xi('tray'+tray.color.getHexString(),UCYL,tray,M4(px,top+.02,pz,0,.24,.04,.24),decor);
      const r=g[1]; let n=0; for(let lay=0;lay<3;lay++) for(let i=0;i<6-lay*2;i++){ const a=i/(6-lay*2)*Math.PI*2+lay, rr=lay===2?0:(.13-lay*.06); xi('g'+kind,USPH,mat,M4(px+Math.cos(a)*rr,top+.06+lay*r*1.4,pz+Math.sin(a)*rr,0,r,r*.92,r),decor); if(++n>9) break; } } }
  else if(kind==='yam'){ const m=std('#6e4a2c',{r:.95}); for(let i=0;i<9;i++) xi('yam',UCYL,m,M4r(x+rnd(-.9,.9),top+.07+(i%3)*.06,z+rnd(-.3,.3),Math.PI/2,rnd(0,3),0,.07,.5,.07),decor); }
  else if(kind==='cloth'){ const cols=['#c0392b','#1f6b3a','#f1c40f','#6b4f8a','#1f4e8c','#e67e22']; for(let i=0;i<6;i++){ const m=std(cols[i],{r:.95}); for(let k=0;k<3;k++) xi('cl'+i,UBOX,m,M4(x-.85+i*.34,top+.04+k*.07,z,rnd(-.1,.1),.3,.06,.5),decor); } }
  else if(kind==='sack'){ const m=std('#efe8d6',{r:.95}); for(let i=0;i<4;i++) xi('sack',UCYL,m,M4(x-.75+i*.5,top+.25,z,0,.2,.5,.18),decor); const gm=std('#f2e6c2',{r:1}); for(let i=0;i<4;i++) xi('garri',USPH,gm,M4(x-.75+i*.5,top+.5,z,0,.17,.06,.15),decor); }
  else if(kind==='pot'){ const m=std('#b8bcc0',{r:.25,m:.9}); for(let i=0;i<5;i++) xi('pot',UCYL,m,M4(x-.8+i*.4,top+.12,z,0,.16,.22,.16),decor); }
}
function lockups(scene,x0,x1,yFront,face,names){ // row of two-storey lock-up shops; face=+1 front faces +y (south), -1 faces north
  const cols=['#e8d9b8','#d7e3e8','#f0e0d0','#e6d0c6','#dfe6cf'], wallM=cols.map(c=>{ const m=std(c,{r:.92}); m.map=tex(TX.plaster,2.5,1.6); return m; }), roofM=std('#8a8580',{r:.8}), sm=std('#fff',{map:tex(TX.shutter,2,1),r:.5,m:.4}), dkM=std('#1d1a17',{r:1}), wnM=std('#22303a',{r:.1,m:.6}); let i=0;
  const root=grp(), realScene=scene; scene={add:(...a)=>root.add(...a)};
  for(let x=x0;x<x1;x+=200,i++){ const w=X(196), h=rnd(5.6,7.2), d=8, zc=Z(yFront)-face*d/2, cx=X(x+100); const m=wallM[i%cols.length];
    scene.add(bx(w,h,d,m,cx,h/2,zc)); scene.add(bx(w+.3,.25,d+.3,roofM,cx,h+.12,zc));
    const fz=Z(yFront)+face*.02;
    for(const sx of [-2.4,2.4]){ const sh=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.3),sm); sh.position.set(cx+sx,2.55,fz); if(face<0) sh.rotation.y=Math.PI; scene.add(sh);
      const dk=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.9),dkM); dk.position.set(cx+sx,.95,fz); if(face<0) dk.rotation.y=Math.PI; scene.add(dk); }
    for(const sx of [-3,-1,1,3]){ const wn=bx(1.2,1.1,.06,wnM,cx+sx,h-1.4,fz); scene.add(wn); }
    if(names&&names[i%names.length]){ const s=sb2(names[i%names.length],['#7a1f2b','#12355b','#1f6b3a','#5b2c6f'][i%4],.55); s.position.set(cx,3.6,fz+face*.03); if(face<0) s.rotation.y=Math.PI; scene.add(s); }
    SOLIDS.push({x:x,y:face>0?yFront-200:yFront,w:200,h:200}); }
  root.updateMatrixWorld(true); consolidate(root); realScene.add(root);
}
function streetPole(scene,x,y){ const g=grp(); g.add(cyl(.09,.12,7.5,std('#6d5a43',{r:1}),0,3.75,0,8)); const arm=bx(1.2,.06,.06,std('#555',{m:.6}),0,7,0); g.add(arm); g.add(bx(.3,.4,.3,std('#666',{m:.5}),.4,6.4,0)); place(scene,g,x,y,0,[10,10]); g.userData.decor=false; return g; }
function crowdLook(i){ const skins=['#3b2416','#5a3825','#7b4a2e','#4a2e1e','#2e1c12'], tops=['#c0392b','#1f6b3a','#f1c40f','#2e86c1','#8e44ad','#e67e22','#ecf0f1','#34495e'], f=i%2===0;
  return f? {sex:'f',skin:skins[i%5],dress:true,outfit:'dress',hair:i%4===0?'braids':'none',gele:i%4===0?null:ankara(tops[i%8],tops[(i+3)%8],'#ffffff'),topMap:ankara(tops[(i+1)%8],tops[(i+4)%8],tops[(i+6)%8]),shoe:'#3a2a20'}
           : {sex:'m',skin:skins[(i+2)%5],top:tops[(i+5)%8],bottom:['#2a2f3a','#4b3a2a','#1f2a40'][i%3],longSleeve:i%3===0,beard:i%3===1,hat:i%5===1?'cap':undefined,hatColor:'#222'}; }
const DECOR_H=[];   // decorative people: hidden on Low graphics and when far from the player
function cullCrowd(){ if(!G||!G.npcs||!S) return; if(!cullCrowd.done){ cullCrowd.done=1; G.npcs.forEach(({g,n})=>{ if(n.decor) DECOR_H.push(g); }); DECOR_H.forEach(g=>g.traverse(m=>{ if(m.isMesh) m.castShadow=false; })); }
  const low=SL.quality()==='low', px=X(S.p.x), pz=Z(S.p.y); for(const g of DECOR_H) g.visible=!low && Math.hypot(g.position.x-px,g.position.z-pz)<28; }
function addWalkers(scene,list){ // list of [x0,x1,y,speed]
  list.forEach(([x0,x1,y,sp],i)=>{ const g=makeHuman(crowdLook(i+3)); g.userData.decor=true; g.visible=false; g.traverse(m=>{ if(m.isMesh) m.castShadow=false; }); DECOR_H.push(g); scene.add(g); const w={g,x:rnd(x0,x1),x0,x1,y,dir:i%2?1:-1,sp,step:rnd(0,6)};
    TICK.push((t,dt)=>{ if(paused&&started) { animHuman(g,w.step,false,t); return; } w.x+=w.dir*w.sp*dt; if(w.x>w.x1){ w.x=w.x1; w.dir=-1; } if(w.x<w.x0){ w.x=w.x0; w.dir=1; } w.step+=dt*9; g.position.set(X(w.x),0,Z(w.y)); g.rotation.y=w.dir>0?-Math.PI/2:Math.PI/2; if(g.visible) animHuman(g,w.step,true,t); }); });
}
function zebraMesh(scene,x,y,w,h){ const zeb=new THREE.Mesh(new THREE.PlaneGeometry(X(w),Z(h)),new THREE.MeshStandardMaterial({map:tex(mkCanvas(64,256,(c)=>{ c.fillStyle='rgba(255,255,255,.92)'; for(let yy=6;yy<256;yy+=26) c.fillRect(0,yy,64,13); }),1,1),transparent:true,roughness:.7,depthWrite:false}));
  zeb.rotation.x=-Math.PI/2; zeb.position.set(X(x),.012,Z(y)); scene.add(zeb); }
function dashLine(scene,y,x0=-500,x1=2000){ const dash=mkCanvas(512,16,(c)=>{ c.fillStyle='rgba(255,255,255,.85)'; for(let x=0;x<512;x+=64) c.fillRect(x,4,36,8); }); const dm=new THREE.Mesh(new THREE.PlaneGeometry(X(x1-x0),.25),new THREE.MeshStandardMaterial({map:tex(dash,20,1),transparent:true,depthWrite:false})); dm.rotation.x=-Math.PI/2; dm.position.set(X((x0+x1)/2),.011,Z(y)); scene.add(dm); }
function bigGround(scene,mat,rep=150){ const m=mat.clone(); if(mat.map){ m.map=mat.map.clone(); m.map.needsUpdate=true; m.map.repeat.set(rep,rep); } if(mat.normalMap){ m.normalMap=mat.normalMap.clone(); m.normalMap.needsUpdate=true; m.normalMap.repeat.set(rep,rep); } return plane(scene,600,600,m,X(WW/2),Z(WH/2),-.03); }

// ---------- hazard props for the new worlds (hazardProp() checks XPROP first) ----------
const XPROP={
  gutter2(g){ const h=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.75),std('#0d0b08',{r:1})); h.rotation.x=-Math.PI/2; h.position.y=.05; g.add(h); const wv=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.6),std('#3b3524',{r:.1,m:.2})); wv.rotation.x=-Math.PI/2; wv.position.y=.052; g.add(wv);
    const s1=bx(.7,.06,.75,std('#9a958c',{r:.9}),.95,.1,.15); s1.rotation.set(.25,.4,0); g.add(s1); for(let i=0;i<4;i++) g.add(bx(rnd(.08,.18),.05,rnd(.08,.15),std('#9a958c'),rnd(-.6,.6),.06,rnd(.4,.6))); },
  genwire(g){ g.add(bx(.75,.5,.48,std('#d35400',{r:.5,m:.3}),-.35,.3,-.55), bx(.8,.08,.52,std('#222'),-.35,.04,-.55), cyl(.03,.03,.25,std('#555',{m:.8}),-.1,.65,-.55,8));
    const pts=[new THREE.Vector3(-.05,.4,-.55),new THREE.Vector3(.2,.05,-.3),new THREE.Vector3(.5,.03,0),new THREE.Vector3(.75,.2,.05)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.015,6),std('#151515',{r:.6})));
    const cu=std('#c87533',{r:.25,m:1}); for(let i=0;i<6;i++){ const w=cyl(.004,.004,.14,cu,.78+rnd(0,.06),.22+rnd(-.03,.03),.05+rnd(-.04,.04),4,false); w.rotation.z=rnd(-1.4,1.4); g.add(w); }
    for(let i=0;i<4;i++) g.add(mesh(new THREE.SphereGeometry(.02,6,4),new THREE.MeshBasicMaterial({color:'#ffd27a'}),.82+rnd(-.05,.05),.25+rnd(0,.1),.05+rnd(-.05,.05))); },
  oil(g){ for(let i=0;i<3;i++){ const a=i/3*Math.PI*2; g.add(bx(.22,.25,.22,std('#6b6158',{r:1}),Math.cos(a)*.3,.12,Math.sin(a)*.3)); }
    for(let i=0;i<5;i++){ const l=cyl(.04,.04,.6,std('#4a3020',{r:1}),rnd(-.2,.2),.08,rnd(-.2,.2),6); l.rotation.set(Math.PI/2,rnd(0,3),0); g.add(l); }
    g.add(mesh(new THREE.SphereGeometry(.15,8,6),new THREE.MeshBasicMaterial({color:'#ff7a1a'}),0,.15,0));
    const wok=mesh(new THREE.SphereGeometry(.5,24,10,0,Math.PI*2,Math.PI/2,Math.PI/2),std('#1b1b1b',{r:.4,m:.6,side:THREE.DoubleSide}),0,.75,0); g.add(wok);
    const oilS=new THREE.Mesh(new THREE.CircleGeometry(.45,24),std('#c98a1c',{r:.05,m:.3,emissive:'#5a3000',emissiveIntensity:.4})); oilS.rotation.x=-Math.PI/2; oilS.position.y=.62; g.add(oilS);
    for(let i=0;i<7;i++) g.add(sph(.05,std('#a8641e',{r:.7}),rnd(-.25,.25),.65,rnd(-.25,.25),8)); g.add(cyl(.18,.2,.4,std('#2e86c1',{r:.4}),.8,.2,.1,14)); },
  keke3(g){ const k=makeKeke(true); k.rotation.y=Math.PI/2; k.position.z=1.5; g.add(k);
    const L=[{sex:'m',skin:'#3b2416',top:'#c0392b',bottom:'#222'},{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',topMap:ankara('#1f6b3a','#f1c40f','#fff')},{sex:'m',skin:'#7b4a2e',top:'#2e86c1',bottom:'#222'},{sex:'f',skin:'#4a2e1e',top:'#8e44ad',bottom:'#222',hair:'braids'}];
    [[.55,.25,1.25],[.6,.25,1.8],[-.15,.62,2.05]].forEach(([x,y,z],i)=>{ const h=makeHuman(L[i]); h.position.set(x,y<.5?y:.25,z); h.rotation.y=Math.PI/2; animHuman(h,0,false,0,true); g.add(h); });
    const sk=std('#efe8d6',{r:.95}); for(let i=0;i<5;i++) g.add(bx(.5,.35,.6,sk,rnd(-.5,.5),2.15+(i>2?.35:0),1.5+rnd(-.4,.4))); g.add(bx(.6,.4,.5,std('#2e86c1',{r:.5}),-.95,1.0,1.5)); },
  drain(g){ const h=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),std('#060606',{r:1})); h.rotation.x=-Math.PI/2; h.position.y=.02; g.add(h); const gr=bx(.55,.03,.55,std('#cfd3d6',{r:.3,m:.8}),.6,.03,.25); gr.rotation.y=.6; g.add(gr);
    const w=new THREE.Mesh(new THREE.CircleGeometry(.8,20),std('#a9cfe0',{r:.03,transparent:true,opacity:.5})); w.rotation.x=-Math.PI/2; w.position.y=.015; g.add(w); },
  tile(g){ const h=new THREE.Mesh(new THREE.PlaneGeometry(.6,.45),std('#5a5a55',{r:1})); h.rotation.x=-Math.PI/2; h.position.y=.02; g.add(h); for(let i=0;i<7;i++){ const s=bx(rnd(.08,.2),.025,rnd(.06,.16),std(i%2?'#e9e4da':'#9fd3e6',{r:.2}),rnd(-.5,.5),.03,rnd(-.4,.4)); s.rotation.set(rnd(-.3,.3),rnd(0,3),rnd(-.3,.3)); g.add(s); } },
  nosign(g){ g.add(cyl(.04,.04,1.6,std('#9aa0a6',{m:.8,r:.3}),0,.8,0,8)); const b=bx(.7,.45,.03,std('#f4f4f4',{r:.6}),.45,.03,.4); b.rotation.set(-Math.PI/2,0,.5); g.add(b);
    const dl=new THREE.Mesh(new THREE.PlaneGeometry(.6,.3),new THREE.MeshBasicMaterial({map:tex(mkCanvas(128,64,(c)=>{ c.fillStyle='#fff'; c.fillRect(0,0,128,64); c.fillStyle='#1b4f72'; c.font='bold 36px system-ui'; c.textAlign='center'; c.fillText('? m',64,46); })),transparent:true})); dl.rotation.x=-Math.PI/2; dl.position.set(-.5,.05,-.1); g.add(dl); },
  cable(g){ g.add(bx(.45,.8,.4,std('#1b1b1b',{r:.5}),-.6,.4,-.3)); for(const y of [.25,.6]){ const sp=cyl(.12,.12,.02,std('#444',{r:.3}),-.6,y,-.09,16); sp.rotation.x=Math.PI/2; g.add(sp); }
    const pts=[]; for(let i=0;i<8;i++) pts.push(new THREE.Vector3(-.4+i*.25,.02,-.2+Math.sin(i*1.4)*.25+i*.12)); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),50,.018,6),std('#e2780e',{r:.5})));
    g.add(bx(.3,.1,.15,std('#eeeeee',{r:.4}),1.5,.05,.85)); const w=new THREE.Mesh(new THREE.CircleGeometry(.7,20),std('#a9cfe0',{r:.03,transparent:true,opacity:.55})); w.rotation.x=-Math.PI/2; w.position.set(1.4,.012,.9); g.add(w); },
  rip(g){ const ch=new THREE.Mesh(new THREE.PlaneGeometry(4,10),std('#0f4c63',{r:.05,transparent:true,opacity:.5})); ch.rotation.x=-Math.PI/2; ch.position.set(0,.045,6.5); g.add(ch);
    const sg=grp(); sg.add(cyl(.05,.05,2,std('#9aa0a6',{m:.8}),0,1,0,8)); const pl=new THREE.Mesh(new THREE.PlaneGeometry(.9,.6),std('#fff',{map:tex(boardCanvas('RIP CURRENT','#c0392b')),side:THREE.DoubleSide,r:.5})); pl.position.y=1.9; pl.rotation.y=Math.PI; sg.add(pl); sg.position.set(-1.2,0,-.5); g.add(sg); },
  net(g){ const m=std('#3d6a5a',{r:.9}); for(let i=0;i<9;i++){ const a=cyl(.008,.008,2.2,m,rnd(-.2,.2),.02,-.9+i*.22,4,false); a.rotation.set(Math.PI/2,0,Math.PI/2+rnd(-.2,.2)); g.add(a); const b=cyl(.008,.008,2,m,-1+i*.25,.025,rnd(-.2,.2),4,false); b.rotation.x=Math.PI/2; g.add(b); }
    for(let i=0;i<6;i++) g.add(sph(.07,std('#e8701a',{r:.5}),rnd(-1,1),.06,rnd(-.9,.9),10)); for(let i=0;i<5;i++){ const hk=new THREE.Mesh(new THREE.TorusGeometry(.04,.006,4,10,Math.PI*1.3),std('#bbb',{m:1,r:.2})); hk.position.set(rnd(-.8,.8),.03,rnd(-.7,.7)); hk.rotation.x=-Math.PI/2; g.add(hk); } },
  ring(g){ g.add(bx(.08,1.5,.08,std('#ecf0f1',{r:.5}),0,.75,0)); const r=new THREE.Mesh(new THREE.TorusGeometry(.3,.07,10,24),std('#ff6a00',{r:.5})); r.position.set(0,1.05,-.1); g.add(r);
    for(let i=0;i<4;i++){ const b=new THREE.Mesh(new THREE.TorusGeometry(.3,.075,6,4,.3),std('#ffffff',{r:.5})); b.rotation.z=i*Math.PI/2; b.position.copy(r.position); g.add(b); } },
  shower(g){ g.add(bx(1,.08,1,std('#bfbab0',{r:.8}),0,.04,0), cyl(.04,.04,2.2,std('#c8ccd0',{m:.8,r:.3}),0,1.1,0,8)); const arm=cyl(.03,.03,.4,std('#c8ccd0',{m:.8}),0,2.2,-.2,8); arm.rotation.x=Math.PI/2; g.add(arm); g.add(cyl(.12,.06,.06,std('#c8ccd0',{m:.8}),0,2.15,-.4,12)); },
};
function deviceProp(g,kind,cv,o={}){ // small table with a phone / tablet / laptop / monitor showing a screen
  const tbl=std(o.table||'#6b4a2b',{r:.7}), H=o.h??.62; if(!o.noTable){ g.add(bx(.7,.05,.5,tbl,0,H,0)); for(const [x,z] of [[-.3,-.2],[.3,-.2],[-.3,.2],[.3,.2]]) g.add(bx(.04,H,.04,tbl,x,H/2,z)); }
  const blk=std('#151515',{r:.3,m:.4}), top=H+.03, sm=screenMat(cv);
  const slab=(w,h,d,mat,sw,sh,y,z,rx)=>{ const dv=grp(); const b=bx(w,h,d,mat,0,0,0); b.userData.keep=true; dv.add(b); const sc=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),sm); sc.position.z=d/2+.002; sc.userData.keep=true; dv.add(sc); dv.position.set(0,y,z); dv.rotation.x=rx; g.add(dv); };
  if(kind==='phone'){ slab(.2,.4,.02,blk,.18,.36,top+.19,.02,-.25); g.add(bx(.12,.1,.08,std('#444'),0,top+.03,.08)); }
  else if(kind==='tablet'){ slab(.48,.34,.02,blk,.44,.3,top+.17,.04,-.3); }
  else if(kind==='laptop'){ g.add(bx(.5,.02,.34,std('#9aa0a6',{m:.7,r:.3}),0,top,.05)); slab(.5,.32,.015,std('#9aa0a6',{m:.7,r:.3}),.46,.28,top+.16,-.12,-.2); }
  else if(kind==='monitor'){ g.add(bx(.12,.2,.08,blk,0,top+.1,-.05)); g.add(bx(.62,.4,.03,blk,0,top+.4,-.06)); const sc=new THREE.Mesh(new THREE.PlaneGeometry(.58,.36),sm); sc.position.set(0,top+.4,-.04); g.add(sc); g.add(bx(.45,.02,.15,std('#2b2b2b'),0,top+.01,.15)); }
  return g;
}
const wa=(title,lines,o={})=>textCv(lines,{title,...o});
Object.assign(XPROP,{
  popup(g){ deviceProp(g,'laptop',textCv([{t:'YOU WON!!! 🎉',c:'#ffe600'},{t:'Click HERE to claim your free iPhone'},{t:'Only 2 minutes left!',c:'#ffd0d0'}],{w:448,h:280,title:'FREE-PRIZE.xyz',bar:'#c0392b',bg:'#2b2b2b',btn:'CLICK HERE ▶',btnC:'#e53935'})); },
  friendreq(g){ deviceProp(g,'phone',wa('Friend request',[{t:'"CoolUncle_99" wants to be your friend'},{t:'0 friends in common',c:'#ffe0e0'}],{bar:'#3b5998',btn:'Accept?',btnC:'#3b5998'}),{table:'#4a3020'}); },
  webcam(g){ deviceProp(g,'tablet',textCv([{t:'Incoming video call',c:'#333',fc:'#fff'},{t:'+234 90X XXX XXXX (unknown)',c:'#333',fc:'#fff'}],{w:448,h:300,title:'Video call',bar:'#1b1b1b',bg:'#101820',btn:'Answer',btnC:'#27ae60'})); },
  pwnote(g){ deviceProp(g,'monitor',textCv([{t:'Username: ada2015'},{t:'Password: ********'}],{w:448,h:280,title:'Game login',bar:'#2e86c1',bg:'#f4f6f8'}),{table:'#7a5230'}); const n=new THREE.Mesh(new THREE.PlaneGeometry(.14,.12),new THREE.MeshBasicMaterial({map:tex(mkCanvas(64,56,(c)=>{ c.fillStyle='#ffe96b'; c.fillRect(0,0,64,56); c.fillStyle='#c0392b'; c.font='bold 13px system-ui'; c.fillText('PASSWORD:',3,20); c.fillStyle='#111'; c.fillText('ada1234',6,40); }))})); n.position.set(.24,.62+.03+.3,-.03); g.add(n); },
  charger(g){ g.add(bx(.5,.5,.45,std('#7a5230',{r:.7}),0,.25,0)); const p=bx(.55,.14,.35,std('#ffffff',{r:.9}),0,.57,0); g.add(p); g.add(bx(.08,.01,.15,std('#151515'),.12,.51,.02)); const pts=[new THREE.Vector3(.15,.52,.1),new THREE.Vector3(.3,.3,.2),new THREE.Vector3(.35,.05,.35),new THREE.Vector3(.6,.3,.5)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.01,5),std('#eeeeee')));
    g.add(mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:'#ff5a1a',transparent:true,opacity:.6}),.12,.55,.02)); },
  location(g){ deviceProp(g,'phone',wa('Map app',[{t:'Share your LIVE location with EVERYONE?'},{t:'Anyone can see where you are.',c:'#ffe0e0'}],{bar:'#e67e22',bg:'#eef3e6',btn:'Allow',btnC:'#e67e22'}),{table:'#8a8a8a'}); },
  mummsg(g){ deviceProp(g,'phone',wa('Mummy ❤️',[{t:'I am at the market. Home by 5pm.'},{t:'Do your homework. Love you!'},{me:true,t:'OK Mummy 😊'}]),{table:'#5a3a1f'}); },
  portal(g){ deviceProp(g,'monitor',textCv([{t:'Welcome! Homework for Primary 5'},{t:'Opened by Daddy',c:'#e8f6ea'}],{w:448,h:280,title:'Bright Future School portal',bar:'#7a1f2b',bg:'#f8f4ee'}),{table:'#7a5230'}); },
  controls(g){ deviceProp(g,'tablet',textCv([{t:'Kids Mode is ON',c:'#d4f5dd'},{t:'Screen time left: 30 min'}],{w:448,h:300,title:'Family settings',bar:'#27ae60',bg:'#f2fbf4'})); },
});

// ---------- MARKET WORLD ----------
function buildMarket(scene){
  initU();
  WW=1500; WH=1200;
  const dirt=xm('#b8a68a',TX.concrete,TX.concreteN,.95);
  bigGround(scene,dirt,140);
  floorRect(scene,40,40,1460,700,dirt,.004,2.5);
  floorRect(scene,-500,700,2000,760,MAT.concrete,.006,3); floorRect(scene,-500,760,2000,940,MAT.asphalt,.005,4); floorRect(scene,-500,940,2000,1000,MAT.concrete,.006,3); floorRect(scene,-500,1000,2000,1400,MAT.pavers,.004,1.6);
  ROADS.push({x1:-500,y1:760,x2:2000,y2:940}); ZEBRAS.push({x1:700,y1:760,x2:760,y2:940});
  Object.assign(ROADC,{zx:730,mid:850,n:735,s:970}); LANES.A.y=805; LANES.B.y=895;
  zebraMesh(scene,730,850,60,180); dashLine(scene,850);
  // kerbs (black & white), gutter with concrete slabs, open stretch near the gutter mission
  const kerbM=std('#fff',{map:tex(stripeCv(['#f2f2f2','#1d1d1d'],2),60,1),r:.8}); for(const y of [760,940]) scene.add(bx(X(2500),.14,.22,kerbM,X(750),.07,Z(y)));
  const ch=new THREE.Mesh(new THREE.PlaneGeometry(X(2500),X(16)),std('#14110c',{r:1})); ch.rotation.x=-Math.PI/2; ch.position.set(X(750),.008,Z(708)); scene.add(ch);
  const slab=std('#a39e94',{map:tex(TX.concrete,.3,.3),r:.95}); for(let x=-500;x<1180;x+=20) xi('slab',UBOX,slab,M4(X(x+10),.02,Z(708),0,.96,.04,.95));
  const gw=new THREE.Mesh(new THREE.PlaneGeometry(X(280),X(14)),waterMat('#4a4230',8,1,.95,2)); gw.rotation.x=-Math.PI/2; gw.position.set(X(1320),.03,Z(708)); scene.add(gw);
  for(const y of [699,717]) scene.add(bx(X(280),.16,.12,std('#8f8a80',{r:.9}),X(1320),.08,Z(y))); SOLIDS.push({x:1180,y:699,w:290,h:18});
  const slp=bx(.12,.04,.28,std('#2e86c1',{r:.6}),X(1290),.08,Z(708)); scene.add(slp); TICK.push(t=>{ slp.position.x=X(1290)+Math.sin(t*.7)*.6; slp.rotation.y=t; });
  // lock-up shops north (market backdrop) and south of the motor park
  lockups(scene,40,1460,40,1,['MAMA NKECHI PROVISIONS','GOD\'S TIME FABRICS','ALHAJI & SONS','BLESSED POT & PAN','ONE LOVE PHONES','IYA BASIRAT FOODSTUFF','EMEKA ELECTRONICS']);
  lockups(scene,-160,1660,1200,-1,['DIVINE PHARMACY','JUMOKE HAIR','MECHANIC VILLAGE','CHOP & GO','TOLU TAILORING']);
  const arch=grp(); for(const z of [-2.2,2.2]) arch.add(cyl(.12,.12,4,std('#7a1f2b',{r:.5}),0,2,z,10)); const as=sb2('OJA TUNTUN MARKET','#1f6b3a',.6); as.position.y=4.1; as.rotation.y=Math.PI/2; arch.add(as); place(scene,arch,45,650,0);
  // stalls: row A (umbrellas, in front of shops), row B (long zinc sheds, back to back), row C (umbrellas)
  const UMB=[['#c0392b','#f4f4f4'],['#1f6b3a','#f1c40f'],['#2e86c1','#f4f4f4'],['#f39c12','#8e44ad']], KINDS=['tomato','pepper','onion','orange','yam','cloth','sack','pot','lime','egg'];
  const wT=std('#8a6440',{r:.85}), wL=std('#6b4a2b',{r:.9});
  const stall=(x,y,umb,trader,face)=>{ const kind=KINDS[Math.floor(Math.random()*KINDS.length)], tx=X(x), tz=Z(y);
    xi('st_top',UBOX,wT,M4(tx,.8,tz,0,2.3,.07,1.1)); xi('st_shelf',UBOX,wL,M4(tx,.25,tz,0,2.2,.04,1)); for(const [lx,lz] of [[-1.05,-.45],[1.05,-.45],[-1.05,.45],[1.05,.45]]) xi('st_leg',UBOX,wL,M4(tx+lx,.4,tz+lz,0,.07,.8,.07));
    SOLIDS.push({x:x-25,y:y-13,w:50,h:26}); goodsOn(tx,tz,.84,kind,false);
    if(umb) umbI(x,y,UMB[Math.floor(Math.random()*4)],1.55,2.3,false);
    if(trader) G_NPC.push({look:crowdLook(Math.floor(rnd(0,40))*2),x,y:y+face*28,face:face>0?0:Math.PI,decor:true}); };
  let n=0; for(let x=150;x<=1360;x+=74,n++) stall(x,150,true,n%5===2,-1);
  const blocksB=[[110,360],[420,760],[840,1180]];
  for(const [a,b] of blocksB){ for(let x=a+40;x<=b-30;x+=72,n++){ stall(x,318,false,false,0); stall(x,382,false,false,0); if(n%5===1) G_NPC.push({look:crowdLook(n*2),x,y:350,face:0,decor:true}); }
    const roofM=std('#b9b2a5',{map:tex(TX.corr,X(b-a)/2,2),normalMap:tex(TX.corrN,X(b-a)/2,2,false),r:.55,m:.6}); const rf=bx(X(b-a)+.6,.05,X(130),roofM,X((a+b)/2),2.75,Z(350)); scene.add(rf); OCC.push({mesh:rf,x1:X(a)-.3,x2:X(b)+.3,z1:Z(285),z2:Z(415),hid:false});
    for(const x of [a,b]) for(const y of [292,408]){ scene.add(cyl(.06,.06,2.75,std('#5d4a36',{r:.9}),X(x),1.37,Z(y),8)); SOLIDS.push({x:x-5,y:y-5,w:10,h:10}); } }
  for(const [a,b] of [[110,360],[420,760],[840,1120],[1180,1420]]) for(let x=a+40;x<=b-30;x+=74,n++) stall(x,560,true,n%6===2,1);
  // food corner: akara & puff-puff seller
  const fc=grp(); fc.add(F.table()); fc.add(cyl(.25,.25,.3,std('#c0392b',{r:.5}),-.4,.9,0,14), cyl(.25,.25,.3,std('#f1c40f',{r:.5}),.4,.9,0,14)); const fb=bx(.4,.4,.4,std('#555'),1.1,.2,0); fc.add(fb); place(scene,fc,300,660,0,[40,22]); umbI(300,660,['#c0392b','#ffffff'],1.4,2.3,false);
  G_NPC.push({look:{sex:'f',skin:'#3b2416',dress:true,outfit:'dress',hair:'none',gele:ankara('#e67e22','#1f6b3a','#ffffff'),topMap:ankara('#1f4e8c','#f1c40f','#ffffff')},x:300,y:685,face:0,decor:true});
  // security post
  const sp=grp(); sp.add(bx(2.6,2.5,2.6,MAT.wall2,0,1.25,0), bx(3,.15,3,std('#8a8580'),0,2.6,0), bx(1.2,.7,.05,std('#22303a',{r:.1,m:.6}),0,1.5,-1.31)); const ss=sb2('MARKET SECURITY','#12355b',.35); ss.position.set(0,2.95,-1.33); ss.rotation.y=Math.PI; sp.add(ss); place(scene,sp,1345,350,0,[60,60]);
  // motor park: danfos, keke rank, okada, Mummy's keke (the ride home)
  for(const x of [250,370,490]){ const d=makeDanfo(); place(scene,d,x,1115,0,[44,104]); }
  const ps=grp(); ps.add(cyl(.07,.07,3,std('#888',{m:.8}),-1.6,1.5,0,8), cyl(.07,.07,3,std('#888',{m:.8}),1.6,1.5,0,8)); const pss=sb2('MOTOR PARK · KEKE & DANFO','#7a1f2b',.5); pss.position.y=3; ps.add(pss); place(scene,ps,620,1020,Math.PI);
  for(const x of [1000,1450]){ const k=makeKeke(false); place(scene,k,x,1150,Math.PI/2,[50,28]); }
  const ok=makeOkada(); const okr=makeHuman({sex:'m',skin:'#3b2416',top:'#f1c40f',bottom:'#222',longSleeve:true,label:'Okada rider'}); okr.position.y=.35; animHuman(okr,0,false,0,true); ok.add(okr); place(scene,ok,965,1045,Math.PI/2,[44,18]);
  const myKeke=makeKeke(true); myKeke.position.set(X(1150),0,Z(1140)); myKeke.rotation.y=Math.PI/2; myKeke.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); scene.add(myKeke); SOLIDS.push({x:1125,y:1127,w:50,h:28});
  OUTRO={obj:myKeke,p0:myKeke.position.clone(),dx:-1,dz:0,cam:[6,3.2,4.5],v:7,seats:[[.3,.51,.62,'kid'],[-.3,.25,.62,'mum']]};
  // poles, trees, billboard
  for(let x=-100;x<1700;x+=300) streetPole(scene,x,745);
  for(const x of [180,1270]){ const t=F.tree(); place(scene,t,x,985,0,[16,16]); }
  const bb=grp(); bb.add(cyl(.12,.12,5,std('#666',{m:.7}),0,2.5,0,8)); const bbs=sb2('STAY SAFE · HOLD YOUR CHILD\'S HAND','#c0392b',.9); bbs.position.y=5.2; bb.add(bbs); place(scene,bb,1050,990,0,[10,10]);
  // NPCs: key people (labelled) and crowd
  G_NPC.push({look:{sex:'m',skin:'#3b2416',top:'#2b3f66',bottom:'#1f2a40',hat:'cap',hatColor:'#1b2538',longSleeve:true,beard:true,label:'Security',vest:true,vestColor:'#ff7a00'},x:1300,y:240,face:Math.PI/2});
  G_NPC.push({look:{sex:'m',skin:'#5a3825',top:'#555',bottom:'#222',longSleeve:true,label:'Stranger'},x:610,y:440,face:Math.PI/2});
  G_NPC.push({look:{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:ankara('#8e44ad','#f1c40f','#ffffff'),topMap:ankara('#c0392b','#1f6b3a','#ffffff'),label:'Market woman'},x:900,y:190,face:Math.PI});
  G_NPC.push({look:{sex:'m',skin:'#3b2416',top:'#c0392b',bottom:'#2a2f3a',label:'Conductor'},x:620,y:1075,face:0,decor:true});
  for(const [x,y] of [[1000,600],[150,1030]]) G_NPC.push({look:crowdLook(Math.floor(x/7)),x,y,face:rnd(0,6),decor:true});
  addWalkers(scene,[[120,1380,232,55],[200,1300,262,48],[400,1380,215,40],[120,1380,452,52],[300,1400,478,60],[150,1100,440,45],[380,1150,620,45],[-200,1700,975,50],[-200,1700,725,58],[-100,1500,742,40]]);
  TICK.push(cullCrowd); TICK.push(occlude);
  xiFlush(scene);
}

// ---------- WATER WORLD (pool club + beach) ----------
function buildWater(scene){
  initU();
  WW=1500; WH=1000;
  const sand=xm('#e9d7ae',sandCv(),normalFrom(sandCv(),2),.97), wet=xm('#b9a37a',sandCv(),null,.6);
  const deck=xm('#ffffff',tileTex('#efe9dc','#e4dccb',6),null,.55), poolT=xm('#ffffff',tileTex('#8fd0e6','#7cc4de',16),null,.3), floorT=xm('#ffffff',tileTex('#6fbcd8','#62b2d0',16),null,.3);
  floorRect(scene,-500,575,2000,2600,sand,-.03,4); floorRect(scene,-500,880,2000,950,wet,-.02,4);
  floorRect(scene,-500,-500,2000,60,MAT.grass,-.02,3); floorRect(scene,-500,60,60,575,MAT.grass,-.02,3); floorRect(scene,900,60,2000,575,MAT.grass,-.02,3);
  const P={x1:200,y1:160,x2:700,y2:420};
  floorRect(scene,60,60,900,P.y1,deck,.006,1.2); floorRect(scene,60,P.y2,900,580,deck,.006,1.2); floorRect(scene,60,P.y1,P.x1,P.y2,deck,.006,1.2); floorRect(scene,P.x2,P.y1,900,P.y2,deck,.006,1.2);
  // pool basin: walls, two-level floor, step, lane lines, coping, water
  const W=X(P.x2-P.x1), D=Z(P.y2-P.y1), cx=X((P.x1+P.x2)/2), cz=Z((P.y1+P.y2)/2), mid=460;
  scene.add(bx(W,2,.06,poolT,cx,-1,Z(P.y1)), bx(W,2,.06,poolT,cx,-1,Z(P.y2)), bx(.06,2,D,poolT,X(P.x1),-1,cz), bx(.06,2,D,poolT,X(P.x2),-1,cz), bx(.06,.9,D,poolT,X(mid),-1.5,cz));
  floorRect(scene,P.x1,P.y1,mid,P.y2,floorT,-1.05,1); floorRect(scene,mid,P.y1,P.x2,P.y2,floorT,-1.95,1);
  for(let i=1;i<5;i++){ const ln=new THREE.Mesh(new THREE.PlaneGeometry(W-1.5,.22),std('#1b3f73',{r:.4})); ln.rotation.x=-Math.PI/2; const zz=Z(P.y1)+D*i/5; ln.position.set(cx,-1.04,zz); scene.add(ln); const l2=ln.clone(); l2.position.y=-1.94; l2.scale.x=.45; l2.position.x=X((mid+P.x2)/2); ln.scale.x=.48; ln.position.x=X((P.x1+mid)/2); scene.add(l2); }
  const cope=std('#f6f3ec',{r:.6}); scene.add(bx(W+.8,.06,.4,cope,cx,.03,Z(P.y1)-.2), bx(W+.8,.06,.4,cope,cx,.03,Z(P.y2)+.2), bx(.4,.06,D,cope,X(P.x1)-.2,.03,cz), bx(.4,.06,D,cope,X(P.x2)+.2,.03,cz));
  const pw=new THREE.Mesh(new THREE.PlaneGeometry(W,D),waterMat('#1d9cc4',4,2,.84,1)); pw.rotation.x=-Math.PI/2; pw.position.set(cx,-.15,cz); pw.renderOrder=2; scene.add(pw);
  SOLIDS.push({x:P.x1-4,y:P.y1-4,w:P.x2-P.x1+8,h:P.y2-P.y1+8});
  const fr=std('#d62828',{r:.5}), fw=std('#f4f4f4',{r:.5}); for(let y=P.y1+4;y<P.y2;y+=5) xi(((y/5)|0)%2?'fr':'fw',USPH,((y/5)|0)%2?fr:fw,M4(X(mid),-.13,Z(y),0,.07,.05,.07));
  for(let x=P.x1+4;x<P.x2;x+=5) for(const yy of [P.y1+87,P.y1+173]) xi(((x/5)|0)%2?'fb':'fw',USPH,((x/5)|0)%2?std('#1f4e8c'):fw,M4(X(x),-.13,Z(yy),0,.06,.045,.06));
  const st=std('#d7dbde',{r:.2,m:.95}); for(const y of [180,400]) for(const dz of [-.25,.25]){ scene.add(cyl(.025,.025,1.9,st,X(P.x2)-.12,-.1,Z(y)+dz,8)); const tp=cyl(.025,.025,.5,st,X(P.x2)+.12,.85,Z(y)+dz,8); tp.rotation.z=Math.PI/2; scene.add(tp); }
  const dm=(txt,x,y)=>{ const d=new THREE.Mesh(new THREE.PlaneGeometry(.8,.35),new THREE.MeshBasicMaterial({map:tex(mkCanvas(128,56,(c)=>{ c.fillStyle='#1b4f72'; c.font='bold 40px system-ui'; c.textAlign='center'; c.fillText(txt,64,44); })),transparent:true})); d.rotation.x=-Math.PI/2; d.position.set(X(x),.065,Z(y)); scene.add(d); };
  dm('1.0 m',230,152); dm('1.0 m',230,428); const shs=sb2('SHALLOW END · 1.0 m','#1b4f72',.32); shs.position.set(X(110),1.6,Z(160)); shs.rotation.y=Math.PI/2; scene.add(shs); scene.add(cyl(.04,.04,1.6,st,X(105),.8,Z(160),8));
  // clubhouse, walls, loungers, lifeguard chair
  const cm=std('#d9ecf2',{r:.9}); cm.map=tex(TX.plaster,6,1); scene.add(bx(X(600),3.4,8,cm,X(380),1.7,Z(55)-4)); scene.add(bx(X(600)+.02,.7,8.02,std('#2e86c1',{r:.6}),X(380),.35,Z(55)-4));
  for(const x of [110,210,330,400,470,640]) scene.add(bx(1.4,.9,.06,std('#22303a',{r:.1,m:.6}),X(x),2.1,Z(55))); scene.add(bx(X(610),.25,8.6,std('#2e86c1',{r:.5}),X(380),3.5,Z(55)-4)); SOLIDS.push({x:80,y:-200,w:600,h:255});
  const cs=sb2('SPLASH SWIM CLUB','#2e86c1',.6); cs.position.set(X(380),2.8,Z(55)+.03); scene.add(cs);
  for(const [x,lab] of [[160,'BOYS'],[260,'GIRLS'],[560,'SNACKS']]){ scene.add(bx(1.2,2.1,.06,std(lab==='SNACKS'?'#22303a':'#7a5230',{r:.5}),X(x),1.05,Z(55))); const s=sb2(lab,'#12355b',.22); s.position.set(X(x),2.3,Z(55)+.04); scene.add(s); }
  wall(scene,60,580,900,580,{h:1.0,t:6,mat:MAT.wall,gaps:[[400,520]]}); wall(scene,900,60,900,580,{h:1.0,t:6,mat:MAT.wall}); wall(scene,60,55,60,580,{h:1.0,t:6,mat:MAT.wall});
  const lounger=()=>{ const g=grp(), m=std('#f4f4f4',{r:.4}); g.add(bx(.65,.08,1.3,m,0,.35,.25)); const b=bx(.65,.08,.7,m,0,.6,-.6); b.rotation.x=-.7; g.add(b); for(const [x,z] of [[-.28,.8],[.28,.8],[-.28,-.3],[.28,-.3]]) g.add(bx(.05,.33,.05,m,x,.17,z)); g.add(bx(.55,.05,1.1,std('#2e86c1',{r:.9}),0,.42,.25)); return g; };
  for(const x of [110,170,560,700,770,840]) place(scene,lounger(),x,545,0,[16,38]);
  const lc=grp(); const wm=std('#f4f4f4',{r:.5}); for(const [x,z] of [[-.35,-.35],[.35,-.35],[-.35,.35],[.35,.35]]) lc.add(bx(.07,1.8,.07,wm,x,.9,z)); lc.add(bx(.8,.08,.8,wm,0,1.8,0), bx(.8,.7,.08,wm,0,2.2,.38)); for(let i=0;i<5;i++) lc.add(bx(.7,.05,.06,wm,0,.3+i*.32,-.38)); const lcu=umbrella(['#d62828','#ffffff'],1,2.9); lc.add(lcu); place(scene,lc,860,330,-Math.PI/2,[22,22]);
  umbI(140,540,['#2e86c1','#ffffff'],1.4,2.3,false); umbI(735,545,['#2e86c1','#ffffff'],1.4,2.3,false);
  // kids in the pool (decor), friend in trouble (mission)
  for(const [x,y,i] of [[260,250,1],[330,330,2]]){ const k=makeHuman({...crowdLook(i),height:.6,dress:false,outfit:'shirt',top:['#f1c40f','#e74c3c','#3498db'][i-1],bottom:'#1f2a40',gele:null,hair:'low'}); k.position.set(X(x),-.82,Z(y)); k.userData.decor=true; DECOR_H.push(k); scene.add(k); TICK.push(t=>animHuman(k,t*3+i,false,t)); }
  const fr2=makeHuman({sex:'f',skin:'#5a3825',top:'#e91e63',bottom:'#e91e63',hair:'braids',height:.62,label:'Your friend'}); fr2.position.set(X(540),-.95,Z(220)); scene.add(fr2);
  const spl=new THREE.Mesh(new THREE.RingGeometry(.3,.55,24),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.6,depthWrite:false})); spl.rotation.x=-Math.PI/2; spl.position.set(X(540),-.13,Z(220)); scene.add(spl);
  TICK.push(t=>{ const u=fr2.userData; if(!u.arms) return; u.arms.forEach((a,i)=>{ a.sh.rotation.x=-2.6+Math.sin(t*6+i*2)*.5; a.el.rotation.x=.3; }); fr2.position.y=-.95+Math.sin(t*4)*.06; const s=1+((t*1.5)%1)*.8; spl.scale.set(s,s,1); spl.material.opacity=.6*(1-(t*1.5)%1); if(u.label) u.label.visible=true; });
  // beach: sea, foam, umbrellas, huts, tower, flags, boat
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(X(2600),X(1700)),waterMat('#2c8aa6',40,26,.96,2.2)); sea.rotation.x=-Math.PI/2; sea.position.set(X(750),.03,Z(935)+X(850)); scene.add(sea);
  SOLIDS.push({x:-500,y:935,w:2600,h:1000});
  const foamCv=mkCanvas(512,64,(c,w,h)=>{ for(let i=0;i<900;i++){ c.fillStyle=`rgba(255,255,255,${rnd(.2,.9)})`; const x=rnd(0,w), y=h/2+Math.sin(x/30)*8+rnd(-10,10)*Math.random(); c.beginPath(); c.arc(x,y,rnd(1,4),0,7); c.fill(); } });
  const foams=[0,1,2,3].map(i=>{ const m=new THREE.MeshBasicMaterial({map:tex(foamCv,12,1),transparent:true,depthWrite:false,opacity:.8}); const f=new THREE.Mesh(new THREE.PlaneGeometry(X(2600),i?1.4:2),m); f.rotation.x=-Math.PI/2; f.position.set(X(750),.05,Z(935)); scene.add(f); return f; });
  TICK.push(t=>{ foams.forEach((f,i)=>{ if(i===0){ f.position.z=Z(938)+Math.sin(t*.9)*.5; f.material.opacity=.75+Math.sin(t*.9)*.2; return; } const ph=((t*.12+i/3)%1); f.position.z=Z(935)+(1-ph)*12; f.material.opacity=Math.sin(ph*Math.PI)*.85; f.material.map.offset.x=i*.3+t*.004; }); });
  const UC=[['#d62828','#f4f4f4'],['#f1c40f','#1f6b3a'],['#2e86c1','#f4f4f4'],['#e67e22','#ffffff']];
  const spots=[[200,630],[330,640],[600,650],[700,700],[160,780],[300,820],[1060,650],[1150,700],[1300,700],[480,690],[920,660]];
  spots.forEach(([x,y],i)=>{ umbI(x,y,UC[i%4],1.5,2.2); if(i%2===0){ const ch=grp(); const m=std(['#f4f4f4','#2e86c1','#f1c40f'][i%3],{r:.5}); ch.add(bx(.5,.06,.5,m,0,.42,0), bx(.5,.5,.06,m,0,.65,.24)); for(const [a,b] of [[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]]) ch.add(bx(.04,.42,.04,m,a,.21,b)); ch.userData.decor=true; place(scene,ch,x+20,y+12,rnd(0,6)); } });
  const hut=(x,y,lab)=>{ const g=grp(), wd=std('#8a6440',{r:.9}); g.add(bx(4,1.1,2.5,wd,0,.55,0)); for(const [a,b] of [[-1.9,-1.2],[1.9,-1.2],[-1.9,1.2],[1.9,1.2]]) g.add(cyl(.07,.07,2.7,wd,a,1.35,b,6));
    const r=new THREE.Mesh(new THREE.ConeGeometry(3.4,1.4,4,1),std('#b8955a',{r:1})); r.position.y=3.3; r.rotation.y=Math.PI/4; r.scale.z=.75; r.castShadow=true; g.add(r); const s=sb2(lab,'#7a1f2b',.4); s.position.set(0,2.35,1.3); g.add(s); place(scene,g,x,y,0,[84,56]); };
  hut(1080,610,'COCONUT & ZOBO'); hut(1260,610,'SUYA SPOT'); hut(1430,610,'BEACH BAR');
  const tw=grp(), rw=std('#f4f4f4',{r:.6}), rr=std('#d62828',{r:.5}); for(const [a,b] of [[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]]) tw.add(bx(.12,2.6,.12,rw,a,1.3,b)); tw.add(bx(2.6,.12,2.6,rw,0,2.6,0), bx(2.4,1.1,2.4,rr,0,3.2,.1), bx(2.6,.1,2.8,rw,0,3.8,0));
  tw.add(bx(1.8,.6,.05,std('#22303a',{r:.1,m:.6}),0,3.25,-1.12)); for(let i=0;i<8;i++) tw.add(bx(.8,.05,.1,rw,0,.3+i*.31,-1.3-i*.06)); const tws=sb2('LIFEGUARD','#d62828',.4); tws.position.set(0,4.15,-1.3); tw.add(tws); place(scene,tw,880,880,0,[56,56]);
  const flag=(x,y,cols,h=4)=>{ const g=grp(); g.add(cyl(.04,.04,h,std('#ddd',{m:.8,r:.3}),0,h/2,0,8)); const f=new THREE.Mesh(new THREE.PlaneGeometry(1,.7,8,1),std('#fff',{map:tex(mkCanvas(64,44,(c)=>{ c.fillStyle=cols[0]; c.fillRect(0,0,64,44); if(cols[1]){ c.fillStyle=cols[1]; c.beginPath(); c.moveTo(0,44); c.lineTo(64,0); c.lineTo(64,44); c.fill(); } })),side:THREE.DoubleSide,r:.8}));
    f.position.set(.52,h-.4,0); g.add(f); f.userData.keep=true; const pos=f.geometry.attributes.position, b0=Float32Array.from(pos.array); TICK.push(t=>{ for(let i=0;i<pos.count;i++){ const xx=b0[i*3]; pos.setZ(i,Math.sin(t*5+xx*4)*.08*(xx+.5)); } pos.needsUpdate=true; }); place(scene,g,x,y,0,[8,8]); return g; };
  flag(620,915,['#f1c40f','#d62828']); flag(860,915,['#f1c40f','#d62828']); flag(1200,890,['#d62828'],5); flag(880,880,['#d62828'],5.2).position.y=1.4;
  const ds=grp(); ds.add(cyl(.05,.05,2.2,std('#9aa0a6',{m:.8}),-.9,1.1,0,8), cyl(.05,.05,2.2,std('#9aa0a6',{m:.8}),.9,1.1,0,8)); const dss=sb2('DANGER · NO SWIMMING','#d62828',.4); dss.position.y=2.1; ds.add(dss); place(scene,ds,1250,840,Math.PI,[10,10]);
  for(const [x,y] of [[690,985],[790,1010]]){ const s=makeHuman({...crowdLook(x),dress:false,outfit:'shirt',gele:null,hair:'low',top:'#333'}); s.position.set(X(x),-.95,Z(y)); s.userData.decor=true; DECOR_H.push(s); scene.add(s); TICK.push(t=>{ s.position.y=-.95+Math.sin(t*1.6+x)*.08; animHuman(s,0,false,t); }); }
  // boat (canoe with outboard), life jackets
  const boat=grp(); const hs=new THREE.Shape([[0,-3.2],[.8,-1.8],[.95,0],[.85,2.4],[0,2.6],[-.85,2.4],[-.95,0],[-.8,-1.8]].map(([x,y])=>new THREE.Vector2(x,y)));
  const outline=[[0,-3.2],[.8,-1.8],[.95,0],[.85,2.4],[0,2.6],[-.85,2.4],[-.95,0],[-.8,-1.8]]; hs.holes.push(new THREE.Path(outline.slice().reverse().map(([x,y])=>new THREE.Vector2(x*.88,y*.93))));
  const hg=new THREE.ExtrudeGeometry(hs,{depth:.7,bevelEnabled:false}); hg.rotateX(Math.PI/2); hg.translate(0,.8,0); boat.add(mesh(hg,std('#1f6fb2',{r:.6,side:THREE.DoubleSide})));
  const inner=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(x*.9,y*.94)))),std('#8a6440',{r:.9,side:THREE.DoubleSide})); inner.rotation.x=Math.PI/2; inner.position.y=.3; boat.add(inner); boat.add(bx(1.9,.06,.1,std('#f4f4f4',{r:.5}),0,.82,0));
  for(const z of [-1,.6,1.8]) boat.add(bx(1.6,.08,.3,std('#6b4a2b',{r:.9}),0,.75,z)); boat.add(bx(.35,.6,.4,std('#222',{r:.4,m:.4}),0,1,2.75), cyl(.05,.05,.7,std('#555',{m:.8}),0,.45,2.85,8));
  const bn=sb2('SAFE RIDE','#1f6fb2',.22); bn.position.set(.97,.6,0); bn.rotation.y=Math.PI/2; boat.add(bn);
  boat.rotation.y=Math.PI; boat.position.set(X(1380),0,Z(905)); boat.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); scene.add(boat); SOLIDS.push({x:1358,y:850,w:44,h:120});
  OUTRO={obj:boat,p0:boat.position.clone(),dx:0,dz:1,cam:[4,4.5,-9],v:6,jacket:true,seats:[[.35,.22,0,'kid'],[-.35,-.04,-1,'mum']]};
  TICK.push(t=>{ if(S&&S.phase==='outro') boat.position.y=Math.sin(t*2)*.08; });
  const jr=grp(); jr.add(bx(1.6,.08,.08,std('#6b4a2b'),0,1.4,0)); for(const x of [-.75,.75]) jr.add(bx(.08,1.4,.08,std('#6b4a2b'),x,.7,0)); for(let i=0;i<4;i++) jr.add(bx(.32,.45,.12,std('#ff6a00',{r:.6}),-.5+i*.33,1.1,0)); place(scene,jr,1440,830,Math.PI/2,[10,34]);
  // palms
  for(let x=-200;x<1800;x+=150){ if(x>60&&x<900) continue; place(scene,F.palm(),x,590,rnd(0,3)).userData.decor=true; }
  for(const [x,y] of [[30,700],[1000,560],[1480,720]]) place(scene,F.palm(),x,y,rnd(0,3)).userData.decor=true;
  // NPCs
  G_NPC.push({look:{sex:'m',skin:'#3b2416',top:'#d62828',bottom:'#f1c40f',label:'Lifeguard',hat:'cap',hatColor:'#d62828'},x:850,y:380,face:0});
  G_NPC.push({look:{sex:'m',skin:'#4a2e1e',top:'#d62828',bottom:'#f1c40f',label:'Beach lifeguard',hat:'cap',hatColor:'#ffffff'},x:820,y:850,face:Math.PI});
  G_NPC.push({look:{sex:'m',skin:'#2e1c12',top:'#f4f4f4',bottom:'#2b3a55',label:'Boat man',beard:true,vest:true,vestColor:'#ff6a00'},x:1330,y:860,face:Math.PI/2});
  G_NPC.push({look:{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:ankara('#e67e22','#1f6b3a','#ffffff'),topMap:ankara('#1f4e8c','#f1c40f','#ffffff'),label:'Coconut seller'},x:1080,y:670,face:Math.PI,decor:true});
  for(const [x,y] of [[640,760],[300,870]]) G_NPC.push({look:crowdLook(Math.floor(x/9)),x,y,face:rnd(0,6),decor:true});
  addWalkers(scene,[[100,1300,922,40]]);
  TICK.push(cullCrowd); TICK.push(occlude);
  xiFlush(scene);
}

// ---------- ONLINE WORLD (a home with phones, tablets and computers) ----------
function buildOnline(scene){
  initU();
  WW=1200; WH=950;
  bigGround(scene,MAT.grass,150);
  floorRect(scene,40,40,1160,910,MAT.pavers,.004,1.6);
  floorRect(scene,80,80,1100,640,MAT.tiles,.008,1.2); floorRect(scene,80,80,460,360,MAT.wood,.01,1.5); floorRect(scene,80,360,460,640,MAT.wood,.01,1.5); floorRect(scene,460,400,1100,640,MAT.tiles3,.01,1);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(4,2.6),std('#fff',{map:tex(ankara('#7a1f2b','#f1c40f','#1f6b3a'),2,1),r:.95})); rug.rotation.x=-Math.PI/2; rug.position.set(X(700),.014,Z(190)); scene.add(rug);
  // compound wall, gate, house walls (cutaway)
  const bw={h:2.4,t:10,mat:MAT.block}; wall(scene,40,40,1160,40,bw); wall(scene,40,40,40,910,bw); wall(scene,1160,40,1160,910,bw); wall(scene,40,910,1160,910,{...bw,gaps:[[560,660]]});
  const gate=grp(); for(let i=0;i<15;i++) gate.add(bx(.04,2,.04,std('#1d1f22',{r:.5,m:.7}),i*.33,1,0)); gate.add(bx(5,.08,.08,std('#1d1f22'),2.3,.1,0), bx(5,.08,.08,std('#1d1f22'),2.3,1.95,0)); place(scene,gate,562,912,0); SOLIDS.push({x:560,y:905,w:100,h:10});
  const hw={h:1.35,t:6,mat:MAT.wall3};
  wall(scene,80,80,1100,80,hw); wall(scene,80,80,80,640,hw); wall(scene,1100,80,1100,640,hw); wall(scene,80,640,1100,640,{...hw,gaps:[[560,640]]});
  wall(scene,460,80,460,640,{...hw,gaps:[[200,270],[470,540]]}); wall(scene,80,360,460,360,{...hw,gaps:[[240,310]]}); wall(scene,460,400,1100,400,{...hw,gaps:[[600,720],[900,1000]]});
  scene.add(bx(X(120),.12,Z(70),std('#8a8580'),X(600),2.6,Z(675))); for(const x of [550,650]) scene.add(cyl(.08,.08,2.6,MAT.cope,X(x),1.3,Z(705),10));
  // bedroom
  place(scene,F.bed(),150,150,0,[32,44]); place(scene,F.wardrobe(),420,105,Math.PI,[26,14]);
  const dk=grp(); dk.add(F.desk()); deviceProp(dk,'laptop',wa('Chat',[{t:'Hi! I am 12 too 😊'},{t:'Send me your photo…'}],{w:448,h:280}),{noTable:true,h:.72}); place(scene,dk,330,200,0,[24,14]); place(scene,F.chair(),330,222,0);
  const tb=grp(); tb.add(bx(.45,.5,.4,std('#7a5230',{r:.7}),0,.25,0)); deviceProp(tb,'phone',wa('Primary 5B group',[{t:'Nobody likes you 😂'},{t:'Don\'t come tomorrow'}]),{noTable:true,h:.47}); place(scene,tb,105,230,0,[12,12]);
  const pst=grp(); pst.add(bx(.04,.6,.8,std('#ffffff',{map:tex(mkCanvas(128,96,(c)=>{ c.fillStyle='#2e86c1'; c.fillRect(0,0,128,96); c.fillStyle='#fff'; c.font='bold 16px system-ui'; c.fillText('THINK',10,30); c.fillText('BEFORE YOU',10,55); c.fillText('CLICK!',10,80); }))}),0,1,0)); place(scene,pst,86,300,0);
  // study
  place(scene,F.shelf(),140,375,Math.PI,[30,12]); place(scene,F.shelf(),380,375,Math.PI,[30,12]);
  const sd=grp(); sd.add(F.desk()); deviceProp(sd,'monitor',textCv([{t:'Maths homework: page 12'}],{w:448,h:280,title:'Homework',bar:'#1f6b3a',bg:'#fafafa'}),{noTable:true,h:.72}); place(scene,sd,270,610,Math.PI,[24,14]); place(scene,F.chair(),270,588,Math.PI);
  // living room: TV, sofa, computer corner, router
  const tv=F.tv(); place(scene,tv,700,95,Math.PI,[34,12]); const tvs=new THREE.Mesh(new THREE.PlaneGeometry(1.24,.69),screenMat(mkCanvas(256,144,(c,w,h)=>{ const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#5dade2'); g.addColorStop(1,'#a9dfbf'); c.fillStyle=g; c.fillRect(0,0,w,h); c.fillStyle='#f4d03f'; c.beginPath(); c.arc(200,35,18,0,7); c.fill(); c.fillStyle='#27ae60'; c.fillRect(0,110,w,34); c.fillStyle='#e74c3c'; c.beginPath(); c.arc(90,95,20,0,7); c.fill(); c.fillStyle='#fff'; c.font='bold 16px system-ui'; c.fillText('CARTOON TIME',70,30); })));
  tvs.position.set(X(700),.92,Z(95)+.04); scene.add(tvs);
  place(scene,F.sofa(),700,265,0,[44,18]); place(scene,F.table(),700,195,0,[32,18]); scene.add(bx(.3,.2,.03,std('#151515'),X(700)+.2,.82,Z(195)));
  const cd=grp(); cd.add(F.desk()); deviceProp(cd,'monitor',textCv([{t:'Win a new phone!'},{t:'Type your school and address'}],{w:448,h:280,title:'win-big-prize.xyz',bar:'#8e44ad',bg:'#fff8e6'}),{noTable:true,h:.72}); place(scene,cd,1050,170,-Math.PI/2,[14,24]); place(scene,F.chair(),1028,170,-Math.PI/2);
  const rt=grp(); rt.add(bx(.3,.06,.2,std('#f4f4f4',{r:.4}),0,1.2,0)); for(const x of [-.1,.1]) rt.add(cyl(.01,.01,.2,std('#222'),x,1.33,0,4)); rt.add(bx(.04,1.2,.04,std('#7a5230'),0,.6,0)); rt.userData.decor=true; place(scene,rt,1080,330,0);
  place(scene,F.shelf(),900,95,Math.PI,[30,12]);
  // dining & hall
  const dt=grp(); dt.add(F.table()); for(const z of [-.65,.65]) for(const x of [-.5,.5]){ const c=F.chair('#7a5230'); c.position.set(x,0,z); c.rotation.y=z>0?0:Math.PI; dt.add(c); } place(scene,dt,820,520,0,[34,30]);
  place(scene,F.fridge(),1070,600,-Math.PI/2,[18,18]);
  const pic=(x,y,c)=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(.7,.5),std('#fff',{map:tex(ankara(c,'#f1c40f','#ffffff')),r:.6})); p.position.set(X(x),1.0,Z(y)); scene.add(p); };
  pic(800,85.5,'#1f6b3a'); pic(250,85.5,'#7a1f2b');
  // compound
  place(scene,F.car('#7b8a8b'),300,780,Math.PI/2,[100,46]); place(scene,F.generator(),1050,820,0,[50,30]);
  const bench=grp(); bench.add(bx(1.6,.08,.45,std('#7a5230'),0,.45,0)); for(const x of [-.7,.7]) bench.add(bx(.08,.45,.4,std('#5a3a1f'),x,.22,0)); place(scene,bench,960,700,0,[32,10]);
  for(const [x,y] of [[80,880],[1120,80],[1120,880],[80,80]]) place(scene,F.palm(),x,y,rnd(0,3)).userData.decor=true;
  for(const [x,y] of [[200,700],[900,880]]) place(scene,F.tree(),x,y,0,[16,16]);
  for(let i=0;i<6;i++){ const w=rnd(10,15),h=rnd(4,8); const m=std(['#e8d9b8','#d7e3e8','#f0e0d0'][i%3],{r:.92}); m.map=tex(TX.plaster,w/4,h/4); const hs=bx(w,h,9,m,-6+i*14,h/2,Z(950)+12); hs.userData.decor=true; scene.add(hs); }
  // NPCs
  G_NPC.push({look:{sex:'f',skin:'#5a3825',dress:true,outfit:'dress',hair:'none',gele:ankara('#f1c40f','#c0392b','#ffffff'),topMap:ankara('#1f6b3a','#f1c40f','#ffffff'),label:'Mummy'},x:870,y:470,face:Math.PI});
  G_NPC.push({look:{sex:'m',skin:'#5a3825',top:'#e67e22',bottom:'#2a2f3a',height:.6,label:'Little brother'},x:640,y:300,face:0,decor:true});
  OUTRO={obj:null,seats:[]};
  xiFlush(scene);
}

// ================== RENDER ==================
function render3D(dt){
  const {scene,camera}=G, t=S.t, p=S.p, P=new THREE.Vector3(X(p.x),0,Z(p.y));
  G.sun.position.set(P.x+16,38,P.z+10); G.sun.target.position.copy(P);
  const pl=G.player; pl.position.copy(P); pl.rotation.y=p.face; animHuman(pl,p.step,p.moving&&!paused,t); pl.visible=!firstPerson && S.phase!=='ride' && !XR.active;
  if(S.phase==='outro'&&OUTRO&&OUTRO.obj){ pl.visible=false; const o=OUTRO.obj.position, c=OUTRO.cam; camera.position.set(o.x+c[0],c[1],o.z+c[2]); camera.lookAt(o.x,1,o.z); }
  else if(S.phase==='ride'){ const v=VEH.find(v=>v.bus); const bp=new THREE.Vector3(X(v.x),0,Z(LANES.B.y)); camera.position.set(bp.x+3,4,bp.z+9); camera.lookAt(bp.x,1.5,bp.z); }
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
  if(TICK.length) TICK.forEach(f=>f(t,dt||0));
  SLRoom.render(scene,t);
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
  const left=S.items.filter(i=>i.h&&!i.done); const doneQ=MISS.filter(m=>m.id in S.results).length; if(left.length && (WORLD==='home'? doneQ>=5 && !('gate' in S.results) : WORLD==='school'? MISS.filter(m=>m.q).every(m=>m.id in S.results) : doneQ>=3)){ const dmin=Math.min(...left.map(i=>dist(S.p.x,S.p.y,i.x,i.y))); $('hint2').classList.remove('hidden'); $('hint2').textContent= dmin<120?'🔥 Hot! A danger is very close':dmin<300?'🌡️ Warm, keep looking':'❄️ Cold, look somewhere else'; } else $('hint2').classList.add('hidden');
}

// ================== LOOP & INPUT ==================
let last=performance.now(), hudT=0;
function tick(now){ const dt=Math.min(.05,(now-last)/1000); last=now; if(G&&S){ if(!started) renderIntro(now/1000); else { if(!paused) SL.fps.tick(dt); if(!paused&&!S.over) update(dt); render3D(dt); hudT+=dt; if(hudT>.12){ hudT=0; drawHUD(); } } } }
function loop(now){ if(!XR.active) tick(now); requestAnimationFrame(loop); }
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
  const m=openModal(`<div class="row" style="justify-content:space-between"><a class="btnlink" href="index.html">◀ All games</a><span class="pill">For children 6–12</span>${CLASS_FROM_URL?`<span class="pill">🏷️ Class: ${esc(CLASS_FROM_URL)}</span>`:''}</div>
    ${worldCards()}
    <h1 style="margin:.4em 0 .1em">${DATA.icon} ${esc(DATA.title)}</h1><p class="muted">${esc(DATA.intro)}</p>
    <p><b>Your name</b></p><input id="nm" maxlength="24" placeholder="e.g. Ada" value="${esc(kid.name || SL.lms.studentName().split(' ')[0])}">
    <p><b>Class or family code</b> <span class="muted">(optional, from your teacher)</span></p><input id="cls" maxlength="20" placeholder="e.g. PRY4-B" value="${esc(kidClass)}">
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
  m.querySelector('#start').onclick=()=>{ if(!SL.consent.ok()){ const c=m.querySelector('.consent'); c.style.outline='3px solid var(--bad)'; c.scrollIntoView({block:'center'}); toast(tr('Please ask a parent or teacher to tick the privacy box.'),'bad'); return; } ensureAudio(); kid.name=(m.querySelector('#nm').value.trim()||'Safety Star').slice(0,24); kidClass=cleanClass(m.querySelector('#cls').value); resetDynamic(); S.lastDone=performance.now(); started=true; closeModal(); setHud(true);
    if(SLRoom.code) SLRoom.start({name:kid.name, game:WORLD, state:()=>({x:S.p.x, y:S.p.y, yaw:S.p.face||0, zone:(S.guide&&S.guide.target&&S.guide.target.name)||'', score:S.stars}), onEvent:t=>toast('🎓 '+tr(SLRoom.eventName(t)),'warn')}).then(ok=>ok&&toast('👥 Group session '+SLRoom.code));
    toast(DATA.welcome?DATA.welcome(kid.name):WORLD==='home'?'☀️ Good morning, '+kid.name+'! Follow Mummy and the yellow arrows.':'🏫 Welcome to school, '+kid.name+'! Follow your teacher and the yellow arrows.'); speak(DATA.intro); };
}
window.addEventListener('load',()=>{
  if(!window.THREE){ $('loading').innerHTML='Could not load the 3D engine. Please check your internet connection.'; return; }
  try{ newGame(); initScene(); spawnNPCs(); }catch(err){ $('loading').textContent='Your device could not start 3D.'; console.error(err); return; }
  $('loading').remove(); document.title=DATA.title; bindInput(); showStart();
  XR.setup(G.renderer, G.scene, G.camera, { frame: tick, getPlayer: () => S.p, getYaw: () => yaw,
    onTeleport: (x, y) => { if (!started || paused || S.over || S.phase !== 'play' || blocked(x, y, 10)) return;
      S.p.x = x; S.p.y = y; setTimeout(() => { if (XR.active && S.near && !paused) doAct(); }, 400); } });
  requestAnimationFrame(loop);
});
