import * as THREE from '../vendor/three.module.js';

/**
 * MECHVERSE - High-Fidelity 3D Automotive Vehicle Architecture
 * 
 * Features:
 * - Sculpted modern performance sedan unibody with PBR metallic paint
 * - Functional opening bonnet / hood with hydraulic struts (revealing full engine bay)
 * - 4 functional opening doors (Driver, Passenger, Rear Left, Rear Right) with door cards
 * - Functional opening rear trunk / boot with cargo liner
 * - Detailed Inline-4 16-Valve DOHC engine with transparent cutaway mode for moving pistons
 * - Radiator with electric dual cooling fans, hoses, and overflow reservoir
 * - Exhaust system: downpipe, catalytic converter, resonator, muffler, and dual polished tips
 * - Running gear: McPherson front struts, steering rack, tie rods, rear multi-link suspension
 * - 4 performance wheels with radial tread tires, ventilated brake discs, and 4-piston calipers
 * - Full detailed interior: sport bucket seats, steering wheel, digital dashboard, center console
 */

export class VehicleModel {
  constructor(scene, liftGroup) {
    this.scene = scene;
    this.liftGroup = liftGroup; // Moves synchronously with the hydraulic lift
    this.interactiveMeshes = new Map(); // componentId -> THREE.Mesh or THREE.Group
    this.surfaceMeshes = new Map(); // surfaceId -> Array<THREE.Mesh>
    this.vehicleRoot = new THREE.Group();
    this.liftGroup.add(this.vehicleRoot);

    // Opening Panel Kinematic Hinge Groups
    this.hinges = {
      bonnet: { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: -0.78, isOpen: false },
      doorFL: { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: -0.95, isOpen: false },
      doorFR: { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: 0.95, isOpen: false },
      doorRL: { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: -0.85, isOpen: false },
      doorRR: { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: 0.85, isOpen: false },
      trunk:  { group: null, currentAngle: 0.0, targetAngle: 0.0, maxAngle: 0.82, isOpen: false }
    };

    // Piston mesh array for engine cutaway motion
    this.pistonMeshes = [];
    this.isCutawayActive = false;

    // Materials Palette
    this.initMaterials();
    this.initVehicleGeometry();
  }

  initMaterials() {
    // BMW M4 Competition (G82) Multi-layer PBR Metallic Lacquer with High-Gloss Clearcoat
    this.carPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8, // Tanzanite / Portimao Blue Metallic
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });

    // Dark Unibody Steel & Subframe
    this.chassisMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.65,
      metalness: 0.75
    });

    // BMW Shadowline High-Gloss Black Trim & Kidney Slats
    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.15,
      metalness: 0.85
    });

    // Lightweight Carbon Fiber Roof with Clearcoat
    this.carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x14181f,
      roughness: 0.35,
      metalness: 0.35,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08
    });

    // Automotive Safety Glass (Tinted Windshield & Windows)
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x90caf9,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.52
    });

    // Cast Engine Aluminum
    this.engineAlumMat = new THREE.MeshStandardMaterial({
      color: 0x8b949e,
      roughness: 0.45,
      metalness: 0.85
    });

    // Polished Chrome / Stainless Steel (Quad M Exhaust tips, badges)
    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf0f6fc,
      metalness: 0.98,
      roughness: 0.05
    });

    // BMW M Sport Compound Brake Caliper Enamel (Signature M Blue)
    this.caliperMat = new THREE.MeshStandardMaterial({
      color: 0x0055b8,
      roughness: 0.25,
      metalness: 0.5
    });

    // Cross-Drilled Ventilated Brake Rotor Steel
    this.rotorMat = new THREE.MeshStandardMaterial({
      color: 0xb0b8c4,
      metalness: 0.94,
      roughness: 0.22
    });

    // Black Textured Interior Leather & Upholstery
    this.leatherMat = new THREE.MeshStandardMaterial({
      color: 0x21262d,
      roughness: 0.85,
      metalness: 0.1
    });
  }

  initVehicleGeometry() {
    // Sitting on hydraulic lift pads
    this.vehicleRoot.position.set(0, 0.28, 0);

    // 1. Lower Unibody Pan & Structural Floor
    const floorGeo = new THREE.BoxGeometry(1.72, 0.22, 4.3);
    const floorMesh = new THREE.Mesh(floorGeo, this.chassisMat);
    floorMesh.position.set(0, 0.28, 0);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    this.vehicleRoot.add(floorMesh);

    // 2. Sculpted Lower Body & Rocker Panels
    this.buildBodyShell();

    // 3. Front & Rear Bumpers, Grille, and Aerodynamics
    this.buildFasciasAndAero();

    // 4. Roof Structure, Glass Canopy & Pillars
    this.buildRoofAndGlass();

    // 5. Functional Opening Panels: Bonnet, 4 Doors, Trunk
    this.buildOpeningPanels();

    // 6. Complete Inline-4 Engine Bay & Running Gear
    this.buildEngineBay();

    // 7. Full Interior Cabin (Dashboard, Steering, Sport Seats)
    this.buildInterior();

    // 8. Suspension, Steering Rack, Brake Discs & 4 Wheels
    this.buildSuspensionAndWheels();

    // 9. Full Exhaust System & Fuel Tank
    this.buildExhaustAndFuel();
  }

  buildBodyShell() {
    // Left & Right sculpted quarter panels and door sills
    [-0.88, 0.88].forEach((x, idx) => {
      const isRight = x > 0;
      // Front Fender / Quarter Panel
      const fenderGeo = new THREE.BoxGeometry(0.08, 0.54, 1.15);
      const fenderMesh = new THREE.Mesh(fenderGeo, this.carPaintMat);
      fenderMesh.position.set(x, 0.52, 1.25);
      fenderMesh.castShadow = true;
      this.vehicleRoot.add(fenderMesh);

      if (isRight) {
        fenderMesh.userData = { componentId: 'front_right_quarter_panel', surfaceId: 'surface_body_exterior' };
        this.interactiveMeshes.set('front_right_quarter_panel', fenderMesh);
      }

      // Rear Quarter Panel
      const rearQtrGeo = new THREE.BoxGeometry(0.08, 0.56, 1.35);
      const rearQtrMesh = new THREE.Mesh(rearQtrGeo, this.carPaintMat);
      rearQtrMesh.position.set(x, 0.54, -1.25);
      rearQtrMesh.castShadow = true;
      this.vehicleRoot.add(rearQtrMesh);

      // Aerodynamic Side Skirt
      const skirtGeo = new THREE.BoxGeometry(0.12, 0.12, 2.4);
      const skirtMesh = new THREE.Mesh(skirtGeo, this.trimMat);
      skirtMesh.position.set(x * 1.02, 0.22, 0);
      this.vehicleRoot.add(skirtMesh);
    });
  }

  buildFasciasAndAero() {
    // Front Bumper Assembly with M4 G82 Sculpted Aerodynamics
    const frontBumperGroup = new THREE.Group();
    frontBumperGroup.position.set(0, 0.36, 2.18);

    const bumperGeo = new THREE.BoxGeometry(1.84, 0.44, 0.34);
    const bumperMesh = new THREE.Mesh(bumperGeo, this.carPaintMat);
    frontBumperGroup.add(bumperMesh);

    // --- Iconic BMW M4 G82 Frameless Vertical Twin Kidney Grilles ---
    [-0.19, 0.19].forEach(gx => {
      // Tall vertical kidney frame
      const kidneyFrameGeo = new THREE.BoxGeometry(0.24, 0.54, 0.06);
      const kidneyFrame = new THREE.Mesh(kidneyFrameGeo, this.trimMat);
      kidneyFrame.position.set(gx, 0.12, 0.18);
      frontBumperGroup.add(kidneyFrame);

      // Horizontal double slats inside each kidney grille
      for (let s = -0.18; s <= 0.18; s += 0.08) {
        const slatGeo = new THREE.BoxGeometry(0.21, 0.015, 0.07);
        const slat = new THREE.Mesh(slatGeo, this.trimMat);
        slat.position.set(gx, 0.12 + s, 0.18);
        frontBumperGroup.add(slat);
      }
    });

    // M4 Competition Grille Badge
    const badgeGeo = new THREE.BoxGeometry(0.06, 0.02, 0.02);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0.18, 0.26, 0.22);
    frontBumperGroup.add(badge);

    // Lateral Brake Cooling Air Inlets
    [-0.64, 0.64].forEach(lx => {
      const inletGeo = new THREE.BoxGeometry(0.32, 0.24, 0.08);
      const inlet = new THREE.Mesh(inletGeo, this.trimMat);
      inlet.position.set(lx, -0.04, 0.16);
      frontBumperGroup.add(inlet);
    });

    // Carbon Aero Front Splitter with Lateral Winglets
    const splitterGeo = new THREE.BoxGeometry(1.88, 0.04, 0.32);
    const splitter = new THREE.Mesh(splitterGeo, this.carbonMat);
    splitter.position.set(0, -0.20, 0.08);
    frontBumperGroup.add(splitter);

    [-0.92, 0.92].forEach(wx => {
      const wingletGeo = new THREE.BoxGeometry(0.04, 0.10, 0.20);
      const winglet = new THREE.Mesh(wingletGeo, this.carbonMat);
      winglet.position.set(wx, -0.15, 0.12);
      frontBumperGroup.add(winglet);
    });

    // License Plate
    const plateGeo = new THREE.BoxGeometry(0.48, 0.12, 0.02);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, -0.06, 0.20);
    frontBumperGroup.add(plate);

    this.vehicleRoot.add(frontBumperGroup);

    // Rear Bumper with M Diffuser & Quad Exhaust
    const rearBumperGroup = new THREE.Group();
    rearBumperGroup.position.set(0, 0.38, -2.18);

    const rBumperGeo = new THREE.BoxGeometry(1.84, 0.46, 0.34);
    const rBumperMesh = new THREE.Mesh(rBumperGeo, this.carPaintMat);
    rearBumperGroup.add(rBumperMesh);

    // High-Gloss Black M Rear Diffuser with Central Vertical Strakes
    const diffuserGeo = new THREE.BoxGeometry(1.46, 0.22, 0.18);
    const diffuser = new THREE.Mesh(diffuserGeo, this.trimMat);
    diffuser.position.set(0, -0.16, -0.14);
    rearBumperGroup.add(diffuser);

    [-0.22, 0, 0.22].forEach(sx => {
      const strakeGeo = new THREE.BoxGeometry(0.025, 0.16, 0.18);
      const strake = new THREE.Mesh(strakeGeo, this.trimMat);
      strake.position.set(sx, -0.18, -0.14);
      rearBumperGroup.add(strake);
    });

    // Quad 90mm Polished Stainless Steel M Exhaust Tips
    [-0.52, -0.40, 0.40, 0.52].forEach(exX => {
      const tipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16);
      const tip = new THREE.Mesh(tipGeo, this.chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(exX, -0.16, -0.22);
      rearBumperGroup.add(tip);
    });

    this.vehicleRoot.add(rearBumperGroup);

    // Slim Aggressive LED Headlights with L-Shaped DRL Signatures
    [-0.68, 0.68].forEach((x) => {
      const hlGroup = new THREE.Group();
      hlGroup.position.set(x, 0.56, 2.12);

      const hlHousingGeo = new THREE.BoxGeometry(0.38, 0.14, 0.22);
      const hlMesh = new THREE.Mesh(hlHousingGeo, this.glassMat);
      hlGroup.add(hlMesh);

      // Dual L-shaped LED Light Guides
      [-0.07, 0.07].forEach(lx => {
        const drlGeo = new THREE.BoxGeometry(0.08, 0.02, 0.08);
        const drlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 0.8 });
        const drl = new THREE.Mesh(drlGeo, drlMat);
        drl.position.set(lx, -0.03, 0.06);
        hlGroup.add(drl);

        const projGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.07, 16);
        const projMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 });
        const proj = new THREE.Mesh(projGeo, projMat);
        proj.rotation.x = Math.PI / 2;
        proj.position.set(lx, 0.01, 0.05);
        hlGroup.add(proj);
      });

      if (x > 0) {
        hlGroup.userData = { componentId: 'headlight_assembly_fr', surfaceId: 'surface_body_exterior' };
        this.interactiveMeshes.set('headlight_assembly_fr', hlGroup);
      }
      this.vehicleRoot.add(hlGroup);
    });

    // Sculpted OLED Tail Light Clusters
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xba1a1a,
      roughness: 0.2,
      emissive: 0x7a0c0c,
      emissiveIntensity: 0.4
    });
    [-0.72, 0.72].forEach(x => {
      const tlGeo = new THREE.BoxGeometry(0.34, 0.12, 0.14);
      const tlMesh = new THREE.Mesh(tlGeo, tailMat);
      tlMesh.position.set(x, 0.64, -2.14);
      this.vehicleRoot.add(tlMesh);
    });
  }

  buildRoofAndGlass() {
    // Lightweight Carbon Fiber Roof Panel with central aerodynamic channel
    const roofGeo = new THREE.BoxGeometry(1.42, 0.05, 1.85);
    const roofMesh = new THREE.Mesh(roofGeo, this.carbonMat);
    roofMesh.position.set(0, 1.28, -0.15);
    roofMesh.castShadow = true;
    this.vehicleRoot.add(roofMesh);

    // Central aerodynamic recess channel
    const recessGeo = new THREE.BoxGeometry(0.36, 0.02, 1.80);
    const recessMesh = new THREE.Mesh(recessGeo, this.trimMat);
    recessMesh.position.set(0, 1.29, -0.15);
    this.vehicleRoot.add(recessMesh);

    // Front Windshield Glass
    const wsGeo = new THREE.PlaneGeometry(1.38, 0.88);
    const windshield = new THREE.Mesh(wsGeo, this.glassMat);
    windshield.position.set(0, 1.05, 0.95);
    windshield.rotation.x = -Math.PI / 3.4;
    windshield.userData = { componentId: 'windshield_glass', surfaceId: 'surface_windshield_glass' };
    this.vehicleRoot.add(windshield);
    this.interactiveMeshes.set('windshield_glass', windshield);

    // Rear Windshield Glass
    const rwsGeo = new THREE.PlaneGeometry(1.34, 0.78);
    const rearGlass = new THREE.Mesh(rwsGeo, this.glassMat);
    rearGlass.position.set(0, 1.05, -1.22);
    rearGlass.rotation.x = Math.PI / 3.6;
    this.vehicleRoot.add(rearGlass);

    // Roof A-Pillars, B-Pillars, C-Pillars
    [-0.70, 0.70].forEach(x => {
      // A-Pillar (Front)
      const aPillarGeo = new THREE.BoxGeometry(0.06, 0.82, 0.08);
      const aPillar = new THREE.Mesh(aPillarGeo, this.carPaintMat);
      aPillar.position.set(x, 0.98, 0.92);
      aPillar.rotation.x = -Math.PI / 5.5;
      this.vehicleRoot.add(aPillar);

      // B-Pillar (Center)
      const bPillarGeo = new THREE.BoxGeometry(0.06, 0.58, 0.08);
      const bPillar = new THREE.Mesh(bPillarGeo, this.trimMat);
      bPillar.position.set(x, 0.98, -0.15);
      this.vehicleRoot.add(bPillar);

      // C-Pillar (Rear)
      const cPillarGeo = new THREE.BoxGeometry(0.08, 0.76, 0.12);
      const cPillar = new THREE.Mesh(cPillarGeo, this.carPaintMat);
      cPillar.position.set(x, 0.98, -1.18);
      cPillar.rotation.x = Math.PI / 5.2;
      this.vehicleRoot.add(cPillar);
    });
  }

  buildOpeningPanels() {
    // -----------------------------------------------------------
    // 1. BONNET / HOOD (Hinges at base of windshield: z = 0.80)
    // -----------------------------------------------------------
    const bonnetHingeGroup = new THREE.Group();
    bonnetHingeGroup.position.set(0, 0.78, 0.80);

    const bonnetMesh = new THREE.Group();
    const hoodGeo = new THREE.BoxGeometry(1.58, 0.04, 1.28);
    const hoodPlate = new THREE.Mesh(hoodGeo, this.carPaintMat);
    hoodPlate.position.set(0, 0.02, 0.64);
    hoodPlate.castShadow = true;
    bonnetMesh.add(hoodPlate);

    // Dual Sculpted Aerodynamic Hood Power Channels / Spines aligned with vertical kidneys
    [-0.19, 0.19].forEach(px => {
      const channelGeo = new THREE.BoxGeometry(0.18, 0.025, 1.20);
      const channel = new THREE.Mesh(channelGeo, this.carPaintMat);
      channel.position.set(px, 0.045, 0.64);
      bonnetMesh.add(channel);
    });

    bonnetHingeGroup.add(bonnetMesh);
    bonnetHingeGroup.userData = { componentId: 'bonnet_hood', surfaceId: 'surface_body_exterior' };
    this.vehicleRoot.add(bonnetHingeGroup);
    this.interactiveMeshes.set('bonnet_hood', bonnetHingeGroup);
    this.hinges.bonnet.group = bonnetHingeGroup;

    // -----------------------------------------------------------
    // 2. FOUR OPENING DOORS (FL, FR, RL, RR)
    // -----------------------------------------------------------
    const doorConfigs = [
      { id: 'door_front_left', key: 'doorFL', x: -0.88, zHinge: 0.62, width: 0.96, height: 0.58, isLeft: true },
      { id: 'door_front_right', key: 'doorFR', x: 0.88, zHinge: 0.62, width: 0.96, height: 0.58, isLeft: false },
      { id: 'door_rear_left', key: 'doorRL', x: -0.88, zHinge: -0.25, width: 0.84, height: 0.58, isLeft: true },
      { id: 'door_rear_right', key: 'doorRR', x: 0.88, zHinge: -0.25, width: 0.84, height: 0.58, isLeft: false }
    ];

    doorConfigs.forEach(d => {
      const hinge = new THREE.Group();
      hinge.position.set(d.x, 0.54, d.zHinge);

      const doorMesh = new THREE.Group();
      const zOffset = -d.width / 2.0;

      // Outer Painted Door Panel
      const panelGeo = new THREE.BoxGeometry(0.06, d.height, d.width);
      const outerPanel = new THREE.Mesh(panelGeo, this.carPaintMat);
      outerPanel.position.set(0, 0, zOffset);
      outerPanel.castShadow = true;
      doorMesh.add(outerPanel);

      // Door Window Glass
      const winGeo = new THREE.BoxGeometry(0.02, 0.38, d.width * 0.94);
      const windowMesh = new THREE.Mesh(winGeo, this.glassMat);
      windowMesh.position.set(0, d.height * 0.65, zOffset);
      doorMesh.add(windowMesh);

      // Exterior Flush Handle
      const handleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.14);
      const handle = new THREE.Mesh(handleGeo, this.chromeMat);
      handle.position.set(d.isLeft ? -0.04 : 0.04, 0.15, zOffset - d.width * 0.35);
      doorMesh.add(handle);

      // Signature BMW M Aerodynamic Double-Stalk Side View Mirror (Front doors only)
      if (d.key === 'doorFL' || d.key === 'doorFR') {
        const mirrorGroup = new THREE.Group();
        const mX = d.isLeft ? -0.12 : 0.12;
        mirrorGroup.position.set(mX, d.height * 0.45, -0.08);

        // Lower main aerodynamic stalk
        const lowerStalkGeo = new THREE.BoxGeometry(0.08, 0.02, 0.04);
        const lowerStalk = new THREE.Mesh(lowerStalkGeo, this.trimMat);
        lowerStalk.position.set(0, -0.04, 0);
        mirrorGroup.add(lowerStalk);

        // Upper M signature aero winglet / floating stalk
        const upperWingGeo = new THREE.BoxGeometry(0.07, 0.015, 0.08);
        const upperWing = new THREE.Mesh(upperWingGeo, this.trimMat);
        upperWing.position.set(d.isLeft ? 0.02 : -0.02, 0.05, 0.02);
        upperWing.rotation.y = d.isLeft ? 0.2 : -0.2;
        mirrorGroup.add(upperWing);

        // Sculpted Mirror Housing
        const mirrorHousingGeo = new THREE.BoxGeometry(0.12, 0.09, 0.18);
        const mirrorHousing = new THREE.Mesh(mirrorHousingGeo, this.carPaintMat);
        mirrorGroup.add(mirrorHousing);

        // Reflective mirror glass face
        const mirrorGlassGeo = new THREE.BoxGeometry(0.01, 0.08, 0.16);
        const mirrorGlass = new THREE.Mesh(mirrorGlassGeo, this.chromeMat);
        mirrorGlass.position.set(d.isLeft ? 0.06 : -0.06, 0, 0);
        mirrorGroup.add(mirrorGlass);

        doorMesh.add(mirrorGroup);
      }

      hinge.add(doorMesh);
      hinge.userData = { componentId: d.id, surfaceId: 'surface_body_exterior' };
      this.vehicleRoot.add(hinge);
      this.interactiveMeshes.set(d.id, hinge);
      this.hinges[d.key].group = hinge;
    });

    // -----------------------------------------------------------
    // 3. TRUNK / BOOT DECKLID (Hinges at rear window base: z = -1.35)
    // -----------------------------------------------------------
    const trunkHingeGroup = new THREE.Group();
    trunkHingeGroup.position.set(0, 0.88, -1.35);

    const trunkMesh = new THREE.Group();
    const trunkGeo = new THREE.BoxGeometry(1.42, 0.04, 0.80);
    const trunkPlate = new THREE.Mesh(trunkGeo, this.carPaintMat);
    trunkPlate.position.set(0, 0.02, -0.40);
    trunkPlate.castShadow = true;
    trunkMesh.add(trunkPlate);

    // Rear Integrated Lip Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.44, 0.06, 0.10);
    const spoiler = new THREE.Mesh(spoilerGeo, this.trimMat);
    spoiler.position.set(0, 0.05, -0.78);
    trunkMesh.add(spoiler);

    trunkHingeGroup.add(trunkMesh);
    trunkHingeGroup.userData = { componentId: 'boot_trunk', surfaceId: 'surface_body_exterior' };
    this.vehicleRoot.add(trunkHingeGroup);
    this.interactiveMeshes.set('boot_trunk', trunkHingeGroup);
    this.hinges.trunk.group = trunkHingeGroup;
  }

  buildEngineBay() {
    // Engine Bay Sub-assembly Group
    const engineBayGroup = new THREE.Group();
    engineBayGroup.position.set(0, 0.45, 1.40);

    // 1. Inline-4 Engine Block (Cast Iron Lower Block)
    const blockGeo = new THREE.BoxGeometry(0.65, 0.35, 0.72);
    this.engineBlockMesh = new THREE.Mesh(blockGeo, this.chassisMat);
    engineBayGroup.add(this.engineBlockMesh);

    // 2. Cylinder Head (Cast Aluminum DOHC 16-Valve)
    const headGeo = new THREE.BoxGeometry(0.62, 0.20, 0.68);
    const headMesh = new THREE.Mesh(headGeo, this.engineAlumMat);
    headMesh.position.set(0, 0.26, 0);
    engineBayGroup.add(headMesh);

    // 3. Valve Cover (Black Powder-Coated with Oil Filler Cap)
    const valveCoverGeo = new THREE.BoxGeometry(0.58, 0.12, 0.64);
    const valveCoverMat = new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.6 });
    const valveCover = new THREE.Mesh(valveCoverGeo, valveCoverMat);
    valveCover.position.set(0, 0.40, 0);
    engineBayGroup.add(valveCover);

    // Engine Oil Filler Cap (Removable for oil refilling)
    const capGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.035, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd29922, roughness: 0.4 }); // Gold/Yellow
    const oilCap = new THREE.Mesh(capGeo, capMat);
    oilCap.position.set(0.18, 0.48, 0.18);
    oilCap.userData = { componentId: 'engine_oil_fill_cap', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(oilCap);
    this.interactiveMeshes.set('engine_oil_fill_cap', oilCap);

    // 4 Ignition Coils & Spark Plug Wells
    [-0.20, -0.07, 0.07, 0.20].forEach((zPos, i) => {
      const coilGeo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
      const coilMat = new THREE.MeshStandardMaterial({ color: 0x0969da, roughness: 0.5 });
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.position.set(0, 0.47, zPos);
      engineBayGroup.add(coil);
    });

    // 4 Moving Reciprocating Pistons (Visible in cutaway mode)
    this.pistonMeshes = [];
    [-0.20, -0.07, 0.07, 0.20].forEach((zPos, i) => {
      const pistonGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.07, 16);
      const pistonMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.9, roughness: 0.2 });
      const piston = new THREE.Mesh(pistonGeo, pistonMat);
      piston.position.set(0, 0.20, zPos);
      piston.visible = false;
      engineBayGroup.add(piston);
      this.pistonMeshes.push(piston);
    });

    // 4. Intake Manifold & Air Intake System (Left Side)
    const intakeGeo = new THREE.BoxGeometry(0.24, 0.22, 0.60);
    const intake = new THREE.Mesh(intakeGeo, this.trimMat);
    intake.position.set(-0.38, 0.24, 0);
    engineBayGroup.add(intake);

    const airboxGeo = new THREE.BoxGeometry(0.28, 0.24, 0.32);
    const airbox = new THREE.Mesh(airboxGeo, this.trimMat);
    airbox.position.set(-0.62, 0.26, 0.40);
    engineBayGroup.add(airbox);

    // 5. Exhaust Manifold & Stainless Heat Shield (Right Side)
    const exhaustManiGeo = new THREE.BoxGeometry(0.18, 0.18, 0.55);
    const exhaustMani = new THREE.Mesh(exhaustManiGeo, this.engineAlumMat);
    exhaustMani.position.set(0.36, 0.18, 0);
    engineBayGroup.add(exhaustMani);

    // 6. Front Cooling Radiator & Twin Electric Fans
    const radGroup = new THREE.Group();
    radGroup.position.set(0, 0.10, 0.65);

    const radCoreGeo = new THREE.BoxGeometry(0.78, 0.46, 0.08);
    const radCoreMat = new THREE.MeshStandardMaterial({ color: 0x30363d, roughness: 0.6, metalness: 0.5 });
    const radCore = new THREE.Mesh(radCoreGeo, radCoreMat);
    radGroup.add(radCore);

    // Twin cooling fan shrouds
    [-0.20, 0.20].forEach(x => {
      const fanGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24);
      const fan = new THREE.Mesh(fanGeo, this.trimMat);
      fan.rotation.x = Math.PI / 2;
      fan.position.set(x, 0, -0.05);
      radGroup.add(fan);
    });

    radGroup.userData = { componentId: 'radiator_assembly', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(radGroup);
    this.interactiveMeshes.set('radiator_assembly', radGroup);

    // Molded Upper & Lower Radiator Hoses
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const upperHoseGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12);
    const upperHose = new THREE.Mesh(upperHoseGeo, hoseMat);
    upperHose.rotation.z = Math.PI / 3;
    upperHose.position.set(-0.18, 0.24, 0.48);
    engineBayGroup.add(upperHose);

    // 7. Alternator with Serpentine Pulley
    const altGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16);
    const altMesh = new THREE.Mesh(altGeo, this.engineAlumMat);
    altMesh.rotation.z = Math.PI / 2;
    altMesh.position.set(-0.35, -0.05, 0.25);
    engineBayGroup.add(altMesh);

    // 8. Oil Sump / Pan (Bottom of engine)
    const panGeo = new THREE.BoxGeometry(0.52, 0.16, 0.52);
    const panMesh = new THREE.Mesh(panGeo, this.chassisMat);
    panMesh.position.set(0, -0.24, 0);
    engineBayGroup.add(panMesh);

    // Oil Drain Plug on Bottom Right of Pan
    const plugMat = new THREE.MeshStandardMaterial({ color: 0xd29922, metalness: 0.8, roughness: 0.2 });
    const plugGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 6);
    const drainPlug = new THREE.Mesh(plugGeo, plugMat);
    drainPlug.position.set(0.16, -0.32, 0.05);
    drainPlug.userData = { componentId: 'oil_drain_plug', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(drainPlug);
    this.interactiveMeshes.set('oil_drain_plug', drainPlug);

    // Spin-On Oil Filter Canister (Blue)
    const filterMat = new THREE.MeshStandardMaterial({ color: 0x0969da, roughness: 0.3, metalness: 0.4 });
    const filterGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.14, 24);
    const filterMesh = new THREE.Mesh(filterGeo, filterMat);
    filterMesh.rotation.x = Math.PI / 2;
    filterMesh.position.set(0.26, -0.16, 0.22);
    filterMesh.userData = { componentId: 'oil_filter_canister', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(filterMesh);
    this.interactiveMeshes.set('oil_filter_canister', filterMesh);

    // 9. 12V Battery with Terminal Posts
    const batteryGroup = new THREE.Group();
    batteryGroup.position.set(-0.62, 0.14, -0.15);

    const batCaseGeo = new THREE.BoxGeometry(0.24, 0.20, 0.28);
    const batCaseMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.8 });
    const batCase = new THREE.Mesh(batCaseGeo, batCaseMat);
    batteryGroup.add(batCase);

    const posPostGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.04, 16);
    const posPostMat = new THREE.MeshStandardMaterial({ color: 0xcf222e, metalness: 0.6, roughness: 0.3 });
    const posPost = new THREE.Mesh(posPostGeo, posPostMat);
    posPost.position.set(-0.06, 0.12, 0.08);
    batteryGroup.add(posPost);

    const negPostMat = new THREE.MeshStandardMaterial({ color: 0x0969da, metalness: 0.6, roughness: 0.3 });
    const negPost = new THREE.Mesh(posPostGeo, negPostMat);
    negPost.position.set(0.06, 0.12, -0.08);
    batteryGroup.add(negPost);

    batteryGroup.userData = { componentId: 'battery_12v', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(batteryGroup);
    this.interactiveMeshes.set('battery_12v', batteryGroup);

    // 10. Engine Ground Strap (Braided Copper)
    const groundStrapGeo = new THREE.BoxGeometry(0.25, 0.015, 0.04);
    const groundStrapMat = new THREE.MeshStandardMaterial({ color: 0xb08800, metalness: 0.9, roughness: 0.35 });
    const groundStrap = new THREE.Mesh(groundStrapGeo, groundStrapMat);
    groundStrap.position.set(-0.36, -0.08, -0.18);
    groundStrap.rotation.z = Math.PI / 12;
    groundStrap.userData = { componentId: 'engine_ground_strap', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(groundStrap);
    this.interactiveMeshes.set('engine_ground_strap', groundStrap);

    // 11. Underhood Fuse Box
    const fuseBoxGeo = new THREE.BoxGeometry(0.18, 0.12, 0.22);
    const fuseBoxMat = new THREE.MeshStandardMaterial({ color: 0x24292f, roughness: 0.5 });
    const fuseBox = new THREE.Mesh(fuseBoxGeo, fuseBoxMat);
    fuseBox.position.set(-0.64, 0.18, -0.42);
    fuseBox.userData = { componentId: 'underhood_fuse_box', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(fuseBox);
    this.interactiveMeshes.set('underhood_fuse_box', fuseBox);

    // 12. Starter Motor with Solenoid
    const starterGroup = new THREE.Group();
    starterGroup.position.set(0.32, -0.15, -0.22);

    const starterMotorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.20, 24);
    const starterMotor = new THREE.Mesh(starterMotorGeo, this.engineAlumMat);
    starterMotor.rotation.x = Math.PI / 2;
    starterGroup.add(starterMotor);

    const solenoidGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 16);
    const solenoid = new THREE.Mesh(solenoidGeo, this.engineAlumMat);
    solenoid.rotation.x = Math.PI / 2;
    solenoid.position.set(0, 0.07, 0.02);
    starterGroup.add(solenoid);

    starterGroup.userData = { componentId: 'starter_motor', surfaceId: 'surface_engine_bay' };
    engineBayGroup.add(starterGroup);
    this.interactiveMeshes.set('starter_motor', starterGroup);

    this.vehicleRoot.add(engineBayGroup);
  }

  buildInterior() {
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.40, -0.20);

    // 1. Contoured Front Bucket Seats (Driver & Passenger)
    [-0.38, 0.38].forEach(x => {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(x, 0.14, 0.15);

      // Seat cushion bottom with side bolsters
      const bottomGeo = new THREE.BoxGeometry(0.48, 0.14, 0.54);
      const bottom = new THREE.Mesh(bottomGeo, this.leatherMat);
      seatGroup.add(bottom);

      // Angled backrest
      const backGeo = new THREE.BoxGeometry(0.46, 0.62, 0.14);
      const back = new THREE.Mesh(backGeo, this.leatherMat);
      back.position.set(0, 0.35, -0.24);
      back.rotation.x = -0.18;
      seatGroup.add(back);

      // Headrest
      const hrGeo = new THREE.BoxGeometry(0.24, 0.16, 0.10);
      const hr = new THREE.Mesh(hrGeo, this.leatherMat);
      hr.position.set(0, 0.72, -0.30);
      seatGroup.add(hr);

      interiorGroup.add(seatGroup);
    });

    // 2. Rear Bench Seat
    const rearBenchGeo = new THREE.BoxGeometry(1.28, 0.18, 0.56);
    const rearBench = new THREE.Mesh(rearBenchGeo, this.leatherMat);
    rearBench.position.set(0, 0.16, -0.72);
    interiorGroup.add(rearBench);

    const rearBackGeo = new THREE.BoxGeometry(1.26, 0.58, 0.14);
    const rearBack = new THREE.Mesh(rearBackGeo, this.leatherMat);
    rearBack.position.set(0, 0.48, -0.96);
    interiorGroup.add(rearBack);

    // 3. Dashboard, Instrument Cluster & Steering Column
    const dashGeo = new THREE.BoxGeometry(1.42, 0.32, 0.52);
    const dash = new THREE.Mesh(dashGeo, this.trimMat);
    dash.position.set(0, 0.52, 0.72);
    interiorGroup.add(dash);

    // Digital Instrument Cluster (Driver side: x = -0.38)
    const clusterGeo = new THREE.PlaneGeometry(0.32, 0.14);
    const clusterMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const cluster = new THREE.Mesh(clusterGeo, clusterMat);
    cluster.position.set(-0.38, 0.62, 0.54);
    cluster.rotation.x = -0.35;
    interiorGroup.add(cluster);

    // 3-Spoke Sport Steering Wheel
    const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12);
    const column = new THREE.Mesh(columnGeo, this.trimMat);
    column.rotation.x = -Math.PI / 4;
    column.position.set(-0.38, 0.48, 0.45);
    interiorGroup.add(column);

    const wheelRimGeo = new THREE.TorusGeometry(0.18, 0.02, 16, 32);
    const wheelRim = new THREE.Mesh(wheelRimGeo, this.leatherMat);
    wheelRim.rotation.x = -Math.PI / 4;
    wheelRim.position.set(-0.38, 0.58, 0.35);
    interiorGroup.add(wheelRim);

    // Center Console & Shifter
    const consoleGeo = new THREE.BoxGeometry(0.24, 0.22, 0.85);
    const consoleMesh = new THREE.Mesh(consoleGeo, this.trimMat);
    consoleMesh.position.set(0, 0.20, 0.18);
    interiorGroup.add(consoleMesh);

    const shifterGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.14, 8);
    const shifter = new THREE.Mesh(shifterGeo, this.chromeMat);
    shifter.position.set(0, 0.36, 0.22);
    interiorGroup.add(shifter);

    interiorGroup.userData = { componentId: 'interior_cabin', surfaceId: 'surface_interior_cabin' };
    this.vehicleRoot.add(interiorGroup);
    this.interactiveMeshes.set('interior_cabin', interiorGroup);
  }

  buildSuspensionAndWheels() {
    // -------------------------------------------------------------
    // INTERACTIVE WHEEL: Front Right 18" Wheel (x = 1.02, z = 1.35)
    // -------------------------------------------------------------
    const frWheelGroup = new THREE.Group();
    frWheelGroup.position.set(1.02, 0.35, 1.35);

    // High-Performance Radial Tire (Grooved Rubber)
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 32);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    frWheelGroup.add(tire);

    // 18" 5-Spoke Sport Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.25, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.92, roughness: 0.18 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    frWheelGroup.add(rim);

    // 5x M12 Lug Nuts
    const lugMat = new THREE.MeshStandardMaterial({ color: 0x8c959f, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const lugGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.035, 6);
      const lug = new THREE.Mesh(lugGeo, lugMat);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(0.13, Math.sin(angle) * 0.10, Math.cos(angle) * 0.10);
      frWheelGroup.add(lug);
    }

    frWheelGroup.userData = { componentId: 'front_right_wheel', surfaceId: 'surface_wheels' };
    this.vehicleRoot.add(frWheelGroup);
    this.interactiveMeshes.set('front_right_wheel', frWheelGroup);

    // -------------------------------------------------------------
    // INTERACTIVE BRAKE: Front Right Ventilated Rotor & Caliper
    // -------------------------------------------------------------
    const frBrakeGroup = new THREE.Group();
    frBrakeGroup.position.set(0.88, 0.35, 1.35);

    const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.035, 32);
    const rotor = new THREE.Mesh(rotorGeo, this.rotorMat);
    rotor.rotation.z = Math.PI / 2;
    frBrakeGroup.add(rotor);

    // Signature M Blue 6-Piston High-Performance Caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.18, 0.13);
    const caliper = new THREE.Mesh(caliperGeo, this.caliperMat);
    caliper.position.set(0.02, 0.12, 0.08);
    frBrakeGroup.add(caliper);

    frBrakeGroup.userData = { componentId: 'brake_rotor_fr', surfaceId: 'surface_wheels' };
    this.vehicleRoot.add(frBrakeGroup);
    this.interactiveMeshes.set('brake_rotor_fr', frBrakeGroup);

    // Front Strut Lower Clamp Bolt
    const strutBoltMat = new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.8, roughness: 0.3 });
    const strutBoltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6);
    const strutBolt = new THREE.Mesh(strutBoltGeo, strutBoltMat);
    strutBolt.position.set(0.82, 0.52, 1.35);
    strutBolt.rotation.z = Math.PI / 2;
    strutBolt.userData = { componentId: 'suspension_strut_bolt', surfaceId: 'surface_wheels' };
    this.vehicleRoot.add(strutBolt);
    this.interactiveMeshes.set('suspension_strut_bolt', strutBolt);

    // Other 3 Complete Wheels & Brake Rotors
    this.createWheelAssembly(-1.02, 0.35, 1.35, true);  // Front Left
    this.createWheelAssembly(1.02, 0.35, -1.35, false); // Rear Right
    this.createWheelAssembly(-1.02, 0.35, -1.35, true);  // Rear Left
  }

  createWheelAssembly(x, y, z, isLeft) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);

    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 28);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.25, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.92, roughness: 0.18 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // 5x Lug nuts
    const lugMat = new THREE.MeshStandardMaterial({ color: 0x8c959f, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const lugGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.035, 6);
      const lug = new THREE.Mesh(lugGeo, lugMat);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(isLeft ? -0.13 : 0.13, Math.sin(angle) * 0.10, Math.cos(angle) * 0.10);
      wheelGroup.add(lug);
    }

    this.vehicleRoot.add(wheelGroup);

    // Cross-drilled brake rotor inside wheel
    const rotorGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.03, 24);
    const rotor = new THREE.Mesh(rotorGeo, this.rotorMat);
    rotor.rotation.z = Math.PI / 2;
    const rotorX = isLeft ? x + 0.14 : x - 0.14;
    rotor.position.set(rotorX, y, z);
    this.vehicleRoot.add(rotor);

    // Signature M Blue Caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.16, 0.12);
    const caliper = new THREE.Mesh(caliperGeo, this.caliperMat);
    caliper.position.set(rotorX + (isLeft ? -0.02 : 0.02), y + 0.10, z + 0.06);
    this.vehicleRoot.add(caliper);
  }

  buildExhaustAndFuel() {
    // 1. Full Exhaust System (Downpipe, catalytic converter, resonator, rear muffler)
    const exhaustGroup = new THREE.Group();
    exhaustGroup.position.set(0.20, 0.18, 0);

    // Main exhaust pipe running length of floorpan
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 16);
    const pipeMesh = new THREE.Mesh(pipeGeo, this.engineAlumMat);
    pipeMesh.rotation.x = Math.PI / 2;
    pipeMesh.position.set(0, 0, -0.30);
    exhaustGroup.add(pipeMesh);

    // Rear Transverse Muffler
    const mufflerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.68, 16);
    const muffler = new THREE.Mesh(mufflerGeo, this.engineAlumMat);
    muffler.rotation.z = Math.PI / 2;
    muffler.position.set(0, 0.05, -1.95);
    exhaustGroup.add(muffler);

    // Dual Polished Stainless Exhaust Tips
    [-0.18, 0.18].forEach(x => {
      const tipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 20);
      const tip = new THREE.Mesh(tipGeo, this.chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.02, -2.25);
      exhaustGroup.add(tip);
    });

    this.vehicleRoot.add(exhaustGroup);

    // 2. Fuel Tank (Located under rear seats: z = -0.90)
    const tankGeo = new THREE.BoxGeometry(1.10, 0.28, 0.72);
    const tankMesh = new THREE.Mesh(tankGeo, this.chassisMat);
    tankMesh.position.set(0, 0.22, -0.90);
    this.vehicleRoot.add(tankMesh);

    // 3. Fuel Filler Flap / Door (Rear Right Fender)
    const fuelDoorGeo = new THREE.BoxGeometry(0.04, 0.16, 0.16);
    const fuelDoorMesh = new THREE.Mesh(fuelDoorGeo, this.carPaintMat);
    fuelDoorMesh.position.set(0.92, 0.65, -1.20);
    fuelDoorMesh.userData = { componentId: 'fuel_filler_assembly', surfaceId: 'surface_body_exterior' };
    this.vehicleRoot.add(fuelDoorMesh);
    this.interactiveMeshes.set('fuel_filler_assembly', fuelDoorMesh);
  }

  /**
   * Panel Hinge Kinematics: Toggle opening / closing of bonnet, doors, trunk
   */
  toggleBonnet() {
    this.hinges.bonnet.isOpen = !this.hinges.bonnet.isOpen;
    this.hinges.bonnet.targetAngle = this.hinges.bonnet.isOpen ? this.hinges.bonnet.maxAngle : 0.0;
    return this.hinges.bonnet.isOpen;
  }

  toggleDoor(doorKey) {
    if (this.hinges[doorKey]) {
      this.hinges[doorKey].isOpen = !this.hinges[doorKey].isOpen;
      this.hinges[doorKey].targetAngle = this.hinges[doorKey].isOpen ? this.hinges[doorKey].maxAngle : 0.0;
      return this.hinges[doorKey].isOpen;
    }
    return false;
  }

  toggleTrunk() {
    this.hinges.trunk.isOpen = !this.hinges.trunk.isOpen;
    this.hinges.trunk.targetAngle = this.hinges.trunk.isOpen ? this.hinges.trunk.maxAngle : 0.0;
    return this.hinges.trunk.isOpen;
  }

  /**
   * Mechanical Cutaway Mode: Makes engine block transparent to reveal moving pistons
   */
  setEngineCutaway(active) {
    this.isCutawayActive = active;
    if (this.engineBlockMesh) {
      if (active) {
        this.engineBlockMesh.material = new THREE.MeshPhysicalMaterial({
          color: 0x8b949e,
          transparent: true,
          opacity: 0.25,
          roughness: 0.1,
          transmission: 0.8
        });
      } else {
        this.engineBlockMesh.material = this.chassisMat;
      }
    }
    this.pistonMeshes.forEach(p => p.visible = active);
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

    mesh.traverse(child => {
      if (child.isMesh && child.material) {
        // Dirtiness reduces gloss and increases roughness
        if (component.cleanlinessPercentage < 50) {
          child.material.roughness = THREE.MathUtils.lerp(0.85, 0.22, component.cleanlinessPercentage / 50);
        } else {
          child.material.roughness = 0.22;
        }

        // Fender dent visual representation
        if (component.id === 'front_right_quarter_panel' && component.dentDepthMm > 0) {
          child.scale.set(1.0, 1.0 - (component.dentDepthMm * 0.04), 1.0);
        } else if (component.id === 'front_right_quarter_panel') {
          child.scale.set(1.0, 1.0, 1.0);
        }
      }
    });
  }

  /**
   * Frame-by-frame animation of opening hinges, reciprocating pistons, and lift sync
   */
  update(deltaTime, engineSimulation = null) {
    // 1. Smoothly interpolate opening hinges towards target angles
    const speed = 4.2; // rad/s
    for (const key of Object.keys(this.hinges)) {
      const h = this.hinges[key];
      if (h.group && Math.abs(h.currentAngle - h.targetAngle) > 0.001) {
        const step = Math.sign(h.targetAngle - h.currentAngle) * speed * deltaTime;
        if (Math.abs(h.targetAngle - h.currentAngle) <= Math.abs(step)) {
          h.currentAngle = h.targetAngle;
        } else {
          h.currentAngle += step;
        }

        // Apply rotation on appropriate axis
        if (key === 'bonnet' || key === 'trunk') {
          h.group.rotation.x = h.currentAngle;
        } else {
          h.group.rotation.y = h.currentAngle; // Doors swing out on Y
        }
      }
    }

    // 2. Animate engine reciprocating pistons in cutaway mode
    if (this.isCutawayActive && engineSimulation && this.pistonMeshes.length === 4) {
      for (let i = 0; i < 4; i++) {
        const dispMm = engineSimulation.getPistonDisplacementMm(i + 1);
        // Map 0 to 90mm stroke into 3D meters: y = 0.28 down to 0.19
        const yPos = 0.28 - (dispMm / 1000.0);
        this.pistonMeshes[i].position.y = yPos;
      }
    }
  }
}
