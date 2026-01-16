"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InfoPanel from "../../components/InfoPanel";
import Stage3D from "../../components/Stage3D";
import SystemLayerSelector from "../../components/SystemLayerSelector";
import { useAuthStore } from "../../store/useAuthStore";
import Link from "next/link";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";

const ExplorePage = () => {
  const { isAuthenticated, user, logout, updateProfile } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    email: "",
    gender: "",
    birthdate: "",
  });

  const profileInitial = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) {
      return "U";
    }
    return name[0].toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setProfileDraft({
      name: user.name ?? "",
      email: user.email ?? "",
      gender: user.gender ?? "",
      birthdate: user.birthdate ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (profileMenuRef.current && target) {
        if (!profileMenuRef.current.contains(target)) {
          setIsProfileOpen(false);
          setIsEditingProfile(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1520px] flex-col gap-8 px-5 pb-20 pt-6 lg:flex-row lg:items-stretch lg:gap-8 lg:pl-6 lg:pr-10 lg:pt-24">
          <header className="flex items-center justify-between lg:absolute lg:left-10 lg:right-10 lg:top-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
                바디클릭
              </p>
              <p className="mt-2 text-sm text-bm-muted">3D 인체 탐색</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden text-xs text-bm-muted lg:block">
                의료 인사이트 인터페이스
              </p>
              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isProfileOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-xs font-semibold text-bm-text transition hover:text-bm-accent"
                  >
                    {profileInitial}
                  </button>
                  {isProfileOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-bm-border bg-bm-panel px-4 py-3 text-xs text-bm-text shadow-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bm-muted">
                          내 프로필
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setIsEditingProfile((prev) => !prev)
                          }
                          className="rounded-full border border-bm-border bg-bm-panel-soft px-2 py-0.5 text-[10px] text-bm-muted transition hover:text-bm-text"
                        >
                          {isEditingProfile ? "닫기" : "프로필 수정"}
                        </button>
                      </div>

                      {!isEditingProfile ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-semibold">{user?.name}</p>
                          <p className="text-[11px] text-bm-muted">
                            {user?.email}
                          </p>
                          <p className="text-[11px] text-bm-muted">
                            {user?.gender || "성별 미지정"}
                          </p>
                          <p className="text-[11px] text-bm-muted">
                            {user?.birthdate || "생년월일 미지정"}
                          </p>
                        </div>
                      ) : (
                        <form
                          className="mt-3 space-y-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            updateProfile({
                              name: profileDraft.name,
                              email: profileDraft.email,
                              gender: profileDraft.gender,
                              birthdate: profileDraft.birthdate,
                            });
                            setIsEditingProfile(false);
                          }}
                        >
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-bm-muted">
                              이름
                            </span>
                            <input
                              type="text"
                              value={profileDraft.name}
                              onChange={(event) =>
                                setProfileDraft((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-bm-border bg-bm-panel-soft px-2 text-xs text-bm-text"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-bm-muted">
                              이메일
                            </span>
                            <input
                              type="email"
                              value={profileDraft.email}
                              onChange={(event) =>
                                setProfileDraft((prev) => ({
                                  ...prev,
                                  email: event.target.value,
                                }))
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-bm-border bg-bm-panel-soft px-2 text-xs text-bm-text"
                            />
                          </label>
                          <GenderSelect
                            label="성별"
                            value={profileDraft.gender}
                            onChange={(gender) =>
                              setProfileDraft((prev) => ({
                                ...prev,
                                gender,
                              }))
                            }
                            size="compact"
                            portal={false}
                          />
                          <BirthDatePicker
                            label="생년월일"
                            value={profileDraft.birthdate}
                            onChange={(birthdate) =>
                              setProfileDraft((prev) => ({
                                ...prev,
                                birthdate,
                              }))
                            }
                            size="compact"
                            portal={false}
                          />
                          <div className="mt-1 flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileOpen(false);
                                setIsEditingProfile(false);
                              }}
                              className="flex-1 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsProfileOpen(false);
                          setIsEditingProfile(false);
                        }}
                        className="mt-3 w-full rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                      >
                        로그아웃
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                >
                  로그인
                </Link>
              )}
            </div>
          </header>

          <div className="order-2 mt-4 flex items-center justify-center lg:order-1 lg:mt-0 lg:w-48 lg:-ml-6 lg:items-start">
            <SystemLayerSelector />
          </div>

          <div className="order-1 flex flex-1 items-center justify-center lg:order-2 lg:mt-0">
            <Stage3D />
          </div>

          <div className="order-3">
            <InfoPanel />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ExplorePage;
