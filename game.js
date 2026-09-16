const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 25, 100);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const sunlight = new THREE.DirectionalLight(0xffffff, 1.2);
sunlight.position.set(20, 30, 10);
sunlight.castShadow = true;
scene.add(sunlight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x3b7d3b })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function createWall(x, y, z, width, height, depth) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

createWall(0, 2, -20, 40, 4, 1);
createWall(0, 2, 20, 40, 4, 1);
createWall(-20, 2, 0, 1, 4, 40);
createWall(20, 2, 0, 1, 4, 40);

function createBox(x, z, width, height, depth, color = 0x8b4513) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color })
  );
  box.position.set(x, height / 2, z);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
}

createBox(-8, -5, 4, 3, 2);
createBox(7, -7, 3, 2.5, 3);
createBox(-5, 8, 3, 2, 3);
createBox(9, 7, 4, 3, 2);

const player = new THREE.Object3D();
player.position.set(0, 1.7, 8);
scene.add(player);
camera.position.set(0, 0, 0);
player.add(camera);

const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let yaw = 0, pitch = 0;
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement !== document.body) return;
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
});

document.getElementById("start-button").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
  document.body.requestPointerLock();
});

function updatePlayer() {
  const speed = 0.12;
  if (keys["w"]) player.translateZ(-speed);
  if (keys["s"]) player.translateZ(speed);
  if (keys["a"]) player.translateX(-speed);
  if (keys["d"]) player.translateX(speed);

  player.position.x = THREE.MathUtils.clamp(player.position.x, -18, 18);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -18, 18);
}

function animate() {
  requestAnimationFrame(animate);
  updatePlayer();
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
