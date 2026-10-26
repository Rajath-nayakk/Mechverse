import test from 'node:test';
import assert from 'node:assert/strict';
import { DigitalMultimeter, MULTIMETER_MODES, METER_LEAD_JACKS } from '../clients/workshop-prototype/src/multimeter-system.js';
import { AutomotiveOscilloscope, SCOPE_SIGNALS } from '../clients/workshop-prototype/src/oscilloscope-system.js';
import { OBDScanner, DTC_DATABASE } from '../clients/workshop-prototype/src/obd-scanner.js';
import { VehicleElectricalSystem } from '../clients/workshop-prototype/src/electrical-system.js';

test('Stage 4: True RMS Digital Multimeter - Comprehensive Safety & Modes', () => {
  const electrical = new VehicleElectricalSystem();
  const dmm = new DigitalMultimeter(electrical);

  // 1. Off state
  assert.equal(dmm.takeMeasurement().display, 'OFF');

  // 2. DC Voltage mode: Battery Voltage measurement
  dmm.setMode(MULTIMETER_MODES.DC_VOLTS);
  dmm.connectProbes('BAT_POS', 'BAT_NEG');
  const voltReading = dmm.takeMeasurement();
  assert.ok(voltReading.unit.includes('V'));
  assert.ok(voltReading.rawNumericValue >= 12.0 && voltReading.rawNumericValue <= 13.0, `Expected ~12.6V, got ${voltReading.rawNumericValue}`);

  // 3. Resistance mode rejects energized circuits
  dmm.setMode(MULTIMETER_MODES.RESISTANCE);
  const resHazardReading = dmm.takeMeasurement();
  assert.equal(resHazardReading.isHazard, true);
  assert.ok(resHazardReading.display.includes('POWER ON') || resHazardReading.message?.includes('energized'));

  // 4. Continuity Mode: intact ground path beeps
  dmm.setMode(MULTIMETER_MODES.CONTINUITY);
  dmm.connectProbes('BAT_NEG', 'GND');
  const contReading = dmm.takeMeasurement();
  assert.equal(contReading.isContinuityBeep, true);
  assert.ok(contReading.rawNumericValue < 1.0, 'Intact ground cable should have near zero ohms');

  // 5. DC Amps mode requires 10A current jack
  dmm.setMode(MULTIMETER_MODES.DC_AMPS);
  const jackWarnReading = dmm.takeMeasurement();
  assert.ok(jackWarnReading.display.includes('JACK') || jackWarnReading.message?.includes('10A'));

  // Switch lead to 10A current jack
  dmm.setLeadJack(METER_LEAD_JACKS.A_10A);
  const currentReading = dmm.takeMeasurement();
  assert.ok(currentReading.unit.includes('A'));
});

test('Stage 4: Automotive Lab Oscilloscope - CKP 60-2, Injector Spike & Alternator Ripple', () => {
  const scope = new AutomotiveOscilloscope();
  assert.equal(scope.timebaseMsPerDiv, 5.0);

  // 1. CKP 60-2 Sensor Waveform (58 teeth + 2 missing teeth gap)
  const engineState = { engineRpm: 1200 };
  const revPeriod = 60.0 / 1200.0; // 0.05 seconds = 50 ms

  // Sample tooth passing
  const vTooth = scope.evaluateSignalVoltage(SCOPE_SIGNALS.CKP_60_MINUS_2, 0.005, engineState);
  assert.ok(typeof vTooth === 'number');

  // Sample missing tooth gap (around 59th/60th tooth position)
  const gapTime = revPeriod * (58.5 / 60.0);
  const vGap = scope.evaluateSignalVoltage(SCOPE_SIGNALS.CKP_60_MINUS_2, gapTime, engineState);
  assert.equal(vGap, 0.0, 'Missing tooth gap must output 0V reference signal');

  // 2. Direct Injector Pulse & Inductive Kickback Spike
  scope.connectSignal(1, SCOPE_SIGNALS.INJECTOR_PULSE);
  // During pull-down (6ms into cycle): ground level (< 1V)
  const vPullDown = scope.evaluateSignalVoltage(SCOPE_SIGNALS.INJECTOR_PULSE, 0.006, engineState);
  assert.ok(vPullDown < 1.0, `Injector pull-down should be near ground, got ${vPullDown}V`);

  // Flyback spike at pulse turn-off (7.9ms): voltage spikes over 50V
  const vSpike = scope.evaluateSignalVoltage(SCOPE_SIGNALS.INJECTOR_PULSE, 0.00782, engineState);
  assert.ok(vSpike > 50.0, `Inductive flyback kickback spike should exceed 50V, got ${vSpike}V`);

  // 3. Alternator Diode Ripple Waveform
  scope.connectSignal(2, SCOPE_SIGNALS.ALTERNATOR_RIPPLE);
  // Healthy alternator ripple is clean
  const healthyWave = scope.captureWaveforms({ engineRpm: 1500, faultBlownAlternatorDiode: false });
  assert.ok(healthyWave.ch2.vPeakToPeak < 0.6, `Healthy alternator AC ripple must be under 0.6 Vpp, got ${healthyWave.ch2.vPeakToPeak}V`);

  // Blown diode produces severe AC voltage drops (> 2.0 Vpp)
  const blownWave = scope.captureWaveforms({ engineRpm: 1500, faultBlownAlternatorDiode: true });
  assert.ok(blownWave.ch2.vPeakToPeak > 2.0, `Blown diode must exhibit large AC ripple drop > 2.0 Vpp, got ${blownWave.ch2.vPeakToPeak}V`);
});

test('Stage 4: OBD-II Scan Tool - ISO 15765 CAN Protocol, DTCs, Freeze Frame & Live PIDs', () => {
  const scanner = new OBDScanner();

  // 1. Connection Handshake
  const connResult = scanner.connect();
  assert.equal(connResult.connected, true);
  assert.equal(scanner.protocol, 'ISO 15765-4 (CAN 11/500)');

  // 2. Fault Trigger with Instantaneous Freeze Frame
  scanner.triggerFault('P0300', {
    engineRpm: 2650,
    vehicleSpeedKmh: 75.0,
    coolantTempC: 98.0,
    shortTermFuelTrimBank1Pct: 15.5
  });
  scanner.triggerFault('P0171', {
    engineRpm: 1800,
    vehicleSpeedKmh: 45.0,
    coolantTempC: 92.0
  });

  assert.equal(scanner.milStatus, true, 'Check Engine Light (MIL) must illuminate on DTC trigger');

  // 3. Read Stored DTCs
  const stored = scanner.readStoredCodes();
  assert.equal(stored.success, true);
  assert.equal(stored.dtcCount, 2);
  const codes = stored.codes.map(c => c.code);
  assert.ok(codes.includes('P0300'));
  assert.ok(codes.includes('P0171'));

  // 4. Freeze Frame Inspection
  const ff = scanner.readFreezeFrame('P0300');
  assert.equal(ff.success, true);
  assert.equal(ff.freezeFrame.dtcCaused, 'P0300');
  assert.equal(ff.freezeFrame.engineRpm, 2650);
  assert.equal(ff.freezeFrame.vehicleSpeedKmh, 75.0);

  // 5. Read Live PIDs
  const live = scanner.readLivePIDs({ engineRpm: 2200 });
  assert.equal(live.success, true);
  assert.equal(live.pids.PID_0C_ENGINE_RPM, 2200);
  assert.ok(live.pids.PID_06_SHORT_TERM_FUEL_TRIM_B1 > 10.0, 'Lean code P0171 should reflect elevated positive fuel trim');

  // 6. Clear DTCs (Mode 04)
  const clearRes = scanner.clearCodes();
  assert.equal(clearRes.success, true);
  assert.equal(clearRes.clearedDTCsCount, 2);
  assert.equal(scanner.milStatus, false, 'MIL must be extinguished after clearing codes');
  assert.equal(scanner.activeDTCs.size, 0);

  // 7. Verify I/M Readiness monitors reset to NOT READY after code clear
  assert.equal(scanner.readinessMonitors.catalyst, 'NOT_READY');
  assert.equal(scanner.readinessMonitors.oxygenSensor, 'NOT_READY');
});
