// CAN'T CATCH ME - movement repair
// This version uses a dedicated keyboard state and a simple player position.
// WASD works whether or not pointer lock succeeds.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 55, 220);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, .1, 1200);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfe8ff,0x405533,.9));
const sun=new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(40,70,25);
sun.castShadow=true;
scene.add(sun);

// ---------- MAP ----------
const colliders=[];

function collider(x,z,w,d){
  colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
}

function box(x,y,z,w,h,d,mat,solid=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);
  m.castShadow=true;m.receiveShadow=true;
  scene.add(m);
  if(solid) collider(x,z,w,d);
  return m;
}

const grass=new THREE.MeshStandardMaterial({color:0x3e873f});
const road=new THREE.MeshStandardMaterial({color:0x41464b});
const wall=new THREE.MeshStandardMaterial({color:0x777b80});
const dark=new THREE.MeshStandardMaterial({color:0x4e5359});
const wood=new THREE.MeshStandardMaterial({color:0x8b552d});
const crateMat=new THREE.MeshStandardMaterial({color:0x9b6938});
const trunkMat=new THREE.MeshStandardMaterial({color:0x684225});
const leavesMat=new THREE.MeshStandardMaterial({color:0x174c25});

const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),grass);
ground.rotation.x=-Math.PI/2;
ground.receiveShadow=true;
scene.add(ground);

box(0,.02,0,18,.04,220,road,false);
box(0,.03,0,220,.04,18,road,false);

box(0,3,-109,220,6,2,dark);
box(0,3,109,220,6,2,dark);
box(-109,3,0,2,6,220,dark);
box(109,3,0,2,6,220,dark);

// Enterable buildings: four walls with a doorway gap in the front.
function building(x,z,w,d,h){
  const t=1;
  const door=5;

  box(x,h/2,z-d/2+t/2,w,h,t,wall);
  box(x-w/2+t/2,h/2,z,t,h,d,wall);
  box(x+w/2-t/2,h/2,z,t,h,d,wall);

  const side=(w-door)/2;
  const front=z+d/2-t/2;
  box(x-w/2+side/2,h/2,front,side,h,t,wall);
  box(x+w/2-side/2,h/2,front,side,h,t,wall);

  box(x,h+.3,z,w+.5,.6,d+.5,dark,false);

  // Interior hiding objects.
  box(x-3,1,z-2,3,2,1.5,wood);
  box(x+3,1,z+2,2,2,2,crateMat);
}

building(-48,-48,30,25,7);
building(48,-48,32,27,8);
building(-48,48,28,30,7);
building(48,48,34,26,8);
building(-82,-38,24,28,6);
building(82,38,25,30,7);

// Crates
function crates(x,z){
  for(let i=0;i<4;i++){
    const ox=(i%2)*2.5-1.25;
    const oz=Math.floor(i/2)*2.5-1.25;
    box(x+ox,1,z+oz,2.2,2,2.2,crateMat);
  }
}
[[-25,-35],[25,-35],[-25,35],[25,35],[-75,-75],[75,75],[-75,70],[75,-70]].forEach(p=>crates(...p));

// Trees
function tree(x,z,s=1){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.7*s,.7*s,4*s,14),trunkMat);
  trunk.position.set(x,2*s,z);
  trunk.castShadow=true;
  scene.add(trunk);

  const leaves=new THREE.Mesh(new THREE.SphereGeometry(2.7*s,16,12),leavesMat);
  leaves.position.set(x,5*s,z);
  leaves.castShadow=true;
  scene.add(leaves);

  // Tree collision is larger than just the trunk.
  collider(x,z,3.1*s,3.1*s);
}

[
[-95,-90,1.4],[-70,-92,1.1],[-40,-92,1.3],[40,-92,1.2],[70,-92,1.1],[95,-90,1.3],
[-95,90,1.3],[-70,92,1.1],[-40,92,1.4],[40,92,1.2],[70,92,1.1],[95,90,1.4],
[-95,-55,1.1],[-95,-20,1.3],[-95,25,1.2],[-95,60,1.4],
[95,-55,1.2],[95,-20,1.1],[95,25,1.4],[95,60,1.2]
].forEach(v=>tree(...v));

// ---------- PLAYER ----------
const player={
  x:0,
  y:1.7,
  z:70,
  yaw:0,
  pitch:0,
  radius:.45
};

let started=false;
let paused=false;
let sensitivity=2.2;

// IMPORTANT: use a Set rather than an object.
// Also listen on window so the game receives keys even when canvas isn't focused.
const pressed=new Set();

window.addEventListener("keydown",e=>{
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","Space"].includes(e.code)){
    e.preventDefault();
    pressed.add(e.code);
  }

  if(e.code==="Escape"){
    e.preventDefault();
    if(started) toggleSettings();
  }
});

window.addEventListener("keyup",e=>{
  pressed.delete(e.code);
});

window.addEventListener("blur",()=>{
  pressed.clear();
});

// ---------- SETTINGS ----------
const settings=document.getElementById("settings");
const slider=document.getElementById("sensitivity");
const sensitivityValue=document.getElementById("sensitivity-value");

slider.addEventListener("input",()=>{
  sensitivity=Number(slider.value);
  sensitivityValue.textContent=sensitivity.toFixed(1);
});

function toggleSettings(){
  paused=!paused;
  settings.style.display=paused?"flex":"none";
  pressed.clear();

  if(paused){
    document.exitPointerLock?.();
  }
}

document.getElementById("resume-button").onclick=toggleSettings;
document.getElementById("close-settings").onclick=toggleSettings;

// ---------- MOUSE ----------
document.addEventListener("mousemove",e=>{
  if(!started || paused) return;
  if(document.pointerLockElement!==document.body) return;

  const amount=.001*sensitivity;
  player.yaw-=e.movementX*amount;
  player.pitch-=e.movementY*amount;

  player.pitch=THREE.MathUtils.clamp(
    player.pitch,
    -Math.PI/2+.05,
    Math.PI/2-.05
  );
});

// ---------- COLLISION ----------
function blocked(x,z){
  for(const c of colliders){
    if(
      x+player.radius>c.minX &&
      x-player.radius<c.maxX &&
      z+player.radius>c.minZ &&
      z-player.radius<c.maxZ
    ) return true;
  }
  return false;
}

function move(dx,dz){
  const nx=player.x+dx;
  if(!blocked(nx,player.z)) player.x=nx;

  const nz=player.z+dz;
  if(!blocked(player.x,nz)) player.z=nz;

  player.x=THREE.MathUtils.clamp(player.x,-108,108);
  player.z=THREE.MathUtils.clamp(player.z,-108,108);
}

// ---------- MOVEMENT ----------
const status=document.getElementById("status");

function updateMovement(dt){
  if(!started || paused) return;

  let forward=0;
  let side=0;

  if(pressed.has("KeyW")) forward+=1;
  if(pressed.has("KeyS")) forward-=1;
  if(pressed.has("KeyD")) side+=1;
  if(pressed.has("KeyA")) side-=1;

  if(forward===0 && side===0){
    status.textContent="WASD: READY";
    return;
  }

  status.textContent="WASD: MOVING";

  const length=Math.hypot(forward,side);
  forward/=length;
  side/=length;

  const speed=(pressed.has("ShiftLeft")||pressed.has("ShiftRight"))?11:6;

  const fx=-Math.sin(player.yaw);
  const fz=-Math.cos(player.yaw);
  const rx=Math.cos(player.yaw);
  const rz=-Math.sin(player.yaw);

  move(
    (fx*forward+rx*side)*speed*dt,
    (fz*forward+rz*side)*speed*dt
  );
}

// ---------- CAMERA ----------
function updateCamera(){
  camera.position.set(player.x,player.y,player.z);

  const d=10;
  camera.lookAt(
    player.x-Math.sin(player.yaw)*Math.cos(player.pitch)*d,
    player.y+Math.sin(player.pitch)*d,
    player.z-Math.cos(player.yaw)*Math.cos(player.pitch)*d
  );
}

// ---------- PLAY / POINTER LOCK ----------
document.getElementById("start-button").addEventListener("click",()=>{
  started=true;
  document.getElementById("start-screen").style.display="none";
  renderer.domElement.focus();
  document.body.requestPointerLock?.();
});

renderer.domElement.addEventListener("click",()=>{
  if(started && !paused) document.body.requestPointerLock?.();
});

// ---------- LOOP ----------
let last=performance.now();

function loop(now){
  requestAnimationFrame(loop);

  const dt=Math.min((now-last)/1000,.05);
  last=now;

  updateMovement(dt);
  updateCamera();
  renderer.render(scene,camera);
}

requestAnimationFrame(loop);

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
