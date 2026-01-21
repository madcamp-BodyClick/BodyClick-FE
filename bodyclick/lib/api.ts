const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// 공통 API 응답 래퍼 (HTTP 상태 코드 포함)
type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
};

// ==========================================
// User Types
// ==========================================
export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  birth_date: string | null;
  gender: "MALE" | "FEMALE" | null;
  created_at: string;
};

export type UserResponse = {
  success: boolean;
  data: UserProfile;
};

// ==========================================
// Body Data Types
// ==========================================
export type BodySystem = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  description?: string | null;
};

export type BodySystemResponse = {
  success: boolean;
  count?: number;
  data: BodySystem[];
};

export type BodyPartDetail = {
  id: number;
  systemId: number;
  code: string;
  nameKo: string;
  nameEn: string;
  description?: string | null;
  keyRoles?: unknown; // 추후 구체적인 타입 정의 권장
  observationPoints?: unknown;
  splineObjectId?: string | null;
  viewCamera?: unknown;
  viewCount?: number;
};

export type BodyPartDetailResponse = {
  success: boolean;
  data: BodyPartDetail;
};

export type DiseaseSummary = {
  id: number;
  name: string;
  severityLevel: number | null;
  commonSymptoms: string | null;
  requiresMedicalAttention: boolean;
};

export type DiseaseListResponse = {
  success: boolean;
  count?: number;
  data: DiseaseSummary[];
};

// ==========================================
// Search Types
// ==========================================
export type SearchHomePopularItem = {
  id: number;
  name: string;
  system_name: string;
  view_count: number;
};

export type SearchHistoryItem = {
  history_id: number;
  type: "view" | "keyword";
  keyword: string;
  body_part_id: number | null;
  searched_at: string;
};

export type SearchHomeResponse = {
  success: boolean;
  data: {
    popular_body_parts: SearchHomePopularItem[];
    my_recent_history: SearchHistoryItem[];
  };
};

export type SearchResultItem = {
  id: number;
  name: string;
  system_name: string;
};

export type SearchResponse = {
  success: boolean;
  data: SearchResultItem[];
};

// ==========================================
// Bookmark Types
// ==========================================
export type BodyPartBookmarkItem = {
  bookmark_id: number;
  created_at: string;
  body_part: {
    id: number;
    name_ko: string;
    name_en: string;
    systemId: number;
  };
};

export type BodyPartBookmarksResponse = {
  success: boolean;
  count: number;
  data: BodyPartBookmarkItem[];
};

export type HospitalBookmarkItem = {
  bookmark_id: number;
  place_id: string;
  name: string;
  address: string | null;
  created_at: string;
};

export type HospitalBookmarksResponse = {
  success: boolean;
  count: number;
  data: HospitalBookmarkItem[];
};

// ==========================================
// Map/Place Types
// ==========================================
export type PlaceResult = {
  place_id: string;
  name: string;
  address: string;
  road_address?: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  user_ratings_total?: number;
  is_open_now?: boolean | null;
  phone_number?: string | null;
  place_url?: string;
};

export type PlacesResponse = {
  success: boolean;
  count: number;
  data: PlaceResult[];
};

// ==========================================
// AI Chat Types (Critical Updates)
// ==========================================

// 요청 파라미터 타입 정의
export type CreateAiAnswerParams = {
  body_part_id: number;
  question: string;
  previous_summary?: string;
};

// AI 응답 내부 데이터 타입
export type AiAnswerData = {
  id: number;
  answer: string;
  confidence_score: number;
  created_at: string;
  medical_context?: {
    summary: string;
    risk_level: number;
  };
};

// API 응답 래퍼 타입
export type AiAnswerResponse = {
  success: boolean;
  data: AiAnswerData;
};

// ==========================================
// API Client Logic
// ==========================================

const buildApiUrl = (path: string) => {
  if (path.startsWith("/api/auth")) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

const safeJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(buildApiUrl(path), {
      credentials: "include", // 쿠키(세션) 전송을 위해 필수
      ...init,
    });
    const data = await safeJson<T>(response);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("API request failed:", error);
    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
};

// ==========================================
// API Functions
// ==========================================

export const fetchCurrentUser = () => apiRequest<UserResponse>("/api/users/me");

export const updateUserProfile = (payload: {
  name?: string;
  birth_date?: string;
  gender?: "MALE" | "FEMALE";
}) =>
  apiRequest<UserResponse>("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const fetchBodySystems = () =>
  apiRequest<BodySystemResponse>("/api/body/body-systems");

export const fetchBodyPartDetail = (id: number) =>
  apiRequest<BodyPartDetailResponse>(`/api/body/body-parts/${id}`);

export const fetchBodyPartDiseases = (id: number) =>
  apiRequest<DiseaseListResponse>(`/api/body/body-parts/${id}/diseases`);

export const fetchSearchHome = () =>
  apiRequest<SearchHomeResponse>("/api/common/search/home");

export const fetchSearchResults = (keyword: string) => {
  const searchParams = new URLSearchParams({ keyword });
  return apiRequest<SearchResponse>(
    `/api/common/search?${searchParams.toString()}`,
  );
};

export const fetchBodyPartBookmarks = () =>
  apiRequest<BodyPartBookmarksResponse>("/api/users/me/bookmarks/body-parts");

export const addBodyPartBookmark = (bodyPartId: number) =>
  apiRequest<{ success: boolean }>(`/api/users/me/bookmarks/body-parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body_part_id: bodyPartId }),
  });

export const removeBodyPartBookmark = (bookmarkId: number) =>
  apiRequest<{ success: boolean }>(
    `/api/users/me/bookmarks/body-parts/${bookmarkId}`,
    { method: "DELETE" },
  );

export const fetchHospitalBookmarks = () =>
  apiRequest<HospitalBookmarksResponse>("/api/users/me/bookmarks/hospital");

export const addHospitalBookmark = (payload: {
  place_id: string;
  name: string;
  address?: string | null;
}) =>
  apiRequest<{ success: boolean }>(`/api/users/me/bookmarks/hospital`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const removeHospitalBookmark = (bookmarkId: number) =>
  apiRequest<{ success: boolean }>(
    `/api/users/me/bookmarks/hospital/${bookmarkId}`,
    { method: "DELETE" },
  );

export const fetchPlaces = (params: {
  lat: number;
  lng: number;
  keyword: string;
  radius?: number;
}) => {
  const searchParams = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
    keyword: params.keyword,
  });
  if (params.radius) {
    searchParams.set("radius", params.radius.toString());
  }
  return apiRequest<PlacesResponse>(
    `/api/maps/places?${searchParams.toString()}`,
  );
};

export const clearAiContext = () =>
  apiRequest<{ success: boolean }>("/api/ai-chats/context", {
    method: "DELETE",
  });

// Auth Related
export type CsrfTokenResponse = {
  csrfToken: string;
};

export const fetchCsrfToken = () =>
  apiRequest<CsrfTokenResponse>("/api/auth/csrf");

export const signOutUser = async (callbackUrl: string) => {
  const csrf = await fetchCsrfToken();
  if (!csrf.ok || !csrf.data?.csrfToken) {
    return csrf;
  }
  return apiRequest<{ url?: string }>("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: csrf.data.csrfToken,
      callbackUrl,
    }).toString(),
  });
};

export const recordBodyPartView = async (bodyPartId: number) => {
  try {
    const response = await fetch('/api/common/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // [중요] 백엔드 스키마에 맞춰 스네이크 케이스(body_part_id)로 전송
      body: JSON.stringify({
        body_part_id: bodyPartId, 
      }),
    });

    if (!response.ok) {
      console.error(`History record failed: ${response.status}`);
      return null;
    }

    // 응답 파싱
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };

  } catch (error) {
    console.error("Failed to record history:", error);
    return null;
  }
};

// AI Chat Function (Updated Return Type)
export const createAiAnswer = (
  payload: CreateAiAnswerParams,
  signal?: AbortSignal,
) =>
  apiRequest<AiAnswerResponse>("/api/ai-chats/queries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });