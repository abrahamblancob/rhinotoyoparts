export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={2}
        color="#ffffff"
        castShadow
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.6}
        color="#d32f2f"
      />
      <pointLight position={[0, 5, 0]} intensity={1} color="#e0e0e0" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.7}
        color="#ffffff"
      />
    </>
  );
}
