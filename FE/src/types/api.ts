// API Request/Response 타입 정의

// 인증 관련
export interface SocialLoginRequest {
  code: string;
  provider: 'google' | 'naver';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean; // true면 신규 사용자(온보딩 필요), false면 기존 사용자
}

// 사용자 관련
export interface UserInfo {
  userId: number;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
  usageType: string | null;
  ageGroup: string | null;
  gender: string | null;
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

// 플랜 관련
export interface Plan {
  id: number;
  title: string;
  description?: string;
  date: string;
  places: PlanPlace[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanPlace {
  id: number;
  placeId: number;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  order: number;
  visitTime?: string;
}

export interface CreatePlanRequest {
  title: string;
  description?: string;
  date: string;
  places: Omit<PlanPlace, 'id'>[];
}

export interface UpdatePlanRequest {
  title?: string;
  description?: string;
  date?: string;
  places?: Omit<PlanPlace, 'id'>[];
}

// 가게 관련
export interface Place {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  phoneNumber?: string;
  openingHours?: string;
}

export interface PlaceSearchRequest {
  query?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  size?: number;
}

export interface PlaceSearchResponse {
  places: Place[];
  total: number;
  page: number;
  size: number;
}

// 리뷰 관련
export interface Review {
  id: number;
  placeId: number;
  userId: number;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    nickname: string;
    profileImage?: string;
  };
}

export interface CreateReviewRequest {
  rating: number;
  content: string;
  images?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  content?: string;
  images?: string[];
}

// 에러 응답
export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
