"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bookmark, X, AlertCircle, Activity, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

import AgentChatPanel from "./AgentChatPanel";
import {
  fetchPlaces,
  type BodyPartDetail,
  type DiseaseSummary,
  type PlaceResult,
} from "../lib/api";
import { getUserLocation } from "../lib/location";
import { useAuthStore } from "../store/useAuthStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import {
  BODY_PART_LOOKUP,
  INSIGHT_TABS,
  getAgentProfileForPart,
  useBodyMapStore,
  type InsightTab,
} from "../store/useBodyMapStore";

// 질환 상세 데이터 타입 정의
interface DiseaseDetail {
  id: number;
  body_part_id: number;
  name: string;
  description: string;
  common_symptoms: string;
  severity_level: number; // 1~5
  requires_medical_attention: boolean;
}

interface DiseaseApiResponse {
  success: boolean;
  data: DiseaseDetail;
}

// KakaoMap dynamic import
const KakaoMap = dynamic(
  () => import("./KakaoMap").then((mod) => mod.KakaoMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center flex-col gap-2 text-xs text-bm-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-bm-muted border-t-bm-accent" />
        지도를 불러오는 중입니다...
      </div>
    ),
  }
);

const normalizeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string") as string[];
  }
  return [];
};

const SYSTEM_KEYWORDS: Record<string, string> = {
  MUSCULO: "정형외과",
  CARDIO: "심장내과",
  RESP: "호흡기내과",
  DIGEST: "소화기내과",
  NERVOUS: "신경과",
  DERM: "피부과",
};

const InfoPanel = () => {
  const selectedSystem = useBodyMapStore((state) => state.selectedSystem);
  const selectedBodyPart = useBodyMapStore((state) => state.selectedBodyPart);
  const activeTab = useBodyMapStore((state) => state.activeTab);
  const setActiveTab = useBodyMapStore((state) => state.setActiveTab);
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);
  const loadBodyPartDetail = useBodyMapStore((state) => state.loadBodyPartDetail);
  const loadBodyPartDiseases = useBodyMapStore((state) => state.loadBodyPartDiseases);
  const resolveBodyPartId = useBodyMapStore((state) => state.resolveBodyPartId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const bodyPartBookmarks = useBookmarkStore((state) => state.bodyPartBookmarks);
  const hospitalBookmarks = useBookmarkStore((state) => state.hospitalBookmarks);
  const refreshBodyPartBookmarks = useBookmarkStore((state) => state.refreshBodyPartBookmarks);
  const refreshHospitalBookmarks = useBookmarkStore((state) => state.refreshHospitalBookmarks);
  const addBodyPartBookmark = useBookmarkStore((state) => state.addBodyPartBookmark);
  const removeBodyPartBookmark = useBookmarkStore((state) => state.removeBodyPartBookmark);
  const addHospitalBookmark = useBookmarkStore((state) => state.addHospitalBookmark);
  const removeHospitalBookmark = useBookmarkStore((state) => state.removeHospitalBookmark);
  
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  const [detail, setDetail] = useState<BodyPartDetail | null>(null);
  const [diseases, setDiseases] = useState<DiseaseSummary[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<PlaceResult[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);

  // 질환 상세 정보 State
  const [selectedDisease, setSelectedDisease] = useState<DiseaseDetail | null>(null);
  const [isLoadingDisease, setIsLoadingDisease] = useState(false);

  const part = selectedBodyPart ? BODY_PART_LOOKUP[selectedBodyPart] : null;
  const agent = getAgentProfileForPart(selectedBodyPart);
  const partLabel = selectedBodyPart ? getBodyPartLabel(selectedBodyPart) : null;
  const systemLabel = part ? getSystemLabel(part.system) : null;
  
  const isPartBookmarked = useMemo(() => {
    if (!detail?.id) return false;
    return bodyPartBookmarks.some((item) => item.bodyPartId === detail.id);
  }, [bodyPartBookmarks, detail?.id]);

  const recommendedHospitals = useMemo(() => {
    return nearbyHospitals; 
  }, [nearbyHospitals]);

  const selectedHospital = useMemo(() => {
    if (!selectedHospitalId) return null;
    return nearbyHospitals.find((hospital) => hospital.place_id === selectedHospitalId) ?? null;
  }, [nearbyHospitals, selectedHospitalId]);

  const roleItems = normalizeStringList(detail?.keyRoles);
  const signalItems = normalizeStringList(detail?.observationPoints);

  const summaryText = isLoadingDetail
    ? "정보를 불러오는 중입니다."
    : detail?.description ?? "설명 정보가 없습니다.";

  useEffect(() => {
    if (!isAuthenticated && activeTab === "ai") setActiveTab("overview");
  }, [activeTab, isAuthenticated, setActiveTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshBodyPartBookmarks();
    refreshHospitalBookmarks();
  }, [isAuthenticated, refreshBodyPartBookmarks, refreshHospitalBookmarks]);

  useEffect(() => {
    if (!selectedBodyPart) {
      setDetail(null);
      setDiseases([]);
      setIsLoadingDetail(false);
      setSelectedDisease(null); 
      return;
    }
    let isActive = true;
    const loadDetail = async () => {
      setIsLoadingDetail(true);
      const [detailData, diseaseData] = await Promise.all([
        loadBodyPartDetail(selectedBodyPart),
        loadBodyPartDiseases(selectedBodyPart),
      ]);
      if (!isActive) return;
      setDetail(detailData);
      setDiseases(diseaseData ?? []);
      setIsLoadingDetail(false);
    };
    loadDetail();
    return () => { isActive = false; };
  }, [loadBodyPartDetail, loadBodyPartDiseases, selectedBodyPart]);

  const loadPlaces = useCallback(async () => {
    if (!part || !isAuthenticated) {
      setNearbyHospitals([]);
      setIsLoadingHospitals(false);
      return;
    }

    setIsLoadingHospitals(true);
    try {
      const location = await getUserLocation();
      const keyword = SYSTEM_KEYWORDS[part.system] ?? "병원";
      
      const response = await fetchPlaces({
        lat: location.lat,
        lng: location.lng,
        keyword,
      });

      if (response.ok && response.data?.success) {
        setNearbyHospitals(response.data.data);
      } else {
        setNearbyHospitals([]);
      }
    } catch (error) {
      console.error("Failed to load hospitals:", error);
      setNearbyHospitals([]);
    } finally {
      setIsLoadingHospitals(false);
    }
  }, [isAuthenticated, part]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const handleRefreshLocation = async () => {
    await loadPlaces();
  };

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMapOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMapOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMapOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const originalOverflow = document.body.style.overflow;
    if (isMapOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isMapOpen, isMounted]);

  const handleTabClick = (tabId: InsightTab) => {
    if (tabId === "ai" && !isAuthenticated) {
      router.push("/login");
      return;
    }
    setActiveTab(tabId);
  };

  const handleDiseaseClick = async (diseaseId: number) => {
    // 이미 선택된 걸 누르면 해제할지, 유지할지 결정 (여기선 유지)
    if (selectedDisease?.id === diseaseId) return;

    try {
      setIsLoadingDisease(true);
      const response = await fetch(`/api/diseases/${diseaseId}`); // [경로 확인 완료]
      
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      
      const json: DiseaseApiResponse = await response.json();
      if (json.success) {
        setSelectedDisease(json.data);
      }
    } catch (error) {
      console.error("질환 정보 로딩 실패:", error);
    } finally {
      setIsLoadingDisease(false);
    }
  };

  const handleTogglePartBookmark = async () => {
    if (!selectedBodyPart) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const bodyPartId = detail?.id ?? (await resolveBodyPartId(selectedBodyPart));
    if (!bodyPartId) return;
    const existing = bodyPartBookmarks.find((item) => item.bodyPartId === bodyPartId);
    if (existing) {
      await removeBodyPartBookmark(existing.bookmarkId);
    } else {
      await addBodyPartBookmark(bodyPartId);
    }
  };

  const handleToggleHospitalBookmark = async (hospital: PlaceResult) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const existing = hospitalBookmarks.find((item) => item.placeId === hospital.place_id);
    if (existing) {
      await removeHospitalBookmark(existing.bookmarkId);
    } else {
      await addHospitalBookmark(hospital);
    }
  };

  const isOpen = Boolean(selectedSystem && selectedBodyPart);
  
  const mapModalContent = isMapOpen && selectedHospital ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsMapOpen(false); setSelectedHospitalId(null); }} />
        <div className="relative z-10 flex h-[84vh] w-[92vw] max-w-[1100px] flex-col overflow-hidden rounded-[32px] border border-bm-border bg-bm-panel shadow-[0_25px_80px_rgba(0,0,0,0.55)] animate-[fade-up_0.25s_ease-out]">
          {/* ...지도 모달 내용 유지... */}
          <div className="relative px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bm-muted">병원 위치</p>
                <h3 className="mt-2 text-xl font-semibold text-bm-text">{partLabel && systemLabel ? `${partLabel} · ${systemLabel} 병원` : "주변 병원"}</h3>
                <p className="mt-2 text-xs text-bm-muted">현재 위치 기반 추천 결과입니다.</p>
              </div>
              <button type="button" onClick={() => { setIsMapOpen(false); setSelectedHospitalId(null); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-muted transition hover:text-bm-text" aria-label="모달 닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 px-6 pb-6">
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <section className="relative min-h-[260px] overflow-hidden rounded-2xl border border-bm-border bg-bm-panel-soft">
                <KakaoMap 
                  key={selectedHospital.place_id}
                  center={selectedHospital.location} 
                  markers={nearbyHospitals} 
                />
              </section>
              <aside className="flex min-h-0 flex-col overflow-hidden">
                <div className="mb-2 flex items-center justify-between text-[11px] text-bm-muted">
                  <span className="font-semibold uppercase tracking-[0.2em]">추천 리스트</span>
                  <span>{nearbyHospitals.length}곳</span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {nearbyHospitals.map((hospital) => {
                    const isBookmarked = hospitalBookmarks.some((item) => item.placeId === hospital.place_id);
                    const isSelected = hospital.place_id === selectedHospitalId;
                    return (
                      <div key={hospital.place_id} role="button" tabIndex={0} onClick={() => setSelectedHospitalId(hospital.place_id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedHospitalId(hospital.place_id); } }} className={`flex w-full items-start justify-between gap-3 rounded-2xl border bg-bm-panel-soft px-4 py-4 text-left transition cursor-pointer ${isSelected ? "border-bm-accent ring-1 ring-bm-accent" : "border-bm-border hover:border-bm-border-strong"}`}>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? "text-bm-accent" : "text-bm-text"}`}>{hospital.name}</p>
                          <p className="mt-1 text-[11px] text-bm-muted">{hospital.road_address || hospital.address}</p>
                          {hospital.phone_number && <p className="mt-1 text-[11px] text-bm-muted">{hospital.phone_number}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleHospitalBookmark(hospital); }} className={`flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft transition ${isBookmarked ? "text-bm-accent" : "text-bm-muted hover:text-bm-text"}`}>
                              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-bm-accent" : ""}`} />
                            </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <aside className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-[28px] border border-bm-border bg-bm-panel px-6 py-6 transition duration-500 lg:static lg:z-10 lg:h-full lg:w-[340px] lg:rounded-[28px] lg:border lg:px-6 lg:py-6 ${isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none lg:translate-y-0 lg:opacity-100 lg:pointer-events-auto"}`}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-bm-border lg:hidden" />

        {!part ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-bm-border bg-bm-panel-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">의료 인사이트</p>
              <p className="mt-3 text-sm text-bm-text">좌측에서 계통을 선택하고 인체 모델에서 부위를 지정해 주세요.</p>
              <p className="mt-2 text-xs text-bm-muted">선택한 부위에 맞춘 전문 AI 상담이 준비됩니다.</p>
            </div>
          </div>
        ) : (
          <div className="relative flex h-full flex-col gap-6">
            <header className="space-y-2 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bm-muted">의료 인사이트</p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-bm-text">{partLabel ?? ""}</h2>
                  <p className="mt-1 text-sm text-bm-muted">{systemLabel ?? "전신"}</p>
                </div>
                <button type="button" onClick={handleTogglePartBookmark} className={`flex h-9 w-9 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft transition ${isPartBookmarked ? "text-bm-accent" : "text-bm-muted hover:text-bm-text"}`} aria-pressed={isPartBookmarked} aria-label="부위 북마크">
                  <Bookmark className={`h-4 w-4 ${isPartBookmarked ? "fill-bm-accent" : ""}`} />
                </button>
              </div>
              {agent ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-bm-accent" />
                  {agent.label}
                </div>
              ) : null}
              <p className="text-sm text-bm-text">{summaryText}</p>
            </header>

            <div className="flex flex-wrap gap-2 shrink-0">
              {INSIGHT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button" onClick={() => handleTabClick(tab.id)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${isActive ? "bg-bm-accent-soft text-bm-text" : "text-bm-muted hover:text-bm-text"}`}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* --- 컨텐츠 영역 --- */}
            {activeTab === "overview" && (
              <div className="grid gap-4 overflow-y-auto pr-1 pb-4">
                <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">핵심 역할</p>
                  <ul className="mt-3 space-y-2 text-sm text-bm-text">
                    {roleItems.length > 0 ? roleItems.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-bm-accent" /><span>{item}</span></li>) : <li className="text-sm text-bm-muted">정보가 없습니다.</li>}
                  </ul>
                </section>
                <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">관찰 포인트</p>
                  <ul className="mt-3 space-y-2 text-sm text-bm-text">
                    {signalItems.length > 0 ? signalItems.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-bm-accent" /><span>{item}</span></li>) : <li className="text-sm text-bm-muted">정보가 없습니다.</li>}
                  </ul>
                </section>
                <section className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">추천 병원</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-bm-muted">{hospitalBookmarks.length}곳 저장됨</span>
                      <button 
                        onClick={handleRefreshLocation} 
                        disabled={isLoadingHospitals}
                        className="flex items-center justify-center p-1 rounded-full bg-bm-panel border border-bm-border hover:border-bm-accent text-bm-muted hover:text-bm-accent transition-colors disabled:opacity-50"
                        title="내 위치로 다시 검색"
                      >
                        <RefreshCw size={12} className={isLoadingHospitals ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {isLoadingHospitals ? (
                      <div className="rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted flex items-center justify-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border border-bm-muted border-t-bm-accent"></div>
                        주변 병원을 검색 중입니다...
                      </div>
                    ) : recommendedHospitals.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-bm-border bg-bm-panel-soft px-3 py-3 text-[11px] text-bm-muted">로그인 후 주변 병원을 추천해 드립니다.</div>
                    ) : (
                      recommendedHospitals.map((hospital) => {
                        const isBookmarked = hospitalBookmarks.some((item) => item.placeId === hospital.place_id);
                        return (
                          <div
                            key={hospital.place_id}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setSelectedHospitalId(hospital.place_id); setIsMapOpen(true); }}
                            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-bm-border bg-bm-panel px-3 py-3 text-left transition hover:border-bm-border-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bm-accent cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-semibold text-bm-text">{hospital.name}</p>
                              <p className="mt-1 text-[11px] text-bm-muted">{hospital.road_address || hospital.address}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleHospitalBookmark(hospital); }} className={`flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft transition ${isBookmarked ? "text-bm-accent" : "text-bm-muted hover:text-bm-text"}`} aria-label="병원 북마크">
                                  <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-bm-accent" : ""}`} />
                                </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* --- [변경됨] 대표 질환 탭 구조 --- */}
            {activeTab === "conditions" && (
              <div className="flex flex-col h-full min-h-0 gap-4">
                
                {/* 1. 상단: 질환 버튼 목록 */}
                <div className="shrink-0 rounded-2xl border border-bm-border bg-bm-panel-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">대표 질환</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {diseases.length > 0 ? (
                      diseases.map((item) => {
                        const isSelected = selectedDisease?.id === item.id;
                        return (
                          <button 
                            key={item.id} 
                            onClick={() => handleDiseaseClick(item.id)}
                            className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                              isSelected 
                                ? "bg-bm-accent text-bm-panel border-bm-accent font-semibold" // 선택시 강조
                                : "border-bm-border text-bm-text hover:bg-bm-panel hover:border-bm-accent"
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-bm-muted">대표 질환 정보가 없습니다.</span>
                    )}
                  </div>
                </div>

                {/* 2. 하단: 상세 정보 영역 (남은 공간 채움) */}
                <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-bm-border bg-bm-panel-soft">
                  {selectedDisease ? (
                    // 정보가 있을 때
                    <div className="h-full overflow-y-auto p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <div className="flex items-start justify-between mb-4">
                         <div>
                           <h3 className="text-lg font-bold text-bm-text flex items-center gap-2">
                             {selectedDisease.name}
                             {selectedDisease.requires_medical_attention && (
                               <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-500">
                                 <AlertCircle size={10} /> 방문 필요
                               </span>
                             )}
                           </h3>
                           {/* 위험도 그래프 */}
                           <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-bm-muted">위험도</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    className={`h-1.5 w-4 rounded-full ${
                                      level <= selectedDisease.severity_level
                                        ? selectedDisease.severity_level >= 4
                                          ? "bg-red-500"
                                          : "bg-blue-500"
                                        : "bg-bm-border"
                                    }`}
                                  />
                                ))}
                              </div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="space-y-4">
                         <p className="text-sm leading-relaxed text-bm-text whitespace-pre-line">
                           {selectedDisease.description}
                         </p>
                         
                         <div className="rounded-xl bg-bm-panel border border-bm-border p-3">
                           <div className="flex items-center gap-2 mb-2">
                             <Activity size={12} className="text-bm-accent" />
                             <span className="text-xs font-semibold text-bm-muted">주요 증상</span>
                           </div>
                           <p className="text-sm text-bm-text">
                             {selectedDisease.common_symptoms}
                           </p>
                         </div>
                       </div>
                    </div>
                  ) : (
                    // 선택 안 했을 때 (Placeholder)
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-bm-muted">
                       <Activity className="h-8 w-8 opacity-20" />
                       <div className="space-y-1">
                         <p className="text-sm font-medium text-bm-text/80">질환을 선택해보세요</p>
                         <p className="text-xs text-bm-muted">위 버튼을 누르면 상세 증상과<br/>위험도 정보를 확인할 수 있습니다.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "ai" ? <AgentChatPanel /> : null}
          </div>
        )}
      </aside>
      {isMounted && mapModalContent ? createPortal(mapModalContent, document.body) : null}
    </>
  );
};

export default InfoPanel;