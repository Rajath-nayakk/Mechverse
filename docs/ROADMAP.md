# MECHVERSE: Development Roadmap

## Overview
This roadmap outlines the phased progression of MECHVERSE from foundational prototype to a comprehensive AAA-grade automotive engineering and workshop simulator. Every phase produces an independently testable and verifiable deliverable.

---

### Phase 1: Foundation (Current Phase)
- **Objective:** Establish the modular architecture, directory layout, version control, launchable prototype, camera/movement, object selection, inspection interface, and initial interactive mechanical component.
- **Deliverables:**
  - Launchable workshop environment prototype.
  - Free/Orbit/First-person camera controls and player navigation.
  - Interactive component raycasting and selection highlight.
  - Component inspection HUD (ID, specs, torque requirements, condition).
  - First interactive mechanical component (e.g., Oil filter / Wheel assembly with fasteners).
  - Automated unit test suite verifying interaction and fastener rules.
  - Git repository with buildable initial commit.

---

### Phase 2: Component Interaction & Fastener Mechanics (Completed)
- **Objective:** Complete component graph model, tool selection, socket sets, torque wrench mechanics, and assembly prerequisites.
- **Deliverables:**
  - [x] Socket set integration (10, 13, 17, 19, 21, 24 mm) with drive size validation.
  - [x] Fastener torque verification, clamping force ($F = T / (K \cdot d)$), and yield/strip limits.
  - [x] Component hierarchy attachment/detachment DAG validator with prerequisites.
  - [x] Surface-aware contamination and detailing system (foam cannon, pressure jet, degreaser, vacuum).
  - [x] 12-category vehicle condition model and roadworthiness inspection.

---

### Phase 3: Electrical Engineering Laboratory (Completed)
- **Objective:** Detailed low-voltage (12V/24V) electrical simulation, circuit physics, battery electrochemical model, interactive digital multimeter, and playable diagnostic missions.
- **Deliverables:**
  - [x] **Deterministic DC Circuit Solver:** Modified Nodal Analysis (MNA), Ohm's Law, KCL, KVL, nonzero wire resistance, fuses, switches, and ground straps.
  - [x] **Automotive Battery Model:** Thevenin equivalent circuit ($V_{\text{terminal}} = V_{\text{OC}} - I \cdot R_i$), calibrated lead-acid SOC curve, dynamic Coulomb counting, charging efficiency, and starter cranking sag.
  - [x] **Interactive Digital Multimeter (DMM):** True RMS automotive DMM interface with DC Volts (10 M$\Omega$ impedance), Resistance with live power hazard rejection, Continuity beeper ($30\ \Omega$ threshold), and 10A DC series current with fuse overload protection.
  - [x] **Electrical Fault Injection:** High-resistance ground straps, blown auxiliary blade fuses, overnight parasitic draws, corroded harness connectors, severed wires, and weak batteries.
  - [x] **Diagnostic Missions Framework:** 4 Playable troubleshooting missions (Slow-Cranking Engine, Dead Aux Lights, Overnight Battery Drain, Dim Headlamp) with evidence logging, diagnosis submission, physical repair, and post-repair measurement verification.
  - [x] **Workshop 3D Integration:** Battery with terminals, braided ground strap, fuse box, starter motor, headlamp assembly, cockpit switch panel, and floating DMM HUD.
  - [x] **Unreal Engine 5 Scaffold:** C++ architecture under `Source/Mechverse/ElectricalSystems/`.
  - [x] **Automated Testing:** 57 passing automated unit tests covering circuits, batteries, meters, faults, missions, fasteners, and cleaning.

---

### Phase 4: Mechanical Service & Routine Maintenance
- **Objective:** Workshop equipment mechanics and routine fluid service workflows.
- **Deliverables:**
  - Functional 2-post hydraulic vehicle lift with safety lock mechanism.
  - Wheel and tire dismounting, hub inspection, brake disc runout.
  - Complete engine oil service workflow: drain plug removal, oil drainage physics, filter replacement, torque specification, fresh oil refill and level check.
  - Vehicle maintenance log and service history generation.

---

### Phase 5: Engine Simulation & Crank Kinematics
- **Objective:** Detailed four-stroke internal combustion engine model.
- **Deliverables:**
  - Slider-crank kinematic calculations: piston displacement, velocity, acceleration.
  - Valve timing, cam profiles, and airflow ingestion models.
  - Starter motor engagement, cranking torque vs compression resistance.
  - Lubrication circuit pressure map and oil temperature thermal balance.
  - Engine fault simulation: misfire, low compression, clogged filter, sensor failures.

---

### Phase 6: Drivetrain, Brakes & Suspension
- **Objective:** Auxiliary mechanical systems and physical influence on vehicle behaviour.
- **Deliverables:**
  - Clutch torque capacity and manual gearbox gear ratio multipliers.
  - Hydraulic brake circuit pressure, pad friction vs temperature, fade behavior.
  - Damper valving (bump/rebound curves) and spring rate kinematics.
  - Steering rack geometry and wheel alignment (toe, camber, caster).

---

### Phase 7: Vehicle Assembly & Testing Grounds
- **Objective:** Full vehicle integration, chassis dynamometer, and test track.
- **Deliverables:**
  - Whole-vehicle assembly from chassis up.
  - Chassis dynamometer measuring wheel horsepower and torque curves.
  - Brake roller tester measuring brake force balance and ovality.
  - Controlled test track for handling, braking distance, and acceleration validation.

---

### Phase 8: Buses & Commercial Vehicles
- **Objective:** Heavy-duty commercial vehicle engineering.
- **Deliverables:**
  - Heavy-duty diesel powertrain and turbocharger boost modeling.
  - Dual-circuit pneumatic (air) braking system: compressor, air tanks, treadle valve, S-cam/air disc actuators.
  - 24V electrical architecture and commercial vehicle diagnostics.

---

### Phase 9: Hybrid & Electric Vehicles (EV)
- **Objective:** High-voltage powertrain and electrical safety protocols.
- **Deliverables:**
  - Traction battery pack (lithium-ion cell chemistry, thermal runaway modeling).
  - Inverter, permanent-magnet synchronous motor (PMSM), regenerative braking.
  - High-voltage isolation verification procedure and Personal Protective Equipment (PPE) safety locks.

---

### Phase 10: Educational Platform & Companion Systems
- **Objective:** Structured curriculum, missions, assessments, and companion services.
- **Deliverables:**
  - Levels 1 through 12 engineering curriculum.
  - Instructor mission editor and student grading telemetry.
  - Java 21 / Spring Boot companion backend.
  - Responsive web companion dashboard with interactive schematics.

---

### Phase 11: Validation, Performance & Release
- **Objective:** Simulation validation against experimental data, optimization, and packaging.
- **Deliverables:**
  - Empirical validation of simulation formulas against engineering bench datasets.
  - CPU/GPU profiling, LOD optimization, and multithreaded physics ticks.
  - Continuous integration pipeline and release packaging.
