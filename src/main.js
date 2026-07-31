import * as THREE from 'three';
import { setupRain3D } from './rain/matrix-3d.js';
import { setupImageRain } from './rain/image-rain.js';
import { setupFPS, updateFPS } from './utils/fps.js';
import { debug, toggleDebug } from './utils/debug.js';
import { getAspect, onResize } from './utils/viewport.js';
import { enableFrustumDebug, disableFrustumDebug, updateFrustumDebug } from './utils/debug-frustum.js';
import { setupFPSCamera, updateFPSCamera } from './utils/fps-camera.js';
import { setupMobileControls } from './utils/mobile-controls.js';
import './style.css';

const searchParams = new URLSearchParams(window.location.search);
const isEmbedMode = searchParams.get('embed') === '1';
const requestedParentOrigin = searchParams.get('parentOrigin');
const parentOrigin = requestedParentOrigin && /^https?:\/\//.test(requestedParentOrigin)
  ? requestedParentOrigin
  : '*';

if (isEmbedMode) {
  document.documentElement.classList.add('embed-mode');
}

function postEmbedMessage(type) {
  if (!isEmbedMode || window.parent === window) return;
  window.parent.postMessage({ type }, parentOrigin);
}

// Scene, Camera, Renderer Setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 150, 250);

// PerspectiveCamera: fov, aspect, near, far
const camera = new THREE.PerspectiveCamera(30, getAspect(), 15, 250);
// Move camera back to see the plane
camera.position.z = 60;

// God Mode Camera
const godCamera = new THREE.PerspectiveCamera(75, getAspect(), 1, 5000);
// Elevated and pulled back to see the whole scene
godCamera.position.set(0, 80, 120);
godCamera.lookAt(0, 0, 0);

let activeCamera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Setup FPS camera for main camera
setupFPSCamera(camera, document.body, { allowUnlockedKeyboard: isEmbedMode });

// Setup Mobile Controls (will only activate if touch is supported)
setupMobileControls({ showGuide: !isEmbedMode });

// Setup FPS counter
setupFPS();

// Setup Matrix Rain 3D
// Always pass the main camera so the grid logic is tied to what the main camera sees
const { update: updateRain, resize: resizeRain, getMesh } = setupRain3D(scene, camera);

// Image Spawner settings
let nextSpawnInterval = 5 + Math.random() * 15; // Random between 5 and 20 seconds
const IMAGES = [
  new URL('./assets/images/neo.png', import.meta.url).href,
  new URL('./assets/images/morpheus.png', import.meta.url).href,
  new URL('./assets/images/smith.png', import.meta.url).href,
  new URL('./assets/images/smith2.png', import.meta.url).href,
  new URL('./assets/images/trinity.jpg', import.meta.url).href,
  new URL('./assets/images/matrix.jpg', import.meta.url).href
];
let activeImages = [];
let lastSpawnTime = performance.now();
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

let imageBag = [];
function getNextImage() {
  if (imageBag.length === 0) {
    imageBag = [...IMAGES];
    // Fisher-Yates shuffle
    for (let i = imageBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [imageBag[i], imageBag[j]] = [imageBag[j], imageBag[i]];
    }
  }
  return imageBag.pop();
}

function spawnRandomImage() {
  // Cap at 3 active images
  if (activeImages.length >= 3) {
    return;
  }

  // Find a valid position that doesn't overlap existing images
  let spawnPos = new THREE.Vector3();
  let validPos = false;
  let attempts = 0;

  while (!validPos && attempts < 10) {
    attempts++;
    // Distance between 50 and 90 units
    const distance = 50 + Math.random() * 40;

    // Create a vector pointing forward from the camera
    const dir = new THREE.Vector3(0, 0, -1);
    // Wide spread to fit multiple images on screen without overlap
    dir.x += (Math.random() - 0.5) * 1.5;
    dir.y += (Math.random() - 0.5) * 1.0;
    dir.normalize();
    dir.applyQuaternion(camera.quaternion);

    spawnPos.copy(camera.position).add(dir.multiplyScalar(distance));

    // Check clearance against active images (assume roughly ~60 units clearance needed)
    validPos = true;
    for (const img of activeImages) {
      if (spawnPos.distanceTo(img.mesh.position) < 60) {
        validPos = false;
        break;
      }
    }
  }

  // If no clear position is found after 10 attempts, skip spawning this time
  if (!validPos) return;

  const imgSrc = getNextImage();
  const { update, mesh, dispose } = setupImageRain(scene, {
    imageSrc: imgSrc,
    density: 2.0,
    colorProminence: 0.95,
    contrastBoost: true,
    brightness: 1.5, // Brightness boost as requested
    fadeInDuration: 4.0 // 4 seconds organic fade-in
  });

  mesh.position.copy(spawnPos);

  // Orient to face camera (Do not spawn at an angle)
  mesh.lookAt(camera.position);

  scene.add(mesh);
  activeImages.push({ update, mesh, dispose, spawnTime: performance.now() });
}

// Handle Window Resize via viewport source of truth
onResize((newAspect) => {
  camera.aspect = newAspect;
  camera.updateProjectionMatrix();
  godCamera.aspect = newAspect;
  godCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeRain(camera);
});

// Render Loop
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const deltaTime = now - lastTime;
  lastTime = now;

  // Update FPS counter
  updateFPS(now);

  // Update FPS Camera BEFORE frustum checks and rain updates
  updateFPSCamera(deltaTime, camera);
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

  // Update Rain Canvas
  updateRain(deltaTime, camera);

  // Manage Dynamic Image Spawning
  if (now - lastSpawnTime > nextSpawnInterval * 1000) {
    spawnRandomImage();
    lastSpawnTime = now;
    nextSpawnInterval = 5 + Math.random() * 15; // Pick a new random interval for next time
  }

  // Update and Cull active images
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  for (let i = activeImages.length - 1; i >= 0; i--) {
    const imgObj = activeImages[i];
    imgObj.update(deltaTime);

    // Frustum check to save memory
    const planeMesh = imgObj.mesh.children[0];
    planeMesh.updateMatrixWorld();

    // Give it a 2 second grace period before culling to prevent immediate pop-in/out during camera turns
    if (now - imgObj.spawnTime > 2000) {
      if (!frustum.intersectsObject(planeMesh)) {
        scene.remove(imgObj.mesh);
        imgObj.dispose();
        activeImages.splice(i, 1);
      }
    }
  }

  // FPS Camera is already updated at the start of the frame

  // Make God Camera follow the main camera
  if (activeCamera === godCamera) {
    godCamera.lookAt(camera.position);
  }

  updateFrustumDebug();

  debug('Frame Time', deltaTime.toFixed(2) + ' ms');
  debug('Draw Calls', renderer.info.render.calls);
  debug('Triangles', renderer.info.render.triangles);

  // Track JS Heap Memory if supported by the browser (mostly Chrome/Edge)
  if (performance.memory) {
    debug('Memory (MB)', (performance.memory.usedJSHeapSize / 1048576).toFixed(1));
  }

  renderer.render(scene, activeCamera);
}

// Start loop
animate(performance.now());
requestAnimationFrame(() => postEmbedMessage('MATRIX_RAIN_READY'));

/* ========= UI & CONTROLS LOGIC ========= */
let debugVisible = false;
let distractionsHidden = false;

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => { });
  } else {
    document.exitFullscreen();
  }
}

function toggleHUD() {
  distractionsHidden = !distractionsHidden;
  const footer = document.querySelector('.footer');
  const fpsDiv = document.getElementById('fps-counter');

  if (distractionsHidden) {
    if (footer) footer.style.visibility = 'hidden';
    toggleDebug(false);
    if (fpsDiv) fpsDiv.style.visibility = 'hidden';
  } else {
    if (footer) footer.style.visibility = 'visible';
    toggleDebug(debugVisible);
    if (fpsDiv) fpsDiv.style.visibility = debugVisible ? 'visible' : 'hidden';
  }
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if ((key === '`' || key === '~') && !distractionsHidden) {
    debugVisible = !debugVisible;
    toggleDebug(debugVisible);
    const fpsDiv = document.getElementById('fps-counter');
    if (fpsDiv) fpsDiv.style.visibility = debugVisible ? 'visible' : 'hidden';

    if (activeCamera === godCamera || debugVisible) {
      enableFrustumDebug(scene, camera, getMesh());
    } else {
      disableFrustumDebug(scene);
    }
  }

  if (key === 'g' && !distractionsHidden) {
    activeCamera = activeCamera === camera ? godCamera : camera;
    if (activeCamera === godCamera || debugVisible) {
      enableFrustumDebug(scene, camera, getMesh());
    } else {
      disableFrustumDebug(scene);
    }
  }

  if (key === 'f' && !isEmbedMode) toggleFullscreen();
  if (key === 'h') toggleHUD();

  if (e.key === 'Escape') {
    const helpModal = document.getElementById('help-modal');
    if (helpModal && !helpModal.classList.contains('hidden')) {
      helpModal.classList.add('hidden');
      return;
    }
    postEmbedMessage('MATRIX_RAIN_CLOSE');
  }
});

let embedPointerWasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const pointerIsLocked = document.pointerLockElement !== null;
  if (isEmbedMode && embedPointerWasLocked && !pointerIsLocked) {
    postEmbedMessage('MATRIX_RAIN_CLOSE');
  }
  embedPointerWasLocked = pointerIsLocked;
});

/* ========= MOBILE TOUCH GESTURES ========= */
let lastTapTime = 0;
let longPressTimer;

window.addEventListener('touchstart', (e) => {
  // Ignore touches on active UI elements to prevent breaking links/buttons
  if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.help-modal-content')) return;

  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime;

  // Double Tap detection (under 300ms)
  if (!isEmbedMode && tapLength < 300 && tapLength > 0) {
    toggleFullscreen();
    clearTimeout(longPressTimer);
    e.preventDefault();
  } else {
    // Long Press detection (800ms hold)
    longPressTimer = setTimeout(() => {
      toggleHUD();
    }, 800);
  }
  lastTapTime = currentTime;
});

window.addEventListener('touchend', () => clearTimeout(longPressTimer));
window.addEventListener('touchmove', () => clearTimeout(longPressTimer));

/* ========= UI & MODAL LOGIC ========= */
const DEVLOG_URL = 'https://anshulsharma.org/posts/matrix-rain/';

const devlogFooter = document.getElementById('devlog-link-footer');
const devlogModal = document.getElementById('devlog-link-modal');
if (devlogFooter && !devlogFooter.getAttribute('href')) devlogFooter.href = DEVLOG_URL;
if (devlogModal && !devlogModal.getAttribute('href')) devlogModal.href = DEVLOG_URL;

const helpModal = document.getElementById('help-modal');
const helpToggle = document.getElementById('help-toggle');
const helpModalClose = document.getElementById('help-modal-close');

if (helpToggle && helpModal) {
  helpToggle.addEventListener('click', (e) => {
    e.preventDefault();
    helpModal.classList.toggle('hidden');
  });
}

if (helpModalClose && helpModal) {
  helpModalClose.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });
}

// Close on backdrop click
if (helpModal) {
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });
}
