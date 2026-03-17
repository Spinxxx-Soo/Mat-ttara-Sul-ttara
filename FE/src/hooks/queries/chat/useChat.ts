// ==========================================
// 챗봇 React Query 훅
// ==========================================
// 순수 API 함수(chatApi)를 React Query로 래핑합니다.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/chatApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type {
  GetSessionsRequest,
  GetMessagesRequest,
  SendMessageRequest,
  UpdateMessageRequest,
} from '@/types/api';

/**
 * 대화리스트 조회 훅 (cursor 기반 페이지네이션)
 */
export const useChatSessions = (params?: GetSessionsRequest) => {
  return useQuery({
    queryKey: queryKeys.chat.sessions(params),
    queryFn: () => chatApi.getSessions(params || {}),
    staleTime: 1000 * 30, // 30초
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};

/**
 * 메시지 기록 조회 훅 (page 기반 페이지네이션)
 */
export const useChatMessages = (params: GetMessagesRequest) => {
  return useQuery({
    queryKey: queryKeys.chat.messages(params),
    queryFn: () => chatApi.getMessages(params),
    enabled: !!params.sessionId,
    staleTime: 1000 * 10, // 10초 (메시지는 자주 업데이트됨)
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};

/**
 * 대화창 생성 훅
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { title: string }) => chatApi.createSession(params),
    onSuccess: () => {
      // 챗봇 관련 모든 쿼리 캐시 무효화 (세션 목록 등)
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.all,
      });
    },
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};

/**
 * 메시지 전송 훅
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SendMessageRequest) => chatApi.sendMessage(params),
    onSuccess: () => {
      // 챗봇 관련 모든 쿼리 캐시 무효화 (메시지 목록 + 세션 목록)
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.all,
      });
    },
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};

/**
 * 메시지 수정 훅
 */
export const useUpdateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, sessionId, ...params }: { messageId: number; sessionId: string } & UpdateMessageRequest) =>
      chatApi.updateMessage(messageId, params),
    onSuccess: () => {
      // 챗봇 관련 모든 쿼리 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.all,
      });
    },
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};

/**
 * 대화창 삭제 훅
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => chatApi.deleteSession(sessionId),
    onSuccess: () => {
      // 챗봇 관련 모든 쿼리 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.all,
      });
    },
    meta: {
      errorMessage: extractApiErrorMessage,
    },
  });
};
