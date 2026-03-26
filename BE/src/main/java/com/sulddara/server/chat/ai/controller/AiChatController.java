package com.sulddara.server.chat.ai.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.ai.controller.request.MapLocationRequest;
import com.sulddara.server.chat.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiService aiService;

    @PostMapping("/sessions/{sessionId}/location")
    public ResponseEntity<Void> setMapLocation(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal CustomOAuth2User user,
            @RequestBody MapLocationRequest request
    ) {
        Long userId = user.getUserId();
        aiService.processMapLocation(sessionId, userId, request.lat(), request.lng());
        return ResponseEntity.ok().build();
    }
}
