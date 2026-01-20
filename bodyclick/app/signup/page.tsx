"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, updateUserProfile } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

const SignupPage = () => {
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setUserFromApi = useAuthStore((state) => state.setUserFromApi);
  const router = useRouter();
  const [googleAccount, setGoogleAccount] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/explore");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const loadUser = async () => {
      const response = await fetchCurrentUser();
      if (response.status === 401) {
        router.replace("/login");
        setIsLoading(false);
        return;
      }
      if (response.ok && response.data?.success) {
        const user = response.data.data;
        setUserFromApi(user);
        if (user.gender && user.birth_date) {
          router.replace("/explore");
          return;
        }
        setGoogleAccount({
          name: user.name ?? "바디클릭 사용자",
          email: user.email,
        });
        setGender(user.gender ?? "");
        setBirthdate(user.birth_date ?? "");
      }
      setIsLoading(false);
    };
    loadUser();
  }, [router, setUserFromApi]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!birthdate || !gender || !googleAccount?.email) {
      return;
    }
    const response = await updateUserProfile({
      name: googleAccount.name,
      gender: gender as "MALE" | "FEMALE",
      birth_date: birthdate,
    });
    if (response.ok && response.data?.success) {
      updateProfile({
        name: googleAccount.name,
        gender: gender as "MALE" | "FEMALE" | null,
        birthdate,
      });
      router.push("/explore");
      return;
    }
    alert("저장 실패");
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bm-bg text-bm-text">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_20%,rgba(99,199,219,0.18)_0%,transparent_70%)]" />
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
            추가 정보 입력
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-bm-text">
            구글 로그인 후 기본 정보를 입력하세요
          </h1>
          <p className="mt-2 text-sm text-bm-muted">
            성별과 생년월일은 상담 품질 향상을 위해 사용됩니다.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-xl border border-bm-border bg-bm-panel-soft p-3 text-xs text-bm-muted">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.2em]">Google 계정</span>
                <span className="text-bm-text">
                  {googleAccount?.name ?? "Google 계정 확인 중"}
                </span>
              </div>
              <p className="mt-1 text-bm-text">
                {googleAccount?.email ?? "계정을 불러오는 중입니다."}
              </p>
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
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-bm-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
            >
              정보 저장
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-bm-muted">
            <span>이미 로그인이 끝났나요?</span>
            <Link className="font-semibold text-bm-text hover:text-bm-accent" href="/login">
              로그인 화면으로
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-bm-muted">
            입력한 정보는 상담 이력을 맞춤화하는 데 활용됩니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;
