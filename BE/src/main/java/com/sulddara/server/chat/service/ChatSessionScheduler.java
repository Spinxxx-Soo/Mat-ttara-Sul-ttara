package com.sulddara.server.chat.service;

import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.domain.enums.StatusType;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ChatSessionScheduler {

    private final ChatSessionRepository chatSessionRepository;
    private final RedisTemplate<String, String> redisTemplate;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void closeInactiveSessions() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);

        List<ChatSessions> inactiveSessions =
                chatSessionRepository.findAllByStatusAndUpdatedAtBefore(StatusType.ACTIVE.toString(), threshold);

        for (ChatSessions session : inactiveSessions) {

            session.closeSession();

            redisTemplate.delete("ai:sync:" + session.getSessionId());
            redisTemplate.delete("ai:flag:" + session.getSessionId());
        }
    }
}
