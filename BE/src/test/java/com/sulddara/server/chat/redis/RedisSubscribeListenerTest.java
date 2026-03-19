package com.sulddara.server.chat.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.ai.service.AiService;
import com.sulddara.server.share.error.exception.BaseException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RedisSubscribeListenerTest {

    @InjectMocks
    private RedisSubscribeListener redisSubscribeListener;

    @Mock
    private AiService aiService;

    // 실제 ObjectMapper를 사용하여 JSON 파싱 로직을 검증합니다.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // 생성자 주입이 아닌 @InjectMocks 사용 시 ObjectMapper 설정
        ReflectionTestUtils.setField(redisSubscribeListener, "objectMapper", objectMapper);
    }

    @Test
    @DisplayName("정상적인 Redis 메시지가 오면 sessionId를 추출하여 handleResponse를 호출한다")
    void onMessage_Success() throws Exception {
        // given
        String threadId = "chat-123";
        long userId = 1L;
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
        // threadId "chat-123"에서 123이 추출되어 sessionId로 넘어갔는지 확인
        verify(aiService, times(1)).handleResponse(eq(123L), eq(userId), any(AiChatResponse.class));
    }

    @Test
    @DisplayName("threadId 형식이 잘못되면 BaseException(INVALID_INPUT_VALUE)이 발생한다")
    void onMessage_InvalidThreadId() {
        // given
        String invalidJson = "{\"threadId\": \"invalidId\", \"userId\": 1}";

        // when & then
        assertThatThrownBy(() -> redisSubscribeListener.onMessage(invalidJson))
                .isInstanceOf(BaseException.class);
        // ErrorCode.INVALID_INPUT_VALUE 검증 로직 추가 가능
    }

    @Test
    @DisplayName("JSON 형식이 깨져있으면 BaseException(INTERNAL_SERVER_ERROR)이 발생한다")
    void onMessage_JsonParsingError() {
        // given
        String brokenJson = "{ threadId: incomplete... }";

        // when & then
        assertThatThrownBy(() -> redisSubscribeListener.onMessage(brokenJson))
                .isInstanceOf(BaseException.class);
    }
}