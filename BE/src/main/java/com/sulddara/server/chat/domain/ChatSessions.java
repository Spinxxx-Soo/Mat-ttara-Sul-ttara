package com.sulddara.server.chat.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_sessions", indexes = {
        @Index(name = "idx_session_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_session_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ChatSessions {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sessionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column
    private String title;

    @Column(nullable = false, length = 20)
    private String status; // ACTIVE, CLOSED

    @Column(columnDefinition = "JSON")
    private String sessionState; // 슬롯 상태 (lat, lng, people 등)

    @Column(columnDefinition = "TEXT")
    private String sessionSummary;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime closedAt;

    // 비즈니스 메서드
    public void updateState(String sessionState) {
        this.sessionState = sessionState;
    }

    public void closeSession() {
        this.status = "CLOSED";
        this.closedAt = LocalDateTime.now();
    }

    public void updateTitle(String title) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
    }

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
