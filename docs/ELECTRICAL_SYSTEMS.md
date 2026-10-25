# MECHVERSE — Phase 3: Automotive Electrical Engineering Subsystem
## Circuit Physics, Battery Simulation, Digital Multimeter & Diagnostic Missions

---

## 1. Executive Architecture Overview

MECHVERSE Phase 3 implements an automotive electrical simulation subsystem where players troubleshoot real simulated circuits using an interactive digital multimeter (DMM). Rather than using hardcoded scripted readings, all node potentials, branch currents, and power dissipations are calculated deterministically from underlying circuit topology, physical component resistances, and battery electrochemical state.

The electrical subsystem is located in `clients/workshop-prototype/src/` and mirrored in the Unreal Engine 5 C++ scaffold under `Source/Mechverse/ElectricalSystems/`:

- `circuit-solver.js` — Direct Current (DC) linear circuit solver implementing Modified Nodal Analysis (MNA).
- `battery-model.js` — Thevenin-equivalent automotive SLI lead-acid and commercial 24V battery model.
- `electrical-components.js` — Physical conductor wire resistance ($\rho \cdot L / A$), blade fuses, ground straps, and harness connectors.
- `electrical-system.js` — Full vehicle electrical network (battery, starter, distribution bus, ignition switch, accessories, lighting, ground paths).
- `multimeter-system.js` — Realistic automotive digital multimeter with 10 M$\Omega$ input impedance, lead jack routing, continuity beeper, and 10A fuse overload mechanics.
- `electrical-faults.js` — Injection and repair of realistic faults (high-resistance grounds, blown fuses, parasitic drains, corroded terminals, open wires, weak batteries).
- `electrical-missions.js` — Interactive diagnostic missions framework supporting customer complaints, evidence recording, root-cause diagnosis, repair actions, and post-repair measurement verification.

---

## 2. Real Electrical Circuit Solver

### 2.1 Governing Physical Laws
The circuit solver enforces:
1. **Ohm's Law:**
   $$V = I \cdot R \quad \iff \quad I = G \cdot V \quad \text{where } G = \frac{1}{R}$$
2. **Kirchhoff's Current Law (KCL):**
   $$\sum_{k} I_{\text{in}, k} = \sum_{k} I_{\text{out}, k} \quad \text{at every node}$$
3. **Kirchhoff's Voltage Law (KVL):**
   $$\sum_{k} V_{\text{drops}, k} = 0 \quad \text{around every closed mesh}$$
4. **Joule's Power Dissipation:**
   $$P = V \cdot I = I^2 \cdot R = \frac{V^2}{R}$$

### 2.2 Mathematical Formulation (Modified Nodal Analysis)
The circuit is represented by the linear matrix system:
$$\begin{bmatrix} \mathbf{G} & \mathbf{B} \\ \mathbf{C} & \mathbf{D} \end{bmatrix} \begin{bmatrix} \mathbf{v} \\ \mathbf{j} \end{bmatrix} = \begin{bmatrix} \mathbf{i} \\ \mathbf{e} \end{bmatrix}$$
Where:
- $\mathbf{G}$ is the $n \times n$ nodal conductance matrix.
- $\mathbf{B}$ and $\mathbf{C}$ are $n \times m$ connection matrices for independent voltage sources ($\mathbf{C} = \mathbf{B}^T$ for independent sources).
- $\mathbf{D}$ is an $m \times m$ zero matrix for ideal voltage sources.
- $\mathbf{v}$ is the vector of unknown node voltages relative to reference `GND` ($0.0\text{ V}$).
- $\mathbf{j}$ is the vector of currents delivered by independent voltage sources.
- $\mathbf{e}$ is the vector of voltage source setpoints.

A minimal shunt conductance ($G_{\text{min}} = 10^{-12}\ \Omega^{-1}$) to ground is injected into every node to ensure topological stability and prevent matrix singularity when probing floating or disconnected circuit branches. The system is solved using Gaussian elimination with scaled partial row pivoting.

---

## 3. Thevenin-Equivalent Automotive Battery Model

### 3.1 Terminal Voltage Equation
The battery is modeled as a loaded Thevenin voltage source:
$$V_{\text{terminal}} = V_{\text{OC}}(\text{SOC}) - I_{\text{discharge}} \cdot R_{\text{internal}}$$
Where:
- $V_{\text{OC}}(\text{SOC})$ is the open-circuit electrochemical potential.
- $R_{\text{internal}}$ is effective internal resistance including plate sulfation and terminal post corrosion:
  $$R_{\text{internal}} = R_{\text{healthy}} \cdot \left(1 + \frac{100 - \text{SOH}}{100} \cdot 8.0\right) + R_{\text{terminal\_corrosion}}$$

### 3.2 State of Charge (SOC) to $V_{\text{OC}}$ Characteristic Curve
For 12V SLI lead-acid chemistry at 20°C:
- $\text{SOC} = 1.00 \ (100\%) \implies V_{\text{OC}} = 12.72\text{ V}$
- $\text{SOC} = 0.75 \ (75\%) \implies V_{\text{OC}} = 12.45\text{ V}$
- $\text{SOC} = 0.50 \ (50\%) \implies V_{\text{OC}} = 12.20\text{ V}$
- $\text{SOC} = 0.25 \ (25\%) \implies V_{\text{OC}} = 12.00\text{ V}$
- $\text{SOC} = 0.00 \ (0\%) \implies V_{\text{OC}} = 11.80\text{ V}$

### 3.3 Dynamic Coulomb Counting & Charging Efficiency
$$\Delta \text{SOC} = -\frac{I \cdot \Delta t}{3600 \cdot C_{\text{Ah}}}$$
During charging ($I < 0$), an efficiency coefficient ($\eta = 0.88$) is applied to model electrochemical overpotential and gassing losses.

### 3.4 Starter Cranking Dynamics
During cranking, the starter motor draws:
$$I_{\text{crank}} = \frac{V_{\text{OC}}}{R_{\text{internal}} + R_{\text{starter}} + R_{\text{ground\_strap}}}$$
A healthy starter draws 120–150A, causing terminal voltage to sag from 12.65V to ~10.4V (above the critical 9.6V SAE minimum). If the engine ground strap is corroded ($0.45\ \Omega$), current collapses, ground-side drop exceeds 4.0V, and the starter fails to turn over.

---

## 4. Digital Multimeter (DMM) Engineering Rules

| Mode | Input Jack | Input Impedance / Burden | Behavior / Educational Safety Rules |
| :--- | :--- | :--- | :--- |
| **OFF** | Any | High | Display deactivated; saves battery. |
| **DC Volts** | `V_OHM` | $10\text{ M}\Omega$ | High-impedance potential difference ($V_{\text{red}} - V_{\text{black}}$). Does not disturb circuit. Reject if red lead is plugged into 10A current jack. |
| **Resistance ($\Omega$)** | `V_OHM` | Active test current | **Strict Power Rejection:** If circuit has live voltage ($>0.25\text{ V}$), displays `ERR: POWER ON` and refuses reading to protect meter. Displays `O.L` if open. |
| **Continuity** | `V_OHM` | Threshold: $30\ \Omega$ | Auditory and visual beep if $R \le 30\ \Omega$. Displays `O.L (OPEN)` if path is broken. Rejects live circuits. |
| **DC Amps** | `A_10A` | $0.01\ \Omega$ shunt | **Must be inserted in series.** Connecting across battery rails blows the internal 10A ceramic fuse (`FUSE BLOWN`). Measurements fail until fuse is replaced. |

---

## 5. Supported Electrical Faults

1. **High-Resistance Engine Ground Strap (`FAULT_HIGH_RES_GROUND`):**
   Corroded braided strap creates $0.45\ \Omega$ parasitic resistance. Resting battery voltage appears normal (~12.6V), but starter cranking creates $>4.0\text{ V}$ ground-side drop between engine block and chassis.
2. **Blown Auxiliary Fuse (`FAULT_BLOWN_AUX_FUSE`):**
   15A blade fuse open. 12V arrives at fuse input bus, but 0V output. Isolated continuity check reads `O.L`.
3. **Parasitic Battery Drain (`FAULT_PARASITIC_DRAIN`):**
   Stuck interior door jamb switch draws ~0.75A continuously when parked, depleting battery SOC to near zero overnight.
4. **Corroded Harness Connector (`FAULT_CORRODED_CONNECTOR`):**
   Contact resistance of $3.8\ \Omega$ creates $>3.5\text{ V}$ voltage drop under headlight load, causing dim, flickering illumination.
5. **Damaged Wire (`FAULT_DAMAGED_WIRE`):**
   Severed copper conductor creates complete open circuit.
6. **Weak Battery (`FAULT_WEAK_BATTERY`):**
   Plate sulfation degrades capacity (65Ah $\to$ 22Ah) and inflates internal resistance (15m$\Omega$ $\to$ 140m$\Omega$). Cranking voltage collapses to $<8.5\text{ V}$.

---

## 6. Diagnostic Missions Framework

The mission system evaluates diagnostic evidence, root-cause diagnosis, physical repair, and operational verification:
- **Mission 1: The Slow-Cranking Vehicle** — Diagnosing high-resistance ground strap via cranking voltage drop test.
- **Mission 2: Dead Auxiliary Lights** — Diagnosing blown fuse via input/output voltage and continuity checks.
- **Mission 3: Battery Drains Overnight** — Locating parasitic draw with series ammeter and accelerated 12-hour simulation.
- **Mission 4: Dim & Intermittent Headlight** — Diagnosing contact corrosion across harness pin connector.
