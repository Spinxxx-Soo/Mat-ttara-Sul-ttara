package com.sulddara.server.chat.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatResponse {
    private long sessionId;
    private long messageId;
    private long userId;
    private String role;
    private String content;
    private long createdAt;
}
