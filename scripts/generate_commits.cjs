/**
 * MECHVERSE - Bulk Realistic Engineering Commit Generator
 * Generates N realistic, timestamped automotive engineering commits using git fast-import.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOTAL_COMMITS = parseInt(process.argv[2] || '5000', 10);
const AUTHOR_NAME = 'Rajath Nayak';
const AUTHOR_EMAIL = 'rajathnayak2006@gmail.com';
const TIMEZONE = '+0530';

const ACTIONS = ['feat', 'fix', 'refactor', 'perf', 'test', 'style', 'docs', 'chore'];
const SCOPES = [
  'engine', 'valvetrain', 'turbo', 'intake', 'exhaust', 'cooling', 'fuel-system',
  'chassis', 'suspension', 'brakes', 'steering', 'drivetrain', 'differential',
  'fasteners', 'torque-spec', 'socket-set', 'tools', 'lift-hydraulics',
  'multimeter', 'oscilloscope', 'obd2-can', 'ecu-diagnostics', 'wiring-harness',
  'hazard-system', 'fire-suppression', 'fuse-box', 'thermal-runaway', 'particles',
  'audio-engine', 'hrtf-panning', 'rpm-loops', 'starter-motor', 'acoustic-occlusion',
  'pbr-shaders', 'clearcoat', 'paint-booth', 'raycasting', 'lift-controls',
  'persistence', 'save-migration', 'telemetry-hud', 'career-economy'
];

const DESCRIPTIONS = [
  'calibrate micrometer torque wrench slip cam mechanism',
  'implement Torricelli stream diameter thinning for oil drain',
  'optimize S58 twin-turbo 350 bar direct injection rail pressure curve',
  'add harmonic firing pulse synthesis for custom V12 engine swap',
  'tune biquad lowpass acoustic filter for closed bonnet occlusion',
  'implement bolt tensile yield calculation and plastic elongation',
  'add left-hand screw extractor reverse torque engagement model',
  'calibrate CKP 60-2 missing tooth reluctor wheel trigger waveform',
  'add 68V flyback inductive kickback spike to injector oscilloscope trace',
  'implement ISO 15765-4 CAN 500kbps communication frame parsing',
  'add SAE J2012 freeze frame telemetry snapshot on DTC trigger',
  'tune dual-piston brake caliper slide pin boundary lubrication',
  'calculate natural bounce frequency for 24-way adjustable coilovers',
  'implement speed-dependent chassis vibration for loose lug bolts',
  'add catastrophic wheel detachment physics under dynamic rolling load',
  'implement asymmetrical steering pull on loose brake caliper bracket',
  'add hydraulic line air bubble compressibility pressure drop model',
  'optimize ACES filmic tone mapping and procedural PMREM radiance',
  'implement 2-pass obstacle collision resolution for workshop bays',
  'tune suction dent pulling vacuum pressure and elastic rebound curve',
  'add wire-wheel rust grinding surface roughness bare metal transition',
  'calculate MIG/TIG heat input physics for chassis bracket welding',
  'add 2500-grit wet sanding and rotary compound polishing gloss metric',
  'implement dry sump oil scavenging pump pressure interlock',
  'add catalytic converter heating cycle fast idle throttle map',
  'tune battery reverse polarity electrical arcing particle bounce',
  'implement main fuse thermal blowing curve and ECU reset trigger',
  'add fire extinguisher chemical propellant cooling rate equation',
  'implement bonnet closure oxygen starvation rate for engine fire',
  'tune starter motor cranking rate vs battery terminal voltage',
  'add true RMS AC voltage conversion and 10A current jack fuse protection',
  'implement parasitic drain sleep mode current draw measurement',
  'tune Three.js clearcoat lacquer reflection roughness curve',
  'add procedural engine bay X-ray cutaway material transparency',
  'implement customer job card satisfaction penalty audit algorithm',
  'add itemized environmental disposal fee to repair invoice calculation',
  'optimize Web Audio HRTF distance attenuation and rolloff factor',
  'add turbocharger compressor spool whine and blow-off valve release',
  'tune ratchet pawl spring engagement click transient profile',
  'implement breaker bar leverage multiplier for seized fastener breakaway',
  'add thread pitch advance validation and disengagement threshold',
  'optimize 5-lug star tightening sequence parity check matrix',
  'implement cylinder head spiral center-out torque progression',
  'tune down-draft paint booth ventilation airflow volume rate',
  'add static grounding reel electrical continuity validation',
  'implement diesel misfueling chemical rejection interlock',
  'add spin-on oil filter pleat debris visual inspection shader',
  'tune dipstick hash mark oil level meniscus rendering',
  'implement hydraulic lift safety dog lock mechanical engagement',
  'add minimal HUD cinematic toggle keybinding and telemetry pill'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCommitMessage(index) {
  const action = getRandomItem(ACTIONS);
  const scope = getRandomItem(SCOPES);
  const desc = getRandomItem(DESCRIPTIONS);
  return `${action}(${scope}): ${desc} [iteration #${index + 1}]`;
}

async function run() {
  console.log(`Starting bulk generation of ${TOTAL_COMMITS} commits...`);
  const currentHead = execSync('git rev-parse HEAD').toString().trim();
  console.log(`Base commit: ${currentHead}`);

  // Spread commits over the past 280 days ending today
  const nowSec = Math.floor(Date.now() / 1000);
  const totalSpanSec = 280 * 24 * 3600;
  const startSec = nowSec - totalSpanSec;
  const stepSec = totalSpanSec / TOTAL_COMMITS;

  const child = spawn('git', ['fast-import', '--date-format=raw', '--quiet'], {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  child.stdin.setEncoding('utf-8');

  let parentRef = currentHead;

  // Stream commits into git fast-import
  for (let i = 0; i < TOTAL_COMMITS; i++) {
    const markId = i + 1;
    // Add small random jitter (within ±30 minutes)
    const jitter = Math.floor((Math.random() - 0.5) * 1800);
    const commitSec = Math.floor(startSec + (i * stepSec) + jitter);
    const msg = generateCommitMessage(i);
    const msgBuffer = Buffer.from(msg + '\n', 'utf-8');

    const fileContent = `MECHVERSE Automated Verification & Telemetry Ledger\nBuild Iteration: #${markId}\nTimestamp: ${commitSec}\nTarget: BMW M4 Competition (G82) Physics & Simulation Engine\nStatus: PASS\n`;
    const fileBuffer = Buffer.from(fileContent, 'utf-8');

    let chunk = `commit refs/heads/main\n` +
      `mark :${markId}\n` +
      `author ${AUTHOR_NAME} <${AUTHOR_EMAIL}> ${commitSec} ${TIMEZONE}\n` +
      `committer ${AUTHOR_NAME} <${AUTHOR_EMAIL}> ${commitSec} ${TIMEZONE}\n` +
      `data ${msgBuffer.length}\n${msg}\n` +
      `from ${parentRef}\n` +
      `M 644 inline docs/BUILD_HISTORY.txt\n` +
      `data ${fileBuffer.length}\n${fileContent}\n`;

    const canContinue = child.stdin.write(chunk);
    if (!canContinue) {
      await new Promise(resolve => child.stdin.once('drain', resolve));
    }

    parentRef = `:${markId}`;

    if ((i + 1) % 1000 === 0 || i === TOTAL_COMMITS - 1) {
      console.log(`Piped ${i + 1} / ${TOTAL_COMMITS} commits to git fast-import...`);
    }
  }

  child.stdin.end();

  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git fast-import exited with code ${code}`));
    });
  });

  console.log('git fast-import completed successfully!');
  console.log('Resetting working tree to new HEAD...');
  execSync('git reset --hard HEAD', { stdio: 'inherit' });

  const newCount = execSync('git rev-list --count HEAD').toString().trim();
  console.log(`Total commits on main branch: ${newCount}`);
}

run().catch(err => {
  console.error('Error during commit generation:', err);
  process.exit(1);
});
