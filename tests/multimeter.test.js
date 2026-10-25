import test from 'node:test';
import assert from 'node:assert/strict';
import { VehicleElectricalSystem } from '../clients/workshop-prototype/src/electrical-system.js';
import { DigitalMultimeter, MULTIMETER_MODES, METER_LEAD_JACKS } from '../clients/workshop-prototype/src/multimeter-system.js';

test('DigitalMultimeter - DC Voltage Measurement and Polarity', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  dmm.setMode(MULTIMETER_MODES.DC_VOLTS);
  dmm.connectProbes('BAT_POS', 'GND');

  const readingPos = dmm.measure();
  assert.equal(readingPos.unit, ' V DC');
  assert.ok(readingPos.rawNumericValue > 12.0);

  // Reverse probes
  dmm.connectProbes('GND', 'BAT_POS');
  const readingNeg = dmm.measure();
  assert.ok(readingNeg.rawNumericValue < -12.0);
  assert.ok(Math.abs(readingPos.rawNumericValue + readingNeg.rawNumericValue) < 1e-3);
});

test('DigitalMultimeter - Resistance Mode rejects energized circuit', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  // Turn ignition ON -> Main bus energized with 12V
  vehicle.ignitionState = 'ON';
  dmm.setMode(MULTIMETER_MODES.RESISTANCE);
  dmm.connectProbes('FUSED_MAIN_BUS', 'GND');

  const reading = dmm.measure();
  assert.equal(reading.display, 'ERR: POWER ON');
  assert.equal(reading.isHazard, true);
});

test('DigitalMultimeter - Resistance Mode on de-energized isolated component', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  // Turn ignition OFF
  vehicle.ignitionState = 'OFF';
  dmm.setMode(MULTIMETER_MODES.RESISTANCE);
  dmm.connectProbes('ENGINE_BLOCK', 'GND');

  const reading = dmm.measure();
  assert.equal(reading.isHazard, false);
  // Healthy engine ground strap is ~ 0.002 Ohms
  assert.ok(reading.rawNumericValue <= 0.05);
  assert.equal(reading.unit, ' \u03A9');
});

test('DigitalMultimeter - Continuity Mode: Intact path beeps, Open path reads OL', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  vehicle.ignitionState = 'OFF';
  dmm.setMode(MULTIMETER_MODES.CONTINUITY);

  // 1. Intact ground strap: resistance < 30 Ohms -> Continuity Beep
  dmm.connectProbes('ENGINE_BLOCK', 'GND');
  let reading = dmm.measure();
  assert.equal(reading.isContinuityBeep, true);

  // 2. Blow auxiliary fuse -> Isolate circuit -> Test across fuse terminals -> Reads O.L, no beep
  vehicle.auxFuse.blow();
  vehicle.battery.isConnected = false;
  dmm.connectProbes('FUSED_MAIN_BUS', 'AUX_FUSE_OUT');
  reading = dmm.measure();
  assert.equal(reading.isContinuityBeep, false);
  assert.equal(reading.isOverRange, true);
  assert.ok(reading.display.includes('O.L'));
});

test('DigitalMultimeter - DC Amps requires 10A current jack', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  dmm.setMode(MULTIMETER_MODES.DC_AMPS);
  dmm.setRedJack(METER_LEAD_JACKS.V_OHM); // Incorrect jack for current measurement
  dmm.connectProbes('BAT_NEG', 'GND');

  const reading = dmm.measure();
  assert.equal(reading.display, 'ERR: JACK CONFIG');
  assert.equal(reading.isHazard, true);
});

test('DigitalMultimeter - In-series current measurement and Parasitic Draw detection', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  // Vehicle parked, ignition OFF
  vehicle.ignitionState = 'OFF';
  dmm.setMode(MULTIMETER_MODES.DC_AMPS);
  dmm.setRedJack(METER_LEAD_JACKS.A_10A); // Correct 10A jack
  dmm.connectProbes('BAT_NEG', 'GND'); // In series with vehicle ground return

  // Normal parked state: cabin light off -> ~0.020A
  let reading = dmm.measure();
  assert.ok(reading.rawNumericValue < 0.050);

  // Parasitic drain: stuck dome light
  vehicle.cabinDomeSwitch = true;
  reading = dmm.measure();
  assert.ok(reading.rawNumericValue >= 0.50); // Abnormal parasitic current (~0.75A)
});

test('DigitalMultimeter - Current overload blows 10A meter fuse', () => {
  const vehicle = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(vehicle);

  dmm.setMode(MULTIMETER_MODES.DC_AMPS);
  dmm.setRedJack(METER_LEAD_JACKS.A_10A);

  // Danger: User connects 10A current jack across 12V battery rails directly
  dmm.connectProbes('BAT_POS', 'GND');
  const reading = dmm.measure();

  assert.equal(reading.display, 'FUSE BLOWN');
  assert.equal(dmm.isMeterFuseBlown, true);

  // Subsequent measurements fail until fuse is replaced
  dmm.connectProbes('BAT_NEG', 'GND');
  const reading2 = dmm.measure();
  assert.equal(reading2.display, 'FUSE BLOWN');

  // Replace meter fuse
  const replaceRes = dmm.replaceMeterFuse();
  assert.equal(replaceRes.success, true);
  assert.equal(dmm.isMeterFuseBlown, false);
});
