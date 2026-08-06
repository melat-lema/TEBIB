// src/components/hero/scene/Particles.tsx

import { Points } from "@react-three/drei";
import * as THREE from "three";


export default function Particles(){


const particles = new Float32Array(
300 * 3
);



for(let i=0;i<300;i++){

particles[i*3]
=
(Math.random()-0.5)*20;


particles[i*3+1]
=
(Math.random()-0.5)*20;


particles[i*3+2]
=
(Math.random()-0.5)*20;


}



return (

<Points>


<bufferGeometry>

<bufferAttribute

attach="attributes-position"

args={[
particles,
3
]}

/>

</bufferGeometry>


<pointsMaterial

size={0.03}

color="#ffffff"

transparent

opacity={0.7}

/>


</Points>


);


}