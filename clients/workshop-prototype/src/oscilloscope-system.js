/**
 * MECHVERSE - 2-Channel Automotive Digital Storage Oscilloscope (DSO)
 * 
 * Simulates lab scope diagnostics for high-speed automotive sensors & actuators:
 * 1. CKP (Crankshaft Position Sensor): 60-2 tooth reluctor / hall effect waveform with missing tooth sync
 * 2. CMP (Camshaft Position Sensor): Digital Hall square wave pulse with sync notch
 * 3. Fuel Injector Pulse: Injector drive pull-down, on-time pulse width (ms), inductive flyback spike (60-80V)
 * 4. Ignition Primary/Secondary: Dwell time charging, firing line spike, burn time duration (ms), coil oscillations
 * 5. Alternator Ripple: 3-phase diode rectification AC ripple (healthy < 0.5Vpp vs open diode ripple > 2.5Vpp)
 */

export const SCOPE_SIGNALS = {
  CKP_60_MINUS_2: 'CKP_60_MINUS_2',
  CMP_HALL: 'CMP_HALL',
  INJECTOR_PULSE: 'INJECTOR_PULSE',
  IGNITION_SECONDARY: 'IGNITION_SECONDARY',
  ALTERNATOR_RIPPLE: 'ALTERNATOR_RIPPLE'
};

export class AutomotiveOscilloscope {
  constructor() {
    this.ch1 = {
      connectedSignal: SCOPE_SIGNALS.CKP_60_MINUS_2,
      voltsPerDiv: 2.0, // 0.5, 1.0, 2.0, 5.0, 10.0, 20.0 V/div
      coupling: 'DC',   // DC or AC
      offsetY: 0.0,
      enabled: true
    };

    this.ch2 = {
      connectedSignal: SCOPE_SIGNALS.CMP_HALL,
      voltsPerDiv: 2.0,
      coupling: 'DC',
      offsetY: 0.0,
      enabled: true
    };

    this.timebaseMsPerDiv = 5.0; // 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0 ms/div
    this.trigger = {
      source: 'CH1', // CH1 or CH2
      mode: 'AUTO',  // AUTO, NORMAL, SINGLE
      slope: 'RISING', // RISING or FALLING
      levelVolts: 1.5
    };

    this.sampleCount = 200; // Number of horizontal screen points
  }

  setTimebase(msPerDiv) {
    this.timebaseMsPerDiv = Math.max(0.1, Math.min(100.0, msPerDiv));
    return this.timebaseMsPerDiv;
  }

  setVoltsPerDiv(channel, voltsPerDiv) {
    const ch = channel === 1 ? this.ch1 : this.ch2;
    ch.voltsPerDiv = Math.max(0.1, Math.min(50.0, voltsPerDiv));
    return ch.voltsPerDiv;
  }

  connectSignal(channel, signalType) {
    const ch = channel === 1 ? this.ch1 : this.ch2;
    ch.connectedSignal = signalType;
    return ch.connectedSignal;
  }

  /**
   * Generates voltage sample for a signal at given time t (in seconds).
   * @param {string} signalType Signal identifier
   * @param {number} t Time in seconds
   * @param {object} engineState State containing rpm, faults, etc.
   */
  evaluateSignalVoltage(signalType, t, engineState = {}) {
    const rpm = engineState.engineRpm || 1000.0;
    const revsPerSec = rpm / 60.0;
    const crankPeriod = 1.0 / (revsPerSec || 1.0); // Time for 1 engine revolution
    const angleInRevDeg = ((t % crankPeriod) / crankPeriod) * 360.0;

    switch (signalType) {
      case SCOPE_SIGNALS.CKP_60_MINUS_2: {
        // 60-2 tooth trigger wheel = 58 physical teeth + 2 missing teeth gap
        // Tooth angle pitch = 360 / 60 = 6 degrees per tooth
        const toothIndex = Math.floor(angleInRevDeg / 6.0);
        if (toothIndex >= 58) {
          // Missing tooth gap for cylinder 1 TDC reference
          return 0.0;
        }
        // Sinusoidal/hall magnetic reluctance tooth passing
        const toothPhase = (angleInRevDeg % 6.0) / 6.0;
        const amplitude = Math.min(12.0, 2.5 + (rpm / 500.0) * 1.5); // Amplitude scales with RPM
        return Math.sin(toothPhase * 2.0 * Math.PI) * amplitude;
      }

      case SCOPE_SIGNALS.CMP_HALL: {
        // Camshaft turns at half crankshaft speed (720 deg crank = 360 deg cam)
        const camPeriod = crankPeriod * 2.0;
        const camAngleDeg = ((t % camPeriod) / camPeriod) * 360.0;
        // Digital 0V / 5V square wave with cylinder identification notches
        const isHigh = (camAngleDeg > 30 && camAngleDeg < 150) || (camAngleDeg > 210 && camAngleDeg < 270);
        return isHigh ? 5.0 : 0.2;
      }

      case SCOPE_SIGNALS.INJECTOR_PULSE: {
        // S58 direct injector or port injector pulse:
        // Normally at battery voltage (13.8V).
        // ECU pulls to ground for pulse width (~2.5ms).
        // On turn-off, inductor magnetic collapse creates high-voltage flyback spike (65V).
        const cyclePeriod = crankPeriod * 2.0;
        const cycleTime = t % cyclePeriod;
        const pulseStart = 0.005; // 5ms into cycle
        const pulseWidthSec = (engineState.injectorPulseWidthMs || 2.8) / 1000.0;
        const pulseEnd = pulseStart + pulseWidthSec;

        if (cycleTime < pulseStart) {
          return 13.8; // Open circuit pulled to 12V bus
        } else if (cycleTime >= pulseStart && cycleTime <= pulseEnd) {
          return 0.3; // ECU saturation transistor pulled to ground
        } else if (cycleTime > pulseEnd && cycleTime < pulseEnd + 0.0006) {
          // 0.6ms inductive zener clamp kickback spike
          const spikeProgress = (cycleTime - pulseEnd) / 0.0006;
          return 13.8 + (68.0 * (1.0 - spikeProgress));
        }
        return 13.8;
      }

      case SCOPE_SIGNALS.IGNITION_SECONDARY: {
        // Coil dwell -> Firing line (15 kV equivalent scaled to 15V) -> Spark burn (~1.5ms) -> Ringing
        const cyclePeriod = crankPeriod * 2.0;
        const cycleTime = t % cyclePeriod;
        const dwellStart = 0.002;
        const dwellTimeSec = 0.003;
        const fireTime = dwellStart + dwellTimeSec;

        if (cycleTime < dwellStart) return 0.0;
        if (cycleTime >= dwellStart && cycleTime < fireTime) {
          return 1.2; // Dwell saturation current ramp
        }
        if (cycleTime >= fireTime && cycleTime < fireTime + 0.0002) {
          return 18.0; // 18kV firing spike to ionize spark plug gap
        }
        if (cycleTime >= fireTime + 0.0002 && cycleTime < fireTime + 0.0016) {
          return 2.5; // Plasma spark burn line (1.4ms duration)
        }
        if (cycleTime >= fireTime + 0.0016 && cycleTime < fireTime + 0.0024) {
          // Coil ringing dampening oscillations
          const ringT = (cycleTime - (fireTime + 0.0016)) * 8000.0;
          return Math.sin(ringT * 2.0 * Math.PI) * Math.exp(-ringT * 0.4) * 2.0;
        }
        return 0.0;
      }

      case SCOPE_SIGNALS.ALTERNATOR_RIPPLE: {
        // 3-phase stator rectification ripple
        // Frequency = RPM * poles / 60
        const rippleFreq = (rpm * 12.0) / 60.0;
        const isDiodeBlown = !!engineState.faultBlownAlternatorDiode;
        const baseV = 14.2;

        if (isDiodeBlown) {
          // Open diode produces large periodic AC drops of 2.8 Vpp
          const dip = (Math.sin(2.0 * Math.PI * (rippleFreq / 3.0) * t) < -0.6) ? 3.0 : 0.0;
          return baseV - dip + (Math.sin(2.0 * Math.PI * rippleFreq * t) * 0.4);
        }
        // Healthy alternator has tiny ripple < 0.25 Vpp
        return baseV + (Math.sin(2.0 * Math.PI * rippleFreq * t) * 0.12);
      }

      default:
        return 0.0;
    }
  }

  /**
   * Captures oscilloscope waveform buffer across total screen time.
   */
  captureWaveforms(engineState = {}, startTimeSec = 0.0) {
    const totalTimeSec = (this.timebaseMsPerDiv * 10.0) / 1000.0; // 10 horizontal divisions
    const dt = totalTimeSec / this.sampleCount;

    const ch1Samples = [];
    const ch2Samples = [];

    let ch1Min = Infinity, ch1Max = -Infinity;
    let ch2Min = Infinity, ch2Max = -Infinity;

    for (let i = 0; i < this.sampleCount; i++) {
      const t = startTimeSec + (i * dt);

      let v1 = this.ch1.enabled ? this.evaluateSignalVoltage(this.ch1.connectedSignal, t, engineState) : 0.0;
      let v2 = this.ch2.enabled ? this.evaluateSignalVoltage(this.ch2.connectedSignal, t, engineState) : 0.0;

      if (this.ch1.coupling === 'AC') v1 -= 14.0; // Strip DC bias
      if (this.ch2.coupling === 'AC') v2 -= 14.0;

      v1 += this.ch1.offsetY;
      v2 += this.ch2.offsetY;

      ch1Samples.push({ tMs: i * (dt * 1000.0), v: v1 });
      ch2Samples.push({ tMs: i * (dt * 1000.0), v: v2 });

      if (v1 < ch1Min) ch1Min = v1;
      if (v1 > ch1Max) ch1Max = v1;
      if (v2 < ch2Min) ch2Min = v2;
      if (v2 > ch2Max) ch2Max = v2;
    }

    return {
      timebaseMsPerDiv: this.timebaseMsPerDiv,
      totalTimeMs: totalTimeSec * 1000.0,
      ch1: {
        signal: this.ch1.connectedSignal,
        samples: ch1Samples,
        vMin: ch1Min,
        vMax: ch1Max,
        vPeakToPeak: ch1Max - ch1Min
      },
      ch2: {
        signal: this.ch2.connectedSignal,
        samples: ch2Samples,
        vMin: ch2Min,
        vMax: ch2Max,
        vPeakToPeak: ch2Max - ch2Min
      }
    };
  }
}
