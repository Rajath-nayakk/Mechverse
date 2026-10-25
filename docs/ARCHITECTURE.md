# MECHVERSE: System Architecture Specification
## Ultimate Automotive Engineering, Vehicle Construction, Diagnostics & Garage Simulation

---

### 1. Architectural Philosophy and Principles
MECHVERSE is designed as an extensible, multi-tiered automotive engineering simulator. It explicitly rejects superficial "mini-game" mechanics in favor of modular, causal, physics-and-engineering-grounded simulation.

The architecture strictly adheres to the following principles:
- **Separation of Concerns:** Strict decoupling between Presentation (Rendering, UI, Audio), Gameplay Interaction (Tools, Cameras, Inventories), and Physical Simulation State (Kinematics, Thermodynamics, Electrical circuits).
- **Component-Level Hierarchy:** Every vehicle is a Directed Acyclic Graph (DAG) of mechanical, electrical, and fluid components.
- **Physical Causality:** Actions produce physical consequences. Loose fasteners cause vibrations and detachment; inadequate oil leads to hydrodynamic bearing failure; disconnected ground straps cause voltage drops and signal degradation.
- **Explicit Fidelity Grading:** Every system is formally labeled under Level A (Educational Approximation), Level B (Calibrated Engineering), or Level C (Rigorous Multi-body/Continuum Research).

---

### 2. Multi-Tier Technology Stack
1. **Unreal Engine 5 (UE5) + C++ (Primary Simulation & Native 3D Client):**
   - High-performance deterministic update loops for mechanics, vehicle kinematics, and physics adapters.
   - PBR rendering, Nanite geometry for mechanical sub-assemblies, and Lumen dynamic lighting for workshop bay environments.
2. **Interactive 3D Simulation Prototype (WebGL / Three.js / Canvas):**
   - Lightweight, dependency-free interactive 3D client for rapid testing, prototyping, and cross-platform verification of mechanical hierarchies, camera controls, tool interaction, and fastener logic.
3. **Java 21 / Spring Boot (Optional Companion Backend & Educational LMS):**
   - Learning records store (xAPI/SCORM compatible), instructor dashboards, telemetry ingestion, vehicle service history records, and cloud progress persistence.
4. **HTML5 / CSS / TypeScript (Companion Web Dashboard):**
   - Interactive wiring schematics, technical service bulletins (TSB), dynamometer run comparisons, and student evaluation interfaces.

---

### 3. Module Breakdown (24 Decoupled Subsystems)
The simulation architecture is partitioned into 24 loosely coupled modules:

1. **CoreGame:** Core game state, time management (fixed physics delta-t vs variable render delta-t), event buses.
2. **VehicleFramework:** Component base classes, attachment sockets, hierarchical graphs, validation rules.
3. **VehiclePhysics:** Adapter layer mapping mechanical components to vehicle dynamics (mass matrix, inertia tensor, suspension kinematics).
4. **EngineSimulation:** Four-stroke thermodynamics, slider-crank kinematics, torque production, combustion models.
5. **MechanicalSystems:** Fasteners, threads, torque yield limits, gear meshes, bearing surfaces.
6. **ElectricalSystems:** Kirchhoff voltage/current network solver, battery electrochemical state, parasitic draws, harness routing.
7. **FuelSystems:** Tank, pump delivery curves, pressure regulators, rail dynamics, injector pulse-width calculations.
8. **ThermalSystems:** Heat transfer matrices (conduction, convection, radiation) across coolant, oil, and block metal.
9. **TransmissionSystems:** Clutches, torque converters, planetary/manual gearsets, differential torque distribution.
10. **BrakeSystems:** Hydraulic pressure propagation, caliper piston force, friction coefficients vs pad temperature.
11. **SuspensionSystems:** Multi-link/MacPherson kinematics, spring rates, damper valving curves, bushing compliance.
12. **DiagnosticSystems:** Fault-injection engine, OBD-II DTC management, sensor noise, live PID data streaming.
13. **WorkshopTools:** Ratchets, torque wrenches, impact guns, fluid extractors, bearing presses, lift controls.
14. **VehicleAssembly:** Assembly/disassembly sequencing, collision envelopes, prerequisite enforcement.
15. **DamageAndWear:** Tribological wear models, thermal fatigue, contamination factors, maintenance counters.
16. **InventoryAndParts:** Part catalogs, OEM vs aftermarket specs, bin storage, parts cleaning status.
17. **MissionSystem:** Step-by-step educational missions, diagnostic troubleshooting scenarios, scoring rubrics.
18. **EngineeringLearning:** Interactive technical explainers, cutaway visualizations, physics principles documentation.
19. **GarageEnvironment:** Workshop physical layout, hydraulic lifts, dyno rollers, workbench zones, lighting controls.
20. **UIAndInteraction:** Raycast interaction, radial tool menus, inspection HUDs, digital measurement readouts.
21. **SaveAndLoad:** Schema-versioned JSON/Binary serialization of vehicle graphs, fluid states, and workshop progress.
22. **AutomatedTesting:** Unit test runners, physics regression harnesses, headless simulation verification.
23. **OptionalJavaBackend:** REST/WebSocket service for student records, instructor management, cloud telemetry.
24. **OptionalWebDashboard:** Visual analytics, interactive wiring diagrams, dynamometer chart overlays.

---

### 4. Component Graph Data Model
Every component inherits from a common foundation:
```
ComponentNode
├── GUID: UUID
├── PartNumber: String
├── Name: String
├── Category: Enum (Engine, Drivetrain, Suspension, Electrical, Fastener, etc.)
├── MassKg: Float
├── PhysicalDimensions: Vector3
├── FastenerInfo: Struct (Type, Size, Pitch, Grade, TargetTorqueNm, CurrentTorqueNm)
├── ParentSocket: SocketReference
├── ChildSockets: Array<SocketReference>
├── Prerequisites: Array<ComponentRequirement>
├── WearState: Float (0.0 = New, 1.0 = Completely Failed)
├── ElectricalPorts: Array<ElectricalPort>
└── FluidPorts: Array<FluidPort>
```

---

### 5. Interaction and Fastener Mechanics
1. **Tool Compatibility:** A fastener requires exact drive match (e.g., Hex 17mm socket on a 1/2" drive ratchet).
2. **Torque Application:** Fasteners model clamping force as a function of torque and thread pitch:
   $$F_{clamp} = \frac{T}{K \cdot d}$$
   where $T$ is applied torque, $K$ is the torque coefficient (friction factor ~0.20 dry, ~0.15 lubricated), and $d$ is nominal diameter.
3. **Removal Sequence:** Removing a component enforces removal of all dependent fasteners and obstruction components.

---

### 6. Verification and Testability
All simulation logic is decoupled from rendering APIs. Calculations can be executed headlessly inside unit test runners (C++ GoogleTest, JUnit 5, and Node Test Runner) to guarantee mathematical accuracy and prevent regression.
