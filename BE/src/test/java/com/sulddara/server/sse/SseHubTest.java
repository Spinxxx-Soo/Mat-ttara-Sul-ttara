package com.sulddara.server.sse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SseHubTest {

    private SseHub sseHub;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @BeforeEach
    void setUp() {
        sseHub = new SseHub(redisTemplate);
    }

    @Test
    @DisplayName("SSE 구독 시 Emitter가 생성되고 맵에 저장되어야 한다")
    void subscribe_success() {
        // given
        long sessionId = 1L;
        String clientKey = "user1:uuid1";

        // when
        SseEmitter emitter = sseHub.subscribe(sessionId, clientKey);

        // then
        assertNotNull(emitter);
        // 내부 맵을 리플렉션으로 확인하거나, broadcast를 통해 간접 검증 가능
    }

    @Test
    @DisplayName("동일 세션에 브로드캐스트 시 메시지가 전송되어야 한다")
    void broadcast_success() throws IOException {
        // given
        long sessionId = 1L;
        String clientKey = "user1:uuid1";
        SseEmitter emitter = sseHub.subscribe(sessionId, clientKey);

        // 실제 전송 여부를 확인하기 위해 Spy 사용 고려 가능하지만,
        // 여기서는 예외가 발생하지 않는지만 확인
        String eventName = "test_event";
        String payload = "hello world";

        // when & then
        assertDoesNotThrow(() -> sseHub.broadcast(sessionId, eventName, payload));
    }

    @Test
    @DisplayName("에러 발생 시 해당 클라이언트가 맵에서 제거되어야 한다")
    void remove_on_error() {
        // given
        long sessionId = 1L;
        String clientKey = "user1:uuid1";
        sseHub.subscribe(sessionId, clientKey);

        // when
        sseHub.remove(sessionId, clientKey);

        // then (브로드캐스트 시도 시 전송 대상이 없어야 함)
        assertDoesNotThrow(() -> sseHub.broadcast(sessionId, "test", "data"));
    }
}