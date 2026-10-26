import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../clients/workshop-prototype/vendor/three.module.js';
import { GarageWorld } from '../clients/workshop-prototype/src/garage-world.js';
import { VehicleModel } from '../clients/workshop-prototype/src/vehicle-model.js';
import { INITIAL_COMPONENTS } from '../clients/workshop-prototype/src/components-data.js';

test('Automated Render Smoke Test - Three.js Scene and Garage Hierarchy', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);

  assert.ok(scene.children.length > 10, 'GarageWorld should populate scene with floor, walls, lights and equipment');
  assert.ok(garage.liftCarriageGroup, 'Hydraulic lift carriage group must exist');
  assert.ok(scene.children.includes(garage.liftCarriageGroup), 'Lift carriage must be added to main scene');
});

test('Automated Render Smoke Test - Vehicle Model Structure and Bounding Volume', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  assert.ok(vehicle.vehicleRoot, 'vehicleRoot must exist');
  assert.ok(garage.liftCarriageGroup.children.includes(vehicle.vehicleRoot), 'vehicleRoot must be child of liftCarriageGroup');
  assert.ok(vehicle.vehicleRoot.children.length >= 30, 'Vehicle must contain modular body, interior, engine, and running gear components');

  // Compute vehicle bounding box
  const bbox = new THREE.Box3().setFromObject(vehicle.vehicleRoot);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  assert.ok(size.x > 1.5 && size.x < 2.5, `Vehicle width should be approx 1.8-2.2m, got ${size.x.toFixed(2)}m`);
  assert.ok(size.y > 0.8 && size.y < 2.0, `Vehicle height should be approx 1.0-1.6m, got ${size.y.toFixed(2)}m`);
  assert.ok(size.z > 3.5 && size.z < 5.5, `Vehicle length should be approx 4.2-5.0m, got ${size.z.toFixed(2)}m`);
});

test('Automated Render Smoke Test - Interactive Mesh Registration & Visibility', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  const expectedComponents = [
    'front_right_wheel',
    'brake_rotor_fr',
    'front_right_quarter_panel',
    'bonnet_hood',
    'door_front_left',
    'door_front_right',
    'oil_filter_canister',
    'oil_drain_plug',
    'battery_12v',
    'starter_motor'
  ];

  for (const compId of expectedComponents) {
    const mesh = vehicle.interactiveMeshes.get(compId);
    assert.ok(mesh, `Interactive mesh for ${compId} must be registered in vehicleModel.interactiveMeshes`);
    assert.equal(mesh.visible, true, `Component ${compId} should be visible by default`);
  }
});

test('Automated Render Smoke Test - Camera Frustum & Framing Containment', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
  camera.position.set(3.6, 1.8, 4.2);
  camera.lookAt(0, 0.85, 0);
  camera.updateMatrixWorld();

  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  // Compute vehicle bounding box in world coordinates
  vehicle.vehicleRoot.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(vehicle.vehicleRoot);

  assert.ok(frustum.intersectsBox(bbox), 'Default camera position and frustum must encompass the vehicle bounding volume');
});

test('Automated Render Smoke Test - Synchronous Lift Movement', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  const initialY = vehicle.vehicleRoot.position.y;
  assert.equal(initialY, 0.28, 'Initial vehicleRoot y must be resting on lift pads (0.28m)');

  garage.setLiftHeight(1.5);
  garage.update(4.0); // 4 seconds at 0.4m/s reaches 1.5m target

  assert.ok(Math.abs(garage.liftHeight - 1.5) < 0.01, 'Hydraulic lift should reach target height');
  assert.ok(Math.abs(garage.liftCarriageGroup.position.y - 1.5) < 0.01, 'Carriage group must rise to 1.5m');

  // Verify world position of vehicle unibody lifted synchronously
  const worldPos = new THREE.Vector3();
  vehicle.vehicleRoot.getWorldPosition(worldPos);
  assert.ok(Math.abs(worldPos.y - (1.5 + 0.28)) < 0.02, `Vehicle world Y must rise with lift to 1.78m, got ${worldPos.y.toFixed(2)}m`);
});

test('Automated Render Smoke Test - 3D Raycasting Hit Detection', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  const raycaster = new THREE.Raycaster();
  // Cast ray from side towards front right wheel at (1.02, 0.63, 1.35)
  raycaster.set(new THREE.Vector3(3.0, 0.63, 1.35), new THREE.Vector3(-1, 0, 0));
  
  scene.updateMatrixWorld(true);
  const hits = raycaster.intersectObjects(vehicle.vehicleRoot.children, true);
  assert.ok(hits.length > 0, 'Raycaster from side must intersect vehicle geometry');
  
  const hitMesh = hits[0].object;
  assert.ok(hitMesh.isMesh, 'Intersected target must be a renderable THREE.Mesh');
});
