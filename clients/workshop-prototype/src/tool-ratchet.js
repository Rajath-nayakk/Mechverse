/**
 * MECHVERSE - Tool Mechanics: Reversible Ratchet, Breaker Bar, and Micrometer Torque Wrench
 * 
 * Features:
 * 1. 72-Tooth Reversible Ratchet (5° pawl engagement angle, directional toggle)
 * 2. Swing Arc Obstacle Limits (e.g., tight engine bay allows only 45° stroke)
 * 3. 600mm Breaker Bar (High breakaway torque, rigid non-ratcheting leverage)
 * 4. Micrometer Click Torque Wrench (Adjustable target dial, audible/tactile cam slip click)
 * 5. Left-Hand Screw Extractor (Reverse flute broken stud extractor)
 */

import { FastenerMechanics } from './fastener-mechanics.js';

export const TOOL_TYPES = {
  RATCHET: 'RATCHET',
  BREAKER_BAR: 'BREAKER_BAR',
  TORQUE_WRENCH: 'TORQUE_WRENCH',
  EXTRACTOR: 'EXTRACTOR'
};

export class ToolController {
  constructor() {
    this.activeTool = null;
    this.attachedSocket = null;
    this.direction = 'TIGHTEN'; // 'TIGHTEN' (CW) or 'LOOSEN' (CCW)
    
    // Ratchet pawl kinematics
    this.ratchetTeeth = 72; // 360 / 72 = 5 deg per tooth
    this.toothAngleDeg = 360 / this.ratchetTeeth;
    this.accumulatedSwingDeg = 0;
    this.pawlClickCount = 0;
    this.maxSwingArcDeg = 60; // Max swing arc allowed by engine bay obstruction
    
    // Torque Wrench micrometer setting
    this.targetTorqueSettingNm = 25.0;
    this.isClickTriggered = false;

    // Extractor tool setup
    this.extractorDrillBitMm = 4.0;
  }

  equipTool(toolSpec) {
    this.activeTool = toolSpec;
    this.isClickTriggered = false;
    this.accumulatedSwingDeg = 0;
    this.pawlClickCount = 0;

    if (toolSpec.category === TOOL_TYPES.TORQUE_WRENCH) {
      this.targetTorqueSettingNm = toolSpec.defaultTorque || toolSpec.minTorque || 25.0;
    }
  }

  attachSocket(socket) {
    if (this.activeTool && this.activeTool.driveSize && socket.driveSize !== this.activeTool.driveSize) {
      return {
        success: false,
        message: `Incompatible drive size: Tool anvil is ${this.activeTool.driveSize}, socket is ${socket.driveSize}.`
      };
    }
    this.attachedSocket = socket;
    return {
      success: true,
      message: `Attached ${socket.sizeMm}mm ${socket.driveSize} hex socket to ${this.activeTool ? this.activeTool.name : 'tool'}.`
    };
  }

  toggleDirection() {
    this.direction = this.direction === 'TIGHTEN' ? 'LOOSEN' : 'TIGHTEN';
    return this.direction;
  }

  setTorqueWrenchTarget(torqueNm) {
    if (!this.activeTool || this.activeTool.category !== TOOL_TYPES.TORQUE_WRENCH) {
      return { success: false, message: 'Active tool is not a torque wrench.' };
    }
    const min = this.activeTool.minTorque || 10;
    const max = this.activeTool.maxTorque || 250;
    this.targetTorqueSettingNm = Math.max(min, Math.min(max, Math.round(torqueNm)));
    this.isClickTriggered = false;
    return {
      success: true,
      targetTorqueNm: this.targetTorqueSettingNm,
      message: `Micrometer torque dial calibrated to ${this.targetTorqueSettingNm} N·m.`
    };
  }

  /**
   * Operates ratcheting stroke with mouse drag or key hold.
   * @param {object} fastener Target fastener
   * @param {number} strokeAngleDeg Angle turned in this stroke
   * @param {number} obstacleClearanceArcDeg Obstacle swing limit around fastener
   */
  operateStroke(fastener, strokeAngleDeg, obstacleClearanceArcDeg = 60) {
    if (!this.activeTool) {
      return { success: false, message: 'No tool equipped in technician hand.' };
    }

    // Check socket attachment for socket-driven tools
    if (this.activeTool.category !== TOOL_TYPES.EXTRACTOR) {
      if (!this.attachedSocket) {
        return { success: false, message: 'No socket attached to tool anvil.' };
      }
      if (Math.abs(this.attachedSocket.sizeMm - fastener.socketSizeMm) > 0.05) {
        return {
          success: false,
          message: `Incorrect socket size! Fastener head is ${fastener.socketSizeMm}mm, but socket is ${this.attachedSocket.sizeMm}mm.`
        };
      }
    }

    // Clamp stroke by local physical obstruction / swing arc limit
    const allowedStroke = Math.min(strokeAngleDeg, obstacleClearanceArcDeg);
    this.accumulatedSwingDeg += allowedStroke;

    // Calculate ratcheting pawl clicks
    const clicks = Math.floor(allowedStroke / this.toothAngleDeg);
    this.pawlClickCount += clicks;

    // Tool-specific mechanics
    if (this.activeTool.category === TOOL_TYPES.BREAKER_BAR) {
      return this.operateBreakerBar(fastener, allowedStroke);
    }

    if (this.activeTool.category === TOOL_TYPES.TORQUE_WRENCH) {
      return this.operateTorqueWrench(fastener, allowedStroke);
    }

    if (this.activeTool.category === TOOL_TYPES.EXTRACTOR) {
      return FastenerMechanics.extractBrokenStud(fastener, this.activeTool);
    }

    // Standard Reversible Ratchet
    return this.operateRatchet(fastener, allowedStroke);
  }

  operateRatchet(fastener, strokeDeg) {
    const turns = strokeDeg / 360.0;
    const directionSign = this.direction === 'TIGHTEN' ? 1 : -1;
    
    if (this.direction === 'LOOSEN') {
      if (fastener.state === 'SEIZED') {
        return {
          success: false,
          action: 'SEIZED',
          message: `Cannot loosen: Fastener is seized by corrosion! Standard ratchet cannot overcome ${fastener.breakawayTorqueNm.toFixed(1)} N·m breakaway torque. Use penetrating fluid and a 600mm breaker bar!`
        };
      }

      // Advance unthreading
      const advanceMm = -turns * fastener.threadPitchMm;
      fastener.currentEngagementMm = Math.max(0, (fastener.currentEngagementMm || fastener.engagementLengthMm) + advanceMm);
      fastener.isDisengaged = fastener.currentEngagementMm <= 0;
      if (fastener.isDisengaged) {
        fastener.currentTorqueNm = 0;
        fastener.isTorqued = false;
      }
      return {
        success: true,
        action: 'LOOSEN',
        engagementMm: fastener.currentEngagementMm,
        isDisengaged: fastener.isDisengaged,
        pawlClicks: Math.floor(strokeDeg / this.toothAngleDeg),
        message: fastener.isDisengaged ? 'Fastener unthreaded and free!' : `Loosened: ${fastener.currentEngagementMm.toFixed(1)}mm engaged.`
      };
    }

    // Tightening stroke
    if (fastener.currentEngagementMm < fastener.engagementLengthMm) {
      const advanceMm = turns * fastener.threadPitchMm;
      fastener.currentEngagementMm = Math.min(fastener.engagementLengthMm, fastener.currentEngagementMm + advanceMm);
      return {
        success: true,
        action: 'THREAD_ENGAGE',
        engagementMm: fastener.currentEngagementMm,
        message: `Thread threading in: ${fastener.currentEngagementMm.toFixed(1)} / ${fastener.engagementLengthMm.toFixed(1)} mm.`
      };
    }

    // Fastener is fully seated: ratcheting now builds torque
    // Standard ratchet has ~300mm handle (applied torque = ~40 N*m normal hand force)
    const appliedTorque = Math.min(50.0, fastener.currentTorqueNm + (strokeDeg / 15.0) * 8.0);
    return FastenerMechanics.applyTorque(fastener, appliedTorque, this.attachedSocket);
  }

  operateBreakerBar(fastener, strokeDeg) {
    // 600mm long leverage arm delivers up to 250-450 N*m to break free seized fasteners
    const breakerTorque = Math.min(450.0, (strokeDeg / 20.0) * 80.0);
    
    if (this.direction === 'LOOSEN') {
      if (fastener.state === 'SEIZED') {
        if (breakerTorque >= fastener.breakawayTorqueNm) {
          fastener.state = 'INTACT';
          return {
            success: true,
            action: 'BREAKAWAY',
            message: `SNAP! 600mm breaker bar broke free the seized corrosion bond at ${breakerTorque.toFixed(1)} N·m!`
          };
        } else {
          return {
            success: false,
            message: `Breaker bar leverage insufficient (${breakerTorque.toFixed(1)} N·m < ${fastener.breakawayTorqueNm.toFixed(1)} N·m). Apply penetrating oil!`
          };
        }
      }
      // Normal loosening
      const turns = strokeDeg / 360.0;
      fastener.currentEngagementMm = Math.max(0, fastener.currentEngagementMm - turns * fastener.threadPitchMm);
      fastener.isDisengaged = fastener.currentEngagementMm <= 0;
      return {
        success: true,
        action: 'LOOSEN',
        engagementMm: fastener.currentEngagementMm,
        message: 'Breaker bar turned fastener smoothly.'
      };
    }

    // Dangerous to tighten with breaker bar (easily yields or shears bolts!)
    return FastenerMechanics.applyTorque(fastener, breakerTorque, this.attachedSocket);
  }

  operateTorqueWrench(fastener, strokeDeg) {
    if (this.direction !== 'TIGHTEN') {
      return {
        success: false,
        message: 'Torque wrenches should not be used as breaker bars or loosening ratchets (decalibrates internal spring).'
      };
    }

    if (this.isClickTriggered) {
      return {
        success: true,
        isClickTriggered: true,
        message: '*CLICK-CLICK* Target torque already reached! Decoupled to prevent over-tightening.'
      };
    }

    // Apply torque towards target
    const result = FastenerMechanics.applyTorque(fastener, this.targetTorqueSettingNm, this.attachedSocket);
    if (result.success && fastener.currentTorqueNm >= this.targetTorqueSettingNm) {
      this.isClickTriggered = true;
      result.clickSound = true;
      result.message = `*LOUD TACTILE CLICK!* ${this.targetTorqueSettingNm} N·m reached accurately. Cam decoupled.`;
    }
    return result;
  }
}
