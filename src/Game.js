import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { updateVolumeLabel, bindRange } from './ui/AudioPanel.js';
import { setMapMusic, setMusicVolume } from './audio/LocalMusic.js';
import { mat, basic, neon, box, cyl, sphere } from './core/meshFactory.js';
import { bindResize } from './core/resize.js';
import { createKeyState, bindKeyboard, bindMobileButtons } from './core/Input.js';
import { bindChoiceGroup, hideMenu, showMenu } from './ui/Menu.js';
import { updateRaceHud } from './ui/RaceHud.js';
import { createWorldWrap } from './world/WorldWrap.js';
import { calculatePlayerPosition } from './race/Ranking.js';


import { CAR_OPTIONS } from './config/cars.js';

import { districts } from './config/maps.js';

import { buildingTypes, neonColors } from './config/scenery.js';

import { RACE_LANES } from './config/maps.js';

import { rivalNames } from './config/maps.js';

const canvas=document.getElementById('game'), scoreEl=document.getElementById('score'), speedEl=document.getElementById('speed'), comboEl=document.getElementById('combo'), posEl=document.getElementById('position'), posBigEl=document.getElementById('positionBig'), rankingNamesEl=document.getElementById('rankingNames'), nitroEl=document.getElementById('nitro'), statusEl=document.getElementById('status'), menu=document.getElementById('menu'), soundBtn=document.getElementById('soundBtn');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x17002f);
scene.fog=new THREE.Fog(0x3a0b45,70,430);
let selectedMap='miami';
let selectedCar='falcon';

const IS_MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
const RENDER_SCALE = IS_MOBILE ? 1 : Math.min(devicePixelRatio, 2);

async function requestGameFullscreen(){
  const target = document.documentElement;
  try{
    if(target.requestFullscreen) await target.requestFullscreen();
    else if(target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
  }catch(e){}
}

function lockLandscape(){
  try{
    if(screen.orientation && screen.orientation.lock){
      screen.orientation.lock('landscape').catch(()=>{});
    }
  }catch(e){}
}

function applyMobileOptimizations(){
  if(!IS_MOBILE) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15));
  renderer.toneMappingExposure = 1.35;
  scene.fog.near = 55;
  scene.fog.far = 315;
}


let musicVolume=55;
let sfxVolume=80;

function applyMusicVolume(v){
  musicVolume = Number(v);
  updateVolumeLabel('musicVolLabel', musicVolume);
  setMusicVolume(musicVolume);
}

function applySfxVolume(v){
  sfxVolume=Number(v);
  updateVolumeLabel('sfxVolLabel', sfxVolume);
  if(masterGain) masterGain.gain.setTargetAtTime(sfxVolume/100, audioCtx.currentTime, .03);
}
bindRange('musicVolume', applyMusicVolume);
bindRange('sfxVolume', applySfxVolume);

const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
const audioMixer = document.getElementById('audioMixer');

mobileSettingsBtn?.addEventListener('click', event => {
  event.preventDefault();
  audioMixer?.classList.toggle('open');
});


bindChoiceGroup('#mapChoices .choice', choice => choice.dataset.map || selectedMap, value => {
  selectedMap=value;
  setMapMusic(selectedMap,true);
});

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(RENDER_SCALE); renderer.shadowMap.enabled=false; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.65;
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,900); camera.position.set(0,6.2,22.5);
bindResize(renderer, camera);
applyMobileOptimizations();
const hemi=new THREE.HemisphereLight(0xffb38a,0x170028,1.45); scene.add(hemi);
const sunset=new THREE.DirectionalLight(0xff8a45,2.35); sunset.position.set(-38,28,-60); scene.add(sunset);
const fill=new THREE.DirectionalLight(0x3defff,1.55); fill.position.set(30,18,20); scene.add(fill);
const neonAmbient=new THREE.AmbientLight(0xff4bd8,.72); scene.add(neonAmbient);
const world=new THREE.Group(); scene.add(world);
const horizon=new THREE.Mesh(new THREE.PlaneGeometry(900,420), new THREE.ShaderMaterial({depthWrite:false,depthTest:false,side:THREE.DoubleSide,uniforms:{},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}`,fragmentShader:`varying vec2 vUv;void main(){vec3 top=vec3(.06,.0,.22);vec3 mid=vec3(.78,.10,.52);vec3 low=vec3(1.0,.40,.12);vec3 c=mix(low,mid,smoothstep(.08,.55,vUv.y));c=mix(c,top,smoothstep(.45,1.0,vUv.y));gl_FragColor=vec4(c,1.0);}`})); scene.add(horizon);
const sunGroup=new THREE.Group(); const sun=new THREE.Mesh(new THREE.CircleGeometry(27,96), basic(0xff7a2e,.95)); sun.position.set(0,41,-255); sunGroup.add(sun); for(let i=0;i<9;i++){const stripe=box(54,.65,0.04,basic(i%2?0xff2bd6:0xfff08a,.82)); stripe.position.set(0,28+i*2.5,-254.8); stripe.scale.y=1+i*.06; sunGroup.add(stripe)} scene.add(sunGroup);

// Marcos fixos do mapa Rio: ficam presos no horizonte, não reciclam com a estrada.
const rioSkyline=new THREE.Group();
rioSkyline.visible=false;

function createFixedRioSkyline(){
  // Rio no horizonte: Corcovado com Cristo grande e VISÍVEL no topo + Pão de Açúcar único do outro lado.
  // Esses objetos ficam fixos na cena, não entram no loop/reciclagem da estrada.

  // --- CORCOVADO / CRISTO REDENTOR ---
  const corcovado=new THREE.Group();
  const hillMat=mat(0x06070c,.98,.01,0x120018,.18);
  const hillRim=neon(0xffb36a,.55);

  // Morro em silhueta mais parecido com a referência: pico alto e queda irregular para a direita.
  const peak=sphere(11,hillMat,48); peak.scale.set(1.05,2.45,.34); peak.position.set(-9,18,0); corcovado.add(peak);
  const shoulder=sphere(14,hillMat,48); shoulder.scale.set(1.65,1.15,.31); shoulder.position.set(5,12,.05); corcovado.add(shoulder);
  const lower=sphere(18,hillMat,48); lower.scale.set(2.15,.58,.27); lower.position.set(4,5,.12); corcovado.add(lower);
  const base=box(47,3.0,1.2,hillMat); base.position.set(1,3.8,.12); base.rotation.z=-.045; corcovado.add(base);

  // Contorno suave de pôr do sol só na crista para destacar o recorte do morro.
  // ridgeGlow removido: era a linha horizontal sobrando perto do Cristo.

  // Cristo Redentor low-poly, com braços reduzidos e contorno claro para ser reconhecido.
  // Fica no topo do pico e na frente do morro; braços abertos como na referência enviada.
  const christ=new THREE.Group();
  const statue=basic(0x020205,1);
  const edge=basic(0xfff3b8,.96);
  const pedestal=box(2.4,1.10,.42,statue); pedestal.position.set(0,.55,0); christ.add(pedestal);
  const robe=box(1.05,2.65,.34,statue); robe.position.set(0,2.15,0); christ.add(robe);
  const body=box(.62,3.65,.30,statue); body.position.set(0,3.05,0); christ.add(body);
  const head=sphere(.42,statue,20); head.position.set(0,5.20,0); christ.add(head);
  const arms=box(5.90,.32,.24,statue); arms.position.set(0,4.35,0); christ.add(arms);
  // pequenos reforços nas pontas e no corpo para a silhueta não sumir contra o morro
  const leftHand=box(.46,.38,.25,statue); leftHand.position.set(-3.18,4.35,0); christ.add(leftHand);
  const rightHand=leftHand.clone(); rightHand.position.x=3.18; christ.add(rightHand);
  // armRim removido: estava criando uma linha extra atravessando o Cristo.
  const bodyRim=box(.16,4.25,.08,edge); bodyRim.position.set(0,3.20,-.24); christ.add(bodyRim);
  const headRim=sphere(.54,basic(0xffe0a0,.45),20); headRim.scale.set(1,.75,.12); headRim.position.set(0,5.22,-.30); christ.add(headRim);
  christ.position.set(-9.0,44.2,-2.20);
  christ.scale.setScalar(1.55);
  christ.traverse(o=>{o.renderOrder=30; if(o.material){o.material.depthTest=false; o.material.depthWrite=false;}});
  corcovado.add(christ);

  // névoa distante no pé do morro
  const mist=sphere(24,basic(0x7c3cff,.075),32); mist.scale.set(1.85,.32,.08); mist.position.set(2,6,-.85); corcovado.add(mist);
  corcovado.position.set(-44,8,-258);
  corcovado.scale.setScalar(1.14);
  rioSkyline.add(corcovado);

  // --- PÃO DE AÇÚCAR ÚNICO ---
  const sugar=new THREE.Group();
  const sugarMat=mat(0x07151f,.88,.02,0x2dfcff,.10);
  const sugarRock=sphere(14,sugarMat,54); sugarRock.scale.set(1.03,1.95,.42); sugarRock.position.set(0,11.5,0); sugar.add(sugarRock);
  const skirt=box(24,2.6,1.1,sugarMat); skirt.position.set(0,3.2,.05); sugar.add(skirt);
  const shore=box(30,.42,1.4,neon(0x2dfcff,.42)); shore.position.set(0,1.0,.9); sugar.add(shore);
  sugar.position.set(70,18,-260);
  sugar.scale.setScalar(1.08);
  rioSkyline.add(sugar);
}
createFixedRioSkyline();
scene.add(rioSkyline);
const road=box(18,.12,1300,mat(0x0b0918,.38,.18,0x140022,.28)); road.position.y=-.06; world.add(road);
const shoulderMat=mat(0x241137,.55,.08,0x24003c,.18); for(const x of [-11.2,11.2]){const s=box(4,.1,1300,shoulderMat); s.position.set(x,-.025,0); world.add(s)}
const sand=box(42,.08,1300,mat(0x8b5b4f,.9,.02,0xff4b5c,.04)); sand.position.set(-36,-.09,0); world.add(sand);
const ocean=box(88,.055,1300,mat(0x093b75,.18,.15,0x003d9a,.85)); ocean.position.set(-88,-.12,0); world.add(ocean);
const waterLines=[]; for(let z=-620;z<620;z+=16){const wl=box(56,.018,.35,basic(0x2dfcff,.35)); wl.position.set(-86,.01,z); world.add(wl); waterLines.push(wl)}
for(let x of [-3,3]) for(let z=-620;z<620;z+=28){let l=box(.16,.032,13,neon(0x2dfcff,1.6)); l.position.set(x,.035,z); world.add(l)}
for(let z=-620;z<620;z+=20){let l=box(.12,.034,8,neon(0xff2bd6,1.5)); l.position.set(0,.04,z); world.add(l)}
for(let x of [-9.5,9.5]){const c=box(.52,.2,1300,neon(0xffffff,.7)); c.position.set(x,.08,0); world.add(c)}
const grid=new THREE.GridHelper(900,90,0xff2bd6,0x2dfcff); grid.position.y=-.015; grid.material.transparent=true; grid.material.opacity=.16; world.add(grid);
// Brilhos fake no asfalto: substituem sombras dinâmicas, sem flicker/piscada.
for(let z=-610,i=0;z<620;z+=58,i++){
  const glow=box(8+Math.random()*6,.018,10+Math.random()*12,basic(i%2?0xff2bd6:0x2dfcff,.10));
  glow.position.set((i%3-1)*2.8,.052,z+Math.random()*20);
  world.add(glow);
}

// Trechos do cenário: em vez de repetir o mesmo quarteirão, cada faixa de Z tem identidade própria.

function districtAtLocalZ(z){return districts.find(d=>z>=d.from&&z<d.to)||districts[0]}

function addNeonTextSign(x,z,text,c=0xff2bd6){
  const g=new THREE.Group();
  const back=box(4.8,1.25,.18,neon(c,1.7)); back.position.y=4.2; g.add(back);
  const pole1=box(.12,4,.12,mat(0x080512,.4,.4)); pole1.position.set(-1.8,2,0); g.add(pole1);
  const pole2=pole1.clone(); pole2.position.x=1.8; g.add(pole2);
  // Letras fake em barras para não depender de fonte/canvas.
  for(let i=0;i<Math.min(text.length,7);i++){const b=box(.28+.08*(i%2),.62,.06,neon(i%2?0xffffff:0x2dfcff,1.4)); b.position.set(-1.7+i*.55,4.22,-.13); g.add(b)}
  g.position.set(x,0,z); g.rotation.y=x>0?-.08:.08; world.add(g); return g;
}

function addBoat(x,z,c=0xffffff){const g=new THREE.Group(); const hull=box(3.8,.45,1.25,mat(c,.35,.18,c,.08)); hull.position.y=.25; g.add(hull); const deck=box(2.1,.38,.85,mat(0xeefcff,.18,.2,0x2dfcff,.12)); deck.position.y=.75; g.add(deck); const mast=box(.08,2.1,.08,neon(0xffffff,.7)); mast.position.y=1.65; g.add(mast); g.position.set(x,.05,z); g.rotation.y=.25+Math.random()*.25; world.add(g)}

function addPier(z){const g=new THREE.Group(); const deck=box(38,.22,7,mat(0x633b2e,.8,.05,0xff7a2e,.08)); deck.position.set(-63,.18,z); g.add(deck); for(let i=0;i<8;i++){const p=box(.35,2.2,.35,mat(0x382019,.9,.05)); p.position.set(-80+i*5, -0.8, z-2.7); g.add(p); const l=sphere(.18,neon(i%2?0xff2bd6:0x2dfcff,2.1),12); l.position.set(-80+i*5,1.05,z+3.1); g.add(l)} world.add(g)}

function addArch(z,c=0xff2bd6){const g=new THREE.Group(); const l=box(.55,5,.55,neon(c,1.4)); l.position.set(-8.8,2.5,z); g.add(l); const r=l.clone(); r.position.x=8.8; g.add(r); const top=box(18.2,.42,.55,neon(c,1.8)); top.position.set(0,5,z); g.add(top); world.add(g)}

function addBridge(z){const g=new THREE.Group(); for(let side of [-1,1]){const rail=box(.28,2.7,62,neon(0x2dfcff,1.05)); rail.position.set(side*10.2,1.35,z); g.add(rail); for(let i=-28;i<=28;i+=7){const post=box(.22,3.3,.22,neon(0xff2bd6,1)); post.position.set(side*10.2,1.65,z+i); g.add(post)}} const floor=box(24,.18,70,mat(0x111326,.42,.12,0x2dfcff,.1)); floor.position.set(0,.02,z); g.add(floor); world.add(g)}

function addDistrictScenery(){
  for(const d of districts){
    const mid=(d.from+d.to)/2;
    const strip=box(3,.035,d.to-d.from-8,neon(d.color,.45)); strip.position.set(13.6,.02,mid); world.add(strip);
    const strip2=strip.clone(); strip2.position.x=-13.6; strip2.material=neon(d.accent,.45); world.add(strip2);
    addNeonTextSign(15.2, d.from+35, d.name, d.accent);
    if(d.name==='Praia aberta'){
      // Praia limpa: sem objetos repetidos na areia.
    }
    if(d.name==='Hotéis art déco') for(let z=d.from+45;z<d.to;z+=55) addArch(z,d.accent);
    if(d.name==='Neon comercial') for(let z=d.from+30;z<d.to;z+=32){addNeonTextSign(16.2,z,'BAR',d.color)}
    if(d.name==='Marina / pier'){ addPier(mid); for(let z=d.from+35;z<d.to;z+=42){addBoat(-72,z, z%2?0xff8bd7:0x2dfcff); addBoat(-95,z+18,0xfff0aa)} }
    if(d.name==='Praça tropical') for(let z=d.from+20;z<d.to;z+=45){const fountain=sphere(1.15,neon(0x2dfcff,1.2),24); fountain.scale.y=.18; fountain.position.set(16,.35,z); world.add(fountain); const spray=sphere(.35,neon(0xffffff,1.6),12); spray.position.set(16,1.05,z); world.add(spray)}
    if(d.name==='Ponte sunset') addBridge(mid);
  }
}
addDistrictScenery();
const rioDecor=new THREE.Group(); world.add(rioDecor); rioDecor.visible=false;

function addLapaAqueduct(z){
  const g=new THREE.Group();
  const wallMat=mat(0xf5f2e8,.62,.04,0xffffff,.16);
  const trimMat=neon(0xfff2b2,.55);
  const shadowMat=mat(0xcfc7bd,.78,.02,0xffffff,.04);
  const span=3.8;
  const arches=11;
  const startX=-(arches*span)/2;
  const pillarW=.72;
  const depth=1.35;
  // base grossa, como o corpo do aqueduto
  const base=box(arches*span+2.2,.72,depth,wallMat); base.position.set(0,.45,z); g.add(base);
  const upper=box(arches*span+2.6,1.05,depth,wallMat); upper.position.set(0,8.2,z); g.add(upper);
  const corniceTop=box(arches*span+3.1,.34,depth+0.18,trimMat); corniceTop.position.set(0,8.92,z); g.add(corniceTop);
  const corniceMid=box(arches*span+2.8,.26,depth+0.14,trimMat); corniceMid.position.set(0,7.45,z); g.add(corniceMid);
  const rail=box(arches*span+2.5,.24,depth*.72,wallMat); rail.position.set(0,9.45,z); g.add(rail);
  // pilares e arcos. O arco é formado por segmentos em volta de meia circunferência.
  for(let i=0;i<=arches;i++){
    const p=box(pillarW,7.3,depth,wallMat);
    p.position.set(startX+i*span,4.05,z);
    g.add(p);
    const foot=box(pillarW*1.45,.55,depth+0.12,shadowMat);
    foot.position.set(startX+i*span,1.02,z);
    g.add(foot);
  }
  for(let i=0;i<arches;i++){
    const cx=startX+i*span+span/2;
    // parede interna escurecida para dar profundidade no vão
    const inner=box(span-1.0,3.65,.08,basic(0x151018,.28));
    inner.position.set(cx,4.05,z-.72);
    g.add(inner);
    for(let a=18;a<=162;a+=18){
      const rad=a*Math.PI/180;
      const seg=box(.72,.38,depth+0.1,wallMat);
      seg.position.set(cx+Math.cos(rad)*(span*.36),5.7+Math.sin(rad)*1.72,z);
      seg.rotation.z=rad-Math.PI/2;
      g.add(seg);
    }
    // pequeno segundo nível de arcos/óculos, sugerindo a fileira superior da referência
    const smallTop=box(span*.56,.18,depth+.06,trimMat); smallTop.position.set(cx,7.75,z); g.add(smallTop);
    const hole=sphere(.34,basic(0x25132b,.55),14); hole.scale.set(1,.55,.16); hole.position.set(cx,8.18,z-.70); g.add(hole);
  }
  // iluminação neon discreta na base para casar com o visual retrowave, sem descaracterizar.
  for(let i=0;i<5;i++){
    const lamp=sphere(.16,neon(i%2?0xff2bd6:0x2dfcff,1.9),12);
    lamp.position.set(startX+2+i*span*2.2,.9,z-.86);
    g.add(lamp);
  }
  // Fica no lado esquerdo/centro do trecho do Rio, grande mas sem virar obstáculo visual repetido.
  g.position.set(0,0,0);
  rioDecor.add(g);
}

function addRioDecor(){
  // Praia limpa: sem linhas/desenhos na areia e sem quiosques.
  // Arcos da Lapa: aparece uma única vez no trecho do Rio, maior, mais grosso e parecido com o aqueduto real.
  addLapaAqueduct(-145);
}
addRioDecor();

function addWindows(g,w,h,d,cx){const winMat=neon(0xffe6ff,.8); const rows=Math.max(2,Math.floor(h/2.5)); const cols=Math.max(2,Math.floor(w/1.5)); for(let r=0;r<rows;r++) for(let col=0;col<cols;col++){if(Math.random()<.22)continue; const ww=box(.42,.55,.04,winMat); ww.position.set(-w/2+1+col*(w-2)/(cols-1),1.7+r*(h-2.8)/rows,-d/2-.035); g.add(ww)}}

function makeBuilding(x,z,i){const type=buildingTypes[i%buildingTypes.length], h=type==='hotel'?18+Math.random()*16:type==='club'?9+Math.random()*8:7+Math.random()*10, w=type==='hotel'?7+Math.random()*5:5+Math.random()*4, d=12+Math.random()*11; const pastel=[0x66d9ff,0xff8bd7,0xffd079,0xc3a8ff,0x7effbd,0xff726f][i%6]; const g=new THREE.Group(); const body=box(w,h,d,mat(pastel,.48,.05,pastel,.06)); body.position.y=h/2; g.add(body); addWindows(g,w,h,d,x);
  const trim=neon(neonColors[i%neonColors.length],1.35); const roof=box(w*1.08,.42,d*1.08,trim); roof.position.y=h+.28; g.add(roof); const base=box(w*1.12,.45,d*1.04,trim); base.position.y=.8; g.add(base);
  if(type==='hotel'){const tower=box(w*.42,h*.45,d*.35,mat(0xffffff,.42,.04,0xff2bd6,.04)); tower.position.set(0,h+h*.22,-d*.18); g.add(tower)}
  if(type==='diner'){const awning=box(w*1.15,.38,1.2,neon(0x2dfcff,1.7)); awning.position.set(0,2.8,-d/2-.65); g.add(awning)}
  if(type==='club'){const ring=sphere(1.2,neon(0xff2bd6,1.8),18); ring.scale.set(1.6,.45,.18); ring.position.set(0,5.5,-d/2-.35); g.add(ring)}
  const signWords=['OCEAN','ART DECO','SUNSET','NEON','MIAMI','DRIVE','MOTEL','PALMS']; const sign=box(w*.82,.72,.08,neon(neonColors[(i+2)%neonColors.length],1.9)); sign.position.set(0,Math.min(h-1.5,5.2+Math.random()*5),-d/2-.08); sign.userData.word=signWords[i%signWords.length]; g.add(sign);
  for(let k=0;k<2+Math.floor(Math.random()*3);k++){const side=box(.12,1.0+Math.random()*2.4,1.8+Math.random()*2.8,neon(neonColors[(i+k)%neonColors.length],1.8)); side.position.set(x>0?-w/2-.1:w/2+.1,2.6+k*2.3,-d/2+1.5+k*3); g.add(side)}
  g.position.set(x,0,z); world.add(g); return g}
// Prédios apenas do lado direito. O lado esquerdo virou orla: praia, mar e coqueiros.
for(let z=-620,i=0;z<620;z+=24,i++){
  makeBuilding(20+Math.random()*8,z,i);
}

// Favela removida para melhorar desempenho.
// quiosques removidos

function makePalm(x,z,big=false){const g=new THREE.Group(); const trunkMat=mat(0x9a5d3b,.8,.02,0xff6a3a,.03); const trunk=cyl(big?.28:.22,big?7:5.7,trunkMat,10); trunk.position.y=(big?7:5.7)/2; trunk.rotation.z=(Math.random()-.5)*.18; g.add(trunk); const leafMat=neon(0x1eff84,1.15); for(let i=0;i<8;i++){const leaf=box(big?.46:.36,.09,big?5.4:4.1,leafMat); leaf.position.y=big?7.2:5.9; leaf.rotation.y=i*Math.PI*2/8; leaf.rotation.x=.58; leaf.position.x=Math.sin(i)*.35; g.add(leaf)} const bulb=sphere(.33,neon(0xff2bd6,1.5),12); bulb.position.y=big?7.05:5.75; g.add(bulb); g.position.set(x,0,z); world.add(g); return g}
// Coqueiros no lado da praia: espaçados para não poluir, com alguns perto do calçadão e outros na areia.
for(let z=-620,i=0;z<620;z+=48,i++){
  if(i%2===0 || Math.random()>.38) makePalm(-13.2,z+Math.random()*11,Math.random()>.62);
  if(i%3===0) makePalm(-29-Math.random()*12,z+12+Math.random()*14,Math.random()>.55);
  if(i%5===0 || Math.random()>.74) makePalm(12.3,z+18+Math.random()*12,Math.random()>.72);
}

function makeLamp(x,z,c=0xff2bd6){const g=new THREE.Group(); const pole=box(.12,3.7,.12,mat(0x05050a,.35,.55)); pole.position.y=1.85; g.add(pole); const arm=box(1.25,.09,.09,mat(0x05050a,.35,.55)); arm.position.set(x>0?-.55:.55,3.5,0); g.add(arm); const bulb=sphere(.23,neon(c,2.5),16); bulb.position.set(x>0?-1.15:1.15,3.43,0); g.add(bulb); const light=new THREE.PointLight(c,1.3,18,2); light.position.copy(bulb.position); g.add(light); g.position.set(x,0,z); world.add(g)}
// Sem placas/postes na areia: mantemos iluminação só no lado direito da avenida.
for(let z=-600,i=0;z<600;z+=32,i++){makeLamp(10.5,z+15,neonColors[(i+2)%neonColors.length])}

// Mundo infinito em tiles: evita o bug de ficar só céu rosa quando o bloco principal passa do ponto.
// Mantém três cópias do cenário ao redor da câmera, então sempre existe estrada, calçada e prédios à frente.

const WORLD_LEN=1240;
const worldBack=world.clone(true); worldBack.position.z=-WORLD_LEN; scene.add(worldBack);
const worldFront=world.clone(true); worldFront.position.z=WORLD_LEN; scene.add(worldFront);
// Mobile: manter as 3 cópias do mundo visíveis evita buracos rosa na reciclagem do cenário.
worldBack.visible=true; worldFront.visible=true;
const wrapWorld=createWorldWrap(world,worldBack,worldFront,WORLD_LEN);
wrapWorld();

function makeCar(color=0xff2358,enemy=false){const g=new THREE.Group(); const paint=mat(color,.24,.62,color,.11); const dark=mat(0x050509,.45,.25); const glass=mat(0x8ef7ff,.04,.25,0x2dfcff,.25); glass.transparent=true; glass.opacity=.72; const chrome=mat(0xbad9ff,.18,.75,0x2dfcff,.05);
 const base=box(2.35,.48,4.65,paint); base.position.y=.56; g.add(base); const hood=box(2.05,.26,1.35,paint); hood.position.set(0,.82,-1.45); hood.rotation.x=.04; g.add(hood); const rear=box(2.12,.38,1.15,paint); rear.position.set(0,.82,1.62); g.add(rear); const cabin=box(1.45,.72,1.62,glass); cabin.position.set(0,1.22,-.18); g.add(cabin); const windshield=box(1.38,.08,.82,glass); windshield.position.set(0,1.43,-1.05); windshield.rotation.x=-.55; g.add(windshield); const spoiler=box(2.2,.09,.18,neon(enemy?0xffb000:0xff2bd6,1.5)); spoiler.position.set(0,1.12,2.24); g.add(spoiler);
 for(const x of [-1.24,1.24]) for(const z of [-1.55,1.45]){const w=cyl(.38,.34,dark,22); w.rotation.z=Math.PI/2; w.position.set(x,.35,z); g.add(w); const rim=cyl(.21,.37,chrome,18); rim.rotation.z=Math.PI/2; rim.position.set(x,.35,z); g.add(rim)}
 const headL=box(.62,.12,.08,neon(0xbfffff,2.3)); headL.position.set(-.55,.72,-2.37); g.add(headL); const headR=headL.clone(); headR.position.x=.55; g.add(headR); const tailL=box(.58,.12,.08,neon(0xff073a,2.4)); tailL.position.set(-.55,.78,2.38); g.add(tailL); const tailR=tailL.clone(); tailR.position.x=.55; g.add(tailR); const stripe=box(.18,.04,4.35,neon(enemy?0x2dfcff:0xffffff,.9)); stripe.position.set(0,.83,.05); g.add(stripe); return g}
const player=new THREE.Group(); player.position.set(0,0,8); scene.add(player);

function applySelectedCar(){const cfg=CAR_OPTIONS[selectedCar]; const fresh=makeCar(cfg.color,false); player.clear(); while(fresh.children.length) player.add(fresh.children[0]); player.scale.set(cfg.scale[0],cfg.scale[1],cfg.scale[2]); player.userData.carName=cfg.name;}
applySelectedCar();
const underGlow=new THREE.PointLight(0xff2bd6,1.8,11,2); underGlow.position.set(0,.5,8); scene.add(underGlow);

// Pilotos rivais: são carros de corrida, separados do tráfego comum.
// Cada rival tem formato próprio, progressão de corrida e conta no ranking.
const raceRivals=[];

function makeRacerCar(kind=0,color=0xffffff){
  const g=new THREE.Group();
  const paint=mat(color,.18,.72,color,.16), dark=mat(0x050509,.42,.35), glass=mat(0x9dfcff,.04,.3,0x2dfcff,.32), chrome=mat(0xd9f5ff,.16,.8,0x2dfcff,.05);
  glass.transparent=true; glass.opacity=.76;
  const addWheel=(x,z,r=.35)=>{const w=cyl(r,.34,dark,22); w.rotation.z=Math.PI/2; w.position.set(x,.34,z); g.add(w); const rim=cyl(r*.55,.37,chrome,18); rim.rotation.z=Math.PI/2; rim.position.copy(w.position); g.add(rim)};
  if(kind===0){ // supercar baixo e largo
    const body=box(2.75,.42,4.95,paint); body.position.y=.52; g.add(body);
    const nose=box(2.35,.25,1.55,paint); nose.position.set(0,.76,-1.75); g.add(nose);
    const cabin=box(1.35,.58,1.35,glass); cabin.position.set(0,1.04,-.18); g.add(cabin);
    const splitter=box(2.95,.08,.22,neon(0xffffff,1.0)); splitter.position.set(0,.36,-2.6); g.add(splitter);
    const wing=box(2.9,.10,.22,neon(0xff2bd6,1.7)); wing.position.set(0,1.07,2.42); g.add(wing);
  }else if(kind===1){ // muscle car quadrado
    const body=box(2.55,.68,4.75,paint); body.position.y=.62; g.add(body);
    const hood=box(2.45,.18,1.7,paint); hood.position.set(0,1.04,-1.4); g.add(hood);
    const cabin=box(1.7,.72,1.45,glass); cabin.position.set(0,1.32,.1); g.add(cabin);
    const scoop=box(.75,.22,.65,neon(0x2dfcff,1.25)); scoop.position.set(0,1.24,-1.25); g.add(scoop);
  }else if(kind===2){ // protótipo Le Mans
    const body=box(2.35,.35,5.35,paint); body.position.y=.48; g.add(body);
    const pod=box(1.05,.45,1.1,glass); pod.position.set(0,1.0,-.35); g.add(pod);
    const fins=box(.12,.65,1.55,neon(0xffffff,1.15)); fins.position.set(0,1.04,1.4); g.add(fins);
    const wing=box(3.2,.10,.22,neon(0xffb000,1.8)); wing.position.set(0,1.04,2.62); g.add(wing);
  }else if(kind===3){ // roadster aberto
    const body=box(2.35,.42,4.35,paint); body.position.y=.55; g.add(body);
    const cockpit=box(1.15,.38,.85,dark); cockpit.position.set(0,1.0,.05); g.add(cockpit);
    const windshield=box(1.3,.08,.55,glass); windshield.rotation.x=-.45; windshield.position.set(0,1.17,-.58); g.add(windshield);
    const bars=box(1.55,.12,.18,neon(0x2dfcff,1.45)); bars.position.set(0,1.18,1.15); g.add(bars);
  }else if(kind===4){ // widebody coupe
    const body=box(2.9,.5,4.55,paint); body.position.y=.56; g.add(body);
    const cabin=box(1.6,.62,1.5,glass); cabin.position.set(0,1.12,-.05); g.add(cabin);
    for(const x of [-1.55,1.55]){const skirt=box(.18,.22,3.4,neon(0xff2bd6,1.1)); skirt.position.set(x,.48,.05); g.add(skirt)}
    const diffuser=box(2.45,.18,.28,neon(0x2dfcff,1.5)); diffuser.position.set(0,.48,2.34); g.add(diffuser);
  }else{ // hatch de rally
    const body=box(2.25,.75,3.85,paint); body.position.y=.68; g.add(body);
    const cabin=box(1.65,.72,1.3,glass); cabin.position.set(0,1.32,-.2); g.add(cabin);
    const roof=box(1.2,.12,.9,neon(0xffffff,1.2)); roof.position.set(0,1.74,-.15); g.add(roof);
    const wing=box(2.05,.12,.2,neon(0x41ff9f,1.8)); wing.position.set(0,1.38,1.95); g.add(wing);
  }
  for(const x of [-1.28,1.28]) for(const z of [-1.55,1.45]) addWheel(x,z, kind===2?.32:.36);
  const tailL=box(.55,.12,.08,neon(0xff073a,2.4)); tailL.position.set(-.55,.78,2.36); g.add(tailL); const tailR=tailL.clone(); tailR.position.x=.55; g.add(tailR);
  const head=box(1.5,.10,.08,neon(0xbfffff,2.0)); head.position.set(0,.70,-2.38); g.add(head);
  const num=box(.55,.035,.55,neon(0xffffff,.75)); num.position.set(.72,1.03,.35); g.add(num);
  return g;
}

function spawnRaceRivals(){
  raceRivals.splice(0).forEach(r=>scene.remove(r.mesh));
  const colors=[0xffcc00,0x2dfcff,0xff2bd6,0x41ff9f,0xff4b5c,0xffffff];

  // Corrida estilo perseguição: você começa em 7º e precisa alcançar os 6 rivais pelo caminho.
  // Todos nascem à frente, bem espaçados, para a posição inicial ser 7/7 e não haver batida na largada.
  const startProgress=[135,235,350,480,630,800];
  const startLanes=[1,5,2,4,0,6]; // evita a faixa central do jogador no começo

  for(let i=0;i<6;i++){
    const mesh=makeRacerCar(i,colors[i]);
    const progress=distance+startProgress[i];
    const lane=startLanes[i%startLanes.length];
    mesh.position.set(RACE_LANES[lane],0,player.position.z-(progress-distance)*.72);
    mesh.userData.racer=true; mesh.userData.name=rivalNames[i]; mesh.userData.lane=lane; mesh.userData.kind=i;
    scene.add(mesh);
    raceRivals.push({mesh,name:rivalNames[i],progress,base:138+i*7,skill:.94+i*.025,lane,targetLane:lane,changeT:2.2+i*.45,passed:false,raceSpeed:118+i*8,stuckT:0});
  }
}

function raceLaneFree(lane,z,ignore=null,gap=18){
  const x=RACE_LANES[lane]??RACE_LANES[0];
  const rivalsOk=raceRivals.every(r=>r===ignore||Math.abs(r.mesh.position.x-x)>2.55||Math.abs(r.mesh.position.z-z)>gap);
  const trafficOk=enemies.every(e=>Math.abs(e.position.x-x)>2.85||Math.abs(e.position.z-z)>gap+9);
  return rivalsOk&&trafficOk;
}

function nearestFreeRaceLane(z,preferLane,ignore=null){
  const order=[preferLane,preferLane-1,preferLane+1,preferLane-2,preferLane+2,preferLane-3,preferLane+3].filter(l=>l>=0&&l<RACE_LANES.length);
  for(const l of order){ if(raceLaneFree(l,z,ignore,34)) return l; }
  return preferLane;
}

function trafficBlockerForRival(r,laneIdx,lookAhead=30){
  const x=RACE_LANES[laneIdx]??RACE_LANES[0];
  let best=null, bestGap=9999;
  for(const e of enemies){
    if(Math.abs(e.position.x-x)>2.95) continue;
    const gap=r.mesh.position.z-e.position.z; // Z menor = carro mais à frente
    if(gap>0 && gap<lookAhead && gap<bestGap){ best=e; bestGap=gap; }
  }
  return best;
}

function rivalBlockerForRival(r,laneIdx,lookAhead=26){
  const x=RACE_LANES[laneIdx]??RACE_LANES[0];
  let best=null, bestGap=9999;
  for(const o of raceRivals){
    if(o===r) continue;
    if(Math.abs(o.mesh.position.x-x)>2.75) continue;
    const gap=r.mesh.position.z-o.mesh.position.z;
    if(gap>0 && gap<lookAhead && gap<bestGap){ best=o; bestGap=gap; }
  }
  return best;
}

function setRaceHud(position){
  updateRaceHud(position,{posBigEl,rankingNamesEl},distance,raceRivals);
}

function updateRaceRivals(dt,useNitro){
  const playerIsFast = speed > 155 || useNitro;
  for(const r of raceRivals){
    const relToPlayer=r.progress-distance;
    const laneIdx=Math.round(r.targetLane);
    const currentLane=Math.round(r.lane);
    r.changeT-=dt;
    const frontTraffic=trafficBlockerForRival(r,currentLane,38);
    const frontRival=rivalBlockerForRival(r,currentLane,30);
    const blocked=!!(frontTraffic||frontRival);
    if(blocked) r.stuckT=(r.stuckT||0)+dt; else r.stuckT=Math.max(0,(r.stuckT||0)-dt*1.8);

    if(r.changeT<=0 || (blocked && r.stuckT>.45)){
      const prefer=currentLane;
      const options=[prefer-1,prefer+1,prefer-2,prefer+2,prefer].filter(l=>l>=0&&l<RACE_LANES.length);
      let best=prefer, bestScore=-999;
      for(const l of options){
        const lx=RACE_LANES[l];
        const laneClear=raceLaneFree(l,r.mesh.position.z-10,r,32);
        const b1=trafficBlockerForRival(r,l,42);
        const b2=rivalBlockerForRival(r,l,34);
        let score=(laneClear?45:0)-(Math.abs(l-prefer)*5)+(b1?-35:18)+(b2?-25:12);
        if(playerIsFast && Math.abs(lx-player.position.x)<2.3 && relToPlayer<85 && relToPlayer>-30) score+=10;
        if(score>bestScore){bestScore=score; best=l;}
      }
      if(best!==prefer || raceLaneFree(best,r.mesh.position.z-8,r,28)) r.targetLane=best;
      r.changeT=blocked?.65+Math.random()*1.0:1.2+Math.random()*1.8;
    }

    r.lane += Math.sign(r.targetLane-r.lane)*Math.min(Math.abs(r.targetLane-r.lane),dt*(blocked?2.8:1.45));
    const chosenLane=Math.round(r.targetLane);
    const rivalBoost=(Math.sin(t*.42+r.base)*10)+(Math.sin(t*1.05+r.base)*5);
    const farAheadPenalty=Math.max(0,relToPlayer-320)*.035;
    const behindBoost=relToPlayer<-80?22:0;
    let target=THREE.MathUtils.clamp(r.base+rivalBoost+behindBoost-farAheadPenalty,92,216);

    const trafficAhead=trafficBlockerForRival(r,chosenLane,42);
    const rivalAhead=rivalBlockerForRival(r,chosenLane,34);
    if(trafficAhead){
      const free=nearestFreeRaceLane(r.mesh.position.z,chosenLane,r);
      if(free!==chosenLane) r.targetLane=free;
      const gap=Math.max(4,r.mesh.position.z-trafficAhead.position.z);
      target=Math.min(target, Math.max(42,(trafficAhead.userData.speed||58)-10+gap*1.7));
    }
    if(rivalAhead){
      const free=nearestFreeRaceLane(r.mesh.position.z,chosenLane,r);
      if(free!==chosenLane) r.targetLane=free;
      target=Math.min(target, Math.max(48,(rivalAhead.raceSpeed||95)-8));
    }

    r.raceSpeed=THREE.MathUtils.lerp(r.raceSpeed||target,target,dt*(blocked?2.8:1.35));
    let nextProgress=r.progress+r.raceSpeed*dt*.62*r.skill;
    let desiredZ=player.position.z-(nextProgress-distance)*.72;

    const hardTraffic=trafficBlockerForRival(r,Math.round(r.targetLane),18);
    if(hardTraffic && desiredZ < hardTraffic.position.z+7.4){
      desiredZ=hardTraffic.position.z+7.4;
      nextProgress=distance+(player.position.z-desiredZ)/.72;
      r.raceSpeed=Math.min(r.raceSpeed,(hardTraffic.userData.speed||55));
    }
    const hardRival=rivalBlockerForRival(r,Math.round(r.targetLane),16);
    if(hardRival && desiredZ < hardRival.mesh.position.z+7.8){
      desiredZ=hardRival.mesh.position.z+7.8;
      nextProgress=distance+(player.position.z-desiredZ)/.72;
      r.raceSpeed=Math.min(r.raceSpeed,(hardRival.raceSpeed||80));
    }

    r.progress=nextProgress;
    if(!r.passed && distance>r.progress+8){
      r.passed=true;
      combo=Math.max(combo,combo+1);
      statusEl.textContent='Ultrapassagem! Você passou '+r.name;
      if(typeof playPassBy==='function') playPassBy(r.mesh.position.x>player.position.x?1:-1,1.05);
    }
    const z=player.position.z-(r.progress-distance)*.72;
    r.mesh.position.z=THREE.MathUtils.lerp(r.mesh.position.z,z,dt*6.5);
    r.mesh.position.x=THREE.MathUtils.lerp(r.mesh.position.x,RACE_LANES[Math.round(r.lane)]??RACE_LANES[0],dt*(blocked?5.2:3.5));

    for(const e of enemies){
      if(Math.abs(e.position.x-r.mesh.position.x)<2.55 && Math.abs(e.position.z-r.mesh.position.z)<6.4){
        r.mesh.position.z=e.position.z+7.6;
        r.progress=distance+(player.position.z-r.mesh.position.z)/.72;
        r.raceSpeed=Math.min(r.raceSpeed,(e.userData.speed||50));
        r.targetLane=nearestFreeRaceLane(r.mesh.position.z,Math.round(r.lane),r);
      }
    }
    for(const o of raceRivals){
      if(o===r) continue;
      if(Math.abs(o.mesh.position.x-r.mesh.position.x)<2.65 && Math.abs(o.mesh.position.z-r.mesh.position.z)<6.8 && r.mesh.position.z>o.mesh.position.z){
        r.mesh.position.z=o.mesh.position.z+7.8;
        r.progress=distance+(player.position.z-r.mesh.position.z)/.72;
        r.raceSpeed=Math.min(r.raceSpeed,(o.raceSpeed||70));
      }
    }

    r.mesh.rotation.y=THREE.MathUtils.lerp(r.mesh.rotation.y,(r.targetLane-r.lane)*.13+Math.sin(t*2+r.base)*.02,dt*5);
    r.mesh.rotation.z=THREE.MathUtils.lerp(r.mesh.rotation.z,-(r.targetLane-r.lane)*.08,dt*5);
    if(startGrace<=0 && carAabbHit(r.mesh)) crash();
    r.mesh.visible = r.mesh.position.z<=120;
  }
  const position=calculatePlayerPosition(distance,raceRivals);
  setRaceHud(position);
}

// Áudio procedural em camadas, no estilo superesportivo V12/V8, sem usar amostras protegidas.
// Inclui: idle, low/mid/high RPM, limiter, troca de marcha, backfire, freio, skid,
// batida, nitro/turbo, passagem de carros e ambiência de Ocean Drive.
let audioCtx=null, masterGain=null, muted=false, lastBrake=false, lastNitro=false;
let engine={}, ambience={}, rival={}, gear=1, rpm01=0, shiftCooldown=0, limiterTick=0, backfireCooldown=0;
const gearRatios=[.42,.58,.73,.88,1.02,1.14];

function makeNoiseBuffer(ctx, seconds=1){
  const buffer=ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate*seconds)), ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
  return buffer;
}

function oscLayer(type,freq,gain,dest){
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(dest); o.start();
  return {o,g};
}

function noiseLayer(filterType,freq,q,gain,dest,seconds=2){
  const src=audioCtx.createBufferSource(), f=audioCtx.createBiquadFilter(), g=audioCtx.createGain();
  src.buffer=makeNoiseBuffer(audioCtx,seconds); src.loop=true; f.type=filterType; f.frequency.value=freq; f.Q.value=q; g.gain.value=gain;
  src.connect(f); f.connect(g); g.connect(dest); src.start();
  return {src,f,g};
}

function initAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=audioCtx.createGain(); masterGain.gain.value=sfxVolume/100; masterGain.connect(audioCtx.destination);

  const engineBus=audioCtx.createGain(); engineBus.gain.value=.8; engineBus.connect(masterGain);
  const comp=audioCtx.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=16; comp.ratio.value=7; comp.attack.value=.004; comp.release.value=.16; comp.connect(engineBus);
  const lowFilter=audioCtx.createBiquadFilter(); lowFilter.type='lowpass'; lowFilter.frequency.value=780; lowFilter.Q.value=.7; lowFilter.connect(comp);
  const midFilter=audioCtx.createBiquadFilter(); midFilter.type='bandpass'; midFilter.frequency.value=950; midFilter.Q.value=1.1; midFilter.connect(comp);
  const highFilter=audioCtx.createBiquadFilter(); highFilter.type='bandpass'; highFilter.frequency.value=2100; highFilter.Q.value=1.4; highFilter.connect(comp);

  engine.idle=oscLayer('triangle',38,.04,lowFilter);
  engine.low=oscLayer('sawtooth',72,.0,lowFilter);
  engine.mid=oscLayer('square',120,.0,midFilter);
  engine.high=oscLayer('sawtooth',220,.0,highFilter);
  engine.harm1=oscLayer('sawtooth',330,.0,highFilter);
  engine.intake=noiseLayer('bandpass',850,1.2,0,midFilter,2);
  engine.exhaust=noiseLayer('lowpass',180,.9,0,lowFilter,2);
  engine.lowFilter=lowFilter; engine.midFilter=midFilter; engine.highFilter=highFilter;

  ambience.wind=noiseLayer('highpass',950,.5,0,masterGain,3);
  ambience.city=noiseLayer('bandpass',390,.35,.018,masterGain,5);
  ambience.ocean=noiseLayer('lowpass',210,.45,.035,masterGain,4);
  ambience.turbo=oscLayer('sine',980,0,masterGain);
  ambience.turbo.gainNode=ambience.turbo.g;

  // Motor dos carros rivais próximos: áudio contínuo com pan estéreo e volume por distância.
  // Assim você ouve o carro ao lado/atrás/à frente, não só no momento da ultrapassagem.
  rival.bus=audioCtx.createGain(); rival.bus.gain.value=0;
  rival.panner=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;
  if(rival.panner){ rival.bus.connect(rival.panner); rival.panner.connect(masterGain); } else { rival.bus.connect(masterGain); }
  rival.low=oscLayer('sawtooth',92,0,rival.bus);
  rival.mid=oscLayer('square',168,0,rival.bus);
  rival.high=oscLayer('sawtooth',310,0,rival.bus);
  rival.noise=noiseLayer('bandpass',760,.8,0,rival.bus,2);
}

function resumeAudio(){ initAudio(); if(audioCtx.state==='suspended') audioCtx.resume(); }

function setMuted(v){ muted=v; if(masterGain) masterGain.gain.setTargetAtTime(muted?0:sfxVolume/100,audioCtx.currentTime,.04); soundBtn.textContent=muted?'🔇 Som desligado':'🔊 Som'; soundBtn.classList.toggle('on',!muted); }
soundBtn.onclick=(e)=>{e.stopPropagation(); resumeAudio(); setMuted(!muted)};
addEventListener('keydown',e=>{ if(e.code==='KeyM'){ resumeAudio(); setMuted(!muted); } });

function burstNoise(duration, gain, type='bandpass', freq=800, q=.8){
  if(!audioCtx) return;
  const src=audioCtx.createBufferSource(); src.buffer=makeNoiseBuffer(audioCtx, Math.max(.08,duration));
  const filter=audioCtx.createBiquadFilter(); filter.type=type; filter.frequency.value=freq; filter.Q.value=q;
  const g=audioCtx.createGain(); const now=audioCtx.currentTime;
  g.gain.setValueAtTime(Math.max(.001,gain),now); g.gain.exponentialRampToValueAtTime(.001,now+duration);
  src.connect(filter); filter.connect(g); g.connect(masterGain); src.start(); src.stop(now+duration+.05);
}

function toneBurst(freq,duration,gain,type='sawtooth',toFreq=null){
  if(!audioCtx) return;
  const o=audioCtx.createOscillator(), g=audioCtx.createGain(); const now=audioCtx.currentTime;
  o.type=type; o.frequency.setValueAtTime(freq,now); if(toFreq) o.frequency.exponentialRampToValueAtTime(Math.max(1,toFreq),now+duration*.8);
  g.gain.setValueAtTime(.001,now); g.gain.exponentialRampToValueAtTime(gain,now+.018); g.gain.exponentialRampToValueAtTime(.001,now+duration);
  o.connect(g); g.connect(masterGain); o.start(); o.stop(now+duration+.02);
}

function playBrake(){ burstNoise(.48,.22,'highpass',2100,.8); toneBurst(720,.24,.055,'sine',520); }

function playSkid(strength=.18){ burstNoise(.25+.35*strength,.11+.22*strength,'bandpass',1500,1.3); }

function playCrash(){
  if(!audioCtx) return;
  burstNoise(.85,.62,'lowpass',520,1.15);
  burstNoise(.32,.32,'bandpass',1850,.9);
  burstNoise(.18,.22,'highpass',3600,.7);
  toneBurst(82,.48,.58,'triangle',28);
  setTimeout(()=>{ if(audioCtx) burstNoise(.12,.16,'highpass',2600,.9); },85);
}

function playStartRev(){
  if(!audioCtx) return;
  toneBurst(52,.95,.34,'sawtooth',148);
  burstNoise(.35,.08,'bandpass',900,1.2);
}

function playGearShift(){
  if(!audioCtx) return;
  burstNoise(.10,.10,'bandpass',780,1.3);
  toneBurst(170,.12,.075,'square',95);
  if(Math.random()<.55) setTimeout(playBackfire,70+Math.random()*70);
}

function playBackfire(){
  if(!audioCtx || backfireCooldown>0) return;
  backfireCooldown=.18;
  burstNoise(.08,.24,'highpass',2600,.7);
  toneBurst(120,.09,.13,'square',55);
  if(Math.random()<.35) setTimeout(()=>burstNoise(.055,.14,'highpass',3100,.7),45);
}

function playLimiter(){ burstNoise(.055,.12,'bandpass',2100,1.1); toneBurst(190,.05,.06,'square',130); }

function playPassBy(side=1,rel=1){
  if(!audioCtx) return;
  const now=audioCtx.currentTime;

  // Whoosh estéreo quando um carro passa do lado: começa no lado onde ele vem e cruza para o outro.
  const pan=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;
  const src=audioCtx.createBufferSource(), f=audioCtx.createBiquadFilter(), g=audioCtx.createGain();
  src.buffer=makeNoiseBuffer(audioCtx,.55); f.type='bandpass'; f.frequency.value=650+rel*980; f.Q.value=.72;
  g.gain.setValueAtTime(.001,now); g.gain.exponentialRampToValueAtTime(.12+rel*.12,now+.055); g.gain.exponentialRampToValueAtTime(.001,now+.48);
  src.connect(f); if(pan){ pan.pan.setValueAtTime(side*.9,now); pan.pan.linearRampToValueAtTime(-side*.9,now+.42); f.connect(pan); pan.connect(g); } else f.connect(g);
  g.connect(masterGain); src.start(); src.stop(now+.58);

  // Pequena subida/queda de motor junto do carro passando.
  const pan2=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;
  const o=audioCtx.createOscillator(), og=audioCtx.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(120+rel*110,now); o.frequency.exponentialRampToValueAtTime(260+rel*180,now+.18); o.frequency.exponentialRampToValueAtTime(95+rel*80,now+.46);
  og.gain.setValueAtTime(.001,now); og.gain.exponentialRampToValueAtTime(.055+rel*.055,now+.06); og.gain.exponentialRampToValueAtTime(.001,now+.50);
  if(pan2){ pan2.pan.setValueAtTime(side*.82,now); pan2.pan.linearRampToValueAtTime(-side*.82,now+.42); o.connect(pan2); pan2.connect(og); } else o.connect(og);
  og.connect(masterGain); o.start(); o.stop(now+.56);
}

function updateRivalAudio(enemies,dt){
  if(!audioCtx || !rival.bus) return;
  const now=audioCtx.currentTime;
  let best=null, bestScore=9999;
  for(const e of enemies){
    const dz=e.position.z-player.position.z;
    const dx=e.position.x-player.position.x;
    if(Math.abs(dz)>72 || Math.abs(dx)>9.5) continue;
    const score=Math.abs(dz)*.92 + Math.abs(dx)*3.8;
    if(score<bestScore){bestScore=score; best={e,dz,dx};}
  }
  if(!best){
    rival.bus.gain.setTargetAtTime(0,now,.09);
    rival.low.g.gain.setTargetAtTime(0,now,.08); rival.mid.g.gain.setTargetAtTime(0,now,.08); rival.high.g.gain.setTargetAtTime(0,now,.08); rival.noise.g.gain.setTargetAtTime(0,now,.08);
    return;
  }
  const absZ=Math.abs(best.dz), absX=Math.abs(best.dx);
  const closeness=THREE.MathUtils.clamp(1-(absZ/72)*.72-(absX/10)*.28,0,1);
  const relSpeed=Math.abs(speed-best.e.userData.speed);
  const side=THREE.MathUtils.clamp(best.dx/8,-1,1);
  const doppler=THREE.MathUtils.clamp(-best.dz/42,-.55,.55); // à frente/atrás muda o pitch
  const base=70 + best.e.userData.speed*.75 + relSpeed*.25 + doppler*45;
  rival.bus.gain.setTargetAtTime(.10*closeness,now,.06);
  if(rival.panner) rival.panner.pan.setTargetAtTime(side,now,.055);
  rival.low.o.frequency.setTargetAtTime(base,now,.04);
  rival.mid.o.frequency.setTargetAtTime(base*1.72,now,.04);
  rival.high.o.frequency.setTargetAtTime(base*2.75,now,.035);
  rival.noise.f.frequency.setTargetAtTime(520+best.e.userData.speed*9+closeness*650,now,.05);
  rival.low.g.gain.setTargetAtTime(.055*closeness,now,.06);
  rival.mid.g.gain.setTargetAtTime(.035*closeness,now,.06);
  rival.high.g.gain.setTargetAtTime(.018*closeness,now,.06);
  rival.noise.g.gain.setTargetAtTime(.026*closeness,now,.06);
}

function updateAudio(dt, throttle, braking, nitroOn, steering=0){
  if(!audioCtx) return;
  const now=audioCtx.currentTime;
  shiftCooldown=Math.max(0,shiftCooldown-dt); backfireCooldown=Math.max(0,backfireCooldown-dt); limiterTick=Math.max(0,limiterTick-dt);
  // Câmbio automático com RPM progressivo: o motor não pula direto para o máximo.
  // Ele sobe dentro da marcha, cai ao trocar para cima e dá um pico ao reduzir/frear.
  const gearMax=[58,92,128,166,205,250];
  const gearMin=[0,38,68,98,132,168];
  const gIdx=gear-1;
  const span=Math.max(1, gearMax[gIdx]-gearMin[gIdx]);
  const gearLoad=THREE.MathUtils.clamp((speed-gearMin[gIdx])/span,0,1);
  let targetRpm=THREE.MathUtils.clamp(.22 + gearLoad*.72 + (throttle?.08:0) + (nitroOn?.06:0) - (braking?.06:0), .16, 1.02);
  const climbRate=throttle?(nitroOn?2.35:1.55):.72;
  const fallRate=braking?2.65:1.05;
  const rpmRate=targetRpm>rpm01?climbRate:fallRate;
  rpm01 += (targetRpm-rpm01)*Math.min(1,dt*rpmRate);

  if(throttle && rpm01>.91 && gear<6 && shiftCooldown<=0){
    gear++; shiftCooldown=.42; rpm01=.48; playGearShift();
  }
  if((braking || !throttle) && gear>1 && (speed<gearMin[gIdx]+6 || rpm01<.28) && shiftCooldown<=0){
    gear--; shiftCooldown=.34; rpm01=Math.min(.78,rpm01+.24); playGearShift();
    if(braking && Math.random()<.55) playBackfire();
  }
  if(rpm01>.98 && throttle && limiterTick<=0){ limiterTick=.11; playLimiter(); rpm01=.94; }
  if((!throttle || braking) && rpm01>.66 && Math.random()<dt*1.45) playBackfire();
  if(nitroOn && !lastNitro) { burstNoise(.28,.12,'highpass',2500,.8); toneBurst(900,.22,.06,'sine',1350); }
  lastNitro=nitroOn;

  // Frequências em faixas de RPM. O resultado simula um motor esportivo agudo sem usar gravações reais.
  const flutter=Math.sin(t*95)*1.8 + Math.sin(t*137)*1.1;
  const fundamental=36 + rpm01*118 + gear*2.5;
  engine.idle.o.frequency.setTargetAtTime(34 + rpm01*22,now,.025);
  engine.low.o.frequency.setTargetAtTime(fundamental+flutter,now,.025);
  engine.mid.o.frequency.setTargetAtTime(fundamental*1.72+flutter*1.7,now,.022);
  engine.high.o.frequency.setTargetAtTime(fundamental*2.9+flutter*2.2,now,.018);
  engine.harm1.o.frequency.setTargetAtTime(fundamental*4.15+flutter*2.8,now,.018);
  engine.idle.g.gain.setTargetAtTime(running?(.035*(1-rpm01)+.012):.025,now,.05);
  engine.low.g.gain.setTargetAtTime(running?(.09 + rpm01*.10 + (throttle?.06:0)):.018,now,.04);
  engine.mid.g.gain.setTargetAtTime(running?Math.max(0,(rpm01-.24))*.17 + (throttle?.055:0):0,now,.045);
  engine.high.g.gain.setTargetAtTime(running?Math.max(0,(rpm01-.55))*.19 + (nitroOn?.04:0):0,now,.035);
  engine.harm1.g.gain.setTargetAtTime(running?Math.max(0,(rpm01-.72))*.11:0,now,.035);
  engine.intake.g.gain.setTargetAtTime(running?(throttle?rpm01*.105:rpm01*.035):0,now,.06);
  engine.exhaust.g.gain.setTargetAtTime(running?(.025 + rpm01*.055 + (throttle?.025:0)):.008,now,.08);
  engine.lowFilter.frequency.setTargetAtTime(420 + rpm01*950,now,.05);
  engine.midFilter.frequency.setTargetAtTime(650 + rpm01*2100,now,.05);
  engine.highFilter.frequency.setTargetAtTime(1500 + rpm01*3600,now,.05);

  ambience.wind.g.gain.setTargetAtTime(running?Math.max(0,(speed-55)/210)*.12:0,now,.09);
  ambience.wind.f.frequency.setTargetAtTime(700+speed*8,now,.1);
  ambience.ocean.g.gain.setTargetAtTime(.035 + Math.sin(t*.45)*.008,now,.4);
  ambience.city.g.gain.setTargetAtTime(.014 + Math.max(0,(120-speed))/7000,now,.5);
  ambience.turbo.o.frequency.setTargetAtTime(680 + rpm01*1350 + Math.sin(t*22)*35,now,.05);
  ambience.turbo.g.gain.setTargetAtTime(nitroOn?.16:Math.max(0,(rpm01-.82)*.055),now,.07);

  if(braking && !lastBrake && speed>75) playBrake();
  if(braking && speed>105) playSkid(.18);
  if(Math.abs(steering)>.7 && speed>130 && Math.random()<dt*3.2) playSkid(Math.min(1,(speed-120)/130));
  lastBrake=braking;
}

const enemies=[];

const TRAFFIC_LANES=[-5.8,-2.2,2.2,5.8];

const TRAFFIC_MIN_GAP=18;

function laneIsFree(lane,z,ignore=null,gap=TRAFFIC_MIN_GAP){const x=TRAFFIC_LANES[lane]; const trafficOk=enemies.every(c=>c===ignore||c.userData.lane!==lane||Math.abs(c.position.z-z)>gap); const rivalsOk=(!raceRivals||raceRivals.length===0)||raceRivals.every(r=>Math.abs(r.mesh.position.x-x)>2.7||Math.abs(r.mesh.position.z-z)>gap+8); return trafficOk&&rivalsOk}

function pickSafeTrafficSlot(baseZ=-680){
  for(let tries=0;tries<36;tries++){
    const lane=Math.floor(Math.random()*TRAFFIC_LANES.length);
    const z=baseZ-Math.random()*260-tries*8;
    if(laneIsFree(lane,z,null,TRAFFIC_MIN_GAP+10)) return {lane,z};
  }
  const lane=Math.floor(Math.random()*TRAFFIC_LANES.length);
  const same=enemies.filter(c=>c.userData.lane===lane).map(c=>c.position.z);
  const minZ=same.length?Math.min(...same):-120;
  return {lane,z:minZ-TRAFFIC_MIN_GAP-45-Math.random()*90};
}

function spawnEnemy(z){
  const slot=pickSafeTrafficSlot(z);
  const c=makeCar([0x2dfcff,0xffb000,0x7c3cff,0x41ff9f,0xff4b5c][Math.floor(Math.random()*5)],true);
  c.scale.setScalar(.88+Math.random()*.22);
  c.position.set(TRAFFIC_LANES[slot.lane],0,slot.z);
  c.userData.lane=slot.lane;
  c.userData.baseSpeed=42+Math.random()*78;
  c.userData.speed=c.userData.baseSpeed;
  c.userData.targetSpeed=c.userData.baseSpeed;
  scene.add(c); enemies.push(c)
}

function recycleEnemy(e){
  const slot=pickSafeTrafficSlot(-680);
  e.userData.lane=slot.lane;
  e.position.x=TRAFFIC_LANES[slot.lane];
  e.position.z=slot.z;
  e.userData.baseSpeed=42+Math.random()*82;
  e.userData.targetSpeed=e.userData.baseSpeed;
  e.userData.speed=e.userData.baseSpeed;
}

function enforceTrafficSpacing(){
  for(let lane=0;lane<TRAFFIC_LANES.length;lane++){
    const cars=enemies.filter(c=>c.userData.lane===lane).sort((a,b)=>a.position.z-b.position.z);
    for(let i=1;i<cars.length;i++){
      const ahead=cars[i-1], behind=cars[i];
      const gap=behind.position.z-ahead.position.z;
      if(gap<TRAFFIC_MIN_GAP){
        behind.position.z=ahead.position.z+TRAFFIC_MIN_GAP;
        behind.userData.speed=Math.min(behind.userData.speed,ahead.userData.speed*.96);
      }
      const nearGap=behind.position.z-ahead.position.z;
      if(nearGap<TRAFFIC_MIN_GAP*1.85) behind.userData.targetSpeed=Math.min(behind.userData.baseSpeed,ahead.userData.speed*.92);
      else behind.userData.targetSpeed=behind.userData.baseSpeed;
    }
    if(cars[0]) cars[0].userData.targetSpeed=cars[0].userData.baseSpeed;
  }
}
for(let i=0;i<22;i++) spawnEnemy(-70-i*36);
let keys={}, running=false, crashed=false, distance=0, speed=0, nitro=100, combo=1, t=0, shake=0, startGrace=0, crashTimer=0; addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Enter'&&!running) start()}); addEventListener('keyup',e=>keys[e.code]=false); document.getElementById('start').onclick=start;
document.querySelectorAll('[data-map]').forEach(el=>el.onclick=()=>{selectedMap=el.dataset.map; document.querySelectorAll('[data-map]').forEach(x=>x.classList.toggle('active',x===el)); rioDecor.visible=selectedMap==='rio'; rioSkyline.visible=selectedMap==='rio'; statusEl.textContent=selectedMap==='rio'?'Rio de Janeiro selecionado':'Miami Ocean Drive selecionado';});
document.querySelectorAll('[data-car]').forEach(el=>el.onclick=()=>{selectedCar=el.dataset.car; document.querySelectorAll('[data-car]').forEach(x=>x.classList.toggle('active',x===el)); applySelectedCar(); statusEl.textContent=CAR_OPTIONS[selectedCar].name+' selecionado';});
bindMobileButtons(keys);

function start(){
  document.body.classList.add('game-running');
  audioMixer?.classList.remove('open');
  requestGameFullscreen();
  lockLandscape();
  setMapMusic(selectedMap,true);resumeAudio(); playStartRev(); running=true; crashed=false; crashTimer=0; startGrace=2.2; hideMenu(menu); distance=0; const cfg=CAR_OPTIONS[selectedCar]; speed=76; nitro=100; combo=1; applySelectedCar(); player.position.x=0; world.position.z=0; wrapWorld(); rioDecor.visible=selectedMap==='rio'; rioSkyline.visible=selectedMap==='rio'; scene.fog.color.setHex(selectedMap==='rio'?0x1f3a5c:0x3a0b45); spawnRaceRivals(); enemies.forEach((e,i)=>{e.userData.lane=i%TRAFFIC_LANES.length; e.position.x=TRAFFIC_LANES[e.userData.lane]; e.position.z=-70-i*TRAFFIC_MIN_GAP*1.9; e.userData.baseSpeed=42+((i*17)%82); e.userData.targetSpeed=e.userData.baseSpeed; e.userData.speed=e.userData.baseSpeed}); enforceTrafficSpacing(); statusEl.textContent=(selectedMap==='rio'?'Rio de Janeiro':'Miami Ocean Drive')+' • '+cfg.name+' • Você começa em 7º'; setRaceHud(7)}

// Colisão v22: hitbox justa e consistente para todos os carros.
// O bug anterior tinha dois extremos: largura grande demais (batia passando do lado)
// e alguns modelos/rivais sem dimensão confiável (dava para atravessar).
// Aqui a colisão usa uma caixa de gameplay estável, menor que o visual dos retrovisores/rodas,
// mas longa o suficiente para pegar para-choque, frente e traseira assim que encostar.

const PLAYER_HITBOX={halfW:.96, halfL:2.22};

function hitboxFor(obj){
  const scX=obj?.scale?.x||1, scZ=obj?.scale?.z||obj?.scale?.x||1;
  // Rivais são visualmente diferentes, então cada tipo ganha ajuste próprio.
  if(obj?.userData?.racer){
    const k=obj.userData.kind??0;
    const dims=[
      {halfW:1.08,halfL:2.42}, // supercar baixo
      {halfW:1.04,halfL:2.32}, // muscle
      {halfW:.98, halfL:2.62}, // Le Mans comprido
      {halfW:.94, halfL:2.12}, // roadster
      {halfW:1.12,halfL:2.24}, // widebody
      {halfW:.95, halfL:1.92}  // hatch rally
    ][k]||{halfW:1.02,halfL:2.30};
    return {halfW:dims.halfW*scX, halfL:dims.halfL*scZ};
  }
  // Tráfego comum: escala visual muda, a hitbox acompanha sem ficar larga demais.
  return {halfW:.96*scX, halfL:2.20*scZ};
}

function aabbOverlapXZ(ax,az,ahw,ahl,bx,bz,bhw,bhl,padW=0,padL=0){
  return Math.abs(ax-bx) <= (ahw+bhw+padW) && Math.abs(az-bz) <= (ahl+bhl+padL);
}

function carAabbHit(obj){
  if(!obj || obj.visible===false) return false;
  const h=hitboxFor(obj);
  return aabbOverlapXZ(player.position.x,player.position.z,PLAYER_HITBOX.halfW,PLAYER_HITBOX.halfL,obj.position.x,obj.position.z,h.halfW,h.halfL,-.04,.02);
}

function carSweptHit(obj,prevZ){
  if(!obj || obj.visible===false) return false;
  // Teste atual: resolve a maior parte das batidas e evita falso positivo lateral.
  if(carAabbHit(obj)) return true;

  // Varredura apenas para tráfego rápido atravessando o frame entre uma atualização e outra.
  const z1=obj.position?.z||0;
  const z0=Number.isFinite(prevZ)?prevZ:z1;
  const dzMove=Math.abs(z1-z0);
  if(dzMove<.15 || dzMove>14) return false; // >14 normalmente é reciclagem/teleporte

  const h=hitboxFor(obj);
  const width=PLAYER_HITBOX.halfW+h.halfW-.08;
  if(Math.abs((obj.position?.x||0)-player.position.x) > width) return false;

  const reach=PLAYER_HITBOX.halfL+h.halfL+.04;
  const minZ=Math.min(z0,z1)-reach;
  const maxZ=Math.max(z0,z1)+reach;
  return player.position.z>=minZ && player.position.z<=maxZ;
}

function showCrashMenu(){
  running=false;
  statusEl.textContent='Batida! Enter para reiniciar';
  document.body.classList.remove('game-running');
    showMenu(menu);
  document.querySelector('.subtitle').textContent='Você bateu em um carro. Hitbox ajustada: não acusa passando do lado e não deixa atravessar modelos sem colisão.';
  document.getElementById('start').textContent='Correr de novo';
}

function crash(){
  if(crashed)return;
  crashed=true;
  playCrash();
  shake=2.2;
  showCrashMenu();
}
const clock=new THREE.Clock(); function loop(){requestAnimationFrame(loop); const dt=Math.min(clock.getDelta(),.033); t+=dt; sun.material.opacity=.85+.08*Math.sin(t*.9); waterLines.forEach((w,i)=>{w.position.x=-86+Math.sin(t*1.2+i)*1.3; w.material.opacity=.22+.16*Math.sin(t*2+i)});
 if(running){startGrace=Math.max(0,startGrace-dt); const playerThrottle=!crashed&&(keys.ArrowUp||keys.KeyW); const playerBraking=crashed||(!crashed&&(keys.ArrowDown||keys.KeyS)); const useNitro=!crashed&&keys.Space&&nitro>1; const cfg=CAR_OPTIONS[selectedCar]; const accel=playerThrottle?cfg.accel:(crashed?-80:-24); const brake=playerBraking?145:0; speed+=accel*dt; speed-=brake*dt; if(crashed){crashTimer-=dt; speed=Math.max(0,speed*.985); player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,0,dt*1.8); player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,0,dt*1.8); if(crashTimer<=0) showCrashMenu();} else if(useNitro){speed+=135*dt; nitro-=32*dt; statusEl.textContent='NITRO — luzes viram rastros!'}else{nitro=Math.min(100,nitro+9*dt); if(Math.random()<.04){ const localZ=(((-world.position.z+player.position.z+620)%1240)-620); const d=districtAtLocalZ(localZ); statusEl.textContent=d.name+' — cenário mudando'; scene.fog.color.setHex(d.color); }} speed=THREE.MathUtils.clamp(speed,crashed?0:42,useNitro?Math.max(238,cfg.max+54):cfg.max); let steer=crashed?0:(((keys.ArrowLeft||keys.KeyA)?1:0)-((keys.ArrowRight||keys.KeyD)?1:0))*cfg.handling; updateAudio(dt,playerThrottle,playerBraking,useNitro,steer); player.position.x+=-steer*(5.6+speed/34)*dt; player.position.x=THREE.MathUtils.clamp(player.position.x,-7.2,7.2); player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,steer*.18,dt*8); player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,steer*.08,dt*7); distance+=speed*dt*.62; updateRaceRivals(dt,useNitro); combo=1+Math.floor(speed/62); world.position.z+=speed*dt; wrapWorld(); enforceTrafficSpacing(); for(const e of enemies){const prevZ=e.position.z; e.userData.speed=THREE.MathUtils.lerp(e.userData.speed,e.userData.targetSpeed,dt*2.8); e.position.z+=(speed-e.userData.speed)*dt; e.position.x=THREE.MathUtils.lerp(e.position.x,TRAFFIC_LANES[e.userData.lane],dt*6); if(prevZ<=player.position.z && e.position.z>player.position.z && Math.abs(e.position.x-player.position.x)<7.5) playPassBy(e.position.x>player.position.x?1:-1, Math.min(1.2,Math.abs(speed-e.userData.speed)/120)); e.rotation.y=Math.sin(t*2+e.position.z)*.025; if(startGrace<=0 && e.position.z<28 && e.position.z>-34 && carSweptHit(e,prevZ))crash(); if(e.position.z>28){recycleEnemy(e)}} enforceTrafficSpacing(); updateRivalAudio(enemies,dt);} else { updateAudio(dt,false,false,false); updateRivalAudio([],dt); }
 player.position.y=Math.sin(t*18)*.026; underGlow.position.set(player.position.x,.45,player.position.z); underGlow.intensity=1.7+Math.sin(t*10)*.35; const camX=player.position.x*.34+(Math.sin(t*37)*shake); const camY=6.15+speed/190; const camZ=22.5+Math.sin(t*29)*shake; camera.position.lerp(new THREE.Vector3(camX,camY,camZ),dt*5.2); camera.lookAt(player.position.x*.36,0.95,player.position.z-12.0); shake=Math.max(0,shake-dt*2.2); scoreEl.textContent=Math.floor(distance); speedEl.textContent=Math.floor(speed); comboEl.textContent=combo+'x'; if(!running&&raceRivals.length===0)setRaceHud(1); nitroEl.style.width=nitro+'%'; renderer.render(scene,camera)} loop();
