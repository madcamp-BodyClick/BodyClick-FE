"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Box3,
  Color,
  Vector3,
  type Camera,
  type Group,
  type Material,
  type Mesh,
} from "three";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  DEFAULT_CAMERA,
  SYSTEM_LABELS,
  type BodyPartKey,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const MODEL_URL = "/models/human.glb";
const ORGAN_MODELS = {
  aorta: "/models/aorta.glb",
  brain: "/models/brain.glb",
  heart: "/models/heart.glb",
  intestine: "/models/intestine.glb",
  knee: "/models/knee.glb",
  liver: "/models/liver.glb",
  lung: "/models/lung.glb",
  pancreas: "/models/pancreas.glb",
  spinal: "/models/spinal.glb",
} as const;

type OrganKey = keyof typeof ORGAN_MODELS;

const FOCUS_COLOR = "#63c7db";
const FOCUS_DISTANCE = 2.4;
const CAMERA_LERP_SPEED = 8;
const ORGAN_OFFSET_X = 0.7;
const ORGAN_TARGET_SIZE = 0.9;
const ORGAN_FALLBACK_OFFSET: [number, number, number] = [0.7, 0.15, 0];

const BODY_PART_TO_ORGAN_KEY: Partial<Record<BodyPartKey, OrganKey>> = {
  heart: "heart",
  aorta: "aorta",
  lung_left: "lung",
  lung_right: "lung",
  brain: "brain",
  spinal_cord: "spinal",
  stomach: "pancreas",
  liver: "liver",
  pancreas: "pancreas",
  intestine: "intestine",
  knee_left: "knee",
  knee_right: "knee",
};

const BODY_PART_ANCHOR: Partial<
  Record<BodyPartKey, { nx: number; ny: number; nz: number }>
> = {
  brain: { nx: 0.5, ny: 0.9, nz: 0.55 },
  heart: { nx: 0.5, ny: 0.73, nz: 0.55 },
  aorta: { nx: 0.5, ny: 0.79, nz: 0.55 },
  lung_left: { nx: 0.42, ny: 0.74, nz: 0.55 },
  lung_right: { nx: 0.58, ny: 0.74, nz: 0.55 },
  spinal_cord: { nx: 0.5, ny: 0.62, nz: 0.45 },
  liver: { nx: 0.58, ny: 0.56, nz: 0.55 },
  pancreas: { nx: 0.5, ny: 0.52, nz: 0.55 },
  stomach: { nx: 0.48, ny: 0.54, nz: 0.55 },
  intestine: { nx: 0.5, ny: 0.42, nz: 0.55 },
  knee_left: { nx: 0.46, ny: 0.2, nz: 0.55 },
  knee_right: { nx: 0.54, ny: 0.2, nz: 0.55 },
};

const HumanModel = ({
  onPointerDown,
  modelRef,
}: {
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  modelRef: React.MutableRefObject<Group | null>;
}) => {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive ref={modelRef} object={scene} onPointerDown={onPointerDown} />;
};

useGLTF.preload(MODEL_URL);
useGLTF.preload(ORGAN_MODELS.aorta);
useGLTF.preload(ORGAN_MODELS.brain);
useGLTF.preload(ORGAN_MODELS.heart);
useGLTF.preload(ORGAN_MODELS.intestine);
useGLTF.preload(ORGAN_MODELS.knee);
useGLTF.preload(ORGAN_MODELS.liver);
useGLTF.preload(ORGAN_MODELS.lung);
useGLTF.preload(ORGAN_MODELS.pancreas);
useGLTF.preload(ORGAN_MODELS.spinal);

const FocusMarker = ({ point }: { point: Vector3 | null }) => {
  if (!point) {
    return null;
  }

  return (
    <mesh position={point} raycast={() => {}}>
      <sphereGeometry args={[0.07, 20, 20]} />
      <meshStandardMaterial
        color={FOCUS_COLOR}
        emissive={FOCUS_COLOR}
        emissiveIntensity={1.2}
        toneMapped={false}
      />
    </mesh>
  );
};

const OrganModel = ({
  organKey,
  position,
}: {
  organKey: OrganKey;
  position: [number, number, number];
}) => {
  const { scene } = useGLTF(ORGAN_MODELS[organKey]);
  const groupRef = useRef<Group | null>(null);
  const materialsRef = useRef<Material[]>([]);
  const progressRef = useRef(0);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const baseScale = useMemo(() => {
    const bounds = new Box3().setFromObject(clonedScene);
    const size = bounds.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim <= 0) {
      return 1;
    }
    return ORGAN_TARGET_SIZE / maxDim;
  }, [clonedScene]);

  useEffect(() => {
    const materials: Material[] = [];
    clonedScene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        const meshMaterials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        meshMaterials.forEach((material) => {
          if (material) {
            const target = material as Material & {
              emissive?: Color;
              emissiveIntensity?: number;
              opacity?: number;
              transparent?: boolean;
            };
            if ("emissive" in target) {
              target.emissive = new Color(0x000000);
              target.emissiveIntensity = 0;
            }
            target.transparent = true;
            target.opacity = 0;
            materials.push(material);
          }
        });
      }
    });
    materialsRef.current = materials;
  }, [clonedScene]);

  useFrame((_, delta) => {
    const next = Math.min(1, progressRef.current + delta * 2.4);
    progressRef.current = next;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(next * baseScale);
    }
    materialsRef.current.forEach((material) => {
      const target = material as Material & { opacity?: number };
      if (typeof target.opacity === "number") {
        target.opacity = next;
      }
    });
  });

  return (
    <Billboard position={position}>
      <group ref={groupRef} scale={0}>
        <primitive object={clonedScene} />
      </group>
    </Billboard>
  );
};

const CameraRig = ({
  controlsRef,
  targetPositionRef,
  targetLookAtRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  targetPositionRef: React.MutableRefObject<Vector3 | null>;
  targetLookAtRef: React.MutableRefObject<Vector3 | null>;
}) => {
  useFrame(({ camera }, delta) => {
    const targetPosition = targetPositionRef.current;
    const targetLookAt = targetLookAtRef.current;
    const controls = controlsRef.current;
    if (!targetPosition || !targetLookAt || !controls) {
      return;
    }

    const alpha = 1 - Math.exp(-delta * CAMERA_LERP_SPEED);
    camera.position.lerp(targetPosition, alpha);
    controls.target.lerp(targetLookAt, alpha);
    controls.update();

    if (
      camera.position.distanceTo(targetPosition) < 0.02 &&
      controls.target.distanceTo(targetLookAt) < 0.02
    ) {
      targetPositionRef.current = null;
      targetLookAtRef.current = null;
    }
  });

  return null;
};

const getOrganFromPoint = (
  localPoint: Vector3,
  bounds: Box3,
): { organKey: OrganKey; storeKey: BodyPartKey } | null => {
  const size = bounds.getSize(new Vector3());
  if (size.x === 0 || size.y === 0 || size.z === 0) {
    return null;
  }

  const nx = (localPoint.x - bounds.min.x) / size.x;
  const ny = (localPoint.y - bounds.min.y) / size.y;
  const nz = (localPoint.z - bounds.min.z) / size.z;

  const lateral = Math.abs(nx - 0.5);
  if (ny > 0.35 && lateral > 0.33) {
    return null;
  }

  if (ny > 0.84) {
    return lateral < 0.18 ? { organKey: "brain", storeKey: "brain" } : null;
  }

  if (ny > 0.28 && ny < 0.86 && lateral < 0.08 && nz < 0.6) {
    return { organKey: "spinal", storeKey: "spinal_cord" };
  }

  if (ny > 0.64) {
    if (nx < 0.44) {
      return { organKey: "lung", storeKey: "lung_left" };
    }
    if (nx > 0.56) {
      return { organKey: "lung", storeKey: "lung_right" };
    }
    if (ny > 0.76) {
      return { organKey: "aorta", storeKey: "aorta" };
    }
    return { organKey: "heart", storeKey: "heart" };
  }

  if (ny > 0.44) {
    if (nx > 0.55) {
      return { organKey: "liver", storeKey: "liver" };
    }
    if (nx < 0.45) {
      return { organKey: "intestine", storeKey: "intestine" };
    }
    return { organKey: "pancreas", storeKey: "pancreas" };
  }

  if (ny > 0.18) {
    if (nx < 0.5) {
      return { organKey: "knee", storeKey: "knee_left" };
    }
    return { organKey: "knee", storeKey: "knee_right" };
  }

  return null;
};

const Stage3D = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  const setSystem = useBodyMapStore((state) => state.setSystem);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const targetPositionRef = useRef<Vector3 | null>(null);
  const targetLookAtRef = useRef<Vector3 | null>(null);
  const modelRef = useRef<Group | null>(null);
  const modelBoundsRef = useRef<Box3 | null>(null);
  const [focusPoint, setFocusPoint] = useState<Vector3 | null>(null);
  const [activeOrgan, setActiveOrgan] = useState<{
    key: OrganKey;
    position: [number, number, number];
  } | null>(null);

  useEffect(() => {
    if (modelRef.current) {
      modelBoundsRef.current = new Box3().setFromObject(modelRef.current);
    }
  }, []);

  useEffect(() => {
    if (!selectedBodyPart) {
      setActiveOrgan(null);
      return;
    }

    const organKey = BODY_PART_TO_ORGAN_KEY[selectedBodyPart];
    const anchor = BODY_PART_ANCHOR[selectedBodyPart];
    if (!organKey || !anchor) {
      setActiveOrgan(null);
      return;
    }

    if (activeOrgan?.key === organKey) {
      return;
    }

    const model = modelRef.current;
    if (!model) {
      return;
    }
    const bounds = modelBoundsRef.current ?? new Box3().setFromObject(model);
    modelBoundsRef.current = bounds;
    const size = bounds.getSize(new Vector3());
    const organPosition = new Vector3(
      bounds.min.x + size.x * anchor.nx,
      bounds.min.y + size.y * anchor.ny,
      bounds.min.z + size.z * anchor.nz,
    ).add(
      new Vector3(
        ORGAN_FALLBACK_OFFSET[0],
        ORGAN_FALLBACK_OFFSET[1],
        ORGAN_FALLBACK_OFFSET[2],
      ),
    );
    setActiveOrgan({
      key: organKey,
      position: [organPosition.x, organPosition.y, organPosition.z],
    });
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) {
        direction.set(0, 0, 1);
      }
      direction.normalize();
      targetPositionRef.current = organPosition
        .clone()
        .add(direction.multiplyScalar(FOCUS_DISTANCE));
      targetLookAtRef.current = organPosition.clone();
    }
  }, [activeOrgan, selectedBodyPart]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const model = modelRef.current;
    let bounds = modelBoundsRef.current;
    if (!model) {
      return;
    }
    if (!bounds) {
      bounds = new Box3().setFromObject(model);
      modelBoundsRef.current = bounds;
    }

    const localPoint = event.point.clone();
    model.worldToLocal(localPoint);
    const hit = getOrganFromPoint(localPoint, bounds);
    if (!hit) {
      return;
    }

    const hitPoint = event.point.clone();
    setFocusPoint(hitPoint);

    const partSystem = BODY_PART_LOOKUP[hit.storeKey]?.system;
    if (partSystem && selectedSystem !== partSystem) {
      setSystem(partSystem);
    }
    setBodyPart(hit.storeKey);

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 0.0001) {
      direction.set(0, 0, 1);
    }
    direction.normalize();
    const organPosition = hitPoint
      .clone()
      .add(new Vector3(ORGAN_OFFSET_X, 0, 0));
    setActiveOrgan({
      key: hit.organKey,
      position: [organPosition.x, organPosition.y, organPosition.z],
    });
    targetPositionRef.current = hitPoint
      .clone()
      .add(direction.multiplyScalar(FOCUS_DISTANCE));
    targetLookAtRef.current = hitPoint.clone();
  };

  const clearFocus = () => {
    setFocusPoint(null);
    targetPositionRef.current = null;
    targetLookAtRef.current = null;
    setActiveOrgan(null);
  };

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
        <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-bm-border bg-bm-panel-soft">
          <Canvas
            className="h-full w-full"
            camera={{
              position: DEFAULT_CAMERA.position,
              fov: 45,
              near: 0.1,
              far: 100,
            }}
            onCreated={({ camera }) => {
              cameraRef.current = camera;
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 4, 5]} intensity={1} />
            <Suspense fallback={null}>
              <HumanModel onPointerDown={handlePointerDown} modelRef={modelRef} />
            </Suspense>
            <FocusMarker point={focusPoint} />
            <CameraRig
              controlsRef={controlsRef}
              targetPositionRef={targetPositionRef}
              targetLookAtRef={targetLookAtRef}
            />
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableDamping
              target={DEFAULT_CAMERA.lookAt}
            />
            {activeOrgan ? (
              <Suspense fallback={null}>
                <OrganModel
                  key={`${activeOrgan.key}-${activeOrgan.position.join(",")}`}
                  organKey={activeOrgan.key}
                  position={activeOrgan.position}
                />
              </Suspense>
            ) : null}
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
          onClick={() => {
            setBodyPart(null);
            clearFocus();
          }}
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
