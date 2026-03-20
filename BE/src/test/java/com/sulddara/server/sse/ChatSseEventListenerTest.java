package com.sulddara.server.sse;

import com.sulddara.server.chat.ai.service.AiService;
import com.sulddara.server.share.event.AiChatMessageCreatedEvent;
import com.sulddara.server.share.event.ChatMessageCreatedEvent;
import com.sulddara.server.share.event.ChatMessageUpdatedEvent;
import com.sulddara.server.sse.payload.AiResponsePayload;
import com.sulddara.server.sse.payload.ChatMessagePayload;
import com.sulddara.server.sse.payload.ChatUpdatePayload;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ChatSseEventListenerTest {

    @Mock
    private SseHub sseHub;

    @Mock
    private AiService aiService;

    @InjectMocks
    private ChatSseEventListener chatSseEventListener;

    @Test
    @DisplayName("사용자 메시지 생성 이벤트가 발생하면 브로드캐스트 후 AI 서비스를 호출한다")
    void onChatMessageCreatedEvent_Success() {
        // given
        ChatMessageCreatedEvent event = new ChatMessageCreatedEvent(
                1L, 100L, 1L, "USER", "안녕하세요", true, System.currentTimeMillis()
        );

        // when
        chatSseEventListener.on(event);

        // then
        verify(sseHub, times(1)).broadcast(any(ChatMessagePayload.class));
        verify(aiService, times(1)).sendChat(eq(1L), eq(1L), eq("안녕하세요"), eq(true));
    }

    @Test
    @DisplayName("AI 응답 이벤트가 발생하면 AI 전용 페이로드를 브로드캐스트한다")
    void onAiResponse_Success() {
        // given
        AiChatMessageCreatedEvent event = new AiChatMessageCreatedEvent(
                1L, 200L, 1L, "ASSISTANT", "추천 장소입니다", "RECOMMENDATION", null, "새로운 제목", System.currentTimeMillis()
        );

        // when
        chatSseEventListener.onAiResponse(event);

        // then
        verify(sseHub, times(1)).broadcast(any(AiResponsePayload.class));
    }

    @Test
    @DisplayName("메시지 수정 이벤트가 발생하면 수정 페이로드를 브로드캐스트한다")
    void onUpdate_Success() {
        // given
        ChatMessageUpdatedEvent event = new ChatMessageUpdatedEvent(
                1L, 100L, "수정된 내용", System.currentTimeMillis()
        );

        // when
        chatSseEventListener.onUpdate(event);

        // then
        verify(sseHub, times(1)).broadcast(any(ChatUpdatePayload.class));
    }
}