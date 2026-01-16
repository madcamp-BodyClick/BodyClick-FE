"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/explore");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    login(email.trim());
    router.push("/explore");
  };

  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
        </div>

        <div className="relative w-full max-w-md rounded-[28px] border border-bm-border bg-bm-panel p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
            바디클릭 로그인
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-bm-text">
            의료 AI 상담을 시작하세요
          </h1>
          <p className="mt-2 text-sm text-bm-muted">
            선택한 부위에 맞춘 전문 AI 상담을 이용할 수 있습니다.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                이메일
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="h-11 w-full rounded-xl border border-bm-border bg-bm-surface-soft px-3 text-sm text-bm-text placeholder:text-bm-muted focus:border-bm-accent focus:outline-none"
                placeholder="이메일 주소"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                비밀번호
              </label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="h-11 w-full rounded-xl border border-bm-border bg-bm-surface-soft px-3 text-sm text-bm-text placeholder:text-bm-muted focus:border-bm-accent focus:outline-none"
                placeholder="8자리 이상"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-bm-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
            >
              로그인
            </button>
          </form>

          <p className="mt-6 text-[11px] text-bm-muted">
            로그인은 인증된 의료 상담 환경을 위한 절차입니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
