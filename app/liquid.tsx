"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise4D } from "simplex-noise";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  DotScreen,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

const Blob = ({
  cursor,
  noiseScale = 1,
  displace = 0.2,
  size = 1,
  position = [0, 0, 0],
}: {
  cursor: { x: number; y: number };
  noiseScale?: number;
  displace?: number;
  size?: number;
  position?: [number, number, number];
}) => {
  console.log(cursor);
  const meshRef = useRef<THREE.Mesh>(null);
  const noise = useMemo(() => createNoise4D(), []);
  const baseGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(size, 15),
    [size]
  );
  const positions = useMemo(
    () => Float32Array.from(baseGeometry.attributes.position.array),
    [baseGeometry]
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (meshRef.current) {
      const { array } = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < array.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        const offset =
          displace *
          noise(
            x * noiseScale,
            y * noiseScale,
            z * noiseScale,
            time * noiseScale
          );
        const normal = new THREE.Vector4(x, y, z).normalize();
        array[i] = x + normal.x * offset;
        array[i + 1] = y + normal.y * offset;
        array[i + 2] = z + normal.z * offset;
      }

      meshRef.current.geometry.attributes.position.needsUpdate = true;

      // Update position based on cursor
      // meshRef.current.position.x = (cursor.x - 0.5) * 8;
      // meshRef.current.position.y = -(cursor.y - 0.5) * 8;

      if (meshRef.current) {
        meshRef.current.rotateZ(0.02);
        meshRef.current.rotateX(0.02);
        meshRef.current.position.x = position[0];
        meshRef.current.position.y = position[1];
        meshRef.current.position.z = position[2];
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={baseGeometry}>
      <meshPhysicalMaterial
        transmission={1}
        roughness={0.2}
        thickness={3}
        ior={1.533}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.4}
        reflectivity={0.8}
        metalness={0}
        color={"#fff"}
        dispersion={4}
      />
    </mesh>
  );
};

const Cube = ({
  cursor,
  size = 0.3,
}: {
  cursor: { x: number; y: number };
  size?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cubeSize = size * 0.2;
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotateZ(0.02);
      meshRef.current.rotateY(0.02);
    }
  });
  return (
    <mesh position={[0, 0, 0]} ref={meshRef}>
      <sphereGeometry args={[cubeSize, 32, 32]} />
      <meshPhysicalMaterial roughness={0.5} metalness={0} color={"#FF7D29"} />
    </mesh>
  );
};

const Plane = () => {
  return (
    <mesh position={[0, 0, -20]}>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial roughness={1} metalness={0} color={"#fff"} />
    </mesh>
  );
};

const Liquid = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [noiseScale, setNoiseScale] = useState(1);
  const [offset, setOffset] = useState(0.2);
  const [size, setSize] = useState(1);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="w-[100vw] h-[100vh] bg-[#F1EFEC]">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Blob
            cursor={mouse}
            noiseScale={noiseScale}
            displace={offset}
            size={size}
            position={[0, 0, 0]}
          />
          <Cube cursor={mouse} size={size} />
          <Plane />
          <Environment files={"./hdr_1.exr"} background={true} />
          <EffectComposer>
            <Bloom
              intensity={0.1}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
            />
            <ChromaticAberration
              offset={[0.0004, 0.0004]}
              blendFunction={BlendFunction.NORMAL}
            />
            <Noise opacity={0.2} blendFunction={BlendFunction.OVERLAY} />
            <DotScreen
              blendFunction={BlendFunction.SCREEN}
              scale={200}
              opacity={0.02}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <div className="absolute bottom-8 right-4 flex flex-col gap-2 text-[#000]">
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={noiseScale}
          onChange={(e) => setNoiseScale(parseFloat(e.target.value))}
          className="w-48"
        />
        <div className="text-sm mt-0">Noise Scale: {noiseScale.toFixed(1)}</div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={offset}
          onChange={(e) => setOffset(parseFloat(e.target.value))}
          className="w-48"
        />
        <div className="text-sm mt-0">Displace: {offset.toFixed(1)}</div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={size}
          onChange={(e) => setSize(parseFloat(e.target.value))}
          className="w-48"
        />
        <div className="text-sm mt-0">Size: {size.toFixed(1)}</div>
      </div>
    </div>
  );
};

export default Liquid;
