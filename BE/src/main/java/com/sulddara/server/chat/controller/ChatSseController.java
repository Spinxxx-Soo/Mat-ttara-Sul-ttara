package com.sulddara.server.chat.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.service.ChatSessionService;
import com.sulddara.server.sse.SseHub;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatSseController {

    private final SseHub sseHub;
    private final ChatSessionService chatSessionService;

    @GetMapping("/{sessionId}/stream")
    public SseEmitter stream(@AuthenticationPrincipal CustomOAuth2User user,
                             @PathVariable Long sessionId){
        long userId = user.getUserId();

        chatSessionService.validateSessionOwnership(userId, sessionId);

        String connectionId = UUID.randomUUID().toString();
        String clientKey = userId + ":" + connectionId;

        return sseHub.subscribe(sessionId, clientKey);
    }
}
