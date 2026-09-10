/**
 * Scientifically Accurate 6-DOF Industrial Robot Arm
 * EXACT MATCH to reference image:
 *   - Wide orange base with dark stripes + gray control panel
 *   - Large circular joint hubs with yellow/orange rings
 *   - THICK GRAY upper arm and forearm
 *   - Orange curved cables along the back
 *   - Crab-claw gripper HANGING DOWN with pincers pointing DOWNWARD
 */

import * as THREE from "three";

/* ── Materials (matching reference image colors) ───────── */
const M = {
  orange: new THREE.MeshStandardMaterial({ color: 0xE87E22, metalness: 0.6, roughness: 0.35 }),
  gray: new THREE.MeshStandardMaterial({ color: 0xA8ADB5, metalness: 0.7, roughness: 0.3 }),
  darkGray: new THREE.MeshStandardMaterial({ color: 0x3D3D4F, metalness: 0.8, roughness: 0.2 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.15 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 }),
  yellowRing: new THREE.MeshStandardMaterial({ color: 0xF5A623, metalness: 0.7, roughness: 0.25 }),
  cable: new THREE.MeshStandardMaterial({ color: 0xE87E22, metalness: 0.4, roughness: 0.5 }),
  controlPanel: new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.5, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.3, roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 }),
  table: new THREE.MeshStandardMaterial({ color: 0x1e2a3a, metalness: 0.3, roughness: 0.7 }),
};

/* ── Geometry helpers ──────────────────────────────────── */

function cyl(rTop, rBot, h, mat, segs = 24) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, mat) {
  const g = new THREE.SphereGeometry(r, 24, 24);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

/**
 * Large joint hub — dark sphere with bright yellow/orange ring
 * Reference image: big circular joints with yellow rings
 */
function jointHub(radius, bodyMat = M.darkGray) {
  const g = new THREE.Group();

  // Main dark body
  g.add(sphere(radius, bodyMat));

  // Bright yellow/orange ring (prominent in reference)
  const ringGeo = new THREE.TorusGeometry(radius * 1.12, radius * 0.08, 12, 32);
  const ring = new THREE.Mesh(ringGeo, M.yellowRing);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Second thinner ring
  const ring2Geo = new THREE.TorusGeometry(radius * 0.95, radius * 0.03, 8, 32);
  const ring2 = new THREE.Mesh(ring2Geo, M.orange);
  ring2.rotation.x = Math.PI / 2;
  g.add(ring2);

  // Central bolt cap
  const boltGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, radius * 0.15, 12);
  const bolt = new THREE.Mesh(boltGeo, M.chrome);
  g.add(bolt);

  return g;
}

/**
 * Orange cable/tube — visible along the back of the arm in reference image
 */
function orangeCable(length) {
  const g = new THREE.Group();

  // Main cable body (cylinder)
  const cableBody = cyl(0.015, 0.015, length, M.cable, 8);
  g.add(cableBody);

  // Curve caps at ends
  const cap1 = sphere(0.015, M.cable);
  cap1.position.y = length / 2;
  g.add(cap1);

  const cap2 = sphere(0.015, M.cable);
  cap2.position.y = -length / 2;
  g.add(cap2);

  return g;
}

/**
 * Crab-claw gripper — POINTING UPWARD
 * Claws point UPWARD so when arm tilts, they can grab objects from below
 * Base connector is at the bottom to attach to Joint 7
 * Minimal gaps between components
 */
function createCrabClaw() {
  const g = new THREE.Group();

  // Base connector (at BOTTOM - attaches to Joint 7)
  const baseConn = cyl(0.035, 0.03, 0.03, M.darkGray);
  baseConn.position.y = 0;
  g.add(baseConn);

  // Gripper base plate (above connector - minimal gap)
  const basePlate = box(0.07, 0.015, 0.035, M.darkGray);
  basePlate.position.y = 0.02;
  g.add(basePlate);

  // ── LEFT CLAW (pointing UPWARD, opens to the left) ──
  const leftGroup = new THREE.Group();
  leftGroup.position.set(-0.035, 0.025, 0);

  // Left arm (extends UP and out - very close to base)
  const leftArm = box(0.015, 0.05, 0.015, M.darkGray);
  leftArm.position.set(-0.01, 0.025, 0);
  leftArm.rotation.z = -0.25;
  leftGroup.add(leftArm);

  // Left finger tip (pointed, pointing UP)
  const leftTip = box(0.01, 0.025, 0.012, M.darkGray);
  leftTip.position.set(-0.025, 0.05, 0);
  leftTip.rotation.z = -0.35;
  leftGroup.add(leftTip);

  // Rubber grip pad (inner surface)
  const leftPad = box(0.006, 0.035, 0.01, M.rubber);
  leftPad.position.set(-0.015, 0.035, 0);
  leftGroup.add(leftPad);

  g.add(leftGroup);

  // ── RIGHT CLAW (mirror, pointing UPWARD) ──
  const rightGroup = new THREE.Group();
  rightGroup.position.set(0.035, 0.025, 0);

  const rightArm = box(0.015, 0.05, 0.015, M.darkGray);
  rightArm.position.set(0.01, 0.025, 0);
  rightArm.rotation.z = 0.25;
  rightGroup.add(rightArm);

  const rightTip = box(0.01, 0.025, 0.012, M.darkGray);
  rightTip.position.set(0.025, 0.05, 0);
  rightTip.rotation.z = 0.35;
  rightGroup.add(rightTip);

  const rightPad = box(0.006, 0.035, 0.01, M.rubber);
  rightPad.position.set(0.015, 0.035, 0);
  rightGroup.add(rightPad);

  g.add(rightGroup);

  return { group: g, left: leftGroup, right: rightGroup };
}

/* ── Main Robot Builder ────────────────────────────────── */

export function createRobotArm(scene) {
  const group = new THREE.Group();
  const joints = [];
  const jointData = [];

  // ── TABLE ──
  const table = box(4, 0.12, 3, M.table);
  table.position.y = -0.06;
  table.receiveShadow = true;
  group.add(table);

  const grid = new THREE.GridHelper(4, 20, 0x333355, 0x222244);
  grid.position.y = 0.005;
  group.add(grid);

  // ══════════════════════════════════════════════════════
  // BASE — Wide rectangular with orange/dark stripes
  // Reference: orange base body + dark horizontal stripes + gray control panel on left
  // ══════════════════════════════════════════════════════
  const baseGroup = new THREE.Group();
  baseGroup.position.y = 0;
  group.add(baseGroup);

  // Main base body (wide rectangle)
  const baseBody = box(0.6, 0.22, 0.5, M.orange);
  baseBody.position.y = 0.11;
  baseGroup.add(baseBody);

  // Dark horizontal stripes (3 stripes visible in reference)
  for (let i = 0; i < 3; i++) {
    const stripe = box(0.62, 0.025, 0.52, M.darkGray);
    stripe.position.y = 0.04 + i * 0.065;
    baseGroup.add(stripe);
  }

  // Base top platform
  const baseTop = cyl(0.2, 0.22, 0.06, M.orange);
  baseTop.position.y = 0.25;
  baseGroup.add(baseTop);

  // Control panel (left side — gray box with white bars)
  const panelBody = box(0.1, 0.18, 0.35, M.controlPanel);
  panelBody.position.set(-0.35, 0.12, 0);
  baseGroup.add(panelBody);

  // White horizontal bars on panel
  for (let i = 0; i < 3; i++) {
    const bar = box(0.08, 0.018, 0.25, M.white);
    bar.position.set(-0.4, 0.07 + i * 0.045, 0);
    baseGroup.add(bar);
  }

  // Small indicator dots
  for (let i = 0; i < 3; i++) {
    const dot = box(0.02, 0.02, 0.02, M.darkGray);
    dot.position.set(-0.4, 0.16, -0.12 + i * 0.12);
    baseGroup.add(dot);
  }

  // ══════════════════════════════════════════════════════
  // JOINT 1 (Base/Waist) — Large hub with yellow ring
  // ══════════════════════════════════════════════════════
  const joint1Group = new THREE.Group();
  joint1Group.position.y = 0.28;
  baseGroup.add(joint1Group);
  joints.push(joint1Group);
  jointData.push({ type: "revolute", axis: "y", limits: { min: -Math.PI, max: Math.PI } });

  const j1Hub = jointHub(0.18, M.darkGray);
  joint1Group.add(j1Hub);

  // ══════════════════════════════════════════════════════
  // SHOULDER COLUMN — Gray/silver vertical segment
  // Reference: thick gray cylinder between J1 and J2
  // ══════════════════════════════════════════════════════
  const shoulderCol = cyl(0.07, 0.09, 0.25, M.gray);
  shoulderCol.position.y = 0.125;
  joint1Group.add(shoulderCol);

  // Orange cable along shoulder back
  const shoulderCable = orangeCable(0.2);
  shoulderCable.position.set(0, 0.12, -0.08);
  joint1Group.add(shoulderCable);

  // ══════════════════════════════════════════════════════
  // JOINT 2 (Shoulder) — VERY LARGE hub with yellow ring
  // Reference: the BIGGEST joint, orange body + yellow ring
  // ══════════════════════════════════════════════════════
  const joint2Group = new THREE.Group();
  joint2Group.position.y = 0.25;
  joint1Group.add(joint2Group);
  joints.push(joint2Group);
  jointData.push({ type: "revolute", axis: "z", limits: { min: -Math.PI / 4, max: Math.PI / 2 } }); // Limit to -45° to 90°

  const j2Hub = jointHub(0.14, M.orange); // LARGER hub
  joint2Group.add(j2Hub);

  // ══════════════════════════════════════════════════════
  // UPPER ARM — THICK GRAY/silver segment
  // Reference: the upper arm is GRAY and THICK
  // ══════════════════════════════════════════════════════
  const upperArmGroup = new THREE.Group();
  joint2Group.add(upperArmGroup);

  const upperArm = cyl(0.055, 0.065, 0.6, M.gray); // GRAY, not orange
  upperArm.position.y = 0.3;
  upperArmGroup.add(upperArm);

  // Chrome accent ring
  const upperAccent = cyl(0.066, 0.066, 0.02, M.chrome);
  upperAccent.position.y = 0.12;
  upperArmGroup.add(upperAccent);

  // Orange cable along upper arm back (visible in reference)
  const upperCable1 = orangeCable(0.55);
  upperCable1.position.set(0, 0.28, -0.065);
  upperArmGroup.add(upperCable1);

  // Second cable
  const upperCable2 = orangeCable(0.55);
  upperCable2.position.set(0.02, 0.28, -0.055);
  upperArmGroup.add(upperCable2);

  // ══════════════════════════════════════════════════════
  // JOINT 3 (Elbow) — Hub with yellow ring
  // ══════════════════════════════════════════════════════
  const joint3Group = new THREE.Group();
  joint3Group.position.y = 0.6;
  upperArmGroup.add(joint3Group);
  joints.push(joint3Group);
  jointData.push({ type: "revolute", axis: "z", limits: { min: -Math.PI * 0.75, max: Math.PI * 0.75 } });

  const j3Hub = jointHub(0.09, M.darkGray);
  joint3Group.add(j3Hub);

  // ══════════════════════════════════════════════════════
  // FOREARM — THICK GRAY/silver segment
  // Reference: forearm is also gray, slightly thinner than upper arm
  // ══════════════════════════════════════════════════════
  const forearmGroup = new THREE.Group();
  joint3Group.add(forearmGroup);

  const forearm = cyl(0.04, 0.05, 0.5, M.gray); // GRAY, not orange
  forearm.position.y = 0.25;
  forearmGroup.add(forearm);

  // Chrome accent ring on forearm
  const forearmAccent = cyl(0.051, 0.051, 0.018, M.chrome);
  forearmAccent.position.y = 0.1;
  forearmGroup.add(forearmAccent);

  // Cable along forearm
  const forearmCable = orangeCable(0.45);
  forearmCable.position.set(0, 0.22, -0.05);
  forearmGroup.add(forearmCable);

  // ══════════════════════════════════════════════════════
  // JOINT 4 (Wrist Pitch)
  // ══════════════════════════════════════════════════════
  const joint4Group = new THREE.Group();
  joint4Group.position.y = 0.5;
  forearmGroup.add(joint4Group);
  joints.push(joint4Group);
  jointData.push({ type: "revolute", axis: "z", limits: { min: -Math.PI, max: Math.PI } });

  const j4Hub = jointHub(0.06, M.orange);
  joint4Group.add(j4Hub);

  // ══════════════════════════════════════════════════════
  // JOINT 5 (Wrist Roll)
  // ══════════════════════════════════════════════════════
  const joint5Group = new THREE.Group();
  joint5Group.position.y = 0.07;
  joint4Group.add(joint5Group);
  joints.push(joint5Group);
  jointData.push({ type: "revolute", axis: "y", limits: { min: -Math.PI, max: Math.PI } });

  // Wrist connector
  const wristConn = cyl(0.035, 0.04, 0.07, M.gray);
  wristConn.position.y = 0.035;
  joint5Group.add(wristConn);

  // ══════════════════════════════════════════════════════
  // JOINT 6 (Flange) — Black joint at the end
  // ══════════════════════════════════════════════════════
  const joint6Group = new THREE.Group();
  joint6Group.position.y = 0.07;
  joint5Group.add(joint6Group);
  joints.push(joint6Group);
  jointData.push({ type: "revolute", axis: "y", limits: { min: -Math.PI * 2, max: Math.PI * 2 } });

  const j6Hub = jointHub(0.04, M.darkGray);
  joint6Group.add(j6Hub);

  // ══════════════════════════════════════════════════════
  // JOINT 7 (Gripper) — ATTACHED to Joint 6 (no floating!)
  // ══════════════════════════════════════════════════════
  const joint7Group = new THREE.Group();
  joint7Group.position.y = 0.04; // directly on top of Joint 6 hub
  joint6Group.add(joint7Group);
  joints.push(joint7Group);
  jointData.push({ type: "prismatic", axis: "x", limits: { min: -0.08, max: 0.08 } });

  // ══════════════════════════════════════════════════════
  // CRAB-CLAW GRIPPER — ATTACHED to Joint 7 (pointing up)
  // ══════════════════════════════════════════════════════
  const gripper = createCrabClaw();
  gripper.group.position.y = 0.04; // directly on top of Joint 7
  joint7Group.add(gripper.group);

  return {
    group,
    joints,
    jointData,
    gripper,
    segments: { shoulderCol, upperArmGroup, forearmGroup, joint4Group, joint6Group },
    dimensions: {},
    materials: M,
  };
}

/* ── Control API ───────────────────────────────────────── */

export function setJointAngle(robot, jointIndex, angleDeg) {
  if (!robot || !robot.joints[jointIndex]) return;
  const angleRad = (angleDeg * Math.PI) / 180;
  const joint = robot.joints[jointIndex];
  const axis = robot.jointData[jointIndex]?.axis || "z";
  joint.rotation[axis] = angleRad;
}

export function setGripper(robot, open) {
  if (!robot || !robot.gripper) return;
  // closedX = claws together (minimal gap), openX = claws spread
  const closedX = 0.035;  // claws very close when closed
  const openX = 0.06;     // claws spread when open
  const spread = closedX + open * (openX - closedX);
  robot.gripper.left.position.x = -spread;
  robot.gripper.right.position.x = spread;
}

export function resetRobot(robot) {
  if (!robot) return;
  robot.joints.forEach((j) => { j.rotation.x = 0; j.rotation.y = 0; j.rotation.z = 0; });
  setGripper(robot, 1);
}

export function getEndEffectorPosition(robot) {
  if (!robot) return { x: 0, y: 0, z: 0 };
  const lastJoint = robot.joints[robot.joints.length - 1];
  const pos = new THREE.Vector3();
  lastJoint.getWorldPosition(pos);
  return { x: pos.x, y: pos.y, z: pos.z };
}

export { M as MATERIALS };
