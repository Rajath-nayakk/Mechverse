/**
 * MECHVERSE - Realistic Automotive Fastener Engineering & Failure Physics
 * 
 * Implements:
 * 1. Clamping Force Formula: F = T / (K * d)
 * 2. Friction Condition K Factors:
 *    - Dry clean steel: K = 0.20
 *    - Lightly lubricated (engine oil): K = 0.15
 *    - Anti-seize paste (copper/nickel): K = 0.12
 *    - Rusted / oxidized / corroded: K = 0.35
 * 3. Failure Modes:
 *    - THREAD_STRIPPED (female threads stripped by over-torqueing)
 *    - BOLT_SHEARED (shank snapped under torsion/tension past ultimate shear limit)
 *    - HEAD_ROUNDED (hex corners rounded by slipping/wrong socket)
 *    - TTY_STRETCHED (Torque-to-Yield angle bolt elongated past plastic limit)
 *    - BOLT_SEIZED (corrosion/galling requiring penetrating oil or breaker bar)
 * 4. Penetrating Oil Soak Dynamics (lowers K and breakaway torque)
 * 5. Broken Stud Extraction (pilot drilling + left-hand screw extractor)
 * 6. Sequence Verification (5-lug star pattern, cylinder head spiral center-out)
 */

export const THREAD_CONDITIONS = {
  DRY: { id: 'DRY', name: 'Dry / Clean Zinc Plated', kFactor: 0.20 },
  LUBRICATED: { id: 'LUBRICATED', name: 'Light Engine Oil Lubricated', kFactor: 0.15 },
  ANTI_SEIZE: { id: 'ANTI_SEIZE', name: 'Copper/Nickel Anti-Seize Paste', kFactor: 0.12 },
  RUSTED: { id: 'RUSTED', name: 'Rusted / Oxidized / Corroded', kFactor: 0.35 }
};

export const FASTENER_STATES = {
  INTACT: 'INTACT',
  SEIZED: 'SEIZED',
  THREAD_STRIPPED: 'THREAD_STRIPPED',
  BOLT_SHEARED: 'BOLT_SHEARED',
  HEAD_ROUNDED: 'HEAD_ROUNDED',
  TTY_STRETCHED: 'TTY_STRETCHED',
  EXTRACTED: 'EXTRACTED'
};

export class FastenerMechanics {
  /**
   * Calculates axial bolt clamping pre-load force in Newtons.
   * Formula: F = T / (K * d)
   * @param {number} appliedTorqueNm Applied torque in N*m
   * @param {number} nominalDiameterMm Thread nominal diameter in mm (e.g. 10 for M10, 12 for M12)
   * @param {number} kFactor Torque-friction coefficient K
   * @returns {number} Clamping force in Newtons (N)
   */
  static calculateClampingForce(appliedTorqueNm, nominalDiameterMm, kFactor = 0.20) {
    if (appliedTorqueNm <= 0 || nominalDiameterMm <= 0 || kFactor <= 0) return 0.0;
    const diameterMeters = nominalDiameterMm / 1000.0;
    return appliedTorqueNm / (kFactor * diameterMeters);
  }

  /**
   * Creates an engineering fastener instance with complete material specifications.
   */
  static createFastener(spec) {
    const condition = spec.condition || 'DRY';
    const kFactor = THREAD_CONDITIONS[condition]?.kFactor || 0.20;

    return {
      id: spec.id,
      name: spec.name || `Fastener ${spec.id}`,
      threadSize: spec.threadSize || 'M10x1.5',
      nominalDiameterMm: spec.nominalDiameterMm || 10.0,
      threadPitchMm: spec.threadPitchMm || 1.5,
      engagementLengthMm: spec.engagementLengthMm || 20.0,
      currentEngagementMm: spec.currentEngagementMm !== undefined ? spec.currentEngagementMm : spec.engagementLengthMm,
      socketSizeMm: spec.socketSizeMm || 17.0,
      driveType: spec.driveType || 'HexMetric',
      isTTY: !!spec.isTTY, // Torque-To-Yield (Requires Angle specified after baseline torque)
      specifiedAngleDeg: spec.specifiedAngleDeg || 0,
      appliedAngleDeg: 0,
      
      // Torque Thresholds (N*m)
      targetTorqueNm: spec.targetTorqueNm || 35.0,
      yieldTorqueLimitNm: spec.yieldTorqueLimitNm || (spec.targetTorqueNm ? spec.targetTorqueNm * 1.7 : 65.0),
      ultimateShearTorqueNm: spec.ultimateShearTorqueNm || (spec.yieldTorqueLimitNm ? spec.yieldTorqueLimitNm * 1.35 : (spec.targetTorqueNm ? spec.targetTorqueNm * 2.3 : 95.0)),
      currentTorqueNm: spec.currentTorqueNm || 0.0,
      
      // Thread & Chemical Condition
      condition,
      kFactor,
      penetratingOilApplied: false,
      penetratingOilSoakTimeSec: 0,
      
      // Physical & Damage States
      state: spec.isSeized ? FASTENER_STATES.SEIZED : FASTENER_STATES.INTACT,
      breakawayTorqueNm: spec.isSeized ? ((spec.targetTorqueNm || 35.0) * 1.8) : ((spec.targetTorqueNm || 35.0) * 1.1),
      isTorqued: false,
      isDisengaged: false,
      extracted: false
    };
  }

  /**
   * Applies penetrating oil spray to a seized or corroded fastener.
   * Lowers the effective K factor and softens breakaway torque over soak time.
   */
  static applyPenetratingOil(fastener) {
    fastener.penetratingOilApplied = true;
    fastener.penetratingOilSoakTimeSec = Math.max(fastener.penetratingOilSoakTimeSec, 1.0);
    
    // Lowers K factor towards lubricated state
    if (fastener.condition === 'RUSTED') {
      fastener.kFactor = 0.22;
      fastener.breakawayTorqueNm *= 0.65; // 35% reduction in breakaway effort
    }
    return {
      success: true,
      newKFactor: fastener.kFactor,
      breakawayTorqueNm: fastener.breakawayTorqueNm,
      message: 'Penetrating fluid capillary action applied to threads. Rust dissolved.'
    };
  }

  /**
   * Evaluates torque application and failure modes.
   */
  static applyTorque(fastener, appliedTorqueNm, tool = null) {
    // Cannot torque a severed or stripped bolt
    if (fastener.state === FASTENER_STATES.BOLT_SHEARED) {
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: 'Cannot torque: Bolt shank is sheared flush in the threaded bore!'
      };
    }
    if (fastener.state === FASTENER_STATES.THREAD_STRIPPED) {
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: 'Cannot torque: Internal threads are stripped and bolt spins freely!'
      };
    }
    if (fastener.state === FASTENER_STATES.HEAD_ROUNDED) {
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: 'Cannot torque: Hex head corners are rounded and socket slips off!'
      };
    }

    // Check head rounding if socket size is slightly loose or misaligned
    const toolSocketSize = tool ? (tool.socketSizeMm || tool.sizeMm) : null;
    if (toolSocketSize && Math.abs(toolSocketSize - fastener.socketSizeMm) > 0.05) {
      fastener.state = FASTENER_STATES.HEAD_ROUNDED;
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: `Hex corners rounded! Mismatched tool slipped under torque load.`
      };
    }

    // 1. Ultimate Shear Failure: Bolt shank twists and snaps
    if (appliedTorqueNm >= fastener.ultimateShearTorqueNm) {
      fastener.state = FASTENER_STATES.BOLT_SHEARED;
      fastener.currentTorqueNm = 0;
      fastener.clampingForceN = 0;
      fastener.isTorqued = false;
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: `CRACK! Bolt shank sheared off due to excessive torsional stress (${appliedTorqueNm.toFixed(1)} N·m >= ${fastener.ultimateShearTorqueNm.toFixed(1)} N·m). Extraction required!`
      };
    }

    // 2. Thread Stripping Failure: Female hole threads pull out
    if (appliedTorqueNm >= fastener.yieldTorqueLimitNm) {
      fastener.state = FASTENER_STATES.THREAD_STRIPPED;
      fastener.currentTorqueNm = 0;
      fastener.clampingForceN = 0;
      fastener.isTorqued = false;
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm: 0,
        clampingForceN: 0,
        message: `Threads stripped! Soft female hole threads pulled out past yield limit (${appliedTorqueNm.toFixed(1)} N·m >= ${fastener.yieldTorqueLimitNm.toFixed(1)} N·m). Helicoil insert required!`
      };
    }

    // 3. Torque-To-Yield (TTY) Bolt Permanent Plastic Stretch
    if (fastener.isTTY && appliedTorqueNm > fastener.targetTorqueNm * 1.25) {
      fastener.state = FASTENER_STATES.TTY_STRETCHED;
      return {
        success: false,
        state: fastener.state,
        appliedTorqueNm,
        clampingForceN: FastenerMechanics.calculateClampingForce(appliedTorqueNm, fastener.nominalDiameterMm, fastener.kFactor),
        message: `TTY bolt stretched past elastic limit into plastic deformation. One-time use exceeded: replace bolt!`
      };
    }

    // 4. Seized bolt breakaway check
    if (fastener.state === FASTENER_STATES.SEIZED) {
      if (appliedTorqueNm < fastener.breakawayTorqueNm) {
        return {
          success: false,
          state: fastener.state,
          appliedTorqueNm,
          clampingForceN: 0,
          message: `Bolt is seized by corrosion! Applied ${appliedTorqueNm.toFixed(1)} N·m is less than breakaway threshold (${fastener.breakawayTorqueNm.toFixed(1)} N·m). Use penetrating oil or breaker bar!`
        };
      }
      // Broke free
      fastener.state = FASTENER_STATES.INTACT;
    }

    // 5. Normal In-Spec Torquing
    fastener.currentTorqueNm = appliedTorqueNm;
    const lowerBound = fastener.targetTorqueNm * 0.90;
    const upperBound = fastener.targetTorqueNm * 1.10;
    fastener.isTorqued = appliedTorqueNm >= lowerBound && appliedTorqueNm <= upperBound;
    fastener.clampingForceN = FastenerMechanics.calculateClampingForce(appliedTorqueNm, fastener.nominalDiameterMm, fastener.kFactor);

    let status = 'IN_SPEC';
    if (appliedTorqueNm < lowerBound) status = 'UNDER_TORQUED';
    else if (appliedTorqueNm > upperBound) status = 'OVER_TARGET_SAFE';

    return {
      success: true,
      status,
      appliedTorqueNm,
      clampingForceN: fastener.clampingForceN,
      isTorqued: fastener.isTorqued,
      state: fastener.state,
      message: `Torque applied: ${appliedTorqueNm.toFixed(1)} N·m. Clamping force: ${fastener.clampingForceN.toFixed(0)} N (${status}).`
    };
  }

  /**
   * Performs damaged bolt extraction using a center punch, pilot drill, and left-hand screw extractor.
   */
  static extractBrokenStud(fastener, extractorTool) {
    if (fastener.state !== FASTENER_STATES.BOLT_SHEARED && fastener.state !== FASTENER_STATES.HEAD_ROUNDED) {
      return { success: false, message: 'Fastener is not sheared or rounded; extraction kit not required.' };
    }

    if (!extractorTool || extractorTool.category !== 'EXTRACTOR') {
      return { success: false, message: 'Extraction requires Left-Hand Screw Extractor drill kit.' };
    }

    fastener.state = FASTENER_STATES.EXTRACTED;
    fastener.currentEngagementMm = 0;
    fastener.isDisengaged = true;
    fastener.currentTorqueNm = 0;

    return {
      success: true,
      state: fastener.state,
      message: 'Broken stud drilled and successfully backed out with reverse-flute extractor! Threaded bore saved.'
    };
  }

  /**
   * Tightening Sequence Validator (Star Pattern on 5-lug wheels, Spiral Pattern on Cylinder Heads).
   */
  static validateTighteningSequence(sequenceType, fastenerIdsTightened) {
    // 5-Lug Wheel Star Pattern (1 -> 3 -> 5 -> 2 -> 4)
    if (sequenceType === 'WHEEL_5_LUG') {
      const idealOrder = ['lug_1', 'lug_3', 'lug_5', 'lug_2', 'lug_4'];
      const actualOrder = fastenerIdsTightened.map(id => id.toLowerCase());
      
      let outOfOrderCount = 0;
      for (let i = 0; i < actualOrder.length; i++) {
        if (idealOrder[i] && actualOrder[i] !== idealOrder[i]) {
          outOfOrderCount++;
        }
      }

      const isValid = outOfOrderCount === 0;
      return {
        isValid,
        sequenceType,
        idealSequence: idealOrder,
        warpageRiskPercent: isValid ? 0 : Math.min(100, outOfOrderCount * 25),
        message: isValid
          ? '5-Lug Star Pattern followed perfectly. Wheel clamped uniformly against hub.'
          : `Star pattern violated (${outOfOrderCount} lugs torqued out of sequence). Brake rotor warping risk!`
      };
    }

    // Cylinder Head Spiral Center-Out Pattern
    if (sequenceType === 'HEAD_SPIRAL') {
      const idealHeadOrder = [
        'head_bolt_7', 'head_bolt_8', // Center
        'head_bolt_3', 'head_bolt_4', // Mid-inner
        'head_bolt_11', 'head_bolt_12',
        'head_bolt_1', 'head_bolt_2', // Mid-outer
        'head_bolt_5', 'head_bolt_6',
        'head_bolt_9', 'head_bolt_10' // Outer corners
      ];

      let score = 100;
      for (let i = 0; i < fastenerIdsTightened.length; i++) {
        if (fastenerIdsTightened[i] !== idealHeadOrder[i]) {
          score -= 15;
        }
      }
      const clampedScore = Math.max(0, score);
      return {
        isValid: clampedScore >= 80,
        score: clampedScore,
        gasketSealIntegrity: clampedScore >= 80 ? 'EXCELLENT' : 'LEAK_RISK',
        message: clampedScore >= 80
          ? 'Cylinder head clamped inside-out. Head gasket squish uniform.'
          : 'Head torqued improperly. Center-out spiral violated: head gasket blow-by risk!'
      };
    }

    return { isValid: true, message: 'No sequence restriction for this assembly.' };
  }
}
