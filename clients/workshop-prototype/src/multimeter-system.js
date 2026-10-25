/**
 * MECHVERSE - Digital Multimeter (DMM) System
 * Simulates real automotive multimeter measurements with impedance, lead configuration,
 * fuse protection, continuity beeper, and energized-circuit resistance rejection.
 */

export const MULTIMETER_MODES = {
  OFF: 'OFF',
  DC_VOLTS: 'DC_VOLTS',
  RESISTANCE: 'RESISTANCE',
  CONTINUITY: 'CONTINUITY',
  DC_AMPS: 'DC_AMPS'
};

export const METER_LEAD_JACKS = {
  V_OHM: 'V_OHM',   // Volts, Ohms, Continuity
  A_10A: 'A_10A'    // 10A Fused Series Current
};

export const TEST_POINTS = [
  { id: 'BAT_POS', name: 'Battery Positive Terminal (+)', category: 'Battery' },
  { id: 'BAT_NEG', name: 'Battery Negative Terminal (-)', category: 'Battery' },
  { id: 'GND', name: 'Vehicle Chassis Ground Stud', category: 'Ground' },
  { id: 'ENGINE_BLOCK', name: 'Engine Block Ground Casting', category: 'Ground' },
  { id: 'MAIN_BUS', name: 'Under-hood Main Power Distribution Bus', category: 'Power' },
  { id: 'FUSED_MAIN_BUS', name: 'Main Fuse Distribution Block (Input)', category: 'Fuse' },
  { id: 'AUX_FUSE_OUT', name: 'Auxiliary Fog Lights Fuse (Output)', category: 'Fuse' },
  { id: 'HL_SW_OUT', name: 'Headlight Switch Harness Output', category: 'Lighting' },
  { id: 'HEADLIGHT_POS', name: 'Right Headlight Connector Pin (+)', category: 'Lighting' },
  { id: 'STARTER_INPUT', name: 'Starter Solenoid Armature Terminal', category: 'Starter' },
  { id: 'DOME_SW_OUT', name: 'Cabin Dome Light Fixture Input', category: 'Interior' }
];

export class DigitalMultimeter {
  constructor(electricalSystem) {
    this.electricalSystem = electricalSystem;

    // Meter State
    this.mode = MULTIMETER_MODES.OFF;
    this.redJack = METER_LEAD_JACKS.V_OHM; // Jack plug position: V_OHM or A_10A
    this.redProbePoint = null;
    this.blackProbePoint = null;

    // Internal Meter Parameters
    this.inputImpedanceVolts = 1e7; // 10 Megaohms (standard automotive DMM)
    this.burdenResistanceCurrent = 0.01; // 10 milliohm shunt on 10A jack
    this.meterFuseRatingAmps = 10.0;
    this.isMeterFuseBlown = false;
    this.continuityThresholdOhms = 30.0;

    // Measurement Cache
    this.lastReading = {
      display: 'OFF',
      unit: '',
      isOverRange: false,
      isHazard: false,
      isContinuityBeep: false,
      rawNumericValue: 0.0
    };
  }

  setMode(mode) {
    this.mode = mode;
    return this.takeMeasurement();
  }

  setLeadJack(jack) {
    this.redJack = jack;
    return this.takeMeasurement();
  }

  setRedJack(jack) {
    return this.setLeadJack(jack);
  }

  connectProbes(redNodeId, blackNodeId) {
    this.redProbePoint = redNodeId;
    this.blackProbePoint = blackNodeId;
    return this.takeMeasurement();
  }

  measure() {
    return this.takeMeasurement();
  }

  replaceMeterFuse() {
    this.isMeterFuseBlown = false;
    this.takeMeasurement();
    return { success: true, message: 'Multimeter 10A ceramic fuse replaced.' };
  }

  /**
   * Evaluates the measurement based on mode, probe placement, and circuit state.
   */
  takeMeasurement() {
    if (this.mode === MULTIMETER_MODES.OFF) {
      this.lastReading = { display: 'OFF', unit: '', isOverRange: false, isHazard: false, isContinuityBeep: false, rawNumericValue: 0.0 };
      return this.lastReading;
    }

    if (!this.redProbePoint || !this.blackProbePoint) {
      this.lastReading = { display: 'LEADS OPEN', unit: '', isOverRange: false, isHazard: false, isContinuityBeep: false, rawNumericValue: 0.0 };
      return this.lastReading;
    }

    // Solve network to capture latest switch states and loads
    this.electricalSystem.solveNetwork();

    // 1. DC Voltage Mode
    if (this.mode === MULTIMETER_MODES.DC_VOLTS) {
      // Must not use Current jack for voltage measurement (short hazard)
      if (this.redJack === METER_LEAD_JACKS.A_10A) {
        this.lastReading = {
          display: 'LEAD ERR',
          unit: '',
          isOverRange: false,
          isHazard: true,
          isContinuityBeep: false,
          message: 'DANGER: Red lead plugged into 10A current jack! Move to V/Ohm jack to measure voltage.'
        };
        return this.lastReading;
      }

      const vDiff = this.electricalSystem.getPotentialDifference(this.redProbePoint, this.blackProbePoint);
      const absV = Math.abs(vDiff);
      let displayStr = vDiff.toFixed(2);
      let unit = 'V';

      if (absV < 0.1 && absV > 0.0001) {
        displayStr = (vDiff * 1000.0).toFixed(1);
        unit = 'mV';
      }

      this.lastReading = {
        display: `${vDiff >= 0 ? '' : '-'}${Math.abs(parseFloat(displayStr)).toFixed(unit === 'mV' ? 1 : 2)}`,
        unit: ` ${unit} DC`,
        isOverRange: false,
        isHazard: false,
        isContinuityBeep: false,
        rawNumericValue: vDiff
      };
      return this.lastReading;
    }

    // 2. Resistance Mode (Ohms)
    if (this.mode === MULTIMETER_MODES.RESISTANCE) {
      if (this.redJack !== METER_LEAD_JACKS.V_OHM) {
        this.lastReading = { display: 'LEAD ERR', unit: '', isOverRange: false, isHazard: true, isContinuityBeep: false, rawNumericValue: 0.0 };
        return this.lastReading;
      }

      const resResult = this.electricalSystem.measureIsolatedResistance(this.redProbePoint, this.blackProbePoint);
      if (resResult.isEnergized) {
        this.lastReading = {
          display: 'ERR: POWER ON',
          unit: '',
          isOverRange: false,
          isHazard: true,
          isContinuityBeep: false,
          rawNumericValue: 0.0,
          message: resResult.message
        };
        return this.lastReading;
      }

      const r = resResult.resistance;
      if (r >= 1e8) {
        this.lastReading = { display: 'O.L', unit: ' M\u03A9', isOverRange: true, isHazard: false, isContinuityBeep: false, rawNumericValue: 1e9 };
      } else if (r >= 1000.0) {
        this.lastReading = { display: (r / 1000.0).toFixed(2), unit: ' k\u03A9', isOverRange: false, isHazard: false, isContinuityBeep: false, rawNumericValue: r };
      } else {
        this.lastReading = { display: r.toFixed(2), unit: ' \u03A9', isOverRange: false, isHazard: false, isContinuityBeep: false, rawNumericValue: r };
      }
      return this.lastReading;
    }

    // 3. Continuity Mode
    if (this.mode === MULTIMETER_MODES.CONTINUITY) {
      const resResult = this.electricalSystem.measureIsolatedResistance(this.redProbePoint, this.blackProbePoint);
      if (resResult.isEnergized) {
        this.lastReading = { display: 'ERR: POWER ON', unit: '', isOverRange: false, isHazard: true, isContinuityBeep: false, rawNumericValue: 0.0 };
        return this.lastReading;
      }

      const r = resResult.resistance;
      const isBeep = (r <= this.continuityThresholdOhms);

      this.lastReading = {
        display: isBeep ? `${r.toFixed(1)} \u03A9 (BEEP)` : 'O.L (OPEN)',
        unit: '',
        isOverRange: !isBeep,
        isHazard: false,
        isContinuityBeep: isBeep,
        rawNumericValue: r
      };
      return this.lastReading;
    }

    // 4. DC Current Mode (Ammeter in Series)
    if (this.mode === MULTIMETER_MODES.DC_AMPS) {
      if (this.redJack !== METER_LEAD_JACKS.A_10A) {
        this.lastReading = {
          display: 'ERR: JACK CONFIG',
          unit: '',
          isOverRange: false,
          isHazard: true,
          isContinuityBeep: false,
          rawNumericValue: 0.0,
          message: 'Plug red lead into 10A Current jack to measure amps in series.'
        };
        return this.lastReading;
      }

      if (this.isMeterFuseBlown) {
        this.lastReading = {
          display: 'FUSE BLOWN',
          unit: '',
          isOverRange: false,
          isHazard: true,
          isContinuityBeep: false,
          rawNumericValue: 0.0,
          message: 'Internal meter fuse blown from excessive current. Replace meter fuse.'
        };
        return this.lastReading;
      }

      // Current measurement: evaluated when meter is placed in series
      // To simulate series measurement safely:
      // If user connects across Battery Pos and Neg with Ammeter: High Current Blows Fuse!
      if ((this.redProbePoint === 'BAT_POS' && this.blackProbePoint === 'GND') ||
          (this.redProbePoint === 'BAT_POS' && this.blackProbePoint === 'BAT_NEG') ||
          (this.redProbePoint === 'MAIN_BUS' && this.blackProbePoint === 'GND')) {
        this.isMeterFuseBlown = true;
        this.lastReading = {
          display: 'FUSE BLOWN',
          unit: '',
          isOverRange: false,
          isHazard: true,
          isContinuityBeep: false,
          rawNumericValue: 0.0,
          message: 'OVERLOAD: Direct short across voltage rail! Multimeter 10A fuse blew.'
        };
        return this.lastReading;
      }

      // Standard in-series parasitic current measurement at battery negative disconnect:
      // Probing BAT_NEG and GND measures the full return current of vehicle
      if ((this.redProbePoint === 'BAT_NEG' && this.blackProbePoint === 'GND') ||
          (this.redProbePoint === 'GND' && this.blackProbePoint === 'BAT_NEG')) {
        // Compute total return current from solver
        const sol = this.electricalSystem.solveNetwork();
        let totalCurrent = 0.0;
        if (sol.success) {
          totalCurrent = Math.abs(sol.branchCurrents['cable_bat_neg'] || sol.branchCurrents['battery_source'] || 0.0);
        }

        // Check if exceeds 10A
        if (totalCurrent > this.meterFuseRatingAmps) {
          this.isMeterFuseBlown = true;
          this.lastReading = { display: 'FUSE BLOWN', unit: '', isOverRange: false, isHazard: true, isContinuityBeep: false, rawNumericValue: totalCurrent };
          return this.lastReading;
        }

        this.lastReading = {
          display: totalCurrent.toFixed(3),
          unit: ' A DC',
          isOverRange: false,
          isHazard: false,
          isContinuityBeep: false,
          rawNumericValue: totalCurrent
        };
        return this.lastReading;
      }

      // Branch current measurement
      const sol = this.electricalSystem.solveNetwork();
      let currentVal = 0.0;
      if (sol.success) {
        // Derive approximate current flowing between the two selected nodes
        const vDiff = this.electricalSystem.getPotentialDifference(this.redProbePoint, this.blackProbePoint);
        currentVal = Math.abs(vDiff / 10.0); // nominal branch test
      }

      this.lastReading = {
        display: currentVal.toFixed(3),
        unit: ' A DC',
        isOverRange: false,
        isHazard: false,
        isContinuityBeep: false,
        rawNumericValue: currentVal
      };
      return this.lastReading;
    }

    return this.lastReading;
  }
}
