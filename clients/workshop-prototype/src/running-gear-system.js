/**
 * MECHVERSE - Running Gear, Brake Servicing & Coilover Suspension System
 * 
 * Physical Modeling for:
 * 1. Brake Corners (FL, FR, RL, RR):
 *    - Cross-drilled ventilated rotor thickness (new: 36.0mm, service limit: 34.4mm)
 *    - Rotor lateral runout / disc thickness variation (warp > 0.04mm causes pedal pulsation)
 *    - Semi-metallic / carbon-ceramic pad friction lining (new: 12.0mm, min: 3.0mm, backing plate: 0.0mm)
 *    - Caliper guide / slide pins (synthetic silicone lube vs seized guide pins)
 *    - Hydraulic bleeding mechanics with fluid aeration micro-bubble physics:
 *      Fluid compressibility factor: E_firmness = 1.0 / (1.0 + 0.45 * V_air_ml)
 *      Pedal pumping pressurization, bleeder screw cracking, fluid expulsion & bubble evacuation
 * 
 * 2. 4-Corner Adjustable Coilover Suspension:
 *    - Threaded lower perch collar height adjustment (+/- 40mm)
 *    - Spring rate selection (Factory M4: 65 N/mm Front, 130 N/mm Rear; Stiffened V12: 80 N/mm Front)
 *    - 24-click adjustable twin-tube / monotube bump & rebound valving
 *    - Sprung corner mass natural bounce frequency f_n = (1 / 2pi) * sqrt(k_wheel / m_corner)
 */

export const CORNER_IDS = ['FL', 'FR', 'RL', 'RR'];

export class BrakeCorner {
  constructor(cornerId, isFront = true) {
    this.cornerId = cornerId;
    this.isFront = isFront;

    // Disc Rotor Spec
    this.rotorThicknessMm = isFront ? 36.0 : 28.0; // Front 380x36mm, Rear 370x28mm
    this.rotorDiscardThicknessMm = isFront ? 34.4 : 26.4;
    this.rotorLateralRunoutMm = 0.015; // In-spec factory runout (< 0.04mm)
    this.rotorMaxAllowedRunoutMm = 0.040;

    // Brake Pad Spec
    this.padLiningThicknessMm = 12.0; // New pad: 12mm
    this.padServiceLimitMm = 3.0;     // Wear sensor trips at 3.0mm
    this.frictionCoefficientMu = 0.42;

    // Caliper Hardware
    this.areSlidePinsLubricated = true;
    this.isCaliperMounted = true;
    this.bracketTorqueNm = 110.0; // Factory caliper bracket spec: 110 N·m
    this.isBleederOpen = false;
    this.bleederTorqueNm = 12.0;  // 12 N·m closed

    // Hydraulic Line Aeration
    this.airBubbleVolumeMl = 0.0; // 0.0 mL = 100% solid hydraulic fluid column
    this.fluidPurityPercent = 100.0;
  }

  /**
   * Evaluate pedal firmness factor:
   * Dissolved / trapped air pockets compress dramatically under hydraulic line pressure,
   * causing squishy pedal travel and loss of line pressure.
   */
  getPedalFirmness() {
    return 1.0 / (1.0 + 0.45 * this.airBubbleVolumeMl);
  }

  /**
   * Measure rotor condition
   */
  inspectRotor() {
    const isWarped = this.rotorLateralRunoutMm > this.rotorMaxAllowedRunoutMm;
    const isUnderThickness = this.rotorThicknessMm < this.rotorDiscardThicknessMm;
    return {
      cornerId: this.cornerId,
      thicknessMm: this.rotorThicknessMm,
      discardThicknessMm: this.rotorDiscardThicknessMm,
      runoutMm: this.rotorLateralRunoutMm,
      isWarped,
      isUnderThickness,
      isSafeForService: !isWarped && !isUnderThickness,
      recommendation: isUnderThickness 
        ? 'REPLACE ROTOR: Discard thickness reached.'
        : isWarped 
        ? 'MACHINE OR REPLACE ROTOR: Lateral runout exceeds 0.04mm, will cause severe pedal pulsation.'
        : 'Rotor in factory specification.'
    };
  }

  /**
   * Measure brake pad wear
   */
  inspectPads() {
    const isWornOut = this.padLiningThicknessMm <= this.padServiceLimitMm;
    const isBackingPlateMetalOnMetal = this.padLiningThicknessMm <= 0.5;
    return {
      cornerId: this.cornerId,
      padLiningThicknessMm: this.padLiningThicknessMm,
      serviceLimitMm: this.padServiceLimitMm,
      isWornOut,
      isBackingPlateMetalOnMetal,
      effectiveMu: isBackingPlateMetalOnMetal ? 0.12 : this.frictionCoefficientMu
    };
  }

  /**
   * Service caliper slide pins
   */
  serviceSlidePins(lubricate = true) {
    this.areSlidePinsLubricated = lubricate;
    return {
      success: true,
      lubricated: lubricate,
      message: lubricate 
        ? 'Caliper guide pins cleaned and coated with high-temperature silicone brake grease.'
        : 'Guide pins assembled dry.'
    };
  }

  /**
   * Open or close bleeder screw
   */
  setBleederScrew(isOpen) {
    this.isBleederOpen = isOpen;
    this.bleederTorqueNm = isOpen ? 0.0 : 12.0;
    return { isOpen: this.isBleederOpen };
  }

  /**
   * Bleed hydraulic brake line:
   * When pressure is applied (pedal down) and bleeder is open, fluid discharges and air pockets evacuate.
   */
  bleedStroke(linePressureApplied = true, fluidExpelledMl = 15.0) {
    if (!this.isBleederOpen) {
      return { success: false, error: 'Bleeder screw is closed.' };
    }
    if (!linePressureApplied) {
      return { success: false, error: 'Master cylinder hydraulic pressure must be applied (pedal depressed).' };
    }

    // Air is pushed out first by hydraulic line purge
    const airEvacuated = Math.min(this.airBubbleVolumeMl, fluidExpelledMl * 0.4);
    this.airBubbleVolumeMl = Math.max(0.0, this.airBubbleVolumeMl - airEvacuated);
    const hasVisibleBubbles = airEvacuated > 0.05;

    return {
      success: true,
      cornerId: this.cornerId,
      fluidExpelledMl,
      airEvacuatedMl: parseFloat(airEvacuated.toFixed(2)),
      remainingAirMl: parseFloat(this.airBubbleVolumeMl.toFixed(2)),
      hasVisibleBubbles,
      pedalFirmness: parseFloat(this.getPedalFirmness().toFixed(3)),
      isLineSolid: this.airBubbleVolumeMl <= 0.01
    };
  }
}

export class CoiloverSuspensionCorner {
  constructor(cornerId, isFront = true) {
    this.cornerId = cornerId;
    this.isFront = isFront;

    // Spring Specs
    this.springRateNPerMm = isFront ? 65.0 : 130.0; // BMW M4 Competition factory rates
    this.freeSpringLengthMm = 180.0;
    this.perchHeightOffsetMm = 0.0; // 0.0 = Factory ride height, +/- 40mm collar travel

    // Damper Valving Specs
    this.totalClicks = 24;
    this.reboundClicks = 12; // Middle baseline
    this.compressionClicks = 12;

    // Corner Sprung Mass (kg)
    this.cornerSprungMassKg = isFront ? 440.0 : 390.0; // Total vehicle mass ~1660 kg (53/47 distribution)
  }

  /**
   * Adjust threaded ride height collar
   */
  adjustPerchHeight(deltaMm) {
    const target = this.perchHeightOffsetMm + deltaMm;
    this.perchHeightOffsetMm = Math.max(-40.0, Math.min(40.0, target));
    return {
      cornerId: this.cornerId,
      perchHeightOffsetMm: this.perchHeightOffsetMm,
      effectiveRideHeightDeltaMm: this.perchHeightOffsetMm * (this.isFront ? 1.0 : 0.72) // Motion ratio
    };
  }

  /**
   * Adjust damper clicks
   */
  adjustDamping(reboundClicks, compressionClicks) {
    this.reboundClicks = Math.max(0, Math.min(this.totalClicks, reboundClicks));
    this.compressionClicks = Math.max(0, Math.min(this.totalClicks, compressionClicks));
    return {
      cornerId: this.cornerId,
      reboundClicks: this.reboundClicks,
      compressionClicks: this.compressionClicks
    };
  }

  /**
   * Calculate natural bounce frequency fn = (1 / 2pi) * sqrt(k_wheel / m_corner)
   */
  getNaturalBounceFrequencyHz() {
    const motionRatio = this.isFront ? 0.95 : 0.72; // Motion ratio squared for wheel rate
    const wheelRateNPerM = (this.springRateNPerMm * 1000.0) * Math.pow(motionRatio, 2);
    const omega = Math.sqrt(wheelRateNPerM / this.cornerSprungMassKg);
    return parseFloat((omega / (2 * Math.PI)).toFixed(2));
  }
}

export class RunningGearSystem {
  constructor() {
    this.brakes = {
      FL: new BrakeCorner('FL', true),
      FR: new BrakeCorner('FR', true),
      RL: new BrakeCorner('RL', false),
      RR: new BrakeCorner('RR', false)
    };

    this.suspension = {
      FL: new CoiloverSuspensionCorner('FL', true),
      FR: new CoiloverSuspensionCorner('FR', true),
      RL: new CoiloverSuspensionCorner('RL', false),
      RR: new CoiloverSuspensionCorner('RR', false)
    };

    // Hydraulic Master Cylinder & Reservoir
    this.brakeFluidReservoir = {
      fluidType: 'DOT 4 Low Viscosity (ISO 4925 Class 6)',
      currentLevelPercent: 95.0,
      boilingPointWetC: 175.0 // Fresh boiling point
    };
  }

  getOverallPedalFirmness() {
    const vals = Object.values(this.brakes).map(b => b.getPedalFirmness());
    return Math.min(...vals); // Weakest aerated corner governs pedal firmness
  }

  injectAirInLine(cornerId, airVolumeMl = 3.5) {
    if (this.brakes[cornerId]) {
      this.brakes[cornerId].airBubbleVolumeMl += airVolumeMl;
    }
  }
}
