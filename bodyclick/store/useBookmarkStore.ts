import { create } from "zustand";
import {
  addBodyPartBookmark,
  addHospitalBookmark,
  fetchBodyPartBookmarks,
  fetchHospitalBookmarks,
  removeBodyPartBookmark,
  removeHospitalBookmark,
} from "../lib/api";
import { useBodyMapStore, type BodyPartKey } from "./useBodyMapStore";

export type BodyPartBookmark = {
  bookmarkId: number;
  bodyPartId: number;
  nameKo: string;
  nameEn: string;
  systemId: number;
  code?: BodyPartKey | null;
};

export type HospitalBookmark = {
  bookmarkId: number;
  placeId: string;
  name: string;
  address: string | null;
  createdAt: string;
};

export type HospitalPlaceInput = {
  place_id: string;
  name: string;
  address?: string | null;
};

type BookmarkState = {
  bodyPartBookmarks: BodyPartBookmark[];
  hospitalBookmarks: HospitalBookmark[];
  isLoading: boolean;
  error: string | null;
  refreshBodyPartBookmarks: () => Promise<void>;
  refreshHospitalBookmarks: () => Promise<void>;
  addBodyPartBookmark: (bodyPartId: number) => Promise<void>;
  removeBodyPartBookmark: (bookmarkId: number) => Promise<void>;
  addHospitalBookmark: (place: HospitalPlaceInput) => Promise<void>;
  removeHospitalBookmark: (bookmarkId: number) => Promise<void>;
};

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bodyPartBookmarks: [],
  hospitalBookmarks: [],
  isLoading: false,
  error: null,
  refreshBodyPartBookmarks: async () => {
    set({ isLoading: true, error: null });
    const response = await fetchBodyPartBookmarks();
    if (!response.ok) {
      if (response.status === 401) {
        set({ bodyPartBookmarks: [], isLoading: false });
        return;
      }
      set({ error: "부위 북마크를 불러오지 못했습니다.", isLoading: false });
      return;
    }
    if (!response.data?.success) {
      set({ error: "부위 북마크 응답이 올바르지 않습니다.", isLoading: false });
      return;
    }

    const { getBodyPartCodeByLabel, setBodyPartId, setBodyPartLabel } =
      useBodyMapStore.getState();
    const items = response.data.data.map((item) => {
      const code = getBodyPartCodeByLabel(item.body_part.name_ko);
      if (code) {
        setBodyPartId(code, item.body_part.id);
        setBodyPartLabel(code, item.body_part.name_ko);
      }
      return {
        bookmarkId: item.bookmark_id,
        bodyPartId: item.body_part.id,
        nameKo: item.body_part.name_ko,
        nameEn: item.body_part.name_en,
        systemId: item.body_part.systemId,
        code,
      };
    });

    set({ bodyPartBookmarks: items, isLoading: false });
  },
  refreshHospitalBookmarks: async () => {
    set({ isLoading: true, error: null });
    const response = await fetchHospitalBookmarks();
    if (!response.ok) {
      if (response.status === 401) {
        set({ hospitalBookmarks: [], isLoading: false });
        return;
      }
      set({ error: "병원 북마크를 불러오지 못했습니다.", isLoading: false });
      return;
    }
    if (!response.data?.success) {
      set({ error: "병원 북마크 응답이 올바르지 않습니다.", isLoading: false });
      return;
    }

    const items = response.data.data.map((item) => ({
      bookmarkId: item.bookmark_id,
      placeId: item.place_id,
      name: item.name,
      address: item.address,
      createdAt: item.created_at,
    }));
    set({ hospitalBookmarks: items, isLoading: false });
  },
  addBodyPartBookmark: async (bodyPartId) => {
    set({ isLoading: true, error: null });
    const response = await addBodyPartBookmark(bodyPartId);
    if (!response.ok || !response.data?.success) {
      set({ error: "부위 북마크를 추가하지 못했습니다.", isLoading: false });
      return;
    }
    await get().refreshBodyPartBookmarks();
    set({ isLoading: false });
  },
  removeBodyPartBookmark: async (bookmarkId) => {
    set({ isLoading: true, error: null });
    const response = await removeBodyPartBookmark(bookmarkId);
    if (!response.ok || !response.data?.success) {
      set({ error: "부위 북마크를 삭제하지 못했습니다.", isLoading: false });
      return;
    }
    set((state) => ({
      bodyPartBookmarks: state.bodyPartBookmarks.filter(
        (item) => item.bookmarkId !== bookmarkId,
      ),
      isLoading: false,
    }));
  },
  addHospitalBookmark: async (place) => {
    set({ isLoading: true, error: null });
    const response = await addHospitalBookmark({
      place_id: place.place_id,
      name: place.name,
      address: place.address,
    });
    if (!response.ok || !response.data?.success) {
      set({ error: "병원 북마크를 추가하지 못했습니다.", isLoading: false });
      return;
    }
    await get().refreshHospitalBookmarks();
    set({ isLoading: false });
  },
  removeHospitalBookmark: async (bookmarkId) => {
    set({ isLoading: true, error: null });
    const response = await removeHospitalBookmark(bookmarkId);
    if (!response.ok || !response.data?.success) {
      set({ error: "병원 북마크를 삭제하지 못했습니다.", isLoading: false });
      return;
    }
    set((state) => ({
      hospitalBookmarks: state.hospitalBookmarks.filter(
        (item) => item.bookmarkId !== bookmarkId,
      ),
      isLoading: false,
    }));
  },
}));
