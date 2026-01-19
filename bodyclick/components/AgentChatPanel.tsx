"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, MapPin, X } from "lucide-react";
import {
  clearAiContext,
  createAiAnswer,
  fetchPlaces,
  fetchSearchResults,
  type PlaceResult,
} from "../lib/api";
import { getUserLocation } from "../lib/location";
import { useAuthStore } from "../store/useAuthStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import {
  BODY_PART_LOOKUP,
  getAgentProfileForPart,
  useBodyMapStore,
  type AgentKey,
  type BodyPartKey,
  type ChatMessage,
} from "../store/useBodyMapStore";

const SYSTEM_KEYWORDS: Record<string, string> = {
  MUSCULO: "정형외과",
  CARDIO: "심장내과",
  RESP: "호흡기내과",
  DIGEST: "소화기내과",
  NERVOUS: "신경과",
  DERM: "피부과",
};

const AGENT_PROMPTS: Record<AgentKey, string> = {
  orthopedic:
    "당신은 정형외과 전문 AI입니다. 근골격계 통증/손상/염좌/퇴행성 질환에 집중해 답변합니다. 가능한 원인, 추가로 확인할 증상, 경과 관찰 포인트를 짧게 정리하세요. 심한 통증, 감각 저하, 보행 불가 등 응급 징후가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
  cardiology:
    "당신은 심장내과 전문 AI입니다. 흉통, 심계항진, 호흡곤란 등 심혈관 증상을 중심으로 설명하세요. 위험 징후(휴식 중 흉통, 식은땀, 실신, 심한 호흡곤란)가 있으면 즉시 응급 진료를 권유하세요. 한국어로 답변하세요.",
  vascular:
    "당신은 혈관외과 전문 AI입니다. 대동맥/말초혈관 증상, 혈전/혈류 이상 가능성을 중심으로 설명하세요. 급격한 통증, 창백/청색증, 감각 저하 등 응급 징후가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
  pulmonology:
    "당신은 호흡기내과 전문 AI입니다. 기침, 가래, 호흡곤란, 흉부 불편감 등 호흡기 증상에 집중해 답변하세요. 청색증, 고열 지속, 숨참 악화가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
  gastroenterology:
    "당신은 소화기내과 전문 AI입니다. 복통, 속쓰림, 구역, 설사/변비 등 소화기 증상에 집중해 답변하세요. 혈변, 흑변, 심한 복통, 지속 구토가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
  neurology:
    "당신은 신경과 전문 AI입니다. 두통, 어지럼, 감각 이상, 마비 등 신경계 증상에 집중해 답변하세요. 갑작스러운 편마비, 발음 장애, 의식 저하 등 응급 징후가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
  dermatology:
    "당신은 피부과 전문 AI입니다. 발진, 가려움, 염증, 색소 변화 등 피부 증상에 집중해 답변하세요. 급속히 악화되거나 전신 증상이 동반되면 진료를 권유하세요. 한국어로 답변하세요.",
  general:
    "당신은 일반 진료 AI입니다. 증상을 정리하고 필요한 추가 질문을 제시하세요. 위험 징후가 있으면 즉시 진료를 권유하세요. 한국어로 답변하세요.",
};

const createMessage = (
  role: ChatMessage["role"],
  content: string,
  agentId: AgentKey,
): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  content,
  createdAt: Date.now(),
  agentId,
});

const AgentChatPanel = () => {
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const chatThreads = useBodyMapStore((state) => state.chatThreads);
  const addChatMessage = useBodyMapStore((state) => state.addChatMessage);
  const confirmedSymptoms = useBodyMapStore((state) => state.confirmedSymptoms);
  const confirmSymptoms = useBodyMapStore((state) => state.confirmSymptoms);
  const resetSymptoms = useBodyMapStore((state) => state.resetSymptoms);
  const resolveBodyPartId = useBodyMapStore((state) => state.resolveBodyPartId);
  const setBodyPartId = useBodyMapStore((state) => state.setBodyPartId);
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hospitalBookmarks = useBookmarkStore((state) => state.hospitalBookmarks);
  const refreshHospitalBookmarks = useBookmarkStore(
    (state) => state.refreshHospitalBookmarks,
  );
  const addHospitalBookmark = useBookmarkStore(
    (state) => state.addHospitalBookmark,
  );
  const removeHospitalBookmark = useBookmarkStore(
    (state) => state.removeHospitalBookmark,
  );

  const agent = getAgentProfileForPart(selectedBodyPart);
  const messages = selectedBodyPart ? chatThreads[selectedBodyPart] ?? [] : [];
  const part = selectedBodyPart ? BODY_PART_LOOKUP[selectedBodyPart] : null;
  const systemLabel = part ? getSystemLabel(part.system) : null;
  const partLabel = selectedBodyPart ? getBodyPartLabel(selectedBodyPart) : null;
  const isSymptomConfirmed = Boolean(
    selectedBodyPart && confirmedSymptoms[selectedBodyPart],
  );
  const canConfirm = messages.length >= 2;
  const hasConversation = messages.length > 0;

  const [input, setInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<PlaceResult[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setInput("");
  }, [selectedBodyPart]);

  useEffect(() => {
    abortRef.current?.abort();
    setIsSending(false);
  }, [selectedBodyPart]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    refreshHospitalBookmarks();
  }, [isAuthenticated, refreshHospitalBookmarks]);

  useEffect(() => {
    if (!part || !isAuthenticated) {
      setNearbyHospitals([]);
      setIsLoadingHospitals(false);
      return;
    }
    let isActive = true;
    const loadPlaces = async () => {
      setIsLoadingHospitals(true);
      const location = await getUserLocation();
      const keyword = SYSTEM_KEYWORDS[part.system] ?? "병원";
      const response = await fetchPlaces({
        lat: location.lat,
        lng: location.lng,
        keyword,
      });
      if (!isActive) {
        return;
      }
      if (response.ok && response.data?.success) {
        setNearbyHospitals(response.data.data);
      } else {
        setNearbyHospitals([]);
      }
      setIsLoadingHospitals(false);
    };
    loadPlaces();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, part]);

  useEffect(() => {
    setIsModalOpen(false);
    setIsPromptDismissed(false);
  }, [selectedBodyPart]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalOpen, isMounted]);

  const relatedHospitals = useMemo(() => {
    return nearbyHospitals.slice(0, 5);
  }, [nearbyHospitals]);

  const lastAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant");
  }, [messages]);

  const summarySnippet = useMemo(() => {
    if (!lastAssistantMessage) {
      return null;
    }
    const trimmed = lastAssistantMessage.content.trim();
    if (trimmed.length <= 120) {
      return trimmed;
    }
    return `${trimmed.slice(0, 120)}...`;
  }, [lastAssistantMessage]);

  useLayoutEffect(() => {
    if (!threadRef.current) {
      return;
    }
    const target = threadRef.current;
    const raf = window.requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [messages.length]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const resolveChatBodyPartId = useCallback(
    async (partKey: BodyPartKey | null) => {
      if (!partKey) {
        return null;
      }
      const primaryId = await resolveBodyPartId(partKey);
      if (primaryId) {
        return primaryId;
      }
      const keywords = Array.from(
        new Set([
          getBodyPartLabel(partKey),
          BODY_PART_LOOKUP[partKey]?.label,
          partKey.replace(/_/g, " "),
        ].filter(Boolean)),
      );
      for (const keyword of keywords) {
        const response = await fetchSearchResults(keyword);
        if (!response.ok || !response.data?.success) {
          continue;
        }
        const match = response.data.data[0];
        if (!match) {
          continue;
        }
        setBodyPartId(partKey, match.id);
        return match.id;
      }
      return null;
    },
    [getBodyPartLabel, resolveBodyPartId, setBodyPartId],
  );

  const handleSend = useCallback(async () => {
    if (!selectedBodyPart || !agent || !isAuthenticated) {
      return;
    }
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    addChatMessage(
      selectedBodyPart,
      createMessage("user", trimmed, agent.id),
    );
    setInput("");

    setIsSending(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const bodyPartId = await resolveChatBodyPartId(selectedBodyPart);
      if (!bodyPartId) {
        addChatMessage(
          selectedBodyPart,
          createMessage(
            "assistant",
            "선택한 부위 정보를 불러오지 못했어요. 다른 부위를 선택하거나 잠시 후 다시 시도해 주세요.",
            agent.id,
          ),
        );
        return;
      }

      const prompt = AGENT_PROMPTS[agent.id] ?? AGENT_PROMPTS.general;
      const contextLines = [
        `전문 분야: ${agent.specialty}`,
        `부위: ${partLabel ?? selectedBodyPart}`,
        systemLabel ? `계통: ${systemLabel}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const question = `${prompt}\n\n${contextLines}\n\n사용자 질문: ${trimmed}`;

      const response = await createAiAnswer(
        {
          body_part_id: bodyPartId,
          question,
        },
        controller.signal,
      );

      if (!response.ok || !response.data?.success) {
        throw new Error(`API error: ${response.status}`);
      }

      const { answer, confidence_score } = response.data.data;
      const confidence =
        typeof confidence_score === "number"
          ? Math.max(0, Math.min(1, confidence_score))
          : null;
      const message = confidence !== null
        ? `${answer}\n\n(신뢰도 ${Math.round(confidence * 100)}%)`
        : answer;

      addChatMessage(
        selectedBodyPart,
        createMessage("assistant", message, agent.id),
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("AI chat request failed:", error);
        addChatMessage(
          selectedBodyPart,
          createMessage(
            "assistant",
            "응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.",
            agent.id,
          ),
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSending(false);
      }
    }
  }, [
    addChatMessage,
    agent,
    input,
    isAuthenticated,
    isSending,
    partLabel,
    resolveChatBodyPartId,
    selectedBodyPart,
    systemLabel,
  ]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleConfirmSymptoms = useCallback(() => {
    if (!selectedBodyPart) {
      return;
    }
    confirmSymptoms(selectedBodyPart);
    setIsPromptDismissed(false);
  }, [confirmSymptoms, selectedBodyPart]);

  const handleResetSymptoms = useCallback(async () => {
    if (!selectedBodyPart) {
      return;
    }
    try {
      await clearAiContext();
    } catch {
      // Ignore reset failures to avoid blocking the local UX.
    }
    resetSymptoms(selectedBodyPart);
    setIsPromptDismissed(false);
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      composerRef.current?.focus();
    });
  }, [resetSymptoms, selectedBodyPart]);

  const handleToggleHospitalBookmark = useCallback(
    async (hospital: PlaceResult) => {
      const existing = hospitalBookmarks.find(
        (item) => item.placeId === hospital.place_id,
      );
      if (existing) {
        await removeHospitalBookmark(existing.bookmarkId);
        return;
      }
      await addHospitalBookmark(hospital);
    },
    [addHospitalBookmark, hospitalBookmarks, removeHospitalBookmark],
  );

  const isDisabled = !selectedBodyPart || !isAuthenticated || !agent || isSending;

  if (!selectedBodyPart || !agent) {
    return (
      <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-5 text-sm text-bm-muted">
        부위를 선택하면 전문 AI 상담을 시작할 수 있어요.
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-5 text-sm text-bm-muted">
        로그인 후에 전문 AI 상담을 이용할 수 있어요.
      </div>
    );
  }

  const modalContent = isModalOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      />
      <div className="relative z-10 flex h-[88vh] w-[94vw] max-w-[1240px] flex-col overflow-hidden rounded-[32px] border border-bm-border bg-bm-panel shadow-[0_25px_80px_rgba(0,0,0,0.55)] animate-[fade-up_0.25s_ease-out]">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bm-muted">
                주변 병원
              </p>
              <h3 className="mt-2 text-xl font-semibold text-bm-text">
                {partLabel && systemLabel
                  ? `${partLabel} · ${systemLabel} 병원`
                  : "관련 병원 추천"}
              </h3>
              <p className="mt-2 text-xs text-bm-muted">
                현재 위치 기반 추천 결과입니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-muted transition hover:text-bm-text"
              aria-label="모달 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:grid-rows-1">
            <section className="relative min-h-[260px] overflow-hidden rounded-2xl border border-bm-border bg-bm-panel-soft">
              <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_0%,rgba(99,199,219,0.18)_0%,transparent_70%)]" />
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(transparent_31px,rgba(255,255,255,0.06)_32px),linear-gradient(90deg,transparent_31px,rgba(255,255,255,0.06)_32px)] [background-size:32px_32px]" />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex items-center gap-2 text-xs text-bm-muted">
                  <span className="h-2 w-2 rounded-full bg-bm-accent/70" />
                  지도 영역
                </div>
                <div className="rounded-xl border border-bm-border bg-bm-panel px-3 py-2 text-[11px] text-bm-muted">
                  지도 영역은 추후 제공됩니다.
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden">
              <div className="mb-2 flex items-center justify-between text-[11px] text-bm-muted">
                <span className="font-semibold uppercase tracking-[0.2em]">
                  추천 리스트
                </span>
                <span>{relatedHospitals.length}곳</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {isLoadingHospitals ? (
                  <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted">
                    주변 병원을 검색 중입니다.
                  </div>
                ) : relatedHospitals.length === 0 ? (
                  <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted">
                    추천 병원 정보를 준비 중입니다.
                  </div>
                ) : (
                  relatedHospitals.map((hospital) => {
                    const isBookmarked = hospitalBookmarks.some(
                      (item) => item.placeId === hospital.place_id,
                    );
                    return (
                      <div
                        key={hospital.place_id}
                        className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-bm-text">
                              {hospital.name}
                            </p>
                            <p className="mt-1 text-[11px] text-bm-muted">
                              {hospital.road_address || hospital.address}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {typeof hospital.rating === "number" ? (
                              <div className="rounded-full border border-bm-border bg-bm-panel px-2 py-1 text-[10px] text-bm-muted">
                                평점 {hospital.rating}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleToggleHospitalBookmark(hospital)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft transition ${
                                isBookmarked
                                  ? "text-bm-accent"
                                  : "text-bm-muted hover:text-bm-text"
                              }`}
                              aria-pressed={isBookmarked}
                              aria-label="병원 북마크"
                            >
                              <Bookmark
                                className={`h-3.5 w-3.5 ${
                                  isBookmarked ? "fill-bm-accent" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-bm-muted">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{hospital.address}</span>
                        </div>
                        {hospital.phone_number ? (
                          <div className="mt-2 text-[11px] text-bm-muted">
                            전화 {hospital.phone_number}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
            전담 AI
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-bm-text">{agent.label}</p>
            <span className="rounded-full border border-bm-border px-3 py-1 text-[11px] text-bm-muted">
              {agent.specialty}
            </span>
          </div>
        </div>

        <div
          ref={threadRef}
          className="max-h-[280px] space-y-3 overflow-y-auto pr-1"
        >
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted">
              첫 질문을 입력하면 상담이 시작됩니다.
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "border-bm-border bg-bm-surface-soft text-bm-text"
                        : "border-bm-accent-faint bg-bm-accent-soft text-bm-text"
                    }`}
                  >
                    {!isUser ? (
                      <p className="mb-1 text-[11px] font-semibold text-bm-muted">
                        {agent.label}
                      </p>
                    ) : null}
                    {message.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
          <label
            htmlFor="agent-chat-input"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted"
          >
            질문 작성
          </label>
          <textarea
            id="agent-chat-input"
            ref={composerRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className="mt-3 h-28 w-full resize-none rounded-xl border border-bm-border bg-bm-surface-soft px-3 py-2 text-sm text-bm-text placeholder:text-bm-muted focus:border-bm-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="증상과 궁금한 점을 자세히 알려주세요"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-bm-muted">
              의료 정보는 참고용이며 진단을 대신하지 않습니다.
            </p>
            <button
              type="button"
              onClick={handleSend}
              disabled={isDisabled}
              className="min-w-[72px] rounded-xl bg-bm-accent px-3 py-2 text-center text-xs font-semibold leading-none text-black transition hover:bg-bm-accent-strong disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
            >
              {isSending ? "답변 생성 중" : "보내기"}
            </button>
          </div>
        </div>

        {hasConversation ? (
          !isSymptomConfirmed ? (
            <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                    증상 확정
                  </p>
                  <p className="mt-2 text-sm text-bm-text">
                    {part
                      ? `${partLabel ?? "해당 부위"} 상담을 마무리하고 증상을 확정해 보세요.`
                      : "상담을 마무리하고 증상을 확정해 보세요."}
                  </p>
                  <p className="mt-2 text-[11px] text-bm-muted">
                    {canConfirm
                      ? "확정되면 주변 관련 병원을 안내해 드려요."
                      : "대화를 1회 이상 완료하면 확정할 수 있어요."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmSymptoms}
                  disabled={!canConfirm}
                  className="rounded-xl bg-bm-accent px-3 py-2 text-xs font-semibold text-black transition hover:bg-bm-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  증상 확정
                </button>
              </div>
              {summarySnippet ? (
                <div className="mt-3 rounded-xl border border-bm-border bg-bm-panel px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bm-muted">
                    AI 요약
                  </p>
                  <p className="mt-1 text-xs text-bm-text/90">
                    {summarySnippet}
                  </p>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel text-bm-accent">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-bm-text">
                      증상 확정 완료
                    </p>
                    <p className="text-[11px] text-bm-muted">
                      {agent.specialty} AI 상담이 마무리되었습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetSymptoms}
                  className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                >
                  다시 상담
                </button>
              </div>
              {!isPromptDismissed ? (
                <div className="mt-3 rounded-xl border border-bm-border bg-bm-panel px-3 py-3">
                  <p className="text-sm text-bm-text leading-6 [word-break:keep-all]">
                    주변 {agent.specialty} 병원 5곳을 안내해 드릴까요?
                  </p>
                  <p className="mt-1 text-[11px] text-bm-muted">
                    {part && systemLabel
                      ? `${systemLabel} · ${partLabel ?? "선택 부위"}`
                      : "맞춤 진료과 기준"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="rounded-xl bg-bm-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-bm-accent-strong"
                    >
                      네, 보여줘
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPromptDismissed(true)}
                      className="rounded-xl border border-bm-border bg-bm-panel-soft px-4 py-2 text-xs text-bm-muted transition hover:text-bm-text"
                    >
                      나중에
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-bm-border bg-bm-panel px-3 py-2">
                  <p className="text-[11px] text-bm-muted [word-break:keep-all]">
                    병원 안내는 언제든 다시 열 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text whitespace-nowrap"
                  >
                    병원 보기
                  </button>
                </div>
              )}
            </section>
          )
        ) : null}
      </div>

      {isMounted && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};

export default AgentChatPanel;
