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
public class ChatUpdateResponse {
    private long messageId;
    private String content;
    private long updatedAt;
}
