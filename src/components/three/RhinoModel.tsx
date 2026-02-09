import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Rinoceronte mecánico hiperrealista construido con piezas de motor/auto.
 * Inspirado en esculturas de metal reciclado: engranajes, pistones, tubos,
 * placas de blindaje con remaches, ojos LED rojos.
 */
export function RhinoModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.25) * 0.25 + Math.PI * 0.1;
    groupRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
  });

  // --- Materials ---
  const bodySteel = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6b6b6b',
        metalness: 0.92,
        roughness: 0.18,
        envMapIntensity: 1.8,
      }),
    [],
  );

  const darkIron = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a3a3a',
        metalness: 0.88,
        roughness: 0.3,
        envMapIntensity: 1.4,
      }),
    [],
  );

  const wornMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5a5046',
        metalness: 0.75,
        roughness: 0.45,
        envMapIntensity: 1.0,
      }),
    [],
  );

  const redAccent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c62828',
        metalness: 0.6,
        roughness: 0.35,
        emissive: '#c62828',
        emissiveIntensity: 0.2,
      }),
    [],
  );

  const chrome = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e0e0e0',
        metalness: 1.0,
        roughness: 0.05,
        envMapIntensity: 2.5,
      }),
    [],
  );

  const eyeGlow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff1a1a',
        emissive: '#ff0000',
        emissiveIntensity: 3,
        metalness: 0.2,
        roughness: 0.1,
      }),
    [],
  );

  const rustMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b6914',
        metalness: 0.6,
        roughness: 0.7,
        envMapIntensity: 0.6,
      }),
    [],
  );

  // Helper: Rivet row
  const rivets = (
    count: number,
    startX: number,
    y: number,
    z: number,
    spacingX: number,
  ) =>
    Array.from({ length: count }, (_, i) => (
      <mesh
        key={`rv-${startX}-${y}-${z}-${i}`}
        material={chrome}
        position={[startX + i * spacingX, y, z]}
      >
        <sphereGeometry args={[0.04, 6, 6]} />
      </mesh>
    ));

  return (
    <group ref={groupRef} scale={1.2} position={[0, -0.5, 0]}>
      {/* =============== TORSO / CUERPO PRINCIPAL =============== */}
      {/* Core body barrel */}
      <mesh material={bodySteel} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.8, 0.85, 2.6, 12]} />
      </mesh>
      {/* Upper spine ridge */}
      <mesh material={darkIron} position={[0, 0.65, 0]}>
        <boxGeometry args={[2.0, 0.2, 0.6]} />
      </mesh>
      {/* Belly plate */}
      <mesh material={wornMetal} position={[0, -0.55, 0]}>
        <boxGeometry args={[2.2, 0.15, 1.2]} />
      </mesh>

      {/* === Armor plates (overlapping, like welded sheets) === */}
      <mesh material={bodySteel} position={[0.5, 0.35, 0.65]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.0, 0.6, 0.06]} />
      </mesh>
      <mesh material={bodySteel} position={[0.5, 0.35, -0.65]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.0, 0.6, 0.06]} />
      </mesh>
      <mesh material={darkIron} position={[-0.4, 0.3, 0.67]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.8, 0.55, 0.05]} />
      </mesh>
      <mesh material={darkIron} position={[-0.4, 0.3, -0.67]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.8, 0.55, 0.05]} />
      </mesh>

      {/* Rivets along armor */}
      {rivets(5, -0.6, 0.5, 0.69, 0.3)}
      {rivets(5, -0.6, 0.5, -0.69, 0.3)}
      {rivets(4, -0.3, 0.1, 0.7, 0.4)}
      {rivets(4, -0.3, 0.1, -0.7, 0.4)}

      {/* === Gears on body (visible engine parts) === */}
      {/* Large gear left side */}
      <mesh material={rustMetal} position={[-0.5, 0.0, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.04, 6, 16]} />
      </mesh>
      <mesh material={darkIron} position={[-0.5, 0.0, 0.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 8]} />
      </mesh>
      {/* Large gear right side */}
      <mesh material={rustMetal} position={[-0.5, 0.0, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.04, 6, 16]} />
      </mesh>
      <mesh material={darkIron} position={[-0.5, 0.0, -0.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 8]} />
      </mesh>

      {/* Small gears */}
      <mesh material={chrome} position={[0.3, -0.15, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 6, 12]} />
      </mesh>
      <mesh material={chrome} position={[0.3, -0.15, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 6, 12]} />
      </mesh>

      {/* Exhaust pipes on sides */}
      <mesh material={darkIron} position={[-0.9, -0.1, 0.5]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.06, 0.08, 0.6, 8]} />
      </mesh>
      <mesh material={darkIron} position={[-0.9, -0.1, -0.5]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.06, 0.08, 0.6, 8]} />
      </mesh>
      {/* Exhaust tips (red hot) */}
      <mesh material={redAccent} position={[-1.15, -0.25, 0.5]}>
        <cylinderGeometry args={[0.09, 0.06, 0.08, 8]} />
      </mesh>
      <mesh material={redAccent} position={[-1.15, -0.25, -0.5]}>
        <cylinderGeometry args={[0.09, 0.06, 0.08, 8]} />
      </mesh>

      {/* Red accent stripe */}
      <mesh material={redAccent} position={[0, 0.0, 0.72]}>
        <boxGeometry args={[2.0, 0.08, 0.03]} />
      </mesh>
      <mesh material={redAccent} position={[0, 0.0, -0.72]}>
        <boxGeometry args={[2.0, 0.08, 0.03]} />
      </mesh>

      {/* =============== HEAD =============== */}
      {/* Main skull */}
      <mesh material={bodySteel} position={[1.5, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.85, 0.95]} />
      </mesh>
      {/* Snout / jaw plate */}
      <mesh material={darkIron} position={[2.1, 0.05, 0]}>
        <boxGeometry args={[0.65, 0.55, 0.75]} />
      </mesh>
      {/* Jaw hinge visible */}
      <mesh material={chrome} position={[1.85, -0.15, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
      </mesh>
      <mesh material={chrome} position={[1.85, -0.15, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
      </mesh>
      {/* Mouth slit (dark opening) */}
      <mesh position={[2.43, -0.05, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.45]} />
        <meshStandardMaterial color="#1a0000" emissive="#330000" emissiveIntensity={0.5} />
      </mesh>
      {/* Forehead armor */}
      <mesh material={darkIron} position={[1.6, 0.65, 0]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.7, 0.12, 0.85]} />
      </mesh>
      {/* Head rivets */}
      {rivets(3, 1.3, 0.55, 0.49, 0.2)}
      {rivets(3, 1.3, 0.55, -0.49, 0.2)}

      {/* === HORN - Main (red tipped like image) === */}
      <mesh material={bodySteel} position={[2.25, 0.55, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.12, 0.7, 8]} />
      </mesh>
      <mesh material={redAccent} position={[2.38, 0.9, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.06, 0.25, 8]} />
      </mesh>
      {/* Horn - Secondary (shorter) */}
      <mesh material={bodySteel} position={[1.8, 0.7, 0]} rotation={[0, 0, 0.25]}>
        <coneGeometry args={[0.08, 0.35, 8]} />
      </mesh>
      <mesh material={redAccent} position={[1.85, 0.88, 0]} rotation={[0, 0, 0.25]}>
        <coneGeometry args={[0.04, 0.12, 8]} />
      </mesh>

      {/* === EYES (glowing red LEDs) === */}
      <mesh position={[1.85, 0.35, 0.42]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} />
      </mesh>
      <mesh position={[1.85, 0.35, -0.42]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} />
      </mesh>
      {/* Eye sockets (dark surround) */}
      <mesh material={darkIron} position={[1.84, 0.35, 0.44]}>
        <torusGeometry args={[0.09, 0.025, 6, 12]} />
      </mesh>
      <mesh material={darkIron} position={[1.84, 0.35, -0.44]}>
        <torusGeometry args={[0.09, 0.025, 6, 12]} />
      </mesh>

      {/* Ears (small angular plates) */}
      <mesh material={darkIron} position={[1.2, 0.75, 0.4]} rotation={[0.4, 0.2, 0.3]}>
        <boxGeometry args={[0.15, 0.25, 0.05]} />
      </mesh>
      <mesh material={darkIron} position={[1.2, 0.75, -0.4]} rotation={[-0.4, -0.2, 0.3]}>
        <boxGeometry args={[0.15, 0.25, 0.05]} />
      </mesh>

      {/* =============== FRONT LEGS (piston/hydraulic style) =============== */}
      {/* Upper leg - thick cylinder like hydraulic arm */}
      <mesh material={bodySteel} position={[0.7, -0.65, 0.5]}>
        <cylinderGeometry args={[0.18, 0.15, 0.7, 10]} />
      </mesh>
      <mesh material={bodySteel} position={[0.7, -0.65, -0.5]}>
        <cylinderGeometry args={[0.18, 0.15, 0.7, 10]} />
      </mesh>
      {/* Knee joint (gear/ring) */}
      <mesh material={chrome} position={[0.7, -1.0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 10]} />
      </mesh>
      <mesh material={chrome} position={[0.7, -1.0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 10]} />
      </mesh>
      {/* Lower leg - thinner piston */}
      <mesh material={darkIron} position={[0.7, -1.3, 0.5]}>
        <cylinderGeometry args={[0.1, 0.13, 0.5, 8]} />
      </mesh>
      <mesh material={darkIron} position={[0.7, -1.3, -0.5]}>
        <cylinderGeometry args={[0.1, 0.13, 0.5, 8]} />
      </mesh>
      {/* Hooves (heavy flat base) */}
      <mesh material={wornMetal} position={[0.7, -1.6, 0.5]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 8]} />
      </mesh>
      <mesh material={wornMetal} position={[0.7, -1.6, -0.5]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 8]} />
      </mesh>

      {/* =============== BACK LEGS =============== */}
      {/* Thigh */}
      <mesh material={bodySteel} position={[-0.65, -0.55, 0.5]}>
        <cylinderGeometry args={[0.2, 0.17, 0.6, 10]} />
      </mesh>
      <mesh material={bodySteel} position={[-0.65, -0.55, -0.5]}>
        <cylinderGeometry args={[0.2, 0.17, 0.6, 10]} />
      </mesh>
      {/* Knee joint */}
      <mesh material={chrome} position={[-0.65, -0.9, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.035, 6, 10]} />
      </mesh>
      <mesh material={chrome} position={[-0.65, -0.9, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.035, 6, 10]} />
      </mesh>
      {/* Shin */}
      <mesh material={darkIron} position={[-0.65, -1.25, 0.5]}>
        <cylinderGeometry args={[0.11, 0.14, 0.55, 8]} />
      </mesh>
      <mesh material={darkIron} position={[-0.65, -1.25, -0.5]}>
        <cylinderGeometry args={[0.11, 0.14, 0.55, 8]} />
      </mesh>
      {/* Hooves */}
      <mesh material={wornMetal} position={[-0.65, -1.58, 0.5]}>
        <cylinderGeometry args={[0.19, 0.21, 0.1, 8]} />
      </mesh>
      <mesh material={wornMetal} position={[-0.65, -1.58, -0.5]}>
        <cylinderGeometry args={[0.19, 0.21, 0.1, 8]} />
      </mesh>

      {/* Piston rods on legs (visible hydraulics) */}
      <mesh material={chrome} position={[0.82, -0.9, 0.5]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
      </mesh>
      <mesh material={chrome} position={[0.82, -0.9, -0.5]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
      </mesh>
      <mesh material={chrome} position={[-0.52, -0.85, 0.5]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 6]} />
      </mesh>
      <mesh material={chrome} position={[-0.52, -0.85, -0.5]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 6]} />
      </mesh>

      {/* =============== TAIL (jointed chain/cable) =============== */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`tail-${i}`}
          material={i % 2 === 0 ? darkIron : wornMetal}
          position={[
            -1.3 - i * 0.15,
            0.15 + i * 0.08,
            Math.sin(i * 0.5) * 0.05,
          ]}
          rotation={[0, 0, -0.3 - i * 0.12]}
        >
          <cylinderGeometry args={[0.04 - i * 0.005, 0.04 - i * 0.005, 0.15, 6]} />
        </mesh>
      ))}

      {/* =============== ADDITIONAL ENGINE PARTS ON BODY =============== */}
      {/* Cylinder block (engine block on back) */}
      <mesh material={darkIron} position={[-0.2, 0.75, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
      </mesh>
      {/* Cylinder holes */}
      {[-0.1, 0.1].map((zOff) => (
        <mesh key={`cyl-${zOff}`} material={wornMetal} position={[-0.2, 0.86, zOff]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 8]} />
        </mesh>
      ))}

      {/* Pipes across top */}
      <mesh material={chrome} position={[0.4, 0.78, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
      </mesh>
      <mesh material={darkIron} position={[0.7, 0.72, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
      </mesh>
      <mesh material={darkIron} position={[0.7, 0.72, -0.2]} rotation={[-Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
      </mesh>

      {/* Bolts on shoulders */}
      {[0.5, -0.5].map((z) =>
        [0.9, 0.6, 0.3].map((x) => (
          <mesh key={`bolt-${x}-${z}`} material={chrome} position={[x, 0.58, z * 1.3]}>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 6]} />
          </mesh>
        )),
      )}

      {/* Platform / base pedestal */}
      <mesh material={wornMetal} position={[0, -1.68, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.6]} />
      </mesh>
      <mesh material={darkIron} position={[0, -1.73, 0]}>
        <boxGeometry args={[3.2, 0.06, 1.8]} />
      </mesh>
    </group>
  );
}
