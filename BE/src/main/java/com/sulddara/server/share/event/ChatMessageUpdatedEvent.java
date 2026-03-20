package com.sulddara.server.share.event;

public record ChatMessageUpdatedEvent(
        long sessionId,
        long messageId,
        String content,
        long updatedAtEpochMs
) {}
