"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Application, SplineEvent, SPEObject } from "@splinetool/runtime";
import dynamic from "next/dynamic";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  CAMERA_PRESETS,
  DEFAULT_CAMERA,
  SYSTEM_LABELS,
  applyBodyPartFocusOpacity,
  applySystemLayerOpacity,
  focusCameraOnPart,
  resetCameraToDefault,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const Spline = dynamic(
  () => import("@splinetool/react-spline").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-xs text-bm-muted">
        3D 씬을 불러오는 중입니다...
      </div>
    ),
  },
);

const Stage3D = () => {

  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  const setSystem = useBodyMapStore((state) => state.setSystem);

  const [isFocusing, setIsFocusing] = useState(false);
  const splineAppRef = useRef<Application | null>(null);
  const cameraRef = useRef<SPEObject | null>(null);
  const cameraTargetRef = useRef<SPEObject | null>(null);

  const handleSplineLoad = useCallback((spline: Application) => {
    splineAppRef.current = spline;
    cameraRef.current = spline.findObjectByName("Camera") ?? null;
    cameraTargetRef.current = spline.findObjectByName("CameraTarget") ?? null;
    if (DEFAULT_CAMERA.zoom) {
      spline.setZoom(DEFAULT_CAMERA.zoom);
    }
  }, []);

  const normalizeSplineName = (name: string) =>
    name.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const resolveBodyPartId = (rawName: string) => {
    const normalized = normalizeSplineName(rawName);
    if (!normalized) {
      return null;
    }

    const partIds = Object.keys(BODY_PART_LOOKUP) as Array<
      keyof typeof BODY_PART_LOOKUP
    >;
    const findMatch = (value: string) =>
      partIds.find(
        (partId) => value === partId || value.startsWith(`${partId}_`),
      ) ?? null;

    let match = findMatch(normalized);
    if (match) {
      return match;
    }

    const tokens = normalized.split("_").filter(Boolean);
    const sideMap: Record<string, "left" | "right"> = {
      l: "left",
      r: "right",
      left: "left",
      right: "right",
    };
    const sideIndex = tokens.findIndex((token) => token in sideMap);
    if (sideIndex !== -1) {
      const side = sideMap[tokens[sideIndex]];
      const baseTokens = tokens.filter((_, index) => index !== sideIndex);
      const baseCandidates = [
        baseTokens[0],
        baseTokens[baseTokens.length - 1],
      ].filter((token): token is string => Boolean(token));
      for (const base of new Set(baseCandidates)) {
        match = findMatch(`${base}_${side}`);
        if (match) {
          return match;
        }
      }
      if (baseTokens.length) {
        match = findMatch(baseTokens.join("_"));
        if (match) {
          return match;
        }
      }
    }

    return null;
  };

  const handleSplineMouseDown = useCallback(
    (event: SplineEvent) => {
      const objectName = event.object?.name;
      if (!objectName) {
        return;
      }
      const partId = resolveBodyPartId(objectName);
      if (!partId) {
        return;
      }
      const partSystem = BODY_PART_LOOKUP[partId].system;
      if (selectedSystem !== partSystem) {
        setSystem(partSystem);
      }
      setBodyPart(partId);
    },
    [selectedSystem, setBodyPart, setSystem],
  );

  useEffect(() => {
    if (!selectedBodyPart) {
      applySystemLayerOpacity(selectedSystem);
    }
  }, [selectedSystem, selectedBodyPart]);

  useEffect(() => {
    let focusTimer: number | undefined;
    let settleTimer: number | undefined;

    if (!selectedBodyPart) {
      resetCameraToDefault(cameraRef.current, cameraTargetRef.current);
      if (splineAppRef.current && DEFAULT_CAMERA.zoom) {
        splineAppRef.current.setZoom(DEFAULT_CAMERA.zoom);
      }
      applyBodyPartFocusOpacity(null);
      setIsFocusing(false);
      return;
    }

    setIsFocusing(true);
    focusTimer = window.setTimeout(() => {
      focusCameraOnPart(
        selectedBodyPart,
        cameraRef.current,
        cameraTargetRef.current,
      );
      const preset = CAMERA_PRESETS[selectedBodyPart];
      if (preset?.zoom && splineAppRef.current) {
        splineAppRef.current.setZoom(preset.zoom);
      }
      applyBodyPartFocusOpacity(selectedBodyPart);
    }, 120);
    settleTimer = window.setTimeout(() => setIsFocusing(false), 950);

    return () => {
      if (focusTimer) {
        window.clearTimeout(focusTimer);
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [selectedBodyPart]);

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
        className={`absolute inset-0 bg-black/30 transition-opacity duration-700 ${
          selectedBodyPart ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        <div
          className={`h-full w-full overflow-hidden rounded-[24px] border border-bm-border bg-bm-panel-soft transition-transform duration-700 ${
            isFocusing ? "scale-[1.02]" : "scale-100"
          }`}
        >
          <Spline
            scene="https://prod.spline.design/WRLoZ5fC20uPwQcw/scene.splinecode"
            onLoad={handleSplineLoad}
            onSplineMouseDown={handleSplineMouseDown}
            className="h-full w-full"
          />
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
