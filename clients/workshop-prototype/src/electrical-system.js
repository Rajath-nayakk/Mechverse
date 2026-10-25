/**
 * MECHVERSE - Vehicle Electrical System Network
 * Integrates Battery, Wiring, Fuses, Ground Paths, Relays, and Loads with the Circuit Solver.
 */

import { CircuitSolver } from './circuit-solver.js';
import { BatteryModel } from './battery-model.js';
import { ElectricalWire, ElectricalFuse, ElectricalGroundStrap, ElectricalConnector } from './electrical-components.js';

export class VehicleElectricalSystem {
  constructor() {
    this.battery = new BatteryModel({ nominalVoltage: 12.0, capacityAh: 65.0, soc: 0.88 });
    this.solver = new CircuitSolver();

    // Ignition State: 'OFF', 'ACC', 'ON', 'START'
    this.ignitionState = 'OFF';

    // Switches
    this.headlightSwitch = false;
    this.auxLightSwitch = false;
    this.cabinDomeSwitch = false; // Normal: false (turns off when doors closed)

    // Components & Wiring
    this.groundCable = new ElectricalWire('wire_bat_neg_chassis', 'BAT_NEG', 'GND', 0.5, 25.0);
    this.engineGroundStrap = new ElectricalGroundStrap('strap_engine_chassis', 'GND', 'ENGINE_BLOCK');
    this.batteryMainCable = new ElectricalWire('wire_bat_pos_bus', 'BAT_POS', 'MAIN_BUS', 0.8, 25.0);

    // Fuses
    this.mainFuse = new ElectricalFuse('fuse_main', 'MAIN_BUS', 'FUSED_MAIN_BUS', 60.0, 0.002);
    this.auxFuse = new ElectricalFuse('fuse_aux', 'FUSED_MAIN_BUS', 'AUX_FUSE_OUT', 15.0, 0.005);
    this.headlightFuse = new ElectricalFuse('fuse_headlights', 'FUSED_MAIN_BUS', 'HL_FUSE_OUT', 20.0, 0.004);
    this.domeFuse = new ElectricalFuse('fuse_dome', 'FUSED_MAIN_BUS', 'DOME_FUSE_OUT', 10.0, 0.008);
    this.fuelPumpFuse = new ElectricalFuse('fuse_fuel_pump', 'FUSED_MAIN_BUS', 'FP_FUSE_OUT', 15.0, 0.005);

    // Connectors
    this.headlightConnector = new ElectricalConnector('conn_headlight', 'HL_SW_OUT', 'HEADLIGHT_POS');

    // Electrical Loads (Resistances in Ohms)
    this.loads = {
      starterMotor: 0.075,      // ~140A cranking load (connected to ENGINE_BLOCK ground!)
      headlights: 2.65,         // ~55W x 2 lamps (~4.5A)
      auxiliaryFogLights: 1.44, // 100W fog light array (~8.3A)
      cabinDomeLight: 14.4,     // 10W interior lamp (~0.83A)
      fuelPumpMotor: 2.8        // ~50W fuel pump (~4.3A)
    };

    // Last solved simulation snapshot
    this.lastSolution = null;

    // Build and solve initial network
    this.solveNetwork();
  }

  setIgnition(state) {
    this.ignitionState = state;
    return this.solveNetwork();
  }

  setHeadlightSwitch(on) {
    this.headlightSwitch = on;
    return this.solveNetwork();
  }

  setAuxLightSwitch(on) {
    this.auxLightSwitch = on;
    return this.solveNetwork();
  }

  setCabinDomeSwitch(on) {
    this.cabinDomeSwitch = on;
    return this.solveNetwork();
  }

  /**
   * Rebuilds and solves the MNA electrical graph.
   */
  solveNetwork() {
    this.solver.reset();

    // Reference Ground = Chassis Ground (0.0 V)
    this.solver.groundNode = 'GND';

    // 1. Battery Model as Thevenin Source (Voc in series with Internal Resistance)
    const voc = this.battery.getOpenCircuitVoltage();
    const rInt = this.battery.getEffectiveInternalResistance();

    this.solver.addVoltageSource('battery_source', 'BAT_INT', 'BAT_NEG', voc);
    this.solver.addResistor('battery_internal_r', 'BAT_INT', 'BAT_POS', rInt);

    // Battery Negative to Chassis Ground
    this.solver.addResistor('cable_bat_neg', 'BAT_NEG', 'GND', this.groundCable.getResistance());

    // Engine Block to Chassis Ground Strap (Critical Diagnostic Point)
    this.solver.addResistor('engine_ground_strap', 'ENGINE_BLOCK', 'GND', this.engineGroundStrap.getResistance());

    // Battery Positive to Main Bus
    this.solver.addResistor('cable_bat_pos', 'BAT_POS', 'MAIN_BUS', this.batteryMainCable.getResistance());

    // 2. Fuses
    this.solver.addFuse(this.mainFuse.id, this.mainFuse.fromNode, this.mainFuse.toNode, this.mainFuse.ratingAmps, this.mainFuse.getResistance(), this.mainFuse.isBlown);
    this.solver.addFuse(this.auxFuse.id, this.auxFuse.fromNode, this.auxFuse.toNode, this.auxFuse.ratingAmps, this.auxFuse.getResistance(), this.auxFuse.isBlown);
    this.solver.addFuse(this.headlightFuse.id, this.headlightFuse.fromNode, this.headlightFuse.toNode, this.headlightFuse.ratingAmps, this.headlightFuse.getResistance(), this.headlightFuse.isBlown);
    this.solver.addFuse(this.domeFuse.id, this.domeFuse.fromNode, this.domeFuse.toNode, this.domeFuse.ratingAmps, this.domeFuse.getResistance(), this.domeFuse.isBlown);
    this.solver.addFuse(this.fuelPumpFuse.id, this.fuelPumpFuse.fromNode, this.fuelPumpFuse.toNode, this.fuelPumpFuse.ratingAmps, this.fuelPumpFuse.getResistance(), this.fuelPumpFuse.isBlown);

    // 3. Ignition Switch Distribution
    const isAccOn = (this.ignitionState === 'ACC' || this.ignitionState === 'ON' || this.ignitionState === 'START');
    const isIgnOn = (this.ignitionState === 'ON' || this.ignitionState === 'START');
    const isStart = (this.ignitionState === 'START');

    this.solver.addSwitch('sw_ign_acc', 'FUSED_MAIN_BUS', 'IGN_ACC', !isAccOn);
    this.solver.addSwitch('sw_ign_on', 'FUSED_MAIN_BUS', 'IGN_ON', !isIgnOn);
    this.solver.addSwitch('sw_starter_solenoid', 'FUSED_MAIN_BUS', 'STARTER_INPUT', !isStart);

    // 4. Starter Motor Circuit
    // Note: Starter armature is grounded to ENGINE_BLOCK!
    this.solver.addResistor('load_starter_motor', 'STARTER_INPUT', 'ENGINE_BLOCK', this.loads.starterMotor);

    // 5. Headlight Circuit
    this.solver.addSwitch('sw_headlights', 'HL_FUSE_OUT', 'HL_SW_OUT', !this.headlightSwitch);
    this.solver.addResistor('conn_headlight', this.headlightConnector.fromNode, this.headlightConnector.toNode, this.headlightConnector.getResistance());
    this.solver.addResistor('load_headlights', 'HEADLIGHT_POS', 'GND', this.loads.headlights);

    // 6. Auxiliary Fog Lights Circuit
    this.solver.addSwitch('sw_aux_lights', 'AUX_FUSE_OUT', 'AUX_SW_OUT', !this.auxLightSwitch);
    this.solver.addResistor('load_aux_lights', 'AUX_SW_OUT', 'GND', this.loads.auxiliaryFogLights);

    // 7. Cabin Dome Light (Can cause parasitic drain if switch is ON while parked)
    this.solver.addSwitch('sw_cabin_dome', 'DOME_FUSE_OUT', 'DOME_SW_OUT', !this.cabinDomeSwitch);
    this.solver.addResistor('load_cabin_dome', 'DOME_SW_OUT', 'GND', this.loads.cabinDomeLight);

    // 8. Fuel Pump Circuit (Runs when Ignition is ON)
    this.solver.addSwitch('sw_fuel_pump_relay', 'FP_FUSE_OUT', 'FP_RELAY_OUT', !isIgnOn);
    this.solver.addResistor('load_fuel_pump', 'FP_RELAY_OUT', 'GND', this.loads.fuelPumpMotor);

    // Execute Solver
    this.lastSolution = this.solver.solve();

    // Check if fuse currents blew any fuses
    if (this.lastSolution.success) {
      const currents = this.lastSolution.branchCurrents;
      if (currents['fuse_aux'] && this.auxFuse.checkOverload(currents['fuse_aux'])) {
        this.solveNetwork(); // Re-solve with blown fuse
      }
    }

    return this.lastSolution;
  }

  /**
   * Helper to retrieve node voltage.
   */
  getNodeVoltage(nodeName) {
    if (!this.lastSolution || !this.lastSolution.success) {
      this.solveNetwork();
    }
    const val = this.lastSolution.nodeVoltages[nodeName];
    return val !== undefined ? val : 0.0;
  }

  /**
   * Helper to measure potential difference: V_red - V_black
   */
  getPotentialDifference(nodeRed, nodeBlack) {
    return this.getNodeVoltage(nodeRed) - this.getNodeVoltage(nodeBlack);
  }

  /**
   * Checks whether the circuit is currently energized (battery connected & non-zero potential).
  /**
   * Evaluates if a given test branch or circuit node has active live electrical potential.
   */
  isNodeEnergized(node) {
    if (!this.battery.isConnected) return false;
    if (node === 'BAT_POS' || node === 'BAT_INT' || node === 'MAIN_BUS') return true;
    const v = this.getNodeVoltage(node);
    return Math.abs(v) > 0.25;
  }

  isEnergized(nodeA = null, nodeB = null) {
    if (!this.battery.isConnected) return false;
    if (nodeA && nodeB) {
      return this.isNodeEnergized(nodeA) || this.isNodeEnergized(nodeB);
    }
    return this.battery.isConnected && this.battery.getOpenCircuitVoltage() > 1.0;
  }

  /**
   * Measures passive resistance between two test points on a DE-ENERGIZED circuit.
   */
  measureIsolatedResistance(nodeA, nodeB) {
    // Ohm's safety rule: Circuit nodes must have no active live potential
    if (this.isEnergized(nodeA, nodeB)) {
      return {
        success: false,
        isEnergized: true,
        message: 'SAFETY HAZARD: Circuit is energized! Disconnect power or switch off before measuring resistance.'
      };
    }

    // Direct path calculation
    if (nodeA === nodeB) {
      return { success: true, resistance: 0.0, isEnergized: false };
    }

    // Ground strap isolation test
    if ((nodeA === 'ENGINE_BLOCK' && nodeB === 'GND') || (nodeA === 'GND' && nodeB === 'ENGINE_BLOCK')) {
      return { success: true, resistance: this.engineGroundStrap.getResistance(), isEnergized: false };
    }

    // Auxiliary Fuse isolation test
    if ((nodeA === 'FUSED_MAIN_BUS' && nodeB === 'AUX_FUSE_OUT') || (nodeA === 'AUX_FUSE_OUT' && nodeB === 'FUSED_MAIN_BUS')) {
      return { success: true, resistance: this.auxFuse.getResistance(), isEnergized: false };
    }

    // Headlight connector test
    if ((nodeA === 'HL_SW_OUT' && nodeB === 'HEADLIGHT_POS') || (nodeA === 'HEADLIGHT_POS' && nodeB === 'HL_SW_OUT')) {
      return { success: true, resistance: this.headlightConnector.getResistance(), isEnergized: false };
    }

    // Battery ground cable test
    if ((nodeA === 'BAT_NEG' && nodeB === 'GND') || (nodeA === 'GND' && nodeB === 'BAT_NEG')) {
      return { success: true, resistance: this.groundCable.getResistance(), isEnergized: false };
    }

    return { success: true, resistance: 1e9, isEnergized: false }; // Open / unconnected
  }
}
