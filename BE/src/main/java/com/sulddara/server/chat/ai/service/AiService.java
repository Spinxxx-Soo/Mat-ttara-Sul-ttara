package com.sulddara.server.chat.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.request.AiChatRequest;
import com.sulddara.server.chat.ai.controller.request.AiPlaceCandidatesRequest;
import com.sulddara.server.chat.ai.controller.request.PreferenceSummary;
import com.sulddara.server.chat.ai.controller.request.SessionState;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.domain.ChatMessages;
import com.sulddara.server.chat.domain.ChatSessions;
import com.sulddara.server.chat.domain.enums.RoleType;
import com.sulddara.server.chat.repository.ChatMessagesRepository;
import com.sulddara.server.chat.repository.ChatSessionRepository;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.chat.event.AiChatMessageCreatedEvent;
import com.sulddara.server.user.repository.UserPreferenceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiService {

    private final WebClient webClient;
    private final ApplicationEventPublisher publisher;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessagesRepository chatMessagesRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PlaceRepository placeRepository;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public void sendChat(long sessionId, long userId, String content, boolean isNew){
        boolean isSync = isNew || redisTemplate.hasKey("ai:flag:" + sessionId);
        var aiChatRequest = createRequest(userId, sessionId, content, isSync, isNew);

        webClient.post()
                .uri("/api/v1/ai/chat/message")
                .bodyValue(aiChatRequest)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(10))
                .doOnError(e -> log.error("AI 서버 통신 치명적 실패: session={}", sessionId, e))
                .subscribe();

    }

    public AiChatRequest createRequest(long userId, long sessionId, String content, boolean isSync, boolean isNew){
        AiChatRequest aiChatRequest = AiChatRequest.builder()
                .userId(userId)
                .threadId("chat-" + sessionId)
                .message(content)
                .needTitle(isNew)
                .build();

        if (isSync){
            aiChatRequest = aiChatRequest.toBuilder()
                    .sessionState(getSessionState(sessionId))
                    .preferenceSummary(getPreferenceSummary(userId))
                    .build();
        }

        return aiChatRequest;
    }

    @Transactional
    public long saveMessage(long sessionId, long userId, String role, String content){
        var message = ChatMessages.builder()
                .sessionId(sessionId)
                .userId(userId)
                .role(role)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        return chatMessagesRepository.save(message).getMessageId();
    }

    @Transactional
    public void handleResponse(long sessionId, long userId, AiChatResponse response){
        // AI가 분석한 최신 파싱 정보(ParsedState)를 Redis에 백업 (ObjectMapper 사용)
        // 장기 보관을 위해 세션 DB 업데이트 (일정 시간 지나면)
        // AI 메모리 상태(memoryStatus)에 따라 Redis 동기화 플래그 관리
        // SSE 방송을 위한 이벤트 발행

        if (response == null) {
            return;
        }
        try {
            if ("PLACE_CANDIDATES".equals(response.getType())) {
                List<Long> candidateIds = placeRepository.findIdsByLocation(
                        response.getParsedState().lat(),
                        response.getParsedState().lng()
                );
                SessionState updatedState = response.getParsedState().withSelectedPlaceIds(candidateIds);
                sendCandidatesToAi(sessionId, userId, updatedState);
                return;
            }
            if ("RECOMMENDATION".equals(response.getType()) && response.getPlaces() != null) {
                String redisKey = "recommend:user:" + userId;
                String placesJson = objectMapper.writeValueAsString(response.getPlaces());
                redisTemplate.opsForValue().set(redisKey, placesJson, Duration.ofMinutes(30));
            }

            long messageId = saveMessage(sessionId, userId, RoleType.ASSISTANT.toString(), response.getChatResponse()); // ai 답변 저장

            chatSessionRepository.findById(sessionId).ifPresent(session -> {
                session.touch();

                if (response.getTitle() != null && !response.getTitle().isBlank()) {
                    session.updateTitle(response.getTitle());
                }
                if (response.getParsedState() != null){
                    try {
                        String parsedJson = objectMapper.writeValueAsString(response.getParsedState());
                        session.updateState(parsedJson);
                        redisTemplate.opsForValue().set("ai:sync:" + sessionId, parsedJson, Duration.ofHours(24));
                    } catch (JsonProcessingException e) {
                        throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
                    }
                }
            });

            if("MISSING".equals(response.getMemoryStatus())){
                redisTemplate.opsForValue().set("ai:flag:" + sessionId, "true", Duration.ofHours(1));
            }else{
                redisTemplate.delete("ai:flag:" + sessionId);
            }

            publisher.publishEvent(new AiChatMessageCreatedEvent(
                    sessionId,
                    messageId,
                    userId,
                    RoleType.ASSISTANT.toString(),
                    response.getChatResponse(),
                    response.getType(),
                    response.getParsedState(),
                    response.getTitle(),
                    Instant.now().toEpochMilli()
            ));
        } catch (Exception e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

    }

    public SessionState getSessionState(long sessionId){
        String sessionState = redisTemplate.opsForValue().get("ai:sync:" + sessionId);
        if (sessionState == null){
            sessionState = chatSessionRepository.findSessionStateById(sessionId);
            if (sessionState != null) {
                redisTemplate.opsForValue().set("ai:sync:" + sessionId, sessionState, Duration.ofHours(24));
            }
        }

        if (sessionState == null || sessionState.isBlank()) return null;

        try {
            return objectMapper.readValue(sessionState, SessionState.class);
        } catch (Exception e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    public PreferenceSummary getPreferenceSummary(long userId){
        var userPreference = userPreferenceRepository.findById(userId).orElse(null);
        if (userPreference == null){
            throw new BaseException(ErrorCode.USER_NOT_FOUND);
        }
        return new PreferenceSummary(
                userPreference.getUsageType(),
                userPreference.getAgeGroup(),
                userPreference.getGender());
    }

    public void sendCandidatesToAi(long sessionId, long userId, SessionState updatedState) {
        var internalRequest = AiPlaceCandidatesRequest.builder()
                .threadId("chat-" + sessionId)
                .userId(userId)
                .sessionState(updatedState)
                .build();

        webClient.post()
                .uri("/api/v1/internal/ai/place_candidates")
                .bodyValue(internalRequest)
                .retrieve()
                .bodyToMono(Void.class)
                .subscribe(v -> log.info("AI 서버로 후보지 리스트 전송 완료"));
    }
}
