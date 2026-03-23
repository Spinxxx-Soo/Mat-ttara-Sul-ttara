package com.sulddara.server.sse.payload;

import com.sulddara.server.chat.ai.controller.request.SessionState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Builder
@Data
@AllArgsConstructor
public class AiResponsePayload implements ChatEventPayload{
    long sessionId;
    long messageId;
    long userId;
    String role;        // "ASSISTANT"
    String content;
    String type;        // "FOLLOW_UP", "RECOMMENDATION"
    SessionState parsedState;
    String title;
    long sentAtEpochMs;

    @Override
    public long getSessionId() {
        return sessionId;
    }

    @Override
    public String getEventName() {
        return "ai_response";
    }
}
