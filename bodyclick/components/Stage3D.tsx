"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Group } from "three";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  DEFAULT_CAMERA,
  SYSTEM_LABELS,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const MODEL_URL = "/models/human.glb";

const HumanModel = () => {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} />;
};

useGLTF.preload(MODEL_URL);

const Stage3D = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const modelRef = useRef<Group | null>(null);

  const parts = selectedSystem ? BODY_PARTS[selectedSystem] : [];
  const selectedPartLabel = selectedBodyPart
    ? BODY_PART_LOOKUP[selectedBodyPart]?.label
    : null;
  const systemLabel = selectedSystem ? SYSTEM_LABELS[selectedSystem] : "전신";
  const barWidth =
    parts.length <= 1 ? 180 : parts.length <= 3 ? 300 : 480;

  return (
    <section className="relative h-[68vh] min-h-[420px] w-full overflow-hidden rounded-[32px] border border-bm-border bg-bm-surface-soft animate-[rise-in_0.9s_ease-out] lg:h-[76vh] lg:min-h-[520px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_90%,rgba(255,255,255,0.04)_0%,transparent_60%)]" />
      <div
        className={`pointer-events-none absolute inset-0 bg-black/30 transition-opacity duration-700 ${
          selectedBodyPart ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        <div className="h-full w-full overflow-hidden rounded-[24px] border border-bm-border bg-bm-panel-soft">
          <Canvas
            className="h-full w-full"
            camera={{
              position: DEFAULT_CAMERA.position,
              fov: 45,
              near: 0.1,
              far: 100,
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 4, 5]} intensity={1} />
            <Suspense fallback={null}>
              <group ref={modelRef}>
                <HumanModel />
              </group>
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableDamping
              target={DEFAULT_CAMERA.lookAt}
            />
          </Canvas>
        </div>
      </div>

      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-bm-accent" />
        {systemLabel}
      </div>

      {selectedBodyPart ? (
        <button
          type="button"
          onClick={() => setBodyPart(null)}
          className="absolute left-6 bottom-6 z-30 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
        >
          전체 보기
        </button>
      ) : null}

      {selectedPartLabel ? (
        <div className="absolute right-6 top-6 z-20 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-text">
          {selectedPartLabel}
        </div>
      ) : null}

      {selectedSystem ? (
        <div
          className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-[24px] border border-bm-border bg-bm-panel-soft px-5 py-3 text-xs text-bm-muted backdrop-blur"
          style={{ width: `${barWidth}px` }}
        >
          {parts.map((part) => {
            const isActive = selectedBodyPart === part.id;
            const dimmed = selectedBodyPart && !isActive;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setBodyPart(part.id)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "bg-bm-accent-soft text-bm-text"
                    : "text-bm-muted hover:text-bm-text"
                } ${dimmed ? "opacity-50" : "opacity-100"}`}
              >
                {part.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default Stage3D;
