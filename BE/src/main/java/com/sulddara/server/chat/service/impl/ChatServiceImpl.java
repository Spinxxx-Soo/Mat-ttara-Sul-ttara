package com.sulddara.server.chat.service.impl;

import com.sulddara.server.chat.controller.response.ChatUpdateResponse;
import com.sulddara.server.chat.controller.response.MessageDetailResponse;
import com.sulddara.server.chat.controller.response.MessageResponse;
import com.sulddara.server.chat.controller.response.ChatResponse;
import com.sulddara.server.chat.domain.ChatMessages;
import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.domain.enums.RoleType;
import com.sulddara.server.chat.repository.ChatMessagesRepository;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.chat.service.ChatService;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.share.event.ChatMessageCreatedEvent;
import com.sulddara.server.share.event.ChatMessageUpdatedEvent;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private final ApplicationEventPublisher publisher;
    private final ChatMessagesRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;

    @Override
    public ChatResponse sendMessage(long sessionId, Long userId, String content) {
        if (content == null || content.isBlank()) {
            throw new BaseException(ErrorCode.INVALID_INPUT_VALUE);
        }

        boolean isFirst = !chatMessageRepository.existsBySessionId(sessionId);

        ChatMessages chatMessages = ChatMessages.builder()
                .sessionId(sessionId)
                .userId(userId)
                .role(RoleType.USER.toString())
                .content(content)
                .build();

        ChatMessages savedMessage = chatMessageRepository.saveAndFlush(chatMessages);

        publisher.publishEvent(new ChatMessageCreatedEvent(
                sessionId,
                savedMessage.getMessageId(),
                userId,
                RoleType.USER.toString(),
                content,
                isFirst,
                Instant.now().toEpochMilli()
        ));

        return new ChatResponse(sessionId, savedMessage.getMessageId(),
                userId, RoleType.USER.toString(),
                content, Instant.now().toEpochMilli());
    }

    @Override
    public MessageResponse getMessages(Long userId, long sessionId, Long cursor, Pageable pageable) {
        ChatSessions session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BaseException(ErrorCode.SESSION_NOT_FOUND));

        if (!session.getUserId().equals(userId)) {
            throw new BaseException(ErrorCode.FORBIDDEN);
        }

        Slice<ChatMessages> slice = chatMessageRepository.findMessagesByCursor(sessionId, cursor, pageable);

        List<MessageDetailResponse> responses = slice.getContent().stream()
                .map(MessageDetailResponse::fromEntity).toList();
        Long nextCursor = responses.isEmpty() ? null : responses.getLast().getMessageId();
        return new MessageResponse(responses, nextCursor, slice.hasNext());
    }

    @Override
    public ChatUpdateResponse updateMessages(Long userId, long messageId, String content){
        ChatMessages message = chatMessageRepository.findByMessageIdAndUserId(messageId, userId)
                .orElseThrow(() -> new BaseException(ErrorCode.FORBIDDEN));

        message.setContent(content);
        chatMessageRepository.save(message);

        publisher.publishEvent(new ChatMessageUpdatedEvent(
                message.getSessionId(),
                messageId,
                content,
                Instant.now().toEpochMilli()
        ));

        return new ChatUpdateResponse(messageId, content, Instant.now().toEpochMilli());
    }
}
