import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { INITIAL_COMPONENTS } from './components-data.js';
import { VehicleConditionSystem } from './condition-system.js';
import { GarageWorld } from './garage-world.js';
import { VehicleModel } from './vehicle-model.js';
import { InteractionManager } from './interaction-manager.js';
import { SOCKET_SET, AVAILABLE_TOOLS } from './socket-system.js';

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

// Notification Toast System
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
const currentSocketDisplayEl = document.getElementById('current-socket-display');

// Populate Socket Selection Tray
function initSocketTray() {
  const socketTrayEl = document.getElementById('socket-tray');
  socketTrayEl.innerHTML = '';

  SOCKET_SET.forEach(socket => {
    const btn = document.createElement('button');
    btn.className = `socket-badge ${socket.id === interaction.activeSocketId ? 'active' : ''}`;
    btn.dataset.socketId = socket.id;
    btn.innerHTML = `<span style="font-weight:700;">${socket.sizeMm}mm</span><span style="font-size:9px;color:var(--text-muted);">${socket.driveSize}</span>`;
    btn.onclick = () => {
      document.querySelectorAll('.socket-badge').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      interaction.setSocket(socket.id);
      currentSocketDisplayEl.textContent = `${socket.sizeMm}mm (${socket.driveSize})`;
      torqueDisplayEl.textContent = `${interaction.configuredWrenchTorqueNm} N*m`;
      torqueSliderEl.value = interaction.configuredWrenchTorqueNm;
      if (interaction.selectedComponent) {
        updateInspectionUI(interaction.selectedComponent);
      }
    };
    socketTrayEl.appendChild(btn);
  });
}

initSocketTray();

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
    compDescriptionEl.textContent = 'Click on the Oil Filter, Front Wheel, Brake Rotor, Quarter Panel, Interior Cabin, or Windshield to inspect.';
    dynamicActionsEl.innerHTML = '';
    return;
  }

  compTitleEl.textContent = comp.name;
  compGuidEl.textContent = `Part No: ${comp.partNumber}`;
  compCategoryEl.textContent = comp.category;
  compMassEl.textContent = `${comp.massKg} kg`;

  if (comp.fastener) {
    compFastenerEl.textContent = `${comp.fastener.driveType} (${comp.fastener.socketSizeMm}mm) | M${comp.fastener.nominalDiameterMm}x${comp.fastener.threadPitchMm}`;
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

  const activeTool = interaction.getActiveTool();
  const activeSocket = interaction.getActiveSocket();

  // Fastener Threading and Torquing Controls
  if (comp.fastener && comp.installed) {
    // Clamping Force Display
    if (comp.fastener.currentTorqueNm > 0) {
      const diameterMeters = comp.fastener.nominalDiameterMm / 1000.0;
      const clampN = comp.fastener.currentTorqueNm / (comp.fastener.torqueCoeffK * diameterMeters);
      const clampDiv = document.createElement('div');
      clampDiv.style.cssText = 'background: rgba(56, 139, 253, 0.1); border: 1px solid var(--accent-blue); padding: 8px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); color: var(--accent-cyan); margin-bottom: 4px;';
      clampDiv.innerHTML = `<strong>Clamping Preload (F = T/(K*d)):</strong> ${clampN.toFixed(0)} N (~${(clampN / 9.806).toFixed(0)} kgf)`;
      dynamicActionsEl.appendChild(clampDiv);
    }

    // Thread Engagement Bar
    const engPercent = (comp.fastener.currentEngagementMm / comp.fastener.engagementLengthMm) * 100;
    const engDiv = document.createElement('div');
    engDiv.style.cssText = 'margin-bottom: 6px; font-size: 11px;';
    engDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-bottom:2px;">
        <span>THREAD ENGAGEMENT</span>
        <span style="font-family:var(--font-mono); font-weight:700; color:var(--text-main);">${comp.fastener.currentEngagementMm.toFixed(1)} / ${comp.fastener.engagementLengthMm.toFixed(1)} mm</span>
      </div>
      <div class="progress-bar-container"><div class="progress-fill" style="width: ${engPercent}%;"></div></div>
    `;
    dynamicActionsEl.appendChild(engDiv);

    // Threading Buttons
    const threadRow = document.createElement('div');
    threadRow.style.cssText = 'display: flex; gap: 6px; margin-bottom: 6px;';

    const btnThreadIn = document.createElement('button');
    btnThreadIn.className = 'action-btn secondary';
    btnThreadIn.style.flex = '1';
    btnThreadIn.innerHTML = `<span>↻</span> Thread In (+4 turns)`;
    btnThreadIn.onclick = () => interaction.threadInFastener(comp, 4.0);
    threadRow.appendChild(btnThreadIn);

    const btnUnthread = document.createElement('button');
    btnUnthread.className = 'action-btn secondary';
    btnUnthread.style.flex = '1';
    btnUnthread.innerHTML = `<span>↺</span> Unthread (-4 turns)`;
    btnUnthread.onclick = () => interaction.unthreadFastener(comp, 4.0);
    threadRow.appendChild(btnUnthread);

    dynamicActionsEl.appendChild(threadRow);

    // Apply Torque Button
    const btnTorque = document.createElement('button');
    btnTorque.className = 'action-btn';
    btnTorque.innerHTML = `<span>🔧</span> Apply Torque (${interaction.configuredWrenchTorqueNm} N*m with ${activeSocket ? activeSocket.sizeMm + 'mm' : 'no'} socket)`;
    btnTorque.onclick = () => interaction.applyTorqueWrench(comp);
    dynamicActionsEl.appendChild(btnTorque);
  }

  // Surface Cleaning Section
  if (comp.surfaceId) {
    const surface = interaction.cleaningSim.getSurface(comp.surfaceId);
    if (surface) {
      const surfaceCard = document.createElement('div');
      surfaceCard.style.cssText = 'background: rgba(33, 38, 45, 0.7); border: 1px solid var(--bg-panel-border); border-radius: 6px; padding: 10px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;';
      
      let contList = Object.entries(surface.contaminations)
        .filter(([_, val]) => val > 0)
        .map(([k, val]) => `<span style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 5px; border-radius:3px;">${k}: ${val.toFixed(0)}%</span>`)
        .join(' ');
      
      if (!contList) contList = '<span style="color:var(--accent-green);font-size:11px;">Pristine Clean</span>';

      surfaceCard.innerHTML = `
        <div style="font-size:11px; font-weight:700; color:var(--accent-cyan); text-transform:uppercase;">Surface Contamination (${surface.material})</div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">${contList}</div>
      `;

      // Context clean action button for active cleaning tool
      if (activeTool && activeTool.category === 'CLEANING') {
        const btnClean = document.createElement('button');
        btnClean.className = 'action-btn';
        btnClean.innerHTML = `<span>🚿</span> Apply ${activeTool.name} on ${surface.name}`;
        btnClean.onclick = () => interaction.cleanTargetSurface(surface.id, activeTool.id);
        surfaceCard.appendChild(btnClean);
      }

      dynamicActionsEl.appendChild(surfaceCard);
    }
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

    // Update socket display
    const activeSocket = interaction.getActiveSocket();
    if (activeSocket) {
      currentSocketDisplayEl.textContent = `${activeSocket.sizeMm}mm (${activeSocket.driveSize})`;
      document.querySelectorAll('.socket-badge').forEach(sb => {
        sb.classList.toggle('active', sb.dataset.socketId === activeSocket.id);
      });
    }

    torqueSliderEl.value = interaction.configuredWrenchTorqueNm;
    torqueDisplayEl.textContent = `${interaction.configuredWrenchTorqueNm} N*m`;

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
showToast('MECHVERSE Workshop Ready. Select tools & sockets to inspect and service components.', 'success');
