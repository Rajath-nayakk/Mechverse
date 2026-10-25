import test from 'node:test';
import assert from 'node:assert/strict';
import { CircuitSolver } from '../clients/workshop-prototype/src/circuit-solver.js';

test('CircuitSolver - Ohm\'s Law: single resistor and DC voltage source', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addResistor('R1', 'VCC', 'GND', 4.0);

  const res = solver.solve();
  assert.equal(res.success, true);
  assert.ok(Math.abs(res.nodeVoltages['VCC'] - 12.0) < 1e-4);
  assert.ok(Math.abs(res.nodeVoltages['GND'] - 0.0) < 1e-4);
  // I = V / R = 12 / 4 = 3.0 A
  assert.ok(Math.abs(res.branchCurrents['R1'] - 3.0) < 1e-4);
  assert.ok(Math.abs(res.powerByComponent['R1'] - 36.0) < 1e-4);
});

test('CircuitSolver - Series Resistors: R_total = R1 + R2', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'N1', 'GND', 12.0);
  solver.addResistor('R1', 'N1', 'N2', 2.0);
  solver.addResistor('R2', 'N2', 'GND', 4.0);

  const res = solver.solve();
  assert.equal(res.success, true);
  // Total R = 6 Ohms, Current = 12 / 6 = 2.0 A
  assert.ok(Math.abs(res.branchCurrents['R1'] - 2.0) < 1e-4);
  assert.ok(Math.abs(res.branchCurrents['R2'] - 2.0) < 1e-4);
  // Voltage at intermediate node N2 = I * R2 = 2.0 * 4.0 = 8.0 V
  assert.ok(Math.abs(res.nodeVoltages['N2'] - 8.0) < 1e-4);
});

test('CircuitSolver - Parallel Resistors: 1/R_total = 1/R1 + 1/R2', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addResistor('R1', 'VCC', 'GND', 6.0); // 2 A
  solver.addResistor('R2', 'VCC', 'GND', 12.0); // 1 A

  const res = solver.solve();
  assert.equal(res.success, true);
  // R_eq = (6 * 12) / (6 + 12) = 4.0 Ohms
  // Total current = 12 / 4 = 3.0 A
  assert.ok(Math.abs(res.branchCurrents['R1'] - 2.0) < 1e-4);
  assert.ok(Math.abs(res.branchCurrents['R2'] - 1.0) < 1e-4);
  assert.ok(Math.abs(res.branchCurrents['V1'] - 3.0) < 1e-4);
});

test('CircuitSolver - Kirchhoff\'s Current Law (KCL) at a branching node', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'N_IN', 'GND', 24.0);
  solver.addResistor('R_IN', 'N_IN', 'N_BRANCH', 4.0);
  solver.addResistor('R_LOAD1', 'N_BRANCH', 'GND', 8.0);
  solver.addResistor('R_LOAD2', 'N_BRANCH', 'GND', 8.0);

  const res = solver.solve();
  assert.equal(res.success, true);

  // Current entering N_BRANCH from R_IN must equal sum of currents leaving through R_LOAD1 and R_LOAD2
  const iIn = res.branchCurrents['R_IN'];
  const iOut1 = res.branchCurrents['R_LOAD1'];
  const iOut2 = res.branchCurrents['R_LOAD2'];

  assert.ok(Math.abs(iIn - (iOut1 + iOut2)) < 1e-4);
});

test('CircuitSolver - Kirchhoff\'s Voltage Law (KVL) around a closed loop', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'A', 'GND', 14.0);
  solver.addResistor('R1', 'A', 'B', 3.0);
  solver.addResistor('R2', 'B', 'C', 5.0);
  solver.addResistor('R3', 'C', 'GND', 2.0);

  const res = solver.solve();
  assert.equal(res.success, true);

  const vSource = res.branchVoltages['V1'];
  const vDrop1 = res.branchVoltages['R1'];
  const vDrop2 = res.branchVoltages['R2'];
  const vDrop3 = res.branchVoltages['R3'];

  // vSource - (vDrop1 + vDrop2 + vDrop3) = 0
  assert.ok(Math.abs(vSource - (vDrop1 + vDrop2 + vDrop3)) < 1e-4);
});

test('CircuitSolver - Open Switch vs Closed Switch', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addSwitch('SW1', 'VCC', 'LOAD', true); // Open
  solver.addResistor('RL', 'LOAD', 'GND', 10.0);

  let res = solver.solve();
  assert.equal(res.success, true);
  assert.ok(Math.abs(res.branchCurrents['SW1'] - 0.0) < 1e-4);
  assert.ok(Math.abs(res.nodeVoltages['LOAD'] - 0.0) < 1e-4);

  // Close switch
  solver.switches[0].isOpen = false;
  res = solver.solve();
  assert.equal(res.success, true);
  assert.ok(Math.abs(res.branchCurrents['SW1'] - 1.2) < 1e-2);
  assert.ok(Math.abs(res.nodeVoltages['LOAD'] - 12.0) < 1e-2);
});

test('CircuitSolver - Blown Fuse acts as an open circuit', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addFuse('F1', 'VCC', 'PROTECTED', 15.0, 0.005, true); // Blown
  solver.addResistor('RL', 'PROTECTED', 'GND', 6.0);

  const res = solver.solve();
  assert.equal(res.success, true);
  assert.ok(Math.abs(res.branchCurrents['F1'] - 0.0) < 1e-4);
  assert.ok(Math.abs(res.nodeVoltages['PROTECTED'] - 0.0) < 1e-4);
});

test('CircuitSolver - Disconnected and Floating Nodes handle gracefully without crashing', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addResistor('R1', 'VCC', 'GND', 10.0);
  // Floating node N_FLOAT
  solver.addResistor('R_FLOAT', 'N_FLOAT', 'N_ISOLATED', 100.0);

  const res = solver.solve();
  assert.equal(res.success, true);
  assert.ok(Number.isFinite(res.nodeVoltages['N_FLOAT']));
  assert.ok(Math.abs(res.nodeVoltages['VCC'] - 12.0) < 1e-4);
});

test('CircuitSolver - High-Resistance Fault creates measurable voltage drop', () => {
  const solver = new CircuitSolver();
  solver.addVoltageSource('V1', 'VCC', 'GND', 12.0);
  solver.addResistor('R_CORROSION', 'VCC', 'PIN', 3.0); // Corroded contact
  solver.addResistor('R_LOAD', 'PIN', 'GND', 3.0);

  const res = solver.solve();
  assert.equal(res.success, true);
  // Equal divider: 6V across corrosion, 6V at load pin
  assert.ok(Math.abs(res.nodeVoltages['PIN'] - 6.0) < 1e-4);
  assert.ok(Math.abs(res.branchVoltages['R_CORROSION'] - 6.0) < 1e-4);
});

test('CircuitSolver - Parameter validation rejects negative or invalid resistance', () => {
  const solver = new CircuitSolver();
  assert.throws(() => {
    solver.addResistor('R_BAD', 'A', 'B', -5.0);
  }, /negative resistance/i);
});
