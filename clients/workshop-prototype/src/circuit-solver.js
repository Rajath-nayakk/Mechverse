/**
 * MECHVERSE - Deterministic Direct Current (DC) Circuit Solver
 * Implements Modified Nodal Analysis (MNA) for resistive and switching networks.
 *
 * Governing Equations:
 * - Ohm's Law: V = I * R  =>  I = G * V (G = 1/R)
 * - Kirchhoff's Current Law (KCL): sum(I_in) = sum(I_out) at every node.
 * - Kirchhoff's Voltage Law (KVL): sum(V_drops) = 0 around any closed mesh.
 */

export class CircuitSolver {
  constructor() {
    this.nodes = new Set(['GND']);
    this.resistors = []; // { id, nodeA, nodeB, resistance }
    this.voltageSources = []; // { id, nodePos, nodeNeg, voltage }
    this.switches = []; // { id, nodeA, nodeB, isOpen, closedResistance }
    this.fuses = []; // { id, nodeA, nodeB, isBlown, resistance, currentRating }
    this.groundNode = 'GND';
  }

  reset() {
    this.nodes = new Set(['GND']);
    this.resistors = [];
    this.voltageSources = [];
    this.switches = [];
    this.fuses = [];
    this.groundNode = 'GND';
  }

  addNode(nodeName) {
    if (nodeName) this.nodes.add(nodeName);
  }

  addResistor(id, nodeA, nodeB, resistance) {
    if (resistance < 0) {
      throw new Error(`Invalid negative resistance: ${resistance} for resistor ${id}`);
    }
    this.addNode(nodeA);
    this.addNode(nodeB);
    this.resistors.push({ id, nodeA, nodeB, resistance: Math.max(1e-6, resistance) });
  }

  addVoltageSource(id, nodePos, nodeNeg, voltage) {
    this.addNode(nodePos);
    this.addNode(nodeNeg);
    this.voltageSources.push({ id, nodePos, nodeNeg, voltage });
  }

  addSwitch(id, nodeA, nodeB, isOpen = false, closedResistance = 0.001) {
    this.addNode(nodeA);
    this.addNode(nodeB);
    this.switches.push({ id, nodeA, nodeB, isOpen, closedResistance: Math.max(1e-6, closedResistance) });
  }

  addFuse(id, nodeA, nodeB, ratingAmps = 15.0, resistance = 0.005, isBlown = false) {
    this.addNode(nodeA);
    this.addNode(nodeB);
    this.fuses.push({ id, nodeA, nodeB, ratingAmps, resistance: Math.max(1e-6, resistance), isBlown });
  }

  /**
   * Solves the circuit using Modified Nodal Analysis (MNA).
   * Formulation: [ G   B ] [ v ] = [ i ]
   *              [ C   D ] [ j ]   [ e ]
   * where:
   *  v: vector of unknown node voltages (excluding ground)
   *  j: vector of unknown currents through voltage sources
   *  G: conductance matrix (n x n)
   *  B: connection matrix for voltage sources (n x m)
   *  C: B transpose (m x n)
   *  D: zero matrix (m x m) for independent voltage sources
   *  i: independent current sources (0 for pure resistive + voltage sources)
   *  e: voltage source values (m x 1)
   */
  solve() {
    const warnings = [];
    const errors = [];

    // Map non-ground nodes to matrix indices 0..(n-1)
    const nonGndNodes = Array.from(this.nodes).filter(n => n !== this.groundNode);
    const n = nonGndNodes.length;
    const m = this.voltageSources.length;
    const totalDim = n + m;

    const nodeIndex = new Map();
    nonGndNodes.forEach((name, idx) => nodeIndex.set(name, idx));

    if (totalDim === 0) {
      return {
        success: true,
        nodeVoltages: { [this.groundNode]: 0.0 },
        branchCurrents: {},
        branchVoltages: {},
        powerByComponent: {},
        warnings,
        errors
      };
    }

    // Allocate matrix A and vector Z
    const A = Array.from({ length: totalDim }, () => new Array(totalDim).fill(0.0));
    const Z = new Array(totalDim).fill(0.0);

    // Minimal shunt conductance to ground on every node to guarantee numerical stability
    // and prevent singular matrices for floating/disconnected nodes
    const G_MIN = 1e-12;
    for (let i = 0; i < n; i++) {
      A[i][i] += G_MIN;
    }

    // Helper: stamp conductance between nodeA and nodeB
    const stampConductance = (nodeA, nodeB, G) => {
      if (G <= 0) return;
      const idxA = nodeIndex.get(nodeA);
      const idxB = nodeIndex.get(nodeB);

      if (idxA !== undefined) A[idxA][idxA] += G;
      if (idxB !== undefined) A[idxB][idxB] += G;
      if (idxA !== undefined && idxB !== undefined) {
        A[idxA][idxB] -= G;
        A[idxB][idxA] -= G;
      }
    };

    // 1. Stamp Resistors
    for (const r of this.resistors) {
      const G = 1.0 / r.resistance;
      stampConductance(r.nodeA, r.nodeB, G);
    }

    // 2. Stamp Switches
    for (const sw of this.switches) {
      if (!sw.isOpen) {
        const G = 1.0 / sw.closedResistance;
        stampConductance(sw.nodeA, sw.nodeB, G);
      }
    }

    // 3. Stamp Fuses
    for (const f of this.fuses) {
      if (!f.isBlown) {
        const G = 1.0 / f.resistance;
        stampConductance(f.nodeA, f.nodeB, G);
      }
    }

    // 4. Stamp Independent Voltage Sources
    for (let k = 0; k < m; k++) {
      const vs = this.voltageSources[k];
      const row = n + k;
      const idxPos = nodeIndex.get(vs.nodePos);
      const idxNeg = nodeIndex.get(vs.nodeNeg);

      if (idxPos !== undefined) {
        A[idxPos][row] += 1.0; // B matrix
        A[row][idxPos] += 1.0; // C matrix
      }
      if (idxNeg !== undefined) {
        A[idxNeg][row] -= 1.0; // B matrix
        A[row][idxNeg] -= 1.0; // C matrix
      }

      Z[row] = vs.voltage; // E vector
    }

    // Solve system A * X = Z via Gaussian Elimination with partial pivoting
    const X = this._solveLinearSystem(A, Z);
    if (!X) {
      errors.push('Circuit matrix is singular or unsolvable.');
      return {
        success: false,
        nodeVoltages: {},
        branchCurrents: {},
        branchVoltages: {},
        powerByComponent: {},
        warnings,
        errors
      };
    }

    // Extract node voltages
    const nodeVoltages = { [this.groundNode]: 0.0 };
    nonGndNodes.forEach((name, idx) => {
      nodeVoltages[name] = Math.abs(X[idx]) < 1e-12 ? 0.0 : X[idx];
    });

    // Helper to get potential
    const V = name => (nodeVoltages[name] !== undefined ? nodeVoltages[name] : 0.0);

    // Compute branch currents, voltages, and powers
    const branchCurrents = {};
    const branchVoltages = {};
    const powerByComponent = {};

    // Resistors
    for (const r of this.resistors) {
      const vDrop = V(r.nodeA) - V(r.nodeB);
      const i = vDrop / r.resistance;
      branchVoltages[r.id] = vDrop;
      branchCurrents[r.id] = i;
      powerByComponent[r.id] = Math.abs(i * vDrop);
    }

    // Switches
    for (const sw of this.switches) {
      const vDrop = V(sw.nodeA) - V(sw.nodeB);
      const i = sw.isOpen ? 0.0 : vDrop / sw.closedResistance;
      branchVoltages[sw.id] = vDrop;
      branchCurrents[sw.id] = i;
      powerByComponent[sw.id] = Math.abs(i * vDrop);
    }

    // Fuses
    for (const f of this.fuses) {
      const vDrop = V(f.nodeA) - V(f.nodeB);
      const i = f.isBlown ? 0.0 : vDrop / f.resistance;
      branchVoltages[f.id] = vDrop;
      branchCurrents[f.id] = i;
      powerByComponent[f.id] = Math.abs(i * vDrop);

      // Check if current exceeds rating
      if (!f.isBlown && Math.abs(i) > f.ratingAmps * 1.5) {
        warnings.push(`Current (${Math.abs(i).toFixed(1)}A) exceeds fuse ${f.id} rating (${f.ratingAmps}A).`);
      }
    }

    // Voltage Sources (current from X vector)
    for (let k = 0; k < m; k++) {
      const vs = this.voltageSources[k];
      const iSource = X[n + k]; // Current flowing into positive terminal
      branchVoltages[vs.id] = vs.voltage;
      branchCurrents[vs.id] = -iSource; // Conventional current delivered out of positive terminal
      powerByComponent[vs.id] = vs.voltage * (-iSource);
    }

    return {
      success: true,
      nodeVoltages,
      branchCurrents,
      branchVoltages,
      powerByComponent,
      warnings,
      errors
    };
  }

  /**
   * Gaussian elimination with scaled partial pivoting.
   */
  _solveLinearSystem(A, b) {
    const n = b.length;
    // Deep copy matrix and vector to prevent side effects
    const M = A.map(row => [...row]);
    const x = [...b];

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      if (maxEl < 1e-15) {
        // Singular or degenerate
        return null;
      }

      // Swap rows
      if (maxRow !== i) {
        const tmpRow = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tmpRow;

        const tmpVal = x[i];
        x[i] = x[maxRow];
        x[maxRow] = tmpVal;
      }

      // Eliminate below
      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        x[k] -= factor * x[i];
        for (let j = i; j < n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    // Back substitution
    const solution = new Array(n).fill(0.0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0.0;
      for (let j = i + 1; j < n; j++) {
        sum += M[i][j] * solution[j];
      }
      if (Math.abs(M[i][i]) < 1e-15) return null;
      solution[i] = (x[i] - sum) / M[i][i];
    }

    return solution;
  }
}
