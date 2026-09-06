import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const S = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter',sans-serif", overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: '#131926', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backLink: { color: '#888', textDecoration: 'none', fontSize: 13 },
  title: { fontSize: 16, fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  split: { flex: 1, display: 'flex', overflow: 'hidden' },
  viewportWrap: { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative' },
  viewport: { flex: 1, background: '#0a0a0f' },
  viewportOverlay: { position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8 },
  overlayBadge: { background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#aaa', backdropFilter: 'blur(4px)' },
  rightPanel: { width: '42%', display: 'flex', flexDirection: 'column', background: '#0F1420' },
  panelLabel: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: '#5C6478', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' },
  panelDot: { width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  tab: { padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#5C6478', background: 'transparent', border: 'none', borderBottom: '2px solid transparent' },
  tabActive: { color: '#f97316', borderBottom: '2px solid #f97316' },
  controls: { flex: 1, overflow: 'auto', padding: 16 },
  controlGroup: { marginBottom: 20 },
  controlLabel: { fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8, display: 'flex', justifyContent: 'space-between' },
  slider: { width: '100%', accentColor: '#f97316', cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  actionBtn: { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },
  actionBtnBlue: { background: 'rgba(56,189,248,0.12)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  actionBtnGreen: { background: 'rgba(62,207,142,0.12)', color: '#3ECF8E', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  runBtn: { background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  output: { flex: 1, overflow: 'auto', padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.7 },
  outputLine: { whiteSpace: 'pre-wrap', color: '#ccc' },
  select: { background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#e0e0e0' },
};

const ROBOT_SCRIPTS = {
  wave: `// Robot Arm — Wave Animation
// The arm waves back and forth

async function wave() {
  for (let i = 0; i < 5; i++) {
    await robot.setJoint(1, 45);
    await robot.setJoint(2, -30);
    await robot.wait(500);
    await robot.setJoint(1, -45);
    await robot.setJoint(2, 30);
    await robot.wait(500);
  }
  await robot.home();
  robot.log("Wave complete!");
}

wave();`,

  pickAndPlace: `// Robot Arm — Pick and Place
// Move to a position, pick up, move, place down

async function pickAndPlace() {
  robot.log("Moving to pick position...");
  await robot.setJoint(1, 30);
  await robot.setJoint(2, -60);
  await robot.setJoint(3, -30);
  await robot.wait(800);

  robot.log("Opening gripper...");
  await robot.setGripper(1);
  await robot.wait(300);

  robot.log("Moving down...");
  await robot.setJoint(2, -80);
  await robot.wait(500);

  robot.log("Closing gripper (picking)...");
  await robot.setGripper(0);
  await robot.wait(300);

  robot.log("Lifting up...");
  await robot.setJoint(2, -40);
  await robot.wait(600);

  robot.log("Moving to place position...");
  await robot.setJoint(1, -30);
  await robot.wait(800);

  robot.log("Lowering...");
  await robot.setJoint(2, -70);
  await robot.wait(500);

  robot.log("Opening gripper (placing)...");
  await robot.setGripper(1);
  await robot.wait(300);

  robot.log("Moving away...");
  await robot.setJoint(2, -40);
  await robot.wait(400);

  await robot.home();
  robot.log("Pick and place complete!");
}

pickAndPlace();`,

  drawSquare: `// Robot Arm — Draw a Square
// Move the end effector in a square path

async function drawSquare() {
  const size = 25;
  robot.log("Drawing a square...");

  // Start position
  await robot.setJoint(1, 0);
  await robot.setJoint(2, -50);
  await robot.setJoint(3, 0);
  await robot.wait(500);

  // Draw 4 sides
  for (let side = 0; side < 4; side++) {
    robot.log("Side " + (side + 1));
    const baseAngle = side * 90;

    await robot.setJoint(1, baseAngle + size);
    await robot.wait(300);
    await robot.setJoint(3, baseAngle + size);
    await robot.wait(300);
    await robot.setJoint(1, baseAngle - size);
    await robot.wait(300);
    await robot.setJoint(3, baseAngle - size);
    await robot.wait(300);
  }

  await robot.home();
  robot.log("Square complete!");
}

drawSquare();`,

  home: `// Robot Arm — Go Home
// Return all joints to starting position

async function goHome() {
  robot.log("Going home...");
  await robot.home();
  robot.log("Home position reached!");
}

goHome();`,
};

function createRobotArm(scene) {
  const group = new THREE.Group();
  const joints = [];
  const materials = {
    base: new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.8, roughness: 0.2 }),
    arm: new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.6, roughness: 0.3 }),
    armDark: new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.7, roughness: 0.3 }),
    gripper: new THREE.MeshStandardMaterial({ color: 0x3ECF8E, metalness: 0.5, roughness: 0.4 }),
    joint: new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.8, roughness: 0.2 }),
    table: new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.3, roughness: 0.7 }),
  };

  // Table surface
  const tableGeo = new THREE.BoxGeometry(6, 0.15, 4);
  const table = new THREE.Mesh(tableGeo, materials.table);
  table.position.y = -0.075;
  group.add(table);

  // Grid lines on table
  const gridHelper = new THREE.GridHelper(6, 20, 0x333355, 0x222244);
  gridHelper.position.y = 0.01;
  group.add(gridHelper);

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 32);
  const base = new THREE.Mesh(baseGeo, materials.base);
  base.position.y = 0.1;
  group.add(base);

  // Joint 1 (base rotation)
  const joint1Group = new THREE.Group();
  joint1Group.position.y = 0.2;
  group.add(joint1Group);
  joints.push(joint1Group);

  const joint1Geo = new THREE.SphereGeometry(0.18, 16, 16);
  const joint1 = new THREE.Mesh(joint1Geo, materials.joint);
  joint1Group.add(joint1);

  // Arm 1 (upper arm)
  const arm1Geo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
  const arm1 = new THREE.Mesh(arm1Geo, materials.arm);
  arm1.position.y = 0.6;
  joint1Group.add(arm1);

  // Joint 2 (elbow)
  const joint2Group = new THREE.Group();
  joint2Group.position.y = 1.2;
  joint1Group.add(joint2Group);
  joints.push(joint2Group);

  const joint2Geo = new THREE.SphereGeometry(0.14, 16, 16);
  const joint2 = new THREE.Mesh(joint2Geo, materials.joint);
  joint2Group.add(joint2);

  // Arm 2 (forearm)
  const arm2Geo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
  const arm2 = new THREE.Mesh(arm2Geo, materials.arm);
  arm2.position.y = 0.5;
  joint2Group.add(arm2);

  // Joint 3 (wrist)
  const joint3Group = new THREE.Group();
  joint3Group.position.y = 1.0;
  joint2Group.add(joint3Group);
  joints.push(joint3Group);

  const joint3Geo = new THREE.SphereGeometry(0.1, 16, 16);
  const joint3 = new THREE.Mesh(joint3Geo, materials.joint);
  joint3Group.add(joint3);

  // Gripper
  const gripperGroup = new THREE.Group();
  gripperGroup.position.y = 0.15;
  joint3Group.add(gripperGroup);

  const gripperBaseGeo = new THREE.BoxGeometry(0.15, 0.06, 0.08);
  const gripperBase = new THREE.Mesh(gripperBaseGeo, materials.gripper);
  gripperGroup.add(gripperBase);

  const fingerGeo = new THREE.BoxGeometry(0.03, 0.2, 0.04);
  const leftFinger = new THREE.Mesh(fingerGeo, materials.gripper);
  leftFinger.position.set(-0.05, -0.13, 0);
  gripperGroup.add(leftFinger);

  const rightFinger = new THREE.Mesh(fingerGeo, materials.gripper);
  rightFinger.position.set(0.05, -0.13, 0);
  gripperGroup.add(rightFinger);

  return { group, joints, gripperGroup, leftFinger, rightFinger, materials };
}

export default function Simulation() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const robotRef = useRef(null);
  const animFrameRef = useRef(null);
  const [activeTab, setActiveTab] = useState('controls');
  const [code, setCode] = useState(ROBOT_SCRIPTS.wave);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [jointAngles, setJointAngles] = useState({ 1: 0, 2: 0, 3: 0 });
  const [gripperOpen, setGripperOpen] = useState(1);
  const [robotType, setRobotType] = useState('arm');
  const codeRef = useRef(code);
  codeRef.current = code;

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 30);

    const camera = new THREE.PerspectiveCamera(45, canvas.parentElement.clientWidth / canvas.parentElement.clientHeight, 0.1, 100);
    camera.position.set(3, 3, 4);
    camera.lookAt(0, 1, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xf97316, 0.5, 10);
    pointLight.position.set(-2, 3, 2);
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0x38BDF8, 0.3, 10);
    rimLight.position.set(2, 2, -3);
    scene.add(rimLight);

    // Robot arm
    const robot = createRobotArm(scene);
    scene.add(robot.group);
    robotRef.current = robot;

    // Mouse orbit control (simple)
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotY = 0.8, rotX = 0.4;
    const dist = 5;

    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX = Math.max(-0.5, Math.min(1.2, rotX + (e.clientY - prevY) * 0.005));
      prevX = e.clientX;
      prevY = e.clientY;
      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * dist;
      camera.position.y = Math.sin(rotX) * dist + 1.5;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * dist;
      camera.lookAt(0, 1, 0);
    });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); });

    sceneRef.current = { renderer, scene, camera, robot };

    // Animation loop
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
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
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Create robot API
  const createRobotAPI = useCallback(() => {
    const logs = [];
    return {
      log: (msg) => { logs.push(String(msg)); setOutput([...logs]); },
      setJoint: (joint, angle) => {
        return new Promise(resolve => {
          setJointAngles(prev => ({ ...prev, [joint]: angle }));
          // Animate the joint
          const robot = robotRef.current;
          if (robot && robot.joints[joint - 1]) {
            const targetRad = (angle * Math.PI) / 180;
            const currentRot = robot.joints[joint - 1].rotation.z;
            const startTime = Date.now();
            const duration = 300;
            function animStep() {
              const t = Math.min((Date.now() - startTime) / duration, 1);
              const ease = t * (2 - t); // easeOut
              robot.joints[joint - 1].rotation.z = currentRot + (targetRad - currentRot) * ease;
              if (t < 1) requestAnimationFrame(animStep);
              else resolve();
            }
            animStep();
          } else {
            setTimeout(resolve, 300);
          }
        });
      },
      setGripper: (open) => {
        return new Promise(resolve => {
          setGripperOpen(open);
          const robot = robotRef.current;
          if (robot) {
            const targetX = open ? 0.05 : 0.02;
            robot.leftFinger.position.x = -targetX;
            robot.rightFinger.position.x = targetX;
          }
          setTimeout(resolve, 200);
        });
      },
      home: () => {
        return new Promise(async resolve => {
          await Promise.all([
            new Promise(r => {
              setJointAngles({ 1: 0, 2: 0, 3: 0 });
              const robot = robotRef.current;
              if (robot) {
                robot.joints.forEach(j => j.rotation.z = 0);
                robot.leftFinger.position.x = -0.05;
                robot.rightFinger.position.x = 0.05;
              }
              r();
            })
          ]);
          setTimeout(resolve, 500);
        });
      },
      wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      getJoints: () => ({ ...jointAngles }),
      logs,
    };
  }, [jointAngles]);

  async function runCode() {
    if (isRunning) return;
    setIsRunning(true);
    setOutput([]);
    setActiveTab('output');

    const robotAPI = createRobotAPI();
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('robot', codeRef.current);
      await fn(robotAPI);
      if (robotAPI.logs.length === 0) robotAPI.log('✅ Script completed');
    } catch (err) {
      robotAPI.log('❌ Error: ' + err.message);
    }
    setIsRunning(false);
  }

  function handleSlider(joint, value) {
    setJointAngles(prev => ({ ...prev, [joint]: value }));
    const robot = robotRef.current;
    if (robot && robot.joints[joint - 1]) {
      robot.joints[joint - 1].rotation.z = (value * Math.PI) / 180;
    }
  }

  function handleGripper(value) {
    setGripperOpen(value);
    const robot = robotRef.current;
    if (robot) {
      const x = value ? 0.05 : 0.02;
      robot.leftFinger.position.x = -x;
      robot.rightFinger.position.x = x;
    }
  }

  function resetJoints() {
    handleSlider(1, 0); handleSlider(2, 0); handleSlider(3, 0);
    handleGripper(1);
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
          <span style={S.title}>🤖 3D Robot Simulation</span>
        </div>
        <div style={S.headerRight}>
          <select style={S.select} value={code === ROBOT_SCRIPTS.wave ? 'wave' : code === ROBOT_SCRIPTS.pickAndPlace ? 'pickAndPlace' : code === ROBOT_SCRIPTS.drawSquare ? 'drawSquare' : code === ROBOT_SCRIPTS.home ? 'home' : 'custom'} onChange={e => { if (ROBOT_SCRIPTS[e.target.value]) setCode(ROBOT_SCRIPTS[e.target.value]); }}>
            <option value="wave">Wave Demo</option>
            <option value="pickAndPlace">Pick & Place</option>
            <option value="drawSquare">Draw Square</option>
            <option value="home">Go Home</option>
            <option value="custom">Custom Script</option>
          </select>
          <button onClick={runCode} disabled={isRunning} style={S.runBtn}>{isRunning ? '⏳ Running...' : '▶ Run'}</button>
        </div>
      </div>

      {/* Split view */}
      <div style={S.split}>
        {/* 3D Viewport */}
        <div style={S.viewportWrap}>
          <div style={S.viewport}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={S.viewportOverlay}>
            <span style={S.overlayBadge}>🖱️ Drag to orbit</span>
            <span style={S.overlayBadge}>🤖 3-DOF Robot Arm</span>
          </div>
        </div>

        {/* Right Panel */}
        <div style={S.rightPanel}>
          <div style={S.tabs}>
            <button style={activeTab === 'controls' ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab('controls')}>Controls</button>
            <button style={activeTab === 'code' ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab('code')}>Code</button>
            <button style={activeTab === 'output' ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setActiveTab('output')}>Output</button>
          </div>

          {activeTab === 'controls' && (
            <div style={S.controls}>
              <div style={S.controlGroup}>
                <div style={S.controlLabel}><span>Joint 1 (Base Rotation)</span><span style={{ color: '#f97316' }}>{jointAngles[1]}°</span></div>
                <input type="range" min="-90" max="90" value={jointAngles[1]} onChange={e => handleSlider(1, parseInt(e.target.value))} style={S.slider} />
              </div>
              <div style={S.controlGroup}>
                <div style={S.controlLabel}><span>Joint 2 (Shoulder)</span><span style={{ color: '#f97316' }}>{jointAngles[2]}°</span></div>
                <input type="range" min="-90" max="90" value={jointAngles[2]} onChange={e => handleSlider(2, parseInt(e.target.value))} style={S.slider} />
              </div>
              <div style={S.controlGroup}>
                <div style={S.controlLabel}><span>Joint 3 (Elbow)</span><span style={{ color: '#f97316' }}>{jointAngles[3]}°</span></div>
                <input type="range" min="-90" max="90" value={jointAngles[3]} onChange={e => handleSlider(3, parseInt(e.target.value))} style={S.slider} />
              </div>
              <div style={S.controlGroup}>
                <div style={S.controlLabel}><span>Gripper</span><span style={{ color: '#3ECF8E' }}>{gripperOpen ? 'Open' : 'Closed'}</span></div>
                <div style={S.btnRow}>
                  <button onClick={() => handleGripper(1)} style={S.actionBtnGreen}>Open</button>
                  <button onClick={() => handleGripper(0)} style={{ ...S.actionBtn, background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>Close</button>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button onClick={resetJoints} style={S.actionBtnBlue}>🔄 Reset All</button>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>💡 Code API</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7, fontFamily: "'JetBrains Mono',monospace" }}>
                  <div><span style={{ color: '#f97316' }}>robot.setJoint</span>(n, angle)</div>
                  <div><span style={{ color: '#f97316' }}>robot.setGripper</span>(0|1)</div>
                  <div><span style={{ color: '#f97316' }}>robot.home</span>()</div>
                  <div><span style={{ color: '#f97316' }}>robot.wait</span>(ms)</div>
                  <div><span style={{ color: '#f97316' }}>robot.log</span>(msg)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: 16 }}>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{
                    width: '100%', height: '100%', minHeight: 300,
                    background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: 16, fontSize: 13,
                    fontFamily: "'JetBrains Mono',monospace", color: '#e0e0e0',
                    resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                  spellCheck={false}
                />
              </div>
              <div style={{ padding: '0 16px 16px', fontSize: 12, color: '#5C6478' }}>
                Edit the code above or select a demo script from the dropdown
              </div>
            </div>
          )}

          {activeTab === 'output' && (
            <div style={S.output}>
              {output.length === 0 ? (
                <div style={{ color: '#5C6478', textAlign: 'center', marginTop: 60, fontSize: 13 }}>
                  Click <strong>▶ Run</strong> to execute the script
                </div>
              ) : (
                output.map((line, i) => (
                  <div key={i} style={{
                    ...S.outputLine,
                    color: line.startsWith('❌') ? '#F87171' : line.startsWith('✅') ? '#3ECF8E' : '#ccc'
                  }}>{line}</div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
