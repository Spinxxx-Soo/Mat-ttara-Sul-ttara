package com.sulddara.server.chat.service;

import com.sulddara.server.chat.controller.response.ChatListResponse;
import org.springframework.data.domain.Pageable;

public interface ChatSessionService {

    Long createChatSessions(Long userId);

    void deleteChatSessions(Long userId, Long sessionId);

    ChatListResponse getChatSessions(Long userId, Long cursor, Pageable pageable);

    void validateSessionOwnership(Long userId, Long sessionId);
}
