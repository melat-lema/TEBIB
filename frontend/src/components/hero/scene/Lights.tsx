// src/components/hero/scene/Atmosphere.tsx

import * as THREE from "three";


export default function Light(){

return (

<mesh>

<sphereGeometry
args={[2.28,128,128]}
/>


<meshBasicMaterial

color="#38bdf8"

transparent

opacity={0.15}

side={THREE.BackSide}

/>


</mesh>

);

}