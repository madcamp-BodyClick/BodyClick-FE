"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, MapPin, Stethoscope } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import {
  useBookmarkStore,
  type HospitalPlaceInput,
} from "../../store/useBookmarkStore";
import {
  BODY_PART_LOOKUP,
  useBodyMapStore,
  type SystemKey,
} from "../../store/useBodyMapStore";

type UndoItem =
  | {
      type: "part";
      bodyPartId: number;
      label: string;
    }
  | {
      type: "hospital";
      place: HospitalPlaceInput;
      label: string;
    };

const BookmarksPage = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { bodyPartBookmarks, hospitalBookmarks } = useBookmarkStore();
  const refreshBodyPartBookmarks = useBookmarkStore(
    (state) => state.refreshBodyPartBookmarks,
  );
  const refreshHospitalBookmarks = useBookmarkStore(
    (state) => state.refreshHospitalBookmarks,
  );
  const removeBodyPartBookmark = useBookmarkStore(
    (state) => state.removeBodyPartBookmark,
  );
  const removeHospitalBookmark = useBookmarkStore(
    (state) => state.removeHospitalBookmark,
  );
  const addBodyPartBookmark = useBookmarkStore(
    (state) => state.addBodyPartBookmark,
  );
  const addHospitalBookmark = useBookmarkStore(
    (state) => state.addHospitalBookmark,
  );
  const systemCodeById = useBodyMapStore((state) => state.systemCodeById);
  const getSystemLabel = useBodyMapStore((state) => state.getSystemLabel);
  const getBodyPartLabel = useBodyMapStore((state) => state.getBodyPartLabel);
  const getBodyPartCodeByLabel = useBodyMapStore(
    (state) => state.getBodyPartCodeByLabel,
  );
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const favoritePartCards = bodyPartBookmarks
    .map((bookmark) => {
      const code =
        bookmark.code ?? getBodyPartCodeByLabel(bookmark.nameKo) ?? null;
      const systemCode =
        (code ? BODY_PART_LOOKUP[code]?.system : null) ??
        systemCodeById[bookmark.systemId];
      if (!systemCode) {
        return null;
      }
      return {
        bookmarkId: bookmark.bookmarkId,
        bodyPartId: bookmark.bodyPartId,
        label: code ? getBodyPartLabel(code) : bookmark.nameKo,
        system: systemCode,
      };
    })
    .filter(Boolean) as Array<{
    bookmarkId: number;
    bodyPartId: number;
    label: string;
    system: SystemKey;
  }>;

  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [undoTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    refreshBodyPartBookmarks();
    refreshHospitalBookmarks();
  }, [isAuthenticated, refreshBodyPartBookmarks, refreshHospitalBookmarks]);

  const openUndo = (item: UndoItem) => {
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
    setUndoItem(item);
    setUndoTimer(
      setTimeout(() => {
        setUndoItem(null);
      }, 4000),
    );
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-bm-bg text-bm-text">
        <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
          </div>
          <div className="relative w-full max-w-md rounded-[28px] border border-bm-border bg-bm-panel p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
              북마크
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-bm-text">
              로그인 후 이용할 수 있어요
            </h1>
            <p className="mt-2 text-sm text-bm-muted">
              즐겨찾기한 부위와 병원을 한 번에 관리하세요.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-bm-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-bm-accent-strong"
            >
              로그인하기
            </Link>
            <Link
              href="/explore"
              className="mt-3 block text-xs text-bm-muted transition hover:text-bm-text"
            >
              탐색 화면으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bm-bg text-bm-text">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(99,199,219,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1280px] flex-col gap-8 px-6 pb-20 pt-8 lg:px-10 lg:pt-16">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-bm-muted">
                내 북마크
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-bm-text lg:text-3xl">
                {user?.name ? `${user.name}님의 즐겨찾기` : "즐겨찾기"}
              </h1>
              <p className="mt-2 text-sm text-bm-muted">
                자주 보는 부위와 병원을 한 곳에서 확인하세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-full border border-bm-border bg-bm-panel-soft px-4 py-2 text-xs text-bm-muted transition hover:text-bm-text"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                탐색으로
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-bm-border bg-bm-panel-soft px-4 py-2 text-xs text-bm-muted">
                <Bookmark className="h-3.5 w-3.5" />
                저장됨 {bodyPartBookmarks.length + hospitalBookmarks.length}
              </div>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] border border-bm-border bg-bm-panel p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bm-muted">
                    즐겨찾기 부위
                  </p>
                  <p className="mt-2 text-lg font-semibold text-bm-text">
                    {favoritePartCards.length}개 부위
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-accent">
                  <Stethoscope className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-3 [scrollbar-gutter:stable] sm:grid-cols-2">
                {favoritePartCards.length === 0 ? (
                  <div className="flex min-h-[124px] flex-col gap-3 rounded-2xl border border-dashed border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel text-bm-accent">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <div className="max-w-[320px] space-y-1 leading-6">
                        <p>아직 저장된 부위가 없어요.</p>
                        <p>탐색 화면에서 관심 부위를 저장해 보세요.</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Link
                        href="/explore"
                        className="inline-flex items-center rounded-full border border-bm-border bg-bm-panel px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
                      >
                        부위 찾기
                      </Link>
                    </div>
                  </div>
                ) : (
                  favoritePartCards.map((part) => (
                    <div
                      key={part.bookmarkId}
                      className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-bm-muted">
                            {getSystemLabel(part.system)}
                          </p>
                          <p className="mt-2 text-base font-semibold text-bm-text">
                            {part.label}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeBodyPartBookmark(part.bookmarkId);
                            openUndo({
                              type: "part",
                              bodyPartId: part.bodyPartId,
                              label: part.label,
                            });
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel text-bm-accent transition hover:text-bm-text"
                          aria-label="부위 북마크 해제"
                        >
                          <Bookmark className="h-3.5 w-3.5 fill-bm-accent" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-bm-muted">
                        맞춤 상담과 검사 정보를 빠르게 확인하세요.
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-bm-border bg-bm-panel p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bm-muted">
                    즐겨찾기 병원
                  </p>
                  <p className="mt-2 text-lg font-semibold text-bm-text">
                    {hospitalBookmarks.length}곳
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-bm-border bg-bm-panel-soft text-bm-accent">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-3 [scrollbar-gutter:stable]">
                {hospitalBookmarks.length === 0 ? (
                  <div className="flex min-h-[124px] flex-col gap-3 rounded-2xl border border-dashed border-bm-border bg-bm-panel-soft p-4 text-sm text-bm-muted sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel text-bm-accent">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="max-w-[320px] space-y-1 leading-6">
                        <p>아직 저장된 병원이 없어요.</p>
                        <p>탐색에서 추천 병원을 저장해 보세요.</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Link
                        href="/explore"
                        className="inline-flex items-center rounded-full border border-bm-border bg-bm-panel px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
                      >
                        병원 살펴보기
                      </Link>
                    </div>
                  </div>
                ) : (
                  hospitalBookmarks.map((hospital) => (
                    <div
                      key={hospital.bookmarkId}
                      className="rounded-2xl border border-bm-border bg-bm-panel-soft p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-bm-text">
                            {hospital.name}
                          </p>
                          <p className="mt-1 text-[11px] text-bm-muted">
                            {hospital.address ?? "주소 정보 없음"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              removeHospitalBookmark(hospital.bookmarkId);
                              openUndo({
                                type: "hospital",
                                place: {
                                  place_id: hospital.placeId,
                                  name: hospital.name,
                                  address: hospital.address,
                                },
                                label: hospital.name,
                              });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-bm-border bg-bm-panel text-bm-accent transition hover:text-bm-text"
                            aria-label="병원 북마크 해제"
                          >
                            <Bookmark className="h-3.5 w-3.5 fill-bm-accent" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-bm-muted">
                        장소 ID: {hospital.placeId}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      {undoItem ? (
        <div className="fixed bottom-6 right-6 z-30 w-[min(320px,90vw)] rounded-2xl border border-bm-border bg-bm-panel px-4 py-3 text-sm text-bm-text shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <p className="text-xs text-bm-muted">
            {undoItem.label} 북마크를 해제했어요.
          </p>
          <button
            type="button"
            onClick={() => {
              if (undoItem.type === "part") {
                addBodyPartBookmark(undoItem.bodyPartId);
              } else {
                addHospitalBookmark(undoItem.place);
              }
              setUndoItem(null);
            }}
            className="mt-3 inline-flex items-center rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-xs text-bm-muted transition hover:text-bm-text"
          >
            되돌리기
          </button>
        </div>
      ) : null}
    </main>
  );
};

export default BookmarksPage;
