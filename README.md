# MECHVERSE
## Ultimate Automotive Engineering, Vehicle Construction, Diagnostics, Restoration and Garage Simulation

MECHVERSE is an ambitious, modular automotive engineering simulator combining a high-fidelity 3D workshop environment, component-level vehicle assembly, physical fasteners and clamping dynamics, electrical network simulation, four-stroke thermodynamics, fluid servicing, body restoration (dent removal, scratch repair, painting), refueling, and structured educational missions.

---

### Project Architecture & Documentation
- [System Architecture Specification](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`)
- [Electrical Systems Engineering Specification](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ELECTRICAL_SYSTEMS.md) (`docs/ELECTRICAL_SYSTEMS.md`)
- [Electrical Manual Testing & Diagnostic Guide](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ELECTRICAL_TESTING_GUIDE.md) (`docs/ELECTRICAL_TESTING_GUIDE.md`)
- [Development Roadmap (Phases 1-11 & Stages 1-12)](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ROADMAP.md) (`docs/ROADMAP.md`)
- [Engineering Assumptions & System Fidelity](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ENGINEERING_ASSUMPTIONS.md) (`docs/ENGINEERING_ASSUMPTIONS.md`)

---

### Current Toolchain & Development Environment
An inspection of the host system indicates:
- **Operating System:** Windows 11 (64-bit)
- **Version Control:** Git `2.53.0.windows.2` (Initialized)
- **Node.js Runtime:** `v24.14.0` with npm `11.9.0` (Active)
- **Java SDK:** OpenJDK `21.0.12.1` (Temurin LTS active)
- **Unreal Engine 5 & C++ Toolchain:**
  - Unreal Engine 5.4/5.5 and MSVC (`cl.exe`) / CMake are **not installed or not on system PATH**.
  - All Unreal Engine 5 C++ classes for Phase 1, Phase 2, and Phase 3 have been scaffolded in `Source/Mechverse/` (`ElectricalSystems/`, `WorkshopTools/`, `VehicleComponents/`).
  - The immediately executable simulation target is the high-fidelity 3D WebGL/Three.js prototype in `clients/workshop-prototype/`.

---

### Quickstart: Running the 3D Prototype Locally

1. **Run the Automated Test Suite:**
   ```bash
   npm test
   ```
   *Executes 57 automated tests covering the Modified Nodal Analysis circuit solver, Thévenin battery model, starter cranking sag, digital multimeter probe safety, series current burden resistor and 10A fuse blowout, electrical fault injection, 4 diagnostic missions, fastener torque yield, tool sockets, DAG assembly prerequisites, interactive cleaning, and vehicle condition scoring.*

2. **Launch the 3D Workshop Simulation Prototype:**
   ```bash
   npm start
   ```
   Open your browser to `http://localhost:3000`.

---

### Features Implemented

#### Phase 1 & 2: Mechanical Workshop, Fasteners & Surface Care
1. **Interactive 3D Workshop Environment:**
   - Concrete bay with yellow safety lines, structural I-beams, overhead lighting, steel workbench, and rollaway red tool chest.
   - Dual-column hydraulic vehicle lift with working raise (`1.6m`) and lower (`0.0m`) controls.
2. **Camera & Movement:**
   - `WASD` camera panning.
   - Right-click + drag orbit rotation around vehicle.
   - Mouse wheel zoom in/out.
   - Left-click raycast selection.
3. **Interactive Mechanical Components & Fasteners:**
   - **Spin-On Oil Filter Canister:** M20x1.5 threads, 25.0 N·m target torque, seal ring condition.
   - **Front Right Wheel Assembly:** 18" alloy rim, radial tire, 5x 17mm lug nuts (120 N·m torque spec).
   - **Ventilated Brake Rotor:** Directional vented disc, requires wheel removal before dismounting.
   - **Fuel Filler Assembly:** Sealed filler door, threaded gas cap, 60L tank capacity, active refueling dispenser.
   - **Front Right Quarter Panel / Fender:** Stamped steel panel with 4.5mm dent, road grime, and paint scratch model.
4. **Workshop Tools:**
   - Inspection Probe.
   - 1/2" Torque Wrench (10mm, 13mm, 17mm, 19mm, 21mm, 24mm interchangeable sockets) with interactive torque setting slider.
   - Cleaning Systems: Foam Cannon, Pressure Washer, Vacuum Cleaner, Degreaser.
   - Suction Dent Puller.
   - Fuel Dispenser Nozzle (+10L increments).

#### Phase 3: Electrical Engineering Laboratory & Diagnostics
1. **Deterministic DC Circuit Solver:**
   - Solves node voltages and branch currents using Modified Nodal Analysis (MNA), Kirchhoff's Current Law (KCL), and Kirchhoff's Voltage Law (KVL).
   - Topological stabilization with $G_{\text{min}} = 10^{-12}\ \Omega^{-1}$ artificial conductance prevents numerical singularities on floating branches.
2. **Electrochemical Battery Simulation:**
   - Thévenin equivalent circuit ($V_{\text{terminal}} = V_{\text{OC}} - I \cdot R_{\text{internal}}$) supporting 12V and 24V automotive standards.
   - Coulomb-counting State of Charge (SOC) tracking with lead-acid open-circuit voltage discharge curve and 88% charge efficiency.
   - Starter cranking simulation: models 120A+ inductive inrush current, showing dynamic terminal voltage sag and engine block ground drops.
3. **Automotive Electrical Network:**
   - Battery positive/negative posts, engine braided copper ground strap, main distribution bus, ignition switch, cockpit lighting/accessory switches.
   - Blade fuse panel (Main 60A, Aux 15A, Headlights 15A, Dome 10A, Fuel Pump 15A) with real over-current blowout dynamics.
   - Starter solenoid and high-torque motor load grounded via engine block.
4. **Interactive Digital Multimeter (DMM):**
   - Rotary switch with 5 physical operating modes: `OFF`, `DC_VOLTS`, `RESISTANCE`, `CONTINUITY`, `DC_AMPS`.
   - Dual jack inputs: `V/Ω/CONT` high impedance input (10 M$\Omega$) and `10A FUSED` low burden input ($0.01\ \Omega$) protected by an internal fast-acting ceramic fuse.
   - **Real safety logic:** Disallows resistance or continuity measurements on live/energized circuits (`ERR: POWER ON`), warns against incorrect jack configuration (`ERR: JACK CONFIG`), and blows the 10A fuse if connected across voltage rails in current mode.
   - Red and black test probes selectable via 3D click targeting or ergonomic drop-down menus with 13 discrete test points across the chassis.
5. **Electrical Fault Injection & Diagnostic Missions:**
   - Faults: High-resistance ground strap, blown auxiliary fuse, overnight parasitic drain, corroded connector, damaged wiring, weak/sulfated battery.
   - **4 Playable Diagnostic Missions:**
     - **Mission 1: The Slow-Cranking Vehicle:** Diagnose excessive voltage drop on engine ground strap during cranking ($>4\text{ V}$ drop), repair strap, and verify normal cranking voltage.
     - **Mission 2: Dead Auxiliary Lights:** Verify symptom, probe fuse input vs. output, isolate circuit, test continuity, replace blown 15A blade fuse, and confirm auxiliary lamp power.
     - **Mission 3: Battery Drains Overnight:** Diagnose 0.45A parasitic drain on dome light circuit, isolate branch, repair faulty glovebox switch, run 8-hour time acceleration, and verify battery SOC stability.
     - **Mission 4: Dim Headlight & Corroded Connector:** Measure 4.8V drop across corroded headlamp pin connector, clean terminals, and verify restored 12.6V lamp terminal voltage.
6. **Unified 12-Category Vehicle Condition Telemetry HUD:**
   - Real-time tracking of Mechanical, Electrical, Structural, Body, Paint, Cleanliness, and Roadworthy Safety Certification.
   - Electrical faults dynamically reduce electrical condition and fail roadworthiness safety checks until properly repaired.
