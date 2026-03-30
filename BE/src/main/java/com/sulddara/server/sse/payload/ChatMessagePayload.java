package com.sulddara.server.sse.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
@AllArgsConstructor
public class ChatMessagePayload implements ChatEventPayload{
    long sessionId;
    long messageId;
    long userId;
    String role;        // "USER", "ASSISTANT"
    String content;
    long sentAtEpochMs;

    @Override
    public long getSessionId() {
        return sessionId;
    }

    @Override
    public String getEventName() {
        return "chat_message";
    }
}
