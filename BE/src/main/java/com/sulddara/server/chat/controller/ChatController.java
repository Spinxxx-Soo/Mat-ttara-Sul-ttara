package com.sulddara.server.chat.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.controller.request.ChatRequest;
import com.sulddara.server.chat.controller.request.UpdateMessageRequest;
import com.sulddara.server.chat.controller.response.MessageResponse;
import com.sulddara.server.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/messages")
    public ResponseEntity<?> sendMessages(@AuthenticationPrincipal CustomOAuth2User user,
                                          @RequestBody ChatRequest request){
        Long userId = user.getUserId();
        var response = chatService.sendMessage(request.sessionId(), userId, request.content());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/messages")
    public ResponseEntity<?> getMessages(@AuthenticationPrincipal CustomOAuth2User user,
                                         @RequestParam String sessionId,
                                         @PageableDefault(size = 20) Pageable pageable){
        Long userId = user.getUserId();
        long sId = Long.parseLong(sessionId);
        var response = chatService.getMessages(userId, sId, pageable);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/messages/{messageId}")
    public ResponseEntity<?> updateMessages(@AuthenticationPrincipal CustomOAuth2User user,
                                            @PathVariable long messageId,
                                            @RequestBody UpdateMessageRequest req){
        Long userId = user.getUserId();
        var response = chatService.updateMessages(userId, messageId, req.content());
        return ResponseEntity.ok(response);
    }
}
