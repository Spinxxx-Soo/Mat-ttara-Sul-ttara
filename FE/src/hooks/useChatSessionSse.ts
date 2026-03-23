import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useChatMapStore } from '@/stores/chatMapStore';
import { placeApi } from '@/api/placeApi';
import { envConfig } from '@/config/env';
import { consumeSseStream } from '@/lib/sse/consumeSseStream';
import { recommendedPlaceToPlace } from '@/lib/recommendedPlaceToPlace';
import { queryKeys } from '@/hooks/queries/queryKeys';
import type { AiSseResponsePayload } from '@/types/api';

/**
 * 채팅 세션 SSE 구독 (/api/v1/chat/{sessionId}/stream)
 * - `ai_response` 수신 시 메시지 목록 갱신 + GET /api/v1/places/recommend 로 지도용 추천 장소 동기화
 */
export function useChatSessionSse(sessionId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const setAiRecommendedPlaces = useChatMapStore((s) => s.setAiRecommendedPlaces);
  const accessToken = useAuthStore((s) => s.accessToken);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !accessToken) return;

    const ac = new AbortController();
    abortRef.current = ac;

    const connect = async () => {
      const url = `${envConfig.apiBaseUrl}/api/v1/chat/${sessionId}/stream`;
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream',
          },
          signal: ac.signal,
        });

        if (!res.ok) {
          console.warn('[chat-sse] stream failed', res.status, res.statusText);
          return;
        }
        if (!res.body) return;

        await consumeSseStream(
          res,
          async (eventName, data) => {
            if (eventName === 'connected') return;

            if (eventName === 'ai_response') {
              let payload: AiSseResponsePayload;
              try {
                payload = JSON.parse(data) as AiSseResponsePayload;
              } catch {
                return;
              }

              queryClient.invalidateQueries({
                queryKey: [...queryKeys.chat.all, 'messages'],
              });

              try {
                const rawSession = String(payload.sessionId ?? sessionId);
                const recommended = await placeApi.getRecommendedPlaces(rawSession);
                const mapped = recommended.map(recommendedPlaceToPlace);
                setAiRecommendedPlaces(mapped);
              } catch (e) {
                console.warn('[chat-sse] getRecommendedPlaces failed', e);
              }
            }
          },
          ac.signal
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('[chat-sse]', e);
        }
      }
    };

    connect();

    return () => {
      ac.abort();
      abortRef.current = null;
    };
  }, [sessionId, enabled, accessToken, queryClient, setAiRecommendedPlaces]);
}
