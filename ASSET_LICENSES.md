# MECHVERSE Asset Licenses

This document tracks all external 3D models, textures, audio, and third-party assets used in MECHVERSE, including author attribution and license details.

---

## 3D Vehicle Models

### BMW M4 Competition (G82) M Package
- **File Path:** `clients/workshop-prototype/assets/models/bmw_m4.glb`
- **Asset Title:** BMW M4 Competition M Package
- **Author:** 𝙎𝙍𝙏 𝙋𝙚𝙧𝙛𝙤𝙢𝙖𝙣𝙘𝙚™ ([Sketchfab Profile](https://sketchfab.com/TheRealSRT))
- **Source:** [Sketchfab Model Page](https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b) / [Direct Model Showcase Link](https://skfb.ly/oyM8P)
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **License Summary:** Free to share and adapt for any purpose, including commercially, provided appropriate credit is given with a link to the license and indicating if changes were made.
- **Embedded Metadata (`asset.extras`):**
  ```json
  {
    "author": "𝙎𝙍𝙏 𝙋𝙚𝙧𝙛𝙤𝙢𝙖𝙣𝙘𝙚™ (https://sketchfab.com/TheRealSRT)",
    "license": "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
    "source": "https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b",
    "title": "BMW M4 Competition M Package"
  }
  ```
- **Structure & Node Breakdown:**
  - `BodyParts_1` (`Object_4` to `Object_30`): Exterior body panels, front kidney grilles, radiator core, headlights, taillights, glass windows, interior dash/cabin, and BMW M roundels.
  - `WHeelsandrims_2` (`Object_32` to `Object_34`): Alloy wheels, brake calipers, and tires.

---

## Audio Assets

### Engine, Ignition, Turbo, Faults, and Tool Acoustic Samples
- **Location:** `clients/workshop-prototype/assets/audio/`
- **Format:** 44.1 kHz, 16-Bit Mono RIFF PCM Wave (.wav)
- **Files:**
  - Ignition & Starting: `ignition_on.wav`, `starter_crank_normal.wav`, `starter_crank_slow.wav`, `starter_click_relay.wav`
  - BMW S58 Twin-Turbo I6: `engine_s58_idle.wav`, `engine_s58_low_rpm.wav`, `engine_s58_mid_rpm.wav`, `engine_s58_high_rpm.wav`
  - V12 Engine Swap: `engine_v12_idle.wav`, `engine_v12_high_rpm.wav`
  - Turbo & Exhaust Dynamics: `turbo_spool.wav`, `turbo_blowoff.wav`, `exhaust_crackle.wav`, `engine_shutdown.wav`
  - Fault Acoustics: `fault_knock.wav`, `fault_belt_squeal.wav`, `fault_misfire.wav`
  - Workshop Tools & Lift: `tool_ratchet.wav`, `tool_torque_click.wav`, `tool_impact.wav`, `lift_hydraulic_hum.wav`
- **Author & Origin:** MECHVERSE Acoustic Engineering Laboratory / Procedural PCM Engine
- **License:** [Creative Commons Zero 1.0 Universal (CC0 1.0) / Public Domain](https://creativecommons.org/publicdomain/zero/1.0/)

