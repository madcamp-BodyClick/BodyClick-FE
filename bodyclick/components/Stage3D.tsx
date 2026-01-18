"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  Float,
  Center, // [필수] 회전축 교정용
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Box3,
  Vector3,
  MathUtils,
  type Camera,
  type Group,
  Mesh,
  MeshPhysicalMaterial,
  Color,
} from "three";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  DEFAULT_CAMERA,
  SYSTEM_LABELS,
  type BodyPartKey,
  useBodyMapStore,
} from "../store/useBodyMapStore";

// --- Configuration ---
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

const ORGAN_SYSTEM_MAP: Record<OrganKey, string> = {
  heart: "circulatory",
  aorta: "circulatory",
  brain: "nervous",
  spinal: "nervous",
  lung: "respiratory",
  bronchus: "respiratory",
  stomach: "digestive",
  liver: "digestive",
  pancreas: "digestive",
  intestine: "digestive",
  shoulder: "skeletal",
  vertebra: "skeletal",
  knee: "skeletal",
};

const FOCUS_DISTANCE = 2.8;
const CAMERA_LERP_SPEED = 4;
// [수정 4] 장기 클릭 시 화면 정중앙 배치 (Offset 0)
const ORGAN_OFFSET_X = 0.0; 
const ORGAN_TARGET_SIZE = 0.9;
const ORGAN_CAMERA_OFFSET = 0.35;
const KNEE_CAMERA_OFFSET_X = 0.35;
const LATERAL_CAMERA_OFFSET_X = 0.28;
const NECK_PIVOT_OFFSET_Y = 0.18;

// --- Anatomical Calibration ---

const ORGAN_SCALE_MULTIPLIER: Partial<Record<OrganKey, number>> = {
  brain: 1.1,
  heart: 1.3,
  lung: 1.7,
  liver: 1.5,
  stomach: 1.2,
  intestine: 1.4,
  aorta: 1.3,
  bronchus: 1.2,
  vertebra: 1.1,
  shoulder: 1.0,
  knee: 0.9,
  pancreas: 1.0,
  spinal: 1.1,
};

// [수정 2] 초기 등장 위치(Home Position) 교정
// Z값을 0에 가깝게 설정하여 몸 안쪽 중심에서 시작되도록 함
const ORGAN_POSITION_CORRECTIONS: Partial<Record<OrganKey, [number, number, number]>> = {
  brain: [0, 0.48, 0.02],
  lung: [0, 0.18, 0.05],
  heart: [0.03, 0.20, 0.05],
  // 척추/대동맥/기관 등은 몸통 정중앙(Z=0) 근처로 이동
  aorta: [0, 0.1, 0.0],          
  bronchus: [0, 0.25, 0.0],      
  liver: [-0.1, 0.02, 0.05],
  stomach: [0.08, 0.05, 0.02],   
  pancreas: [0, -0.02, -0.02],
  intestine: [0, -0.22, 0.02],   
  vertebra: [0, 0, 0.0],         
  spinal: [0, 0.25, 0.0],        
  // 어깨: 왼쪽으로 확실히 이동
  shoulder: [0.25, 0.3, 0.0],    
  knee: [0.1, -0.65, 0.05],
};

// --- Mappings ---
const BODY_PART_TO_ORGAN_KEY: Partial<Record<BodyPartKey, OrganKey>> = {
  heart: "heart",
  aorta: "aorta",
  lung: "lung",
  shoulder: "shoulder", 
  trachea: "bronchus",
  brain: "brain",
  spine: "vertebra",
  spinal_cord: "spinal",
  stomach: "stomach",
  liver: "liver",
  pancreas: "pancreas",
  intestine: "intestine",
  knee: "knee",
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
    shoulder: { x: 0.25, y: 0.3, z: 0 }, // 어깨 포커스도 왼쪽으로
  };

const CAMERA_DISTANCE_MULTIPLIER: Partial<Record<BodyPartKey, number>> = {
  spinal_cord: 1.2,
  spine: 1.1,
  aorta: 1.25,
  trachea: 1.5,
  stomach: 1.05,
  shoulder: 1.05,
};

const BODY_PART_ANCHOR: Partial<
  Record<BodyPartKey, { nx: number; ny: number; nz: number }>
> = {
  brain: { nx: 0.5, ny: 0.9, nz: 0.55 },
  // [수정 1] 어깨 앵커를 왼쪽(0.75)으로 이동
  shoulder: { nx: 0.75, ny: 0.78, nz: 0.55 }, 
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
  knee: { nx: 0.6, ny: 0.2, nz: 0.55 },
};

// --- Helper Functions ---
const getKneeCameraOffsetX = (
  part: BodyPartKey | null,
  anchors: Partial<Record<BodyPartKey, { nx: number }>>,
) => {
  if (part !== "knee") return 0;
  const anchor = anchors[part];
  if (!anchor) return 0;
  if (Math.abs(anchor.nx - 0.5) < 0.05) return 0;
  return anchor.nx < 0.5 ? -KNEE_CAMERA_OFFSET_X : KNEE_CAMERA_OFFSET_X;
};

const getLateralCameraOffsetX = (
  part: BodyPartKey | null,
  anchors: Partial<Record<BodyPartKey, { nx: number }>>,
) => {
  if (!part) return 0;
  const anchor = anchors[part];
  if (!anchor) return 0;
  const lateral = Math.abs(anchor.nx - 0.5);
  if (lateral < 0.08) return 0;
  return anchor.nx < 0.5 ? -LATERAL_CAMERA_OFFSET_X : LATERAL_CAMERA_OFFSET_X;
};

const getFocusOffset = (part: BodyPartKey | null) => {
  if (!part) return new Vector3(0, 0, 0);
  const offset = CAMERA_FOCUS_OFFSET[part];
  if (!offset) return new Vector3(0, 0, 0);
  return new Vector3(offset.x, offset.y, offset.z);
};

// --- 3D Components ---

const HumanModel = ({
  onPointerDown,
  modelRef,
  bodyGroupRef,
  position,
  onLoaded,
}: {
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  modelRef: React.MutableRefObject<Group | null>;
  bodyGroupRef: React.MutableRefObject<Group | null>;
  position?: [number, number, number];
  onLoaded: () => void;
}) => {
  const { scene } = useGLTF(MODEL_URL);

  useLayoutEffect(() => {
    if (!scene) return;
    
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.material = new MeshPhysicalMaterial({
          roughness: 0.1,        
          transmission: 1.0,     // 투명 유리
          thickness: 0.5,        
          ior: 1.5,              
          clearcoat: 1.0,        
          color: new Color("#ffffff"),
          transparent: true,
          opacity: 0.25,         
          depthWrite: false,     
        });
      }
    });

    onLoaded();
    
  }, [scene, onLoaded]);

  return (
    <group ref={bodyGroupRef} position={position}>
      <group>
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

const OrganModel = ({
  organKey,
  isActive,
  startPosition,
  targetPosition,
}: {
  organKey: OrganKey;
  isActive: boolean;
  startPosition: [number, number, number];
  targetPosition?: [number, number, number];
}) => {
  const { scene } = useGLTF(ORGAN_MODELS[organKey]);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);
  
  const currentPos = useRef(new Vector3(...startPosition));
  const scaleMultiplier = ORGAN_SCALE_MULTIPLIER[organKey] ?? 1;
  
  const targetScale = useMemo(() => {
    const bounds = new Box3().setFromObject(clonedScene);
    const size = bounds.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return maxDim > 0 ? (ORGAN_TARGET_SIZE / maxDim) * scaleMultiplier : 1;
  }, [clonedScene, scaleMultiplier]);

  useEffect(() => {
    if (!isActive && groupRef.current) {
        currentPos.current.set(...startPosition);
        groupRef.current.position.set(...startPosition);
    }
  }, [startPosition, isActive]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    const targetVec = (isActive && targetPosition) 
        ? new Vector3(...targetPosition) 
        : new Vector3(...startPosition);

    currentPos.current.lerp(targetVec, delta * 5);
    groupRef.current.position.copy(currentPos.current);

    const insideScale = targetScale * 0.85; 
    const activeTargetScale = isActive ? targetScale : insideScale;
    
    const currentS = groupRef.current.scale.x;
    const nextS = MathUtils.damp(currentS, activeTargetScale, 4, delta);
    groupRef.current.scale.setScalar(nextS);
    
    const t = clock.getElapsedTime();
    const offset = organKey.length; 
    
    if (isActive) {
        // [수정 3] 회전 범위 축소 (0.5 -> 0.05) & 속도 조절
        groupRef.current.rotation.y += delta * 0.2;
        // 약간의 부유 효과 추가
        groupRef.current.position.y += Math.sin(t * 1.5) * 0.0005; 
    } else {
        groupRef.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.05;
    }
  });

  return (
    <Float 
        speed={isActive ? 2 : 1} 
        rotationIntensity={isActive ? 0.1 : 0.05} 
        floatIntensity={isActive ? 0.1 : 0.05}
    >
      <group ref={groupRef}>
        {/* [수정 3] Center로 회전축을 모델 중심으로 강제 정렬 */}
        <Center>
          <primitive object={clonedScene} />
        </Center>
      </group>
    </Float>
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
  });

  return null;
};

// --- Ranges Logic ---
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
    storeKey: "shoulder",
    organKey: "shoulder",
    min: { nx: 0.58, ny: 0.78, nz: 0.35 },
    max: { nx: 0.86, ny: 0.92, nz: 0.7 },
    center: { nx: 0.75, ny: 0.78, nz: 0.55 }, // 앵커 왼쪽
  },
  {
    storeKey: "lung",
    organKey: "lung",
    min: { nx: 0.22, ny: 0.64, nz: 0.45 },
    max: { nx: 0.78, ny: 0.82, nz: 0.85 },
    center: { nx: 0.5, ny: 0.74, nz: 0.55 },
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
    storeKey: "knee",
    organKey: "knee",
    min: { nx: 0.3, ny: 0.16, nz: 0.4 },
    max: { nx: 0.7, ny: 0.28, nz: 0.8 },
    center: { nx: 0.6, ny: 0.2, nz: 0.55 },
  },
];

const getRangeCenterNormalized = (range: NormalizedRange) => {
  if (range.center) return range.center;
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
  if (size.x === 0 || size.y === 0 || size.z === 0) return null;

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

// --- Main Stage3D Component ---

const Stage3D = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  const setSystem = useBodyMapStore((state) => state.setSystem);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const targetPositionRef = useRef<Vector3 | null>(null);
  const targetLookAtRef = useRef<Vector3 | null>(null);
  const bodyGroupRef = useRef<Group | null>(null);
  const modelRef = useRef<Group | null>(null);
  const modelBoundsRef = useRef<Box3 | null>(null);
  const [modelBounds, setModelBounds] = useState<Box3 | null>(null);
  
  const [organHomePositions, setOrganHomePositions] = useState<Record<OrganKey, [number, number, number]> | null>(null);
  const [activeOrganData, setActiveOrganData] = useState<{
    key: OrganKey;
    targetPosition: [number, number, number];
  } | null>(null);
  
  const bodyOffsetX = 0;

  const clearFocus = useCallback((resetCameraView = false) => {
    setActiveOrganData(null);
    if (resetCameraView) {
      targetPositionRef.current = new Vector3(...DEFAULT_CAMERA.position);
      targetLookAtRef.current = new Vector3(...DEFAULT_CAMERA.lookAt);
      return;
    }
    targetPositionRef.current = null;
    targetLookAtRef.current = null;
  }, []);

  const handleModelLoaded = useCallback(() => {
    if (!modelRef.current) return;
    const bounds = new Box3().setFromObject(modelRef.current);
    modelBoundsRef.current = bounds;
    setModelBounds(bounds);

    const positions: Partial<Record<OrganKey, [number, number, number]>> = {};
    (Object.entries(BODY_PART_TO_ORGAN_KEY) as [BodyPartKey, OrganKey][]).forEach(([bodyPart, organKey]) => {
        const center = getNormalizedCenterForPart(bodyPart);
        if (center) {
            const centerWorld = getWorldPointFromNormalized(bounds, center);
            const correction = ORGAN_POSITION_CORRECTIONS[organKey] || [0, 0, 0];
            const finalPos = centerWorld.clone().add(new Vector3(...correction));
            positions[organKey] = [finalPos.x, finalPos.y, finalPos.z];
        }
    });
    setOrganHomePositions(positions as Record<OrganKey, [number, number, number]>);
  }, []);

  useEffect(() => {
    if (modelRef.current) {
        handleModelLoaded();
    }
  }, [bodyOffsetX, handleModelLoaded]);

  useEffect(() => {
    if (!selectedBodyPart) {
      setActiveOrganData(null);
      return;
    }

    if (selectedBodyPart === "skin") {
      clearFocus(true);
      return;
    }

    const organKey = BODY_PART_TO_ORGAN_KEY[selectedBodyPart];
    if (!organKey) {
      setActiveOrganData(null);
      return;
    }

    const model = modelRef.current;
    if (!model) return;
    const bounds = modelBoundsRef.current ?? new Box3().setFromObject(model);
    modelBoundsRef.current = bounds;
    const center = getNormalizedCenterForPart(selectedBodyPart);
    if (!center) {
      setActiveOrganData(null);
      return;
    }
    const centerWorld = getWorldPointFromNormalized(bounds, center);
    
    // [수정 4] 장기 화면 정중앙 배치 (Offset 0)
    const targetOrganPosition = centerWorld.clone();
    
    // 포커스 오프셋 적용
    const focusOffset = getFocusOffset(selectedBodyPart);
    targetOrganPosition.add(focusOffset);

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) direction.set(0, 0, 1);
      direction.normalize();
      const offsetMultiplier = ORGAN_CAMERA_OFFSET_MULTIPLIER[organKey] ?? 1;
      targetOrganPosition.add(
        direction.multiplyScalar(ORGAN_CAMERA_OFFSET * offsetMultiplier),
      );
    }

    setActiveOrganData({
      key: organKey,
      targetPosition: [targetOrganPosition.x, targetOrganPosition.y, targetOrganPosition.z],
    });

    if (camera && controls) {
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) direction.set(0, 0, 1);
      direction.normalize();
      
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
    if (!model) return;
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
    const partSystem = BODY_PART_LOOKUP[hit.storeKey]?.system;
    if (partSystem && selectedSystem !== partSystem) {
      setSystem(partSystem);
    }
    setBodyPart(hit.storeKey);

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 0.0001) direction.set(0, 0, 1);
    direction.normalize();
    const offsetMultiplier = ORGAN_CAMERA_OFFSET_MULTIPLIER[hit.organKey] ?? 1;
    
    // [수정 4] 클릭 시에도 정중앙 배치
    const focusOffset = getFocusOffset(hit.storeKey);
    const targetOrganPosition = centerWorld.clone().add(focusOffset);
    targetOrganPosition.add(
        direction.multiplyScalar(ORGAN_CAMERA_OFFSET * offsetMultiplier)
    );
      
    setActiveOrganData({
      key: hit.organKey,
      targetPosition: [targetOrganPosition.x, targetOrganPosition.y, targetOrganPosition.z],
    });

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
  const barWidth = parts.length <= 1 ? 180 : parts.length <= 3 ? 300 : 480;

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
            shadows
          >
            <Environment preset="city" blur={0.6} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 5]} intensity={1.5} />
            
            <Suspense fallback={null}>
              <HumanModel
                onPointerDown={handlePointerDown}
                modelRef={modelRef}
                bodyGroupRef={bodyGroupRef}
                position={[bodyOffsetX, 0, 0]}
                onLoaded={handleModelLoaded}
              />
            </Suspense>
            
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
            
            <Suspense fallback={null}>
               {Object.keys(ORGAN_MODELS).map((key) => {
                  const oKey = key as OrganKey;
                  if (!organHomePositions || !organHomePositions[oKey]) return null;

                  const isActive = activeOrganData?.key === oKey;
                  const homePos = organHomePositions[oKey];
                  const targetPos = isActive ? activeOrganData.targetPosition : undefined;

                  if (!isActive) {
                      if (!selectedSystem) return null;
                      if (ORGAN_SYSTEM_MAP[oKey] !== selectedSystem) return null;
                  }

                  return (
                    <OrganModel
                      key={oKey}
                      organKey={oKey}
                      isActive={isActive}
                      startPosition={homePos}
                      targetPosition={targetPos}
                    />
                  );
               })}
            </Suspense>
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

// Preload assets
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