package com.sulddara.server.sse;

import com.sulddara.server.chat.ai.service.AiService;
import com.sulddara.server.chat.domain.enums.RoleType;
import com.sulddara.server.chat.event.AiChatMessageCreatedEvent;
import com.sulddara.server.chat.event.ChatMessageCreatedEvent;
import com.sulddara.server.chat.event.ChatMessageUpdatedEvent;
import com.sulddara.server.sse.payload.AiResponsePayload;
import com.sulddara.server.sse.payload.ChatMessagePayload;
import com.sulddara.server.sse.payload.ChatUpdatePayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatSseEventListener {

    private final SseHub sseHub;
    private final AiService aiService;

    @EventListener
    public void on(ChatMessageCreatedEvent e){
        log.info("이벤트 리스너 도달: {}", e.content());
        var payload = new ChatMessagePayload(
                e.sessionId(),
                e.messageId(),
                e.userId(),
                e.role(),
                e.content(),
                e.sentAtEpochMs()
        );
        log.info("브로드캐스트 시작: channelId={}", e.sessionId());
        sseHub.broadcast(payload);

        if(e.role().equals(RoleType.USER.toString())){
            aiService.sendChat(e.sessionId(), e.userId(), e.content(), e.isFirst());
        }
    }

    @EventListener
    public void onAiResponse(AiChatMessageCreatedEvent e){
        log.info("AI 이벤트 리스너 도달: {}", e.content());
        var payload = new AiResponsePayload(
                e.sessionId(),
                e.messageId(),
                e.userId(),
                e.role(),
                e.content(),
                e.type(),
                e.parsedState(),
                e.title(),
                e.sentAtEpochMs()
        );
        log.info("AI 브로드캐스트 시작: channelId={}", e.sessionId());
        sseHub.broadcast(payload);
    }

    @EventListener
    public void onUpdate(ChatMessageUpdatedEvent e) {
        // 수정용 전용 Payload를 만들어서 브로드캐스트
        var payload = ChatUpdatePayload.builder()
                .sessionId(e.sessionId())
                .messageId(e.messageId())
                .content(e.content())
                .updatedAtEpochMs(e.updatedAtEpochMs())
                .build();

        sseHub.broadcast(payload);
    }
}
