import { MeshTransmissionMaterial } from "@react-three/drei";

export default function GlassMaterial() {
  return (
    <MeshTransmissionMaterial
      thickness={0.8}
      roughness={0.05}
      transmission={1}
      ior={1.45}
      chromaticAberration={0.03}
      backside
      backsideThickness={0.8}
      anisotropy={0.2}
      distortion={0.08}
      distortionScale={0.2}
      temporalDistortion={0.1}
      color="#ffffff"
    />
  );
}