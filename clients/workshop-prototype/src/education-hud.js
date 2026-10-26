/**
 * MECHVERSE - Educational Technical Inspection HUD & Factory Torque Specifications
 * 
 * Provides:
 * 1. Factory Torque Specification Database for BMW M4 Competition (G82) & S58 Engine
 * 2. Component Cutaway & Technical Descriptions
 * 3. Diagnostic Root Cause Explanations
 */

export const FACTORY_TORQUE_SPECS = {
  // Powertrain (S58 3.0L Twin-Turbo)
  SPARK_PLUGS: { name: 'M12x1.25 High-Performance Spark Plugs', specTorqueNm: 23.0, toleranceNm: 2.0, isTTY: false, notes: 'Thread dry. Do not apply anti-seize.' },
  OIL_DRAIN_PLUG: { name: 'M14x1.5 Sump Drain Plug with Copper Crush Washer', specTorqueNm: 25.0, toleranceNm: 2.5, isTTY: false, notes: 'Always replace copper crush ring.' },
  OIL_FILTER_HOUSING: { name: 'Oil Filter Housing Plastic Cap', specTorqueNm: 25.0, toleranceNm: 2.0, isTTY: false, notes: 'Lubricate rubber O-ring with fresh oil.' },
  CON_ROD_BOLTS: { name: 'S58 Forged Connecting Rod Bolts', specTorqueNm: 20.0, angleDeg: 70, isTTY: true, notes: 'Torque-To-Yield: 20 N·m initial clamp + 70° angle rotation. Replace every rebuild.' },
  CYLINDER_HEAD_BOLTS: { name: 'S58 High-Tensile Cylinder Head Bolts', specTorqueNm: 30.0, angleDeg: 180, isTTY: true, notes: 'Spiral center-out sequence: 30 N·m + 90° + 90°. Replace after loosening.' },

  // Chassis & Running Gear
  WHEEL_LUG_BOLTS: { name: 'M14x1.25 Grade 10.9 Wheel Lug Bolts', specTorqueNm: 140.0, toleranceNm: 5.0, isTTY: false, notes: 'Star sequence tightening. Dry threads.' },
  BRAKE_CALIPER_CARRIER_BOLTS: { name: 'Front Caliper Bracket to Knuckle Bolts', specTorqueNm: 110.0, toleranceNm: 8.0, isTTY: false, notes: 'Apply medium-strength blue threadlocker.' },
  BRAKE_BLEEDER_SCREW: { name: 'Hydraulic Caliper Bleeder Nipple', specTorqueNm: 12.0, toleranceNm: 1.5, isTTY: false, notes: 'Do not over-torque brass bleeder seat.' },
  STRUT_TOP_MOUNT_NUTS: { name: 'Front Strut Tower Guide Mount Nuts (3x)', specTorqueNm: 34.0, toleranceNm: 3.0, isTTY: false, notes: 'Tighten with vehicle at curb resting weight.' }
};

export const TECHNICAL_CUTAWAYS = {
  S58_ENGINE: {
    title: 'BMW S58 3.0L Twin-Turbo Inline-6',
    architecture: 'Closed-Deck Crankcase, Forged Crankshaft, Arc-Sprayed Wire Coating (LDS)',
    features: [
      'Twin mono-scroll turbochargers feeding separate cylinders 1-3 and 4-6',
      'High-pressure direct injection operating at 350 bar (5,076 PSI) for ultra-fine atomization',
      'Water-to-air liquid charge air cooler mounted directly atop intake manifold for shortest boost lag',
      'Dual VANOS variable camshaft timing and VALVETRONIC variable valve lift'
    ]
  },
  BRAKE_SYSTEM: {
    title: 'M Compound High-Performance Braking System',
    architecture: '6-Piston Fixed Monobloc Front Calipers, Floating Single-Piston Rear',
    features: [
      '380x36mm front cross-drilled, radially ventilated grey cast iron friction rings',
      'Cast aluminum disc bells connected by stainless steel pins to minimize thermal un-sprung mass',
      'Integrated Brake By Wire hydraulic system capable of 1.05G maximum deceleration'
    ]
  },
  COILOVER_SUSPENSION: {
    title: 'M Adaptive Damper & Double-Joint Spring Strut',
    architecture: 'Inverted Monotube Front Dampers with Progressive Rate Coil Springs',
    features: [
      'Electronically continuously controlled valves adjusting rebound and compression within milliseconds',
      'Ball-jointed front aluminum control arms and multi-link rear axle for zero lateral compliance under cornering load'
    ]
  }
};

export class EducationHUDSystem {
  constructor() {
    this.torqueDatabase = FACTORY_TORQUE_SPECS;
    this.cutaways = TECHNICAL_CUTAWAYS;
    this.selectedCutawayId = 'S58_ENGINE';
  }

  getTorqueSpec(specKey) {
    return this.torqueDatabase[specKey] || null;
  }

  getCutawayInfo(cutawayId) {
    return this.cutaways[cutawayId] || null;
  }

  /**
   * Diagnostic failure analysis generator
   */
  explainFailure(failureKey) {
    switch (failureKey) {
      case 'UNDER_TORQUED_LUGS':
        return {
          title: 'Wheel Lug Bolt Torque Deficit',
          rootCause: 'Clamping force F = T / (K * d) is insufficient to hold wheel hub flush against brake rotor hat.',
          consequence: 'Rotational runout creates steering wheel vibration at highway speeds; prolonged driving causes cyclic fatigue shear and wheel detachment.',
          remedy: 'Use a calibrated torque wrench in a cross-star pattern to torque all 5 lugs to exactly 140 N·m.'
        };
      case 'AERATED_BRAKE_LINE':
        return {
          title: 'Hydraulic Brake Line Aeration',
          rootCause: 'Brake fluid boils or air ingress introduces compressible gas pockets into the hydraulic line.',
          consequence: 'Gas compresses under master cylinder pressure instead of translating force to caliper pistons, causing squishy pedal and extended stopping distance.',
          remedy: 'Perform two-person or pressure bleed starting from the furthest caliper (RR -> RL -> FR -> FL) until fluid is bubble-free.'
        };
      case 'OIL_STARVATION':
        return {
          title: 'Low Engine Oil Level / Dry Sump',
          rootCause: 'Engine operated without adequate lubricating oil volume or missing drain plug.',
          consequence: 'Hydrodynamic oil film collapses between crankshaft journals and bi-metal rod bearings, leading to metal-on-metal contact and spun bearing seizure.',
          remedy: 'Ensure drain plug is torqued to 25 N·m and fill exactly 7.0 liters of BMW LL-01 FE 0W-30 synthetic oil.'
        };
      default:
        return { title: 'General Inspection', rootCause: 'Normal operational wear.', consequence: 'Requires scheduled maintenance.', remedy: 'Follow factory service schedule.' };
    }
  }
}
