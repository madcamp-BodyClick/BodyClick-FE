"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Search, User } from "lucide-react";
import InfoPanel from "../../components/InfoPanel";
import Stage3D from "../../components/Stage3D";
import SystemLayerSelector from "../../components/SystemLayerSelector";
import {
  fetchSearchHome,
  fetchSearchResults,
  signOutUser,
  updateUserProfile,
  type SearchHistoryItem,
  type SearchHomePopularItem,
} from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";
import BirthDatePicker from "../../components/BirthDatePicker";
import GenderSelect from "../../components/GenderSelect";
import {
  BODY_PART_LOOKUP,
  BODY_PARTS,
  useBodyMapStore,
  type BodyPartKey,
  type SystemKey,
} from "../../store/useBodyMapStore";

type PartOption = {
  id: BodyPartKey;
  label: string;
  system: SystemKey;
  systemLabel: string;
};

const ExplorePage = () => {
  const router = useRouter();
  const { isAuthenticated, user, updateProfile, clearUser } = useAuthStore();
  const setSystem = useBodyMapStore((state) => state.setSystem);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  const recentBodyParts = useBodyMapStore((state) => state.recentBodyParts);
  const bodyPartSelections = useBodyMapStore(
    (state) => state.bodyPartSelections,
  );
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);
  const getBodyPartCodeByLabel = useBodyMapStore(
    (state) => state.getBodyPartCodeByLabel,
  );
  const setBodyPartId = useBodyMapStore((state) => state.setBodyPartId);
  const setBodyPartLabel = useBodyMapStore((state) => state.setBodyPartLabel);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    gender: "",
    birthdate: "",
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSort, setSearchSort] = useState<"recent" | "popular">("recent");
  const [popularParts, setPopularParts] = useState<SearchHomePopularItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<SearchHistoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<PartOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const profileInitial = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) {
      return "U";
    }
    return name[0].toUpperCase();
  }, [user?.name]);
  const hasProfileName = Boolean(user?.name?.trim());

  useEffect(() => {
    if (!user) {
      return;
    }
    setProfileDraft({
      name: user.name ?? "",
      gender: user.gender ?? "",
      birthdate: user.birthdate ?? "",
    });
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileOpen(false);
        setIsEditingProfile(false);
      }
      if (searchPanelRef.current && !searchPanelRef.current.contains(target)) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isSearchOpen]);

  useEffect(() => {
    const loadSearchHome = async () => {
      const response = await fetchSearchHome();
      if (response.ok && response.data?.success) {
        setPopularParts(response.data.data.popular_body_parts);
        setRecentHistory(response.data.data.my_recent_history ?? []);
        return;
      }
      setPopularParts([]);
      setRecentHistory([]);
    };
    loadSearchHome();
  }, [isAuthenticated]);

  useEffect(() => {
    popularParts.forEach((item) => {
      const code = getBodyPartCodeByLabel(item.name);
      if (!code) {
        return;
      }
      setBodyPartId(code, item.id);
      setBodyPartLabel(code, item.name);
    });
  }, [getBodyPartCodeByLabel, popularParts, setBodyPartId, setBodyPartLabel]);

  useEffect(() => {
    recentHistory.forEach((item) => {
      if (!item.body_part_id) {
        return;
      }
      const code = getBodyPartCodeByLabel(item.keyword);
      if (!code) {
        return;
      }
      setBodyPartId(code, item.body_part_id);
      setBodyPartLabel(code, item.keyword);
    });
  }, [getBodyPartCodeByLabel, recentHistory, setBodyPartId, setBodyPartLabel]);

  const buildPartOption = useCallback(
    (code: BodyPartKey): PartOption | null => {
      const system = BODY_PART_LOOKUP[code]?.system;
      if (!system) {
        return null;
      }
      return {
        id: code,
        label: getBodyPartLabel(code),
        system,
        systemLabel: getSystemLabel(system),
      };
    },
    [getBodyPartLabel, getSystemLabel],
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      const response = await fetchSearchResults(trimmed);
      if (!response.ok || !response.data?.success) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      const mapped = response.data.data
        .map((item) => {
          const code = getBodyPartCodeByLabel(item.name);
          if (!code) {
            return null;
          }
          setBodyPartId(code, item.id);
          setBodyPartLabel(code, item.name);
          return buildPartOption(code);
        })
        .filter(Boolean) as PartOption[];
      setSearchResults(mapped);
      setIsSearching(false);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [
    buildPartOption,
    getBodyPartCodeByLabel,
    searchQuery,
    setBodyPartId,
    setBodyPartLabel,
  ]);

  const allParts = useMemo(() => {
    return Object.values(BODY_PARTS)
      .flat()
      .map((part) => {
        const system = BODY_PART_LOOKUP[part.id]?.system;
        if (!system) {
          return null;
        }
        return {
          id: part.id,
          label: getBodyPartLabel(part.id),
          system,
          systemLabel: getSystemLabel(system),
        };
      })
      .filter(Boolean) as PartOption[];
  }, [getBodyPartLabel, getSystemLabel]);
  const filteredParts = useMemo(() => {
    const query = searchQuery.trim();
    if (query && searchResults.length > 0) {
      return searchResults;
    }
    const candidates = allParts.filter(
      (part) =>
        !query ||
        part.label.includes(query) ||
        part.id.toLowerCase().includes(query.toLowerCase()),
    );

    const popularRank = new Map<BodyPartKey, number>();
    popularParts.forEach((item) => {
      const code = getBodyPartCodeByLabel(item.name);
      if (code) {
        popularRank.set(code, item.view_count);
      }
    });

    const recentRank = new Map<BodyPartKey, number>();
    if (recentHistory.length > 0) {
      recentHistory.forEach((item, index) => {
        const code = getBodyPartCodeByLabel(item.keyword);
        if (code) {
          recentRank.set(code, index);
        }
      });
    } else {
      recentBodyParts.forEach((partId, index) => {
        recentRank.set(partId, index);
      });
    }

    if (searchSort === "popular") {
      return [...candidates].sort((a, b) => {
        const aScore = popularRank.get(a.id) ?? (bodyPartSelections[a.id] ?? 0);
        const bScore = popularRank.get(b.id) ?? (bodyPartSelections[b.id] ?? 0);
        if (aScore === bScore) {
          return a.label.localeCompare(b.label);
        }
        return bScore - aScore;
      });
    }

    return [...candidates].sort((a, b) => {
      const aIndex = recentRank.get(a.id) ?? Number.POSITIVE_INFINITY;
      const bIndex = recentRank.get(b.id) ?? Number.POSITIVE_INFINITY;
      if (aIndex === bIndex) {
        return a.label.localeCompare(b.label);
      }
      return aIndex - bIndex;
    });
  }, [
    allParts,
    bodyPartSelections,
    getBodyPartCodeByLabel,
    popularParts,
    recentBodyParts,
    recentHistory,
    searchQuery,
    searchResults,
    searchSort,
  ]);

  const recommendedParts = useMemo(() => {
    const popularOptions = popularParts
      .map((item) => {
        const code = getBodyPartCodeByLabel(item.name);
        if (!code) {
          return null;
        }
        return buildPartOption(code);
      })
      .filter(Boolean) as PartOption[];

    const recentOptions =
      recentHistory.length > 0
        ? recentHistory
            .map((item) => {
              const code = getBodyPartCodeByLabel(item.keyword);
              if (!code) {
                return null;
              }
              return buildPartOption(code);
            })
            .filter(Boolean)
        : recentBodyParts
            .map((partId) => buildPartOption(partId))
            .filter(Boolean);

    if (searchSort === "popular" && popularOptions.length > 0) {
      return popularOptions.slice(0, 8);
    }
    if (searchSort === "recent" && recentOptions.length > 0) {
      return recentOptions.slice(0, 8);
    }
    return allParts.slice(0, 8);
  }, [
    allParts,
    buildPartOption,
    getBodyPartCodeByLabel,
    popularParts,
    recentBodyParts,
    recentHistory,
    searchSort,
  ]);
  const handleSelectPart = (partId: BodyPartKey) => {
    const part = BODY_PART_LOOKUP[partId];
    if (!part) {
      return;
    }
    setSystem(part.system);
    setBodyPart(partId);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

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
              <div className="relative flex items-center gap-2" ref={searchPanelRef}>
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={profileMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsProfileOpen((prev) => !prev)}
                        aria-haspopup="menu"
                        aria-expanded={isProfileOpen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-muted transition hover:text-bm-accent"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
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
                              {user?.gender === "MALE"
                                ? "남"
                                : user?.gender === "FEMALE"
                                  ? "여"
                                  : "성별 미지정"}
                            </p>
                            <p className="text-[11px] text-bm-muted">
                              {user?.birthdate || "생년월일 미지정"}
                            </p>
                          </div>
                        ) : (
                          <form
                            className="mt-3 space-y-2"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const response = await updateUserProfile({
                                name: profileDraft.name,
                                gender: profileDraft.gender as "MALE" | "FEMALE",
                                birth_date: profileDraft.birthdate,
                              });
                              if (response.ok && response.data?.success) {
                                updateProfile({
                                  name: profileDraft.name,
                                  gender: profileDraft.gender as "MALE" | "FEMALE",
                                  birthdate: profileDraft.birthdate,
                                });
                                setIsEditingProfile(false);
                                return;
                              }
                              alert("저장 실패");
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
                          onClick={async () => {
                            try {
                              await signOutUser(`${window.location.origin}/login`);
                            } catch (error) {
                              console.error("Sign out failed:", error);
                            } finally {
                              clearUser();
                              setIsProfileOpen(false);
                              setIsEditingProfile(false);
                              router.replace("/login");
                              router.refresh();
                            }
                          }}
                          className="mt-3 w-full rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                        >
                          로그아웃
                        </button>
                      </div>
                      ) : null}
                    </div>
                    <Link
                      href="/bookmarks"
                      aria-label="북마크"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-muted transition hover:text-bm-accent"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                  >
                    로그인
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  aria-expanded={isSearchOpen}
                  aria-label="부위 검색"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-muted transition hover:text-bm-accent"
                >
                  <Search className="h-4 w-4" />
                </button>
                {isSearchOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-3 w-[min(360px,90vw)] rounded-2xl border border-bm-border bg-bm-panel p-4 text-xs text-bm-text shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="rounded-xl border border-bm-border bg-bm-panel-soft px-3 py-2">
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="부위를 검색하세요"
                        className="w-full bg-transparent text-sm text-bm-text placeholder:text-bm-muted focus:outline-none"
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bm-muted">
                          추천 검색어
                        </p>
                        <div className="flex items-center gap-1 rounded-full border border-bm-border bg-bm-panel-soft p-0.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setSearchSort("recent")}
                            className={`rounded-full px-2 py-1 transition ${
                              searchSort === "recent"
                                ? "bg-bm-accent-soft text-bm-text"
                                : "text-bm-muted hover:text-bm-text"
                            }`}
                          >
                            최신순
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchSort("popular")}
                            className={`rounded-full px-2 py-1 transition ${
                              searchSort === "popular"
                                ? "bg-bm-accent-soft text-bm-text"
                                : "text-bm-muted hover:text-bm-text"
                            }`}
                          >
                            인기순
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recommendedParts.map((part) => {
                          if (!part) return null;

                          return (
                            <button
                              key={part.id}
                              type="button"
                              onClick={() => handleSelectPart(part.id)}
                              className="rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
                            >
                              {part.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                      {isSearching ? (
                        <div className="rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted">
                          검색 중입니다.
                        </div>
                      ) : filteredParts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted">
                          검색 결과가 없습니다.
                        </div>
                      ) : (
                        filteredParts.map((part) => (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => handleSelectPart(part.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-bm-border bg-bm-panel-soft px-3 py-2 text-left transition hover:border-bm-border-strong"
                          >
                            <div>
                              <p className="text-sm font-semibold text-bm-text">
                                {part.label}
                              </p>
                              <p className="text-[11px] text-bm-muted">
                                {part.systemLabel}
                              </p>
                            </div>
                            <span className="rounded-full border border-bm-border bg-bm-panel px-2 py-1 text-[10px] text-bm-muted">
                              이동
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
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
