import { useLoader, useFrame } from "@react-three/fiber";
import { SVGLoader } from "three-stdlib";
import { Float } from "@react-three/drei";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";

export default function EthiopiaModel() {
  const groupRef = useRef<THREE.Group>(null);

  // Load SVG
  const svg = useLoader(SVGLoader, "/src/assets/ethiopia.svg");

  // Build meshes only once
  const meshes = useMemo(() => {
    const result: JSX.Element[] = [];

    svg.paths.forEach((path, pathIndex) => {
      // cast to any to satisfy incompatible TS types between SVGLoader and three
      const shapes = SVGLoader.createShapes(path as any);

      shapes.forEach((shape, shapeIndex) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 20,
          bevelEnabled: true,
          bevelThickness: 1.5,
          bevelSize: 1,
          bevelSegments: 5,
        });

        geometry.center();

        result.push(
          <group key={`${pathIndex}-${shapeIndex}`}>
            {/* Gold Back Glow */}
            <mesh
              geometry={geometry}
              position={[0, 0, -3]}
              scale={1.02}
            >
              <meshStandardMaterial
                color="#b08d57"
                emissive="#b08d57"
                emissiveIntensity={1}
                transparent
                opacity={0.28}
              />
            </mesh>

            {/* Glass Ethiopia */}
            <mesh
              geometry={geometry}
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color="#ffffff"
                transmission={1}
                roughness={0}
                thickness={8}
                ior={1.45}
                clearcoat={1}
                clearcoatRoughness={0}
                metalness={0.08}
                reflectivity={1}
                transparent
                opacity={0.95}
                emissive="#b08d57"
                emissiveIntensity={0.12}
              />
            </mesh>

            {/* Gold Outline */}
            <lineSegments>
              <edgesGeometry args={[geometry]} />
              <lineBasicMaterial
                color="#b08d57"
              />
            </lineSegments>
          </group>
        );
      });
    });

    return result;
  }, [svg]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.getElapsedTime();

    // Gentle floating
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.18;

    // Slight rotation
    groupRef.current.rotation.y =
      Math.sin(t * 0.45) * 0.12;

    groupRef.current.rotation.x =
      Math.sin(t * 0.3) * 0.03;
  });

  return (
    <Float
      speed={1.3}
      rotationIntensity={0.18}
      floatIntensity={0.35}
    >
      <group
        ref={groupRef}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.0024}
      >
        {meshes}
      </group>
    </Float>
  );
}