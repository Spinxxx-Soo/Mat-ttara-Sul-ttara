package com.sulddara.server.chat.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.request.SessionState;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.domain.ChatMessages;
import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.repository.ChatMessagesRepository;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.share.event.AiChatMessageCreatedEvent;
import com.sulddara.server.user.repository.UserPreferenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock private WebClient webClient;
    @Mock private ApplicationEventPublisher publisher;
    @Mock private ChatSessionRepository chatSessionRepository;
    @Mock private ChatMessagesRepository chatMessagesRepository;
    @Mock private UserPreferenceRepository userPreferenceRepository;
    @Mock private PlaceRepository placeRepository;
    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AiService aiService;

    @BeforeEach
    void setUp() {
        // RedisTemplate의 opsForValue 모킹
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("AI 응답 처리 성공 - 일반 답변 및 제목 업데이트")
    void handleResponse_Success_GeneralResponse() {
        // given
        long sessionId = 1L;
        long userId = 100L;
        AiChatResponse response = AiChatResponse.builder()
                .type("FOLLOW_UP")
                .chatResponse("안녕하세요! 무엇을 도와드릴까요?")
                .title("새로운 채팅 제목")
                .memoryStatus("OK")
                .build();

        ChatMessages mockMessage = ChatMessages.builder().messageId(50L).build();
        ChatSessions mockSession = mock(ChatSessions.class);

        when(chatMessagesRepository.save(any())).thenReturn(mockMessage);
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(mockSession));

        // when
        aiService.handleResponse(sessionId, userId, response);

        // then
        verify(chatMessagesRepository).save(any()); // 메시지 저장 확인
        verify(mockSession).updateTitle("새로운 채팅 제목"); // 제목 업데이트 확인
        verify(publisher).publishEvent(any(AiChatMessageCreatedEvent.class)); // 이벤트 발행 확인
    }

    @Test
    @DisplayName("AI 응답 처리 성공 - 장소 추천 시 후보지 재요청")
    void handleResponse_Success_Recommendation() {
        // given
        long sessionId = 1L;
        long userId = 100L;
        SessionState state = SessionState.builder().lat(37.5).lng(127.0).build();
        AiChatResponse response = AiChatResponse.builder()
                .type("RECOMMENDATION")
                .parsedState(state)
                .build();

        // WebClient 모킹 (체이닝 대응)
        WebClient.RequestBodyUriSpec requestBodyUriSpec = mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestBodySpec requestBodySpec = mock(WebClient.RequestBodySpec.class);
        WebClient.RequestHeadersSpec requestHeadersSpec = mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec responseSpec = mock(WebClient.ResponseSpec.class);

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        when(placeRepository.findIdsByLocation(37.5, 127.0)).thenReturn(List.of(10L, 20L));

        // when
        aiService.handleResponse(sessionId, userId, response);

        // then
        verify(placeRepository).findIdsByLocation(37.5, 127.0); // 장소 조회 확인
        verify(webClient).post(); // AI 서버 재요청 확인
    }

    @Test
    @DisplayName("AI 요청 생성 실패 - 유저 취향 정보 없음")
    void createRequest_Fail_NoPreference() {
        // given
        long userId = 100L;
        when(userPreferenceRepository.findById(userId)).thenReturn(Optional.empty());

        // when & then
        BaseException exception = assertThrows(BaseException.class, () -> {
            aiService.getPreferenceSummary(userId);
        });

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
    }

    @Test
    @DisplayName("AI 응답 처리 실패 - JSON 파싱 오류 시 예외 발생")
    void handleResponse_Fail_JsonError() throws Exception {
        // given
        long sessionId = 1L;
        long userId = 100L;

        AiChatResponse response = AiChatResponse.builder()
                .chatResponse("답변")
                .parsedState(SessionState.builder().lat(37.5).lng(127.0).build())
                .build();

        lenient().when(objectMapper.writeValueAsString(any()))
                .thenThrow(new JsonMappingException(null, "JSON Error"));

        // when & then
        assertThrows(BaseException.class, () -> {
            aiService.handleResponse(sessionId, userId, response);
        });
    }
}