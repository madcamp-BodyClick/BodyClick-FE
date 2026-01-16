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

export type AgentKey =
  | "orthopedic"
  | "cardiology"
  | "vascular"
  | "pulmonology"
  | "gastroenterology"
  | "neurology"
  | "dermatology"
  | "general";

export type AgentProfile = {
  id: AgentKey;
  label: string;
  specialty: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  agentId: AgentKey;
};

export type CameraPreset = {
  position: [number, number, number];
  lookAt: [number, number, number];
  zoom?: number;
};

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

export const AGENTS: Record<AgentKey, AgentProfile> = {
  orthopedic: { id: "orthopedic", label: "정형외과 전문 AI", specialty: "정형외과" },
  cardiology: { id: "cardiology", label: "심장내과 전문 AI", specialty: "심장내과" },
  vascular: { id: "vascular", label: "혈관외과 전문 AI", specialty: "혈관외과" },
  pulmonology: { id: "pulmonology", label: "호흡기내과 전문 AI", specialty: "호흡기내과" },
  gastroenterology: {
    id: "gastroenterology",
    label: "소화기내과 전문 AI",
    specialty: "소화기내과",
  },
  neurology: { id: "neurology", label: "신경과 전문 AI", specialty: "신경과" },
  dermatology: { id: "dermatology", label: "피부과 전문 AI", specialty: "피부과" },
  general: { id: "general", label: "일반 진료 AI", specialty: "일반 진료" },
};

export const BODY_PART_AGENT: Record<BodyPartKey, AgentKey> = {
  knee_left: "orthopedic",
  knee_right: "orthopedic",
  shoulder_left: "orthopedic",
  elbow_left: "orthopedic",
  spine: "orthopedic",
  heart: "cardiology",
  aorta: "vascular",
  lung_left: "pulmonology",
  lung_right: "pulmonology",
  trachea: "pulmonology",
  stomach: "gastroenterology",
  liver: "gastroenterology",
  intestine: "gastroenterology",
  brain: "neurology",
  spinal_cord: "neurology",
  skin: "dermatology",
};

export const getAgentProfileForPart = (partId: BodyPartKey | null) => {
  if (!partId) {
    return null;
  }
  const agentKey = BODY_PART_AGENT[partId] ?? "general";
  return AGENTS[agentKey];
};

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
const FOCUS_DIM_OPACITY = 0.12;

export const DEFAULT_CAMERA: CameraPreset = {
  position: [0, 0.55, 4.6],
  lookAt: [0, 0.8, 0],
  zoom: 1,
};

export const CAMERA_PRESETS: Record<BodyPartKey, CameraPreset> = {
  knee_left: { position: [-0.6, 0.2, 3.2], lookAt: [-0.2, 0.2, 0] },
  knee_right: { position: [0.6, 0.2, 3.2], lookAt: [0.2, 0.2, 0] },
  shoulder_left: { position: [-0.9, 1.3, 3.1], lookAt: [-0.35, 1.1, 0] },
  elbow_left: { position: [-0.95, 0.95, 3.2], lookAt: [-0.45, 0.85, 0] },
  spine: { position: [0, 0.9, 3.6], lookAt: [0, 0.85, 0] },
  heart: { position: [0.2, 0.95, 3.1], lookAt: [0.1, 0.9, 0] },
  aorta: { position: [0.25, 1.15, 3.2], lookAt: [0.1, 1.05, 0] },
  lung_left: { position: [-0.35, 1.1, 3.25], lookAt: [-0.15, 1.0, 0] },
  lung_right: { position: [0.35, 1.1, 3.25], lookAt: [0.15, 1.0, 0] },
  trachea: { position: [0, 1.25, 3.15], lookAt: [0, 1.1, 0] },
  stomach: { position: [-0.1, 0.7, 3.25], lookAt: [-0.05, 0.6, 0] },
  liver: { position: [0.35, 0.75, 3.3], lookAt: [0.2, 0.65, 0] },
  intestine: { position: [0, 0.45, 3.25], lookAt: [0, 0.35, 0] },
  brain: { position: [0, 1.75, 3.1], lookAt: [0, 1.55, 0] },
  spinal_cord: { position: [0, 1.1, 3.5], lookAt: [0, 1.0, 0] },
  skin: { position: [0, 1.05, 3.8], lookAt: [0, 1.0, 0] },
};

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

export const getBodyPartFocusOpacity = (
  activePart: BodyPartKey | null,
  partId: BodyPartKey,
) => {
  if (!activePart) {
    return 1;
  }
  return activePart === partId ? 1 : FOCUS_DIM_OPACITY;
};

export const applyBodyPartFocusOpacity = (activePart: BodyPartKey | null) => {
  const parts = Object.keys(BODY_PART_LOOKUP).map((key) => ({
    partId: key as BodyPartKey,
    opacity: getBodyPartFocusOpacity(activePart, key as BodyPartKey),
  }));

  // TODO: Spline material API로 부위별 투명도를 제어하세요.
  return parts;
};

export const focusCameraOnPart = (partId: BodyPartKey) => {
  const preset = CAMERA_PRESETS[partId];
  if (!preset) {
    return;
  }

  // TODO: Spline Camera API로 preset.position과 preset.lookAt으로 이동하세요.
  // TODO: ease-in-out 곡선으로 느린 진입과 안정적인 정지를 구현하세요.
  // preset.zoom이 있다면 함께 적용하세요.
};

export const resetCameraToDefault = () => {
  // TODO: Spline Camera API로 DEFAULT_CAMERA로 복귀하세요.
  // TODO: ease-in-out 곡선으로 천천히 원위치하세요.
};

type BodyMapState = {
  selectedSystem: SystemKey | null;
  selectedBodyPart: BodyPartKey | null;
  activeTab: InsightTab;
  chatThreads: Partial<Record<BodyPartKey, ChatMessage[]>>;
  setSystem: (system: SystemKey) => void;
  setBodyPart: (part: BodyPartKey | null) => void;
  setActiveTab: (tab: InsightTab) => void;
  addChatMessage: (part: BodyPartKey, message: ChatMessage) => void;
};

export const useBodyMapStore = create<BodyMapState>((set) => ({
  selectedSystem: null,
  selectedBodyPart: null,
  activeTab: "overview",
  chatThreads: {},
  setSystem: (system) =>
    set((state) => {
      if (state.selectedSystem === system) {
        return state;
      }
      return { selectedSystem: system, selectedBodyPart: null, activeTab: "overview" };
    }),
  setBodyPart: (part) => set({ selectedBodyPart: part, activeTab: "overview" }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  addChatMessage: (part, message) =>
    set((state) => ({
      chatThreads: {
        ...state.chatThreads,
        [part]: [...(state.chatThreads[part] ?? []), message],
      },
    })),
}));
