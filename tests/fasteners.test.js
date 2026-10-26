import test from 'node:test';
import assert from 'node:assert/strict';
import { FastenerMechanics, THREAD_CONDITIONS, FASTENER_STATES } from '../clients/workshop-prototype/src/fastener-mechanics.js';
import { ToolController, TOOL_TYPES } from '../clients/workshop-prototype/src/tool-ratchet.js';

test('Fastener Clamping Force obeys F = T / (K * d)', () => {
  // M10 bolt (d = 0.010 m), Target 25 N*m, K = 0.18
  // F = 25 / (0.18 * 0.010) = 13,888.89 N
  const force = FastenerMechanics.calculateClampingForce(25.0, 10.0, 0.18);
  assert.ok(Math.abs(force - 13888.89) < 0.1, `Expected ~13888.89 N, got ${force}`);
});

test('Fastener accurately classifies in-spec torque', () => {
  const fastener = FastenerMechanics.createFastener({
    id: 'm10_subframe_bolt',
    nominalDiameterMm: 10.0,
    targetTorqueNm: 25.0,
    yieldTorqueLimitNm: 45.0,
    ultimateShearTorqueNm: 60.0
  });

  const result = FastenerMechanics.applyTorque(fastener, 25.0);
  assert.equal(result.status, 'IN_SPEC');
  assert.equal(result.isTorqued, true);
  assert.equal(fastener.state, FASTENER_STATES.INTACT);
});

test('Fastener shears/strips threads when torque exceeds yield limit', () => {
  const fastener = FastenerMechanics.createFastener({
    id: 'm10_subframe_bolt',
    nominalDiameterMm: 10.0,
    targetTorqueNm: 25.0,
    yieldTorqueLimitNm: 45.0,
    ultimateShearTorqueNm: 70.0
  });

  const result = FastenerMechanics.applyTorque(fastener, 50.0); // Exceeds 45 N*m yield limit
  assert.equal(result.success, false);
  assert.equal(fastener.state, FASTENER_STATES.THREAD_STRIPPED);
  assert.equal(fastener.clampingForceN, 0);
  assert.equal(fastener.isTorqued, false);
});

test('Stage 2: Fastener Clamping Force across Lubrication K Factors', () => {
  // M12 Wheel Lug Bolt at 120 N·m
  // Dry: K = 0.20 -> F = 120 / (0.20 * 0.012) = 50,000 N
  const fDry = FastenerMechanics.calculateClampingForce(120.0, 12.0, THREAD_CONDITIONS.DRY.kFactor);
  assert.ok(Math.abs(fDry - 50000) < 0.1);

  // Lubricated: K = 0.15 -> F = 120 / (0.15 * 0.012) = 66,666.67 N (Higher clamp for same torque!)
  const fLub = FastenerMechanics.calculateClampingForce(120.0, 12.0, THREAD_CONDITIONS.LUBRICATED.kFactor);
  assert.ok(Math.abs(fLub - 66666.67) < 0.1);

  // Anti-Seize: K = 0.12 -> F = 120 / (0.12 * 0.012) = 83,333.33 N
  const fAnti = FastenerMechanics.calculateClampingForce(120.0, 12.0, THREAD_CONDITIONS.ANTI_SEIZE.kFactor);
  assert.ok(Math.abs(fAnti - 83333.33) < 0.1);

  // Rusted: K = 0.35 -> F = 120 / (0.35 * 0.012) = 28,571.43 N (Severe clamp loss due to friction)
  const fRust = FastenerMechanics.calculateClampingForce(120.0, 12.0, THREAD_CONDITIONS.RUSTED.kFactor);
  assert.ok(Math.abs(fRust - 28571.43) < 0.1);
});

test('Stage 2: Ultimate Shear Failure Mode (Bolt Shank Snaps)', () => {
  const fastener = FastenerMechanics.createFastener({
    id: 'caliper_bracket_bolt',
    nominalDiameterMm: 12.0,
    targetTorqueNm: 85.0,
    yieldTorqueLimitNm: 120.0,
    ultimateShearTorqueNm: 140.0
  });

  const result = FastenerMechanics.applyTorque(fastener, 150.0); // Exceeds ultimate shear
  assert.equal(result.success, false);
  assert.equal(fastener.state, FASTENER_STATES.BOLT_SHEARED);
  assert.ok(result.message.includes('Bolt shank sheared off'));
});

test('Stage 2: Head Rounding Failure from Mismatched Tool Sizing', () => {
  const fastener = FastenerMechanics.createFastener({
    id: 'm12_lug_bolt',
    socketSizeMm: 17.0
  });

  // Attempting to torque with a loose 19mm socket
  const result = FastenerMechanics.applyTorque(fastener, 40.0, { socketSizeMm: 19.0 });
  assert.equal(result.success, false);
  assert.equal(fastener.state, FASTENER_STATES.HEAD_ROUNDED);
  assert.ok(result.message.includes('Hex corners rounded'));
});

test('Stage 2: Torque-To-Yield (TTY) Angle Bolt Elastic Elongation', () => {
  const ttyBolt = FastenerMechanics.createFastener({
    id: 'cylinder_head_bolt_1',
    isTTY: true,
    targetTorqueNm: 40.0,
    yieldTorqueLimitNm: 80.0
  });

  // Over-torquing TTY bolt causes permanent plastic stretching
  const result = FastenerMechanics.applyTorque(ttyBolt, 55.0);
  assert.equal(result.success, false);
  assert.equal(ttyBolt.state, FASTENER_STATES.TTY_STRETCHED);
  assert.ok(result.message.includes('TTY bolt stretched past elastic limit'));
});

test('Stage 2: Seized Fastener, Penetrating Oil & Breaker Bar Leverage', () => {
  const seizedBolt = FastenerMechanics.createFastener({
    id: 'exhaust_manifold_stud',
    nominalDiameterMm: 8.0,
    targetTorqueNm: 25.0,
    condition: 'RUSTED',
    isSeized: true
  });

  const controller = new ToolController();
  controller.equipTool({ id: 'TOOL_RATCHET_3_8', category: TOOL_TYPES.RATCHET, driveSize: '3/8"' });
  controller.attachSocket({ sizeMm: 17.0, driveSize: '3/8"' });
  controller.toggleDirection(); // LOOSEN

  // Standard ratchet cannot break free seized bolt
  const ratchetAttempt = controller.operateStroke(seizedBolt, 45.0);
  assert.equal(ratchetAttempt.success, false);
  assert.equal(seizedBolt.state, FASTENER_STATES.SEIZED);

  // Apply penetrating fluid
  const oilResult = FastenerMechanics.applyPenetratingOil(seizedBolt);
  assert.ok(oilResult.success);
  assert.equal(seizedBolt.kFactor, 0.22);

  // Equip 600mm Breaker Bar
  controller.equipTool({ id: 'TOOL_BREAKER_BAR', category: TOOL_TYPES.BREAKER_BAR, driveSize: '1/2"' });
  controller.attachSocket({ sizeMm: 17.0, driveSize: '1/2"' });
  controller.direction = 'LOOSEN';

  // Breaker bar breaks free the corrosion bond
  const breakerAttempt = controller.operateStroke(seizedBolt, 40.0);
  assert.ok(breakerAttempt.success);
  assert.equal(breakerAttempt.action, 'BREAKAWAY');
  assert.equal(seizedBolt.state, FASTENER_STATES.INTACT);
});

test('Stage 2: Broken Stud Extraction using Left-Hand Screw Extractor', () => {
  const brokenStud = FastenerMechanics.createFastener({
    id: 'broken_manifold_stud',
    nominalDiameterMm: 8.0
  });
  brokenStud.state = FASTENER_STATES.BOLT_SHEARED;

  const controller = new ToolController();
  controller.equipTool({ id: 'TOOL_SCREW_EXTRACTOR', category: TOOL_TYPES.EXTRACTOR });

  const extractResult = controller.operateStroke(brokenStud, 360.0);
  assert.ok(extractResult.success);
  assert.equal(brokenStud.state, FASTENER_STATES.EXTRACTED);
  assert.equal(brokenStud.isDisengaged, true);
  assert.ok(extractResult.message.includes('successfully backed out'));
});

test('Stage 2: Micrometer Click Torque Wrench Mechanism & Decoupling', () => {
  const wheelLug = FastenerMechanics.createFastener({
    id: 'm12_wheel_lug_1',
    socketSizeMm: 17.0,
    targetTorqueNm: 120.0,
    yieldTorqueLimitNm: 180.0
  });

  const controller = new ToolController();
  controller.equipTool({
    id: 'TOOL_TORQUE_1_2',
    category: TOOL_TYPES.TORQUE_WRENCH,
    driveSize: '1/2"',
    minTorque: 20,
    maxTorque: 220
  });
  controller.attachSocket({ sizeMm: 17.0, driveSize: '1/2"' });

  // Calibrate micrometer dial to 120 N·m
  controller.setTorqueWrenchTarget(120.0);
  assert.equal(controller.targetTorqueSettingNm, 120.0);

  // Apply torque stroke
  const torqueResult = controller.operateStroke(wheelLug, 30.0);
  assert.ok(torqueResult.success);
  assert.equal(torqueResult.clickSound, true);
  assert.equal(controller.isClickTriggered, true);
  assert.equal(wheelLug.isTorqued, true);

  // Subsequent strokes safely decouple to prevent over-tightening
  const secondStroke = controller.operateStroke(wheelLug, 30.0);
  assert.ok(secondStroke.success);
  assert.ok(secondStroke.message.includes('already reached! Decoupled'));
});

test('Stage 2: Tightening Sequence Validation (Wheel Star & Head Spiral)', () => {
  // Correct 5-lug star sequence: 1 -> 3 -> 5 -> 2 -> 4
  const validStar = FastenerMechanics.validateTighteningSequence('WHEEL_5_LUG', ['lug_1', 'lug_3', 'lug_5', 'lug_2', 'lug_4']);
  assert.equal(validStar.isValid, true);
  assert.equal(validStar.warpageRiskPercent, 0);

  // Incorrect circular sequence: 1 -> 2 -> 3 -> 4 -> 5
  const badCircle = FastenerMechanics.validateTighteningSequence('WHEEL_5_LUG', ['lug_1', 'lug_2', 'lug_3', 'lug_4', 'lug_5']);
  assert.equal(badCircle.isValid, false);
  assert.ok(badCircle.warpageRiskPercent > 0);
  assert.ok(badCircle.message.includes('Brake rotor warping risk'));

  // Head spiral pattern validation
  const validHead = FastenerMechanics.validateTighteningSequence('HEAD_SPIRAL', [
    'head_bolt_7', 'head_bolt_8',
    'head_bolt_3', 'head_bolt_4',
    'head_bolt_11', 'head_bolt_12',
    'head_bolt_1', 'head_bolt_2',
    'head_bolt_5', 'head_bolt_6',
    'head_bolt_9', 'head_bolt_10'
  ]);
  assert.equal(validHead.isValid, true);
  assert.equal(validHead.gasketSealIntegrity, 'EXCELLENT');
});
