package com.sulddara.server.chat.repository;

import com.sulddara.server.chat.domain.ChatSessions;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatSessionRepository extends JpaRepository<ChatSessions, Long> {
    @Query("SELECT s FROM ChatSessions s WHERE s.userId = :userId " +
            "AND s.status = 'ACTIVE' " +
            "AND s.title != 'new chat' " +
            "AND (:cursor IS NULL OR s.sessionId < :cursor) " +
            "ORDER BY s.sessionId DESC")
    Slice<ChatSessions> findSessionsByCursor(@Param("userId") Long userId,
                                             @Param("cursor") Long cursor,
                                             Pageable pageable);

    @Query("SELECT s.sessionState FROM ChatSessions s WHERE s.sessionId = :sessionId")
    String findSessionStateById(@Param("sessionId") long sessionId);

    List<ChatSessions> findAllByStatusAndUpdatedAtBefore(String status, LocalDateTime threshold);
}
