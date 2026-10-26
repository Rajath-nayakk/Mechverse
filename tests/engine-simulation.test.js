import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineSimulation, ENGINE_SPECS, ENGINE_SPECS_S58, ENGINE_SPECS_V12, S58_DISASSEMBLY_TREE, V12SwapFeasibilityChecker, MECHANICAL_FAULTS } from '../clients/workshop-prototype/src/engine-simulation.js';

test('EngineSimulation - Initial specs and healthy compression baseline', () => {
  const engine = new EngineSimulation();
  assert.equal(engine.specs.cylinders, 4);
  assert.equal(engine.specs.displacementLiters, 2.0);
  assert.equal(engine.specs.compressionRatio, 10.5);

  // Connect compression gauge to cylinder 1
  const connectRes = engine.connectCompressionTester(1, false);
  assert.equal(connectRes.connected, true);
  assert.equal(connectRes.cylinder, 1);

  // Crank compression test
  const crankRes = engine.crankCompressionTest();
  assert.equal(crankRes.success, true);
  assert.equal(crankRes.cylinder, 1);
  assert.ok(crankRes.pressurePsi >= 170.0 && crankRes.pressurePsi <= 180.0, `Expected ~175 PSI, got ${crankRes.pressurePsi}`);
  assert.equal(crankRes.passed, true);
});

test('EngineSimulation - Piston kinematic displacement obeys crank-slider geometry', () => {
  const engine = new EngineSimulation();
  // At theta = 0 (TDC), displacement should be 0 mm
  const dispTDC = engine.getPistonDisplacementMm(1, 0.0);
  assert.ok(Math.abs(dispTDC - 0.0) < 0.001, `TDC displacement should be 0, got ${dispTDC}`);

  // At theta = PI (BDC), displacement should equal full stroke (90 mm)
  const dispBDC = engine.getPistonDisplacementMm(1, Math.PI);
  assert.ok(Math.abs(dispBDC - 90.0) < 0.01, `BDC displacement should be 90mm, got ${dispBDC}`);
});

test('EngineSimulation - Fault: Blown Head Gasket between Cylinders 2 & 3', () => {
  const engine = new EngineSimulation();
  engine.setMechanicalFault(MECHANICAL_FAULTS.BLOWN_HEAD_GASKET, true);

  // Cyl 1 healthy
  engine.connectCompressionTester(1, false);
  const res1 = engine.crankCompressionTest();
  assert.ok(res1.pressurePsi >= 170.0);

  // Cyl 2 blown gasket
  engine.connectCompressionTester(2, false);
  const res2 = engine.crankCompressionTest();
  assert.ok(res2.pressurePsi < 80.0, `Expected low compression on Cyl 2, got ${res2.pressurePsi}`);
  assert.equal(res2.passed, false);

  // Leakdown test indicates radiator bubbles
  const leakRes = engine.connectLeakdownTester(2);
  assert.equal(leakRes.leakLocation, 'RADIATOR_CAP');
  assert.ok(leakRes.leakagePercent > 50.0);
});

test('EngineSimulation - Fault: Bent Intake Valve on Cylinder 1', () => {
  const engine = new EngineSimulation();
  engine.setMechanicalFault(MECHANICAL_FAULTS.BENT_INTAKE_VALVE_CYL1, true);

  engine.connectCompressionTester(1, false);
  const res = engine.crankCompressionTest();
  assert.ok(res.pressurePsi <= 15.0, `Expected near zero compression on bent valve, got ${res.pressurePsi}`);

  const leakRes = engine.connectLeakdownTester(1);
  assert.equal(leakRes.leakLocation, 'INTAKE_VALVE');
  assert.ok(leakRes.leakagePercent >= 85.0);
});

test('EngineSimulation - Fault: Worn Piston Rings on Cyl 4 (Dry vs Wet Test)', () => {
  const engine = new EngineSimulation();
  engine.setMechanicalFault(MECHANICAL_FAULTS.WORN_PISTON_RINGS_CYL4, true);

  // Dry test: low compression
  engine.connectCompressionTester(4, false);
  const dryRes = engine.crankCompressionTest();
  assert.ok(dryRes.pressurePsi < 120.0, `Dry test should be low, got ${dryRes.pressurePsi}`);

  // Wet test: oil seals rings, restoring compression
  engine.connectCompressionTester(4, true);
  const wetRes = engine.crankCompressionTest();
  assert.ok(wetRes.pressurePsi > 160.0, `Wet test should restore compression, got ${wetRes.pressurePsi}`);

  const leakRes = engine.connectLeakdownTester(4);
  assert.equal(leakRes.leakLocation, 'OIL_FILLER_CRANKCASE');
});

test('EngineSimulation - Engine Oil Draining & Refilling Workflow', () => {
  const engine = new EngineSimulation();
  assert.equal(engine.engineOilLiters, 4.2);

  // Drain plug removed -> oil drains
  engine.isDrainPlugInstalled = false;
  engine.drainOil(2.0); // 2 seconds @ 0.75 L/s = 1.5 L drained
  assert.ok(Math.abs(engine.engineOilLiters - 2.7) < 0.1);
  assert.ok(engine.collectedWasteOilLiters >= 1.4);

  // Drain completely
  engine.drainOil(10.0);
  assert.equal(engine.engineOilLiters, 0.0);

  // Attempt refill with plug removed fails
  engine.isOilFillCapOpen = true;
  const failRefill = engine.refillOil(4.0);
  assert.equal(failRefill.success, false);
  assert.match(failRefill.error, /drain plug is missing/i);

  // Reinstall drain plug and refill
  engine.isDrainPlugInstalled = true;
  const successRefill = engine.refillOil(4.5);
  assert.equal(successRefill.success, true);
  assert.equal(engine.engineOilLiters, 4.5);
  assert.ok(engine.oilConditionPercent > 80.0);
});

test('Stage 3: Factory BMW S58 Twin-Turbo DOHC I6 Specification', () => {
  const engine = new EngineSimulation();
  engine.setEngineType('S58');

  assert.equal(engine.specs.cylinders, 6);
  assert.equal(engine.specs.displacementLiters, 2.993);
  assert.equal(engine.specs.twinTurbos, true);
  assert.equal(engine.specs.compressionRatio, 9.3);
  assert.deepEqual(engine.specs.firingOrder, [1, 5, 3, 6, 2, 4]);
  assert.equal(engine.cylinderHealth.length, 6);
  assert.equal(engine.specs.oilCapacityLiters, 7.0);
});

test('Stage 3: S58 Teardown Hierarchy & Disassembly Prerequisites', () => {
  const engine = new EngineSimulation();
  const removedParts = new Set();

  // Cannot remove spark plugs before removing ignition coils
  const sparkPlugCheck = engine.canRemoveDisassemblyComponent('spark_plugs', removedParts);
  assert.equal(sparkPlugCheck.allowed, false);
  assert.ok(sparkPlugCheck.missingPrereqs.includes('ignition_coils'));

  // Remove engine cover and coils
  removedParts.add('engine_cover');
  removedParts.add('ignition_coils');

  // Now spark plugs can be removed
  const sparkPlugAllowed = engine.canRemoveDisassemblyComponent('spark_plugs', removedParts);
  assert.equal(sparkPlugAllowed.allowed, true);
  removedParts.add('spark_plugs');

  // Cannot remove cylinder head before head bolts and twin turbos
  const headCheck = engine.canRemoveDisassemblyComponent('cylinder_head', removedParts);
  assert.equal(headCheck.allowed, false);
  assert.ok(headCheck.missingPrereqs.includes('head_bolts'));
});

test('Stage 3: Custom 6.0L V12 Swap Feasibility Evaluation', () => {
  const evaluation = V12SwapFeasibilityChecker.evaluateFeasibility();

  assert.equal(evaluation.isFeasible, true);
  assert.ok(evaluation.overallScore >= 85, `Overall feasibility score should be high, got ${evaluation.overallScore}`);
  assert.equal(evaluation.clearances.lengthPass, true);
  assert.equal(evaluation.clearances.widthPass, true);
  assert.equal(evaluation.clearances.heightPass, true);

  // Weight distribution check: front shifts by approx +1.9%
  assert.ok(evaluation.weightDistribution.newFrontPct > evaluation.weightDistribution.originalFrontPct);
  assert.ok(evaluation.weightDistribution.shiftDeltaPct < 3.0, 'Weight shift should be manageable under 3%');
  assert.ok(evaluation.swapRequirements.length >= 4);
});

test('Stage 3: 4-Stroke Kinematic Cycle and Valvetrain Profiles', () => {
  const engine = new EngineSimulation();
  engine.setEngineType('S58');

  // Stroke detection across 720 degrees for Cyl 1 (firing offset = 0)
  assert.equal(engine.getCycleStroke(1, 45), 'INTAKE');
  assert.equal(engine.getCycleStroke(1, 220), 'COMPRESSION');
  assert.equal(engine.getCycleStroke(1, 400), 'POWER');
  assert.equal(engine.getCycleStroke(1, 600), 'EXHAUST');

  // Valvetrain valve lift: Intake valve must lift during intake stroke
  const intakeState = engine.getValveLiftMm(1, 90);
  assert.ok(intakeState.intakeLiftMm > 6.0, `Intake valve must be lifted at 90 deg, got ${intakeState.intakeLiftMm}mm`);
  assert.equal(intakeState.exhaustLiftMm, 0.0);

  // Instantaneous pressure: Peak power stroke pressure must exceed compression pressure
  const compPress = engine.getInstantaneousPressurePsi(1, 340);
  const powerPress = engine.getInstantaneousPressurePsi(1, 370);
  assert.ok(powerPress > compPress * 2.0, `Combustion power pressure (${powerPress.toFixed(0)} PSI) must spike well above compression (${compPress.toFixed(0)} PSI)`);

  // Piston kinematics at TDC vs BDC
  const kinTDC = engine.getPistonKinematics(1, 0, 1000);
  assert.ok(Math.abs(kinTDC.displacementMm) < 0.1);
  assert.ok(Math.abs(kinTDC.velocityMps) < 0.1);

  const kinMid = engine.getPistonKinematics(1, Math.PI / 2, 1000);
  assert.ok(Math.abs(kinMid.velocityMps) > 3.0, 'Piston velocity should peak near mid-stroke');
});
