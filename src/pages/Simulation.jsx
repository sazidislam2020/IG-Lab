import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import {
  createRobotArm,
  setJointAngle,
  setGripper,
  resetRobot,
} from "../lib/robotArm";
import { fkTip, fkWrist, ikTip } from "../lib/armKinematics";

// Expose kinematics for testing / script use
window.__fkTip = fkTip;
window.__ikTip = ikTip;

let RAPIER = null;
let physicsWorld = null;
let scriptRunning = false; // module-level: shared by runCode and the animation loop

const S = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#2a3548", color: "#e0e0e0", fontFamily: "'Inter',sans-serif", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: "#1e2836", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: { color: "#aaa", textDecoration: "none", fontSize: 13 },
  title: { fontSize: 16, fontWeight: 600 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  split: { flex: 1, display: "flex", overflow: "hidden" },
  viewportWrap: { flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)", position: "relative" },
  viewport: { flex: 1, background: "#2a3548" },
  viewportOverlay: { position: "absolute", bottom: 16, left: 16, display: "flex", gap: 8, flexWrap: "wrap" },
  overlayBadge: { background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#ccc", backdropFilter: "blur(4px)" },
  rightPanel: { width: "42%", display: "flex", flexDirection: "column", background: "#222838" },
  tabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  tab: { padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#666", background: "transparent", border: "none", borderBottom: "2px solid transparent" },
  tabActive: { color: "#f97316", borderBottom: "2px solid #f97316" },
  controls: { flex: 1, overflow: "auto", padding: 16 },
  controlGroup: { marginBottom: 14 },
  controlLabel: { fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 6, display: "flex", justifyContent: "space-between" },
  slider: { width: "100%", accentColor: "#f97316", cursor: "pointer" },
  runBtn: { background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  select: { background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#e0e0e0" },
  output: { flex: 1, overflow: "auto", padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.7 },
  outputLine: { whiteSpace: "pre-wrap", color: "#ccc" },
  actionBtn: { background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  actionBtnBlue: { background: "rgba(56,189,248,0.15)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};

const ROBOT_SCRIPTS = {
  wave: `// Wave Animation
async function wave() {
  robot.log("Waving...");
  for (let i = 0; i < 3; i++) {
    await robot.setJoint(1, 45);
    await robot.setJoint(2, -30);
    await robot.wait(400);
    await robot.setJoint(1, -45);
    await robot.setJoint(2, 30);
    await robot.wait(400);
  }
  await robot.home();
  robot.log("Done!");
}
wave();`,

  pickAndPlace: `// Pick and Place — IK-driven, targets the nearest reachable object.
// All travel happens HIGH above the table (y = 0.7) so the claw only descends
// directly onto its target and doesn't knock neighboring objects around.
async function pickAndPlace() {
  const HIGH = 0.7; // cruise altitude (well above all objects)
  robot.log("Step 1: Locating target object...");
  const obj = robot.findObject();
  if (!obj) {
    robot.log("❌ No reachable object found!");
    return;
  }
  robot.log("Target: " + obj.name + " at (" + obj.x.toFixed(2) + ", " + obj.y.toFixed(2) + ", " + obj.z.toFixed(2) + ")");

  robot.log("Step 2: Opening claw...");
  await robot.setJoint(7, 100);
  await robot.wait(200);

  robot.log("Step 3: Flying above object...");
  await robot.moveTo(obj.x, HIGH, obj.z, 800);

  robot.log("Step 4: Descending onto object...");
  await robot.moveTo(obj.x, obj.y + 0.1, obj.z, 600);
  await robot.wait(400);

  robot.log("Step 5: Closing claw (magnet pulls object in)...");
  await robot.setJoint(7, 0);
  await robot.wait(1000);

  robot.log("Step 6: Lifting object...");
  await robot.moveTo(obj.x, HIGH, obj.z, 800);
  await robot.wait(300);

  robot.log("Step 7: Carrying to drop zone...");
  await robot.moveTo(-0.7, HIGH, 0.3, 900);

  robot.log("Step 8: Lowering to table...");
  await robot.moveTo(-0.7, 0.16, 0.3, 600);
  await robot.wait(400);

  robot.log("Step 9: Releasing object...");
  await robot.setJoint(7, 100);
  await robot.wait(500);

  robot.log("Step 10: Flying back up...");
  await robot.moveTo(-0.7, HIGH, 0.3, 600);

  robot.log("Step 11: Return home...");
  await robot.home();
  robot.log("✅ Complete!");
}
pickAndPlace();`,

  home: `// Go Home
async function goHome() {
  robot.log("Going home...");
  await robot.home();
  robot.log("Home!");
}
goHome();`,
};

// Table surface Y — objects rest ON TOP of this
const TABLE_Y = 0.06;

export default function Simulation() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const robotRef = useRef(null);
  const animFrameRef = useRef(null);
  const physicsObjectsRef = useRef([]);
  const grabbedObjectRef = useRef(null);
  const lastReleasedRef = useRef(null);
  const [activeTab, setActiveTab] = useState("controls");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [code, setCode] = useState(ROBOT_SCRIPTS.wave);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [jointAngles, setJointAngles] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 100 });
  const [endEffectorPos, setEndEffectorPos] = useState({ x: 0, y: 0, z: 0 });
  const [physicsReady, setPhysicsReady] = useState(false);
  const [grabbedObject, setGrabbedObject] = useState(null);
  const codeRef = useRef(code);
  const jointAnglesRef = useRef(jointAngles);
  const isRunningRef = useRef(false);
  codeRef.current = code;
  jointAnglesRef.current = jointAngles;

  // ── Three.js + Physics init ──
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a3548);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, canvas.parentElement.clientWidth / canvas.parentElement.clientHeight, 0.1, 100);
    camera.position.set(3, 2.5, 3.5);
    camera.lookAt(0, 0.8, 0);

    // Lighting (bright — not dark)
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLight(0xe8f4ff, 0.6).translateX(-4).translateY(6).translateZ(-3));
    scene.add(new THREE.PointLight(0xffffff, 0.7, 15).translateY(4));

    // ── Robot Arm ──
    const robot = createRobotArm(scene);
    scene.add(robot.group);
    robotRef.current = robot;

    // ── Objects on the RIGHT side of table (away from robot base at x≈0) ──
    // All Y positions are TABLE_Y + halfHeight so they sit ON the table surface
    const objects = [];
    // Objects placed inside the arm's IK workspace (max reach ≈ x=1.10 at table height)
    const objectConfigs = [
      { type: "box",     color: 0xff4444, pos: [0.62, 0, 0.42],  size: 0.08, name: "Red Block" },
      { type: "box",     color: 0x44ff44, pos: [0.82, 0, 0.30],  size: 0.10, name: "Green Block" },
      { type: "box",     color: 0x4444ff, pos: [0.50, 0, 0.10],  size: 0.07, name: "Blue Block" },
      { type: "box",     color: 0xffff44, pos: [0.72, 0, -0.28], size: 0.09, name: "Yellow Block" },
      { type: "sphere",  color: 0xff8844, pos: [0.88, 0, -0.12], size: 0.06, name: "Orange Ball" },
      { type: "cylinder",color: 0x44aaff, pos: [0.55, 0, -0.45], size: 0.04, name: "Blue Cylinder" },
    ];

    objectConfigs.forEach((cfg) => {
      let geo;
      const halfH = cfg.type === "cylinder" ? cfg.size : cfg.size / 2;
      if (cfg.type === "box")       geo = new THREE.BoxGeometry(cfg.size, cfg.size, cfg.size);
      else if (cfg.type === "sphere") geo = new THREE.SphereGeometry(cfg.size, 24, 24);
      else                            geo = new THREE.CylinderGeometry(cfg.size, cfg.size, cfg.size * 2, 16);

      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.3, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      // Y = TABLE_Y + half height so it rests on table
      mesh.position.set(cfg.pos[0], TABLE_Y + halfH, cfg.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { name: cfg.name, type: cfg.type, size: cfg.size, halfH, originalColor: cfg.color };
      scene.add(mesh);
      objects.push(mesh);
    });

    sceneRef.current = { renderer, scene, camera, robot, objects };
    window.__scene = scene;
    window.__camera = camera;

    // ── Raycaster for mouse-object interaction ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const mouseDown = new THREE.Vector2();
    let isMouseDragging = false;
    let draggedObjectRef = null;
    let dragStartPos = null;

    // ── Rapier Physics ──
    async function initPhysics() {
      try {
        RAPIER = await import("@dimforge/rapier3d");
        physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

        // Static floor collider — aligns with table surface
        const floorBody = physicsWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(0, TABLE_Y - 0.06, 0)
        );
        const floorCollider = physicsWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(2.5, 0.06, 1.8),
          floorBody
        );
        floorCollider.setFriction(0.9);

        // Robot base as static collider (so arm can't pass through objects)
        const robotBaseBody = physicsWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.15, 0)
        );
        const robotBaseCollider = physicsWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(0.3, 0.15, 0.25),
          robotBaseBody
        );
        robotBaseCollider.setFriction(0.5);

        // NOTE: no kinematic collider on the arm — it would physically shove
        // objects away before the claw can grab them. Pushing is handled by
        // impulse logic in the animation loop instead (only when gripper open).

        // Dynamic bodies for objects
        physicsObjectsRef.current = [];
        objects.forEach((mesh) => {
          const pos = mesh.position;
          const halfH = mesh.userData.halfH;
          let colliderDesc;

          if (mesh.userData.type === "box") {
            const s = mesh.userData.size / 2;
            colliderDesc = RAPIER.ColliderDesc.cuboid(s, s, s);
          } else if (mesh.userData.type === "sphere") {
            colliderDesc = RAPIER.ColliderDesc.ball(mesh.userData.size);
          } else {
            colliderDesc = RAPIER.ColliderDesc.cylinder(halfH, mesh.userData.size);
          }

          const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
          const body = physicsWorld.createRigidBody(bodyDesc);
          body.setAdditionalMass(0.5);
          body.setLinearDamping(0.4);
          body.setAngularDamping(0.4);

          const collider = physicsWorld.createCollider(colliderDesc, body);
          collider.setFriction(0.7);
          collider.setRestitution(0.2);

          physicsObjectsRef.current.push({ mesh, body, collider, grabbed: false });
        });

        // Expose physics objects for debugging
        window.__physicsObjects = physicsObjectsRef.current;
        window.__physicsWorld = physicsWorld;
        setPhysicsReady(true);
      } catch (err) {
        console.error("Physics init error:", err);
      }
    }
    initPhysics();

    // ── Mouse interaction ──
    let isCameraOrbit = false, prevX = 0, prevY = 0, rotY = 0.8, rotX = 0.4;
    let camDist = 5; // camera distance (for zoom)

    const lookAt = new THREE.Vector3(0, 0.8, 0);

    function getMouseNDC(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getTableIntersect(e) {
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera);
      // Intersect with an invisible plane at table height
      const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE_Y);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(tablePlane, target);
      return target;
    }

    function getClickedObject(e) {
      // Method 1: Raycaster (works for large objects)
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera);
      const meshList = physicsObjectsRef.current.map((item) => item.mesh);
      const intersects = raycaster.intersectObjects(meshList);
      if (intersects.length > 0) return intersects[0];

      // Method 2: Project each object to screen and check proximity (for small objects)
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      let closest = null;
      let closestDist = Infinity;
      for (const item of physicsObjectsRef.current) {
        const wp = new THREE.Vector3();
        item.mesh.getWorldPosition(wp);
        wp.project(camera);
        const sx = (wp.x * 0.5 + 0.5) * rect.width;
        const sy = (-wp.y * 0.5 + 0.5) * rect.height;
        const dist = Math.hypot(clickX - sx, clickY - sy);
        // Object on screen is typically 10-30 pixels wide
        if (dist < 25 && dist < closestDist) {
          closestDist = dist;
          closest = { object: item.mesh, point: wp, distance: dist };
        }
      }
      return closest;
    }

    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 2) {
        // Right-click = camera orbit
        isCameraOrbit = true;
        prevX = e.clientX;
        prevY = e.clientY;
        return;
      }
      // Left-click = push object or orbit camera
      const hitObject = getClickedObject(e);
      
      if (hitObject) {
        // Clicked on an object = push it
        isMouseDragging = true;
        draggedObjectRef = physicsObjectsRef.current.find((item) => item.mesh === hitObject.object);
        dragStartPos = getTableIntersect(e);
        canvas.style.cursor = "grabbing";
      } else {
        // Clicked on empty space = orbit camera
        isCameraOrbit = true;
        prevX = e.clientX;
        prevY = e.clientY;
        canvas.style.cursor = "move";
      }
    });

    function updateCamera() {
      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDist;
      camera.position.y = Math.sin(rotX) * camDist + 1.5;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDist;
      camera.lookAt(lookAt);
    }
    updateCamera();

    canvas.addEventListener("mousemove", (e) => {
      // Camera orbit (right-click)
      if (isCameraOrbit) {
        rotY += (e.clientX - prevX) * 0.005;
        rotX = Math.max(-0.5, Math.min(1.2, rotX + (e.clientY - prevY) * 0.005));
        prevX = e.clientX; prevY = e.clientY;
        updateCamera();
        return;
      }

      // Object push (left-click drag) — smoother with smaller force
      if (isMouseDragging && draggedObjectRef && physicsWorld) {
        const currentPos = getTableIntersect(e);
        if (currentPos && dragStartPos) {
          const dx = (currentPos.x - dragStartPos.x) * 4;
          const dz = (currentPos.z - dragStartPos.z) * 4;
          draggedObjectRef.body.applyImpulse({ x: dx, y: 0, z: dz }, true);
          dragStartPos = currentPos;
        }
        return;
      }

      // Hover cursor change (only when not dragging)
      if (!isMouseDragging) {
        const hoverObj = getClickedObject(e);
        if (hoverObj) canvas.style.cursor = "grab";
        else canvas.style.cursor = "default";
      }
    });

    canvas.addEventListener("mouseup", () => {
      isCameraOrbit = false;
      isMouseDragging = false;
      draggedObjectRef = null;
      dragStartPos = null;
      canvas.style.cursor = "default";
    });

    canvas.addEventListener("mouseleave", () => {
      isCameraOrbit = false;
      isMouseDragging = false;
      draggedObjectRef = null;
      dragStartPos = null;
    });

    // Mouse wheel zoom
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      camDist += e.deltaY * 0.005;
      camDist = Math.max(2, Math.min(12, camDist));
      updateCamera();
    }, { passive: false });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // ── Animation loop ──
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);

      // Compute live joint angles directly from the robot's actual rotations
      // (no matrixWorld dependency — always correct, even mid-animation)
      const liveAngles = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: jointAnglesRef.current[7] ?? 100 };
      if (robotRef.current) {
        robotRef.current.joints.forEach((j, i) => {
          const axis = robotRef.current.jointData[i]?.axis || "z";
          liveAngles[i + 1] = (j.rotation[axis] * 180) / Math.PI;
        });
      }

      // End effector (claw tip) position via pure forward kinematics
      const eePos = fkTip(liveAngles);
      const wristPos = fkWrist(liveAngles);

      if (physicsWorld && physicsObjectsRef.current.length > 0) {
        const currentAngles = jointAnglesRef.current;
        const gripperOpen = currentAngles[7] > 50;

        // ── Find closest object (for grab logic) ──
        // Grip point = claw tip (eePos) — the claws are AT this position.
        let closestObj = null;
        let closestDist = 0.6;

        physicsObjectsRef.current.forEach((item) => {
          if (item.grabbed) return;
          const p = item.mesh.position;
          const d = Math.sqrt((eePos.x - p.x) ** 2 + (eePos.y - p.y) ** 2 + (eePos.z - p.z) ** 2);
          if (d < closestDist) { closestDist = d; closestObj = item; }
        });

        // ── Magnetic attraction — pull object toward claw tip when gripper closed ──
        // Only when nothing is grabbed yet (otherwise the magnet would suck in
        // the next object while we're already carrying one).
        if (!gripperOpen && !grabbedObjectRef.current && closestObj && closestDist > 0.04) {
          const p = closestObj.mesh.position;
          const attractForce = 6.0 * (1 - closestDist / 0.6);
          const dx = eePos.x - p.x;
          const dy = eePos.y - p.y;
          const dz = eePos.z - p.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          closestObj.body.applyImpulse({
            x: (dx / len) * attractForce * 0.6,
            y: (dy / len) * attractForce + 0.35,
            z: (dz / len) * attractForce * 0.6
          }, true);
        }

        // ── Grab if gripper closed and close enough ──
        if (!gripperOpen && closestObj && closestDist <= 0.18 && !grabbedObjectRef.current) {
          grabbedObjectRef.current = closestObj;
          closestObj.grabbed = true;
          closestObj.body.setGravityScale(0, true);
          closestObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          closestObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          // Disable the object's collider while held so it never shoves neighbors
          if (closestObj.collider) closestObj.collider.setEnabled(false);
          setGrabbedObject(closestObj.mesh.userData.name);
        }

        // Release if gripper opens
        if (gripperOpen && grabbedObjectRef.current) {
          const item = grabbedObjectRef.current;
          item.grabbed = false;
          item.body.setGravityScale(1, true);
          item.body.setLinvel({ x: 0, y: 0.5, z: 0 }, true);
          if (item.collider) item.collider.setEnabled(true);
          grabbedObjectRef.current = null;
          setGrabbedObject(null);
          // Protect the just-released object from being shoved by the open claw
          lastReleasedRef.current = { item, t: Date.now() };
        }

        // ── Hold grabbed object RIGIDLY at the claw tip ──
        // The object sits exactly between the closed pincers (a real grip).
        // No easing: on the grab frame it snaps into the claw mouth (the magnet
        // has already pulled it within a few cm), then stays glued to the tip
        // so it never "trails behind" the claw while moving.
        if (grabbedObjectRef.current) {
          const item = grabbedObjectRef.current;
          item.body.setTranslation({ x: eePos.x, y: eePos.y, z: eePos.z }, true);
          item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          item.mesh.position.set(eePos.x, eePos.y, eePos.z);
        }

        // ── Physics push — claw tip pushes objects away when gripper is OPEN ──
        // Manual mode ONLY: while a script (e.g. Pick & Place) is running, the
        // claw must NOT shove neighbors as it descends onto its target.
        // NOTE: the running state is shared through `window` because in dev the
        // module can be evaluated twice (HMR / duplicate import graphs); a plain
        // module-level binding would then disagree between runCode and this loop.
        const running = window.__scriptRunning === true;
        if (!running) {
          const nowMs = Date.now();
          const lastRel = lastReleasedRef.current;
          const relProtected = lastRel && nowMs - lastRel.t < 2500 ? lastRel.item : null;
          let nearestItem = null;
          let nearestDist = Infinity;
          physicsObjectsRef.current.forEach((item) => {
            if (item.grabbed) return;
            const p = item.mesh.position;
            const d = Math.hypot(p.x - eePos.x, p.y - eePos.y, p.z - eePos.z);
            if (d < nearestDist) { nearestDist = d; nearestItem = item; }
          });

          physicsObjectsRef.current.forEach((item) => {
            if (item.grabbed || item === nearestItem || item === relProtected) return;
            const p = item.mesh.position;
            const dx = p.x - eePos.x;
            const dy = p.y - eePos.y;
            const dz = p.z - eePos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (gripperOpen && dist >= 0.13 && dist < 0.24) {
              const force = 2.6 * Math.pow(1.0 - (dist - 0.13) / 0.11, 2);
              const len = dist || 1;
              item.body.applyImpulse({
                x: (dx / len) * force,
                y: (dy / len) * force * 0.3 + 0.15,
                z: (dz / len) * force,
              }, true);
            }
          });
        }

        // Step physics
        physicsWorld.step();

        // Sync non-grabbed objects from physics → Three.js
        physicsObjectsRef.current.forEach((item) => {
          if (item.grabbed) return;
          const pos = item.body.translation();
          const rot = item.body.rotation();
          item.mesh.position.set(pos.x, pos.y, pos.z);
          item.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

          // Clamp above table surface
          const minY = TABLE_Y + item.mesh.userData.halfH + 0.005;
          if (pos.y < minY) {
            item.body.setTranslation({ x: pos.x, y: minY, z: pos.z }, true);
            item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }

          // Keep objects on table (don't fly off edges)
          const maxX = 1.8, maxZ = 1.3;
          let needsFix = false;
          let nx = pos.x, nz = pos.z;
          if (Math.abs(pos.x) > maxX) { nx = Math.sign(pos.x) * maxX; needsFix = true; }
          if (Math.abs(pos.z) > maxZ) { nz = Math.sign(pos.z) * maxZ; needsFix = true; }
          if (needsFix) {
            item.body.setTranslation({ x: nx, y: pos.y, z: nz }, true);
            item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        });
      }

      // Update end effector readout
      if (robotRef.current) {
        setEndEffectorPos(eePos);
      }
      window.__liveAngles = liveAngles;
      window.__eePos = eePos;

      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const handleResize = () => {
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // ── Robot scripting API ──
  const createRobotAPI = useCallback(() => {
    const logs = [];

    // Animate joints 1-4 together to a set of target angles (degrees)
    function animateTo(targetAngles, dur = 700) {
      return new Promise((resolve) => {
        const robot = robotRef.current;
        if (!robot) { setTimeout(resolve, dur); return; }
        const starts = [0, 1, 2, 3].map((i) => {
          const axis = robot.jointData[i]?.axis || "z";
          return { axis, val: robot.joints[i].rotation[axis] };
        });
        const targets = [1, 2, 3, 4].map((n) => (targetAngles[n] * Math.PI) / 180);
        const t0 = Date.now();
        function step() {
          const t = Math.min((Date.now() - t0) / dur, 1);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          for (let i = 0; i < 4; i++) {
            const { axis, val } = starts[i];
            robot.joints[i].rotation[axis] = val + (targets[i] - val) * ease;
          }
          setJointAngles((prev) => {
            const next = { ...prev };
            [1, 2, 3, 4].forEach((n, i) => { next[n] = targetAngles[n]; });
            return next;
          });
          if (t < 1) requestAnimationFrame(step); else resolve();
        }
        step();
      });
    }

    return {
      log: (msg) => { logs.push(String(msg)); setOutput([...logs]); },
      setJoint: (joint, angle) => {
        return new Promise((resolve) => {
          setJointAngles((prev) => ({ ...prev, [joint]: angle }));
          const robot = robotRef.current;
          if (robot) {
            if (joint === 7) {
              setGripper(robot, angle / 100);
              setTimeout(resolve, 200);
            } else if (robot.joints[joint - 1]) {
              const startRot = robot.joints[joint - 1].rotation.clone();
              const targetRad = (angle * Math.PI) / 180;
              const axis = robot.jointData[joint - 1]?.axis || "z";
              const t0 = Date.now();
              const dur = 300;
              function step() {
                const t = Math.min((Date.now() - t0) / dur, 1);
                const ease = t * (2 - t);
                robot.joints[joint - 1].rotation[axis] = startRot[axis] + (targetRad - startRot[axis]) * ease;
                if (t < 1) requestAnimationFrame(step); else resolve();
              }
              step();
            } else {
              setTimeout(resolve, 300);
            }
          } else {
            setTimeout(resolve, 300);
          }
        });
      },
      // Move the claw tip to world position (x, y, z) using IK
      moveTo: (x, y, z, dur) => {
        const ik = ikTip(x, y, z);
        if (!ik) return Promise.reject(new Error(`Target (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) unreachable`));
        return animateTo(ik, dur || 700);
      },
      // Find nearest reachable object: returns {name, x, y, z}
      findObject: (name) => {
        const objs = physicsObjectsRef.current || [];
        let best = null, bestR = Infinity;
        for (const item of objs) {
          const n = item.mesh.userData?.name || "";
          if (name && !n.includes(name)) continue;
          const p = item.mesh.position;
          const r = Math.hypot(p.x, p.z);
          if (ikTip(p.x, p.y, p.z) && r < bestR) {
            bestR = r;
            best = { name: n, x: p.x, y: p.y, z: p.z };
          }
        }
        return best;
      },
      home: () => {
        return new Promise((resolve) => {
          setJointAngles({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 100 });
          const robot = robotRef.current;
          if (robot) resetRobot(robot);
          setTimeout(resolve, 500);
        });
      },
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      getJoints: () => ({ ...jointAnglesRef.current }),
      logs,
    };
  }, []);

  async function runCode() {
    if (isRunning) return;
    setIsRunning(true);
    isRunningRef.current = true;
    scriptRunning = true;
    window.__scriptRunning = true; // shared through window (see loop comment)
    setOutput([]);
    setActiveTab("output");
    const robotAPI = createRobotAPI();
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction("robot", codeRef.current);
      await fn(robotAPI);
      if (robotAPI.logs.length === 0) robotAPI.log("✅ Done!");
    } catch (err) {
      robotAPI.log("❌ Error: " + err.message);
    }
    setIsRunning(false);
    isRunningRef.current = false;
    scriptRunning = false;
    window.__scriptRunning = false;
  }

  function handleSlider(joint, value) {
    setJointAngles((prev) => ({ ...prev, [joint]: value }));
    const robot = robotRef.current;
    if (robot) {
      if (joint === 7) setGripper(robot, value / 100);
      else setJointAngle(robot, joint - 1, value);
    }
  }
  // Expose for testing
  window.__handleSlider = handleSlider;

  function resetJoints() {
    for (let i = 1; i <= 7; i++) handleSlider(i, i === 7 ? 100 : 0);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
          <span style={S.title}>🤖 6-DOF Robot Arm + Physics</span>
        </div>
        <div style={S.headerRight}>
          <select style={S.select} value={code === ROBOT_SCRIPTS.wave ? "wave" : code === ROBOT_SCRIPTS.pickAndPlace ? "pickAndPlace" : "custom"} onChange={(e) => { if (ROBOT_SCRIPTS[e.target.value]) setCode(ROBOT_SCRIPTS[e.target.value]); }}>
            <option value="wave">Wave Demo</option>
            <option value="pickAndPlace">Pick & Place</option>
            <option value="home">Go Home</option>
            <option value="custom">Custom Script</option>
          </select>
          <button onClick={runCode} disabled={isRunning} style={S.runBtn}>{isRunning ? "⏳..." : "▶ Run"}</button>
        </div>
      </div>

      <div style={S.split}>
        <div style={S.viewportWrap}>
          <div style={S.viewport}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
          </div>
          <div style={S.viewportOverlay}>
            <span style={S.overlayBadge}>🖱️ Drag empty: orbit camera</span>
            <span style={S.overlayBadge}>📦 Drag objects: push</span>
            <span style={S.overlayBadge}>🔍 Scroll: zoom</span>
            {grabbedObject && <span style={{ ...S.overlayBadge, background: "rgba(62,207,142,0.3)", color: "#3ECF8E" }}>✋ {grabbedObject}</span>}
          </div>
        </div>          <div style={{ ...S.rightPanel, width: panelCollapsed ? 40 : undefined, flexShrink: 0, transition: "width 0.3s ease" }}>
          <div style={{ ...S.tabs, justifyContent: panelCollapsed ? "center" : "flex-start" }}>
            <button onClick={() => setPanelCollapsed(!panelCollapsed)} style={{ ...S.tab, fontSize: 16, minWidth: 40, padding: "8px 10px" }} title={panelCollapsed ? "Expand panel" : "Collapse panel"}>
              {panelCollapsed ? "◀" : "▶"}
            </button>
            {!panelCollapsed && (
              <>
                <button style={activeTab === "controls" ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab("controls")}>Controls</button>
                <button style={activeTab === "code" ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab("code")}>Code</button>
                <button style={activeTab === "output" ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab("output")}>Output</button>
              </>
            )}
          </div>
          {panelCollapsed && <div style={{ flex: 1 }} />}

          {activeTab === "controls" && (
            <div style={S.controls}>
              {[
                { id: 1, name: "Joint 1 (Base)", color: "#f97316", min: -180, max: 180 },
                { id: 2, name: "Joint 2 (Shoulder)", color: "#38BDF8", min: -75, max: 90 },
                { id: 3, name: "Joint 3 (Elbow)", color: "#A78BFA", min: -135, max: 135 },
                { id: 4, name: "Joint 4 (Wrist P)", color: "#4ADE80", min: -180, max: 180 },
                { id: 5, name: "Joint 5 (Wrist R)", color: "#FACC15", min: -180, max: 180 },
                { id: 6, name: "Joint 6 (Flange)", color: "#F87171", min: -360, max: 360 },
                { id: 7, name: "Joint 7 (Gripper)", color: "#22D3EE", min: 0, max: 100 },
              ].map((j) => (
                <div key={j.id} style={S.controlGroup}>
                  <div style={S.controlLabel}>
                    <span>{j.name}</span>
                    <span style={{ color: j.color }}>{jointAngles[j.id]}{j.id === 7 ? "%" : "°"}</span>
                  </div>
                  <input type="range" min={j.min} max={j.max} value={jointAngles[j.id]} onChange={(e) => handleSlider(j.id, parseInt(e.target.value))} style={S.slider} />
                </div>
              ))}

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={resetJoints} style={S.actionBtnBlue}>🔄 Reset</button>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>💡 How to pick up objects</div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.8 }}>
                  <div>1. Set <b style={{color:"#38BDF8"}}>Joint 1</b> to rotate toward objects</div>
                  <div>2. Set <b style={{color:"#38BDF8"}}>Joint 2 = -75°</b> to bend arm DOWN</div>
                  <div>3. Set <b style={{color:"#A78BFA"}}>Joint 3 = -60°</b> to lower gripper</div>
                  <div>4. Set <b style={{color:"#22D3EE"}}>Joint 7 = 100%</b> to open claw</div>
                  <div>5. Position near object, then set <b style={{color:"#22D3EE"}}>Joint 7 = 0%</b></div>
                  <div>6. Object will be attracted and grabbed!</div>
                  <div>7. Use <b style={{color:"#22D3EE"}}>Joint 7 = 100%</b> to release</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, padding: 16 }}>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} style={{ width: "100%", height: "100%", minHeight: 300, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 16, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: "#e0e0e0", resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} spellCheck={false} />
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div style={S.output}>
              {output.length === 0 ? (
                <div style={{ color: "#666", textAlign: "center", marginTop: 60, fontSize: 13 }}>Click <strong>▶ Run</strong> to execute</div>
              ) : (
                output.map((line, i) => (
                  <div key={i} style={{ ...S.outputLine, color: line.startsWith("❌") ? "#F87171" : line.startsWith("✅") ? "#3ECF8E" : "#ccc" }}>{line}</div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
