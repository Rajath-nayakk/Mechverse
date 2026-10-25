import * as THREE from '../vendor/three.module.js';

export class VehicleModel {
  constructor(scene, liftGroup) {
    this.scene = scene;
    this.liftGroup = liftGroup; // Moves synchronously with the hydraulic lift
    this.interactiveMeshes = new Map(); // componentId -> THREE.Mesh
    this.vehicleRoot = new THREE.Group();
    this.liftGroup.add(this.vehicleRoot);

    this.initVehicleGeometry();
  }

  initVehicleGeometry() {
    // Car baseline position sitting on lift pads (y = 0.28)
    this.vehicleRoot.position.set(0, 0.28, 0);

    // 1. Unibody Chassis Frame (Dark Grey Metallic)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x24292f,
      roughness: 0.5,
      metalness: 0.8
    });
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.45, 4.2);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.4, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.vehicleRoot.add(chassis);

    // Cabin / Roof Structure
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.65, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, chassisMat);
    cabin.position.set(0, 0.9, -0.2);
    cabin.castShadow = true;
    this.vehicleRoot.add(cabin);

    // 2. Engine Block & Oil Pan in Engine Bay (Front: z = 1.3)
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x57606a,
      roughness: 0.6,
      metalness: 0.7
    });
    const engineGeo = new THREE.BoxGeometry(0.7, 0.55, 0.7);
    const engineBlock = new THREE.Mesh(engineGeo, engineMat);
    engineBlock.position.set(0, 0.45, 1.3);
    this.vehicleRoot.add(engineBlock);

    // Oil Pan under engine
    const panGeo = new THREE.BoxGeometry(0.55, 0.18, 0.55);
    const panMesh = new THREE.Mesh(panGeo, engineMat);
    panMesh.position.set(0, 0.12, 1.3);
    this.vehicleRoot.add(panMesh);

    // -------------------------------------------------------------
    // INTERACTIVE PART 1: Spin-On Oil Filter Canister (Blue)
    // -------------------------------------------------------------
    const filterMat = new THREE.MeshStandardMaterial({
      color: 0x0969da, // Classic Oil Filter Blue
      roughness: 0.3,
      metalness: 0.4
    });
    const filterGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.14, 24);
    const filterMesh = new THREE.Mesh(filterGeo, filterMat);
    filterMesh.rotation.x = Math.PI / 2; // Threads facing forward
    filterMesh.position.set(0.22, 0.14, 1.45);
    filterMesh.userData = { componentId: 'oil_filter_canister' };
    this.vehicleRoot.add(filterMesh);
    this.interactiveMeshes.set('oil_filter_canister', filterMesh);

    // -------------------------------------------------------------
    // INTERACTIVE PART 2: Front Right Alloy Wheel & Tire (x = 1.05, z = 1.35)
    // -------------------------------------------------------------
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(1.02, 0.35, 1.35);

    // Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 32);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.rotation.z = Math.PI / 2;
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Silver Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.23, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.9, roughness: 0.2 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.z = Math.PI / 2;
    wheelGroup.add(rimMesh);

    // 5x Lug Nuts around hub
    const lugMat = new THREE.MeshStandardMaterial({ color: 0x8c959f, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const lugGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.03, 6);
      const lug = new THREE.Mesh(lugGeo, lugMat);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(0.12, Math.sin(angle) * 0.1, Math.cos(angle) * 0.1);
      wheelGroup.add(lug);
    }

    wheelGroup.userData = { componentId: 'front_right_wheel' };
    this.vehicleRoot.add(wheelGroup);
    this.interactiveMeshes.set('front_right_wheel', wheelGroup);

    // Other 3 static wheels
    this.createStaticWheel(-1.02, 0.35, 1.35);  // Front Left
    this.createStaticWheel(1.02, 0.35, -1.35);  // Rear Right
    this.createStaticWheel(-1.02, 0.35, -1.35); // Rear Left

    // -------------------------------------------------------------
    // INTERACTIVE PART 3: Front Right Brake Rotor & Caliper
    // Mounted just inboard of the wheel (x = 0.88, z = 1.35)
    // -------------------------------------------------------------
    const brakeGroup = new THREE.Group();
    brakeGroup.position.set(0.88, 0.35, 1.35);

    // Disc rotor
    const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.03, 32);
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xafb8c1,
      metalness: 0.95,
      roughness: 0.25
    });
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    rotorMesh.rotation.z = Math.PI / 2;
    brakeGroup.add(rotorMesh);

    // Red Brembo style brake caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.16, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xcf222e, roughness: 0.3, metalness: 0.4 });
    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
    caliperMesh.position.set(0.02, 0.12, 0.08);
    brakeGroup.add(caliperMesh);

    brakeGroup.userData = { componentId: 'brake_rotor_fr' };
    this.vehicleRoot.add(brakeGroup);
    this.interactiveMeshes.set('brake_rotor_fr', brakeGroup);

    // -------------------------------------------------------------
    // INTERACTIVE PART 4: Fuel Filler Flap / Door & Cap (Rear Right)
    // -------------------------------------------------------------
    const fuelDoorGeo = new THREE.BoxGeometry(0.04, 0.16, 0.16);
    const fuelDoorMat = new THREE.MeshStandardMaterial({
      color: 0x1f6feb,
      roughness: 0.3,
      metalness: 0.6
    });
    const fuelDoorMesh = new THREE.Mesh(fuelDoorGeo, fuelDoorMat);
    fuelDoorMesh.position.set(0.92, 0.65, -1.2);
    fuelDoorMesh.userData = { componentId: 'fuel_filler_assembly' };
    this.vehicleRoot.add(fuelDoorMesh);
    this.interactiveMeshes.set('fuel_filler_assembly', fuelDoorMesh);

    // -------------------------------------------------------------
    // INTERACTIVE PART 5: Front Right Fender / Quarter Panel
    // -------------------------------------------------------------
    const fenderGeo = new THREE.BoxGeometry(0.12, 0.55, 1.25);
    const fenderMat = new THREE.MeshStandardMaterial({
      color: 0x1f6feb, // Gloss Blue Paint
      roughness: 0.25,
      metalness: 0.5
    });
    const fenderMesh = new THREE.Mesh(fenderGeo, fenderMat);
    fenderMesh.position.set(0.94, 0.52, 1.1);
    fenderMesh.userData = { componentId: 'front_right_quarter_panel' };
    this.vehicleRoot.add(fenderMesh);
    this.interactiveMeshes.set('front_right_quarter_panel', fenderMesh);
  }

  createStaticWheel(x, y, z) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 24);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.rotation.z = Math.PI / 2;
    wheelGroup.add(tireMesh);

    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.23, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.9, roughness: 0.2 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.z = Math.PI / 2;
    wheelGroup.add(rimMesh);

    this.vehicleRoot.add(wheelGroup);
  }

  setComponentVisibility(componentId, visible) {
    const mesh = this.interactiveMeshes.get(componentId);
    if (mesh) {
      mesh.visible = visible;
    }
  }

  updateComponentVisuals(component) {
    const mesh = this.interactiveMeshes.get(component.id);
    if (!mesh) return;

    mesh.visible = component.installed;

    // Visual updates for cleanliness and damage
    mesh.traverse(child => {
      if (child.isMesh && child.material) {
        // Dirtiness turns color grimy / increases roughness
        if (component.cleanlinessPercentage < 50) {
          child.material.roughness = THREE.MathUtils.lerp(0.85, 0.3, component.cleanlinessPercentage / 50);
        }

        // Fender dent visual representation
        if (component.id === 'front_right_quarter_panel' && component.dentDepthMm > 0) {
          child.scale.set(1.0, 1.0 - (component.dentDepthMm * 0.04), 1.0);
        } else {
          child.scale.set(1.0, 1.0, 1.0);
        }
      }
    });
  }
}
