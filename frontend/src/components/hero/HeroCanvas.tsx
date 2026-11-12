// src/components/hero/HeroCanvas.tsx
// Pure three.js scene (no HTML overlays):
//  - a dark globe with a gold fresnel rim and a glowing atmosphere
//  - Ethiopia drawn as dense gold points inside an approximate outline
//  - light pulses travelling along arcs from Addis Ababa to five world cities
//  - five 3D gold coins (one per service) orbiting the globe, each stamped with a Ge'ez letter
//  - drifting star dust, pointer parallax, an entrance animation
//
//   npm i three @react-three/fiber
//   npm i -D @types/three
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const R = 1.3; // globe radius
const ORBIT = 2.35; // coin orbit radius

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ geography helpers
const toVec = (latDeg: number, lonDeg: number, r = R) => {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));
};

// Approximate outline of Ethiopia as [lon, lat]. Stylised: good enough to read as the country, not a survey.
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
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'New York', lat: 40.7, lon: -74.0 },
  { name: 'Dubai', lat: 25.2, lon: 55.3 },
  { name: 'Beijing', lat: 39.9, lon: 116.4 },
  { name: 'Johannesburg', lat: -26.2, lon: 28.0 },
];

// ------------------------------------------------------------------ canvas textures (still WebGL textures)
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        await document.fonts.load("700 120px 'Noto Sans Ethiopic'");
        await document.fonts.load("600 40px 'Manrope'");
      } catch {
        /* fall back to system fonts */
      }
      if (alive) setReady(true);
    };
    load();
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

function makeTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const glyphTexture = (glyph: string) =>
  makeTexture(256, 256, (c) => {
    const g = c.createRadialGradient(110, 100, 10, 128, 128, 140);
    g.addColorStop(0, '#f3dba5');
    g.addColorStop(0.6, '#c9a064');
    g.addColorStop(1, '#8c6b42');
    c.fillStyle = g;
    c.beginPath();
    c.arc(128, 128, 128, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(60,40,12,0.55)';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(128, 128, 112, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#2b1d09';
    c.font = "700 150px 'Noto Sans Ethiopic', sans-serif";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(glyph, 128, 142);
  });

const labelTexture = (text: string, sub?: string) =>
  makeTexture(512, 128, (c) => {
    c.fillStyle = 'rgba(20,16,12,0.72)';
    const w = 480;
    const x = (512 - w) / 2;
    c.beginPath();
    c.roundRect(x, 20, w, 88, 44);
    c.fill();
    c.strokeStyle = 'rgba(230,207,160,0.5)';
    c.lineWidth = 2;
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    c.font = "600 40px 'Manrope', system-ui, sans-serif";
    c.fillText(text, 256, sub ? 52 : 64);
    if (sub) {
      c.fillStyle = '#e6cfa0';
      c.font = "600 28px 'Noto Sans Ethiopic', sans-serif";
      c.fillText(sub, 256, 86);
    }
  });

// ------------------------------------------------------------------ globe
function useGlobeGeometry() {
  return useMemo(() => {
    const positions: number[] = [];
    const kind: number[] = [];
    const seed: number[] = [];
    const push = (v: THREE.Vector3, k: number) => {
      positions.push(v.x, v.y, v.z);
      kind.push(k);
      seed.push(Math.random());
    };

    // world dots (Fibonacci lattice), skipping Ethiopia so it can be drawn denser
    const N = 5200;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const p = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z));
      if (insideEthiopia(lon, lat)) continue;
      push(p.multiplyScalar(R * 1.002), 0);
    }
    // Ethiopia: a fine grid of gold points inside the outline
    for (let lat = 3; lat <= 15; lat += 0.28) {
      for (let lon = 33; lon <= 48.2; lon += 0.28) {
        if (insideEthiopia(lon, lat)) push(toVec(lat, lon, R * 1.004), 1);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    return g;
  }, []);
}

const dotVertex = /* glsl */ `
  attribute float aKind;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixel;
  varying float vKind;
  varying float vTw;
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vKind = aKind;
    vTw = 0.7 + 0.3 * sin(uTime * 1.5 + aSeed * 6.2831);
    vFacing = normalize(normalMatrix * position).z;
    // a slow golden wave travels across the Ethiopian points
    float wave = aKind * (0.5 + 0.5 * sin(uTime * 2.2 - position.x * 5.0 - position.y * 4.0));
    float size = mix(2.4, 3.6, aKind) * (1.0 + 0.45 * wave);
    gl_PointSize = size * uPixel * (7.2 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const dotFragment = /* glsl */ `
  varying float vKind;
  varying float vTw;
  varying float vFacing;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d);
    vec3 col = mix(vec3(0.74, 0.64, 0.47), vec3(1.0, 0.8, 0.4), vKind);
    float vis = smoothstep(-0.2, 0.4, vFacing);
    float alpha = a * mix(0.6, 1.0, vKind) * vTw * (0.2 + 0.8 * vis);
    gl_FragColor = vec4(col * (0.85 + 0.7 * vKind), alpha);
  }
`;

const coreVertex = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const coreFragment = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.4);
    vec3 base = mix(vec3(0.05, 0.04, 0.03), vec3(0.11, 0.085, 0.06), vN.y * 0.5 + 0.5);
    gl_FragColor = vec4(base + vec3(0.69, 0.55, 0.34) * f * 0.7, 1.0);
  }
`;
const atmoVertex = /* glsl */ `
  varying vec3 vN;
  void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const atmoFragment = /* glsl */ `
  varying vec3 vN;
  void main() {
    float i = pow(max(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 3.5);
    gl_FragColor = vec4(1.0, 0.76, 0.38, 1.0) * i * 1.6;
  }
`;

// ------------------------------------------------------------------ arcs from Addis Ababa
const arcVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const arcFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOffset;
  void main() {
    float behind = fract(uTime * 0.22 + uOffset - vUv.x);   // distance behind the travelling head
    float tail = exp(-behind * 8.0);
    float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    vec3 col = mix(vec3(1.0, 0.72, 0.3), vec3(1.0, 0.97, 0.88), tail);
    gl_FragColor = vec4(col, (0.14 + tail * 0.95) * ends);
  }
`;

function Arc({ to, offset }: { to: { lat: number; lon: number }; offset: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const a = toVec(ADDIS.lat, ADDIS.lon, R * 1.006);
    const b = toVec(to.lat, to.lon, R * 1.006);
    const lift = R + 0.25 + a.distanceTo(b) * 0.28;
    const mid = a.clone().add(b).normalize().multiplyScalar(lift);
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 90, 0.0065, 6, false);
  }, [to.lat, to.lon]);

  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh geometry={geo}>
      <shaderMaterial ref={mat} vertexShader={arcVertex} fragmentShader={arcFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{ uTime: { value: 0 }, uOffset: { value: offset } }} />
    </mesh>
  );
}

function AddisMarker() {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const pos = useMemo(() => toVec(ADDIS.lat, ADDIS.lon, R * 1.012), []);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  const ready = useFontsReady();
  const label = useMemo(() => (ready ? labelTexture('Addis Ababa', 'አዲስ አበባ') : null), [ready]);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % 2.2) / 2.2;
    if (ring.current) ring.current.scale.setScalar(1 + t * 3.2);
    if (mat.current) mat.current.opacity = 0.8 * (1 - t);
  });

  return (
    <group>
      <group position={pos} quaternion={quat}>
        <mesh>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#fff3d6" />
        </mesh>
        <mesh ref={ring}>
          <ringGeometry args={[0.05, 0.062, 48]} />
          <meshBasicMaterial ref={mat} color="#ffcf7a" transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {label && (
        <sprite position={pos.clone().normalize().multiplyScalar(R * 1.34)} scale={[0.92, 0.23, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

function Globe({ speed }: { speed: number }) {
  const spin = useRef<THREE.Group>(null);
  const dotMat = useRef<THREE.ShaderMaterial>(null);
  const geometry = useGlobeGeometry();
  const gl = useThree((s) => s.gl);

  useFrame(({ clock }, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.16 * speed;
    if (dotMat.current) dotMat.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    // starts with Ethiopia (lon ~40) facing the camera
    <group ref={spin} rotation={[0, -THREE.MathUtils.degToRad(40), 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.996, 64, 64]} />
        <shaderMaterial vertexShader={coreVertex} fragmentShader={coreFragment} />
      </mesh>
      <points geometry={geometry}>
        <shaderMaterial ref={dotMat} vertexShader={dotVertex} fragmentShader={dotFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{ uTime: { value: 0 }, uPixel: { value: gl.getPixelRatio() } }} />
      </points>
      {CITIES.map((c, i) => (
        <Arc key={c.name} to={c} offset={i * 0.19} />
      ))}
      <AddisMarker />
    </group>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.0}>
      <sphereGeometry args={[R * 1.22, 64, 64]} />
      <shaderMaterial vertexShader={atmoVertex} fragmentShader={atmoFragment} side={THREE.BackSide} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// ------------------------------------------------------------------ orbiting gold coins
const TOKENS = [
  { name: 'Passport', glyph: 'ፓ' },
  { name: 'Kebele ID', glyph: 'ቀ' },
  { name: 'Business License', glyph: 'ን' },
  { name: 'Driving License', glyph: 'መ' },
  { name: 'Birth Certificate', glyph: 'ል' },
];

function Coin({ index, name, glyph, ready }: { index: number; name: string; glyph: string; ready: boolean }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const angle = (index / TOKENS.length) * Math.PI * 2;
  const base = useMemo(() => new THREE.Vector3(Math.cos(angle) * ORBIT, Math.sin(index * 2.1) * 0.55, Math.sin(angle) * ORBIT), [angle, index]);

  const body = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.09, 56);
    g.rotateX(Math.PI / 2); // axis along z: the flat faces point at the viewer
    return g;
  }, []);
  const face = useMemo(() => (ready ? glyphTexture(glyph) : null), [ready, glyph]);
  const label = useMemo(() => (ready ? labelTexture(name) : null), [ready, name]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    if (!group.current || !inner.current) return;
    group.current.position.set(base.x, base.y + Math.sin(t * 1.1 + index) * 0.07, base.z);
    group.current.lookAt(camera.position);
    inner.current.rotation.y = Math.sin(t * 0.7 + index * 1.3) * 0.45;
    inner.current.rotation.x = Math.cos(t * 0.55 + index) * 0.15;
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <mesh geometry={body}>
          <meshStandardMaterial color="#c49a58" metalness={0.92} roughness={0.26} />
        </mesh>
        {face && (
          <>
            <mesh position={[0, 0, 0.0465]}>
              <circleGeometry args={[0.325, 56]} />
              <meshStandardMaterial map={face} metalness={0.55} roughness={0.38} />
            </mesh>
            <mesh position={[0, 0, -0.0465]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[0.325, 56]} />
              <meshStandardMaterial map={face} metalness={0.55} roughness={0.38} />
            </mesh>
          </>
        )}
      </group>
      {label && (
        <sprite position={[0, -0.62, 0]} scale={[1.28, 0.32, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

function Orbit({ speed, intro }: { speed: number; intro: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const ready = useFontsReady();
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.14 * speed;
    group.current.scale.setScalar(0.25 + 0.75 * intro.current);
  });
  return (
    <group rotation={[0.2, 0, 0.12]}>
      <group ref={group}>
        {TOKENS.map((t, i) => (
          <Coin key={t.name} index={i} name={t.name} glyph={t.glyph} ready={ready} />
        ))}
      </group>
    </group>
  );
}

// Three thin rings in the Ethiopian flag colours
function Rings({ speed }: { speed: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y -= delta * 0.06 * speed;
  });
  const rings: Array<[number, string, [number, number, number]]> = [
    [1.72, '#078930', [1.3, 0.15, 0]],
    [1.9, '#FCDD09', [1.05, -0.3, 0.3]],
    [2.08, '#DA121D', [1.42, 0.12, -0.25]],
  ];
  return (
    <group ref={group}>
      {rings.map(([radius, color, rot]) => (
        <mesh key={color} rotation={rot}>
          <torusGeometry args={[radius, 0.0045, 8, 240]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function StarDust({ speed }: { speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 700; i++) {
      const r = 4.5 + Math.random() * 6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pts.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th) - 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01 * speed;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#e6cfa0" size={0.028} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// Offline reflections for the metal coins (no HDR download)
function Environment() {
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

function Scene() {
  const root = useRef<THREE.Group>(null);
  const intro = useRef(reduced() ? 1 : 0);
  const speed = useMemo(() => (reduced() ? 0 : 1), []);
  const { camera, size } = useThree();

  // keep everything in frame on narrow screens
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    camera.position.z = 8.4 * Math.max(1, 1.05 / aspect);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state, delta) => {
    intro.current = Math.min(1, intro.current + delta / 1.8);
    const e = 1 - Math.pow(1 - intro.current, 3);
    if (!root.current) return;
    root.current.scale.setScalar(0.78 + 0.22 * e);
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, state.pointer.x * 0.4, 0.045);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, 0.18 - state.pointer.y * 0.22, 0.045);
  });

  return (
    <>
      <Environment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#fff1d8" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#ffb85c" />
      <StarDust speed={speed} />
      <group ref={root}>
        <Globe speed={speed} />
        <Atmosphere />
        <Rings speed={speed} />
        <Orbit speed={speed} intro={intro} />
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
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-[#e6cfa0]">
        The 3D view could not start (WebGL is off or unsupported). Check the browser console for details.
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function HeroCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="h-full w-full" role="img" aria-label="A rotating globe with Ethiopia lit in gold, light arcs leaving Addis Ababa, and five gold coins for Tebib's services orbiting it">
      <Boundary>
        <Canvas frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0.5, 8.4], fov: 36 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
          <Scene />
        </Canvas>
      </Boundary>
    </div>
  );
}
