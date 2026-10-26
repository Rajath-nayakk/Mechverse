/**
 * MECHVERSE - Workshop Career Mode, Repair Orders & Economy System
 * 
 * Features:
 * 1. Customer Job Cards / Repair Orders:
 *    - Vehicle intake checklist, customer symptoms / complaints
 *    - Diagnostic estimation, authorized budget limits
 * 2. Itemized Invoicing & Shop Billing:
 *    - OEM parts subtotal, labor hours @ shop hourly rate, environmental fluid disposal fee
 * 3. Customer Satisfaction Rating (1 to 5 Stars):
 *    - Evaluates repair completeness, fastener torque accuracy (+/-3%), cleanliness
 * 4. Shop Financial Ledger:
 *    - Bank balance, parts expense, invoice revenue, tool purchases
 */

export const JOB_TEMPLATES = [
  {
    id: 'JOB_001_BRAKE_SHUDDER',
    customerName: 'Marcus Vance',
    vehicleName: '2023 BMW M4 Competition (G82)',
    complaint: 'Customer states severe steering wheel shudder when braking from 100 km/h and high-pitched metallic squeal.',
    diagnosis: 'Front brake pads worn below 3mm service limit, front-left rotor warped (runout 0.065mm).',
    requiredActions: ['REPLACE_FRONT_PADS', 'REPLACE_FRONT_ROTORS', 'LUBRICATE_SLIDE_PINS'],
    partsNeeded: [
      { id: 'OEM_M_COMPOUND_PADS_FRONT', name: 'OEM BMW M Compound Front Brake Pads', price: 420.0 },
      { id: 'OEM_M_DRILLED_ROTOR_FL', name: 'OEM 380x36mm Cross-Drilled Rotor (FL)', price: 580.0 },
      { id: 'OEM_M_DRILLED_ROTOR_FR', name: 'OEM 380x36mm Cross-Drilled Rotor (FR)', price: 580.0 }
    ],
    estimatedLaborHours: 2.5,
    budgetLimit: 2200.0
  },
  {
    id: 'JOB_002_S58_MISFIRE',
    customerName: 'Elena Rostova',
    vehicleName: '2022 BMW M4 Coupe (G82)',
    complaint: 'Check Engine Light flashing under full throttle acceleration, drivetrain malfunction warning on iDrive.',
    diagnosis: 'OBD-II DTC P0300 / P0301. Cylinder 1 ignition coil failure and fouled high-performance spark plug.',
    requiredActions: ['DIAGNOSE_OBD', 'REPLACE_IGNITION_COIL_CYL1', 'REPLACE_SPARK_PLUGS_ALL'],
    partsNeeded: [
      { id: 'OEM_S58_IGNITION_COIL', name: 'OEM S58 Ignition Coil Pack', price: 115.0 },
      { id: 'OEM_S58_SPARK_PLUGS_SET6', name: 'High-Performance Iridium Spark Plugs (Set of 6)', price: 180.0 }
    ],
    estimatedLaborHours: 1.8,
    budgetLimit: 950.0
  },
  {
    id: 'JOB_003_OIL_SERVICE_LUG_SAFETY',
    customerName: 'David Chen',
    vehicleName: '2024 BMW M4 Competition xDrive',
    complaint: 'Scheduled 15,000 km oil service due. Customer requested tire rotation and chassis safety inspection.',
    diagnosis: 'Engine oil degraded (25% condition), wheel lug bolts found under-torqued (95 N·m vs 140 N·m spec).',
    requiredActions: ['DRAIN_ENGINE_OIL', 'REPLACE_OIL_FILTER', 'REFILL_0W30_SYNTHETIC', 'TORQUE_WHEEL_LUGS_140NM'],
    partsNeeded: [
      { id: 'OEM_LL01_0W30_7L', name: 'BMW Longlife-01 FE 0W-30 Full Synthetic (7 Liters)', price: 125.0 },
      { id: 'OEM_S58_OIL_FILTER_KIT', name: 'OEM S58 Oil Filter Kit with O-Ring & Crush Washer', price: 32.0 }
    ],
    estimatedLaborHours: 1.2,
    budgetLimit: 500.0
  }
];

export class CareerEconomySystem {
  constructor(initialShopBalance = 15000.0, hourlyLaborRate = 145.0) {
    this.shopBalance = initialShopBalance;
    this.hourlyLaborRate = hourlyLaborRate;
    this.environmentalFee = 18.50; // Hazardous fluid / recycling fee
    this.salesTaxRate = 0.0825;    // 8.25% tax
    
    this.activeJob = null;
    this.completedJobs = [];
    this.reputationScore = 4.8; // Out of 5.0
    this.inventoryParts = new Map();
  }

  /**
   * Accept a customer repair order
   */
  acceptJob(jobId) {
    const template = JOB_TEMPLATES.find(j => j.id === jobId) || JOB_TEMPLATES[0];
    this.activeJob = {
      ...template,
      intakeTimestamp: Date.now(),
      completedActions: new Set(),
      usedParts: [],
      fastenersTorquedCorrectly: true,
      vehicleCleanlinessScore: 90.0,
      status: 'IN_PROGRESS'
    };
    return {
      success: true,
      job: this.activeJob
    };
  }

  recordActionCompleted(actionName) {
    if (!this.activeJob) return { success: false, error: 'No active job.' };
    this.activeJob.completedActions.add(actionName);
    return { success: true, completedActions: Array.from(this.activeJob.completedActions) };
  }

  /**
   * Order OEM replacement part from parts supplier
   */
  orderPart(partItem) {
    if (this.shopBalance < partItem.price) {
      return { success: false, error: `Insufficient shop funds ($${this.shopBalance.toFixed(2)}) to purchase ${partItem.name} ($${partItem.price.toFixed(2)}).` };
    }
    this.shopBalance -= partItem.price;
    const currentQty = this.inventoryParts.get(partItem.id) || 0;
    this.inventoryParts.set(partItem.id, currentQty + 1);
    return {
      success: true,
      partName: partItem.name,
      cost: partItem.price,
      remainingBalance: parseFloat(this.shopBalance.toFixed(2))
    };
  }

  /**
   * Generate itemized customer invoice and calculate satisfaction rating
   */
  generateInvoiceAndComplete(laborHoursActual = null, qualityAudit = {}) {
    if (!this.activeJob) return { success: false, error: 'No active job to complete.' };

    const job = this.activeJob;
    const laborHours = laborHoursActual !== null ? laborHoursActual : job.estimatedLaborHours;
    
    // Financial Invoicing
    const partsTotal = job.partsNeeded.reduce((sum, p) => sum + p.price, 0);
    const laborTotal = laborHours * this.hourlyLaborRate;
    const subtotal = partsTotal + laborTotal + this.environmentalFee;
    const tax = subtotal * this.salesTaxRate;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;

    // Quality & Satisfaction Rating Calculation (1.0 to 5.0 Stars)
    let stars = 5.0;
    const deductions = [];

    // 1. Check all required repair actions
    for (const required of job.requiredActions) {
      if (!job.completedActions.has(required)) {
        stars -= 1.5;
        deductions.push(`Incomplete repair: ${required} was not performed.`);
      }
    }

    // 2. Fastener Torque Audit
    if (qualityAudit.fastenerTorquesOutOfSpec) {
      stars -= 1.2;
      deductions.push('Quality failure: Fasteners were not torqued to manufacturer specifications.');
    }

    // 3. Vehicle Cleanliness
    if (qualityAudit.isVehicleDirty) {
      stars -= 0.5;
      deductions.push('Vehicle returned with greasy fingerprints / dust.');
    }

    // 4. Budget Overrun check
    if (grandTotal > job.budgetLimit) {
      stars -= 0.8;
      deductions.push(`Invoice total ($${grandTotal}) exceeded customer authorized budget ($${job.budgetLimit}).`);
    }

    stars = Math.max(1.0, Math.min(5.0, Math.round(stars * 10) / 10));

    // Credit revenue to shop balance
    this.shopBalance += grandTotal;
    job.status = 'COMPLETED';
    job.finalInvoice = {
      partsTotal: parseFloat(partsTotal.toFixed(2)),
      laborTotal: parseFloat(laborTotal.toFixed(2)),
      environmentalFee: this.environmentalFee,
      tax: parseFloat(tax.toFixed(2)),
      grandTotal,
      laborHours
    };
    job.customerSatisfaction = {
      stars,
      review: stars >= 4.5 
        ? 'Outstanding service! Car drives like new and all factory torque specs were verified.'
        : stars >= 3.0 
        ? 'Decent work, but there were some oversights in execution.'
        : 'Very disappointed. Issues remained unresolved or invoice was over budget.',
      deductions
    };

    this.completedJobs.push(job);
    this.activeJob = null;

    // Update rolling shop reputation
    const totalStars = this.completedJobs.reduce((sum, j) => sum + j.customerSatisfaction.stars, 0);
    this.reputationScore = parseFloat((totalStars / this.completedJobs.length).toFixed(2));

    return {
      success: true,
      jobId: job.id,
      invoice: job.finalInvoice,
      satisfaction: job.customerSatisfaction,
      shopBalance: parseFloat(this.shopBalance.toFixed(2)),
      reputationScore: this.reputationScore
    };
  }
}
