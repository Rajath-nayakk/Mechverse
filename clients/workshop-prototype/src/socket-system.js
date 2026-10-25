/**
 * MECHVERSE Socket Set and Fastener Mechanics Module
 */

export const SOCKET_SET = [
  { id: 'socket_10', sizeMm: 10.0, driveSize: '3/8"', profile: 'HexMetric', deepWell: false },
  { id: 'socket_13', sizeMm: 13.0, driveSize: '3/8"', profile: 'HexMetric', deepWell: false },
  { id: 'socket_17', sizeMm: 17.0, driveSize: '1/2"', profile: 'HexMetric', deepWell: true },
  { id: 'socket_19', sizeMm: 19.0, driveSize: '1/2"', profile: 'HexMetric', deepWell: true },
  { id: 'socket_21', sizeMm: 21.0, driveSize: '1/2"', profile: 'HexMetric', deepWell: true },
  { id: 'socket_24', sizeMm: 24.0, driveSize: '1/2"', profile: 'HexMetric', deepWell: false },
];

export const AVAILABLE_TOOLS = [
  { id: 'TOOL_INSPECT', name: 'Inspection Probe', category: 'DIAGNOSTIC' },
  { id: 'TOOL_RATCHET_3_8', name: '3/8" Reversible Ratchet', category: 'RATCHET', driveSize: '3/8"', defaultSocket: 10.0 },
  { id: 'TOOL_TORQUE_1_2', name: '1/2" Micrometer Torque Wrench', category: 'TORQUE_WRENCH', driveSize: '1/2"', defaultSocket: 17.0, minTorque: 20, maxTorque: 220 },
  { id: 'TOOL_TORQUE_3_8', name: '3/8" Precision Torque Wrench', category: 'TORQUE_WRENCH', driveSize: '3/8"', defaultSocket: 10.0, minTorque: 5, maxTorque: 60 },
  { id: 'TOOL_BREAKER_BAR', name: '1/2" Heavy Breaker Bar (600mm)', category: 'BREAKER_BAR', driveSize: '1/2"', defaultSocket: 19.0 },
  { id: 'TOOL_FOAM_CANNON', name: 'Snow Foam Cannon', category: 'CLEANING' },
  { id: 'TOOL_PRESSURE_WASHER', name: 'High-Pressure Rinse Jet', category: 'CLEANING' },
  { id: 'TOOL_DEGREASER', name: 'Heavy Duty Degreaser Spray', category: 'CLEANING' },
  { id: 'TOOL_WHEEL_CLEANER', name: 'Reactive Wheel & Iron Cleaner', category: 'CLEANING' },
  { id: 'TOOL_GLASS_CLEANER', name: 'Ammonia-Free Glass Cleaner', category: 'CLEANING' },
  { id: 'TOOL_VACUUM_CLEANER', name: 'Wet/Dry Shop Vacuum', category: 'CLEANING' },
  { id: 'TOOL_DENT_PULLER', name: 'Suction Dent Puller', category: 'BODYWORK' },
  { id: 'TOOL_FUEL_NOZZLE', name: 'Fuel Dispenser Nozzle', category: 'REFUELING' }
];

export function validateSocketCompatibility(tool, socket, fastener) {
  if (!tool) {
    return { compatible: false, reason: 'No tool selected.' };
  }

  // Non-fastener tools cannot operate on fasteners
  if (tool.category !== 'RATCHET' && tool.category !== 'TORQUE_WRENCH' && tool.category !== 'BREAKER_BAR' && tool.category !== 'WRENCH') {
    return { compatible: false, reason: 'Selected tool cannot turn fasteners.' };
  }

  // Socket must be attached for socket-based tools
  if (!socket && tool.category !== 'WRENCH') {
    return { compatible: false, reason: 'No socket attached to tool anvil! Attach a socket first.' };
  }

  // Check drive size compatibility between tool and socket
  if (socket && tool.driveSize && socket.driveSize !== tool.driveSize) {
    return {
      compatible: false,
      reason: `Drive size mismatch: Tool anvil is ${tool.driveSize}, but socket is ${socket.driveSize}.`
    };
  }

  const effectiveSocketSizeMm = socket ? socket.sizeMm : tool.socketSizeMm;

  // Check socket size match
  if (Math.abs(effectiveSocketSizeMm - fastener.socketSizeMm) > 0.1) {
    return {
      compatible: false,
      reason: `Incorrect socket: this fastener requires a compatible ${fastener.socketSizeMm} mm hex socket (installed: ${effectiveSocketSizeMm} mm).`
    };
  }

  // Check fastener profile match (Hex vs Torx, etc.)
  if (socket && fastener.driveType && socket.profile !== fastener.driveType) {
    return {
      compatible: false,
      reason: `Head profile mismatch: Fastener requires ${fastener.driveType}, but socket is ${socket.profile}.`
    };
  }

  return { compatible: true, reason: 'Socket and tool are fully compatible.' };
}

export function advanceFastenerThread(fastener, turns) {
  if (fastener.isStripped) {
    return {
      engagementMm: fastener.currentEngagementMm,
      isDisengaged: false,
      message: 'Fastener thread is stripped and spins freely without axial engagement advance.'
    };
  }

  if (fastener.threadPitchMm <= 0) {
    throw new Error('Invalid thread pitch: must be greater than zero.');
  }

  // Simplified axial advance: advance = pitch * turns
  const deltaMm = turns * fastener.threadPitchMm;
  fastener.currentEngagementMm = Math.max(0, Math.min(fastener.engagementLengthMm, (fastener.currentEngagementMm || fastener.engagementLengthMm) + deltaMm));

  const isDisengaged = fastener.currentEngagementMm <= 0;
  if (isDisengaged) {
    fastener.currentTorqueNm = 0;
    fastener.isTorqued = false;
  }

  return {
    engagementMm: fastener.currentEngagementMm,
    isDisengaged,
    message: isDisengaged
      ? 'Fastener completely unthreaded and disengaged. Ready for dismounting.'
      : `Thread engagement: ${fastener.currentEngagementMm.toFixed(2)} / ${fastener.engagementLengthMm.toFixed(2)} mm`
  };
}
