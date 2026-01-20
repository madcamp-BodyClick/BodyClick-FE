"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Bookmark, MapPin, X, ArrowRight, Stethoscope } from "lucide-react";

import {
  fetchBodyPartBookmarks,
  fetchHospitalBookmarks,
  removeBodyPartBookmark,
  removeHospitalBookmark,
  fetchPlaces, // 👈 위치 찾기 위해 필요
  type BodyPartBookmarkItem,
  type HospitalBookmarkItem,
  type PlaceResult,
} from "@/lib/api"; 
import { useAuthStore } from "@/store/useAuthStore";
import { useBodyMapStore, type BodyPartKey } from "@/store/useBodyMapStore";
import { getUserLocation } from "@/lib/location";

// 지도 컴포넌트 (SSR 제외)
const KakaoMap = dynamic(
  () => import("@/components/KakaoMap").then((mod) => mod.KakaoMap),
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

export default function BookmarksPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  // 스토어 액션
  const setSelectedBodyPart = useBodyMapStore((state) => state.setSelectedBodyPart);

  const [bodyParts, setBodyParts] = useState<BodyPartBookmarkItem[]>([]);
  const [hospitals, setHospitals] = useState<HospitalBookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 지도 관련 상태
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedHospitalInfo, setSelectedHospitalInfo] = useState<PlaceResult | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // 1. 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [partsRes, hospitalsRes] = await Promise.all([
        fetchBodyPartBookmarks(),
        fetchHospitalBookmarks(),
      ]);

      if (partsRes.ok && partsRes.data) {
        setBodyParts(partsRes.data.data);
      }
      if (hospitalsRes.ok && hospitalsRes.data) {
        setHospitals(hospitalsRes.data.data);
      }
    } catch (error) {
      console.error("북마크 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // 👉 [기능 1] 부위 클릭 핸들러
  const handleBodyPartClick = (item: BodyPartBookmarkItem) => {
    // 1. 영어 이름(name_en)을 스토어 키 형식(대문자 등)으로 변환
    // (BodyMapStore의 키 형식에 맞춰야 합니다. 보통 대문자나 소문자 일치 필요)
    // 예: "Heart" -> "HEART" 또는 그대로 사용
    let partKey = item.body_part.name_en; 
    
    // 만약 스토어 키가 대문자라면: partKey = partKey.toUpperCase();
    // 만약 스토어 키가 소문자라면: partKey = partKey.toLowerCase();
    
    setSelectedBodyPart(partKey as BodyPartKey);
    
    // 2. 탐색 페이지로 이동
    router.push("/"); 
  };

  // 👉 [기능 2] 병원 클릭 핸들러 (위치 정보 검색)
  const handleHospitalClick = async (item: HospitalBookmarkItem) => {
    setIsSearchingLocation(true);
    
    try {
      // 내 위치 가져오기 (검색 정확도 향상용)
      const myLocation = await getUserLocation();
      
      // 병원 이름으로 검색하여 위치 정보(lat, lng) 획득
      const response = await fetchPlaces({
        lat: myLocation.lat,
        lng: myLocation.lng,
        keyword: item.name, // 병원 이름으로 검색
      });

      if (response.ok && response.data?.data && response.data.data.length > 0) {
        // 검색 결과 중 place_id가 같거나 이름이 같은 첫 번째 병원 선택
        const match = response.data.data.find(p => p.place_id === item.place_id) || response.data.data[0];
        
        setSelectedHospitalInfo(match);
        setIsMapOpen(true);
      } else {
        alert("해당 병원의 위치 정보를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("위치 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // 삭제 핸들러
  const handleDeletePart = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("삭제하시겠습니까?")) {
      await removeBodyPartBookmark(id);
      loadData();
    }
  };

  const handleDeleteHospital = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("삭제하시겠습니까?")) {
      await removeHospitalBookmark(id);
      loadData();
    }
  };

  // 지도 모달
  const mapModal = isMapOpen && selectedHospitalInfo ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMapOpen(false)} />
      <div className="relative z-10 flex h-[80vh] w-[90vw] max-w-[1000px] flex-col overflow-hidden rounded-[32px] border border-bm-border bg-bm-panel shadow-2xl animate-[fade-up_0.2s_ease-out]">
        
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-bm-border bg-bm-panel">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bm-muted">병원 위치</p>
            <h3 className="mt-1 text-lg font-bold text-bm-text">{selectedHospitalInfo.name}</h3>
          </div>
          <button onClick={() => setIsMapOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-bm-panel-soft text-bm-muted hover:text-bm-text transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-bm-panel-soft">
          {/* 지도 표시 */}
          <KakaoMap 
            center={selectedHospitalInfo.location} 
            markers={[selectedHospitalInfo]} 
          />
          
          <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
            <div className="inline-flex items-center gap-2 rounded-xl border border-bm-border bg-bm-panel/90 backdrop-blur px-4 py-3 text-sm text-bm-text shadow-lg">
              <MapPin className="h-4 w-4 text-bm-accent" />
              {selectedHospitalInfo.address}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-bm-bg px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-bm-accent">내 북마크</p>
          <h1 className="mt-2 text-3xl font-bold text-bm-text">
            {user?.name ? `${user.name}님의 즐겨찾기` : "나의 즐겨찾기"}
          </h1>
          <p className="mt-2 text-bm-muted">자주 보는 부위와 병원을 한 곳에서 확인하세요.</p>
        </header>

        {/* 로딩 표시 (위치 검색 중일 때) */}
        {isSearchingLocation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-bm-panel p-6 shadow-xl border border-bm-border">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-bm-muted border-t-bm-accent" />
              <p className="text-sm text-bm-text">위치 정보를 확인하고 있습니다...</p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 1. 즐겨찾기 부위 */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-bm-border bg-bm-panel p-6">
              <div>
                <p className="text-xs font-semibold text-bm-muted">즐겨찾기 부위</p>
                <p className="mt-1 text-2xl font-bold text-bm-text">{bodyParts.length}개 부위</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-accent">
                <Stethoscope className="h-6 w-6" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {bodyParts.map((item) => (
                <div
                  key={item.bookmark_id}
                  onClick={() => handleBodyPartClick(item)} // 🚀 클릭 시 Explore로 이동
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-bm-border bg-bm-panel p-5 transition hover:border-bm-accent hover:bg-bm-panel-soft"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bm-surface text-bm-muted group-hover:text-bm-accent">
                      <Bookmark className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs text-bm-muted">관심 부위</p>
                      <p className="text-lg font-semibold text-bm-text">{item.body_part.name_ko}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-bm-muted opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    <button
                      onClick={(e) => handleDeletePart(e, item.bookmark_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bm-surface text-bm-muted hover:text-red-400 z-10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {bodyParts.length === 0 && !isLoading && (
                <div className="py-10 text-center text-sm text-bm-muted">저장된 부위가 없습니다.</div>
              )}
            </div>
          </section>

          {/* 2. 즐겨찾기 병원 */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-bm-border bg-bm-panel p-6">
              <div>
                <p className="text-xs font-semibold text-bm-muted">즐겨찾기 병원</p>
                <p className="mt-1 text-2xl font-bold text-bm-text">{hospitals.length}곳</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-accent">
                <MapPin className="h-6 w-6" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {hospitals.map((item) => (
                <div
                  key={item.bookmark_id}
                  onClick={() => handleHospitalClick(item)} // 🚀 클릭 시 위치 검색 후 지도 오픈
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-bm-border bg-bm-panel p-5 transition hover:border-bm-accent hover:bg-bm-panel-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-bm-text">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-bm-muted">
                      <MapPin className="h-3 w-3" />
                      <p className="truncate">{item.address || "주소 정보 없음"}</p>
                    </div>
                  </div>
                  
                  <div className="flex shrink-0 items-center gap-2 pl-3">
                    <button
                      onClick={(e) => handleDeleteHospital(e, item.bookmark_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bm-surface text-bm-muted hover:text-bm-accent z-10"
                    >
                      <Bookmark className="h-4 w-4 fill-bm-accent text-bm-accent" />
                    </button>
                  </div>
                </div>
              ))}
              {hospitals.length === 0 && !isLoading && (
                <div className="py-10 text-center text-sm text-bm-muted">저장된 병원이 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {isMapOpen && createPortal(mapModal, document.body)}
    </div>
  );
}