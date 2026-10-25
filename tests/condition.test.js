import test from 'node:test';
import assert from 'node:assert/strict';

class VehicleConditionModel {
    constructor() {
        this.mechanical = 100;
        this.electrical = 100;
        this.structural = 100;
        this.bodyPanel = 100;
        this.paint = 100;
        this.interior = 100;
        this.glass = 100;
        this.tires = 100;
        this.fluids = 100;
        this.cleanliness = 100;
        this.serviceHistoryCount = 0;
    }

    cleanVehicle(amount) {
        this.cleanliness = Math.min(100, this.cleanliness + amount);
        // CRITICAL RULE: Cleaning does not alter mechanical or structural state!
    }

    repaintPanel(paintQuality) {
        this.paint = Math.min(100, paintQuality);
        // CRITICAL RULE: Repainting does not repair underlying dents or structural frame integrity!
    }

    evaluateSafetyInspection() {
        // Roadworthy safety requires minimum structural integrity (>=70),
        // mechanical braking/steering (>=50), tires (>=40), and electrical safety (>=50).
        // Cosmetic items (paint, interior, dirt) do not fail road safety.
        return (
            this.structural >= 70 &&
            this.mechanical >= 50 &&
            this.tires >= 40 &&
            this.electrical >= 50
        );
    }
}

test('Cleaning vehicle increases cleanliness score but does not fix mechanical or structural damage', () => {
    const car = new VehicleConditionModel();
    car.cleanliness = 20; // heavily soiled with road grease
    car.mechanical = 35; // worn engine bearings
    car.structural = 50; // bent frame rail

    car.cleanVehicle(60);

    assert.equal(car.cleanliness, 80);
    assert.equal(car.mechanical, 35, 'Mechanical health should remain untouched by washing');
    assert.equal(car.structural, 50, 'Structural health should remain untouched by washing');
});

test('Repainting a panel improves paint condition but leaves structural damage intact', () => {
    const car = new VehicleConditionModel();
    car.paint = 15;
    car.structural = 40; // Collision frame damage

    car.repaintPanel(95);

    assert.equal(car.paint, 95);
    assert.equal(car.structural, 40, 'Structural damage must remain despite flawless fresh paint');
    assert.equal(car.evaluateSafetyInspection(), false, 'Car with structural defect must fail roadworthy inspection');
});

test('Vehicle with sound structural, mechanical, electrical, and tires passes safety inspection', () => {
    const car = new VehicleConditionModel();
    car.cleanliness = 10; // Very dirty
    car.paint = 25;       // Faded and scratched
    car.structural = 90;
    car.mechanical = 85;
    car.electrical = 90;
    car.tires = 80;

    assert.equal(car.evaluateSafetyInspection(), true, 'Cosmetic weathering alone should not fail safety inspection');
});
