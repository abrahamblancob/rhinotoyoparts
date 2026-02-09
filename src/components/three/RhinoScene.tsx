import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { SteelRhino } from './SteelRhino';
import { SceneLighting } from './SceneLighting';
import { SceneEnvironment } from './SceneEnvironment';

export function RhinoScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 45 }}
      className="w-full h-full"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneLighting />
        <SceneEnvironment />
        <SteelRhino />
      </Suspense>
    </Canvas>
  );
}
