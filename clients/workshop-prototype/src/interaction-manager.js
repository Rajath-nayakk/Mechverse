import * as THREE from '../vendor/three.module.js';

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

    this.activeTool = 'TOOL_INSPECT'; // Default: inspection hand
    this.hoveredMesh = null;
    this.selectedComponent = null;

    this.configuredWrenchTorqueNm = 25.0; // Adjustable torque setting on wrench

    this.initEvents();
  }

  initEvents() {
    this.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  setTool(toolId) {
    this.activeTool = toolId;
    if (toolId === 'TOOL_TORQUE_17') {
      this.configuredWrenchTorqueNm = 120.0;
    } else if (toolId === 'TOOL_TORQUE_24') {
      this.configuredWrenchTorqueNm = 25.0;
    }
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
      // Find parent with userData.componentId
      let current = intersects[0].object;
      while (current && !current.userData.componentId && current.parent) {
        current = current.parent;
      }

      if (current && current.userData.componentId) {
        if (this.hoveredMesh !== current) {
          this.clearHover();
          this.hoveredMesh = current;
          this.applyHighlight(current, 0x388bfd); // Blue hover highlight
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
    this.onComponentSelected(comp);

    // Apply immediate tool action if specific tool selected
    this.applyActiveTool(comp);
  }

  applyActiveTool(comp) {
    if (this.activeTool === 'TOOL_PRESSURE_WASHER') {
      this.washComponent(comp);
    } else if (this.activeTool === 'TOOL_DENT_PULLER') {
      this.pullDent(comp);
    } else if (this.activeTool === 'TOOL_FUEL_NOZZLE') {
      this.refuelVehicle(comp);
    }
  }

  applyTorqueWrench(comp) {
    if (!comp.fastener) {
      this.showToast('Component has no threaded fasteners to torque.', 'error');
      return;
    }

    // Check socket size match
    let toolSocketSize = 17.0;
    if (this.activeTool === 'TOOL_TORQUE_24') toolSocketSize = 24.0;
    else if (this.activeTool === 'TOOL_TORQUE_17') toolSocketSize = 17.0;

    if (Math.abs(toolSocketSize - comp.fastener.socketSizeMm) > 0.1) {
      this.showToast(`Socket mismatch! Wrench has ${toolSocketSize}mm socket, fastener requires ${comp.fastener.socketSizeMm}mm.`, 'error');
      return;
    }

    // Apply torque
    const appliedTorque = this.configuredWrenchTorqueNm;
    if (appliedTorque > comp.fastener.yieldTorqueLimitNm) {
      comp.fastener.isStripped = true;
      comp.fastener.isTorqued = false;
      comp.fastener.currentTorqueNm = 0;
      this.showToast(`DANGER: Over-torqued (${appliedTorque} N*m)! Fastener stripped/yielded.`, 'error');
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

  loosenFasteners(comp) {
    if (!comp.fastener) return;
    comp.fastener.currentTorqueNm = 0;
    comp.fastener.isTorqued = false;
    this.showToast(`Fasteners loosened for ${comp.name}.`, 'success');
    this.onComponentSelected(comp);
  }

  removeComponent(comp) {
    // 1. Check if fasteners still tightened
    if (comp.fastener && (comp.fastener.isTorqued || comp.fastener.currentTorqueNm > 0)) {
      this.showToast(`Cannot remove ${comp.name}: Fasteners are still tightened! Loosen them first.`, 'error');
      return;
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
    // Check prerequisites
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
    }
    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.showToast(`Installed component: ${comp.name}. Fasteners are loose.`, 'success');
    this.onComponentSelected(comp);
  }

  washComponent(comp) {
    if (comp.cleanlinessPercentage >= 100) {
      this.showToast(`${comp.name} is already pristine clean!`, 'info');
      return;
    }
    comp.cleanlinessPercentage = 100.0;
    this.vehicleModel.updateComponentVisuals(comp);
    this.conditionSystem.updateFromComponents(this.components);
    this.showToast(`Cleaned and degreased: ${comp.name} is now 100% clean.`, 'success');
    this.onComponentSelected(comp);
  }

  pullDent(comp) {
    if (comp.dentDepthMm === undefined || comp.dentDepthMm <= 0) {
      this.showToast(`No dent detected on ${comp.name}.`, 'info');
      return;
    }
    comp.dentDepthMm = Math.max(0, comp.dentDepthMm - 2.5); // 2.5mm pull reduction
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

    // Dispense 10 Liters
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
