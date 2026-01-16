"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const agent = getAgentProfileForPart(selectedBodyPart);
  const messages = selectedBodyPart ? chatThreads[selectedBodyPart] ?? [] : [];

  const [input, setInput] = useState("");
  const pendingResponseRef = useRef<number | null>(null);

  useEffect(() => {
    setInput("");
  }, [selectedBodyPart]);

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
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

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

  return (
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

      <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
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
            className="rounded-xl bg-bm-accent px-3 py-2 text-center text-xs font-semibold leading-tight text-black transition hover:bg-bm-accent-strong disabled:cursor-not-allowed disabled:opacity-60 whitespace-normal break-words"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPanel;
