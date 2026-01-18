"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

const LoginPage = () => {
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const router = useRouter();
  const googleAccount = {
    name: "바디클릭 사용자",
    email: "bodyclick.user@gmail.com",
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/explore");
    }
  }, [isAuthenticated, router]);

  const handleExistingLogin = () => {
    login(googleAccount.email);
    router.push("/explore");
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gender || !birthdate) {
      return;
    }
    login(googleAccount.email);
    updateProfile({
      name: googleAccount.name,
      gender,
      birthdate,
    });
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
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/explore");
            }}
            className="absolute right-6 top-6 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
          >
            취소
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
            바디클릭 로그인
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-bm-text">
            Google 계정으로 빠르게 시작하세요
          </h1>
          <p className="mt-2 text-sm text-bm-muted">
            구글 로그인을 통해 안전하게 상담 기록을 관리합니다.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setIsGoogleReady(true)}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-bm-border bg-bm-panel-soft px-4 py-3 text-sm font-semibold text-bm-text transition hover:bg-bm-panel"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                G
              </span>
              Google로 계속하기
            </button>
            <button
              type="button"
              onClick={handleExistingLogin}
              className="w-full rounded-xl border border-bm-border bg-bm-panel-soft px-4 py-3 text-sm text-bm-muted transition hover:text-bm-text"
            >
              기존 회원이면 바로 시작
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
              신규 회원 안내
            </p>
            <p className="mt-2 text-sm text-bm-text">
              구글 로그인 후 성별과 생년월일을 입력해 주세요.
            </p>

            {isGoogleReady ? (
              <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
                <div className="rounded-xl border border-bm-border bg-bm-panel p-3 text-xs text-bm-muted">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-[0.2em]">Google 계정</span>
                    <span className="text-bm-text">{googleAccount.name}</span>
                  </div>
                  <p className="mt-1 text-bm-text">{googleAccount.email}</p>
                </div>
                <GenderSelect
                  label="성별"
                  value={gender}
                  onChange={setGender}
                />
                <BirthDatePicker
                  label="생년월일"
                  value={birthdate}
                  onChange={setBirthdate}
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-bm-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
                >
                  정보 저장 후 시작
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-bm-muted">
                구글 로그인 버튼을 눌러 정보를 입력할 수 있어요.
              </p>
            )}
          </div>

          <p className="mt-4 text-[11px] text-bm-muted">
            로그인은 인증된 의료 상담 환경을 위한 절차입니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
