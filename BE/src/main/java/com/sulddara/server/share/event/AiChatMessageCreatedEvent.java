package com.sulddara.server.share.event;

import com.sulddara.server.chat.ai.controller.request.SessionState;
import com.sulddara.server.sse.payload.AiResponsePayload;

import java.util.List;

public record AiChatMessageCreatedEvent(
        long sessionId,
        long messageId,
        long userId,
        String role,     // "ASSISTANT"
        String content,
        String type,        // "FOLLOW_UP", "RECOMMENDATION"
        SessionState parsedState,
        String title,
        long sentAtEpochMs
) {}
