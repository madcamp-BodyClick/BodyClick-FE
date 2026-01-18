"use client";

import MedicalChatPanel from "./MedicalChatPanel";
import {
  BODY_PART_LOOKUP,
  INSIGHT_TABS,
  SYSTEM_LABELS,
  useBodyMapStore,
  type BodyPartKey,
} from "../store/useBodyMapStore";

type BodyPartInsight = {
  role: string[];
  signals: string[];
  conditions: string[];
};

const JOINT_INSIGHT: BodyPartInsight = {
  role: [
    "보행 충격을 흡수하고 체중을 분산합니다.",
    "관절 연골과 인대가 안정성을 유지합니다.",
    "회전과 굴곡 움직임을 정밀하게 제어합니다.",
  ],
  signals: [
    "계단 오르내릴 때 통증",
    "붓기나 열감",
    "움직임 제한 또는 잠김",
  ],
  conditions: ["퇴행성 관절염", "반월상 연골 손상", "십자인대 손상"],
};

const LUNG_INSIGHT: BodyPartInsight = {
  role: [
    "폐포에서 산소와 이산화탄소를 교환합니다.",
    "기관지 네트워크가 공기 흐름을 조절합니다.",
    "호흡근과 협력해 환기를 유지합니다.",
  ],
  signals: ["기침이나 호흡 곤란", "가슴 답답함", "운동 시 숨참"],
  conditions: ["폐렴", "만성폐쇄성폐질환", "천식"],
};

const BODY_PART_INSIGHTS: Record<BodyPartKey, BodyPartInsight> = {
  knee: JOINT_INSIGHT,
  shoulder: {
    role: [
      "상완골과 견갑골의 회전이 넓은 가동 범위를 만듭니다.",
      "회전근개가 관절을 안정화합니다.",
      "팔의 힘 전달과 움직임을 돕습니다.",
    ],
    signals: ["팔을 올릴 때 통증", "야간 통증", "힘 약화"],
    conditions: ["회전근개 파열", "오십견", "충돌 증후군"],
  },
  elbow_left: {
    role: [
      "굴곡과 신전으로 손 위치를 조절합니다.",
      "상완골-척골 관절이 안정성을 제공합니다.",
      "주요 신경과 혈관이 관절 주변을 지나갑니다.",
    ],
    signals: ["팔꿈치 바깥쪽 통증", "저림", "잡는 힘 저하"],
    conditions: ["테니스 엘보", "골프 엘보", "척골 신경 포착"],
  },
  spine: {
    role: [
      "몸통을 지지하고 자세를 유지합니다.",
      "척수를 보호하고 신경 전달 통로를 제공합니다.",
      "굽힘·회전 등 복합 움직임을 담당합니다.",
    ],
    signals: ["오래 앉을 때 통증", "방사통", "자세 불균형"],
    conditions: ["추간판 탈출증", "척추관 협착증", "근막통 증후군"],
  },
  heart: {
    role: [
      "혈액을 펌핑해 전신에 산소를 공급합니다.",
      "박동 리듬이 혈류를 안정화합니다.",
      "관상동맥이 심근에 혈류를 제공합니다.",
    ],
    signals: ["흉부 압박감", "호흡 곤란", "두근거림"],
    conditions: ["협심증", "부정맥", "심부전"],
  },
  aorta: {
    role: [
      "심장에서 나온 혈액을 전신으로 분배합니다.",
      "탄성벽이 혈압 변화를 완충합니다.",
      "주요 장기로 가지를 분기합니다.",
    ],
    signals: ["맥박 차이", "흉통 또는 등 통증", "혈압 변화"],
    conditions: ["대동맥류", "대동맥 박리", "동맥경화"],
  },
  lung: LUNG_INSIGHT,
  trachea: {
    role: [
      "공기가 폐로 들어가는 통로를 유지합니다.",
      "점막과 섬모가 이물질을 걸러냅니다.",
      "연골 고리가 기도 형태를 지탱합니다.",
    ],
    signals: ["거친 기침", "목소리 변화", "쌕쌕거림"],
    conditions: ["기관지염", "기도 협착", "급성 염증"],
  },
  stomach: {
    role: [
      "음식을 저장하고 위산으로 분해를 시작합니다.",
      "소화 효소로 단백질 분해를 돕습니다.",
      "십이지장으로 내용물을 전달합니다.",
    ],
    signals: ["상복부 통증", "속쓰림", "메스꺼움"],
    conditions: ["위염", "위궤양", "기능성 소화불량"],
  },
  liver: {
    role: [
      "해독과 대사를 담당합니다.",
      "담즙을 생성해 지방 소화를 돕습니다.",
      "영양분을 저장합니다.",
    ],
    signals: ["피로감", "우상복부 불편감", "황달"],
    conditions: ["지방간", "간염", "간경화"],
  },
  pancreas: {
    role: [
      "소화 효소를 분비해 탄수화물·지방·단백질 분해를 돕습니다.",
      "인슐린과 글루카곤으로 혈당을 조절합니다.",
      "십이지장으로 소화액을 보내 위산을 중화합니다.",
    ],
    signals: ["상복부 통증(등으로 방사)", "소화불량 또는 기름진 변", "혈당 변동"],
    conditions: ["급성 췌장염", "만성 췌장염", "췌장암"],
  },
  intestine: {
    role: [
      "영양분과 수분을 흡수합니다.",
      "장내 미생물이 면역과 대사에 관여합니다.",
      "연동운동으로 내용물을 이동합니다.",
    ],
    signals: ["복부 팽만", "배변 변화", "복통"],
    conditions: ["과민성 대장 증후군", "염증성 장질환", "장염"],
  },
  brain: {
    role: [
      "인지, 감각, 운동을 통합합니다.",
      "자율신경을 조절합니다.",
      "기억과 감정을 처리합니다.",
    ],
    signals: ["두통", "집중력 저하", "운동·감각 이상"],
    conditions: ["뇌졸중", "편두통", "치매"],
  },
  spinal_cord: {
    role: [
      "뇌와 말초를 연결하는 신경 고속도로입니다.",
      "반사 반응을 조절합니다.",
      "운동·감각 신호를 전달합니다.",
    ],
    signals: ["사지 저림", "근력 저하", "균형 문제"],
    conditions: ["척수 압박", "척수염", "신경근병증"],
  },
  skin: {
    role: [
      "외부 자극으로부터 신체를 보호합니다.",
      "체온 조절과 수분 유지에 관여합니다.",
      "감각 수용체가 분포합니다.",
    ],
    signals: ["지속적인 가려움", "발진 또는 색 변화", "상처 치유 지연"],
    conditions: ["아토피 피부염", "건선", "접촉성 피부염"],
  },
};

const InsightPanel = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const activeTab = useBodyMapStore((state) => state.activeTab);
  const setActiveTab = useBodyMapStore((state) => state.setActiveTab);

  const isOpen = Boolean(selectedSystem && selectedBodyPart);
  const part = selectedBodyPart ? BODY_PART_LOOKUP[selectedBodyPart] : null;
  const insight = selectedBodyPart
    ? BODY_PART_INSIGHTS[selectedBodyPart]
    : null;

  return (
    <aside
      className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-[28px] border border-bm-border bg-bm-panel px-6 py-6 transition duration-500 lg:static lg:z-10 lg:h-full lg:w-[360px] lg:rounded-[28px] lg:border lg:px-6 ${
        isOpen
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none lg:translate-y-0 lg:opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-bm-border lg:hidden" />
      {isOpen && part && insight ? (
        <div className="flex h-full flex-col gap-6">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bm-muted">
              의료 인사이트
            </p>
            <div>
              <h2 className="text-2xl font-semibold text-bm-text">
                {part.label}
              </h2>
              <p className="mt-1 text-sm text-bm-muted">
                {SYSTEM_LABELS[part.system]}
              </p>
            </div>
          </header>

          <div className="flex flex-wrap gap-2">
            {INSIGHT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-bm-accent-soft text-bm-text"
                      : "text-bm-muted hover:text-bm-text"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-4">
              <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                  핵심 역할
                </p>
                <ul className="mt-3 space-y-2 text-sm text-bm-text">
                  {insight.role.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-bm-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                  관찰 포인트
                </p>
                <ul className="mt-3 space-y-2 text-sm text-bm-text">
                  {insight.signals.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-bm-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {activeTab === "conditions" ? (
            <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                대표 질환
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.conditions.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-bm-border px-3 py-2 text-xs text-bm-text"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "ai" ? <MedicalChatPanel /> : null}
        </div>
      ) : null}
    </aside>
  );
};

export default InsightPanel;
