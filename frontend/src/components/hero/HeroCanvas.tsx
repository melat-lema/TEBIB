// src/components/hero/HeroCanvas.tsx
// Real three.js scene, designed for the white + gold page (transparent canvas, studio lighting):
//  - a pearl globe with Ethiopia embossed in polished gold, and light arcs leaving Addis Ababa
//  - an armillary sphere (the classic scholar's instrument) in the three Ethiopian flag colours
//  - five 3D document cards (passport, ID, licenses, certificate) with gold edges, orbiting the globe
//  - a soft halo behind and a soft shadow underneath, gold dust, drag to spin, hover a card to lift it
//
//   npm i three @react-three/fiber
//   npm i -D @types/three
import { Component, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const R = 1.55; // globe radius
const ORBIT = 3.1; // card orbit radius
const GOLD = '#c9a064';

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ geography
const toVec = (latDeg: number, lonDeg: number, r = R) => {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));
};

// Approximate outline of Ethiopia as [lon, lat]. Stylised: it reads as the country, it is not a survey.
const ETH: Array<[number, number]> = [
  [36.4, 13.8], [37.1, 14.4], [37.9, 14.9], [38.6, 14.4], [39.1, 14.7], [40.0, 14.5], [40.8, 14.0], [41.4, 13.4],
  [42.2, 12.6], [42.0, 11.8], [42.7, 11.1], [43.1, 10.1], [43.5, 9.3], [44.6, 8.9], [46.0, 8.0], [47.9, 8.0],
  [46.5, 6.4], [45.0, 5.0], [43.2, 4.8], [41.9, 3.95], [40.9, 4.1], [39.7, 3.5], [38.4, 3.6], [37.0, 4.3],
  [36.0, 4.5], [35.3, 5.4], [34.6, 6.1], [34.1, 7.3], [33.3, 8.2], [34.1, 9.6], [34.4, 10.7], [35.3, 11.9], [36.1, 12.8],
];
function insideEthiopia(lon: number, lat: number) {
  let inside = false;
  for (let i = 0, j = ETH.length - 1; i < ETH.length; j = i++) {
    const [xi, yi] = ETH[i];
    const [xj, yj] = ETH[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const ADDIS = { lat: 9.03, lon: 38.74 };
const CITIES = [
  { lat: 51.5, lon: -0.1 }, // London
  { lat: 40.7, lon: -74.0 }, // New York
  { lat: 25.2, lon: 55.3 }, // Dubai
  { lat: 39.9, lon: 116.4 }, // Beijing
  { lat: -26.2, lon: 28.0 }, // Johannesburg
];

// ------------------------------------------------------------------ textures drawn on canvas (still WebGL textures)
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // never hold the scene back for more than 700 ms because of fonts
        await Promise.race([
          Promise.all([document.fonts.load("700 60px 'Manrope'"), document.fonts.load("600 40px 'Manrope'"), document.fonts.load("700 80px 'Noto Sans Ethiopic'")]),
          new Promise((r) => setTimeout(r, 700)),
        ]);
      } catch {
        /* system fonts will do */
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

function makeTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const shadowTexture = () =>
  makeTexture(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(70,48,18,0.34)');
    g.addColorStop(0.6, 'rgba(70,48,18,0.1)');
    g.addColorStop(1, 'rgba(70,48,18,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

function cardTexture(w: number, h: number, title: string, am: string, glyph: string) {
  const S = 380;
  const cw = Math.round(w * S);
  const ch = Math.round(h * S);
  return makeTexture(cw, ch, (c) => {
    const bg = c.createLinearGradient(0, 0, cw, ch);
    bg.addColorStop(0, '#fffefa');
    bg.addColorStop(1, '#f1e6cf');
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);

    // security-print rings
    c.strokeStyle = 'rgba(176,141,87,0.13)';
    c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.arc(cw * 0.86, ch * 0.34, 24 + i * 19, 0, Math.PI * 2);
      c.stroke();
    }

    // medallion with the Ge'ez letter
    const r = Math.min(cw, ch) * 0.115;
    const mx = cw * 0.15;
    const my = ch * 0.2;
    const mg = c.createRadialGradient(mx - r * 0.3, my - r * 0.3, 2, mx, my, r * 1.1);
    mg.addColorStop(0, '#f3dba5');
    mg.addColorStop(1, '#a8803f');
    c.fillStyle = mg;
    c.beginPath();
    c.arc(mx, my, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b1d09';
    c.font = `700 ${Math.round(r * 1.25)}px 'Noto Sans Ethiopic', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(glyph, mx, my + r * 0.08);

    // title, shrunk until it fits
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    let size = Math.round(cw * 0.098);
    do {
      c.font = `700 ${size}px 'Manrope', system-ui, sans-serif`;
      size -= 2;
    } while (c.measureText(title).width > cw * 0.84 && size > 12);
    c.fillStyle = '#2b1d09';
    c.fillText(title, cw * 0.08, ch * 0.55);

    c.fillStyle = '#8c6b42';
    c.font = `600 ${Math.round(cw * 0.062)}px 'Noto Sans Ethiopic', sans-serif`;
    c.fillText(am, cw * 0.08, ch * 0.55 + cw * 0.095);

    // document lines
    c.fillStyle = 'rgba(43,29,9,0.1)';
    for (let i = 0; i < 3; i++) c.fillRect(cw * 0.08, ch * (0.74 + i * 0.065), cw * (0.84 - i * 0.18), 3);

    // tricolour stripe along the bottom
    const sh = ch * 0.045;
    ['#078930', '#FCDD09', '#DA121D'].forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect((cw / 3) * i, ch - sh, cw / 3 + 1, sh);
    });
  });
}

const backTexture = (glyph: string) =>
  makeTexture(256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#e3c286');
    g.addColorStop(1, '#a8803f');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = 'rgba(43,29,9,0.16)';
    c.font = "700 220px 'Noto Sans Ethiopic', sans-serif";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(glyph, 128, 140);
  });

// ------------------------------------------------------------------ geometry helpers
function roundedRect(w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundedPlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 10);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}
function roundedSlab(w: number, h: number, r: number) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth: 0.045, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -0.0225);
  return g;
}

// ------------------------------------------------------------------ globe
function Globe({ speed }: { speed: number }) {
  const spin = useRef<THREE.Group>(null);

  const { baseMesh, goldMesh } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const basePts: THREE.Vector3[] = [];
    const goldPts: THREE.Vector3[] = [];

    const N = 3400;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const p = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z));
      if (!insideEthiopia(lon, lat)) basePts.push(p.multiplyScalar(R));
    }
    for (let lat = 3; lat <= 15; lat += 0.3) {
      for (let lon = 33; lon <= 48.2; lon += 0.3) if (insideEthiopia(lon, lat)) goldPts.push(toVec(lat, lon, R * 1.006));
    }

    const make = (pts: THREE.Vector3[], radius: number, mat: THREE.Material, detail: number) => {
      const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, detail), mat, pts.length);
      pts.forEach((p, i) => {
        dummy.position.copy(p);
        dummy.scale.setScalar(radius);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    };
    return {
      baseMesh: make(basePts, 0.012, new THREE.MeshStandardMaterial({ color: '#cdb995', roughness: 0.65, metalness: 0.1 }), 0),
      goldMesh: make(goldPts, 0.026, new THREE.MeshStandardMaterial({ color: '#e0a93c', metalness: 1, roughness: 0.22, emissive: '#7a4d0a', emissiveIntensity: 0.3 }), 1),
    };
  }, []);

  useFrame(({ clock }) => {
    // The globe rocks around Ethiopia instead of spinning all the way round, so the country is always in view
    const t = clock.getElapsedTime();
    if (spin.current) spin.current.rotation.y = -THREE.MathUtils.degToRad(40) + Math.sin(t * 0.33) * 1.0 * speed;
    const m = goldMesh.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.28 + 0.22 * Math.sin(clock.getElapsedTime() * 1.8);
  });

  return (
    <group ref={spin} rotation={[0, -THREE.MathUtils.degToRad(40), 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.995, 64, 64]} />
        <meshPhysicalMaterial color="#f6efe1" roughness={0.36} metalness={0} clearcoat={0.7} clearcoatRoughness={0.3} sheen={0.6} sheenColor="#fff4dc" />
      </mesh>
      <primitive object={baseMesh} />
      <primitive object={goldMesh} />
      {CITIES.map((c, i) => (
        <Arc key={i} to={c} offset={i * 0.19} />
      ))}
      <AddisMarker />
    </group>
  );
}

// ------------------------------------------------------------------ arcs
const arcVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const arcFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOffset;
  void main() {
    float behind = fract(uTime * 0.2 + uOffset - vUv.x);
    float tail = exp(-behind * 7.0);
    float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    vec3 col = mix(vec3(0.62, 0.42, 0.12), vec3(0.93, 0.62, 0.1), tail);
    gl_FragColor = vec4(col, (0.16 + tail * 0.84) * ends);
  }
`;

function Arc({ to, offset }: { to: { lat: number; lon: number }; offset: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const a = toVec(ADDIS.lat, ADDIS.lon, R * 1.01);
    const b = toVec(to.lat, to.lon, R * 1.01);
    const lift = R + 0.3 + a.distanceTo(b) * 0.3;
    const mid = a.clone().add(b).normalize().multiplyScalar(lift);
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 100, 0.0075, 6, false);
  }, [to.lat, to.lon]);

  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh geometry={geo}>
      <shaderMaterial ref={mat} vertexShader={arcVertex} fragmentShader={arcFragment} transparent depthWrite={false} uniforms={{ uTime: { value: 0 }, uOffset: { value: offset } }} />
    </mesh>
  );
}

function AddisMarker() {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const pos = useMemo(() => toVec(ADDIS.lat, ADDIS.lon, R * 1.02), []);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % 2.2) / 2.2;
    if (ring.current) ring.current.scale.setScalar(1 + t * 3.4);
    if (mat.current) mat.current.opacity = 0.85 * (1 - t);
  });

  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <sphereGeometry args={[0.04, 20, 20]} />
        <meshStandardMaterial color="#b9770e" metalness={1} roughness={0.2} emissive="#b9770e" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.06, 0.075, 48]} />
        <meshBasicMaterial ref={mat} color="#c98a1a" transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ armillary rings in the flag colours
function Armillary({ speed }: { speed: number }) {
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const spec: Array<{ r: number; color: string; tilt: [number, number, number]; v: number }> = [
    { r: 2.05, color: '#0f9142', tilt: [1.2, 0.2, 0], v: 0.1 },
    { r: 2.22, color: '#e9c514', tilt: [0.95, -0.35, 0.3], v: -0.08 },
    { r: 2.39, color: '#d3202c', tilt: [1.4, 0.15, -0.3], v: 0.06 },
  ];
  useFrame((_, delta) => {
    rings.current.forEach((m, i) => {
      if (m) m.rotation.z += delta * spec[i].v * speed;
    });
  });
  return (
    <group>
      {spec.map((s, i) => (
        <group key={s.color} rotation={s.tilt}>
          <mesh ref={(m) => { rings.current[i] = m; }}>
            <torusGeometry args={[s.r, 0.017, 16, 280]} />
            <meshStandardMaterial color={s.color} metalness={0.75} roughness={0.28} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ document cards
const CARDS = [
  { name: 'Passport', am: 'ፓስፖርት', glyph: 'ፓ', w: 1.05, h: 1.45 },
  { name: 'Kebele ID', am: 'የቀበሌ መታወቂያ', glyph: 'ቀ', w: 1.55, h: 0.98 },
  { name: 'Business License', am: 'የንግድ ፈቃድ', glyph: 'ን', w: 1.5, h: 1.08 },
  { name: 'Driving License', am: 'የመንጃ ፈቃድ', glyph: 'መ', w: 1.55, h: 0.98 },
  { name: 'Birth Certificate', am: 'የልደት ምስክር ወረቀት', glyph: 'ል', w: 1.2, h: 1.5 },
];

function DocCard({ index, spec, ready, onSelect }: { index: number; spec: (typeof CARDS)[number]; ready: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const angle = (index / CARDS.length) * Math.PI * 2;
  const base = useMemo(() => new THREE.Vector3(Math.cos(angle) * ORBIT, Math.sin(index * 2.1) * 0.55, Math.sin(angle) * ORBIT), [angle, index]);

  const slab = useMemo(() => roundedSlab(spec.w, spec.h, 0.1), [spec]);
  const face = useMemo(() => roundedPlane(spec.w - 0.004, spec.h - 0.004, 0.096), [spec]);
  const front = useMemo(() => (ready ? cardTexture(spec.w, spec.h, spec.name, spec.am, spec.glyph) : null), [ready, spec]);
  const back = useMemo(() => (ready ? backTexture(spec.glyph) : null), [ready, spec]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    if (!group.current || !inner.current) return;
    group.current.position.set(base.x, base.y + Math.sin(t * 1.0 + index * 1.7) * 0.09, base.z);
    group.current.lookAt(camera.position);
    inner.current.rotation.y = Math.sin(t * 0.6 + index * 1.3) * 0.38;
    inner.current.rotation.x = Math.cos(t * 0.5 + index) * 0.12;
    const target = hovered.current ? 1.34 : 1.2;
    inner.current.scale.setScalar(THREE.MathUtils.lerp(inner.current.scale.x, target, 0.12));
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hovered.current = false;
        document.body.style.cursor = '';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <group ref={inner} scale={1.2}>
        <mesh geometry={slab}>
          <meshStandardMaterial color="#d6ac66" metalness={1} roughness={0.27} />
        </mesh>
        {front && (
          <mesh geometry={face} position={[0, 0, 0.0225 + 0.014 + 0.0008]}>
            <meshStandardMaterial map={front} emissiveMap={front} emissive="#ffffff" emissiveIntensity={0.5} roughness={0.9} metalness={0} envMapIntensity={0.15} />
          </mesh>
        )}
        {back && (
          <mesh geometry={face} position={[0, 0, -(0.0225 + 0.014 + 0.0008)]} rotation={[0, Math.PI, 0]}>
            <meshStandardMaterial map={back} roughness={0.4} metalness={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function Orbit({ speed, ready, onSelect }: { speed: number; ready: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12 * speed;
  });
  return (
    <group rotation={[0.18, 0, 0.1]}>
      <group ref={group}>
        {CARDS.map((c, i) => (
          <DocCard key={c.name} index={i} spec={c} ready={ready} onSelect={onSelect} />
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ ambience
function GroundShadow() {
  const tex = useMemo(() => shadowTexture(), []);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 0.9) * 0.04);
  });
  return (
    <mesh ref={mesh} position={[0, -2.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.4, 5.4]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function GoldDust({ speed }: { speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 420; i++) {
      const r = 2.2 + Math.random() * 3.6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pts.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.85, r * Math.sin(ph) * Math.sin(th) - 0.6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.018 * speed;
    ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.08;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={GOLD} size={0.045} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

// bright studio reflections, generated offline (no HDR download)
function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment() as unknown as THREE.Scene, 0.04);
    scene.environment = target.texture;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

type Drag = { active: boolean; lastX: number; yaw: number };

function Scene({ drag, onReady }: { drag: MutableRefObject<Drag>; onReady: () => void }) {
  const root = useRef<THREE.Group>(null);
  const fonts = useFontsReady();
  const frames = useRef(0);
  const follow = useRef({ y: 0, x: 0.14 });
  const speed = useMemo(() => (reduced() ? 0 : 1), []);
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    camera.position.z = 11.4 * Math.max(1, 1.0 / aspect);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  const toServices = () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });

  useFrame((state) => {
    // tell the page the scene is complete (fonts loaded, card textures built, a few frames drawn)
    if (fonts && frames.current < 4 && ++frames.current === 4) onReady();
    if (!root.current) return;
    const d = drag.current;
    if (!d.active) d.yaw *= 0.97; // springs back after you let go
    follow.current.y = THREE.MathUtils.lerp(follow.current.y, state.pointer.x * 0.3, 0.05);
    follow.current.x = THREE.MathUtils.lerp(follow.current.x, 0.14 - state.pointer.y * 0.16, 0.05);
    root.current.rotation.y = follow.current.y + d.yaw;
    root.current.rotation.x = follow.current.x;
  });

  return (
    <>
      <Studio />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 6]} intensity={2.6} color="#fff3dc" />
      <directionalLight position={[-5, 2, 3]} intensity={0.9} color="#dfe8ff" />
      <pointLight position={[0, -3, 4]} intensity={18} color="#ffcf8a" />
      <GroundShadow />
      <GoldDust speed={speed} />
      <group ref={root}>
        <Globe speed={speed} />
        <Armillary speed={speed} />
        <Orbit speed={speed} ready={fonts} onSelect={toServices} />
      </group>
    </>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('HeroCanvas failed:', error);
  }
  render() {
    return this.state.failed ? (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-gray-500">The 3D view could not start (WebGL is off or unsupported). See the browser console for details.</div>
    ) : (
      this.props.children
    );
  }
}

export default function HeroCanvas({ onReady }: { onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const drag = useRef<Drag>({ active: false, lastX: 0, yaw: 0 });
  const announced = useRef(false);

  const announce = () => {
    if (announced.current) return;
    announced.current = true;
    onReady?.();
  };

  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  // safety net: if anything stalls, still let the page show the scene
  useEffect(() => {
    const t = setTimeout(announce, 2500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrap}
      className="h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      role="img"
      aria-label="A pearl globe with Ethiopia in gold, ringed in the Ethiopian flag colours, with five document cards for Tebib's services orbiting it"
      onPointerDown={(e) => {
        drag.current.active = true;
        drag.current.lastX = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!drag.current.active) return;
        drag.current.yaw += (e.clientX - drag.current.lastX) * 0.006;
        drag.current.lastX = e.clientX;
      }}
      onPointerUp={() => (drag.current.active = false)}
      onPointerLeave={() => (drag.current.active = false)}
      onPointerCancel={() => (drag.current.active = false)}
    >
      <Boundary>
        <Canvas frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0.6, 11.4], fov: 35 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
          <Scene drag={drag} onReady={announce} />
        </Canvas>
      </Boundary>
    </div>
  );
}
