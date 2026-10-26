# BLENDER_TODO.md — 3D Asset Separation Guide for BMW M4 (G82)

This document specifies the exact mesh separation requirements for `clients/workshop-prototype/assets/models/bmw_m4.glb` to enable full kinematic articulation (opening doors, opening bonnet, opening boot, and individual wheel removal) in MECHVERSE.

---

## Current GLB Inspection Summary
- **Source Asset:** `clients/workshop-prototype/assets/models/bmw_m4.glb` (22.7 MB, 206,593 triangles, 35 nodes).
- **Inspection Finding:**
  - The exterior panels (bonnet, trunk lid, driver door, passenger door, front fenders, roof, and rear quarter panels) are currently **fused together** inside a single continuous geometry node: **`Object_23`** (`Meshesbody151Mtl`, 9,974 triangles).
  - The glass surfaces (windshield, rear glass, and door windows) are **fused together** in **`Object_25`** (`Mesheswindows1Mtl`, 1,382 triangles).
  - All four wheels (rims `Object_33` and tires `Object_34`) and calipers (`Object_32`) are grouped into single combined nodes across all 4 corners.

---

## Required Mesh Separations

### 1. Engine Bonnet / Hood
- **Source Node:** `Object_23`
- **Target Node Name:** `bonnet_lid`
- **Boundaries to Cut:**
  - Seam along left front fender
  - Seam along right front fender
  - Seam above kidney grille front fascia
  - Rear cowl seam just forward of windshield base
- **Hinge Axis Location:**
  - **Position (Pivot):** Rear edge of bonnet near windshield cowl `[X: 0.0, Y: 0.96m, Z: -0.65m]`
  - **Rotation Vector:** Pitch rotation around local X-axis (`+X` axis)
  - **Angular Travel:** 0° (closed) to +65° (open with hydraulic strut hold)

---

### 2. Driver Door (Front-Left)
- **Source Nodes:** `Object_23` (outer door sheetmetal) and `Object_25` (driver side window glass)
- **Target Node Name:** `door_FL` (and child `door_FL_glass`)
- **Boundaries to Cut:**
  - A-pillar door gap seam
  - Bottom rocker panel sill seam
  - B-pillar shut line seam
  - Roofline window channel seam
- **Hinge Axis Location:**
  - **Position (Pivot):** Forward door edge along A-pillar hinge mounts `[X: -0.92m, Y: 0.55m, Z: -0.15m]`
  - **Rotation Vector:** Yaw rotation around local Y-axis
  - **Angular Travel:** 0° (closed) to -60° (open)

---

### 3. Passenger Door (Front-Right)
- **Source Nodes:** `Object_23` (outer door sheetmetal) and `Object_25` (passenger side window glass)
- **Target Node Name:** `door_FR` (and child `door_FR_glass`)
- **Boundaries to Cut:**
  - Right A-pillar door gap seam
  - Bottom rocker panel sill seam
  - Right B-pillar shut line seam
  - Roofline window channel seam
- **Hinge Axis Location:**
  - **Position (Pivot):** Forward door edge along A-pillar hinge mounts `[X: +0.92m, Y: 0.55m, Z: -0.15m]`
  - **Rotation Vector:** Yaw rotation around local Y-axis
  - **Angular Travel:** 0° (closed) to +60° (open)

---

### 4. Rear Trunk / Boot Lid
- **Source Node:** `Object_23`
- **Target Node Name:** `boot_lid`
- **Boundaries to Cut:**
  - Rear decklid seam below back glass
  - Left rear quarter panel seam
  - Right rear quarter panel seam
  - Lower taillight / bumper lip seam
- **Hinge Axis Location:**
  - **Position (Pivot):** Upper rear deck hinge line `[X: 0.0, Y: 1.02m, Z: +1.85m]`
  - **Rotation Vector:** Pitch rotation around local X-axis
  - **Angular Travel:** 0° (closed) to +55° (open)

---

### 5. Four Independent Wheel Assemblies
- **Source Nodes:** `Object_33` (rims), `Object_34` (tires), `Object_32` (calipers)
- **Target Node Names:**
  - `wheel_FL_pivot` &rarr; `rim_FL`, `tire_FL`, `caliper_FL` (Center: `X: -0.82m, Y: 0.34m, Z: -1.42m`)
  - `wheel_FR_pivot` &rarr; `rim_FR`, `tire_FR`, `caliper_FR` (Center: `X: +0.82m, Y: 0.34m, Z: -1.42m`)
  - `wheel_RL_pivot` &rarr; `rim_RL`, `tire_RL`, `caliper_RL` (Center: `X: -0.83m, Y: 0.35m, Z: +1.44m`)
  - `wheel_RR_pivot` &rarr; `rim_RR`, `tire_RR`, `caliper_RR` (Center: `X: +0.83m, Y: 0.35m, Z: +1.44m`)
- **Origin / Pivot:** Each wheel group must have its local origin centered precisely at its hub axle so rotation (`wheel.rotation.x`) spins true without wobbling.

---

## Instructions for Exporting Back to GLB
1. Apply all transforms in Blender (`Ctrl+A` &rarr; `All Transforms`).
2. Set pivots to the exact hinge locations indicated above.
3. Export via **File &rarr; Export &rarr; glTF 2.0 (.glb)**:
   - Format: `glTF Binary (.glb)`
   - Include: Selected Objects, Transform &rarr; `+Y Up`
   - Geometry: Apply Modifiers, Tangents, UVs, Normals
4. Save over `clients/workshop-prototype/assets/models/bmw_m4.glb`.
