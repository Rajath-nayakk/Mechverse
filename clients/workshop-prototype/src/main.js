import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { INITIAL_COMPONENTS } from './components-data.js';
import { VehicleConditionSystem } from './condition-system.js';
import { GarageWorld } from './garage-world.js';
import { VehicleModel } from './vehicle-model.js';
import { InteractionManager } from './interaction-manager.js';

// Setup Application State
const components = JSON.parse(JSON.stringify(INITIAL_COMPONENTS));
const conditionSystem = new VehicleConditionSystem();

// Canvas & Three.js Renderer
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.fog = new THREE.FogExp2(0x0d1117, 0.035);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.8, 2.2, 4.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath floor
controls.minDistance = 0.8;
controls.maxDistance = 14.0;
controls.target.set(0, 1.0, 0);

// Initialize 3D Garage & Vehicle
const garage = new GarageWorld(scene);
const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

// Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : (type === 'success' ? '✅' : 'ℹ️')}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Interaction Manager
const interaction = new InteractionManager(
  camera,
  scene,
  renderer.domElement,
  components,
  vehicle,
  conditionSystem,
  updateInspectionUI,
  showToast
);

// UI DOM References
const compTitleEl = document.getElementById('comp-title');
const compGuidEl = document.getElementById('comp-guid');
const compCategoryEl = document.getElementById('comp-category');
const compMassEl = document.getElementById('comp-mass');
const compFastenerEl = document.getElementById('comp-fastener');
const compTorqueEl = document.getElementById('comp-torque');
const compWearEl = document.getElementById('comp-wear');
const compWearFillEl = document.getElementById('comp-wear-fill');
const compCleanEl = document.getElementById('comp-clean');
const compCleanFillEl = document.getElementById('comp-clean-fill');
const compStatusEl = document.getElementById('comp-status');
const compDescriptionEl = document.getElementById('comp-description');
const dynamicActionsEl = document.getElementById('dynamic-actions');
const torqueSliderEl = document.getElementById('torque-slider');
const torqueDisplayEl = document.getElementById('torque-display');

// Update Inspection HUD
function updateInspectionUI(comp) {
  if (!comp) {
    compTitleEl.textContent = 'Select a component';
    compGuidEl.textContent = 'Hover and click any vehicle component';
    compCategoryEl.textContent = '--';
    compMassEl.textContent = '--';
    compFastenerEl.textContent = '--';
    compTorqueEl.textContent = '--';
    compWearEl.textContent = '--';
    compCleanEl.textContent = '--';
    compStatusEl.textContent = '--';
    compDescriptionEl.textContent = 'Click on the Oil Filter, Front Wheel, Brake Rotor, Quarter Panel, or Fuel Flap to inspect mechanical specifications, torque values, and condition.';
    dynamicActionsEl.innerHTML = '';
    return;
  }

  compTitleEl.textContent = comp.name;
  compGuidEl.textContent = `Part No: ${comp.partNumber}`;
  compCategoryEl.textContent = comp.category;
  compMassEl.textContent = `${comp.massKg} kg`;

  if (comp.fastener) {
    compFastenerEl.textContent = `${comp.fastener.driveType} (${comp.fastener.socketSizeMm}mm)`;
    compTorqueEl.textContent = `${comp.fastener.currentTorqueNm.toFixed(1)} / ${comp.fastener.targetTorqueNm} N*m`;
  } else {
    compFastenerEl.textContent = 'No Fasteners';
    compTorqueEl.textContent = 'N/A';
  }

  compWearEl.textContent = `${comp.wearPercentage.toFixed(0)}%`;
  compWearFillEl.style.width = `${comp.wearPercentage}%`;

  compCleanEl.textContent = `${comp.cleanlinessPercentage.toFixed(0)}%`;
  compCleanFillEl.style.width = `${comp.cleanlinessPercentage}%`;

  compStatusEl.textContent = comp.installed ? 'Installed' : 'Detached';
  compDescriptionEl.textContent = comp.description;

  // Build dynamic action buttons
  buildDynamicActions(comp);
  updateConditionHUD();
}

function buildDynamicActions(comp) {
  dynamicActionsEl.innerHTML = '';

  // Torque Wrench Action
  if (comp.fastener && comp.installed) {
    const btnTorque = document.createElement('button');
    btnTorque.className = 'action-btn';
    btnTorque.innerHTML = `<span>🔧</span> Apply Torque (${interaction.configuredWrenchTorqueNm} N*m)`;
    btnTorque.onclick = () => interaction.applyTorqueWrench(comp);
    dynamicActionsEl.appendChild(btnTorque);

    const btnLoosen = document.createElement('button');
    btnLoosen.className = 'action-btn secondary';
    btnLoosen.innerHTML = `<span>↺</span> Loosen Fasteners`;
    btnLoosen.onclick = () => interaction.loosenFasteners(comp);
    dynamicActionsEl.appendChild(btnLoosen);
  }

  // Remove / Install Action
  if (comp.installed) {
    const btnRemove = document.createElement('button');
    btnRemove.className = 'action-btn danger';
    btnRemove.innerHTML = `<span>⏏</span> Dismount / Remove Component`;
    btnRemove.onclick = () => interaction.removeComponent(comp);
    dynamicActionsEl.appendChild(btnRemove);
  } else {
    const btnInstall = document.createElement('button');
    btnInstall.className = 'action-btn';
    btnInstall.innerHTML = `<span>⏎</span> Install Component`;
    btnInstall.onclick = () => interaction.installComponent(comp);
    dynamicActionsEl.appendChild(btnInstall);
  }

  // Clean / Wash Action
  if (comp.cleanlinessPercentage < 100) {
    const btnWash = document.createElement('button');
    btnWash.className = 'action-btn secondary';
    btnWash.innerHTML = `<span>🚿</span> Wash & Degrease Component`;
    btnWash.onclick = () => interaction.washComponent(comp);
    dynamicActionsEl.appendChild(btnWash);
  }

  // Dent Puller Action
  if (comp.dentDepthMm !== undefined && comp.dentDepthMm > 0) {
    const btnDent = document.createElement('button');
    btnDent.className = 'action-btn';
    btnDent.innerHTML = `<span>🔨</span> Pull Dent (${comp.dentDepthMm.toFixed(1)} mm depth)`;
    btnDent.onclick = () => interaction.pullDent(comp);
    dynamicActionsEl.appendChild(btnDent);
  }

  // Refuel Action
  if (comp.id === 'fuel_filler_assembly') {
    const btnFuel = document.createElement('button');
    btnFuel.className = 'action-btn';
    btnFuel.innerHTML = `<span>⛽</span> Operate Fuel Dispenser (+10L)`;
    btnFuel.onclick = () => interaction.refuelVehicle(comp);
    dynamicActionsEl.appendChild(btnFuel);
  }
}

// Update 12-Category Condition HUD in Bottom Bar
function updateConditionHUD() {
  const cond = conditionSystem.state;
  document.getElementById('cond-mech').textContent = `${cond.mechanical}%`;
  document.getElementById('cond-elec').textContent = `${cond.electrical}%`;
  document.getElementById('cond-struct').textContent = `${cond.structural}%`;
  document.getElementById('cond-body').textContent = `${cond.bodyPanel}%`;
  document.getElementById('cond-paint').textContent = `${cond.paint}%`;
  document.getElementById('cond-clean').textContent = `${cond.cleanliness}%`;

  const badge = document.getElementById('safety-badge');
  if (cond.isRoadworthySafe) {
    badge.className = 'safety-badge pass';
    badge.textContent = 'ROADWORTHY: PASSED';
  } else {
    badge.className = 'safety-badge fail';
    badge.textContent = 'ROADWORTHY: FAILED';
  }
}

// Hydraulic Lift Buttons
document.getElementById('btn-lift-up').addEventListener('click', () => {
  garage.setLiftHeight(1.6);
  showToast('Raising hydraulic vehicle lift to 1.6m...', 'info');
  document.getElementById('lift-height-display').textContent = '1.6m (Raised)';
});

document.getElementById('btn-lift-down').addEventListener('click', () => {
  garage.setLiftHeight(0.0);
  showToast('Lowering hydraulic lift to floor...', 'info');
  document.getElementById('lift-height-display').textContent = '0.0m (Floor)';
});

// Tool Selection Buttons
const toolButtons = document.querySelectorAll('.tool-btn');
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const toolId = btn.dataset.tool;
    interaction.setTool(toolId);
    showToast(`Equipped tool: ${btn.textContent.trim()}`, 'info');

    if (toolId === 'TOOL_TORQUE_17') {
      torqueSliderEl.value = 120;
      torqueDisplayEl.textContent = '120 N*m';
    } else if (toolId === 'TOOL_TORQUE_24') {
      torqueSliderEl.value = 25;
      torqueDisplayEl.textContent = '25 N*m';
    }
    if (interaction.selectedComponent) {
      buildDynamicActions(interaction.selectedComponent);
    }
  });
});

// Torque Setting Slider
torqueSliderEl.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  torqueDisplayEl.textContent = `${val} N*m`;
  interaction.setWrenchTorque(val);
  if (interaction.selectedComponent) {
    buildDynamicActions(interaction.selectedComponent);
  }
});

// Keyboard Navigation (WASD to pan target)
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function handleKeyboardMovement(dt) {
  const speed = 3.0 * dt;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (keys['w']) {
    camera.position.addScaledVector(forward, speed);
    controls.target.addScaledVector(forward, speed);
  }
  if (keys['s']) {
    camera.position.addScaledVector(forward, -speed);
    controls.target.addScaledVector(forward, -speed);
  }
  if (keys['a']) {
    camera.position.addScaledVector(right, -speed);
    controls.target.addScaledVector(right, -speed);
  }
  if (keys['d']) {
    camera.position.addScaledVector(right, speed);
    controls.target.addScaledVector(right, speed);
  }
}

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial Telemetry Update
conditionSystem.updateFromComponents(components);
updateInspectionUI(components[0]); // Select oil filter by default

// Main Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  handleKeyboardMovement(dt);
  garage.update(dt);
  controls.update();

  renderer.render(scene, camera);
}

animate();
showToast('MECHVERSE Workshop Ready. Click components to inspect and service.', 'success');
