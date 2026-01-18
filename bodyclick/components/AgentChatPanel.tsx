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
import { useAuthStore } from "../store/useAuthStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import {
  BODY_PART_LOOKUP,
  SYSTEM_LABELS,
  getAgentProfileForPart,
  useBodyMapStore,
  type AgentKey,
  type ChatMessage,
} from "../store/useBodyMapStore";

const AGENT_RESPONSES: Record<AgentKey, string[]> = {
  orthopedic: [
    "통증이 생기는 움직임과 지속 시간을 먼저 확인해 주세요.",
    "관절 가동 범위와 부종 여부가 중요한 지표입니다.",
    "무리한 운동은 피하고 냉찜질로 통증을 완화하세요.",
  ],
  cardiology: [
    "흉부 압박감이나 호흡 곤란이 있다면 즉시 평가가 필요합니다.",
    "맥박 변동과 혈압 상태를 함께 확인해 주세요.",
    "증상이 지속된다면 심전도와 혈액 검사가 도움이 됩니다.",
  ],
  vascular: [
    "통증 부위의 맥박과 온도 차이를 살펴보세요.",
    "갑작스러운 흉통이나 등 통증은 즉시 확인이 필요합니다.",
    "혈압 변화와 동반 증상을 함께 기록해 주세요.",
  ],
  pulmonology: [
    "기침 양상과 호흡 곤란 정도를 구체적으로 알려주세요.",
    "열감이나 가래 변화가 있다면 함께 확인이 필요합니다.",
    "흉부 통증이 동반된다면 빠른 평가가 권장됩니다.",
  ],
  gastroenterology: [
    "통증이 나타나는 시간과 음식 섭취와의 관계를 확인해 주세요.",
    "속쓰림, 메스꺼움 같은 증상이 동반되는지 중요합니다.",
    "배변 변화가 있다면 함께 기록해 주세요.",
  ],
  neurology: [
    "저림, 감각 이상, 근력 저하 여부를 먼저 확인하세요.",
    "증상의 시작 시간과 진행 속도가 중요한 정보입니다.",
    "두통이나 어지럼이 동반된다면 추가 평가가 필요합니다.",
  ],
  dermatology: [
    "가려움 정도와 발진 형태를 자세히 알려주세요.",
    "최근 사용한 제품이나 환경 변화가 있었는지 확인해 주세요.",
    "상처 치유가 느리다면 전신 상태도 함께 살펴야 합니다.",
  ],
  general: [
    "증상 위치와 지속 시간을 알려주세요.",
    "최근 활동이나 생활 변화가 있었는지 확인해 주세요.",
  ],
};

const buildMockResponse = (agentId: AgentKey, prompt: string) => {
  const responses = AGENT_RESPONSES[agentId] ?? AGENT_RESPONSES.general;
  const index = prompt.length % responses.length;
  return responses[index];
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hospitalCatalog = useBookmarkStore((state) => state.hospitalCatalog);
  const favoriteHospitals = useBookmarkStore((state) => state.favoriteHospitals);
  const toggleHospital = useBookmarkStore((state) => state.toggleHospital);

  const agent = getAgentProfileForPart(selectedBodyPart);
  const messages = selectedBodyPart ? chatThreads[selectedBodyPart] ?? [] : [];
  const part = selectedBodyPart ? BODY_PART_LOOKUP[selectedBodyPart] : null;
  const systemLabel = part ? SYSTEM_LABELS[part.system] : null;
  const isSymptomConfirmed = Boolean(
    selectedBodyPart && confirmedSymptoms[selectedBodyPart],
  );
  const canConfirm = messages.length >= 2;
  const hasConversation = messages.length > 0;

  const [input, setInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pendingResponseRef = useRef<number | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInput("");
  }, [selectedBodyPart]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (!part) {
      return [];
    }
    return hospitalCatalog
      .filter((hospital) => hospital.systems.includes(part.system))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [hospitalCatalog, part]);

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
      if (pendingResponseRef.current) {
        window.clearTimeout(pendingResponseRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    if (!selectedBodyPart || !agent || !isAuthenticated) {
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    addChatMessage(
      selectedBodyPart,
      createMessage("user", trimmed, agent.id),
    );
    setInput("");

    pendingResponseRef.current = window.setTimeout(() => {
      const response = buildMockResponse(agent.id, trimmed);
      addChatMessage(
        selectedBodyPart,
        createMessage("assistant", response, agent.id),
      );
    }, 620);

    // TODO: Gemini API 응답으로 대체하세요.
  }, [addChatMessage, agent, input, isAuthenticated, selectedBodyPart]);

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

  const handleResetSymptoms = useCallback(() => {
    if (!selectedBodyPart) {
      return;
    }
    resetSymptoms(selectedBodyPart);
    setIsPromptDismissed(false);
  }, [resetSymptoms, selectedBodyPart]);

  const isDisabled = !selectedBodyPart || !isAuthenticated || !agent;

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
                {part && systemLabel
                  ? `${part.label} · ${systemLabel} 병원`
                  : "관련 병원 추천"}
              </h3>
              <p className="mt-2 text-xs text-bm-muted">
                현재 위치 기준 5km 이내 · 데모 데이터
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
                  지도 API 연결 예정 · 3:1 레이아웃 적용
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
                {relatedHospitals.length === 0 ? (
                  <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted">
                    추천 병원 정보를 준비 중입니다.
                  </div>
                ) : (
                  relatedHospitals.map((hospital) => {
                    const isBookmarked = favoriteHospitals.some(
                      (item) => item.id === hospital.id,
                    );
                    return (
                      <div
                        key={hospital.id}
                        className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-bm-text">
                              {hospital.name}
                            </p>
                            <p className="mt-1 text-[11px] text-bm-muted">
                              {hospital.specialty} · {hospital.distanceKm}km
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full border border-bm-border bg-bm-panel px-2 py-1 text-[10px] text-bm-muted">
                              평점 {hospital.rating}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleHospital(hospital.id)}
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hospital.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-bm-border bg-bm-panel px-2 py-0.5 text-[10px] text-bm-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
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
              보내기
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
                      ? `${part.label} 상담을 마무리하고 증상을 확정해 보세요.`
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
                      ? `${systemLabel} · ${part.label}`
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
