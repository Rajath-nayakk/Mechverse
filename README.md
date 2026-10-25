# MECHVERSE
## Ultimate Automotive Engineering, Vehicle Construction, Diagnostics, Restoration and Garage Simulation

MECHVERSE is an ambitious, modular automotive engineering simulator combining a high-fidelity 3D workshop environment, component-level vehicle assembly, physical fasteners and clamping dynamics, electrical network simulation, four-stroke thermodynamics, fluid servicing, body restoration (dent removal, scratch repair, painting), refueling, and structured educational missions.

---

### Project Architecture & Documentation
- [System Architecture Specification](file:///c:/Users/Rajath%20Nayak/OneDrive/Desktop/Mechverse/docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`)
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
  - Unreal Engine 5.4/5.5 and MSVC (`cl.exe`) / CMake are **not yet installed or not on system PATH**.
  - To enable the native UE5 client, install Visual Studio 2022 Community (Desktop development with C++ & Game development with C++) and Unreal Engine 5.4+ via the Epic Games Launcher (`winget install EpicGames.EpicGamesLauncher`).
  - In the interim, the project architecture has been fully scaffolded with Unreal Engine 5 C++ modules (`Mechverse.uproject`, `Source/`) alongside an immediately launchable, interactive 3D WebGL/Three.js simulation prototype.

---

### Quickstart: Running the 3D Prototype Locally

1. **Run the Automated Test Suite:**
   ```bash
   npm test
   ```
   *Executes 13 unit tests covering fastener clamping dynamics ($F = \frac{T}{K \cdot d}$), torque yield stripping, tool socket compatibility, DAG assembly prerequisites, refueling capacity, and the 12-category vehicle condition model.*

2. **Launch the 3D Workshop Simulation Prototype:**
   ```bash
   npm start
   ```
   Open your browser to `http://localhost:3000`.

---

### Prototype Features Implemented in Phase 1 Foundation
1. **Interactive 3D Workshop Environment:**
   - Concrete bay with yellow safety lines, structural I-beams, overhead lighting, steel workbench, and rollaway red tool chest.
   - Dual-column hydraulic vehicle lift with working raise (`1.6m`) and lower (`0.0m`) controls.
2. **Camera & Movement:**
   - `WASD` camera panning.
   - Right-click + drag orbit rotation around vehicle.
   - Mouse wheel zoom in/out.
   - Left-click raycast selection.
3. **Interactive Components:**
   - **Spin-On Oil Filter Canister:** M20x1.5 threads, 25.0 N·m target torque, seal ring condition.
   - **Front Right Wheel Assembly:** 18" alloy rim, radial tire, 5x 17mm lug nuts (120 N·m torque spec).
   - **Ventilated Brake Rotor:** Directional vented disc, requires wheel removal before dismounting.
   - **Fuel Filler Assembly:** Sealed filler door, threaded gas cap, 60L tank capacity, active refueling dispenser.
   - **Front Right Quarter Panel / Fender:** Stamped steel panel with 4.5mm dent, road grime, and paint scratch model.
4. **Workshop Tools:**
   - Inspection Probe.
   - 1/2" Torque Wrench (17mm & 24mm sockets) with interactive torque setting slider.
   - Pressure Washer / Degreaser (cleans components to 100%).
   - Suction Dent Puller (relaxes plastic dent curvature).
   - Fuel Dispenser Nozzle (+10L increments).
5. **Unified 12-Category Vehicle Condition Telemetry HUD:**
   - Real-time tracking of Mechanical, Electrical, Structural, Body, Paint, Cleanliness, and Roadworthy Safety Certification.
