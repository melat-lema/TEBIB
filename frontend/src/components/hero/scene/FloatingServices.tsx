import FloatingCard from "../FloatingCard";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const services = [
  {
    title: "Passport",
    emoji: "🛂",
    radius: 3.6,
    height: 1.3,
    speed: 0.18,
    offset: 0,
  },
  {
    title: "Business",
    emoji: "🏢",
    radius: 3.4,
    height: -1.5,
    speed: 0.15,
    offset: Math.PI / 3,
  },
  {
    title: "Driving",
    emoji: "🚗",
    radius: 4.1,
    height: 0.3,
    speed: 0.12,
    offset: Math.PI,
  },
  {
    title: "Tax",
    emoji: "💳",
    radius: 3.8,
    height: -0.7,
    speed: 0.20,
    offset: Math.PI / 2,
  },
  {
    title: "Justice",
    emoji: "⚖️",
    radius: 4.3,
    height: 1.8,
    speed: 0.16,
    offset: Math.PI * 1.4,
  },
  {
    title: "Kebele ID",
    emoji: "🪪",
    radius: 3.9,
    height: -2,
    speed: 0.14,
    offset: Math.PI * 1.8,
  },
];

export default function FloatingServices() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;

    const t = clock.elapsedTime;

    group.current.children.forEach((child, i) => {
      const s = services[i];

      const angle = t * s.speed + s.offset;

      child.position.x = Math.cos(angle) * s.radius;
      child.position.z = Math.sin(angle) * s.radius;
      child.position.y = s.height;
    });
  });

  return (
    <group ref={group}>
      {services.map((service) => (
        <FloatingCard
          key={service.title}
          title={service.title}
          emoji={service.emoji}
          position={[service.radius, service.height, 0]}
          speed={1}
        />
      ))}
    </group>
  );
}