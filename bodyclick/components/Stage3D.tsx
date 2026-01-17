"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  bronchus: "/models/bronchus.glb",
  heart: "/models/heart.glb",
  shoulder: "/models/shoulder.glb",
  stomach: "/models/stomach.glb",
  intestine: "/models/intestine.glb",
  knee: "/models/knee.glb",
  liver: "/models/liver.glb",
  lung: "/models/lung.glb",
  pancreas: "/models/pancreas.glb",
  spinal: "/models/spinal.glb",
  vertebra: "/models/vertebra.glb",
} as const;

type OrganKey = keyof typeof ORGAN_MODELS;

const FOCUS_COLOR = "#63c7db";
const FOCUS_DISTANCE = 2.8;
const CAMERA_LERP_SPEED = 8;
const ORGAN_OFFSET_X = 0.7;
const ORGAN_TARGET_SIZE = 0.9;
const ORGAN_CAMERA_OFFSET = 0.35;
const KNEE_CAMERA_OFFSET_X = 0.35;
const LATERAL_CAMERA_OFFSET_X = 0.28;
const ORGAN_FALLBACK_OFFSET: [number, number, number] = [0.7, 0.15, 0];
const DEBUG_BOX_COLOR = "#f0b429";
const DEBUG_BOX_OPACITY = 0.18;
const DEBUG_CENTER_SIZE = 0.045;
const SHOW_DEBUG_RANGES = false;
const NECK_PIVOT_OFFSET_Y = 0.18;
const GAZE_MAX_PITCH = 0.18;
const GAZE_MAX_YAW = 0.25;
const BODY_MAX_PITCH = 0.08;
const BODY_MAX_YAW = 0.12;
const GAZE_LERP_SPEED = 10;
const BODY_LERP_SPEED = 3.2;

const BODY_PART_TO_ORGAN_KEY: Partial<Record<BodyPartKey, OrganKey>> = {
  heart: "heart",
  aorta: "aorta",
  lung: "lung",
  shoulder_left: "shoulder",
  shoulder_right: "shoulder",
  trachea: "bronchus",
  brain: "brain",
  spine: "vertebra",
  spinal_cord: "spinal",
  stomach: "stomach",
  liver: "liver",
  pancreas: "pancreas",
  intestine: "intestine",
  knee_left: "knee",
  knee_right: "knee",
};

const ORGAN_SCALE_MULTIPLIER: Partial<Record<OrganKey, number>> = {
  aorta: 1.35,
  bronchus: 1.1,
  shoulder: 1.1,
  stomach: 1.05,
  vertebra: 1.2,
};

const ORGAN_CAMERA_OFFSET_MULTIPLIER: Partial<Record<OrganKey, number>> = {
  aorta: 2,
  bronchus: 1.3,
  vertebra: 1.2,
};

const CAMERA_FOCUS_OFFSET: Partial<Record<BodyPartKey, { x: number; y: number; z: number }>> =
  {
    spinal_cord: { x: 0, y: 0.9, z: 0 },
    spine: { x: 0, y: 0.01, z: 0 },
    trachea: { x: 0, y: 0.18, z: 0 },
    stomach: { x: 0, y: 0.12, z: 0 },
    shoulder_left: { x: 0, y: 0.06, z: 0 },
    shoulder_right: { x: 0, y: 0.06, z: 0 },
  };

const CAMERA_DISTANCE_MULTIPLIER: Partial<Record<BodyPartKey, number>> = {
  spinal_cord: 1.2,
  spine: 1.1,
  aorta: 1.25,
  trachea: 1.5,
  stomach: 1.05,
  shoulder_left: 1.05,
  shoulder_right: 1.05,
};

const getKneeCameraOffsetX = (
  part: BodyPartKey | null,
  anchors: Partial<Record<BodyPartKey, { nx: number }>>,
) => {
  if (part !== "knee_left" && part !== "knee_right") {
    return 0;
  }
  const anchor = anchors[part];
  if (!anchor) {
    return 0;
  }
  return anchor.nx < 0.5 ? -KNEE_CAMERA_OFFSET_X : KNEE_CAMERA_OFFSET_X;
};

const getLateralCameraOffsetX = (
  part: BodyPartKey | null,
  anchors: Partial<Record<BodyPartKey, { nx: number }>>,
) => {
  if (!part) {
    return 0;
  }
  const anchor = anchors[part];
  if (!anchor) {
    return 0;
  }
  const lateral = Math.abs(anchor.nx - 0.5);
  if (lateral < 0.08) {
    return 0;
  }
  return anchor.nx < 0.5 ? -LATERAL_CAMERA_OFFSET_X : LATERAL_CAMERA_OFFSET_X;
};

const getFocusOffset = (part: BodyPartKey | null) => {
  if (!part) {
    return new Vector3(0, 0, 0);
  }
  const offset = CAMERA_FOCUS_OFFSET[part];
  if (!offset) {
    return new Vector3(0, 0, 0);
  }
  return new Vector3(offset.x, offset.y, offset.z);
};

const BODY_PART_ANCHOR: Partial<
  Record<BodyPartKey, { nx: number; ny: number; nz: number }>
> = {
  brain: { nx: 0.5, ny: 0.9, nz: 0.55 },
  shoulder_left: { nx: 0.62, ny: 0.78, nz: 0.55 },
  shoulder_right: { nx: 0.38, ny: 0.78, nz: 0.55 },
  heart: { nx: 0.5, ny: 0.73, nz: 0.55 },
  aorta: { nx: 0.5, ny: 0.79, nz: 0.55 },
  lung: { nx: 0.5, ny: 0.74, nz: 0.55 },
  trachea: { nx: 0.5, ny: 0.79, nz: 0.55 },
  spine: { nx: 0.5, ny: 0.62, nz: 0.45 },
  spinal_cord: { nx: 0.5, ny: 0.62, nz: 0.45 },
  liver: { nx: 0.42, ny: 0.56, nz: 0.55 },
  pancreas: { nx: 0.5, ny: 0.52, nz: 0.55 },
  stomach: { nx: 0.48, ny: 0.54, nz: 0.55 },
  intestine: { nx: 0.5, ny: 0.42, nz: 0.55 },
  knee_left: { nx: 0.58, ny: 0.2, nz: 0.55 },
  knee_right: { nx: 0.42, ny: 0.2, nz: 0.55 },
};

const HumanModel = ({
  onPointerDown,
  modelRef,
  position,
}: {
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  modelRef: React.MutableRefObject<Group | null>;
  position?: [number, number, number];
}) => {
  const { scene } = useGLTF(MODEL_URL);
  const bodyGroupRef = useRef<Group | null>(null);
  const gazeGroupRef = useRef<Group | null>(null);
  const gazeRotationRef = useRef(new Vector3(0, 0, 0));
  const bodyRotationRef = useRef(new Vector3(0, 0, 0));

  useFrame(({ mouse }, delta) => {
    if (!bodyGroupRef.current || !gazeGroupRef.current) {
      return;
    }

    const targetGaze = new Vector3(
      -mouse.y * GAZE_MAX_PITCH,
      mouse.x * GAZE_MAX_YAW,
      0,
    );
    const targetBody = new Vector3(
      -mouse.y * BODY_MAX_PITCH,
      mouse.x * BODY_MAX_YAW,
      0,
    );

    const gazeAlpha = 1 - Math.exp(-delta * GAZE_LERP_SPEED);
    const bodyAlpha = 1 - Math.exp(-delta * BODY_LERP_SPEED);
    gazeRotationRef.current.lerp(targetGaze, gazeAlpha);
    bodyRotationRef.current.lerp(targetBody, bodyAlpha);

    bodyGroupRef.current.rotation.set(
      bodyRotationRef.current.x,
      bodyRotationRef.current.y,
      bodyRotationRef.current.z,
    );
    gazeGroupRef.current.rotation.set(
      gazeRotationRef.current.x - bodyRotationRef.current.x,
      gazeRotationRef.current.y - bodyRotationRef.current.y,
      0,
    );
  });

  return (
    <group ref={bodyGroupRef} position={position}>
      <group ref={gazeGroupRef}>
        <primitive
          ref={modelRef}
          object={scene}
          position={[0, NECK_PIVOT_OFFSET_Y, 0]}
          onPointerDown={onPointerDown}
        />
      </group>
    </group>
  );
};

useGLTF.preload(MODEL_URL);
useGLTF.preload(ORGAN_MODELS.aorta);
useGLTF.preload(ORGAN_MODELS.brain);
useGLTF.preload(ORGAN_MODELS.bronchus);
useGLTF.preload(ORGAN_MODELS.heart);
useGLTF.preload(ORGAN_MODELS.shoulder);
useGLTF.preload(ORGAN_MODELS.stomach);
useGLTF.preload(ORGAN_MODELS.intestine);
useGLTF.preload(ORGAN_MODELS.knee);
useGLTF.preload(ORGAN_MODELS.liver);
useGLTF.preload(ORGAN_MODELS.lung);
useGLTF.preload(ORGAN_MODELS.pancreas);
useGLTF.preload(ORGAN_MODELS.spinal);
useGLTF.preload(ORGAN_MODELS.vertebra);

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
  const scaleMultiplier = ORGAN_SCALE_MULTIPLIER[organKey] ?? 1;
  const baseScale = useMemo(() => {
    const bounds = new Box3().setFromObject(clonedScene);
    const size = bounds.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim <= 0) {
      return 1;
    }
    return (ORGAN_TARGET_SIZE / maxDim) * scaleMultiplier;
  }, [clonedScene, scaleMultiplier]);

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
              depthTest?: boolean;
              depthWrite?: boolean;
            };
            if ("emissive" in target) {
              target.emissive = new Color(0x000000);
              target.emissiveIntensity = 0;
            }
            target.transparent = true;
            target.opacity = 0;
            target.depthTest = false;
            target.depthWrite = false;
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

type NormalizedRange = {
  storeKey: BodyPartKey;
  organKey: OrganKey;
  min: { nx: number; ny: number; nz: number };
  max: { nx: number; ny: number; nz: number };
  center?: { nx: number; ny: number; nz: number };
};

const BODY_PART_RANGES: NormalizedRange[] = [
  {
    storeKey: "brain",
    organKey: "brain",
    min: { nx: 0.32, ny: 0.84, nz: 0.35 },
    max: { nx: 0.68, ny: 1, nz: 0.8 },
    center: { nx: 0.5, ny: 0.9, nz: 0.55 },
  },
  {
    storeKey: "trachea",
    organKey: "bronchus",
    min: { nx: 0.47, ny: 0.76, nz: 0.3 },
    max: { nx: 0.53, ny: 0.88, nz: 0.6 },
    center: { nx: 0.5, ny: 0.79, nz: 0.55 },
  },
  {
    storeKey: "aorta",
    organKey: "aorta",
    min: { nx: 0.46, ny: 0.72, nz: 0.5 },
    max: { nx: 0.54, ny: 0.82, nz: 0.78 },
    center: { nx: 0.5, ny: 0.79, nz: 0.55 },
  },
  {
    storeKey: "heart",
    organKey: "heart",
    min: { nx: 0.44, ny: 0.62, nz: 0.5 },
    max: { nx: 0.56, ny: 0.74, nz: 0.8 },
    center: { nx: 0.5, ny: 0.73, nz: 0.55 },
  },
  {
    storeKey: "shoulder_left",
    organKey: "shoulder",
    min: { nx: 0.58, ny: 0.78, nz: 0.35 },
    max: { nx: 0.86, ny: 0.92, nz: 0.7 },
    center: { nx: 0.62, ny: 0.78, nz: 0.55 },
  },
  {
    storeKey: "shoulder_right",
    organKey: "shoulder",
    min: { nx: 0.14, ny: 0.78, nz: 0.35 },
    max: { nx: 0.42, ny: 0.92, nz: 0.7 },
    center: { nx: 0.38, ny: 0.78, nz: 0.55 },
  },
  {
    storeKey: "lung",
    organKey: "lung",
    min: { nx: 0.56, ny: 0.64, nz: 0.45 },
    max: { nx: 0.78, ny: 0.82, nz: 0.85 },
    center: { nx: 0.58, ny: 0.74, nz: 0.55 },
  },
  {
    storeKey: "lung",
    organKey: "lung",
    min: { nx: 0.22, ny: 0.64, nz: 0.45 },
    max: { nx: 0.44, ny: 0.82, nz: 0.85 },
    center: { nx: 0.42, ny: 0.74, nz: 0.55 },
  },
  {
    storeKey: "spinal_cord",
    organKey: "spinal",
    min: { nx: 0.47, ny: 0.3, nz: 0.05 },
    max: { nx: 0.53, ny: 0.86, nz: 0.45 },
    center: { nx: 0.5, ny: 0.62, nz: 0.45 },
  },
  {
    storeKey: "spine",
    organKey: "vertebra",
    min: { nx: 0.46, ny: 0.3, nz: 0.45 },
    max: { nx: 0.54, ny: 0.7, nz: 0.8 },
    center: { nx: 0.5, ny: 0.62, nz: 0.45 },
  },
  {
    storeKey: "liver",
    organKey: "liver",
    min: { nx: 0.28, ny: 0.48, nz: 0.45 },
    max: { nx: 0.46, ny: 0.64, nz: 0.82 },
    center: { nx: 0.42, ny: 0.56, nz: 0.55 },
  },
  {
    storeKey: "stomach",
    organKey: "stomach",
    min: { nx: 0.42, ny: 0.5, nz: 0.45 },
    max: { nx: 0.52, ny: 0.64, nz: 0.82 },
    center: { nx: 0.48, ny: 0.54, nz: 0.55 },
  },
  {
    storeKey: "pancreas",
    organKey: "pancreas",
    min: { nx: 0.48, ny: 0.46, nz: 0.45 },
    max: { nx: 0.56, ny: 0.58, nz: 0.82 },
    center: { nx: 0.5, ny: 0.52, nz: 0.55 },
  },
  {
    storeKey: "intestine",
    organKey: "intestine",
    min: { nx: 0.44, ny: 0.36, nz: 0.45 },
    max: { nx: 0.74, ny: 0.5, nz: 0.82 },
    center: { nx: 0.5, ny: 0.5, nz: 0.55 },
  },
  {
    storeKey: "knee_left",
    organKey: "knee",
    min: { nx: 0.54, ny: 0.16, nz: 0.4 },
    max: { nx: 0.7, ny: 0.28, nz: 0.8 },
    center: { nx: 0.58, ny: 0.2, nz: 0.55 },
  },
  {
    storeKey: "knee_right",
    organKey: "knee",
    min: { nx: 0.3, ny: 0.16, nz: 0.4 },
    max: { nx: 0.46, ny: 0.28, nz: 0.8 },
    center: { nx: 0.42, ny: 0.2, nz: 0.55 },
  },
];

const getRangeCenterNormalized = (range: NormalizedRange) => {
  if (range.center) {
    return range.center;
  }
  return {
    nx: (range.min.nx + range.max.nx) / 2,
    ny: (range.min.ny + range.max.ny) / 2,
    nz: (range.min.nz + range.max.nz) / 2,
  };
};

const getWorldPointFromNormalized = (
  bounds: Box3,
  normalized: { nx: number; ny: number; nz: number },
) => {
  const size = bounds.getSize(new Vector3());
  return new Vector3(
    bounds.min.x + size.x * normalized.nx,
    bounds.min.y + size.y * normalized.ny,
    bounds.min.z + size.z * normalized.nz,
  );
};

const getNormalizedCenterForPart = (part: BodyPartKey) => {
  const ranges = BODY_PART_RANGES.filter((item) => item.storeKey === part);
  if (ranges.length === 1) {
    return getRangeCenterNormalized(ranges[0]);
  }
  if (ranges.length > 1) {
    const totals = ranges.reduce(
      (acc, item) => {
        const center = getRangeCenterNormalized(item);
        return {
          nx: acc.nx + center.nx,
          ny: acc.ny + center.ny,
          nz: acc.nz + center.nz,
        };
      },
      { nx: 0, ny: 0, nz: 0 },
    );
    return {
      nx: totals.nx / ranges.length,
      ny: totals.ny / ranges.length,
      nz: totals.nz / ranges.length,
    };
  }
  return BODY_PART_ANCHOR[part] ?? null;
};

const getOrganFromPoint = (
  point: Vector3,
  bounds: Box3,
): { organKey: OrganKey; storeKey: BodyPartKey; centerWorld: Vector3 } | null => {
  const size = bounds.getSize(new Vector3());
  if (size.x === 0 || size.y === 0 || size.z === 0) {
    return null;
  }

  const nx = (point.x - bounds.min.x) / size.x;
  const ny = (point.y - bounds.min.y) / size.y;
  const nz = (point.z - bounds.min.z) / size.z;

  for (const range of BODY_PART_RANGES) {
    if (
      nx < range.min.nx ||
      nx > range.max.nx ||
      ny < range.min.ny ||
      ny > range.max.ny ||
      nz < range.min.nz ||
      nz > range.max.nz
    ) {
      continue;
    }
    const center = getRangeCenterNormalized(range);
    const centerWorld = getWorldPointFromNormalized(bounds, center);
    return {
      organKey: range.organKey,
      storeKey: range.storeKey,
      centerWorld,
    };
  }

  return null;
};

const DebugRanges = ({ bounds }: { bounds: Box3 | null }) => {
  if (!bounds) {
    return null;
  }
  const size = bounds.getSize(new Vector3());
  const base = bounds.min.clone();

  return (
    <group>
      {BODY_PART_RANGES.map((range, index) => {
        const center = getRangeCenterNormalized(range);
        const boxCenter = new Vector3(
          base.x + size.x * ((range.min.nx + range.max.nx) / 2),
          base.y + size.y * ((range.min.ny + range.max.ny) / 2),
          base.z + size.z * ((range.min.nz + range.max.nz) / 2),
        );
        const boxSize = new Vector3(
          size.x * (range.max.nx - range.min.nx),
          size.y * (range.max.ny - range.min.ny),
          size.z * (range.max.nz - range.min.nz),
        );
        const centerWorld = new Vector3(
          base.x + size.x * center.nx,
          base.y + size.y * center.ny,
          base.z + size.z * center.nz,
        );

        return (
          <group key={`${range.storeKey}-${index}`}>
            <mesh position={boxCenter} raycast={() => {}}>
              <boxGeometry args={[boxSize.x, boxSize.y, boxSize.z]} />
              <meshBasicMaterial
                color={DEBUG_BOX_COLOR}
                opacity={DEBUG_BOX_OPACITY}
                transparent
                wireframe
                depthWrite={false}
              />
            </mesh>
            <mesh position={centerWorld} raycast={() => {}}>
              <sphereGeometry args={[DEBUG_CENTER_SIZE, 16, 16]} />
              <meshBasicMaterial
                color={FOCUS_COLOR}
                opacity={0.9}
                transparent
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
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
  const [modelBounds, setModelBounds] = useState<Box3 | null>(null);
  const [focusPoint, setFocusPoint] = useState<Vector3 | null>(null);
  const [activeOrgan, setActiveOrgan] = useState<{
    key: OrganKey;
    position: [number, number, number];
  } | null>(null);
  const bodyOffsetX = 0;

  const clearFocus = useCallback((resetCameraView = false) => {
    setFocusPoint(null);
    setActiveOrgan(null);
    if (resetCameraView) {
      targetPositionRef.current = new Vector3(...DEFAULT_CAMERA.position);
      targetLookAtRef.current = new Vector3(...DEFAULT_CAMERA.lookAt);
      return;
    }
    targetPositionRef.current = null;
    targetLookAtRef.current = null;
  }, []);

  const updateModelBounds = useCallback(() => {
    if (!modelRef.current) {
      return;
    }
    const bounds = new Box3().setFromObject(modelRef.current);
    modelBoundsRef.current = bounds;
    setModelBounds(bounds);
  }, []);

  useEffect(() => {
    updateModelBounds();
  }, [bodyOffsetX, updateModelBounds]);

  useEffect(() => {
    if (!selectedBodyPart) {
      setActiveOrgan(null);
      return;
    }

    if (selectedBodyPart === "skin") {
      clearFocus(true);
      return;
    }

    const organKey = BODY_PART_TO_ORGAN_KEY[selectedBodyPart];
    if (!organKey) {
      setActiveOrgan(null);
      return;
    }

    const model = modelRef.current;
    if (!model) {
      return;
    }
    const bounds = modelBoundsRef.current ?? new Box3().setFromObject(model);
    modelBoundsRef.current = bounds;
    const center = getNormalizedCenterForPart(selectedBodyPart);
    if (!center) {
      setActiveOrgan(null);
      return;
    }
    const centerWorld = getWorldPointFromNormalized(bounds, center);
    const basePosition = centerWorld.clone().add(
      new Vector3(
        ORGAN_FALLBACK_OFFSET[0],
        ORGAN_FALLBACK_OFFSET[1],
        ORGAN_FALLBACK_OFFSET[2],
      ),
    );
    const organPosition = basePosition.clone();
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) {
        direction.set(0, 0, 1);
      }
      direction.normalize();
      const offsetMultiplier = ORGAN_CAMERA_OFFSET_MULTIPLIER[organKey] ?? 1;
      organPosition.add(
        direction.multiplyScalar(ORGAN_CAMERA_OFFSET * offsetMultiplier),
      );
    }
    setActiveOrgan({
      key: organKey,
      position: [organPosition.x, organPosition.y, organPosition.z],
    });
    if (camera && controls) {
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) {
        direction.set(0, 0, 1);
      }
      direction.normalize();
      const focusOffset = getFocusOffset(selectedBodyPart);
      const distanceMultiplier = CAMERA_DISTANCE_MULTIPLIER[selectedBodyPart] ?? 1;
      const targetPosition = centerWorld
        .clone()
        .add(focusOffset)
        .clone()
        .add(direction.multiplyScalar(FOCUS_DISTANCE * distanceMultiplier));
      const kneeOffset = getKneeCameraOffsetX(selectedBodyPart, BODY_PART_ANCHOR);
      const lateralOffset = getLateralCameraOffsetX(
        selectedBodyPart,
        BODY_PART_ANCHOR,
      );
      const totalOffset = kneeOffset || lateralOffset;
      if (totalOffset) {
        targetPosition.add(new Vector3(totalOffset, 0, 0));
      }
      targetPositionRef.current = targetPosition;
      targetLookAtRef.current = centerWorld.clone().add(focusOffset);
    }
  }, [clearFocus, selectedBodyPart]);

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

    const hit = getOrganFromPoint(event.point, bounds);
    if (!hit) {
      setBodyPart(null);
      clearFocus(true);
      return;
    }

    const centerWorld = hit.centerWorld.clone();
    setFocusPoint(centerWorld);

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
    const offsetMultiplier = ORGAN_CAMERA_OFFSET_MULTIPLIER[hit.organKey] ?? 1;
    const organPosition = centerWorld
      .clone()
      .add(new Vector3(ORGAN_OFFSET_X, 0, 0))
      .add(
        direction
          .clone()
          .multiplyScalar(ORGAN_CAMERA_OFFSET * offsetMultiplier),
      );
    setActiveOrgan({
      key: hit.organKey,
      position: [organPosition.x, organPosition.y, organPosition.z],
    });
    const focusOffset = getFocusOffset(hit.storeKey);
    const distanceMultiplier = CAMERA_DISTANCE_MULTIPLIER[hit.storeKey] ?? 1;
    const targetPosition = centerWorld
      .clone()
      .add(focusOffset)
      .clone()
      .add(direction.multiplyScalar(FOCUS_DISTANCE * distanceMultiplier));
    const kneeOffset = getKneeCameraOffsetX(hit.storeKey, BODY_PART_ANCHOR);
    const lateralOffset = getLateralCameraOffsetX(hit.storeKey, BODY_PART_ANCHOR);
    const totalOffset = kneeOffset || lateralOffset;
    if (totalOffset) {
      targetPosition.add(new Vector3(totalOffset, 0, 0));
    }
    targetPositionRef.current = targetPosition;
    targetLookAtRef.current = centerWorld.clone().add(focusOffset);
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
              <HumanModel
                onPointerDown={handlePointerDown}
                modelRef={modelRef}
                position={[bodyOffsetX, 0, 0]}
              />
            </Suspense>
            {SHOW_DEBUG_RANGES ? <DebugRanges bounds={modelBounds} /> : null}
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
            clearFocus(true);
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
