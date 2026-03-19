package com.sulddara.server.sse.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
@AllArgsConstructor
public class ChatUpdatePayload implements ChatEventPayload{
    long sessionId;
    long messageId;
    String content;
    long updatedAtEpochMs;

    @Override
    public long getSessionId() {
        return sessionId;
    }

    @Override
    public String getEventName() {
        return "chat_update";
    }
}
