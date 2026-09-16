const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 35, 125);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- LIGHTS ----------
const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(25, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x48603b, 0.65));

// ---------- MATERIALS ----------
const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x3f873f }),
  road: new THREE.MeshStandardMaterial({ color: 0x41464b }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0xa7a7a2 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x777b80 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x50545a }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b552d }),
  roof: new THREE.MeshStandardMaterial({ color: 0x363a40 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x6d7478, metalness: .35, roughness: .65 }),
  bush: new THREE.MeshStandardMaterial({ color: 0x245d2c }),
  tree: new THREE.MeshStandardMaterial({ color: 0x174c25 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x684225 }),
  crate: new THREE.MeshStandardMaterial({ color: 0x9b6938 })
};

const colliders = [];

function boxMesh(x, y, z, w, h, d, material, collide = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (collide) {
    colliders.push({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2
    });
  }
  return mesh;
}

function cylinder(x, y, z, radius, height, material, collide = false) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (collide) {
    colliders.push({
      minX: x - radius, maxX: x + radius,
      minZ: z - radius, maxZ: z + radius
    });
  }
  return mesh;
}

// ---------- WORLD ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

boxMesh(0, 0.015, 0, 10, 0.03, 80, materials.road, false);
boxMesh(0, 0.02, 0, 80, 0.03, 10, materials.road, false);
boxMesh(-7, 0.035, 0, 2, 0.05, 80, materials.sidewalk, false);
boxMesh(7, 0.035, 0, 2, 0.05, 80, materials.sidewalk, false);
boxMesh(0, 0.04, -7, 80, 0.05, 2, materials.sidewalk, false);
boxMesh(0, 0.04, 7, 80, 0.05, 2, materials.sidewalk, false);

boxMesh(0, 2.5, -58, 116, 5, 1, materials.wallDark);
boxMesh(0, 2.5, 58, 116, 5, 1, materials.wallDark);
boxMesh(-58, 2.5, 0, 1, 5, 116, materials.wallDark);
boxMesh(58, 2.5, 0, 1, 5, 116, materials.wallDark);

boxMesh(-27, 2.5, -27, 22, 5, 18, materials.wall);
boxMesh(-27, 5.4, -27, 23, .8, 19, materials.roof, false);
boxMesh(28, 3.5, -27, 22, 7, 20, materials.wallDark);
boxMesh(28, 7.5, -27, 23, .8, 21, materials.roof, false);
boxMesh(-27, 2.5, 28, 20, 5, 18, materials.wall);
boxMesh(-27, 5.4, 28, 21, .8, 19, materials.roof, false);
boxMesh(28, 2.5, 29, 20, 5, 16, materials.wall);
boxMesh(28, 5.4, 29, 21, .8, 17, materials.roof, false);

function crateStack(x, z, count) {
  for (let i = 0; i < count; i++) {
    const y = 0.9 + (i % 2) * 1.8;
    const offset = (i % 2) ? 1.1 : -1.1;
    boxMesh(x + offset, y, z, 2.2, 1.8, 2.2, materials.crate);
  }
}
crateStack(-12, -3, 4);
crateStack(12, 3, 4);
crateStack(-12, 14, 3);
crateStack(13, 14, 5);
crateStack(-12, -14, 5);
crateStack(14, -14, 3);

boxMesh(-2, 1.4, -14, 8, 2.8, 1, materials.wood);
boxMesh(3, 1.4, 14, 9, 2.8, 1, materials.wood);
boxMesh(-42, 1.6, 5, 7, 3.2, 7, materials.wood);
boxMesh(-42, 3.5, 5, 7.4, .6, 7.4, materials.roof, false);
boxMesh(42, 1.6, 7, 7, 3.2, 7, materials.wood);
boxMesh(42, 3.5, 7, 7.4, .6, 7.4, materials.roof, false);

function tree(x, z, scale = 1) {
  cylinder(x, 1.8 * scale, z, .55 * scale, 3.6 * scale, materials.trunk);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 * scale, 16, 12),
    materials.tree
  );
  leaves.position.set(x, 4.1 * scale, z);
  leaves.castShadow = true;
  scene.add(leaves);
}

function bush(x, z, scale = 1) {
  const b = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 * scale, 14, 10),
    materials.bush
  );
  b.position.set(x, 1.1 * scale, z);
  b.scale.y = .75;
  b.castShadow = true;
  scene.add(b);
  colliders.push({
    minX: x - 1.3 * scale, maxX: x + 1.3 * scale,
    minZ: z - 1.3 * scale, maxZ: z + 1.3 * scale
  });
}

[
  [-48,-12,1.2], [-46,18,1], [-35,45,1.2], [-12,43,1],
  [12,43,1.2], [38,45,1], [48,22,1.2], [47,-18,1],
  [39,-43,1.1], [10,-45,1.2], [-15,-44,1], [-40,-40,1.1]
].forEach(t => tree(...t));

[
  [-18,-4,1], [18,-4,1.1], [-19,18,.9], [20,18,1],
  [-43,-2,1], [43,-3,1], [-43,30,.9], [44,32,1]
].forEach(b => bush(...b));

// ---------- PLAYER ----------
const player = new THREE.Object3D();
player.position.set(0, 1.7, 45);
scene.add(player);
camera.position.set(0, 0, 0);
player.add(camera);

const PLAYER_RADIUS = 0.45;
const keys = Object.create(null);
let yaw = 0;
let pitch = 0;

document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","Space"].includes(e.code)) {
    e.preventDefault();
  }
});

document.addEventListener("keyup", e => {
  keys[e.code] = false;
});

document.addEventListener("blur", () => {
  for (const key in keys) keys[key] = false;
});

document.addEventListener("mousemove", e => {
  if (document.pointerLockElement !== document.body) return;

  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, pitch));

  // Only rotate the player's body horizontally.
  player.rotation.y = yaw;

  // Only rotate the camera vertically.
  camera.rotation.x = pitch;
});

function blocked(x, z) {
  for (const c of colliders) {
    if (
      x + PLAYER_RADIUS > c.minX &&
      x - PLAYER_RADIUS < c.maxX &&
      z + PLAYER_RADIUS > c.minZ &&
      z - PLAYER_RADIUS < c.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function movePlayer(dx, dz) {
  // Test each axis separately so sliding along walls works.
  const nextX = player.position.x + dx;
  if (!blocked(nextX, player.position.z)) {
    player.position.x = nextX;
  }

  const nextZ = player.position.z + dz;
  if (!blocked(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -56, 56);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -56, 56);
}

// ---------- START ----------
document.getElementById("start-button").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
  document.body.requestPointerLock();
});

// ---------- FIXED WASD MOVEMENT ----------
function updatePlayer() {
  const sprint = keys["ShiftLeft"] || keys["ShiftRight"];
  const speed = sprint ? 0.18 : 0.11;

  let forward = 0;
  let right = 0;

  if (keys["KeyW"]) forward += 1;
  if (keys["KeyS"]) forward -= 1;
  if (keys["KeyD"]) right += 1;
  if (keys["KeyA"]) right -= 1;

  if (forward === 0 && right === 0) return;

  // Normalize diagonal movement so W+D isn't faster than W.
  const length = Math.hypot(forward, right);
  forward /= length;
  right /= length;

  // Correct camera-relative movement:
  // W = exactly where you're looking horizontally.
  // S = backward.
  // D = right.
  // A = left.
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  const dx = (forwardX * forward + rightX * right) * speed;
  const dz = (forwardZ * forward + rightZ * right) * speed;

  movePlayer(dx, dz);
}

function animate() {
  requestAnimationFrame(animate);
  updatePlayer();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
