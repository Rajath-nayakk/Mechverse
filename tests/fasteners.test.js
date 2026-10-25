import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Engineering Fastener Specification and Clamping Calculation Test
 */
function calculateClampingForce(appliedTorqueNm, nominalDiameterMm, torqueCoeffK) {
    if (appliedTorqueNm <= 0 || nominalDiameterMm <= 0 || torqueCoeffK <= 0) return 0.0;
    const diameterMeters = nominalDiameterMm / 1000.0;
    return appliedTorqueNm / (torqueCoeffK * diameterMeters);
}

function applyFastenerTorque(spec, appliedTorqueNm) {
    if (appliedTorqueNm > spec.yieldTorqueLimitNm) {
        return {
            status: 'STRIPPED',
            appliedTorqueNm: 0,
            clampingForceN: 0,
            isTorqued: false,
            isStripped: true
        };
    }

    const lowerBound = spec.targetTorqueNm * 0.90;
    const upperBound = spec.targetTorqueNm * 1.10;
    const isTorqued = appliedTorqueNm >= lowerBound && appliedTorqueNm <= upperBound;
    const clampingForceN = calculateClampingForce(appliedTorqueNm, spec.nominalDiameterMm, spec.torqueCoeffK);

    return {
        status: isTorqued ? 'IN_SPEC' : (appliedTorqueNm < lowerBound ? 'UNDER_TORQUED' : 'OVER_TARGET_SAFE'),
        appliedTorqueNm,
        clampingForceN,
        isTorqued,
        isStripped: false
    };
}

test('Fastener Clamping Force obeys F = T / (K * d)', () => {
    // M10 bolt, Target 25 N*m, K = 0.18
    // d = 0.010 m
    // F = 25 / (0.18 * 0.010) = 25 / 0.0018 = 13,888.89 N
    const force = calculateClampingForce(25.0, 10.0, 0.18);
    assert.ok(Math.abs(force - 13888.89) < 0.1, `Expected ~13888.89 N, got ${force}`);
});

test('Fastener accurately classifies in-spec torque', () => {
    const spec = {
        nominalDiameterMm: 10.0,
        targetTorqueNm: 25.0,
        yieldTorqueLimitNm: 45.0,
        torqueCoeffK: 0.18
    };

    const result = applyFastenerTorque(spec, 25.0);
    assert.equal(result.status, 'IN_SPEC');
    assert.equal(result.isTorqued, true);
    assert.equal(result.isStripped, false);
});

test('Fastener shears/strips threads when torque exceeds yield limit', () => {
    const spec = {
        nominalDiameterMm: 10.0,
        targetTorqueNm: 25.0,
        yieldTorqueLimitNm: 45.0,
        torqueCoeffK: 0.18
    };

    const result = applyFastenerTorque(spec, 55.0); // Excessive torque
    assert.equal(result.status, 'STRIPPED');
    assert.equal(result.isStripped, true);
    assert.equal(result.clampingForceN, 0);
});
