import test from 'node:test';
import assert from 'node:assert/strict';

class FuelSystem {
    constructor(fuelType, tankCapacityLiters) {
        this.fuelType = fuelType; // 'PETROL_95', 'DIESEL', 'ELECTRIC'
        this.tankCapacityLiters = tankCapacityLiters;
        this.currentFuelLiters = 0;
        this.isFuelCapOpen = false;
        this.isFillerDoorOpen = false;
    }

    openFillerDoor() {
        this.isFillerDoorOpen = true;
    }

    removeFuelCap() {
        if (!this.isFillerDoorOpen) return false;
        this.isFuelCapOpen = true;
        return true;
    }

    refuel(dispensedFuelType, quantityLiters) {
        if (!this.isFuelCapOpen) {
            return { success: false, reason: 'Fuel cap is still closed.' };
        }
        if (dispensedFuelType !== this.fuelType) {
            return {
                success: false,
                reason: `Incompatible fuel! Attempted to dispense ${dispensedFuelType} into ${this.fuelType} vehicle.`
            };
        }

        const availableVolume = this.tankCapacityLiters - this.currentFuelLiters;
        const actualDispensed = Math.min(availableVolume, quantityLiters);
        this.currentFuelLiters += actualDispensed;

        return {
            success: true,
            dispensedLiters: actualDispensed,
            tankLevelLiters: this.currentFuelLiters,
            isFull: this.currentFuelLiters >= this.tankCapacityLiters
        };
    }

    consumeFuel(liters) {
        this.currentFuelLiters = Math.max(0, this.currentFuelLiters - liters);
        return this.currentFuelLiters;
    }
}

test('Refueling rejects mismatched fuel types', () => {
    const petrolCar = new FuelSystem('PETROL_95', 55.0);
    petrolCar.openFillerDoor();
    petrolCar.removeFuelCap();

    const result = petrolCar.refuel('DIESEL', 20.0);
    assert.equal(result.success, false);
    assert.match(result.reason, /Incompatible fuel/);
    assert.equal(petrolCar.currentFuelLiters, 0);
});

test('Refueling caps volume at maximum tank capacity without overflow', () => {
    const car = new FuelSystem('PETROL_95', 50.0);
    car.currentFuelLiters = 45.0;
    car.openFillerDoor();
    car.removeFuelCap();

    const result = car.refuel('PETROL_95', 20.0); // requests 20L, but only 5L fits
    assert.equal(result.success, true);
    assert.equal(result.dispensedLiters, 5.0);
    assert.equal(car.currentFuelLiters, 50.0);
    assert.equal(result.isFull, true);
});

test('Fuel consumption dynamically lowers tank volume', () => {
    const car = new FuelSystem('PETROL_95', 60.0);
    car.currentFuelLiters = 40.0;
    car.consumeFuel(12.5);
    assert.equal(car.currentFuelLiters, 27.5);
});
