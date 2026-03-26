import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useChatMapStore } from '@/stores/chatMapStore';
import { placeApi } from '@/api/placeApi';
import { envConfig } from '@/config/env';
import { consumeSseStream } from '@/lib/sse/consumeSseStream';
import { recommendedPlaceToPlace } from '@/lib/recommendedPlaceToPlace';
import { queryKeys } from '@/hooks/queries/queryKeys';
import type { AiSseResponsePayload, ChatMessage } from '@/types/api';
import { useLocationStore, FALLBACK_LOCATION } from '@/stores/locationStore';

/**
 * 채팅 세션 SSE 구독 (/api/v1/chat/{sessionId}/stream)
 * - `ai_response` 수신 시 메시지 목록 갱신 + GET /api/v1/places/recommend 로 지도용 추천 장소 동기화
 */
type ChatMessageEventPayload = {
  sessionId?: string | number | null;
  messageId?: number;
  role?: string;
  content?: string;
  sentAtEpochMs?: number;
  createdAt?: string;
};

const toChatMessage = (
  payload: ChatMessageEventPayload,
  fallbackSessionId: string
): ChatMessage | null => {
  if (payload.messageId == null) return null;
  return {
    messageId: payload.messageId,
    sessionId: String(payload.sessionId ?? fallbackSessionId),
    role: payload.role ?? 'ASSISTANT',
    content: payload.content ?? '',
    createdAt: payload.createdAt ?? new Date(payload.sentAtEpochMs ?? Date.now()).toISOString(),
  };
};

export function useChatSessionSse(
  sessionId: string | null,
  enabled: boolean,
  onMessage?: (message: ChatMessage) => void
) {
  const queryClient = useQueryClient();
  const setAiRecommendedPlaces = useChatMapStore((s) => s.setAiRecommendedPlaces);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { lat, lng } = useLocationStore();
  const abortRef = useRef<AbortController | null>(null);
  const shouldDebug = import.meta.env.DEV;
  const debugLog = (...args: unknown[]) => {
    if (shouldDebug) {
      console.log('[chat-sse]', ...args);
    }
  };

  useEffect(() => {
    if (!enabled || !sessionId || !accessToken) return;
    debugLog('connect start', { enabled, sessionId, hasToken: !!accessToken });

    // SSE 연결만 기다리면(connected 이벤트만 받고) 과거 추천이 복원되지 않을 수 있어
    // 세션 전환 시점에 추천 장소를 1회 선조회해서 지도 핀을 즉시 복원합니다.
    let cancelled = false;
    const coords = {
      lat: lat ?? FALLBACK_LOCATION.lat,
      lng: lng ?? FALLBACK_LOCATION.lng,
    };
    (async () => {
      try {
        const recommended = await placeApi.getRecommendedPlaces(coords);
        if (cancelled) return;
        const mapped = recommended.map(recommendedPlaceToPlace);
        debugLog('recommend prefetch applied', {
          sessionId,
          coords,
          count: mapped.length,
          placeIds: mapped.map((p) => p.placeId),
        });
        setAiRecommendedPlaces(mapped);
      } catch (e) {
        console.warn('[chat-sse] getRecommendedPlaces(prefetch) failed', e);
      }
    })();

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
        debugLog('connected', { status: res.status, sessionId });

        await consumeSseStream(
          res,
          async (eventName, data) => {
            debugLog('event received', { eventName, rawData: data });
            if (eventName === 'connected') return;

            if (eventName === 'chat_message') {
              let payload: ChatMessageEventPayload;
              try {
                payload = JSON.parse(data) as ChatMessageEventPayload;
                debugLog('chat_message parsed', payload);
              } catch (e) {
                console.warn('[chat-sse] chat_message JSON.parse failed', e, data);
                return;
              }

              const normalized = toChatMessage(payload, sessionId);
              if (normalized && String(normalized.sessionId ?? '') === String(sessionId)) {
                onMessage?.(normalized);
              }
              return;
            }

            if (eventName === 'ai_response') {
              let payload: AiSseResponsePayload;
              try {
                payload = JSON.parse(data) as AiSseResponsePayload;
                debugLog('ai_response parsed', payload);
              } catch (e) {
                console.warn('[chat-sse] ai_response JSON.parse failed', e, data);
                return;
              }

              const normalized = toChatMessage(payload as ChatMessageEventPayload, sessionId);
              if (normalized && String(normalized.sessionId ?? '') === String(sessionId)) {
                onMessage?.(normalized);
              }

              const payloadType = String((payload as { type?: unknown }).type ?? '');
              debugLog('ai_response type', { sessionId, payloadType });

              queryClient.invalidateQueries({
                queryKey: [...queryKeys.chat.all, 'messages'],
              });

              try {
                const rawSession = String(payload.sessionId ?? sessionId);
                void rawSession; // sessionId는 현재 API에서 사용하지 않음
                const recommended = await placeApi.getRecommendedPlaces({
                  lat: lat ?? FALLBACK_LOCATION.lat,
                  lng: lng ?? FALLBACK_LOCATION.lng,
                });
                const mapped = recommended.map(recommendedPlaceToPlace);
                debugLog('recommend sync applied', {
                  sessionId,
                  count: mapped.length,
                  placeIds: mapped.map((p) => p.placeId),
                });
                setAiRecommendedPlaces(mapped);
              } catch (e) {
                console.warn('[chat-sse] getRecommendedPlaces failed', e);
              }
            }
          },
          ac.signal
        );
        debugLog('stream closed', { sessionId });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('[chat-sse]', e);
        } else {
          debugLog('stream aborted', { sessionId });
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      ac.abort();
      abortRef.current = null;
    };
  }, [sessionId, enabled, accessToken, queryClient, setAiRecommendedPlaces, onMessage]);
}
