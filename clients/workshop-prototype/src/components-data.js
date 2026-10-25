/**
 * MECHVERSE Initial Component Database & Engineering Specifications
 */

export const INITIAL_COMPONENTS = [
  {
    id: 'oil_filter_canister',
    name: 'Spin-On Oil Filter Canister',
    category: 'Engine / Lubrication',
    partNumber: 'MV-FILT-M20',
    meshId: 'mesh_oil_filter',
    massKg: 0.45,
    dimensionsCm: { x: 7.6, y: 7.6, z: 9.0 },
    installed: true,
    parentSocket: 'engine_oil_cooler_boss',
    fastener: {
      type: 'Threaded Spun Boss',
      driveType: 'Filter End Cap / 24mm Hex',
      socketSizeMm: 24.0,
      targetTorqueNm: 25.0,
      yieldTorqueLimitNm: 45.0,
      torqueCoeffK: 0.16,
      currentTorqueNm: 25.0,
      isTorqued: true,
      isStripped: false
    },
    prerequisites: [],
    wearPercentage: 12.0,
    cleanlinessPercentage: 65.0,
    dentDepthMm: 0.0,
    scratchDepthUm: 0.0,
    description: 'Full-flow spin-on oil filter equipped with anti-drainback valve and 20-micron cellulose/synthetic filter media.'
  },
  {
    id: 'front_right_wheel',
    name: 'Front Right 18" Alloy Wheel & Tire',
    category: 'Chassis / Wheels',
    partNumber: 'MV-WHL-18X8',
    meshId: 'mesh_wheel_fr',
    massKg: 21.5,
    dimensionsCm: { x: 45.7, y: 22.5, z: 45.7 },
    installed: true,
    parentSocket: 'front_right_wheel_hub',
    fastener: {
      type: 'Lug Nut (Set of 5)',
      driveType: 'Hex Metric 17mm',
      socketSizeMm: 17.0,
      targetTorqueNm: 120.0,
      yieldTorqueLimitNm: 210.0,
      torqueCoeffK: 0.18,
      currentTorqueNm: 120.0,
      isTorqued: true,
      isStripped: false
    },
    prerequisites: [],
    wearPercentage: 18.0,
    cleanlinessPercentage: 42.0, // brake dust
    dentDepthMm: 0.0,
    scratchDepthUm: 15.0,
    treadDepthMm: 6.8, // mm
    description: 'Cast aluminum alloy 18x8J wheel mounted with 235/40R18 radial performance tire.'
  },
  {
    id: 'brake_rotor_fr',
    name: 'Front Right Ventilated Brake Rotor',
    category: 'Brake System',
    partNumber: 'MV-BRK-ROT-320',
    meshId: 'mesh_rotor_fr',
    massKg: 9.8,
    dimensionsCm: { x: 32.0, y: 3.2, z: 32.0 },
    installed: true,
    parentSocket: 'front_right_wheel_hub',
    fastener: {
      type: 'Countersunk Torx Retaining Screw',
      driveType: 'Torx T30',
      socketSizeMm: 10.0,
      targetTorqueNm: 15.0,
      yieldTorqueLimitNm: 28.0,
      torqueCoeffK: 0.17,
      currentTorqueNm: 15.0,
      isTorqued: true,
      isStripped: false
    },
    prerequisites: ['front_right_wheel'], // must remove wheel first
    wearPercentage: 25.0,
    cleanlinessPercentage: 50.0,
    dentDepthMm: 0.0,
    scratchDepthUm: 35.0,
    runoutMm: 0.02,
    description: '320mm directional vented grey iron brake disc. Requires wheel removal prior to dismounting.'
  },
  {
    id: 'fuel_filler_assembly',
    name: 'Fuel Filler Flap & Cap Assembly',
    category: 'Fuel Delivery',
    partNumber: 'MV-FUEL-CAP-95',
    meshId: 'mesh_fuel_door',
    massKg: 0.8,
    dimensionsCm: { x: 16.0, y: 8.0, z: 16.0 },
    installed: true,
    parentSocket: 'rear_right_quarter_panel',
    isDoorOpen: false,
    isCapOpen: false,
    fuelType: 'PETROL_95',
    tankCapacityLiters: 60.0,
    currentFuelLiters: 24.5,
    wearPercentage: 5.0,
    cleanlinessPercentage: 88.0,
    dentDepthMm: 0.0,
    scratchDepthUm: 5.0,
    description: 'Sealed evaporative emission fuel filler assembly with ratchet click-to-seal gas cap and tether.'
  },
  {
    id: 'front_right_quarter_panel',
    name: 'Front Right Fender / Quarter Panel',
    category: 'Body Panel',
    partNumber: 'MV-BODY-FNDR-FR',
    meshId: 'mesh_fender_fr',
    massKg: 7.2,
    dimensionsCm: { x: 110.0, y: 25.0, z: 65.0 },
    installed: true,
    parentSocket: 'chassis_unibody',
    fastener: {
      type: 'M6 Flanged Hex Bolt (x6)',
      driveType: 'Hex Metric 10mm',
      socketSizeMm: 10.0,
      targetTorqueNm: 9.5,
      yieldTorqueLimitNm: 18.0,
      torqueCoeffK: 0.19,
      currentTorqueNm: 9.5,
      isTorqued: true,
      isStripped: false
    },
    prerequisites: [],
    wearPercentage: 15.0,
    cleanlinessPercentage: 35.0, // road grime and mud splash
    dentDepthMm: 4.5, // 4.5mm dent!
    scratchDepthUm: 45.0, // scratches down to primer
    paintQuality: 78.0,
    description: 'Deep-draw stamped steel body panel. Features localized dent and primer-level clearcoat scratching requiring panel beating and detailing.'
  }
];
