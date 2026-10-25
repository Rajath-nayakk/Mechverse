/**
 * MECHVERSE 12-Category Unified Vehicle Condition Model
 */

export class VehicleConditionSystem {
  constructor() {
    this.state = {
      mechanical: 92.0,
      electrical: 98.0,
      structural: 100.0,
      bodyPanel: 84.0,
      paint: 76.0,
      interior: 95.0,
      glass: 98.0,
      tires: 88.0,
      fluids: 85.0,
      cleanliness: 52.0,
      serviceHistoryCount: 3,
      isRoadworthySafe: true
    };
  }

  updateFromComponents(components) {
    // Recalculate dynamic aggregate metrics based on actual component states
    let totalClean = 0;
    let totalWear = 0;
    let totalBody = 0;
    let count = components.length;

    components.forEach(c => {
      totalClean += c.cleanlinessPercentage;
      totalWear += (100.0 - c.wearPercentage);
      if (c.dentDepthMm !== undefined) {
        // Dent penalty: 0mm = 100%, 10mm = 0%
        const dentScore = Math.max(0, 100 - (c.dentDepthMm * 10));
        totalBody += dentScore;
      } else {
        totalBody += 100;
      }
    });

    this.state.cleanliness = Math.round(totalClean / count);
    this.state.mechanical = Math.round(totalWear / count);
    this.state.bodyPanel = Math.round(totalBody / count);

    this.evaluateSafety();
    return this.state;
  }

  updateElectricalCondition(electricalSystem, faultManager) {
    let score = 100.0;
    if (faultManager) {
      const activeCount = faultManager.getActiveFaults().length;
      score -= activeCount * 18.0;
    }
    if (electricalSystem && electricalSystem.battery) {
      if (electricalSystem.battery.healthPercentage < 70) {
        score -= (70 - electricalSystem.battery.healthPercentage) * 0.5;
      }
      if (electricalSystem.battery.soc < 0.5) {
        score -= (0.5 - electricalSystem.battery.soc) * 40.0;
      }
    }
    this.state.electrical = Math.max(10, Math.min(100, Math.round(score)));
    this.evaluateSafety();
    return this.state.electrical;
  }

  evaluateSafety() {
    // Strict roadworthy rule:
    // Requires structural >= 70, mechanical >= 50, tires >= 40, electrical >= 50
    this.state.isRoadworthySafe = (
      this.state.structural >= 70.0 &&
      this.state.mechanical >= 50.0 &&
      this.state.tires >= 40.0 &&
      this.state.electrical >= 50.0
    );
    return this.state.isRoadworthySafe;
  }
}
