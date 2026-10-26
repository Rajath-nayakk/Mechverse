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
    this.colliders = [];
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

    // 5. Paint Booth Bay (Downdraft floor, daylight LED fixtures, partition)
    this.createPaintBoothBay();

    // 6. Wash & Detail Bay (Drainage trench, hose reel, foam cannon bracket)
    this.createWashDetailBay();

    // 7. Refueling Station & Fluid Drums (98 RON pump, synthetic oil drums)
    this.createRefuelingAndFluidStation();

    // 8. Rotating Engine Stand (Adjacent to engine crane)
    this.createRotatingEngineStand();

    // 9. Lighting
    this.setupLighting();

    // 10. Obstacle Colliders
    this.initColliders();
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

  createPaintBoothBay() {
    // -------------------------------------------------------------
    // PAINT BOOTH BAY (Dedicated cleanroom booth at x = 12.0, z = -2.0)
    // -------------------------------------------------------------
    const boothGroup = new THREE.Group();
    boothGroup.position.set(12.0, 0, -2.0);

    // 1. Downdraft Floor Ventilation Grating (6.0m x 8.0m)
    const grateGeo = new THREE.BoxGeometry(5.8, 0.04, 7.8);
    const grateMat = new THREE.MeshStandardMaterial({
      color: 0x30363d,
      roughness: 0.8,
      metalness: 0.6,
      wireframe: false
    });
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.position.set(0, 0.02, 0);
    boothGroup.add(grate);

    // Yellow safety perimeter
    const yellowBorderGeo = new THREE.BoxGeometry(6.0, 0.03, 8.0);
    const yellowBorderMat = new THREE.MeshBasicMaterial({ color: 0xd29922 });
    const yellowBorder = new THREE.Mesh(yellowBorderGeo, yellowBorderMat);
    yellowBorder.position.set(0, 0.01, 0);
    boothGroup.add(yellowBorder);

    // 2. High-Clear Acrylic Partition Wall with Steel Frame
    const partitionGeo = new THREE.BoxGeometry(0.08, 4.2, 7.8);
    const partitionMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6edf3,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8
    });
    const partition = new THREE.Mesh(partitionGeo, partitionMat);
    partition.position.set(-2.95, 2.1, 0);
    boothGroup.add(partition);

    // Steel partition frame posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x24292f, metalness: 0.85, roughness: 0.3 });
    [-3.8, 0, 3.8].forEach(pz => {
      const pGeo = new THREE.BoxGeometry(0.12, 4.2, 0.12);
      const post = new THREE.Mesh(pGeo, postMat);
      post.position.set(-2.95, 2.1, pz);
      boothGroup.add(post);
    });

    // 3. Daylight 6500K LED Bank Luminaires for flawless color-matching
    [-1.8, 1.8].forEach(lx => {
      const lightBankGeo = new THREE.BoxGeometry(0.4, 0.08, 7.2);
      const lightHousing = new THREE.Mesh(lightBankGeo, postMat);
      lightHousing.position.set(lx, 4.15, 0);
      boothGroup.add(lightHousing);

      // Emissive light panel
      const panelGeo = new THREE.BoxGeometry(0.32, 0.02, 7.0);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(lx, 4.10, 0);
      boothGroup.add(panel);

      const boothSpot = new THREE.PointLight(0xffffff, 1.2, 10);
      boothSpot.position.set(lx, 3.9, 0);
      boothGroup.add(boothSpot);
    });

    // 4. Downdraft Exhaust Plenum & Duct on side wall
    const ductGeo = new THREE.CylinderGeometry(0.35, 0.35, 4.2, 16);
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x8b949e, metalness: 0.8, roughness: 0.3 });
    const duct = new THREE.Mesh(ductGeo, ductMat);
    duct.position.set(2.6, 2.1, -3.5);
    boothGroup.add(duct);

    this.scene.add(boothGroup);
  }

  createWashDetailBay() {
    // -------------------------------------------------------------
    // WASH & DETAIL BAY (Floor drainage trench & wash gear at x = -12.0, z = -2.0)
    // -------------------------------------------------------------
    const washGroup = new THREE.Group();
    washGroup.position.set(-12.0, 0, -2.0);

    // 1. Central Floor Drainage Trench with Cast Iron Grating
    const trenchGeo = new THREE.BoxGeometry(1.2, 0.05, 7.4);
    const trenchMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.9, metalness: 0.3 });
    const trench = new THREE.Mesh(trenchGeo, trenchMat);
    trench.position.set(0, 0.01, 0);
    washGroup.add(trench);

    const blueBorderGeo = new THREE.BoxGeometry(5.8, 0.02, 7.8);
    const blueBorderMat = new THREE.MeshBasicMaterial({ color: 0x1f6feb });
    const blueBorder = new THREE.Mesh(blueBorderGeo, blueBorderMat);
    blueBorder.position.set(0, 0.005, 0);
    washGroup.add(blueBorder);

    // 2. High-Pressure Hose Reel Mounted on Wall (x = -17.2, z = -2.0)
    const hoseReelGroup = new THREE.Group();
    hoseReelGroup.position.set(-5.6, 1.8, 0);

    const reelDrumGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 20);
    const reelMat = new THREE.MeshStandardMaterial({ color: 0x0969da, roughness: 0.4, metalness: 0.6 });
    const reelDrum = new THREE.Mesh(reelDrumGeo, reelMat);
    reelDrum.rotation.z = Math.PI / 2;
    hoseReelGroup.add(reelDrum);

    const hoseGeo = new THREE.TorusGeometry(0.24, 0.04, 12, 24);
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x24292f, roughness: 0.9 });
    const hose = new THREE.Mesh(hoseGeo, hoseMat);
    hose.rotation.y = Math.PI / 2;
    hoseReelGroup.add(hose);

    washGroup.add(hoseReelGroup);

    // 3. Mobile Detailing Cart with Wash Buckets & Foam Cannon
    const detailCart = new THREE.Group();
    detailCart.position.set(-2.2, 0, 2.5);

    const cartFrameGeo = new THREE.BoxGeometry(0.7, 0.8, 0.5);
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x21262d, roughness: 0.6 });
    const cart = new THREE.Mesh(cartFrameGeo, cartMat);
    cart.position.set(0, 0.45, 0);
    detailCart.add(cart);

    // Wash & Rinse Buckets with Grit Guards
    [-0.18, 0.18].forEach((bx, idx) => {
      const bucketGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.26, 16);
      const bColor = idx === 0 ? 0xcf222e : 0x0969da;
      const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.5 });
      const bucket = new THREE.Mesh(bucketGeo, bMat);
      bucket.position.set(bx, 0.98, 0);
      detailCart.add(bucket);
    });

    // Foam Cannon Bottle
    const foamBottleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12);
    const foamMat = new THREE.MeshStandardMaterial({ color: 0xf0f6fc, roughness: 0.3, transparent: true, opacity: 0.85 });
    const foamBottle = new THREE.Mesh(foamBottleGeo, foamMat);
    foamBottle.position.set(0, 0.94, -0.16);
    detailCart.add(foamBottle);

    washGroup.add(detailCart);
    this.scene.add(washGroup);
  }

  createRefuelingAndFluidStation() {
    // -------------------------------------------------------------
    // REFUELING & FLUID DRUM STATION (x = 7.5, z = -12.0)
    // -------------------------------------------------------------
    const stationGroup = new THREE.Group();
    stationGroup.position.set(7.5, 0, -12.0);

    // 1. Mobile 98 RON High-Octane Fuel Dispenser Cart
    const dispenserGroup = new THREE.Group();
    dispenserGroup.position.set(-1.4, 0, 0);

    const cabinetGeo = new THREE.BoxGeometry(0.75, 1.35, 0.55);
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x1f883d, roughness: 0.4, metalness: 0.5 }); // Racing Green
    const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
    cabinet.position.set(0, 0.72, 0);
    dispenserGroup.add(cabinet);

    // Digital Gallons / Litres Meter Screen
    const meterScreenGeo = new THREE.PlaneGeometry(0.38, 0.22);
    const meterScreenMat = new THREE.MeshBasicMaterial({ color: 0x3fb950 });
    const meterScreen = new THREE.Mesh(meterScreenGeo, meterScreenMat);
    meterScreen.position.set(0, 1.05, 0.28);
    dispenserGroup.add(meterScreen);

    // Fuel Hose & High-Flow Nozzle
    const nozzleHoseGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.9 });
    const nozzleHose = new THREE.Mesh(nozzleHoseGeo, nozzleMat);
    nozzleHose.position.set(0.42, 0.85, 0);
    dispenserGroup.add(nozzleHose);

    const nozzleGunGeo = new THREE.BoxGeometry(0.06, 0.18, 0.12);
    const nozzleGunMat = new THREE.MeshStandardMaterial({ color: 0xd29922, metalness: 0.8, roughness: 0.3 });
    const nozzleGun = new THREE.Mesh(nozzleGunGeo, nozzleGunMat);
    nozzleGun.position.set(0.42, 1.25, 0.04);
    dispenserGroup.add(nozzleGun);

    stationGroup.add(dispenserGroup);

    // 2. Heavy 55-Gallon (208L) Industrial Fluid Drums on Yellow Spill Containment Pallet
    const palletGeo = new THREE.BoxGeometry(2.4, 0.14, 1.4);
    const palletMat = new THREE.MeshStandardMaterial({ color: 0xd29922, roughness: 0.6 });
    const pallet = new THREE.Mesh(palletGeo, palletMat);
    pallet.position.set(1.0, 0.07, 0);
    stationGroup.add(pallet);

    // 3 Fluid Drums: 0W-30 Synthetic Motor Oil (Blue), Coolant (Red), DOT4 Brake Fluid (Black)
    const drumConfigs = [
      { x: 0.2, color: 0x0969da, label: '0W-30 SYNTHETIC OIL' },
      { x: 1.0, color: 0xcf222e, label: 'ETHYLENE GLYCOL COOLANT' },
      { x: 1.8, color: 0x1f242c, label: 'DOT 4 BRAKE FLUID' }
    ];

    drumConfigs.forEach(d => {
      const drumGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.88, 20);
      const drumMat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.45, metalness: 0.6 });
      const drum = new THREE.Mesh(drumGeo, drumMat);
      drum.position.set(d.x, 0.58, 0);
      stationGroup.add(drum);

      // Rotary hand transfer pump with gooseneck spout
      const pumpGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0xcf222e, metalness: 0.7 });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(d.x, 1.15, 0);
      stationGroup.add(pump);
    });

    this.scene.add(stationGroup);
  }

  createRotatingEngineStand() {
    // -------------------------------------------------------------
    // ROTATING ENGINE STAND (Positioned adjacent to Engine Crane: x = 5.2, z = 3.2)
    // -------------------------------------------------------------
    const standGroup = new THREE.Group();
    standGroup.position.set(5.2, 0, 3.2);

    const standMat = new THREE.MeshStandardMaterial({ color: 0xcf222e, roughness: 0.4, metalness: 0.5 }); // Workshop Red
    // H-Frame base
    const spineGeo = new THREE.BoxGeometry(0.12, 0.08, 0.95);
    const spine = new THREE.Mesh(spineGeo, standMat);
    spine.position.set(0, 0.06, 0);
    standGroup.add(spine);

    const crossGeo = new THREE.BoxGeometry(0.75, 0.08, 0.12);
    const frontCross = new THREE.Mesh(crossGeo, standMat);
    frontCross.position.set(0, 0.06, 0.45);
    standGroup.add(frontCross);

    const rearCross = new THREE.Mesh(crossGeo, standMat);
    rearCross.position.set(0, 0.06, -0.45);
    standGroup.add(rearCross);

    // 4 Heavy-Duty Swivel Casters
    const casterMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.8 });
    [[-0.35, 0.45], [0.35, 0.45], [-0.35, -0.45], [0.35, -0.45]].forEach(([cx, cz]) => {
      const cGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12);
      const caster = new THREE.Mesh(cGeo, casterMat);
      caster.position.set(cx, 0.025, cz);
      standGroup.add(caster);
    });

    // Angled Vertical Upright Mast
    const mastGeo = new THREE.BoxGeometry(0.12, 0.95, 0.12);
    const mast = new THREE.Mesh(mastGeo, standMat);
    mast.position.set(0, 0.52, -0.32);
    standGroup.add(mast);

    // 360-Degree Rotating Head with Slotted Arms
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.98, -0.15);

    const hubGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.14, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.85, roughness: 0.25 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    headGroup.add(hub);

    // 4 Adjustable mounting arms
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const armGeo = new THREE.BoxGeometry(0.04, 0.24, 0.02);
      const arm = new THREE.Mesh(armGeo, hubMat);
      arm.position.set(Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0.08);
      headGroup.add(arm);
    }

    // Worm gear rotation handle
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b949e, metalness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0, -0.14);
    headGroup.add(handle);

    standGroup.add(headGroup);
    this.scene.add(standGroup);
  }

  initColliders() {
    // Register physical collision volumes for first-person walking navigation
    this.colliders = [
      // Workshop Perimeter Walls (clamped within [-16.5, 16.5])
      // Hydraulic Lift Left Post (radius 0.35m around x = -1.6, z = 0)
      { type: 'cylinder', x: -1.6, z: 0, radius: 0.40 },
      // Hydraulic Lift Right Post (radius 0.35m around x = 1.6, z = 0)
      { type: 'cylinder', x: 1.6, z: 0, radius: 0.40 },
      // Rear Main Workbenches: z = -17.0, x span [-10, 10]
      { type: 'box', minX: -10.5, maxX: 10.5, minZ: -17.8, maxZ: -15.8 },
      // Red Rollaway Tool Chest: x = 2.8, z = -1.2
      { type: 'box', minX: 2.3, maxX: 3.3, minZ: -1.6, maxZ: -0.8 },
      // Mobile Diagnostic Oscilloscope Station: x = -2.8, z = -1.2
      { type: 'box', minX: -3.3, maxX: -2.3, minZ: -1.6, maxZ: -0.8 },
      // Engine Crane: x = 3.5, z = 3.2
      { type: 'cylinder', x: 3.5, z: 3.2, radius: 0.85 },
      // Rotating Engine Stand: x = 5.2, z = 3.2
      { type: 'cylinder', x: 5.2, z: 3.2, radius: 0.65 },
      // Paint Booth Partition: x = 9.05, z = -2.0
      { type: 'box', minX: 8.9, maxX: 9.3, minZ: -5.9, maxZ: 1.9 },
      // Refueling Station Cart: x = 6.1, z = -12.0
      { type: 'box', minX: 5.6, maxX: 8.9, minZ: -12.8, maxZ: -11.2 }
    ];
  }

  checkCollision(targetPos, playerRadius = 0.35) {
    let resolvedX = targetPos.x;
    let resolvedZ = targetPos.z;

    // Run 2 relaxation passes to cleanly resolve multi-obstacle pinch zones
    for (let pass = 0; pass < 2; pass++) {
      // 1. Check vehicle unibody collision (only when lift is down below 1.45m)
      if (this.liftHeight < 1.45) {
        const vMinX = -1.05 - playerRadius;
        const vMaxX = 1.05 + playerRadius;
        const vMinZ = -2.40 - playerRadius;
        const vMaxZ = 2.40 + playerRadius;

        if (resolvedX > vMinX && resolvedX < vMaxX && resolvedZ > vMinZ && resolvedZ < vMaxZ) {
          // In pinch zone between car flanks and lift posts (|z| < 0.9), push longitudinally towards front/back
          if (Math.abs(resolvedZ) < 0.9) {
            resolvedZ = resolvedZ >= 0 ? (0.95 + playerRadius) : (-0.95 - playerRadius);
          } else {
            const dLeft = Math.abs(resolvedX - vMinX);
            const dRight = Math.abs(resolvedX - vMaxX);
            const dFront = Math.abs(resolvedZ - vMaxZ);
            const dBack = Math.abs(resolvedZ - vMinZ);
            const minD = Math.min(dLeft, dRight, dFront, dBack);

            if (minD === dLeft) resolvedX = vMinX;
            else if (minD === dRight) resolvedX = vMaxX;
            else if (minD === dFront) resolvedZ = vMaxZ;
            else resolvedZ = vMinZ;
          }
        }
      }

      // 2. Check against registered equipment, workbenches, and lift posts
      for (const c of this.colliders) {
        if (c.type === 'cylinder') {
          const dx = resolvedX - c.x;
          const dz = resolvedZ - c.z;
          const distSq = dx * dx + dz * dz;
          const minDist = c.radius + playerRadius;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const push = minDist - dist;
            resolvedX += (dx / dist) * push;
            resolvedZ += (dz / dist) * push;
          }
        } else if (c.type === 'box') {
          const minX = c.minX - playerRadius;
          const maxX = c.maxX + playerRadius;
          const minZ = c.minZ - playerRadius;
          const maxZ = c.maxZ + playerRadius;

          if (resolvedX > minX && resolvedX < maxX && resolvedZ > minZ && resolvedZ < maxZ) {
            const dLeft = Math.abs(resolvedX - minX);
            const dRight = Math.abs(resolvedX - maxX);
            const dFront = Math.abs(resolvedZ - maxZ);
            const dBack = Math.abs(resolvedZ - minZ);
            const minD = Math.min(dLeft, dRight, dFront, dBack);

            if (minD === dLeft) resolvedX = minX;
            else if (minD === dRight) resolvedX = maxX;
            else if (minD === dFront) resolvedZ = maxZ;
            else resolvedZ = minZ;
          }
        }
      }

      // 3. Check against workshop perimeter walls
      resolvedX = Math.max(-16.0 + playerRadius, Math.min(16.0 - playerRadius, resolvedX));
      resolvedZ = Math.max(-16.0 + playerRadius, Math.min(16.0 - playerRadius, resolvedZ));
    }

    return { x: resolvedX, z: resolvedZ };
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
