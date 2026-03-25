package com.sulddara.server.chat.service.impl;

import com.sulddara.server.chat.controller.response.ChatListDetailResponse;
import com.sulddara.server.chat.controller.response.ChatListResponse;
import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.domain.enums.StatusType;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.chat.service.ChatSessionService;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.user.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ChatSessionServiceImpl implements ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Long createChatSessions(Long userId) {
        var user = userRepository.findById(userId);
        if (user.isEmpty()){
            throw new BaseException(ErrorCode.USER_NOT_FOUND);
        }

        var chatSession = ChatSessions.builder()
                .userId(userId)
                .title("new chat")
                .status(StatusType.ACTIVE.toString())
                .sessionState("{}")
                .sessionSummary(null)
                .build();

        chatSessionRepository.save(chatSession);
        return chatSession.getSessionId();
    }

    @Override
    @Transactional
    public void deleteChatSessions(Long userId, Long sessionId) {
        var user = userRepository.findById(userId);
        if (user.isEmpty()){
            throw new BaseException(ErrorCode.USER_NOT_FOUND);
        }
        ChatSessions session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BaseException(ErrorCode.SESSION_NOT_FOUND));

        if(!Objects.equals(session.getUserId(), userId)){
            throw new BaseException(ErrorCode.FORBIDDEN);
        }
        session.closeSession();
    }

    @Override
    public ChatListResponse getChatSessions(Long userId, Long cursor, Pageable pageable) {
        var user = userRepository.findById(userId);
        if (user.isEmpty()){
            throw new BaseException(ErrorCode.USER_NOT_FOUND);
        }

        Slice<ChatSessions> slice = chatSessionRepository.findSessionsByCursor(userId, cursor, pageable);

        List<ChatListDetailResponse> responses = slice.getContent().stream()
                .map(ChatListDetailResponse::fromEntity).toList();
        Long nextCursor = responses.isEmpty() ? null : responses.getLast().getSessionId();
        return new ChatListResponse(responses, nextCursor, slice.hasNext());
    }

    @Override
    @Transactional
    public void validateSessionOwnership(Long userId, Long sessionId) {
        ChatSessions session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BaseException(ErrorCode.SESSION_NOT_FOUND));

        if (!session.getUserId().equals(userId)) {
            throw new BaseException(ErrorCode.FORBIDDEN);
        }
    }


}
