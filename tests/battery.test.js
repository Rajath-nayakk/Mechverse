import test from 'node:test';
import assert from 'node:assert/strict';
import { BatteryModel } from '../clients/workshop-prototype/src/battery-model.js';

test('BatteryModel - State of Charge initialization and clamping', () => {
  const bat = new BatteryModel({ nominalVoltage: 12.0, capacityAh: 65.0, soc: 0.85 });
  assert.equal(bat.soc, 0.85);

  // Overcharge attempt
  bat.soc = 1.25;
  bat.updateSOC(-20.0, 3600); // charging
  assert.ok(bat.soc <= 1.0);

  // Complete discharge
  bat.updateSOC(100.0, 3600 * 5); // 500 Ah discharge on a 65 Ah battery
  assert.ok(bat.soc >= 0.0);
  assert.equal(bat.soc, 0.0);
});

test('BatteryModel - Open-Circuit Voltage V_OC(SOC) curve', () => {
  const bat = new BatteryModel({ nominalVoltage: 12.0, capacityAh: 65.0 });

  bat.soc = 1.0;
  assert.ok(bat.getOpenCircuitVoltage() >= 12.70 && bat.getOpenCircuitVoltage() <= 12.80);

  bat.soc = 0.50;
  assert.ok(bat.getOpenCircuitVoltage() >= 12.10 && bat.getOpenCircuitVoltage() <= 12.30);

  bat.soc = 0.0;
  assert.ok(bat.getOpenCircuitVoltage() <= 11.90 && bat.getOpenCircuitVoltage() >= 11.70);
});

test('BatteryModel - Thevenin Terminal Voltage Sag under load', () => {
  const bat = new BatteryModel({ nominalVoltage: 12.0, capacityAh: 65.0, soc: 0.90, internalResistance: 0.020 });
  const vOC = bat.getOpenCircuitVoltage(); // ~ 12.65V

  // Load of 50 Amps
  // Expected sag = 50 * 0.020 = 1.0 V
  const vTerm = bat.getTerminalVoltage(50.0);
  assert.ok(Math.abs(vTerm - (vOC - 1.0)) < 1e-3);
});

test('BatteryModel - Internal Resistance Comparison (Healthy vs Degraded Battery)', () => {
  const healthyBat = new BatteryModel({ soc: 0.80, internalResistance: 0.015 }); // 15 mOhm
  const weakBat = new BatteryModel({ soc: 0.80, internalResistance: 0.140 }); // 140 mOhm (sulfated)

  const starterCurrent = 150.0; // Amps
  const healthyV = healthyBat.getTerminalVoltage(starterCurrent);
  const weakV = weakBat.getTerminalVoltage(starterCurrent);

  // Healthy battery: drops 150 * 0.015 = 2.25V -> ~10.3V (acceptable crank)
  assert.ok(healthyV > 9.60, `Healthy battery must remain above 9.6V under crank, got ${healthyV}`);

  // Weak battery: drops 150 * 0.140 = 21V -> collapses below 8.0V (fails crank test)
  assert.ok(weakV < 8.50, `Degraded battery should collapse under 150A load, got ${weakV}`);
});

test('BatteryModel - Disconnected Battery provides zero terminal voltage', () => {
  const bat = new BatteryModel({ isConnected: false });
  assert.equal(bat.getTerminalVoltage(0.0), 0.0);
  assert.equal(bat.getTerminalVoltage(50.0), 0.0);
});

test('BatteryModel - Dynamic Discharge over time (Coulomb Counting)', () => {
  const bat = new BatteryModel({ capacityAh: 100.0, soc: 1.0 });

  // Draw 10 Amps for 2 hours (7200 seconds) = 20 Amp-hours
  // SOC should decrease by 20 / 100 = 0.20 -> SOC = 0.80
  bat.updateSOC(10.0, 7200);
  assert.ok(Math.abs(bat.soc - 0.80) < 1e-4);
});

test('BatteryModel - Dynamic Charging with efficiency factor', () => {
  const bat = new BatteryModel({ capacityAh: 50.0, soc: 0.50 });

  // Charge at 10 Amps for 1 hour (3600 seconds) = 10 Ah delivered
  // With 88% efficiency = 8.8 Ah stored -> delta SOC = 8.8 / 50 = 0.176
  bat.updateSOC(-10.0, 3600);
  assert.ok(Math.abs(bat.soc - (0.50 + 0.176)) < 1e-3);
});

test('BatteryModel - 24V Commercial Vehicle Configuration', () => {
  const bat24 = new BatteryModel({ nominalVoltage: 24.0, capacityAh: 120.0, soc: 1.0, internalResistance: 0.025 });
  const voc = bat24.getOpenCircuitVoltage();
  assert.ok(voc > 25.0);

  const loaded = bat24.getTerminalVoltage(100.0);
  // Sag = 100 * 0.025 = 2.5 V
  assert.ok(Math.abs(loaded - (voc - 2.5)) < 1e-3);
});
