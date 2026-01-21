"use client";

import { useEffect, useRef } from "react";
import type { PlaceResult } from "../lib/api";

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  center: { lat: number; lng: number };
  markers: PlaceResult[];
}

const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";
const KAKAO_SCRIPT_SRC = KAKAO_API_KEY
  ? `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services,clusterer&autoload=false`
  : "";

let kakaoScriptLoadingPromise: Promise<void> | null = null;

const ensureKakaoScriptLoaded = () => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.kakao && window.kakao.maps) {
    return Promise.resolve();
  }

  if (!KAKAO_API_KEY || !KAKAO_SCRIPT_SRC) {
    console.error("Kakao Maps API key is not configured.");
    return Promise.resolve();
  }

  if (kakaoScriptLoadingPromise) {
    return kakaoScriptLoadingPromise;
  }

  kakaoScriptLoadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = KAKAO_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    const cleanup = () => {
      script.onload = null;
      script.onerror = null;
    };

    script.onload = () => {
      cleanup();
      resolve();
    };

    script.onerror = (error) => {
      cleanup();
      console.error("Failed to load Kakao Maps SDK", error);
      resolve();
    };

    document.head.appendChild(script);
  });

  return kakaoScriptLoadingPromise;
};

export function KakaoMap({ center, markers }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // 1. 지도 초기화 함수
    const initMap = () => {
      const { kakao } = window;
      if (!kakao || !kakao.maps) {
        return;
      }
      
      kakao.maps.load(() => {
        if (!mapContainer.current) return;

        const options = {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 3,
        };

        if (!mapInstance.current) {
          mapInstance.current = new kakao.maps.Map(mapContainer.current, options);
          
          // 지도 생성 후 리레이아웃 (화면 깨짐 방지)
          setTimeout(() => {
             mapInstance.current.relayout();
             mapInstance.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
          }, 300);
          
        } else {
          // 이미 지도가 있으면 중심만 이동
          const moveLatLon = new kakao.maps.LatLng(center.lat, center.lng);
          mapInstance.current.setCenter(moveLatLon);
        }
        
        // 마커 업데이트 호출
        updateMarkers();
      });
    };

    // 2. 마커 업데이트 함수
    const updateMarkers = () => {
      if (!mapInstance.current || !window.kakao) return;
      const { kakao } = window;
      if (!kakao || !kakao.maps) {
        return;
      }

      // 기존 마커 제거
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      // 새 마커 추가
      markers.forEach((place) => {
        const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
        const marker = new kakao.maps.Marker({ position, clickable: true });
        
        const infowindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:12px;color:#000;">${place.name}</div>`,
        });

        kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(mapInstance.current, marker));
        kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());

        marker.setMap(mapInstance.current);
        markersRef.current.push(marker);
      });
    };

    // 3. [핵심] 스크립트 로드 대기 로직 (Retry)
    let cancelled = false;

    ensureKakaoScriptLoaded().then(() => {
      if (cancelled) return;
      if (!window.kakao) return;
      initMap();
    });

    return () => {
      cancelled = true;
    };
  }, [center, markers]); // center나 markers가 바뀌면 재실행

  // 테두리 제거하고 꽉 채우기
  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />;
}
