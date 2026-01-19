"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { fetchCurrentUser, updateUserProfile } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

const LoginPage = () => {
  const router = useRouter();
  
  // 로딩 및 폼 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  
  // 로그인된 계정 정보 (추가 정보 입력 단계용)
  const [googleAccount, setGoogleAccount] = useState<{ name: string; email: string } | null>(null);

  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setUserFromApi = useAuthStore((state) => state.setUserFromApi);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const res = await fetchCurrentUser();

        // 401 Unauthorized -> 로그인 안 됨 -> 로그인 버튼 노출
        if (res.status === 401) {
          setIsLoading(false);
          return;
        }

        // 로그인 성공 시
        if (res.ok && res.data?.success) {
          const userData = res.data.data;
          setUserFromApi(userData);

          // 이미 필수 정보(성별, 생일)가 다 있으면 메인으로 이동
          if (userData?.gender && userData.birth_date) {
            router.replace("/explore");
            return;
          }

          // 정보가 부족하면 추가 입력 폼 띄우기
          setGoogleAccount({
            name: userData?.name ?? "사용자",
            email: userData?.email ?? "",
          });
          setGender(userData?.gender ?? "");
          setBirthdate(userData?.birth_date ?? "");
          return; // 로딩 끄지 않고 폼 렌더링으로 자연스럽게 전환
        }

        if (res.data && !res.data.success) {
          console.warn("Login Check Error Response:", res.data);
        }
      } catch (error) {
        console.error("Login Check Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [router, setUserFromApi]);

  /**
   * 2️⃣ Google 로그인 핸들러 (수정됨)
   * 수동 URL 조합 대신 signIn 함수 사용 -> 404 및 리다이렉트 문제 해결
   */
  const handleGoogleLogin = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/login", // 로그인 완료 후 다시 이 페이지로 돌아와 상태 체크
      });
    } catch (error) {
      console.error("Google 로그인 요청 실패:", error);
    }
  };

  /**
   * 3️⃣ 추가 정보 제출 핸들러 (타입 오류 수정됨)
   */
  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // 유효성 검사: 값이 비어있으면 진행하지 않음
    if (!gender || !birthdate || !googleAccount) return;

    try {
      const res = await updateUserProfile({
        name: googleAccount.name,
        gender: gender as "MALE" | "FEMALE",
        birth_date: birthdate,
      });

      if (res.ok && res.data?.success) {
        // 스토어 업데이트 및 페이지 이동
        updateProfile({ name: googleAccount.name, gender: gender as "MALE" | "FEMALE" | null | undefined, birthdate });
        router.push("/explore");
      } else {
        alert("정보 저장에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Profile Update Error:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  // 로딩 화면
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
        {/* 배경 효과 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_15%_15%,rgba(99,199,219,0.18)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_5%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-bm-accent-faint blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:flex-row md:items-center md:gap-12 lg:pt-20">
          
          {/* 좌측: 서비스 소개 섹션 */}
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
                { title: "3D 바디맵", desc: "직관적으로 부위를 탐색" },
                { title: "맞춤 인사이트", desc: "개인 데이터를 반영한 추천" },
                { title: "의료 시스템", desc: "계층별 정보 구조화" },
                { title: "빠른 탐색", desc: "최근 선택 부위 바로 접근" },
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

          {/* 우측: 로그인 및 정보 입력 폼 섹션 */}
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
              </div>

              {googleAccount ? (
                // ✅ Case 1: 구글 로그인은 되었으나 추가 정보(성별/생일)가 없는 경우
                <div className="mt-6 animate-fade-in">
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
                // ✅ Case 2: 로그인되지 않은 경우
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