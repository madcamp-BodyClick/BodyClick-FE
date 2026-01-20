import { create } from "zustand";
import {
  fetchBodyPartDetail,
  fetchBodyPartDiseases,
  fetchBodySystems,
  fetchSearchResults,
  type BodyPartDetail,
  type DiseaseSummary,
} from "../lib/api";

// ----------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------

export type SystemKey =
  | "MUSCULO"
  | "CARDIO"
  | "RESP"
  | "DIGEST"
  | "NERVOUS"
  | "DERM";

export type BodyPartKey =
  | "knee"
  | "shoulder"
  | "spine"
  | "heart"
  | "aorta"
  | "lung"
  | "trachea"
  | "stomach"
  | "liver"
  | "pancreas"
  | "intestine"
  | "brain"
  | "spinal_cord"
  | "skin";

export type BodySystem = {
  id: SystemKey;
  label: string;
  backendId?: number;
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
    { id: "knee", label: "무릎" },
    { id: "shoulder", label: "어깨" },
    { id: "spine", label: "척추" },
  ],
  CARDIO: [
    { id: "heart", label: "심장" },
    { id: "aorta", label: "대동맥" },
  ],
  RESP: [
    { id: "lung", label: "폐" },
    { id: "trachea", label: "기관" },
  ],
  DIGEST: [
    { id: "stomach", label: "위" },
    { id: "liver", label: "간" },
    { id: "pancreas", label: "췌장" },
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
  knee: "orthopedic",
  shoulder: "orthopedic",
  spine: "orthopedic",
  heart: "cardiology",
  aorta: "vascular",
  lung: "pulmonology",
  trachea: "pulmonology",
  stomach: "gastroenterology",
  liver: "gastroenterology",
  pancreas: "gastroenterology",
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

const BODY_PART_LABEL_TO_CODE = Object.values(BODY_PART_LOOKUP).reduce(
  (acc, part) => {
    acc[part.label] = part.id;
    return acc;
  },
  {} as Record<string, BodyPartKey>,
);

const getBodyPartLabelValue = (
  code: BodyPartKey,
  labels: Partial<Record<BodyPartKey, string>>,
) => labels[code] ?? BODY_PART_LOOKUP[code]?.label ?? code;

const getSystemLabelValue = (
  code: SystemKey,
  labels: Partial<Record<SystemKey, string>>,
) => labels[code] ?? SYSTEM_LABELS[code] ?? code;

const INACTIVE_LAYER_OPACITY = 0.2;
export const DEFAULT_CAMERA: CameraPreset = {
  position: [0, 0.2, 10],
  lookAt: [0, -1.3, 0],
  zoom: 0.75,
};

export const CAMERA_PRESETS: Record<BodyPartKey, CameraPreset> = {
  knee: { position: [0, 0.2, 3.2], lookAt: [0, 0.2, 0] },
  shoulder: { position: [0, 1.3, 3.1], lookAt: [0, 1.1, 0] },
  spine: { position: [0, 0.9, 3.6], lookAt: [0, 0.85, 0] },
  heart: { position: [0.2, 0.95, 3.1], lookAt: [0.1, 0.9, 0] },
  aorta: { position: [0.25, 1.15, 3.2], lookAt: [0.1, 1.05, 0] },
  lung: { position: [0, 1.1, 3.25], lookAt: [0, 1.0, 0] },
  trachea: { position: [0, 1.25, 3.15], lookAt: [0, 1.1, 0] },
  stomach: { position: [-0.1, 0.7, 3.25], lookAt: [-0.05, 0.6, 0] },
  liver: { position: [0.35, 0.75, 3.3], lookAt: [0.2, 0.65, 0] },
  pancreas: { position: [0.05, 0.6, 3.3], lookAt: [0, 0.55, 0] },
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

// ----------------------------------------------------------------------
// Store Interface & Implementation
// ----------------------------------------------------------------------

type BodyMapState = {
  systems: BodySystem[];
  systemLabels: Partial<Record<SystemKey, string>>;
  systemIdByCode: Partial<Record<SystemKey, number>>;
  systemCodeById: Record<number, SystemKey>;
  bodyPartLabels: Partial<Record<BodyPartKey, string>>;
  bodyPartIdByCode: Partial<Record<BodyPartKey, number>>;
  bodyPartCodeById: Record<number, BodyPartKey>;
  bodyPartDetailsById: Record<number, BodyPartDetail>;
  bodyPartDiseasesById: Record<number, DiseaseSummary[]>;
  loadSystems: () => Promise<void>;
  setBodyPartId: (code: BodyPartKey, id: number) => void;
  setBodyPartLabel: (code: BodyPartKey, label: string) => void;
  resolveBodyPartId: (code: BodyPartKey) => Promise<number | null>;
  loadBodyPartDetail: (code: BodyPartKey) => Promise<BodyPartDetail | null>;
  loadBodyPartDiseases: (code: BodyPartKey) => Promise<DiseaseSummary[]>;
  getSystemLabel: (code: SystemKey) => string;
  getBodyPartLabel: (code: BodyPartKey) => string;
  getBodyPartCodeByLabel: (label: string) => BodyPartKey | null;
  selectedSystem: SystemKey | null;
  selectedBodyPart: BodyPartKey | null;
  activeTab: InsightTab;
  chatThreads: Partial<Record<BodyPartKey, ChatMessage[]>>;
  confirmedSymptoms: Partial<Record<BodyPartKey, boolean>>;
  recentBodyParts: BodyPartKey[];
  bodyPartSelections: Partial<Record<BodyPartKey, number>>;
  cameraResetNonce: number;
  setSystem: (system: SystemKey) => void;
  setBodyPart: (part: BodyPartKey | null) => void;
  // 👇 [추가] 북마크 페이지 등 외부에서 사용할 별칭(Alias) 함수들
  setSelectedSystem: (system: SystemKey | null) => void;
  setSelectedBodyPart: (part: BodyPartKey | null) => void;
  
  setActiveTab: (tab: InsightTab) => void;
  addChatMessage: (part: BodyPartKey, message: ChatMessage) => void;
  confirmSymptoms: (part: BodyPartKey) => void;
  resetSymptoms: (part: BodyPartKey) => void;
  requestCameraReset: () => void;
};

export const useBodyMapStore = create<BodyMapState>((set, get) => ({
  systems: SYSTEMS,
  systemLabels: {},
  systemIdByCode: {},
  systemCodeById: {},
  bodyPartLabels: {},
  bodyPartIdByCode: {},
  bodyPartCodeById: {},
  bodyPartDetailsById: {},
  bodyPartDiseasesById: {},
  loadSystems: async () => {
    const response = await fetchBodySystems();
    if (!response.ok || !response.data?.success) {
      return;
    }
    const apiSystems = response.data.data;
    const systemMap = new Map(apiSystems.map((item) => [item.code, item]));
    const updatedSystems = SYSTEMS.map((system) => {
      const match = systemMap.get(system.id);
      return {
        ...system,
        label: match?.nameKo ?? system.label,
        backendId: match?.id,
      };
    });
    const extraSystems = apiSystems
      .filter((item) => !SYSTEMS.some((system) => system.id === item.code))
      .map((item) => ({
        id: item.code as SystemKey,
        label: item.nameKo,
        backendId: item.id,
      }));

    const systemLabels = apiSystems.reduce(
      (acc, item) => {
        acc[item.code as SystemKey] = item.nameKo;
        return acc;
      },
      {} as Partial<Record<SystemKey, string>>,
    );

    const systemIdByCode = apiSystems.reduce(
      (acc, item) => {
        acc[item.code as SystemKey] = item.id;
        return acc;
      },
      {} as Partial<Record<SystemKey, number>>,
    );

    const systemCodeById = apiSystems.reduce(
      (acc, item) => {
        acc[item.id] = item.code as SystemKey;
        return acc;
      },
      {} as Record<number, SystemKey>,
    );

    set({
      systems: [...updatedSystems, ...extraSystems],
      systemLabels,
      systemIdByCode,
      systemCodeById,
    });
  },
  setBodyPartId: (code, id) =>
    set((state) => ({
      bodyPartIdByCode: { ...state.bodyPartIdByCode, [code]: id },
      bodyPartCodeById: { ...state.bodyPartCodeById, [id]: code },
    })),
  setBodyPartLabel: (code, label) =>
    set((state) => ({
      bodyPartLabels: { ...state.bodyPartLabels, [code]: label },
    })),
  resolveBodyPartId: async (code) => {
    const cached = get().bodyPartIdByCode[code];
    if (cached) {
      return cached;
    }
    const label = getBodyPartLabelValue(code, get().bodyPartLabels);
    const response = await fetchSearchResults(label);
    if (!response.ok || !response.data?.success) {
      return null;
    }
    const match =
      response.data.data.find((item) => item.name === label) ??
      response.data.data[0];
    if (!match) {
      return null;
    }
    set((state) => ({
      bodyPartIdByCode: { ...state.bodyPartIdByCode, [code]: match.id },
      bodyPartCodeById: { ...state.bodyPartCodeById, [match.id]: code },
      bodyPartLabels: { ...state.bodyPartLabels, [code]: match.name },
    }));
    return match.id;
  },
  loadBodyPartDetail: async (code) => {
    const id = await get().resolveBodyPartId(code);
    if (!id) {
      return null;
    }
    const cached = get().bodyPartDetailsById[id];
    if (cached) {
      return cached;
    }
    const response = await fetchBodyPartDetail(id);
    if (!response.ok || !response.data?.success) {
      return null;
    }
    const detail = response.data.data;
    set((state) => ({
      bodyPartDetailsById: { ...state.bodyPartDetailsById, [id]: detail },
      bodyPartLabels: {
        ...state.bodyPartLabels,
        [code]: detail.nameKo ?? state.bodyPartLabels[code],
      },
    }));
    return detail;
  },
  loadBodyPartDiseases: async (code) => {
    const id = await get().resolveBodyPartId(code);
    if (!id) {
      return [];
    }
    const cached = get().bodyPartDiseasesById[id];
    if (cached) {
      return cached;
    }
    const response = await fetchBodyPartDiseases(id);
    if (!response.ok || !response.data?.success) {
      return [];
    }
    const diseases = response.data.data;
    set((state) => ({
      bodyPartDiseasesById: {
        ...state.bodyPartDiseasesById,
        [id]: diseases,
      },
    }));
    return diseases;
  },
  getSystemLabel: (code) => getSystemLabelValue(code, get().systemLabels),
  getBodyPartLabel: (code) => getBodyPartLabelValue(code, get().bodyPartLabels),
  getBodyPartCodeByLabel: (label) => BODY_PART_LABEL_TO_CODE[label] ?? null,
  selectedSystem: null,
  selectedBodyPart: null,
  activeTab: "overview",
  chatThreads: {},
  confirmedSymptoms: {},
  recentBodyParts: [],
  bodyPartSelections: {},
  cameraResetNonce: 0,
  setSystem: (system) =>
    set((state) => {
      if (state.selectedSystem === system) {
        return state;
      }
      return { selectedSystem: system, selectedBodyPart: null, activeTab: "overview" };
    }),
  setBodyPart: (part) =>
    set((state) => {
      if (!part) {
        return { selectedBodyPart: part, activeTab: "overview" };
      }
      const nextRecent = [
        part,
        ...state.recentBodyParts.filter((item) => item !== part),
      ].slice(0, 12);
      const nextSelections = {
        ...state.bodyPartSelections,
        [part]: (state.bodyPartSelections[part] ?? 0) + 1,
      };
      return {
        selectedBodyPart: part,
        activeTab: "overview",
        recentBodyParts: nextRecent,
        bodyPartSelections: nextSelections,
      };
    }),
  // 👇 [추가] 구현: 기존 함수 재사용
  setSelectedSystem: (system) => {
    if (system) get().setSystem(system);
    else set({ selectedSystem: null });
  },
  setSelectedBodyPart: (part) => get().setBodyPart(part),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  addChatMessage: (part, message) =>
    set((state) => ({
      chatThreads: {
        ...state.chatThreads,
        [part]: [...(state.chatThreads[part] ?? []), message],
      },
    })),
  confirmSymptoms: (part) =>
    set((state) => ({
      confirmedSymptoms: {
        ...state.confirmedSymptoms,
        [part]: true,
      },
    })),
  resetSymptoms: (part) =>
    set((state) => {
      if (!state.confirmedSymptoms[part]) {
        return state;
      }
      const next = { ...state.confirmedSymptoms };
      delete next[part];
      return { confirmedSymptoms: next };
    }),
  requestCameraReset: () =>
    set((state) => ({ cameraResetNonce: state.cameraResetNonce + 1 })),
}));