package com.sulddara.server.chat.controller.response;

import com.sulddara.server.chat.domain.ChatSessions;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatListDetailResponse {
    private Long sessionId;
    private String title;
    private long createdAt;
    private long lastMessageAt;

    public static ChatListDetailResponse fromEntity(ChatSessions session) {
        return ChatListDetailResponse.builder()
                .sessionId(session.getSessionId())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .lastMessageAt(session.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .build();
    }
}
