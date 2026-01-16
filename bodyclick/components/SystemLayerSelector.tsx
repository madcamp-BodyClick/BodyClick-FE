"use client";

import {
  SYSTEMS,
  SYSTEM_LABELS,
  getSystemLayerOpacity,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const SystemLayerSelector = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const setSystem = useBodyMapStore((state) => state.setSystem);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
          계통 레이어
        </p>
        <p className="mt-2 text-sm text-bm-muted">
          {selectedSystem ? SYSTEM_LABELS[selectedSystem] : "전신"}
        </p>
      </div>
      <div className="flex gap-2 lg:flex-col">
        {SYSTEMS.map((system, index) => {
          const isActive = selectedSystem === system.id;
          const layerOpacity = getSystemLayerOpacity(selectedSystem, system.id);
          return (
            <button
              key={system.id}
              type="button"
              onClick={() => setSystem(system.id)}
              aria-pressed={isActive}
              style={{ animationDelay: `${index * 70}ms` }}
              className={`group flex items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "text-bm-text"
                  : "text-bm-muted hover:text-bm-text"
              } animate-[fade-up_0.6s_ease-out_both]`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full transition ${
                  isActive ? "bg-bm-accent" : "bg-bm-border"
                }`}
                style={{ opacity: layerOpacity }}
              />
              <span
                className="whitespace-nowrap font-medium transition-opacity"
                style={{ opacity: layerOpacity }}
              >
                {system.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SystemLayerSelector;
