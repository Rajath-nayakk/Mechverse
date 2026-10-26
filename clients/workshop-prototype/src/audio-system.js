/**
 * MECHVERSE - Authentic 3D Positional Engine & Workshop Audio System
 * 
 * Features:
 * - Web Audio API with 3D Positional PannerNodes (Engine Bay & Exhaust Tips)
 * - Acoustic occlusion & lowpass muffling (bonnet open/closed, interior cabin)
 * - Real sample loop playback with RPM-driven pitch modulation and crossfading
 * - Starting sequence driven by authoritative Battery & Fuel State
 * - Turbo spool, blow-off valve transients, and overrun exhaust crackles
 * - Realistic fault acoustics: rod knock, belt squeal, misfire stutters
 * - Distinct acoustic profiles for BMW S58 Twin-Turbo I6 vs 6.0L V12 Swap
 * - Workshop tool transients (ratchet pawl, torque wrench cam click, pneumatic impact, lift hum)
 */

export class VehicleAudioSystem {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.audioCtx = null;
    this.isUnlocked = false;

    // Master volume & bus nodes
    this.masterGain = null;
    this.enginePanner = null;
    this.exhaustPanner = null;
    this.bonnetMuffleFilter = null;
    this.cabinFilter = null;

    // Audio sample buffers
    this.buffers = new Map();
    this.activeSources = new Map();

    // Engine loop sources & gain nodes for crossfading
    this.engineLoops = {
      idle: null,
      low: null,
      mid: null,
      high: null
    };
    this.engineGains = {
      idle: null,
      low: null,
      mid: null,
      high: null
    };

    // Turbo & auxiliary sources
    this.turboSpoolSource = null;
    this.turboSpoolGain = null;
    this.liftHumSource = null;
    this.liftHumGain = null;

    // State tracking
    this.currentRPM = 0;
    this.targetRPM = 0;
    this.engineRunning = false;
    this.engineType = 'S58'; // 'S58' or 'V12'
    this.bonnetOpen = false;
    this.inCabin = false;

    // Tool audio cooldowns
    this.lastRatchetTime = 0;

    // Sample definitions
    this.sampleUrls = {
      ignition_on: 'assets/audio/ignition_on.wav',
      starter_crank_normal: 'assets/audio/starter_crank_normal.wav',
      starter_crank_slow: 'assets/audio/starter_crank_slow.wav',
      starter_click_relay: 'assets/audio/starter_click_relay.wav',
      engine_s58_idle: 'assets/audio/engine_s58_idle.wav',
      engine_s58_low_rpm: 'assets/audio/engine_s58_low_rpm.wav',
      engine_s58_mid_rpm: 'assets/audio/engine_s58_mid_rpm.wav',
      engine_s58_high_rpm: 'assets/audio/engine_s58_high_rpm.wav',
      engine_v12_idle: 'assets/audio/engine_v12_idle.wav',
      engine_v12_high_rpm: 'assets/audio/engine_v12_high_rpm.wav',
      turbo_spool: 'assets/audio/turbo_spool.wav',
      turbo_blowoff: 'assets/audio/turbo_blowoff.wav',
      exhaust_crackle: 'assets/audio/exhaust_crackle.wav',
      engine_shutdown: 'assets/audio/engine_shutdown.wav',
      fault_knock: 'assets/audio/fault_knock.wav',
      fault_belt_squeal: 'assets/audio/fault_belt_squeal.wav',
      fault_misfire: 'assets/audio/fault_misfire.wav',
      tool_ratchet: 'assets/audio/tool_ratchet.wav',
      tool_torque_click: 'assets/audio/tool_torque_click.wav',
      tool_impact: 'assets/audio/tool_impact.wav',
      lift_hydraulic_hum: 'assets/audio/lift_hydraulic_hum.wav'
    };

    this.setupUnlockOverlay();
  }

  setupUnlockOverlay() {
    if (typeof document === 'undefined') return;

    // Check if overlay already exists
    if (document.getElementById('audio-unlock-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'audio-unlock-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(13, 17, 23, 0.92);
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 12px 18px;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
    `;
    overlay.innerHTML = `
      <span style="font-size: 18px;">🔊</span>
      <div>
        <div style="font-weight: 600; color: #58a6ff;">ENABLE 3D AUDIO</div>
        <div style="font-size: 11px; color: #8b949e;">Click to unlock Web Audio engine & positional acoustics</div>
      </div>
    `;

    const unlock = () => {
      this.initAudioContext();
      overlay.style.opacity = '0';
      overlay.style.transform = 'translateY(10px)';
      setTimeout(() => overlay.remove(), 250);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };

    overlay.addEventListener('click', unlock);
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.body.appendChild(overlay);
  }

  async initAudioContext() {
    if (this.isUnlocked) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Master output
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Bonnet acoustic muffle filter (Lowpass: ~9000 Hz open, ~950 Hz closed)
      this.bonnetMuffleFilter = this.audioCtx.createBiquadFilter();
      this.bonnetMuffleFilter.type = 'lowpass';
      this.bonnetMuffleFilter.frequency.setValueAtTime(950, this.audioCtx.currentTime);

      // Cabin isolation filter
      this.cabinFilter = this.audioCtx.createBiquadFilter();
      this.cabinFilter.type = 'lowpass';
      this.cabinFilter.frequency.setValueAtTime(14000, this.audioCtx.currentTime);

      // 3D Positional Panner: Engine Bay (Front Center)
      this.enginePanner = this.audioCtx.createPanner();
      this.enginePanner.panningModel = 'HRTF';
      this.enginePanner.distanceModel = 'inverse';
      this.enginePanner.refDistance = 1.8;
      this.enginePanner.maxDistance = 25.0;
      this.enginePanner.rolloffFactor = 1.2;
      this.enginePanner.positionX.setValueAtTime(0, this.audioCtx.currentTime);
      this.enginePanner.positionY.setValueAtTime(0.8, this.audioCtx.currentTime);
      this.enginePanner.positionZ.setValueAtTime(1.3, this.audioCtx.currentTime);

      // 3D Positional Panner: Exhaust Tips (Rear)
      this.exhaustPanner = this.audioCtx.createPanner();
      this.exhaustPanner.panningModel = 'HRTF';
      this.exhaustPanner.distanceModel = 'inverse';
      this.exhaustPanner.refDistance = 1.5;
      this.exhaustPanner.maxDistance = 25.0;
      this.exhaustPanner.rolloffFactor = 1.4;
      this.exhaustPanner.positionX.setValueAtTime(0, this.audioCtx.currentTime);
      this.exhaustPanner.positionY.setValueAtTime(0.35, this.audioCtx.currentTime);
      this.exhaustPanner.positionZ.setValueAtTime(-2.3, this.audioCtx.currentTime);

      // Route: Engine &rarr; BonnetFilter &rarr; EnginePanner &rarr; CabinFilter &rarr; Master
      this.bonnetMuffleFilter.connect(this.enginePanner);
      this.enginePanner.connect(this.cabinFilter);
      this.exhaustPanner.connect(this.cabinFilter);
      this.cabinFilter.connect(this.masterGain);

      this.isUnlocked = true;
      this.loadAllSamples();
    } catch (err) {
      console.warn('AudioContext initialization deferred:', err);
    }
  }

  async loadAllSamples() {
    if (!this.audioCtx) return;
    for (const [key, url] of Object.entries(this.sampleUrls)) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        }
      } catch (err) {
        console.warn(`Could not load audio sample ${key}:`, err);
      }
    }
  }

  updateListener() {
    if (!this.audioCtx || !this.camera) return;
    const pos = this.camera.position;
    const forward = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    up.copy(this.camera.up).applyQuaternion(this.camera.quaternion);

    const listener = this.audioCtx.listener;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(pos.x, this.audioCtx.currentTime);
      listener.positionY.setValueAtTime(pos.y, this.audioCtx.currentTime);
      listener.positionZ.setValueAtTime(pos.z, this.audioCtx.currentTime);
      listener.forwardX.setValueAtTime(forward.x, this.audioCtx.currentTime);
      listener.forwardY.setValueAtTime(forward.y, this.audioCtx.currentTime);
      listener.forwardZ.setValueAtTime(forward.z, this.audioCtx.currentTime);
      listener.upX.setValueAtTime(up.x, this.audioCtx.currentTime);
      listener.upY.setValueAtTime(up.y, this.audioCtx.currentTime);
      listener.upZ.setValueAtTime(up.z, this.audioCtx.currentTime);
    } else {
      listener.setPosition(pos.x, pos.y, pos.z);
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }

    // Detect if camera is inside the cabin
    const insideX = Math.abs(pos.x) < 0.65;
    const insideY = pos.y > 0.4 && pos.y < 1.35;
    const insideZ = pos.z > -0.7 && pos.z < 0.5;
    this.inCabin = insideX && insideY && insideZ;
    this.cabinFilter.frequency.setTargetAtTime(this.inCabin ? 1600 : 16000, this.audioCtx.currentTime, 0.1);
  }

  setBonnetState(isOpen) {
    this.bonnetOpen = isOpen;
    if (this.bonnetMuffleFilter && this.audioCtx) {
      const targetFreq = isOpen ? 9500 : 950;
      this.bonnetMuffleFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.15);
    }
  }

  setEngineType(type) {
    if (this.engineType !== type) {
      this.engineType = type;
      if (this.engineRunning) {
        this.stopEngineLoops();
        this.startEngineLoops();
      }
    }
  }

  // Play simple one-shot sample through a specific destination node
  playOneShot(key, destNode = this.masterGain, volume = 1.0, pitch = 1.0) {
    if (!this.audioCtx || !this.isUnlocked) return null;
    const buffer = this.buffers.get(key);
    if (!buffer) return null;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;

    const gain = this.audioCtx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(destNode);

    source.start(0);
    return source;
  }

  // --- STARTING SEQUENCE DRIVEN BY VEHICLE STATE ---
  startIgnitionSequence(vehicleState) {
    if (!this.audioCtx || !this.isUnlocked) return;

    // 1. Ignition Key Turn ON (Dash relay & chime)
    this.playOneShot('ignition_on', this.cabinFilter, 0.9);

    const voltage = vehicleState?.batteryVoltage ?? 12.6;
    const hasFuel = (vehicleState?.fuelVolume ?? 45.0) > 1.0;
    const starterInstalled = vehicleState?.components?.starter_motor?.installed ?? true;

    if (!starterInstalled) return;

    setTimeout(() => {
      // Starting Logic based on battery voltage
      if (voltage < 8.0) {
        // Dead battery: solenoid relay clicks rapidly only
        this.playOneShot('starter_click_relay', this.enginePanner, 1.0);
      } else if (voltage < 11.2) {
        // Weak battery: slow cranking groan, fails to catch
        const crank = this.playOneShot('starter_crank_slow', this.enginePanner, 0.95, voltage / 12.0);
        setTimeout(() => {
          if (crank) crank.stop();
        }, 3200);
      } else {
        // Normal battery (>= 11.2V): normal starter crank
        const crank = this.playOneShot('starter_crank_normal', this.enginePanner, 1.0, voltage / 12.6);
        setTimeout(() => {
          if (crank) crank.stop();
          if (hasFuel) {
            // Engine catches and starts!
            this.engineRunning = true;
            this.targetRPM = 1400; // Cold start flare
            this.startEngineLoops();
            setTimeout(() => {
              this.targetRPM = 750; // Settle to warm idle
            }, 1200);
          }
        }, 1100);
      }
    }, 400);
  }

  stopEngine() {
    if (!this.engineRunning) return;
    this.engineRunning = false;
    this.targetRPM = 0;
    this.playOneShot('engine_shutdown', this.enginePanner, 0.85);
    this.stopEngineLoops();
  }

  startEngineLoops() {
    if (!this.audioCtx || !this.isUnlocked) return;

    this.stopEngineLoops();

    const isV12 = this.engineType === 'V12';
    const idleKey = isV12 ? 'engine_v12_idle' : 'engine_s58_idle';
    const lowKey = isV12 ? 'engine_v12_idle' : 'engine_s58_low_rpm';
    const midKey = isV12 ? 'engine_v12_high_rpm' : 'engine_s58_mid_rpm';
    const highKey = isV12 ? 'engine_v12_high_rpm' : 'engine_s58_high_rpm';

    const setupLoop = (key) => {
      const buf = this.buffers.get(key);
      if (!buf) return { src: null, gain: null };
      const src = this.audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.0;
      src.connect(gain);
      gain.connect(this.bonnetMuffleFilter);
      src.start(0);
      return { src, gain };
    };

    const lIdle = setupLoop(idleKey);
    const lLow = setupLoop(lowKey);
    const lMid = setupLoop(midKey);
    const lHigh = setupLoop(highKey);

    this.engineLoops.idle = lIdle.src;
    this.engineGains.idle = lIdle.gain;
    this.engineLoops.low = lLow.src;
    this.engineGains.low = lLow.gain;
    this.engineLoops.mid = lMid.src;
    this.engineGains.mid = lMid.gain;
    this.engineLoops.high = lHigh.src;
    this.engineGains.high = lHigh.gain;

    // Turbo Spool continuous loop
    const turboBuf = this.buffers.get('turbo_spool');
    if (turboBuf) {
      this.turboSpoolSource = this.audioCtx.createBufferSource();
      this.turboSpoolSource.buffer = turboBuf;
      this.turboSpoolSource.loop = true;
      this.turboSpoolGain = this.audioCtx.createGain();
      this.turboSpoolGain.gain.value = 0.0;
      this.turboSpoolSource.connect(this.turboSpoolGain);
      this.turboSpoolGain.connect(this.bonnetMuffleFilter);
      this.turboSpoolSource.start(0);
    }
  }

  stopEngineLoops() {
    for (const key of ['idle', 'low', 'mid', 'high']) {
      if (this.engineLoops[key]) {
        try { this.engineLoops[key].stop(); } catch (e) {}
        this.engineLoops[key] = null;
      }
    }
    if (this.turboSpoolSource) {
      try { this.turboSpoolSource.stop(); } catch (e) {}
      this.turboSpoolSource = null;
    }
  }

  // Continuous frame update for smooth RPM crossfading and pitch shifting
  update(delta, vehicleState) {
    if (!this.audioCtx || !this.isUnlocked) return;

    this.updateListener();

    if (!this.engineRunning) {
      this.currentRPM = Math.max(0, this.currentRPM - 1800 * delta);
      return;
    }

    // Smooth RPM interpolation
    const lerpRate = 8.0;
    this.currentRPM += (this.targetRPM - this.currentRPM) * Math.min(1.0, delta * lerpRate);
    const rpm = this.currentRPM;

    // Crossfading calculations:
    // Idle: 600 - 1500 RPM
    // Low: 1200 - 3000 RPM
    // Mid: 2500 - 5200 RPM
    // High: 4500 - 7500 RPM
    let wIdle = Math.max(0, 1.0 - Math.abs(rpm - 800) / 700);
    let wLow = Math.max(0, 1.0 - Math.abs(rpm - 2200) / 1000);
    let wMid = Math.max(0, 1.0 - Math.abs(rpm - 4000) / 1500);
    let wHigh = Math.max(0, 1.0 - Math.abs(rpm - 6500) / 2000);

    const sum = (wIdle + wLow + wMid + wHigh) || 1.0;
    wIdle /= sum;
    wLow /= sum;
    wMid /= sum;
    wHigh /= sum;

    const t = this.audioCtx.currentTime;
    if (this.engineGains.idle) this.engineGains.idle.gain.setTargetAtTime(wIdle * 0.8, t, 0.05);
    if (this.engineGains.low) this.engineGains.low.gain.setTargetAtTime(wLow * 0.85, t, 0.05);
    if (this.engineGains.mid) this.engineGains.mid.gain.setTargetAtTime(wMid * 0.9, t, 0.05);
    if (this.engineGains.high) this.engineGains.high.gain.setTargetAtTime(wHigh * 0.95, t, 0.05);

    // Dynamic pitch modulation based on RPM ratio
    const pitch = Math.max(0.6, Math.min(2.5, rpm / 2500));
    if (this.engineLoops.idle) this.engineLoops.idle.playbackRate.setTargetAtTime(Math.max(0.8, rpm / 750), t, 0.05);
    if (this.engineLoops.low) this.engineLoops.low.playbackRate.setTargetAtTime(Math.max(0.7, rpm / 1800), t, 0.05);
    if (this.engineLoops.mid) this.engineLoops.mid.playbackRate.setTargetAtTime(Math.max(0.6, rpm / 3500), t, 0.05);
    if (this.engineLoops.high) this.engineLoops.high.playbackRate.setTargetAtTime(Math.max(0.5, rpm / 6500), t, 0.05);

    // Turbo spool whistle volume & pitch
    if (this.turboSpoolGain && this.turboSpoolSource) {
      const turboBoost = Math.max(0, (rpm - 2200) / 4500);
      this.turboSpoolGain.gain.setTargetAtTime(turboBoost * 0.5, t, 0.1);
      this.turboSpoolSource.playbackRate.setTargetAtTime(0.8 + turboBoost * 1.2, t, 0.1);
    }

    // Dynamic fault acoustics triggered by state
    if (vehicleState?.mechanicalFaults?.rod_knock && Math.random() < delta * 12) {
      this.playOneShot('fault_knock', this.enginePanner, 0.7);
    }
    if (vehicleState?.mechanicalFaults?.belt_worn && Math.random() < delta * 4) {
      this.playOneShot('fault_belt_squeal', this.enginePanner, 0.6);
    }
  }

  // --- WORKSHOP TOOL ACOUSTICS ---
  playToolRatchet() {
    const now = performance.now();
    if (now - this.lastRatchetTime > 40) {
      this.lastRatchetTime = now;
      this.playOneShot('tool_ratchet', this.masterGain, 0.6, 0.95 + Math.random() * 0.1);
    }
  }

  playToolTorqueClick() {
    this.playOneShot('tool_torque_click', this.masterGain, 0.95);
  }

  playToolImpact() {
    this.playOneShot('tool_impact', this.masterGain, 0.85);
  }

  playTurboBlowOff() {
    this.playOneShot('turbo_blowoff', this.bonnetMuffleFilter, 0.7);
  }

  playExhaustCrackle() {
    this.playOneShot('exhaust_crackle', this.exhaustPanner, 0.8);
  }

  setLiftRunning(running) {
    if (!this.audioCtx || !this.isUnlocked) return;
    if (running && !this.liftHumSource) {
      const buf = this.buffers.get('lift_hydraulic_hum');
      if (buf) {
        this.liftHumSource = this.audioCtx.createBufferSource();
        this.liftHumSource.buffer = buf;
        this.liftHumSource.loop = true;
        this.liftHumGain = this.audioCtx.createGain();
        this.liftHumGain.gain.value = 0.55;
        this.liftHumSource.connect(this.liftHumGain);
        this.liftHumGain.connect(this.masterGain);
        this.liftHumSource.start(0);
      }
    } else if (!running && this.liftHumSource) {
      try { this.liftHumSource.stop(); } catch (e) {}
      this.liftHumSource = null;
    }
  }
}
