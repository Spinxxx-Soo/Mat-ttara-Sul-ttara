package com.sulddara.server.chat.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import com.sulddara.server.chat.controller.response.ChatResponse;
import com.sulddara.server.chat.controller.response.ChatUpdateResponse;
import com.sulddara.server.chat.controller.response.MessageResponse;
import com.sulddara.server.chat.domain.ChatMessages;
import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.domain.enums.RoleType;
import com.sulddara.server.chat.repository.ChatMessagesRepository;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.share.event.ChatMessageCreatedEvent;
import com.sulddara.server.share.event.ChatMessageUpdatedEvent;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

    @InjectMocks
    private ChatServiceImpl chatService;

    @Mock
    private ApplicationEventPublisher publisher;
    @Mock
    private ChatMessagesRepository chatMessageRepository;
    @Mock
    private ChatSessionRepository chatSessionRepository;

    private final long SESSION_ID = 1L;
    private final long USER_ID = 10L;
    private final long MESSAGE_ID = 100L;

    @Nested
    @DisplayName("메시지 전송 테스트")
    class SendMessageTest {

        @Test
        @DisplayName("성공: 첫 번째 메시지 전송 시 이벤트를 발행하고 저장한다")
        void sendMessage_Success_FirstMessage() {
            // given
            String content = "안녕하세요 AI님";
            when(chatMessageRepository.existsBySessionId(SESSION_ID)).thenReturn(false);

            // save든 saveAndFlush든 대응할 수 있도록 설정
            when(chatMessageRepository.saveAndFlush(any(ChatMessages.class)))
                    .thenAnswer(invocation -> {
                        ChatMessages arg = invocation.getArgument(0);
                        // 리플렉션이나 빌더를 통해 ID가 채워진 새 객체 반환
                        return ChatMessages.builder()
                                .messageId(MESSAGE_ID) // Mock ID 주입
                                .sessionId(arg.getSessionId())
                                .userId(arg.getUserId())
                                .role(arg.getRole())
                                .content(arg.getContent())
                                .build();
                    });

            // when
            ChatResponse result = chatService.sendMessage(SESSION_ID, USER_ID, content);

            // then
            assertThat(result.getContent()).isEqualTo(content);
            verify(chatMessageRepository, times(1)).saveAndFlush(any());
            verify(publisher, times(1)).publishEvent(any(ChatMessageCreatedEvent.class));
        }

        @Test
        @DisplayName("실패: 내용이 비어있으면 예외가 발생한다")
        void sendMessage_Fail_EmptyContent() {
            // when & then
            assertThatThrownBy(() -> chatService.sendMessage(SESSION_ID, USER_ID, ""))
                    .isInstanceOf(BaseException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    @Nested
    @DisplayName("메시지 조회 테스트")
    class GetMessagesTest {

        @Test
        @DisplayName("성공: 본인의 세션 메시지 기록을 조회한다")
        void getMessages_Success() {
            // given
            Pageable pageable = PageRequest.of(0, 10);
            ChatSessions session = ChatSessions.builder().sessionId(SESSION_ID).userId(USER_ID).build();
            ChatMessages message = ChatMessages.builder().messageId(MESSAGE_ID).content("hi").role(RoleType.USER.toString()).build();

            when(chatSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
            when(chatMessageRepository.findMessagesByCursor(SESSION_ID, null, pageable))
                    .thenReturn(new SliceImpl<>(List.of(message)));

            // when
            MessageResponse result = chatService.getMessages(USER_ID, SESSION_ID, null, pageable);

            // then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getNextCursor()).isEqualTo(MESSAGE_ID);
        }

        @Test
        @DisplayName("실패: 다른 사용자의 세션을 조회하려 하면 Forbidden 예외가 발생한다")
        void getMessages_Fail_Forbidden() {
            // given
            ChatSessions otherSession = ChatSessions.builder().sessionId(SESSION_ID).userId(999L).build();
            when(chatSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(otherSession));

            // when & then
            assertThatThrownBy(() -> chatService.getMessages(USER_ID, SESSION_ID, null, PageRequest.of(0, 10)))
                    .isInstanceOf(BaseException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }

    @Nested
    @DisplayName("메시지 수정 테스트")
    class UpdateMessageTest {

        @Test
        @DisplayName("성공: 본인이 작성한 메시지를 수정하고 이벤트를 발행한다")
        void updateMessages_Success() {
            // given
            String newContent = "수정된 내용";
            ChatMessages message = ChatMessages.builder()
                    .messageId(MESSAGE_ID).sessionId(SESSION_ID).userId(USER_ID).content("원본").build();

            when(chatMessageRepository.findByMessageIdAndUserId(MESSAGE_ID, USER_ID))
                    .thenReturn(Optional.of(message));

            // when
            ChatUpdateResponse result = chatService.updateMessages(USER_ID, MESSAGE_ID, newContent);

            // then
            assertThat(result.getContent()).isEqualTo(newContent);
            verify(publisher, times(1)).publishEvent(any(ChatMessageUpdatedEvent.class));
        }

        @Test
        @DisplayName("실패: 존재하지 않거나 권한이 없는 메시지 수정 시 Forbidden 예외가 발생한다")
        void updateMessages_Fail_NotFound() {
            // given
            when(chatMessageRepository.findByMessageIdAndUserId(MESSAGE_ID, USER_ID))
                    .thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> chatService.updateMessages(USER_ID, MESSAGE_ID, "change"))
                    .isInstanceOf(BaseException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }
}