import * as THREE from '../vendor/three.module.js';

/**
 * MECHVERSE - Realistic 3D Automotive Workshop Environment
 * 
 * Includes:
 * - High-spec concrete floor with epoxy sheen, bay boundaries & lift markings
 * - 4-wall industrial workshop with structural steel ceiling trusses & signage
 * - Symmetrical 2-Post Hydraulic Vehicle Lift with moving carriages & pads
 * - Steel workbenches with bench vises, parts trays, and pegboard tool racks
 * - Mobile red rollaway tool chests with ball-bearing drawers
 * - Mobile diagnostic test station with oscilloscope screen
 * - Heavy-duty hydraulic engine hoist / crane with lifting chain
 * - Telescoping oil catchment container for oil drainage
 * - Wall-mounted performance tire & wheel rack
 * - Air compressor with pressure tank, regulator, and hose reel
 * - PBR lighting setup with overhead LED shop lights and accent bay spots
 */

export class GarageWorld {
  constructor(scene) {
    this.scene = scene;
    this.liftHeight = 0.0; // in meters (0 to 1.8m)
    this.targetLiftHeight = 0.0;
    this.liftCarriageGroup = new THREE.Group();
    this.initEnvironment();
  }

  initEnvironment() {
    // 1. Concrete Floor with Epoxy Finish
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.55,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle grid overlay
    const grid = new THREE.GridHelper(36, 36, 0x30363d, 0x1f242c);
    grid.position.y = 0.005;
    this.scene.add(grid);

    // Yellow Service Bay Boundary Markings
    this.createBayMarkings();

    // 2. Workshop Walls, Steel Truss Roof & Signage
    this.createWorkshopStructure();

    // 3. Two-Post Hydraulic Vehicle Lift
    this.createHydraulicLift();

    // 4. Workshop Furniture: Workbenches, Tool Cabinets, Diagnostics, Crane, Oil Drain
    this.createWorkshopEquipment();

    // 5. Lighting
    this.setupLighting();
  }

  createBayMarkings() {
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xd29922 }); // Safety Yellow
    const lines = [
      { x: 0, z: -3.8, w: 6.0, h: 0.15 },
      { x: 0, z: 3.8, w: 6.0, h: 0.15 },
      { x: -3.0, z: 0, w: 0.15, h: 7.6 },
      { x: 3.0, z: 0, w: 0.15, h: 7.6 }
    ];

    lines.forEach(l => {
      const geo = new THREE.PlaneGeometry(l.w, l.h);
      const mesh = new THREE.Mesh(geo, yellowMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(l.x, 0.01, l.z);
      this.scene.add(mesh);
    });
  }

  createWorkshopStructure() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.85,
      metalness: 0.08
    });

    // Back wall
    const backWallGeo = new THREE.BoxGeometry(36, 9, 0.6);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 4.5, -18);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.6, 9, 36);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-18, 4.5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall
    const rightWallGeo = new THREE.BoxGeometry(0.6, 9, 36);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(18, 4.5, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Overhead Steel Truss I-Beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2d333b, roughness: 0.5, metalness: 0.8 });
    for (let z = -15; z <= 15; z += 6) {
      const beamGeo = new THREE.BoxGeometry(36, 0.5, 0.25);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 8.8, z);
      this.scene.add(beam);
    }
  }

  createHydraulicLift() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x1f6feb, // Industrial Safety Blue
      roughness: 0.35,
      metalness: 0.65
    });

    // Two asymmetric structural columns at x = -1.9 and x = 1.9
    [-1.9, 1.9].forEach(x => {
      const postGroup = new THREE.Group();
      postGroup.position.set(x, 0, 0);

      // Base mounting plate anchored to concrete floor
      const baseGeo = new THREE.BoxGeometry(0.85, 0.08, 0.85);
      const baseMesh = new THREE.Mesh(baseGeo, postMat);
      baseMesh.position.set(0, 0.04, 0);
      postGroup.add(baseMesh);

      // Main vertical I-Beam column (3.8m tall)
      const colGeo = new THREE.BoxGeometry(0.35, 3.8, 0.45);
      const colMesh = new THREE.Mesh(colGeo, postMat);
      colMesh.position.set(0, 1.9, 0);
      colMesh.castShadow = true;
      postGroup.add(colMesh);

      // Hydraulic pump & oil reservoir unit on right post
      if (x > 0) {
        const pumpGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16);
        const pumpMat = new THREE.MeshStandardMaterial({ color: 0x21262d, roughness: 0.4 });
        const pump = new THREE.Mesh(pumpGeo, pumpMat);
        pump.position.set(0.28, 1.4, 0);
        postGroup.add(pump);
      }

      this.scene.add(postGroup);
    });

    // Moving Lift Carriage Assembly
    this.liftCarriageGroup.position.set(0, 0, 0);
    this.scene.add(this.liftCarriageGroup);

    // 4 Telescoping Swing Arms with Rubber Contact Pads
    const armMat = new THREE.MeshStandardMaterial({ color: 0xd29922, roughness: 0.4, metalness: 0.5 }); // Safety Yellow
    [-1.9, 1.9].forEach(xPos => {
      [-1, 1].forEach(zDir => {
        const armGroup = new THREE.Group();
        armGroup.position.set(xPos, 0.22, 0);

        const armGeo = new THREE.BoxGeometry(1.35, 0.12, 0.14);
        const armMesh = new THREE.Mesh(armGeo, armMat);
        const angle = zDir * 0.38;
        armMesh.rotation.y = (xPos > 0 ? -1 : 1) * angle;
        armMesh.position.set((xPos > 0 ? -0.65 : 0.65), 0, zDir * 0.75);
        armGroup.add(armMesh);

        // Circular rubber lifting pad
        const padGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(xPos > 0 ? -1.15 : 1.15, 0.06, zDir * 1.35);
        armGroup.add(pad);

        this.liftCarriageGroup.add(armGroup);
      });
    });
  }

  createWorkshopEquipment() {
    // 1. Heavy-Duty Steel Workbench (Left Wall: x = -7, z = -4)
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-7, 0, -4);

    const woodTopGeo = new THREE.BoxGeometry(3.6, 0.14, 1.3);
    const woodTopMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
    const woodTop = new THREE.Mesh(woodTopGeo, woodTopMat);
    woodTop.position.set(0, 0.95, 0);
    benchGroup.add(woodTop);

    // Cast iron bench vise on left corner
    const viseGeo = new THREE.BoxGeometry(0.24, 0.22, 0.28);
    const viseMat = new THREE.MeshStandardMaterial({ color: 0x388bfd, metalness: 0.8, roughness: 0.3 });
    const vise = new THREE.Mesh(viseGeo, viseMat);
    vise.position.set(-1.4, 1.12, 0.35);
    benchGroup.add(vise);

    // Workbench Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.8, roughness: 0.3 });
    [[-1.6, -0.5], [1.6, -0.5], [-1.6, 0.5], [1.6, 0.5]].forEach(([x, z]) => {
      const legGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.45, z);
      benchGroup.add(leg);
    });
    this.scene.add(benchGroup);

    // 2. Rollaway Red Tool Chest with Drawers
    const toolChestGroup = new THREE.Group();
    toolChestGroup.position.set(-4.2, 0, -4.5);
    const redPaintMat = new THREE.MeshStandardMaterial({ color: 0xda3633, roughness: 0.3, metalness: 0.4 });
    const chestBodyGeo = new THREE.BoxGeometry(1.3, 1.25, 0.7);
    const chestBody = new THREE.Mesh(chestBodyGeo, redPaintMat);
    chestBody.position.set(0, 0.70, 0);
    toolChestGroup.add(chestBody);

    // Drawer handles
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.9, roughness: 0.2 });
    for (let y = 0.35; y <= 1.15; y += 0.18) {
      const handleGeo = new THREE.BoxGeometry(0.9, 0.03, 0.04);
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, y, 0.37);
      toolChestGroup.add(handle);
    }
    this.scene.add(toolChestGroup);

    // 3. Mobile Diagnostic Cart with Monitor (Right Side: x = 4.5, z = -3.5)
    const diagGroup = new THREE.Group();
    diagGroup.position.set(4.5, 0, -3.5);

    const cartFrameGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x24292f, roughness: 0.6 });
    const cartFrame = new THREE.Mesh(cartFrameGeo, cartMat);
    cartFrame.position.set(0, 0.65, 0);
    diagGroup.add(cartFrame);

    // Diagnostic Oscilloscope / ECU Monitor
    const monGeo = new THREE.BoxGeometry(0.65, 0.45, 0.08);
    const monMesh = new THREE.Mesh(monGeo, this.trimMat || cartMat);
    monMesh.position.set(0, 1.45, 0.1);
    monMesh.rotation.x = -0.25;
    diagGroup.add(monMesh);

    const screenGeo = new THREE.PlaneGeometry(0.58, 0.38);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.46, 0.15);
    screen.rotation.x = -0.25;
    diagGroup.add(screen);

    this.scene.add(diagGroup);

    // 4. Hydraulic Engine Crane / Hoist (Positioned at Front Right Bay: x = 3.5, z = 3.2)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(3.5, 0, 3.2);

    const craneMat = new THREE.MeshStandardMaterial({ color: 0xcf222e, roughness: 0.4, metalness: 0.5 }); // Crane Red
    // Base legs with casters
    const legGeo = new THREE.BoxGeometry(1.6, 0.08, 0.1);
    const legL = new THREE.Mesh(legGeo, craneMat);
    legL.position.set(0, 0.05, -0.45);
    craneGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, craneMat);
    legR.position.set(0, 0.05, 0.45);
    craneGroup.add(legR);

    // Vertical mast
    const mastGeo = new THREE.BoxGeometry(0.14, 1.8, 0.14);
    const mast = new THREE.Mesh(mastGeo, craneMat);
    mast.position.set(-0.7, 0.95, 0);
    craneGroup.add(mast);

    // Telescoping boom arm
    const boomGeo = new THREE.BoxGeometry(1.5, 0.12, 0.12);
    const boom = new THREE.Mesh(boomGeo, craneMat);
    boom.rotation.z = -Math.PI / 8;
    boom.position.set(-0.1, 1.85, 0);
    craneGroup.add(boom);

    // Lifting chain & hook
    const hookMat = new THREE.MeshStandardMaterial({ color: 0x8b949e, metalness: 0.9, roughness: 0.3 });
    const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8);
    const chain = new THREE.Mesh(chainGeo, hookMat);
    chain.position.set(0.65, 1.35, 0);
    craneGroup.add(chain);

    this.scene.add(craneGroup);

    // 5. Telescoping Waste Oil Drain Catchment Cart (Positioned under lift at center)
    const drainCart = new THREE.Group();
    drainCart.position.set(0.18, 0, 1.25);

    // Reservoir drum
    const drumGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.55, 20);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x30363d, roughness: 0.5 });
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.set(0, 0.28, 0);
    drainCart.add(drum);

    // Telescoping pipe and wide funnel
    const pipeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    const pipe = new THREE.Mesh(pipeGeo, drumMat);
    pipe.position.set(0, 0.65, 0);
    drainCart.add(pipe);

    const funnelGeo = new THREE.ConeGeometry(0.26, 0.16, 24, 1, true);
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.rotation.x = Math.PI;
    funnel.position.set(0, 0.88, 0);
    drainCart.add(funnel);

    this.scene.add(drainCart);

    // 6. Wall-Mounted Tire Storage Rack with 4 Spare Wheels (Left Wall: x = -17.5, z = 2)
    const tireRackGroup = new THREE.Group();
    tireRackGroup.position.set(-17.2, 1.8, 2);

    const rackFrameGeo = new THREE.BoxGeometry(0.65, 0.06, 2.8);
    const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.8 });
    const rackFrame = new THREE.Mesh(rackFrameGeo, rackFrameMat);
    tireRackGroup.add(rackFrame);

    // 4 performance spare tires on rack
    const spareTireMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 });
    const spareRimMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.9, roughness: 0.2 });
    [-1.05, -0.35, 0.35, 1.05].forEach(z => {
      const tGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 20);
      const tMesh = new THREE.Mesh(tGeo, spareTireMat);
      tMesh.rotation.x = Math.PI / 2;
      tMesh.position.set(0, 0.38, z);
      tireRackGroup.add(tMesh);

      const rGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.25, 16);
      const rMesh = new THREE.Mesh(rGeo, spareRimMat);
      rMesh.rotation.x = Math.PI / 2;
      rMesh.position.set(0, 0.38, z);
      tireRackGroup.add(rMesh);
    });

    this.scene.add(tireRackGroup);
  }

  setupLighting() {
    // Ambient light - balanced warm-cool ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    // Overhead Bay Light 1 (Main directional sun / shop beam)
    const overhead1 = new THREE.DirectionalLight(0xffffff, 1.4);
    overhead1.position.set(6, 12, 6);
    overhead1.castShadow = true;
    overhead1.shadow.mapSize.width = 2048;
    overhead1.shadow.mapSize.height = 2048;
    overhead1.shadow.bias = -0.0005;
    overhead1.shadow.camera.near = 0.5;
    overhead1.shadow.camera.far = 30;
    overhead1.shadow.camera.left = -10;
    overhead1.shadow.camera.right = 10;
    overhead1.shadow.camera.top = 10;
    overhead1.shadow.camera.bottom = -10;
    this.scene.add(overhead1);

    // Overhead Bay Light 2 (Fill light from opposite quadrant)
    const overhead2 = new THREE.DirectionalLight(0xdbeafe, 0.9);
    overhead2.position.set(-6, 11, -6);
    this.scene.add(overhead2);

    // Lift Accent Spotlight focusing directly on the car chassis
    const liftLight = new THREE.PointLight(0xffffff, 1.8, 12);
    liftLight.position.set(0, 4.5, 0);
    this.scene.add(liftLight);

    // Fluorescent Tube Lighting Effects along ceiling trusses
    [-12, -6, 0, 6, 12].forEach(z => {
      const tubeLight = new THREE.PointLight(0xf0f6fc, 0.75, 14);
      tubeLight.position.set(0, 8.4, z);
      this.scene.add(tubeLight);
    });
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
