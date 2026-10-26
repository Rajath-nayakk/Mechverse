import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('clients/workshop-prototype/assets/audio');

function createWavBuffer(sampleRate, durationSeconds, generateSampleFn) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = 2; // 1 channel * 2 bytes
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // numChannels (1 mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM data
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = generateSampleFn(t, i, numSamples);
    sample = Math.max(-1.0, Math.min(1.0, sample));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

const audioDefs = {
  // 1. Ignition key click & chime
  'ignition_on.wav': {
    duration: 1.2,
    fn: (t) => {
      let click = t < 0.04 ? (Math.random() * 2 - 1) * Math.exp(-t * 120) : 0;
      let chime = 0;
      if (t > 0.08) {
        const ct = t - 0.08;
        chime = Math.sin(2 * Math.PI * 880 * ct) * Math.exp(-ct * 3) * 0.4 +
                Math.sin(2 * Math.PI * 1320 * ct) * Math.exp(-ct * 3.5) * 0.25;
      }
      return click * 0.6 + chime;
    }
  },

  // 2. Starter crank normal (280 RPM = 4.66 crank rev/sec, 6-cyl = 14 pulses/sec)
  'starter_crank_normal.wav': {
    duration: 2.5,
    fn: (t) => {
      const crankFreq = 4.66;
      const compression = Math.pow(Math.sin(2 * Math.PI * crankFreq * 3 * t), 4);
      const starterWhine = Math.sin(2 * Math.PI * 480 * t) * 0.35 +
                           Math.sin(2 * Math.PI * 960 * t) * 0.15;
      const chug = Math.sin(2 * Math.PI * 75 * t) * compression * 0.6;
      const noise = (Math.random() * 2 - 1) * 0.1;
      return (starterWhine + chug + noise) * 0.7;
    }
  },

  // 3. Starter crank slow (120 RPM = 2.0 rev/sec)
  'starter_crank_slow.wav': {
    duration: 3.0,
    fn: (t) => {
      const crankFreq = 2.0;
      const compression = Math.pow(Math.sin(2 * Math.PI * crankFreq * 3 * t), 4);
      const starterWhine = Math.sin(2 * Math.PI * 220 * t) * 0.4;
      const chug = Math.sin(2 * Math.PI * 45 * t) * compression * 0.8;
      const sag = Math.exp(-t * 0.3); // voltage sag
      return (starterWhine + chug) * sag * 0.75;
    }
  },

  // 4. Starter relay clicking (dead battery, 8 Hz click-click-click)
  'starter_click_relay.wav': {
    duration: 1.5,
    fn: (t) => {
      const cycle = t % 0.125;
      if (cycle < 0.015) {
        return (Math.random() * 2 - 1) * Math.exp(-cycle * 300) * 0.8;
      }
      return 0;
    }
  },

  // 5. BMW S58 Twin-Turbo Inline-6 Idle (750 RPM -> fundamental 37.5 Hz, 3 firings/rev = 112.5 Hz)
  'engine_s58_idle.wav': {
    duration: 3.0,
    fn: (t) => {
      const f0 = 37.5;
      const pulse = Math.sin(2 * Math.PI * f0 * 3 * t); // 112.5 Hz
      const sub = Math.sin(2 * Math.PI * f0 * t) * 0.5;
      const h2 = Math.sin(2 * Math.PI * f0 * 6 * t) * 0.3; // 225 Hz
      const h3 = Math.sin(2 * Math.PI * f0 * 9 * t) * 0.2;
      const rumble = Math.sin(2 * Math.PI * 24 * t) * 0.2;
      const valvetrain = (Math.sin(2 * Math.PI * 1800 * t) * (Math.random() > 0.85 ? 0.08 : 0));
      return (pulse * 0.5 + sub + h2 + h3 + rumble + valvetrain) * 0.65;
    }
  },

  // 6. S58 Low RPM (1800 RPM -> f0 = 90 Hz, 3 firings = 270 Hz)
  'engine_s58_low_rpm.wav': {
    duration: 2.5,
    fn: (t) => {
      const f = 90;
      const fire = Math.sin(2 * Math.PI * f * 3 * t) * 0.6;
      const h2 = Math.sin(2 * Math.PI * f * 6 * t) * 0.35;
      const h3 = Math.sin(2 * Math.PI * f * 9 * t) * 0.2;
      const exhaust = Math.sin(2 * Math.PI * (f * 1.5) * t) * 0.25;
      return (fire + h2 + h3 + exhaust) * 0.65;
    }
  },

  // 7. S58 Mid RPM (3500 RPM -> f0 = 175 Hz, 3 firings = 525 Hz)
  'engine_s58_mid_rpm.wav': {
    duration: 2.0,
    fn: (t) => {
      const f = 175;
      const fire = Math.sin(2 * Math.PI * f * 3 * t) * 0.65;
      const h2 = Math.sin(2 * Math.PI * f * 6 * t) * 0.4;
      const roar = Math.sin(2 * Math.PI * 180 * t) * 0.25;
      return (fire + h2 + roar) * 0.7;
    }
  },

  // 8. S58 High RPM (6500 RPM -> f0 = 325 Hz, 3 firings = 975 Hz)
  'engine_s58_high_rpm.wav': {
    duration: 2.0,
    fn: (t) => {
      const f = 325;
      const fire = Math.sin(2 * Math.PI * f * 3 * t) * 0.7;
      const h2 = Math.sin(2 * Math.PI * f * 6 * t) * 0.45;
      const scream = Math.sin(2 * Math.PI * f * 9 * t) * 0.3;
      return (fire + h2 + scream) * 0.75;
    }
  },

  // 9. V12 Engine Idle (800 RPM, 6 firings/rev = 80 Hz fundamental, 12-cyl smooth tone)
  'engine_v12_idle.wav': {
    duration: 3.0,
    fn: (t) => {
      const f0 = 40;
      const fire = Math.sin(2 * Math.PI * f0 * 6 * t) * 0.6; // 240 Hz
      const h2 = Math.sin(2 * Math.PI * f0 * 12 * t) * 0.35; // 480 Hz
      const smoothLow = Math.sin(2 * Math.PI * f0 * 2 * t) * 0.3;
      return (fire + h2 + smoothLow) * 0.6;
    }
  },

  // 10. V12 Engine High RPM (7000 RPM, exotic scream, 700 Hz fundamental)
  'engine_v12_high_rpm.wav': {
    duration: 2.0,
    fn: (t) => {
      const f = 350;
      const fire = Math.sin(2 * Math.PI * f * 6 * t) * 0.7; // 2100 Hz
      const h2 = Math.sin(2 * Math.PI * f * 3 * t) * 0.4;
      const soprano = Math.sin(2 * Math.PI * f * 12 * t) * 0.3;
      return (fire + h2 + soprano) * 0.75;
    }
  },

  // 11. Turbocharger spool up whistle (rising from 2.5 kHz to 6 kHz)
  'turbo_spool.wav': {
    duration: 2.0,
    fn: (t) => {
      const freq = 2500 + Math.pow(t / 2.0, 1.8) * 3500;
      const whistle = Math.sin(2 * Math.PI * freq * t) * 0.4;
      const airHiss = (Math.random() * 2 - 1) * 0.15 * (t / 2.0);
      return (whistle + airHiss) * Math.min(1.0, t * 1.5);
    }
  },

  // 12. Turbo Blow-Off Valve (BOV "pssshh-ch-ch")
  'turbo_blowoff.wav': {
    duration: 0.8,
    fn: (t) => {
      const hiss = (Math.random() * 2 - 1) * Math.exp(-t * 6);
      const flutter = Math.sin(2 * Math.PI * 22 * t) * 0.5 + 0.5;
      return hiss * flutter * 0.8;
    }
  },

  // 13. Exhaust crackle and overrun pops
  'exhaust_crackle.wav': {
    duration: 1.5,
    fn: (t) => {
      let pop = 0;
      const popTimes = [0.1, 0.28, 0.45, 0.72, 0.95, 1.15, 1.3];
      for (const pt of popTimes) {
        if (t >= pt && t < pt + 0.06) {
          const dt = t - pt;
          pop += (Math.random() * 2 - 1) * Math.exp(-dt * 60) * 0.8;
          pop += Math.sin(2 * Math.PI * 90 * dt) * Math.exp(-dt * 40) * 0.5;
        }
      }
      return pop;
    }
  },

  // 14. Engine shutdown (winding down)
  'engine_shutdown.wav': {
    duration: 1.6,
    fn: (t) => {
      const decay = Math.max(0, 1.0 - t / 1.6);
      const f = 37.5 * decay;
      return Math.sin(2 * Math.PI * f * 3 * t) * decay * 0.7;
    }
  },

  // 15. Fault: Rod Knock (heavy metallic metallic thud at crank speed)
  'fault_knock.wav': {
    duration: 1.5,
    fn: (t) => {
      const cycle = t % 0.08;
      if (cycle < 0.02) {
        return Math.sin(2 * Math.PI * 180 * cycle) * Math.exp(-cycle * 180) * 0.9;
      }
      return 0;
    }
  },

  // 16. Fault: Belt squeal (high-pitched friction warble)
  'fault_belt_squeal.wav': {
    duration: 2.0,
    fn: (t) => {
      const f = 3200 + Math.sin(2 * Math.PI * 18 * t) * 450;
      return Math.sin(2 * Math.PI * f * t) * 0.5;
    }
  },

  // 17. Fault: Cylinder Misfire (stumble dropouts)
  'fault_misfire.wav': {
    duration: 2.0,
    fn: (t) => {
      const f0 = 37.5;
      const dropout = (Math.sin(2 * Math.PI * 4 * t) > 0.4) ? 0.15 : 0.8;
      return Math.sin(2 * Math.PI * f0 * 3 * t) * dropout * 0.7;
    }
  },

  // 18. Tool: Ratchet clicks (crisp mechanical pawl detents)
  'tool_ratchet.wav': {
    duration: 0.6,
    fn: (t) => {
      const cycle = t % 0.05;
      if (cycle < 0.008) {
        return (Math.random() * 2 - 1) * Math.exp(-cycle * 600) * 0.8;
      }
      return 0;
    }
  },

  // 19. Tool: Torque wrench click (definitive cam slip impulse)
  'tool_torque_click.wav': {
    duration: 0.4,
    fn: (t) => {
      if (t < 0.06) {
        return Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 80) * 0.95;
      }
      return 0;
    }
  },

  // 20. Tool: Impact wrench (pneumatic hammer staccato)
  'tool_impact.wav': {
    duration: 0.8,
    fn: (t) => {
      const cycle = t % 0.055;
      if (cycle < 0.02) {
        const hammer = Math.sin(2 * Math.PI * 450 * cycle) * Math.exp(-cycle * 120);
        const air = (Math.random() * 2 - 1) * 0.3;
        return (hammer + air) * 0.85;
      }
      return (Math.random() * 2 - 1) * 0.1;
    }
  },

  // 21. Hydraulic Lift Hum
  'lift_hydraulic_hum.wav': {
    duration: 3.0,
    fn: (t) => {
      const hum = Math.sin(2 * Math.PI * 60 * t) * 0.5 + Math.sin(2 * Math.PI * 120 * t) * 0.3;
      const fluid = Math.sin(2 * Math.PI * 850 * t) * 0.15;
      return (hum + fluid) * 0.6;
    }
  }
};

console.log('Generating PCM WAV audio sample assets...');
for (const [filename, def] of Object.entries(audioDefs)) {
  const filePath = path.join(OUTPUT_DIR, filename);
  const buf = createWavBuffer(sampleRate, def.duration, def.fn);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated: ${filename} (${buf.length} bytes, ${def.duration}s)`);
}
console.log('All audio sample files created successfully.');
