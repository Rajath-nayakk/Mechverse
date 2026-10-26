import test from 'node:test';
import assert from 'node:assert/strict';
import { OilServiceSystem, RefuelingSafetySystem, FUEL_GRADES, OIL_TYPES } from '../clients/workshop-prototype/src/service-system.js';
import { PanelRestorationSystem, PAINT_LAYERS, OEM_BMW_COLORS } from '../clients/workshop-prototype/src/restoration-system.js';

test('Stage 5: Oil Service - Torricelli Stream Thinning, Filter Replacement & Dipstick Verification', () => {
  const oilService = new OilServiceSystem({ oilCapacityLiters: 7.0 }); // BMW S58 7.0L capacity
  assert.equal(oilService.currentOilLiters, 7.0);
  assert.equal(oilService.isDrainPlugInstalled, true);

  // 1. Initial State: No flow when drain plug is installed
  const initialStep = oilService.stepSimulation(1.0);
  assert.equal(initialStep.streamState, 'NONE');
  assert.equal(initialStep.flowLps, 0.0);

  // 2. Remove drain plug -> Initial high-velocity jet stream
  const plugResult = oilService.operateDrainPlug(true);
  assert.equal(plugResult.success, true);
  assert.equal(oilService.isDrainPlugInstalled, false);

  const step1 = oilService.stepSimulation(2.0); // 2 seconds of Torricelli flow
  assert.equal(step1.streamState, 'JET');
  assert.ok(step1.flowLps > 0.15, `Expected jet flow > 0.15 L/s, got ${step1.flowLps}`);
  assert.ok(step1.streamDiameterMm >= 10.0, `Expected thick stream diameter >= 10mm, got ${step1.streamDiameterMm}mm`);
  assert.ok(step1.oilRemainingLiters < 7.0);
  assert.ok(step1.wasteCollectedLiters > 0.0);

  // 3. Progressive draining -> Stream thins to laminar flow, then dripping
  // Step simulation until low oil (Torricelli flow decelerates with head drop)
  for (let i = 0; i < 50; i++) {
    oilService.stepSimulation(1.0);
  }
  assert.ok(oilService.currentOilLiters < 1.0, `Expected low oil level, got ${oilService.currentOilLiters}L`);
  const lateStep = oilService.stepSimulation(0.5);
  assert.ok(['LAMINAR', 'DRIPPING', 'DRY'].includes(lateStep.streamState));
  assert.ok(lateStep.streamDiameterMm < step1.streamDiameterMm, 'Stream diameter must thin as hydrostatic head drops');

  // Complete drain
  for (let i = 0; i < 20; i++) {
    oilService.stepSimulation(1.0);
  }
  assert.equal(oilService.currentOilLiters, 0.0);
  assert.equal(oilService.streamState, 'DRY');

  // 4. Catch Pan Misalignment Spillage Test
  const leakyService = new OilServiceSystem({ oilCapacityLiters: 7.0 });
  leakyService.setCatchPanPosition(false); // Pan moved away
  leakyService.operateDrainPlug(true);
  const spillStep = leakyService.stepSimulation(1.0);
  assert.ok(spillStep.floorSpillageLiters > 0.0, 'Misaligned catch pan must result in floor spillage');

  // 5. Spin-On Oil Filter Inspection & Replacement
  const filterInspect = oilService.removeOilFilter();
  assert.equal(filterInspect.success, true);
  assert.equal(oilService.isOilFilterInstalled, false);

  // Attempt refill without filter -> Spillage warning
  oilService.isFillerCapRemoved = true;
  oilService.operateDrainPlug(false, 25.0); // Reinstall plug
  const failRefill = oilService.refillFreshOil(2.0);
  assert.equal(failRefill.success, false);
  assert.match(failRefill.error, /oil filter housing is open/i);

  // Install new OEM filter with lubricated O-ring
  const filterInstall = oilService.installNewOilFilter(true);
  assert.equal(filterInstall.success, true);
  assert.equal(filterInstall.isOringLubricated, true);
  assert.equal(oilService.isOilFilterInstalled, true);

  // 6. Refill Fresh Synthetic 0W-30 Oil and Check Dipstick
  const refillRes = oilService.refillFreshOil(7.0, OIL_TYPES.SYNTHETIC_0W30_LL01);
  assert.equal(refillRes.success, true);
  assert.equal(refillRes.currentTotalLiters, 7.0);
  assert.ok(refillRes.oilConditionPercent > 80.0, 'Fresh oil must restore condition score');

  const dipstick = oilService.checkDipstick();
  assert.equal(dipstick.readingLevel, 'IN_SPEC');
  assert.equal(dipstick.isClean, true);
  assert.equal(dipstick.safeToStartEngine, true);
  assert.equal(dipstick.colorHex, OIL_TYPES.SYNTHETIC_0W30_LL01.freshColorHex);
});

test('Stage 5: Refueling Safety Interlock - Static Grounding, Grade Protection & Venturi Cutoff', () => {
  const refueling = new RefuelingSafetySystem({
    fuelTankCapacityLiters: 59.0, // BMW M4 Competition tank
    requiredFuel: FUEL_GRADES.RON_98
  });
  assert.equal(refueling.currentFuelLiters, 12.0);

  // 1. Static Grounding Protocol: Attempting to remove cap before bonding ground clamp is rejected
  refueling.openFillerFlap();
  const prematureCap = refueling.removeFuelCap();
  assert.equal(prematureCap.success, false);
  assert.equal(prematureCap.safetyViolation, 'STATIC_ELECTRICITY_HAZARD');

  // Attach grounding clamp to chassis grounding post
  const groundAttach = refueling.attachGroundClamp(true);
  assert.equal(groundAttach.attached, true);

  // Now removing cap succeeds
  const capSuccess = refueling.removeFuelCap();
  assert.equal(capSuccess.success, true);

  // 2. Engine Running Safety Lockout: Attempting to dispense with engine running is rejected
  refueling.insertNozzle(FUEL_GRADES.RON_98);
  refueling.setEngineState(true, true); // Engine running!
  const runningLockout = refueling.dispenseFuel(15.0);
  assert.equal(runningLockout.success, false);
  assert.equal(runningLockout.safetyViolation, 'ENGINE_RUNNING_LOCKOUT');

  // Turn vehicle engine/ignition OFF
  refueling.setEngineState(false, false);

  // 3. Misfueling Prevention: Attempting to dispense Diesel into BMW M4 is rejected
  refueling.insertNozzle(FUEL_GRADES.DIESEL);
  const dieselReject = refueling.dispenseFuel(10.0);
  assert.equal(dieselReject.success, false);
  assert.equal(dieselReject.safetyViolation, 'MISFUELING_PREVENTION');
  assert.match(dieselReject.error, /requires Super Plus 98 RON/i);

  // 4. Proper 98 RON Dispensing
  refueling.insertNozzle(FUEL_GRADES.RON_98);
  const dispense1 = refueling.dispenseFuel(30.0);
  assert.equal(dispense1.success, true);
  assert.equal(dispense1.dispensedLiters, 30.0);
  assert.equal(refueling.currentFuelLiters, 42.0);
  assert.equal(dispense1.isFull, false);

  // 5. Automatic Venturi Shutoff Mechanism on Full Tank
  const dispenseFull = refueling.dispenseFuel(25.0); // 42 + 25 = 67L > 59L capacity
  assert.equal(dispenseFull.success, true);
  assert.equal(dispenseFull.dispensedLiters, 17.0); // Only 17L dispensed to reach 59.0L
  assert.equal(refueling.currentFuelLiters, 59.0);
  assert.equal(dispenseFull.isFull, true);
  assert.equal(dispenseFull.venturiCutoffTripped, true);

  // Additional dispensing attempts click off immediately
  const overflowAttempt = refueling.dispenseFuel(5.0);
  assert.equal(overflowAttempt.success, false);
  assert.equal(overflowAttempt.venturiCutoff, true);
});

test('Stage 5: Body Restoration & Multi-Stage Paint Booth - Dent Pulling, Rust Grinding, Welding & Wet Sanding', () => {
  const resto = new PanelRestorationSystem();
  
  // 1. Suction Dent Puller: Progressive deformation reduction
  const fender = resto.getPanel('front_right_quarter_panel');
  assert.equal(fender.dentDepthMm, 4.5);
  
  const pullStep = resto.repairDent('front_right_quarter_panel', 400.0);
  assert.equal(pullStep.success, true);
  assert.ok(pullStep.dentDepthMm < 4.5);
  
  resto.repairDent('front_right_quarter_panel', 800.0);
  assert.equal(fender.dentDepthMm, 0.0);

  // 2. Angle Grinder Rust Removal: Bare metal surface preparation
  const rustGrind = resto.grindRust('front_right_quarter_panel', 2.0);
  assert.equal(rustGrind.isCleanBareMetal, true);
  assert.equal(fender.rustLevelPercent, 0.0);

  // 3. Structural Welding: Heat input calculation & quality
  const bracket = resto.getPanel('exhaust_muffler_bracket');
  resto.grindRust('exhaust_muffler_bracket', 3.0);
  const weldRes = resto.weldJoint('exhaust_muffler_bracket');
  assert.equal(weldRes.success, true);
  assert.ok(weldRes.heatInputJPerMm >= 350 && weldRes.heatInputJPerMm <= 550);
  assert.ok(weldRes.weldQualityPercent >= 75.0);

  // 4. Masking Preparation
  const maskRes = resto.maskPanel('front_right_quarter_panel');
  assert.equal(maskRes.success, true);
  assert.equal(fender.isMasked, true);

  // 5. Multi-Stage Automotive Paint Booth:
  // Step A: Etching Primer
  const primer = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.PRIMER);
  assert.equal(primer.success, true);
  assert.equal(fender.paintLayers.includes(PAINT_LAYERS.PRIMER), true);

  // Step B: OEM BMW Isle of Man Green Metallic Basecoat (#164a38)
  const basecoat = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.BASECOAT, OEM_BMW_COLORS.ISLE_OF_MAN_GREEN.hex);
  assert.equal(basecoat.success, true);
  assert.equal(fender.currentColor, '#164a38');

  // Step C: 2K Polyurethane High-Solid Clearcoat
  const clearcoat = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.CLEARCOAT);
  assert.equal(clearcoat.success, true);
  assert.equal(fender.clearcoatThicknessUm, 45.0);
  assert.ok(fender.glossPercent >= 90.0);

  // Step D: 2500-Grit Wet Sanding & Rotary Compound Polishing
  const polish = resto.wetSandAndPolish('front_right_quarter_panel', 2);
  assert.equal(polish.success, true);
  assert.equal(polish.glossPercent, 99.0);
  assert.equal(polish.orangePeelLevel, 'ZERO_TEXTURE_MIRROR');
  assert.equal(fender.clearcoatThicknessUm, 40.0); // Leveled 5 um
});
