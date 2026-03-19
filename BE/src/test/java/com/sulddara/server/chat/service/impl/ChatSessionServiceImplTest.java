package com.sulddara.server.chat.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.sulddara.server.chat.controller.response.ChatListResponse;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ChatSessionServiceImplTest {

    @Mock
    private ChatSessionRepository chatSessionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatSessionServiceImpl chatSessionService;

    private final Long userId = 1L;
    private final Long sessionId = 100L;

    // --- createChatSessions 테스트 ---

    @Test
    @DisplayName("채팅 세션 생성 성공")
    void createChatSessions_Success() {
        // given
        given(userRepository.findById(userId)).willReturn(Optional.of(mock(User.class)));

        // when
        chatSessionService.createChatSessions(userId);

        // then
        verify(chatSessionRepository, times(1)).save(any(ChatSessions.class));
    }

    @Test
    @DisplayName("채팅 세션 생성 실패 - 사용자를 찾을 수 없음")
    void createChatSessions_Fail_UserNotFound() {
        // given
        given(userRepository.findById(userId)).willReturn(Optional.empty());

        // when & then
        BaseException exception = assertThrows(BaseException.class,
                () -> chatSessionService.createChatSessions(userId));
        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    // --- deleteChatSessions 테스트 ---

    @Test
    @DisplayName("채팅 세션 삭제 성공 - Soft Delete(CLOSED) 확인")
    void deleteChatSessions_Success() {
        // given
        Long userId = 1L; // 현재 로그인한 유저 ID

        // 세션 생성 시 소유자 ID(userId)를 반드시 포함해야 함
        ChatSessions session = ChatSessions.builder()
                .userId(userId)
                .title("new_chat")
                .status("ACTIVE")
                .build();

        // Reflection을 이용해 세션 ID 주입
        ReflectionTestUtils.setField(session, "sessionId", 100L);

        given(userRepository.findById(userId)).willReturn(Optional.of(mock(User.class)));
        given(chatSessionRepository.findById(100L)).willReturn(Optional.of(session));

        // when
        chatSessionService.deleteChatSessions(userId, 100L);

        // then
        // 1. Hard Delete가 호출되지 않았는지 검증
        verify(chatSessionRepository, never()).delete(any(ChatSessions.class));

        // 2. 상태값이 CLOSED로 변경되었는지 검증 (Soft Delete)
        assertThat(session.getStatus()).isEqualTo("CLOSED");

        // 3. 종료 시간이 할당되었는지 검증
        assertThat(session.getClosedAt()).isNotNull();
    }

    @Test
    @DisplayName("채팅 세션 삭제 실패 - 권한 없음 (내 세션이 아님)")
    void deleteChatSessions_Fail_Forbidden() {
        // given
        Long otherUserId = 2L;
        ChatSessions session = ChatSessions.builder()
                .sessionId(sessionId)
                .userId(otherUserId) // 다른 유저의 세션
                .build();

        given(userRepository.findById(userId)).willReturn(Optional.of(mock(User.class)));
        given(chatSessionRepository.findById(sessionId)).willReturn(Optional.of(session));

        // when & then
        BaseException exception = assertThrows(BaseException.class,
                () -> chatSessionService.deleteChatSessions(userId, sessionId));
        assertEquals(ErrorCode.FORBIDDEN, exception.getErrorCode());
    }

    @Test
    @DisplayName("채팅 세션 삭제 실패 - 세션이 존재하지 않음")
    void deleteChatSessions_Fail_SessionNotFound() {
        // given
        given(userRepository.findById(userId)).willReturn(Optional.of(mock(User.class)));
        given(chatSessionRepository.findById(sessionId)).willReturn(Optional.empty());

        // when & then
        BaseException exception = assertThrows(BaseException.class,
                () -> chatSessionService.deleteChatSessions(userId, sessionId));
        assertEquals(ErrorCode.SESSION_NOT_FOUND, exception.getErrorCode());
    }

    // --- getChatSessions 테스트 (무한 스크롤) ---

    @Test
    @DisplayName("채팅 세션 리스트 조회 성공")
    void getChatSessions_Success() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        ChatSessions session = ChatSessions.builder()
                .sessionId(sessionId)
                .userId(userId)
                .title("test chat")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Slice<ChatSessions> slice = new SliceImpl<>(List.of(session), pageable, true);

        given(userRepository.findById(userId)).willReturn(Optional.of(mock(User.class)));
        given(chatSessionRepository.findSessionsByCursor(userId, null, pageable)).willReturn(slice);

        // when
        ChatListResponse response = chatSessionService.getChatSessions(userId, null, pageable);

        // then
        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals(sessionId, response.getNextCursor());
        assertTrue(response.isHasNext());
    }
}