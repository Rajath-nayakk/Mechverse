import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { INITIAL_COMPONENTS } from './components-data.js';
import { VehicleConditionSystem } from './condition-system.js';
import { GarageWorld } from './garage-world.js';
import { VehicleModel } from './vehicle-model.js';
import { InteractionManager } from './interaction-manager.js';
import { SOCKET_SET, AVAILABLE_TOOLS } from './socket-system.js';
import { VehicleElectricalSystem } from './electrical-system.js';
import { DigitalMultimeter, MULTIMETER_MODES, METER_LEAD_JACKS, TEST_POINTS } from './multimeter-system.js';
import { ElectricalFaultManager, FAULT_TYPES } from './electrical-faults.js';
import { ElectricalMissionManager, MISSIONS } from './electrical-missions.js';
import { EngineSimulation, MECHANICAL_FAULTS } from './engine-simulation.js';
import { PanelRestorationSystem, PAINT_LAYERS } from './restoration-system.js';
import { PersistenceSystem } from './persistence-system.js';
import { WorkshopControls } from './workshop-controls.js';

// Setup Application State
const components = JSON.parse(JSON.stringify(INITIAL_COMPONENTS));
const conditionSystem = new VehicleConditionSystem();
const electricalSystem = new VehicleElectricalSystem();
const faultManager = new ElectricalFaultManager(electricalSystem);
const multimeter = new DigitalMultimeter(electricalSystem);
const missionManager = new ElectricalMissionManager(electricalSystem, faultManager, multimeter);
const engineSim = new EngineSimulation();
const restoSystem = new PanelRestorationSystem();
const persistence = new PersistenceSystem();

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// Procedural Workshop Environment for PBR metallic reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envCanvas = document.createElement('canvas');
envCanvas.width = 512;
envCanvas.height = 256;
const envCtx = envCanvas.getContext('2d');
if (envCtx) {
  const grad = envCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#79b8ff'); // Ceiling LED ambient
  grad.addColorStop(0.3, '#30363d'); // Upper walls
  grad.addColorStop(0.5, '#161b22'); // Horizon
  grad.addColorStop(0.7, '#21262d'); // Workshop floor
  grad.addColorStop(1, '#0d1117');
  envCtx.fillStyle = grad;
  envCtx.fillRect(0, 0, 512, 256);
  // Overhead strip reflections
  envCtx.fillStyle = '#ffffff';
  envCtx.fillRect(80, 20, 140, 24);
  envCtx.fillRect(280, 20, 140, 24);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const envRt = pmremGenerator.fromEquirectangular(envTex);
  scene.environment = envRt.texture;
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath floor
controls.minDistance = 0.8;
controls.maxDistance = 14.0;
controls.target.set(0, 0.85, 0);

// Workshop Dual-Mode Controls (Orbit + First-Person Walk)
const workshopControls = new WorkshopControls(camera, renderer.domElement, controls);

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
  showToast,
  engineSim,
  restoSystem
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

  // Opening Panels & Mechanisms Actions
  if (comp.id === 'bonnet_hood') {
    const btnBonnet = document.createElement('button');
    btnBonnet.className = 'action-btn';
    btnBonnet.innerHTML = `<span>🚘</span> ${vehicle.hinges.bonnet.isOpen ? 'Close Engine Bonnet' : 'Open Engine Bonnet (Engine Bay Access)'}`;
    btnBonnet.onclick = () => {
      const open = vehicle.toggleBonnet();
      comp.isOpen = open;
      showToast(open ? 'Bonnet opened.' : 'Bonnet closed and latched.', 'info');
      buildDynamicActions(comp);
    };
    dynamicActionsEl.appendChild(btnBonnet);
  }

  if (comp.id === 'door_front_left' || comp.id === 'door_front_right') {
    const doorKey = comp.id === 'door_front_left' ? 'doorFL' : 'doorFR';
    const btnDoor = document.createElement('button');
    btnDoor.className = 'action-btn';
    btnDoor.innerHTML = `<span>🚪</span> ${vehicle.hinges[doorKey].isOpen ? 'Close Door' : 'Open Door (Cabin Access)'}`;
    btnDoor.onclick = () => {
      const open = vehicle.toggleDoor(doorKey);
      comp.isOpen = open;
      showToast(open ? 'Door opened.' : 'Door closed.', 'info');
      buildDynamicActions(comp);
    };
    dynamicActionsEl.appendChild(btnDoor);
  }

  if (comp.id === 'boot_trunk') {
    const btnTrunk = document.createElement('button');
    btnTrunk.className = 'action-btn';
    btnTrunk.innerHTML = `<span>📦</span> ${vehicle.hinges.trunk.isOpen ? 'Close Rear Trunk' : 'Open Rear Trunk'}`;
    btnTrunk.onclick = () => {
      const open = vehicle.toggleTrunk();
      comp.isOpen = open;
      showToast(open ? 'Trunk opened.' : 'Trunk closed.', 'info');
      buildDynamicActions(comp);
    };
    dynamicActionsEl.appendChild(btnTrunk);
  }

  if (comp.id === 'engine_oil_fill_cap') {
    const btnCap = document.createElement('button');
    btnCap.className = 'action-btn';
    btnCap.innerHTML = `<span>🛢️</span> ${comp.isOpen ? 'Thread On & Seal Oil Cap' : 'Remove Engine Oil Filler Cap'}`;
    btnCap.onclick = () => {
      comp.isOpen = !comp.isOpen;
      engineSim.isOilFillCapOpen = comp.isOpen;
      showToast(comp.isOpen ? 'Oil filler cap removed.' : 'Oil filler cap installed and sealed.', 'info');
      buildDynamicActions(comp);
    };
    dynamicActionsEl.appendChild(btnCap);

    if (comp.isOpen) {
      const btnPour = document.createElement('button');
      btnPour.className = 'action-btn';
      btnPour.innerHTML = `<span>➕</span> Pour 1.0L 5W-30 Full Synthetic Oil (${engineSim.engineOilLiters.toFixed(1)} / ${engineSim.specs.oilCapacityLiters} L)`;
      btnPour.onclick = () => {
        const refill = engineSim.refillOil(1.0);
        if (refill.success) {
          showToast(`Added 1.0L oil. Current level: ${refill.currentLevelLiters.toFixed(1)}L (Condition: ${refill.oilCondition.toFixed(0)}%).`, 'success');
        } else {
          showToast(refill.error, 'error');
        }
        buildDynamicActions(comp);
      };
      dynamicActionsEl.appendChild(btnPour);
    }
  }

  // Diagnostics & Restoration Active Tool Buttons
  if (activeTool && activeTool.id === 'TOOL_COMPRESSION_TESTER') {
    const btnComp = document.createElement('button');
    btnComp.className = 'action-btn';
    btnComp.style.background = 'rgba(57, 197, 187, 0.15)';
    btnComp.style.borderColor = '#39c5bb';
    btnComp.innerHTML = `<span>⏱️</span> Run 4-Pulse Compression Test`;
    btnComp.onclick = () => interaction.runCompressionTest(1);
    dynamicActionsEl.appendChild(btnComp);
  } else if (activeTool && activeTool.id === 'TOOL_LEAKDOWN_TESTER') {
    const btnLeak = document.createElement('button');
    btnLeak.className = 'action-btn';
    btnLeak.style.background = 'rgba(57, 197, 187, 0.15)';
    btnLeak.style.borderColor = '#39c5bb';
    btnLeak.innerHTML = `<span>💨</span> Run 100 PSI Cylinder Leak-Down Test`;
    btnLeak.onclick = () => interaction.runLeakdownTest(1);
    dynamicActionsEl.appendChild(btnLeak);
  } else if (activeTool && activeTool.id === 'TOOL_WELDING_GUN') {
    const btnWeld = document.createElement('button');
    btnWeld.className = 'action-btn';
    btnWeld.style.background = 'rgba(210, 153, 34, 0.15)';
    btnWeld.style.borderColor = '#d29922';
    btnWeld.innerHTML = `<span>⚡</span> MIG Weld Seam / Bracket on ${comp.name}`;
    btnWeld.onclick = () => interaction.runWelding(comp);
    dynamicActionsEl.appendChild(btnWeld);
  } else if (activeTool && activeTool.id === 'TOOL_SPRAY_GUN') {
    const btnPaint = document.createElement('button');
    btnPaint.className = 'action-btn';
    btnPaint.style.background = 'rgba(188, 140, 255, 0.15)';
    btnPaint.style.borderColor = '#bc8cff';
    btnPaint.innerHTML = `<span>🎨</span> Spray Refinish Basecoat on ${comp.name}`;
    btnPaint.onclick = () => interaction.runSprayPaint(comp);
    dynamicActionsEl.appendChild(btnPaint);
  } else if (activeTool && activeTool.id === 'TOOL_WIRE_BRUSH_GRINDER') {
    const btnGrind = document.createElement('button');
    btnGrind.className = 'action-btn';
    btnGrind.innerHTML = `<span>⚙️</span> Grind Rust to Bare Metal on ${comp.name}`;
    btnGrind.onclick = () => interaction.runGrindRust(comp);
    dynamicActionsEl.appendChild(btnGrind);
  }

  // Electrical Component Multimeter Probing Action
  if (comp.testPoints && comp.testPoints.length > 0) {
    const btnProbe = document.createElement('button');
    btnProbe.className = 'action-btn';
    btnProbe.style.background = 'rgba(241, 196, 15, 0.15)';
    btnProbe.style.borderColor = '#f1c40f';
    btnProbe.innerHTML = `<span>⚡</span> Probe with Multimeter (${comp.testPoints[0]})`;
    btnProbe.onclick = () => {
      // Auto-equip multimeter
      const dmmBtn = document.querySelector('.tool-btn[data-tool="TOOL_MULTIMETER"]');
      if (dmmBtn) dmmBtn.click();
      
      const redSelect = document.getElementById('dmm-red-probe-select');
      const blackSelect = document.getElementById('dmm-black-probe-select');
      if (redSelect && blackSelect) {
        redSelect.value = comp.testPoints[0];
        blackSelect.value = comp.testPoints[1] || 'GND';
        multimeter.connectProbes(redSelect.value, blackSelect.value);
        refreshDMMDisplay();
      }
      showToast(`Multimeter probes connected to ${comp.testPoints[0]} and ${comp.testPoints[1] || 'GND'}.`, 'success');
    };
    dynamicActionsEl.appendChild(btnProbe);
  }
}

// Update 12-Category Condition HUD in Bottom Bar
function updateConditionHUD() {
  conditionSystem.updateElectricalCondition(electricalSystem, faultManager);
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

    // Show / Hide Multimeter Panel
    const dmmPanel = document.getElementById('dmm-panel');
    if (dmmPanel) {
      dmmPanel.style.display = (toolId === 'TOOL_MULTIMETER') ? 'block' : 'none';
      if (toolId === 'TOOL_MULTIMETER') {
        refreshDMMDisplay();
      }
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
conditionSystem.updateElectricalCondition(electricalSystem, faultManager);
updateInspectionUI(components[0]); // Select oil filter by default

// =========================================================
// ELECTRICAL SYSTEM & DMM UI INTERACTION LOGIC
// =========================================================

function refreshDMMDisplay() {
  const reading = multimeter.takeMeasurement();
  const valEl = document.getElementById('dmm-lcd-value');
  const unitEl = document.getElementById('dmm-lcd-unit');
  const modeTagEl = document.getElementById('dmm-lcd-mode-tag');
  const hazardEl = document.getElementById('dmm-lcd-hazard-tag');
  const msgEl = document.getElementById('dmm-lcd-message');
  const beeperEl = document.getElementById('dmm-beeper-icon');
  const fuseStatusEl = document.getElementById('dmm-fuse-status');

  if (valEl) valEl.textContent = reading.display;
  if (unitEl) unitEl.textContent = reading.unit;
  if (modeTagEl) modeTagEl.textContent = multimeter.mode.replace('_', ' ');
  if (hazardEl) hazardEl.style.display = reading.isHazard ? 'inline-block' : 'none';
  if (msgEl) msgEl.textContent = reading.message || (multimeter.redProbePoint ? `PROBING: ${multimeter.redProbePoint} -> ${multimeter.blackProbePoint}` : 'LEADS OPEN');

  if (beeperEl) {
    beeperEl.classList.toggle('beeping', reading.isContinuityBeep);
  }

  if (fuseStatusEl) {
    if (multimeter.isMeterFuseBlown) {
      fuseStatusEl.className = 'badge-fuse blown';
      fuseStatusEl.textContent = '10A FUSE BLOWN';
    } else {
      fuseStatusEl.className = 'badge-fuse ok';
      fuseStatusEl.textContent = '10A FUSE OK';
    }
  }

  // Update Cockpit Voltage Display
  const cockpitVoltEl = document.getElementById('cockpit-voltage-badge');
  if (cockpitVoltEl) {
    const vBat = electricalSystem.battery.getTerminalVoltage();
    cockpitVoltEl.textContent = `${vBat.toFixed(2)}V`;
  }

  // Record evidence in active mission if open
  if (missionManager.activeMission) {
    missionManager.recordMeasurementEvidence();
    renderMissionObjectives();
  }
}

function initDMMControls() {
  // Populate Probe Test Points
  const redSelect = document.getElementById('dmm-red-probe-select');
  const blackSelect = document.getElementById('dmm-black-probe-select');

  if (redSelect && blackSelect) {
    redSelect.innerHTML = '<option value="">-- Disconnected --</option>';
    blackSelect.innerHTML = '<option value="">-- Disconnected --</option>';

    TEST_POINTS.forEach(tp => {
      const optR = document.createElement('option');
      optR.value = tp.id;
      optR.textContent = `${tp.id} (${tp.name})`;
      redSelect.appendChild(optR);

      const optB = document.createElement('option');
      optB.value = tp.id;
      optB.textContent = `${tp.id} (${tp.name})`;
      blackSelect.appendChild(optB);
    });

    // Default Probes: BAT_POS and GND
    redSelect.value = 'BAT_POS';
    blackSelect.value = 'GND';
    multimeter.connectProbes('BAT_POS', 'GND');

    redSelect.onchange = () => {
      multimeter.connectProbes(redSelect.value || null, blackSelect.value || null);
      refreshDMMDisplay();
    };
    blackSelect.onchange = () => {
      multimeter.connectProbes(redSelect.value || null, blackSelect.value || null);
      refreshDMMDisplay();
    };
  }

  // Mode Buttons
  const modeButtons = document.querySelectorAll('.dmm-mode-btn');
  modeButtons.forEach(btn => {
    btn.onclick = () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const modeKey = btn.dataset.mode;
      multimeter.setMode(MULTIMETER_MODES[modeKey]);
      refreshDMMDisplay();
    };
  });

  // Lead Jack Radios
  document.querySelectorAll('input[name="dmm-red-jack"]').forEach(radio => {
    radio.onchange = (e) => {
      multimeter.setLeadJack(e.target.value);
      refreshDMMDisplay();
    };
  });

  // Read Value Button
  const measureBtn = document.getElementById('dmm-measure-btn');
  if (measureBtn) {
    measureBtn.onclick = () => {
      refreshDMMDisplay();
      showToast(`Measurement taken: ${multimeter.lastReading.display} ${multimeter.lastReading.unit}`, 'info');
    };
  }

  // Replace Fuse Button
  const replaceFuseBtn = document.getElementById('dmm-replace-fuse-btn');
  if (replaceFuseBtn) {
    replaceFuseBtn.onclick = () => {
      const res = multimeter.replaceMeterFuse();
      refreshDMMDisplay();
      showToast(res.message, 'success');
    };
  }
}

function initCockpitControls() {
  // Ignition Key Buttons
  const ignButtons = document.querySelectorAll('.ign-btn');
  ignButtons.forEach(btn => {
    btn.onclick = () => {
      ignButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ignState = btn.dataset.ign;
      electricalSystem.setIgnition(ignState);
      refreshDMMDisplay();
      showToast(`Ignition switch turned to: ${ignState}`, 'info');
      updateConditionHUD();
    };
  });

  // Toggle Switches
  const btnHeadlights = document.getElementById('btn-toggle-headlights');
  const statusHeadlights = document.getElementById('status-headlights');
  if (btnHeadlights && statusHeadlights) {
    btnHeadlights.onclick = () => {
      electricalSystem.headlightSwitch = !electricalSystem.headlightSwitch;
      electricalSystem.solveNetwork();
      statusHeadlights.textContent = electricalSystem.headlightSwitch ? 'ON' : 'OFF';
      statusHeadlights.className = `switch-status ${electricalSystem.headlightSwitch ? 'on' : 'off'}`;
      refreshDMMDisplay();
    };
  }

  const btnAuxLights = document.getElementById('btn-toggle-auxlights');
  const statusAuxLights = document.getElementById('status-auxlights');
  if (btnAuxLights && statusAuxLights) {
    btnAuxLights.onclick = () => {
      electricalSystem.auxLightSwitch = !electricalSystem.auxLightSwitch;
      electricalSystem.solveNetwork();
      statusAuxLights.textContent = electricalSystem.auxLightSwitch ? 'ON' : 'OFF';
      statusAuxLights.className = `switch-status ${electricalSystem.auxLightSwitch ? 'on' : 'off'}`;
      refreshDMMDisplay();
    };
  }

  const btnDomeLight = document.getElementById('btn-toggle-domelight');
  const statusDomeLight = document.getElementById('status-domelight');
  if (btnDomeLight && statusDomeLight) {
    btnDomeLight.onclick = () => {
      electricalSystem.cabinDomeSwitch = !electricalSystem.cabinDomeSwitch;
      electricalSystem.solveNetwork();
      statusDomeLight.textContent = electricalSystem.cabinDomeSwitch ? 'ON' : 'OFF';
      statusDomeLight.className = `switch-status ${electricalSystem.cabinDomeSwitch ? 'on' : 'off'}`;
      refreshDMMDisplay();
    };
  }
}

function renderMissionObjectives() {
  const listEl = document.getElementById('mission-objectives-list');
  if (!listEl || !missionManager.activeMission) return;

  listEl.innerHTML = '';
  missionManager.activeMission.objectives.forEach(obj => {
    const li = document.createElement('li');
    li.className = `objective-item ${obj.completed ? 'done' : ''}`;
    li.innerHTML = `<span>${obj.completed ? '✅' : '⚪'}</span> <span>${obj.desc}</span>`;
    listEl.appendChild(li);
  });
}

function initMissionsUI() {
  const modal = document.getElementById('missions-modal');
  const btnToggle = document.getElementById('btn-toggle-missions');
  const btnClose = document.getElementById('btn-close-missions');

  if (btnToggle && modal) {
    btnToggle.onclick = () => {
      modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
      if (modal.style.display === 'block' && !missionManager.activeMission) {
        loadMission('mission_slow_crank');
      }
    };
  }

  if (btnClose && modal) {
    btnClose.onclick = () => { modal.style.display = 'none'; };
  }

  // Mission Tabs
  const tabButtons = document.querySelectorAll('.mission-tab-btn');
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const missionId = btn.dataset.missionId;
      loadMission(missionId);
    };
  });

  // Submit Diagnosis Button
  const btnSubmitDiag = document.getElementById('btn-submit-diagnosis');
  const diagSelect = document.getElementById('mission-diag-select');
  const resultBanner = document.getElementById('mission-result-banner');

  if (btnSubmitDiag && diagSelect && resultBanner) {
    btnSubmitDiag.onclick = () => {
      const selectedFault = diagSelect.value;
      if (!selectedFault) {
        showToast('Please select a suspected root cause diagnosis.', 'error');
        return;
      }
      const res = missionManager.submitDiagnosis(selectedFault);
      resultBanner.style.display = 'block';
      resultBanner.className = `mission-result-banner ${res.correct ? 'pass' : 'fail'}`;
      resultBanner.textContent = res.message;
      showToast(res.message, res.correct ? 'success' : 'error');
      renderMissionObjectives();
      updateConditionHUD();
    };
  }

  // Execute Repair Button
  const btnRepair = document.getElementById('btn-execute-repair');
  if (btnRepair) {
    btnRepair.onclick = () => {
      const res = missionManager.executeRepair();
      if (res.success) {
        showToast(res.message, 'success');
        renderMissionObjectives();
        refreshDMMDisplay();
        updateConditionHUD();
      } else {
        showToast(res.message, 'error');
      }
    };
  }

  // Verify Repair Button
  const btnVerify = document.getElementById('btn-verify-repair');
  if (btnVerify) {
    btnVerify.onclick = () => {
      const res = missionManager.verifyRepair();
      resultBanner.style.display = 'block';
      resultBanner.className = `mission-result-banner ${res.verified ? 'pass' : 'fail'}`;
      resultBanner.textContent = res.message;
      if (res.verified) {
        showToast(`Mission Verified! Score: ${res.report.score}/100.`, 'success');
      } else {
        showToast(res.message, 'error');
      }
      renderMissionObjectives();
      refreshDMMDisplay();
      updateConditionHUD();
    };
  }
}

function loadMission(missionId) {
  const res = missionManager.startMission(missionId);
  const m = res.mission;

  const titleEl = document.getElementById('mission-title');
  const complaintEl = document.getElementById('mission-complaint');
  const hintEl = document.getElementById('mission-hint');
  const resultBanner = document.getElementById('mission-result-banner');

  if (titleEl) titleEl.textContent = m.title;
  if (complaintEl) complaintEl.textContent = m.customerComplaint;
  if (hintEl) hintEl.textContent = `Tip: ${m.hint}`;
  if (resultBanner) resultBanner.style.display = 'none';

  renderMissionObjectives();
  showToast(`Loaded mission: ${m.title}`, 'info');
  updateConditionHUD();
}

initDMMControls();
initCockpitControls();
initMissionsUI();

// =========================================================
// VEHICLE BODY MECHANISMS & VIEW CONTROLS
// =========================================================
const btnBonnet = document.getElementById('btn-toggle-bonnet');
if (btnBonnet) {
  btnBonnet.addEventListener('click', () => {
    const open = vehicle.toggleBonnet();
    const bonnetComp = components.find(c => c.id === 'bonnet_hood');
    if (bonnetComp) bonnetComp.isOpen = open;
    showToast(open ? 'Bonnet opened (Engine bay accessible).' : 'Bonnet closed and latched.', 'info');
    if (interaction.selectedComponent?.id === 'bonnet_hood') updateInspectionUI(bonnetComp);
  });
}

const btnTrunk = document.getElementById('btn-toggle-trunk');
if (btnTrunk) {
  btnTrunk.addEventListener('click', () => {
    const open = vehicle.toggleTrunk();
    const trunkComp = components.find(c => c.id === 'boot_trunk');
    if (trunkComp) trunkComp.isOpen = open;
    showToast(open ? 'Rear trunk opened.' : 'Rear trunk closed.', 'info');
    if (interaction.selectedComponent?.id === 'boot_trunk') updateInspectionUI(trunkComp);
  });
}

const btnDoorFL = document.getElementById('btn-toggle-door-fl');
if (btnDoorFL) {
  btnDoorFL.addEventListener('click', () => {
    const open = vehicle.toggleDoor('doorFL');
    const doorComp = components.find(c => c.id === 'door_front_left');
    if (doorComp) doorComp.isOpen = open;
    showToast(open ? 'Driver door opened.' : 'Driver door closed.', 'info');
    if (interaction.selectedComponent?.id === 'door_front_left') updateInspectionUI(doorComp);
  });
}

const btnDoorFR = document.getElementById('btn-toggle-door-fr');
if (btnDoorFR) {
  btnDoorFR.addEventListener('click', () => {
    const open = vehicle.toggleDoor('doorFR');
    const doorComp = components.find(c => c.id === 'door_front_right');
    if (doorComp) doorComp.isOpen = open;
    showToast(open ? 'Passenger door opened.' : 'Passenger door closed.', 'info');
    if (interaction.selectedComponent?.id === 'door_front_right') updateInspectionUI(doorComp);
  });
}

const btnCutaway = document.getElementById('btn-toggle-cutaway');
if (btnCutaway) {
  btnCutaway.addEventListener('click', () => {
    const cutaway = vehicle.toggleCutawayMode();
    btnCutaway.style.background = cutaway ? 'rgba(57, 197, 187, 0.3)' : '';
    showToast(cutaway ? 'Engine block cutaway active: cylinders & reciprocating pistons visible.' : 'Cutaway mode disabled: solid cast-iron block restored.', 'info');
  });
}

const btnCamView = document.getElementById('btn-toggle-camera-view');
if (btnCamView) {
  workshopControls.onModeChange = (mode) => {
    btnCamView.innerHTML = mode === 'FIRST_PERSON' ? '🔄 Orbit View [V]' : '👁️ Walk View [V]';
  };

  btnCamView.addEventListener('click', () => {
    const mode = workshopControls.toggleCameraMode();
    showToast(mode === 'FIRST_PERSON' ? 'First-Person Walk Mode active (WASD + Right-Click look, Shift sprint, C crouch).' : 'Orbit Inspector Mode active.', 'info');
  });
}

// =========================================================
// WORKSHOP PERSISTENCE (SAVE / LOAD / RESET)
// =========================================================
const btnSave = document.getElementById('btn-save-garage');
if (btnSave) {
  btnSave.addEventListener('click', () => {
    const res = persistence.saveGarageState({
      liftHeight: garage.currentLiftHeight,
      components: components.map(c => ({
        id: c.id,
        installed: c.installed,
        cleanlinessPercentage: c.cleanlinessPercentage,
        wearPercentage: c.wearPercentage,
        fastener: c.fastener ? {
          currentTorqueNm: c.fastener.currentTorqueNm,
          currentEngagementMm: c.fastener.currentEngagementMm
        } : null
      })),
      engine: engineSim,
      restoration: restoSystem,
      electricalFaults: Array.from(faultManager.activeFaults.keys()),
      conditionScores: conditionSystem.state
    });
    showToast(`Workshop state saved (${res.sizeBytes} bytes).`, 'success');
  });
}

const btnLoad = document.getElementById('btn-load-garage');
if (btnLoad) {
  btnLoad.addEventListener('click', () => {
    const res = persistence.loadGarageState();
    if (!res.success) {
      showToast(res.error, 'error');
      return;
    }
    const data = res.data;
    if (data.liftHeight !== undefined) {
      garage.setLiftHeight(data.liftHeight);
      document.getElementById('lift-height-display').textContent = `${data.liftHeight.toFixed(1)}m`;
    }
    if (data.components && Array.isArray(data.components)) {
      data.components.forEach(savedComp => {
        const live = components.find(c => c.id === savedComp.id);
        if (live) {
          live.installed = savedComp.installed;
          live.cleanlinessPercentage = savedComp.cleanlinessPercentage;
          live.wearPercentage = savedComp.wearPercentage;
          if (live.fastener && savedComp.fastener) {
            live.fastener.currentTorqueNm = savedComp.fastener.currentTorqueNm;
            live.fastener.currentEngagementMm = savedComp.fastener.currentEngagementMm;
          }
          if (live.meshGroup) {
            live.meshGroup.visible = live.installed;
          }
        }
      });
    }
    if (data.engineState) {
      engineSim.engineOilLiters = data.engineState.engineOilLiters;
      engineSim.oilConditionPercent = data.engineState.oilConditionPercent;
      engineSim.isDrainPlugInstalled = data.engineState.isDrainPlugInstalled;
      engineSim.isOilFilterInstalled = data.engineState.isOilFilterInstalled;
      engineSim.activeFaults = new Set(data.engineState.activeFaults || []);
    }
    if (data.restorationPanels && Array.isArray(data.restorationPanels)) {
      data.restorationPanels.forEach(p => {
        restoSystem.panelStates.set(p.panelId, p);
      });
    }
    conditionSystem.updateFromComponents(components);
    conditionSystem.updateElectricalCondition(electricalSystem, faultManager);
    updateConditionHUD();
    if (interaction.selectedComponent) updateInspectionUI(interaction.selectedComponent);
    showToast('Workshop state restored from local save.', 'success');
  });
}

const btnReset = document.getElementById('btn-reset-garage');
if (btnReset) {
  btnReset.addEventListener('click', () => {
    if (confirm('Reset workshop, vehicle, and all repairs to factory default?')) {
      persistence.clearSave();
      location.reload();
    }
  });
}

// Main Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (workshopControls.mode === 'ORBIT') {
    handleKeyboardMovement(dt);
  }
  garage.update(dt);
  engineSim.update(dt);
  vehicle.update(dt, engineSim);
  workshopControls.update(dt);

  renderer.render(scene, camera);
}

animate();
showToast('MECHVERSE Workshop Ready. Select tools & sockets to inspect and service components.', 'success');

