/**
 * MECHVERSE - Automotive Electrochemical Battery Model
 * Implements Thevenin-equivalent circuit representation:
 *
 *   V_terminal = V_OC(SOC) - I_discharge * R_internal
 *
 * Applicable for conventional 12V automotive starting-lighting-ignition (SLI)
 * lead-acid batteries and 24V commercial vehicle configurations.
 */

export class BatteryModel {
  constructor(config = {}) {
    this.nominalVoltage = config.nominalVoltage || 12.0; // 12V or 24V
    this.capacityAh = config.capacityAh || 65.0; // 65 Amp-hours
    this.soc = config.soc !== undefined ? config.soc : 0.85; // 85% State of Charge
    this.internalResistance = config.internalResistance || 0.015; // 15 milliohms healthy
    this.terminalCorrosionResistance = config.terminalCorrosionResistance || 0.0;
    this.temperatureC = config.temperatureC || 20.0;
    this.healthPercentage = config.healthPercentage || 100.0; // 100% SOH
    this.isConnected = config.isConnected !== undefined ? config.isConnected : true;
    this.chargingEfficiency = 0.88;
  }

  /**
   * Calculates Open-Circuit Voltage (V_OC) as a function of State of Charge (SOC).
   * Calibrated for automotive 12V lead-acid battery chemistry at 20°C:
   *   SOC 100% -> 12.72 V
   *   SOC  75% -> 12.45 V
   *   SOC  50% -> 12.20 V
   *   SOC  25% -> 11.95 V
   *   SOC   0% -> 11.70 V
   */
  getOpenCircuitVoltage() {
    if (!this.isConnected) return 0.0;

    const baseVoltage12V = 11.70 + (this.soc * 1.02);
    const scale = this.nominalVoltage / 12.0;
    return baseVoltage12V * scale;
  }

  /**
   * Returns total internal impedance (cell resistance + terminal corrosion).
   */
  getEffectiveInternalResistance() {
    // Internal resistance increases as SOC drops below 25% and as health degrades
    const degradationMultiplier = Math.max(1.0, 1.0 + (100.0 - this.healthPercentage) * 0.03);
    const lowSocMultiplier = this.soc < 0.2 ? 1.0 + (0.2 - this.soc) * 4.0 : 1.0;
    return (this.internalResistance * degradationMultiplier * lowSocMultiplier) + this.terminalCorrosionResistance;
  }

  /**
   * Calculates loaded terminal voltage given discharge current:
   * V_terminal = V_OC - I * R_internal
   */
  getTerminalVoltage(dischargeCurrentAmps = 0.0) {
    if (!this.isConnected) return 0.0;
    const voc = this.getOpenCircuitVoltage();
    const rInt = this.getEffectiveInternalResistance();
    const vTerm = voc - (dischargeCurrentAmps * rInt);
    return Math.max(0.0, vTerm);
  }

  /**
   * Simulates dynamic discharge or charge over delta time (seconds).
   * Delta SOC = - (I * dt / 3600) / CapacityAh
   */
  stepSimulation(currentAmps, deltaTimeSeconds) {
    if (!this.isConnected || deltaTimeSeconds <= 0) return this.soc;

    // Positive current = discharge; Negative current = charging
    let deltaAh = (currentAmps * deltaTimeSeconds) / 3600.0;
    if (currentAmps < 0) {
      // Apply charging efficiency
      deltaAh *= this.chargingEfficiency;
    }

    const deltaSoc = -deltaAh / this.capacityAh;
    this.soc = Math.max(0.0, Math.min(1.0, this.soc + deltaSoc));
    return this.soc;
  }

  /**
   * Alias for stepSimulation.
   */
  updateSOC(currentAmps, deltaTimeSeconds) {
    return this.stepSimulation(currentAmps, deltaTimeSeconds);
  }

  /**
   * Simulates accelerated parking time (e.g., overnight 12 hours) with parasitic draw.
   */
  simulateParkingDischarge(parasiticCurrentAmps, hours) {
    return this.stepSimulation(parasiticCurrentAmps, hours * 3600.0);
  }

  /**
   * Calculates starter motor cranking load behavior.
   * @param {number} starterResistance Resistance of starter motor windings (~0.075 Ohm)
   * @param {number} groundPathResistance Resistance of ground strap (~0.002 Ohm healthy)
   */
  simulateCranking(starterResistance = 0.075, groundPathResistance = 0.002) {
    const voc = this.getOpenCircuitVoltage();
    const rTotal = this.getEffectiveInternalResistance() + starterResistance + groundPathResistance;
    const crankingCurrent = voc / rTotal;
    const terminalVoltage = this.getTerminalVoltage(crankingCurrent);
    const voltageDropGround = crankingCurrent * groundPathResistance;
    const voltageAtStarter = crankingCurrent * starterResistance;

    return {
      voc,
      crankingCurrent,
      terminalVoltage,
      voltageDropGround,
      voltageAtStarter,
      starterPowerWatts: crankingCurrent * voltageAtStarter,
      isSufficientToCrank: crankingCurrent >= 100.0 && terminalVoltage >= 9.6 && voltageAtStarter >= 8.5
    };
  }
}
