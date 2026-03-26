package com.sulddara.server.sse;

import com.sulddara.server.sse.payload.ChatEventPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SseHub {

    private final Map<Long, Map<String, SseEmitter>> sseEmiterMap = new ConcurrentHashMap<>();

    /** SseEmitter 및 Spring MVC 비동기 요청 타임아웃과 동기화 */
    public static final long EMITTER_TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    public SseEmitter subscribe(long sessionId, String clientKey) {
        SseEmitter sseEmitter = new SseEmitter(EMITTER_TIMEOUT_MS);

        sseEmiterMap.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .put(clientKey, sseEmitter);

        sseEmitter.onCompletion(() -> remove(sessionId, clientKey));
        sseEmitter.onTimeout(() -> {
            log.info("[sse] emitter timeout sessionId={} clientKey={}", sessionId, clientKey);
            remove(sessionId, clientKey);
        });
        sseEmitter.onError(e ->
                log.debug("[sse] emitter error callback sessionId={} clientKey={}: {}",
                        sessionId, clientKey, e.toString()));

        sendToClient(sessionId, clientKey, sseEmitter, "connected", "ok");

        return sseEmitter;
    }

    public void broadcast(long sessionId, String eventName, Object payload) {
        Map<String, SseEmitter> clients = sseEmiterMap.get(sessionId);
        if (clients == null || clients.isEmpty()) {
            return;
        }
        clients.forEach((clientKey, emitter) ->
                sendToClient(sessionId, clientKey, emitter, eventName, payload));
    }

    public void broadcast(ChatEventPayload payload) {
        broadcast(payload.getSessionId(), payload.getEventName(), payload);
    }

    public void remove(long sessionId, String clientKey) {
        Map<String, SseEmitter> clientMap = sseEmiterMap.get(sessionId);
        if (clientMap != null) {
            clientMap.remove(clientKey);
            if (clientMap.isEmpty()) {
                sseEmiterMap.remove(sessionId);
            }
        }
    }

    public void pingAll() {
        sseEmiterMap.forEach((sessionId, clients) ->
                clients.forEach((clientKey, emitter) ->
                        sendToClient(sessionId, clientKey, emitter, "ping", "keep-alive")));
    }

    /**
     * IOException 뿐 아니라 IllegalStateException(이미 complete된 emitter),
     * Jackson 직렬화 오류 등으로 인해 응답 스트림이 중간에 끊기지 않도록 모든 예외를 처리합니다.
     */
    private void sendToClient(long sessionId, String clientKey, SseEmitter emitter,
                              String eventName, Object payload) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(payload));
        } catch (Exception ex) {
            log.warn("[sse] send failed sessionId={} clientKey={} event={} — closing emitter: {}",
                    sessionId, clientKey, eventName, ex.toString(), ex);
            remove(sessionId, clientKey);
            try {
                emitter.completeWithError(ex);
            } catch (Exception completeEx) {
                log.trace("[sse] completeWithError skipped: {}", completeEx.toString());
            }
        }
    }
}
