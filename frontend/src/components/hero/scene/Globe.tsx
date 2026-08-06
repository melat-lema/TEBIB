// src/components/hero/scene/Globe.tsx

import { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

export default function Globe() {

  const globeRef = useRef<THREE.Mesh>(null);

  const earthTexture = useLoader(
    THREE.TextureLoader,
    "/textures/earthmap.jpg"
  );


  useFrame((_, delta)=>{

    if(globeRef.current){

      globeRef.current.rotation.y += delta * 0.08;

    }

  });


  return (

    <mesh ref={globeRef}>

      <sphereGeometry
        args={[2.2,128,128]}
      />


      <meshStandardMaterial

        map={earthTexture}

        roughness={0.9}

        metalness={0.05}

      />


    </mesh>

  );
}