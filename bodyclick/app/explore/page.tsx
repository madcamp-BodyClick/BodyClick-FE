"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Search, User, Loader2 } from "lucide-react";
import InfoPanel from "../../components/InfoPanel";
import Stage3D from "../../components/Stage3D";
import SystemLayerSelector from "../../components/SystemLayerSelector";
import {
  fetchSearchHome,
  fetchSearchResults,
  signOutUser,
  updateUserProfile,
  recordBodyPartView,
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
  
  // Store 매핑 정보
  const bodyPartIds = useBodyMapStore((state) => state.bodyPartIds);

  const setSystem = useBodyMapStore((state) => state.setSystem);
  const setBodyPart = useBodyMapStore((state) => state.setBodyPart);
  // recentBodyParts(로컬 스토어)는 이제 API 데이터(recentHistory)가 없을 때의 최후의 수단으로만 사용
  const recentBodyParts = useBodyMapStore((state) => state.recentBodyParts); 
  const bodyPartSelections = useBodyMapStore((state) => state.bodyPartSelections);
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);
  const getBodyPartCodeByLabel = useBodyMapStore((state) => state.getBodyPartCodeByLabel);
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
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSort, setSearchSort] = useState<"recent" | "popular">("recent");
  const [popularParts, setPopularParts] = useState<SearchHomePopularItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<SearchHistoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<PartOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auth 변경 시 프로필 초안 설정
  useEffect(() => {
    if (!user) return;
    setProfileDraft({
      name: user.name ?? "",
      gender: user.gender ?? "",
      birthdate: user.birthdate ?? "",
    });
  }, [user]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      
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

  // ESC 키 처리
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // 검색창 자동 포커스
  useEffect(() => {
    if (!isSearchOpen) return;
    const raf = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isSearchOpen]);

  // [수정] 검색창이 열릴 때마다 데이터 최신화 (최신순 반영 핵심)
  useEffect(() => {
    const loadSearchHome = async () => {
      // 검색창이 닫혀있으면 굳이 불러오지 않음 (최적화)
      if (!isSearchOpen) return;

      const response = await fetchSearchHome();
      if (response.ok && response.data?.success) {
        setPopularParts(response.data.data.popular_body_parts);
        setRecentHistory(response.data.data.my_recent_history ?? []);
      } else {
        setPopularParts([]);
        setRecentHistory([]);
      }
    };
    loadSearchHome();
  }, [isAuthenticated, isSearchOpen]); // isSearchOpen이 true가 될 때 실행됨

  // 데이터 동기화
  useEffect(() => {
    popularParts.forEach((item) => {
      const code = getBodyPartCodeByLabel(item.name);
      if (!code) return;
      setBodyPartId(code, item.id);
      setBodyPartLabel(code, item.name);
    });
  }, [getBodyPartCodeByLabel, popularParts, setBodyPartId, setBodyPartLabel]);

  useEffect(() => {
    recentHistory.forEach((item) => {
      if (!item.body_part_id) return;
      const code = getBodyPartCodeByLabel(item.keyword);
      if (!code) return;
      setBodyPartId(code, item.body_part_id);
      setBodyPartLabel(code, item.keyword);
    });
  }, [getBodyPartCodeByLabel, recentHistory, setBodyPartId, setBodyPartLabel]);

  // PartOption 빌더
  const buildPartOption = useCallback(
    (code: BodyPartKey): PartOption | null => {
      const system = BODY_PART_LOOKUP[code]?.system;
      if (!system) return null;
      return {
        id: code,
        label: getBodyPartLabel(code),
        system,
        systemLabel: getSystemLabel(system),
      };
    },
    [getBodyPartLabel, getSystemLabel],
  );

  // 검색 API 호출
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetchSearchResults(trimmed);
        if (isCancelled) return;

        if (!response.ok || !response.data?.success) {
          setSearchResults([]);
          return;
        }

        const mapped = response.data.data
          .map((item) => {
            const code = getBodyPartCodeByLabel(item.name);
            if (!code) return null;
            setBodyPartId(code, item.id);
            setBodyPartLabel(code, item.name);
            return buildPartOption(code);
          })
          .filter((item): item is PartOption => item !== null);

        setSearchResults(mapped);
      } catch (error) {
        console.error("Search failed:", error);
        if (!isCancelled) setSearchResults([]);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    buildPartOption,
    getBodyPartCodeByLabel,
    searchQuery,
    setBodyPartId,
    setBodyPartLabel,
  ]);

  // 전체 파츠 리스트 (중복 제거)
  const allParts = useMemo(() => {
    const rawParts = Object.values(BODY_PARTS)
      .flat()
      .map((part) => {
        const system = BODY_PART_LOOKUP[part.id]?.system;
        if (!system) return null;
        return {
          id: part.id,
          label: getBodyPartLabel(part.id),
          system,
          systemLabel: getSystemLabel(system),
        };
      })
      .filter((item): item is PartOption => item !== null);

    const uniquePartsMap = new Map<string, PartOption>();
    rawParts.forEach((part) => {
      if (!uniquePartsMap.has(part.id)) {
        uniquePartsMap.set(part.id, part);
      }
    });

    return Array.from(uniquePartsMap.values());
  }, [getBodyPartLabel, getSystemLabel]);

  // 랭킹 Map
  const popularRankMap = useMemo(() => {
    const map = new Map<string, number>();
    popularParts.forEach((item) => {
      const code = getBodyPartCodeByLabel(item.name);
      if (code) map.set(code, item.view_count);
    });
    return map;
  }, [popularParts, getBodyPartCodeByLabel]);

  const recentRankMap = useMemo(() => {
    const map = new Map<string, number>();
    
    // [중요] API 데이터(recentHistory)가 있으면 그걸 최우선으로 사용
    if (recentHistory.length > 0) {
      recentHistory.forEach((item, index) => {
        const code = getBodyPartCodeByLabel(item.keyword);
        if (code) map.set(code, index); // index가 낮을수록 최신
      });
    } else {
      // API 데이터가 없을 때만 로컬 스토어 데이터 사용 (Fallback)
      recentBodyParts.forEach((partId, index) => {
        map.set(partId, index);
      });
    }
    return map;
  }, [recentHistory, recentBodyParts, getBodyPartCodeByLabel]);

  // 필터링 및 정렬 로직 (메인 리스트)
  const filteredParts = useMemo(() => {
    const query = searchQuery.trim();

    // 1. 검색어 입력 시
    if (query) {
      return searchResults.length > 0 ? searchResults : [];
    }

    // 2. 기본 상태 (추천 리스트)
    let candidates: PartOption[] = [];

    if (searchSort === "popular") {
      // 인기순
      candidates = allParts.filter((part) => popularRankMap.has(part.id));
      candidates.sort((a, b) => {
        const aScore = popularRankMap.get(a.id) ?? 0;
        const bScore = popularRankMap.get(b.id) ?? 0;
        return bScore - aScore;
      });
    } else {
      // 최신순
      if (recentRankMap.size === 0) return []; // 기록 없으면 빈 리스트

      candidates = allParts.filter((part) => recentRankMap.has(part.id));
      candidates.sort((a, b) => {
        const aIndex = recentRankMap.get(a.id) ?? Number.POSITIVE_INFINITY;
        const bIndex = recentRankMap.get(b.id) ?? Number.POSITIVE_INFINITY;
        return aIndex - bIndex;
      });
    }

    return candidates.slice(0, 5);
  }, [
    allParts,
    popularRankMap,
    recentRankMap,
    searchQuery,
    searchResults,
    searchSort,
  ]);

  // [삭제] recommendedParts (추천 검색어 칩 로직 삭제됨)

  const handleSelectPart = (partId: BodyPartKey) => {
    const part = BODY_PART_LOOKUP[partId];
    if (!part) return;
    
    setSystem(part.system);
    setBodyPart(partId);
    setIsSearchOpen(false);
    setSearchQuery("");

    // 기록 저장
    if (isAuthenticated) {
      const numericId = bodyPartIds[partId];
      if (numericId) {
        recordBodyPartView(numericId);
      } else {
        console.warn(`ID not found for part: ${partId}`);
      }
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileDraft.gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    setIsSavingProfile(true);
    try {
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
      } else {
        alert("저장에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSavingProfile(false);
    }
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
                      
                      {isProfileOpen && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-bm-border bg-bm-panel px-4 py-3 text-xs text-bm-text shadow-lg">
                          {/* 프로필 메뉴 내용 생략 (기존과 동일) */}
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bm-muted">
                              내 프로필
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsEditingProfile((prev) => !prev)}
                              className="rounded-full border border-bm-border bg-bm-panel-soft px-2 py-0.5 text-[10px] text-bm-muted transition hover:text-bm-text"
                            >
                              {isEditingProfile ? "닫기" : "프로필 수정"}
                            </button>
                          </div>

                          {!isEditingProfile ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm font-semibold">{user?.name}</p>
                              <p className="text-[11px] text-bm-muted">{user?.email}</p>
                              <p className="text-[11px] text-bm-muted">
                                {user?.gender === "MALE" ? "남" : user?.gender === "FEMALE" ? "여" : "성별 미지정"}
                              </p>
                              <p className="text-[11px] text-bm-muted">
                                {user?.birthdate || "생년월일 미지정"}
                              </p>
                            </div>
                          ) : (
                            <form className="mt-3 space-y-2" onSubmit={handleSaveProfile}>
                              {/* 프로필 수정 폼 생략 (기존과 동일) */}
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-bm-muted">
                                  이름
                                </span>
                                <input
                                  type="text"
                                  value={profileDraft.name}
                                  onChange={(event) =>
                                    setProfileDraft((prev) => ({ ...prev, name: event.target.value }))
                                  }
                                  className="mt-1 h-8 w-full rounded-lg border border-bm-border bg-bm-panel-soft px-2 text-xs text-bm-text"
                                />
                              </label>
                              <GenderSelect
                                label="성별"
                                value={profileDraft.gender}
                                onChange={(gender) =>
                                  setProfileDraft((prev) => ({ ...prev, gender }))
                                }
                                size="compact"
                                portal={false}
                              />
                              <BirthDatePicker
                                label="생년월일"
                                value={profileDraft.birthdate}
                                onChange={(birthdate) =>
                                  setProfileDraft((prev) => ({ ...prev, birthdate }))
                                }
                                size="compact"
                                portal={false}
                              />
                              <div className="mt-1 flex gap-2">
                                <button
                                  type="submit"
                                  disabled={isSavingProfile}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text disabled:opacity-50"
                                >
                                  {isSavingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                                  {isSavingProfile ? "저장 중" : "저장"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingProfile}
                                  onClick={() => {
                                    setIsProfileOpen(false);
                                    setIsEditingProfile(false);
                                  }}
                                  className="flex-1 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text disabled:opacity-50"
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
                      )}
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

                {isSearchOpen && (
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
                    
                    {/* [수정] 추천 검색어 칩 UI 삭제 및 정렬 버튼만 남김 */}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bm-muted">
                        {searchSort === "recent" ? "최근 본 부위" : "인기 부위"}
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
                    
                    {/* (칩 영역 삭제됨) */}

                    <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                      {isSearching ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          검색 중입니다...
                        </div>
                      ) : filteredParts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted">
                          {searchQuery ? "검색 결과가 없습니다." : "최근 조회한 기록이 없습니다."}
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
                )}
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