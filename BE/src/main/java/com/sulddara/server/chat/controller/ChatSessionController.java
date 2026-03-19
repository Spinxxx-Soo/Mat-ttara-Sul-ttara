package com.sulddara.server.chat.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.controller.response.ChatSessionResponse;
import com.sulddara.server.chat.service.ChatSessionService;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatSessionController {

    private final ChatSessionService chatSessionService;

    @PostMapping("/sessions")
    public ResponseEntity<?> createChatSessions(@AuthenticationPrincipal CustomOAuth2User user){
        Long userId = user.getUserId();
        Long sessionId = chatSessionService.createChatSessions(userId);
        if (sessionId == null){
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        var response = new ChatSessionResponse(sessionId, Instant.now().toEpochMilli());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<?> deleteChatSessions(@AuthenticationPrincipal CustomOAuth2User user,
                                                @PathVariable Long sessionId){
        Long userId = user.getUserId();
        chatSessionService.deleteChatSessions(userId, sessionId);
        return ResponseEntity.ok(Collections.singletonMap("ok", true));
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> getChatSessions(@AuthenticationPrincipal CustomOAuth2User user,
                                             @RequestParam(required = false) Long cursor,
                                             @PageableDefault() Pageable pageable){
        Long userId = user.getUserId();
        var response = chatSessionService.getChatSessions(userId, cursor, pageable);
        return ResponseEntity.ok(response);
    }
}
