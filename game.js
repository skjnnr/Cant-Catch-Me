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

scene.add(new THREE.HemisphereLight(0xffffff, 0x405040, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(50, 90, 40);
sun.castShadow = true;
scene.add(sun);

const M = {
  grass: new THREE.MeshStandardMaterial({color:0x54d968}),
  road: new THREE.MeshStandardMaterial({color:0x667887}),
  sidewalk: new THREE.MeshStandardMaterial({color:0xa1a5a7}),
  wall: new THREE.MeshStandardMaterial({color:0x7f8d91}),
  dark: new THREE.MeshStandardMaterial({color:0x344143}),
  wood: new THREE.MeshStandardMaterial({color:0x936a37}),
  trunk: new THREE.MeshStandardMaterial({color:0x684329}),
  leaves: new THREE.MeshStandardMaterial({color:0x3d7650})
};

const colliders = [];

function addCollider(x,z,w,d) {
  colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
}

function box(x,y,z,w,h,d,mat,solid=false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if(solid) addCollider(x,z,w,d);
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

  addCollider(x,z,1.6*s,1.6*s);
}

[
 [-92,-92,1.2],[-65,-92,1],[-35,-92,1.3],[35,-92,1],[65,-92,1.2],[92,-92,1.1],
 [-92,92,1.1],[-65,92,1.3],[-35,92,1],[35,92,1.2],[65,92,1],[92,92,1.3],
 [-94,-45,1],[-94,0,1.2],[-94,45,1],[94,-45,1.2],[94,0,1],[94,45,1.3]
].forEach(v=>tree(v[0],v[1],v[2]));

// Outer collision walls
box(0,3,-109,218,6,1,M.dark,true);
box(0,3,109,218,6,1,M.dark,true);
box(-109,3,0,1,6,218,M.dark,true);
box(109,3,0,1,6,218,M.dark,true);

// Player
const player = {
  x: 0,
  y: 1.7,
  z: 72,
  yaw: 0,
  pitch: 0,
  radius: .48
};

camera.position.set(player.x,player.y,player.z);

// KEY FIX:
// Use BOTH KeyboardEvent.code and KeyboardEvent.key.
// Movement does NOT require pointer lock.
const keys = new Set();

function down(e) {
  keys.add(e.code);
  keys.add((e.key || "").toLowerCase());
  if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
    e.preventDefault();
}
function up(e) {
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
  for(const c of colliders) {
    if(
      x+player.radius>c.minX &&
      x-player.radius<c.maxX &&
      z+player.radius>c.minZ &&
      z-player.radius<c.maxZ
    ) return true;
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
    if(startScreen) startScreen.style.display="none";
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
  if(e.code==="Escape" && started) setSettings(!settingsOpen);
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
  camera.position.set(player.x,player.y,player.z);
  camera.rotation.y=player.yaw;
  camera.rotation.x=player.pitch;
}

let last=performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05);
  last=now;

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
