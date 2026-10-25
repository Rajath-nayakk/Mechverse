import test from 'node:test';
import assert from 'node:assert/strict';
import { PersistenceSystem, SAVE_SCHEMA_VERSION, STORAGE_KEY } from '../clients/workshop-prototype/src/persistence-system.js';

test('PersistenceSystem - Save, Load, and Schema Integrity', () => {
  const mockStorage = new Map();
  const persistence = new PersistenceSystem(mockStorage);

  assert.equal(persistence.hasSave(), false);

  const mockData = {
    liftHeight: 1.2,
    components: [
      { id: 'front_right_wheel', installed: false, wearPercentage: 15.0 }
    ],
    engine: {
      engineOilLiters: 4.0,
      oilConditionPercent: 95.0,
      isDrainPlugInstalled: true,
      isOilFilterInstalled: true,
      activeFaults: new Set(['BLOWN_HEAD_GASKET'])
    },
    restoration: {
      panelStates: new Map([
        ['front_right_quarter_panel', { id: 'front_right_quarter_panel', dentDepthMm: 0.0, currentColor: '#ff0000' }]
      ])
    },
    electricalFaults: ['HIGH_RESISTANCE_GROUND_STRAP'],
    conditionScores: { mechanical: 85, electrical: 70, overall: 78 }
  };

  const saveRes = persistence.saveGarageState(mockData);
  assert.equal(saveRes.success, true);
  assert.equal(persistence.hasSave(), true);

  const loadRes = persistence.loadGarageState();
  assert.equal(loadRes.success, true);
  assert.equal(loadRes.data.version, SAVE_SCHEMA_VERSION);
  assert.equal(loadRes.data.liftHeight, 1.2);
  assert.equal(loadRes.data.components[0].id, 'front_right_wheel');
  assert.equal(loadRes.data.components[0].installed, false);
  assert.equal(loadRes.data.engineState.engineOilLiters, 4.0);
  assert.deepEqual(loadRes.data.engineState.activeFaults, ['BLOWN_HEAD_GASKET']);
  assert.equal(loadRes.data.restorationPanels[0].currentColor, '#ff0000');
  assert.deepEqual(loadRes.data.electricalFaults, ['HIGH_RESISTANCE_GROUND_STRAP']);

  // Clear save
  persistence.clearSave();
  assert.equal(persistence.hasSave(), false);
  const emptyLoad = persistence.loadGarageState();
  assert.equal(emptyLoad.success, false);
});
