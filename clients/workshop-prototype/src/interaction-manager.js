import * as THREE from '../vendor/three.module.js';
import { SOCKET_SET, AVAILABLE_TOOLS, validateSocketCompatibility, advanceFastenerThread } from './socket-system.js';
import { CleaningSimulation } from './cleaning-system.js';

export class InteractionManager {
  constructor(camera, scene, domElement, components, vehicleModel, conditionSystem, onComponentSelected, showToast) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.components = components;
    this.vehicleModel = vehicleModel;
    this.conditionSystem = conditionSystem;
    this.onComponentSelected = onComponentSelected;
    this.showToast = showToast;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Tools & Sockets
    this.activeToolId = 'TOOL_INSPECT';
    this.activeSocketId = 'socket_17'; // default to 17mm socket
    this.configuredWrenchTorqueNm = 120.0;

    // Cleaning Simulation
    this.cleaningSim = new CleaningSimulation();

    this.hoveredMesh = null;
    this.selectedComponent = null;
    this.selectedSurfaceId = 'surface_body_exterior';

    this.initEvents();
  }

  initEvents() {
    this.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  getActiveTool() {
    return AVAILABLE_TOOLS.find(t => t.id === this.activeToolId);
  }

  getActiveSocket() {
    return SOCKET_SET.find(s => s.id === this.activeSocketId);
  }

  setTool(toolId) {
    this.activeToolId = toolId;
    const tool = this.getActiveTool();

    // If tool has a default socket, select a compatible socket
    if (tool && tool.defaultSocket) {
      const match = SOCKET_SET.find(s => s.sizeMm === tool.defaultSocket && (!tool.driveSize || s.driveSize === tool.driveSize));
      if (match) {
        this.activeSocketId = match.id;
      }
    }

    if (tool && tool.category === 'TORQUE_WRENCH') {
      if (this.activeSocketId === 'socket_17') this.configuredWrenchTorqueNm = 120.0;
      else if (this.activeSocketId === 'socket_24') this.configuredWrenchTorqueNm = 25.0;
      else if (this.activeSocketId === 'socket_13') this.configuredWrenchTorqueNm = 30.0;
      else if (this.activeSocketId === 'socket_21') this.configuredWrenchTorqueNm = 145.0;
      else if (this.activeSocketId === 'socket_10') this.configuredWrenchTorqueNm = 15.0;
    }
  }

  setSocket(socketId) {
    const socket = SOCKET_SET.find(s => s.id === socketId);
    if (!socket) return;

    const tool = this.getActiveTool();
    if (tool && tool.driveSize && socket.driveSize !== tool.driveSize) {
      this.showToast(`Warning: Socket drive size (${socket.driveSize}) does not match tool drive size (${tool.driveSize}).`, 'warning');
    }

    this.activeSocketId = socketId;
    this.showToast(`Equipped ${socket.sizeMm}mm Hex Socket (${socket.driveSize} drive).`, 'info');

    // Preset sensible torque if on torque wrench
    if (socket.sizeMm === 17) this.configuredWrenchTorqueNm = 120.0;
    else if (socket.sizeMm === 24) this.configuredWrenchTorqueNm = 25.0;
    else if (socket.sizeMm === 13) this.configuredWrenchTorqueNm = 30.0;
    else if (socket.sizeMm === 21) this.configuredWrenchTorqueNm = 145.0;
    else if (socket.sizeMm === 10) this.configuredWrenchTorqueNm = 15.0;
  }

  setWrenchTorque(torqueNm) {
    this.configuredWrenchTorqueNm = torqueNm;
  }

  onPointerMove(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targetMeshes = Array.from(this.vehicleModel.interactiveMeshes.values()).filter(m => m.visible);
    const intersects = this.raycaster.intersectObjects(targetMeshes, true);

    if (intersects.length > 0) {
      let current = intersects[0].object;
      while (current && !current.userData.componentId && current.parent) {
        current = current.parent;
      }

      if (current && current.userData.componentId) {
        if (this.hoveredMesh !== current) {
          this.clearHover();
          this.hoveredMesh = current;
          this.applyHighlight(current, 0x388bfd);
          this.domElement.style.cursor = 'pointer';
        }
        return;
      }
    }

    if (this.hoveredMesh) {
      this.clearHover();
      this.domElement.style.cursor = 'default';
    }
  }

  onClick(event) {
    if (!this.hoveredMesh || !this.hoveredMesh.userData.componentId) {
      return;
    }

    const compId = this.hoveredMesh.userData.componentId;
    const comp = this.components.find(c => c.id === compId);
    if (!comp) return;

    this.selectedComponent = comp;
    if (comp.surfaceId) {
      this.selectedSurfaceId = comp.surfaceId;
    }
    this.onComponentSelected(comp);

    // Apply immediate tool action if specific tool selected
    this.applyActiveTool(comp);
  }

  applyActiveTool(comp) {
    const tool = this.getActiveTool();
    if (!tool) return;

    if (tool.category === 'CLEANING') {
      this.cleanTargetSurface(comp.surfaceId || this.selectedSurfaceId, tool.id);
    } else if (tool.id === 'TOOL_DENT_PULLER') {
      this.pullDent(comp);
    } else if (tool.id === 'TOOL_FUEL_NOZZLE') {
      this.refuelVehicle(comp);
    }
  }

  cleanTargetSurface(surfaceId, toolId) {
    const result = this.cleaningSim.applyCleaningTool(surfaceId, toolId, 2.0);
    if (!result.success) {
      this.showToast(result.message, 'error');
      return;
    }

    this.showToast(result.message, 'success');

    // Update aggregate condition score
    this.conditionSystem.state.cleanliness = this.cleaningSim.getAggregateCleanliness();

    // Update affected components linked to this surface
    const surfaceCleanliness = this.cleaningSim.getSurfaceCleanliness(surfaceId);
    this.components.forEach(c => {
      if (c.surfaceId === surfaceId) {
        c.cleanlinessPercentage = surfaceCleanliness;
        this.vehicleModel.updateComponentVisuals(c);
      }
    });

    if (this.selectedComponent) {
      this.onComponentSelected(this.selectedComponent);
    }
  }

  applyTorqueWrench(comp) {
    if (!comp.fastener) {
      this.showToast('Component has no threaded fasteners to torque.', 'error');
      return;
    }

    const tool = this.getActiveTool();
    const socket = this.getActiveSocket();

    // Check socket compatibility
    const validation = validateSocketCompatibility(tool, socket, comp.fastener);
    if (!validation.compatible) {
      this.showToast(validation.reason, 'error');
      return;
    }

    // Check if threads are engaged
    if (comp.fastener.currentEngagementMm < (comp.fastener.engagementLengthMm * 0.75)) {
      this.showToast(`Cannot torque: Fastener threads are not fully engaged! (Engagement: ${comp.fastener.currentEngagementMm.toFixed(1)} / ${comp.fastener.engagementLengthMm.toFixed(1)} mm). Thread bolt in first.`, 'error');
      return;
    }

    // Apply torque
    const appliedTorque = this.configuredWrenchTorqueNm;
    if (appliedTorque > comp.fastener.yieldTorqueLimitNm) {
      comp.fastener.isStripped = true;
      comp.fastener.isTorqued = false;
      comp.fastener.currentTorqueNm = 0;
      this.showToast(`DANGER: Over-torqued (${appliedTorque} N*m)! Fastener sheared/yielded.`, 'error');
    } else {
      comp.fastener.currentTorqueNm = appliedTorque;
      const lower = comp.fastener.targetTorqueNm * 0.90;
      const upper = comp.fastener.targetTorqueNm * 1.10;
      comp.fastener.isTorqued = (appliedTorque >= lower && appliedTorque <= upper);

      if (comp.fastener.isTorqued) {
        this.showToast(`Fastener torqued to spec: ${appliedTorque.toFixed(1)} N*m (Target: ${comp.fastener.targetTorqueNm} N*m)`, 'success');
      } else if (appliedTorque < lower) {
        this.showToast(`Under-torqued: ${appliedTorque.toFixed(1)} N*m (Target: ${comp.fastener.targetTorqueNm} N*m)`, 'warning');
      } else {
        this.showToast(`Above target but within yield: ${appliedTorque.toFixed(1)} N*m`, 'warning');
      }
    }

    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.onComponentSelected(comp);
  }

  unthreadFastener(comp, turns = 4.0) {
    if (!comp.fastener) return;

    const tool = this.getActiveTool();
    const socket = this.getActiveSocket();
    const validation = validateSocketCompatibility(tool, socket, comp.fastener);
    if (!validation.compatible) {
      this.showToast(validation.reason, 'error');
      return;
    }

    // Unthread by turns
    const advance = advanceFastenerThread(comp.fastener, -turns);
    this.showToast(advance.message, advance.isDisengaged ? 'success' : 'info');

    this.onComponentSelected(comp);
  }

  threadInFastener(comp, turns = 4.0) {
    if (!comp.fastener) return;

    const tool = this.getActiveTool();
    const socket = this.getActiveSocket();
    const validation = validateSocketCompatibility(tool, socket, comp.fastener);
    if (!validation.compatible) {
      this.showToast(validation.reason, 'error');
      return;
    }

    const advance = advanceFastenerThread(comp.fastener, turns);
    this.showToast(advance.message, 'info');

    this.onComponentSelected(comp);
  }

  loosenFasteners(comp) {
    if (!comp.fastener) return;
    comp.fastener.currentTorqueNm = 0;
    comp.fastener.isTorqued = false;
    this.showToast(`Fasteners loosened for ${comp.name}. (Threads still engaged).`, 'info');
    this.onComponentSelected(comp);
  }

  removeComponent(comp) {
    // 1. Check if fasteners still tightened or engaged in threads
    if (comp.fastener) {
      if (comp.fastener.isTorqued || comp.fastener.currentTorqueNm > 0) {
        this.showToast(`Cannot remove ${comp.name}: Fasteners are still torqued! Loosen them first.`, 'error');
        return;
      }
      if (comp.fastener.currentEngagementMm > 0) {
        this.showToast(`Cannot remove ${comp.name}: Fastener is still threaded in (${comp.fastener.currentEngagementMm.toFixed(1)} mm remaining). Unthread completely first.`, 'error');
        return;
      }
    }

    // 2. Check if dependent components block it (DAG prerequisites)
    const attachedDependents = this.components.filter(c => c.installed && c.prerequisites && c.prerequisites.includes(comp.id));
    if (attachedDependents.length > 0) {
      this.showToast(`Blocked! Must remove child component first: ${attachedDependents[0].name}`, 'error');
      return;
    }

    comp.installed = false;
    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.showToast(`Removed component: ${comp.name}`, 'success');
    this.onComponentSelected(comp);
  }

  installComponent(comp) {
    if (comp.prerequisites && comp.prerequisites.length > 0) {
      const missingPrereq = comp.prerequisites.find(prereqId => {
        const prereqComp = this.components.find(c => c.id === prereqId);
        return prereqComp && !prereqComp.installed;
      });
      if (missingPrereq) {
        this.showToast(`Cannot install: Missing parent mounting component.`, 'error');
        return;
      }
    }

    comp.installed = true;
    if (comp.fastener) {
      comp.fastener.currentTorqueNm = 0;
      comp.fastener.isTorqued = false;
      comp.fastener.currentEngagementMm = 0; // Starts unthreaded when first positioned
    }
    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.showToast(`Installed component: ${comp.name}. Fasteners require threading in and torquing.`, 'success');
    this.onComponentSelected(comp);
  }

  pullDent(comp) {
    if (comp.dentDepthMm === undefined || comp.dentDepthMm <= 0) {
      this.showToast(`No dent detected on ${comp.name}.`, 'info');
      return;
    }
    comp.dentDepthMm = Math.max(0, comp.dentDepthMm - 2.5);
    if (comp.dentDepthMm === 0) {
      this.showToast(`Dent fully pulled! Surface curvature restored on ${comp.name}.`, 'success');
    } else {
      this.showToast(`Dent pulled. Remaining deformation: ${comp.dentDepthMm.toFixed(1)} mm.`, 'warning');
    }
    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.onComponentSelected(comp);
  }

  refuelVehicle(comp) {
    if (comp.id !== 'fuel_filler_assembly') {
      this.showToast(`Please select the Fuel Filler Flap on the rear right quarter panel to refuel!`, 'warning');
      return;
    }
    if (!comp.isDoorOpen) {
      comp.isDoorOpen = true;
      this.showToast(`Opened fuel filler door.`, 'info');
      this.onComponentSelected(comp);
      return;
    }
    if (!comp.isCapOpen) {
      comp.isCapOpen = true;
      this.showToast(`Unscrewed fuel filler cap. Tank ready for dispenser nozzle.`, 'info');
      this.onComponentSelected(comp);
      return;
    }

    const available = comp.tankCapacityLiters - comp.currentFuelLiters;
    if (available <= 0.1) {
      this.showToast(`Fuel tank is completely full (60.0 L). Dispenser nozzle clicked off.`, 'success');
      return;
    }
    const dispenseAmount = Math.min(available, 10.0);
    comp.currentFuelLiters += dispenseAmount;
    this.showToast(`Dispensed ${dispenseAmount.toFixed(1)}L of Petrol 95. Tank Level: ${comp.currentFuelLiters.toFixed(1)}L / ${comp.tankCapacityLiters}L`, 'success');
    this.onComponentSelected(comp);
  }

  applyHighlight(objectGroup, colorHex) {
    objectGroup.traverse(child => {
      if (child.isMesh && child.material) {
        if (!child.userData.originalEmissive) {
          child.userData.originalEmissive = child.material.emissive ? child.material.emissive.getHex() : 0x000000;
        }
        if (child.material.emissive) {
          child.material.emissive.setHex(colorHex);
        }
      }
    });
  }

  clearHover() {
    if (this.hoveredMesh) {
      this.hoveredMesh.traverse(child => {
        if (child.isMesh && child.material && child.userData.originalEmissive !== undefined) {
          child.material.emissive.setHex(child.userData.originalEmissive);
        }
      });
      this.hoveredMesh = null;
    }
  }
}
