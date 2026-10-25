# MECHVERSE — Automotive Electrical Diagnostic Testing Guide
## Manual Testing Procedures for the 3D Workshop & Multimeter

This guide explains how automotive electrical engineers and workshop players manually verify and diagnose electrical circuits in MECHVERSE using the interactive Digital Multimeter (DMM).

---

### Procedure 1: Measuring Resting Battery Voltage
1. Select the **Digital Multimeter (DMM)** tool from the workshop equipment panel.
2. Ensure the rotary dial is set to **`V DC`** and the red lead jack is set to **`V / Ω`**.
3. In the probe selectors, set:
   - **RED PROBE (+):** `BAT_POS`
   - **BLACK PROBE (−):** `BAT_NEG` (or `GND`)
4. Confirm ignition is **`OFF`**.
5. Click **⚡ Read Value**.
6. **Expected Observation:** Healthy lead-acid battery reads between **12.60 V** and **12.75 V DC**. Readings below 12.20 V indicate discharge; below 11.80 V indicates severe depletion.

---

### Procedure 2: Measuring Battery Voltage Sag Under Cranking Load
1. Keep the multimeter probes on **`BAT_POS`** and **`GND`** in **`V DC`** mode.
2. In the Cockpit Electrical panel, switch the Ignition Key to **`START`** (engaging starter motor).
3. Read the DMM display during cranking.
4. **Expected Observation:**
   - **Healthy Battery & Starter:** Voltage sags to **10.2 V – 10.8 V DC** (above SAE 9.6V threshold).
   - **Sulfated / Weak Battery:** Voltage collapses below **8.5 V DC**, indicating high internal cell resistance.
   - Return ignition to **`OFF`** after the test.

---

### Procedure 3: Voltage-Drop Testing Across Engine Ground Strap
*This is the gold-standard test for diagnosing slow-cranking engines caused by bad grounds.*
1. Set DMM mode to **`V DC`**.
2. Connect probes across the ground return conductor:
   - **RED PROBE (+):** `ENGINE_BLOCK` (starter motor ground return)
   - **BLACK PROBE (−):** `GND` (chassis ground stud)
3. With ignition **`OFF`**, the reading is **0.00 V DC** (no current flowing).
4. Switch ignition to **`START`** so ~140A flows through the ground strap.
5. Click **⚡ Read Value**:
   - **Healthy Ground Strap ($R = 0.002\ \Omega$):** Reading is **0.25 V – 0.28 V DC** (< 350 mV SAE limit).
   - **Faulty / Corroded Ground Strap ($R = 0.45\ \Omega$):** Reading exceeds **4.0 V DC**, proving that electrical energy is being dissipated across the corroded strap rather than spinning the starter!

---

### Procedure 4: Fuse Continuity Check on De-Energized Circuit
1. Set DMM mode to **`))) CONT`** (Continuity).
2. Set probes across the fuse terminals:
   - **RED PROBE:** `FUSED_MAIN_BUS`
   - **BLACK PROBE:** `AUX_FUSE_OUT`
3. **Safety Warning:** If circuit is energized, meter will block test and display **`ERR: POWER ON`**. Ensure ignition is **`OFF`** and battery disconnected if testing live bus.
4. **Expected Observation:**
   - **Intact Fuse:** DMM emits a continuous beep, beeper icon illuminates, and display shows `< 0.1 Ω (BEEP)`.
   - **Blown Fuse:** Display reads **`O.L (OPEN)`** with no sound, confirming broken fusible element.

---

### Procedure 5: Detecting a Blown Fuse Under Load
1. Turn vehicle ignition to **`ON`** and toggle **Fog / Aux Lights** to **`ON`**.
2. Set DMM to **`V DC`**.
3. Connect **BLACK PROBE** to `GND`.
4. Measure fuse input: **RED PROBE** to `FUSED_MAIN_BUS` $\implies$ Reads **~12.5 V DC** (power present).
5. Measure fuse output: **RED PROBE** to `AUX_FUSE_OUT` $\implies$ Reads **0.00 V DC**.
6. The presence of full system voltage upstream and zero voltage downstream confirms an open/blown fuse.

---

### Procedure 6: Measuring Parasitic Battery Drain in Series
1. Turn ignition **`OFF`** and close all doors.
2. In DMM controls, switch red lead jack to **`10A Current (Series Only)`**.
3. Turn DMM dial to **`10A DC`**.
4. Simulate disconnecting battery negative and inserting meter in series:
   - **RED PROBE:** `BAT_NEG`
   - **BLACK PROBE:** `GND`
5. Click **⚡ Read Value**:
   - **Normal Vehicle State:** Total quiescent drain is **< 0.050 A (50 mA)**.
   - **Parasitic Drain Active (Stuck Dome Light):** Display reads **0.75 A – 0.88 A DC**.
   - This excessive continuous draw will flatten a 65Ah battery in ~48 hours.

---

### Procedure 7: Triggering Meter Fuse Overload Protection
1. Keep DMM in **`10A DC`** mode with **`10A Current`** jack selected.
2. Connect probes directly across the high-current battery source:
   - **RED PROBE:** `BAT_POS`
   - **BLACK PROBE:** `GND`
3. Click **⚡ Read Value**.
4. **Expected Observation:**
   - Overcurrent through low-burden shunt blows the meter fuse.
   - LCD displays **`FUSE BLOWN`** with a red hazard warning.
   - Beeper icon sounds alert.
   - All subsequent current measurements are blocked.
5. Click **`Replace 10A Fuse`** to install a new ceramic fuse and restore multimeter functionality.

---

### Procedure 8: Voltage-Drop Testing Across Corroded Connector
1. Turn Headlights switch to **`ON`**.
2. Set DMM to **`V DC`**.
3. Connect probes across the harness connector pins:
   - **RED PROBE:** `HL_SW_OUT` (connector input pin)
   - **BLACK PROBE:** `HEADLIGHT_POS` (connector output pin to bulb)
4. Click **⚡ Read Value**:
   - **Clean Connector ($R = 0.005\ \Omega$):** Voltage drop is **< 0.05 V DC**.
   - **Corroded Pins ($R = 3.8\ \Omega$):** Voltage drop is **> 3.5 V DC**, starving the headlight bulb so it only receives ~8.5V.

---

### Procedure 9: Verifying Post-Repair Success
1. After completing a component repair (e.g. cleaning ground strap or replacing fuse), re-run the diagnostic measurement under identical operating conditions.
2. In the **Diagnostic Missions** drawer, click **Verify Post-Repair**.
3. The automated diagnostic grading system re-evaluates circuit physics and confirms whether customer complaint symptoms have been resolved.
4. Successful verification awards 100/100 score and updates the vehicle electrical roadworthiness condition.
