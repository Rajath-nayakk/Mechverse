/**
 * MECHVERSE - Automotive Electrical Diagnostic Missions Framework
 * Implements 4 complete educational diagnostic scenarios:
 *   1. Slow-Cranking Vehicle (High-resistance engine ground strap)
 *   2. Dead Auxiliary Lights (Blown auxiliary fuse)
 *   3. Battery Drains Overnight (Parasitic draw / stuck door switch)
 *   4. Intermittent Electrical Accessory (Corroded connector)
 */

import { FAULT_TYPES } from './electrical-faults.js';
import { MULTIMETER_MODES } from './multimeter-system.js';

export const MISSIONS = [
  {
    id: 'mission_slow_crank',
    title: 'The Slow-Cranking Vehicle',
    customerComplaint: 'Customer states: "The engine cranks sluggishly in the morning and sounds like it barely has enough power to turn over."',
    category: 'Starting & Charging',
    difficulty: 'Intermediate',
    faultId: FAULT_TYPES.HIGH_RES_GROUND,
    objectives: [
      { id: 'measure_battery_resting', desc: 'Measure resting battery voltage (> 12.4V nominal)', completed: false },
      { id: 'measure_cranking_voltage', desc: 'Measure battery terminal voltage during starter cranking', completed: false },
      { id: 'measure_ground_voltage_drop', desc: 'Perform ground-side voltage drop test (ENGINE_BLOCK to chassis GND during cranking)', completed: false },
      { id: 'identify_fault', desc: 'Diagnose high-resistance engine ground strap', completed: false },
      { id: 'repair_component', desc: 'Clean, torque, or replace the engine ground strap', completed: false },
      { id: 'verify_repair', desc: 'Verify ground-side voltage drop during cranking is now < 0.20V', completed: false }
    ],
    hint: 'A weak battery drops voltage at its own terminals. A bad ground strap creates a high voltage drop between the engine block casting and the chassis ground stud when heavy starter current flows!'
  },
  {
    id: 'mission_dead_aux_lights',
    title: 'Dead Auxiliary Fog Lights',
    customerComplaint: 'Customer states: "I flipped the auxiliary fog light switch on the dashboard, but neither light turns on."',
    category: 'Lighting & Fuses',
    difficulty: 'Beginner',
    faultId: FAULT_TYPES.BLOWN_AUX_FUSE,
    objectives: [
      { id: 'verify_symptom', desc: 'Switch on auxiliary lights and confirm 0V at AUX_FUSE_OUT', completed: false },
      { id: 'measure_fuse_input', desc: 'Check power delivery at FUSED_MAIN_BUS (> 12.0V)', completed: false },
      { id: 'test_fuse_continuity', desc: 'Turn ignition OFF, isolate fuse, and test continuity across fuse terminals (OL = blown)', completed: false },
      { id: 'identify_fault', desc: 'Diagnose open/blown 15A auxiliary fuse', completed: false },
      { id: 'repair_component', desc: 'Replace blown 15A blade fuse with new rated fuse', completed: false },
      { id: 'verify_repair', desc: 'Turn aux switch ON and verify > 12.0V at AUX_FUSE_OUT and aux lights illuminated', completed: false }
    ],
    hint: 'Check if power reaches the fuse block. If 12V is present at the input but 0V at the output, isolate the circuit and perform a continuity test.'
  },
  {
    id: 'mission_overnight_drain',
    title: 'Battery Drains Overnight',
    customerComplaint: 'Customer states: "Every time the car sits parked for more than a day, the battery goes completely flat and requires a jump start."',
    category: 'Parasitic Draw',
    difficulty: 'Advanced',
    faultId: FAULT_TYPES.PARASITIC_DRAIN,
    objectives: [
      { id: 'measure_resting_soc', desc: 'Inspect battery condition and measure open-circuit terminal voltage', completed: false },
      { id: 'measure_parasitic_current', desc: 'Disconnect battery negative, connect DMM in series on 10A current jack between BAT_NEG and GND, read draw', completed: false },
      { id: 'isolate_drain_branch', desc: 'Isolate cabin dome circuit to confirm parasitic current drops to normal (< 50mA)', completed: false },
      { id: 'identify_fault', desc: 'Diagnose stuck cabin dome light switch / door jamb switch', completed: false },
      { id: 'repair_component', desc: 'Repair faulty door jamb switch and turn off continuous dome load', completed: false },
      { id: 'verify_repair', desc: 'Run simulated 12-hour parking acceleration and verify battery retains > 80% SOC and draw is normal', completed: false }
    ],
    hint: 'Normal parasitic draw on modern vehicles is under 50 mA (0.050 A). Anything above 500 mA will drain a 65 Ah battery overnight!'
  },
  {
    id: 'mission_intermittent_accessory',
    title: 'Dim & Intermittent Headlight',
    customerComplaint: 'Customer states: "The passenger-side headlight is noticeably dim and sometimes flickers over bumps."',
    category: 'Connectors & Harness',
    difficulty: 'Intermediate',
    faultId: FAULT_TYPES.CORRODED_CONNECTOR,
    objectives: [
      { id: 'verify_symptom', desc: 'Turn headlights ON and measure voltage arriving at HEADLIGHT_POS (< 9.0V indicates excessive drop)', completed: false },
      { id: 'measure_connector_drop', desc: 'Measure voltage drop across connector (HL_SW_OUT to HEADLIGHT_POS)', completed: false },
      { id: 'test_connector_resistance', desc: 'With lights OFF, test connector contact resistance (> 0.5 Ohm indicates severe corrosion)', completed: false },
      { id: 'identify_fault', desc: 'Diagnose oxidized/corroded headlight harness pin connector', completed: false },
      { id: 'repair_component', desc: 'Clean terminals with contact cleaner and burnishing tool, apply dielectric grease', completed: false },
      { id: 'verify_repair', desc: 'Turn headlights ON and verify connector drop < 0.10V and full > 12.0V delivered to bulb', completed: false }
    ],
    hint: 'A corroded connector acts like an unintended series resistor. The more current drawn by the bulb, the greater the voltage drop across the corrosion!'
  }
];

export class ElectricalMissionManager {
  constructor(electricalSystem, faultManager, multimeter) {
    this.electricalSystem = electricalSystem;
    this.faultManager = faultManager;
    this.multimeter = multimeter;
    this.activeMission = null;
    this.diagnosticEvidence = [];
    this.isCompleted = false;
    this.completionReport = null;
  }

  startMission(missionId) {
    const template = MISSIONS.find(m => m.id === missionId);
    if (!template) {
      throw new Error(`Mission ${missionId} not found.`);
    }

    // Reset faults and inject the specific mission fault
    this.faultManager.clearAllFaults();
    this.faultManager.injectFault(template.faultId);

    // Deep copy objectives
    this.activeMission = {
      ...template,
      objectives: template.objectives.map(o => ({ ...o })),
      startedAt: Date.now()
    };

    this.diagnosticEvidence = [];
    this.isCompleted = false;
    this.completionReport = null;

    // Reset electrical system to mission initial state
    this.electricalSystem.ignitionState = 'OFF';
    this.electricalSystem.headlightSwitch = false;
    this.electricalSystem.auxLightSwitch = false;

    return {
      success: true,
      mission: this.activeMission,
      message: `Mission "${this.activeMission.title}" started. ${this.activeMission.customerComplaint}`
    };
  }

  recordMeasurementEvidence() {
    if (!this.activeMission) return null;

    const reading = this.multimeter.measure();
    const probeRed = this.multimeter.redProbePoint;
    const probeBlack = this.multimeter.blackProbePoint;
    const mode = this.multimeter.mode;
    const ign = this.electricalSystem.ignitionState;

    const evidence = {
      mode,
      probeRed,
      probeBlack,
      ignitionState: ign,
      reading: reading.display + ' ' + reading.unit,
      numericValue: reading.rawNumericValue,
      timestamp: Date.now()
    };

    this.diagnosticEvidence.push(evidence);
    this._evaluateMissionObjectives(evidence);

    return evidence;
  }

  _evaluateMissionObjectives(ev) {
    if (!this.activeMission) return;

    const m = this.activeMission;

    // Mission 1: Slow Crank
    if (m.id === 'mission_slow_crank') {
      // 1. Resting battery
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ((ev.probeRed === 'BAT_POS' && ev.probeBlack === 'BAT_NEG') || (ev.probeRed === 'BAT_POS' && ev.probeBlack === 'GND')) &&
          ev.ignitionState === 'OFF') {
        this._markObjective('measure_battery_resting');
      }

      // 2. Cranking battery voltage
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          (ev.probeRed === 'BAT_POS' && (ev.probeBlack === 'BAT_NEG' || ev.probeBlack === 'GND')) &&
          ev.ignitionState === 'START') {
        this._markObjective('measure_cranking_voltage');
      }

      // 3. Ground-side voltage drop
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ((ev.probeRed === 'ENGINE_BLOCK' && ev.probeBlack === 'GND') || (ev.probeRed === 'GND' && ev.probeBlack === 'ENGINE_BLOCK')) &&
          ev.ignitionState === 'START') {
        this._markObjective('measure_ground_voltage_drop');
      }
    }

    // Mission 2: Dead Aux Lights
    if (m.id === 'mission_dead_aux_lights') {
      // 1. Verify symptom
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ev.probeRed === 'AUX_FUSE_OUT' && ev.probeBlack === 'GND') {
        this._markObjective('verify_symptom');
      }

      // 2. Measure fuse input
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ev.probeRed === 'FUSED_MAIN_BUS' && ev.probeBlack === 'GND') {
        this._markObjective('measure_fuse_input');
      }

      // 3. Test fuse continuity
      if (ev.mode === MULTIMETER_MODES.CONTINUITY &&
          ((ev.probeRed === 'FUSED_MAIN_BUS' && ev.probeBlack === 'AUX_FUSE_OUT') || (ev.probeRed === 'AUX_FUSE_OUT' && ev.probeBlack === 'FUSED_MAIN_BUS')) &&
          ev.ignitionState === 'OFF') {
        this._markObjective('test_fuse_continuity');
      }
    }

    // Mission 3: Overnight Drain
    if (m.id === 'mission_overnight_drain') {
      // 1. Resting battery
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ev.probeRed === 'BAT_POS' && (ev.probeBlack === 'BAT_NEG' || ev.probeBlack === 'GND')) {
        this._markObjective('measure_resting_soc');
      }

      // 2. Series ammeter draw
      if (ev.mode === MULTIMETER_MODES.DC_AMPS &&
          ((ev.probeRed === 'BAT_NEG' && ev.probeBlack === 'GND') || (ev.probeRed === 'GND' && ev.probeBlack === 'BAT_NEG')) &&
          ev.ignitionState === 'OFF') {
        this._markObjective('measure_parasitic_current');
      }
    }

    // Mission 4: Intermittent Accessory
    if (m.id === 'mission_intermittent_accessory') {
      // 1. Verify symptom
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ev.probeRed === 'HEADLIGHT_POS' && ev.probeBlack === 'GND' &&
          this.electricalSystem.headlightSwitch) {
        this._markObjective('verify_symptom');
      }

      // 2. Connector drop
      if (ev.mode === MULTIMETER_MODES.DC_VOLTS &&
          ((ev.probeRed === 'HL_SW_OUT' && ev.probeBlack === 'HEADLIGHT_POS') || (ev.probeRed === 'HEADLIGHT_POS' && ev.probeBlack === 'HL_SW_OUT')) &&
          this.electricalSystem.headlightSwitch) {
        this._markObjective('measure_connector_drop');
      }

      // 3. Connector resistance
      if (ev.mode === MULTIMETER_MODES.RESISTANCE &&
          ((ev.probeRed === 'HL_SW_OUT' && ev.probeBlack === 'HEADLIGHT_POS') || (ev.probeRed === 'HEADLIGHT_POS' && ev.probeBlack === 'HL_SW_OUT')) &&
          !this.electricalSystem.headlightSwitch && ev.ignitionState === 'OFF') {
        this._markObjective('test_connector_resistance');
      }
    }
  }

  _markObjective(objId) {
    if (!this.activeMission) return;
    const obj = this.activeMission.objectives.find(o => o.id === objId);
    if (obj) {
      obj.completed = true;
    }
  }

  submitDiagnosis(diagnosedFaultId) {
    if (!this.activeMission) {
      return { success: false, message: 'No active mission.' };
    }

    if (diagnosedFaultId === this.activeMission.faultId) {
      this._markObjective('identify_fault');
      return {
        success: true,
        correct: true,
        message: 'Accurate Diagnosis Confirmed! Engineering evidence supports this root cause.'
      };
    } else {
      return {
        success: false,
        correct: false,
        message: 'Diagnosis Inconclusive or Incorrect. Re-check electrical measurements and circuit schematic.'
      };
    }
  }

  executeRepair() {
    if (!this.activeMission) {
      return { success: false, message: 'No active mission.' };
    }

    const res = this.faultManager.repairFault(this.activeMission.faultId);
    if (res.success) {
      this._markObjective('repair_component');
    }
    return res;
  }

  verifyRepair() {
    if (!this.activeMission) {
      return { success: false, message: 'No active mission.' };
    }

    const m = this.activeMission;
    let isVerified = false;
    let verificationNote = '';

    if (m.id === 'mission_slow_crank') {
      // Check ground-side drop under starter cranking load
      this.electricalSystem.ignitionState = 'START';
      this.electricalSystem.solveNetwork();
      const drop = this.electricalSystem.getPotentialDifference('ENGINE_BLOCK', 'GND');
      this.electricalSystem.ignitionState = 'OFF';
      this.electricalSystem.solveNetwork();

      if (drop < 0.35) {
        isVerified = true;
        verificationNote = `Ground-side drop during cranking is now only ${(drop * 1000).toFixed(1)} mV (Spec: < 350 mV). Engine cranks at normal operating speed.`;
      } else {
        verificationNote = `Ground drop is still excessive: ${drop.toFixed(2)} V. Repair unverified.`;
      }
    } else if (m.id === 'mission_dead_aux_lights') {
      this.electricalSystem.auxLightSwitch = true;
      this.electricalSystem.solveNetwork();
      const v = this.electricalSystem.getNodeVoltage('AUX_FUSE_OUT');
      if (v > 11.5) {
        isVerified = true;
        verificationNote = `Auxiliary lighting bus voltage is ${v.toFixed(2)} V. Fog lights illuminate normally.`;
      } else {
        verificationNote = `Auxiliary bus voltage is ${v.toFixed(2)} V. Lights remain inoperative.`;
      }
    } else if (m.id === 'mission_overnight_drain') {
      // Accelerated parking simulation: simulate 12 hours (43200 seconds)
      const currentBefore = this.electricalSystem.cabinDomeSwitch ? 0.75 : 0.02;
      this.electricalSystem.battery.updateSOC(currentBefore, 43200);

      if (!this.electricalSystem.cabinDomeSwitch && this.electricalSystem.battery.soc > 0.80) {
        isVerified = true;
        verificationNote = `Overnight parking simulation completed: Parasitic draw < 25 mA. Battery retained ${(this.electricalSystem.battery.soc * 100).toFixed(1)}% State of Charge.`;
      } else {
        verificationNote = `Battery drained to ${(this.electricalSystem.battery.soc * 100).toFixed(1)}% SOC. Parasitic draw still present!`;
      }
    } else if (m.id === 'mission_intermittent_accessory') {
      this.electricalSystem.headlightSwitch = true;
      this.electricalSystem.solveNetwork();
      const drop = this.electricalSystem.getPotentialDifference('HL_SW_OUT', 'HEADLIGHT_POS');
      const vBulb = this.electricalSystem.getNodeVoltage('HEADLIGHT_POS');

      if (drop < 0.15 && vBulb > 11.5) {
        isVerified = true;
        verificationNote = `Harness connector drop under load is now ${(drop * 1000).toFixed(1)} mV. Headlight receives ${vBulb.toFixed(2)} V at full brightness.`;
      } else {
        verificationNote = `Connector drop is still excessive: ${drop.toFixed(2)} V.`;
      }
    }

    if (isVerified) {
      this._markObjective('verify_repair');
      const allDone = this.activeMission.objectives.every(o => o.completed);
      this.isCompleted = true;
      this.completionReport = {
        missionId: m.id,
        title: m.title,
        status: 'PASSED',
        verified: true,
        score: allDone ? 100 : 85,
        notes: verificationNote,
        evidenceCount: this.diagnosticEvidence.length
      };
      return { success: true, verified: true, report: this.completionReport, message: verificationNote };
    }

    return { success: false, verified: false, message: verificationNote };
  }
}
