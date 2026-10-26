import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../clients/workshop-prototype/vendor/three.module.js';
import { HazardSystem, HAZARD_STAGES } from '../clients/workshop-prototype/src/hazard-system.js';

test('HazardSystem - Initialization baseline state', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  assert.equal(hazard.hazardLevel, 0.0, 'Hazard level should start at 0.0');
  assert.equal(hazard.currentStage, 0, 'Initial stage should be 0 (SAFE)');
  assert.equal(hazard.fusesBlown, false, 'Fuses should start intact');
  assert.equal(hazard.batteryConnected, true, 'Battery should be connected by default');
});

test('HazardSystem - Battery Reverse Polarity triggers Stage 1 arcing', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.triggerReversePolarity();

  assert.ok(hazard.hazardLevel >= 25.0, `Hazard level should be >= 25, got ${hazard.hazardLevel}`);
  assert.ok(hazard.currentStage >= 1, `Stage should escalate to at least 1, got ${hazard.currentStage}`);
  assert.ok(hazard.risks.electrical >= 90.0, 'Electrical risk should be critical');
});

test('HazardSystem - Stage 2 blows main fuse and reports burning smell', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.risks.electrical = 85.0;
  hazard.evaluateHazardLevel();

  assert.ok(hazard.currentStage >= 2, `Stage should be >= 2, got ${hazard.currentStage}`);
  assert.equal(hazard.fusesBlown, true, 'Main fuse should blow in Stage 2');
});

test('HazardSystem - Fuel Leak near Spark escalates to open flames (Stage 5)', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.triggerFuelLeakNearSpark();

  assert.ok(hazard.hazardLevel >= 50.0, `Hazard level should be high, got ${hazard.hazardLevel}`);
  assert.ok(hazard.currentStage >= 3, `Stage should escalate with fuel fire, got ${hazard.currentStage}`);
  assert.ok(hazard.risks.fuel >= 80.0, 'Fuel risk should be severe');
});

test('HazardSystem - Fire Extinguisher suppresses flames and lowers hazardLevel', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.triggerFuelLeakNearSpark();
  const initialHazard = hazard.hazardLevel;

  // Discharge extinguisher for 3 seconds
  hazard.applyFireExtinguisher(3.0);

  assert.ok(hazard.hazardLevel < initialHazard, `Hazard level should decrease from ${initialHazard} to ${hazard.hazardLevel}`);
  assert.ok(hazard.risks.fuel <= 0.0, 'Fuel risk should be neutralized by dry chemical agent');
  assert.ok(hazard.risks.heat <= 0.0, 'Heat risk should be extinguished');
  assert.equal(hazard.currentStage, 0, 'Stage should return to 0 (SAFE) once fire is extinguished');
});

test('HazardSystem - Battery Disconnect cuts electrical risk immediately', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.triggerTerminalShort();
  assert.ok(hazard.risks.electrical > 80.0);

  hazard.disconnectBattery();
  assert.equal(hazard.batteryConnected, false);
  assert.equal(hazard.risks.electrical, 0.0, 'Disconnecting battery must reduce electrical risk to zero');
});

test('HazardSystem - Closing bonnet chokes oxygen and slows heat growth', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.currentStage = 4;
  hazard.risks.heat = 75.0;
  hazard.setBonnetClosed(true);

  assert.equal(hazard.bonnetClosed, true);
  assert.ok(hazard.risks.heat <= 60.0, 'Choking oxygen with closed bonnet should immediately reduce thermal runaway');
});

test('HazardSystem - Wrong fuel, oil starvation, and missing fasteners raise hazard', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.triggerWrongFuel();
  assert.ok(hazard.risks.fuel >= 75.0, 'Wrong fuel raises fuel risk');

  hazard.triggerDrainPlugOutRunning();
  assert.ok(hazard.risks.oil >= 90.0, 'Running with oil drain plug out creates severe friction risk');

  hazard.triggerMissingFastenersRunning();
  assert.ok(hazard.risks.heat >= 75.0, 'Missing fasteners cause thermal and mechanical strain');

  hazard.triggerLiveWireGroundShort();
  assert.ok(hazard.risks.electrical >= 85.0, 'Live wire to ground causes arcing hazard');
});

test('HazardSystem - Blown fuse repairable in early stages but not in late stages', () => {
  const scene = new THREE.Scene();
  const hazard = new HazardSystem(scene, null, null);

  hazard.currentStage = 2;
  hazard.fusesBlown = true;
  assert.equal(hazard.repairBlownFuse(), true, 'Replacing fuse at stage 2 succeeds');

  hazard.currentStage = 5;
  assert.equal(hazard.repairBlownFuse(), false, 'At stage 5, burnt harness prevents simple fuse repair');
});

