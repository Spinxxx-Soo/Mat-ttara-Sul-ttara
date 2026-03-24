package com.sulddara.server.chat.event;

public record ChatMessageUpdatedEvent(
        long sessionId,
        long messageId,
        String content,
        long updatedAtEpochMs
) {}
