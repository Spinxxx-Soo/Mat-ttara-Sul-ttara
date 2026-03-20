package com.sulddara.server.share.event;

public record ChatMessageCreatedEvent(
        long sessionId,
        long messageId,
        long userId,
        String role,        // "USER", "ASSISTANT"
        String content,
        boolean isFirst, // 추가: 첫 메시지 여부 플래그
        long sentAtEpochMs
) {}
