package com.sulddara.server.chat.repository;

import com.sulddara.server.chat.domain.ChatMessages;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatMessagesRepository extends JpaRepository<ChatMessages,Long> {
    @Query("SELECT m FROM ChatMessages m WHERE m.sessionId = :sessionId " +
            "AND (:cursor IS NULL OR m.messageId < :cursor) " +
            "ORDER BY m.messageId DESC")
    Slice<ChatMessages> findMessagesByCursor(@Param("sessionId") Long sessionId,
                                             @Param("cursor") Long cursor,
                                             Pageable pageable);

    Optional<ChatMessages> findByMessageIdAndUserId(Long messageId, Long userId);

    boolean existsBySessionId(long sessionId);
}
