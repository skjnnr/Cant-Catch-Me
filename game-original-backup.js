// CAN'T CATCH ME — Stage 3
// Bigger map, enterable buildings, object/tree colliders,
// and an ESC settings menu with adjustable mouse sensitivity.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 55, 220);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1200
);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;
document.body.appendChild(renderer.domElement);

// ---------- LIGHTING ----------
const sun = new THREE.DirectionalLight(0xffffff,1.25);
sun.position.set(45,70,25);
sun.castShadow=true;
sun.shadow.mapSize.width=2048;
sun.shadow.mapSize.height=2048;
sun.shadow.camera.left=-120;
sun.shadow.camera.right=120;
sun.shadow.camera.top=120;
sun.shadow.camera.bottom=-120;
scene.add(sun);

scene.add(new THREE.HemisphereLight(0xbfe8ff,0x405533,.75));

// ---------- MATERIALS ----------
const grass = new THREE.MeshStandardMaterial({color:0x3e873f});
const road = new THREE.MeshStandardMaterial({color:0x41464b});
const sidewalk = new THREE.MeshStandardMaterial({color:0x92969a});
const wall = new THREE.MeshStandardMaterial({color:0x777b80});
const wall2 = new THREE.MeshStandardMaterial({color:0x5d6268});
const roof = new THREE.MeshStandardMaterial({color:0x363a40});
const wood = new THREE.MeshStandardMaterial({color:0x8b552d});
const woodDark = new THREE.MeshStandardMaterial({color:0x633b22});
const crateMat = new THREE.MeshStandardMaterial({color:0x9b6938});
const trunkMat = new THREE.MeshStandardMaterial({color:0x684225});
const leavesMat = new THREE.MeshStandardMaterial({color:0x174c25});
const metal = new THREE.MeshStandardMaterial({color:0x62676c,metalness:.5,roughness:.45});
const yellow = new THREE.MeshStandardMaterial({color:0xb59632});
const glass = new THREE.MeshStandardMaterial({color:0x3e7180,transparent:true,opacity:.55});

// ---------- COLLIDERS ----------
const colliders=[];

function addCollider(x,z,w,d){
  colliders.push({
    minX:x-w/2,
    maxX:x+w/2,
    minZ:z-d/2,
    maxZ:z+d/2
  });
}

function box(x,y,z,w,h,d,mat,collision=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);
  m.castShadow=true;
  m.receiveShadow=true;
  scene.add(m);
  if(collision) addCollider(x,z,w,d);
  return m;
}

function cylinder(x,y,z,r,h,mat,collision=true){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat);
  m.position.set(x,y,z);
  m.castShadow=true;
  m.receiveShadow=true;
  scene.add(m);
  if(collision) addCollider(x,z,r*2,r*2);
  return m;
}

// ---------- MAP ----------
const MAP=220;

const ground=new THREE.Mesh(
  new THREE.PlaneGeometry(MAP,MAP),
  grass
);
ground.rotation.x=-Math.PI/2;
ground.receiveShadow=true;
scene.add(ground);

// Main roads
box(0,.02,0,18,.04,MAP,road,false);
box(0,.025,0,MAP,.04,18,road,false);

// Side roads
box(-70,.03,0,12,.05,MAP,road,false);
box(70,.03,0,12,.05,MAP,road,false);
box(0,.035,-70,MAP,.05,12,road,false);
box(0,.035,70,MAP,.05,12,road,false);

// sidewalks around main roads
box(-15,.05,0,4,.08,MAP,sidewalk,false);
box(15,.05,0,4,.08,MAP,sidewalk,false);
box(0,.055,-15,MAP,.08,4,sidewalk,false);
box(0,.055,15,MAP,.08,4,sidewalk,false);

// boundary walls
const B=108;
box(0,3,-B,216,6,2,wall2,true);
box(0,3,B,216,6,2,wall2,true);
box(-B,3,0,2,6,216,wall2,true);
box(B,3,0,2,6,216,wall2,true);

// ---------- ENTERABLE BUILDINGS ----------
// Buildings are made from wall segments around an open interior.
// The player can walk through the doorway into the room.

function building(x,z,w,d,h=7,doorSide="south"){
  const t=.8;
  const doorW=4.5;

  // Floor
  box(x,.08,z,w-.4,.12,d-.4,wall2,false);

  // Back wall
  box(x,h/2,z-d/2+t/2,w,h,t,wall);
  // Left and right walls
  box(x-w/2+t/2,h/2,z,t,h,d,wall);
  box(x+w/2-t/2,h/2,z,t,h,d,wall);

  // Front wall split around doorway.
  const frontZ=z+d/2-t/2;
  if(doorSide==="south"){
    const sideW=(w-doorW)/2;
    box(x-w/2+sideW/2,h/2,frontZ,sideW,h,t,wall);
    box(x+w/2-sideW/2,h/2,frontZ,sideW,h,t,wall);
  }else{
    box(x,h/2,frontZ,w,h,t,wall);
  }

  // Roof
  box(x,h+.35,z,w+.5,.7,d+.5,roof,false);

  // doorway sign
  if(doorSide==="south"){
    box(x,h-.8,frontZ-.1,doorW+.4,.25,.15,yellow,false);
  }

  // A few interior objects
  box(x-3,1,z-1.5,3.5,2,1.2,wood);
  box(x+3,1,z+2,2,2,2,crateMat);
}

// Place buildings in districts, leaving roads open.
building(-48,-48,30,25,7,"south");
building(48,-48,32,27,8,"south");
building(-48,48,28,30,7,"south");
building(48,48,34,26,8,"south");

building(-82,-38,24,28,6.5,"south");
building(82,38,25,30,7,"south");

// ---------- MORE OBJECTS ----------
function crates(x,z,count=4){
  for(let i=0;i<count;i++){
    const ox=(i%2)*2.4-1.2;
    const oz=Math.floor(i/2)*2.4-1.2;
    box(x+ox,1,z+oz,2.2,2,2.2,crateMat);
  }
}

[
[-28,-35],[-8,-42],[27,-35],[75,-25],
[-30,31],[30,35],[-78,25],[78,-65],
[-80,-75],[80,75]
].forEach(p=>crates(p[0],p[1],4));

// fences
function fence(x,z,w,d){
  const posts=Math.max(2,Math.floor(Math.max(w,d)/5));
  for(let i=0;i<posts;i++){
    const t=posts===1?.5:i/(posts-1);
    const px=x+(w*(t-.5));
    const pz=z+(d*(t-.5));
    box(px,1.4,pz,.25,2.8,.25,woodDark);
  }
  if(w>d){
    box(x,1.4,z,w,1.7,.12,woodDark);
  }else{
    box(x,1.4,z,.12,1.7,d,woodDark);
  }
}
fence(-75,0,20,0);
fence(75,0,20,0);
fence(0,-82,0,20);
fence(0,82,0,20);

// benches
function bench(x,z,rot=0){
  const group=new THREE.Group();
  const seat=box(0,1,0,4,.3,1,wood,false);
  const leg1=box(-1.4,.5,0,.3,1,.8,metal,false);
  const leg2=box(1.4,.5,0,.3,1,.8,metal,false);
  group.add(seat,leg1,leg2);
  group.position.set(x,0,z);
  group.rotation.y=rot;
  scene.add(group);
  addCollider(x,z,4.2,1.2);
}
bench(-25,8,0);
bench(25,-8,Math.PI/2);
bench(-25,-8,0);
bench(25,8,Math.PI/2);

// lamp posts
function lamp(x,z){
  cylinder(x,3,z,.18,6,metal);
  const light=new THREE.PointLight(0xffe9b0,.7,18);
  light.position.set(x,6,z);
  scene.add(light);
  const bulb=new THREE.Mesh(
    new THREE.SphereGeometry(.35,12,8),
    new THREE.MeshStandardMaterial({color:0xffffcc,emissive:0xffff99,emissiveIntensity:.7})
  );
  bulb.position.set(x,6,z);
  scene.add(bulb);
}
[
[-18,-18],[18,-18],[-18,18],[18,18],
[-60,0],[60,0],[0,-60],[0,60],
[-60,-60],[60,-60],[-60,60],[60,60]
].forEach(p=>lamp(p[0],p[1]));

// parked vehicles
function car(x,z,rot=0){
  const body=box(0,1,0,6,1.4,3,metal,false);
  const top=box(0,1.9,0,3.3,1.2,2.4,glass,false);
  const group=new THREE.Group();
  group.add(body,top);
  group.position.set(x,0,z);
  group.rotation.y=rot;
  scene.add(group);
  // conservative rotated bounding collider
  addCollider(x,z,6.5,3.5);
}
car(-31,-9,Math.PI/2);
car(31,9,Math.PI/2);
car(-92,12,0);
car(92,-12,Math.PI);

// ---------- TREES WITH COLLIDERS ----------
function tree(x,z,s=1){
  // trunk collider
  cylinder(x,2*s,z,.7*s,4*s,trunkMat,true);

  const leaves=new THREE.Mesh(
    new THREE.SphereGeometry(2.7*s,16,12),
    leavesMat
  );
  leaves.position.set(x,5*s,z);
  leaves.castShadow=true;
  leaves.receiveShadow=true;
  scene.add(leaves);

  // Invisible-ish broad collision footprint for the tree canopy.
  // This keeps players from walking straight through trees.
  addCollider(x,z,3.0*s,3.0*s);
}

const treePositions=[
[-95,-90,1.4],[-70,-92,1.1],[-45,-92,1.3],[-20,-92,1],
[20,-92,1.2],[45,-92,1.4],[70,-92,1.1],[95,-90,1.3],
[-94,90,1.3],[-65,92,1.1],[-40,92,1.4],[-18,92,1],
[18,92,1.2],[42,92,1.3],[70,92,1.1],[96,90,1.4],
[-95,-55,1.1],[-95,-25,1.3],[-95,25,1.2],[-95,55,1.4],
[95,-55,1.2],[95,-25,1.1],[95,25,1.4],[95,55,1.2],
[-75,-18,1],[-75,18,1],[-45,-72,1.1],[45,-72,1.2],
[-45,72,1.2],[45,72,1.1],[76,-72,1.1],[-76,72,1.2]
];
treePositions.forEach(v=>tree(...v));

// ---------- PLAYER ----------
const player={
  x:0,
  y:1.7,
  z:72,
  yaw:0,
  pitch:0,
  radius:.48
};

camera.position.set(player.x,player.y,player.z);

const keys=Object.create(null);
let settingsOpen=false;
let gameStarted=false;
let sensitivity=2.2;

// ---------- KEYBOARD ----------
window.addEventListener("keydown",(e)=>{
  keys[e.code]=true;

  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight"].includes(e.code)){
    e.preventDefault();
  }

  if(e.code==="Escape"){
    e.preventDefault();
    toggleSettings();
  }
});

window.addEventListener("keyup",(e)=>{
  keys[e.code]=false;
});

window.addEventListener("blur",()=>{
  for(const k in keys) keys[k]=false;
});

// ---------- SETTINGS ----------
const settings=document.getElementById("settings");
const slider=document.getElementById("sensitivity");
const sensitivityValue=document.getElementById("sensitivity-value");

function updateSensitivity(){
  sensitivity=parseFloat(slider.value);
  sensitivityValue.textContent=sensitivity.toFixed(1);
}
slider.addEventListener("input",updateSensitivity);

function toggleSettings(){
  if(!gameStarted) return;

  settingsOpen=!settingsOpen;
  settings.style.display=settingsOpen?"flex":"none";

  if(settingsOpen){
    document.exitPointerLock?.();
    for(const k in keys) keys[k]=false;
  }else{
    document.body.requestPointerLock?.();
  }
}

document.getElementById("close-settings").addEventListener("click",()=>{
  settingsOpen=false;
  settings.style.display="none";
  document.body.requestPointerLock?.();
});

document.getElementById("resume-button").addEventListener("click",()=>{
  settingsOpen=false;
  settings.style.display="none";
  document.body.requestPointerLock?.();
});

// ---------- MOUSE ----------
document.addEventListener("mousemove",(e)=>{
  if(!gameStarted || settingsOpen) return;
  if(document.pointerLockElement!==document.body) return;

  // Slider value 2.2 corresponds to the previous controller's sensitivity.
  const mouseSpeed=.001*sensitivity;

  player.yaw-=e.movementX*mouseSpeed;
  player.pitch-=e.movementY*mouseSpeed;

  player.pitch=THREE.MathUtils.clamp(
    player.pitch,
    -Math.PI/2+.05,
    Math.PI/2-.05
  );
});

// ---------- COLLISION ----------
function collides(x,z){
  for(const c of colliders){
    if(
      x+player.radius>c.minX &&
      x-player.radius<c.maxX &&
      z+player.radius>c.minZ &&
      z-player.radius<c.maxZ
    ){
      return true;
    }
  }
  return false;
}

function tryMove(dx,dz){
  const nx=player.x+dx;
  if(!collides(nx,player.z)) player.x=nx;

  const nz=player.z+dz;
  if(!collides(player.x,nz)) player.z=nz;

  player.x=THREE.MathUtils.clamp(player.x,-107,107);
  player.z=THREE.MathUtils.clamp(player.z,-107,107);
}

// ---------- MOVEMENT ----------
function updateMovement(dt){
  if(!gameStarted || settingsOpen) return;

  let forward=0;
  let strafe=0;

  if(keys["KeyW"]) forward+=1;
  if(keys["KeyS"]) forward-=1;
  if(keys["KeyA"]) strafe-=1;
  if(keys["KeyD"]) strafe+=1;

  if(forward===0 && strafe===0) return;

  const len=Math.hypot(forward,strafe);
  forward/=len;
  strafe/=len;

  const speed=(keys["ShiftLeft"]||keys["ShiftRight"])?11:6;

  const forwardX=-Math.sin(player.yaw);
  const forwardZ=-Math.cos(player.yaw);
  const rightX=Math.cos(player.yaw);
  const rightZ=-Math.sin(player.yaw);

  const dx=(forwardX*forward+rightX*strafe)*speed*dt;
  const dz=(forwardZ*forward+rightZ*strafe)*speed*dt;

  tryMove(dx,dz);
}

// ---------- CAMERA ----------
function updateCamera(){
  camera.position.set(player.x,player.y,player.z);

  const distance=10;
  const targetX=player.x-Math.sin(player.yaw)*Math.cos(player.pitch)*distance;
  const targetY=player.y+Math.sin(player.pitch)*distance;
  const targetZ=player.z-Math.cos(player.yaw)*Math.cos(player.pitch)*distance;

  camera.lookAt(targetX,targetY,targetZ);
}

// ---------- START ----------
document.getElementById("start-button").addEventListener("click",()=>{
  gameStarted=true;
  document.getElementById("start-screen").style.display="none";
  document.body.requestPointerLock?.();
});

// Clicking the game tries to lock the mouse again after ESC.
renderer.domElement.addEventListener("click",()=>{
  if(gameStarted && !settingsOpen){
    document.body.requestPointerLock?.();
  }
});

// ---------- LOOP ----------
let previous=performance.now();

function animate(now){
  requestAnimationFrame(animate);

  const dt=Math.min((now-previous)/1000,.05);
  previous=now;

  updateMovement(dt);
  updateCamera();
  renderer.render(scene,camera);
}

requestAnimationFrame(animate);

window.addEventListener("resize",()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
