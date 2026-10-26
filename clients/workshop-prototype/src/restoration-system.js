/**
 * MECHVERSE - Bodywork, Metal Fabrication, Welding, and Paint Booth System
 * 
 * Physical Modeling for:
 * 1. Dent Pulling & Panel Metal Shaping (Suction Puller, Hammer & Dolly)
 * 2. Rust Inspection, Grinding, and Bare Metal Surface Prep
 * 3. Metal MIG / TIG Welding: Arc energy, travel speed, penetration, and weld bead quality
 * 4. Professional Paint Booth: Primer, Solid / Metallic Basecoat, Clearcoat, Gloss, and Curing
 */

export const WELDING_TYPES = {
  MIG: { name: 'MIG / GMAW (Metal Inert Gas)', defaultVolts: 19.5, defaultAmps: 140, shieldingGas: '75/25 Ar/CO2' },
  TIG: { name: 'TIG / GTAW (Gas Tungsten Arc)', defaultVolts: 14.0, defaultAmps: 110, shieldingGas: '100% Argon' },
  SPOT: { name: 'Resistance Spot Welding', defaultVolts: 8.0, defaultAmps: 6000, durationSec: 0.3 }
};

export const PAINT_LAYERS = {
  BARE_METAL: 'BARE_METAL',
  PRIMER: 'PRIMER',
  BASECOAT: 'BASECOAT',
  CLEARCOAT: 'CLEARCOAT'
};

export const OEM_BMW_COLORS = {
  ISLE_OF_MAN_GREEN: { code: 'C4G', name: 'Isle of Man Green Metallic', hex: '#164a38', flakePercent: 42.0 },
  SAO_PAULO_YELLOW: { code: 'C4H', name: 'Sao Paulo Yellow Uni', hex: '#d8eb34', flakePercent: 0.0 },
  BROOKLYN_GREY: { code: 'C4P', name: 'Brooklyn Grey Metallic', hex: '#878c91', flakePercent: 30.0 },
  TANZANITE_BLUE_II: { code: 'C3Z', name: 'Tanzanite Blue II Metallic', hex: '#0f2347', flakePercent: 55.0 },
  PORTIMAO_BLUE: { code: 'C31', name: 'Portimao Blue Metallic', hex: '#1a4b8f', flakePercent: 38.0 },
  FIRE_ORANGE_III: { code: 'P7E', name: 'Fire Orange III (BMW Individual)', hex: '#f05a18', flakePercent: 0.0 }
};

export class PanelRestorationSystem {
  constructor() {
    // Panel Body Damage State
    this.panelStates = new Map();
    this.initDefaultPanels();

    // Welding Equipment State
    this.welding = {
      activeType: 'MIG',
      volts: 19.5,
      amps: 140.0,
      wireFeedSpeedMpm: 5.5,
      travelSpeedMmPerSec: 4.5,
      isArcActive: false,
      shieldingGasFlowLpm: 14.0, // 14 L/min
      groundClampAttached: true,
      helmetEquipped: true
    };

    // Paint Spray Booth State
    this.paintBooth = {
      airPressureBar: 2.2, // 2.2 bar / 32 PSI HVLP gun
      fluidFlowMlPerMin: 180.0,
      fanPatternCm: 25.0,
      activeColorHex: '#1f6feb', // Dynamic paint color
      metallicFlakePercent: 35.0,
      boothVentilationActive: true,
      ovenCuringActive: false,
      ovenTemperatureC: 22.0
    };
  }

  initDefaultPanels() {
    const panels = [
      {
        id: 'front_right_quarter_panel',
        name: 'Front Right Fender',
        material: 'Stamped Sheet Steel (0.8mm)',
        dentDepthMm: 4.5,
        dentRadiusCm: 8.0,
        scratchDepthUm: 45.0,
        rustLevelPercent: 20.0,
        paintLayers: [PAINT_LAYERS.PRIMER, PAINT_LAYERS.BASECOAT],
        currentColor: '#1f6feb',
        clearcoatThicknessUm: 0.0,
        glossPercent: 45.0
      },
      {
        id: 'front_bonnet_hood',
        name: 'Front Engine Hood',
        material: 'Stamped Aluminum (1.0mm)',
        dentDepthMm: 0.0,
        dentRadiusCm: 0.0,
        scratchDepthUm: 12.0,
        rustLevelPercent: 0.0,
        paintLayers: [PAINT_LAYERS.PRIMER, PAINT_LAYERS.BASECOAT, PAINT_LAYERS.CLEARCOAT],
        currentColor: '#1f6feb',
        clearcoatThicknessUm: 42.0,
        glossPercent: 92.0
      },
      {
        id: 'exhaust_muffler_bracket',
        name: 'Exhaust Downpipe Joint Bracket',
        material: 'Mild Steel (2.0mm)',
        dentDepthMm: 0.0,
        dentRadiusCm: 0.0,
        scratchDepthUm: 0.0,
        rustLevelPercent: 65.0,
        crackLengthMm: 35.0,
        isWelded: false,
        weldQualityPercent: 0.0
      }
    ];

    panels.forEach(p => this.panelStates.set(p.id, p));
  }

  getPanel(panelId) {
    return this.panelStates.get(panelId) || null;
  }

  /**
   * Apply Suction Dent Puller / Hammer-and-Dolly
   * Pulls outward deformation, reducing dent depth towards 0mm
   */
  repairDent(panelId, pullForceNewtons = 350.0) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };

    if (panel.dentDepthMm <= 0.0) {
      return { success: true, dentDepthMm: 0.0, message: 'Panel surface is already flat and smooth.' };
    }

    // Force reduction based on elastic limit of sheet metal
    const reduction = Math.min(panel.dentDepthMm, (pullForceNewtons / 400.0) * 1.8);
    panel.dentDepthMm = Math.max(0.0, Math.round((panel.dentDepthMm - reduction) * 10) / 10);

    return {
      success: true,
      panelId: panelId,
      dentDepthMm: panel.dentDepthMm,
      isFullyRepaired: panel.dentDepthMm === 0.0,
      message: panel.dentDepthMm === 0.0 ? 'Dent pulled flush with factory body line.' : `Dent reduced to ${panel.dentDepthMm}mm.`
    };
  }

  /**
   * Grind / Wire-wheel surface rust down to bare metal
   */
  grindRust(panelId, durationSec = 3.0) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };

    const removed = Math.min(panel.rustLevelPercent, durationSec * 25.0);
    panel.rustLevelPercent = Math.max(0.0, panel.rustLevelPercent - removed);
    panel.scratchDepthUm = 15.0; // Grinding leaves 15um prep tooth

    if (panel.rustLevelPercent === 0.0) {
      panel.paintLayers = [PAINT_LAYERS.BARE_METAL];
    }

    return {
      success: true,
      panelId: panelId,
      rustLevelPercent: panel.rustLevelPercent,
      isCleanBareMetal: panel.rustLevelPercent === 0.0,
      message: panel.rustLevelPercent === 0.0 ? 'Rust removed. Surface ground to bright bare metal.' : `Rust remaining: ${panel.rustLevelPercent}%.`
    };
  }

  /**
   * Perform MIG / TIG welding on cracked bracket or sheet seam:
   * Heat Input: H = (eta * V * I) / v (in Joules/mm)
   * Evaluates penetration, porosity, and structural strength
   */
  weldJoint(panelId, weldLengthMm = 35.0) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Target workpiece not found' };

    if (!this.welding.groundClampAttached) {
      return { success: false, error: 'Welding ground clamp is not attached to chassis/workpiece!' };
    }
    if (!this.welding.helmetEquipped) {
      return { success: false, error: 'Safety hazard: Auto-darkening welding helmet must be worn.' };
    }

    // Arc heat calculation
    const efficiency = this.welding.activeType === 'MIG' ? 0.80 : 0.65;
    const heatInputJPerMm = (efficiency * this.welding.volts * this.welding.amps) / this.welding.travelSpeedMmPerSec;

    // Ideal heat input for 2mm steel is 350-550 J/mm
    let quality = 100.0;
    if (heatInputJPerMm < 300.0) {
      quality -= 35.0; // Cold weld, lack of penetration
    } else if (heatInputJPerMm > 650.0) {
      quality -= 40.0; // Burn-through, excessive heat affected zone
    }

    if (panel.rustLevelPercent > 10.0) {
      quality -= 45.0; // Dirty metal causes weld porosity and gas pockets
    }

    quality = Math.max(10.0, Math.min(100.0, quality));
    panel.crackLengthMm = 0.0;
    panel.isWelded = true;
    panel.weldQualityPercent = quality;

    return {
      success: true,
      panelId: panelId,
      weldType: this.welding.activeType,
      heatInputJPerMm: Math.round(heatInputJPerMm),
      weldQualityPercent: quality,
      isStructurallySound: quality >= 70.0,
      message: quality >= 70.0 ? 'Weld completed with full penetration and uniform bead.' : 'Poor weld quality! Porosity or lack of fusion detected.'
    };
  }

  /**
   * Apply Paint Layer (Primer, Basecoat, Clearcoat) in spray booth
   */
  applyPaint(panelId, layerType, colorHex = null) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };

    if (panel.dentDepthMm > 0.5) {
      return { success: false, error: 'Cannot paint: Panel requires dent repair before refinishing.' };
    }
    if (panel.rustLevelPercent > 0.0) {
      return { success: false, error: 'Cannot paint over rust: Surface must be ground to bare metal first.' };
    }

    if (layerType === PAINT_LAYERS.PRIMER) {
      panel.paintLayers = [PAINT_LAYERS.PRIMER];
      panel.glossPercent = 20.0;
      return { success: true, layer: PAINT_LAYERS.PRIMER, message: 'Etch primer applied. Ready for basecoat.' };
    }

    if (layerType === PAINT_LAYERS.BASECOAT) {
      if (!panel.paintLayers.includes(PAINT_LAYERS.PRIMER) && !panel.paintLayers.includes(PAINT_LAYERS.BASECOAT)) {
        return { success: false, error: 'Basecoat requires primer foundation.' };
      }
      panel.currentColor = colorHex || this.paintBooth.activeColorHex;
      panel.paintLayers = [PAINT_LAYERS.PRIMER, PAINT_LAYERS.BASECOAT];
      panel.glossPercent = 40.0;
      return { success: true, layer: PAINT_LAYERS.BASECOAT, color: panel.currentColor, message: 'Basecoat color applied.' };
    }

    if (layerType === PAINT_LAYERS.CLEARCOAT) {
      if (!panel.paintLayers.includes(PAINT_LAYERS.BASECOAT)) {
        return { success: false, error: 'Clearcoat must be applied over basecoat.' };
      }
      panel.paintLayers = [PAINT_LAYERS.PRIMER, PAINT_LAYERS.BASECOAT, PAINT_LAYERS.CLEARCOAT];
      panel.clearcoatThicknessUm = 45.0;
      panel.glossPercent = 95.0; // High gloss factory finish
      return { success: true, layer: PAINT_LAYERS.CLEARCOAT, gloss: panel.glossPercent, message: '2K High-Solid Clearcoat applied. High-gloss finish achieved.' };
    }

    return { success: false, error: `Unknown paint layer: ${layerType}` };
  }

  /**
   * Apply automotive tape and masking paper to protect surrounding panels/glass
   */
  maskPanel(panelId) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };
    panel.isMasked = true;
    return {
      success: true,
      panelId,
      message: 'Automotive edge masking tape and solvent-resistant kraft paper applied.'
    };
  }

  unmaskPanel(panelId) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };
    panel.isMasked = false;
    return { success: true, panelId, message: 'Masking paper and tape cleanly removed.' };
  }

  /**
   * Wet sanding (2500 grit) & rotary compound polish
   * Levels orange peel, removes micro-imperfections, and buffs clearcoat to 99% mirror finish
   */
  wetSandAndPolish(panelId, polishPasses = 2) {
    const panel = this.panelStates.get(panelId);
    if (!panel) return { success: false, error: 'Panel not found' };

    if (!panel.paintLayers.includes(PAINT_LAYERS.CLEARCOAT)) {
      return { success: false, error: 'Cannot polish: Panel does not have a cured clearcoat layer.' };
    }
    if (panel.clearcoatThicknessUm < 25.0) {
      return { success: false, error: 'WARNING: Clearcoat too thin (<25 um) to polish without burning through!' };
    }

    // 2500-grit wet block sanding shaves ~2.5 um per pass
    const thicknessLoss = Math.min(panel.clearcoatThicknessUm - 20.0, polishPasses * 2.5);
    panel.clearcoatThicknessUm = Math.round((panel.clearcoatThicknessUm - thicknessLoss) * 10) / 10;
    panel.glossPercent = 99.0; // Mirror-like reflection, zero orange peel

    return {
      success: true,
      panelId,
      remainingClearcoatUm: panel.clearcoatThicknessUm,
      glossPercent: panel.glossPercent,
      orangePeelLevel: 'ZERO_TEXTURE_MIRROR',
      message: 'Wet sanding and dual-action rotary compound polish complete. Show car mirror finish achieved.'
    };
  }
}
