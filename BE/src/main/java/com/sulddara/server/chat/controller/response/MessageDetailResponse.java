package com.sulddara.server.chat.controller.response;

import com.sulddara.server.chat.domain.ChatMessages;
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
public class MessageDetailResponse {
    private long messageId;
    private String sessionId;
    private String role;
    private String content;
    private long createdAt;

    public static MessageDetailResponse fromEntity(ChatMessages messages) {
        return MessageDetailResponse.builder()
                .messageId(messages.getMessageId())
                .role(messages.getRole())
                .content(messages.getContent())
                .createdAt(messages.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .build();
    }
}
