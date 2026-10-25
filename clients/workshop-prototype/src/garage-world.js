import * as THREE from '../vendor/three.module.js';

export class GarageWorld {
  constructor(scene) {
    this.scene = scene;
    this.liftHeight = 0.0; // in meters (0 to 1.8m)
    this.targetLiftHeight = 0.0;
    this.liftCarriageGroup = new THREE.Group();
    this.initEnvironment();
  }

  initEnvironment() {
    // 1. Concrete Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Floor Grid & Bay markings
    const grid = new THREE.GridHelper(30, 30, 0x30363d, 0x21262d);
    grid.position.y = 0.005;
    this.scene.add(grid);

    // Yellow Service Bay Boundary Stripes
    this.createBayStripes();

    // 2. Workshop Walls & Ceiling Beams
    this.createWorkshopStructure();

    // 3. Two-Post Hydraulic Vehicle Lift
    this.createHydraulicLift();

    // 4. Workshop Furniture: Workbench & Tool Chest
    this.createWorkshopEquipment();

    // 5. Lighting
    this.setupLighting();
  }

  createBayStripes() {
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xd29922 }); // Safety Yellow
    const lines = [
      { x: 0, z: -3.5, w: 5.5, h: 0.15 },
      { x: 0, z: 3.5, w: 5.5, h: 0.15 },
      { x: -2.75, z: 0, w: 0.15, h: 7.0 },
      { x: 2.75, z: 0, w: 0.15, h: 7.0 }
    ];

    lines.forEach(l => {
      const geo = new THREE.PlaneGeometry(l.w, l.h);
      const mesh = new THREE.Mesh(geo, stripeMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(l.x, 0.01, l.z);
      this.scene.add(mesh);
    });
  }

  createWorkshopStructure() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.9,
      metalness: 0.05
    });

    // Back wall
    const backWallGeo = new THREE.BoxGeometry(30, 8, 0.5);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 4, -15);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.5, 8, 30);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-15, 4, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Industrial Ceiling I-Beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2d333b, roughness: 0.6, metalness: 0.8 });
    for (let z = -12; z <= 12; z += 6) {
      const beamGeo = new THREE.BoxGeometry(30, 0.4, 0.2);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 7.8, z);
      this.scene.add(beam);
    }
  }

  createHydraulicLift() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x1f6feb, // Industrial Blue
      roughness: 0.4,
      metalness: 0.6
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x484f58,
      roughness: 0.3,
      metalness: 0.8
    });

    // Left & Right Vertical Columns
    [-1.85, 1.85].forEach(xPos => {
      // Base plate
      const baseGeo = new THREE.BoxGeometry(0.8, 0.08, 0.8);
      const baseMesh = new THREE.Mesh(baseGeo, steelMat);
      baseMesh.position.set(xPos, 0.04, 0);
      this.scene.add(baseMesh);

      // Main Column
      const colGeo = new THREE.BoxGeometry(0.35, 4.2, 0.45);
      const colMesh = new THREE.Mesh(colGeo, postMat);
      colMesh.position.set(xPos, 2.1, 0);
      colMesh.castShadow = true;
      this.scene.add(colMesh);

      // Top crossbar bridge
      const capGeo = new THREE.BoxGeometry(0.4, 0.2, 0.5);
      const capMesh = new THREE.Mesh(capGeo, steelMat);
      capMesh.position.set(xPos, 4.2, 0);
      this.scene.add(capMesh);
    });

    // Overhead Cable Crossbeam
    const bridgeGeo = new THREE.BoxGeometry(3.8, 0.15, 0.3);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, postMat);
    bridgeMesh.position.set(0, 4.2, 0);
    this.scene.add(bridgeMesh);

    // Moving Carriages and Arms attached to liftCarriageGroup
    this.scene.add(this.liftCarriageGroup);

    [-1.7, 1.7].forEach(xPos => {
      // Carriage slider
      const carriageGeo = new THREE.BoxGeometry(0.38, 0.7, 0.48);
      const carriageMesh = new THREE.Mesh(carriageGeo, steelMat);
      carriageMesh.position.set(xPos, 0.45, 0);
      this.liftCarriageGroup.add(carriageMesh);

      // Telescopic Swing Arms reaching towards vehicle lift points
      [-1, 1].forEach(zDir => {
        const armGeo = new THREE.BoxGeometry(0.12, 0.08, 1.3);
        const armMesh = new THREE.Mesh(armGeo, steelMat);
        const angle = zDir * 0.35;
        armMesh.rotation.y = (xPos > 0 ? -1 : 1) * angle;
        armMesh.position.set(xPos + (xPos > 0 ? -0.4 : 0.4), 0.22, zDir * 0.7);
        this.liftCarriageGroup.add(armMesh);

        // Rubber Contact Pad
        const padGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(xPos + (xPos > 0 ? -0.85 : 0.85), 0.28, zDir * 1.35);
        this.liftCarriageGroup.add(pad);
      });
    });
  }

  createWorkshopEquipment() {
    // Heavy Steel Workbench
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-6, 0, -4);

    const woodTopGeo = new THREE.BoxGeometry(3.0, 0.12, 1.2);
    const woodTopMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
    const woodTop = new THREE.Mesh(woodTopGeo, woodTopMat);
    woodTop.position.set(0, 0.95, 0);
    benchGroup.add(woodTop);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.8, roughness: 0.3 });
    [[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]].forEach(([x, z]) => {
      const legGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.45, z);
      benchGroup.add(leg);
    });

    this.scene.add(benchGroup);

    // Rollaway Red Tool Chest
    const toolChestGroup = new THREE.Group();
    toolChestGroup.position.set(-3.5, 0, -4.5);
    const redPaintMat = new THREE.MeshStandardMaterial({ color: 0xda3633, roughness: 0.3, metalness: 0.3 });
    const chestBodyGeo = new THREE.BoxGeometry(1.2, 1.2, 0.65);
    const chestBody = new THREE.Mesh(chestBodyGeo, redPaintMat);
    chestBody.position.set(0, 0.68, 0);
    toolChestGroup.add(chestBody);

    // Drawers handles
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.9, roughness: 0.2 });
    for (let y = 0.3; y <= 1.1; y += 0.2) {
      const handleGeo = new THREE.BoxGeometry(0.8, 0.03, 0.04);
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, y, 0.34);
      toolChestGroup.add(handle);
    }
    this.scene.add(toolChestGroup);
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    // Main Overhead Shop Fluorescent Area Lights
    const overhead1 = new THREE.DirectionalLight(0xffffff, 1.2);
    overhead1.position.set(5, 10, 5);
    overhead1.castShadow = true;
    overhead1.shadow.mapSize.width = 2048;
    overhead1.shadow.mapSize.height = 2048;
    this.scene.add(overhead1);

    const overhead2 = new THREE.DirectionalLight(0xdbeafe, 0.8);
    overhead2.position.set(-5, 9, -5);
    this.scene.add(overhead2);

    // Accent lift point light
    const liftLight = new THREE.PointLight(0x388bfd, 1.5, 8);
    liftLight.position.set(0, 3.8, 0);
    this.scene.add(liftLight);
  }

  setLiftHeight(targetMeters) {
    this.targetLiftHeight = Math.max(0.0, Math.min(1.8, targetMeters));
  }

  update(deltaTime) {
    // Smooth hydraulic lift movement (0.4 m/s)
    if (Math.abs(this.liftHeight - this.targetLiftHeight) > 0.001) {
      const dir = Math.sign(this.targetLiftHeight - this.liftHeight);
      this.liftHeight += dir * 0.4 * deltaTime;
      if ((dir > 0 && this.liftHeight > this.targetLiftHeight) ||
          (dir < 0 && this.liftHeight < this.targetLiftHeight)) {
        this.liftHeight = this.targetLiftHeight;
      }
      this.liftCarriageGroup.position.y = this.liftHeight;
    }
  }
}
