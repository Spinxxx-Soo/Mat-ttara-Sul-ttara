package com.sulddara.server.chat.service;

import com.sulddara.server.chat.controller.response.ChatUpdateResponse;
import com.sulddara.server.chat.controller.response.MessageResponse;
import com.sulddara.server.chat.controller.response.ChatResponse;
import org.springframework.data.domain.Pageable;

public interface ChatService {
    ChatResponse sendMessage(long sessionId, Long userId, String content);

    MessageResponse getMessages(Long userId, long sessionId, Long cursor, Pageable pageable);

    ChatUpdateResponse updateMessages(Long userId, long messageId, String content);
}
