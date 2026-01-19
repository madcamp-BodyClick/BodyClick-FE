"use client";

import { useBodyMapStore } from "../store/useBodyMapStore";

const SystemSelector = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const setSystem = useBodyMapStore((state) => state.setSystem);
  const systems = useBodyMapStore((state) => state.systems);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            인체 시스템
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            계통을 선택하세요
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          3D 모델 클릭 전 단계
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {systems.map((system) => {
          const isActive = selectedSystem === system.id;
          return (
            <button
              key={system.id}
              type="button"
              onClick={() => setSystem(system.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {system.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SystemSelector;
