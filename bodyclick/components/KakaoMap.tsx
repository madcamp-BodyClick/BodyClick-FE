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

export function KakaoMap({ center, markers }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // 1. 지도 초기화 함수
    const initMap = () => {
      const { kakao } = window;
      
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
    if (window.kakao && window.kakao.maps) {
      // 이미 로드되어 있으면 바로 실행
      initMap();
    } else {
      // 아직 로드 안 됐으면 0.1초마다 체크 (최대 3초)
      const timer = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(timer);
          initMap();
        }
      }, 100);

      // 3초 뒤에도 안 되면 포기 (메모리 누수 방지)
      setTimeout(() => clearInterval(timer), 3000);
    }
  }, [center, markers]); // center나 markers가 바뀌면 재실행

  // 테두리 제거하고 꽉 채우기
  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />;
}