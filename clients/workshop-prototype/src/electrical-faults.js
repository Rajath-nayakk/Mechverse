/**
 * MECHVERSE - Electrical Fault Injection & Management System
 * Simulates realistic component failures across grounds, fuses, wiring, connectors, and batteries.
 */

export const FAULT_TYPES = {
  HIGH_RES_GROUND: 'FAULT_HIGH_RES_GROUND',
  BLOWN_AUX_FUSE: 'FAULT_BLOWN_AUX_FUSE',
  PARASITIC_DRAIN: 'FAULT_PARASITIC_DRAIN',
  CORRODED_CONNECTOR: 'FAULT_CORRODED_CONNECTOR',
  DAMAGED_WIRE: 'FAULT_DAMAGED_WIRE',
  WEAK_BATTERY: 'FAULT_WEAK_BATTERY'
};

export const FAULT_DEFINITIONS = {
  [FAULT_TYPES.HIGH_RES_GROUND]: {
    id: FAULT_TYPES.HIGH_RES_GROUND,
    name: 'High-Resistance Engine Ground Strap',
    description: 'Corrosion and loose fastening at the engine-to-chassis braided ground strap create 0.45 Ohms of parasitic resistance. Causes large ground-side voltage drop during high-current starter cranking.',
    category: 'Ground',
    symptom: 'Slow engine crank, dimming lights while cranking, starter solenoid clicks sluggishly.',
    targetComponent: 'strap_engine_chassis',
    testProcedure: 'Set DMM to DC Volts. Connect RED probe to ENGINE_BLOCK and BLACK probe to chassis GND. Engage starter. A healthy drop is <0.2V; faulty drop is >4.0V.'
  },
  [FAULT_TYPES.BLOWN_AUX_FUSE]: {
    id: FAULT_TYPES.BLOWN_AUX_FUSE,
    name: 'Blown Auxiliary Lighting Fuse',
    description: 'A transient overcurrent blew the 15A auxiliary fuse, creating an open circuit between the main bus and the auxiliary switch.',
    category: 'Fuse',
    symptom: 'Auxiliary fog lights do not illuminate when switched on.',
    targetComponent: 'fuse_aux',
    testProcedure: 'With ignition OFF, isolate fuse or measure voltage across FUSED_MAIN_BUS and AUX_FUSE_OUT. Perform continuity check across fuse terminals. Reads OL.'
  },
  [FAULT_TYPES.PARASITIC_DRAIN]: {
    id: FAULT_TYPES.PARASITIC_DRAIN,
    name: 'Parasitic Battery Drain (Stuck Cabin Light)',
    description: 'A faulty door jamb switch keeps the cabin dome light circuit energized (drawing ~0.65A - 1.2A continuous), discharging the battery while parked overnight.',
    category: 'Parasitic Drain',
    symptom: 'Battery dead overnight or after 24 hours of parking. Slow crank in mornings.',
    targetComponent: 'sw_dome',
    testProcedure: 'With vehicle OFF, disconnect battery negative. Insert DMM in series on 10A current jack between BAT_NEG and GND. Measure parasitic draw (>50mA is abnormal, reads ~0.75A).'
  },
  [FAULT_TYPES.CORRODED_CONNECTOR]: {
    id: FAULT_TYPES.CORRODED_CONNECTOR,
    name: 'Corroded Headlight Harness Connector',
    description: 'Oxidation and road salt intrusion inside the headlight harness connector add 3.8 Ohms of contact resistance, causing dim light output.',
    category: 'Connector',
    symptom: 'Right front headlight is significantly dimmer than normal and flickers.',
    targetComponent: 'conn_headlight',
    testProcedure: 'With headlights ON, measure voltage drop across HL_SW_OUT and HEADLIGHT_POS. Should be <0.1V; reads >3.5V.'
  },
  [FAULT_TYPES.DAMAGED_WIRE]: {
    id: FAULT_TYPES.DAMAGED_WIRE,
    name: 'Damaged & Open Headlight Feed Wire',
    description: 'Chafing against the inner fender apron has severed conductors in the feed wire, creating an open circuit to the headlight switch.',
    category: 'Wiring',
    symptom: 'Headlights fail to turn on; no power at headlight switch input.',
    targetComponent: 'wire_hl_switch',
    testProcedure: 'Test continuity between FUSED_MAIN_BUS and HL_SW_IN with ignition OFF. Reads OL instead of <0.1 Ohm.'
  },
  [FAULT_TYPES.WEAK_BATTERY]: {
    id: FAULT_TYPES.WEAK_BATTERY,
    name: 'Sulfated & Weak Lead-Acid Battery',
    description: 'Plate sulfation has degraded capacity from 65 Ah to 22 Ah and increased internal resistance from 15 mOhm to 140 mOhm. Resting voltage appears deceptively normal (~12.2V) but collapses severely under cranking load (<8.5V).',
    category: 'Battery',
    symptom: 'Vehicle barely cranks or clicks rapidly; resting voltage drops severely under load.',
    targetComponent: 'battery',
    testProcedure: 'Measure open-circuit voltage at battery posts. Then crank starter: voltage drops below acceptable 9.6V threshold.'
  }
};

export class ElectricalFaultManager {
  constructor(electricalSystem) {
    this.electricalSystem = electricalSystem;
    this.activeFaults = new Set();
  }

  isFaultActive(faultId) {
    return this.activeFaults.has(faultId);
  }

  getActiveFaults() {
    return Array.from(this.activeFaults).map(id => FAULT_DEFINITIONS[id]);
  }

  injectFault(faultId) {
    const def = FAULT_DEFINITIONS[faultId];
    if (!def) {
      throw new Error(`Unknown electrical fault ID: ${faultId}`);
    }

    switch (faultId) {
      case FAULT_TYPES.HIGH_RES_GROUND:
        // Set ground strap resistance to high parasitic value
        this.electricalSystem.engineGroundStrap.setFaultResistance(0.45); // 0.45 Ohms (massive for high-current starter)
        break;

      case FAULT_TYPES.BLOWN_AUX_FUSE:
        this.electricalSystem.auxFuse.blow();
        break;

      case FAULT_TYPES.PARASITIC_DRAIN:
        // Force cabin dome light switch on
        this.electricalSystem.cabinDomeSwitch = true;
        break;

      case FAULT_TYPES.CORRODED_CONNECTOR:
        // Increase contact resistance to 3.8 Ohms
        this.electricalSystem.headlightConnector.setCorrosion(3.8);
        break;

      case FAULT_TYPES.DAMAGED_WIRE:
        // Sever headlight feed wire
        this.electricalSystem.headlightFeedWire.isBroken = true;
        break;

      case FAULT_TYPES.WEAK_BATTERY:
        // Degrade battery capacity and increase internal resistance
        this.electricalSystem.battery.capacityAh = 22.0;
        this.electricalSystem.battery.internalResistance = 0.140; // 140 mOhm
        this.electricalSystem.battery.soc = 0.55;
        this.electricalSystem.battery.healthPercentage = 40.0;
        break;
    }

    this.activeFaults.add(faultId);
    this.electricalSystem.solveNetwork();
    return {
      success: true,
      faultId,
      name: def.name,
      message: `Fault injected: ${def.name}`
    };
  }

  repairFault(faultId) {
    if (!this.activeFaults.has(faultId)) {
      return { success: false, message: `Fault ${faultId} is not currently active.` };
    }

    switch (faultId) {
      case FAULT_TYPES.HIGH_RES_GROUND:
        this.electricalSystem.engineGroundStrap.repair();
        break;

      case FAULT_TYPES.BLOWN_AUX_FUSE:
        this.electricalSystem.auxFuse.replace();
        break;

      case FAULT_TYPES.PARASITIC_DRAIN:
        // Repair door jamb switch and turn off dome light
        this.electricalSystem.cabinDomeSwitch = false;
        break;

      case FAULT_TYPES.CORRODED_CONNECTOR:
        this.electricalSystem.headlightConnector.repair();
        break;

      case FAULT_TYPES.DAMAGED_WIRE:
        this.electricalSystem.headlightFeedWire.isBroken = false;
        this.electricalSystem.headlightFeedWire.isPartiallyDamaged = false;
        break;

      case FAULT_TYPES.WEAK_BATTERY:
        // Replace with new battery
        this.electricalSystem.battery.capacityAh = 65.0;
        this.electricalSystem.battery.internalResistance = 0.015;
        this.electricalSystem.battery.soc = 0.90;
        this.electricalSystem.battery.healthPercentage = 100.0;
        this.electricalSystem.battery.terminalCorrosionResistance = 0.0;
        break;
    }

    this.activeFaults.delete(faultId);
    this.electricalSystem.solveNetwork();
    const def = FAULT_DEFINITIONS[faultId];
    return {
      success: true,
      faultId,
      name: def ? def.name : faultId,
      message: `Repair completed successfully: ${def ? def.name : faultId}`
    };
  }

  clearAllFaults() {
    const list = Array.from(this.activeFaults);
    for (const f of list) {
      this.repairFault(f);
    }
    this.activeFaults.clear();
    return { success: true, message: 'All electrical faults cleared and circuits restored to factory specification.' };
  }
}
