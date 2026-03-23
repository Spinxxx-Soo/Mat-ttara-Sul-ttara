package com.sulddara.server.place.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.request.AiPlaceCandidatesRequest;
import com.sulddara.server.chat.ai.controller.response.AiChatResponse;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.place.controller.request.AiEnrichRequest;
import com.sulddara.server.place.controller.response.AiEnrichResponse;
import com.sulddara.server.place.document.PlaceDocument;
import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.place.service.PlaceService;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
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

    private static final String PROVIDER_NAVER = "NAVER";
    private static final int NAVER_DISPLAY_MAX = 5;

    private final ExternalPlaceSearchService externalPlaceSearchService;
    private final PlaceRepository placeRepository;
    private final PlaceSearchRepository placeSearchRepository;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;
    private final WebClient webClient;

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
            // ES 캐시 미스: 네이버 API 호출 후 ES에 비동기 적재
            log.debug("ES cache miss for keyword: '{}', falling back to Naver API", keyword);
            int displaySize = Math.min(size, NAVER_DISPLAY_MAX);
            // ⚠️ Fix: 네이버 API start 오프셋 계산 (1-based)
            int naverStart = (page - 1) * displaySize + 1;
            NaverLocalSearchResponseDto naverResponse = externalPlaceSearchService.searchPlaces(keyword, displaySize, naverStart, "random");

            items = naverResponse.getItems().stream().map(item -> {
                String cleanTitle = stripHtmlTags(item.getTitle());
                String externalId = item.getMapx() + item.getMapy();

                Optional<Place> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId(PROVIDER_NAVER, externalId);
                Long placeId = localPlaceOpt.map(Place::getId).orElse(null);
                Boolean isOpen = localPlaceOpt.map(Place::getIsOpen).orElse(true);

                // ⚠️ Fix: Naver TM128(KATEC) 평면 좌표 -> WGS84 위경도 변환
                Double itemMapX = parseDoubleSafely(item.getMapx());
                Double itemMapY = parseDoubleSafely(item.getMapy());
                Double itemLng = 0.0;
                Double itemLat = 0.0;
                if (itemMapX > 0 && itemMapY > 0) {
                    com.sulddara.server.place.util.CoordinateConverter.LatLng wgs84 = 
                            com.sulddara.server.place.util.CoordinateConverter.convertTm128ToWgs84(itemMapX, itemMapY);
                    itemLat = wgs84.lat;
                    itemLng = wgs84.lng;
                }

                // ES에 비동기 적재
                indexToElasticsearchAsync(externalId, cleanTitle, resolveAddress(item),
                        item.getCategory(), itemLat, itemLng, item.getTelephone());

                // TODO: 리뷰 테이블 조인을 통해 계산 (현재 기본값)
                Double rating = 0.0;
                Integer reviewCount = 0;

                // TODO: KATEC -> WGS84 변환 로직 필요 (현재 기본값)
                Double distance = 0.0;

                return PlaceSearchResponseDto.PlaceItemDto.builder()
                        .placeId(placeId)
                        .name(cleanTitle)
                        .address(resolveAddress(item))
                        .lat(itemLat)
                        .lng(itemLng)
                        .rating(rating)
                        .imageUrl(localPlaceOpt.map(Place::getImageUrl).orElse(null))
                        .category(item.getCategory())
                        .isOpen(isOpen)
                        .reviewCount(reviewCount)
                        .distance(distance)
                        .build();
            }).toList();

            totalElements = naverResponse.getTotal();
        }

        // 정렬 로직 (원본 리스트가 불변이므로 새로운 리스트로 복사 후 정렬)
        List<PlaceSearchResponseDto.PlaceItemDto> sortedItems = new java.util.ArrayList<>(items);
        if ("distance".equalsIgnoreCase(sort)) {
            sortedItems.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getDistance));
        } else if ("rating".equalsIgnoreCase(sort)) {
            sortedItems.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getRating).reversed());
        }

        // 페이징 메타데이터 생성
        boolean hasNext = totalElements > (page * size);
        int totalPages = (int) Math.ceil((double) totalElements / size);

        PlaceSearchResponseDto.PageInfoDto pageInfo = PlaceSearchResponseDto.PageInfoDto.builder()
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();

        return PlaceSearchResponseDto.builder()
                .content(sortedItems)
                .pageInfo(pageInfo)
                .build();
    }

    // --- Elasticsearch 연동 메서드 ---

    private Page<PlaceDocument> searchFromElasticsearch(String keyword, int page, int size) {
        try {
            return placeSearchRepository.findByNameContaining(keyword, PageRequest.of(page - 1, size));
        } catch (Exception e) {
            log.warn("Elasticsearch query failed, falling back to external API: {}", e.getMessage());
            return null;
        }
    }

    @Async
    public void indexToElasticsearchAsync(String externalId, String name, String address,
                                          String category, Double lat, Double lng, String phone) {
        try {
            PlaceDocument doc = PlaceDocument.builder()
                    .id(PROVIDER_NAVER + "_" + externalId)
                    .name(name)
                    .address(address)
                    .category(category)
                    .lat(lat)
                    .lng(lng)
                    .provider(PROVIDER_NAVER)
                    .externalPlaceId(externalId)
                    .phone(phone)
                    .isOpen(true)
                    .build();
            placeSearchRepository.save(doc);
            log.debug("Indexed place to ES: {}", name);
        } catch (Exception e) {
            log.warn("Failed to index place to Elasticsearch: {}", e.getMessage());
        }
    }

    // --- DTO 변환 메서드 ---

    private PlaceSearchResponseDto.PlaceItemDto toPlaceItemDto(PlaceDocument doc) {
        Optional<Place> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId(
                doc.getProvider(), doc.getExternalPlaceId());

        return PlaceSearchResponseDto.PlaceItemDto.builder()
                .placeId(localPlaceOpt.map(Place::getId).orElse(null))
                .name(doc.getName())
                .address(doc.getAddress())
                .lat(doc.getLat())
                .lng(doc.getLng())
                .rating(0.0)
                .imageUrl(localPlaceOpt.map(Place::getImageUrl).orElse(doc.getImageUrl()))
                .category(doc.getCategory())
                .isOpen(doc.getIsOpen() != null ? doc.getIsOpen() : true)
                .reviewCount(0)
                .distance(0.0)
                .build();
    }

    // --- 유틸리티 메서드 ---

    private PlaceSearchResponseDto emptyResult(int page, int size) {
        return PlaceSearchResponseDto.builder()
                .content(Collections.emptyList())
                .pageInfo(PlaceSearchResponseDto.PageInfoDto.builder()
                        .page(page).size(size).totalElements(0).totalPages(0).hasNext(false)
                        .build())
                .build();
    }

    private String resolveAddress(NaverLocalSearchResponseDto.NaverPlaceItem item) {
        return (item.getRoadAddress() != null && !item.getRoadAddress().isBlank())
                ? item.getRoadAddress()
                : item.getAddress();
    }

    private Double parseDoubleSafely(String value) {
        try {
            return Double.valueOf(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private String stripHtmlTags(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "");
    }

    @Override
    public List<RecommendedPlace> getRecommendedFromRedis(Long userId, Double lat, Double lng) {
        String redisKey = "recommend:user:" + userId;
        String cachedData = redisTemplate.opsForValue().get(redisKey);

        if (cachedData == null || cachedData.isBlank()) {
            return List.of();
        }
        try {
            List<RecommendedPlace> allRecommended = objectMapper.readValue(cachedData,
                    new TypeReference<List<RecommendedPlace>>() {});

            return allRecommended.stream()
                    .filter(place -> isWithinRadius(lat, lng, place.getLat(), place.getLng()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private boolean isWithinRadius(double userLat, double userLng, double placeLat, double placeLng) {
        double distance = calculateDistance(userLat, userLng, placeLat, placeLng);
        return distance <= 1.0;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double theta = lon1 - lon2;
        double dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));

        dist = Math.acos(dist);
        dist = rad2deg(dist);
        dist = dist * 60 * 1.1515 * 1.609344; // 단위를 km로 변환

        return dist;
    }

    private double deg2rad(double deg) { return (deg * Math.PI / 180.0); }
    private double rad2deg(double rad) { return (rad * 180 / Math.PI); }

    @Override
    public PlaceDetailResponse getPlaceDetail(Long placeId) {
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new BaseException(ErrorCode.ENTITY_NOT_FOUND));

        PlaceDetailResponse.OpeningHoursResponse openingHours = parseOpeningHours(place.getOpeningHours());

        // webclient로 데이터가 null일 경우 ai한테 크롤링 로직 호출
        if(isMissingData(place)) {
            fetchAndEnrichData(place);
        }

        // rating 불러오는 로직 필요!!!!
        return PlaceDetailResponse.builder()
                .placeId(place.getId())
                .name(place.getName())
                .address(place.getAddress())
                .phone(place.getPhone())
                .lat(place.getLat())
                .lng(place.getLng())
                .category(place.getCategory())
                .description(place.getDescription())
                .imageUrls(List.of(place.getImageUrl()))
                .openingHours(openingHours)
                .url(place.getUrl())
                .build();
    }

    private PlaceDetailResponse.OpeningHoursResponse parseOpeningHours(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, PlaceDetailResponse.OpeningHoursResponse.class);
        } catch (JsonProcessingException e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    private void fetchAndEnrichData(Place place) {
        var request = AiEnrichRequest.builder()
                .provider(place.getProvider())
                .externalPlaceId(place.getExternalPlaceId())
                .build();

        try {
            AiEnrichResponse response = webClient.post()
                    .uri("/api/v1/internal/ai/enrich")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiEnrichResponse.class)
                    .block(Duration.ofSeconds(10));

            if (response != null && response.getIsSuccess()) {
                place.updateDetails(
                        response.getImageUrl(),
                        response.getDescription(),
                        response.getOpeningHours(),
                        response.getPhone(),
                        response.getUrl()
                );
            }
        } catch (Exception e) {
            log.error("AI 서버 통신 중 오류 발생 (Lazy Loading 실패): {}", e.getMessage());
        }
    }

    private boolean isMissingData(Place place) {
        return place.getImageUrl() == null || place.getDescription() == null
                || place.getOpeningHours() == null || place.getPhone() == null
                || place.getUrl() == null;
    }
}
