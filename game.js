// CAN'T CATCH ME — Stage 3 clean rebuild
// WASD movement is handled globally and does NOT depend on pointer lock.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 70, 240);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  800
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- LIGHTING ----------
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(50, 90, 35);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);

scene.add(new THREE.HemisphereLight(0xdaf1ff, 0x405533, 0.8));

// ---------- MATERIALS ----------
const grass = new THREE.MeshStandardMaterial({ color: 0x42a94b });
const road = new THREE.MeshStandardMaterial({ color: 0x59636e });
const sidewalk = new THREE.MeshStandardMaterial({ color: 0x9a9da0 });
const wall = new THREE.MeshStandardMaterial({ color: 0x7d8388 });
const wallDark = new THREE.MeshStandardMaterial({ color: 0x4e555b });
const roof = new THREE.MeshStandardMaterial({ color: 0x343a40 });
const wood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const crateMat = new THREE.MeshStandardMaterial({ color: 0x9b6938 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x684225 });
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x246b31 });
const metal = new THREE.MeshStandardMaterial({ color: 0x646b72, metalness: 0.4, roughness: 0.5 });
const glass = new THREE.MeshStandardMaterial({
  color: 0x4d8296,
  transparent: true,
  opacity: 0.65
});
const yellow = new THREE.MeshStandardMaterial({
  color: 0xd4ad39,
  emissive: 0x3b2c05,
  emissiveIntensity: 0.2
});

// ---------- COLLISION ----------
const colliders = [];

function addCollider(x, z, width, depth) {
  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2
  });
}

function addBox(x, y, z, width, height, depth, material, collision = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (collision) addCollider(x, z, width, depth);
  return mesh;
}

function addCylinder(x, y, z, radius, height, material, collision = true) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (collision) addCollider(x, z, radius * 2, radius * 2);
  return mesh;
}

// ---------- MAP ----------
const MAP = 220;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(MAP, MAP),
  grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Roads
addBox(0, 0.02, 0, 18, 0.04, MAP, road, false);
addBox(0, 0.025, 0, MAP, 0.04, 18, road, false);
addBox(-70, 0.03, 0, 12, 0.05, MAP, road, false);
addBox(70, 0.03, 0, 12, 0.05, MAP, road, false);
addBox(0, 0.035, -70, MAP, 0.05, 12, road, false);
addBox(0, 0.035, 70, MAP, 0.05, 12, road, false);

// Sidewalks
addBox(-15, 0.05, 0, 4, 0.08, MAP, sidewalk, false);
addBox(15, 0.05, 0, 4, 0.08, MAP, sidewalk, false);
addBox(0, 0.055, -15, MAP, 0.08, 4, sidewalk, false);
addBox(0, 0.055, 15, MAP, 0.08, 4, sidewalk, false);

// Boundary
const B = 108;
addBox(0, 3, -B, 216, 6, 2, wallDark, true);
addBox(0, 3, B, 216, 6, 2, wallDark, true);
addBox(-B, 3, 0, 2, 6, 216, wallDark, true);
addBox(B, 3, 0, 2, 6, 216, wallDark, true);

// ---------- BUILDINGS ----------
function building(x, z, width, depth, height = 7) {
  const thickness = 0.8;
  const doorWidth = 5;

  // Floor
  addBox(x, 0.08, z, width - 0.4, 0.12, depth - 0.4, wallDark, false);

  // Back
  addBox(
    x,
    height / 2,
    z - depth / 2 + thickness / 2,
    width,
    height,
    thickness,
    wall
  );

  // Left / right
  addBox(
    x - width / 2 + thickness / 2,
    height / 2,
    z,
    thickness,
    height,
    depth,
    wall
  );

  addBox(
    x + width / 2 - thickness / 2,
    height / 2,
    z,
    thickness,
    height,
    depth,
    wall
  );

  // Front split around a real opening.
  const frontZ = z + depth / 2 - thickness / 2;
  const sideWidth = (width - doorWidth) / 2;

  addBox(
    x - width / 2 + sideWidth / 2,
    height / 2,
    frontZ,
    sideWidth,
    height,
    thickness,
    wall
  );

  addBox(
    x + width / 2 - sideWidth / 2,
    height / 2,
    frontZ,
    sideWidth,
    height,
    thickness,
    wall
  );

  // Roof
  addBox(x, height + 0.35, z, width + 0.5, 0.7, depth + 0.5, roof, false);

  // Door frame / sign
  addBox(x, height - 0.7, frontZ - 0.05, doorWidth + 0.3, 0.25, 0.2, yellow, false);

  // Interior cover
  addBox(x - 3, 1, z - 2, 3.5, 2, 1.2, wood, true);
  addBox(x + 3, 1, z + 2, 2, 2, 2, crateMat, true);
}

building(-48, -48, 30, 25, 7);
building(48, -48, 32, 27, 8);
building(-48, 48, 28, 30, 7);
building(48, 48, 34, 26, 8);
building(-82, -38, 24, 28, 6.5);
building(82, 38, 25, 30, 7);

// ---------- OBJECTS ----------
function crates(x, z, count = 4) {
  for (let i = 0; i < count; i++) {
    const ox = (i % 2) * 2.4 - 1.2;
    const oz = Math.floor(i / 2) * 2.4 - 1.2;
    addBox(x + ox, 1, z + oz, 2.2, 2, 2.2, crateMat, true);
  }
}

[
  [-28, -35], [-8, -42], [27, -35], [75, -25],
  [-30, 31], [30, 35], [-78, 25], [78, -65],
  [-80, -75], [80, 75]
].forEach(([x, z]) => crates(x, z, 4));

function fence(x, z, width, depth) {
  addBox(x, 1.4, z - depth / 2, width, 2.8, 0.35, woodDark, true);
  addBox(x, 1.4, z + depth / 2, width, 2.8, 0.35, woodDark, true);
  addBox(x - width / 2, 1.4, z, 0.35, 2.8, depth, woodDark, true);
  addBox(x + width / 2, 1.4, z, 0.35, 2.8, depth, woodDark, true);
}

fence(-30, -78, 16, 8);
fence(30, 78, 16, 8);

function bench(x, z, rotation = 0) {
  const group = new THREE.Group();

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.35, 1),
    wood
  );
  seat.position.y = 1.1;
  group.add(seat);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.1, 0.3),
      metal
    );
    leg.position.set(side * 1.2, 0.55, 0);
    group.add(leg);
  }

  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(group);

  // Simple conservative collision box.
  addCollider(x, z, 4.1, 1.5);
}

bench(-28, 8, Math.PI / 2);
bench(28, -8, Math.PI / 2);
bench(-60, 20, 0);
bench(60, -20, 0);

function lamp(x, z) {
  addCylinder(x, 3, z, 0.18, 6, metal, true);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffff99,
      emissiveIntensity: 0.8
    })
  );
  bulb.position.set(x, 6.1, z);
  scene.add(bulb);

  const light = new THREE.PointLight(0xffe9b0, 0.65, 18);
  light.position.set(x, 6, z);
  scene.add(light);
}

[
  [-18, -18], [18, -18], [-18, 18], [18, 18],
  [-60, 0], [60, 0], [0, -60], [0, 60]
].forEach(([x, z]) => lamp(x, z));

function car(x, z, rotation = 0) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.4, 3),
    metal
  );
  body.position.y = 1;
  group.add(body);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 1.2, 2.4),
    glass
  );
  top.position.y = 1.9;
  group.add(top);

  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  group.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  scene.add(group);
  addCollider(x, z, 6.5, 3.5);
}

car(-31, -9, Math.PI / 2);
car(31, 9, Math.PI / 2);
car(-92, 12);
car(92, -12, Math.PI);

// ---------- TREES ----------
function tree(x, z, scale = 1) {
  addCylinder(x, 2 * scale, z, 0.7 * scale, 4 * scale, trunkMat, true);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.7 * scale, 16, 12),
    leavesMat
  );
  leaves.position.set(x, 5 * scale, z);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  scene.add(leaves);

  addCollider(x, z, 3 * scale, 3 * scale);
}

[
  [-95, -90, 1.4], [-70, -92, 1.1], [-45, -92, 1.3], [-20, -92, 1],
  [20, -92, 1.2], [45, -92, 1.4], [70, -92, 1.1], [95, -90, 1.3],
  [-94, 90, 1.3], [-65, 92, 1.1], [-40, 92, 1.4], [-18, 92, 1],
  [18, 92, 1.2], [42, 92, 1.3], [70, 92, 1.1], [96, 90, 1.4],
  [-95, -55, 1.1], [-95, -25, 1.3], [-95, 25, 1.2], [-95, 55, 1.4],
  [95, -55, 1.2], [95, -25, 1.1], [95, 25, 1.4], [95, 55, 1.2],
  [-75, -18, 1], [-75, 18, 1], [-45, -72, 1.1], [45, -72, 1.2],
  [-45, 72, 1.2], [45, 72, 1.1], [76, -72, 1.1], [-76, 72, 1.2]
].forEach(v => tree(v[0], v[1], v[2]));

// ---------- PLAYER ----------
const player = {
  x: 0,
  y: 1.7,
  z: 72,
  yaw: 0,
  pitch: 0,
  radius: 0.48
};

camera.position.set(player.x, player.y, player.z);

// ---------- INPUT ----------
// IMPORTANT: movement is tracked with window listeners.
// It works whether or not the mouse is locked.
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false
};

let gameStarted = false;
let settingsOpen = false;
let sensitivity = 2.2;

function keyName(e) {
  const code = e.code || "";
  const key = (e.key || "").toLowerCase();

  if (code === "KeyW" || key === "w") return "w";
  if (code === "KeyA" || key === "a") return "a";
  if (code === "KeyS" || key === "s") return "s";
  if (code === "KeyD" || key === "d") return "d";
  if (code === "ShiftLeft" || code === "ShiftRight" || key === "shift") return "shift";
  return "";
}

function setKey(e, pressed) {
  const k = keyName(e);
  if (!k) return;

  keys[k] = pressed;
  e.preventDefault();
}

window.addEventListener("keydown", e => {
  if (e.code === "Escape") {
    e.preventDefault();
    if (gameStarted) toggleSettings();
    return;
  }
  setKey(e, true);
}, true);

window.addEventListener("keyup", e => {
  setKey(e, false);
}, true);

window.addEventListener("blur", clearKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearKeys();
});

function clearKeys() {
  keys.w = false;
  keys.a = false;
  keys.s = false;
  keys.d = false;
  keys.shift = false;
}

// ---------- SETTINGS ----------
const settingsEl = document.getElementById("settings");
const slider = document.getElementById("sensitivity");
const sensitivityValue = document.getElementById("sensitivity-value");

function updateSensitivity() {
  sensitivity = Number(slider.value);
  sensitivityValue.textContent = sensitivity.toFixed(1);
}

slider.addEventListener("input", updateSensitivity);
updateSensitivity();

function toggleSettings() {
  settingsOpen = !settingsOpen;
  settingsEl.style.display = settingsOpen ? "flex" : "none";
  clearKeys();

  if (settingsOpen) {
    document.exitPointerLock?.();
  }
}

document.getElementById("close-settings").addEventListener("click", () => {
  settingsOpen = false;
  settingsEl.style.display = "none";
  clearKeys();
});

document.getElementById("resume-button").addEventListener("click", () => {
  settingsOpen = false;
  settingsEl.style.display = "none";
  clearKeys();
  if (gameStarted) document.body.requestPointerLock?.();
});

// ---------- MOUSE LOOK ----------
document.addEventListener("mousemove", e => {
  if (!gameStarted || settingsOpen) return;
  if (document.pointerLockElement !== document.body) return;

  player.yaw -= e.movementX * sensitivity * 0.0015;
  player.pitch -= e.movementY * sensitivity * 0.0015;
  player.pitch = THREE.MathUtils.clamp(
    player.pitch,
    -Math.PI / 2 + 0.05,
    Math.PI / 2 - 0.05
  );
});

// ---------- COLLISION ----------
function collides(x, z) {
  for (const c of colliders) {
    if (
      x + player.radius > c.minX &&
      x - player.radius < c.maxX &&
      z + player.radius > c.minZ &&
      z - player.radius < c.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function movePlayer(dx, dz) {
  // Axis-separated movement lets the player slide along walls.
  const nextX = THREE.MathUtils.clamp(player.x + dx, -106.5, 106.5);
  if (!collides(nextX, player.z)) player.x = nextX;

  const nextZ = THREE.MathUtils.clamp(player.z + dz, -106.5, 106.5);
  if (!collides(player.x, nextZ)) player.z = nextZ;
}

function updateMovement(dt) {
  if (!gameStarted || settingsOpen) return;

  let forward = 0;
  let strafe = 0;

  if (keys.w) forward += 1;
  if (keys.s) forward -= 1;
  if (keys.a) strafe -= 1;
  if (keys.d) strafe += 1;

  if (forward === 0 && strafe === 0) return;

  const length = Math.hypot(forward, strafe);
  forward /= length;
  strafe /= length;

  const speed = keys.shift ? 11 : 6;

  // Camera-relative movement.
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);

  const dx = (
    forwardX * forward +
    rightX * strafe
  ) * speed * dt;

  const dz = (
    forwardZ * forward +
    rightZ * strafe
  ) * speed * dt;

  movePlayer(dx, dz);
}

// ---------- CAMERA ----------
function updateCamera() {
  camera.position.set(player.x, player.y, player.z);

  const lookDistance = 10;
  const cosPitch = Math.cos(player.pitch);

  const targetX =
    player.x - Math.sin(player.yaw) * cosPitch * lookDistance;

  const targetY =
    player.y + Math.sin(player.pitch) * lookDistance;

  const targetZ =
    player.z - Math.cos(player.yaw) * cosPitch * lookDistance;

  camera.lookAt(targetX, targetY, targetZ);
}

// ---------- START ----------
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

startButton.addEventListener("click", () => {
  gameStarted = true;
  settingsOpen = false;
  settingsEl.style.display = "none";
  startScreen.style.display = "none";
  clearKeys();

  // Pointer lock is only for mouse look.
  // WASD continues to work even if the browser refuses pointer lock.
  document.body.requestPointerLock?.();
});

// Clicking the game area re-locks the mouse after it was released.
renderer.domElement.addEventListener("click", () => {
  if (gameStarted && !settingsOpen) {
    document.body.requestPointerLock?.();
  }
});

// ---------- LOOP ----------
let previousTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;

  updateMovement(dt);
  updateCamera();
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
