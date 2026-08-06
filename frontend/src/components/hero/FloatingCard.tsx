// src/components/hero/FloatingCard.tsx
import { Text, Float, RoundedBox, Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface FloatingCardProps {
  position: [number, number, number];
  title: string;
  emoji: string;
  speed?: number;
}

export default function FloatingCard({
  position,
  title,
  emoji,
  speed = 1,
}: FloatingCardProps) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    if (!group.current) return;
    // Always face the camera so the text is readable
    group.current.lookAt(camera.position);
  });

  return (
    <Float speed={speed} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={group} position={position}>
        
        {/* 1. The Glass Card (using Drei's RoundedBox) */}
        <RoundedBox
          args={[2.2, 0.75, 0.12]} // width, height, depth
          radius={0.1}
          smoothness={8}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            transmission={0.9} // Glass-like transparency
            roughness={0.05}
            thickness={0.8}
            clearcoat={1}
            ior={1.45}
            color="#ffffff"
            transparent
            opacity={0.95}
          />
        </RoundedBox>

        {/* 2. The Gold Border (using Drei's Edges) */}
        <Edges threshold={15} color="#b08d57" />

        {/* 3. The Emoji */}
        <Text
          position={[-0.72, 0, 0.08]}
          fontSize={0.22}
          color="#b08d57"
          anchorX="center"
          anchorY="middle"
        >
          {emoji}
        </Text>

        {/* 4. The Title */}
        <Text
          position={[0.25, 0, 0.08]}
          fontSize={0.16}
          color="#333333"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.4}
        >
          {title}
        </Text>
        
      </group>
    </Float>
  );
}