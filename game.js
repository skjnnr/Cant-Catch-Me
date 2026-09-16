
function formFieldHasFocus(){
  const el=document.activeElement;
  return !!el && (el.matches?.("input, textarea, select") || el.isContentEditable);
}

// CAN'T CATCH ME — Stage 3 movement repair
// Clean single-source controller. WASD does not depend on pointer lock.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c8ee);
scene.fog = new THREE.Fog(0x87c8ee, 90, 260);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 600);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdde8e8, 0x30382f, 1.05));
const sun = new THREE.DirectionalLight(0xfff4df, 1.05);
sun.position.set(50, 90, 40);
sun.castShadow = true;
scene.add(sun);

// Procedural textures keep GitHub Pages simple: no external image files needed.
function makeGrassTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");

  x.fillStyle = "#2f6634";
  x.fillRect(0,0,256,256);

  // mottled soil/grass variation
  for(let i=0;i<3500;i++) {
    const g = 55 + Math.floor(Math.random()*45);
    const r = 28 + Math.floor(Math.random()*25);
    const b = 27 + Math.floor(Math.random()*22);
    x.fillStyle = `rgba(${r},${g},${b},${0.10+Math.random()*0.20})`;
    const px=Math.random()*256, py=Math.random()*256;
    x.fillRect(px,py,1+Math.random()*2,1+Math.random()*4);
  }

  // tiny grass blades
  x.lineWidth=1;
  for(let i=0;i<650;i++) {
    const px=Math.random()*256, py=Math.random()*256;
    x.strokeStyle=Math.random()>.5?"rgba(25,75,30,.32)":"rgba(75,105,58,.20)";
    x.beginPath();
    x.moveTo(px,py);
    x.lineTo(px+(Math.random()-0.5)*2,py-2-Math.random()*5);
    x.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(28,28);
  t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return t;
}

function makeRoadTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");

  x.fillStyle="#353a3e";
  x.fillRect(0,0,256,256);

  // asphalt aggregate
  for(let i=0;i<5000;i++) {
    const v=42+Math.floor(Math.random()*45);
    const a=.06+Math.random()*.20;
    x.fillStyle=`rgba(${v},${v},${v},${a})`;
    const size=Math.random()<.85?1:2;
    x.fillRect(Math.random()*256,Math.random()*256,size,size);
  }

  // faint cracks
  x.strokeStyle="rgba(30,32,34,.22)";
  x.lineWidth=1;
  for(let i=0;i<18;i++) {
    let px=Math.random()*256, py=Math.random()*256;
    x.beginPath(); x.moveTo(px,py);
    for(let j=0;j<4;j++) {
      px+=(Math.random()-.5)*22;
      py+=8+Math.random()*16;
      x.lineTo(px,py);
    }
    x.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(20,20);
  t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return t;
}

const grassTexture = makeGrassTexture();
const roadTexture = makeRoadTexture();

const M = {
  grass: new THREE.MeshStandardMaterial({
    map: grassTexture,
    color:0xffffff,
    roughness:1
  }),
  road: new THREE.MeshStandardMaterial({
    map: roadTexture,
    color:0xffffff,
    roughness:.96,
    metalness:0
  }),
  sidewalk: new THREE.MeshStandardMaterial({color:0xa1a5a7,roughness:.9}),
  wall: new THREE.MeshStandardMaterial({color:0x7f8d91}),
  dark: new THREE.MeshStandardMaterial({color:0x344143}),
  wood: new THREE.MeshStandardMaterial({color:0x936a37}),
  trunk: new THREE.MeshStandardMaterial({color:0x684329}),
  leaves: new THREE.MeshStandardMaterial({color:0x3d7650})
};

const colliders = [];
const preMapChildren = new Set(scene.children);

function addCollider(x,z,w,d,topY=0,jumpable=true) {
  colliders.push({
    minX:x-w/2,maxX:x+w/2,
    minZ:z-d/2,maxZ:z+d/2,
    topY,
    jumpable
  });
}

function box(x,y,z,w,h,d,mat,solid=false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if(solid) addCollider(x,z,w,d,y+h/2,true);
  return mesh;
}

// Ground and streets
const ground = new THREE.Mesh(new THREE.PlaneGeometry(220,220),M.grass);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

box(0,.02,0,18,.04,220,M.road);
box(0,.03,0,220,.04,18,M.road);
box(-70,.025,0,12,.04,220,M.road);
box(70,.025,0,12,.04,220,M.road);
box(0,.035,-70,220,.04,12,M.road);
box(0,.035,70,220,.04,12,M.road);

box(-14,.05,0,3,.08,220,M.sidewalk);
box(14,.05,0,3,.08,220,M.sidewalk);
box(0,.05,-14,220,.08,3,M.sidewalk);
box(0,.05,14,220,.08,3,M.sidewalk);


// Road markings make the streets read more clearly as asphalt roads.
const lineMat = new THREE.MeshStandardMaterial({
  color:0xa99754,
  roughness:.85
});

for(let z=-100; z<=100; z+=12) {
  box(0,.065,z,0.18,.02,5.5,lineMat,false);
}
for(let x=-100; x<=100; x+=12) {
  box(x,.07,0,5.5,.02,0.18,lineMat,false);
}

// Enterable buildings with door openings.
function building(x,z,w,d,h=8) {
  const t=.8, door=5;
  box(x,h/2,z-d/2+t/2,w,h,t,M.wall,true);
  box(x-w/2+t/2,h/2,z,t,h,d,M.wall,true);
  box(x+w/2-t/2,h/2,z,t,h,d,M.wall,true);

  const side=(w-door)/2;
  const front=z+d/2-t/2;
  box(x-w/2+side/2,h/2,front,side,h,t,M.wall,true);
  box(x+w/2-side/2,h/2,front,side,h,t,M.wall,true);
  box(x,h+.3,z,w+.4,.6,d+.4,M.dark,false);

  // Interior hiding objects
  box(x-3,1,z-2,3,2,1.4,M.wood,true);
  box(x+3,1,z+2,2,2,2,M.wood,true);
}

building(-45,-45,30,26,8);
building(45,-45,30,26,8);
building(-45,45,30,26,8);
building(45,45,30,26,8);
building(-82,35,23,28,7);
building(82,-35,23,28,7);

// Crates
for(const [x,z] of [[-25,-30],[25,-30],[-25,30],[25,30],[-78,-72],[78,72]]) {
  for(let i=0;i<4;i++) {
    const ox=(i%2)*2.4-1.2, oz=Math.floor(i/2)*2.4-1.2;
    box(x+ox,1,z+oz,2.1,2,2.1,M.wood,true);
  }
}

// Trees with collision
function tree(x,z,s=1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(.65*s,.65*s,4*s,12), M.trunk
  );
  trunk.position.set(x,2*s,z);
  trunk.castShadow=true;
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.5*s,12,10), M.leaves
  );
  crown.position.set(x,5*s,z);
  crown.castShadow=true;
  scene.add(crown);

  addCollider(x,z,1.6*s,1.6*s,4*s,true);
}

[
 [-92,-92,1.2],[-65,-92,1],[-35,-92,1.3],[35,-92,1],[65,-92,1.2],[92,-92,1.1],
 [-92,92,1.1],[-65,92,1.3],[-35,92,1],[35,92,1.2],[65,92,1],[92,92,1.3],
 [-94,-45,1],[-94,0,1.2],[-94,45,1],[94,-45,1.2],[94,0,1],[94,45,1.3]
].forEach(v=>tree(v[0],v[1],v[2]));

// Outer collision walls
box(0,3,-109,218,6,1,M.dark,false); addCollider(0,-109,218,1,6,false);
box(0,3,109,218,6,1,M.dark,false); addCollider(0,109,218,1,6,false);
box(-109,3,0,1,6,218,M.dark,false); addCollider(-109,0,1,218,6,false);
box(109,3,0,1,6,218,M.dark,false); addCollider(109,0,1,218,6,false);


// ---------- MAP SYSTEM ----------
const originalMapObjects = scene.children.filter(o=>!preMapChildren.has(o));
const originalColliders = colliders.map(c=>({...c}));
const castleObjects = [];
let castleColliders = [];
let selectedMap = "original";
let pendingMap = "original";

function makeTileTexture(kind="wall"){
  const c=document.createElement("canvas"); c.width=c.height=512;
  const x=c.getContext("2d");
  const floor=kind==="floor";
  x.fillStyle=floor?"#303338":"#25282d"; x.fillRect(0,0,512,512);
  const bh=floor?42:58, bw=floor?105:112;
  for(let y=-bh;y<512+bh;y+=bh){
    const row=Math.floor(y/bh), off=(row%2)*(bw/2);
    for(let xx=-bw+off;xx<512+bw;xx+=bw){
      const v=(Math.random()*22-11)|0;
      const base=floor?54:45;
      x.fillStyle=`rgb(${base+v},${base+8+v},${base+10+v})`;
      x.fillRect(xx+3,y+3,bw-6,bh-6);
      x.strokeStyle="rgba(8,10,12,.85)"; x.lineWidth=3;
      x.strokeRect(xx+2,y+2,bw-4,bh-4);
      x.strokeStyle="rgba(150,145,135,.10)"; x.lineWidth=2;
      x.beginPath(); x.moveTo(xx+5,y+5); x.lineTo(xx+bw-6,y+5); x.stroke();
    }
  }
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.NearestFilter;
  return t;
}
function tiledMaterial(base,rx,ry){
  const tex=base.clone(); tex.needsUpdate=true; tex.repeat.set(rx,ry);
  return new THREE.MeshStandardMaterial({map:tex,roughness:.92,color:0x9a9690});
}
const castleWallBase=makeTileTexture("wall");
const castleFloorBase=makeTileTexture("floor");
const castleStone=new THREE.MeshStandardMaterial({map:castleWallBase,roughness:.94,color:0x817d78});
const castleDark=new THREE.MeshStandardMaterial({color:0x48545a,roughness:1});
const castleWood=new THREE.MeshStandardMaterial({color:0x68472d,roughness:.95});
const castleGrass=new THREE.MeshStandardMaterial({color:0x4e6842,roughness:1});
const castleBannerRed=new THREE.MeshStandardMaterial({color:0x9b3f35,roughness:.9});
const castleBannerBlue=new THREE.MeshStandardMaterial({color:0x285b94,roughness:.9});
const lampMetal=new THREE.MeshStandardMaterial({color:0x22282d,roughness:.72,metalness:.25});
const lampGlow=new THREE.MeshBasicMaterial({color:0xffb13b});

function castleAddCollider(x,z,w,d,topY=0,jumpable=true){
  castleColliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,topY,jumpable});
}
function castleBox(x,y,z,w,h,d,mat=castleStone,solid=true,autoTile=false){
  let useMat=mat;
  if(autoTile && mat===castleStone){
    const tex=castleWallBase.clone(); tex.needsUpdate=true;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1,w/7),Math.max(1,h/4));
    useMat=new THREE.MeshStandardMaterial({map:tex,roughness:.94,color:0x817d78});
  }
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),useMat);
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
  scene.add(m); castleObjects.push(m);
  if(solid) castleAddCollider(x,z,w,d,y+h/2,true);
  return m;
}
function castleTower(x,z,w=15,h=13){
  castleBox(x,h/2,z,w,h,w,castleStone,true,true);
  for(const [dx,dz] of [[-w/2+1.7,-w/2+1.7],[w/2-1.7,-w/2+1.7],[-w/2+1.7,w/2-1.7],[w/2-1.7,w/2-1.7]])
    castleBox(x+dx,h+1.25,z+dz,3.4,2.5,3.4,castleStone,true,true);
}
function castleLamp(x,z){
  castleBox(x,.45,z,3.2,.9,3.2,castleStone,true,true);
  castleBox(x,2.7,z,.38,4.5,.38,lampMetal,false);
  castleBox(x,4.8,z,1.25,.18,1.25,lampMetal,false);
  const glow=castleBox(x,4.35,z,.78,1.15,.78,lampGlow,false);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.9,.65,4),lampMetal);
  cap.position.set(x,5.15,z); cap.rotation.y=Math.PI/4;
  scene.add(cap); castleObjects.push(cap);
  const light=new THREE.PointLight(0xff8a24,3.2,38,1.55);
  light.position.set(x,4.5,z); scene.add(light); castleObjects.push(light);
}
function buildCastleMap(){
  castleColliders=[];
  // Foundation and visible stone-brick courtyard floor.
  castleBox(0,-.55,0,170,1,170,castleDark,false);
  const ft=castleFloorBase.clone(); ft.needsUpdate=true; ft.wrapS=ft.wrapT=THREE.RepeatWrapping; ft.repeat.set(18,18);
  const floorMat=new THREE.MeshStandardMaterial({map:ft,roughness:.96,color:0x77736e});
  castleBox(0,.015,0,158,.08,158,floorMat,false);

  // Outer walls: repeated brick scale prevents stretching.
  castleBox(0,5,-82,164,10,5,castleStone,true,true);
  castleBox(0,5,82,164,10,5,castleStone,true,true);
  castleBox(-82,5,0,5,10,164,castleStone,true,true);
  castleBox(82,5,0,5,10,164,castleStone,true,true);
  for(let x=-76;x<=76;x+=10){castleBox(x,11,-82,5,3,5,castleStone,true,true);castleBox(x,11,82,5,3,5,castleStone,true,true);}
  for(let z=-72;z<=72;z+=10){castleBox(-82,11,z,5,3,5,castleStone,true,true);castleBox(82,11,z,5,3,5,castleStone,true,true);}

  castleTower(-72,-72,18,16);castleTower(72,-72,18,16);
  castleTower(-72,72,18,16);castleTower(72,72,18,16);

  // Central keep.
  castleBox(0,7,-25,52,14,5,castleStone,true,true);
  castleBox(-24,7,0,5,14,50,castleStone,true,true);
  castleBox(24,7,0,5,14,50,castleStone,true,true);
  castleBox(-15,7,25,18,14,5,castleStone,true,true);
  castleBox(15,7,25,18,14,5,castleStone,true,true);
  castleBox(0,14.5,0,53,1.5,52,castleDark,false);
  castleTower(-20,-20,10,18);castleTower(20,-20,10,18);

  castleBox(-48,3,0,28,6,10,castleStone,true,true);
  castleBox(48,3,0,28,6,10,castleStone,true,true);
  for(let i=0;i<6;i++){
    castleBox(-34+i*3,.5+i*.55,38,3,1+i*1.1,8,castleStone,true,true);
    castleBox(34-i*3,.5+i*.55,-42,3,1+i*1.1,8,castleStone,true,true);
  }
  for(const [x,z] of [[-12,48],[12,48],[-48,-28],[48,28],[0,-55],[-55,35],[55,-35]])
    castleBox(x,1.5,z,4,3,4,castleWood,true);

  // Banners.
  for(const [x,z,mat] of [[-70,-62,castleBannerBlue],[70,-62,castleBannerRed],[-70,62,castleBannerRed],[70,62,castleBannerBlue]])
    castleBox(x,10,z,6,7,.28,mat,false);

  // Fully visible lamp posts: base, post, lantern housing, cap and actual light.
  [[-34,-34],[34,-34],[-34,34],[34,34],[-66,0],[66,0],[0,-66],[0,66]].forEach(v=>castleLamp(...v));

  castleObjects.forEach(o=>o.visible=false);
}
buildCastleMap();


let castleNightAmbient=null;
let castleNightMoon=null;
function setCastleNight(on){
  if(!castleNightAmbient){
    castleNightAmbient=new THREE.HemisphereLight(0x23364d,0x08090c,.20);
    castleNightMoon=new THREE.DirectionalLight(0x7894bd,.24);
    castleNightMoon.position.set(-35,55,-20);
    scene.add(castleNightAmbient,castleNightMoon);
  }
  castleNightAmbient.visible=on; castleNightMoon.visible=on;
  if(on){
    scene.background=new THREE.Color(0x07101d);
    scene.fog=new THREE.Fog(0x07101d,55,205);
  }else{
    scene.background=new THREE.Color(0x8ec9ee);
    scene.fog=new THREE.Fog(0x8ec9ee,55,220);
  }
  // Dim the original global daylight while in the castle so lamps do the lighting.
  scene.children.forEach(o=>{
    if(o.isHemisphereLight && o!==castleNightAmbient) o.intensity=on?.10:.55;
    if(o.isDirectionalLight && o!==castleNightMoon) o.intensity=on?.12:.75;
  });
}
function applyMap(name){
  selectedMap=name==="castle"?"castle":"original";
  setCastleNight(selectedMap==="castle");
  originalMapObjects.forEach(o=>o.visible=selectedMap==="original");
  castleObjects.forEach(o=>o.visible=selectedMap==="castle");
  colliders.length=0;
  const source=selectedMap==="castle"?castleColliders:originalColliders;
  source.forEach(c=>colliders.push({...c}));
  player.x=0; player.z=selectedMap==="castle"?62:72; player.y=1.7;
  player.velocityY=0; player.onGround=true; player.yaw=0; player.pitch=0;
  updatePlayerModel();
}

// Player
const player = {
  x: 0,
  y: 1.7,
  z: 72,
  yaw: 0,
  pitch: 0,
  radius: .48,
  velocityY: 0,
  onGround: true
};


// ---------- PLAYER MODEL + CAMERA MODE ----------
let thirdPerson = false;

// Simple rectangular character body.
const playerModel = new THREE.Group();

const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe0b46f });
const faceMat = new THREE.MeshStandardMaterial({ color: 0xf1c98a });
const blackMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.75, 0.72), bodyMat);
body.position.y = -0.88;
body.castShadow = true;
playerModel.add(body);

// Head is rectangular too.
const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.78, 0.76), faceMat);
head.position.y = 0.32;
head.castShadow = true;
playerModel.add(head);

// Face points toward local -Z, which is the player's forward direction.
function faceBox(x,y,w,h) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,0.035), blackMat);
  m.position.set(x,y,-0.398);
  return m;
}

// Two black eyes.
playerModel.add(faceBox(-0.20,0.42,0.12,0.16));
playerModel.add(faceBox( 0.20,0.42,0.12,0.16));

// Smile: three small rectangular black pieces form a simple curved smile.
const smileMid = faceBox(0,0.16,0.30,0.055);
playerModel.add(smileMid);
const smileL = faceBox(-0.18,0.205,0.12,0.055);
smileL.rotation.z = -0.38;
playerModel.add(smileL);
const smileR = faceBox(0.18,0.205,0.12,0.055);
smileR.rotation.z = 0.38;
playerModel.add(smileR);

scene.add(playerModel);
playerModel.visible = false;

function updatePlayerModel() {
  // player.y is eye/camera height. Put the model so its eyes are near that height.
  playerModel.position.set(player.x, player.y - 0.47, player.z);
  playerModel.rotation.y = player.yaw;
  playerModel.visible = thirdPerson;
}

camera.position.set(player.x,player.y,player.z);

// KEY FIX:
// Use BOTH KeyboardEvent.code and KeyboardEvent.key.
// Movement does NOT require pointer lock.
const keys = new Set();
let jumpQueued = false;

function down(e) {
  const el=e.target;
  if(el && (el.tagName==="INPUT" || el.tagName==="TEXTAREA" || el.tagName==="SELECT" || el.isContentEditable)) return;
  // Queue one jump per Space press (no auto-bunny-hop from key repeat).
  if (e.code === "Space" && !e.repeat) {
    jumpQueued = true;
    e.preventDefault();
  }
  keys.add(e.code);
  keys.add((e.key || "").toLowerCase());
  if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
    e.preventDefault();
}
function up(e) {
  const el=e.target;
  if(el && (el.tagName==="INPUT" || el.tagName==="TEXTAREA" || el.tagName==="SELECT" || el.isContentEditable)) return;
  keys.delete(e.code);
  keys.delete((e.key || "").toLowerCase());
}
window.addEventListener("keydown",down,{capture:true});
window.addEventListener("keyup",up,{capture:true});
window.addEventListener("blur",()=>keys.clear());

function held(code,key) {
  return keys.has(code) || keys.has(key);
}

function collisionAt(x,z) {
  const feet = playerFeetY();

  for(const c of colliders) {
    const overlap =
      x+player.radius>c.minX &&
      x-player.radius<c.maxX &&
      z+player.radius>c.minZ &&
      z-player.radius<c.maxZ;

    if(!overlap) continue;

    // Once the player's feet are at/above an object's top, its side collider
    // no longer blocks horizontal motion. This lets the player move across
    // the top instead of hitting an invisible wall.
    // Give a small ledge-clearance margin so the player can actually move
    // over the box edge during a jump. Without this, the 2D side collider
    // acts like an invisible full-height wall.
    const projectedFeet = feet + Math.max(0, player.velocityY) * 0.045;
    if(c.jumpable && projectedFeet >= c.topY - 0.42) continue;

    return true;
  }
  return false;
}

function tryMove(dx,dz) {
  const nx=player.x+dx;
  if(!collisionAt(nx,player.z)) player.x=nx;

  const nz=player.z+dz;
  if(!collisionAt(player.x,nz)) player.z=nz;
}

// Detect the existing Stage 3 UI if present.
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const settingsEl = document.getElementById("settings");
const sensitivityEl = document.getElementById("sensitivity");
const sensitivityValue = document.getElementById("sensitivity-value");
const resumeButton = document.getElementById("resume-button");
const closeButton = document.getElementById("close-settings");

let started = !startButton;
let settingsOpen = false;
let sensitivity = sensitivityEl ? Number(sensitivityEl.value) : 2;

function requestMouse() {
  try { renderer.domElement.requestPointerLock?.(); } catch(e) {}
}

if(startButton) {
  startButton.addEventListener("click",()=>{
    started=true;
    if(earlyLogoutBtn) earlyLogoutBtn.style.display="none";
    if(startScreen) startScreen.style.display="none";
  const inGameLogout=document.getElementById("logout-btn"); if(inGameLogout) inGameLogout.style.display="none";
    keys.clear();
    requestMouse();
  });
}

if(sensitivityEl) {
  sensitivityEl.addEventListener("input",()=>{
    sensitivity=Number(sensitivityEl.value);
    if(sensitivityValue) sensitivityValue.textContent=sensitivity.toFixed(1);
  });
}

function setSettings(open) {
  settingsOpen=open;
  keys.clear();
  if(settingsEl) settingsEl.style.display=open?"flex":"none";
  if(open) document.exitPointerLock?.();
}

if(resumeButton) resumeButton.addEventListener("click",()=>{setSettings(false);requestMouse();});
if(closeButton) closeButton.addEventListener("click",()=>setSettings(false));

window.addEventListener("keydown",e=>{
  if(formFieldHasFocus()) return;
  if(e.code==="Escape" && started) setSettings(!settingsOpen);

  // H toggles first-person / third-person.
  if(e.code==="KeyH" && started && !e.repeat) {
    thirdPerson = !thirdPerson;
  }
});

renderer.domElement.addEventListener("click",()=>{
  if(started&&!settingsOpen) requestMouse();
});

document.addEventListener("mousemove",e=>{
  if(!started || settingsOpen || document.pointerLockElement!==renderer.domElement) return;
  player.yaw -= e.movementX * .0015 * sensitivity;
  player.pitch -= e.movementY * .0015 * sensitivity;
  player.pitch = Math.max(-1.5,Math.min(1.5,player.pitch));
});


// ---------- JUMPING ----------
// Player eye height while standing on the ground.
const GROUND_EYE_Y = 1.7;

// Gravity and jump speed are tuned so the player can get on top of the
// 2-unit-high crate cubes used around the map.
const GRAVITY = 20;
const JUMP_SPEED = 9.4;

// The player's feet are eye-height below camera Y.
function playerFeetY() {
  return player.y - GROUND_EYE_Y;
}

// Find a crate/interior box top under the player's horizontal footprint.
// Existing colliders are 2D, so this uses scene boxes that are close enough
// to act as jumpable platforms. For this Stage 3 map, the common cubes are
// 2 units tall, so their top is y=2.
function platformTopAt(x, z, previousFeet, nextFeet) {
  let best = 0;

  for(const c of colliders) {
    if(!c.jumpable || c.topY <= 0) continue;

    const horizontallyOn =
      x + player.radius > c.minX &&
      x - player.radius < c.maxX &&
      z + player.radius > c.minZ &&
      z - player.radius < c.maxZ;

    if(!horizontallyOn) continue;

    // Land when the player's feet cross the object's top while falling.
    // The tolerance keeps fast frames from tunneling through thin tops.
    if(previousFeet >= c.topY - 0.28 && nextFeet <= c.topY + 0.20) {
      best = Math.max(best, c.topY);
    }
  }

  return best;
}

function updateJump(dt) {
  if(!started || settingsOpen) {
    jumpQueued = false;
    return;
  }

  if(jumpQueued && player.onGround) {
    player.velocityY = JUMP_SPEED;
    player.onGround = false;
  }
  jumpQueued = false;

  const previousFeet = playerFeetY();
  player.velocityY -= GRAVITY * dt;
  player.y += player.velocityY * dt;
  const nextFeet = playerFeetY();

  if(player.velocityY <= 0) {
    const top = platformTopAt(player.x, player.z, previousFeet, nextFeet);

    // Land on ground or a cube top.
    if(nextFeet <= top + 0.18 && previousFeet >= top - 0.30) {
      player.y = GROUND_EYE_Y + top;
      player.velocityY = 0;
      player.onGround = true;
      return;
    }
  }

  // Ground fallback.
  if(playerFeetY() <= 0) {
    player.y = GROUND_EYE_Y;
    player.velocityY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
}

function updateMovement(dt) {
  if(!started || settingsOpen) return;

  let f=0, r=0;
  if(held("KeyW","w")) f+=1;
  if(held("KeyS","s")) f-=1;
  if(held("KeyD","d")) r+=1;
  if(held("KeyA","a")) r-=1;

  if(!f&&!r) return;

  const len=Math.hypot(f,r);
  f/=len; r/=len;

  const sprint=held("ShiftLeft","shift")||held("ShiftRight","shift");
  const speed=sprint?11:6;

  const dx=(-Math.sin(player.yaw)*f + Math.cos(player.yaw)*r)*speed*dt;
  const dz=(-Math.cos(player.yaw)*f - Math.sin(player.yaw)*r)*speed*dt;
  tryMove(dx,dz);
}

function updateCamera() {
  updatePlayerModel();

  if(!thirdPerson) {
    camera.position.set(player.x,player.y,player.z);
    camera.rotation.y=player.yaw;
    camera.rotation.x=player.pitch;
    return;
  }

  // Third-person chase camera: behind and slightly above the player.
  const distance = 5.2;
  const height = 2.15;

  const backX = Math.sin(player.yaw) * distance;
  const backZ = Math.cos(player.yaw) * distance;

  camera.position.set(
    player.x + backX,
    player.y + height,
    player.z + backZ
  );

  // Aim toward the character's upper body.
  const target = new THREE.Vector3(
    player.x,
    player.y - 0.35,
    player.z
  );
  camera.lookAt(target);
}

let last=performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05);
  last=now;

  // Vertical physics first so horizontal collision sees the player's
  // CURRENT jump height rather than the previous frame's height.
  updateJump(dt);
  updateMovement(dt);
  updateCamera();
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});




function isTypingInForm(){
  const el=document.activeElement;
  return !!el && (el.tagName==="INPUT" || el.tagName==="TEXTAREA" || el.isContentEditable);
}

// Prevent typing on the login/create-account screen from leaving movement keys "stuck".
function clearMovementKeys(){
  if(typeof keys!=="undefined" && keys?.clear) keys.clear();
  jumpQueued=false;
}
document.addEventListener("focusin",e=>{
  if(e.target && (e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA")){
    clearMovementKeys();
  }
});
document.addEventListener("focusout",clearMovementKeys);
window.addEventListener("blur",clearMovementKeys);



// Login/create-account fields own their keystrokes completely.
// This lets W/A/S/D type normally instead of being captured by game controls.
document.querySelectorAll("#auth-screen input").forEach(input=>{
  input.addEventListener("keydown",e=>e.stopPropagation());
  input.addEventListener("keyup",e=>e.stopPropagation());
  input.addEventListener("keypress",e=>e.stopPropagation());
});

// ================= ACCOUNT SYSTEM =================
// Uses the same Supabase browser client as multiplayer.
const AUTH_URL="https://wsucaukqrommcshdpdxy.supabase.co";
const AUTH_KEY="sb_publishable_eksR6ebuyO98BaYm5pVTdg__4exI5Xc";
const authClient=window.supabase.createClient(AUTH_URL,AUTH_KEY,{
  auth:{
    persistSession:false,
    autoRefreshToken:false,
    detectSessionInUrl:false
  }
});
let currentUsername="Player";
let currentRole="player";

const authScreen=document.getElementById("auth-screen");
const earlyLogoutBtn=document.getElementById("logout-btn");
if(earlyLogoutBtn) earlyLogoutBtn.style.display="none";
const authMessage=document.getElementById("auth-message");
const loginForm=document.getElementById("login-form");
const signupForm=document.getElementById("signup-form");

function msg(t){ authMessage.textContent=t||""; }
function showLogin(){signupForm.style.display="none";loginForm.style.display="block";msg("");}
function showSignup(){loginForm.style.display="none";signupForm.style.display="block";msg("");}
document.getElementById("show-signup").onclick=showSignup;
document.getElementById("show-login").onclick=showLogin;

function cleanUsername(v){
  return v.trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,20);
}



let currentAuthUser=null;
let roleCheckTimer=null;
let localLabel=null;

function rebuildLocalRoleLabel(){
  if(typeof playerModel==="undefined" || !playerModel) return;
  if(typeof localLabel!=="undefined" && localLabel){
    playerModel.remove(localLabel);
    localLabel.material?.map?.dispose?.();
    localLabel.material?.dispose?.();
    localLabel=null;
  }
  localLabel=makeNameSprite(currentUsername,currentRole);
  playerModel.add(localLabel);
}

async function refreshRoleFromSupabase(){
  if(!currentAuthUser?.id || !multiplayerLoggedIn) return;
  const previousRole=currentRole;
  await loadCurrentPlayerRole(currentAuthUser);
  if(previousRole!==currentRole){
    rebuildLocalRoleLabel();
    // Immediately tell other clients instead of waiting for the next normal network update.
    if(ch){
      try{
        await ch.track({
          id:myId,userId:currentAuthUser.id,username:currentUsername,
          role:currentRole,joined_at:Date.now()
        });
        await ch.send({type:"broadcast",event:"state",payload:{
          id:myId,userId:currentAuthUser.id,username:currentUsername,role:currentRole,
          x:player.x,y:player.y,z:player.z,yaw:player.yaw
        }});
      }catch(e){ console.warn("Role broadcast refresh failed",e); }
    }
  }
}

function startLiveRoleChecks(){
  if(roleCheckTimer) clearInterval(roleCheckTimer);
  roleCheckTimer=setInterval(refreshRoleFromSupabase,5000);
}

function stopLiveRoleChecks(){
  if(roleCheckTimer){ clearInterval(roleCheckTimer); roleCheckTimer=null; }
}

async function loadCurrentPlayerRole(user){
  currentRole="player";
  if(!user?.id) return currentRole;
  const {data,error}=await authClient
    .from("player_roles")
    .select("role")
    .eq("user_id",user.id)
    .maybeSingle();

  if(error){
    console.error("Could not load player role:",error);
  }else{
    const dbRole=String(data?.role||"player").toLowerCase();
    currentRole=(dbRole==="owner" || dbRole==="mod") ? dbRole : "player";
  }

  return currentRole;
}



// ---------- PUBLIC / PRIVATE ROOM STATE ----------
const PUBLIC_ROOM_LIMIT=12;
const MATCHMAKING_CHANNEL="cant-catch-me:public-directory";
let lobbyMode="public";
let lobbyCode="";
let matchmakingChannel=null;

function cleanLobbyCode(value){
  return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
}

function makeLobbyCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const nums=new Uint32Array(6);
  crypto.getRandomValues(nums);
  let code="";
  for(const n of nums) code+=chars[n%chars.length];
  return code;
}

function makePublicCode(){
  const nums=new Uint32Array(1);
  crypto.getRandomValues(nums);
  return String(100000+(nums[0]%900000));
}

function multiplayerChannelName(){
  return lobbyMode==="private"
    ? "cant-catch-me:private:"+lobbyCode
    : "cant-catch-me:public:"+lobbyCode;
}

async function ensureMatchmakingChannel(){
  if(matchmakingChannel) return matchmakingChannel;
  matchmakingChannel=authClient.channel(MATCHMAKING_CHANNEL,{
    config:{presence:{key:myId}}
  });
  await new Promise((resolve,reject)=>{
    let settled=false;
    const done=()=>{if(!settled){settled=true;resolve();}};
    const timer=setTimeout(done,1200);
    matchmakingChannel
      .on("presence",{event:"sync"},()=>{clearTimeout(timer);done();})
      .subscribe(async status=>{
        if(status==="SUBSCRIBED"){
          try{await matchmakingChannel.track({id:myId,room:null});}catch(_){}
          setTimeout(done,150);
        }else if(status==="CHANNEL_ERROR"&&!settled){
          clearTimeout(timer); settled=true; reject(new Error("Public matchmaking failed"));
        }
      });
  });
  return matchmakingChannel;
}

function publicRoomCounts(){
  const counts={};
  if(!matchmakingChannel) return counts;
  const state=matchmakingChannel.presenceState();
  for(const entries of Object.values(state)){
    for(const p of entries){
      if(p.room) counts[p.room]=(counts[p.room]||0)+1;
    }
  }
  return counts;
}

async function advertisePublicRoom(code){
  await ensureMatchmakingChannel();
  await matchmakingChannel.track({id:myId,room:code});
}

async function choosePublicRoom(){
  await ensureMatchmakingChannel();
  const counts=publicRoomCounts();
  const available=Object.keys(counts)
    .filter(code=>/^\d{6}$/.test(code)&&counts[code]<PUBLIC_ROOM_LIMIT)
    .sort((a,b)=>a.localeCompare(b));
  if(available.length) return available[0];

  let code;
  do{code=makePublicCode();}while(counts[code]);
  return code;
}

async function isActivePublicCode(code){
  await ensureMatchmakingChannel();
  return Object.prototype.hasOwnProperty.call(publicRoomCounts(),code);
}

async function leavePublicDirectory(){
  if(matchmakingChannel){
    try{await matchmakingChannel.untrack();}catch(_){}
    try{await authClient.removeChannel(matchmakingChannel);}catch(_){}
    matchmakingChannel=null;
  }
}

const mapSelectScreen=document.getElementById("map-select-screen");
const loadingScreen=document.getElementById("loading-screen");
const loadingBar=document.getElementById("loading-bar");
const loadingPercent=document.getElementById("loading-percent");
const loadingMapName=document.getElementById("loading-map-name");



async function showMainMenu(){
  if(typeof dbLeaveQueue==='function') await dbLeaveQueue();
  roomCodeDisplay.style.display="none";

  // Fully disconnect from whichever public/private room the player was in.
  await stopCurrentLobbyChannel();
  await leavePublicDirectory();

  lobbyCode="";
  lobbyMode="public";
  started=false;
  settingsOpen=false;
  keys.clear();
  document.exitPointerLock?.();

  if(settingsEl) settingsEl.style.display="none";
  if(startScreen) startScreen.style.display="none";
  if(loadingScreen) loadingScreen.style.display="none";
  if(mapSelectScreen) mapSelectScreen.style.display="flex";

  // The standalone in-game logout button must never appear.
  if(earlyLogoutBtn) earlyLogoutBtn.style.display="none";

  refreshMainMenuIdentity();
  syncMenuOnlineCount();
}
document.getElementById("back-main-menu")?.addEventListener("click",(e)=>{
  e.preventDefault();
  e.stopPropagation();
  showMainMenu();
});

document.getElementById("menu-select")?.addEventListener("click",()=>{
  document.querySelector(".ccm-map-panel")?.scrollIntoView({behavior:"smooth",block:"center"});
});
document.getElementById("menu-play")?.addEventListener("click",()=>{
  mapSelectScreen.style.display="none";
  document.getElementById("lobby-choice-screen").style.display="flex";
});
document.getElementById("menu-settings")?.addEventListener("click",()=>{
  mapSelectScreen.style.display="none";
  settings.style.display="flex"; paused=true;
});
document.getElementById("menu-credits")?.addEventListener("click",()=>{
  document.getElementById("credits-panel").style.display="block";
});
document.getElementById("credits-close")?.addEventListener("click",()=>{
  document.getElementById("credits-panel").style.display="none";
});
document.getElementById("menu-logout")?.addEventListener("click",()=>{
  document.getElementById("logout-btn")?.click();
});
function syncMenuOnlineCount(){
  const dst=document.getElementById("menu-online-count");
  if(!dst) return;

  // Read the real Supabase Presence state whenever possible.
  if(ch){
    try{
      const state=ch.presenceState();
      const count=Object.keys(state||{}).length;
      dst.textContent=String(multiplayerLoggedIn ? Math.max(1,count) : 0);
      return;
    }catch(_){}
  }

  // Fallback to the actual multiplayer HUD count.
  const src=document.getElementById("mp-count");
  const m=(src?.textContent||"").match(/\d+/);
  dst.textContent=m?m[0]:(multiplayerLoggedIn?"1":"0");
}
setInterval(syncMenuOnlineCount,1000);


const lobbyChoiceScreen=document.getElementById("lobby-choice-screen");
const privateCodeScreen=document.getElementById("private-code-screen");
const roomCodeDisplay=document.getElementById("room-code-display");
const roomTypeLabel=document.getElementById("room-type-label");
const roomCodeText=document.getElementById("room-code-text");

async function stopCurrentLobbyChannel(){
  window.forceRoomLeaderboard?.(false);
  hideRoomLeaderboard();
  // Stop sending movement immediately before removing Presence/channel.
  multiplayerStarted=false;
  multiplayerLoggedIn=false;

  const oldChannel=ch;
  ch=null;

  if(oldChannel){
    try{await oldChannel.untrack();}catch(err){console.warn("Presence untrack:",err);}
    try{await authClient.removeChannel(oldChannel);}catch(err){console.warn("Channel remove:",err);}
  }

  // Remove everyone from the old room locally.
  for(const [id,r] of remotes){
    if(r && r.m) scene.remove(r.m);
  }
  remotes.clear();

  if(mpCount) mpCount.textContent="Players: 0";
}

async function enterSelectedLobby(mode,code=""){
  const msg=document.getElementById("private-code-message");
  await stopCurrentLobbyChannel();
  multiplayerLoggedIn=true;

  lobbyMode=mode;
  if(mode==="public"){
    try{
      lobbyCode=cleanLobbyCode(code);
      if(!/^\d{6}$/.test(lobbyCode)) lobbyCode=await choosePublicRoom();
      await advertisePublicRoom(lobbyCode);
    }catch(err){
      console.error(err);
      if(msg) msg.textContent="Could not join public matchmaking. Try again.";
      return false;
    }
  }else{
    lobbyCode=cleanLobbyCode(code);
    if(lobbyCode.length!==6) return false;
    // Private players should not be advertised as public-room occupants.
    if(matchmakingChannel){
      try{await matchmakingChannel.track({id:myId,room:null});}catch(_){}
    }
  }

  multiplayerLoggedIn=true;
  if(msg) msg.textContent="Connecting to room "+lobbyCode+"...";
  try{
    await startMultiplayer();
  }catch(err){
    console.error("Lobby connection failed:",err);
    if(msg) msg.textContent="Could not connect to that lobby. Try again.";
    return false;
  }

  roomTypeLabel.textContent=mode==="private"?"PRIVATE ROOM CODE":"PUBLIC ROOM CODE";
  roomCodeText.textContent=lobbyCode;
  roomCodeDisplay.style.display="block";
  window.forceRoomLeaderboard?.(true);
  roomLeaderboard?.classList.add("in-room");
  setTimeout(()=>window.refreshRoomLeaderboard?.(),100);
  lobbyChoiceScreen && (lobbyChoiceScreen.style.display="none");
  privateCodeScreen.style.display="none";
  loadingScreen.style.display="flex";
  loadingMapName.textContent="LOADING "+pendingMap.toUpperCase();

  let p=0; loadingBar.style.width="0%"; loadingPercent.textContent="0%";
  const timer=setInterval(()=>{
    p=Math.min(100,p+10);
    loadingBar.style.width=p+"%";
    loadingPercent.textContent=p+"%";
    if(p>=100){
      clearInterval(timer);
      applyMap(pendingMap);
      setTimeout(()=>{
        loadingScreen.style.display="none";
        roomCodeDisplay.style.display="block";
  window.forceRoomLeaderboard?.(true);
        roomLeaderboard?.classList.add("in-room");
        window.refreshRoomLeaderboard?.();
        if(startScreen) startScreen.style.display="none";
      if(typeof beginBombGameplay==="function") beginBombGameplay();
      },180);
    }
  },55);
  return true;
}

document.getElementById("join-public")?.addEventListener("click",async()=>{
  const btn=document.getElementById("join-public");
  const old=btn?.textContent;
  if(btn) btn.textContent="FINDING ROOM...";
  await enterSelectedLobby("public","");
  if(btn) btn.textContent=old||"JOIN PUBLIC";
});
document.getElementById("private-lobby-option")?.addEventListener("click",()=>{
  lobbyChoiceScreen && (lobbyChoiceScreen.style.display="none"); privateCodeScreen.style.display="flex";
  document.getElementById("private-code-message").textContent="";
});
document.getElementById("lobby-choice-back")?.addEventListener("click",()=>{
  lobbyChoiceScreen && (lobbyChoiceScreen.style.display="none"); mapSelectScreen.style.display="flex";
});
document.getElementById("private-code-back")?.addEventListener("click",()=>{
  privateCodeScreen.style.display="none"; lobbyChoiceScreen && (lobbyChoiceScreen.style.display="flex");
});
document.getElementById("create-private")?.addEventListener("click",async()=>{
  const code=makeLobbyCode();
  const input=document.getElementById("private-code-input");
  const msg=document.getElementById("private-code-message");
  input.value=code;
  msg.textContent="Creating private room "+code+"...";
  await enterSelectedLobby("private",code);
});
document.getElementById("join-private")?.addEventListener("click",async()=>{
  const input=document.getElementById("private-code-input");
  const msg=document.getElementById("private-code-message");
  const code=cleanLobbyCode(input.value);
  input.value=code;
  if(code.length!==6){
    msg.textContent="Enter a 6-character room code.";
    return;
  }

  msg.textContent="Checking room "+code+"...";
  try{
    if(/^\d{6}$/.test(code) && await isActivePublicCode(code)){
      msg.textContent="Joining public room "+code+"...";
      await enterSelectedLobby("public",code);
    }else{
      msg.textContent="Joining private room "+code+"...";
      await enterSelectedLobby("private",code);
    }
  }catch(err){
    console.error(err);
    msg.textContent="Could not check that room. Try again.";
  }
});
document.getElementById("private-code-input")?.addEventListener("input",e=>{
  const raw=String(e.target.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  e.target.value=raw.slice(0,6);
});

document.querySelectorAll(".map-card").forEach(card=>{
  card.addEventListener("click",()=>{
    pendingMap=card.dataset.map;
    document.querySelectorAll(".map-card").forEach(c=>c.classList.toggle("selected",c===card));
  });
});
document.getElementById("map-confirm")?.addEventListener("click",()=>{
  mapSelectScreen.style.display="none";
  document.getElementById("lobby-choice-screen").style.display="flex";
  return;
  loadingScreen.style.display="flex";
  loadingMapName.textContent="LOADING "+pendingMap.toUpperCase();
  let p=0;
  const timer=setInterval(()=>{
    p=Math.min(100,p+10);
    loadingBar.style.width=p+"%"; loadingPercent.textContent=p+"%";
    if(p>=100){
      clearInterval(timer);
      applyMap(pendingMap);
      setTimeout(()=>{
        loadingScreen.style.display="none";
        if(startScreen) startScreen.style.display="none";
      if(typeof beginBombGameplay==="function") beginBombGameplay();
      },180);
    }
  },55);
});


function refreshMainMenuIdentity(){
  const un=document.getElementById("menu-username");
  const role=document.getElementById("menu-role");
  if(un) un.textContent=currentUsername||"Player";
  if(role){
    role.textContent=currentRole==="owner"?"CREATOR":currentRole==="mod"?"MOD":"PLAYER";
    role.style.color=currentRole==="mod"?"#ff8c24":"#27aaff";
  }
}
async function enterGame(user){
  currentAuthUser=user;
  try{
    await loadCurrentPlayerRole(user);
  }catch(err){
    console.error("Role lookup failed:",err);
    currentRole="player";
  }
  currentUsername=cleanUsername(user?.user_metadata?.username||"Player")||"Player";
  multiplayerLoggedIn=true;
  authScreen.style.display="none";
  if(startScreen) startScreen.style.display="none";
  if(mapSelectScreen) mapSelectScreen.style.display="flex";
  refreshMainMenuIdentity();
  pendingMap=selectedMap;
  document.querySelectorAll(".map-card").forEach(c=>c.classList.toggle("selected",c.dataset.map===pendingMap));
  if(earlyLogoutBtn) earlyLogoutBtn.style.display="none";
  if(document.activeElement && typeof document.activeElement.blur==="function") document.activeElement.blur();
  clearMovementKeys();
  window.focus();
  if(typeof startMultiplayer==="function") startMultiplayer();
  startLiveRoleChecks();
}


async function usernameAvailable(username){
  const {data,error}=await authClient.rpc("is_username_available",{
    requested_username: username
  });
  if(error) return {ok:null,error};
  return {ok:data===true,error:null};
}

document.getElementById("signup-btn").onclick=async()=>{
  const username=cleanUsername(document.getElementById("signup-username").value);
  const email=document.getElementById("signup-email").value.trim();
  const password=document.getElementById("signup-password").value;
  if(username.length<3){msg("Username must be at least 3 characters.");return;}
  if(!email){msg("Enter an email.");return;}
  if(password.length<6){msg("Password must be at least 6 characters.");return;}
  msg("Checking username...");
  const availability=await usernameAvailable(username);
  if(availability.ok===false){
    msg("That username is already taken. Choose another username.");
    return;
  }
  if(availability.ok===null){
    msg("Could not check the username. Run USERNAME-AUTH-FIX.sql in Supabase first.");
    return;
  }

  msg("Creating account...");
  const {data,error}=await authClient.auth.signUp({
    email,password,options:{data:{username}}
  });
  if(error){msg(error.message);return;}

  // Claim the username only after Supabase creates/authenticates the account.
  // The SQL setup file makes this operation atomic and case-insensitively unique.
  if(data.session && data.user){
    const {data:claimed,error:claimError}=await authClient.rpc("claim_username",{
      requested_username: username
    });
    if(claimError || claimed!==true){
      await authClient.auth.signOut();
      msg("The username could not be claimed. If it still shows available, delete this newly-created test user in Supabase Authentication > Users, then try again.");
      return;
    }
    await authClient.auth.updateUser({data:{username}});
    await enterGame({...data.user,user_metadata:{...(data.user.user_metadata||{}),username}});
  } else {
    msg("Account created, but no login session was returned. Make sure Confirm Email is OFF in Supabase.");
  }
};

document.getElementById("login-btn").onclick=async()=>{
  const email=document.getElementById("login-email").value.trim();
  const password=document.getElementById("login-password").value;
  msg("Logging in...");
  const {data,error}=await authClient.auth.signInWithPassword({email,password});
  if(error){msg(error.message);return;}
  try{
    await enterGame(data.user);
  }catch(err){
    console.error("Enter game failed:",err);
    msg("Login succeeded, but the game failed to start. Check the browser console.");
  }
};

// Sessions are intentionally not restored on page reload.
showLogin();


// ================= LOG OUT =================
const logoutBtn=document.getElementById("logout-btn");
async function logoutOfGame(){
  stopLiveRoleChecks();
  currentAuthUser=null;
  clearMovementKeys();

  // Leave Realtime first so this player immediately disappears from Presence.
  if(typeof ch!=="undefined" && ch){
    try { await ch.untrack(); } catch(e) {}
    try { await authClient.removeChannel(ch); } catch(e) {}
    ch=null;
  }

  multiplayerStarted=false;
  multiplayerLoggedIn=false;
  document.getElementById("room-code-display")?.style && (document.getElementById("room-code-display").style.display="none");

  // Remove remote characters from this browser.
  if(typeof remotes!=="undefined"){
    for(const [id,r] of remotes){
      try { scene.remove(r.m); } catch(e) {}
    }
    remotes.clear();
  }

  if(mpStatus) mpStatus.textContent="Login required";
  if(mpCount) mpCount.textContent="Players: 0";

  const {error}=await authClient.auth.signOut();
  if(error){
    msg(error.message);
    return;
  }

  currentUsername="Player";
  currentRole="player";
  authScreen.style.display="flex";
  if(earlyLogoutBtn) earlyLogoutBtn.style.display="none";
  showLogin();
  document.getElementById("login-email").value="";
  document.getElementById("login-password").value="";
  if(document.exitPointerLock) document.exitPointerLock();
}
if(logoutBtn) logoutBtn.addEventListener("click",logoutOfGame);
// ================= END LOG OUT =================

// ---- SUPABASE MULTIPLAYER V1 ----
const SB_URL="https://wsucaukqrommcshdpdxy.supabase.co";
const SB_KEY="sb_publishable_eksR6ebuyO98BaYm5pVTdg__4exI5Xc";
const myId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
const remotes=new Map();
const mpStatus=document.getElementById("mp-status"),mpCount=document.getElementById("mp-count");
let multiplayerLoggedIn = false;
if(mpStatus) mpStatus.textContent="Login required";
if(mpCount) mpCount.textContent="Players: 0";

function makeNameSprite(name,role="player"){
 const normalizedRole=String(role||"player").toLowerCase();
 const isOwner=normalizedRole==="owner";
 const isMod=normalizedRole==="mod";
 const hasRoleTag=isOwner||isMod;

 const c=document.createElement("canvas");c.width=512;c.height=192;
 const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);
 x.textAlign="center";x.textBaseline="middle";x.lineJoin="round";

 if(hasRoleTag){
   const tag=isOwner?"CREATOR":"MOD";
   x.font="bold 46px Arial";
   x.lineWidth=10;x.strokeStyle="rgba(0,0,0,.9)";
   x.strokeText(tag,256,48);
   x.fillStyle=isOwner?"#2f80ff":"#ff8c24";
   x.fillText(tag,256,48);
 }

 x.font="bold 44px Arial";
 x.lineWidth=9;x.strokeStyle="rgba(0,0,0,.85)";
 const y=hasRoleTag?125:92;
 x.strokeText(String(name||"Player"),256,y);
 x.fillStyle="#ffffff";x.fillText(String(name||"Player"),256,y);

 const tex=new THREE.CanvasTexture(c);
 const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
 const sp=new THREE.Sprite(mat);
 sp.scale.set(4.3,1.6,1);
 sp.position.set(0,1.55,0);
 sp.userData.playerNameplate=true;
 return sp;
}
function remoteModel(username="Player",role="player"){
 const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xf1c98a}),
 blue=new THREE.MeshStandardMaterial({color:0x609bd0}),black=new THREE.MeshBasicMaterial({color:0x050505});
 const b=new THREE.Mesh(new THREE.BoxGeometry(1,1.75,.72),blue);b.position.y=-.88;g.add(b);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.92,.78,.76),skin);head.position.y=.32;g.add(head);
 function p(x,y,w,h,r=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.035),black);m.position.set(x,y,-.398);m.rotation.z=r;g.add(m)}
 p(-.2,.42,.12,.16);p(.2,.42,.12,.16);p(0,.16,.3,.055);p(-.18,.205,.12,.055,-.38);p(.18,.205,.12,.055,.38);
 g.add(makeNameSprite(username,role));
 scene.add(g);return g;
}
let multiplayerStarted=false;
let ch=null;

function startMultiplayer(){
 if(multiplayerStarted || !multiplayerLoggedIn) return;
 if(!window.supabase?.createClient){
   if(mpStatus)mpStatus.textContent="Supabase failed to load";
   return;
 }
 multiplayerStarted=true;
 if(mpStatus)mpStatus.textContent="Connecting...";

 const client=authClient;
 ch=client.channel(multiplayerChannelName(),{config:{broadcast:{self:false},presence:{key:myId}}});
 ch.on("broadcast",{event:"state"},({payload:p})=>{
   if(!p||p.id===myId)return;
   let r=remotes.get(p.id);
   const nextName=p.username||"Player";
   const nextRole=(p.role==="owner"||p.role==="mod")?p.role:"player";
   if(!r){
     r={m:remoteModel(nextName,nextRole),t:new THREE.Vector3(),username:nextName,role:nextRole};
     remotes.set(p.id,r);
   }else if(r.username!==nextName || r.role!==nextRole){
     const oldTag=r.m.children.find(o=>o.userData?.playerNameplate);
     if(oldTag){
       r.m.remove(oldTag);
       oldTag.material?.map?.dispose?.();
       oldTag.material?.dispose?.();
     }
     r.m.add(makeNameSprite(nextName,nextRole));
     r.username=nextName;
     r.role=nextRole;
   }
   r.t.set(p.x,p.y-.47,p.z);r.yaw=p.yaw||0;
 }).on("presence",{event:"sync"},()=>{
   const state=ch.presenceState(),ids=new Set(Object.keys(state));
   for(const [id,r] of remotes)if(!ids.has(id)){scene.remove(r.m);remotes.delete(id)}
   if(mpCount)mpCount.textContent="Players: "+Math.max(1,ids.size);
   syncMenuOnlineCount();
 }).subscribe(async st=>{
   if(mpStatus)mpStatus.textContent=st==="SUBSCRIBED"?"Online":st==="CHANNEL_ERROR"?"Connection error":"Connecting...";
   if(st==="SUBSCRIBED"){
     await ch.track({id:myId,userId:currentAuthUser?.id||null,username:currentUsername,role:currentRole,joined_at:Date.now()});
     syncMenuOnlineCount();
   }
 });
 let lastNet=0;
 function netLoop(t){
   requestAnimationFrame(netLoop);
   if(!localLabel && typeof playerModel!=="undefined" && currentUsername){
     localLabel=makeNameSprite(currentUsername,currentRole);
     playerModel.add(localLabel);
   }
   for(const r of remotes.values()){r.m.position.lerp(r.t,.3);let d=(r.yaw||0)-r.m.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));r.m.rotation.y+=d*.3}
   if(multiplayerLoggedIn&&ch&&typeof started!=="undefined"&&started&&t-lastNet>50){lastNet=t;ch.send({type:"broadcast",event:"state",payload:{id:myId,userId:currentAuthUser?.id||null,username:currentUsername, role:currentRole,x:player.x,y:player.y,z:player.z,yaw:player.yaw}})}
 }
 requestAnimationFrame(netLoop);
}
// Multiplayer intentionally does NOT start here.
// enterGame() starts it only after Supabase confirms an authenticated session.
// ---- END MULTIPLAYER ----


// Updated game credits
(function updateGameCredits(){
  const credits=document.getElementById("credits-modal") ||
                document.getElementById("credits-popup") ||
                document.getElementById("credits-screen");
  if(!credits) return;
  const body=credits.querySelector(".credits-body") ||
             credits.querySelector(".modal-body") ||
             credits.querySelector(".popup-body") || credits;
  const old=body.querySelector("#official-game-credits");
  if(old) old.remove();
  const box=document.createElement("div");
  box.id="official-game-credits";
  box.innerHTML='<p>Game Created By - fundindev</p><p>Game Owned By - fundindev, presence</p><p>Discord Link []</p>';
  body.appendChild(box);
})();


// ---------- ROOM LEADERBOARD ----------
const roomLeaderboard=document.getElementById("room-leaderboard");
const leaderboardNames=document.getElementById("leaderboard-names");
const leaderboardCount=document.getElementById("leaderboard-count");

function getRoomPlayers(){
  const players=[];
  if(ch){
    const state=ch.presenceState();
    for(const entries of Object.values(state)){
      for(const p of entries){
        if(!p) continue;
        players.push({
          id:String(p.id||""),
          username:String(p.username||p.name||p.user_name||"Player")
        });
      }
    }
  }

  // Presence can take a moment to sync, so keep the authenticated local player visible.
  if(multiplayerLoggedIn && !players.some(p=>p.id===myId)){
    players.push({id:myId,username:currentUsername||"Player"});
  }

  const unique=new Map();
  for(const p of players) if(!unique.has(p.id)) unique.set(p.id,p);
  return [...unique.values()].slice(0,PUBLIC_ROOM_LIMIT);
}

function updateRoomLeaderboard(){
  if(!roomLeaderboard||!leaderboardNames||!leaderboardCount) return;
  if(!multiplayerLoggedIn || !ch){
    leaderboardNames.innerHTML="";
    leaderboardCount.textContent="Player 0/12";
    roomLeaderboard.classList.remove("in-room");
    return;
  }

  const players=getRoomPlayers();
  leaderboardNames.innerHTML="";
  for(let i=0;i<PUBLIC_ROOM_LIMIT;i++){
    const row=document.createElement("div");
    row.className="leaderboard-player";
    row.textContent=players[i]?.username || ("Player "+(i+1));
    leaderboardNames.appendChild(row);
  }

  leaderboardCount.textContent="Player "+players.length+"/"+PUBLIC_ROOM_LIMIT;
  roomLeaderboard.classList.add("in-room");
}

function hideRoomLeaderboard(){
  if(roomLeaderboard) roomLeaderboard.classList.remove("in-room");
  if(leaderboardNames) leaderboardNames.innerHTML="";
  if(leaderboardCount) leaderboardCount.textContent="Player 0/12";
}

setInterval(()=>{
  if(multiplayerLoggedIn && ch) window.refreshRoomLeaderboard?.();
},500);


// ===== HARD-FIXED IN-GAME LEADERBOARD =====
(function(){
  const old=document.getElementById("room-leaderboard");
  if(old) old.remove();

  const board=document.createElement("div");
  board.id="room-leaderboard-fixed";
  Object.assign(board.style,{
    display:"none",
    position:"fixed",
    left:"18px",
    top:"145px",
    width:"220px",
    padding:"12px 14px",
    boxSizing:"border-box",
    background:"#165cd2",
    border:"2px solid white",
    borderRadius:"10px",
    color:"white",
    zIndex:"2147483647",
    fontFamily:"Arial, sans-serif",
    fontSize:"14px",
    lineHeight:"1.45",
    pointerEvents:"none",
    boxShadow:"0 8px 24px rgba(0,0,0,.35)"
  });

  const title=document.createElement("div");
  title.textContent="Leader board";
  Object.assign(title.style,{
    color:"white",fontWeight:"900",fontSize:"18px",marginBottom:"8px"
  });

  const names=document.createElement("div");
  const count=document.createElement("div");
  Object.assign(count.style,{
    color:"white",fontWeight:"900",marginTop:"9px",
    paddingTop:"7px",borderTop:"1px solid rgba(255,255,255,.65)"
  });

  board.append(title,names,count);
  document.body.appendChild(board);

  window.forceRoomLeaderboard=function(show){
    board.style.display=show?"block":"none";
    if(show) window.refreshRoomLeaderboard();
  };

  window.refreshRoomLeaderboard=function(){
    let players=[];
    try{
      if(ch){
        const state=ch.presenceState()||{};
        for(const entries of Object.values(state)){
          for(const p of entries||[]){
            if(!p) continue;
            players.push({
              id:String(p.id||""),
              username:String(p.username||p.name||p.user_name||"Player")
            });
          }
        }
      }
    }catch(e){ console.warn("Leaderboard presence:",e); }

    if(typeof multiplayerLoggedIn!=="undefined" && multiplayerLoggedIn){
      if(!players.some(p=>p.id===myId)){
        players.unshift({id:myId,username:currentUsername||"Player 1"});
      }
    }

    const unique=[];
    const seen=new Set();
    for(const p of players){
      const key=p.id||p.username;
      if(!seen.has(key)){seen.add(key);unique.push(p);}
    }
    players=unique.slice(0,12);

    names.innerHTML="";
    for(let i=0;i<12;i++){
      const row=document.createElement("div");
      row.textContent=players[i]?.username || ("Player "+(i+1));
      row.style.color="white";
      names.appendChild(row);
    }
    count.textContent="Player "+players.length+"/12";
  };

  // Keep the count/names synchronized with Presence joins and disconnects.
  setInterval(()=>{
    if(board.style.display!=="none") window.refreshRoomLeaderboard();
  },350);
})();



// ===== QUEUE UI SAFETY BOOTSTRAP =====
function ensureQueueUI(){
  let q=document.getElementById("queue-overlay");
  if(!q){
    q=document.createElement("div");
    q.id="queue-overlay";
    q.innerHTML=`<div class="queue-card"><div class="queue-logo">CAN'T CATCH ME</div><div id="queue-status">WAITING FOR PLAYERS</div><div id="queue-count">0 / 12 PLAYERS</div><div id="queue-timer">Minimum 2 players required</div><div class="queue-note">Players can join until the countdown reaches 0.</div><button id="queue-leave-btn">BACK TO MAIN MENU</button></div>`;
    document.body.appendChild(q);
  }
  let r=document.getElementById("round-loading-overlay");
  if(!r){
    r=document.createElement("div");
    r.id="round-loading-overlay";
    r.innerHTML=`<div class="round-card"><div id="round-loading-title">ROUND LOADING</div><div id="round-loading-text">Selecting the bomb holder...</div></div>`;
    document.body.appendChild(r);
  }
}
ensureQueueUI();

// ===== DATABASE PUBLIC QUEUE =====
const queueOverlay=document.getElementById("queue-overlay"),queueStatus=document.getElementById("queue-status"),
queueCount=document.getElementById("queue-count"),queueTimer=document.getElementById("queue-timer"),
roundLoadingOverlay=document.getElementById("round-loading-overlay");
let dbMatchId=null,dbMatchCode=null,queuePoll=null,queueStarting=false;

async function dbFindOrCreatePublicMatch(){
 const map=String(pendingMap||"original").toLowerCase();
 const {data,error}=await authClient.from("game_matches").select("*").eq("room_type","public").eq("queue_locked",false).in("status",["waiting","countdown"]).eq("map_name",map).order("created_at",{ascending:true}).limit(20);
 if(error)throw error;
 for(const m of data||[]){const r=await authClient.rpc("get_match_player_count",{requested_match:m.id});if(!r.error&&Number(r.data)<12)return m;}
 const r=await authClient.rpc("create_public_match",{requested_map:map});if(r.error)throw r.error;return r.data;
}
async function dbJoinPublicQueue(){
 const m=await dbFindOrCreatePublicMatch();
 const r=await authClient.rpc("join_game_match",{requested_room_code:m.room_code,requested_username:currentUsername||"Player"});
 if(r.error)throw r.error;if(!r.data?.success)throw new Error(r.data?.error||"Join failed");
 dbMatchId=r.data.match_id;dbMatchCode=r.data.room_code;lobbyMode="public";lobbyCode=dbMatchCode;
 await startQueuePresence();
 await startReliableHeartbeat();
 await authClient.rpc("repair_queue_state",{requested_match:dbMatchId});
 startMatchHeartbeat();
 if(roomCodeText)roomCodeText.textContent=dbMatchCode;if(roomTypeLabel)roomTypeLabel.textContent="PUBLIC ROOM CODE";
 queueOverlay && (queueOverlay.style.display="flex");await dbRefreshQueue();queuePoll=setInterval(dbRefreshQueue,500);
}
async function dbRefreshQueue(){
 if(!dbMatchId)return;
 reliableHeartbeat();
 // Repairs expired/cancelled countdowns after players leave/rejoin.
 authClient.rpc("repair_queue_state",{requested_match:dbMatchId})
   .then(({error})=>{if(error)console.warn("Queue repair:",error);});
 const mr=await authClient.from("game_matches").select("*").eq("id",dbMatchId).single();
 const pr=await authClient.from("match_players").select("*").eq("match_id",dbMatchId).order("joined_at");
 if(mr.error||pr.error)return;let m=mr.data,players=pr.data||[];
 await presenceQueueRefresh();
 const n=queuePresenceChannel ? queuePresenceCount : players.length;
 queueCount.textContent=n+" / 12 PLAYERS";

 // Presence is authoritative for queue occupancy.
 // Never display an expired/stale countdown when fewer than the minimum are connected.
 const minimum=Number(m.min_players||2);
 if(queuePresenceChannel && n < minimum){
   queueStatus.textContent="WAITING FOR PLAYERS";
   queueTimer.textContent="Minimum "+minimum+" players required";

   // Wait for the DB repair before continuing so stale `countdown` state
   // cannot overwrite the waiting UI later in this same refresh.
   const reset=await authClient.rpc("force_queue_state_from_presence",{
     requested_match:dbMatchId,
     connected_players:n
   });
   if(reset.error) console.warn("Presence reset:",reset.error);

   // Refresh authoritative match state after repair.
   const fresh=await authClient.from("game_matches").select("*").eq("id",dbMatchId).single();
   if(!fresh.error) m=fresh.data;
 }
 else if(queuePresenceChannel && n >= minimum && m.status==="waiting"){
   const start=await authClient.rpc("force_queue_state_from_presence",{
     requested_match:dbMatchId,
     connected_players:n
   });
   if(start.error) console.warn("Presence countdown start:",start.error);
   const fresh=await authClient.from("game_matches").select("*").eq("id",dbMatchId).single();
   if(!fresh.error) m=fresh.data;
 }
 if(m.status==="waiting"){
  queueStatus.textContent="WAITING FOR PLAYERS";
  queueTimer.textContent="Minimum "+(m.min_players||2)+" players required";
  if(n>=Number(m.min_players||2)) ensureQueueCountdownStarted(m,n);
}
 if(m.status==="countdown" && n>=Number(m.min_players||2)){const left=Math.max(0,Math.ceil((new Date(m.queue_locks_at)-Date.now())/1000));queueStatus.textContent="MATCH STARTING";queueTimer.textContent=left+" SECONDS";if(left<=0){
  queueTimer.textContent="STARTING...";
  authClient.rpc("advance_queue_presence_at_zero",{requested_match:dbMatchId,connected_players:queuePresenceCount})
    .then(({error})=>{if(error)console.warn("Queue advance:",error);});
}}
 if(m.status==="loading"&&!queueStarting){queueStarting=true;clearInterval(queuePoll);queuePoll=null;queueOverlay && (queueOverlay.style.display="none");roundLoadingOverlay && (roundLoadingOverlay.style.display="flex");startRoundStartWatchdog();document.getElementById("round-loading-text").textContent="Queue locked — selecting the player who starts with the bomb...";setTimeout(async()=>{
  try{
    const {data,error}=await authClient.rpc("start_bomb_round_safe",{requested_match:dbMatchId});
    if(error) throw error;
    console.log("Round start:",data);
  }catch(e){
    console.error("Round start failed:",e);
    const msg=document.getElementById("round-loading-text");
    if(msg)msg.textContent="Starting round...";
  }
},700);}
 if(m.status==="active"){
 queueOverlay && (queueOverlay.style.display="none");
 if(queuePoll){clearInterval(queuePoll);queuePoll=null;}
 roomCodeDisplay.style.display="block";
 window.forceRoomLeaderboard?.(true);
 if(startScreen)startScreen.style.display="none";
 await beginBombGameplay();
}
}
async function dbLeaveQueue(){
 if(typeof stopQueuePresence==="function") await stopQueuePresence();
 if(typeof stopReliableHeartbeat==="function") stopReliableHeartbeat();
 stopMatchHeartbeat();
 if(typeof bombLoop!=="undefined"&&bombLoop){clearInterval(bombLoop);bombLoop=null;}
 if(typeof bombHud!=="undefined"&&bombHud)bombHud.style.display="none";
 if(typeof bombResultScreen!=="undefined"&&bombResultScreen)bombResultScreen.style.display="none";if(queuePoll){clearInterval(queuePoll);queuePoll=null;}if(dbMatchId)try{await authClient.rpc("leave_game_match",{requested_match:dbMatchId});}catch(_){}dbMatchId=null;dbMatchCode=null;queueStarting=false;queueOverlay && (queueOverlay.style.display="none");roundLoadingOverlay && (roundLoadingOverlay.style.display="none");}
document.getElementById("queue-leave-btn")?.addEventListener("click",async()=>{await dbLeaveQueue();await showMainMenu();});

(function(){
 const old=document.getElementById("join-public");if(!old)return;const btn=old.cloneNode(true);old.replaceWith(btn);
 btn.addEventListener("click",async()=>{const t=btn.textContent;btn.disabled=true;btn.textContent="JOINING QUEUE...";try{lobbyChoiceScreen && (lobbyChoiceScreen.style.display="none");await stopCurrentLobbyChannel();multiplayerLoggedIn=true;await dbJoinPublicQueue();}catch(e){console.error(e);lobbyChoiceScreen && (lobbyChoiceScreen.style.display="flex");alert("Could not join public queue: "+(e.message||e));}finally{btn.disabled=false;btn.textContent=t;}});
})();


// ===== BOMB / TAG / ELIMINATION GAMEPLAY V1 =====
const bombHud=document.getElementById("bomb-hud"),bombOwnerText=document.getElementById("bomb-owner-text"),
bombTimeText=document.getElementById("bomb-time-text"),bombResultScreen=document.getElementById("bomb-result-screen"),
bombResultTitle=document.getElementById("bomb-result-title"),bombResultSub=document.getElementById("bomb-result-sub");
let bombLoop=null,bombDetonationRequested=false,lastBombHolder=null,headStartUntil=0,roundSeen=0;

async function fetchMatchState(){
 if(!dbMatchId)return null;
 const r=await authClient.from("game_matches").select("*").eq("id",dbMatchId).single();
 return r.error?null:r.data;
}
async function fetchMatchPlayers(){
 if(!dbMatchId)return [];
 const r=await authClient.from("match_players").select("*").eq("match_id",dbMatchId).order("joined_at");
 return r.data||[];
}
async function beginBombGameplay(){
 if(bombLoop)clearInterval(bombLoop);
 bombDetonationRequested=false;
 bombHud.style.display="block";
 bombLoop=setInterval(syncBombGameplay,100);
 await syncBombGameplay();
}
async function syncBombGameplay(){
 const m=await fetchMatchState();if(!m)return;
 const players=await fetchMatchPlayers();
 const {data:{session}}=await authClient.auth.getSession();
 const localUserId=session?.user?.id||null;
 const holder=players.find(p=>p.user_id===m.bomb_holder);
 bombOwnerText.textContent="BOMB: "+(holder?.username||"Selecting...");

 if(m.round_number!==roundSeen){
   roundSeen=m.round_number;
   lastBombHolder=m.bomb_holder;
   // start_bomb_round SQL schedules explosion 35 seconds away:
   // first 5 seconds are the runners' head start.
   headStartUntil=Date.now()+5000;
   roundLoadingOverlay.style.display="flex";
   const meHas=m.bomb_holder===localUserId;
   document.getElementById("round-loading-title").textContent="ROUND "+m.round_number;
   document.getElementById("round-loading-text").textContent=meHas
      ?"YOU START WITH THE BOMB — WAIT 5 SECONDS!"
      :((holder?.username||"A PLAYER")+" STARTS WITH THE BOMB — RUN!");
   setTimeout(()=>roundLoadingOverlay.style.display="none",1800);
 }

 if(m.status==="active"&&m.bomb_explodes_at){
   const left=Math.max(0,(new Date(m.bomb_explodes_at).getTime()-Date.now())/1000);
   bombTimeText.textContent=left.toFixed(1);
   if(left<=0.05&&!bombDetonationRequested){
     bombDetonationRequested=true;
     const r=await authClient.rpc("detonate_bomb",{requested_match:dbMatchId});
     setTimeout(()=>{bombDetonationRequested=false;syncBombGameplay();},400);
   }
   // Attempt tag only if this client is the authoritative current holder.
   const myUid=localUserId;
   if(myUid&&m.bomb_holder===myUid&&Date.now()>=headStartUntil) attemptBombTag(players);
 } else if(m.status==="between_rounds"){
   bombHud.style.display="none";
   const me=players.find(p=>p.user_id===localUserId);
   if(me?.eliminated){showBombResult(false);}
   else if(!queueStarting){
     queueStarting=true;
     roundLoadingOverlay.style.display="flex";
     document.getElementById("round-loading-title").textContent="NEXT ROUND";
     document.getElementById("round-loading-text").textContent="Selecting a new bomb holder...";
     setTimeout(async()=>{await authClient.rpc("start_bomb_round_safe",{requested_match:dbMatchId});queueStarting=false;},1800);
   }
 } else if(m.status==="finished"){
   bombHud.style.display="none";
   showBombResult(m.winner_id===localUserId);
 }
}

let tagCooldownUntil=0;
async function attemptBombTag(players){
 if(Date.now()<tagCooldownUntil)return;
 // Remote models already contain the networked positions. Tag radius ~1.65m.
 for(const [id,r] of remotes){
   const target=players.find(p=>p.user_id===id || p.username===r.username);
   if(!target||target.eliminated||target.user_id===authUser?.id||!r.m)continue;
   const dx=player.x-r.m.position.x,dz=player.z-r.m.position.z;
   if(Math.hypot(dx,dz)<=1.65){
     tagCooldownUntil=Date.now()+1200;
     const res=await authClient.rpc("tag_player",{requested_match:dbMatchId,tagged_player:target.user_id});
     if(res.error)console.warn("Tag rejected",res.error);
     return;
   }
 }
}

function showBombResult(won){
 if(bombLoop){clearInterval(bombLoop);bombLoop=null;}
 bombResultScreen.style.display="flex";
 bombResultTitle.textContent=won?"YOU WON!":"YOU HAVE BEEN BLOWN UP!";
 bombResultSub.textContent=won?"You are the last player remaining.":"You were eliminated from this match.";
}
document.getElementById("bomb-return-btn")?.addEventListener("click",async()=>{
 bombResultScreen.style.display="none";
 bombHud.style.display="none";
 await dbLeaveQueue();
 await showMainMenu();
});


async function ensureQueueCountdownStarted(match, playerCount){
  if(!match || match.status!=="waiting") return;
  const min=Number(match.min_players||2);
  if(playerCount < min) return;

  // Atomically transition waiting -> countdown. RLS blocks direct update,
  // so use the dedicated RPC installed by START-QUEUE-COUNTDOWN-FIX.sql.
  const r=await authClient.rpc("start_queue_countdown_if_ready",{requested_match:dbMatchId});
  if(r.error) console.warn("Countdown start RPC:",r.error);
}


// ===== SUPABASE QUEUE DISCONNECT / HEARTBEAT =====
let matchHeartbeatTimer=null;
let disconnectCleanupTimer=null;

async function sendMatchHeartbeat(){
  if(!dbMatchId || false) return;
  try{
    await authClient.rpc("heartbeat_game_match",{requested_match:dbMatchId});
  }catch(e){ console.warn("Match heartbeat:",e); }
}

function startMatchHeartbeat(){
  stopMatchHeartbeat();
  sendMatchHeartbeat();
  matchHeartbeatTimer=setInterval(sendMatchHeartbeat,5000);

  // Any connected player may request stale-player cleanup.
  disconnectCleanupTimer=setInterval(async()=>{
    if(!dbMatchId)return;
    try{
      await authClient.rpc("cleanup_disconnected_match_players",{requested_match:dbMatchId});
    }catch(e){ console.warn("Disconnect cleanup:",e); }
  },5000);
}

function stopMatchHeartbeat(){
  if(matchHeartbeatTimer){clearInterval(matchHeartbeatTimer);matchHeartbeatTimer=null;}
  if(disconnectCleanupTimer){clearInterval(disconnectCleanupTimer);disconnectCleanupTimer=null;}
}

async function leaveDatabaseMatchNow(){
  stopMatchHeartbeat();
  if(!dbMatchId)return;
  try{
    await authClient.rpc("leave_game_match",{requested_match:dbMatchId});
  }catch(e){console.warn("Leave match:",e);}
}

// Best-effort normal browser exits. The heartbeat cleanup is the reliable fallback
// when a Chromebook/tab closes before this request completes.
window.addEventListener("pagehide",()=>{ leaveDatabaseMatchNow(); });
window.addEventListener("beforeunload",()=>{ leaveDatabaseMatchNow(); });


// ===== RELIABLE SUPABASE MATCH HEARTBEAT V2 =====
let reliableHeartbeatTimer=null;
let reliableCleanupTimer=null;

async function reliableHeartbeat(){
  if(!dbMatchId || false) return false;
  const {data,error}=await authClient.rpc("heartbeat_game_match",{requested_match:dbMatchId});
  if(error){console.warn("Heartbeat failed:",error);return false;}
  return data===true;
}

async function startReliableHeartbeat(){
  stopReliableHeartbeat();
  // Do not wait for the first interval tick.
  await reliableHeartbeat();
  reliableHeartbeatTimer=setInterval(reliableHeartbeat,3000);
  reliableCleanupTimer=setInterval(async()=>{
    if(!dbMatchId)return;
    const {error}=await authClient.rpc("cleanup_disconnected_match_players",{requested_match:dbMatchId});
    if(error)console.warn("Cleanup failed:",error);
  },5000);
}

function stopReliableHeartbeat(){
  if(reliableHeartbeatTimer){clearInterval(reliableHeartbeatTimer);reliableHeartbeatTimer=null;}
  if(reliableCleanupTimer){clearInterval(reliableCleanupTimer);reliableCleanupTimer=null;}
}


// ===== SUPABASE REALTIME PRESENCE QUEUE V1 =====
// Presence is the source of truth for who is actually connected to the queue.
let queuePresenceChannel=null;
let queuePresenceCount=0;
let queuePresenceUsers=[];

function flattenQueuePresence(state){
  const rows=[];
  for(const key of Object.keys(state||{})){
    for(const p of (state[key]||[])){
      if(p && p.user_id) rows.push(p);
    }
  }
  const unique=new Map();
  for(const p of rows) unique.set(p.user_id,p);
  return [...unique.values()];
}

async function stopQueuePresence(){
  if(!queuePresenceChannel)return;
  try{await queuePresenceChannel.untrack();}catch(_){}
  try{await authClient.removeChannel(queuePresenceChannel);}catch(_){}
  queuePresenceChannel=null;
  queuePresenceCount=0;
  queuePresenceUsers=[];
}

async function startQueuePresence(){
  await stopQueuePresence();
  if(!dbMatchId)return;

  const sessionResult=await authClient.auth.getSession();
  const queueUser=sessionResult?.data?.session?.user;
  if(!queueUser?.id) throw new Error("No logged-in Supabase session found");

  queuePresenceChannel=authClient.channel("queue-presence:"+dbMatchId,{
    config:{presence:{key:queueUser.id}}
  });

  queuePresenceChannel.on("presence",{event:"sync"},async()=>{
    if(!queuePresenceChannel)return;
    queuePresenceUsers=flattenQueuePresence(queuePresenceChannel.presenceState());
    queuePresenceCount=queuePresenceUsers.length;

    const ids=queuePresenceUsers.map(x=>x.user_id);
    const {error}=await authClient.rpc("sync_queue_from_presence",{
      requested_match:dbMatchId,
      active_user_ids:ids
    });
    if(error)console.warn("Presence queue sync:",error);

    const r=await authClient.rpc("update_queue_from_presence",{
      requested_match:dbMatchId,
      connected_players:queuePresenceCount
    });
    if(r.error)console.warn("Presence queue state:",r.error);
  });

  await new Promise((resolve,reject)=>{
    let settled=false;
    queuePresenceChannel.subscribe(async status=>{
      if(status==="SUBSCRIBED"&&!settled){
        settled=true;
        const {error}=await queuePresenceChannel.track({
          user_id:queueUser.id,
          username:currentUsername||"Player",
          online_at:new Date().toISOString()
        });
        if(error)reject(error); else resolve();
      } else if((status==="CHANNEL_ERROR"||status==="TIMED_OUT")&&!settled){
        settled=true;
        reject(new Error("Queue Presence connection failed"));
      }
    });
  });
}

async function presenceQueueRefresh(){
  if(!dbMatchId)return;
  if(queuePresenceChannel){
    queuePresenceUsers=flattenQueuePresence(queuePresenceChannel.presenceState());
    queuePresenceCount=queuePresenceUsers.length;
  }
}


async function getLoggedInUserId(){
  const {data:{session}}=await authClient.auth.getSession();
  return session?.user?.id||null;
}


let roundStartWatchdog=null;
function startRoundStartWatchdog(){
  if(roundStartWatchdog)clearInterval(roundStartWatchdog);
  roundStartWatchdog=setInterval(async()=>{
    if(!dbMatchId)return;
    const {data:m}=await authClient.from("game_matches")
      .select("status").eq("id",dbMatchId).single();
    if(m?.status==="loading"){
      const {error}=await authClient.rpc("start_bomb_round_safe",{requested_match:dbMatchId});
      if(error)console.warn("Round-start watchdog:",error);
    }else if(m?.status==="active"||m?.status==="finished"){
      clearInterval(roundStartWatchdog);roundStartWatchdog=null;
    }
  },1000);
}

// ===== AUTHORITATIVE ACTIVE MATCH WATCHER =====
let activeMatchWatcher=null, activeRoundEntered=-1;
async function watchActiveMatch(){
  if(!dbMatchId)return;
  const {data:m,error}=await authClient.from("game_matches")
    .select("status,round_number,bomb_holder,bomb_explodes_at")
    .eq("id",dbMatchId).single();
  if(error)return console.warn("Active watcher:",error);
  if(m.status==="active" && m.bomb_holder){
    // Enter actual playable state. Movement/jump are gated by `started`.
    started=true;
    settingsOpen=false;
    keys.clear();
    if(settingsEl)settingsEl.style.display="none";
    if(typeof paused!=="undefined")paused=false;

    if(queueOverlay)queueOverlay.style.display="none";
    if(roundLoadingOverlay)roundLoadingOverlay.style.display="none";
    ["queue-overlay","round-loading-overlay","loading-screen"].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display="none";
    });
    if(startScreen)startScreen.style.display="none";
    if(activeRoundEntered!==Number(m.round_number)){
      activeRoundEntered=Number(m.round_number);
      try{
        await beginBombGameplay();
        // Browsers require a user gesture for pointer lock, so movement works
        // immediately and a canvas click restores mouse-look.
        const clickHint=document.getElementById("game-control-hint")||document.createElement("div");
        clickHint.id="game-control-hint";
        clickHint.textContent="WASD TO MOVE • CLICK GAME FOR MOUSE LOOK";
        clickHint.style.cssText="position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9000;color:white;background:rgba(0,0,0,.55);padding:9px 14px;border-radius:8px;font:700 13px Arial;pointer-events:none";
        if(!clickHint.parentNode)document.body.appendChild(clickHint);
        setTimeout(()=>clickHint.remove(),4500);
      }catch(e){console.error("Bomb gameplay start:",e);}
    }
  }
}
activeMatchWatcher=setInterval(watchActiveMatch,500);
watchActiveMatch();
