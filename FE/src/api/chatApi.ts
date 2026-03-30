// ==========================================
// 챗봇 API 순수 호출 함수
// ==========================================
// 이 파일은 API 호출만 담당합니다.
// React Query와의 조합은 src/hooks/queries/chat/에서 이루어집니다.

import { apiClient } from '@/api/axios';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionsRequest,
  SessionListResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesRequest,
  MessageListResponse,
  UpdateMessageRequest,
  UpdateMessageResponse,
  MapLocationRequest,
} from '@/types/api';

export const chatApi = {
  /**
   * 대화창 생성
   */
  createSession: async (params: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const { data } = await apiClient.post<CreateSessionResponse>(
      '/api/v1/chat/sessions',
      params
    );
    return data;
  },

  /**
   * 대화리스트 조회 (cursor 기반 페이지네이션)
   */
  getSessions: async (params: GetSessionsRequest): Promise<SessionListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.cursor !== undefined) queryParams.append('cursor', params.cursor.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const { data } = await apiClient.get<SessionListResponse>(
      `/api/v1/chat/sessions?${queryParams.toString()}`
    );
    return data;
  },

  /**
   * 대화창 삭제
   */
  deleteSession: async (sessionId: string): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.delete<{ ok: boolean }>(
      `/api/v1/chat/sessions/${sessionId}`
    );
    return data;
  },

  /**
   * 지도에서 선택한 위경도를 채팅 세션에 반영 (AI가 주변 맛집 검색 요청 처리)
   */
  setMapLocation: async (
    sessionId: string,
    body: MapLocationRequest
  ): Promise<void> => {
    await apiClient.post(`/api/v1/chat/sessions/${sessionId}/location`, body);
  },

  /**
   * 메시지 전송
   */
  sendMessage: async (params: SendMessageRequest): Promise<SendMessageResponse> => {
    const { data } = await apiClient.post<SendMessageResponse>(
      '/api/v1/chat/messages',
      params
    );
    return data;
  },

  /**
   * 메시지 수정
   */
  updateMessage: async (
    messageId: number,
    params: UpdateMessageRequest
  ): Promise<UpdateMessageResponse> => {
    const { data } = await apiClient.patch<UpdateMessageResponse>(
      `/api/v1/chat/messages/${messageId}`,
      params
    );
    return data;
  },

  /**
   * 메시지 기록 조회 (page 기반 페이지네이션)
   */
  getMessages: async (params: GetMessagesRequest): Promise<MessageListResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('sessionId', params.sessionId);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const { data } = await apiClient.get<MessageListResponse>(
      `/api/v1/chat/messages?${queryParams.toString()}`
    );
    return data;
  },
};
