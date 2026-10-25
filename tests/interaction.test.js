import test from 'node:test';
import assert from 'node:assert/strict';

function validateToolCompatibility(tool, fastener) {
    if (tool.category !== 'WRENCH' && tool.category !== 'RATCHET' && tool.category !== 'TORQUE_WRENCH') {
        return { compatible: false, reason: 'Selected tool cannot turn fasteners.' };
    }
    if (Math.abs(tool.socketSizeMm - fastener.socketSizeMm) > 0.1) {
        return {
            compatible: false,
            reason: `Socket size mismatch! Tool has ${tool.socketSizeMm}mm, fastener requires ${fastener.socketSizeMm}mm.`
        };
    }
    return { compatible: true, reason: 'Tool is fully compatible.' };
}

function canRemoveComponent(component, componentGraph) {
    // If component has required fasteners still tightened, it cannot be removed
    if (component.fasteners && component.fasteners.some(f => f.isTorqued || f.appliedTorqueNm > 0)) {
        return { canRemove: false, reason: 'Fasteners must be loosened/removed first.' };
    }
    // If child components are mounted on it, they must be removed first
    const attachedChildren = componentGraph.filter(c => c.parentSocket === component.id && c.isInstalled);
    if (attachedChildren.length > 0) {
        return {
            canRemove: false,
            reason: `Must first detach child component: ${attachedChildren[0].name}.`
        };
    }
    return { canRemove: true, reason: 'Component ready for removal.' };
}

test('Tool validation prevents using mismatched socket size', () => {
    const torqueWrench = { category: 'TORQUE_WRENCH', socketSizeMm: 19.0 };
    const lugNut = { socketSizeMm: 17.0 };

    const result = validateToolCompatibility(torqueWrench, lugNut);
    assert.equal(result.compatible, false);
    assert.match(result.reason, /Socket size mismatch/);
});

test('Tool validation approves matching socket size', () => {
    const torqueWrench = { category: 'TORQUE_WRENCH', socketSizeMm: 17.0 };
    const lugNut = { socketSizeMm: 17.0 };

    const result = validateToolCompatibility(torqueWrench, lugNut);
    assert.equal(result.compatible, true);
});

test('Component removal prerequisite blocks wheel removal while lug nuts are tightened', () => {
    const wheel = {
        id: 'front_right_wheel',
        name: 'Front Right Alloy Wheel',
        isInstalled: true,
        fasteners: [
            { id: 'lug1', socketSizeMm: 17, isTorqued: true, appliedTorqueNm: 120 }
        ]
    };
    const graph = [wheel];

    const result = canRemoveComponent(wheel, graph);
    assert.equal(result.canRemove, false);
    assert.match(result.reason, /Fasteners must be loosened/);
});

test('Component removal succeeds when fasteners are removed', () => {
    const wheel = {
        id: 'front_right_wheel',
        name: 'Front Right Alloy Wheel',
        isInstalled: true,
        fasteners: [
            { id: 'lug1', socketSizeMm: 17, isTorqued: false, appliedTorqueNm: 0 }
        ]
    };
    const graph = [wheel];

    const result = canRemoveComponent(wheel, graph);
    assert.equal(result.canRemove, true);
});
