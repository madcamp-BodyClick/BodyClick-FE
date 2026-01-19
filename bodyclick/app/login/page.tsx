"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

// API URL 설정 (없으면 하드코딩 값 사용)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// 데이터 타입 정의
interface UserApiResponse {
  success: boolean;
  data?: {
    name: string;
    email: string;
    gender: string | null;
    birth_date: string | null;
  };
}

const LoginPage = () => {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [googleAccount, setGoogleAccount] = useState<{ name: string; email: string } | null>(null);

  const updateProfile = useAuthStore((state) => state.updateProfile);

  /**
   * 1️⃣ 페이지 진입 시: 사용자 상태 확인
   */
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // ⚠️ 핵심 수정: credentials: "include"가 있어야 쿠키가 전송됨
        const res = await fetch(`${API_URL}/api/users/me`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // <--- 이 줄이 없으면 무조건 401 에러 남
        });

        // 401이면 로그인 안 된 상태 -> 정상
        if (res.status === 401) {
          setIsLoading(false);
          return;
        }

        const json: UserApiResponse = await res.json();

        if (json.success && json.data) {
          const userData = json.data;

          // 이미 정보가 다 있으면 바로 /explore로 이동
          if (userData.gender && userData.birth_date) {
            router.replace("/explore");
            return;
          }

          // 정보가 부족하면 입력 폼 띄우기
          setGoogleAccount({
            name: userData.name ?? "사용자",
            email: userData.email,
          });
        }
      } catch (error) {
        console.error("Login Check Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [router]);

  /**
   * 2️⃣ Google 로그인 핸들러
   */
  const handleGoogleLogin = () => {
    // 로그인 후 성별/생년월일이 비어 있으면 바로 입력할 수 있도록 /login으로 복귀
    const callbackUrl = `${window.location.origin}/login`;
    window.location.href = `${API_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(
      callbackUrl,
    )}`;
  };

  /**
   * 3️⃣ 추가 정보 제출
   */
  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gender || !birthdate || !googleAccount) return;

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // PATCH 요청에도 필수
        body: JSON.stringify({
          name: googleAccount.name,
          gender: gender,
          birth_date: birthdate,
        }),
      });

      const json = await res.json();

      if (json.success) {
        updateProfile({ name: googleAccount.name, gender, birthdate });
        router.push("/explore");
      } else {
        alert("저장 실패");
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bm-bg text-bm-text">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_20%,rgba(99,199,219,0.18)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_80%_10%,rgba(255,255,255,0.06)_0%,transparent_65%)]" />
        </div>
        <div className="relative flex items-center gap-3 rounded-full border border-bm-border bg-bm-panel-soft px-6 py-3 text-sm text-bm-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-bm-accent" />
          세션 확인 중
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_15%_15%,rgba(99,199,219,0.18)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_5%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-bm-accent-faint blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:flex-row md:items-center md:gap-12 lg:pt-20">
          <section className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
              BodyClick
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
              몸의 신호를 더 깊게 이해하는
              <span className="block text-bm-accent-strong">
                맞춤형 인체 탐색
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-sm text-bm-muted">
              Google 계정으로 간단히 시작하고, 성별과 생년월일을
              입력하면 개인화된 인사이트가 준비됩니다.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "3D 바디맵",
                  desc: "직관적으로 부위를 탐색",
                },
                {
                  title: "맞춤 인사이트",
                  desc: "개인 데이터를 반영한 추천",
                },
                {
                  title: "의료 시스템",
                  desc: "계층별 정보 구조화",
                },
                {
                  title: "빠른 탐색",
                  desc: "최근 선택 부위 바로 접근",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-bm-border bg-bm-panel-soft px-4 py-4"
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-bm-muted">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-bm-muted">
              {["보안 인증", "데이터 최소화", "즉시 시작"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1"
                >
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section className="w-full max-w-md">
            <div className="rounded-[28px] border border-bm-border bg-bm-panel p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bm-muted">
                    Access
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">로그인</h2>
                  <p className="mt-2 text-sm text-bm-muted">
                    {googleAccount
                      ? "추가 정보만 입력하면 바로 시작할 수 있어요."
                      : "Google 계정으로 빠르게 연결하세요."}
                  </p>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-xs font-semibold text-bm-muted sm:flex">
                  01
                </div>
              </div>

              {googleAccount ? (
                <div className="mt-6">
                  <div className="rounded-2xl border border-bm-border bg-bm-panel-soft px-4 py-4">
                    <p className="text-xs text-bm-muted">연결된 계정</p>
                    <p className="mt-2 text-sm font-semibold text-bm-text">
                      {googleAccount.name}
                    </p>
                    <p className="mt-1 text-xs text-bm-muted">
                      {googleAccount.email}
                    </p>
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}>
                    <GenderSelect label="성별" value={gender} onChange={setGender} />
                    <BirthDatePicker
                      label="생년월일"
                      value={birthdate}
                      onChange={setBirthdate}
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-bm-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
                    >
                      시작하기
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-bm-border bg-bm-panel-soft px-4 py-3 text-sm font-semibold transition hover:border-bm-border-strong hover:bg-bm-panel"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-bg text-xs font-bold">
                      G
                    </span>
                    Google로 계속하기
                  </button>
                  <div className="mt-4 rounded-2xl border border-bm-border bg-bm-panel-soft px-4 py-4">
                    <p className="text-xs text-bm-muted">
                      최초 로그인 시 기본 정보를 확인합니다.
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-6 text-xs text-bm-muted">
                계속하면 BodyClick의 서비스 약관과 개인정보 처리방침에
                동의하게 됩니다.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
