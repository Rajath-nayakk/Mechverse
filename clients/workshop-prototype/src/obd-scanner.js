/**
 * MECHVERSE - OBD-II Diagnostic Scan Tool & Live Telemetry Scanner
 * 
 * Implements:
 * 1. ISO 15765-4 CAN bus protocol simulation (500 kbps, 11-bit ID)
 * 2. Standard SAE J2012 Diagnostic Trouble Code (DTC) management
 * 3. Freeze Frame Snapshot Telemetry captured at instant of DTC trigger
 * 4. Mode 01 Live Sensor PID streaming (RPM, ECT, MAF, Fuel Trims, Rail Pressure)
 * 5. Mode 04 Clear DTCs / Reset MIL (Check Engine Light) and I/M Readiness monitors
 */

export const DTC_DATABASE = {
  P0300: { code: 'P0300', description: 'Random/Multiple Cylinder Misfire Detected', system: 'Ignition / Fuel', severity: 'HIGH' },
  P0301: { code: 'P0301', description: 'Cylinder 1 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0302: { code: 'P0302', description: 'Cylinder 2 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0303: { code: 'P0303', description: 'Cylinder 3 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0304: { code: 'P0304', description: 'Cylinder 4 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0305: { code: 'P0305', description: 'Cylinder 5 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0306: { code: 'P0306', description: 'Cylinder 6 Misfire Detected', system: 'Ignition / Fuel', severity: 'MEDIUM' },
  P0171: { code: 'P0171', description: 'Fuel Trim System Too Lean (Bank 1)', system: 'Fuel / Air Intake', severity: 'MEDIUM' },
  P0174: { code: 'P0174', description: 'Fuel Trim System Too Lean (Bank 2)', system: 'Fuel / Air Intake', severity: 'MEDIUM' },
  P0340: { code: 'P0340', description: 'Camshaft Position Sensor Circuit Malfunction (Bank 1)', system: 'Timing / Sensor', severity: 'HIGH' },
  P0117: { code: 'P0117', description: 'Engine Coolant Temperature Sensor 1 Circuit Low', system: 'Cooling / Sensor', severity: 'LOW' },
  P0562: { code: 'P0562', description: 'System Voltage Low (Battery / Alternator Undercharge)', system: 'Electrical Charging', severity: 'HIGH' },
  P0299: { code: 'P0299', description: 'Turbocharger / Supercharger "A" Underboost Condition', system: 'Turbocharging', severity: 'MEDIUM' }
};

export class OBDScanner {
  constructor(vehicleState = null) {
    this.vehicleState = vehicleState;
    this.isConnected = false;
    this.protocol = 'ISO 15765-4 (CAN 11/500)';
    this.ecuId = '7E8'; // Standard ECM CAN ID
    this.milStatus = false; // Check Engine Light on/off

    // Active & Pending DTCs
    this.activeDTCs = new Map(); // code -> { dtc, freezeFrame, timestamp }
    this.pendingDTCs = new Set();

    // Inspection & Maintenance (I/M) Readiness Monitors
    this.readinessMonitors = {
      misfire: 'READY',
      fuelSystem: 'READY',
      comprehensiveComponent: 'READY',
      catalyst: 'READY',
      evaporativeSystem: 'READY',
      oxygenSensor: 'READY',
      oxygenSensorHeater: 'READY'
    };
  }

  connect() {
    this.isConnected = true;
    return {
      connected: true,
      protocol: this.protocol,
      ecuDetected: `Engine Control Module (0x${this.ecuId})`,
      vin: 'WBS43AY00PFL98201', // Authentic BMW M4 G82 VIN format
      calId: '0089S58M4COMPETITION'
    };
  }

  disconnect() {
    this.isConnected = false;
  }

  /**
   * Triggers a Diagnostic Trouble Code with freeze-frame telemetry capture.
   */
  triggerFault(dtcCode, liveTelemetry = {}) {
    const dtcEntry = DTC_DATABASE[dtcCode] || {
      code: dtcCode,
      description: 'Manufacturer Specific Diagnostic Code',
      system: 'Powertrain',
      severity: 'MEDIUM'
    };

    // Capture instantaneous Freeze Frame snapshot
    const freezeFrame = {
      dtcCaused: dtcCode,
      engineRpm: liveTelemetry.engineRpm || 2450,
      vehicleSpeedKmh: liveTelemetry.vehicleSpeedKmh || 62.0,
      coolantTempC: liveTelemetry.coolantTempC || 94.0,
      intakeAirTempC: liveTelemetry.intakeAirTempC || 32.0,
      manifoldAbsolutePressureKpa: liveTelemetry.manifoldAbsolutePressureKpa || 145.0,
      shortTermFuelTrimBank1Pct: liveTelemetry.shortTermFuelTrimBank1Pct || 14.8,
      longTermFuelTrimBank1Pct: liveTelemetry.longTermFuelTrimBank1Pct || 18.2,
      fuelRailPressureBar: liveTelemetry.fuelRailPressureBar || 280.0,
      batteryVoltage: liveTelemetry.batteryVoltage || 13.9,
      timestamp: Date.now()
    };

    this.activeDTCs.set(dtcCode, {
      dtc: dtcEntry,
      freezeFrame,
      triggerCount: (this.activeDTCs.get(dtcCode)?.triggerCount || 0) + 1
    });

    this.milStatus = true; // Illuminate Check Engine Light
    return this.activeDTCs.get(dtcCode);
  }

  /**
   * Mode 03: Read Stored Diagnostic Trouble Codes.
   */
  readStoredCodes() {
    if (!this.isConnected) {
      return { success: false, error: 'Scan tool not connected to vehicle OBD-II DLC port.' };
    }

    const codes = Array.from(this.activeDTCs.values()).map(item => ({
      code: item.dtc.code,
      description: item.dtc.description,
      system: item.dtc.system,
      severity: item.dtc.severity
    }));

    return {
      success: true,
      milActive: this.milStatus,
      dtcCount: codes.length,
      codes
    };
  }

  /**
   * Mode 02: Read Freeze Frame Telemetry for a specific DTC.
   */
  readFreezeFrame(dtcCode) {
    if (!this.isConnected) {
      return { success: false, error: 'Scan tool not connected to OBD-II port.' };
    }

    const item = this.activeDTCs.get(dtcCode);
    if (!item) {
      return { success: false, error: `No freeze frame record stored for code ${dtcCode}.` };
    }

    return {
      success: true,
      code: dtcCode,
      description: item.dtc.description,
      freezeFrame: item.freezeFrame
    };
  }

  /**
   * Mode 01: Read Real-Time Live Sensor PIDs.
   */
  readLivePIDs(engineSimulator = null) {
    if (!this.isConnected) {
      return { success: false, error: 'Scan tool not connected.' };
    }

    const rpm = engineSimulator ? engineSimulator.engineRpm : (this.milStatus ? 1850 : 850);
    const hasLeanFault = this.activeDTCs.has('P0171') || this.activeDTCs.has('P0174');
    const hasVoltageFault = this.activeDTCs.has('P0562');

    return {
      success: true,
      pids: {
        PID_04_CALCULATED_LOAD_PCT: rpm > 1000 ? 42.5 : 18.0,
        PID_05_COOLANT_TEMP_C: 96.0,
        PID_06_SHORT_TERM_FUEL_TRIM_B1: hasLeanFault ? 19.5 : 1.2,
        PID_07_LONG_TERM_FUEL_TRIM_B1: hasLeanFault ? 22.0 : 0.8,
        PID_0B_INTAKE_MAP_KPA: rpm > 1000 ? 165.0 : 38.0, // Turbo boost when revving
        PID_0C_ENGINE_RPM: Math.round(rpm),
        PID_0D_VEHICLE_SPEED_KMH: 0.0,
        PID_0F_INTAKE_AIR_TEMP_C: 28.0,
        PID_10_MAF_AIR_FLOW_GPS: rpm > 1000 ? 54.2 : 4.8,
        PID_11_THROTTLE_POSITION_PCT: rpm > 1000 ? 24.0 : 3.5,
        PID_23_FUEL_RAIL_PRESSURE_BAR: 310.0,
        PID_42_CONTROL_MODULE_VOLTAGE: hasVoltageFault ? 11.2 : 14.1
      }
    };
  }

  /**
   * Mode 04: Clear Diagnostic Trouble Codes & Reset MIL.
   */
  clearCodes() {
    if (!this.isConnected) {
      return { success: false, error: 'Scan tool not connected to OBD-II port.' };
    }

    const clearedCount = this.activeDTCs.size;
    this.activeDTCs.clear();
    this.pendingDTCs.clear();
    this.milStatus = false;

    // Clearing DTCs resets emissions readiness monitors to NOT READY
    this.readinessMonitors.catalyst = 'NOT_READY';
    this.readinessMonitors.evaporativeSystem = 'NOT_READY';
    this.readinessMonitors.oxygenSensor = 'NOT_READY';

    return {
      success: true,
      clearedDTCsCount: clearedCount,
      milStatus: false,
      message: 'All Diagnostic Trouble Codes cleared. Check Engine Light extinguished. I/M readiness monitors reset to NOT READY.'
    };
  }
}
