"use client";

import {
  BODY_PARTS,
  SYSTEM_LABELS,
  useBodyMapStore,
} from "../store/useBodyMapStore";

const InfoPanel = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);

  const systemLabel = selectedSystem ? SYSTEM_LABELS[selectedSystem] : null;
  const bodyPartLabel =
    selectedSystem && selectedBodyPart
      ? BODY_PARTS[selectedSystem].find((part) => part.id === selectedBodyPart)
          ?.label
      : null;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!selectedSystem ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          계(system)를 선택해주세요
        </div>
      ) : !selectedBodyPart ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          부위를 선택해주세요
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                선택된 부위
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {bodyPartLabel}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{systemLabel}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              정보 요약
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            이 부위에 대한 기본 설명이 여기에 표시됩니다. 향후 의료 정보와
            AI 분석이 추가될 예정입니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "기본 정보",
              "대표 질환",
              "AI에게 질문하기",
            ].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  index === 0
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            탭 내용을 이 영역에 연결할 예정입니다.
          </div>
        </div>
      )}
    </aside>
  );
};

export default InfoPanel;
