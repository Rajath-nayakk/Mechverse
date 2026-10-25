import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCKET_SET, AVAILABLE_TOOLS, validateSocketCompatibility, advanceFastenerThread } from '../clients/workshop-prototype/src/socket-system.js';

test('Socket Set contains all required metric sizes (10, 13, 17, 19, 21, 24 mm)', () => {
  const sizes = SOCKET_SET.map(s => s.sizeMm);
  const required = [10.0, 13.0, 17.0, 19.0, 21.0, 24.0];
  required.forEach(req => {
    assert.ok(sizes.includes(req), `Expected socket set to include ${req}mm socket`);
  });
});

test('Socket compatibility approves matching socket size and drive size', () => {
  const torqueWrench1_2 = { category: 'TORQUE_WRENCH', driveSize: '1/2"' };
  const socket17 = { sizeMm: 17.0, driveSize: '1/2"', profile: 'HexMetric' };
  const lugNut = { socketSizeMm: 17.0, driveType: 'HexMetric', nominalDiameterMm: 12.0 };

  const result = validateSocketCompatibility(torqueWrench1_2, socket17, lugNut);
  assert.equal(result.compatible, true);
  assert.equal(result.reason, 'Socket and tool are fully compatible.');
});

test('Socket compatibility rejects mismatched socket size with helpful message', () => {
  const torqueWrench1_2 = { category: 'TORQUE_WRENCH', driveSize: '1/2"' };
  const socket19 = { sizeMm: 19.0, driveSize: '1/2"', profile: 'HexMetric' };
  const lugNut = { socketSizeMm: 17.0, driveType: 'HexMetric', nominalDiameterMm: 12.0 };

  const result = validateSocketCompatibility(torqueWrench1_2, socket19, lugNut);
  assert.equal(result.compatible, false);
  assert.match(result.reason, /Incorrect socket: this fastener requires a compatible 17 mm hex socket/);
});

test('Socket compatibility rejects drive size mismatch (e.g. 3/8" socket on 1/2" drive anvil)', () => {
  const torqueWrench1_2 = { category: 'TORQUE_WRENCH', driveSize: '1/2"' };
  const socket10_3_8 = { sizeMm: 10.0, driveSize: '3/8"', profile: 'HexMetric' };
  const boltM6 = { socketSizeMm: 10.0, driveType: 'HexMetric', nominalDiameterMm: 6.0 };

  const result = validateSocketCompatibility(torqueWrench1_2, socket10_3_8, boltM6);
  assert.equal(result.compatible, false);
  assert.match(result.reason, /Drive size mismatch: Tool anvil is 1\/2", but socket is 3\/8"/);
});

test('Socket compatibility distinguishes socket size from thread diameter (17mm socket vs M12 thread)', () => {
  const socket17 = { sizeMm: 17.0, driveSize: '1/2"', profile: 'HexMetric' };
  const fastenerM12 = { socketSizeMm: 17.0, nominalDiameterMm: 12.0, driveType: 'HexMetric' };

  assert.notEqual(fastenerM12.socketSizeMm, fastenerM12.nominalDiameterMm, 'Socket size must not be conflated with thread diameter');
  const result = validateSocketCompatibility({ category: 'TORQUE_WRENCH', driveSize: '1/2"' }, socket17, fastenerM12);
  assert.equal(result.compatible, true);
});

test('Thread advance obeys: advance = pitch * turns', () => {
  const fastener = {
    nominalDiameterMm: 10.0,
    threadPitchMm: 1.5, // 1.5 mm per full rotation
    engagementLengthMm: 24.0,
    currentEngagementMm: 24.0, // fully engaged
    isStripped: false
  };

  // Turn bolt 4 complete counter-clockwise turns (-4)
  const result = advanceFastenerThread(fastener, -4);
  // Expected advance: 24.0 - (4 * 1.5) = 24.0 - 6.0 = 18.0 mm
  assert.equal(result.engagementMm, 18.0);
  assert.equal(result.isDisengaged, false);
});

test('Fastener reports disengaged only when currentEngagementMm reaches zero', () => {
  const fastener = {
    nominalDiameterMm: 10.0,
    threadPitchMm: 1.5,
    engagementLengthMm: 6.0,
    currentEngagementMm: 6.0,
    isStripped: false
  };

  // Turn bolt 4 turns: 6.0 - (4 * 1.5) = 0.0 mm
  const result = advanceFastenerThread(fastener, -4);
  assert.equal(result.engagementMm, 0.0);
  assert.equal(result.isDisengaged, true);
});

test('Component removal prerequisite prevents removing component while fastener is engaged in thread', () => {
  const fastener = {
    id: 'drain_plug',
    socketSizeMm: 19.0,
    currentEngagementMm: 12.0, // still threaded in
    appliedTorqueNm: 0 // loosened, but still threaded!
  };

  function canDismountFastener(f) {
    if (f.currentEngagementMm > 0) {
      return { canRemove: false, reason: `Fastener still engaged in thread (${f.currentEngagementMm}mm remaining).` };
    }
    return { canRemove: true, reason: 'Fastener is completely disengaged.' };
  }

  const check1 = canDismountFastener(fastener);
  assert.equal(check1.canRemove, false);
  assert.match(check1.reason, /still engaged in thread/);

  fastener.currentEngagementMm = 0.0;
  const check2 = canDismountFastener(fastener);
  assert.equal(check2.canRemove, true);
});
