import { create } from "zustand";
import type { BodyPartKey, SystemKey } from "./useBodyMapStore";

export type FavoriteHospital = {
  id: string;
  name: string;
  specialty: string;
  address: string;
  distanceKm: number;
  rating: number;
  tags: string[];
  systems: SystemKey[];
};

type BookmarkState = {
  hospitalCatalog: FavoriteHospital[];
  favoriteBodyParts: BodyPartKey[];
  favoriteHospitals: FavoriteHospital[];
  toggleBodyPart: (partId: BodyPartKey) => void;
  toggleHospital: (hospitalId: string) => void;
};

export const useBookmarkStore = create<BookmarkState>((set, get) => {
  const hospitalCatalog: FavoriteHospital[] = [
    {
      id: "bm-01",
      name: "센트럴 정형외과",
      specialty: "정형외과",
      address: "서울 강남구 테헤란로 112",
      distanceKm: 2.4,
      rating: 4.8,
      tags: ["무릎", "재활", "야간 진료"],
      systems: ["MUSCULO"],
    },
    {
      id: "bm-07",
      name: "모션랩 정형외과",
      specialty: "정형외과",
      address: "서울 강동구 천호대로 997",
      distanceKm: 1.8,
      rating: 4.7,
      tags: ["어깨", "도수치료", "주말 진료"],
      systems: ["MUSCULO"],
    },
    {
      id: "bm-08",
      name: "리바이브 재활의학과",
      specialty: "재활의학과",
      address: "서울 용산구 한강대로 123",
      distanceKm: 2.9,
      rating: 4.6,
      tags: ["재활", "물리치료", "통증 관리"],
      systems: ["MUSCULO"],
    },
    {
      id: "bm-09",
      name: "스카이라인 관절센터",
      specialty: "정형외과",
      address: "서울 송파구 송파대로 201",
      distanceKm: 4.1,
      rating: 4.5,
      tags: ["무릎", "관절 내시경", "검사 당일"],
      systems: ["MUSCULO"],
    },
    {
      id: "bm-10",
      name: "어반 스포츠 클리닉",
      specialty: "스포츠의학",
      address: "서울 마포구 독막로 45",
      distanceKm: 3.4,
      rating: 4.7,
      tags: ["스포츠 재활", "체형 교정", "야간 진료"],
      systems: ["MUSCULO"],
    },
    {
      id: "bm-02",
      name: "루나 심장내과",
      specialty: "심장내과",
      address: "서울 서초구 서초대로 231",
      distanceKm: 3.1,
      rating: 4.7,
      tags: ["심장초음파", "당일 검사"],
      systems: ["CARDIO"],
    },
    {
      id: "bm-11",
      name: "하트브릿지 심장내과",
      specialty: "심장내과",
      address: "서울 종로구 종로 88",
      distanceKm: 1.6,
      rating: 4.8,
      tags: ["심전도", "심장초음파"],
      systems: ["CARDIO"],
    },
    {
      id: "bm-12",
      name: "리듬케어 심혈관센터",
      specialty: "심장내과",
      address: "서울 성북구 동소문로 210",
      distanceKm: 2.7,
      rating: 4.7,
      tags: ["부정맥", "24시간 홀터"],
      systems: ["CARDIO"],
    },
    {
      id: "bm-13",
      name: "웰브레스 심장클리닉",
      specialty: "심장내과",
      address: "서울 광진구 아차산로 312",
      distanceKm: 4.9,
      rating: 4.6,
      tags: ["호흡곤란", "심부전 관리"],
      systems: ["CARDIO"],
    },
    {
      id: "bm-14",
      name: "시티맥 심장내과",
      specialty: "심장내과",
      address: "서울 중구 을지로 138",
      distanceKm: 3.3,
      rating: 4.5,
      tags: ["혈압", "심혈관 위험도"],
      systems: ["CARDIO"],
    },
    {
      id: "bm-04",
      name: "브릿지 호흡기 클리닉",
      specialty: "호흡기내과",
      address: "서울 마포구 양화로 91",
      distanceKm: 3.9,
      rating: 4.5,
      tags: ["폐기능 검사", "만성질환"],
      systems: ["RESP"],
    },
    {
      id: "bm-15",
      name: "블루에어 호흡기내과",
      specialty: "호흡기내과",
      address: "서울 서대문구 신촌로 93",
      distanceKm: 2.2,
      rating: 4.7,
      tags: ["폐기능", "만성기침"],
      systems: ["RESP"],
    },
    {
      id: "bm-16",
      name: "에버브레스 클리닉",
      specialty: "호흡기내과",
      address: "서울 강서구 공항대로 247",
      distanceKm: 4.0,
      rating: 4.6,
      tags: ["천식", "알레르기"],
      systems: ["RESP"],
    },
    {
      id: "bm-17",
      name: "에코 호흡기센터",
      specialty: "호흡기내과",
      address: "서울 노원구 동일로 1050",
      distanceKm: 5.0,
      rating: 4.5,
      tags: ["기관지염", "금연클리닉"],
      systems: ["RESP"],
    },
    {
      id: "bm-18",
      name: "라피스 폐질환 클리닉",
      specialty: "호흡기내과",
      address: "서울 동대문구 왕산로 204",
      distanceKm: 3.6,
      rating: 4.4,
      tags: ["폐렴", "영상 판독"],
      systems: ["RESP"],
    },
    {
      id: "bm-05",
      name: "라이트 소화기센터",
      specialty: "소화기내과",
      address: "서울 영등포구 여의대로 42",
      distanceKm: 4.2,
      rating: 4.6,
      tags: ["내시경", "당일 결과"],
      systems: ["DIGEST"],
    },
    {
      id: "bm-19",
      name: "그린라이프 소화기내과",
      specialty: "소화기내과",
      address: "서울 강남구 도산대로 167",
      distanceKm: 1.9,
      rating: 4.7,
      tags: ["위내시경", "건강검진"],
      systems: ["DIGEST"],
    },
    {
      id: "bm-20",
      name: "리버온 소화기센터",
      specialty: "소화기내과",
      address: "서울 용산구 이태원로 221",
      distanceKm: 3.5,
      rating: 4.6,
      tags: ["간 기능", "지방간"],
      systems: ["DIGEST"],
    },
    {
      id: "bm-21",
      name: "바이탈 위장 클리닉",
      specialty: "소화기내과",
      address: "서울 구로구 경인로 662",
      distanceKm: 4.8,
      rating: 4.5,
      tags: ["장 트러블", "과민성"],
      systems: ["DIGEST"],
    },
    {
      id: "bm-22",
      name: "오브 소화기클리닉",
      specialty: "소화기내과",
      address: "서울 성동구 성수이로 98",
      distanceKm: 2.6,
      rating: 4.6,
      tags: ["담석", "초음파"],
      systems: ["DIGEST"],
    },
    {
      id: "bm-06",
      name: "오로라 신경과",
      specialty: "신경과",
      address: "서울 성동구 왕십리로 222",
      distanceKm: 5.1,
      rating: 4.7,
      tags: ["두통", "신경전도 검사"],
      systems: ["NERVOUS"],
    },
    {
      id: "bm-23",
      name: "뉴런 신경과",
      specialty: "신경과",
      address: "서울 강북구 도봉로 345",
      distanceKm: 3.2,
      rating: 4.6,
      tags: ["두통", "어지럼"],
      systems: ["NERVOUS"],
    },
    {
      id: "bm-24",
      name: "브레인케어 클리닉",
      specialty: "신경과",
      address: "서울 은평구 통일로 745",
      distanceKm: 4.4,
      rating: 4.5,
      tags: ["신경전도", "수면"],
      systems: ["NERVOUS"],
    },
    {
      id: "bm-25",
      name: "코어 신경센터",
      specialty: "신경과",
      address: "서울 강동구 상암로 15",
      distanceKm: 5.2,
      rating: 4.7,
      tags: ["손저림", "디스크"],
      systems: ["NERVOUS"],
    },
    {
      id: "bm-26",
      name: "파인 신경과",
      specialty: "신경과",
      address: "서울 금천구 독산로 284",
      distanceKm: 2.1,
      rating: 4.6,
      tags: ["만성통증", "근전도"],
      systems: ["NERVOUS"],
    },
    {
      id: "bm-03",
      name: "프라임 피부과",
      specialty: "피부과",
      address: "서울 송파구 올림픽로 240",
      distanceKm: 4.6,
      rating: 4.6,
      tags: ["레이저", "예약 우선"],
      systems: ["DERM"],
    },
    {
      id: "bm-27",
      name: "스킨리듬 피부과",
      specialty: "피부과",
      address: "서울 마포구 양화로 162",
      distanceKm: 2.8,
      rating: 4.7,
      tags: ["여드름", "피부염"],
      systems: ["DERM"],
    },
    {
      id: "bm-28",
      name: "클리어스킨 의원",
      specialty: "피부과",
      address: "서울 강동구 올림픽로 651",
      distanceKm: 4.0,
      rating: 4.6,
      tags: ["아토피", "민감성"],
      systems: ["DERM"],
    },
    {
      id: "bm-29",
      name: "루미나 피부클리닉",
      specialty: "피부과",
      address: "서울 서초구 반포대로 221",
      distanceKm: 3.7,
      rating: 4.5,
      tags: ["레이저", "흉터"],
      systems: ["DERM"],
    },
    {
      id: "bm-30",
      name: "더마라인 피부과",
      specialty: "피부과",
      address: "서울 성북구 고려대로 66",
      distanceKm: 5.4,
      rating: 4.4,
      tags: ["두피", "탈모"],
      systems: ["DERM"],
    },
  ];

  return {
    hospitalCatalog,
    favoriteBodyParts: ["knee", "heart", "skin"],
    favoriteHospitals: hospitalCatalog.filter((hospital) =>
      ["bm-01", "bm-02", "bm-03"].includes(hospital.id),
    ),
    toggleBodyPart: (partId) =>
      set((state) => {
        const isBookmarked = state.favoriteBodyParts.includes(partId);
        return {
          favoriteBodyParts: isBookmarked
            ? state.favoriteBodyParts.filter((id) => id !== partId)
            : [...state.favoriteBodyParts, partId],
        };
      }),
    toggleHospital: (hospitalId) =>
      set((state) => {
        const isBookmarked = state.favoriteHospitals.some(
          (hospital) => hospital.id === hospitalId,
        );
        if (isBookmarked) {
          return {
            favoriteHospitals: state.favoriteHospitals.filter(
              (hospital) => hospital.id !== hospitalId,
            ),
          };
        }
        const hospital = get().hospitalCatalog.find(
          (item) => item.id === hospitalId,
        );
        if (!hospital) {
          return state;
        }
        return {
          favoriteHospitals: [...state.favoriteHospitals, hospital],
        };
      }),
  };
});
