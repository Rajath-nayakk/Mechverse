import test from 'node:test';
import assert from 'node:assert/strict';
import { CleaningSimulation, CLEANABLE_SURFACES } from '../clients/workshop-prototype/src/cleaning-system.js';

test('Cleaning simulation initializes distinct surfaces independently', () => {
  const sim = new CleaningSimulation();
  assert.ok(sim.surfaces.length >= 7, 'Expected at least 7 cleanable surfaces');

  const wheels = sim.getSurface('surface_wheels');
  const interior = sim.getSurface('surface_interior_cabin');

  assert.ok(wheels.contaminations.brakeDust > 0);
  assert.equal(interior.contaminations.brakeDust, 0, 'Interior cabin should have 0 brake dust');
  assert.ok(interior.contaminations.looseDebris > 0);
});

test('Cleaning one surface does not reduce contamination on other surfaces', () => {
  const sim = new CleaningSimulation();

  const initialInteriorDebris = sim.getSurface('surface_interior_cabin').contaminations.looseDebris;
  const initialEngineGrease = sim.getSurface('surface_engine_bay').contaminations.grease;

  // Foam wash and pressure rinse the exterior body panels only
  sim.applyCleaningTool('surface_body_exterior', 'TOOL_FOAM_CANNON');
  sim.applyCleaningTool('surface_body_exterior', 'TOOL_PRESSURE_WASHER');

  const bodyExterior = sim.getSurface('surface_body_exterior');
  assert.ok(bodyExterior.contaminations.mud < 20, 'Exterior mud should be largely removed');

  // Interior and engine bay MUST remain untouched
  assert.equal(
    sim.getSurface('surface_interior_cabin').contaminations.looseDebris,
    initialInteriorDebris,
    'Interior debris must not change when washing exterior body panels'
  );
  assert.equal(
    sim.getSurface('surface_engine_bay').contaminations.grease,
    initialEngineGrease,
    'Engine bay grease must not change when washing exterior body panels'
  );
});

test('Vacuuming removes loose debris from interior cabin but does NOT remove grease', () => {
  const sim = new CleaningSimulation();
  const interior = sim.getSurface('surface_interior_cabin');

  const initialGrease = interior.contaminations.grease; // e.g. 25
  assert.ok(interior.contaminations.looseDebris > 50);

  // Apply vacuum cleaner
  const result = sim.applyCleaningTool('surface_interior_cabin', 'TOOL_VACUUM_CLEANER');
  assert.equal(result.success, true);
  assert.ok(interior.contaminations.looseDebris < 10, 'Loose debris should be extracted by vacuum');
  assert.equal(interior.contaminations.grease, initialGrease, 'Vacuuming must NOT remove grease stains');
});

test('Pressure washer is prohibited on interior fabric and carpet', () => {
  const sim = new CleaningSimulation();
  const result = sim.applyCleaningTool('surface_interior_cabin', 'TOOL_PRESSURE_WASHER');
  assert.equal(result.success, false);
  assert.match(result.message, /water jet will shred interior fabrics/);
});

test('Degreaser dissolves heavy oil and grease on engine bay surfaces', () => {
  const sim = new CleaningSimulation();
  const engine = sim.getSurface('surface_engine_bay');
  assert.ok(engine.contaminations.grease > 50);

  const result = sim.applyCleaningTool('surface_engine_bay', 'TOOL_DEGREASER');
  assert.equal(result.success, true);
  assert.ok(engine.contaminations.grease < 20, 'Degreaser should dissolve grease film');
});

test('Cleaning does not repair structural frame damage or scratches in paint', () => {
  const sim = new CleaningSimulation();
  const body = sim.getSurface('surface_body_exterior');

  assert.equal(body.damageState.dentDepthMm, 4.5);
  assert.equal(body.damageState.scratchDepthUm, 45.0);

  // Perform complete wash
  sim.applyCleaningTool('surface_body_exterior', 'TOOL_FOAM_CANNON');
  sim.applyCleaningTool('surface_body_exterior', 'TOOL_PRESSURE_WASHER');

  // Verify damage state is strictly preserved
  assert.equal(body.damageState.dentDepthMm, 4.5, 'Dent must not disappear from washing');
  assert.equal(body.damageState.scratchDepthUm, 45.0, 'Scratch must not disappear from washing');
});
