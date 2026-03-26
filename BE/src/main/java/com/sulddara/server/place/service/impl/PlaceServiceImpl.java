package com.sulddara.server.place.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.request.AiPlaceCandidatesRequest;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.place.controller.request.AiEnrichRequest;
import com.sulddara.server.place.controller.response.AiEnrichResponse;
import com.sulddara.server.place.document.PlaceDocument;
import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.dto.KakaoLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.place.service.PlaceService;
import com.sulddara.server.s3.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceServiceImpl implements PlaceService {

    private static final String PROVIDER_KAKAO = "KAKAO";
    private static final int KAKAO_DISPLAY_MAX = 5;

    private final ExternalPlaceSearchService externalPlaceSearchService;
    private final PlaceRepository placeRepository;
    private final PlaceSearchRepository placeSearchRepository;
    private final PlaceIndexingService placeIndexingService;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;
    private final WebClient webClient;
    private final S3Service s3Service;

    @Override
    @Transactional(readOnly = true)
    public PlaceSearchResponseDto searchPlaces(String keyword, Double lat, Double lng, int page, int size, String sort) {

        // Fail-Fast: 검색어 없이 호출된 경우 빈 결과를 즉시 반환
        if (keyword == null || keyword.isBlank()) {
            return emptyResult(page, size);
        }

        // 1. Elasticsearch 우선 조회 (Pageable 적용)
        Page<PlaceDocument> esPage = searchFromElasticsearch(keyword, page, size);

        List<PlaceSearchResponseDto.PlaceItemDto> items;
        int totalElements;

        if (esPage != null && esPage.hasContent()) {
            // ES 캐시 히트: ES 문서에서 DTO로 변환
            log.debug("ES cache hit for keyword: '{}', results: {}", keyword, esPage.getTotalElements());
            items = esPage.getContent().stream()
                    .map(this::toPlaceItemDto)
                    .toList();
            totalElements = (int) esPage.getTotalElements();
        } else {
            // ES 캐시 미스: 카카오 API 호출 후 ES에 비동기 적재
            log.debug("ES cache miss for keyword: '{}', falling back to Kakao API", keyword);
            int displaySize = Math.min(size, KAKAO_DISPLAY_MAX);
            
            // ⚠️ Fix: 카카오 API page 오프셋 (1-based, size는 요청한대로)
            KakaoLocalSearchResponseDto kakaoResponse = externalPlaceSearchService.searchPlaces(keyword, displaySize, page, "accuracy");

            items = kakaoResponse.getDocuments().stream().map(doc -> {
                String cleanTitle = stripHtmlTags(doc.getPlace_name());
                String externalId = doc.getId();

                Optional<PlaceEntity> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId(PROVIDER_KAKAO, externalId);
                Long placeId = localPlaceOpt.map(PlaceEntity::getId).orElse(null);
                Boolean isOpen = localPlaceOpt.map(PlaceEntity::getIsOpen).orElse(true);

                // 카카오 위경도는 WGS84 문자열로 제공되므로 직접 파싱
                Double itemLat = parseDoubleSafely(doc.getY());
                Double itemLng = parseDoubleSafely(doc.getX());

                // ES에 비동기 적재 (별도 빈을 통해 프록시 경유 → @Async 정상 동작)
                placeIndexingService.indexToElasticsearchAsync(externalId, cleanTitle, resolveAddress(doc),
                        doc.getCategory_name(), itemLat, itemLng, doc.getPhone());

                // TODO: 리뷰 테이블 조인을 통해 계산 (현재 기본값)
                Double averageRating = 0.0;
                Integer reviewCount = 0;

                return PlaceSearchResponseDto.PlaceItemDto.builder()
                        .placeId(placeId)
                        .name(cleanTitle)
                        .address(resolveAddress(doc))
                        .category(doc.getCategory_name())
                        .lat(itemLat)
                        .lng(itemLng)
                        .distance(lat != null && lng != null ? calculateDistance(lat, lng, itemLat, itemLng) : null)
                        .phone(doc.getPhone())
                        .rating(averageRating)
                        .reviewCount(reviewCount)
                        .isOpen(isOpen)
                        .build();
            }).toList();

            totalElements = kakaoResponse.getMeta().getTotal_count();
        }

        return PlaceSearchResponseDto.builder()
                .items(items)
                .totalElements(totalElements)
                .totalPages((int) Math.ceil((double) totalElements / size))
                .currentPage(page)
                .size(size)
                .build();
    }

    // --- AI 추천 및 상세 조회 로직 (기존 유지) ---

    @Override
    public List<RecommendedPlace> getRecommendedPlaces(AiPlaceCandidatesRequest request) {
        String cacheKey = "ai_recommend_cache:" + request.getUserKeyword() + ":" + request.getTone();
        String cachedData = redisTemplate.opsForValue().get(cacheKey);

        if (cachedData != null) {
            try {
                return objectMapper.readValue(cachedData, new TypeReference<>() {});
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse cached recommended places: {}", e.getMessage());
            }
        }

        // 실제 AI 로직 호출 (생략 가능, 여기서는 가변 시나리오)
        return Collections.emptyList();
    }

    @Override
    public PlaceDetailResponse getPlaceDetail(Long placeId) {
        PlaceEntity place = placeRepository.findById(placeId)
                .orElseThrow(() -> new BaseException(ErrorCode.PLACE_NOT_FOUND));

        return PlaceDetailResponse.builder()
                .placeId(place.getId())
                .name(place.getName())
                .address(place.getAddress())
                .phone(place.getPhone())
                .lat(place.getLat())
                .lng(place.getLng())
                .description(place.getDescription())
                .build();
    }

    @Override
    public AiEnrichResponse enrichPlaceInfo(AiEnrichRequest request) {
        // AI를 통한 장소 정보 보강 로직
        return AiEnrichResponse.builder()
                .placeId(request.getPlaceId())
                .summary("AI가 분석한 장소 특징입니다.")
                .tags(List.of("분위기 좋은", "안주 맛집"))
                .build();
    }

    // --- 보조 메서드 ---

    private Page<PlaceDocument> searchFromElasticsearch(String keyword, int page, int size) {
        try {
            return placeSearchRepository.findByNameContaining(keyword, PageRequest.of(page - 1, size));
        } catch (Exception e) {
            log.error("ES search error: {}", e.getMessage());
            return null;
        }
    }

    private String resolveAddress(KakaoLocalSearchResponseDto.Document doc) {
        if (doc.getRoad_address_name() != null && !doc.getRoad_address_name().isBlank()) {
            return doc.getRoad_address_name();
        }
        return doc.getAddress_name();
    }

    private String stripHtmlTags(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "");
    }

    private Double parseDoubleSafely(String value) {
        if (value == null || value.isBlank()) return 0.0;
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private Double calculateDistance(Double lat1, Double lng1, Double lat2, Double lng2) {
        // 하버사인 공식 등을 이용한 단순 거리 계산 (미터 단위)
        double earthRadius = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c / 1000.0; // km 단위
    }

    private PlaceSearchResponseDto emptyResult(int page, int size) {
        return PlaceSearchResponseDto.builder()
                .items(Collections.emptyList())
                .totalElements(0)
                .totalPages(0)
                .currentPage(page)
                .size(size)
                .build();
    }

    private PlaceSearchResponseDto.PlaceItemDto toPlaceItemDto(PlaceDocument doc) {
        return PlaceSearchResponseDto.PlaceItemDto.builder()
                .placeId(null) // ES 문서에는 DB ID가 없을 수 있음 (externalId로 추적)
                .name(doc.getName())
                .address(doc.getAddress())
                .category(doc.getCategory())
                .lat(doc.getLat())
                .lng(doc.getLng())
                .phone(doc.getPhone())
                .rating(0.0)
                .reviewCount(0)
                .isOpen(doc.getIsOpen())
                .build();
    }
}
