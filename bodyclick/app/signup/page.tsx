"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/explore");
    }
  }, [isAuthenticated, router]);


  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !name.trim() || !birthdate || !gender) {
      return;
    }
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
        </div>

        <div className="relative w-full max-w-md rounded-[28px] border border-bm-border bg-bm-panel p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/login");
            }}
            className="absolute right-6 top-6 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
          >
            취소
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
            바디클릭 회원가입
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-bm-text">
            전문 AI 상담을 위한 계정 만들기
          </h1>
          <p className="mt-2 text-sm text-bm-muted">
            이메일로 계정을 생성하면 상담 내역을 안전하게 관리할 수 있습니다.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
                이름
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                className="h-11 w-full rounded-xl border border-bm-border bg-bm-surface-soft px-3 text-sm text-bm-text placeholder:text-bm-muted focus:border-bm-accent focus:outline-none"
                placeholder="이름"
                required
              />
            </div>
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
            <GenderSelect
              label="성별"
              value={gender}
              onChange={setGender}
            />
            <div className="space-y-2">
              <BirthDatePicker
                label="생년월일"
                value={birthdate}
                onChange={setBirthdate}
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
                required
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-bm-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
            >
              회원가입
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-bm-muted">
            <span>이미 계정이 있으신가요?</span>
            <Link className="font-semibold text-bm-text hover:text-bm-accent" href="/login">
              로그인
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-bm-muted">
            계정 생성은 인증된 의료 상담 환경을 위한 절차입니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;
