package com.sulddara.server.chat.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.ai.service.AiService;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSubscribeListener {

    private final ObjectMapper objectMapper;
    private final AiService aiService;

    public void onMessage(String message) {
        try {
            AiChatResponse response = objectMapper.readValue(message, AiChatResponse.class);

            String threadId = response.getThreadId();

            if (threadId == null || !threadId.contains("-")) {
                log.error("잘못된 threadId 형식입니다. threadId={}", threadId);
                return;
            }

            long sessionId = Long.parseLong(threadId.split("-")[1]);

            aiService.handleResponse(sessionId, response.getUserId(), response);

        } catch (Exception e) {
            log.error("Redis ai:reply 처리 실패 (역직렬화·handleResponse·이벤트 체인). raw={}", message, e);
        }
    }
}
