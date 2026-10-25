import * as THREE from '../vendor/three.module.js';

/**
 * MECHVERSE - Dual-Mode Workshop Navigation Controller
 * 
 * Supports:
 * 1. ORBIT INSPECTOR MODE: Rotate around vehicle with right-drag, zoom with wheel, pan with WASD
 * 2. FIRST-PERSON TECHNICIAN WALK MODE: Walk inside garage with WASD, Sprint (Shift), Crouch (Ctrl), Eye-level view
 */

export class WorkshopControls {
  constructor(camera, domElement, orbitControls) {
    this.camera = camera;
    this.domElement = domElement;
    this.orbitControls = orbitControls;

    this.mode = 'ORBIT'; // 'ORBIT' or 'FIRST_PERSON'
    
    // First-person physics & movement state
    this.playerPos = new THREE.Vector3(2.8, 1.7, 3.2); // Start standing beside car
    this.yaw = -Math.PI / 4;
    this.pitch = -0.15;
    this.isCrouched = false;
    this.isSprinting = false;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      crouch: false
    };

    this.isRightMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) return;

      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = true; break;
        case 'ControlLeft':
        case 'ControlRight':
        case 'KeyC': this.keys.crouch = true; break;
        case 'KeyV': this.toggleCameraMode(); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = false; break;
        case 'ControlLeft':
        case 'ControlRight':
        case 'KeyC': this.keys.crouch = false; break;
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.mode === 'FIRST_PERSON' && this.isRightMouseDown) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const sensitivity = 0.0035;
        this.yaw -= deltaX * sensitivity;
        this.pitch -= deltaY * sensitivity;
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
      }
    });

    // Disable default browser context menu on canvas
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toggleCameraMode() {
    if (this.mode === 'ORBIT') {
      this.mode = 'FIRST_PERSON';
      this.orbitControls.enabled = false;
      // Initialize walk position from current camera
      this.playerPos.copy(this.camera.position);
      this.playerPos.y = this.keys.crouch ? 1.0 : 1.7;
    } else {
      this.mode = 'ORBIT';
      this.orbitControls.enabled = true;
      this.orbitControls.target.set(0, 0.9, 0);
    }
    if (this.onModeChange) this.onModeChange(this.mode);
    return this.mode;
  }

  setMode(newMode) {
    if (newMode !== this.mode) {
      this.toggleCameraMode();
    }
  }

  update(deltaTime) {
    if (this.mode === 'ORBIT') {
      this.orbitControls.update();
      return;
    }

    // FIRST_PERSON Mode Player Movement
    const speed = this.keys.sprint ? 5.2 : (this.keys.crouch ? 1.4 : 2.6); // m/s
    const moveVector = new THREE.Vector3();

    // Direction vectors from yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    if (this.keys.forward) moveVector.add(forward);
    if (this.keys.backward) moveVector.sub(forward);
    if (this.keys.right) moveVector.add(right);
    if (this.keys.left) moveVector.sub(right);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(speed * deltaTime);
      this.playerPos.add(moveVector);
    }

    // Clamp within garage boundaries ([-16.5, 16.5])
    this.playerPos.x = Math.max(-16.0, Math.min(16.0, this.playerPos.x));
    this.playerPos.z = Math.max(-16.0, Math.min(16.0, this.playerPos.z));

    // Eye level height: standing = 1.7m, crouching = 1.0m
    const targetY = this.keys.crouch ? 0.95 : 1.70;
    this.playerPos.y += (targetY - this.playerPos.y) * 10.0 * deltaTime;

    // Apply to camera
    this.camera.position.copy(this.playerPos);

    // Calculate look target from yaw and pitch
    const lookTarget = new THREE.Vector3(
      this.playerPos.x - Math.sin(this.yaw) * Math.cos(this.pitch),
      this.playerPos.y + Math.sin(this.pitch),
      this.playerPos.z - Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(lookTarget);
  }
}
