import test from 'node:test';
import assert from 'node:assert/strict';
import { PanelRestorationSystem, PAINT_LAYERS } from '../clients/workshop-prototype/src/restoration-system.js';

test('PanelRestorationSystem - Suction dent pulling reduces deformation to zero', () => {
  const resto = new PanelRestorationSystem();
  const panel = resto.getPanel('front_right_quarter_panel');
  assert.equal(panel.dentDepthMm, 4.5);

  // Pull with 350 N force
  const step1 = resto.repairDent('front_right_quarter_panel', 350);
  assert.equal(step1.success, true);
  assert.ok(step1.dentDepthMm < 4.5);

  // Pull until flush
  resto.repairDent('front_right_quarter_panel', 800);
  assert.equal(panel.dentDepthMm, 0.0);
});

test('PanelRestorationSystem - Rust grinding to bare metal', () => {
  const resto = new PanelRestorationSystem();
  const bracket = resto.getPanel('exhaust_muffler_bracket');
  assert.equal(bracket.rustLevelPercent, 65.0);

  // Grind rust
  resto.grindRust('exhaust_muffler_bracket', 3.0);
  assert.equal(bracket.rustLevelPercent, 0.0);
  assert.equal(bracket.paintLayers[0], PAINT_LAYERS.BARE_METAL);
});

test('PanelRestorationSystem - Welding cracked bracket with penetration quality', () => {
  const resto = new PanelRestorationSystem();
  // Ensure metal is ground clean first
  resto.grindRust('exhaust_muffler_bracket', 3.0);

  const weldRes = resto.weldJoint('exhaust_muffler_bracket');
  assert.equal(weldRes.success, true);
  assert.equal(weldRes.isStructurallySound, true);
  assert.ok(weldRes.weldQualityPercent >= 70.0);
  assert.equal(resto.getPanel('exhaust_muffler_bracket').isWelded, true);
});

test('PanelRestorationSystem - Painting workflow requires dent repair and primer foundation', () => {
  const resto = new PanelRestorationSystem();
  const fender = resto.getPanel('front_right_quarter_panel');

  // Attempting to paint before repairing dent is rejected
  const prematurePaint = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.BASECOAT, '#ff0000');
  assert.equal(prematurePaint.success, false);
  assert.match(prematurePaint.error, /requires dent repair/i);

  // Repair dent and grind rust
  resto.repairDent('front_right_quarter_panel', 1000);
  resto.grindRust('front_right_quarter_panel', 2.0);

  // Apply Primer
  const primerRes = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.PRIMER);
  assert.equal(primerRes.success, true);

  // Apply Basecoat (Ruby Red)
  const baseRes = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.BASECOAT, '#e63946');
  assert.equal(baseRes.success, true);
  assert.equal(fender.currentColor, '#e63946');

  // Apply Clearcoat
  const clearRes = resto.applyPaint('front_right_quarter_panel', PAINT_LAYERS.CLEARCOAT);
  assert.equal(clearRes.success, true);
  assert.ok(fender.glossPercent >= 90.0);
});
