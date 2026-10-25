/**
 * MECHVERSE - Automotive Electrical Components & Wiring Network
 * Represents physical conductors, fuses, switches, connectors, and ground paths.
 */

// Copper resistivity at 20°C (Ohm * meter)
export const RHO_COPPER = 1.68e-8;

/**
 * Calculates wire resistance from physical dimensions:
 * R = rho * L / A
 * @param {number} lengthMeters Wire length in meters
 * @param {number} crossSectionMm2 Conductor area in mm^2 (e.g. 1.5mm^2 for 16 AWG, 25mm^2 for 4 AWG starter cable)
 */
export function calculateWireResistance(lengthMeters, crossSectionMm2) {
  if (lengthMeters <= 0 || crossSectionMm2 <= 0) return 1e-6;
  const areaM2 = crossSectionMm2 * 1e-6;
  return (RHO_COPPER * lengthMeters) / areaM2;
}

export class ElectricalWire {
  constructor(id, fromNode, toNode, lengthMeters = 1.0, crossSectionMm2 = 1.5) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.lengthMeters = lengthMeters;
    this.crossSectionMm2 = crossSectionMm2;
    this.nominalResistance = calculateWireResistance(lengthMeters, crossSectionMm2);
    this.isBroken = false;
    this.isPartiallyDamaged = false;
    this.damageResistanceMultiplier = 1.0;
  }

  getResistance() {
    if (this.isBroken) return 1e9; // Open circuit
    if (this.isPartiallyDamaged) {
      return this.nominalResistance * this.damageResistanceMultiplier;
    }
    return this.nominalResistance;
  }
}

export class ElectricalFuse {
  constructor(id, fromNode, toNode, ratingAmps = 15.0, resistance = 0.005) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.ratingAmps = ratingAmps;
    this.nominalResistance = resistance;
    this.isBlown = false;
  }

  getResistance() {
    return this.isBlown ? 1e9 : this.nominalResistance;
  }

  checkOverload(currentAmps) {
    if (Math.abs(currentAmps) > this.ratingAmps * 1.6) {
      this.isBlown = true;
      return true;
    }
    return false;
  }

  blow() {
    this.isBlown = true;
  }

  replace(newRatingAmps = this.ratingAmps) {
    this.ratingAmps = newRatingAmps;
    this.isBlown = false;
  }
}

export class ElectricalGroundStrap {
  constructor(id, fromNode, toNode, healthyResistance = 0.002) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.healthyResistance = healthyResistance;
    this.isCorroded = false;
    this.isLoose = false;
    this.faultResistance = 0.45; // 450 milliohms creates significant voltage drop under 100A+ load
  }

  getResistance() {
    if (this.isLoose) return 1e9;
    if (this.isCorroded) return this.faultResistance;
    return this.healthyResistance;
  }

  setFaultResistance(r) {
    this.faultResistance = r;
    this.isCorroded = true;
  }

  repair() {
    this.isCorroded = false;
    this.isLoose = false;
  }
}

export class ElectricalConnector {
  constructor(id, fromNode, toNode, cleanResistance = 0.005) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.cleanResistance = cleanResistance;
    this.isCorroded = false;
    this.corrosionResistance = 4.8; // 4.8 Ohms
  }

  getResistance() {
    return this.isCorroded ? this.corrosionResistance : this.cleanResistance;
  }

  setCorrosion(resistance = 3.8) {
    this.corrosionResistance = resistance;
    this.isCorroded = true;
  }

  cleanAndRepair() {
    this.isCorroded = false;
  }

  repair() {
    this.cleanAndRepair();
  }
}
