import test from 'node:test';
import assert from 'node:assert/strict';
import { VehicleElectricalSystem } from '../clients/workshop-prototype/src/electrical-system.js';
import { DigitalMultimeter, MULTIMETER_MODES, METER_LEAD_JACKS } from '../clients/workshop-prototype/src/multimeter-system.js';
import { ElectricalFaultManager, FAULT_TYPES } from '../clients/workshop-prototype/src/electrical-faults.js';
import { ElectricalMissionManager } from '../clients/workshop-prototype/src/electrical-missions.js';

test('ElectricalFaultManager - Inject, persist, and repair independent faults', () => {
  const vehicle = new VehicleElectricalSystem();
  const faultManager = new ElectricalFaultManager(vehicle);

  // Initial healthy state
  assert.equal(faultManager.getActiveFaults().length, 0);
  assert.ok(vehicle.engineGroundStrap.getResistance() < 0.01);
  assert.equal(vehicle.auxFuse.isBlown, false);

  // Inject High-Resistance Ground fault
  faultManager.injectFault(FAULT_TYPES.HIGH_RES_GROUND);
  assert.equal(faultManager.isFaultActive(FAULT_TYPES.HIGH_RES_GROUND), true);
  assert.ok(vehicle.engineGroundStrap.getResistance() >= 0.40);
  // Other components must remain unaffected
  assert.equal(vehicle.auxFuse.isBlown, false);
  assert.equal(vehicle.headlightConnector.isCorroded, false);

  // Inject Blown Fuse
  faultManager.injectFault(FAULT_TYPES.BLOWN_AUX_FUSE);
  assert.equal(faultManager.getActiveFaults().length, 2);
  assert.equal(vehicle.auxFuse.isBlown, true);

  // Repair ground strap
  const repairRes = faultManager.repairFault(FAULT_TYPES.HIGH_RES_GROUND);
  assert.equal(repairRes.success, true);
  assert.equal(faultManager.isFaultActive(FAULT_TYPES.HIGH_RES_GROUND), false);
  assert.ok(vehicle.engineGroundStrap.getResistance() < 0.01);

  // Blown fuse must still persist
  assert.equal(vehicle.auxFuse.isBlown, true);

  // Clear all
  faultManager.clearAllFaults();
  assert.equal(faultManager.getActiveFaults().length, 0);
  assert.equal(vehicle.auxFuse.isBlown, false);
});

test('Mission 1: The Slow-Cranking Vehicle - Complete diagnostic & verification workflow', () => {
  const vehicle = new VehicleElectricalSystem();
  const faultManager = new ElectricalFaultManager(vehicle);
  const dmm = new DigitalMultimeter(vehicle);
  const missionManager = new ElectricalMissionManager(vehicle, faultManager, dmm);

  // 1. Start Mission
  const start = missionManager.startMission('mission_slow_crank');
  assert.equal(start.success, true);
  assert.equal(faultManager.isFaultActive(FAULT_TYPES.HIGH_RES_GROUND), true);

  // 2. Measure resting battery voltage
  dmm.setMode(MULTIMETER_MODES.DC_VOLTS);
  dmm.connectProbes('BAT_POS', 'GND');
  vehicle.ignitionState = 'OFF';
  missionManager.recordMeasurementEvidence();

  // 3. Measure cranking voltage
  vehicle.ignitionState = 'START';
  dmm.connectProbes('BAT_POS', 'GND');
  missionManager.recordMeasurementEvidence();

  // 4. Measure ground-side voltage drop during cranking (ENGINE_BLOCK to GND)
  dmm.connectProbes('ENGINE_BLOCK', 'GND');
  const evGroundDrop = missionManager.recordMeasurementEvidence();
  assert.ok(evGroundDrop.numericValue > 3.0, `Ground drop must be excessive under fault, got ${evGroundDrop.numericValue}`);

  // 5. Test diagnosis validation
  const badDiag = missionManager.submitDiagnosis(FAULT_TYPES.WEAK_BATTERY);
  assert.equal(badDiag.correct, false);

  const goodDiag = missionManager.submitDiagnosis(FAULT_TYPES.HIGH_RES_GROUND);
  assert.equal(goodDiag.correct, true);

  // 6. Execute Repair
  const repair = missionManager.executeRepair();
  assert.equal(repair.success, true);
  assert.equal(faultManager.isFaultActive(FAULT_TYPES.HIGH_RES_GROUND), false);

  // 7. Verify Repair
  const verify = missionManager.verifyRepair();
  assert.equal(verify.success, true);
  assert.equal(verify.verified, true);
  assert.equal(missionManager.isCompleted, true);
  assert.equal(missionManager.completionReport.status, 'PASSED');
});

test('Mission 2: Dead Auxiliary Lights - Complete diagnostic & verification workflow', () => {
  const vehicle = new VehicleElectricalSystem();
  const faultManager = new ElectricalFaultManager(vehicle);
  const dmm = new DigitalMultimeter(vehicle);
  const missionManager = new ElectricalMissionManager(vehicle, faultManager, dmm);

  missionManager.startMission('mission_dead_aux_lights');
  vehicle.auxLightSwitch = true;

  // 1. Confirm 0V at aux fuse out
  dmm.setMode(MULTIMETER_MODES.DC_VOLTS);
  dmm.connectProbes('AUX_FUSE_OUT', 'GND');
  missionManager.recordMeasurementEvidence();

  // 2. Confirm power at fuse input bus
  dmm.connectProbes('FUSED_MAIN_BUS', 'GND');
  missionManager.recordMeasurementEvidence();

  // 3. Test continuity across isolated fuse
  vehicle.ignitionState = 'OFF';
  vehicle.battery.isConnected = false; // Isolate power
  dmm.setMode(MULTIMETER_MODES.CONTINUITY);
  dmm.connectProbes('FUSED_MAIN_BUS', 'AUX_FUSE_OUT');
  const evCont = missionManager.recordMeasurementEvidence();
  assert.ok(evCont.reading.includes('O.L') || evCont.reading.includes('OPEN'));

  vehicle.battery.isConnected = true; // Reconnect

  // 4. Submit Diagnosis
  const diag = missionManager.submitDiagnosis(FAULT_TYPES.BLOWN_AUX_FUSE);
  assert.equal(diag.correct, true);

  // 5. Replace fuse & verify
  missionManager.executeRepair();
  const verify = missionManager.verifyRepair();
  assert.equal(verify.verified, true);
  assert.equal(missionManager.isCompleted, true);
});

test('Mission 3: Battery Drains Overnight - Parasitic current and accelerated parking verification', () => {
  const vehicle = new VehicleElectricalSystem();
  const faultManager = new ElectricalFaultManager(vehicle);
  const dmm = new DigitalMultimeter(vehicle);
  const missionManager = new ElectricalMissionManager(vehicle, faultManager, dmm);

  missionManager.startMission('mission_overnight_drain');

  // Measure series current
  vehicle.ignitionState = 'OFF';
  dmm.setMode(MULTIMETER_MODES.DC_AMPS);
  dmm.setRedJack(METER_LEAD_JACKS.A_10A);
  dmm.connectProbes('BAT_NEG', 'GND');
  const evCurrent = missionManager.recordMeasurementEvidence();
  assert.ok(evCurrent.numericValue >= 0.50);

  // Diagnose
  assert.equal(missionManager.submitDiagnosis(FAULT_TYPES.PARASITIC_DRAIN).correct, true);

  // Repair
  missionManager.executeRepair();

  // Verify through 12-hour accelerated parking simulation
  const verify = missionManager.verifyRepair();
  assert.equal(verify.verified, true);
  assert.equal(missionManager.isCompleted, true);
});

test('Mission 4: Intermittent Electrical Accessory - Corroded connector voltage drop & repair', () => {
  const vehicle = new VehicleElectricalSystem();
  const faultManager = new ElectricalFaultManager(vehicle);
  const dmm = new DigitalMultimeter(vehicle);
  const missionManager = new ElectricalMissionManager(vehicle, faultManager, dmm);

  missionManager.startMission('mission_intermittent_accessory');

  // Turn on headlights
  vehicle.headlightSwitch = true;
  dmm.setMode(MULTIMETER_MODES.DC_VOLTS);

  // Measure low voltage at bulb
  dmm.connectProbes('HEADLIGHT_POS', 'GND');
  missionManager.recordMeasurementEvidence();

  // Measure voltage drop across corroded connector
  dmm.connectProbes('HL_SW_OUT', 'HEADLIGHT_POS');
  const evDrop = missionManager.recordMeasurementEvidence();
  assert.ok(evDrop.numericValue > 2.0, `Connector drop must be high under fault, got ${evDrop.numericValue}`);

  // Diagnose
  assert.equal(missionManager.submitDiagnosis(FAULT_TYPES.CORRODED_CONNECTOR).correct, true);

  // Repair
  missionManager.executeRepair();

  // Verify
  const verify = missionManager.verifyRepair();
  assert.equal(verify.verified, true);
  assert.equal(missionManager.isCompleted, true);
});
