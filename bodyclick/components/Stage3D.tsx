"use client";

import { useEffect, useState } from "react";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  SYSTEM_LABELS,
  applyBodyPartFocusOpacity,
  applySystemLayerOpacity,
  focusCameraOnPart,
  resetCameraToDefault,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const Stage3D = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);

  const [isFocusing, setIsFocusing] = useState(false);

  useEffect(() => {
    if (!selectedBodyPart) {
      applySystemLayerOpacity(selectedSystem);
    }
  }, [selectedSystem, selectedBodyPart]);

  useEffect(() => {
    let focusTimer: number | undefined;
    let settleTimer: number | undefined;

    if (!selectedBodyPart) {
      resetCameraToDefault();
      applyBodyPartFocusOpacity(null);
      setIsFocusing(false);
      return;
    }

    setIsFocusing(true);
    focusTimer = window.setTimeout(() => {
      focusCameraOnPart(selectedBodyPart);
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

  return (
    <section className="relative h-[68vh] min-h-[420px] w-full overflow-hidden rounded-[32px] border border-bm-border bg-bm-surface-soft animate-[rise-in_0.9s_ease-out]">
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
          <iframe
            title="바디클릭 3D"
            src="https://my.spline.design/cybernetichuman-8VM8v7LCw7oUtrURFoDjorWq/"
            className="h-full w-full"
            frameBorder="0"
            allowFullScreen
            loading="lazy"
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
          className="absolute left-6 bottom-6 z-20 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
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
        <div className="absolute bottom-5 left-1/2 z-20 flex w-[min(90%,520px)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-[24px] border border-bm-border bg-bm-panel-soft px-4 py-3 text-xs text-bm-muted backdrop-blur">
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
