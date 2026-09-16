// CAN'T CATCH ME — Stage 2 rebuilt
// Movement is deliberately implemented without Object3D.translateX/translateZ.
// The player has separate yaw/pitch values, and movement is calculated directly
// from the yaw angle. This makes WASD predictable and camera-relative.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 35, 125);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- LIGHTING ----------
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(25, 40, 15);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x48603b, 0.7));

// ---------- MATERIALS ----------
const grass = new THREE.MeshStandardMaterial({color:0x3f873f});
const road = new THREE.MeshStandardMaterial({color:0x41464b});
const wall = new THREE.MeshStandardMaterial({color:0x777b80});
const darkWall = new THREE.MeshStandardMaterial({color:0x50545a});
const wood = new THREE.MeshStandardMaterial({color:0x8b552d});
const roof = new THREE.MeshStandardMaterial({color:0x363a40});
const crateMat = new THREE.MeshStandardMaterial({color:0x9b6938});
const treeMat = new THREE.MeshStandardMaterial({color:0x174c25});
const trunkMat = new THREE.MeshStandardMaterial({color:0x684225});

const colliders = [];

function box(x,y,z,w,h,d,mat,collision=true){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);

  if(collision){
    colliders.push({
      minX:x-w/2,
      maxX:x+w/2,
      minZ:z-d/2,
      maxZ:z+d/2
    });
  }
  return m;
}

function cylinder(x,y,z,r,h,mat){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat);
  m.position.set(x,y,z);
  m.castShadow = true;
  scene.add(m);
  return m;
}

// ---------- MAP ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120,120),
  grass
);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// roads
box(0,.02,0,12,.04,100,road,false);
box(0,.03,0,100,.04,12,road,false);

// boundary
box(0,2.5,-58,116,5,1,darkWall);
box(0,2.5,58,116,5,1,darkWall);
box(-58,2.5,0,1,5,116,darkWall);
box(58,2.5,0,1,5,116,darkWall);

// buildings
box(-28,2.5,-28,20,5,18,wall);
box(-28,5.4,-28,21,.8,19,roof,false);

box(28,3.5,-28,20,7,20,darkWall);
box(28,7.5,-28,21,.8,21,roof,false);

box(-28,2.5,28,20,5,18,wall);
box(-28,5.4,28,21,.8,19,roof,false);

box(28,2.5,29,20,5,16,wall);
box(28,5.4,29,21,.8,17,roof,false);

// hiding cover
box(-2,1.5,-14,8,3,1,wood);
box(3,1.5,14,9,3,1,wood);

function crates(x,z,count){
  for(let i=0;i<count;i++){
    const ox=(i%2)*2.2-1.1;
    const oy=Math.floor(i/2)*1.8+.9;
    box(x+ox,oy,z,2.2,1.8,2.2,crateMat);
  }
}
crates(-12,-3,4);
crates(12,3,4);
crates(-12,14,4);
crates(13,14,4);
crates(-12,-14,4);
crates(14,-14,4);

// trees
function tree(x,z,s=1){
  cylinder(x,1.8*s,z,.55*s,3.6*s,trunkMat);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.2*s,16,12),
    treeMat
  );
  leaves.position.set(x,4.1*s,z);
  leaves.castShadow=true;
  scene.add(leaves);
}

[
[-48,-12,1.2],[-46,18,1],[-35,45,1.2],[-12,43,1],
[12,43,1.2],[38,45,1],[48,22,1.2],[47,-18,1],
[39,-43,1.1],[10,-45,1.2],[-15,-44,1],[-40,-40,1.1]
].forEach(v=>tree(...v));

// ---------- PLAYER CONTROLLER ----------
// Player position is just x/z numbers.
// Camera is NOT parented to a rotating player object.
// This removes the source of the previous movement problem.

const player = {
  x: 0,
  y: 1.7,
  z: 45,
  yaw: 0,
  pitch: 0,
  radius: .45
};

camera.position.set(player.x,player.y,player.z);

const keys = Object.create(null);

window.addEventListener("keydown",(e)=>{
  keys[e.code]=true;
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight"].includes(e.code)){
    e.preventDefault();
  }
});

window.addEventListener("keyup",(e)=>{
  keys[e.code]=false;
});

window.addEventListener("blur",()=>{
  for(const k in keys) keys[k]=false;
});

// ---------- MOUSE ----------
document.addEventListener("mousemove",(e)=>{
  if(document.pointerLockElement !== document.body) return;

  player.yaw -= e.movementX * .0022;
  player.pitch -= e.movementY * .0022;

  player.pitch = THREE.MathUtils.clamp(
    player.pitch,
    -Math.PI/2 + .05,
    Math.PI/2 - .05
  );
});

// ---------- COLLISION ----------
function collides(x,z){
  for(const c of colliders){
    if(
      x + player.radius > c.minX &&
      x - player.radius < c.maxX &&
      z + player.radius > c.minZ &&
      z - player.radius < c.maxZ
    ){
      return true;
    }
  }
  return false;
}

// Move on each axis independently.
// This allows the player to slide along walls.
function tryMove(dx,dz){
  const nx=player.x+dx;
  if(!collides(nx,player.z)){
    player.x=nx;
  }

  const nz=player.z+dz;
  if(!collides(player.x,nz)){
    player.z=nz;
  }

  player.x=THREE.MathUtils.clamp(player.x,-56+player.radius,56-player.radius);
  player.z=THREE.MathUtils.clamp(player.z,-56+player.radius,56-player.radius);
}

// ---------- WASD ----------
function updateMovement(){
  let forward=0;
  let strafe=0;

  // W/S controls forward/backward.
  if(keys["KeyW"]) forward += 1;
  if(keys["KeyS"]) forward -= 1;

  // A/D controls left/right.
  if(keys["KeyA"]) strafe -= 1;
  if(keys["KeyD"]) strafe += 1;

  if(forward===0 && strafe===0) return;

  // Normalize so diagonal isn't faster.
  const len=Math.hypot(forward,strafe);
  forward/=len;
  strafe/=len;

  const speed=(keys["ShiftLeft"]||keys["ShiftRight"]) ? .20 : .115;

  // Camera's horizontal forward vector from yaw.
  const forwardX=-Math.sin(player.yaw);
  const forwardZ=-Math.cos(player.yaw);

  // Camera's horizontal right vector.
  const rightX=Math.cos(player.yaw);
  const rightZ=-Math.sin(player.yaw);

  const dx=(forwardX*forward + rightX*strafe)*speed;
  const dz=(forwardZ*forward + rightZ*strafe)*speed;

  tryMove(dx,dz);
}

// ---------- CAMERA ----------
function updateCamera(){
  camera.position.set(player.x,player.y,player.z);

  // Look direction is calculated from yaw/pitch.
  const lookDistance=10;

  const targetX =
    player.x -
    Math.sin(player.yaw) *
    Math.cos(player.pitch) *
    lookDistance;

  const targetY =
    player.y +
    Math.sin(player.pitch) *
    lookDistance;

  const targetZ =
    player.z -
    Math.cos(player.yaw) *
    Math.cos(player.pitch) *
    lookDistance;

  camera.lookAt(targetX,targetY,targetZ);
}

// ---------- START ----------
document.getElementById("start-button").addEventListener("click",()=>{
  document.getElementById("start-screen").style.display="none";
  document.body.requestPointerLock();
});

// ---------- LOOP ----------
function animate(){
  requestAnimationFrame(animate);
  updateMovement();
  updateCamera();
  renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
