import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching Playwright Chromium browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.0
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Wait for 3D vehicle & GLB model to load
  await page.waitForFunction(() => {
    return window.__mechverse && window.__mechverse.vehicle && window.__mechverse.renderer;
  }, { timeout: 15000 });

  console.log('Waiting for BMW M4 GLB model to fully load and compile PBR materials...');
  await page.waitForFunction(() => {
    return window.__mechverse.vehicle.isGLBLoaded === true;
  }, { timeout: 45000 });
  console.log('BMW M4 GLB model loaded! Starting viewpoint capture...');

  await page.waitForTimeout(1000);

  async function snap(filename) {
    await page.screenshot({ path: path.join(outDir, filename), animations: 'disabled', timeout: 0 });
    console.log(`✓ Successfully saved ${filename}`);
  }

  // Helper to set camera viewpoint and render
  async function setCamera(px, py, pz, tx, ty, tz) {
    await page.evaluate(({ px, py, pz, tx, ty, tz }) => {
      const { camera, scene, renderer } = window.__mechverse;
      camera.position.set(px, py, pz);
      camera.lookAt(tx, ty, tz);
      renderer.render(scene, camera);
    }, { px, py, pz, tx, ty, tz });
    await page.waitForTimeout(300);
  }

  // Use minimal HUD for unobstructed vehicle inspection views
  await page.evaluate(() => document.body.classList.add('minimal-hud'));

  // 1. M4 Front 3/4
  console.log('Capturing m4_front_34.png...');
  await setCamera(2.6, 1.2, 3.6, 0.0, 0.6, 1.0);
  await snap('m4_front_34.png');

  // 2. M4 Side Profile
  console.log('Capturing m4_side.png...');
  await setCamera(4.2, 1.1, 0.2, 0.0, 0.6, 0.0);
  await snap('m4_side.png');

  // 3. M4 Rear Angle
  console.log('Capturing m4_rear.png...');
  await setCamera(-2.6, 1.3, -3.8, 0.0, 0.6, -1.0);
  await snap('m4_rear.png');

  // 4. M4 Interior
  console.log('Capturing m4_interior.png...');
  await setCamera(-0.45, 1.05, -0.1, -0.1, 0.85, 0.5);
  await snap('m4_interior.png');

  // 5. M4 Bonnet Attempt & Procedural S58 Twin-Turbo Engine Bay
  console.log('Capturing m4_bonnet_attempt.png...');
  await page.evaluate(() => {
    const { vehicle } = window.__mechverse;
    vehicle.toggleCutawayMode(); // Open cutaway so engine bay architecture is exposed
  });
  await setCamera(0.8, 1.9, 2.2, 0.0, 0.75, 1.2);
  await snap('m4_bonnet_attempt.png');

  // 6. M4 Under Hydraulic Lift
  console.log('Capturing m4_under_lift.png...');
  await page.evaluate(() => {
    const { garage } = window.__mechverse;
    garage.setLiftHeight(1.6);
    garage.liftHeight = 1.6;
    garage.liftCarriageGroup.position.y = 1.6;
  });
  await setCamera(2.0, 0.4, 1.2, 0.0, 1.5, 0.0);
  await snap('m4_under_lift.png');

  // Lower lift back for hazard tests
  await page.evaluate(() => {
    const { garage } = window.__mechverse;
    garage.setLiftHeight(0.0);
    garage.liftHeight = 0.0;
    garage.liftCarriageGroup.position.y = 0.0;
  });

  // Restore full HUD for hazard alerts & symptoms
  await page.evaluate(() => document.body.classList.remove('minimal-hud'));

  // Focus camera back on engine bay / battery for Hazard Stages
  await setCamera(1.8, 1.6, 2.2, 0.3, 0.85, 1.2);

  // 7. Hazard Stage 1: Arcing & Sparks
  console.log('Capturing hazard_stage1_sparks.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.reset();
    hazardSystem.risks.electrical = 50.0; // Stage 1 (12.0 - 24.9)
    hazardSystem.faultOrigin.set(0.55, 0.95, 1.15);
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await page.waitForTimeout(400);
  await snap('hazard_stage1_sparks.png');

  // 8. Hazard Stage 2: Blown Fuse & Smell
  console.log('Capturing hazard_stage2_fuse.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.risks.electrical = 90.0; // Stage 2 (25.0 - 44.9)
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await page.waitForTimeout(400);
  await snap('hazard_stage2_fuse.png');

  // 9. Hazard Stage 3: Smoke Emission
  console.log('Capturing hazard_stage3_smoke.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.risks.electrical = 60.0;
    hazardSystem.risks.oil = 70.0;
    hazardSystem.risks.heat = 90.0; // Stage 3 (45.0 - 67.9)
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await page.waitForTimeout(400);
  await snap('hazard_stage3_smoke.png');

  // 10. Hazard Stage 4: Heat Glow & Thermal Runaway
  console.log('Capturing hazard_stage4_glow.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.risks.heat = 95.0;
    hazardSystem.risks.oil = 90.0;
    hazardSystem.risks.electrical = 80.0;
    hazardSystem.risks.fuel = 50.0; // Stage 4 (68.0 - 84.9)
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await page.waitForTimeout(400);
  await snap('hazard_stage4_glow.png');

  // 11. Hazard Stage 5: Open Flames
  console.log('Capturing hazard_stage5_flames.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.risks.fuel = 95.0;
    hazardSystem.risks.electrical = 80.0;
    hazardSystem.risks.heat = 90.0;
    hazardSystem.risks.oil = 70.0; // Stage 5 (85.0 - 94.9)
    hazardSystem.faultOrigin.set(0.15, 0.65, 1.35);
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await page.waitForTimeout(400);
  await snap('hazard_stage5_flames.png');

  // 12. Hazard Stage 6: Full Conflagration (Total Loss)
  console.log('Capturing hazard_stage6_fullfire.png...');
  await page.evaluate(() => {
    const { hazardSystem } = window.__mechverse;
    hazardSystem.risks.fuel = 100.0;
    hazardSystem.risks.heat = 100.0;
    hazardSystem.risks.electrical = 100.0;
    hazardSystem.risks.oil = 100.0; // Stage 6 (95.0+)
    hazardSystem.evaluateHazardLevel();
    hazardSystem.update(0.05);
  });
  await setCamera(3.2, 1.8, 3.2, 0, 0.8, 0.4);
  await page.waitForTimeout(400);
  await snap('hazard_stage6_fullfire.png');

  console.log('All 12 screenshots captured successfully in docs/screenshots/!');
  await browser.close();
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
