import * as THREE from 'three';

let isLocked = false;
let allowUnlockedKeyboard = false;
let pitch = 0;
let yaw = 0;

export let isMobileActive = false;

export function setMobileActive(active) {
  isMobileActive = active;
}

const _dir = new THREE.Vector3();

export const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false,
};

const pressedKeyboardKeys = new Set();

function syncKeyboardMovement() {
  keys.w = pressedKeyboardKeys.has('w') || pressedKeyboardKeys.has('arrowup');
  keys.a = pressedKeyboardKeys.has('a') || pressedKeyboardKeys.has('arrowleft');
  keys.s = pressedKeyboardKeys.has('s') || pressedKeyboardKeys.has('arrowdown');
  keys.d = pressedKeyboardKeys.has('d') || pressedKeyboardKeys.has('arrowright');
  keys.space = pressedKeyboardKeys.has(' ');
  keys.shift = pressedKeyboardKeys.has('shift');
}

// Movement speed
const speed = 30.0;
// Mouse sensitivity
const sensitivity = 0.002;

/**
 * Initializes the FPS camera controls.
 * @param {THREE.Camera} camera The main camera to control
 * @param {HTMLElement} domElement The element to attach pointer lock
 * @param {{ allowUnlockedKeyboard?: boolean }} [options] Optional control behavior
 */
let mainCamera;

export function setupFPSCamera(camera, domElement, options = {}) {
  mainCamera = camera;
  allowUnlockedKeyboard = options.allowUnlockedKeyboard ?? false;
  // Extract initial rotation
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  pitch = euler.x;
  yaw = euler.y;

  // Request pointer lock on click
  domElement.addEventListener('click', (event) => {
    // Ignore clicks on UI elements
    if (event.target.closest('a') || event.target.closest('button') || event.target.closest('.help-modal-content')) return;
    
    // Ignore if modal is open
    const helpModal = document.getElementById('help-modal');
    if (helpModal && !helpModal.classList.contains('hidden')) return;

    if (!isLocked) {
      domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === domElement;
  });

  document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    simulateMouseMove(movementX, movementY);
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    pressedKeyboardKeys.add(key);
    syncKeyboardMovement();
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    pressedKeyboardKeys.delete(key);
    syncKeyboardMovement();
  });

  window.addEventListener('blur', () => {
    pressedKeyboardKeys.clear();
    syncKeyboardMovement();
  });
}

/**
 * Updates the camera position based on active keys.
 * @param {number} deltaTime Time elapsed since last frame in milliseconds
 * @param {THREE.Camera} camera The camera to move
 */
export function updateFPSCamera(deltaTime, camera) {
  if (!isLocked && !isMobileActive && !allowUnlockedKeyboard) return;

  // Cap deltaTime to avoid massive jumps during lag spikes
  const dt = Math.min(deltaTime / 1000, 0.1);
  const currentSpeed = speed * dt;

  const direction = _dir;
  direction.set(0, 0, 0);

  if (keys.w) direction.z -= 1;
  if (keys.s) direction.z += 1;
  if (keys.a) direction.x -= 1;
  if (keys.d) direction.x += 1;
  if (keys.space) direction.y += 1;
  if (keys.shift) direction.y -= 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    camera.translateX(direction.x * currentSpeed);
    camera.translateY(direction.y * currentSpeed);
    camera.translateZ(direction.z * currentSpeed);
  }
}

export function simulateMouseMove(movementX, movementY) {
  if (!mainCamera) return;

  yaw -= movementX * sensitivity;
  pitch -= movementY * sensitivity;

  // Constrain pitch to avoid flipping over
  const maxPitch = Math.PI / 2 - 0.01;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

  const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
  mainCamera.quaternion.setFromEuler(euler);
}
