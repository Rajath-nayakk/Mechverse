import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOT = path.resolve('Source', 'Mechverse');

function findFilesRecursive(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findFilesRecursive(fullPath, ext));
    } else if (fullPath.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

test('Stage 8: Unreal Engine 5 Build Rules & Architecture Integrity', () => {
  const buildCsPath = path.join(SOURCE_ROOT, 'Mechverse.Build.cs');
  assert.ok(fs.existsSync(buildCsPath), 'Mechverse.Build.cs must exist');
  
  const buildCsContent = fs.readFileSync(buildCsPath, 'utf8');
  assert.match(buildCsContent, /public class Mechverse : ModuleRules/);
  assert.match(buildCsContent, /PCHUsage = PCHUsageMode\.UseExplicitOrSharedPCHs;/);
  
  // Required UE5 modules
  const requiredModules = ['Core', 'CoreUObject', 'Engine', 'InputCore', 'EnhancedInput', 'UMG', 'PhysicsCore'];
  for (const mod of requiredModules) {
    assert.ok(buildCsContent.includes(`"${mod}"`), `Mechverse.Build.cs must include ${mod} module`);
  }
  assert.ok(buildCsContent.includes('ModuleDirectory'), 'Must configure ModuleDirectory in PublicIncludePaths');
});

test('Stage 8: FastenerComponent.h & .cpp - Authentic UE5 Standards & Math', () => {
  const headerPath = path.join(SOURCE_ROOT, 'MechanicalSystems', 'FastenerComponent.h');
  const cppPath = path.join(SOURCE_ROOT, 'MechanicalSystems', 'FastenerComponent.cpp');
  assert.ok(fs.existsSync(headerPath), 'FastenerComponent.h must exist');
  assert.ok(fs.existsSync(cppPath), 'FastenerComponent.cpp must exist');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const cppContent = fs.readFileSync(cppPath, 'utf8');

  // 1. Header Include Order Conventions
  const includes = headerContent.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('#include'));
  
  assert.ok(includes[0].includes('CoreMinimal.h'), 'CoreMinimal.h must be the first include in header');
  assert.ok(includes[includes.length - 1].includes('FastenerComponent.generated.h'),
    'FastenerComponent.generated.h must be strictly the very last include in header');

  // 2. Class & Struct Blueprint Reflection
  assert.match(headerContent, /UCLASS\(ClassGroup=\(Mechverse\), meta=\(BlueprintSpawnableComponent\)\)/);
  assert.match(headerContent, /class MECHVERSE_API UFastenerComponent : public UActorComponent/);
  assert.match(headerContent, /GENERATED_BODY\(\)/);

  // 3. Formula Validation in C++: F_clamp = T / (K * d)
  assert.match(cppContent, /CurrentAppliedTorqueNm \/ \(Spec\.TorqueCoefficientK \* DiameterMeters\)/,
    'FastenerComponent.cpp must implement F_clamp = T / (K * d)');

  // 4. Thread Advance = pitch * turns
  assert.match(cppContent, /const float DeltaMm = Turns \* Spec\.ThreadPitchMm;/,
    'FastenerComponent.cpp must implement axial advance = pitch * turns');
});

test('Stage 8: ToolBase.h & .cpp - Workshop Tool Categories & Sockets', () => {
  const headerPath = path.join(SOURCE_ROOT, 'WorkshopTools', 'ToolBase.h');
  const cppPath = path.join(SOURCE_ROOT, 'WorkshopTools', 'ToolBase.cpp');
  assert.ok(fs.existsSync(headerPath), 'ToolBase.h must exist');
  assert.ok(fs.existsSync(cppPath), 'ToolBase.cpp must exist');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const cppContent = fs.readFileSync(cppPath, 'utf8');

  // 1. Header Include Order Conventions
  const includes = headerContent.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('#include'));
  
  assert.ok(includes[0].includes('CoreMinimal.h'), 'CoreMinimal.h must be the first include');
  assert.ok(includes[includes.length - 1].includes('ToolBase.generated.h'), 'ToolBase.generated.h must be the last include');

  // 2. All 10 workshop tool categories present
  const categories = [
    'HandWrench', 'RatchetSocket', 'TorqueWrench', 'ImpactGun',
    'BreakerBar', 'Diagnostic', 'Cleaning', 'Bodywork', 'Welding', 'Painting'
  ];
  for (const cat of categories) {
    assert.ok(headerContent.includes(cat), `ToolBase.h must declare ${cat} in EToolCategory`);
  }

  // 3. Tool Anvil & Drive Compatibility Logic
  assert.match(cppContent, /if \(NewSocket\.DriveSize != ToolDriveSize\)/,
    'ToolBase.cpp must enforce socket drive size matching tool anvil');
});

test('Stage 8: Static Sweep of all Unreal Engine 5 Headers in Source Tree', () => {
  const headerFiles = findFilesRecursive(SOURCE_ROOT, '.h');
  assert.ok(headerFiles.length >= 8, `Expected at least 8 UE5 headers, found ${headerFiles.length}`);

  for (const hFile of headerFiles) {
    const filename = path.basename(hFile);
    const content = fs.readFileSync(hFile, 'utf8');

    // Skip Mechverse.h (module header)
    if (filename === 'Mechverse.h') continue;

    const includeLines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('#include'));

    if (includeLines.length === 0) continue;

    // Rule A: CoreMinimal.h must be first
    assert.ok(includeLines[0].includes('CoreMinimal.h'),
      `[${filename}] CoreMinimal.h must be the first include, found: ${includeLines[0]}`);

    // Rule B: *.generated.h must be strictly the last include if present
    const genIncludes = includeLines.filter(l => l.includes('.generated.h'));
    if (genIncludes.length > 0) {
      const lastInclude = includeLines[includeLines.length - 1];
      assert.ok(lastInclude.includes('.generated.h'),
        `[${filename}] Generated header must be strictly the last include, found: ${lastInclude}`);
    }

    // Rule C: Zero fake mock macros or hacked wrappers
    assert.ok(!content.includes('#define UCLASS(...)'), `[${filename}] Must NOT contain fake UCLASS mock macros`);
    assert.ok(!content.includes('#define UPROPERTY(...)'), `[${filename}] Must NOT contain fake UPROPERTY mock macros`);
    assert.ok(!content.includes('#define GENERATED_BODY(...)'), `[${filename}] Must NOT contain fake GENERATED_BODY mock macros`);
  }
});
