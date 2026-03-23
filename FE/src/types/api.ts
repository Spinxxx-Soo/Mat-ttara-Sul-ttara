// API Request/Response 타입 정의

// ==========================================
// 1. 공통 Base 타입 (응답 래퍼)
// ==========================================

export interface PageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * 페이지번호(Offset) 기반의 공통 응답 제네릭 포맷
 */
export interface ApiPaginationResponse<T> {
  content: T[];
  pageInfo: PageInfo;
  averageRating?: number;
}

/**
 * 커서(Cursor) 기반의 공통 응답 제네릭 포맷 (S14P21B205-132)
 */
export interface ApiCursorPaginationResponse<T> {
  content: T[];
  nextCursor: string | number | null;
  hasNext: boolean;
}

/**
 * 에러 응답 포맷
 */
export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}


// ==========================================
// 2. 도메인별 타입
// ==========================================

// --- 인증 (Auth) ---
export interface SocialLoginRequest {
  code: string;
  provider: 'google' | 'naver';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean; // 신규 유저 여부 (OAuth 콜백용)
}

// --- 사용자 (User) ---
export interface UserInfo {
  userId: number;
  email: string;
  name: string;
  bio?: string | null;
  createdAt: string;
  lastLoginAt: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  name?: string;
  bio?: string;
}

export interface OnboardingRequest {
  usageType: string;
  ageGroup: string;
  gender: string;
}

export interface UserPreference {
  prefId: number;
  userId: number;
  usageType: string;
  ageGroup: string;
  gender: string;
  createdAt: string;
  updatedAt: string;
}

// --- 플랜 (Plan) ---
export interface Plan {
  planId: number;
  title: string;
  meetingAt: string;
  participantCount: number;
  totalBudget: number;
  planType: string;
  memo?: string;
  thumbnailUrl?: string; // 추가: 목록에서 보여줄 이미지
  createdAt: string;
  updatedAt?: string;
}

/**
 * 플랜 상세 응답 (S14P21B205-213)
 */
export interface PlanDetail extends Plan {
  details: PlanPlace[];
}

export interface PlanPlace {
  detailId?: number;
  placeId: number;
  seqNo: number;
  place?: Place;
  recommendReason?: string;
}

export interface CreatePlanRequest {
  title: string;
  meetingAt: string;
  participantCount: number;
  totalBudget: number;
  planType: string;
  memo?: string;
  details: { placeId: number; seqNo: number }[];
}

export interface UpdatePlanRequest {
  title?: string;
  meetingAt?: string;
  participantCount?: number;
  totalBudget?: number;
  planType?: string;
  memo?: string;
  details?: { placeId: number; seqNo: number }[]; // 수정 시에도 장소 목록 수정 가능하도록 추가
}

// --- 장소 (Place) ---
export interface Place {
  placeId: number;
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  rating?: number;
  recommendReason?: string;
  openingHours?: Record<string, unknown> | string;
  imageUrl?: string;
  category?: string;
}

export interface PlaceSearchRequest {
  keyword: string; // 필수
  lat?: number;
  lng?: number;
  page: number; // 필수
  size: number; // 필수
}

export interface PlaceSearchResponse {
  content: Place[];
  pageInfo: PageInfo;
}

// --- 리뷰 (Review) ---
export interface Review {
  reviewId: number;
  placeId?: number;
  userId?: number;
  /** GET /places/{id}/reviews 목록에 포함될 수 있음 */
  userName?: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

/** 가게별 리뷰 목록 조회 응답 (GET /api/v1/places/{placeId}/reviews) */
export interface PlaceReviewsResponse {
  content: Review[];
  pageInfo: PageInfo;
  averageRating?: number;
}

export interface CreateReviewRequest {
  rating: number;
  content: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  content?: string;
}

// --- AI 챗봇 (Chat) ---
export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  lastMessageAt?: string;
}

export interface ChatMessage {
  messageId: number;
  sessionId?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

// Request 타입들
export interface CreateSessionRequest {
  title: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  createdAt: string;
}

export interface GetSessionsRequest {
  cursor?: string | number;
  size?: number;
}

export interface SessionListResponse {
  content: ChatSession[];
  nextCursor?: string | number;
  hasNext: boolean;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface SendMessageResponse {
  messageId: number;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | string;
  content: string;
  createdAt: string;
}

export interface GetMessagesRequest {
  sessionId: string;
  page?: number;
  size?: number;
}

export interface MessageListResponse {
  content: ChatMessage[];
  pageInfo: PageInfo;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface UpdateMessageResponse {
  messageId: number;
  content: string;
  updatedAt: string;
}
