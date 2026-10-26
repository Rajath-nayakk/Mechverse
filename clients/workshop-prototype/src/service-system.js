/**
 * MECHVERSE - Automotive Fluids, Oil Servicing & Refueling Safety Interlock System
 * 
 * Physical Modeling for:
 * 1. Animated Oil Change with Torricelli Fluid Dynamics & Stream Thinning:
 *    - Torricelli discharge: Q(t) = C_d * A_orifice * sqrt(2 * g * h(t))
 *    - Dynamic stream diameter thinning: d(t) = d_0 * (Q(t) / Q_0)^0.5
 *    - Transition: Continuous turbulent jet -> laminar stream -> periodic dripping droplets
 *    - Drain pan containment check (floor spillage if catch pan misaligned)
 *    - Used vs fresh synthetic oil color gradient (#120f0c black -> #d49b29 golden amber)
 *    - Spin-on oil filter replacement (O-ring lubrication, hand-tight + 3/4 turn, pleated filter element metallic debris inspection)
 *    - Dipstick level reading (MIN to MAX hash marks, oil clarity)
 * 
 * 2. Refueling Safety Interlock System:
 *    - Ignition/Engine-Off safety interlock (explosion hazard lockout)
 *    - Static grounding clamp bonding to bare unibody ground stud before uncapping
 *    - Filler flap release & threaded cap removal
 *    - Nozzle seating sensor with mechanical latch
 *    - Fuel grade validation: 98 RON (Premium), 95 RON (Standard), 87 RON (Knock warning), DIESEL (Misfuel lockout)
 *    - Automatic venturi shutoff mechanism on full tank (100% capacity cutoff)
 */

export const FUEL_GRADES = {
  RON_98: { id: 'RON_98', name: 'Super Plus 98 RON (Premium Unleaded)', octane: 98, isDiesel: false, compatibilityScore: 1.0 },
  RON_95: { id: 'RON_95', name: 'Euro 95 RON (Standard Unleaded)', octane: 95, isDiesel: false, compatibilityScore: 0.92 },
  RON_87: { id: 'RON_87', name: 'Regular 87 AKI / 91 RON', octane: 87, isDiesel: false, compatibilityScore: 0.75 },
  DIESEL: { id: 'DIESEL', name: 'Ultra-Low Sulfur Diesel (EN 590)', octane: 0, isDiesel: true, compatibilityScore: 0.0 }
};

export const OIL_TYPES = {
  SYNTHETIC_0W30_LL01: {
    name: 'BMW Longlife-01 FE 0W-30 Full Synthetic',
    viscosityCst40C: 62.0,
    viscosityCst100C: 12.2,
    hthsViscosityMpaS: 3.5,
    freshColorHex: '#d49b29', // Golden translucent amber
    usedColorHex: '#14100c'   // Pitch black with suspended carbon soot
  }
};

export class OilServiceSystem {
  constructor(engineSpecs = { oilCapacityLiters: 7.0 }) {
    this.oilCapacityLiters = engineSpecs.oilCapacityLiters || 7.0;
    this.currentOilLiters = this.oilCapacityLiters;
    this.oilConditionPercent = 25.0; // Dirty used oil
    this.oilViscosityRatio = 0.65;    // Degraded thermal breakdown

    // Hardware State
    this.isDrainPlugInstalled = true;
    this.drainPlugTorqueNm = 25.0; // Factory spec: 25 N·m
    this.isOilFilterInstalled = true;
    this.oilFilterCondition = 'USED'; // 'USED', 'MISSING', 'NEW'
    this.isOilFilterOringLubricated = false;
    this.oilFilterPleatDebris = 'TRACE_MICRON'; // 'CLEAN', 'TRACE_MICRON', 'COPPER_BEARING_SHAVINGS'
    this.isFillerCapRemoved = false;
    
    // Catch Pan Alignment
    this.catchPan = {
      isPositioned: true,
      posX: 0.0,
      posY: -0.85,
      posZ: 0.0,
      radiusM: 0.22,
      collectedOilLiters: 0.0
    };

    // Fluid Stream Dynamics State
    this.sumpOrificeDiameterMm = 14.0; // M14x1.5 drain bolt orifice
    this.initialHeadM = 0.25; // 25cm oil depth in pan
    this.currentHeadM = 0.25;
    this.streamState = 'NONE'; // 'NONE', 'JET', 'LAMINAR', 'DRIPPING', 'DRY'
    this.currentFlowLps = 0.0;
    this.currentStreamDiameterMm = 0.0;
    this.floorSpillageLiters = 0.0;
  }

  /**
   * Remove or loosen oil drain plug
   */
  operateDrainPlug(isLoosening = true, toolTorqueNm = 30.0) {
    if (isLoosening) {
      if (!this.isDrainPlugInstalled) {
        return { success: false, error: 'Drain plug is already removed.' };
      }
      this.isDrainPlugInstalled = false;
      this.drainPlugTorqueNm = 0.0;
      this.updateStreamDynamics();
      return {
        success: true,
        isInstalled: false,
        message: 'Drain plug removed. Oil discharge initiated.'
      };
    } else {
      if (this.isDrainPlugInstalled) {
        return { success: false, error: 'Drain plug is already installed.' };
      }
      this.isDrainPlugInstalled = true;
      this.drainPlugTorqueNm = toolTorqueNm;
      this.updateStreamDynamics();
      return {
        success: true,
        isInstalled: true,
        torqueNm: toolTorqueNm,
        isTorquedToSpec: Math.abs(toolTorqueNm - 25.0) <= 3.0,
        message: `Drain plug installed and tightened to ${toolTorqueNm} N·m.`
      };
    }
  }

  /**
   * Position oil catch pan under oil pan drain orifice
   */
  setCatchPanPosition(isUnderDrain = true) {
    this.catchPan.isPositioned = isUnderDrain;
  }

  /**
   * Calculate Torricelli flow velocity & stream thinning over time step
   */
  stepSimulation(deltaTimeSec = 1.0) {
    if (this.isDrainPlugInstalled || this.currentOilLiters <= 0.0) {
      this.streamState = this.currentOilLiters <= 0.0 ? 'DRY' : 'NONE';
      this.currentFlowLps = 0.0;
      this.currentStreamDiameterMm = 0.0;
      return {
        streamState: this.streamState,
        flowLps: 0.0,
        streamDiameterMm: 0.0,
        oilRemainingLiters: this.currentOilLiters,
        wasteCollectedLiters: this.catchPan.collectedOilLiters,
        floorSpillageLiters: this.floorSpillageLiters
      };
    }

    // Torricelli Flow: v = sqrt(2 * g * h)
    const g = 9.81;
    this.currentHeadM = this.initialHeadM * (this.currentOilLiters / this.oilCapacityLiters);
    const vFlow = Math.sqrt(2 * g * Math.max(0.005, this.currentHeadM));
    
    // Discharge coefficient Cd for orifice = 0.62
    const cd = 0.62;
    const orificeAreaM2 = Math.PI * Math.pow(this.sumpOrificeDiameterMm / 2000.0, 2);
    // Flow rate in m^3/s -> liters/s (1 m^3 = 1000 L)
    const maxFlowLps = cd * orificeAreaM2 * vFlow * 1000.0;
    
    // Actual liters drained this step
    const drainedLiters = Math.min(this.currentOilLiters, maxFlowLps * deltaTimeSec);
    this.currentOilLiters = Math.max(0.0, this.currentOilLiters - drainedLiters);
    this.currentFlowLps = drainedLiters / deltaTimeSec;

    // Stream diameter thinning: d = d_orifice * (Q / Q_max)^0.5
    const baseOrificeFlow = 0.22; // ~0.22 L/s theoretical max discharge for 14mm orifice
    const flowRatio = Math.max(0.05, Math.min(1.0, this.currentFlowLps / baseOrificeFlow));
    this.currentStreamDiameterMm = Math.round(this.sumpOrificeDiameterMm * Math.sqrt(flowRatio) * 10) / 10;

    // Stream state classification based on 14mm orifice Torricelli flow (max ~0.22 L/s)
    if (this.currentFlowLps > 0.15) {
      this.streamState = 'JET'; // High-velocity parabolic stream
    } else if (this.currentFlowLps > 0.03) {
      this.streamState = 'LAMINAR'; // Thin laminar downward stream
    } else if (this.currentOilLiters > 0.0) {
      this.streamState = 'DRIPPING'; // Periodic dripping beads
    } else {
      this.streamState = 'DRY';
    }

    // Containment check
    if (this.catchPan.isPositioned) {
      this.catchPan.collectedOilLiters += drainedLiters;
    } else {
      this.floorSpillageLiters += drainedLiters;
    }

    return {
      streamState: this.streamState,
      flowLps: parseFloat(this.currentFlowLps.toFixed(3)),
      streamDiameterMm: this.currentStreamDiameterMm,
      oilRemainingLiters: parseFloat(this.currentOilLiters.toFixed(2)),
      wasteCollectedLiters: parseFloat(this.catchPan.collectedOilLiters.toFixed(2)),
      floorSpillageLiters: parseFloat(this.floorSpillageLiters.toFixed(2))
    };
  }

  updateStreamDynamics() {
    this.stepSimulation(0.01);
  }

  /**
   * Remove or replace spin-on oil filter
   */
  removeOilFilter() {
    if (!this.isOilFilterInstalled) {
      return { success: false, error: 'Oil filter is already removed.' };
    }
    this.isOilFilterInstalled = false;
    const oldCondition = this.oilFilterCondition;
    this.oilFilterCondition = 'MISSING';
    return {
      success: true,
      condition: oldCondition,
      inspectedPleats: {
        metallicDebris: this.oilFilterPleatDebris,
        isBearingWearDetected: this.oilFilterPleatDebris === 'COPPER_BEARING_SHAVINGS',
        recommendation: this.oilFilterPleatDebris === 'COPPER_BEARING_SHAVINGS' 
          ? 'WARNING: Copper / brass flakes found in filter pleats! Rod bearings compromised.'
          : 'Normal carbon filtration. No major metallic debris.'
      }
    };
  }

  installNewOilFilter(lubricateOring = true) {
    if (this.isOilFilterInstalled) {
      return { success: false, error: 'An oil filter is already mounted.' };
    }
    this.isOilFilterInstalled = true;
    this.oilFilterCondition = 'NEW';
    this.isOilFilterOringLubricated = lubricateOring;
    this.oilFilterPleatDebris = 'CLEAN';
    return {
      success: true,
      isOringLubricated: lubricateOring,
      torqueRecommendation: 'Hand-tight until gasket contacts base, then rotate +3/4 turn (20-25 N·m).',
      message: lubricateOring 
        ? 'New OEM oil filter installed with lubricated nitrile O-ring.'
        : 'WARNING: Filter installed dry! Risk of O-ring bunching and high-pressure oil leak.'
    };
  }

  /**
   * Add fresh synthetic engine oil
   */
  refillFreshOil(litersAdded = 1.0, oilType = OIL_TYPES.SYNTHETIC_0W30_LL01) {
    if (!this.isFillerCapRemoved) {
      return { success: false, error: 'Engine oil filler cap is still closed.' };
    }
    if (!this.isDrainPlugInstalled) {
      this.floorSpillageLiters += litersAdded;
      return {
        success: false,
        spilledLiters: litersAdded,
        error: 'CATASTROPHIC SPILL: Oil drain plug is missing! Added oil dumped straight onto floor.'
      };
    }
    if (!this.isOilFilterInstalled) {
      this.floorSpillageLiters += litersAdded;
      return {
        success: false,
        spilledLiters: litersAdded,
        error: 'CATASTROPHIC SPILL: Oil filter housing is open! Added oil leaked out of filter mount.'
      };
    }

    const maxFill = this.oilCapacityLiters * 1.15; // Max sump overfill capacity
    const actualAdded = Math.min(litersAdded, maxFill - this.currentOilLiters);
    this.currentOilLiters += actualAdded;

    // Condition restoration
    const newRatio = actualAdded / this.currentOilLiters;
    this.oilConditionPercent = Math.min(100.0, this.oilConditionPercent * (1.0 - newRatio) + 100.0 * newRatio);
    this.oilViscosityRatio = Math.min(1.0, this.oilViscosityRatio * (1.0 - newRatio) + 1.0 * newRatio);

    return {
      success: true,
      addedLiters: actualAdded,
      currentTotalLiters: parseFloat(this.currentOilLiters.toFixed(2)),
      oilConditionPercent: Math.round(this.oilConditionPercent),
      isFull: this.currentOilLiters >= this.oilCapacityLiters,
      isOverfilled: this.currentOilLiters > this.oilCapacityLiters * 1.05
    };
  }

  /**
   * Inspect dipstick reading (MIN to MAX hash marks, oil color)
   */
  checkDipstick() {
    // 0.0 = bone dry, 1.0 = MIN line (1L low), 2.0 = MAX line (full), >2.1 = OVERFILLED
    const target = this.oilCapacityLiters;
    const minLevel = target - 1.0;
    let readingLevel = 'DRY';
    let normalizedScale = 0.0;

    if (this.currentOilLiters <= 0.2) {
      readingLevel = 'DRY';
      normalizedScale = 0.0;
    } else if (this.currentOilLiters < minLevel) {
      readingLevel = 'BELOW_MIN';
      normalizedScale = (this.currentOilLiters / minLevel) * 0.9;
    } else if (this.currentOilLiters <= target + 0.1) {
      readingLevel = 'IN_SPEC';
      normalizedScale = 1.0 + ((this.currentOilLiters - minLevel) / 1.0);
    } else {
      readingLevel = 'OVERFILLED';
      normalizedScale = 2.0 + ((this.currentOilLiters - target) / 1.0);
    }

    // Blend color based on condition
    const isClean = this.oilConditionPercent > 70.0;
    const colorHex = isClean ? OIL_TYPES.SYNTHETIC_0W30_LL01.freshColorHex : OIL_TYPES.SYNTHETIC_0W30_LL01.usedColorHex;

    return {
      readingLevel,
      normalizedScale: parseFloat(normalizedScale.toFixed(2)),
      currentOilLiters: parseFloat(this.currentOilLiters.toFixed(2)),
      colorHex,
      oilConditionPercent: Math.round(this.oilConditionPercent),
      isClean,
      safeToStartEngine: readingLevel === 'IN_SPEC' && this.isDrainPlugInstalled && this.isOilFilterInstalled
    };
  }
}

export class RefuelingSafetySystem {
  constructor(vehicleConfig = { fuelTankCapacityLiters: 59.0, requiredFuel: FUEL_GRADES.RON_98 }) {
    this.tankCapacityLiters = vehicleConfig.fuelTankCapacityLiters || 59.0; // BMW M4 G82 tank capacity = 59 L
    this.requiredFuel = vehicleConfig.requiredFuel || FUEL_GRADES.RON_98;
    this.currentFuelLiters = 12.0; // 12 L reserve
    this.dispensedFuelGrade = null;

    // Safety Interlocks
    this.isEngineRunning = false;
    this.isIgnitionOn = false;
    this.isGroundClampAttached = false;
    this.isFillerFlapOpen = false;
    this.isFuelCapRemoved = false;
    this.isNozzleLatchedInNeck = false;
    this.isVenturiCutoffTripped = false;
    this.totalDispensedLiters = 0.0;
  }

  setEngineState(isRunning, isIgnitionOn) {
    this.isEngineRunning = isRunning;
    this.isIgnitionOn = isIgnitionOn;
  }

  attachGroundClamp(attached = true) {
    this.isGroundClampAttached = attached;
    return {
      attached,
      message: attached 
        ? 'Static grounding bonding cable securely clamped to chassis unibody grounding stud.'
        : 'Static grounding clamp removed.'
    };
  }

  openFillerFlap() {
    this.isFillerFlapOpen = true;
    return { success: true };
  }

  removeFuelCap() {
    if (!this.isFillerFlapOpen) {
      return { success: false, error: 'Fuel filler door is closed.' };
    }
    if (!this.isGroundClampAttached) {
      return {
        success: false,
        safetyViolation: 'STATIC_ELECTRICITY_HAZARD',
        error: 'Safety Protocol Violation: Static grounding clamp must be attached to vehicle chassis before opening fuel filler cap.'
      };
    }
    this.isFuelCapRemoved = true;
    return { success: true, message: 'Fuel filler cap unscrewed and hung on filler flap hook.' };
  }

  insertNozzle(fuelGrade = FUEL_GRADES.RON_98) {
    if (!this.isFuelCapRemoved) {
      return { success: false, error: 'Cannot insert nozzle: Fuel cap is installed.' };
    }
    this.dispensedFuelGrade = fuelGrade;
    this.isNozzleLatchedInNeck = true;
    this.isVenturiCutoffTripped = false;
    return {
      success: true,
      fuelGrade: fuelGrade.name,
      message: `Fuel dispensing nozzle (${fuelGrade.name}) inserted and latched into filler neck.`
    };
  }

  dispenseFuel(litersRequested = 10.0, flowRateLpm = 35.0) {
    // 1. Engine Running Interlock Check
    if (this.isEngineRunning || this.isIgnitionOn) {
      return {
        success: false,
        safetyViolation: 'ENGINE_RUNNING_LOCKOUT',
        error: 'SAFETY LOCKOUT: Engine or ignition is active! Turn vehicle ignition completely OFF before dispensing fuel.'
      };
    }

    // 2. Grounding Interlock Check
    if (!this.isGroundClampAttached) {
      return {
        success: false,
        safetyViolation: 'GROUNDING_ABSENT',
        error: 'SAFETY LOCKOUT: Static ground clamp missing. Refueling pump inhibited.'
      };
    }

    // 3. Nozzle Latched Check
    if (!this.isNozzleLatchedInNeck) {
      return {
        success: false,
        error: 'Dispenser nozzle is not seated in vehicle filler neck.'
      };
    }

    // 4. Fuel Compatibility Check (Diesel vs Petrol)
    if (this.dispensedFuelGrade.isDiesel) {
      return {
        success: false,
        safetyViolation: 'MISFUELING_PREVENTION',
        error: `MISFUELING REJECTION: Vehicle requires ${this.requiredFuel.name}! Diesel fuel nozzle mechanically locked out.`
      };
    }

    // 5. Automatic Venturi Shutoff Mechanics
    const remainingHeadroomLiters = this.tankCapacityLiters - this.currentFuelLiters;
    if (remainingHeadroomLiters <= 0.0) {
      this.isVenturiCutoffTripped = true;
      return {
        success: false,
        venturiCutoff: true,
        error: 'Automatic nozzle shutoff clicked: Fuel tank is 100% full. Pumping halted.'
      };
    }

    const actualDispensed = Math.min(litersRequested, remainingHeadroomLiters);
    this.currentFuelLiters += actualDispensed;
    this.totalDispensedLiters += actualDispensed;

    if (this.currentFuelLiters >= this.tankCapacityLiters) {
      this.isVenturiCutoffTripped = true;
    }

    return {
      success: true,
      dispensedLiters: parseFloat(actualDispensed.toFixed(2)),
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fillPercentage: Math.round((this.currentFuelLiters / this.tankCapacityLiters) * 100.0),
      isFull: this.currentFuelLiters >= this.tankCapacityLiters,
      venturiCutoffTripped: this.isVenturiCutoffTripped,
      octaneRating: this.dispensedFuelGrade.octane,
      performanceScore: this.dispensedFuelGrade.compatibilityScore
    };
  }

  removeNozzle() {
    this.isNozzleLatchedInNeck = false;
    return { success: true };
  }

  reinstallFuelCap() {
    this.isFuelCapRemoved = false;
    return { success: true };
  }

  closeFillerFlap() {
    this.isFillerFlapOpen = false;
    return { success: true };
  }
}
