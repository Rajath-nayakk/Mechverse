/**
 * MECHVERSE - Engine Start Simulation & Vehicle Driving Dynamics with Fastener-Torque Coupling
 * 
 * Physical Modeling for:
 * 1. Engine Starting Simulation:
 *    - Starter motor crank sequence (draw: 160-220 A, crank speed: 220-260 RPM)
 *    - Direct injection fuel rail pressure buildup (min 50 bar to fire, nominal 350 bar)
 *    - Oil pressure interlock: checks oil level and drain plug before permitting engine catch
 *    - Cold start cat warm-up cycle (1200 RPM high idle -> 850 RPM warm idle)
 * 
 * 2. Fastener-Torque Coupled Driving Physics:
 *    - Wheel Lug Torque Coupling (Factory Spec: 140 N·m per M14x1.25 bolt):
 *      - Under-torqued lugs (< 80 N·m): generates rotational wheel runout & speed-dependent chassis vibration
 *      - Severely loose lugs (< 25 N·m): progressive bolt back-out under lateral load -> catastrophic wheel detachment
 *    - Brake Caliper Bracket Torque Coupling (Factory Spec: 110 N·m):
 *      - Under-torqued caliper bracket (< 60 N·m): caliper deflects under braking clamp, inducing severe steering pull
 *    - Hydraulic Brake Aeration Coupling:
 *      - Spongy fluid reduces peak deceleration: a_brake = a_max * E_firmness, extending stopping distance
 * 
 * 3. Longitudinal & Lateral Vehicle Dynamics:
 *    - ZF 8HP76 8-speed gear ratios, 3.15 final drive, S58 650 N·m torque delivery, tire slip & braking deceleration
 */

export class EngineStartSystem {
  constructor(oilService = null) {
    this.oilService = oilService;
    this.isIgnitionOn = false;
    this.isStarterEngaged = false;
    this.isEngineRunning = false;
    this.engineRpm = 0.0;
    this.starterCurrentAmps = 0.0;
    this.fuelRailPressureBar = 5.0; // Residual low-pressure rail: 5 bar
    this.oilPressureBar = 0.0;
    this.isCatHeatingActive = false;
    this.runTimeSeconds = 0.0;
  }

  setIgnition(on = true) {
    this.isIgnitionOn = on;
    if (!on) {
      this.isEngineRunning = false;
      this.engineRpm = 0.0;
      this.starterCurrentAmps = 0.0;
      this.oilPressureBar = 0.0;
    }
    return { isIgnitionOn: this.isIgnitionOn };
  }

  /**
   * Turn starter key / press Start button
   */
  crankAndStart(batteryVoltage = 12.6, fuelLevelLiters = 25.0) {
    if (!this.isIgnitionOn) {
      return { success: false, error: 'Ignition is switched OFF. Cannot crank starter.' };
    }
    if (this.isEngineRunning) {
      return { success: false, error: 'Engine is already running.' };
    }

    // 1. Battery Voltage Check
    if (batteryVoltage < 10.8) {
      return {
        success: false,
        starterEngaged: true,
        crankingRpm: 60,
        starterCurrentAmps: 75.0,
        error: 'Slow crank / click: Battery voltage too low (< 10.8V) to crank engine.'
      };
    }

    // 2. Fuel Level Check
    if (fuelLevelLiters <= 0.5) {
      return {
        success: false,
        starterEngaged: true,
        crankingRpm: 240,
        starterCurrentAmps: 185.0,
        error: 'Engine cranks continuously but will not catch: Fuel tank empty.'
      };
    }

    // 3. Oil Level & Drain Plug Safety Interlock
    if (this.oilService) {
      const dipstick = this.oilService.checkDipstick();
      if (!this.oilService.isDrainPlugInstalled || dipstick.readingLevel === 'DRY') {
        return {
          success: false,
          starterEngaged: false,
          error: 'CRITICAL ENGINE PROTECTION: Oil drain plug missing or dry sump! Start aborted to prevent engine seizure.'
        };
      }
    }

    // Successful Cranking & Ignition Catch
    this.isStarterEngaged = true;
    this.starterCurrentAmps = 195.0; // Cranking inrush
    this.fuelRailPressureBar = 350.0; // High-pressure DI pump engages
    this.oilPressureBar = 4.2;        // Healthy 4.2 bar main gallery oil pressure
    this.isEngineRunning = true;
    this.isCatHeatingActive = true;
    this.engineRpm = 1200.0;          // Cold start fast idle for catalytic converter light-off

    return {
      success: true,
      engineRpm: this.engineRpm,
      oilPressureBar: this.oilPressureBar,
      fuelRailPressureBar: this.fuelRailPressureBar,
      isCatHeatingActive: this.isCatHeatingActive,
      message: 'BMW S58 twin-turbo engine fired! Cold start fast idle initiated.'
    };
  }

  stepEngine(deltaTimeSec = 1.0) {
    if (!this.isEngineRunning) return { engineRpm: 0.0, oilPressureBar: 0.0 };
    this.runTimeSeconds += deltaTimeSec;

    // Cat heating cycle expires after 15 seconds -> idle settles to 850 RPM
    if (this.isCatHeatingActive && this.runTimeSeconds > 15.0) {
      this.isCatHeatingActive = false;
      this.engineRpm = 850.0;
    }

    return {
      engineRpm: this.engineRpm,
      oilPressureBar: this.oilPressureBar,
      isCatHeatingActive: this.isCatHeatingActive
    };
  }
}

export class VehicleDrivingDynamics {
  constructor(runningGear = null) {
    this.runningGear = runningGear;
    
    // Vehicle Specs: BMW M4 Competition (G82)
    this.curbWeightKg = 1725.0;
    this.wheelbaseM = 2.857;
    this.maxPowerHp = 503.0;
    this.maxTorqueNm = 650.0;
    this.finalDriveRatio = 3.15;
    this.gearRatios = [5.00, 3.20, 2.14, 1.72, 1.31, 1.00, 0.82, 0.64]; // ZF 8HP76
    this.currentGear = 1;

    // Vehicle Dynamic State
    this.vehicleSpeedKmh = 0.0;
    this.engineRpm = 0.0;
    this.steeringAngleDeg = 0.0;
    this.distanceTraveledMeters = 0.0;
    this.lateralAccG = 0.0;

    // Wheel Fastener Clamping Torques (5 bolts per corner, factory 140 N·m)
    this.wheelLugTorques = {
      FL: [140.0, 140.0, 140.0, 140.0, 140.0],
      FR: [140.0, 140.0, 140.0, 140.0, 140.0],
      RL: [140.0, 140.0, 140.0, 140.0, 140.0],
      RR: [140.0, 140.0, 140.0, 140.0, 140.0]
    };

    // Caliper Bracket Mounting Torques (Factory: 110 N·m)
    this.caliperBracketTorques = {
      FL: 110.0,
      FR: 110.0,
      RL: 110.0,
      RR: 110.0
    };

    // Wheel Detachment Hazards
    this.wheelDetached = {
      FL: false,
      FR: false,
      RL: false,
      RR: false
    };
  }

  setWheelLugTorque(cornerId, boltIndex, torqueNm) {
    if (this.wheelLugTorques[cornerId] && boltIndex >= 0 && boltIndex < 5) {
      this.wheelLugTorques[cornerId][boltIndex] = torqueNm;
    }
  }

  setCaliperBracketTorque(cornerId, torqueNm) {
    if (this.caliperBracketTorques[cornerId] !== undefined) {
      this.caliperBracketTorques[cornerId] = torqueNm;
    }
  }

  getAverageWheelLugTorque(cornerId) {
    const torques = this.wheelLugTorques[cornerId];
    return torques.reduce((sum, t) => sum + t, 0) / torques.length;
  }

  /**
   * Evaluate chassis vibration & wheel runout wobble induced by under-torqued lug bolts:
   * When average lug torque < 80 N·m, wheel clamping is uneven, producing radial/lateral runout.
   * Vibration amplitude scales with vehicle speed.
   */
  evaluateWheelWobble() {
    let maxVibrationIntensity = 0.0;
    let worstCorner = 'NONE';

    for (const corner of ['FL', 'FR', 'RL', 'RR']) {
      const avgTorque = this.getAverageWheelLugTorque(corner);
      if (avgTorque < 80.0) {
        const torqueDeficitRatio = (80.0 - avgTorque) / 80.0;
        // Vibration intensity scales with speed (normalized 0.0 to 1.0)
        const intensity = Math.min(1.0, (this.vehicleSpeedKmh / 120.0) * torqueDeficitRatio);
        if (intensity > maxVibrationIntensity) {
          maxVibrationIntensity = intensity;
          worstCorner = corner;
        }
      }
    }

    return {
      hasWheelWobble: maxVibrationIntensity > 0.05,
      vibrationIntensity: parseFloat(maxVibrationIntensity.toFixed(3)),
      worstCorner,
      description: maxVibrationIntensity > 0.3 
        ? `VIOLENT CHASSIS SHAKE: Wheel lug bolts loose on ${worstCorner}! Steering wheel vibrating violently.`
        : maxVibrationIntensity > 0.05 
        ? `Mild speed-dependent vibration detected from ${worstCorner}. Check wheel lug torque.`
        : 'Smooth rotation. All wheel lug bolts torqued to specification.'
    };
  }

  /**
   * Evaluate braking deceleration & steering pull:
   * 1. Caliper bracket under-torqued (< 60 N·m) twists under braking load, creating asymmetric brake force
   * 2. Aerated brake line reduces total available braking force
   */
  applyBrakes(brakePedalForce = 1.0) {
    const firmness = this.runningGear ? this.runningGear.getOverallPedalFirmness() : 1.0;
    
    // Base dry braking deceleration for BMW M4 Competition = 1.05 G (~10.3 m/s^2)
    const baseDecelG = 1.05 * brakePedalForce;
    const actualDecelG = baseDecelG * firmness;

    // Check for asymmetric caliper bracket torque inducing steering pull
    const flCaliperTorque = this.caliperBracketTorques.FL;
    const frCaliperTorque = this.caliperBracketTorques.FR;
    let steeringPullTorqueNm = 0.0;
    let pullDirection = 'NONE';

    if (flCaliperTorque < 60.0 && frCaliperTorque >= 60.0) {
      // FL caliper flexes, loses clamping -> Car violently pulls RIGHT
      steeringPullTorqueNm = 24.0 * (1.0 - flCaliperTorque / 60.0);
      pullDirection = 'RIGHT';
    } else if (frCaliperTorque < 60.0 && flCaliperTorque >= 60.0) {
      // FR caliper flexes -> Car violently pulls LEFT
      steeringPullTorqueNm = 24.0 * (1.0 - frCaliperTorque / 60.0);
      pullDirection = 'LEFT';
    }

    // Compute stopping distance from 100 km/h (v0 = 27.78 m/s): d = v^2 / (2 * a)
    const v0Mps = 100.0 / 3.6;
    const aMps2 = actualDecelG * 9.81;
    const stoppingDistance100To0Meters = Math.round((Math.pow(v0Mps, 2) / (2 * Math.max(1.0, aMps2))) * 10) / 10;

    return {
      decelerationG: parseFloat(actualDecelG.toFixed(2)),
      pedalFirmness: parseFloat(firmness.toFixed(2)),
      stoppingDistance100To0Meters,
      steeringPull: {
        hasSteeringPull: steeringPullTorqueNm > 1.0,
        pullDirection,
        steeringPullTorqueNm: parseFloat(steeringPullTorqueNm.toFixed(1))
      }
    };
  }

  /**
   * Step dynamic driving simulation:
   * Checks for catastrophic wheel detachment when driven with dangerously loose lug bolts (< 25 N·m)
   */
  stepDriving(throttle = 0.5, deltaTimeSec = 0.1) {
    // Check wheel detachment
    for (const corner of ['FL', 'FR', 'RL', 'RR']) {
      const avgTorque = this.getAverageWheelLugTorque(corner);
      if (avgTorque < 25.0) {
        // Dangerously loose bolts back out progressively under rolling distance & speed
        if (this.vehicleSpeedKmh > 30.0 && this.distanceTraveledMeters > 150.0) {
          this.wheelDetached[corner] = true;
          this.vehicleSpeedKmh = 0.0;
          return {
            catastrophicFailure: true,
            detachedCorner: corner,
            error: `CATASTROPHIC SUSPENSION COLLAPSE: Wheel ${corner} sheared remaining loose lug bolts and detached from hub at speed!`
          };
        }
      }
    }

    // Normal acceleration
    if (throttle > 0.0) {
      const accelRate = 4.5 * throttle; // ~4.5 m/s^2 (0-100 km/h in 3.8s)
      this.vehicleSpeedKmh = Math.min(250.0, this.vehicleSpeedKmh + (accelRate * deltaTimeSec) * 3.6);
    }

    const distStepMeters = (this.vehicleSpeedKmh / 3.6) * deltaTimeSec;
    this.distanceTraveledMeters += distStepMeters;

    return {
      vehicleSpeedKmh: parseFloat(this.vehicleSpeedKmh.toFixed(1)),
      distanceTraveledMeters: parseFloat(this.distanceTraveledMeters.toFixed(1)),
      wobbleStatus: this.evaluateWheelWobble()
    };
  }
}
