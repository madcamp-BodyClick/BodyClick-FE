"use client";

const MESSAGES = [
  {
    id: "user-1",
    role: "user",
    content: "어깨를 올릴 때 통증이 심해요. 어떤 부분을 먼저 확인해야 하나요?",
  },
  {
    id: "assistant-1",
    role: "assistant",
    content:
      "통증 위치와 움직임 범위, 외상 여부를 먼저 확인하는 것이 좋아요. 회전근개나 관절낭이 관련될 수 있어요.",
  },
];

const MedicalChatPanel = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {MESSAGES.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "border-bm-border bg-bm-surface-soft text-bm-text"
                  : "border-bm-accent-faint bg-bm-accent-soft text-bm-text"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
        <label
          htmlFor="medical-chat-input"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted"
        >
          질문 작성
        </label>
        <textarea
          id="medical-chat-input"
          className="mt-3 h-24 w-full resize-none rounded-xl border border-bm-border bg-bm-surface-soft px-3 py-2 text-sm text-bm-text placeholder:text-bm-muted focus:border-bm-accent focus:outline-none"
          placeholder="궁금한 증상이나 상황을 입력하세요"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-bm-muted">
            의료 정보는 참고용이며 진단을 대신하지 않습니다.
          </p>
          <button
            type="button"
            className="rounded-full bg-bm-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-bm-accent-strong"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalChatPanel;
