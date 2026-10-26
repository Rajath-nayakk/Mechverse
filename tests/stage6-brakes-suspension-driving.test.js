import test from 'node:test';
import assert from 'node:assert/strict';
import { RunningGearSystem, BrakeCorner, CoiloverSuspensionCorner } from '../clients/workshop-prototype/src/running-gear-system.js';
import { EngineStartSystem, VehicleDrivingDynamics } from '../clients/workshop-prototype/src/driving-physics.js';
import { OilServiceSystem } from '../clients/workshop-prototype/src/service-system.js';

test('Stage 6: Running Gear - Brake Rotor Wear, Slide Pins & Hydraulic Air Bubble Bleeding', () => {
  const runningGear = new RunningGearSystem();
  const frontLeftBrake = runningGear.brakes.FL;

  // 1. Rotor Inspection: Healthy baseline
  const healthyRotor = frontLeftBrake.inspectRotor();
  assert.equal(healthyRotor.isSafeForService, true);
  assert.equal(healthyRotor.isWarped, false);
  assert.equal(healthyRotor.isUnderThickness, false);

  // Warped Rotor Check (> 0.04mm causes pedal pulsation)
  frontLeftBrake.rotorLateralRunoutMm = 0.065;
  const warpedRotor = frontLeftBrake.inspectRotor();
  assert.equal(warpedRotor.isWarped, true);
  assert.equal(warpedRotor.isSafeForService, false);
  assert.match(warpedRotor.recommendation, /exceeds 0.04mm/i);

  // 2. Brake Pad Wear Inspection
  frontLeftBrake.padLiningThicknessMm = 2.5; // Below 3.0mm discard limit
  const wornPads = frontLeftBrake.inspectPads();
  assert.equal(wornPads.isWornOut, true);
  assert.equal(wornPads.isBackingPlateMetalOnMetal, false);

  frontLeftBrake.padLiningThicknessMm = 0.2; // Backing plate metal-on-metal!
  const metalPads = frontLeftBrake.inspectPads();
  assert.equal(metalPads.isBackingPlateMetalOnMetal, true);
  assert.equal(metalPads.effectiveMu, 0.12, 'Metal-on-metal contact drops friction coefficient drastically');

  // 3. Caliper Slide Pins Lubrication
  const pinService = frontLeftBrake.serviceSlidePins(true);
  assert.equal(pinService.success, true);
  assert.equal(frontLeftBrake.areSlidePinsLubricated, true);

  // 4. Hydraulic Aeration and Brake Bleeding
  // Inject air bubbles into front hydraulic line
  runningGear.injectAirInLine('FL', 4.0); // 4 mL of air pocket
  const spongyFirmness = frontLeftBrake.getPedalFirmness();
  assert.ok(spongyFirmness < 0.4, `Air in lines must cause squishy pedal, got ${spongyFirmness}`);

  // Bleeding with bleeder closed fails
  const closedBleed = frontLeftBrake.bleedStroke(true);
  assert.equal(closedBleed.success, false);

  // Open bleeder screw and pump pedal
  frontLeftBrake.setBleederScrew(true);
  assert.equal(frontLeftBrake.isBleederOpen, true);

  // Stroke 1: Purges first batch of fluid and air bubbles
  const stroke1 = frontLeftBrake.bleedStroke(true, 15.0);
  assert.equal(stroke1.success, true);
  assert.equal(stroke1.hasVisibleBubbles, true);
  assert.ok(stroke1.remainingAirMl < 4.0);

  // Stroke 2: Finish evacuating air
  frontLeftBrake.bleedStroke(true, 20.0);
  const stroke3 = frontLeftBrake.bleedStroke(true, 20.0);
  assert.equal(stroke3.isLineSolid, true);
  assert.ok(stroke3.pedalFirmness > 0.95, 'Evacuating air bubbles restores firm hydraulic pedal');

  // Close bleeder
  frontLeftBrake.setBleederScrew(false);
  assert.equal(frontLeftBrake.isBleederOpen, false);
});

test('Stage 6: Coilover Suspension - Threaded Perch Collar, Damping Clicks & Bounce Frequency', () => {
  const coiloverFL = new CoiloverSuspensionCorner('FL', true);
  assert.equal(coiloverFL.springRateNPerMm, 65.0); // BMW M4 factory front rate
  assert.equal(coiloverFL.perchHeightOffsetMm, 0.0);

  // 1. Threaded collar ride height adjustment
  const lowerRes = coiloverFL.adjustPerchHeight(-20.0); // 20mm lowering
  assert.equal(lowerRes.perchHeightOffsetMm, -20.0);
  assert.equal(lowerRes.effectiveRideHeightDeltaMm, -20.0);

  // Clamping at collar limit
  const maxLower = coiloverFL.adjustPerchHeight(-50.0);
  assert.equal(maxLower.perchHeightOffsetMm, -40.0, 'Collar adjustment clamped at -40mm travel limit');

  // 2. Damper Click Adjustment (24-way)
  const dampRes = coiloverFL.adjustDamping(18, 14);
  assert.equal(dampRes.reboundClicks, 18);
  assert.equal(dampRes.compressionClicks, 14);

  // 3. Natural Bounce Frequency calculation
  const fnHz = coiloverFL.getNaturalBounceFrequencyHz();
  assert.ok(fnHz >= 1.6 && fnHz <= 2.1, `Expected track-tuned M4 sports car bounce frequency ~1.7-2.0 Hz, got ${fnHz} Hz`);
});

test('Stage 6: Engine Starting Simulation - Interlocks, Starter Draw & Fast Idle', () => {
  const oilService = new OilServiceSystem({ oilCapacityLiters: 7.0 });
  const startSystem = new EngineStartSystem(oilService);

  // 1. Cranking with ignition OFF fails
  const noIgnition = startSystem.crankAndStart(12.6, 20.0);
  assert.equal(noIgnition.success, false);

  // Turn ignition ON
  startSystem.setIgnition(true);

  // 2. Cranking with weak battery fails with slow-crank
  const weakBat = startSystem.crankAndStart(10.2, 20.0);
  assert.equal(weakBat.success, false);
  assert.match(weakBat.error, /Battery voltage too low/i);

  // 3. Cranking with empty fuel tank fails
  const emptyFuel = startSystem.crankAndStart(12.6, 0.0);
  assert.equal(emptyFuel.success, false);
  assert.match(emptyFuel.error, /Fuel tank empty/i);

  // 4. Cranking with missing drain plug is blocked by engine protection interlock
  oilService.operateDrainPlug(true); // Drain plug removed
  const drySump = startSystem.crankAndStart(12.6, 20.0);
  assert.equal(drySump.success, false);
  assert.match(drySump.error, /Oil drain plug missing/i);

  // Reinstall drain plug and refill fresh oil
  oilService.operateDrainPlug(false, 25.0);
  oilService.isFillerCapRemoved = true;
  oilService.refillFreshOil(7.0);

  // 5. Successful Engine Catch
  const startSuccess = startSystem.crankAndStart(12.6, 35.0);
  assert.equal(startSuccess.success, true);
  assert.equal(startSystem.isEngineRunning, true);
  assert.equal(startSuccess.engineRpm, 1200.0, 'Cold start fast idle');
  assert.equal(startSuccess.fuelRailPressureBar, 350.0);
  assert.equal(startSuccess.oilPressureBar, 4.2);
  assert.equal(startSuccess.isCatHeatingActive, true);

  // Step engine past 15 seconds -> Cat heating cycle finishes, idle stabilizes to 850 RPM
  startSystem.stepEngine(16.0);
  assert.equal(startSystem.isCatHeatingActive, false);
  assert.equal(startSystem.engineRpm, 850.0);
});

test('Stage 6: Fastener-Torque Coupled Vehicle Driving Physics - Wheel Wobble, Detachment & Caliper Steering Pull', () => {
  const runningGear = new RunningGearSystem();
  const vehicle = new VehicleDrivingDynamics(runningGear);

  // 1. Baseline Driving with In-Spec Torques (140 N·m lugs, 110 N·m caliper brackets)
  vehicle.vehicleSpeedKmh = 100.0;
  const smoothWobble = vehicle.evaluateWheelWobble();
  assert.equal(smoothWobble.hasWheelWobble, false);
  assert.equal(smoothWobble.vibrationIntensity, 0.0);

  // Baseline Braking from 100 km/h: firm pedal, zero steering pull, short stopping distance
  const firmBraking = vehicle.applyBrakes(1.0);
  assert.ok(firmBraking.decelerationG >= 1.0);
  assert.equal(firmBraking.steeringPull.hasSteeringPull, false);
  assert.ok(firmBraking.stoppingDistance100To0Meters <= 38.0, `Expected ~35-37m stopping distance, got ${firmBraking.stoppingDistance100To0Meters}m`);

  // 2. Under-Torqued Wheel Lugs (< 80 N·m) Induces Wheel Wobble
  // Loosen FL wheel lugs to 40 N·m
  for (let b = 0; b < 5; b++) {
    vehicle.setWheelLugTorque('FL', b, 40.0);
  }
  const looseWobble = vehicle.evaluateWheelWobble();
  assert.equal(looseWobble.hasWheelWobble, true);
  assert.equal(looseWobble.worstCorner, 'FL');
  assert.ok(looseWobble.vibrationIntensity > 0.25, `Expected high vibration intensity, got ${looseWobble.vibrationIntensity}`);

  // 3. Dangerously Loose Lug Bolts (< 25 N·m) Leads to Catastrophic Wheel Detachment
  for (let b = 0; b < 5; b++) {
    vehicle.setWheelLugTorque('FL', b, 15.0); // Hand-tight only!
  }
  vehicle.distanceTraveledMeters = 0.0;
  vehicle.vehicleSpeedKmh = 50.0;

  // Step driving under cornering load
  let detachmentResult = null;
  for (let step = 0; step < 20; step++) {
    const stepRes = vehicle.stepDriving(0.6, 0.5);
    if (stepRes.catastrophicFailure) {
      detachmentResult = stepRes;
      break;
    }
  }
  assert.ok(detachmentResult !== null, 'Driving with dangerously loose lug bolts must trigger catastrophic wheel detachment');
  assert.equal(detachmentResult.detachedCorner, 'FL');
  assert.equal(vehicle.wheelDetached.FL, true);

  // 4. Loose Caliper Bracket Bolt Induces Severe Steering Pull under Braking
  const freshVehicle = new VehicleDrivingDynamics(runningGear);
  freshVehicle.setCaliperBracketTorque('FL', 20.0); // FL bracket loose (< 60 N·m)
  const pullBraking = freshVehicle.applyBrakes(1.0);
  assert.equal(pullBraking.steeringPull.hasSteeringPull, true);
  assert.equal(pullBraking.steeringPull.pullDirection, 'RIGHT', 'FL caliper deflection causes vehicle to pull right');
  assert.ok(pullBraking.steeringPull.steeringPullTorqueNm > 10.0);

  // 5. Spongy Aerated Brake Lines Extend Stopping Distance
  runningGear.injectAirInLine('FL', 5.0);
  runningGear.injectAirInLine('FR', 5.0);
  const aeratedBraking = freshVehicle.applyBrakes(1.0);
  assert.ok(aeratedBraking.pedalFirmness < 0.4);
  assert.ok(aeratedBraking.stoppingDistance100To0Meters > firmBraking.stoppingDistance100To0Meters * 1.5,
    'Aerated lines must increase 100-0 km/h stopping distance by >50%');
});
