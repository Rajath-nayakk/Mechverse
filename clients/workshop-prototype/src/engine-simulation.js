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

// BMW M4 Competition (G82) Factory S58B30T0 Twin-Turbo 3.0L DOHC Inline-6
export const ENGINE_SPECS_S58 = {
  name: 'BMW S58B30T0 Twin-Turbo DOHC 3.0L I6',
  cylinders: 6,
  displacementLiters: 2.993,
  boreMm: 84.0,
  strokeMm: 90.0,
  connectingRodLengthMm: 151.0,
  compressionRatio: 9.3,
  firingOrder: [1, 5, 3, 6, 2, 4],
  oilCapacityLiters: 7.0,
  coolantCapacityLiters: 10.5,
  ratedCompressionPsi: 175.0,
  minAcceptableCompressionPsi: 140.0,
  maxCylinderVariationPercent: 10.0,
  nominalLeakdownPercent: 4.0,
  maxAcceptableLeakdownPercent: 18.0,
  twinTurbos: true,
  boostPsi: 24.7, // 1.7 bar boost
  ratedPowerHp: 503,
  ratedTorqueNm: 650,
  weightKg: 195,
  lengthMm: 720,
  widthMm: 680,
  heightMm: 685
};

// Fictional Custom 6.0L 60-Degree DOHC 48-Valve V12 Engine Swap
export const ENGINE_SPECS_V12 = {
  name: 'Custom 6.0L 60-Deg DOHC 48-Valve V12 Swap',
  cylinders: 12,
  displacementLiters: 5.992,
  boreMm: 89.0,
  strokeMm: 80.2,
  connectingRodLengthMm: 142.0,
  compressionRatio: 11.5,
  firingOrder: [1, 12, 5, 8, 3, 10, 6, 7, 2, 11, 4, 9],
  oilCapacityLiters: 11.5,
  coolantCapacityLiters: 16.0,
  ratedCompressionPsi: 205.0,
  minAcceptableCompressionPsi: 160.0,
  maxCylinderVariationPercent: 8.0,
  nominalLeakdownPercent: 4.0,
  maxAcceptableLeakdownPercent: 15.0,
  ratedPowerHp: 680,
  ratedTorqueNm: 680,
  weightKg: 265,
  lengthMm: 840,
  widthMm: 710,
  heightMm: 615
};

// S58 Complete Teardown Hierarchy Tree
export const S58_DISASSEMBLY_TREE = {
  engine_cover: { name: 'M Carbon Engine Beauty Cover', prereqs: [] },
  strut_brace: { name: 'Front Strut Tower Cross-Brace', prereqs: [] },
  charge_pipes: { name: 'Intake Charge Air Pipes', prereqs: ['engine_cover'] },
  liquid_charge_cooler: { name: 'Liquid-to-Air Intake Charge Cooler', prereqs: ['charge_pipes', 'strut_brace'] },
  ignition_coils: { name: 'Ignition Coil Packs (6x)', prereqs: ['engine_cover'] },
  spark_plugs: { name: 'High-Performance Spark Plugs (6x)', prereqs: ['ignition_coils'] },
  fuel_rail_injectors: { name: '350-Bar Direct Fuel Rail & Injectors (6x)', prereqs: ['liquid_charge_cooler', 'spark_plugs'] },
  exhaust_downpipes: { name: 'Dual Turbo Downpipes & Catalysts', prereqs: ['strut_brace'] },
  twin_turbos: { name: 'Twin Mono-Scroll Turbocharger Assemblies', prereqs: ['exhaust_downpipes', 'charge_pipes'] },
  valve_cover: { name: 'Cast Aluminum DOHC Valve Cover', prereqs: ['ignition_coils', 'fuel_rail_injectors'] },
  timing_chain_cover: { name: 'Front Timing Chain Cover', prereqs: ['valve_cover'] },
  timing_chain: { name: 'Double-Row Timing Chain & Tensioner Guides', prereqs: ['timing_chain_cover'] },
  camshafts_dohc: { name: 'Intake & Exhaust Camshafts with Double-VANOS Phasers', prereqs: ['timing_chain', 'valve_cover'] },
  head_bolts: { name: 'Cylinder Head Bolts (14x Torque-to-Yield)', prereqs: ['camshafts_dohc'] },
  cylinder_head: { name: 'S58 24-Valve CNC Ported Cylinder Head', prereqs: ['head_bolts', 'twin_turbos'] },
  head_gasket: { name: 'Multi-Layer Steel (MLS) Head Gasket', prereqs: ['cylinder_head'] },
  oil_pan: { name: 'Cast Aluminum Oil Pan with Dual Scavenge Pumps', prereqs: [] },
  connecting_rod_caps: { name: 'Connecting Rod Caps & Bearings (6x)', prereqs: ['oil_pan'] },
  pistons_and_rods: { name: 'Forged Pistons & H-Beam Connecting Rods (6x)', prereqs: ['cylinder_head', 'connecting_rod_caps'] },
  crankshaft: { name: 'Forged Steel Lightweight Crankshaft', prereqs: ['connecting_rod_caps', 'timing_chain'] },
  bare_engine_block: { name: 'S58 Closed-Deck 3.0L Cast Aluminum Engine Block', prereqs: ['pistons_and_rods', 'crankshaft', 'head_gasket'] }
};

/**
 * Engineering Feasibility Checker for Custom V12 Engine Swap into BMW M4 (G82)
 */
export class V12SwapFeasibilityChecker {
  static evaluateFeasibility(chassisSpec = null) {
    // BMW M4 Competition (G82) Engine Bay Baseline Dimensions
    const bay = {
      lengthMm: 880,
      widthBetweenTowersMm: 820,
      hoodHeightCenterMm: 640,
      frontAxleCurbsideWeightKg: 880,
      rearAxleCurbsideWeightKg: 840,
      totalWeightKg: 1720,
      transmissionModel: 'ZF 8HP76 8-Speed M Steptronic'
    };

    const s58 = ENGINE_SPECS_S58;
    const v12 = ENGINE_SPECS_V12;

    // 1. Physical Bay Clearance Check
    const lengthMarginMm = bay.lengthMm - v12.lengthMm; // 880 - 840 = 40 mm
    const lengthPass = lengthMarginMm >= 25; // Minimum 25mm clearance for engine rocking on mounts

    const widthMarginMm = (bay.widthBetweenTowersMm - v12.widthMm) / 2.0; // (820 - 710) / 2 = 55 mm per side
    const widthPass = widthMarginMm >= 30;

    const heightMarginMm = bay.hoodHeightCenterMm - v12.heightMm; // 640 - 615 = 25 mm
    const heightPass = heightMarginMm >= 15;

    // 2. Weight Distribution Shift Calculation
    const engineDeltaKg = v12.weightKg - s58.weightKg; // 265 - 195 = +70 kg
    const newFrontKg = bay.frontAxleCurbsideWeightKg + engineDeltaKg;
    const newTotalKg = bay.totalWeightKg + engineDeltaKg;
    const s58FrontPct = (bay.frontAxleCurbsideWeightKg / bay.totalWeightKg) * 100.0; // 51.16%
    const v12FrontPct = (newFrontKg / newTotalKg) * 100.0; // 53.07%
    const weightShiftDelta = v12FrontPct - s58FrontPct;

    // 3. Cooling Thermal Rejection Requirement
    // V12 heat rejection = ~52 kW at 680 hp vs S58 38 kW at 503 hp (+36.8%)
    const thermalLoadKw = 52.0;
    const coolingPass = thermalLoadKw <= 60.0; // Achievable with dual auxiliary 280mm side radiators

    // Overall Feasibility Verdict
    const isFeasible = lengthPass && widthPass && heightPass && coolingPass;
    const clearanceScore = Math.round(((lengthMarginMm / 40.0) * 0.4 + (widthMarginMm / 55.0) * 0.3 + (heightMarginMm / 25.0) * 0.3) * 100.0);
    const coolingScore = 88;
    const drivetrainScore = 94;

    return {
      isFeasible,
      clearanceScore,
      coolingScore,
      drivetrainScore,
      overallScore: Math.round((clearanceScore * 0.35 + coolingScore * 0.35 + drivetrainScore * 0.30)),
      clearances: {
        lengthMarginMm,
        lengthPass,
        widthMarginMm,
        widthPass,
        heightMarginMm,
        heightPass
      },
      weightDistribution: {
        originalFrontPct: parseFloat(s58FrontPct.toFixed(1)),
        newFrontPct: parseFloat(v12FrontPct.toFixed(1)),
        shiftDeltaPct: parseFloat(weightShiftDelta.toFixed(1)),
        handlingNote: 'Front spring rate must increase by +15 N/mm to preserve 1.35 Hz front bounce frequency.'
      },
      swapRequirements: [
        'Custom CNC billet 6061-T6 aluminum transmission bellhousing adapter plate to ZF 8HP76',
        'Custom tubular 4130 chromoly subframe crossmember and solid billet aluminum engine mounts',
        'Dual 280mm side-mount auxiliary radiators with brushless 180 L/min electric water pump',
        'Slim high-velocity electric radiator pusher fan conversion (reclaims 35mm bay depth)',
        'Standalone Motec M150 / Syvecs S12 ECU with dual CAN gateway to BMW chassis DSC/ABS'
      ]
    };
  }
}

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

  setEngineType(engineType) {
    if (engineType === 'S58') {
      this.specs = { ...ENGINE_SPECS_S58 };
    } else if (engineType === 'V12') {
      this.specs = { ...ENGINE_SPECS_V12 };
    } else {
      this.specs = { ...ENGINE_SPECS };
    }

    // Reinitialize cylinder health array
    this.cylinderHealth = Array.from({ length: this.specs.cylinders }, (_, i) => ({
      cylinder: i + 1,
      ringSeal: 1.0,
      intakeValveSeal: 1.0,
      exhaustValveSeal: 1.0,
      headGasketSeal: 1.0
    }));

    return this.specs;
  }

  canRemoveDisassemblyComponent(componentId, removedComponentsSet) {
    const comp = S58_DISASSEMBLY_TREE[componentId];
    if (!comp) {
      return { allowed: true, reason: 'Unrestricted or custom component' };
    }
    const missingPrereqs = comp.prereqs.filter(p => !removedComponentsSet.has(p));
    if (missingPrereqs.length > 0) {
      const names = missingPrereqs.map(p => S58_DISASSEMBLY_TREE[p]?.name || p).join(', ');
      return {
        allowed: false,
        missingPrereqs,
        reason: `Cannot remove ${comp.name}: Must remove [${names}] first.`
      };
    }
    return { allowed: true, reason: 'All disassembly prerequisites satisfied.' };
  }

  getCycleStroke(cylinderIndex, crankAngleDeg = 0) {
    const firingOffsets = {
      4: [0, 180, 540, 360], // [1, 3, 4, 2]
      6: [0, 480, 240, 600, 120, 360], // S58 [1, 5, 3, 6, 2, 4] -> 120 deg intervals
      12: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660]
    };

    const offsets = firingOffsets[this.specs.cylinders] || firingOffsets[4];
    const offset = offsets[(cylinderIndex - 1) % offsets.length] || 0;
    const effectiveAngle = ((crankAngleDeg + offset) % 720 + 720) % 720;

    if (effectiveAngle < 180) return 'INTAKE';
    if (effectiveAngle < 360) return 'COMPRESSION';
    if (effectiveAngle < 540) return 'POWER';
    return 'EXHAUST';
  }

  getValveLiftMm(cylinderIndex, crankAngleDeg = 0) {
    const stroke = this.getCycleStroke(cylinderIndex, crankAngleDeg);
    const maxLiftMm = 10.5; // Valvetronic max intake lift

    let intakeLiftMm = 0.0;
    let exhaustLiftMm = 0.0;

    const firingOffsets = {
      4: [0, 180, 540, 360],
      6: [0, 480, 240, 600, 120, 360],
      12: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660]
    };
    const offsets = firingOffsets[this.specs.cylinders] || firingOffsets[4];
    const offset = offsets[(cylinderIndex - 1) % offsets.length] || 0;
    const effectiveAngle = ((crankAngleDeg + offset) % 720 + 720) % 720;

    // Intake valve opens slightly before TDC (350 deg) to 200 deg
    if (effectiveAngle >= 350 || effectiveAngle <= 210) {
      const thetaNorm = effectiveAngle >= 350 ? (effectiveAngle - 350) / 220 : (effectiveAngle + 10) / 220;
      intakeLiftMm = Math.sin(thetaNorm * Math.PI) * maxLiftMm;
    }

    // Exhaust valve opens before BDC (500 deg) to 30 deg after TDC
    if (effectiveAngle >= 500 || effectiveAngle <= 40) {
      const thetaNorm = effectiveAngle >= 500 ? (effectiveAngle - 500) / 260 : (effectiveAngle + 220) / 260;
      exhaustLiftMm = Math.sin(thetaNorm * Math.PI) * maxLiftMm;
    }

    return {
      stroke,
      intakeLiftMm: Math.max(0, intakeLiftMm),
      exhaustLiftMm: Math.max(0, exhaustLiftMm)
    };
  }

  getPistonKinematics(cylinderIndex, crankAngleRad = 0, rpm = 1000) {
    const r = (this.specs.strokeMm / 1000.0) / 2.0; // Crank radius in meters (0.045m)
    const l = this.specs.connectingRodLengthMm / 1000.0; // Con-rod length in meters (0.151m)
    const omega = (rpm * 2 * Math.PI) / 60.0; // rad/s
    const lambda = r / l;

    const theta = crankAngleRad;
    // Piston displacement from TDC (m)
    const s = r * ((1.0 - Math.cos(theta)) + (lambda / 4.0) * (1.0 - Math.cos(2.0 * theta)));
    // Piston velocity (m/s): v = r * omega * (sin(theta) + (lambda/2) * sin(2*theta))
    const v = r * omega * (Math.sin(theta) + (lambda / 2.0) * Math.sin(2.0 * theta));
    // Piston acceleration (m/s^2): a = r * omega^2 * (cos(theta) + lambda * cos(2*theta))
    const a = r * omega * omega * (Math.cos(theta) + lambda * Math.cos(2.0 * theta));

    return {
      displacementMm: s * 1000.0,
      velocityMps: v,
      accelerationMps2: a
    };
  }

  getInstantaneousPressurePsi(cylinderIndex, crankAngleDeg = 0) {
    const stroke = this.getCycleStroke(cylinderIndex, crankAngleDeg);
    const atmosphericPsi = 14.7;
    const boostPsi = this.specs.twinTurbos ? this.specs.boostPsi : 0;
    const baseIntakePsi = atmosphericPsi + (boostPsi * 0.4);

    if (stroke === 'INTAKE') {
      return baseIntakePsi;
    }
    if (stroke === 'COMPRESSION') {
      // Polytropic compression P = P0 * (rc)^gamma
      const progress = (crankAngleDeg % 180) / 180.0;
      return baseIntakePsi + Math.pow(this.specs.compressionRatio, 1.33) * progress * 14.0;
    }
    if (stroke === 'POWER') {
      // Combustion peak up to 1400 PSI expanding
      const progress = (crankAngleDeg % 180) / 180.0;
      const peakPsi = 1250.0 + (boostPsi * 25.0);
      return Math.max(35.0, peakPsi * Math.exp(-progress * 3.5));
    }
    // EXHAUST
    return 18.0; // Slight backpressure
  }
}

