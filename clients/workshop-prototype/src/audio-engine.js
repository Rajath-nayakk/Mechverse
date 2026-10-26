/**
 * MECHVERSE - Procedural Automotive Audio Engine
 * 
 * Synthesizes realistic vehicle and workshop audio via Web Audio API:
 * 1. Engine Firing Pulse Synthesis:
 *    - Fundamental firing frequency: f = (RPM / 60) * (NumCylinders / 2)
 *    - BMW S58 (6-cylinder, 4-stroke): 3 firing pulses per revolution
 *      At 1200 RPM -> 60 Hz fundamental; At 6500 RPM -> 325 Hz fundamental + 2nd, 3rd harmonics
 *    - Custom V12 (12-cylinder, 4-stroke): 6 firing pulses per revolution
 *      At 1200 RPM -> 120 Hz fundamental; At 6500 RPM -> 650 Hz fundamental (exotic high-pitch scream)
 * 2. Twin-Turbocharger Spool Whine:
 *    - High-frequency resonant filter: f_spool = 800 + 4200 * (boost_bar / 1.7) Hz
 *    - Amplitude proportional to turbo boost pressure (0 to 1.7 bar)
 * 3. Blow-Off Valve (BOV) Pneumatic Whoosh:
 *    - Triggered upon rapid throttle lift-off from high boost; transient white noise burst with 180ms decay
 * 4. Workshop Tool Acoustics:
 *    - 72-tooth ratchet pawl clicks (15ms metallic transient click)
 *    - Breaker bar high-torque breakaway snap (low-frequency metallic crack)
 *    - Micrometer click torque wrench cam slip decoupling (solid tactile metallic pop)
 */

export class ProceduralAudioEngine {
  constructor(audioContext = null) {
    this.audioContext = audioContext;
    this.masterVolume = 0.8;
    this.isMuted = false;
    this.activeSounds = [];
    this.lastThrottle = 0.0;
  }

  /**
   * Calculate engine acoustic firing frequency and harmonic spectrum
   */
  getEngineAcousticProfile(engineRpm, cylinderCount = 6, boostBar = 0.0) {
    const revPerSec = Math.max(0.0, engineRpm) / 60.0;
    const firingPulsesPerRev = cylinderCount / 2.0;
    const fundamentalFreqHz = revPerSec * firingPulsesPerRev;

    // Harmonic overtone synthesis
    const harmonics = [
      { harmonic: 1, freqHz: Math.round(fundamentalFreqHz * 10) / 10, amplitude: 1.0 },
      { harmonic: 2, freqHz: Math.round(fundamentalFreqHz * 2 * 10) / 10, amplitude: 0.65 },
      { harmonic: 3, freqHz: Math.round(fundamentalFreqHz * 3 * 10) / 10, amplitude: 0.40 },
      { harmonic: 4, freqHz: Math.round(fundamentalFreqHz * 4 * 10) / 10, amplitude: 0.25 }
    ];

    // Turbo spool whine frequency
    const maxBoostBar = 1.7; // S58 factory peak boost
    const boostRatio = Math.max(0.0, Math.min(1.0, boostBar / maxBoostBar));
    const turboWhineFreqHz = Math.round(800.0 + 4200.0 * boostRatio);
    const turboWhineVolume = parseFloat((boostRatio * 0.45).toFixed(2));

    return {
      fundamentalFreqHz: Math.round(fundamentalFreqHz * 10) / 10,
      cylinderCount,
      harmonics,
      turboSpool: {
        whineFreqHz: turboWhineFreqHz,
        volume: turboWhineVolume,
        boostBar: parseFloat(boostBar.toFixed(2))
      }
    };
  }

  /**
   * Trigger blow-off valve pneumatic discharge upon rapid throttle drop
   */
  checkBlowOffValveTrigger(currentThrottle, previousThrottle, boostBar) {
    const isRapidLiftOff = (previousThrottle - currentThrottle) > 0.4;
    const hasSufficientBoost = boostBar > 0.5;

    if (isRapidLiftOff && hasSufficientBoost) {
      return {
        triggered: true,
        type: 'BLOW_OFF_VALVE_WHOOSH',
        burstVolume: Math.min(1.0, boostBar / 1.7),
        decayDurationMs: 220,
        filterCutoffHz: 2800
      };
    }

    return { triggered: false };
  }

  /**
   * Synthesize mechanical tool acoustic event
   */
  triggerToolSound(toolType = 'RATCHET_CLICK') {
    switch (toolType) {
      case 'RATCHET_CLICK':
        return {
          type: 'RATCHET_CLICK',
          clickDurationMs: 15,
          pitchHz: 3200,
          transientSharpness: 0.95,
          description: '72-tooth spring-loaded pawl mechanical click.'
        };
      case 'BREAKER_BAR_BREAKAWAY':
        return {
          type: 'BREAKER_BAR_BREAKAWAY',
          durationMs: 80,
          pitchHz: 480,
          transientSharpness: 0.88,
          description: 'High-torque seized fastener breakaway crack.'
        };
      case 'TORQUE_WRENCH_CLICK':
        return {
          type: 'TORQUE_WRENCH_CLICK',
          durationMs: 45,
          pitchHz: 1850,
          transientSharpness: 1.0,
          description: 'Precision micrometer spring cam decoupling click.'
        };
      default:
        return { type: 'GENERIC_METALLIC_TAP', durationMs: 25, pitchHz: 2200 };
    }
  }
}
