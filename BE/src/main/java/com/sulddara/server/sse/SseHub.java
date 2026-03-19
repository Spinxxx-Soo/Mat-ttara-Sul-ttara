package com.sulddara.server.sse;

import com.sulddara.server.sse.payload.ChatEventPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class SseHub {

    private final Map<Long, Map<String, SseEmitter>> sseEmiterMap = new ConcurrentHashMap<>();
    private final RedisTemplate<String, String> redisTemplate;

    private static final long EMITTER_TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    public SseEmitter subscribe(long sessionId, String clientKey){
        SseEmitter sseEmitter = new SseEmitter(EMITTER_TIMEOUT_MS);

        sseEmiterMap.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .put(clientKey, sseEmitter);

        sseEmitter.onCompletion(() -> remove(sessionId, clientKey));
        sseEmitter.onTimeout(() -> remove(sessionId, clientKey));
        sseEmitter.onError(e -> remove(sessionId, clientKey));

        try{
            sseEmitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(sessionId, clientKey);
        }

        return sseEmitter;
    }

    // 특정 세션의 모든 탭에 전송, eventId 필요 여부 검토
    public void broadcast(long sessionId, String eventName, Object payload) {
        Map<String, SseEmitter> clients = sseEmiterMap.get(sessionId);
        if (clients != null){
            clients.forEach((clientKey, emitter) -> {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(payload));
                } catch (IOException e) {
                    remove(sessionId, clientKey);
                }
            });
        }
    }

    public void broadcast(ChatEventPayload payload) {
        broadcast(payload.getSessionId(), payload.getEventName(), payload);
    }

    public void remove(long sessionId, String clientKey){
        Map<String, SseEmitter> clientMap = sseEmiterMap.get(sessionId);
        if (clientMap != null) {
            clientMap.remove(clientKey);
            if (clientMap.isEmpty()) {
                sseEmiterMap.remove(sessionId);
            }
        }

    }

    public void pingAll() {
        sseEmiterMap.forEach((sessionId, clients) -> {
            clients.forEach((clientKey, emitter) -> {
                try {
                    emitter.send(SseEmitter.event()
                            .name("ping")
                            .data("keep-alive"));
                } catch (IOException e) {
                    remove(sessionId, clientKey);
                }
            });
        });
    }
}
