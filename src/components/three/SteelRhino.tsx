import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RhinoModel } from './RhinoModel';

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        position: [
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8,
        ] as [number, number, number],
        scale: Math.random() * 0.03 + 0.01,
        speed: 1 + Math.random() * 2,
        key: i,
      })),
    [],
  );

  return (
    <group>
      {particles.map(({ position, scale, speed, key }) => (
        <Float key={key} speed={speed} floatIntensity={0.5}>
          <mesh position={position}>
            <sphereGeometry args={[scale, 6, 6]} />
            <meshStandardMaterial
              color="#d32f2f"
              emissive="#d32f2f"
              emissiveIntensity={0.8}
              transparent
              opacity={0.5}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function FloorGrid() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.Material & { opacity: number };
    mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
  });

  return (
    <mesh ref={meshRef} position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 30, 40, 40]} />
      <MeshDistortMaterial
        color="#d32f2f"
        wireframe
        transparent
        opacity={0.1}
        distort={0.05}
        speed={0.8}
      />
    </mesh>
  );
}

export function SteelRhino() {
  return (
    <group>
      <RhinoModel />
      <ParticleField />
      <FloorGrid />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 4}
      />
    </group>
  );
}
