package com.sulddara.server.chat.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.ai.service.AiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisSubscribeListenerTest {

    @InjectMocks
    private RedisSubscribeListener redisSubscribeListener;

    @Mock
    private AiService aiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(redisSubscribeListener, "objectMapper", objectMapper);
    }

    @Test
    @DisplayName("정상적인 Redis 메시지가 오면 sessionId를 추출하여 handleResponse를 호출한다")
    void onMessage_Success() throws Exception {
        // given
        String jsonMessage = """
                {
                    "threadId": "chat-123",
                    "userId": 1,
                    "chatResponse": "안녕하세요",
                    "type": "FOLLOW_UP",
                    "memoryStatus": "OK"
                }
                """;

        // when
        redisSubscribeListener.onMessage(jsonMessage);

        // then
        verify(aiService, times(1)).handleResponse(eq(123L), eq(1L), any(AiChatResponse.class));
    }

    @Test
    @DisplayName("threadId 형식이 잘못되면 예외를 던지지 않고 handleResponse를 호출하지 않는다")
    void onMessage_InvalidThreadId() {
        // given
        String invalidJson = "{\"threadId\": \"invalidId\", \"userId\": 1}";

        // when
        redisSubscribeListener.onMessage(invalidJson);

        // then
        // 예외가 발생하지 않아야 하며, 서비스 호출이 일어나지 않아야 함
        verify(aiService, never()).handleResponse(anyLong(), anyLong(), any());
    }

    @Test
    @DisplayName("JSON 형식이 깨져있으면 예외를 던지지 않고 로그를 남기며 종료한다")
    void onMessage_JsonParsingError() {
        // given
        String brokenJson = "{ threadId: incomplete... }";

        // when
        redisSubscribeListener.onMessage(brokenJson);

        // then
        // JSON 파싱 에러 시에도 예외를 밖으로 던지지 않고 서비스 호출만 안 되면 됨
        verify(aiService, never()).handleResponse(anyLong(), anyLong(), any());
    }
}