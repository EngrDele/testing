// ================== WAREHOUSE SHIFT (warehouse.html) ==================
// A safety induction for a new warehouse associate on their first shift at a Lagos distribution centre.
// Built into warehouse.html by src/build.py (src/warehouse-shell.html + common.js + room.js + engine.js + this file).
// Look: a clean, light "logistics dashboard" — an isometric-style 3D yard (narrow-FOV camera from high up, flat matte
// materials, soft shadows, lavender fog) with white rounded cards on top: top bar, KPI tiles, inspect panel, shift stepper
// and a tabbed live list (docks / forklifts / trucks / hazards). On a phone the cards collapse into a bottom sheet.
// World units are METRES (x east, z south, y up). People and vehicles face -Z; to face (dx,dz) use rotation.y=atan2(-dx,-dz).
// Sections: HELPERS → DATA → MAP → STATE → AUDIO → 3D SETUP → WORLD BUILD → PEOPLE & VEHICLES → ACTORS → ENTITIES →
//   PATHFINDING → CAMERA → UI → STATIONS → HAZARDS → EVENTS → END → UPDATE → INPUT → START → TEST HOOK
// Test hook: window.WH (see the end of the file).

// ================== HELPERS ==================
const fill=(s,...a)=>String(s).replace(/\{(\d)\}/g,(_,i)=>a[+i]!=null?a[+i]:'');
const L=(s,...a)=>fill(tr(s),...a);
const T=s=>esc(tr(s));
const NT=s=>`<span data-notr>${esc(s)}</span>`;
const HSE_WA=(SL.QS.get('hse')||'').replace(/[^0-9]/g,''), HSE_MAIL=(SL.QS.get('email')||'').trim();
if(!SL.store.get('settings',null)) SL.settings.voice=false;   // adults: read-aloud off by default
const PHONE=()=>innerWidth<=760;
const hhmm=(d=new Date())=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const IC={
  cube:'<path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  shield:'<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  rotl:'<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  rotr:'<path d="M20.5 12a8.5 8.5 0 1 1-2.8-6.3l2.8 2.8"/><path d="M20.5 3.5v5h-5"/>',
  home:'<path d="M3 11 12 3.5l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>', chev:'<path d="m9 6 6 6-6 6"/>', check:'<path d="m5 12.5 4.5 4.5L19 7"/>',
  forklift:'<path d="M3 17V9h6l3 4v4"/><path d="M15 3.5V17h6.5"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="11" cy="17.5" r="2"/><path d="M3 9V5.5h4"/>',
  truck:'<path d="M2 6h11v10H2zM13 9.5h4.5l3.5 3.5v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/>',
  dock:'<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-9h10v9M7 15h10M7 18h10"/>',
  box:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  rack:'<path d="M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m9 21 3-7 3 3v4M6.5 12l3.5-4 4 1 3 3M10 8l-1 5"/>',
  gate:'<path d="M4 21V5h3v16M17 21V5h3v16M7 9h10M7 13h10"/>',
  battery:'<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>',
  fire:'<path d="M12 3c1 4 5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3 2-4.5 2-7.5 2 1 3.5 3 3.5 5.5"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  pin:'<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  list:'<path d="M8.5 6H21M8.5 12H21M8.5 18H21M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  play:'<path d="M7 4.5v15l12-7.5z"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag:'<path d="M20 12.5 12.5 20 3.5 11V3.5H11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>',
  msg:'<path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  exit:'<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const icon=(n,cls='')=>`<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;

// ================== DATA ==================
const STEPS=[
  {id:'gate',t:'Gate & PPE',ic:'gate'}, {id:'receive',t:'Receiving dock',ic:'truck'}, {id:'flcheck',t:'Forklift check',ic:'forklift'},
  {id:'racking',t:'Put-away & racking',ic:'rack'}, {id:'picking',t:'Picking',ic:'box'}, {id:'battery',t:'Battery charging',ic:'battery'},
  {id:'dispatch',t:'Loading & dispatch',ic:'layers'}, {id:'emergency',t:'Emergency',ic:'fire'},
];
const WHO={
  sani:{n:'Mallam Sani',r:'Gate security',c:'#6b7090'}, bisi:{n:'Bisi',r:'HSE officer',c:'#2a55e5'},
  chidi:{n:'Chidi',r:'Forklift operator',c:'#e39a12'}, emeka:{n:'Oga Emeka',r:'Shift supervisor',c:'#16935c'},
  ngozi:{n:'Ngozi',r:'Senior picker',c:'#c2417a'},
};
// Each station: where you stand (x,z), where Bisi waits (host), and its questions (Q). Several stations may share a step.
const STATIONS=[
  {id:'gate',step:0,x:-24,z:25.2,host:[-23.4,23.6],name:'Gatehouse',hint:'Sign in at the gatehouse and collect your PPE.',qs:['ppe','visitor']},
  {id:'receive',step:1,x:-11.9,z:1,host:[-12.9,0.5],name:'Receiving dock',hint:'Watch the truck reverse into Bay 1 from the safe viewing point.',qs:['reverse','trailer']},
  {id:'flcheck',step:2,x:-14.7,z:-10.1,host:[-14.9,-11.6],name:'Forklift check',hint:'Do the pre-use check on forklift FL-03 with Bisi.',check:true,qs:['forks']},
  {id:'racking',step:3,x:-8.4,z:-14.3,host:[-9.8,-14.9],name:'Put-away & racking',hint:'Bisi wants to show you a damaged rack upright.',qs:['upright','loadsign']},
  {id:'picking',step:4,x:-0.6,z:-14.3,host:[-1.8,-14.9],name:'Picking',hint:'Pick a heavy carton from rack R2 with Ngozi.',qs:['pick']},
  {id:'house',step:4,x:5.0,z:-14.3,host:[3.8,-14.9],name:'Housekeeping',hint:'Something is wrong further down the pick aisle.',qs:['house']},
  {id:'battery',step:5,x:13.6,z:-14.6,host:[12.6,-15.6],name:'Battery charging',hint:'Visit the battery charging bay.',qs:['battery']},
  {id:'dispatch',step:6,x:11.8,z:1,host:[12.9,0.5],name:'Loading & dispatch',hint:'Check the truck being loaded at Bay 3.',qs:['load']},
  {id:'emergency',step:7,x:-12.3,z:-14.3,host:[-12.9,-15.1],name:'End-of-shift briefing',hint:'Meet Oga Emeka for the end-of-shift briefing.',qs:['alarm'],alarm:true},
];
const Q={
  ppe:{who:'sani',q:'Welcome to Lagos DC! Before you go onto the warehouse floor, which PPE do you need?',o:[
    {t:'Only a face cap. It is hot inside.',why:'A face cap will not protect your head from falling stock, and drivers will not see you without hi-vis.'},
    {t:'Hi-vis vest and safety boots everywhere, and a hard hat in the racking aisles.',ok:1,why:'Hi-vis makes you visible to forklift and truck drivers, boots protect your feet from pallets and wheels, and a hard hat protects you from falling stock under high racking.'},
    {t:'PPE is only for forklift drivers, not for pickers.',why:'Everyone on the warehouse floor shares the space with forklifts and trucks, so everyone wears the PPE.'}]},
  visitor:{who:'sani',q:'A visitor from head office signs in at the gate. Where is the visitor allowed to walk?',o:[
    {t:'Through the dock doors, because it is the shortest way.',why:'Dock doors are for trucks and forklifts. People use the pedestrian doors.'},
    {t:'Anywhere, as long as he is careful.',why:'Being careful is not enough. Drivers do not expect people in vehicle areas, and a visitor does not know the site.'},
    {t:'Only on the green pedestrian walkway, in hi-vis, with an escort.',ok:1,why:'Walkways keep people away from forklifts and trucks. A visitor does not know the site, so he stays on the walkway with an escort.'}]},
  reverse:{who:'bisi',q:'A truck is reversing into Bay 1 and the driver cannot see behind the truck. What do you do?',o:[
    {t:'Stay out of the hatched reversing zone and let the trained banksman guide the driver.',ok:1,why:'Reversing vehicles cause many deaths in yards. Only one trained banksman guides, standing where the driver can see him in the mirror. Everyone else keeps clear.'},
    {t:'Stand behind the truck and shout directions to help.',why:'Behind a reversing truck is the most dangerous place in the yard. The driver cannot see you there.'},
    {t:'Wave at the driver from beside the truck as well.',why:'Two people guiding give mixed signals. One trained banksman only.'}]},
  trailer:{who:'bisi',q:'The truck is now at Bay 1. Before anyone drives a forklift into it, what must be done?',o:[
    {t:'Nothing. The driver knows he must wait.',why:'Drivers do pull away early, especially when they want to beat Lagos traffic. Control the keys and secure the truck.'},
    {t:'Engine off, keys handed in to the dock office, wheel chocks or the dock lock on.',ok:1,why:'This stops the truck pulling away or creeping forward while a forklift is inside, which can drop the forklift between the dock and the truck.'},
    {t:'Keep the engine running so the driver can move fast if needed.',why:'A running engine and a driver in the cab is exactly how trucks pull away with a forklift half inside.'}]},
  forks:{who:'chidi',q:'Chidi calls from his forklift: "Hop on the forks, make I carry you go Bay 3 quick quick!" What do you say?',o:[
    {t:'OK, as long as you drive slowly.',why:'Even at walking speed, one bump can throw you off the forks and under the wheels.'},
    {t:'OK, I will hold the mast so I don\'t fall.',why:'Holding the mast puts your hands in the chains and pinch points.'},
    {t:'No thank you. Nobody rides on the forks. I will walk on the walkway.',ok:1,why:'Forks are for loads, never for people. Only the trained, licensed operator rides, in the seat with the seat belt on, forks low and at walking speed in the aisles.'}]},
  upright:{who:'bisi',q:'This rack upright is badly dented. On the rack inspection traffic-light scale it is RED, and the rack is full. What should happen?',o:[
    {t:'Keep using it, but only put light pallets there.',why:'Any load on a red-damaged upright can bring the whole run down.'},
    {t:'Straighten it with a hammer and carry on.',why:'Never repair racking yourself. The steel is weakened. A competent rack inspector decides on repair or replacement.'},
    {t:'Stop using it: unload the bay safely, quarantine (barrier off) the area and report it.',ok:1,why:'RED means act now. A damaged upright can collapse the racking. Offload it under supervision, isolate it and get it repaired before it is used again.'}]},
  loadsign:{who:'bisi',q:'The load notice on the rack says MAX 1,000 kg PER LEVEL. The next pallet of tiles weighs 1,400 kg. What do you do?',o:[
    {t:'Do not put it in this rack. Tell the supervisor and use a floor location or a bay rated for it.',ok:1,why:'The load notice is the design limit. Overloading bends the beams and can bring the rack down. Never exceed it.'},
    {t:'Put it in. The rack is strong steel.',why:'The rack is only as strong as its design. 1,400 kg is 40% over the limit.'},
    {t:'Put it on the top level, so nobody walks under it.',why:'Heavy loads high up make it worse: more stress on the rack, and further to fall.'}]},
  pick:{who:'ngozi',q:'Your pick list says one 25 kg carton from the top level of rack R2. How do you get it?',o:[
    {t:'Climb the rack beams like a ladder. It is faster.',why:'Never climb racking. Beams are not ladders, and you can fall or pull the stock down on yourself.'},
    {t:'Use the order picker or a platform step ladder, keep the load close and lift with your legs. Ask for a team lift if it is too heavy.',ok:1,why:'Use proper access equipment. Bend your knees, keep the load close to your body and do not twist. For heavy or awkward loads, get help or a lifting aid.'},
    {t:'Pull it down with a hook so it falls into your arms.',why:'A falling 25 kg carton can injure your head, neck and back.'}]},
  house:{who:'bisi',q:'In the pick aisle there is loose shrink-wrap, a broken pallet and an oil spill. What is the right action?',o:[
    {t:'Walk around it. The cleaners will come later.',why:'Slips and trips are among the most common warehouse injuries. If you see it, deal with it or report it now.'},
    {t:'Cover the oil with flat cardboard and carry on.',why:'Cardboard hides the oil and becomes slippery itself.'},
    {t:'Put out a wet-floor sign, clean the spill with the spill kit, bin the wrap, take the broken pallet out of use and report the leak.',ok:1,why:'Good housekeeping prevents slips, trips and forklift skids. Find where the oil came from so it does not happen again.'}]},
  battery:{who:'bisi',q:'In the battery charging bay, a colleague wants to light a cigarette "just quickly". What is right?',o:[
    {t:'No smoking or flames here. Charging batteries give off hydrogen, which can explode. Keep the bay ventilated, wear a face shield, apron and gloves, and know where the eye-wash is.',ok:1,why:'Hydrogen from charging batteries can explode, and battery acid burns skin and eyes. Ventilation, no flames, PPE and an eye-wash station are a must. Do not overfill the cells.'},
    {t:'It is fine if the door is open.',why:'An open door does not mean the hydrogen has cleared. No smoking means no smoking.'},
    {t:'It is only dangerous when the batteries are full.',why:'Hydrogen is given off while charging, not only when full. The rule applies all the time.'}]},
  load:{who:'emeka',q:'The truck at Bay 3 is loaded for Ibadan. Which is correct before it leaves?',o:[
    {t:'Stack the heavy pallets at the back and as high as possible, so unloading is quick.',why:'Heavy loads high and at the back make the truck unstable and can overload the rear axle.'},
    {t:'Load strapped, weight spread evenly and within the limit, dock leveller raised, and nobody jumps down from the dock edge.',ok:1,why:'Unsecured or badly spread loads shift and overturn trucks on the road. Use the steps and never jump from the dock: falls from docks cause serious injuries.'},
    {t:'Straps are not needed for short trips inside Lagos.',why:'Load shifts often happen on short trips, with sudden braking and potholes. Always secure the load.'}]},
  alarm:{who:'emeka',q:'The FIRE ALARM is ringing! Musa is driving FL-02 with a pallet raised high. What should he and everyone do?',o:[
    {t:'Musa drives the forklift outside quickly to save it.',why:'Forklifts block exits and walkways. Never use them to evacuate.'},
    {t:'Finish the pick you are doing, then go.',why:'Every second counts. Stop work at once.'},
    {t:'Musa lowers the forks to the floor, handbrake on, keys out. Everyone walks (no running) on the walkways to the assembly point.',ok:1,why:'Forks down and keys out leave the forklift safe and out of the way. Walk on the walkways to the assembly point and wait for the roll call.'}]},
};
// FL-03 pre-use check (step 3): tap each item; two are faulty. Then decide.
const FLCHECK=[['Forks and heel: no cracks',1],['Mast chains: tight and oiled',1],['Tyres: no cuts or chunks missing',1],['Horn',0,'No sound when pressed'],
  ['Lights and blue warning light',1],['Seat belt',1],['Battery: charged, cover closed',1],['Hydraulics: no leaks',0,'Oil dripping under the mast']];
const FLDECIDE=[
  {t:'Drive it anyway. Work is waiting and I will be careful.',why:'A forklift with a hydraulic leak can drop its load, and with no horn you cannot warn people at blind corners. Never use a faulty forklift.'},
  {t:'Tag it out "Do not use", take the key out and report the faults to the supervisor.',ok:1,why:'Faulty equipment is tagged and taken out of use until a competent mechanic repairs it. Only trained, licensed operators drive, and only after a good pre-use check.'},
  {t:'Wipe the oil and drive it. The horn is not important.',why:'Wiping the oil hides the fault. The horn warns people at blind corners and crossings. Tag it out and report it.'}];
// Hidden hazards (6) and safe decoys (3). Find them by clicking things; their inspect panel shows the evidence.
const HZ={
  'P-1026':{hz:1,name:'Pallet stack too high and leaning',why:'Pallets stacked five high and leaning can topple onto people. Max three high, on level ground. Restack it and report it.'},
  'R2-B6':{hz:1,name:'Missing beam lock (rack R2, bay 6)',why:'Without the beam lock (safety pin), a forklift can knock the beam out of the upright and the load falls. Keep the bay empty until it is fixed.'},
  'FE-2':{hz:1,name:'Fire exit blocked by pallets',why:'Fire exits must be clear at all times. In a fire, a blocked exit can trap people. Move the pallets and report it.'},
  'P-0457':{hz:1,name:'Damaged pallet in use',why:'Broken boards can collapse under the load. Take damaged pallets out of use and re-pallet the goods.'},
  'EXT-04':{hz:1,name:'Fire extinguisher missing',why:'An empty extinguisher point means nothing to fight a small fire with. Report it so it is replaced at once.'},
  'TUNDE':{hz:1,name:'Pedestrian without hi-vis in the forklift aisle',why:'He is standing in a forklift aisle with no hi-vis, looking at his phone. Get him onto the walkway and into a vest.'},
  'P-2210':{hz:0,name:'Wrapped pallet in a marked bay',why:'Two high, wrapped and inside the yellow lines. This one is fine.'},
  'EXT-02':{hz:0,name:'Fire extinguisher in place',why:'In its bracket, sign visible, pin and seal in place, checked this month. This one is fine.'},
  'NGOZI':{hz:0,name:'Picker on the walkway in hi-vis',why:'On the green walkway, in hi-vis and safety boots. Good practice.'},
};
const HZ_TOTAL=Object.values(HZ).filter(h=>h.hz).length;
const RULES=['Wear hi-vis and safety boots on the floor, and a hard hat in the racking aisles.','Keep to the green walkways and cross forklift aisles only at the crossings.',
  'Never stand behind a reversing truck. One trained banksman guides.','Check a forklift before use. Tag out a faulty one and report it.',
  'Never climb racking or exceed the load notice. Report rack damage.','No smoking in the battery bay. In a fire alarm: forks down, keys out, walk to the assembly point.'];

// ================== MAP (metres) ==================
const R=(x1,z1,x2,z2)=>({x1,z1,x2,z2});
const inR=(r,x,z,m=0)=>x>r.x1-m&&x<r.x2+m&&z>r.z1-m&&z<r.z2+m;
const rc=r=>[(r.x1+r.x2)/2,(r.z1+r.z2)/2];
const BLD=R(-16,-22,16,-2);
const WALKS=[R(-25,-19.9,-23,29.6),R(-25,0.2,-10.6,1.8),R(-15.6,-2.3,-13.8,1.8),R(-25,-19.9,-15.7,-18.1),R(-29,-8.9,-25,-7.1),
  R(-15.6,-21.5,-13.8,-2.3),R(13.8,-12.8,15.6,-2.3),R(13.8,-2.3,15.6,1.8),R(10.4,0.2,15.6,1.8)];
const PICK=R(-13.8,-15.8,11.5,-12.8), CHARGE=R(11.7,-21.6,15.7,-13.0), AP=R(-37,-12,-29,-4);
const FA=[{r:R(-15.7,-8.5,15.7,-3.5),cross:[R(-15.6,-8.5,-13.8,-3.5),R(13.8,-8.5,15.6,-3.5)],n:'Dock aisle'},{r:R(-13.8,-20.5,11.5,-16.9),cross:[],n:'Aisle A1'}];
const ROADS=[R(-34,15,-26,31),R(-34,15,38,21),R(-10.5,-1.8,10,15),R(18,3,38,15)];
const ZEBRA=[R(-25,15,-23,21)];
const BAYS=[-6,0,6];
const REVZ=b=>R(b-2.2,-1.8,b+2.2,12);
const SOL=[
  R(-16,-2.3,-15.6,-2),R(-13.8,-2.3,13.8,-2),R(15.6,-2.3,16,-2),R(-16,-22,-3.9,-21.7),R(-2.1,-22,16,-21.7),
  R(-16,-22,-15.7,-19.9),R(-16,-18.1,-15.7,-2),R(15.7,-22,16,-2),
  R(-11,-12.8,10,-11.7),R(-11,-16.9,10,-15.8),R(-11,-21.6,-5.75,-20.5),R(-0.5,-21.6,10,-20.5),
  R(11.5,-21.6,11.7,-15.6),R(11.5,-13.0,11.7,-12.8),R(11.5,-13.0,13.8,-12.8),R(15.6,-13.0,15.7,-12.8),R(15.0,-21.4,15.7,-15.4),
  R(-9,-11.4,-6,-9),R(-4,-11.4,-1,-9),R(2,-11.4,5,-9),R(7,-11.4,10,-9),R(-13.4,-10.7,-10,-9.5),R(-4.3,-21.6,-1.7,-20.4),
  R(-22.2,22.8,-18.4,27.2),R(-13.8,4.5,-11.4,6.7),R(-38.5,4,-32.5,6.6),R(-30.2,9.4,-28.6,11),R(-37,9,-32.5,12),
  R(20,4,22.6,13.2),R(24,4,26.6,13.2),
  R(-40,-30,40,-29.7),R(-40,29.7,40,30),R(-40,-30,-39.7,30),R(39.7,-30,40,30),
];
const START={x:-24,z:28.4};

// ================== STATE ==================
let S=null, started=false, paused=true, muted=false, audio=null;
const prof=Object.assign({name:'',company:''},SL.store.get('wh-profile',{}));
const TIMERS=[]; function later(sec,fn){ TIMERS.push({t:sec,fn}); }
function newState(){
  S={t:0,step:0,si:0,done:{},stepAt:{},stepT0:0,stepTimes:{},score:100,kd:{},hazFound:0,hz:{},near:0,nearCool:{},answers:[],wrongQ:[],where:[],
    flcheck:{seen:{},done:false,ok:null},card:null,alarm:null,muster:false,over:false,nepa:0,nepaDone:false,rain:0,spill:false,drill:false,hazHint:false,events:0};
}

// ================== AUDIO ==================
function ensureAudio(){ if(!audio){ try{ audio=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(audio&&audio.state==='suspended') audio.resume().catch(()=>{}); }
function tone(f,d=.15,type='sine',v=.06,at=0){ if(muted||!audio) return; try{ const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+at; o.type=type; o.frequency.value=f; o.connect(g); g.connect(audio.destination); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.start(t); o.stop(t+d+.02); }catch(e){} }
const chime=()=>{ tone(660,.12,'sine',.07); tone(990,.18,'sine',.06,.09); };
const buzz=()=>{ tone(220,.18,'triangle',.07); tone(180,.25,'triangle',.06,.12); };
const horn=()=>{ tone(392,.22,'square',.035); tone(392,.22,'square',.035,.28); };
const beep=()=>tone(1150,.12,'square',.025);
const fanfare=()=>[523,659,784,1047].forEach((f,i)=>tone(f,.22,'sine',.06,i*.12));

// ================== 3D SETUP ==================
const MC={};
function mat(c,o={}){ const k=c+'|'+JSON.stringify(o); if(MC[k]&&!o.u) return MC[k];
  const m=new THREE.MeshLambertMaterial({color:lin(c)}); if(o.t!=null){ m.transparent=true; m.opacity=o.t; m.depthWrite=!!o.dw; } if(o.e) { m.emissive=lin(o.e); m.emissiveIntensity=o.ei??1; } if(o.map) m.map=o.map; if(o.side) m.side=o.side;
  if(o.po){ m.polygonOffset=true; m.polygonOffsetFactor=-o.po; m.polygonOffsetUnits=-o.po; }
  if(!o.u) MC[k]=m; return m; }
const basic=(c,o={})=>{ const m=new THREE.MeshBasicMaterial({color:new THREE.Color(c),transparent:o.t!=null,opacity:o.t??1,depthWrite:o.t==null,toneMapped:false}); if(o.map) m.map=o.map; if(o.side) m.side=o.side; if(o.add) m.blending=THREE.AdditiveBlending; return m; };
const HAS3=!!window.THREE;
const UB=HAS3&&new THREE.BoxGeometry(1,1,1), UP=HAS3&&new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), USPH=HAS3&&new THREE.SphereGeometry(1,14,10);
const IQ={};
function iq(key,geo,m,mx,col,fl={}){ const q=IQ[key]=IQ[key]||{geo,m,list:[],cols:[],fl}; q.list.push(mx); q.cols.push(col?lin(col):null); }
function iqFlush(parent){ for(const k in IQ){ const q=IQ[k]; const im=new THREE.InstancedMesh(q.geo,q.m,q.list.length); q.list.forEach((m,i)=>im.setMatrixAt(i,m));
  if(q.cols.some(Boolean)) q.cols.forEach((c,i)=>im.setColorAt(i,c||new THREE.Color(1,1,1)));
  im.castShadow=q.fl.shadow!==false; im.receiveShadow=true; im.frustumCulled=false; if(q.fl.decor) im.userData.decor=true; im.name=k; parent.add(im); delete IQ[k]; } }
function box(w,h,d,m,x,y,z,sh=true){ return bx(w,h,d,m,x,y,z,sh); }
function flat(w,d,m,x,y,z,ry=0){ const p=new THREE.Mesh(UP,m); p.scale.set(w,1,d); p.position.set(x,y,z); p.rotation.y=ry; p.receiveShadow=true; return p; }
function canvasT(w,h,draw,rx=1,ry=1){ const t=tex(mkCanvas(w,h,draw),rx,ry); return t; }
const decor=o=>{ o.userData.decor=true; return o; };
let SHTEX=null;
function shadowBlob(w,d,o=.22){ if(!SHTEX) SHTEX=canvasT(64,64,(c)=>{ const g=c.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(0,0,64,64); });
  const m=new THREE.MeshBasicMaterial({color:new THREE.Color('#1f2860'),map:SHTEX,transparent:true,opacity:o,depthWrite:false}); const p=new THREE.Mesh(UP,m); p.scale.set(w,1,d); p.position.y=.03; p.renderOrder=1; return p; }

function initScene(){
  const canvas=$('game');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true}); RENDERER=renderer;
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  shadowBlob(1,1).material.dispose();
  const scene=new THREE.Scene(); const BG='#e8eaf7'; scene.background=new THREE.Color(BG); scene.fog=new THREE.Fog(BG,80,200);
  const camera=new THREE.PerspectiveCamera(27,1,1,600);
  const hemi=new THREE.HemisphereLight(lin('#ffffff'),lin('#cdd1ea'),.72); scene.add(hemi);
  const sun=new THREE.DirectionalLight(lin('#fffaf2'),.72); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-.0004; sun.shadow.normalBias=.04; sun.shadow.radius=4;
  scene.add(sun,sun.target);
  G={renderer,scene,camera,sun,hemi,t:0,root:new THREE.Group(),dyn:new THREE.Group()}; scene.add(G.root,G.dyn);
  addEventListener('resize',()=>{ resize3D(); updateInsets(); }); resize3D(); applyQuality();
  SL.fps.cb=()=>{ applyQuality(); toast(tr('Graphics set to Low to keep the game smooth on this device. Change it in Settings.')); };
}
function resize3D(){ if(!G) return; G.renderer.setSize(innerWidth,innerHeight,false); G.camera.aspect=innerWidth/innerHeight; G.camera.updateProjectionMatrix(); }
let SHADOW_HALF=0;
function applyQuality(){
  if(!G) return; const q=SL.quality(), r=G.renderer, dpr=devicePixelRatio||1;
  r.setPixelRatio(q==='low'?Math.min(1,dpr)*.75:q==='medium'?Math.min(1.25,dpr):Math.min(1.75,dpr)); resize3D();
  const shadows=q!=='low'; const size=q==='high'?2048:1024;
  if(G.sun.shadow.mapSize.x!==size){ G.sun.shadow.mapSize.set(size,size); if(G.sun.shadow.map){ G.sun.shadow.map.dispose(); G.sun.shadow.map=null; } }
  if(r.shadowMap.enabled!==shadows){ r.shadowMap.enabled=shadows; G.scene.traverse(o=>{ if(o.material) [].concat(o.material).forEach(m=>m.needsUpdate=true); }); }
  G.sun.castShadow=shadows;
  G.scene.traverse(o=>{ if(o.userData&&o.userData.decor) o.visible=q!=='low'; });
}

// ================== WORLD BUILD ==================
const COL={ground:'#eceef9',site:'#f3f4fb',road:'#fcfcff',dash:'#d9dcec',walk:'#7cd6aa',walkEdge:'#ffffff',yellow:'#f2c230',blue:'#2f5ef0',blueD:'#2149cf',blueL:'#4b74f4',white:'#f7f8fd',trim:'#ffffff',floor:'#f6f7fc',
  upr:'#2f5ef0',beam:'#f08a24',pallet:'#d9b582',carton:'#d4a067',tape:'#ead0a4',wrap:'#4d74f2',sack:'#eceff6',dark:'#2b2f45',grey:'#c9cee0',fork:'#f6b91a'};
function rectPlane(r,m,y){ const [cx,cz]=rc(r); return flat(r.x2-r.x1,r.z2-r.z1,m,cx,y,cz); }
function hatchTex(){ return canvasT(128,128,(c,w,h)=>{ c.clearRect(0,0,w,h); c.strokeStyle='rgba(242,194,48,.62)'; c.lineWidth=9; for(let i=-2;i<4;i++){ c.beginPath(); c.moveTo(i*64-10,-10); c.lineTo(i*64+h+10,h+10); c.stroke(); } }); }
function zebraTex(){ return canvasT(32,64,(c,w,h)=>{ c.clearRect(0,0,w,h); c.fillStyle='rgba(255,255,255,.95)'; c.fillRect(0,8,w,24); }); }
function meshTex(){ return canvasT(64,64,(c,w,h)=>{ c.clearRect(0,0,w,h); c.strokeStyle='rgba(120,128,170,.65)'; c.lineWidth=1.4; for(let i=0;i<=w;i+=10){ c.beginPath(); c.moveTo(i,0); c.lineTo(i,h); c.stroke(); c.beginPath(); c.moveTo(0,i); c.lineTo(w,i); c.stroke(); } }); }
function signTex(lines,bg='#ffffff',fg='#2a55e5',w=256,h=128,icon){ return canvasT(w,h,(c)=>{ c.fillStyle=bg; c.beginPath(); c.moveTo(14,0); c.arcTo(w,0,w,h,14); c.arcTo(w,h,0,h,14); c.arcTo(0,h,0,0,14); c.arcTo(0,0,w,0,14); c.fill();
  c.fillStyle=fg; c.textAlign='center'; c.textBaseline='middle'; const n=lines.length; lines.forEach((s,i)=>{ const big=i===0; c.font=`${big?800:600} ${big?Math.min(h*.36,w/(s.length*.62)):h*.2}px system-ui,sans-serif`; c.fillText(s,w/2+(icon?h*.18:0),h*(n===1?.52:(.36+i*.34))); });
  if(icon) icon(c,w,h); }); }
function signPlane(t,w,h,x,y,z,ry=0){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:t,transparent:true})); m.position.set(x,y,z); m.rotation.y=ry; return m; }
const W={walls:{},roof:null,cut:0,doors:[],gateArm:null,ribs:[]};
function buildWorld(){
  const root=G.root;
  // ground: lavender everywhere, the site a touch lighter
  const gnd=flat(420,420,mat(COL.ground),0,0,0); root.add(gnd);
  root.add(flat(80,60,mat(COL.site),0,.004,0));
  // roads, apron, parking (white) and their markings
  const roadM=mat(COL.road,{po:1}); ROADS.forEach(r=>root.add(rectPlane(r,roadM,.008)));
  for(let x=-31;x<36;x+=4.2) if(x<-26||x>-22.5) iq('dash',UB,mat(COL.dash),M4(x,.016,18,0,2,.01,.16),null,{shadow:false});
  for(let z=22;z<30;z+=4.2) iq('dash',UB,mat(COL.dash),M4(-30,.016,z,0,.16,.01,2),null,{shadow:false});
  const yel=mat(COL.yellow);
  const yline=(x1,z1,x2,z2,w=.13)=>{ const dx=x2-x1, dz=z2-z1, L2=Math.hypot(dx,dz); iq('yl',UB,yel,M4((x1+x2)/2,.02,(z1+z2)/2,Math.atan2(dx,dz),w,.012,L2),null,{shadow:false}); };
  const hatch=hatchTex();
  for(const b of BAYS){ const r=REVZ(b); yline(r.x1,r.z1,r.x1,r.z2); yline(r.x2,r.z1,r.x2,r.z2); yline(r.x1,r.z2,r.x2,r.z2);
    const t=hatch.clone(); t.needsUpdate=true; t.repeat.set((r.x2-r.x1)/2.4,(r.z2-r.z1)/2.4); root.add(rectPlane(r,mat('#ffffff',{map:t,t:1,po:2,u:1}),.018)); }
  for(let x=19;x<=37;x+=4) yline(x,3.4,x,14.6);  // truck parking bays
  // green pedestrian walkways (white edges) and zebra crossings
  const walkM=mat(COL.walk,{po:3});
  WALKS.forEach(r=>{ root.add(rectPlane(r,walkM,.024)); });
  const zt=zebraTex(); for(const z of ZEBRA){ const t=zt.clone(); t.needsUpdate=true; t.repeat.set(1,(z.z2-z.z1)/1.2); const p=rectPlane(z,mat('#ffffff',{map:t,t:1,po:4,u:1}),.03); root.add(p); }
  for(const f of FA) for(const c of f.cross){ const t=zt.clone(); t.needsUpdate=true; t.repeat.set(1,(c.z2-c.z1)/1.2); root.add(rectPlane(c,mat('#ffffff',{map:t,t:1,po:4,u:1}),.03)); }
  // assembly point
  root.add(rectPlane(AP,mat('#38b47a',{po:3}),.024));
  const apS=signTex(['ASSEMBLY','POINT'],'#16935c','#ffffff',256,160,(c,w,h)=>{}); const ap=signPlane(apS,2.4,1.5,AP.x1+1.2,2.3,AP.z1+.4); root.add(ap, box(.1,1.6,.1,mat('#ffffff'),AP.x1+1.2,.8,AP.z1+.35));
  buildWarehouse(); buildYard(); buildFenceTrees(); buildSurroundings();
  iqFlush(root);
  root.traverse(o=>{ if(o.isMesh&&!o.isInstancedMesh&&o.geometry!==UP&&o.material&&!o.material.transparent) { if(o.castShadow!==false) o.castShadow=true; o.receiveShadow=true; } });
}
// Walls are split into a low base (always shown) and the upper wall, which fades out when you are inside (cut-away view).
function buildWarehouse(){
  const root=G.root, H=8, base=1.1;
  const floorM=mat(COL.floor,{po:1}); root.add(rectPlane(R(-15.7,-21.7,15.7,-2.3),floorM,.012));
  // forklift aisles: light grey with yellow edge lines; crossings already drawn
  const faM=mat('#e9ebf5',{po:2}); for(const f of FA) root.add(rectPlane(f.r,faM,.018));
  const yel=mat(COL.yellow); const edge=(x1,z1,x2,z2)=>{ const dx=x2-x1,dz=z2-z1; iq('yl',UB,yel,M4((x1+x2)/2,.03,(z1+z2)/2,Math.atan2(dx,dz),.12,.012,Math.hypot(dx,dz)),null,{shadow:false}); };
  for(const f of FA){ const r=f.r; edge(r.x1,r.z1,r.x2,r.z1); edge(r.x1,r.z2,r.x2,r.z2); }
  root.add(rectPlane(CHARGE,mat('#e4f0ff',{po:2}),.02));
  for(const r of [R(-9,-11.4,-6,-9),R(-4,-11.4,-1,-9),R(2,-11.4,5,-9),R(7,-11.4,10,-9)]){ edge(r.x1,r.z1,r.x2,r.z1); edge(r.x1,r.z2,r.x2,r.z2); edge(r.x1,r.z1,r.x1,r.z2); edge(r.x2,r.z1,r.x2,r.z2); }
  // walls (each side has its own materials so it can fade on its own)
  const baseM=mat('#f1f3fb'), darkM=mat('#262b40');
  const sides={S:{z:-2,ax:'x',a:-16,b:16,n:[0,1],open:[[-15.6,-13.8,2.5],[-7.5,-4.5,3.7],[-1.5,1.5,3.7],[4.5,7.5,3.7],[13.8,15.6,2.5]]},
    N:{z:-22,ax:'x',a:-16,b:16,n:[0,-1],open:[[-3.9,-2.1,2.5]]}, W:{x:-16,ax:'z',a:-22,b:-2,n:[-1,0],open:[[-19.9,-18.1,2.5]]}, E:{x:16,ax:'z',a:-22,b:-2,n:[1,0],open:[]}};
  for(const [k,s] of Object.entries(sides)){
    const M={blue:mat(COL.blue,{u:1}),white:mat(COL.trim,{u:1}),rib:mat(COL.blueL,{u:1}),frame:mat('#ffffff',{u:1}),shut:mat('#dfe3f1',{u:1})};
    const up=new THREE.Group(), low=new THREE.Group(); root.add(up,low); W.walls[k]={up,n:s.n,M,mats:[],a:1};
    const line=s.ax==='x'?s.z:s.x, nn=s.ax==='x'?s.n[1]:s.n[0], inward=line-nn*.15;
    const seg=(a,b,y1,y2,m,g,th=.3)=>{ if(b-a<.01||y2-y1<.01) return; const c=(a+b)/2, len=b-a, h=y2-y1; g.add(s.ax==='x'?box(len,h,th,m,c,y1+h/2,inward):box(th,h,len,m,inward,y1+h/2,c)); };
    let cur=s.a; const ops=s.open.slice().sort((p,q)=>p[0]-q[0]);
    for(const [oa,ob,oh] of ops){ seg(cur,oa,0,base,baseM,low); seg(cur,oa,base,H-.3,M.blue,up); seg(oa,ob,oh,H-.3,M.blue,up); cur=ob; }
    seg(cur,s.b,0,base,baseM,low); seg(cur,s.b,base,H-.3,M.blue,up);
    seg(s.a,s.b,H-.3,H,M.white,up,.36);
    for(let p=s.a+.6;p<s.b-.3;p+=1.2){ if(ops.some(([oa,ob])=>p>oa-.1&&p<ob+.1)) continue; const o=line+nn*.02, hh=H-.3-base;
      const r=s.ax==='x'?box(.07,hh,.05,M.rib,p,base+hh/2,o,false):box(.05,hh,.07,M.rib,o,base+hh/2,p,false); up.add(r); }
    for(const p of [s.a,s.b]) up.add(s.ax==='x'?box(.42,H-base,.42,M.white,p,base+(H-base)/2,inward):box(.42,H-base,.42,M.white,inward,base+(H-base)/2,p));
    consolidate(low);
  }
  const frameM=W.walls.S.M.frame, shutM=W.walls.S.M.shut;
  // dock doors: white frames, roller shutters (raised when a truck is docked), bumpers, number signs
  BAYS.forEach((b,i)=>{
    const g=W.walls.S.up; const fz=-1.82;
    g.add(box(.25,4.1,.12,frameM,b-1.62,2.05,fz), box(.25,4.1,.12,frameM,b+1.62,2.05,fz), box(3.5,.3,.12,frameM,b,4.1,fz));
    const sh=box(3,3.7,.06,shutM,b,1.85,-1.9,false); sh.userData.keep=true; g.add(sh);
    const slats=new THREE.Mesh(new THREE.PlaneGeometry(3,3.7),new THREE.MeshLambertMaterial({map:canvasT(32,64,(c,w,h)=>{ c.fillStyle='#e6e9f4'; c.fillRect(0,0,w,h); c.fillStyle='rgba(120,128,170,.22)'; for(let y=0;y<h;y+=6) c.fillRect(0,y,w,1.5); },1,1),transparent:true})); slats.position.set(b,1.85,-1.86); sh.add(slats); slats.position.set(0,0,.035);
    W.doors.push({b,sh,open:0});
    const dark=box(2.9,3.6,.04,mat('#262b40',{u:1}),b,1.8,-2.05,false); g.add(dark);
    for(const s of [-1,1]) root.add(box(.28,.45,.35,mat('#22263a'),b+s*1.25,.55,-1.75));
    root.add(flat(2.6,.8,mat('#b8bed6',{po:3}),b,.035,-1.55));
    const st=signPlane(signTex([String(i+1)],'#ffffff','#2a55e5',96,96),.75,.75,b,4.75,-1.78); g.add(st);
    const lamp=sph(.12,mat('#ff5a5a',{e:'#ff3030',ei:.6,u:1}),b+1.95,3.2,-1.75,10); g.add(lamp); W.doors[i].lamp=lamp;
  });
  // pedestrian doors (green frames) and fire exits (green running-man signs drawn, no emoji)
  const exitTex=signTex(['EXIT'],'#16935c','#ffffff',192,80,(c,w,h)=>{ c.fillStyle='#fff'; c.beginPath(); c.arc(30,22,7,0,7); c.fill(); c.fillRect(24,30,10,22); c.save(); c.translate(28,52); c.rotate(.5); c.fillRect(-3,0,6,20); c.restore(); c.save(); c.translate(30,52); c.rotate(-.5); c.fillRect(-3,0,6,20); c.restore(); });
  const doorM=mat('#ffffff'), greenM=mat('#20a46b');
  for(const [x,z,ry,kind] of [[-14.7,-2,0,'ped'],[14.7,-2,0,'ped'],[-16,-19,Math.PI/2,'exit'],[-3,-22,0,'exit']]){
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry; root.add(g);
    g.add(box(.14,2.6,.18,greenM,-.95,1.3,0), box(.14,2.6,.18,greenM,.95,1.3,0), box(2.04,.16,.18,greenM,0,2.6,0));
    const s=signPlane(exitTex,.95,.4,0,3.0,.18); g.add(s); const s2=signPlane(exitTex,.95,.4,0,3.0,-.18,Math.PI); g.add(s2);
    if(kind==='ped'){ g.add(box(2.4,.08,1.2,mat('#ffffff'),0,2.95,.6)); }
  }
  // roof: two blue slopes with lighter ribs, white fascia, skylights, and a roof logo
  const roof=new THREE.Group(); root.add(roof); W.roof={g:roof,mats:[],a:1};
  const roofM=mat('#3a66f2',{u:1}), roofRib=mat('#5a82f6',{u:1}), skyM=mat('#e8eeff',{u:1}), fasciaM=mat('#ffffff',{u:1});
  W.roof.mats.push(roofM,roofRib,skyM,fasciaM);
  for(const s of [-1,1]){ const sl=new THREE.Group(); sl.position.set(0,H+.8,-12+s*5); sl.rotation.x=s*0.16; roof.add(sl);
    sl.add(box(32.8,.18,10.3,roofM,0,0,0));
    for(let x=-15.6;x<=15.7;x+=1.3){ const r=box(.08,.06,10.3,roofRib,x,.12,0,false); sl.add(r); }
    for(const x of [-10,-2,6]) sl.add(box(2.2,.06,7,skyM,x,.13,0,false));
    sl.add(box(33,.35,.25,fasciaM,0,-.05,s*5.15)); }
  roof.add(box(33,.3,.5,fasciaM,0,H+1.65,-12));
  const logo=signPlane(canvasT(256,256,(c)=>{ c.fillStyle='#fff'; c.beginPath(); c.arc(128,128,124,0,7); c.fill(); c.strokeStyle='#2a55e5'; c.lineWidth=14; c.lineJoin='round';
    c.beginPath(); c.moveTo(128,52); c.lineTo(196,90); c.lineTo(196,166); c.lineTo(128,204); c.lineTo(60,166); c.lineTo(60,90); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(60,90); c.lineTo(128,128); c.lineTo(196,90); c.moveTo(128,128); c.lineTo(128,204); c.stroke(); }),4.6,4.6,6,H+.99,-7.1);
  logo.rotation.set(-Math.PI/2+.16,0,0); roof.add(logo);
  consolidate(roof); { const ms=new Set(); roof.traverse(o=>{ if(o.material) ms.add(o.material); }); W.roof.mats=[...ms]; }
  // building name on the west end wall
  const nameT=signTex(['LAGOS DC','Site Life · Agbara'],'rgba(0,0,0,0)','#ffffff',512,160);
  const nm=signPlane(nameT,7,2.2,-16.03,5.6,-9,-Math.PI/2); W.walls.W.up.add(nm);
  for(const k in W.walls){ const w=W.walls[k]; consolidate(w.up); const ms=new Set(); w.up.traverse(o=>{ if(o.material) ms.add(o.material); }); w.mats=[...ms]; }
  // racking, staging and the inside of the building
  buildRacks(); buildInside();
}
// ---- racking (instanced): blue uprights, orange beams, pallets of cartons / blue wrap / sacks ----
const LOADS={carton:[COL.carton,1.0],wrap:[COL.wrap,1.05],sack:[COL.sack,.75],tiles:['#c9c3b8',.6]};
function pallet(x,y,z,load,ry=0,o={}){
  const par=o.parent;
  if(par){ const d=box(1.0,.14,1.0,mat(COL.pallet),x,y+.07,z); d.rotation.y=ry; par.add(d); if(!load) return; const [c,h]=LOADS[load]; const l=box(.94,h,.94,mat(c),x,y+.14+h/2,z); l.rotation.y=ry; par.add(l); if(load==='carton'){ const tp=box(.96,.02,.12,mat(COL.tape),x,y+.15+h,z); tp.rotation.y=ry; par.add(tp); } return; }
  iq('pal',UB,mat('#ffffff'),M4(x,y+.07,z,ry,1.0,.14,1.0),COL.pallet,o.fl||{}); if(!load) return;
  const [c,h]=LOADS[load]; iq('load',UB,mat('#ffffff'),M4(x,y+.14+h/2,z,ry,.94,h,.94),c,o.fl||{});
  if(load==='carton'){ iq('tape',UB,mat(COL.tape),M4(x,y+.15+h,z,ry,.96,.02,.12),null,o.fl||{}); iq('tape',UB,mat(COL.tape),M4(x,y+.14+h*.55,z,ry,.955,.05,.955),null,o.fl||{}); }
}
const RACK={}; let RNG=7; const rr=()=>{ RNG=(RNG*16807)%2147483647; return RNG/2147483647; };
function buildRack(id,x1,x2,zc,opt={}){
  const n=Math.max(1,Math.round((x2-x1)/2.625)), bw=(x2-x1)/n, uprM=mat(COL.upr), beamM=mat(COL.beam);
  RACK[id]={x1,x2,zc,n,bw};
  for(let i=0;i<=n;i++){ const x=x1+i*bw; for(const dz of [-.5,.5]){ if(opt.dent&&opt.dent.i===i&&opt.dent.dz===dz) continue; iq('upr',UB,uprM,M4(x,3,zc+dz,0,.1,6,.09)); }
    for(let y=.4;y<5.8;y+=1.2) iq('brace',UB,uprM,M4(x,y,zc,0,.04,.04,1),null,{decor:true,shadow:false}); }
  const types=['carton','carton','wrap','carton','sack','wrap','carton'];
  for(let i=0;i<n;i++){ const xc=x1+(i+.5)*bw;
    for(let l=1;l<4;l++){ const y=l*1.5; for(const dz of [-.5,.5]){ const tilt=opt.lock&&opt.lock.i===i&&opt.lock.l===l&&dz===opt.lock.dz; iq('beam',UB,beamM,M4(xc,y-(tilt?.06:0),zc+dz,0,bw-.12,.14,.06)); } }
    for(let l=0;l<4;l++){ if(opt.skip&&opt.skip(i,l)) continue; for(const px of [-.27,.27]){ if(rr()<.14) continue; pallet(xc+px*bw*.85,l?l*1.5+.08:0,zc,types[Math.floor(rr()*types.length)]); } } }
  return RACK[id];
}
function buildRacks(){
  buildRack('R1',-11,10,-12.25,{dent:{i:1,dz:-.5}});
  buildRack('R2',-11,10,-16.35,{lock:{i:5,l:2,dz:.5}});
  buildRack('R3a',-11,-5.75,-21.05); buildRack('R3b',-0.5,10,-21.05);
  // the dented upright (R1, second frame, pick-aisle face): kinked and tagged
  const g=new THREE.Group(), um=mat(COL.upr); const x=-8.375, z=-12.75; g.add(box(.1,.5,.09,um,x,.25,z));
  const k=box(.1,.62,.09,um,x,.78,z-.1); k.rotation.x=.35; g.add(k); g.add(box(.1,4.95,.09,um,x,3.52,z)); g.add(box(.16,.22,.02,mat('#e23b3b'),x+.15,1.4,z-.06)); G.root.add(g);
  W.dent=g;
  // load notice on R1's west end and on R2
  const ln=signTex(['MAX 1000 kg','PER LEVEL'],'#ffd23f','#1b1f3b',256,128);
  G.root.add(signPlane(ln,.9,.45,-11.12,1.9,-12.25,-Math.PI/2), signPlane(ln,.9,.45,-11.12,1.9,-16.35,-Math.PI/2));
}
function buildInside(){
  const root=G.root;
  // staging lanes in the marshalling area (pallets waiting for put-away); P-2210 (wrapped, fine) and P-0457 (damaged) are entities
  for(const [x1,load] of [[-9,'carton'],[-4,'wrap'],[2,'carton'],[7,'sack']]) for(let i=0;i<3;i++) for(let j=0;j<2;j++){ const x=x1+.5+i*1.0, z=-10.7+j*1.2;
    if((x1===-4&&i===1&&j===0)||(x1===2&&i===1&&j===0)) continue; pallet(x,0,z,i===2&&j===1?null:load); }
  // P-2210: two high, wrapped, inside the lines
  W.p2210=new THREE.Group(); root.add(W.p2210); pallet(-2.5,0,-10.7,'wrap',0,{parent:W.p2210}); pallet(-2.5,1.21,-10.7,'wrap',0,{parent:W.p2210});
  // P-0457: broken boards, cartons sagging
  const bp=new THREE.Group(); bp.position.set(3.5,0,-10.7); root.add(bp); W.p0457=bp; const pm=mat('#c7a06b');
  bp.add(box(1,.05,.18,pm,0,.12,-.4), box(1,.05,.18,pm,0,.12,.4), box(.45,.05,.18,pm,-.27,.12,0)); const b2=box(.5,.05,.18,pm,.3,.1,.05); b2.rotation.z=-.35; bp.add(b2);
  for(const xx of [-.4,0,.4]) bp.add(box(.12,.09,1,pm,xx,.045,0));
  const cl=box(.94,.9,.94,mat(COL.carton),0,.6,0); cl.rotation.z=.06; bp.add(cl);
  // FL-03 parking bay label, extinguisher points
  const pu=signPlane(signTex(['PRE-USE CHECK'],'#ffffff','#2a55e5',256,64),2.2,.55,-12.2,.04,-11.3); pu.rotation.x=-Math.PI/2; root.add(pu);
  W.ext02=extinguisher(-13.1,-2.36,Math.PI,true); W.ext04=extinguisher(-15.66,-14.3,Math.PI/2,false);
  // blocked fire exit FE-2 (pallets dumped in front of it)
  W.fe2=new THREE.Group(); root.add(W.fe2); for(const [x,y,l] of [[-3.6,0,'carton'],[-2.5,0,'wrap'],[-3.0,1.21,'carton']]) pallet(x,y,-21.05,l,.2*(x+3),{parent:W.fe2});
  // battery charging bay: chargers, eye-wash, no-smoking sign, extraction fan, mesh partition
  const chM=mat('#ffffff'), chD=mat('#2b2f45');
  for(const z of [-20.4,-18,-16.2]){ root.add(box(.6,1.6,.9,chM,15.3,.8,z), box(.62,.25,.6,chD,15.3,1.3,z)); root.add(box(.04,.04,1.6,mat('#1b1f3b'),14.9,.4,z-.4)); }
  const ew=new THREE.Group(); ew.position.set(12.3,0,-21.25); root.add(ew); ew.add(box(.5,1.1,.35,mat('#20a46b'),0,1.2,0), box(.55,.06,.4,mat('#ffffff'),0,1.8,0)); W.eyewash=ew;
  root.add(signPlane(signTex(['EYE WASH'],'#20a46b','#ffffff',256,80),.9,.3,12.3,2.15,-21.05));
  const ns=signTex(['NO SMOKING','NO NAKED FLAMES'],'#ffffff','#d23a3a',256,128,(c,w,h)=>{ c.strokeStyle='#d23a3a'; c.lineWidth=9; c.beginPath(); c.arc(44,h/2,30,0,7); c.stroke(); c.beginPath(); c.moveTo(23,h/2-21); c.lineTo(65,h/2+21); c.stroke(); });
  root.add(signPlane(ns,1.4,.7,13.7,2.6,-21.55)); root.add(signPlane(ns,1.2,.6,11.45,2.3,-14.3,-Math.PI/2));
  const fan=new THREE.Group(); fan.position.set(15.62,5.2,-17.5); root.add(fan); fan.add(box(.12,1.2,1.2,mat('#e8ebf5'),0,0,0)); const bl=box(.04,1,.12,mat('#8a91b0'),-.08,0,0); fan.add(bl); W.fan=bl;
  const meshT=meshTex(); meshT.repeat.set(9,2.2); const meshM=new THREE.MeshLambertMaterial({color:lin('#ffffff'),map:meshT,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const part=(x1,z1,x2,z2)=>{ const len=Math.hypot(x2-x1,z2-z1), p=new THREE.Mesh(new THREE.PlaneGeometry(len,2.2),meshM); p.position.set((x1+x2)/2,1.1,(z1+z2)/2); p.rotation.y=Math.atan2(-(z2-z1),x2-x1); p.castShadow=false; root.add(p); const tb=box(len,.06,.06,mat('#9aa3c4'),(x1+x2)/2,2.2,(z1+z2)/2); tb.rotation.y=p.rotation.y; root.add(tb); };
  part(11.6,-21.6,11.6,-15.6); part(11.6,-13,11.6,-12.9); part(11.6,-12.9,13.8,-12.9);
  // supervisor's small desk near the briefing point
  root.add(box(1.2,.75,.6,mat('#ffffff'),-12.6,.375,-15.45));
  // spill kit + wet-floor stuff for the housekeeping station: shrink-wrap, broken pallet, oil spill
  W.mess=new THREE.Group(); root.add(W.mess);
  const oil=flat(1.6,1.1,new THREE.MeshLambertMaterial({color:lin('#2b2a36'),transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6}),6.6,.04,-14.0); W.mess.add(oil);
  const wrapM=new THREE.MeshLambertMaterial({color:lin('#e9f1ff'),transparent:true,opacity:.85}); for(const [x,z,s] of [[5.9,-13.3,.7],[6.3,-13.5,.5]]){ const w=new THREE.Mesh(new THREE.IcosahedronGeometry(s*.5,0),wrapM); w.position.set(x,.18,z); w.scale.y=.45; W.mess.add(w); }
  const brk=new THREE.Group(); brk.position.set(7.6,0,-15.1); brk.rotation.y=.4; W.mess.add(brk); brk.add(box(1,.05,.18,mat('#c7a06b'),0,.1,-.35), box(.6,.05,.18,mat('#c7a06b'),-.2,.1,.2)); for(const xx of [-.4,.4]) brk.add(box(.12,.09,1,mat('#c7a06b'),xx,.045,0));
  W.clean=new THREE.Group(); W.clean.visible=false; root.add(W.clean); W.clean.add(cone('#ffd23f',6.0,-14.6));
  // quarantine barrier for the dented upright (shown after step 4)
  W.quar=new THREE.Group(); W.quar.visible=false; root.add(W.quar);
  for(const x of [-9.6,-7.2]) W.quar.add(box(.06,1,.06,mat('#ffffff'),x,.5,-13.4)); W.quar.add(box(2.4,.12,.03,mat('#e23b3b'),-8.4,.85,-13.4), box(2.4,.12,.03,mat('#ffffff'),-8.4,.6,-13.4));
  W.r2tape=new THREE.Group(); W.r2tape.visible=false; root.add(W.r2tape); W.r2tape.add(box(2.4,.12,.03,mat('#e23b3b'),3.44,.9,-15.7), box(2.4,.12,.03,mat('#ffffff'),3.44,.65,-15.7));
}
function cone(c,x,z){ const g=new THREE.Group(); g.position.set(x,0,z); g.add(cyl(.02,.18,.55,mat(c),0,.3,0,10), box(.4,.04,.4,mat(c),0,.02,0)); return g; }
function extinguisher(x,z,ry,present){
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry; G.root.add(g);
  g.add(box(.42,.08,.1,mat('#9aa3c4'),0,.85,.02)); // bracket
  const sign=signPlane(signTex(['FIRE','POINT'],'#d23a3a','#ffffff',128,128),.45,.45,0,1.75,.03); g.add(sign);
  const ex=new THREE.Group(); ex.add(cyl(.12,.12,.6,mat('#e23b3b'),0,.6,.14,12), cyl(.05,.05,.1,mat('#2b2f45'),0,.95,.14,8)); ex.visible=present; g.add(ex); g.userData.ex=ex; return g;
}
function buildYard(){
  const root=G.root;
  // gatehouse with a barrier arm
  const gh=new THREE.Group(); gh.position.set(-20.3,0,25); root.add(gh);
  gh.add(box(3.8,2.8,4.4,mat('#ffffff'),0,1.4,0), box(4.2,.3,4.8,mat(COL.blue),0,2.95,0), box(.06,1,2.2,mat('#9fb6ff'),-1.92,1.7,0));
  gh.add(signPlane(signTex(['GATEHOUSE','Sign in here'],'#ffffff','#2a55e5',256,110),1.6,.7,-1.93,2.45,0,-Math.PI/2));
  const arm=new THREE.Group(); arm.position.set(-25.8,1.0,29.2); root.add(arm); arm.add(box(.3,1,.3,mat('#ffffff'),0,-.5,0)); const bar=box(7.6,.12,.12,mat('#e23b3b'),-3.8,.1,0); arm.add(bar);
  for(let i=0;i<4;i++) arm.add(box(.9,.13,.13,mat('#ffffff'),-1.4-i*1.8,.1,0)); W.gateArm=arm;
  // a teal shipping container and outdoor pallets near it; P-1026 is the leaning, too-high stack
  const ct=new THREE.Group(); ct.position.set(-35.5,0,5.3); root.add(ct); ct.add(box(6,2.6,2.5,mat('#2fb3a9'),0,1.3,0));
  for(let x=-2.7;x<=2.7;x+=.3) ct.add(decor(box(.06,2.4,2.56,mat('#46c3b9'),x,1.3,0,false)));
  for(const [x,z,l,h] of [[-36.3,10,'carton',2],[-35.2,10,'wrap',1],[-34.1,10,'carton',2],[-33.0,10,'sack',1],[-36.3,11.2,'wrap',2],[-35.2,11.2,'carton',1],[-34.1,11.2,'carton',2]])
    for(let k=0;k<h;k++) pallet(x,k*1.21,z,l);
  W.p1026=new THREE.Group(); W.p1026.position.set(-29.4,0,10.2); root.add(W.p1026); W.p1026.userData.lean=.07;
  for(let k=0;k<5;k++){ const s=new THREE.Group(); s.position.set(k*.06,k*1.21,0); s.rotation.z=-k*.025; pallet(0,0,0,k%2?'wrap':'carton',k*.05,{parent:s}); W.p1026.add(s); }
  // truck parking: two trucks waiting for a bay (static)
  W.parked=[]; for(const [x,c,id] of [[21.3,'#f07a2a','TRK-3307'],[25.3,'#24a3a0','TRK-3311']]){ const t=makeTruck(c); t.position.set(x,0,8.6); t.rotation.y=Math.PI; root.add(t); W.parked.push({id,obj:t,x,z:8.6}); }
  // banksman platform sign at Bay 1, dock office
  const off=new THREE.Group(); off.position.set(-12.6,0,5.6); root.add(off); off.add(box(2.4,2.5,2.2,mat('#ffffff'),0,1.25,0), box(2.7,.22,2.5,mat(COL.blue),0,2.6,0), box(1,.8,.04,mat('#9fb6ff'),.3,1.6,-1.12));
  off.add(signPlane(signTex(['DOCK OFFICE','Keys here'],'#ffffff','#2a55e5',256,110),1.4,.6,0,2.0,1.12));
  // barrier rails along the viewing points
  const railM=mat('#ffffff'); for(const [x1,x2,z] of [[-14,-10.6,2.0],[10.4,13.6,2.0]]){ for(let x=x1;x<=x2+.01;x+=(x2-x1)/3) root.add(box(.09,1,.09,railM,x,.5,z)); root.add(box(x2-x1,.08,.08,mat('#f2c230'),(x1+x2)/2,1.0,z), box(x2-x1,.08,.08,mat('#f2c230'),(x1+x2)/2,.55,z)); }
  for(const [x,z] of [[-10.6,1],[10.4,1]]) root.add(box(.09,1,1.8,railM,x,.5,z));
  // bollards at the ped door + zebra
  for(const [x,z] of [[-15.9,2.2],[-13.5,2.2],[-25.4,14.6],[-22.6,14.6],[-25.4,21.4],[-22.6,21.4]]) root.add(cyl(.12,.12,.9,mat('#f2c230'),x,.45,z,10));
  // waste bins and a generator (NEPA backup) by the east fence
  const gen=new THREE.Group(); gen.position.set(31,0,-18); root.add(gen); gen.add(box(4.2,2.2,1.8,mat('#ffffff'),0,1.1,0), box(4.3,.2,1.9,mat('#2bb673'),0,2.25,0), box(.25,.9,.25,mat('#9aa3c4'),1.6,2.7,.3));
  gen.add(signPlane(signTex(['GENERATOR'],'#ffffff','#1b1f3b',256,64),1.6,.4,0,1.6,.91));
  for(const [x,c] of [[27.6,'#2f5ef0'],[28.6,'#2bb673'],[29.6,'#f2c230']]) root.add(box(.8,1.1,.8,mat(c),x,.55,-18));
}
function buildFenceTrees(){
  const root=G.root, postM=mat('#c3c8de'), railM=mat('#c3c8de');
  const fenceRun=(ax,c,a,b)=>{ const len=b-a, n=Math.max(1,Math.round(len/2.6)), mid=(a+b)/2;
    for(let i=0;i<=n;i++){ const p=a+len*i/n; iq('post',UB,postM,ax==='x'?M4(p,.8,c,0,.08,1.6,.08):M4(c,.8,p,0,.08,1.6,.08)); }
    for(const y of [1.58,.1]) iq('rail',UB,railM,ax==='x'?M4(mid,y,c,0,len,.05,.05):M4(c,y,mid,0,.05,.05,len));
    const t=meshTex(); t.repeat.set(len/1.4,1.1); const m=new THREE.Mesh(new THREE.PlaneGeometry(len,1.5),new THREE.MeshLambertMaterial({color:lin('#ffffff'),map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    m.position.set(ax==='x'?mid:c,.83,ax==='x'?c:mid); if(ax==='z') m.rotation.y=Math.PI/2; decor(m); root.add(m); };
  fenceRun('x',-30,-40,40); fenceRun('x',30,-40,-34); fenceRun('x',30,-22.8,40); fenceRun('z',-40,-30,30); fenceRun('z',40,-30,30);
  // lollipop trees: inside the fence line and around the edges, plus a few outside fading into the fog
  const trunkM=mat('#d6c3ad'), crownM=mat('#ffffff'); const greens=['#5cc48a','#4fb97f','#72d19c','#63c792'];
  const tree=(x,z,s=1,out=false)=>{ iq(out?'trunkO':'trunk',UB,trunkM,M4(x,.7*s,z,0,.16*s,1.4*s,.16*s),null,out?{decor:true}:{}); iq(out?'crownO':'crown',USPH,crownM,M4(x,(1.4+1.05)*s,z,0,1.05*s,1.15*s,1.05*s),greens[Math.floor(rr()*4)],out?{decor:true}:{}); };
  for(let x=-37;x<=37;x+=5.5) tree(x,-28,1);
  for(let z=-24;z<=26;z+=6) { tree(-38.2,z,.95); tree(38.2,z,.95); }
  for(const [x,z] of [[-15.5,27.8],[-11,27.8],[-6,27.8],[2,27.8],[10,27.8],[18,27.8],[26,27.8],[34,27.8],[-28,-24],[-20,-26],[22,-24],[30,-12],[34,-2],[-34,-18]]) tree(x,z,1);
  for(let i=0;i<40;i++){ const a=rr()*Math.PI*2, d=50+rr()*45; tree(Math.cos(a)*d*1.2,Math.sin(a)*d,1+rr()*.5,true); }
}

function buildSurroundings(){
  const root=G.root, road=R(-150,33.5,150,39.5);
  root.add(rectPlane(road,mat(COL.road,{po:1}),.008)); root.add(rectPlane(R(-34,30,-26,33.5),mat(COL.road,{po:1}),.008));
  for(let x=-148;x<150;x+=4.2) iq('dash',UB,mat(COL.dash),M4(x,.016,36.5,0,2,.01,.16),null,{shadow:false});
  root.add(rectPlane(R(-150,39.5,150,41),mat('#e2e5f3',{po:1}),.01), rectPlane(R(-150,32,-34,33.5),mat('#e2e5f3',{po:1}),.01), rectPlane(R(-26,32,150,33.5),mat('#e2e5f3',{po:1}),.01));
  // neighbouring warehouses (decor, hidden on Low)
  for(const [x,z,w,d,h,roofC] of [[-12,-44,30,12,6,'#3a66f2'],[56,-6,14,34,7,'#e8ebf5'],[-60,8,16,24,5,'#3a66f2'],[30,52,28,10,5,'#e8ebf5'],[-40,52,20,10,6,'#3a66f2']]){
    const g=new THREE.Group(); g.position.set(x,0,z); root.add(decor(g));
    g.add(box(w,h,d,mat('#f6f7fd'),0,h/2,0), box(w+.4,.35,d+.4,mat(roofC),0,h+.17,0), box(w+.02,.9,d+.02,mat('#eceef8'),0,.45,0));
    for(let i=-w/2+3;i<w/2-2;i+=4.5) g.add(box(2.6,3,.08,mat('#dfe3f1'),i,1.5,d/2+.02)); }
  // danfos on the public road (Lagos yellow buses), driving both ways
  W.danfo=[]; for(const [x,dir] of [[-60,1],[40,-1]]){ const v=makeDanfoVan(); v.position.set(x,0,dir>0?35:38); v.rotation.y=dir>0?-Math.PI/2:Math.PI/2; root.add(v); W.danfo.push({obj:v,x,dir,v:9+Math.random()*3}); }
}
function makeDanfoVan(){ const g=new THREE.Group(), y=mat('#f6c21c'), dk=mat('#272b3d'), gl=mat('#38425f'), tyre=mat('#1d2030');
  g.add(box(1.9,1.5,4.6,y,0,1.15,0), box(1.92,.55,3.4,gl,0,1.55,.3), box(1.92,.55,.06,gl,0,1.55,-2.31));
  for(const s of [-1,1]) g.add(box(.02,.12,4.62,dk,s*.96,1.05,0));
  for(const z of [-1.5,1.5]) for(const s of [-1,1]){ const w=cyl(.36,.36,.25,tyre,s*.85,.36,z,14); w.rotation.z=Math.PI/2; g.add(w); }
  g.add(shadowBlob(2.6,5.6,.22)); consolidate(g); return g; }

// ================== PEOPLE & VEHICLES ==================
function makePerson(o={}){
  const g=new THREE.Group(), sk=mat(o.skin||'#6b4630'), pants=mat(o.pants||'#2f3550'), shirt=mat(o.shirt||'#e9ecf5'), boot=mat('#2a2d3a');
  const legs=[]; for(const s of [-1,1]){ const hip=new THREE.Group(); hip.position.set(s*.1,.86,0); hip.add(box(.15,.82,.19,pants,0,-.41,0), box(.17,.12,.3,boot,0,-.8,-.05)); g.add(hip); legs.push(hip); }
  g.add(cyl(.2,.17,.64,shirt,0,1.18,0,12));
  const vest=new THREE.Group(); const vm=mat(o.vest||'#ffd23f'); vest.add(cyl(.212,.186,.5,vm,0,1.22,0,12)); const refl=mat('#eef1f8'); vest.add(cyl(.216,.2,.04,refl,0,1.1,0,12), cyl(.216,.21,.04,refl,0,1.3,0,12)); g.add(vest); vest.visible=!!o.vest;
  const arms=[]; for(const s of [-1,1]){ const sh=new THREE.Group(); sh.position.set(s*.27,1.46,0); sh.add(box(.1,.56,.11,shirt,0,-.28,0), sph(.055,sk,0,-.6,0,8)); g.add(sh); arms.push(sh); }
  g.add(cyl(.05,.055,.08,sk,0,1.53,0,8)); const head=sph(.125,sk,0,1.67,0,14); g.add(head);
  const hat=new THREE.Group(); const hm=mat(o.hatC||'#ffffff'); const dome=new THREE.Mesh(new THREE.SphereGeometry(.142,14,8,0,Math.PI*2,0,Math.PI/2),hm); dome.position.y=1.7; dome.castShadow=true; hat.add(dome, cyl(.165,.165,.02,hm,0,1.705,-.01,14)); g.add(hat); hat.visible=!!o.hat;
  if(o.cap){ g.add(cyl(.135,.135,.08,mat(o.cap),0,1.76,0,12), box(.16,.02,.12,mat(o.cap),0,1.73,-.15)); }
  const bl=shadowBlob(.9,.9,.2); g.add(bl);
  g.userData={legs,arms,vest,hat,head};
  if(o.label) g.userData.label=o.label;
  return g;
}
function animPerson(g,ph,moving,seated){ const u=g.userData; if(!u.legs) return;
  if(seated){ u.legs.forEach(l=>l.rotation.x=1.45); u.arms.forEach(a=>a.rotation.x=.9); return; }
  const a=moving?Math.sin(ph)*.55:0; u.legs[0].rotation.x=a; u.legs[1].rotation.x=-a; u.arms[0].rotation.x=-a*.8; u.arms[1].rotation.x=a*.8; }
const SKINS=['#4a2e1e','#6b4630','#5a3825','#7b4a2e','#8a5a3a'];
function makeForklift(o={}){
  const g=new THREE.Group(), y=mat(o.color||COL.fork), yd=mat('#e0a512'), dk=mat('#2b2f45'), gr=mat('#4a5070'), tyre=mat('#1d2030');
  g.add(box(1.12,.5,1.75,y,0,.55,.15), box(1.14,.78,.5,yd,0,.75,.88), box(1.0,.12,.4,dk,0,1.2,.88));
  g.add(box(.5,.14,.42,dk,0,.9,.28), box(.5,.48,.1,dk,0,1.18,.5));
  for(const [x,z] of [[-.48,-.4],[.48,-.4],[-.48,.75],[.48,.75]]) g.add(box(.05,1.25,.05,dk,x,1.45,z));
  g.add(box(1.02,.05,1.2,dk,0,2.08,.17)); for(let i=0;i<4;i++) g.add(box(.04,.04,1.2,dk,-.36+i*.24,2.12,.17));
  const swh=cyl(.12,.12,.03,dk,0,1.25,-.15,10); swh.rotation.x=.9; g.add(swh);
  for(const s of [-1,1]) g.add(box(.08,2.3,.12,gr,s*.32,1.2,-.88)); g.add(box(.72,.08,.12,gr,0,2.32,-.88));
  const car=new THREE.Group(); car.position.y=0; g.add(car); car.add(box(.82,.5,.06,dk,0,.4,-.98)); for(const s of [-1,1]) car.add(box(.11,.05,1.1,dk,s*.26,.12,-1.55), box(.11,.4,.05,dk,s*.26,.32,-1.0));
  const load=new THREE.Group(); car.add(load); pallet(0,.15,-1.55,o.load||'carton',0,{parent:load}); load.visible=!!o.carry;
  for(const [x,z,r] of [[-.52,-.62,.3],[.52,-.62,.3],[-.52,.75,.24],[.52,.75,.24]]){ const w=cyl(r,r,.22,tyre,x,r,z,14); w.rotation.z=Math.PI/2; g.add(w); }
  const beacon=sph(.08,mat('#ff9d1a',{e:'#ff8a00',ei:.8,u:1}),0,2.18,.6,8); g.add(beacon);
  const spot=flat(1.1,1.1,basic('#3f6dff',{t:.35}),0,.05,-4.2); spot.material.map=SHTEX; spot.userData.keep=true; g.add(decor(spot));
  const tag=new THREE.Group(); tag.add(box(.22,.3,.02,mat('#e23b3b'),0,1.45,-.25)); tag.visible=false; g.add(tag);
  g.add(shadowBlob(1.7,3.4,.22));
  let drv=null; if(o.driver){ drv=makePerson({vest:'#ff8a1f',hat:true,hatC:'#ffd23f',skin:o.skin||SKINS[1],shirt:'#3b5bb5'}); drv.position.set(0,.3,.3); animPerson(drv,0,false,true); g.add(drv); }
  car.traverse(o2=>{ if(o2.isMesh) o2.userData.keep=true; }); load.userData.keep=true;
  consolidate(g); g.userData={car,load,tag,beacon,drv};
  return g;
}
function makeTruck(stripe='#2f5ef0',own=false){
  const g=new THREE.Group(), wh=mat('#fbfcff'), dk=mat('#272b3d'), gl=mat('#38425f'), st=mat(stripe), tyre=mat('#1d2030'), gr=mat('#c4c9dc');
  g.add(box(2.4,2.15,1.9,wh,0,1.7,-3.35), box(2.42,.9,.06,gl,0,2.15,-4.31), box(2.3,.32,.25,gr,0,.75,-4.3));
  for(const s of [-1,1]) g.add(box(.04,.75,1.0,gl,s*1.21,2.15,-3.5), box(.06,.12,.4,mat('#ffd23f'),s*.9,.95,-4.33));
  g.add(box(2.3,.12,1.9,st,0,2.82,-3.35));
  g.add(box(1.9,.35,8.4,dk,0,.72,.1));
  g.add(box(2.5,2.7,6.3,wh,0,2.4,1.12), box(2.52,.34,6.32,st,0,1.62,1.12));
  if(own){ const l=signPlane(signTex(['SITE LIFE'],'rgba(0,0,0,0)','#2a55e5',256,64),2.6,.65,0,2.6,1.12); for(const s of [-1,1]){ const c=l.clone(); c.position.x=s*1.262; c.rotation.y=s*Math.PI/2; g.add(c); } }
  g.add(box(.03,2.5,.02,gr,0,2.4,4.28));
  const rev=box(2.2,.12,.04,mat('#ffffff',{e:'#ffffff',ei:0,u:1}),0,.95,4.29); g.add(rev);
  for(const z of [-3.25,1.85,3.15]) for(const s of [-1,1]){ const w=cyl(.48,.48,.34,tyre,s*1.06,.48,z,16); w.rotation.z=Math.PI/2; g.add(w); }
  g.add(shadowBlob(3.4,10,.24));
  rev.userData.keep=true; consolidate(g); g.userData.rev=rev; return g;
}

// ================== ACTORS (forklifts, trucks, people) ==================
const P={x:START.x,z:START.z,face:Math.PI,moving:false,ph:0,path:null,pi:0,obj:null};
const FL=[], TRUCKS=[], NPC={}, NPCS=[];
let TRUCK_N=2051; const DEST=['Ibadan','Abeokuta','Ikeja','Benin','Ota','Ilorin'], FROM=['Apapa port','Tin Can port','Kano','Onitsha','Aba'];
function buildActors(){
  const dyn=G.dyn;
  P.obj=makePerson({shirt:'#e9ecf5',pants:'#2f3a66',skin:SKINS[2],vest:'#ffd23f',hatC:'#2f5ef0'}); P.obj.userData.vest.visible=false; dyn.add(P.obj);
  // forklifts: FL-01 dock aisle, FL-02 aisle A1 (both drive), FL-03 parked for the pre-use check, FL-04 charging
  const mk=(id,o)=>{ const g=makeForklift(o); dyn.add(g); const f={id,obj:g,...o,dir:1,stop:0,clear:0,wait:0,carry:!!o.carry,lift:0,bat:o.bat||.8,state:o.state||'move',speed:0}; FL.push(f); return f; };
  mk('FL-01',{driver:'Chidi',skin:SKINS[0],ax:'x',a:-12.5,b:12.5,c:-6,area:'Dock aisle',x:-3,z:-6,v:2.4,carry:true,bat:.74});
  mk('FL-02',{driver:'Musa',skin:SKINS[3],ax:'x',a:-11.8,b:9.8,c:-18.7,area:'Aisle A1',x:4,z:-18.7,v:2.0,bat:.58,load:'wrap'});
  const f3=mk('FL-03',{state:'parked',x:-12.2,z:-10.1,area:'Pre-use check bay',bat:.91}); f3.obj.rotation.y=-Math.PI/2;
  const f4=mk('FL-04',{state:'charge',x:13.9,z:-19.2,area:'Battery charging bay',bat:.64}); f4.obj.rotation.y=-Math.PI/2;
  for(const f of FL){ f.obj.position.set(f.x,0,f.z); if(f.ax) f.obj.rotation.y=-Math.PI/2; }
  // trucks: one per bay; bays 1 and 2 receive (unload), bay 3 dispatches (load)
  BAYS.forEach((b,i)=>TRUCKS.push({bay:i,b,obj:null,st:'empty',t:i===0?6:0,prog:0,id:'',kind:i===2?'out':'in',where:'',path:null,s:0,stop:0}));
  dockTruck(TRUCKS[1],.35); dockTruck(TRUCKS[2],.62);
  // people
  const add=(id,o,route,v=1.2)=>{ const g=makePerson(o); dyn.add(g); const n={id,obj:g,route,i:0,v,x:route[0][0],z:route[0][1],face:0,ph:Math.random()*6,wait:0,moving:false,...o}; g.position.set(n.x,0,n.z); NPC[id]=n; NPCS.push(n); return n; };
  add('BISI',{vest:'#ff8a1f',hat:true,hatC:'#ffffff',skin:SKINS[1],shirt:'#ffffff',pants:'#2a3050',name:'Bisi'},[STATIONS[0].host],2.6);
  add('SANI',{vest:'#d4f03c',cap:'#2f3550',skin:SKINS[3],shirt:'#3a4a7a',name:'Mallam Sani'},[[-22.7,26.4]]);
  add('NGOZI',{vest:'#d4f03c',hat:true,hatC:'#ffffff',skin:SKINS[2],shirt:'#c2417a',pants:'#2a3050',name:'Ngozi'},[[-14.7,-2.8],[-14.7,-13.6],[-14.7,-2.8]],1.0);
  add('ADA',{vest:'#ff8a1f',hat:true,hatC:'#ffd23f',skin:SKINS[4],shirt:'#2f9e6e',name:'Ada'},[[-5.5,-14.6],[8.5,-14.6]],.9);
  add('TUNDE',{cap:'#d23a3a',skin:SKINS[0],shirt:'#7a5bd1',pants:'#4a4f68',name:'Tunde'},[[3.0,-17.35]]);
  add('KOLA',{vest:'#ff8a1f',hat:true,hatC:'#ffffff',skin:SKINS[1],shirt:'#2f3550',name:'Kola'},[[-9.8,7.0]]);
  add('EMEKA',{vest:'#d4f03c',hat:true,hatC:'#16935c',skin:SKINS[3],shirt:'#ffffff',name:'Oga Emeka'},[[-13.1,-15.3]]);
  add('FUNMI',{vest:'#d4f03c',hat:true,hatC:'#ffffff',skin:SKINS[1],shirt:'#2a55e5',name:'Funmi'},[[-24,3],[-24,26],[-24,3]],1.1);
  NPC.TUNDE.obj.rotation.y=-Math.PI/2; NPC.KOLA.obj.rotation.y=Math.PI*.8; NPC.EMEKA.obj.rotation.y=-Math.PI/2; NPC.SANI.obj.rotation.y=Math.PI/2;
  // pin, selection ring, guide chevrons
  const pin=new THREE.Group(); G.dyn.add(pin); const pm=basic('#2a55e5'); const head=new THREE.Mesh(new THREE.SphereGeometry(.62,20,14),new THREE.MeshLambertMaterial({color:lin('#2f5ef0'),emissive:lin('#1a3bb0'),emissiveIntensity:.35}));
  head.position.y=3.3; const tip=new THREE.Mesh(new THREE.ConeGeometry(.42,1.25,18),head.material); tip.rotation.x=Math.PI; tip.position.y=2.55; const dot=sph(.25,mat('#ffffff',{e:'#ffffff',ei:.6,u:1}),0,3.32,0,12); dot.scale.z=.4;
  pin.add(head,tip,dot); const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.15,40).rotateX(-Math.PI/2),basic('#2a55e5',{t:.55})); ring.position.y=.06; pin.add(ring); pin.userData={head,tip,dot,ring}; W.pin=pin;
  const sr=new THREE.Mesh(new THREE.RingGeometry(1,1.08,48).rotateX(-Math.PI/2),basic('#2a55e5',{t:.75})); sr.position.y=.07; sr.visible=false; G.dyn.add(sr); W.selRing=sr;
  const pr=new THREE.Mesh(new THREE.RingGeometry(.42,.52,32).rotateX(-Math.PI/2),basic('#f0782d',{t:.85})); pr.position.y=.06; P.obj.add(pr);
  const chev=new THREE.Shape(); chev.moveTo(-.38,.12); chev.lineTo(0,-.26); chev.lineTo(.38,.12); chev.lineTo(.38,.32); chev.lineTo(0,-.06); chev.lineTo(-.38,.32); chev.closePath();
  const cg=new THREE.ShapeGeometry(chev).rotateX(-Math.PI/2); W.chev=new THREE.InstancedMesh(cg,basic('#2a55e5',{t:.6,side:THREE.DoubleSide}),40); W.chev.count=0; W.chev.frustumCulled=false; W.chev.renderOrder=3; G.dyn.add(W.chev);
}
// ---- trucks ----
function curvePts(pts,step=.4){ const c=new THREE.CatmullRomCurve3(pts.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal'); const n=Math.max(4,Math.ceil(c.getLength()/step)); const ps=c.getSpacedPoints(n); const d=[0]; for(let i=1;i<ps.length;i++) d.push(d[i-1]+ps[i].distanceTo(ps[i-1])); return {ps,d,len:d[d.length-1]}; }
function arrivePath(b){ return [curvePts([[-30,42],[-30,26],[-29,20],[-25,18],[b+5,18],[b+13,18]]),curvePts([[b+13,18],[b+6,17.5],[b+1.6,14.6],[b,10],[b,2.75]])]; }
function departPath(b){ return curvePts([[b,2.75],[b,9],[b-1.5,14.4],[b-6,17.7],[b-12,18],[-25,18],[-29,20],[-30,25],[-30,42]]); }
function newTruck(T,docked){ if(T.obj){ G.dyn.remove(T.obj); }
  const c=['#2f5ef0','#f07a2a','#24a3a0'][T.bay], own=T.bay!==1; T.obj=makeTruck(c,own); G.dyn.add(T.obj); T.id='TRK-'+(TRUCK_N++);
  T.where=T.kind==='out'?DEST[Math.floor(Math.random()*DEST.length)]:FROM[Math.floor(Math.random()*FROM.length)]; T.driver=['Yusuf','Segun','Ibrahim','Emmanuel','Kunle'][Math.floor(Math.random()*5)]; T.keys=false; T.chocks=false; return T; }
function dockTruck(T,prog){ newTruck(T,true); T.st='docked'; T.prog=prog; T.t=0; T.keys=true; T.chocks=true; setTruckAt(T,T.b,2.75,Math.PI); }
function setTruckAt(T,x,z,ry){ T.obj.position.set(x,0,z); T.obj.rotation.y=ry; T.x=x; T.z=z; }
function roadBusy(except){ return TRUCKS.some(t=>t!==except&&(t.st==='arrive'||t.st==='reverse'||t.st==='depart')); }
function startReverse(T){ if(!T.obj||T.st==='empty'||T.st==='depart'){ newTruck(T); } const [,rp]=arrivePath(T.b); T.path=rp; T.s=0; T.st='reverse'; T.keys=false; T.chocks=false; const p=rp.ps[0]; setTruckAt(T,p.x,p.z,-Math.PI/2); }
function truckUpdate(T,dt){
  const door=W.doors[T.bay];
  if(T.st==='empty'){ door.open=Math.max(0,door.open-dt*.5); T.t-=dt; if(T.t<=0&&!roadBusy(T)&&!S.alarm){ newTruck(T); T.paths=arrivePath(T.b); T.path=T.paths[0]; T.s=0; T.st='arrive'; } return; }
  if(T.st==='docked'){ door.open=Math.min(1,door.open+dt*.6); if(S.alarm||S.nepa>0) return; T.prog=Math.min(1,T.prog+dt/(T.kind==='out'?95:80)); if(T.prog>=1){ T.t+=dt; if(T.t>4&&!roadBusy(T)&&!(T.bay===2&&S.si<STATIONS.findIndex(s=>s.id==='dispatch')+1&&started)){ T.path=departPath(T.b); T.s=0; T.st='depart'; T.keys=false; T.chocks=false; } } return; }
  door.open=T.st==='depart'?Math.max(0,door.open-dt*.5):door.open;
  if(S.alarm) return;
  const rev=T.st==='reverse', v=rev?1.6:4.6, pth=T.path;
  // stop for people in the way (player or anyone on foot) within 4.5 m ahead in the direction of motion
  const i0=Math.min(pth.ps.length-2,lowerIdx(pth.d,T.s)), p0=pth.ps[i0], p1=pth.ps[i0+1]; const mx=p1.x-p0.x, mz=p1.z-p0.z, ml=Math.hypot(mx,mz)||1;
  const fx=T.x+mx/ml*4.6, fz=T.z+mz/ml*4.6; let blocked=false;
  for(const h of walkers()) if(Math.hypot(h.x-fx,h.z-fz)<3.2){ blocked=true; if(h===P&&T.stop<=0) horn(); break; }
  if(blocked){ T.stop=1.2; return; } if(T.stop>0){ T.stop-=dt; return; }
  T.s=Math.min(pth.len,T.s+v*dt); const i=Math.min(pth.ps.length-2,lowerIdx(pth.d,T.s)), a=pth.ps[i], b=pth.ps[i+1], k=(T.s-pth.d[i])/Math.max(1e-6,pth.d[i+1]-pth.d[i]);
  const x=a.x+(b.x-a.x)*k, z=a.z+(b.z-a.z)*k, dx=b.x-a.x, dz=b.z-a.z; let ry=Math.atan2(-dx,-dz); if(rev) ry+=Math.PI; setTruckAt(T,x,z,ry);
  T.obj.userData.rev.material.emissiveIntensity=rev?.9:0;
  if(rev&&S.t%0.9<dt&&Math.hypot(P.x-T.x,P.z-T.z)<22) beep();
  if(T.s>=pth.len){ if(T.st==='arrive'){ T.path=T.paths[1]; T.s=0; T.st='reverse'; } else if(T.st==='reverse'){ T.st='docked'; T.prog=0; T.t=0; T.keys=true; T.chocks=true; T.obj.userData.rev.material.emissiveIntensity=0; } else { G.dyn.remove(T.obj); T.obj=null; T.st='empty'; T.t=18+Math.random()*10; } }
}
function lowerIdx(d,s){ let lo=0,hi=d.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(d[m]<=s) lo=m; else hi=m-1; } return lo; }
// ---- forklifts ----
function walkers(){ const out=[P]; for(const n of NPCS) out.push(n); return out; }
function flUpdate(f,dt){
  const g=f.obj, u=g.userData;
  u.beacon.visible=f.state==='move'&&Math.sin(G.t*8)>-.2;
  if(f.state==='charge'){ f.bat=Math.min(1,f.bat+dt/900); return; }
  if(f.state!=='move'){ u.car.position.y+=(0-u.car.position.y)*Math.min(1,dt*3); return; }
  if(S.alarm){ f.speed=0; u.car.position.y+=(0-u.car.position.y)*Math.min(1,dt*2); return; }
  if(S.nepa>0){ f.speed=0; return; }
  const pos=f.ax==='x'?g.position.x:g.position.z;
  if(f.wait>0){ f.wait-=dt; const k=f.wait>1.5?1-(f.wait-1.5)/1.5:f.wait/1.5; u.car.position.y=f.ax==='x'&&f.id==='FL-02'?k*1.6:k*.25; if(f.wait<=0){ f.dir*=-1; f.carry=!f.carry; u.load.visible=f.carry; } f.speed=0; return; }
  // stop for people ahead (player, NPCs, other players) — like the factory forklift at the crossing
  let blocked=false; const dir=f.dir;
  for(const h of walkers()){ const a=(f.ax==='x'?h.x-g.position.x:h.z-g.position.z)*dir, l=f.ax==='x'?h.z-g.position.z:h.x-g.position.x; if(a>-.5&&a<5.2&&Math.abs(l)<1.25){ blocked=true; if(h===P&&f.stop<=0){ horn(); } break; } }
  if(blocked){ f.stop=1.4; f.speed=0; return; } if(f.stop>0){ f.stop-=dt; f.speed=0; return; }
  const nv=pos+dir*f.v*dt; f.speed=f.v;
  if((dir>0&&nv>=f.b)||(dir<0&&nv<=f.a)){ f.wait=3; return; }
  if(f.ax==='x') g.position.x=nv; else g.position.z=nv;
  g.rotation.y=f.ax==='x'?(dir>0?-Math.PI/2:Math.PI/2):(dir>0?Math.PI:0);
  f.bat=Math.max(.1,f.bat-dt/2400);
}
function flStatus(f){ if(f.id==='FL-03') return S.flcheck.done?['Do not use','bad']:['Check due','warn'];
  if(f.state==='charge') return ['Charging','blue']; if(S.alarm) return ['Parked (alarm)','bad']; if(S.nepa>0) return ['Waiting (NEPA)','warn'];
  if(f.stop>0) return ['Stopped for pedestrian','warn']; if(f.wait>0) return [f.carry?'Putting away':'Picking up','good']; return ['Moving','good']; }
function truckStatus(T){ return {arrive:['Arriving','blue'],reverse:['Reversing','warn'],docked:[T.prog>=1?(T.kind==='out'?'Loaded':'Empty'):(T.kind==='out'?'Loading':'Unloading'),T.prog>=1?'good':'good'],depart:['Departing','blue'],empty:['Available','idle']}[T.st]; }
// ---- people ----
function npcUpdate(n,dt){
  const g=n.obj; let moving=false;
  if(n.id==='TUNDE'&&S.hz.TUNDE&&S.hz.TUNDE.ok){ n.route=[[-14.9,-16.0]]; }
  if(S.alarm&&!['BISI'].includes(n.id)){ if(!n.evac){ n.evac=true; n.path=findPath(n.x,n.z,AP.x1+2+Math.random()*4,AP.z1+2+Math.random()*4); n.pi=1; } }
  if(n.path){ const t=n.path[n.pi]; if(t){ const dx=t[0]-n.x, dz=t[1]-n.z, d=Math.hypot(dx,dz), st=Math.min(d,(S.alarm?1.6:n.v)*dt); if(d<.05) n.pi++; else { n.x+=dx/d*st; n.z+=dz/d*st; n.face=Math.atan2(-dx,-dz); moving=true; } } else n.path=null; }
  else if(n.route.length>1){ const t=n.route[n.i]; const dx=t[0]-n.x, dz=t[1]-n.z, d=Math.hypot(dx,dz);
    if(n.wait>0){ n.wait-=dt; } else if(d<.05){ n.i=(n.i+1)%n.route.length; n.wait=1.5; }
    else { const st=Math.min(d,n.v*dt); // NPCs wait at forklift aisles if a forklift is close
      const nx=n.x+dx/d*st, nz=n.z+dz/d*st; if(!(FA.some(f=>inR(f.r,nx,nz))&&FL.some(f=>f.state==='move'&&Math.hypot(f.obj.position.x-nx,f.obj.position.z-nz)<5))){ n.x=nx; n.z=nz; n.face=Math.atan2(-dx,-dz); moving=true; } } }
  else if(n.route.length===1&&!n.path){ const t=n.route[0]; if(Math.hypot(t[0]-n.x,t[1]-n.z)>.3){ n.path=findPath(n.x,n.z,t[0],t[1]); n.pi=1; } }
  if(moving){ n.ph+=dt*7; g.rotation.y=n.face; } g.position.set(n.x,0,n.z); animPerson(g,n.ph,moving); n.moving=moving;
  if(n.id==='TUNDE'&&!moving&&!(S.hz.TUNDE)){ g.userData.arms[1].rotation.x=-1.1; }
}
function npcGo(id,x,z){ const n=NPC[id]; n.route=[[x,z]]; n.path=findPath(n.x,n.z,x,z); n.pi=1; }

// ================== ENTITIES (things you can click and inspect) ==================
const ENTS={}; const PROXIES=[];
function ent(id,o){ ENTS[id]={id,...o}; const s=o.size||[2,2,2]; const m=new THREE.Mesh(new THREE.BoxGeometry(s[0],s[1],s[2]),new THREE.MeshBasicMaterial({visible:false})); m.userData.ent=id; G.dyn.add(m); ENTS[id].proxy=m; PROXIES.push(m); return ENTS[id]; }
function entPos(e){ if(e.obj&&e.obj.parent) return e.obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...(e.off||[0,0,0]))); return new THREE.Vector3(e.x||0,0,e.z||0); }
const pct=v=>Math.round(v*100)+'%';
function buildEntities(){
  for(const f of FL){ ent(f.id,{kind:'Forklift',ic:'forklift',obj:f.obj,size:[1.6,2.6,3.4],off:[0,1.2,0],fl:f,
    sub:()=>f.driver?L('Driver: {0}',f.driver):tr(f.id==='FL-03'?'Unassigned':'On charge'),
    status:()=>flStatus(f), prog:()=>({v:f.bat,label:L('Battery {0}',pct(f.bat)),tone:f.bat<.3?'bad':f.bat<.5?'warn':''}),
    rows:()=>[['Type','Electric counterbalance, 2.5 t'],['Area',f.area],['Operator licence',f.driver?'Valid (Mar 2027)':'—'],['Carrying',f.carry&&f.state==='move'?'1 pallet':'Empty'],
      ['Speed',f.state==='move'?((f.speed*3.6).toFixed(1)+' km/h'):'0 km/h',1],['Pre-use check',f.id==='FL-03'?(S.flcheck.done?'Failed: tagged out':'Due now'):'Done 07:05',0,f.id==='FL-03'&&S.flcheck.done]]}); }
  for(const T of TRUCKS) ent('BAY'+(T.bay+1),{kind:'Dock',ic:'dock',x:T.b,z:-1.2,size:[3.4,4,1.6],off:[0,2,0],title:L('Bay {0}',T.bay+1),
    sub:()=>tr(T.kind==='out'?'Outbound (dispatch)':'Inbound (receiving)'),
    status:()=>T.st==='docked'?['Truck docked','good']:T.st==='empty'?['Available','idle']:['Truck moving','warn'], prog:()=>T.st==='docked'?{v:T.prog,label:L('{0} of 8 pallets',Math.round(T.prog*8))}:null,
    rows:()=>[['Truck',T.obj?T.id:'—',1],['Door',W.doors[T.bay].open>.5?'Open':'Closed'],['Dock lock',T.chocks?'Engaged':'Off'],['Dock leveller',T.st==='docked'?'Down':'Stowed'],['Traffic light',T.st==='docked'?'Green (forklift may enter)':'Red (no entry)']]});
  ent('R1',{kind:'Rack',ic:'rack',x:-.5,z:-12.25,size:[21,6,1.3],off:[0,3,0],title:'R1',sub:()=>tr('Pallet racking, 8 bays, 4 levels'),status:()=>S.done.racking?['Quarantined bay','bad']:['Damage: red','bad'],
    rows:()=>[['Max load','1,000 kg per level'],['Last inspection','12 Sep (SEMA)'],['Upright, bay 2','Dented: RED risk',0,1],['Beam locks','All fitted']]});
  ent('R2',{kind:'Rack',ic:'rack',x:-.5,z:-16.35,size:[21,6,1.3],off:[0,3,0],title:'R2',sub:()=>tr('Pallet racking, 8 bays, 4 levels'),status:()=>['In use','good'],rows:()=>[['Max load','1,000 kg per level'],['Last inspection','12 Sep (SEMA)'],['Uprights','No damage seen']]});
  ent('R2-B6',{kind:'Rack bay',ic:'rack',x:3.44,z:-16.35,size:[2.7,1.6,1.4],off:[0,3,0],title:'R2 · Bay 6',sub:()=>tr('Level 3 beam'),status:()=>S.hz['R2-B6']?['Reported','good']:['In use','good'],
    rows:()=>[['Beam','Front, level 3'],['Beam lock (left)','Fitted'],['Beam lock (right)','Missing',0,1],['Load on level','2 pallets, 640 kg']],hz:'R2-B6'});
  ent('R3',{kind:'Rack',ic:'rack',x:-.5,z:-21.05,size:[21,6,1.3],off:[0,3,0],title:'R3',sub:()=>tr('Pallet racking along the back wall'),status:()=>['In use','good'],rows:()=>[['Max load','1,000 kg per level'],['Fire exit gap','Between bays 2 and 3']]});
  ent('P-1026',{kind:'Pallet stack',ic:'box',x:-29.3,z:10.2,size:[1.6,6.2,1.6],off:[0,3,0],sub:()=>tr('Outdoor yard staging'),status:()=>S.hz['P-1026']?['Reported','good']:['Staged','idle'],
    rows:()=>[['Contents','Ceramic tiles and cartons'],['Height','5 pallets (yard limit 3)',0,1],['Stability','Leaning to one side',0,1],['Ground','Paved, level']],hz:'P-1026'});
  ent('P-0457',{kind:'Pallet',ic:'box',x:3.5,z:-10.7,size:[1.4,1.4,1.4],off:[0,.7,0],sub:()=>tr('Staging lane C'),status:()=>S.hz['P-0457']?['Reported','good']:['Waiting for put-away','idle'],
    rows:()=>[['Contents','Cartons, 420 kg'],['Pallet boards','Two broken, one missing',0,1],['Destination','R2 · level 2']],hz:'P-0457'});
  ent('P-2210',{kind:'Pallet',ic:'box',x:-2.5,z:-10.7,size:[1.4,2.6,1.4],off:[0,1.3,0],sub:()=>tr('Staging lane B'),status:()=>['Waiting for put-away','idle'],
    rows:()=>[['Contents','Bottled water, wrapped'],['Height','2 pallets'],['Wrap','Intact'],['Position','Inside the yellow lines']],hz:'P-2210'});
  ent('FE-2',{kind:'Fire exit',ic:'exit',x:-3,z:-21.2,size:[3,2.6,1.6],off:[0,1.3,0],title:'FE-2',sub:()=>tr('Fire exit, back wall'),status:()=>S.hz['FE-2']?['Cleared','good']:['Check','warn'],
    rows:()=>[['Exit sign','Lit'],['Door','Push bar, opens outwards'],['In front of the door','3 pallets',0,1]],hz:'FE-2'});
  ent('FE-1',{kind:'Fire exit',ic:'exit',x:-15.5,z:-19,size:[1.2,2.6,2.2],off:[0,1.3,0],title:'FE-1',sub:()=>tr('Fire exit, west wall'),status:()=>['Clear','good'],rows:()=>[['Exit sign','Lit'],['Route','Walkway to the assembly point']]});
  ent('EXT-04',{kind:'Fire point',ic:'fire',x:-15.5,z:-14.3,size:[.8,2.2,1],off:[0,1.1,0],sub:()=>tr('West wall, by the pick aisle'),status:()=>S.hz['EXT-04']?['Reported','good']:['Check','warn'],
    rows:()=>[['Sign','In place'],['Extinguisher','Bracket empty',0,1],['Last check','—']],hz:'EXT-04'});
  ent('EXT-02',{kind:'Fire point',ic:'fire',x:-13.1,z:-2.5,size:[.8,2.2,.8],off:[0,1.1,0],sub:()=>tr('By the west pedestrian door'),status:()=>['In place','good'],
    rows:()=>[['Extinguisher','CO2, 5 kg, in bracket'],['Pin and seal','Intact'],['Last check','This month (tag signed)']],hz:'EXT-02'});
  const pe=(id,kind,sub,rows,o={})=>ent(id,{kind,ic:'user',obj:NPC[id].obj,size:[.9,1.9,.9],off:[0,.95,0],title:NPC[id].name,sub:()=>tr(sub),status:o.status||(()=>['On shift','good']),rows,...o});
  pe('TUNDE','Person','Delivery driver (visitor)',()=>[['Location',S.hz.TUNDE?'Walkway':'Forklift aisle A1',0,!S.hz.TUNDE],['Hi-vis',S.hz.TUNDE?'Yes (given by HSE)':'No',0,!S.hz.TUNDE],['Doing','Looking at his phone'],['Escort','None']],{hz:'TUNDE',status:()=>S.hz.TUNDE?['Escorted','good']:['Visitor','warn']});
  pe('NGOZI','Person','Senior picker',()=>[['Location','Green walkway'],['Hi-vis','Yes'],['Safety boots','Yes'],['Hard hat','Yes']],{hz:'NGOZI'});
  pe('BISI','Person','HSE officer',()=>[['Role','Shows you round today'],['First aider','Yes'],['Radio','Channel 2']]);
  pe('EMEKA','Person','Shift supervisor',()=>[['Role','Runs the day shift'],['Fire warden','Yes']]);
  pe('KOLA','Person','Banksman, Bay 1',()=>[['Role','Guides reversing trucks'],['Position','Beside the bay, in the driver\'s mirror'],['Hi-vis','Yes']]);
  pe('ADA','Person','Picker',()=>[['Location','Pick aisle (no forklifts)'],['Hi-vis','Yes']]);
  pe('SANI','Person','Gate security',()=>[['Role','Sign-in, PPE and visitor passes'],['Gate','Pedestrian gate open']]);
  pe('FUNMI','Person','Inventory clerk',()=>[['Location','Green walkway'],['Hi-vis','Yes']]);
  ent('CH-1',{kind:'Charging bay',ic:'battery',x:15.3,z:-18.3,size:[.9,1.8,5],off:[0,.9,0],title:'CH-1',sub:()=>tr('Battery charging bay'),status:()=>['Ventilation on','good'],
    rows:()=>[['Chargers','3 (1 in use)'],['Extraction fan','Running'],['No smoking sign','In place'],['Eye-wash','Checked today'],['PPE','Face shield, apron, gloves']]});
  ent('AP-1',{kind:'Assembly point',ic:'people',x:-35.8,z:-11.6,size:[1.2,2.8,.8],off:[0,1.4,0],title:'AP-1',sub:()=>tr('Assembly point'),status:()=>['Clear','good'],rows:()=>[['Fire warden','Oga Emeka',1],['Roll call','Clipboard at the sign']]});
  ent('GATE',{kind:'Gatehouse',ic:'gate',x:-20.3,z:25,size:[4,3,4.6],off:[0,1.5,0],title:'Gatehouse',sub:()=>tr('Sign-in and PPE issue'),status:()=>['Open','good'],rows:()=>[['Visitors today','4'],['PPE store','Vests, boots, hard hats']]});
  for(const pk of W.parked) ent(pk.id,{kind:'Truck',ic:'truck',obj:pk.obj,size:[2.8,3.6,9],off:[0,1.7,0],title:pk.id,sub:()=>tr('Waiting for a bay'),status:()=>['Waiting','idle'],rows:()=>[['Parking','Truck park'],['Engine','Off'],['Driver','In the drivers\' rest room']]});
}
// the moving trucks share one proxy each (created on demand)
function truckEnt(T){ const id=T.id; if(!id||!T.obj) return null; if(!ENTS[id]) ent(id,{kind:'Truck',ic:'truck',obj:T.obj,size:[2.8,3.6,9],off:[0,1.7,0],title:id,tr:T,
  sub:()=>T.kind==='out'?L('To {0}',T.where):L('From {0}',T.where), status:()=>truckStatus(T), prog:()=>T.st==='docked'?{v:T.prog,label:L('{0} of 8 pallets',Math.round(T.prog*8))}:null,
  rows:()=>[['Bay',L('Bay {0}',T.bay+1),1],['Driver',T.driver,1],['Keys',T.keys?'In the dock office':'With the driver'],['Wheel chocks',T.chocks?'On':'Off'],['Load',T.kind==='out'?'Strapped, 8.6 t of 10 t':'Mixed cartons, 7.9 t']]});
  ENTS[id].obj=T.obj; return ENTS[id]; }
function updateProxies(){ for(const id in ENTS){ const e=ENTS[id]; if(e.tr&&(!e.tr.obj||e.tr.id!==id)){ G.dyn.remove(e.proxy); PROXIES.splice(PROXIES.indexOf(e.proxy),1); delete ENTS[id]; if(SEL===id) closePanel(); continue; }
  if(!e.proxy) continue; const p=entPos(e); e.proxy.position.copy(p); if(e.obj) e.proxy.rotation.y=e.obj.rotation.y; } }

// ================== PATHFINDING (A* on a 0.5 m grid; walkways preferred, forklift aisles avoided) ==================
const GS=.5, GX0=-40, GZ0=-30, GW=160, GH=120; let GRID=null, COST=null;
function blockedAt(x,z,r=.32){ if(x<-39.5||x>39.5||z<-29.5||z>29.5) return true; for(const s of SOL) if(inR(s,x,z,r)) return true; return false; }
function costAt(x,z){ let c=1.7; if(WALKS.some(r=>inR(r,x,z))||inR(PICK,x,z)||inR(CHARGE,x,z)||inR(AP,x,z)) c=1;
  if(ROADS.some(r=>inR(r,x,z))) c=ZEBRA.some(r=>inR(r,x,z))?1:7;
  for(const f of FA) if(inR(f.r,x,z)) c=f.cross.some(r=>inR(r,x,z))?1:30;
  for(const b of BAYS) if(inR(REVZ(b),x,z)) c=Math.max(c,35); return c; }
function buildGrid(){ GRID=new Uint8Array(GW*GH); COST=new Float32Array(GW*GH); for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const x=GX0+(i+.5)*GS, z=GZ0+(j+.5)*GS; GRID[j*GW+i]=blockedAt(x,z)?1:0; COST[j*GW+i]=costAt(x,z); } }
const cellOf=(x,z)=>[clamp(Math.floor((x-GX0)/GS),0,GW-1),clamp(Math.floor((z-GZ0)/GS),0,GH-1)];
function freeCell(i,j){ if(!GRID[j*GW+i]) return [i,j]; for(let r=1;r<10;r++) for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++){ const x=i+di,y=j+dj; if(x>=0&&y>=0&&x<GW&&y<GH&&!GRID[y*GW+x]) return [x,y]; } return [i,j]; }
function findPath(sx,sz,tx,tz){
  if(!GRID) buildGrid();
  const [ai,aj]=freeCell(...cellOf(sx,sz)), [bi,bj]=freeCell(...cellOf(tx,tz)); const N=GW*GH, g=new Float32Array(N).fill(1e9), from=new Int32Array(N).fill(-1), closed=new Uint8Array(N), heap=[];
  const h=k=>Math.hypot(k%GW-bi,((k/GW)|0)-bj);
  const push=(k,f)=>{ heap.push([f,k]); let q=heap.length-1; while(q>0){ const p=(q-1)>>1; if(heap[p][0]<=heap[q][0]) break; [heap[p],heap[q]]=[heap[q],heap[p]]; q=p; } };
  const pop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let q=0; for(;;){ const l=2*q+1,r=l+1; let m=q; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===q) break; [heap[m],heap[q]]=[heap[q],heap[m]]; q=m; } } return top; };
  const st=aj*GW+ai, goal=bj*GW+bi; g[st]=0; push(st,h(st));
  while(heap.length){ const [,k]=pop(); if(closed[k]) continue; closed[k]=1; if(k===goal) break; const x=k%GW, y=(k/GW)|0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=GW||ny>=GH) continue; const j=ny*GW+nx; if(GRID[j]||closed[j]) continue;
      if(dx&&dy&&(GRID[y*GW+nx]||GRID[ny*GW+x])) continue; const ng=g[k]+(dx&&dy?1.414:1)*COST[j]; if(ng<g[j]){ g[j]=ng; from[j]=k; push(j,ng+h(j)); } } }
  if(from[goal]<0&&goal!==st) return null;
  const cells=[]; for(let k=goal;k!==-1;k=from[k]) cells.push(k); cells.reverse();
  const pts=cells.map(k=>[GX0+(k%GW+.5)*GS,GZ0+(((k/GW)|0)+.5)*GS]); pts[0]=[sx,sz];
  if(!blockedAt(tx,tz,.3)) pts.push([tx,tz]);
  // string-pulling: skip points while the straight line stays on free cells no more costly than the route
  const out=[pts[0]]; let a=0;
  while(a<pts.length-1){ let b=pts.length-1; for(;b>a+1;b--){ if(losOK(pts[a],pts[b],cells,a,b)) break; } out.push(pts[b]); a=b; }
  return out;
}
function losOK(p,q,cells,a,b){ let mx=1; for(let k=a;k<=Math.min(b,cells.length-1);k++) mx=Math.max(mx,COST[cells[k]]); const d=Math.hypot(q[0]-p[0],q[1]-p[1]), n=Math.ceil(d/.2);
  for(let i=1;i<n;i++){ const x=p[0]+(q[0]-p[0])*i/n, z=p[1]+(q[1]-p[1])*i/n; const [ci,cj]=cellOf(x,z); const k=cj*GW+ci; if(GRID[k]||COST[k]>mx) return false; } return true; }

// ================== CAMERA ==================
const CAM={yaw:-.62,pitch:.72,dist:46,T:HAS3&&new THREE.Vector3(-10,0,4),mode:'intro',anim:null,yawAnim:null,track:null};
const INSET={l:0,r:0,t:58,b:160};
function defaultDist(){ return PHONE()?72:62; }
// the follow camera leans a little toward the warehouse so the site, not the empty fence line, fills the view
function followPt(){ const k=inR(BLD,P.x,P.z,1)?0:.28; return [P.x+(-2-P.x)*k,P.z+(-6-P.z)*k]; }
function camFly(x,z,dist,dur=.9){ CAM.anim={t:0,dur,fx:CAM.T.x,fz:CAM.T.z,tx:x,tz:z,fd:CAM.dist,td:dist??CAM.dist}; }
function camRotate(d){ CAM.yawAnim={t:0,dur:.6,from:CAM.yaw,to:CAM.yaw+d}; }
function camHome(){ CAM.mode='follow'; CAM.track=null; CAM.yawAnim={t:0,dur:.6,from:CAM.yaw,to:-.62}; const [fx,fz]=followPt(); camFly(fx,fz,defaultDist()); }
function siteOverview(){ CAM.mode='free'; CAM.track=null; CAM.yawAnim={t:0,dur:.8,from:CAM.yaw,to:-.62}; camFly(-1,-3,PHONE()?128:96,1.1); }
function camZoom(k){ const nd=clamp(CAM.dist*k,16,140); CAM.anim={t:0,dur:.35,fx:CAM.T.x,fz:CAM.T.z,tx:CAM.T.x,tz:CAM.T.z,fd:CAM.dist,td:nd}; }
function updateInsets(){ const ph=PHONE(); const d=$('dock'), pn=$('panel');
  INSET.t=ph?112:58; INSET.l=0;
  INSET.b=started?((pn&&!pn.classList.contains('hidden')&&ph)?pn.offsetHeight:(d?d.offsetHeight+(ph?0:16):150)):0;
  INSET.r=!ph&&pn&&!pn.classList.contains('hidden')?340:0; }
function camUpdate(dt){
  if(CAM.anim){ const a=CAM.anim; a.t+=dt; const k=ease(Math.min(1,a.t/a.dur)); CAM.T.x=a.fx+(a.tx-a.fx)*k; CAM.T.z=a.fz+(a.tz-a.fz)*k; CAM.dist=a.fd+(a.td-a.fd)*k; if(a.t>=a.dur) CAM.anim=null; }
  else if(CAM.mode==='follow'){ const k=1-Math.exp(-dt*3), [fx,fz]=followPt(); CAM.T.x+=(fx-CAM.T.x)*k; CAM.T.z+=(fz-CAM.T.z)*k; }
  else if(CAM.mode==='track'&&CAM.track){ const e=ENTS[CAM.track]; if(e){ const p=entPos(e); const k=1-Math.exp(-dt*3); CAM.T.x+=(p.x-CAM.T.x)*k; CAM.T.z+=(p.z-CAM.T.z)*k; } }
  else if(CAM.mode==='intro'){ CAM.yaw+=dt*.025; }
  if(CAM.yawAnim){ const a=CAM.yawAnim; a.t+=dt; const k=ease(Math.min(1,a.t/a.dur)); CAM.yaw=a.from+(a.to-a.from)*k; if(a.t>=a.dur) CAM.yawAnim=null; }
  const cam=G.camera, d=CAM.dist, cp=Math.cos(CAM.pitch);
  cam.position.set(CAM.T.x+Math.sin(CAM.yaw)*cp*d,Math.sin(CAM.pitch)*d,CAM.T.z+Math.cos(CAM.yaw)*cp*d); cam.lookAt(CAM.T.x,0,CAM.T.z);
  const W2=innerWidth, H2=innerHeight; cam.setViewOffset(W2,H2,(INSET.r-INSET.l)/2,(INSET.b-INSET.t)/2,W2,H2);
  G.scene.fog.near=d*1.35; G.scene.fog.far=d*3.4;
  // the sun follows the view so the shadow map stays sharp where you look
  const half=clamp(d*.75,22,70); if(Math.abs(half-SHADOW_HALF)>4){ SHADOW_HALF=half; const sc=G.sun.shadow.camera; sc.left=-half; sc.right=half; sc.top=half; sc.bottom=-half; sc.near=1; sc.far=200; sc.updateProjectionMatrix(); }
  G.sun.position.set(CAM.T.x-30,55,CAM.T.z+25); G.sun.target.position.set(CAM.T.x,0,CAM.T.z);
  // cut-away: hide the roof and the walls facing the camera when the view is inside the building
  const inside=inR(BLD,P.x,P.z,.5)&&CAM.mode!=='intro'||inR(BLD,CAM.T.x,CAM.T.z,-1.5)&&CAM.dist<70;
  const cx=Math.sin(CAM.yaw), cz=Math.cos(CAM.yaw);
  const fade=(o,want)=>{ if(o.done===want) return; o.a+=(want-o.a)*Math.min(1,dt*6); if(Math.abs(o.a-want)<.01) o.a=want; const vis=o.a>.02; o.g.visible=vis; o.mats.forEach(m=>{ if(m.userData.keepT==null) m.userData.keepT=m.transparent; const tr2=o.a<.999||m.userData.keepT; if(m.transparent!==tr2){ m.transparent=tr2; m.needsUpdate=true; } m.opacity=o.a; m.depthWrite=!tr2; }); o.g.traverse(c=>{ if(c.isMesh) c.castShadow=o.a>.5&&!c.userData.decor; }); o.done=o.a===want?want:null; };
  fade(W.roof,inside?0:1);
  for(const k in W.walls){ const w=W.walls[k]; w.g=w.up; fade(w,inside&&(w.n[0]*cx+w.n[1]*cz)>.15?0:1); }
}

// ================== UI ==================
function toast(msg,kind=''){ const d=document.createElement('div'); d.className='tst '+kind; d.textContent=msg; $('toast').appendChild(d); setTimeout(()=>d.remove(),4200); while($('toast').children.length>(PHONE()?2:3)) $('toast').firstChild.remove(); }
function openModal(html,cls=''){ $('ovl').innerHTML=`<div class="ov"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`; return $('ovl').querySelector('.modal'); }
function closeModal(){ $('ovl').innerHTML=''; }
const modalOpen=()=>!!$('ovl').innerHTML;
function openSettings(after){ SL.openSettings(openModal,()=>{ closeModal(); after&&after(); },k=>{ if(k==='lang'){ const u=new URL(location.href); u.searchParams.set('lang',SL.lang); location.href=u.href; } if(k==='quality') applyQuality(); }); }
function initials(n){ return String(n||'?').trim().split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase()||'?'; }
function renderTop(){
  $('top').innerHTML=`<div class="logo"><span class="lg">${icon('cube')}</span><span>Site Life <small>· ${T('Warehouse')}</small></span></div>
    <div id="search">${icon('search')}<span>${T('Click anything to inspect it: forklifts, trucks, pallets, racks…')}</span><kbd>/</kbd></div><div class="sp"></div>
    <div id="site"><span class="chipb" data-notr>LOS-01</span><div><b>${T('Lagos DC, Agbara')}</b><small>${L('Day shift · {0} of {1} steps',`<span id="stepN">${S.step}</span>`,STEPS.length)}</small></div></div>
    <div id="clock" title="${T('Live')}"><i></i><span>${T('Live')}</span> <span id="clk" data-notr>${hhmm()}</span></div>
    <button class="ibtn" id="muteBtn" title="${T('Sound')}" aria-label="${T('Sound')}">${icon(muted?'mute':'sound')}</button>
    ${SLRoom.isTrainer&&SLRoom.code?`<button class="ibtn" id="trainBtn" title="${T('Trainer events')}" aria-label="${T('Trainer events')}">${icon('people')}</button>`:''}
    <button class="ibtn" id="setBtn" title="${T('Settings')}" aria-label="${T('Settings')}">${icon('gear')}</button>
    <div id="me"><span class="av" data-notr>${esc(initials(prof.name))}</span><div><b data-notr>${esc(prof.name||'Guest')}</b><small>${T('Warehouse associate · Day 1')}</small></div></div>`;
  $('muteBtn').onclick=()=>{ muted=!muted; $('muteBtn').innerHTML=icon(muted?'mute':'sound'); if(!muted){ ensureAudio(); chime(); } };
  $('setBtn').onclick=()=>openSettings();
  if($('trainBtn')) $('trainBtn').onclick=trainerPanel;
  $('site').onclick=siteOverview; $('site').style.cursor='pointer'; $('site').title=tr('Show the whole site');
  $('search').onclick=()=>toast(tr('Tip: click any forklift, truck, rack, pallet or person in the 3D view to inspect it.'));
}
let KPI_SIG='';
function renderKpis(){
  const kd=S.kd, now=S.t, dl=(k,good)=>{ const d=kd[k]; if(!d||now-d.t>5) return ''; const up=d.v>0; return `<small class="${(up===good)?'up':'dn'}">${up?'+':''}${d.v}</small>`; };
  const sig=[S.score,S.hazFound,S.near,...['score','haz','near'].map(k=>kd[k]&&now-kd[k].t<=5?kd[k].v:'')].join('|'); if(sig===KPI_SIG) return; KPI_SIG=sig;
  $('kpis').innerHTML=`<div class="card kpi"><span class="ki">${icon('shield')}</span><div><div class="kt">${T('Safety score')}</div><div class="kv">${S.score}${dl('score',true)}</div><div class="ks">${T('Pass mark 70')}</div></div></div>
    <div class="card kpi"><span class="ki">${icon('alert')}</span><div><div class="kt">${T('Hazards found')}</div><div class="kv">${S.hazFound}/${HZ_TOTAL}${dl('haz',true)}</div><div class="ks">${T('Click things to check them')}</div></div></div>
    <div class="card kpi"><span class="ki">${icon('zap')}</span><div><div class="kt">${T('Near misses')}</div><div class="kv">${S.near}${dl('near',false)}</div><div class="ks">${T('Keep it at zero')}</div></div></div>`;
}
function renderZoom(){
  $('zoom').innerHTML=`<button id="zIn" title="${T('Zoom in')}" aria-label="${T('Zoom in')}">${icon('plus')}</button><button id="zOut" title="${T('Zoom out')}" aria-label="${T('Zoom out')}">${icon('minus')}</button><hr>
    <button id="zL" title="${T('Rotate left')}" aria-label="${T('Rotate left')}">${icon('rotl')}</button><button id="zR" title="${T('Rotate right')}" aria-label="${T('Rotate right')}">${icon('rotr')}</button><hr>
    <button id="zH" title="${T('Back to me')}" aria-label="${T('Back to me')}">${icon('home')}</button>`;
  $('zIn').onclick=()=>camZoom(.8); $('zOut').onclick=()=>camZoom(1.25); $('zL').onclick=()=>camRotate(-Math.PI/4); $('zR').onclick=()=>camRotate(Math.PI/4); $('zH').onclick=camHome;
}
// ---- shift tracker (bottom-left stepper) ----
function curStation(){ if(S.alarm&&!S.muster) return {id:'assembly',name:'Assembly point',x:-33,z:-8,hint:'Walk on the walkways to the assembly point.',step:7}; return STATIONS[S.si]||null; }
let TRACK_SIG='';
function renderTracker(force){
  const st=curStation(); const sig=S.step+'|'+S.si+'|'+(st&&st.id)+'|'+Object.keys(S.stepAt).length+'|'+!!S.alarm+'|'+SL.lang; if(sig===TRACK_SIG&&!force) return; TRACK_SIG=sig;
  $('tracker').innerHTML=`<div class="tl"><div class="th"><span class="ti">${icon('list')}</span>${T('Shift progress')}<span class="rt">${L('Your guide: {0}','Bisi (HSE)')}</span></div>
    <div id="steps">${STEPS.map((s,i)=>{ const done=S.stepAt[i]!=null, cur=i===S.step&&!S.over; return `<button class="stp ${done?'done':''} ${cur?'cur':''}" data-step="${i}" aria-label="${T(s.t)}"><span class="dot">${done?icon('check'):icon(s.ic)}</span><b>${T(s.t)}</b><small data-notr>${done?S.stepAt[i]:cur?T('Now'):''}</small></button>`; }).join('')}</div></div>
    <div id="next">${st?`<div class="nt"><div class="nk">${S.alarm&&!S.muster?T('Emergency'):L('Next · step {0} of {1}',Math.min(st.step+1,8),8)}</div><b>${T(st.name)}</b><p>${T(st.hint)}</p></div>
      <div class="row"><button class="primary" id="goBtn">${icon('walk')}${T('Walk there')}</button></div>`:`<div class="nt"><div class="nk">${T('Shift')}</div><b>${T('Complete')}</b></div>`}</div>`;
  const sn=$('stepN'); if(sn) sn.textContent=Object.keys(S.stepAt).length;
  const gb=$('goBtn'); if(gb) gb.onclick=()=>{ ensureAudio(); const s=curStation(); if(s) walkTo(s.x,s.z); };
  $('tracker').querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.step, s=STATIONS.find(x=>x.step===i); if(s){ CAM.mode='free'; camFly(s.x,s.z,Math.min(CAM.dist,40)); } });
  updateInsets();
}
// ---- live lists (bottom-right tabs) ----
let TAB='docks', LIST_SIG='';
function listRows(){
  const pill=(t,tone)=>`<span class="pill ${tone||''}">${T(t)}</span>`, bar=(v,tone)=>`<div class="bar ${tone||''}"><i style="width:${Math.round(clamp(v,0,1)*100)}%"></i></div>`;
  const row=(id,a,b,ds,p,pg,cls='')=>`<div class="li ${cls}" data-ent="${esc(id)}" role="button" tabindex="0"><div class="id"><b data-notr>${esc(a)}</b><small>${b}</small></div><div class="ds">${ds}</div>${p}<div class="pg">${pg||''}</div><span class="cv">${icon('chev')}</span></div>`;
  if(TAB==='docks') return TRUCKS.map(T2=>{ const [s,t]=T2.st==='docked'?truckStatus(T2):T2.st==='empty'?['Available','idle']:truckStatus(T2);
    return row('BAY'+(T2.bay+1),L('Bay {0}',T2.bay+1),T(T2.kind==='out'?'Outbound':'Inbound'),T2.obj?`<span data-notr>${esc(T2.id)}</span> · ${T(T2.kind==='out'?'To':'From')} <span data-notr>${esc(T2.where)}</span>`:T('No truck assigned'),pill(s,t),T2.st==='docked'?bar(Math.round(T2.prog*8)/8)+`<span data-notr>${Math.round(T2.prog*8)}/8</span>`:''); }).join('');
  if(TAB==='forklifts') return FL.map(f=>{ const [s,t]=flStatus(f); return row(f.id,f.id,f.driver?NT(f.driver):T('No driver'),T(f.area),pill(s,t),bar(f.bat,f.bat<.3?'bad':f.bat<.5?'warn':'')+`<span data-notr>${pct(f.bat)}</span>`); }).join('');
  if(TAB==='trucks'){ const live=TRUCKS.filter(t=>t.obj).map(T2=>{ truckEnt(T2); const [s,t]=truckStatus(T2); return row(T2.id,T2.id,T(T2.kind==='out'?'Outbound':'Inbound'),`${L('Bay {0}',T2.bay+1)} · ${T(T2.kind==='out'?'To':'From')} <span data-notr>${esc(T2.where)}</span>`,pill(s,t),T2.st==='docked'?bar(Math.round(T2.prog*8)/8):''); });
    return live.concat(W.parked.map(p=>row(p.id,p.id,T('Inbound'),T('Truck park'),pill('Waiting','idle'),''))).join(''); }
  // hazards: found ones by name, the rest as "not found yet"; decoys you checked appear as "looks fine"
  const found=Object.entries(S.hz).filter(([id,v])=>HZ[id].hz&&v.ok), checked=Object.entries(S.hz).filter(([id,v])=>!(HZ[id].hz&&v.ok));
  let out=found.map(([id],k)=>row(id,L('Hazard {0}',k+1),T('Found'),T(HZ[id].name),pill('Reported','good'),''));
  for(let i=found.length;i<HZ_TOTAL;i++) out.push(`<div class="li q"><div class="id"><b>${L('Hazard {0}',i+1)}</b><small>${T('Hidden')}</small></div><div class="ds">${T('Not found yet')}</div><span class="pill">${T('Open')}</span><div class="pg"></div></div>`);
  out=out.concat(checked.map(([id,v])=>row(id,ENTS[id]&&ENTS[id].title||id,T(HZ[id].hz?'Missed':'Checked'),T(HZ[id].name),HZ[id].hz?pill('Missed','bad'):v.ok?pill('Looks fine','good'):pill('False alarm','warn'),'')));
  return out.join('')+`<div class="hint">${T('Hazards are hidden around the site. Click anything that looks unsafe and use the Safety check in its panel.')}</div>`;
}
function renderLists(force){
  const counts={docks:TRUCKS.filter(t=>t.st==='docked').length+'/3',forklifts:FL.filter(f=>f.state==='move'&&!S.alarm).length+'/'+FL.length,trucks:String(TRUCKS.filter(t=>t.obj).length+W.parked.length),hazards:S.hazFound+'/'+HZ_TOTAL};
  const body=listRows(); const sig=TAB+'|'+body+'|'+JSON.stringify(counts); if(sig===LIST_SIG&&!force) return; LIST_SIG=sig;
  const tabs=[['docks','Docks'],['forklifts','Forklifts'],['trucks','Trucks'],['hazards','Hazards']];
  if(!$('tabs')){ $('lists').innerHTML=`<div id="tabs" role="tablist"><span class="tico">${icon('grid')}</span>${tabs.map(([k,l])=>`<button role="tab" data-tab="${k}">${T(l)}<small data-notr></small></button>`).join('')}</div><div id="list"></div>`;
    $('lists').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ TAB=b.dataset.tab; document.body.classList.add('sheet'); renderLists(true); updateInsets(); }); }
  $('lists').querySelectorAll('[data-tab]').forEach(b=>{ b.classList.toggle('on',b.dataset.tab===TAB); b.setAttribute('aria-selected',b.dataset.tab===TAB); b.querySelector('small').textContent=counts[b.dataset.tab]; });
  const l=$('list'), sc=l.scrollTop; l.innerHTML=body; l.scrollTop=sc;
  l.querySelectorAll('[data-ent]').forEach(r=>{ r.onclick=()=>selectEnt(r.dataset.ent,true); r.onkeydown=e=>{ if(e.key==='Enter') selectEnt(r.dataset.ent,true); }; });
}
// ---- inspect panel (right; bottom sheet on a phone) ----
let SEL=null, PANEL_SIG='';
function selectEnt(id,fly){
  const e=ENTS[id]||(id.startsWith('TRK')?truckEnt(TRUCKS.find(t=>t.id===id)||{}):null); if(!e) return;
  SEL=id; PANEL_SIG=''; renderPanel(); W.selRing.visible=true; ensureAudio(); tone(880,.05,'sine',.03);
  const p=entPos(e); CAM.mode=e.obj&&(e.fl&&e.fl.state==='move'||e.tr)?'track':'free'; CAM.track=id; camFly(p.x,p.z,clamp(CAM.dist,PHONE()?48:40,PHONE()?60:52));
  if(S.si<STATIONS.length&&STATIONS[S.si].check&&id==='FL-03'&&!S.flcheck.done&&Math.hypot(P.x-STATIONS[S.si].x,P.z-STATIONS[S.si].z)<4) S.flcheck.open=true;
}
function closePanel(){ SEL=null; $('panel').classList.add('hidden'); W.selRing.visible=false; if(CAM.mode!=='intro'){ CAM.mode='follow'; CAM.track=null; } updateInsets(); }
function renderPanel(){
  if(!SEL||!ENTS[SEL]){ if(!$('panel').classList.contains('hidden')) closePanel(); return; }
  const e=ENTS[SEL], [st,tone2]=e.status?e.status():['','']; const pg=e.prog&&e.prog(); const rows=e.rows?e.rows():[];
  const hzv=e.hz&&S.hz[e.hz]; const checkMode=SEL==='FL-03'&&S.flcheck.open&&!S.flcheck.done;
  const sig=JSON.stringify([SEL,st,pg&&Math.round(pg.v*50),rows,hzv,checkMode&&S.flcheck,SL.lang]); if(sig===PANEL_SIG) return; PANEL_SIG=sig;
  let html=`<div class="ph"><span class="pic">${icon(e.ic)}</span><div style="min-width:0"><div class="kind">${T(e.kind)}</div><h3 data-notr>${esc(e.title||SEL)}</h3><div class="sub">${e.sub?e.sub():''}</div></div>
    <div class="acts"><button class="ibtn" id="pFollow" title="${T('Follow')}" aria-label="${T('Follow')}">${icon('eye')}</button><button class="ibtn" id="pClose" title="${T('Close')}" aria-label="${T('Close')}">${icon('x')}</button></div></div>`;
  if(st) html+=`<div class="st"><span class="pill ${tone2}">${T(st)}</span><span style="flex:1"></span>${pg?`<span class="lbl">${esc(pg.label)}</span>`:''}</div>${pg?`<div class="bar ${pg.tone||''}"><i style="width:${Math.round(pg.v*100)}%"></i></div>`:''}`;
  html+=`<div style="margin-top:8px">${rows.map(([k,v,n,bad])=>`<div class="kv ${bad?'badv':''}"><span>${T(k)}</span><span>${n?NT(v):T(v)}</span></div>`).join('')}</div>`;
  if(checkMode){
    const seen=S.flcheck.seen, all=FLCHECK.every((_,i)=>seen[i]);
    html+=`<div class="check"><b>${T('Pre-use check: tap each item')}</b><div class="chk">${FLCHECK.map(([t,ok,bad],i)=>`<button data-chk="${i}" class="${seen[i]?(ok?'ok':'ng'):''}">${T(t)}<span class="r">${seen[i]?(ok?`<span class="pill good">${T('OK')}</span>`:`<span class="pill bad">${T('Fault')}</span>`):`<span class="pill">${T('Check')}</span>`}</span></button>${seen[i]&&!ok?`<div class="lbl" style="padding:0 4px 4px">${T(bad)}</div>`:''}`).join('')}</div>
      ${all?`<p style="margin:10px 0 4px"><b>${T('Two faults found. What do you do?')}</b></p><div class="fl-opts opts">${FLDECIDE.map((o,i)=>`<button data-fl="${i}"><span class="k">${'ABC'[i]}</span><span>${T(o.t)}</span></button>`).join('')}</div>`:''}</div>`;
  }
  else if(e.hz){ html+=`<div class="check"><b>${T('Safety check')}</b>`+(hzv?`<div class="fb ${hzv.ok?'':'bad'}" style="margin-top:8px"><b>${T(hzv.ok?(HZ[e.hz].hz?'Hazard reported. Well spotted!':'Correct, this one is fine.'):(HZ[e.hz].hz?'Missed: this was a hazard.':'False alarm: this one was fine.'))}</b>${T(HZ[e.hz].why)}</div>`
      :`<div class="lbl" style="margin-top:2px">${T('Is anything unsafe here?')}</div><div class="row"><button class="bad" id="repHaz">${icon('alert')} ${T('Report hazard')}</button><button id="repOk">${icon('check')} ${T('Looks fine')}</button></div>`)+`</div>`; }
  const pn=$('panel'); pn.innerHTML=html; pn.classList.remove('hidden');
  pn.querySelector('#pClose').onclick=closePanel; pn.querySelector('#pFollow').onclick=()=>{ CAM.mode='track'; CAM.track=SEL; const p=entPos(e); camFly(p.x,p.z,Math.min(CAM.dist,30)); };
  const rh=pn.querySelector('#repHaz'), rk=pn.querySelector('#repOk'); if(rh) rh.onclick=()=>hazDecide(e.hz,true); if(rk) rk.onclick=()=>hazDecide(e.hz,false);
  pn.querySelectorAll('[data-chk]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.chk; S.flcheck.seen[i]=1; if(!FLCHECK[i][1]) buzz(); else tone(700,.06,'sine',.04); PANEL_SIG=''; renderPanel(); });
  pn.querySelectorAll('[data-fl]').forEach(b=>b.onclick=()=>flDecide(+b.dataset.fl));
  updateInsets();
}
// ---- floating labels over the 3D view ----
const TAGS={};
function tagEl(k,cls){ let d=TAGS[k]; if(!d){ d=document.createElement('div'); d.className='tag '+cls; $('tags').appendChild(d); TAGS[k]=d; } return d; }
const V=HAS3&&new THREE.Vector3();
function placeTag(k,pos,html,cls=''){ const d=tagEl(k,cls); V.copy(pos).project(G.camera); const vis=V.z<1&&Math.abs(V.x)<1.05&&Math.abs(V.y)<1.05;
  d.style.display=vis?'':'none'; if(!vis) return; if(d._h!==html){ d.innerHTML=html; d._h=html; } d.className='tag '+cls; d.style.transform=`translate(${((V.x+1)/2*innerWidth).toFixed(1)}px,${((1-V.y)/2*innerHeight).toFixed(1)}px) translate(-50%,-100%)`; }
function updateTags(){
  const live=new Set(), ph=PHONE(); const put=(k,pos,html,cls)=>{ live.add(k); placeTag(k,pos,html,cls); };
  if(started){
    put('me',V3(P.x,2.25,P.z),`<b>${T('You')}</b>`,'me');
    const st=curStation(); if(st&&!S.over) put('pin',V3(st.x,4.45+Math.sin(G.t*2.4)*.15,st.z),`${icon('pin')} ${S.alarm&&!S.muster?T('Assembly point'):T(st.name)}`,'pin'+(S.alarm&&!S.muster?' alarm':''));
    if(!ph){ for(const f of FL) if(f.state==='move'){ const [s]=flStatus(f); put(f.id,V3(f.obj.position.x,2.75,f.obj.position.z),`<b data-notr>${f.id}</b><span>${T(s)}</span>`,SEL===f.id?'sel':''); }
      for(const t of TRUCKS) if(t.obj&&t.st!=='docked'){ const [s]=truckStatus(t); put('t'+t.bay,V3(t.x,4.3,t.z),`<b data-notr>${esc(t.id)}</b><span>${T(s)}</span>`,SEL===t.id?'sel':''); } }
    if(SEL&&ENTS[SEL]&&!live.has(SEL)){ const e=ENTS[SEL], p=entPos(e); put('sel',V3(p.x,p.y+(e.size?e.size[1]/2:1)+.5,p.z),`<b data-notr>${esc(e.title||SEL)}</b><span>${T(e.kind)}</span>`,'sel'); }
    for(const pl of SLRoom.players){ const a=AV.get(pl.id); if(a) put('pl'+pl.id,V3(a.obj.position.x,2.25,a.obj.position.z),`<b data-notr>${esc(pl.name)}</b>`,''); }
  }
  for(const k in TAGS) if(!live.has(k)){ TAGS[k].remove(); delete TAGS[k]; }
}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

// ================== STATIONS & QUESTIONS ==================
function checkStation(){
  if(S.over||modalOpen()) return; const st=curStation(); if(!st) return;
  if(st.id==='assembly'){ if(!S.card&&inR(AP,P.x,P.z)) reachAssembly(); return; }
  if(S.card){ if(st.check&&!S.flcheck.done&&SEL!=='FL-03'&&Math.hypot(P.x-st.x,P.z-st.z)<1.9&&!P.path){ S.flcheck.open=true; selectEnt('FL-03',true); } return; }
  if(Math.hypot(P.x-st.x,P.z-st.z)<1.9){ openStation(st); }
}
function openStation(st){
  S.card={st,qi:0}; P.path=null; CAM.mode='free'; camFly((st.x+P.x)/2,(st.z+P.z)/2,Math.min(CAM.dist,PHONE()?46:36));
  const n=NPC.BISI; n.face=Math.atan2(-(P.x-n.x),-(P.z-n.z)); n.obj.rotation.y=n.face;
  if(st.id==='receive') { const T1=TRUCKS[0]; if(T1.st!=='reverse'&&T1.st!=='docked') startReverse(T1); }
  if(st.id==='dispatch'){ const T3=TRUCKS[2]; if(T3.st!=='docked'){ dockTruck(T3,.92); } else T3.prog=Math.max(T3.prog,.92); }
  if(st.check){ S.flcheck.open=true; selectEnt('FL-03',true); toast(tr('Bisi: Before anyone drives FL-03, we do the pre-use check. Tap each item in the panel.')); return; }
  if(st.alarm){ startAlarm(false); later(1.2,()=>showQuestion(st.qs[0])); return; }
  showQuestion(st.qs[0]);
}
function showQuestion(qid){
  const q=Q[qid], st=S.card?S.card.st:curStation(), who=WHO[q.who];
  const m=openModal(`<div class="row" style="justify-content:space-between"><span class="qchip">${icon(STEPS[st.step].ic)} ${L('Step {0} of {1}',st.step+1,8)} · ${T(STEPS[st.step].t)}</span></div>
    <div class="who"><span class="av" style="background:${who.c}" data-notr>${esc(initials(who.n))}</span><div><b data-notr>${esc(who.n)}</b><small>${T(who.r)}</small></div></div>
    <p class="qt">${T(q.q)}</p><div class="opts">${q.o.map((o,i)=>`<button data-i="${i}"><span class="k">${'ABC'[i]}</span><span>${T(o.t)}</span></button>`).join('')}</div>
    <div id="fbBox"></div><div class="mend"><button class="primary hidden" id="cont">${T('Continue')} ${icon('chev')}</button></div>`,'qcard');
  if(SL.settings.voice) SL.speak(tr(q.q));
  m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>answer(qid,+b.dataset.i,m));
  S.qOpen=qid;
}
function answer(qid,i,m){
  const q=Q[qid], o=q.o[i], ok=!!o.ok, st=S.card?S.card.st:curStation(); if(m.dataset.done) return; m.dataset.done=1;
  m.querySelectorAll('[data-i]').forEach((b,k)=>{ b.disabled=true; if(q.o[k].ok) b.classList.add('ok'); else if(k===i) b.classList.add('no'); });
  const right=q.o.find(x=>x.ok);
  $('fbBox').innerHTML=`<div class="fb ${ok?'':'bad'}"><b>${T(ok?'Correct!':'Not quite.')}</b>${T(o.why)}${ok?'':`<span class="also"><b>${T('The safe answer:')}</b> ${T(right.t)} ${T(right.why)}</span>`}</div>`;
  S.answers.push({q:qid,ok}); if(ok) chime(); else { buzz(); addScore(-8); S.wrongQ.push(q.q); S.where.push(st.name); }
  if(qid==='ppe'){ wearPPE(); }
  if(qid==='upright'){ W.quar.visible=true; }
  if(qid==='house'){ W.mess.visible=false; W.clean.visible=true; }
  const c=m.querySelector('#cont'); c.classList.remove('hidden'); c.focus(); c.onclick=()=>{ closeModal(); S.qOpen=null; nextQuestion(); };
}
function nextQuestion(){
  if(!S.card) return; const st=S.card.st; S.card.qi++;
  if(st.alarm){ S.card=null; toast(tr('Walk to the assembly point. Follow the arrows and keep to the walkways.'),'bad'); renderTracker(true); return; }
  if(S.card.qi<st.qs.length) showQuestion(st.qs[S.card.qi]); else completeStation(st);
}
function completeStation(st){
  S.done[st.id]=true; S.card=null; S.si++;
  const nxt=STATIONS[S.si];
  if(!nxt||nxt.step!==st.step){ S.stepAt[st.step]=hhmm(); S.stepTimes[STEPS[st.step].t]=Math.round((S.t-S.stepT0)*10)/10; S.stepT0=S.t; S.step=nxt?nxt.step:STEPS.length; fanfare(); }
  if(nxt){ npcGo('BISI',nxt.host[0],nxt.host[1]); toast(L('Next: {0}. Follow the blue pin.',tr(nxt.name)));
    if(nxt.id==='emergency'&&S.hazFound<HZ_TOTAL) later(2.5,()=>{ if(S.hazFound<HZ_TOTAL) toast(L('Before the briefing: you have found {0} of {1} hazards. Look around and click anything that looks unsafe.',S.hazFound,HZ_TOTAL),'warn'); });
    if(st.id==='racking'&&!S.nepaDone) later(4,()=>nepaEvent()); }
  CAM.mode='follow'; renderTracker(true);
}
function wearPPE(){ const u=P.obj.userData; u.vest.visible=true; u.hat.visible=true; toast(tr('Mallam Sani hands you a hi-vis vest, safety boots and a hard hat.'),'good'); }
function flDecide(i){
  const o=FLDECIDE[i]; if(S.flcheck.done) return; S.flcheck.done=true; S.flcheck.ok=!!o.ok; S.flcheck.open=false;
  if(!o.ok){ buzz(); addScore(-10); S.wrongQ.push('FL-03 pre-use check'); S.where.push('Forklift check'); } else chime();
  const f=FL.find(x=>x.id==='FL-03'); f.obj.userData.tag.visible=true;
  const right=FLDECIDE.find(x=>x.ok);
  const m=openModal(`<span class="qchip">${icon('forklift')} ${L('Step {0} of {1}',3,8)} · ${T('Forklift check')}</span>
    <div class="who"><span class="av" style="background:${WHO.bisi.c}" data-notr>BI</span><div><b data-notr>Bisi</b><small>${T('HSE officer')}</small></div></div>
    <div class="fb ${o.ok?'':'bad'}"><b>${T(o.ok?'Correct!':'Not quite.')}</b>${T(o.why)}${o.ok?'':`<span class="also"><b>${T('The safe answer:')}</b> ${T(right.t)} ${T(right.why)}</span>`}</div>
    <p class="muted" style="font-size:.86rem">${T('FL-03 now has a red "Do not use" tag. The key is in the supervisor\'s office.')}</p>
    <div class="mend"><button class="primary" id="cont">${T('Continue')} ${icon('chev')}</button></div>`,'qcard');
  m.querySelector('#cont').onclick=()=>{ closeModal(); closePanel(); showQuestion(S.card.st.qs[0]); };
  PANEL_SIG=''; renderPanel();
}
function addScore(d){ S.score=clamp(S.score+d,0,100); S.kd.score={v:d,t:S.t}; }

// ================== HAZARDS ==================
function hazDecide(id,report){
  if(S.hz[id]) return; const h=HZ[id], ok=!!h.hz===report; S.hz[id]={report,ok};
  if(h.hz&&report){ S.hazFound++; S.kd.haz={v:1,t:S.t}; chime(); toast(L('Hazard reported: {0}',tr(h.name)),'good'); fixHazard(id); }
  else if(ok){ chime(); toast(tr('Correct, this one is fine.'),'good'); }
  else { buzz(); addScore(-4); S.where.push(h.hz?'Missed hazard':'False alarm'); toast(tr(h.hz?'Missed: this was a hazard.':'False alarm: this one was fine.'),'bad'); }
  PANEL_SIG=''; renderPanel(); renderLists(true);
  if(S.hazFound===HZ_TOTAL) later(1,()=>toast(tr('All hazards found. Excellent eyes!'),'good'));
}
function fixHazard(id){
  if(id==='P-1026') W.p1026.children.forEach((s,k)=>{ if(k>2) s.visible=false; s.rotation.z=0; s.position.x=0; });
  if(id==='FE-2') W.fe2.visible=false;
  if(id==='EXT-04') W.ext04.userData.ex.visible=true;
  if(id==='TUNDE'){ NPC.TUNDE.obj.userData.vest.visible=true; npcGo('TUNDE',-14.9,-16.0); }
  if(id==='P-0457'){ const t=box(.25,.35,.02,mat('#e23b3b'),.35,.9,-.49); W.p0457.add(t); }
  if(id==='R2-B6') W.r2tape.visible=true;
}

// ================== EVENTS (fire alarm, NEPA, spill, rain; trainer events in group sessions) ==================
let SIREN=0;
function startAlarm(drill){
  if(S.alarm) return; S.alarm={t:S.t,drill}; S.muster=false; ensureAudio();
  document.body.insertAdjacentHTML('beforeend','<div class="alarmv" id="alarmv"></div>');
  toast(tr('FIRE ALARM! Stop work. Forklifts: forks down, keys out. Walk to the assembly point.'),'bad'); if(SL.settings.voice) SL.speak(tr('Fire alarm. Stop work and walk to the assembly point.'));
  for(const f of FL) if(f.state==='move') f.obj.userData.load.visible=f.carry;
  if(drill&&!S.card) later(.5,()=>{ toast(tr('Trainer drill: walk to the assembly point.'),'warn'); });
  renderTracker(true);
}
function reachAssembly(){
  S.muster=true; $('alarmv')&&$('alarmv').remove(); chime();
  if(S.alarm&&S.alarm.drill&&S.si<STATIONS.length-1){ S.alarm=null; S.muster=false; toast(tr('Drill complete. Everyone is accounted for. Back to work!'),'good'); for(const n of NPCS){ n.evac=false; const t=n.route[n.i]||n.route[0]; n.path=findPath(n.x,n.z,t[0],t[1]); n.pi=1; } renderTracker(true); return; }
  S.done.emergency=true; S.stepAt[7]=hhmm(); S.stepTimes[STEPS[7].t]=Math.round((S.t-S.stepT0)*10)/10; S.si=STATIONS.length; S.step=STEPS.length;
  toast(tr('Roll call: everyone is out. Well done.'),'good'); renderTracker(true); later(1.2,endGame);
}
function nepaEvent(){ if(S.nepa>0||S.over) return; S.nepaDone=true; S.nepa=5; document.body.insertAdjacentHTML('beforeend','<div class="nepa" id="nepav"></div>');
  toast(tr('NEPA has taken light! Stand still. Forklifts stop until the generator comes on.'),'warn'); tone(140,.6,'sawtooth',.03); }
function spillEvent(){ if(S.spill) return; S.spill=true; const s=flat(2,1.3,new THREE.MeshLambertMaterial({color:lin('#3a3946'),transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6}),-14.7,.05,-12.2); G.dyn.add(s); W.spillMesh=s;
  toast(tr('Spill on the west walkway! Keep away and report it. The spill team is coming.'),'warn'); later(25,()=>{ G.dyn.remove(s); S.spill=false; toast(tr('Spill cleaned up. Walkway open again.'),'good'); }); }
function rainEvent(){ S.rain=20; toast(tr('Heavy rain! The yard is slippery. Walk, don\'t run, and keep to the walkways.'),'warn'); }
function onRoomEvent(type){ if(!started||S.over) return; S.events++;
  if(type==='fire_alarm'){ if(S.si>=STATIONS.length-1&&STATIONS[S.si]&&STATIONS[S.si].alarm){ openStation(STATIONS[S.si]); } else startAlarm(true); }
  else if(type==='nepa'){ S.nepaDone=false; nepaEvent(); } else if(type==='spill') spillEvent(); else if(type==='rain') rainEvent(); else if(type==='end') endGame(); }
function trainerPanel(){ const m=openModal(`<h2>${T('Trainer events')}</h2><p class="muted">${L('Group {0}',NT(SLRoom.code))}</p><div class="row">${SLRoom.EVENTS.map(e=>`<button data-ev="${e}">${T(SLRoom.eventName(e))}</button>`).join('')}</div><div class="mend"><button id="tc">${T('Close')}</button></div>`);
  m.querySelectorAll('[data-ev]').forEach(b=>b.onclick=async()=>{ const ok=await SLRoom.trigger(b.dataset.ev); toast(ok?tr('Sent to the group.'):tr('Could not send.')); }); m.querySelector('#tc').onclick=closeModal; }
// other players in a group session
const AV=new Map();
function renderRoom(){ const live=new Set(); for(const p of SLRoom.players){ live.add(p.id); let a=AV.get(p.id); if(!a){ const o=makePerson({vest:p.role==='trainer'?'#2f5ef0':'#ffd23f',hat:true,hatC:p.role==='trainer'?'#2f5ef0':'#ffffff',skin:SKINS[p.id.length%5],shirt:'#e9ecf5'}); G.dyn.add(o); a={obj:o,x:p.x*K,z:p.y*K,ph:0}; AV.set(p.id,a); }
    const tx=p.x*K, tz=p.y*K, dx=tx-a.x, dz=tz-a.z, d=Math.hypot(dx,dz), mv=d>.1; a.x+=dx*.2; a.z+=dz*.2; if(mv){ a.ph+=.3; a.obj.rotation.y=Math.atan2(-dx,-dz); } a.obj.position.set(a.x,0,a.z); animPerson(a.obj,a.ph,mv); }
  for(const [id,a] of AV) if(!live.has(id)){ G.dyn.remove(a.obj); AV.delete(id); } }

// ================== END ==================
function endGame(){
  if(S.over) return; S.over=true; paused=true; $('alarmv')&&$('alarmv').remove(); closePanel();
  const wrong=S.answers.filter(a=>!a.ok).length+(S.flcheck.ok===false?1:0), falseCalls=Object.values(S.hz).filter(v=>!v.ok).length;
  const pass=S.score>=70&&S.hazFound>=HZ_TOTAL-1&&!!S.muster;
  const rec={game:'warehouse',name:prof.name||'Guest',company:prof.company,role:'Warehouse associate',result:pass?'PASS':'REPLAY',score:S.score,hazards:`${S.hazFound}/${HZ_TOTAL}`,
    mistakes:wrong+falseCalls,nearMisses:S.near,where:[...new Set(S.where)].slice(0,15),wrong:[...new Set(S.wrongQ)].slice(0,40),zoneTimes:Object.assign({},S.stepTimes),
    missed:Object.keys(HZ).filter(id=>HZ[id].hz&&!(S.hz[id]&&S.hz[id].ok)).map(id=>HZ[id].name),lang:SL.lang,date:new Date().toLocaleString(),...(SLRoom.code?{room:SLRoom.code}:{})};
  try{ const a=SL.store.get('wh-log',[]); a.unshift(rec); SL.store.set('wh-log',a.slice(0,20)); }catch(e){}
  pass?fanfare():buzz();
  const learn=[]; S.answers.filter(a=>!a.ok).forEach(a=>{ const r=Q[a.q].o.find(o=>o.ok); learn.push(r.t); });
  if(S.flcheck.ok===false) learn.push(FLDECIDE[1].t); if(S.near) learn.push('Keep to the green walkways and cross forklift aisles only at the crossings.');
  const lessons=(learn.length?learn:RULES).slice(0,6);
  const missedH=rec.missed;
  const txt=[tr('SITE LIFE WAREHOUSE SHIFT RESULT'),L('Name: {0}',rec.name),rec.company?L('Company: {0}',rec.company):null,L('Result: {0}',pass?tr('PASS'):tr('NOT YET (replay needed)')),
    L('Safety score: {0}',rec.score),L('Hazards found: {0}',rec.hazards),L('Near misses: {0}',S.near),L('Mistakes: {0}',rec.mistakes),L('Date: {0}',rec.date)].filter(Boolean).join('\n');
  const wa='https://wa.me/'+(HSE_WA||'')+'?text='+encodeURIComponent(txt);
  const mail='mailto:'+encodeURIComponent(HSE_MAIL)+'?subject='+encodeURIComponent('Site Life warehouse result: '+rec.name+' ('+rec.result+')')+'&body='+encodeURIComponent(txt);
  const m=openModal(`<div id="endCard"><div class="endh"><span class="big ${pass?'pass':'fail'}">${icon(pass?'shield':'rotl')}</span><div><span class="qchip">${T('Warehouse Shift')}</span><h1>${T(pass?'Shift complete: you passed!':'Not yet: replay the shift')}</h1>
      <div class="muted" style="font-size:.86rem">${pass?L('Well done, {0}. You are ready for the warehouse floor.',NT(rec.name)):T('You need a safety score of 70, at least 5 of 6 hazards and the muster at the assembly point.')}</div></div></div>
    <div class="endk"><div><b>${S.score}</b><span>${T('Safety score')}</span></div><div><b>${S.hazFound}/${HZ_TOTAL}</b><span>${T('Hazards found')}</span></div><div><b>${S.near}</b><span>${T('Near misses')}</span></div><div><b>${rec.mistakes}</b><span>${T('Mistakes')}</span></div></div>
    <b style="font-size:.9rem">${T('What to remember')}</b><ul class="learn">${lessons.map(s=>`<li>${icon('check')}<span>${T(s)}</span></li>`).join('')}</ul>
    ${missedH.length?`<p style="font-size:.86rem;margin-top:10px"><b>${T('Hazards you missed:')}</b> ${missedH.map(h=>T(h)).join(', ')}</p>`:''}
    <p id="hseSend" class="muted" style="font-size:.84rem">${T('Sending your result…')}</p>
    <div class="share"><b style="font-size:.86rem">${T('Send your result to HSE')}</b><div class="row" style="margin-top:8px"><a class="btnlink wa" href="${wa}" target="_blank" rel="noopener">${icon('msg')} WhatsApp</a><a class="btnlink" href="${mail}" target="_blank" rel="noopener">${icon('mail')} ${T('Email')}</a></div></div>
    <div class="mend" id="endRow"><a class="btnlink" href="${PG.index}">${T('All games')}</a><button class="primary" id="again">${icon('rotl')} ${T(pass?'Play again':'Replay the shift')}</button></div></div>`,'endc');
  m.querySelector('#again').onclick=()=>location.reload();
  const show=t=>{ const el=$('hseSend'); if(el) el.textContent=t; };
  if(!SL.consent.ok()){ show(tr('Your result was not sent because the privacy notice was not accepted.')); return rec; }
  SL.post(rec,r=>{ const st=r&&r.status; show(st==='sent'?tr('Your result has been sent to HSE.'):st==='queued'?tr('No connection. Your result will be sent to HSE automatically when you are back online.'):tr('Use the WhatsApp or email button to send your result to HSE.'));
    const link=pass&&SL.certLink(r&&r.id); if(link&&$('endRow')&&!$('endRow').querySelector('.cert-link')) $('endRow').insertAdjacentHTML('afterbegin',`<a class="btnlink cert-link" target="_blank" rel="noopener" href="${link}">${icon('print')} ${T('Print certificate')}</a>`); });
  WH.lastResult=rec; return rec;
}

// ================== UPDATE ==================
let NEAR_T=0;
function movePlayer(dt){
  if(modalOpen()||S.over||S.qOpen) { P.moving=false; return; }
  let mx=0,mz=0; const k=KEYS; if(k.KeyW||k.ArrowUp) mz-=1; if(k.KeyS||k.ArrowDown) mz+=1; if(k.KeyA||k.ArrowLeft) mx-=1; if(k.KeyD||k.ArrowRight) mx+=1;
  const sp=(S.alarm?3.0:3.4)*(S.nepa>0?0:1);
  if(mx||mz){ P.path=null; const c=Math.cos(CAM.yaw), s=Math.sin(CAM.yaw); const wx=mx*c+mz*s, wz=-mx*s+mz*c, l=Math.hypot(wx,wz); stepPlayer(wx/l*sp*dt,wz/l*sp*dt); CAM.mode=CAM.mode==='intro'?'intro':'follow'; return; }
  if(P.path){ const t=P.path[P.pi]; if(!t){ P.path=null; P.moving=false; return; } const dx=t[0]-P.x, dz=t[1]-P.z, d=Math.hypot(dx,dz); if(d<.08){ P.pi++; return; } const st=Math.min(d,sp*dt); stepPlayer(dx/d*st,dz/d*st,true); return; }
  P.moving=false;
}
function stepPlayer(dx,dz,onPath){ const nx=P.x+dx, nz=P.z+dz; let moved=false;
  if(onPath||!blockedAt(nx,nz,.3)){ P.x=nx; P.z=nz; moved=true; } else { if(!blockedAt(nx,P.z,.3)){ P.x=nx; moved=true; } else if(!blockedAt(P.x,nz,.3)){ P.z=nz; moved=true; } }
  if(moved&&(dx||dz)){ P.face=Math.atan2(-dx,-dz); P.moving=true; } }
function walkTo(x,z){ const p=findPath(P.x,P.z,x,z); if(p){ P.path=p; P.pi=1; CAM.mode='follow'; CAM.track=null; } }
function nearMiss(why){ S.near++; S.kd.near={v:1,t:S.t}; addScore(-4); horn(); toast(why,'bad'); }
function checkNear(dt){
  if(S.alarm||modalOpen()) return; NEAR_T-=dt; if(NEAR_T>0) return;
  for(const f of FA){ if(!inR(f.r,P.x,P.z)||f.cross.some(c=>inR(c,P.x,P.z))) continue;
    for(const fl of FL) if(fl.state==='move'&&inR(f.r,fl.obj.position.x,fl.obj.position.z)&&Math.hypot(fl.obj.position.x-P.x,fl.obj.position.z-P.z)<7){ NEAR_T=6; nearMiss(L('Near miss! You walked in the forklift aisle while {0} was working. Use the walkways and crossings.',fl.id)); return; } }
  for(const T2 of TRUCKS){ if(!T2.obj) continue; if(T2.st==='reverse'&&inR(REVZ(T2.b),P.x,P.z)){ NEAR_T=6; nearMiss(tr('Near miss! You were in the reversing zone behind a truck. Never stand behind a reversing vehicle.')); return; }
    if((T2.st==='arrive'||T2.st==='depart')&&ROADS.some(r=>inR(r,P.x,P.z))&&!ZEBRA.some(r=>inR(r,P.x,P.z))&&Math.hypot(T2.x-P.x,T2.z-P.z)<9){ NEAR_T=6; nearMiss(tr('Near miss! A truck was coming and you were on the road. Cross only at the zebra crossing.')); return; } }
}
let LT=0;
function update(dt){
  G.t+=dt; S.t+=dt;
  for(let i=0;i<TIMERS.length;i++){ const tm=TIMERS[i]; tm.t-=dt; if(tm.t<=0){ TIMERS.splice(i--,1); tm.fn(); } }
  if(S.nepa>0){ S.nepa-=dt; const dim=S.nepa>1.2; G.hemi.intensity=dim?.42:.72; G.sun.intensity=dim?.2:.72; if(S.nepa<=1.2&&$('nepav')){ $('nepav').remove(); toast(tr('Generator is on. Lights are back. Carry on.'),'good'); } if(S.nepa<=0){ G.hemi.intensity=.72; G.sun.intensity=.72; } }
  if(S.rain>0){ S.rain-=dt; G.scene.background.set(S.rain>0?'#dcdfee':'#e8eaf7'); G.scene.fog.color.copy(G.scene.background); }
  if(started&&!S.over) movePlayer(dt);
  P.obj.position.set(P.x,0,P.z); P.obj.rotation.y=P.face; if(P.moving) P.ph+=dt*8; animPerson(P.obj,P.ph,P.moving);
  for(const f of FL) flUpdate(f,dt);
  for(const T2 of TRUCKS) truckUpdate(T2,dt);
  for(const n of NPCS) npcUpdate(n,dt);
  if(SLRoom.players.length||AV.size) renderRoom();
  for(const d of W.doors){ const sc=1-d.open*.85; d.sh.scale.y=sc; d.sh.position.y=3.7-1.85*sc; d.lamp.material.color.set(d.open>.9?'#3fd27a':'#ff5a5a'); d.lamp.material.emissive.set(d.open>.9?'#20c060':'#ff3030'); }
  const near=TRUCKS.some(t=>t.obj&&Math.hypot(t.x+30,t.z-30)<14&&t.st!=='docked'); W.gateArm.rotation.z+=((near?-1.35:0)-W.gateArm.rotation.z)*Math.min(1,dt*3);
  if(W.fan) W.fan.rotation.x+=dt*12;
  if(W.danfo) for(const d of W.danfo){ d.x+=d.dir*d.v*dt; if(d.x>140) d.x=-140; if(d.x<-140) d.x=140; d.obj.position.x=d.x; }
  if(started&&!S.over){ checkStation(); checkNear(dt); if(S.alarm&&!S.muster&&!S.card&&!modalOpen()&&inR(AP,P.x,P.z)) reachAssembly(); }
  // pin + guide chevrons along the A* route to the next stop
  const st=started&&!S.over?curStation():null; W.pin.visible=!!st;
  if(st){ W.pin.position.set(st.x,Math.sin(G.t*2.4)*.15,st.z); const al=S.alarm&&!S.muster; W.pin.userData.head.material.color.set(al?'#e23b3b':'#2f5ef0'); W.pin.userData.head.material.emissive.set(al?'#8a1010':'#1a3bb0'); W.pin.userData.ring.material.color.set(al?'#e23b3b':'#2a55e5'); W.pin.userData.ring.scale.setScalar(1+((G.t*.8)%1)*.6); W.pin.userData.ring.material.opacity=.6*(1-((G.t*.8)%1)); W.pin.userData.dot.lookAt(G.camera.position); }
  guideUpdate(dt,st);
  if(SEL){ const e=ENTS[SEL]; if(e){ const p=entPos(e); W.selRing.position.set(p.x,.07,p.z); const r=Math.min(4,Math.max(e.size[0],e.size[2])*.5+.3); W.selRing.scale.setScalar(r*(1+Math.sin(G.t*4)*.04)); } }
  updateProxies(); camUpdate(dt);
  LT-=dt; if(LT<=0&&started){ LT=.5; renderKpis(); renderLists(); renderPanel(); renderTracker(); const c=$('clk'); if(c) c.textContent=hhmm(); }
}
let GP={path:null,t:0,key:''};
function guideUpdate(dt,st){
  const ch=W.chev; if(!st){ ch.count=0; return; }
  GP.t-=dt; const key=st.id+'|'+Math.round(P.x)+'|'+Math.round(P.z);
  if(GP.t<=0||GP.key!==key){ GP.t=.6; GP.key=key; GP.path=Math.hypot(P.x-st.x,P.z-st.z)<2?null:findPath(P.x,P.z,st.x,st.z); }
  const pth=GP.path; if(!pth||modalOpen()){ ch.count=0; return; }
  const sp=1.35, off=(G.t*1.3)%sp; let n=0, acc=0, want=off+.9; const M=new THREE.Matrix4(), Q4=new THREE.Quaternion(), Y=new THREE.Vector3(0,1,0), Sc=new THREE.Vector3(1,1,1);
  for(let i=1;i<pth.length&&n<ch.instanceMatrix.count;i++){ const a=pth[i-1], b=pth[i], L2=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L2<1e-4) continue; const ry=Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]));
    while(want<=acc+L2&&n<40){ const k=(want-acc)/L2, x=a[0]+(b[0]-a[0])*k, z=a[1]+(b[1]-a[1])*k; if(Math.hypot(x-st.x,z-st.z)<1.2) break; Q4.setFromAxisAngle(Y,ry); M.compose(new THREE.Vector3(x,.05,z),Q4,Sc); ch.setMatrixAt(n++,M); want+=sp; } acc+=L2; }
  ch.count=n; ch.instanceMatrix.needsUpdate=true;
}
function render(){ G.renderer.render(G.scene,G.camera); updateTags(); }
let last=performance.now();
function tick(now){ const dt=Math.min(.1,(now-last)/1000); last=now; if(!G) return; if(started&&!modalOpen()) SL.fps.tick(dt); update(dt); render(); }
function loop(now){ tick(now); requestAnimationFrame(loop); }

// ================== INPUT ==================
const KEYS={}; const ray=HAS3&&new THREE.Raycaster(), ndc=HAS3&&new THREE.Vector2(), GPL=HAS3&&new THREE.Plane(new THREE.Vector3(0,1,0),0);
function groundAt(x,y){ ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ndc,G.camera); const p=new THREE.Vector3(); return ray.ray.intersectPlane(GPL,p)?p:null; }
function pickEnt(x,y){ ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ndc,G.camera); const h=ray.intersectObjects(PROXIES,false); return h.length?h[0].object.userData.ent:null; }
function bindInput(){
  const cv=$('game'); const ptr=new Map(); let drag=null, pinch=null, hoverT=0;
  cv.addEventListener('pointerdown',e=>{ ensureAudio(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptr.size===1) drag={x:e.clientX,y:e.clientY,moved:false,g:groundAt(e.clientX,e.clientY)}; else if(ptr.size===2){ const [a,b]=[...ptr.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),dist:CAM.dist}; drag=null; } });
  cv.addEventListener('pointermove',e=>{ if(ptr.has(e.pointerId)) ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&ptr.size===2){ const [a,b]=[...ptr.values()]; CAM.dist=clamp(pinch.dist*pinch.d/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),16,140); CAM.anim=null; return; }
    if(drag){ if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7) drag.moved=true;
      if(drag.moved&&drag.g&&started){ const g=groundAt(e.clientX,e.clientY); if(g){ CAM.T.x+=drag.g.x-g.x; CAM.T.z+=drag.g.z-g.z; CAM.mode='free'; CAM.anim=null; } } return; }
    const now=performance.now(); if(started&&now-hoverT>90&&e.pointerType==='mouse'){ hoverT=now; cv.style.cursor=pickEnt(e.clientX,e.clientY)?'pointer':'default'; } });
  const up=e=>{ ptr.delete(e.pointerId); if(ptr.size<2) pinch=null; if(!drag) return; const d=drag; drag=null; if(d.moved||!started||S.over) return; click(e.clientX,e.clientY); };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',e=>{ ptr.delete(e.pointerId); drag=null; pinch=null; });
  cv.addEventListener('wheel',e=>{ e.preventDefault(); CAM.dist=clamp(CAM.dist*(e.deltaY>0?1.1:1/1.1),16,140); CAM.anim=null; },{passive:false});
  addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return; KEYS[e.code]=true;
    if(e.key==='/'&&started){ e.preventDefault(); toast(tr('Tip: click any forklift, truck, rack, pallet or person in the 3D view to inspect it.')); }
    if(e.code==='Escape'&&SEL) closePanel(); if((e.code==='Equal'||e.code==='NumpadAdd')&&started) camZoom(.8); if((e.code==='Minus'||e.code==='NumpadSubtract')&&started) camZoom(1.25);
    if(e.code==='KeyQ'&&started) camRotate(-Math.PI/4); if(e.code==='KeyE'&&started) camRotate(Math.PI/4); if(e.code==='KeyH'&&started) camHome();
    if(e.code==='KeyG'&&started&&!modalOpen()){ const s=curStation(); if(s) walkTo(s.x,s.z); } });
  addEventListener('keyup',e=>{ KEYS[e.code]=false; }); addEventListener('blur',()=>{ for(const k in KEYS) KEYS[k]=false; });
  $('sheetH').onclick=()=>{ document.body.classList.toggle('sheet'); setTimeout(updateInsets,300); };
}
function click(x,y){
  if(modalOpen()) return; const id=pickEnt(x,y);
  if(id){ selectEnt(id,true); return; }
  const g=groundAt(x,y); if(!g) return;
  const st=curStation(); if(st&&Math.hypot(g.x-st.x,g.z-st.z)<1.6){ walkTo(st.x,st.z); return; }
  if(SEL&&PHONE()) closePanel();
  walkTo(g.x,g.z); spawnClickMark(g.x,g.z);
}
function spawnClickMark(x,z){ const m=new THREE.Mesh(new THREE.RingGeometry(.3,.42,28).rotateX(-Math.PI/2),basic('#2a55e5',{t:.8})); m.position.set(x,.06,z); G.dyn.add(m); let t=0; const id=setInterval(()=>{ t+=.05; m.scale.setScalar(1+t*2); m.material.opacity=.8*(1-t*2); if(t>=.5){ clearInterval(id); G.dyn.remove(m); m.geometry.dispose(); m.material.dispose(); } },30); }

// ================== START ==================
const PG={index:'index.html',kids:'kids.html',little:'little.html'};
const GAMES=[[PG.index,'Factory Site Induction'],['','Warehouse Shift'],[PG.index+'?course=advanced','Advanced Site Course'],[PG.index+'?mode=oga','Oga Mode'],[PG.kids+'?world=home','Home → School Bus'],[PG.kids+'?world=school','School Safety'],[PG.little,'Little Stars 3–6']];
function showStart(){
  const nm=prof.name||SL.lms.studentName()||'';
  const m=openModal(`<div class="games">${GAMES.map(([h,t])=>!h?`<span class="gcard on">${icon('box')}${T(t)}</span>`:`<a class="gcard" href="${h}">${T(t)}</a>`).join('')}</div>
    <div class="hero" style="margin-top:8px"><span class="lg">${icon('cube')}</span><div><h1>${T('Warehouse Shift')}</h1><div class="muted" style="font-size:.88rem">${T('Safety induction · Lagos distribution centre, Agbara')}</div></div></div>
    <p class="muted" style="font-size:.9rem">${T('Your first day as a warehouse associate. Walk the site with Bisi from HSE, make the right calls at each stop, and spot the hidden hazards before the end of the shift.')}</p>
    <div class="feat"><div>${icon('list')}<b>${T('8 stops')}</b>${T('Gate to fire drill')}</div><div>${icon('alert')}<b>${L('{0} hazards',HZ_TOTAL)}</b>${T('Hidden around the site')}</div><div>${icon('clock')}<b>${T('15 minutes')}</b>${T('Phone or computer')}</div></div>
    <div class="two"><label class="fld"><span>${T('Your name')}</span><input id="nm" maxlength="40" placeholder="${T('e.g. Chidi Okafor')}" value="${esc(nm)}"></label>
    <label class="fld"><span>${T('Company')} <small>${T('(optional)')}</small></span><input id="co" maxlength="60" placeholder="${T('e.g. ABC Logistics Ltd')}" value="${esc(prof.company||'')}"></label></div>
    <label class="fld"><span>${T('Group code')} <small>${T('(optional: play together with a trainer)')}</small></span><input id="room" maxlength="8" placeholder="${T('e.g. ACME7')}" value="${esc(SLRoom.code||'')}" style="text-transform:uppercase"></label>
    ${SL.consent.html(false)}
    <div class="mend" style="justify-content:space-between;flex-wrap:wrap"><button id="stSet">${icon('gear')} ${T('Language & settings')}</button><button class="primary" id="start">${T('Start shift')} ${icon('play')}</button></div>
    <p class="keys">${T('Computer: click the ground to walk (or WASD), click anything to inspect it, drag to pan, scroll to zoom, Q/E to rotate. Phone: tap to walk or inspect, drag to pan, pinch to zoom.')}</p>`,'start');
  SL.consent.bind(m,null);
  m.querySelectorAll('.gcard[href]').forEach(a=>{ const u=new URL(a.getAttribute('href'),location.href); for(const [k,v] of SL.QS) if(!['course','mode','world'].includes(k)) u.searchParams.set(k,v); a.href=u.href; });
  m.querySelector('#stSet').onclick=()=>openSettings(showStart);
  m.querySelector('#start').onclick=()=>{
    if(!SL.consent.ok()){ const c=m.querySelector('.consent'); c.style.outline='2px solid var(--bad)'; c.scrollIntoView({block:'center'}); toast(tr('Please tick the privacy notice box to start.'),'bad'); return; }
    ensureAudio(); prof.name=(m.querySelector('#nm').value.trim()||'Guest').slice(0,40); prof.company=m.querySelector('#co').value.trim().slice(0,60); SL.store.set('wh-profile',prof);
    const code=SLRoom.setCode(m.querySelector('#room').value); closeModal(); begin(code);
  };
}
function begin(code){
  started=true; paused=false; S.stepT0=S.t; $('ui').classList.remove('hidden'); renderTop(); renderZoom(); renderKpis(); renderTracker(true); renderLists(true);
  CAM.mode='follow'; CAM.yawAnim={t:0,dur:1.4,from:CAM.yaw,to:-.62}; const [fx,fz]=followPt(); camFly(fx,fz,defaultDist(),1.6); updateInsets();
  toast(tr('The danfo has dropped you at the gate. Follow the blue pin to the gatehouse.'));
  later(3,()=>toast(tr('Tip: tap the ground to walk, or press "Walk there". Tap anything to inspect it.')));
  if(code) SLRoom.start({name:prof.name,game:'warehouse',state:()=>({x:P.x/K,y:P.z/K,yaw:P.face,zone:STEPS[Math.min(S.step,7)].t,score:S.score}),onEvent:t=>{ toast(tr(SLRoom.eventName(t)),'warn'); onRoomEvent(t); }})
    .then(ok=>{ if(ok){ toast(L('Group session {0}',SLRoom.code)); renderTop(); } else toast(tr('Group session not available here. Playing solo.'),'warn'); });
}
window.addEventListener('load',()=>{
  if(!window.THREE){ $('loading').innerHTML=esc(tr('Could not load the 3D engine. Please check your internet connection.')); return; }
  newState();
  try{ initScene(); buildWorld(); buildActors(); buildEntities(); buildGrid(); applyQuality(); }catch(err){ $('loading').textContent=tr('Your device could not start 3D.'); console.error(err); return; }
  $('loading').remove(); document.title=tr('Warehouse Shift'); bindInput(); CAM.T.set(-6,0,0); CAM.dist=78; showStart();
  requestAnimationFrame(loop);
});

// ================== TEST HOOK ==================
// Used by tests/playthrough.js (the page runs at ~1 fps under software WebGL, so the test drives update() itself):
// WH.state(), WH.station(), WH.teleport(x,z), WH.step(n,dt), WH.render(), WH.correct() (index of the right option in the open
// question), WH.flCorrect(), WH.hazards() ([{id, hz}]), WH.inspect(id), WH.walk(x,z) (A* path), WH.lastResult.
window.WH={
  state(){ const st=curStation(); return {step:S.step,si:S.si,station:st&&st.id,q:S.qOpen||null,card:!!S.card,over:S.over,score:S.score,hazards:S.hazFound,near:S.near,alarm:!!S.alarm,muster:S.muster,
    modal:modalOpen(),panel:SEL,fl:{open:!!S.flcheck.open,done:S.flcheck.done},player:[+P.x.toFixed(2),+P.z.toFixed(2)],wrong:S.answers.filter(a=>!a.ok).length}; },
  station(){ const s=curStation(); return s&&{id:s.id,x:s.x,z:s.z}; },
  teleport(x,z){ P.x=x; P.z=z; P.path=null; CAM.T.set(x,0,z); },
  step(n=1,dt=.05){ for(let i=0;i<n;i++) update(dt); render(); },
  render(){ camUpdate(0); render(); },
  correct(){ const q=Q[S.qOpen]; return q?q.o.findIndex(o=>o.ok):-1; },
  flCorrect(){ return FLDECIDE.findIndex(o=>o.ok); },
  hazards(){ return Object.keys(HZ).map(id=>({id,hz:!!HZ[id].hz})); },
  inspect(id){ selectEnt(id,true); renderPanel(); },
  overview(){ siteOverview(); },
  ents(){ return Object.keys(ENTS); },
  event(type){ onRoomEvent(type); },   // trainer events: fire_alarm, nepa, spill, rain, end
  end(){ return endGame(); },
  walk(x,z){ return findPath(P.x,P.z,x,z); },
  stations:STATIONS.map(s=>s.id), assembly:{x:-33,z:-8},
  lastResult:null,
};
