/**
 * Robot Arm Kinematics — pure math, no Three.js matrixWorld dependency.
 *
 * Geometry (from robotArm.js hierarchy, all in meters, Y up):
 *   base (0.28) → J1 (yaw, rotates around Y) → shoulder column (0.25)
 *   → J2 (pitch, around Z) → upper arm (0.6)
 *   → J3 (pitch, around Z) → forearm (0.5)
 *   → J4 (pitch, around Z) → wrist stack (0.07+0.07+0.04) + gripper base (0.04) + claw tip (0.075)
 *
 * Sign conventions:
 *   - rotation.z = +θ tilts the +Y axis toward −X (Three.js right-hand rule)
 *   - So to bend toward +X (toward the objects) we use NEGATIVE joint angles.
 *   - t2/t3/t4 below are "tilt from vertical, positive toward +X".
 */

export const ARM = {
  baseH: 0.28, // ground → J1
  shoulderH: 0.25, // J1 → J2
  upper: 0.6, // J2 → J3
  forearm: 0.5, // J3 → J4
  wristStack: 0.07 + 0.07 + 0.04, // J4 → J7
  gripBase: 0.04, // J7 → gripper base
  clawTip: 0.075, // gripper base → claw tips
};

export const SHOULDER_Y = ARM.baseH + ARM.shoulderH; // 0.53
export const TIP_LEN = ARM.wristStack + ARM.gripBase + ARM.clawTip; // J4 → claw tip ≈ 0.295

export const LIMITS = {
  1: { min: -180, max: 180 },
  2: { min: -75, max: 90 },
  3: { min: -135, max: 135 },
  4: { min: -180, max: 180 },
};

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/**
 * Forward kinematics: joint angles (degrees, 1-indexed {1,2,3,4,5,6}) → claw tip position.
 * Joints 5/6 are wrist rolls (around Y) and do not move the tip position.
 */
export function fkTip(angles) {
  const j1 = rad(angles[1] || 0);
  const j2 = rad(angles[2] || 0);
  const j3 = rad(angles[3] || 0);
  const j4 = rad(angles[4] || 0);

  // Tilt from vertical, positive toward +X (see note above)
  const t2 = -j2;
  const t3 = -(j2 + j3);
  const t4 = -(j2 + j3 + j4);

  const xLocal =
    ARM.upper * Math.sin(t2) +
    ARM.forearm * Math.sin(t3) +
    TIP_LEN * Math.sin(t4);
  const yLocal =
    SHOULDER_Y +
    ARM.upper * Math.cos(t2) +
    ARM.forearm * Math.cos(t3) +
    TIP_LEN * Math.cos(t4);

  // Yaw (J1) rotates the arm plane around Y: Ry(j1) applied to (xLocal, y, 0)
  const x = xLocal * Math.cos(j1);
  const z = -xLocal * Math.sin(j1);
  return { x, y: yLocal, z };
}

/**
 * Forward kinematics for the WRIST (J4) — used for the physics push collider
 * so the arm body pushes objects but the claw area stays free for grabbing.
 */
export function fkWrist(angles) {
  const j1 = rad(angles[1] || 0);
  const j2 = rad(angles[2] || 0);
  const j3 = rad(angles[3] || 0);
  const j4 = rad(angles[4] || 0);

  const t2 = -j2;
  const t3 = -(j2 + j3);

  const xLocal =
    ARM.upper * Math.sin(t2) +
    ARM.forearm * Math.sin(t3);
  const yLocal =
    SHOULDER_Y +
    ARM.upper * Math.cos(t2) +
    ARM.forearm * Math.cos(t3);

  const x = xLocal * Math.cos(j1);
  const z = -xLocal * Math.sin(j1);
  return { x, y: yLocal, z };
}

/**
 * Inverse kinematics: find joint angles so the claw tip reaches target (tx, ty, tz).
 * Returns {1,2,3,4} in degrees (with 5,6,7 preserved by caller), or null if unreachable.
 *
 * Strategy: choose the gripper's tilt (t4) so the claw tips approach the target from above,
 * then solve the 2-link shoulder+elbow (elbow-down solution) for the wrist position.
 */
export function ikTip(tx, ty, tz, opts = {}) {
  const t4 = rad(opts.tilt ?? 170); // near-vertical, tips pointing down at the object
  const j1 = Math.atan2(-tz, tx);
  const r = Math.hypot(tx, tz);

  // Wrist position W needed so that W + TIP_LEN*dir(t4) = target
  const Wx = r - TIP_LEN * Math.sin(t4);
  const Wy = ty - TIP_LEN * Math.cos(t4);

  // 2-link IK from shoulder S=(0, SHOULDER_Y) to W
  const dy = Wy - SHOULDER_Y;
  const d = Math.hypot(Wx, dy);
  const L1 = ARM.upper;
  const L2 = ARM.forearm;
  if (d < Math.abs(L1 - L2) + 1e-6 || d > L1 + L2 - 1e-6) {
    return null; // unreachable
  }

  const cosElbow = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const elbow = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
  const psi = Math.atan2(Wx, dy); // angle of W from vertical
  const alpha = Math.atan2(L2 * Math.sin(elbow), L1 + L2 * Math.cos(elbow));

  const t2 = psi - alpha; // elbow-down solution
  const t3 = t2 + elbow;

  // Convert tilts back to Three.js joint angles
  const j2 = -t2;
  const j3 = -(t3 - t2); // = -elbow
  const j4 = -t4 - j2 - j3;

  // Clamp to limits
  const j2c = Math.max(LIMITS[2].min, Math.min(LIMITS[2].max, deg(j2)));
  const j3c = Math.max(LIMITS[3].min, Math.min(LIMITS[3].max, deg(j3)));
  const j4c = Math.max(LIMITS[4].min, Math.min(LIMITS[4].max, deg(j4)));

  return { 1: deg(j1), 2: j2c, 3: j3c, 4: j4c };
}