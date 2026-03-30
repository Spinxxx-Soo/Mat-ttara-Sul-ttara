package com.sulddara.server.chat.ai.controller.request;

import lombok.Builder;

import java.util.List;

@Builder
public record AiPlaceCandidatesRequest (
        String threadId,
        long userId,
        SessionState sessionState
){
}
