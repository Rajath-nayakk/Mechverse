/**
 * MECHVERSE - Internal Combustion Engine Simulation, Thermodynamics & Diagnostics
 * 
 * Simulates a 4-stroke Inline-4 DOHC 16-Valve Automotive Petrol Engine:
 * - Kinematic Piston Motion & Valvetrain Timing
 * - Thermodynamic Cylinder Pressure & Compression Ratio: r_c = 10.5:1
 * - Cylinder Compression Testing (Dry / Wet cranking buildup)
 * - Cylinder Leak-Down Testing (100 PSI regulated shop air supply)
 * - Mechanical Fault Injection & Verification
 * - Engine Oil & Fluid Servicing (Draining, Filter Change, Refilling)
 */

export const ENGINE_SPECS = {
  cylinders: 4,
  displacementLiters: 2.0,
  boreMm: 84.0,
  strokeMm: 90.0,
  connectingRodLengthMm: 145.0,
  compressionRatio: 10.5,
  firingOrder: [1, 3, 4, 2],
  oilCapacityLiters: 4.5,
  coolantCapacityLiters: 6.8,
  ratedCompressionPsi: 175.0, // Benchmark healthy dry compression spec (170-185 PSI)
  minAcceptableCompressionPsi: 135.0,
  maxCylinderVariationPercent: 10.0,
  nominalLeakdownPercent: 5.0, // Healthy engine leakdown: 3-8%
  maxAcceptableLeakdownPercent: 20.0
};

export const MECHANICAL_FAULTS = {
  NONE: 'NONE',
  BLOWN_HEAD_GASKET: 'BLOWN_HEAD_GASKET', // Cylinders 2 & 3 share compression leak
  BENT_INTAKE_VALVE_CYL1: 'BENT_INTAKE_VALVE_CYL1', // Cylinder 1 valve unseated
  WORN_PISTON_RINGS_CYL4: 'WORN_PISTON_RINGS_CYL4', // Cylinder 4 blows past rings into crankcase
  INCORRECT_VALVE_TIMING: 'INCORRECT_VALVE_TIMING' // Timing belt slipped 1 tooth
};

export class EngineSimulation {
  constructor() {
    this.specs = { ...ENGINE_SPECS };
    this.crankAngleRad = 0.0;
    this.engineRpm = 0.0;
    this.isRunning = false;
    this.isCranking = false;
    
    // Engine Oil & Fluid Servicing State
    this.engineOilLiters = 4.2;
    this.oilConditionPercent = 35.0; // Worn, dark oil
    this.isDrainPlugInstalled = true;
    this.isOilFilterInstalled = true;
    this.isOilFillCapOpen = false;
    this.isDrainingOil = false;
    this.collectedWasteOilLiters = 0.0;

    // Active Mechanical Faults
    this.activeFaults = new Set();
    
    // Cylinder Health State: [cyl1, cyl2, cyl3, cyl4]
    this.cylinderHealth = [
      { cylinder: 1, ringSeal: 1.0, intakeValveSeal: 1.0, exhaustValveSeal: 1.0, headGasketSeal: 1.0 },
      { cylinder: 2, ringSeal: 1.0, intakeValveSeal: 1.0, exhaustValveSeal: 1.0, headGasketSeal: 1.0 },
      { cylinder: 3, ringSeal: 1.0, intakeValveSeal: 1.0, exhaustValveSeal: 1.0, headGasketSeal: 1.0 },
      { cylinder: 4, ringSeal: 1.0, intakeValveSeal: 1.0, exhaustValveSeal: 1.0, headGasketSeal: 1.0 }
    ];

    // Diagnostic Tool State
    this.compressionTester = {
      connectedCylinder: null, // 1 to 4
      currentPressurePsi: 0.0,
      peakPressurePsi: 0.0,
      isWetTest: false, // Wet test adds a squirt of oil to seal piston rings
      history: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };

    this.leakdownTester = {
      connectedCylinder: null,
      supplyPressurePsi: 100.0, // Standard 100 PSI calibrated supply
      leakagePercent: 0.0,
      leakLocation: 'NONE' // INTAKE_VALVE, EXHAUST_PIPE, OIL_FILLER_CRANKCASE, RADIATOR_CAP, NONE
    };
  }

  /**
   * Calculates kinematic piston displacement from Top Dead Center (TDC):
   * x(theta) = r * (1 - cos(theta)) + (r^2 / (2 * l)) * sin^2(theta)
   */
  getPistonDisplacementMm(cylinderIndex, customCrankAngleRad = null) {
    const crankR = this.specs.strokeMm / 2.0; // Crank radius = 45mm
    const rodL = this.specs.connectingRodLengthMm; // 145mm
    const baseTheta = customCrankAngleRad !== null ? customCrankAngleRad : this.crankAngleRad;

    // Firing offset based on firing order [1, 3, 4, 2]
    const offsets = [0.0, Math.PI, Math.PI, 0.0]; // Cylinders 1&4 pair, 2&3 pair (180 deg out)
    const theta = baseTheta + (offsets[cylinderIndex - 1] || 0.0);

    const term1 = crankR * (1.0 - Math.cos(theta));
    const term2 = (crankR * crankR / (2.0 * rodL)) * Math.pow(Math.sin(theta), 2);
    return term1 + term2;
  }

  /**
   * Sets active mechanical fault and recalculates cylinder seals
   */
  setMechanicalFault(faultType, active = true) {
    if (active) {
      this.activeFaults.add(faultType);
    } else {
      this.activeFaults.delete(faultType);
    }
    this.recalculateCylinderSeals();
  }

  recalculateCylinderSeals() {
    // Reset to healthy
    for (let i = 0; i < 4; i++) {
      this.cylinderHealth[i] = {
        cylinder: i + 1,
        ringSeal: 1.0,
        intakeValveSeal: 1.0,
        exhaustValveSeal: 1.0,
        headGasketSeal: 1.0
      };
    }

    if (this.activeFaults.has(MECHANICAL_FAULTS.BLOWN_HEAD_GASKET)) {
      // Cyl 2 and 3 leak compression across the fire ring
      this.cylinderHealth[1].headGasketSeal = 0.38; // ~65 PSI
      this.cylinderHealth[2].headGasketSeal = 0.42;
    }

    if (this.activeFaults.has(MECHANICAL_FAULTS.BENT_INTAKE_VALVE_CYL1)) {
      // Cyl 1 intake valve stuck partially open
      this.cylinderHealth[0].intakeValveSeal = 0.05; // 0-10 PSI
    }

    if (this.activeFaults.has(MECHANICAL_FAULTS.WORN_PISTON_RINGS_CYL4)) {
      // Cyl 4 compression rings worn / stuck
      this.cylinderHealth[3].ringSeal = 0.58; // ~105-115 PSI dry, restored on wet test
    }
  }

  /**
   * Connect compression tester to a specific spark plug well (1 to 4)
   */
  connectCompressionTester(cylinderNumber, isWetTest = false) {
    if (cylinderNumber < 1 || cylinderNumber > 4) {
      throw new Error(`Invalid cylinder number: ${cylinderNumber}. Must be 1 to 4.`);
    }
    this.compressionTester.connectedCylinder = cylinderNumber;
    this.compressionTester.isWetTest = isWetTest;
    this.compressionTester.currentPressurePsi = 0.0;
    this.compressionTester.peakPressurePsi = 0.0;
    return {
      connected: true,
      cylinder: cylinderNumber,
      isWetTest: isWetTest,
      message: `Compression gauge hose threaded into Cylinder ${cylinderNumber} spark plug port.`
    };
  }

  /**
   * Perform cranking compression test stroke:
   * Generates realistic pressure buildup across 4-6 compression pulses.
   */
  crankCompressionTest(numPulses = 5) {
    const cyl = this.compressionTester.connectedCylinder;
    if (!cyl) {
      return { success: false, error: 'Compression gauge is not connected to any cylinder.' };
    }

    const health = this.cylinderHealth[cyl - 1];
    let sealFactor = health.headGasketSeal * health.intakeValveSeal * health.exhaustValveSeal;

    // Wet test adds oil, sealing worn rings temporarily
    if (this.compressionTester.isWetTest) {
      sealFactor *= 0.98; // Oil seals rings back to near-normal
    } else {
      sealFactor *= health.ringSeal;
    }

    const targetPeakPsi = this.specs.ratedCompressionPsi * sealFactor;
    
    // Simulate multi-stroke pulse gauge buildup
    let current = 0.0;
    for (let p = 1; p <= numPulses; p++) {
      const pulseRatio = 1.0 - Math.pow(0.45, p);
      current = targetPeakPsi * pulseRatio;
    }

    // Add tiny realistic measurement noise (+/- 1.5 PSI)
    const finalPsi = Math.max(0.0, Math.round(current * 10) / 10);
    this.compressionTester.currentPressurePsi = finalPsi;
    this.compressionTester.peakPressurePsi = finalPsi;
    this.compressionTester.history[cyl] = finalPsi;

    return {
      success: true,
      cylinder: cyl,
      isWetTest: this.compressionTester.isWetTest,
      pressurePsi: finalPsi,
      specPsi: this.specs.ratedCompressionPsi,
      passed: finalPsi >= this.specs.minAcceptableCompressionPsi
    };
  }

  /**
   * Connect cylinder leak-down tester and apply 100 PSI regulated air
   * Requires piston to be at Top Dead Center (TDC) on compression stroke.
   */
  connectLeakdownTester(cylinderNumber) {
    if (cylinderNumber < 1 || cylinderNumber > 4) {
      throw new Error(`Invalid cylinder number: ${cylinderNumber}. Must be 1 to 4.`);
    }
    this.leakdownTester.connectedCylinder = cylinderNumber;
    const health = this.cylinderHealth[cylinderNumber - 1];

    let leakPercent = this.specs.nominalLeakdownPercent;
    let location = 'NONE';

    if (health.intakeValveSeal < 0.5) {
      leakPercent = 90.0;
      location = 'INTAKE_VALVE'; // Air rushing through throttle body / airbox
    } else if (health.headGasketSeal < 0.6) {
      leakPercent = 65.0;
      location = 'RADIATOR_CAP'; // Air bubbles blowing through cooling system
    } else if (health.ringSeal < 0.8) {
      leakPercent = 42.0;
      location = 'OIL_FILLER_CRANKCASE'; // Air rushing into crankcase out of oil cap / dipstick
    } else if (health.exhaustValveSeal < 0.5) {
      leakPercent = 85.0;
      location = 'EXHAUST_PIPE'; // Air hissing out tailpipe
    }

    this.leakdownTester.leakagePercent = leakPercent;
    this.leakdownTester.leakLocation = location;

    return {
      cylinder: cylinderNumber,
      supplyPressurePsi: 100.0,
      leakagePercent: leakPercent,
      leakLocation: location,
      isAcceptable: leakPercent <= this.specs.maxAcceptableLeakdownPercent
    };
  }

  /**
   * Engine Oil Service Operations
   */
  drainOil(deltaTimeSeconds = 1.0) {
    if (!this.isDrainPlugInstalled && this.engineOilLiters > 0.0) {
      this.isDrainingOil = true;
      const drainRateLps = 0.75; // 0.75 L per second
      const drained = Math.min(this.engineOilLiters, drainRateLps * deltaTimeSeconds);
      this.engineOilLiters -= drained;
      this.collectedWasteOilLiters += drained;
      if (this.engineOilLiters <= 0.001) {
        this.engineOilLiters = 0.0;
        this.isDrainingOil = false;
      }
      return { draining: true, remainingOilLiters: this.engineOilLiters, wasteCollected: this.collectedWasteOilLiters };
    }
    this.isDrainingOil = false;
    return { draining: false, remainingOilLiters: this.engineOilLiters, wasteCollected: this.collectedWasteOilLiters };
  }

  refillOil(litersAdded = 1.0) {
    if (!this.isOilFillCapOpen) {
      return { success: false, error: 'Engine oil filler cap is closed.' };
    }
    if (!this.isDrainPlugInstalled) {
      this.engineOilLiters = 0.0;
      return { success: false, error: 'Warning: Oil drain plug is missing! Added oil leaked directly onto floor.' };
    }

    const availableCapacity = this.specs.oilCapacityLiters - this.engineOilLiters;
    const actualAdded = Math.min(litersAdded, availableCapacity);
    this.engineOilLiters += actualAdded;
    
    // Fresh oil improves condition
    this.oilConditionPercent = Math.min(100.0, this.oilConditionPercent + (actualAdded / this.specs.oilCapacityLiters) * 75.0);

    return {
      success: true,
      addedLiters: actualAdded,
      currentLevelLiters: this.engineOilLiters,
      capacityLiters: this.specs.oilCapacityLiters,
      oilCondition: this.oilConditionPercent
    };
  }

  update(deltaTimeSeconds) {
    if (this.isCranking) {
      this.engineRpm = 220.0; // Typical starter cranking speed (200-250 RPM)
      this.crankAngleRad = (this.crankAngleRad + (this.engineRpm * (2 * Math.PI) / 60.0) * deltaTimeSeconds) % (4 * Math.PI);
    } else if (this.isRunning) {
      this.engineRpm = 850.0; // Idle RPM
      this.crankAngleRad = (this.crankAngleRad + (this.engineRpm * (2 * Math.PI) / 60.0) * deltaTimeSeconds) % (4 * Math.PI);
    } else {
      this.engineRpm = 0.0;
    }

    if (!this.isDrainPlugInstalled && this.engineOilLiters > 0.0) {
      this.drainOil(deltaTimeSeconds);
    }
  }
}
