// src/components/hero/scene/FloatingIcons.tsx

import { Float, Html } from "@react-three/drei";

import {
 FileText,
 Building2,
 ShieldCheck,
 Car
} from "lucide-react";


const services=[


{
 icon:FileText,
 title:"Passport",
 position:[0,3.7,0]
},


{
 icon:Building2,
 title:"Business",
 position:[3.7,0,0]
},


{
 icon:ShieldCheck,
 title:"Kebele ID",
 position:[0,-3.7,0]
},


{
 icon:Car,
 title:"Driving",
 position:[-3.7,0,0]
}


];



export default function FloatingIcons(){


return (

<>


{
services.map((service,index)=>{


const Icon=service.icon;


return (

<Float

key={index}

speed={1.5}

rotationIntensity={0.2}

floatIntensity={0.6}

>


<group
position={
service.position as [
number,
number,
number
]
}
>


<Html
distanceFactor={10}
transform
>


<div

className="
w-20
h-20
rounded-full

bg-white/10

backdrop-blur-xl

border
border-white/30

shadow-2xl

flex
items-center
justify-center

hover:scale-110

transition-all

duration-300

"

>


<Icon

size={32}

strokeWidth={1.5}

className="
text-white
"

/>


</div>


</Html>


</group>


</Float>


)


})

}


</>

);


}