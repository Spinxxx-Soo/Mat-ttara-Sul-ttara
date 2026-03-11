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
 * 페이지네이션(리스트) 형태의 공통 응답 제네릭 포맷
 */
export interface ApiPaginationResponse<T> {
  content: T[];
  pageInfo: PageInfo;
  averageRating?: number; // 리뷰 리스트 등에서 사용될 수 있는 부가 속성
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

// --- 플랜 (Plan) ---
export interface Plan {
  planId: number;
  title: string;
  meetingAt: string;
  participantCount: number;
  totalBudget: number;
  planType: string;
  memo?: string;
  createdAt: string;
  updatedAt?: string;
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
  recommendReason?: string; // 추천 장소 조회시
  openingHours?: Record<string, any> | string;
}

// --- 리뷰 (Review) ---
export interface Review {
  reviewId: number;
  placeId?: number;
  userId?: number;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
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

