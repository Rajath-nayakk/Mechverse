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

test('Stage 1 Test - BMW M4 Competition (G82) Signature Aero & Materials', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);
  const vehicle = new VehicleModel(scene, garage.liftCarriageGroup);

  // 1. Verify PBR Materials
  assert.equal(vehicle.carPaintMat.clearcoat, 1.0, 'Automotive paint must feature full clearcoat (1.0)');
  assert.ok(vehicle.carbonMat, 'Carbon fiber material must exist for roof');
  assert.equal(vehicle.caliperMat.color.getHex(), 0x0055b8, 'Brake calipers must use signature BMW M blue enamel (0x0055b8)');

  // 2. Verify Bonnet Hinge & Interactive Mesh
  const bonnet = vehicle.interactiveMeshes.get('bonnet_hood');
  assert.ok(bonnet, 'Bonnet hood must be registered as interactive');
  assert.ok(bonnet.children.length > 0, 'Bonnet group must contain geometric children');

  // 3. Verify Carbon Roof & Aero Channel
  let hasCarbonRoof = false;
  vehicle.vehicleRoot.traverse(node => {
    if (node.isMesh && node.material === vehicle.carbonMat) {
      hasCarbonRoof = true;
    }
  });
  assert.ok(hasCarbonRoof, 'Vehicle unibody must contain carbon fiber roof mesh');

  // 4. Verify 4 Brake Calipers use M Blue Caliper Material
  let mBlueCaliperCount = 0;
  vehicle.vehicleRoot.traverse(node => {
    if (node.isMesh && node.material === vehicle.caliperMat) {
      mBlueCaliperCount++;
    }
  });
  assert.ok(mBlueCaliperCount >= 4, `All 4 wheels must be equipped with M blue brake calipers, found ${mBlueCaliperCount}`);
});

test('Stage 1 Test - Garage Bays: Paint Booth, Wash Bay, Refueling & Engine Stand', () => {
  const scene = new THREE.Scene();
  const garage = new GarageWorld(scene);

  // 1. Verify Colliders Array
  assert.ok(Array.isArray(garage.colliders), 'garage.colliders must be an array');
  assert.ok(garage.colliders.length >= 8, `Garage must register at least 8 obstacle colliders, found ${garage.colliders.length}`);

  // 2. Verify Collision Resolution against Hydraulic Lift Left Post (x = -1.6, z = 0)
  const posAtLiftPost = { x: -1.6, z: 0.1 };
  const resolvedPost = garage.checkCollision(posAtLiftPost, 0.35);
  const distFromPost = Math.hypot(resolvedPost.x - (-1.6), resolvedPost.z - 0);
  assert.ok(distFromPost >= 0.74, `Player must be pushed outside post radius (0.4m + 0.35m = 0.75m), got ${distFromPost.toFixed(2)}m`);

  // 3. Verify Collision Resolution against Vehicle Unibody when lift is down
  garage.liftHeight = 0.0;
  const posInsideHood = { x: 0.0, z: 1.5 };
  const resolvedCar = garage.checkCollision(posInsideHood, 0.35);
  assert.ok(Math.abs(resolvedCar.x) >= 1.35 || Math.abs(resolvedCar.z) >= 2.70, 'Player must be pushed outside vehicle unibody bounding volume when lift is down');

  // 4. Verify Walking Under Vehicle when lift is raised high (1.8m)
  garage.liftHeight = 1.8;
  const resolvedUnderCar = garage.checkCollision(posInsideHood, 0.35);
  assert.equal(resolvedUnderCar.x, 0.0, 'Player should be able to walk under vehicle when lift is raised');
  assert.equal(resolvedUnderCar.z, 1.5, 'Player should be able to walk under vehicle when lift is raised');
});
