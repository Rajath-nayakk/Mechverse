import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerEconomySystem, JOB_TEMPLATES } from '../clients/workshop-prototype/src/career-economy.js';
import { EducationHUDSystem, FACTORY_TORQUE_SPECS } from '../clients/workshop-prototype/src/education-hud.js';
import { ProceduralAudioEngine } from '../clients/workshop-prototype/src/audio-engine.js';
import { PersistenceSystem, migratePayload } from '../clients/workshop-prototype/src/persistence-system.js';

test('Stage 7: Career Workshop Economy - Job Cards, Parts Invoicing & Satisfaction Audits', () => {
  const career = new CareerEconomySystem(15000.0, 145.0); // $15,000 start balance, $145/hr labor
  assert.equal(career.shopBalance, 15000.0);

  // 1. Accept customer repair order (Brake Shudder Job)
  const acceptRes = career.acceptJob('JOB_001_BRAKE_SHUDDER');
  assert.equal(acceptRes.success, true);
  assert.equal(career.activeJob.customerName, 'Marcus Vance');
  assert.equal(career.activeJob.estimatedLaborHours, 2.5);

  // 2. Order OEM replacement parts
  const rotorPart = career.activeJob.partsNeeded[1]; // OEM 380x36mm rotor ($580)
  const orderRes = career.orderPart(rotorPart);
  assert.equal(orderRes.success, true);
  assert.equal(career.shopBalance, 15000.0 - 580.0);
  assert.equal(career.inventoryParts.get(rotorPart.id), 1);

  // Insufficient funds handling
  const poorShop = new CareerEconomySystem(100.0);
  const failOrder = poorShop.orderPart(rotorPart);
  assert.equal(failOrder.success, false);
  assert.match(failOrder.error, /Insufficient shop funds/i);

  // 3. Perform repair actions
  career.recordActionCompleted('REPLACE_FRONT_PADS');
  career.recordActionCompleted('REPLACE_FRONT_ROTORS');
  career.recordActionCompleted('LUBRICATE_SLIDE_PINS');

  // 4. Invoicing & Quality Audit (5-Star Flawless Work)
  const completion = career.generateInvoiceAndComplete(2.5, {
    fastenerTorquesOutOfSpec: false,
    isVehicleDirty: false
  });
  assert.equal(completion.success, true);
  assert.ok(completion.invoice.grandTotal > 1500.0);
  assert.equal(completion.satisfaction.stars, 5.0);
  assert.match(completion.satisfaction.review, /Outstanding service/i);
  assert.ok(career.shopBalance > 15000.0, 'Shop balance credited with invoice total');

  // 5. Incomplete repair or sloppy quality penalty audit
  career.acceptJob('JOB_002_S58_MISFIRE');
  // Only did 1 out of 3 actions, and left fasteners un-torqued
  career.recordActionCompleted('DIAGNOSE_OBD');
  const sloppyComplete = career.generateInvoiceAndComplete(1.5, {
    fastenerTorquesOutOfSpec: true,
    isVehicleDirty: true
  });
  assert.equal(sloppyComplete.success, true);
  assert.ok(sloppyComplete.satisfaction.stars <= 2.5, 'Sloppy quality must receive severe rating penalties');
  assert.ok(sloppyComplete.satisfaction.deductions.length >= 3);
});

test('Stage 7: Educational Technical Inspection HUD - Torque Database & Cutaways', () => {
  const hud = new EducationHUDSystem();

  // 1. Factory Torque Specifications Database lookup
  const sparkPlugSpec = hud.getTorqueSpec('SPARK_PLUGS');
  assert.equal(sparkPlugSpec.specTorqueNm, 23.0);
  assert.equal(sparkPlugSpec.toleranceNm, 2.0);

  const wheelLugSpec = hud.getTorqueSpec('WHEEL_LUG_BOLTS');
  assert.equal(wheelLugSpec.specTorqueNm, 140.0);

  const conRodSpec = hud.getTorqueSpec('CON_ROD_BOLTS');
  assert.equal(conRodSpec.isTTY, true);
  assert.equal(conRodSpec.angleDeg, 70);

  const caliperBracketSpec = hud.getTorqueSpec('BRAKE_CALIPER_CARRIER_BOLTS');
  assert.equal(caliperBracketSpec.specTorqueNm, 110.0);

  // 2. Technical Cutaway Overlays
  const s58Cutaway = hud.getCutawayInfo('S58_ENGINE');
  assert.ok(s58Cutaway.title.includes('S58'));
  assert.ok(s58Cutaway.architecture.includes('Closed-Deck'));
  assert.ok(s58Cutaway.features.some(f => f.includes('350 bar')));

  // 3. Diagnostic Root Cause Explanations
  const lugExplanation = hud.explainFailure('UNDER_TORQUED_LUGS');
  assert.match(lugExplanation.rootCause, /Clamping force/i);
  assert.match(lugExplanation.remedy, /140 N·m/i);

  const aeratedExplanation = hud.explainFailure('AERATED_BRAKE_LINE');
  assert.match(aeratedExplanation.consequence, /squishy pedal/i);
});

test('Stage 7: Procedural Audio Engine - Harmonics, Turbo Spool & Tool Transients', () => {
  const audio = new ProceduralAudioEngine();

  // 1. Engine Firing Pulse Acoustic Spectrum (S58 6-Cylinder vs V12)
  // S58 6-cylinder at 1200 RPM: 1200/60 * 3 = 60 Hz fundamental
  const s58IdleSound = audio.getEngineAcousticProfile(1200, 6, 0.0);
  assert.equal(s58IdleSound.fundamentalFreqHz, 60.0);
  assert.equal(s58IdleSound.harmonics[1].freqHz, 120.0);

  // S58 at 6000 RPM with 1.7 bar peak boost
  const s58HighRpmSound = audio.getEngineAcousticProfile(6000, 6, 1.7);
  assert.equal(s58HighRpmSound.fundamentalFreqHz, 300.0);
  assert.equal(s58HighRpmSound.turboSpool.whineFreqHz, 5000); // 800 + 4200 * 1.0 = 5000 Hz whine
  assert.ok(s58HighRpmSound.turboSpool.volume > 0.4);

  // V12 12-cylinder at 1200 RPM: 1200/60 * 6 = 120 Hz fundamental
  const v12IdleSound = audio.getEngineAcousticProfile(1200, 12, 0.0);
  assert.equal(v12IdleSound.fundamentalFreqHz, 120.0, 'V12 has double the firing frequency of an I6 at same RPM');

  // 2. Blow-Off Valve (BOV) Pneumatic Trigger
  // Rapid throttle lift-off (0.9 -> 0.1) under 1.4 bar boost
  const bovTrigger = audio.checkBlowOffValveTrigger(0.1, 0.9, 1.4);
  assert.equal(bovTrigger.triggered, true);
  assert.equal(bovTrigger.type, 'BLOW_OFF_VALVE_WHOOSH');

  // Gradual lift-off does not trigger BOV
  const noBov = audio.checkBlowOffValveTrigger(0.6, 0.7, 1.4);
  assert.equal(noBov.triggered, false);

  // 3. Workshop Tool Acoustic Transients
  const ratchetClick = audio.triggerToolSound('RATCHET_CLICK');
  assert.equal(ratchetClick.type, 'RATCHET_CLICK');
  assert.equal(ratchetClick.pitchHz, 3200);

  const breakerCrack = audio.triggerToolSound('BREAKER_BAR_BREAKAWAY');
  assert.equal(breakerCrack.type, 'BREAKER_BAR_BREAKAWAY');

  const torqueCamClick = audio.triggerToolSound('TORQUE_WRENCH_CLICK');
  assert.equal(torqueCamClick.type, 'TORQUE_WRENCH_CLICK');
});

test('Stage 7: Persistence System - Schema Migration v1.0.0 to v2.0.0', () => {
  // Legacy v1.0.0 payload without career or running gear
  const legacyV1Payload = {
    version: '1.0.0',
    timestamp: 1700000000000,
    liftHeight: 1.5,
    components: [{ id: 'front_bumper', installed: true }],
    engineState: { engineOilLiters: 7.0, oilConditionPercent: 100.0 }
  };

  const migrated = migratePayload(legacyV1Payload);
  assert.equal(migrated.version, '2.0.0');
  assert.equal(migrated.migratedFrom, '1.0.0');
  assert.ok(migrated.careerState !== undefined);
  assert.equal(migrated.careerState.shopBalance, 15000.0);
  assert.ok(migrated.runningGearState !== undefined);
  assert.equal(migrated.runningGearState.fluidFirmness, 1.0);
  assert.equal(migrated.graphicsSettings.preset, 'HIGH');
});
