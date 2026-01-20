import React from "react";

export default function TypingBubble() {
  return (
    <div className="flex w-fit items-start gap-2 animate-fade-in">
      {/* 말풍선 컨테이너 */}
      <div className="relative flex items-center gap-1 rounded-2xl rounded-tl-none border border-bm-border bg-bm-panel-soft px-4 py-3">
        {/* 통통 튀는 점 3개 */}
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-bm-muted"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-bm-muted"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-bm-muted"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-bm-muted self-center">AI 입력 중...</span>
    </div>
  );
}