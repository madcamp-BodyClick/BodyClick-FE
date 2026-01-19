"use client";

import { BODY_PARTS, useBodyMapStore } from "../store/useBodyMapStore";

const BodyPartSelector = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);

  const parts = selectedSystem ? BODY_PARTS[selectedSystem] : [];

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">부위 선택</h3>
        {selectedSystem ? (
          <span className="text-xs text-slate-500">
            3D 클릭을 대신하는 버튼
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {parts.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-4 text-xs text-slate-500">
            계통을 선택하면 부위를 고를 수 있어요.
          </div>
        ) : (
          parts.map((part) => {
            const isActive = selectedBodyPart === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setBodyPart(part.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {getBodyPartLabel(part.id)}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export default BodyPartSelector;
