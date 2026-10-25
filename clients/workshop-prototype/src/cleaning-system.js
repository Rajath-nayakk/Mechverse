/**
 * MECHVERSE Surface-Aware Interactive Cleaning Simulation
 */

export const CLEANABLE_SURFACES = [
  {
    id: 'surface_body_exterior',
    name: 'Body Panels & Paint (Fender, Hood, Doors)',
    category: 'Exterior Body',
    material: 'PAINTED_STEEL',
    meshTarget: 'front_right_quarter_panel',
    contaminations: {
      mud: 55.0,
      roadGrime: 60.0,
      dust: 35.0,
      grease: 0.0,
      looseDebris: 0.0,
      brakeDust: 5.0,
      oilResidue: 0.0,
      waterSpots: 25.0
    },
    damageState: {
      dentDepthMm: 4.5,
      scratchDepthUm: 45.0,
      structuralDefect: false
    }
  },
  {
    id: 'surface_wheels',
    name: 'Front Right 18" Alloy Rim',
    category: 'Wheels & Brakes',
    material: 'ALLOY_ALUMINUM',
    meshTarget: 'front_right_wheel',
    contaminations: {
      brakeDust: 85.0,
      roadGrime: 45.0,
      mud: 20.0,
      dust: 30.0,
      grease: 10.0,
      looseDebris: 0.0,
      oilResidue: 0.0,
      waterSpots: 10.0
    },
    damageState: {
      rimCurbRashMm: 2.0
    }
  },
  {
    id: 'surface_tires',
    name: 'Front Right Radial Tire',
    category: 'Wheels & Brakes',
    material: 'RUBBER',
    meshTarget: 'front_right_wheel',
    contaminations: {
      mud: 70.0,
      dust: 50.0,
      roadGrime: 40.0,
      brakeDust: 20.0,
      grease: 0.0,
      looseDebris: 0.0,
      oilResidue: 0.0,
      waterSpots: 0.0
    }
  },
  {
    id: 'surface_engine_bay',
    name: 'Engine Bay & Block Exterior',
    category: 'Powertrain',
    material: 'CAST_IRON_ALUMINUM',
    meshTarget: 'oil_filter_canister',
    contaminations: {
      grease: 75.0,
      oilResidue: 65.0,
      dust: 35.0,
      mud: 10.0,
      looseDebris: 0.0,
      brakeDust: 0.0,
      waterSpots: 0.0
    }
  },
  {
    id: 'surface_windshield_glass',
    name: 'Windshield & Window Glass',
    category: 'Glass',
    material: 'AUTOMOTIVE_GLASS',
    meshTarget: 'windshield_glass',
    contaminations: {
      waterSpots: 65.0,
      dust: 45.0,
      roadGrime: 30.0,
      grease: 0.0,
      looseDebris: 0.0,
      brakeDust: 0.0,
      oilResidue: 0.0,
      mud: 15.0
    }
  },
  {
    id: 'surface_interior_cabin',
    name: 'Interior Seats, Carpets & Mats',
    category: 'Interior',
    material: 'FABRIC_CARPET',
    meshTarget: 'interior_cabin',
    contaminations: {
      looseDebris: 80.0, // crumbs, tracked dirt, loose lint
      dust: 60.0,
      grease: 25.0, // spilled grease stain
      mud: 0.0,
      oilResidue: 0.0,
      brakeDust: 0.0,
      waterSpots: 0.0,
      roadGrime: 0.0
    },
    damageState: {
      fabricTear: true
    }
  },
  {
    id: 'surface_workshop_floor',
    name: 'Service Bay Concrete Floor',
    category: 'Workshop',
    material: 'SEALED_CONCRETE',
    meshTarget: 'workshop_floor',
    contaminations: {
      looseDebris: 50.0,
      oilResidue: 40.0,
      dust: 45.0,
      mud: 0.0,
      grease: 15.0,
      brakeDust: 0.0,
      waterSpots: 0.0,
      roadGrime: 0.0
    }
  }
];

export class CleaningSimulation {
  constructor(initialSurfaces = CLEANABLE_SURFACES) {
    this.surfaces = JSON.parse(JSON.stringify(initialSurfaces));
  }

  getSurface(surfaceId) {
    return this.surfaces.find(s => s.id === surfaceId);
  }

  getSurfaceCleanliness(surfaceId) {
    const surface = this.getSurface(surfaceId);
    if (!surface) return 100.0;
    const totalContamination = Object.values(surface.contaminations).reduce((sum, val) => sum + val, 0);
    // Max theoretical contamination per surface is 400 (4 x 100)
    const normalizedDirt = Math.min(100.0, totalContamination / 3.0);
    return Math.round(Math.max(0.0, 100.0 - normalizedDirt));
  }

  getAggregateCleanliness() {
    let sum = 0;
    this.surfaces.forEach(s => {
      sum += this.getSurfaceCleanliness(s.id);
    });
    return Math.round(sum / this.surfaces.length);
  }

  applyCleaningTool(surfaceId, toolId, exposureDurationSec = 2.0) {
    const surface = this.getSurface(surfaceId);
    if (!surface) {
      return { success: false, message: 'Invalid cleanable surface target.' };
    }

    const initialClean = this.getSurfaceCleanliness(surfaceId);

    // 1. Foam Cannon
    if (toolId === 'TOOL_FOAM_CANNON') {
      if (surface.material === 'FABRIC_CARPET') {
        return {
          success: false,
          surfaceId,
          message: 'PROHIBITED: Cannot spray high-pressure snow foam on interior fabrics or carpets!'
        };
      }
      // Loosens mud, road grime, and dust by ~40% per pass
      surface.contaminations.mud = Math.max(0, surface.contaminations.mud - (35 * exposureDurationSec));
      surface.contaminations.roadGrime = Math.max(0, surface.contaminations.roadGrime - (30 * exposureDurationSec));
      surface.contaminations.dust = Math.max(0, surface.contaminations.dust - (40 * exposureDurationSec));
      return {
        success: true,
        surfaceId,
        message: `Applied snow foam on ${surface.name}. Road grime and mud loosened.`
      };
    }

    // 2. High-Pressure Washer
    if (toolId === 'TOOL_PRESSURE_WASHER') {
      if (surface.material === 'FABRIC_CARPET') {
        return {
          success: false,
          surfaceId,
          message: 'DANGER: High-pressure water jet will shred interior fabrics and soak floor padding!'
        };
      }
      // Flushes mud, dust, water spots, and road grime
      surface.contaminations.mud = Math.max(0, surface.contaminations.mud - (50 * exposureDurationSec));
      surface.contaminations.roadGrime = Math.max(0, surface.contaminations.roadGrime - (45 * exposureDurationSec));
      surface.contaminations.dust = Math.max(0, surface.contaminations.dust - (50 * exposureDurationSec));
      surface.contaminations.waterSpots = Math.max(0, surface.contaminations.waterSpots - (30 * exposureDurationSec));
      // Ineffective against heavy engine grease or oil residue
      if (surface.contaminations.grease > 30 || surface.contaminations.oilResidue > 30) {
        return {
          success: true,
          surfaceId,
          message: `Rinsed ${surface.name}. Note: Heavy grease/oil resisted water jet — degreaser required.`
        };
      }
      return {
        success: true,
        surfaceId,
        message: `High-pressure rinsed ${surface.name}. Grime and mud washed away.`
      };
    }

    // 3. Heavy Duty Degreaser
    if (toolId === 'TOOL_DEGREASER') {
      // Targets grease and oil residue
      surface.contaminations.grease = Math.max(0, surface.contaminations.grease - (60 * exposureDurationSec));
      surface.contaminations.oilResidue = Math.max(0, surface.contaminations.oilResidue - (60 * exposureDurationSec));
      return {
        success: true,
        surfaceId,
        message: `Degreaser dissolved heavy oil and grease films on ${surface.name}.`
      };
    }

    // 4. Reactive Wheel & Iron Cleaner
    if (toolId === 'TOOL_WHEEL_CLEANER') {
      if (surface.material !== 'ALLOY_ALUMINUM' && surface.material !== 'RUBBER') {
        return {
          success: false,
          surfaceId,
          message: 'Wheel cleaner is formulated exclusively for alloy rims and tires.'
        };
      }
      surface.contaminations.brakeDust = Math.max(0, surface.contaminations.brakeDust - (70 * exposureDurationSec));
      surface.contaminations.roadGrime = Math.max(0, surface.contaminations.roadGrime - (35 * exposureDurationSec));
      return {
        success: true,
        surfaceId,
        message: `Iron remover reacted purple and eliminated embedded brake dust on ${surface.name}.`
      };
    }

    // 5. Ammonia-Free Glass Cleaner
    if (toolId === 'TOOL_GLASS_CLEANER') {
      if (surface.material !== 'AUTOMOTIVE_GLASS') {
        return {
          success: false,
          surfaceId,
          message: 'Glass cleaner has no effect on painted or mechanical metal surfaces.'
        };
      }
      surface.contaminations.waterSpots = Math.max(0, surface.contaminations.waterSpots - (80 * exposureDurationSec));
      surface.contaminations.dust = Math.max(0, surface.contaminations.dust - (80 * exposureDurationSec));
      surface.contaminations.roadGrime = Math.max(0, surface.contaminations.roadGrime - (60 * exposureDurationSec));
      return {
        success: true,
        surfaceId,
        message: `Cleaned ${surface.name} to streak-free clarity.`
      };
    }

    // 6. Wet/Dry Shop Vacuum Cleaner
    if (toolId === 'TOOL_VACUUM_CLEANER') {
      if (surface.material !== 'FABRIC_CARPET' && surface.material !== 'SEALED_CONCRETE') {
        return {
          success: false,
          surfaceId,
          message: 'Vacuum cleaner is designed for interior upholstery, floor mats, and concrete.'
        };
      }
      // Removes loose debris and dry dust
      surface.contaminations.looseDebris = Math.max(0, surface.contaminations.looseDebris - (70 * exposureDurationSec));
      surface.contaminations.dust = Math.max(0, surface.contaminations.dust - (50 * exposureDurationSec));
      // CRITICAL RULE: Vacuum CANNOT remove grease or oil residue!
      if (surface.contaminations.grease > 0 || surface.contaminations.oilResidue > 0) {
        return {
          success: true,
          surfaceId,
          message: `Vacuumed loose crumbs and dirt from ${surface.name}. Note: Embedded grease stains remain.`
        };
      }
      return {
        success: true,
        surfaceId,
        message: `Extracted loose debris and dust from ${surface.name}.`
      };
    }

    return { success: false, surfaceId, message: 'Tool not suitable for surface cleaning.' };
  }
}
