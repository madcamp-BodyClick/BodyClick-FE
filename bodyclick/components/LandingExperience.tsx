"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Box3,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";
import { useGLTF } from "@react-three/drei";

const HUMAN_URL = "/models/human.glb";
const ORGAN_URLS = {
  heart: "/models/heart.glb",
  lung: "/models/lung.glb",
  brain: "/models/brain.glb",
};

const TARGET_HEIGHT = 2.15;
const GAZE_MAX_PITCH = 0.18;
const GAZE_MAX_YAW = 0.25;
const BODY_MAX_PITCH = 0.08;
const BODY_MAX_YAW = 0.12;
const GAZE_LERP_SPEED = 8;
const BODY_LERP_SPEED = 2.6;
const MAX_DELTA = 0.05;
const IDLE_THRESHOLD = 1.35;
const POINTER_RETURN_WINDOW = 1.4;
const POINTER_DAMPING = 6;
const INTERACTION_BLEND_SPEED = 2.4;
const HINT_DELAY = 900;
const HEART_PULSE_SCALE = 0.08;
const HEART_BASE_EMISSIVE = 0.18;
const HEART_PULSE_EMISSIVE = 0.9;
const HEART_BEAT_INTERVAL = 1.15;
const CAMERA_PADDING = 0.62;
const CAMERA_DRIFT_X = 0.22;
const CAMERA_DRIFT_Y = 0.14;
const CAMERA_DRIFT_DAMPING = 1.7;
const INTRO_DURATION = 1.6;
const INTRO_SCALE_START = 0.38;
const INTRO_SCALE_END = 2.6;
const INTRO_RISE_MULTIPLIER = 1.2;
const DUST_COUNT = 180;
const DUST_RADIUS = 6;
const PORTAL_DELAY = 5200;
const PORTAL_FADE_DURATION = 900;
const PORTAL_ROUTE = "/explore";

type ModelTransform = {
  center: Vector3;
  scale: number;
};

type PointerState = {
  x: number;
  y: number;
};

type BeatState = {
  origin: number;
  lastIndex: number;
  lastBeatAt: number;
  interval: number;
};

const ORGAN_ANCHORS = {
  heart: { nx: 0.5, ny: 0.73, nz: 0.55 },
  lung: { nx: 0.5, ny: 0.74, nz: 0.55 },
  brain: { nx: 0.5, ny: 0.9, nz: 0.55 },
};

const ORGAN_TARGET_SIZES = {
  heart: TARGET_HEIGHT * 0.18,
  lung: TARGET_HEIGHT * 0.32,
  brain: TARGET_HEIGHT * 0.22,
};

const heartbeatEnvelope = (t: number) => {
  const primary = Math.exp(-Math.pow((t - 0.04) / 0.06, 2));
  const secondary = Math.exp(-Math.pow((t - 0.22) / 0.08, 2));
  return Math.min(1, primary + secondary * 0.65);
};

const sanitizePointer = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return MathUtils.clamp(value, -1, 1);
};

const computeTransform = (bounds: Box3): ModelTransform => {
  const size = bounds.getSize(new Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) {
    return { center: new Vector3(), scale: 1 };
  }
  const center = bounds.getCenter(new Vector3());
  const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
  return { center, scale };
};

const applyTransform = (scene: Group, transform: ModelTransform) => {
  scene.position.sub(transform.center);
  scene.scale.setScalar(transform.scale);
};

const applyShellMaterial = (scene: Group, opacity: number) => {
  scene.traverse((child) => {
    if (!(child as Mesh).isMesh) {
      return;
    }
    const mesh = child as Mesh;
    mesh.renderOrder = 3;
    mesh.raycast = () => null;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const mat = material as MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = opacity;
      mat.depthWrite = false;
    });
  });
};

const applyOrganMaterial = (
  scene: Group,
  color: string,
  emissive?: string,
  materialsRef?: React.MutableRefObject<MeshStandardMaterial[]>,
) => {
  const collected: MeshStandardMaterial[] = [];
  scene.traverse((child) => {
    if (!(child as Mesh).isMesh) {
      return;
    }
    const mesh = child as Mesh;
    mesh.renderOrder = 2;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const mat = material as MeshStandardMaterial;
      mat.color = new Color(color);
      if ("emissive" in mat && emissive) {
        mat.emissive = new Color(emissive);
      }
      collected.push(mat);
    });
  });
  if (materialsRef) {
    materialsRef.current = collected;
  }
};

class SceneBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const DustField = () => {
  const groupRef = useRef<Group | null>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i += 1) {
      array[i * 3] = MathUtils.randFloatSpread(DUST_RADIUS * 2);
      array[i * 3 + 1] = MathUtils.randFloatSpread(DUST_RADIUS * 1.4);
      array[i * 3 + 2] = MathUtils.randFloatSpread(DUST_RADIUS * 2);
    }
    return array;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return;
    }
    groupRef.current.rotation.y += delta * 0.04;
    groupRef.current.rotation.x += delta * 0.02;
  });

  return (
    <group ref={groupRef} position={[0, 0.6, -1]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#89aeb7"
          size={0.02}
          opacity={0.35}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const OrganModel = ({
  url,
  position,
  targetSize,
  groupRef,
  materialsRef,
  color,
  emissive,
  onPointerDown,
}: {
  url: string;
  position: Vector3 | null;
  targetSize: number;
  groupRef?: React.MutableRefObject<Group | null>;
  materialsRef?: React.MutableRefObject<MeshStandardMaterial[]>;
  color: string;
  emissive?: string;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}) => {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  const localGroupRef = useRef<Group | null>(null);
  const targetGroupRef = groupRef ?? localGroupRef;
  const appliedRef = useRef(false);
  const positionedRef = useRef(false);

  useLayoutEffect(() => {
    if (appliedRef.current) {
      return;
    }
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.position.sub(center);
    model.scale.setScalar(targetSize / maxDim);
    applyOrganMaterial(model, color, emissive, materialsRef);
    appliedRef.current = true;
  }, [model, targetSize, color, emissive, materialsRef]);

  useLayoutEffect(() => {
    if (!position || !targetGroupRef.current) return;
    targetGroupRef.current.position.copy(position);
  }, [position, targetGroupRef]);  

  return (
    <group ref={targetGroupRef} onPointerDown={onPointerDown}>
      <primitive object={model} />
    </group>
  );
};

const HumanShell = ({
  transform,
  opacity,
}: {
  transform: ModelTransform | null;
  opacity: number;
}) => {
  const { scene } = useGLTF(HUMAN_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const appliedRef = useRef(false);

  useLayoutEffect(() => {
    if (!transform || appliedRef.current) {
      return;
    }
    applyTransform(model, transform);
    applyShellMaterial(model, opacity);
    appliedRef.current = true;
  }, [model, transform, opacity]);

  return <primitive object={model} />;
};

const Scene = ({
  pointerRef,
  lastPointerEventRef,
  lastInteractionRef,
  interactionStartedRef,
  beatStateRef,
  activityRef,
  triggerBeat,
  heartSelected,
  onHeartSelect,
}: {
  pointerRef: React.MutableRefObject<PointerState>;
  lastPointerEventRef: React.MutableRefObject<number>;
  lastInteractionRef: React.MutableRefObject<number>;
  interactionStartedRef: React.MutableRefObject<boolean>;
  beatStateRef: React.MutableRefObject<BeatState>;
  activityRef: React.MutableRefObject<number>;
  triggerBeat: (volume: number) => void;
  heartSelected: boolean;
  onHeartSelect: (selected: boolean) => void;
}) => {
  const { scene: rawScene } = useGLTF(HUMAN_URL);
  const scene = useMemo(() => rawScene.clone(true), [rawScene]);
  const bounds = useMemo(() => new Box3().setFromObject(scene), [scene]);
  const transform = useMemo(() => computeTransform(bounds), [bounds]);
  const organPositions = useMemo(() => {
    const size = bounds.getSize(new Vector3());
    const isValid =
      Number.isFinite(size.x) &&
      Number.isFinite(size.y) &&
      Number.isFinite(size.z) &&
      size.length() > 0;
    if (!isValid) {
      const zero = new Vector3();
      return { heart: zero, lung: zero, brain: zero };
    }
    const base = bounds.min;
    const toWorld = (anchor: { nx: number; ny: number; nz: number }) => {
      const point = new Vector3(
        base.x + size.x * anchor.nx,
        base.y + size.y * anchor.ny,
        base.z + size.z * anchor.nz,
      );
      return point.sub(transform.center).multiplyScalar(transform.scale);
    };
    return {
      heart: toWorld(ORGAN_ANCHORS.heart),
      lung: toWorld(ORGAN_ANCHORS.lung),
      brain: toWorld(ORGAN_ANCHORS.brain),
    };
  }, [bounds, transform]);
  const bodyGroupRef = useRef<Group | null>(null);
  const gazeGroupRef = useRef<Group | null>(null);
  const heartGroupRef = useRef<Group | null>(null);
  const heartMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const gazeRotationRef = useRef(new Vector3(0, 0, 0));
  const bodyRotationRef = useRef(new Vector3(0, 0, 0));
  const basePulseRef = useRef(0);
  const smoothedPointerRef = useRef<PointerState>({ x: 0, y: 0 });
  const interactionBlendRef = useRef(0);
  const bodyOffsetRef = useRef(0);
  const baseHeightRef = useRef(1);
  const introStartRef = useRef<number | null>(null);
  const introProgressRef = useRef(0);
  const cameraBaseRef = useRef<{ position: Vector3; lookAt: Vector3 } | null>(null);
  const fitSizeRef = useRef(new Vector3());
  const { camera, size } = useThree();

  useEffect(() => {
    introStartRef.current = performance.now() / 1000;
  }, []);

  useLayoutEffect(() => {
    if (!(camera as PerspectiveCamera).isPerspectiveCamera) {
      return;
    }
    const perspective = camera as PerspectiveCamera;
    const sizeVec = bounds.getSize(fitSizeRef.current);
    if (!Number.isFinite(sizeVec.y) || sizeVec.length() <= 0) {
      return;
    }
    const scaledSize = sizeVec.clone().multiplyScalar(transform.scale * INTRO_SCALE_END);
    baseHeightRef.current = scaledSize.y;
    bodyOffsetRef.current = -scaledSize.y * 0.05;

    const halfFovV = MathUtils.degToRad(perspective.fov * 0.5);
    const halfFovH = Math.atan(Math.tan(halfFovV) * perspective.aspect);
    const distanceV = (scaledSize.y * 0.5) / Math.tan(halfFovV);
    const distanceH = (scaledSize.x * 0.5) / Math.tan(halfFovH);
    const distance = Math.max(distanceV, distanceH, scaledSize.z) * CAMERA_PADDING;
    const targetPosition = new Vector3(
      0,
      bodyOffsetRef.current + scaledSize.y * 0.12,
      distance,
    );
    const targetLookAt = new Vector3(0, bodyOffsetRef.current + scaledSize.y * 0.05, 0);

    cameraBaseRef.current = {
      position: targetPosition,
      lookAt: targetLookAt,
    };
    perspective.position.copy(targetPosition);
    perspective.lookAt(targetLookAt);
    perspective.updateProjectionMatrix();
  }, [camera, size.width, size.height, bounds, transform]);

  useFrame(({ clock }, delta) => {
    const safeDelta = Math.min(Math.max(delta, 0), MAX_DELTA);
    const now = performance.now() / 1000;
    if (introStartRef.current === null) {
      introStartRef.current = now;
    }
    const introRaw = MathUtils.clamp(
      (now - introStartRef.current) / INTRO_DURATION,
      0,
      1,
    );
    const introTarget = 1 - Math.pow(1 - introRaw, 3);
    introProgressRef.current = MathUtils.damp(
      introProgressRef.current,
      introTarget,
      2.8,
      safeDelta,
    );

    const rawX = sanitizePointer(pointerRef.current.x);
    const rawY = sanitizePointer(pointerRef.current.y);
    const pointerAge = now - lastPointerEventRef.current;
    const returnFactor = MathUtils.clamp(
      (pointerAge - IDLE_THRESHOLD) / POINTER_RETURN_WINDOW,
      0,
      1,
    );
    const idlePointerX = Math.sin(clock.elapsedTime * 0.35) * 0.14;
    const idlePointerY = Math.cos(clock.elapsedTime * 0.28) * 0.1;
    const userPointerX = MathUtils.lerp(rawX, 0, returnFactor);
    const userPointerY = MathUtils.lerp(rawY, 0, returnFactor);

    interactionBlendRef.current = MathUtils.damp(
      interactionBlendRef.current,
      interactionStartedRef.current ? 1 : 0,
      INTERACTION_BLEND_SPEED,
      safeDelta,
    );

    const targetPointerX = MathUtils.lerp(
      idlePointerX,
      userPointerX,
      interactionBlendRef.current,
    );
    const targetPointerY = MathUtils.lerp(
      idlePointerY,
      userPointerY,
      interactionBlendRef.current,
    );

    smoothedPointerRef.current.x = MathUtils.damp(
      smoothedPointerRef.current.x,
      targetPointerX,
      POINTER_DAMPING,
      safeDelta,
    );
    smoothedPointerRef.current.y = MathUtils.damp(
      smoothedPointerRef.current.y,
      targetPointerY,
      POINTER_DAMPING,
      safeDelta,
    );

    const pointer = smoothedPointerRef.current;
    const targetGaze = new Vector3(
      -pointer.y * GAZE_MAX_PITCH,
      pointer.x * GAZE_MAX_YAW,
      0,
    );
    const targetBody = new Vector3(
      -pointer.y * BODY_MAX_PITCH,
      pointer.x * BODY_MAX_YAW,
      0,
    );

    const gazeAlpha = MathUtils.clamp(
      1 - Math.exp(-safeDelta * GAZE_LERP_SPEED),
      0,
      1,
    );
    const bodyAlpha = MathUtils.clamp(
      1 - Math.exp(-safeDelta * BODY_LERP_SPEED),
      0,
      1,
    );
    gazeRotationRef.current.lerp(targetGaze, gazeAlpha);
    bodyRotationRef.current.lerp(targetBody, bodyAlpha);

    if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.set(
        bodyRotationRef.current.x,
        bodyRotationRef.current.y,
        bodyRotationRef.current.z,
      );
      const introT = introProgressRef.current;
      const baseHeight = Math.max(baseHeightRef.current, 0.001);
      const startYOffset = bodyOffsetRef.current + baseHeight * INTRO_RISE_MULTIPLIER;
      const targetY = MathUtils.lerp(startYOffset, bodyOffsetRef.current, introT);
      const bob =
        Math.sin(clock.elapsedTime * 0.6) * 0.02 * MathUtils.lerp(0.2, 1, introT);
      bodyGroupRef.current.position.y = targetY + bob;
      const introScale = MathUtils.lerp(INTRO_SCALE_START, INTRO_SCALE_END, introT);
      bodyGroupRef.current.scale.setScalar(introScale);
    }

    if (gazeGroupRef.current) {
      gazeGroupRef.current.rotation.set(
        gazeRotationRef.current.x - bodyRotationRef.current.x,
        gazeRotationRef.current.y - bodyRotationRef.current.y,
        0,
      );
    }

    if ((camera as PerspectiveCamera).isPerspectiveCamera && cameraBaseRef.current) {
      const perspective = camera as PerspectiveCamera;
      const base = cameraBaseRef.current;
      const driftX = pointer.x * CAMERA_DRIFT_X;
      const driftY = -pointer.y * CAMERA_DRIFT_Y;
      perspective.position.x = MathUtils.damp(
        perspective.position.x,
        base.position.x + driftX,
        CAMERA_DRIFT_DAMPING,
        safeDelta,
      );
      perspective.position.y = MathUtils.damp(
        perspective.position.y,
        base.position.y + driftY,
        CAMERA_DRIFT_DAMPING,
        safeDelta,
      );
      perspective.lookAt(
        base.lookAt.x + driftX * 0.2,
        base.lookAt.y + driftY * 0.2,
        base.lookAt.z,
      );
    }

    const since = now - lastInteractionRef.current;
    const targetActivity =
      interactionStartedRef.current && since < IDLE_THRESHOLD ? 1 : 0;
    activityRef.current = MathUtils.damp(activityRef.current, targetActivity, 2.2, safeDelta);

    const intensity = MathUtils.clamp(
      activityRef.current * (heartSelected ? 1.25 : 1),
      0,
      1,
    );

    if (interactionStartedRef.current) {
      const beatState = beatStateRef.current;
      if (beatState.origin <= 0 || beatState.origin > now) {
        beatState.origin = now;
        beatState.lastIndex = 0;
        beatState.lastBeatAt = now;
      }
      const beatIndex = Math.max(
        0,
        Math.floor((now - beatState.origin) / beatState.interval),
      );
      if (intensity > 0.05 && beatIndex > beatState.lastIndex) {
        beatState.lastIndex = beatIndex;
        beatState.lastBeatAt = beatState.origin + beatIndex * beatState.interval;
        const volume = Math.min(0.12, 0.015 + intensity * 0.06);
        triggerBeat(heartSelected ? volume + 0.012 : volume);
      }
    }

    const beatProgressRaw =
      beatStateRef.current.lastBeatAt > 0
        ? (now - beatStateRef.current.lastBeatAt) /
          beatStateRef.current.interval
        : 1;
    const pulse = intensity * heartbeatEnvelope(MathUtils.clamp(beatProgressRaw, 0, 1));
    basePulseRef.current = MathUtils.damp(basePulseRef.current, pulse, 6, safeDelta);

    if (heartGroupRef.current) {
      const scale = 1 + basePulseRef.current * HEART_PULSE_SCALE;
      heartGroupRef.current.scale.setScalar(scale);
    }
    heartMaterialsRef.current.forEach((material) => {
      material.emissiveIntensity =
        (heartSelected ? HEART_BASE_EMISSIVE + 0.12 : HEART_BASE_EMISSIVE) +
        basePulseRef.current * HEART_PULSE_EMISSIVE;
    });
  });

  return (
    <>
      <DustField />
      <ambientLight intensity={0.45} color="#c9d4d9" />
      <directionalLight position={[3, 5, 4]} intensity={1.2} color="#f6f2e8" />
      <pointLight position={[-3, 1.5, -2]} intensity={0.65} color="#66cfe0" />
      <pointLight position={[0, -1, 2]} intensity={0.4} color="#f29a8a" />
      <group
        ref={bodyGroupRef}
        position={[0, bodyOffsetRef.current, 0]}
        scale={INTRO_SCALE_START}
      >
        <group>
          <OrganModel
            url={ORGAN_URLS.heart}
            position={organPositions.heart}
            targetSize={ORGAN_TARGET_SIZES.heart}
            groupRef={heartGroupRef}
            materialsRef={heartMaterialsRef}
            color="#b44f4f"
            emissive="#ff6b6b"
            onPointerDown={() => {
              onHeartSelect(!heartSelected);
            }}
          />
          <OrganModel
            url={ORGAN_URLS.lung}
            position={organPositions.lung}
            targetSize={ORGAN_TARGET_SIZES.lung}
            color="#7aa6b5"
            emissive="#5fb7c4"
          />
          <OrganModel
            url={ORGAN_URLS.brain}
            position={organPositions.brain}
            targetSize={ORGAN_TARGET_SIZES.brain}
            color="#b0a0ad"
            emissive="#c9b7d3"
          />
        </group>
        <group ref={gazeGroupRef}>
          <HumanShell transform={transform} opacity={0.18} />
        </group>
      </group>
    </>
  );
};

const MuteIcon = ({ muted }: { muted: boolean }) => {
  return muted ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 9v6h4l5 4V5L8 9H4zm12.5 3 3.5 3.5m0-7L16.5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 9v6h4l5 4V5L8 9H4zm11.2 1.3a4 4 0 0 1 0 3.4m2-5.9a7 7 0 0 1 0 8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const LandingExperience = () => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0 });
  const lastPointerEventRef = useRef(-10);
  const lastInteractionRef = useRef(-10);
  const interactionStartedRef = useRef(false);
  const beatStateRef = useRef<BeatState>({
    origin: 0,
    lastIndex: -1,
    lastBeatAt: 0,
    interval: HEART_BEAT_INTERVAL,
  });
  const activityRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReadyRef = useRef(false);
  const audioFailedRef = useRef(false);
  const portalStartedRef = useRef(false);
  const portalFadeTimerRef = useRef<number | null>(null);
  const portalNavTimerRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showText, setShowText] = useState(false);
  const [heartSelected, setHeartSelected] = useState(false);
  const [interactionStarted, setInteractionStarted] = useState(false);
  const [portalTransitioning, setPortalTransitioning] = useState(false);

  useEffect(() => {
    const audio = new Audio("/heartbeat.mp3");
    audio.preload = "auto";
    audio.volume = 0;
    audio.loop = false;
    const handleReady = () => {
      audioReadyRef.current = true;
    };
    const handleError = () => {
      audioReadyRef.current = false;
      audioFailedRef.current = true;
    };
    audio.addEventListener("canplaythrough", handleReady);
    audio.addEventListener("error", handleError);
    audioRef.current = audio;
    return () => {
      audio.removeEventListener("canplaythrough", handleReady);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!interactionStartedRef.current) {
        setShowHint(true);
      }
    }, HINT_DELAY);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowText(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (portalFadeTimerRef.current) {
        window.clearTimeout(portalFadeTimerRef.current);
      }
      if (portalNavTimerRef.current) {
        window.clearTimeout(portalNavTimerRef.current);
      }
    };
  }, []);

  const triggerBeat = useCallback(
    (volume: number) => {
      const audio = audioRef.current;
      if (!audio || muted || audioFailedRef.current) {
        return;
      }
      if (!audioReadyRef.current) {
        audio.load();
      }
      audio.volume = MathUtils.clamp(volume, 0, 0.2);
      audio.currentTime = 0;
      audio
        .play()
        .then(() => {
          audioReadyRef.current = true;
        })
        .catch(() => {});
    },
    [muted],
  );

  const startPortalTransition = useCallback(() => {
    if (portalStartedRef.current) {
      return;
    }
    portalStartedRef.current = true;
    portalFadeTimerRef.current = window.setTimeout(() => {
      setPortalTransitioning(true);
      portalNavTimerRef.current = window.setTimeout(() => {
        router.replace(PORTAL_ROUTE);
      }, PORTAL_FADE_DURATION);
    }, PORTAL_DELAY);
  }, [router]);

  const handlePointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const rect =
        containerRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      pointerRef.current = {
        x: sanitizePointer(x),
        y: sanitizePointer(y),
      };

      const now = performance.now() / 1000;
      lastPointerEventRef.current = now;
      lastInteractionRef.current = now;
      if (!interactionStartedRef.current) {
        interactionStartedRef.current = true;
        setInteractionStarted(true);
        setShowHint(false);
        beatStateRef.current.origin = now;
        beatStateRef.current.lastIndex = 0;
        beatStateRef.current.lastBeatAt = now;
        triggerBeat(0.03);
        setShowText(true);
        startPortalTransition();
      }
    },
    [triggerBeat, startPortalTransition],
  );

  const handlePointerLeave = useCallback(() => {
    pointerRef.current = { x: 0, y: 0 };
    lastPointerEventRef.current = performance.now() / 1000;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-[#060605] text-[#f4f4f1]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 70% 10%, rgba(99, 199, 219, 0.18), transparent 60%), radial-gradient(900px 500px at 20% 80%, rgba(242, 154, 138, 0.16), transparent 55%), linear-gradient(180deg, rgba(6, 6, 5, 0.2) 0%, rgba(6, 6, 5, 0.9) 70%)",
        }}
      />
      <Canvas
        className="absolute inset-0"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 35 }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={handlePointerLeave}
        onPointerMissed={(e) => {
          if (e.type === "pointerdown") {
            setHeartSelected(false);
          }
        }}
        style={{ touchAction: "none" }}
      >
        <SceneBoundary>
          <Suspense fallback={null}>
            <Scene
              pointerRef={pointerRef}
              lastPointerEventRef={lastPointerEventRef}
              lastInteractionRef={lastInteractionRef}
              interactionStartedRef={interactionStartedRef}
              beatStateRef={beatStateRef}
              activityRef={activityRef}
              triggerBeat={triggerBeat}
              heartSelected={heartSelected}
              onHeartSelect={setHeartSelected}
            />
          </Suspense>
        </SceneBoundary>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-6">
        <p
          className={`text-xs uppercase tracking-[0.35em] text-white/50 transition-all duration-700 ${
            showHint && !interactionStarted && !showText
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          Move or click to begin.
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center px-6">
        <p
          className={`max-w-xl text-center text-sm uppercase tracking-[0.3em] text-white/70 transition-all duration-700 ${
            showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Your body listens before it speaks.
        </p>
      </div>
      <button
        type="button"
        aria-label={muted ? "Unmute heartbeat" : "Mute heartbeat"}
        aria-pressed={muted}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setMuted((prev) => !prev)}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 backdrop-blur transition hover:text-white"
      >
        <MuteIcon muted={muted} />
      </button>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-1000 ${
          portalTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

useGLTF.preload(HUMAN_URL);
useGLTF.preload(ORGAN_URLS.heart);
useGLTF.preload(ORGAN_URLS.lung);
useGLTF.preload(ORGAN_URLS.brain);

export default LandingExperience;
