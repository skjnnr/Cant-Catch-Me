
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
  if(earlyLogoutBtn) earlyLogoutBtn.style.display="block";
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
   const tag=isOwner?"OWNER":"MOD";
   x.font="bold 46px Arial";
   x.lineWidth=10;x.strokeStyle="rgba(0,0,0,.9)";
   x.strokeText(tag,256,48);
   x.fillStyle=isOwner?"#ffd54a":"#55c8ff";
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
 ch=client.channel("cant-catch-me:public-1",{config:{broadcast:{self:false},presence:{key:myId}}});
 ch.on("broadcast",{event:"state"},({payload:p})=>{
   if(!p||p.id===myId)return;
   let r=remotes.get(p.id);
   if(!r){r={m:remoteModel(p.username||"Player",p.role||"player"),t:new THREE.Vector3()};remotes.set(p.id,r)}
   r.t.set(p.x,p.y-.47,p.z);r.yaw=p.yaw||0;
 }).on("presence",{event:"sync"},()=>{
   const state=ch.presenceState(),ids=new Set(Object.keys(state));
   for(const [id,r] of remotes)if(!ids.has(id)){scene.remove(r.m);remotes.delete(id)}
   if(mpCount)mpCount.textContent="Players: "+Math.max(1,ids.size);
 }).subscribe(async st=>{
   if(mpStatus)mpStatus.textContent=st==="SUBSCRIBED"?"Online":st==="CHANNEL_ERROR"?"Connection error":"Connecting...";
   if(st==="SUBSCRIBED")await ch.track({id:myId,username:currentUsername, role:currentRole,joined_at:Date.now()});
 });
 let lastNet=0;
 let localLabel=null;
 function netLoop(t){
   requestAnimationFrame(netLoop);
   if(!localLabel && typeof playerModel!=="undefined" && currentUsername){
     localLabel=makeNameSprite(currentUsername,currentRole);
     playerModel.add(localLabel);
   }
   for(const r of remotes.values()){r.m.position.lerp(r.t,.3);let d=(r.yaw||0)-r.m.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));r.m.rotation.y+=d*.3}
   if(multiplayerLoggedIn&&typeof started!=="undefined"&&started&&t-lastNet>50){lastNet=t;ch.send({type:"broadcast",event:"state",payload:{id:myId,username:currentUsername, role:currentRole,x:player.x,y:player.y,z:player.z,yaw:player.yaw}})}
 }
 requestAnimationFrame(netLoop);
}
// Multiplayer intentionally does NOT start here.
// enterGame() starts it only after Supabase confirms an authenticated session.
// ---- END MULTIPLAYER ----
