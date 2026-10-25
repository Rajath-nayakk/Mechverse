# MECHVERSE: Engineering Assumptions & Model Fidelity Specification

This document details the fidelity classification of every simulated subsystem in MECHVERSE, distinguishing between:
1. **Level A (Educational / Calibrated Approximation):** Fast-executing, physically grounded surrogate models suitable for interactive garage gameplay and baseline diagnostics.
2. **Level B (Engineering Simulation):** Systems governed by classical physics equations (Navier-Stokes/Bernoulli 1D approximations, Kirchhoff laws, slider-crank kinematics, friction laws).
3. **Level C (Research-Grade / Continuum Models):** High-dimensional FEA/CFD/chemical-kinetic models reserved for offline analysis or high-performance compute threads.

---

### 1. Mechanical, Kinematic & Dynamic Systems
- **Slider-Crank Kinematics (Piston & Crankshaft):**
  - *Fidelity:* Level B (Real Analytical Equations).
  - *Model:* Exact closed-form geometric relation:
    $$s(\theta) = r \left( 1 - \cos\theta \right) + l \left( 1 - \sqrt{1 - \left(\frac{r}{l}\right)^2 \sin^2\theta} \right)$$
    where $r$ is crank radius, $l$ is connecting rod length, and $\theta$ is crank angle.
- **Engine Rotational Dynamics:**
  - *Fidelity:* Level B.
  - *Model:* $\Sigma T = T_{indicated} - T_{friction} - T_{pumping} - T_{load} = I_{effective} \cdot \alpha$.
  - Integrated via semi-implicit Euler / RK4 at fixed delta-t ($\Delta t \le 1.0\text{ ms}$).
- **Fasteners & Clamping Force:**
  - *Fidelity:* Level B.
  - *Model:* $F_{clamp} = \frac{T}{K \cdot d}$. Yield torque and thread stripping calculated from ISO 898-1 steel property classes (8.8, 10.9, 12.9).
- **Vehicle Dynamics & Weight Transfer:**
  - *Fidelity:* Level B (Non-linear tire Pacejka 'Magic Formula' approximation with dynamic normal load transfer).

---

### 2. Electrical & Diagnostic Systems
- **Direct Current (DC) Circuit Network:**
  - *Fidelity:* Level B.
  - *Model:* Kirchhoff's Current Law (nodal analysis matrix):
    $$\mathbf{G} \cdot \mathbf{V} = \mathbf{I}$$
    Accounts for contact resistance, wire gauge resistance ($\Omega/\text{m}$ per AWG/DIN standards), and blown fuse open-circuit discontinuities.
- **Battery Electrochemical Model:**
  - *Fidelity:* Level B (Thevenin equivalent circuit).
  - *Model:* Open-circuit voltage $V_{OC}(SOC)$ dynamic lookup + internal series resistance $R_0(T, SOC)$ + RC parallel transient branch for polarization.
- **Virtual Multimeter & Probe Interaction:**
  - *Fidelity:* Level B (Simulates meter internal impedance: $10\text{ M}\Omega$ on Volts, $0.01\text{ }\Omega$ shunt on Amps). Connecting in current mode across a voltage rail triggers virtual fuse blow.

---

### 3. Fluid & Refueling Systems
- **Fuel Flow & Rail Pressure:**
  - *Fidelity:* Level B (Lumped-parameter compressible flow & pump pressure-flow displacement curves).
- **Refueling & Tank Hydrostatics:**
  - *Fidelity:* Level B.
  - *Model:* Mass conservation: $\frac{dm}{dt} = \dot{m}_{in} - \dot{m}_{consumption} - \dot{m}_{leak}$. Real density variations by fuel type (Gasoline $\rho \approx 740\text{ kg/m}^3$, Diesel $\rho \approx 830\text{ kg/m}^3$).
- **Lubrication Circuit & Oil Viscosity:**
  - *Fidelity:* Level B.
  - *Model:* Hydrodynamic bearing lubrication via Walther equation for kinematic viscosity vs temperature:
    $$\log(\log(\nu + 0.7)) = A - B \cdot \log(T)$$
    Oil pressure $P_{rail} = \dot{V}_{pump} \cdot R_{hydraulic} - P_{relief}$.

---

### 4. Welding, Fabrication & Metallurgy
- **Weld Bead Deposition & Heat Input:**
  - *Fidelity:* Level A/B (Calibrated Rosenthal heat source approximation).
  - *Model:* Heat Input:
    $$H = \frac{\eta \cdot V \cdot I}{v_{travel}}$$
    where $\eta$ is process thermal efficiency (MIG $\approx 0.8$, TIG $\approx 0.6$, Stick $\approx 0.75$).
- **Defect Generation:**
  - Excessive travel speed or low current $\rightarrow$ lack of penetration.
  - Dirty surface (oil/rust) $\rightarrow$ hydrogen cracking and porosity.
  - High heat input on thin sheet $\rightarrow$ thermal distortion / burn-through.

---

### 5. Bodywork, Painting, Detailing & Surface Restoration
- **Dent Deformation & Panel Beating:**
  - *Fidelity:* Level A (Localized 2.5D radial displacement field & localized curvature strain tensor).
  - Hammer / dolly impacts iteratively relax plastic strain toward baseline curvature.
- **Paint Multi-Layer Model:**
  - *Fidelity:* Level B.
  - *Layers:* Substrate (Bare metal/plastic) $\rightarrow$ E-coat/Primer ($\approx 25\text{ }\mu\text{m}$) $\rightarrow$ Basecoat Color ($\approx 20\text{ }\mu\text{m}$) $\rightarrow$ Clearcoat ($\approx 40\text{ }\mu\text{m}$).
  - *Scratches:* Classified by depth penetration (Clearcoat scuff vs Primer exposure vs Bare metal rust vulnerability).
  - *Defects:* Overspray, orange peel (viscosity vs droplet size), runs (excess film build $>60\text{ }\mu\text{m}$ clearcoat).
- **Cleaning & Stain Tribology:**
  - *Fidelity:* Level A (Chemical compatibility matrix and abrasive grit mechanics).

---

### 6. Unified 12-Category Vehicle Condition Model
No single "health percentage" is used. The vehicle condition is tracked as a decoupled, multi-axial state vector:
1. `MechanicalCondition`: Wear indices of moving frictional parts, tolerances, clearances.
2. `ElectricalCondition`: Harness insulation degradation, contact corrosion, harness shorts/opens.
3. `StructuralCondition`: Frame rails, A/B/C pillars, crumple zones, weld joint integrity.
4. `BodyPanelCondition`: Dents, creases, panel gaps, hinge alignments.
5. `PaintCondition`: Film thickness, gloss reading (GU), orange peel factor, clearcoat health.
6. `InteriorCondition`: Upholstery stains, fabric tears, dashboard UV degradation.
7. `GlassCondition`: Chips, optical clarity, crack propagation under vibration.
8. `TireAndWheelCondition`: Tread depth (mm), radial runout, bead seal pressure.
9. `FluidCondition`: Viscosity, moisture content, particulate contamination percentage.
10. `CleanlinessCondition`: Contaminant mass (mud, grease, road salt, brake dust) per zone.
11. `MaintenanceHistory`: Immutable ledger of timestamped services, torque events, and technician IDs.
12. `SafetyInspectionStatus`: Roadworthiness certification boolean and compliance faults list.
