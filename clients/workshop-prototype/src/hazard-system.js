import * as THREE from '../vendor/three.module.js';

/**
 * MECHVERSE - Realistic Damage, Hazard & Fire Conflagration System
 * 
 * Features:
 * - Authoritative 0-100 hazardLevel with independent risk factors (electrical, fuel, heat, oil)
 * - 6 Discrete Escalation Stages with multi-layered visual and acoustic symptoms:
 *   1: Sparks & electrical arcing (blue-white light flicker, spark bursts, crackle)
 *   2: Blown main fuse, dash warning lights, ECU reboot, acrid burning smell
 *   3: Thin white-to-grey smoke rising from affected bay/terminal
 *   4: Dense pitch-black smoke, orange engine bay thermal glow, heat distortion
 *   5: Open turbulent flames spreading to adjacent components, roaring fire
 *   6: Full vehicle conflagration (flames penetrating firewall into cabin, total loss)
 * - GPU particle systems for sparks (additive, gravity & bounce), smoke (expanding billboards),
 *   flames (turbulent swirl, additive glow), and embers
 * - Progressive material charring and soot accumulation
 * - Interactive mitigation: 3D fire extinguisher tool, battery disconnect, bonnet oxygen choke
 */

export const HAZARD_STAGES = {
  0: { id: 'SAFE', name: 'Nominal Operations', threshold: 0 },
  1: { id: 'STAGE_1_ARCING', name: 'Electrical Arcing & Sparks', threshold: 15 },
  2: { id: 'STAGE_2_FUSE_SMELL', name: 'Blown Fuse & Acrid Plastic Smell', threshold: 30 },
  3: { id: 'STAGE_3_SMOKE', name: 'White & Grey Smoke Emission', threshold: 50 },
  4: { id: 'STAGE_4_HEAT_GLOW', name: 'Thermal Glow & Dark Smoke', threshold: 70 },
  5: { id: 'STAGE_5_OPEN_FLAMES', name: 'Active Structural Fire', threshold: 85 },
  6: { id: 'STAGE_6_FULL_CONFLAGRATION', name: 'Full Vehicle Loss (Catastrophic)', threshold: 98 }
};

export class HazardSystem {
  constructor(scene, vehicleModel, audioSystem) {
    this.scene = scene;
    this.vehicleModel = vehicleModel;
    this.audioSystem = audioSystem;

    // Authoritative Hazard State
    this.hazardLevel = 0.0; // 0.0 to 100.0
    this.risks = {
      electrical: 0.0,
      fuel: 0.0,
      heat: 0.0,
      oil: 0.0
    };

    this.currentStage = 0;
    this.burnedComponents = new Set();
    this.fusesBlown = false;
    this.bonnetClosed = true;
    this.batteryConnected = true;
    this.isExtinguished = false;

    // Dynamic Fault Origin Point (World position)
    this.faultOrigin = new THREE.Vector3(0.55, 0.95, 1.15); // Battery/firewall area

    // Dynamic Flickering Point Light
    this.flickerLight = new THREE.PointLight(0x60a5fa, 0, 8.0, 2.0);
    this.flickerLight.position.copy(this.faultOrigin);
    this.scene.add(this.flickerLight);

    // Particle Systems Group
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.initParticleSystems();
    this.createHUDIndicator();
  }

  initParticleSystems() {
    // 1. Sparks Particle System (Additive, fast, short-lived)
    const sparkCount = 180;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = new Float32Array(sparkCount * 3);
    const sparkLife = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = this.faultOrigin.x;
      sparkPos[i * 3 + 1] = this.faultOrigin.y;
      sparkPos[i * 3 + 2] = this.faultOrigin.z;
      sparkLife[i] = -1.0; // Inactive
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    this.sparkVelocities = sparkVel;
    this.sparkLifetimes = sparkLife;

    const sparkMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparksMesh = new THREE.Points(sparkGeo, sparkMat);
    this.sparksMesh.visible = false;
    this.particleGroup.add(this.sparksMesh);

    // 2. Smoke Particle System (Billowing, soft, opacity fade)
    const smokeCount = 120;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeLife = new Float32Array(smokeCount);
    const smokeScale = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = this.faultOrigin.x;
      smokePos[i * 3 + 1] = this.faultOrigin.y;
      smokePos[i * 3 + 2] = this.faultOrigin.z;
      smokeLife[i] = Math.random();
      smokeScale[i] = 0.2 + Math.random() * 0.4;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    this.smokeLifetimes = smokeLife;
    this.smokeScales = smokeScale;

    this.smokeMat = new THREE.PointsMaterial({
      color: 0xd0d7de,
      size: 0.45,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.smokeMesh = new THREE.Points(smokeGeo, this.smokeMat);
    this.smokeMesh.visible = false;
    this.particleGroup.add(this.smokeMesh);

    // 3. Flame Particle System (Turbulent fire, high-intensity color)
    const flameCount = 140;
    const flameGeo = new THREE.BufferGeometry();
    const flamePos = new Float32Array(flameCount * 3);
    const flameLife = new Float32Array(flameCount);

    for (let i = 0; i < flameCount; i++) {
      flamePos[i * 3] = this.faultOrigin.x;
      flamePos[i * 3 + 1] = this.faultOrigin.y;
      flamePos[i * 3 + 2] = this.faultOrigin.z;
      flameLife[i] = Math.random();
    }

    flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
    this.flameLifetimes = flameLife;

    this.flameMat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.35,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flameMesh = new THREE.Points(flameGeo, this.flameMat);
    this.flameMesh.visible = false;
    this.particleGroup.add(this.flameMesh);

    // 4. Floating Embers Particle System (Stage 4+)
    const emberCount = 60;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberLife = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = this.faultOrigin.x + (Math.random() - 0.5) * 0.4;
      emberPos[i * 3 + 1] = this.faultOrigin.y + Math.random() * 0.5;
      emberPos[i * 3 + 2] = this.faultOrigin.z + (Math.random() - 0.5) * 0.4;
      emberLife[i] = Math.random();
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    this.emberLifetimes = emberLife;
    this.emberMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.08,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.embersMesh = new THREE.Points(emberGeo, this.emberMat);
    this.embersMesh.visible = false;
    this.particleGroup.add(this.embersMesh);

    // 5. Heat Distortion Haze Mesh (Stage 4+)
    const hazeGeo = new THREE.SphereGeometry(0.85, 16, 12);
    this.hazeMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.hazeMesh = new THREE.Mesh(hazeGeo, this.hazeMat);
    this.hazeMesh.position.copy(this.faultOrigin);
    this.hazeMesh.visible = false;
    this.particleGroup.add(this.hazeMesh);
  }

  createHUDIndicator() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('hazard-hud-alert')) return;

    const el = document.createElement('div');
    el.id = 'hazard-hud-alert';
    el.style.cssText = `
      position: fixed;
      top: 68px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(218, 54, 51, 0.9);
      border: 1px solid #f85149;
      border-radius: 6px;
      padding: 8px 18px;
      color: #ffffff;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: none;
      align-items: center;
      gap: 10px;
      z-index: 9998;
      box-shadow: 0 4px 16px rgba(248, 81, 73, 0.4);
      animation: pulseAlert 1.2s infinite;
    `;
    el.innerHTML = `
      <span style="font-size: 16px;">⚠️</span>
      <span id="hazard-hud-text">CRITICAL HAZARD DETECTED</span>
      <span id="hazard-hud-smell" style="font-size: 11px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px;"></span>
    `;
    document.body.appendChild(el);
  }

  reset() {
    this.hazardLevel = 0.0;
    this.currentStage = 0;
    this.risks = {
      electrical: 0.0,
      fuel: 0.0,
      heat: 0.0,
      oil: 0.0
    };
    this.burnedComponents.clear();
    this.fusesBlown = false;
    this.batteryConnected = true;
    this.isExtinguished = false;
    this.faultOrigin.set(0.55, 0.95, 1.15);

    if (this.sparkMesh) this.sparkMesh.visible = false;
    if (this.smokeMesh) this.smokeMesh.visible = false;
    if (this.flameMesh) this.flameMesh.visible = false;
    if (this.emberMesh) this.emberMesh.visible = false;
    if (this.hazeMesh) this.hazeMesh.visible = false;
    if (this.flickerLight) this.flickerLight.intensity = 0.0;

    const hudEl = typeof document !== 'undefined' ? document.getElementById('hazard-hud-indicator') : null;
    if (hudEl) hudEl.style.display = 'none';
  }

  // --- TRIGGER HAZARD CAUSES ---
  triggerReversePolarity() {
    this.risks.electrical = 95.0;
    this.faultOrigin.set(0.55, 0.95, 1.15); // Battery terminal
    this.evaluateHazardLevel();
  }

  triggerTerminalShort() {
    this.risks.electrical = 90.0;
    this.faultOrigin.set(0.55, 0.95, 1.15);
    this.evaluateHazardLevel();
  }

  triggerFuelLeakNearSpark() {
    this.risks.fuel = 90.0;
    this.risks.electrical = 65.0;
    this.risks.heat = 85.0;
    this.faultOrigin.set(0.15, 0.65, 1.35); // Fuel rail / injector area
    this.evaluateHazardLevel();
  }

  triggerOilStarvationRunning() {
    this.risks.oil = 90.0;
    this.risks.heat = 80.0;
    this.faultOrigin.set(0, 0.45, 1.40); // Engine crankcase
    this.evaluateHazardLevel();
  }

  triggerEngineOverheat() {
    this.risks.heat = 85.0;
    this.faultOrigin.set(0, 0.70, 1.65); // Radiator / coolant tank
    this.evaluateHazardLevel();
  }

  triggerToolAcrossTerminals() {
    this.triggerTerminalShort();
  }

  triggerLiveWireGroundShort() {
    this.risks.electrical = 85.0;
    this.faultOrigin.set(0.40, 0.85, 1.25);
    this.evaluateHazardLevel();
  }

  triggerWrongFuel() {
    this.risks.fuel = 75.0;
    this.risks.heat = 60.0;
    this.faultOrigin.set(0.10, 0.60, 1.35);
    this.evaluateHazardLevel();
  }

  triggerMissingFastenersRunning() {
    this.risks.oil = 80.0;
    this.risks.heat = 75.0;
    this.faultOrigin.set(0.0, 0.50, 1.45);
    this.evaluateHazardLevel();
  }

  triggerDrainPlugOutRunning() {
    this.triggerOilStarvationRunning();
  }

  triggerNoCoolant() {
    this.triggerEngineOverheat();
  }

  // Authoritative hazard evaluation
  evaluateHazardLevel() {
    // Weighted combination of risk factors
    const rawHazard = (this.risks.electrical * 0.35) +
                      (this.risks.fuel * 0.35) +
                      (this.risks.heat * 0.20) +
                      (this.risks.oil * 0.10);
    this.hazardLevel = Math.min(100.0, Math.max(0.0, rawHazard));

    // Determine discrete stage
    let newStage = 0;
    if (this.hazardLevel >= 95.0) newStage = 6;
    else if (this.hazardLevel >= 85.0) newStage = 5;
    else if (this.hazardLevel >= 68.0) newStage = 4;
    else if (this.hazardLevel >= 45.0) newStage = 3;
    else if (this.hazardLevel >= 25.0) newStage = 2;
    else if (this.hazardLevel >= 12.0) newStage = 1;

    if (newStage !== this.currentStage) {
      this.currentStage = newStage;
      this.onStageChanged(newStage);
    }
  }

  onStageChanged(stage) {
    const alertEl = typeof document !== 'undefined' ? document.getElementById('hazard-hud-alert') : null;
    const alertText = typeof document !== 'undefined' ? document.getElementById('hazard-hud-text') : null;
    const smellEl = typeof document !== 'undefined' ? document.getElementById('hazard-hud-smell') : null;

    if (stage === 0) {
      if (alertEl) alertEl.style.display = 'none';
      this.flickerLight.intensity = 0;
      this.sparksMesh.visible = false;
      this.smokeMesh.visible = false;
      this.flameMesh.visible = false;
      if (this.embersMesh) this.embersMesh.visible = false;
      if (this.hazeMesh) this.hazeMesh.visible = false;
      return;
    }

    if (alertEl) alertEl.style.display = 'flex';

    switch (stage) {
      case 1:
        if (alertText) alertText.textContent = 'STAGE 1: ELECTRICAL ARCING AT TERMINAL';
        if (smellEl) smellEl.textContent = 'Ozone scent';
        this.flickerLight.color.setHex(0x60a5fa);
        this.sparksMesh.visible = true;
        this.smokeMesh.visible = false;
        this.flameMesh.visible = false;
        if (this.embersMesh) this.embersMesh.visible = false;
        if (this.hazeMesh) this.hazeMesh.visible = false;
        break;

      case 2:
        if (alertText) alertText.textContent = 'STAGE 2: MAIN FUSE BLOWN - ECU RESET';
        if (smellEl) smellEl.textContent = 'Acrid burning plastic smell';
        this.fusesBlown = true;
        this.flickerLight.color.setHex(0xf59e0b);
        this.sparksMesh.visible = true;
        this.smokeMesh.visible = true;
        this.smokeMat.color.setHex(0xe5e7eb); // Thin white smoke
        this.smokeMat.opacity = 0.45;
        this.flameMesh.visible = false;
        if (this.embersMesh) this.embersMesh.visible = false;
        if (this.hazeMesh) this.hazeMesh.visible = false;
        break;

      case 3:
        if (alertText) alertText.textContent = 'STAGE 3: SMOKE BILLOWING FROM ENGINE BAY';
        if (smellEl) smellEl.textContent = 'Singed insulation smell';
        this.smokeMesh.visible = true;
        this.smokeMat.color.setHex(0x9ca3af); // Grey smoke
        this.smokeMat.opacity = 0.75;
        this.flameMesh.visible = false;
        if (this.embersMesh) this.embersMesh.visible = false;
        if (this.hazeMesh) this.hazeMesh.visible = false;
        break;

      case 4:
        if (alertText) alertText.textContent = 'STAGE 4: THERMAL RUNAWAY & HEAT HAZE';
        if (smellEl) smellEl.textContent = 'Severe scorch odor';
        this.flickerLight.color.setHex(0xff3b00);
        this.smokeMesh.visible = true;
        this.smokeMat.color.setHex(0x374151); // Dark grey/black smoke
        this.smokeMat.opacity = 0.9;
        if (this.embersMesh) {
          this.embersMesh.visible = true;
          this.emberMat.opacity = 0.65;
        }
        if (this.hazeMesh) {
          this.hazeMesh.visible = true;
          this.hazeMat.opacity = 0.25;
        }
        this.applyCharring(0.35);
        break;

      case 5:
        if (alertText) alertText.textContent = 'STAGE 5: OPEN ENGINE FLAMES SPREADING';
        if (smellEl) smellEl.textContent = 'Toxic burning hydrocarbon smell';
        this.flickerLight.color.setHex(0xff2200);
        this.smokeMesh.visible = true;
        this.smokeMat.color.setHex(0x111827); // Pitch black soot
        this.smokeMat.opacity = 0.95;
        this.flameMesh.visible = true;
        this.flameMat.opacity = 0.85;
        if (this.embersMesh) {
          this.embersMesh.visible = true;
          this.emberMat.opacity = 0.9;
        }
        if (this.hazeMesh) {
          this.hazeMesh.visible = true;
          this.hazeMat.opacity = 0.45;
        }
        this.applyCharring(0.70);
        this.burnedComponents.add('battery_12v');
        this.burnedComponents.add('engine_bay_harness');
        break;

      case 6:
        if (alertText) alertText.textContent = 'STAGE 6: VEHICLE CONFLAGRATION (TOTAL LOSS)';
        if (smellEl) smellEl.textContent = 'Catastrophic vehicle fire';
        this.flickerLight.color.setHex(0xff1100);
        this.flameMesh.visible = true;
        this.flameMat.opacity = 1.0;
        this.flameMat.size = 0.65;
        this.smokeMat.size = 0.75;
        if (this.embersMesh) {
          this.embersMesh.visible = true;
          this.emberMat.opacity = 1.0;
        }
        if (this.hazeMesh) {
          this.hazeMesh.visible = true;
          this.hazeMat.opacity = 0.65;
        }
        this.applyCharring(1.0);
        this.burnedComponents.add('unibody_chassis');
        this.burnedComponents.add('interior_cabin');
        break;
    }
  }

  // Char materials by darkening body paint and engine components
  applyCharring(amount) {
    if (!this.vehicleModel) return;
    const bodyMat = this.vehicleModel.carPaintMat;
    if (bodyMat) {
      bodyMat.color.lerp(new THREE.Color(0x0a0c10), amount * 0.5);
      bodyMat.roughness = THREE.MathUtils.lerp(bodyMat.roughness, 0.95, amount);
      bodyMat.clearcoat = THREE.MathUtils.lerp(bodyMat.clearcoat, 0.0, amount);
    }
    const alumMat = this.vehicleModel.engineAlumMat;
    if (alumMat) {
      alumMat.color.lerp(new THREE.Color(0x111111), amount);
      alumMat.roughness = 0.95;
    }
  }

  // --- MITIGATION ACTIONS ---
  disconnectBattery() {
    this.batteryConnected = false;
    this.risks.electrical = 0.0;
    this.evaluateHazardLevel();
  }

  setBonnetClosed(closed) {
    this.bonnetClosed = closed;
    // Choke oxygen when closed: fire growth slows down dramatically
    if (closed && this.currentStage >= 4) {
      this.risks.heat = Math.max(20.0, this.risks.heat - 15.0);
      this.evaluateHazardLevel();
    }
  }

  applyFireExtinguisher(deltaSeconds = 1.0) {
    // CO2 / Dry chemical suppression reduces heat, fuel, oil, and coats arcing points
    this.risks.fuel = Math.max(0.0, this.risks.fuel - 35.0 * deltaSeconds);
    this.risks.heat = Math.max(0.0, this.risks.heat - 45.0 * deltaSeconds);
    this.risks.oil = Math.max(0.0, this.risks.oil - 30.0 * deltaSeconds);
    this.risks.electrical = Math.max(0.0, this.risks.electrical - 30.0 * deltaSeconds);

    this.evaluateHazardLevel();

    if (this.hazardLevel < 15.0) {
      this.isExtinguished = true;
      this.currentStage = 0;
      this.onStageChanged(0);
    }
  }

  repairBlownFuse() {
    if (this.currentStage <= 2) {
      this.fusesBlown = false;
      this.risks.electrical = 0.0;
      this.evaluateHazardLevel();
      return true;
    }
    return false; // Late stages unrecoverable without replacing burnt harness
  }

  // Per-frame physics and particle animation
  update(delta) {
    if (this.currentStage === 0) return;

    // 1. Dynamic Light Flicker
    if (this.currentStage === 1) {
      // High-frequency electric arc flickering
      this.flickerLight.intensity = Math.random() > 0.4 ? (2.0 + Math.random() * 4.0) : 0.2;
    } else if (this.currentStage >= 4) {
      // Warm flame flickering
      const time = performance.now() * 0.008;
      this.flickerLight.intensity = 3.5 + Math.sin(time) * 1.5 + (Math.random() - 0.5) * 1.0;
    }

    // 2. Sparks update
    if (this.sparksMesh.visible) {
      const posAttr = this.sparksMesh.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        if (this.sparkLifetimes[i] <= 0) {
          if (Math.random() < delta * 25) {
            // Spawn new spark
            posAttr.setXYZ(i, this.faultOrigin.x, this.faultOrigin.y, this.faultOrigin.z);
            this.sparkVelocities[i * 3] = (Math.random() - 0.5) * 3.5;
            this.sparkVelocities[i * 3 + 1] = Math.random() * 2.8 + 0.5;
            this.sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
            this.sparkLifetimes[i] = 0.4 + Math.random() * 0.4;
          }
        } else {
          this.sparkLifetimes[i] -= delta;
          let px = posAttr.getX(i) + this.sparkVelocities[i * 3] * delta;
          let py = posAttr.getY(i) + this.sparkVelocities[i * 3 + 1] * delta;
          let pz = posAttr.getZ(i) + this.sparkVelocities[i * 3 + 2] * delta;

          // Gravity
          this.sparkVelocities[i * 3 + 1] -= 9.8 * delta;

          // Floor bounce at Y = 0.28m
          if (py < 0.28) {
            py = 0.28;
            this.sparkVelocities[i * 3 + 1] *= -0.45; // Bounce damping
          }

          posAttr.setXYZ(i, px, py, pz);
        }
      }
      posAttr.needsUpdate = true;
    }

    // 3. Smoke update (Rising & expanding billboards)
    if (this.smokeMesh.visible) {
      const posAttr = this.smokeMesh.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let py = posAttr.getY(i) + (0.8 + this.currentStage * 0.25) * delta;
        let px = posAttr.getX(i) + (Math.sin(py * 3.0 + i) * 0.3) * delta;
        let pz = posAttr.getZ(i) + (Math.cos(py * 2.5 + i) * 0.25) * delta;

        // Reset particle when it rises above 3.5 meters
        if (py > 3.8) {
          py = this.faultOrigin.y + (Math.random() - 0.5) * 0.2;
          px = this.faultOrigin.x + (Math.random() - 0.5) * 0.2;
          pz = this.faultOrigin.z + (Math.random() - 0.5) * 0.2;
        }
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Flames update (Turbulent swirl)
    if (this.flameMesh.visible) {
      const posAttr = this.flameMesh.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let py = posAttr.getY(i) + (1.6 + Math.random() * 0.8) * delta;
        let px = this.faultOrigin.x + (Math.sin(py * 8.0 + i) * 0.18);
        let pz = this.faultOrigin.z + (Math.cos(py * 8.0 + i) * 0.18);

        if (py > this.faultOrigin.y + 0.95) {
          py = this.faultOrigin.y;
        }
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }

    // 5. Embers update (Stage 4+)
    if (this.embersMesh && this.embersMesh.visible) {
      const posAttr = this.embersMesh.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let py = posAttr.getY(i) + (0.9 + Math.random() * 0.4) * delta;
        let px = posAttr.getX(i) + (Math.sin(py * 4.0 + i) * 0.4) * delta;
        let pz = posAttr.getZ(i) + (Math.cos(py * 4.0 + i) * 0.4) * delta;
        if (py > 3.2) {
          py = this.faultOrigin.y + Math.random() * 0.3;
          px = this.faultOrigin.x + (Math.random() - 0.5) * 0.4;
          pz = this.faultOrigin.z + (Math.random() - 0.5) * 0.4;
        }
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }

    // 6. Heat Haze Mesh subtle refraction distortion pulsation (Stage 4+)
    if (this.hazeMesh && this.hazeMesh.visible) {
      const t = performance.now() * 0.005;
      const scale = 0.95 + Math.sin(t * 2.0) * 0.08;
      this.hazeMesh.scale.set(scale, scale * 1.2, scale);
      this.hazeMesh.rotation.y += delta * 0.4;
    }

    // Autonomic fire spreading if oxygen and fuel exist
    if (this.currentStage >= 4 && !this.isExtinguished) {
      const spreadRate = this.bonnetClosed ? 0.35 : 1.2;
      this.risks.heat = Math.min(100.0, this.risks.heat + spreadRate * delta);
      this.evaluateHazardLevel();
    }
  }
}
