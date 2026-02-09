import { Environment, ContactShadows } from '@react-three/drei';

export function SceneEnvironment() {
  return (
    <>
      <Environment preset="city" />
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />
      <fog attach="fog" args={['#f5f5f5', 12, 35]} />
    </>
  );
}
