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
      id: "bm-06",
      name: "오로라 신경과",
      specialty: "신경과",
      address: "서울 성동구 왕십리로 222",
      distanceKm: 5.1,
      rating: 4.7,
      tags: ["두통", "신경전도 검사"],
      systems: ["NERVOUS"],
    },
  ];

  return {
    hospitalCatalog,
    favoriteBodyParts: ["knee_left", "heart", "skin"],
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
