/**
 * Physics Engine Wrapper for Robot Simulation
 * Uses Rapier.js for realistic physics with joints and motors
 */

let RAPIER = null;
let world = null;

/**
 * Initialize the physics engine
 */
export async function initPhysics() {
  // Dynamic import for Rapier (WASM)
  RAPIER = await import("@dimforge/rapier3d");

  // Create physics world with gravity
  const gravity = { x: 0, y: -9.81, z: 0 };
  world = new RAPIER.World(gravity);

  return { RAPIER, world };
}

/**
 * Get the physics world
 */
export function getWorld() {
  return world;
}

/**
 * Step the physics simulation
 */
export function stepPhysics(dt = 1 / 60) {
  if (world) {
    world.step();
  }
}

/**
 * Create a rigid body
 */
export function createRigidBody(options) {
  if (!RAPIER || !world) return null;

  const { position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0, w: 1 }, mass = 1, type = "dynamic" } = options;

  let rigidBodyDesc;
  if (type === "static") {
    rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
  } else if (type === "kinematic") {
    rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  } else {
    rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    rigidBodyDesc.setAdditionalMass(mass);
  }

  rigidBodyDesc.setTranslation(position.x, position.y, position.z);
  rigidBodyDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });

  const rigidBody = world.createRigidBody(rigidBodyDesc);
  return rigidBody;
}

/**
 * Create a collider (shape) attached to a rigid body
 */
export function createCollider(rigidBody, shape, options = {}) {
  if (!RAPIER || !world || !rigidBody) return null;

  const { size = { x: 0.1, y: 0.1, z: 0.1 }, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0, w: 1 } } = options;

  let colliderDesc;
  if (shape === "cylinder") {
    colliderDesc = RAPIER.ColliderDesc.cylinder(size.halfHeight || 0.5, size.radius || 0.1);
  } else if (shape === "ball") {
    colliderDesc = RAPIER.ColliderDesc.ball(size.radius || 0.1);
  } else if (shape === "cuboid") {
    colliderDesc = RAPIER.ColliderDesc.cuboid(size.halfX || 0.1, size.halfY || 0.1, size.halfZ || 0.1);
  } else {
    colliderDesc = RAPIER.ColliderDesc.cuboid(size.halfX || 0.1, size.halfY || 0.1, size.halfZ || 0.1);
  }

  colliderDesc.setTranslation(position.x, position.y, position.z);
  colliderDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });

  const collider = world.createCollider(colliderDesc, rigidBody);
  return collider;
}

/**
 * Create a revolute joint (for robot arm joints)
 */
export function createRevoluteJoint(body1, body2, options = {}) {
  if (!RAPIER || !world) return null;

  const {
    anchor1 = { x: 0, y: 0, z: 0 },
    anchor2 = { x: 0, y: 0, z: 0 },
    axis = { x: 0, y: 1, z: 0 }, // Default: rotate around Y axis
    limits = null, // { min: -Math.PI/2, max: Math.PI/2 }
    motorStiffness = 0,
    motorDamping = 0,
  } = options;

  const jointDesc = RAPIER.JointData.revolute(
    anchor1,
    anchor2,
    axis
  );

  // Set limits if provided
  if (limits) {
    jointDesc.limitsEnabled = true;
    jointDesc.limits = [limits.min, limits.max];
  }

  // Set motor if stiffness > 0
  if (motorStiffness > 0) {
    jointDesc.configureMotorPosition(0, motorStiffness, motorDamping);
  }

  const joint = world.createImpulseJoint(jointDesc, body1, body2, true);
  return joint;
}

/**
 * Update joint motor target
 */
export function setJointMotor(joint, targetAngle, stiffness = 100, damping = 10) {
  if (!joint) return;
  joint.configureMotorPosition(targetAngle, stiffness, damping);
}

/**
 * Get joint angle
 */
export function getJointAngle(joint) {
  if (!joint) return 0;
  // Rapier returns the relative rotation
  const data = joint.data();
  return data.localFrame1 ? data.localFrame1.x : 0;
}

/**
 * Clean up physics world
 */
export function destroyPhysics() {
  if (world) {
    world.free();
    world = null;
  }
  RAPIER = null;
}
