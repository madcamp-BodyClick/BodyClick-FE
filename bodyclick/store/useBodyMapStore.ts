import { create } from "zustand";

export type SystemKey =
  | "MUSCULO"
  | "CARDIO"
  | "RESP"
  | "DIGEST"
  | "NERVOUS"
  | "DERM";

export type BodyPartKey =
  | "knee_left"
  | "knee_right"
  | "shoulder_left"
  | "elbow_left"
  | "spine"
  | "heart"
  | "aorta"
  | "lung_left"
  | "lung_right"
  | "trachea"
  | "stomach"
  | "liver"
  | "intestine"
  | "brain"
  | "spinal_cord"
  | "skin";

export type BodySystem = {
  id: SystemKey;
  label: string;
};

export type BodyPart = {
  id: BodyPartKey;
  label: string;
};

export type InsightTab = "overview" | "conditions" | "ai";

export const SYSTEMS: BodySystem[] = [
  { id: "MUSCULO", label: "근골격계" },
  { id: "CARDIO", label: "심혈관계" },
  { id: "RESP", label: "호흡기계" },
  { id: "DIGEST", label: "소화기계" },
  { id: "NERVOUS", label: "신경계" },
  { id: "DERM", label: "피부계" },
];

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  MUSCULO: "근골격계",
  CARDIO: "심혈관계",
  RESP: "호흡기계",
  DIGEST: "소화기계",
  NERVOUS: "신경계",
  DERM: "피부계",
};

export const BODY_PARTS: Record<SystemKey, BodyPart[]> = {
  MUSCULO: [
    { id: "knee_left", label: "왼쪽 무릎" },
    { id: "knee_right", label: "오른쪽 무릎" },
    { id: "shoulder_left", label: "왼쪽 어깨" },
    { id: "elbow_left", label: "왼쪽 팔꿈치" },
    { id: "spine", label: "척추" },
  ],
  CARDIO: [
    { id: "heart", label: "심장" },
    { id: "aorta", label: "대동맥" },
  ],
  RESP: [
    { id: "lung_left", label: "왼쪽 폐" },
    { id: "lung_right", label: "오른쪽 폐" },
    { id: "trachea", label: "기관" },
  ],
  DIGEST: [
    { id: "stomach", label: "위" },
    { id: "liver", label: "간" },
    { id: "intestine", label: "장" },
  ],
  NERVOUS: [
    { id: "brain", label: "뇌" },
    { id: "spinal_cord", label: "척수" },
  ],
  DERM: [{ id: "skin", label: "피부" }],
};

export const INSIGHT_TABS: { id: InsightTab; label: string }[] = [
  { id: "overview", label: "기본 정보" },
  { id: "conditions", label: "대표 질환" },
  { id: "ai", label: "AI에게 질문하기" },
];

export const BODY_PART_LOOKUP = Object.entries(BODY_PARTS).reduce(
  (acc, [systemKey, parts]) => {
    parts.forEach((part) => {
      acc[part.id] = {
        ...part,
        system: systemKey as SystemKey,
      };
    });
    return acc;
  },
  {} as Record<BodyPartKey, BodyPart & { system: SystemKey }>,
);

const INACTIVE_LAYER_OPACITY = 0.2;

export const getSystemLayerOpacity = (
  activeSystem: SystemKey | null,
  systemId: SystemKey,
) => {
  if (!activeSystem) {
    return 1;
  }
  return activeSystem === systemId ? 1 : INACTIVE_LAYER_OPACITY;
};

export const getBodyPartOpacity = (
  activeSystem: SystemKey | null,
  partId: BodyPartKey,
) => {
  const partSystem = BODY_PART_LOOKUP[partId]?.system;
  if (!partSystem) {
    return 1;
  }
  return getSystemLayerOpacity(activeSystem, partSystem);
};

export const applySystemLayerOpacity = (activeSystem: SystemKey | null) => {
  const layers = SYSTEMS.map((system) => ({
    systemId: system.id,
    opacity: getSystemLayerOpacity(activeSystem, system.id),
  }));

  // TODO: Spline material API로 레이어별 투명도를 제어하세요.
  return layers;
};

export const focusCameraOnPart = (partId: BodyPartKey) => {
  if (!partId) {
    return;
  }
  // TODO: Spline Camera API로 부위 중심으로 부드럽게 이동하세요.
};

type BodyMapState = {
  selectedSystem: SystemKey | null;
  selectedBodyPart: BodyPartKey | null;
  activeTab: InsightTab;
  setSystem: (system: SystemKey) => void;
  setBodyPart: (part: BodyPartKey) => void;
  setActiveTab: (tab: InsightTab) => void;
};

export const useBodyMapStore = create<BodyMapState>((set) => ({
  selectedSystem: null,
  selectedBodyPart: null,
  activeTab: "overview",
  setSystem: (system) =>
    set((state) => {
      if (state.selectedSystem === system) {
        return state;
      }
      return { selectedSystem: system, selectedBodyPart: null, activeTab: "overview" };
    }),
  setBodyPart: (part) => set({ selectedBodyPart: part, activeTab: "overview" }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
