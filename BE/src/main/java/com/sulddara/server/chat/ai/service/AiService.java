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
import reactor.core.publisher.Mono;

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
        boolean isSync = isNew || Boolean.TRUE.equals(redisTemplate.hasKey("ai:flag:" + sessionId));
        final AiChatRequest aiChatRequest;
        try {
            aiChatRequest = createRequest(userId, sessionId, content, isSync, isNew);
        } catch (Exception e) {
            log.error("[ai] 요청 본문 생성 실패 sessionId={} userId={}", sessionId, userId, e);
            return;
        }

        webClient.post()
                .uri("/api/v1/ai/chat/message")
                .bodyValue(aiChatRequest)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(10))
                .retryWhen(reactor.util.retry.Retry.fixedDelay(2, Duration.ofSeconds(2)))
                .onErrorResume(e -> {
                    log.error("AI 서버 통신 최종 실패 (session: {}): {}", sessionId, e.getMessage());
                    handleAiFailure(sessionId, userId);
                    return Mono.empty();
                })
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
            log.warn("[ai] handleResponse: response 가 null sessionId={}", sessionId);
            return;
        }
        try {
            if ("PLACE_CANDIDATES".equals(response.getType())) {
                SessionState parsed = response.getParsedState();
                if (parsed == null || parsed.lat() == null || parsed.lng() == null) {
                    log.error("[ai] PLACE_CANDIDATES 인데 parsedState/lat/lng 누락 sessionId={} threadId={}",
                            sessionId, response.getThreadId());
                    return;
                }
                log.info("[ai] PLACE_CANDIDATES 수신 sessionId={} lat={} lng={}",
                        sessionId, parsed.lat(), parsed.lng());
                List<Long> candidateIds = placeRepository.findIdsByLocation(
                        parsed.lat(),
                        parsed.lng()
                );
                log.info("[ai] PLACE_CANDIDATES 후보지 조회 완료 sessionId={} count={} candidateIds={}",
                        sessionId, candidateIds.size(), candidateIds);
                SessionState updatedState = parsed.withFinalPlaceIds(candidateIds);
                sendCandidatesToAi(sessionId, userId, updatedState);
                return;
            }
            String assistantText = response.getChatResponse();
            if (assistantText == null) {
                log.warn("[ai] chatResponse 가 null — 빈 문자열로 저장 sessionId={}", sessionId);
                assistantText = "";
            }
            if ("RECOMMENDATION".equals(response.getType()) && response.getPlaces() != null) {
                String redisKey = "recommend:session:" + sessionId + ":user:" + userId;
                String placesJson = objectMapper.writeValueAsString(response.getPlaces());
                redisTemplate.opsForValue().set(redisKey, placesJson, Duration.ofMinutes(10));
                log.info("[ai] RECOMMENDATION 캐시 저장 sessionId={} userId={} count={}",
                        sessionId, userId, response.getPlaces().size());
                assistantText = assistantText + "||" + placesJson;
                log.info("[ai] RECOMMENDATION 데이터 결합 완료: sessionId={}", sessionId);
            }

            long messageId = saveMessage(sessionId, userId, RoleType.ASSISTANT.toString(), assistantText);

            chatSessionRepository.findById(sessionId).ifPresent(session -> {
                session.touch();

                if (response.getTitle() != null && !response.getTitle().isBlank()) {
                    session.updateTitle(response.getTitle());
                }
                if (response.getParsedState() != null) {
                    try {
                        String parsedJson = objectMapper.writeValueAsString(response.getParsedState());
                        session.updateState(parsedJson);
                        redisTemplate.opsForValue().set("ai:sync:" + sessionId, parsedJson, Duration.ofHours(24));
                    } catch (JsonProcessingException e) {
                        log.error("[ai] parsedState JSON 직렬화 실패 sessionId={}", sessionId, e);
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
                    assistantText,
                    response.getType(),
                    response.getParsedState(),
                    response.getTitle(),
                    Instant.now().toEpochMilli()
            ));
            log.info("[ai] AI SSE 이벤트 발행 sessionId={} messageId={} type={}",
                    sessionId, messageId, response.getType());
        } catch (Exception e) {
            log.error("[ai] handleResponse 처리 중 예외 sessionId={} userId={} type={}",
                    sessionId, userId, response.getType(), e);
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
        return userPreferenceRepository.findByUserIdWithUser(userId)
                .map(up -> new PreferenceSummary(up.getUsageType(), up.getAgeGroup(), up.getGender()))
                .orElseThrow(() -> new BaseException(ErrorCode.USER_NOT_FOUND));
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
                .timeout(Duration.ofSeconds(120))
                .doOnSuccess(v -> log.info("[ai] 후보지 리스트 전송 완료 sessionId={}", sessionId))
                .doOnError(e -> log.error("[ai] 후보지 리스트 전송 실패 sessionId={}", sessionId, e))
                .subscribe(
                        v -> {},
                        e -> log.error("[ai] place_candidates subscribe 에러 sessionId={}", sessionId, e)
                );
    }

    public void processMapLocation(Long sessionId, Long userId, Double lat, Double lng) {
        ChatSessions session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BaseException(ErrorCode.SESSION_NOT_FOUND));

        if (!session.getUserId().equals(userId)) {
            throw new BaseException(ErrorCode.FORBIDDEN);
        }

        SessionState currentSessionState = getSessionState(sessionId);
        if (currentSessionState == null){
            currentSessionState = new SessionState(lat, lng, null, null, null, null, null);
        }
        SessionState sessionState = new SessionState(lat, lng, currentSessionState.time(), currentSessionState.title(),
                currentSessionState.meetingDate(), currentSessionState.finalPlaceIds(), currentSessionState.extraData());
        try {
            String parsedJson = objectMapper.writeValueAsString(sessionState);
            redisTemplate.opsForValue().set("ai:sync:" + sessionId, parsedJson, Duration.ofHours(24));
            chatSessionRepository.updateSessionState(sessionId, parsedJson);
            redisTemplate.opsForValue().set("ai:flag:" + sessionId, "true", Duration.ofMinutes(5));
            sendChat(sessionId, userId, "지정한 위치 주변 맛집을 찾아줘", false);
        } catch (JsonProcessingException e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private void handleAiFailure(long sessionId, long userId) {
        String fallbackMsg = "죄송합니다. 현재 AI 상담원이 일시적인 점검 중입니다. 잠시 후 다시 말을 걸어주세요!";
        long messageId = saveMessage(sessionId, userId, RoleType.ASSISTANT.toString(), fallbackMsg);

        publisher.publishEvent(new AiChatMessageCreatedEvent(
                sessionId,
                messageId,
                userId,
                RoleType.ASSISTANT.toString(),
                fallbackMsg,
                "ERROR",
                null,
                null,
                Instant.now().toEpochMilli()
        ));
    }
}
