/**
 * MECHVERSE - Garage Save & Load Persistence System
 * 
 * Versioned schema (v1.0.0) with support for:
 * - Vehicle components, fasteners, torque specs, installation status
 * - Engine fluid servicing (oil level, waste oil, filter, drain plug)
 * - Active mechanical and electrical faults
 * - Panel restoration states (dent depth, rust, paint layers, colors, gloss)
 * - Vehicle condition scores and safety inspection
 * - Hydraulic lift height and player progress
 */

export const SAVE_SCHEMA_VERSION = '1.0.0';
export const STORAGE_KEY = 'mechverse_garage_save_v1';

export class PersistenceSystem {
  constructor(storage = null) {
    // Allows injecting custom storage (e.g. for Node.js tests) or defaulting to window.localStorage
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new Map(); // In-memory fallback
    }
  }

  saveGarageState(data) {
    const payload = {
      version: SAVE_SCHEMA_VERSION,
      timestamp: Date.now(),
      liftHeight: data.liftHeight || 0.0,
      components: data.components || [],
      engineState: {
        engineOilLiters: data.engine ? data.engine.engineOilLiters : 4.5,
        oilConditionPercent: data.engine ? data.engine.oilConditionPercent : 100.0,
        isDrainPlugInstalled: data.engine ? data.engine.isDrainPlugInstalled : true,
        isOilFilterInstalled: data.engine ? data.engine.isOilFilterInstalled : true,
        activeFaults: data.engine ? Array.from(data.engine.activeFaults) : []
      },
      restorationPanels: data.restoration ? Array.from(data.restoration.panelStates.values()) : [],
      electricalFaults: data.electricalFaults || [],
      conditionScores: data.conditionScores || {}
    };

    const serialized = JSON.stringify(payload);
    if (typeof this.storage.setItem === 'function') {
      this.storage.setItem(STORAGE_KEY, serialized);
    } else {
      this.storage.set(STORAGE_KEY, serialized);
    }

    return { success: true, timestamp: payload.timestamp, sizeBytes: serialized.length };
  }

  loadGarageState() {
    let serialized = null;
    if (typeof this.storage.getItem === 'function') {
      serialized = this.storage.getItem(STORAGE_KEY);
    } else {
      serialized = this.storage.get(STORAGE_KEY);
    }

    if (!serialized) {
      return { success: false, error: 'No saved garage state found.' };
    }

    try {
      const payload = JSON.parse(serialized);
      if (!payload.version) {
        throw new Error('Corrupted save: missing schema version.');
      }
      return { success: true, data: payload };
    } catch (err) {
      return { success: false, error: `Failed to load save: ${err.message}` };
    }
  }

  clearSave() {
    if (typeof this.storage.removeItem === 'function') {
      this.storage.removeItem(STORAGE_KEY);
    } else {
      this.storage.delete(STORAGE_KEY);
    }
    return { success: true, message: 'Garage save state wiped.' };
  }

  hasSave() {
    if (typeof this.storage.getItem === 'function') {
      return this.storage.getItem(STORAGE_KEY) !== null;
    }
    return this.storage.has(STORAGE_KEY);
  }
}
