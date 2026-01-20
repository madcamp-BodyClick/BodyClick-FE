"use client";

import {
  getSystemLayerOpacity,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const SystemLayerSelector = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const setSystem = useBodyMapStore((state) => state.setSystem);
  const requestCameraReset = useBodyMapStore(
    (state) => state.requestCameraReset,
  );
  const systems = useBodyMapStore((state) => state.systems);
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);

  // [수정] 화면에 보이는 이름(label)을 기준으로 중복 제거
  const uniqueSystems = (systems || []).filter(
    (system, index, self) =>
      index === self.findIndex((t) => t.label === system.label)
  );

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
          계통 레이어
        </p>
        <p className="mt-2 text-sm text-bm-muted">
          {selectedSystem ? getSystemLabel(selectedSystem) : "전신"}
        </p>
      </div>
      <div className="flex gap-2 lg:flex-col">
        {uniqueSystems.map((system, index) => {
          const isActive = selectedSystem === system.id;
          const layerOpacity = getSystemLayerOpacity(selectedSystem, system.id);
          return (
            <button
              key={system.id} // 주의: 중복된 항목 중 첫 번째의 ID를 사용합니다
              type="button"
              onClick={() => {
                requestCameraReset();
                setSystem(system.id);
              }}
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