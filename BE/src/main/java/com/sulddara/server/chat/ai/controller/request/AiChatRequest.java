package com.sulddara.server.chat.ai.controller.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder(toBuilder = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiChatRequest (
        long userId,
        String threadId,
        String message,
        SessionState sessionState,
        PreferenceSummary preferenceSummary,
        // 제목 생성 필요 여부
        Boolean needTitle
){
}
