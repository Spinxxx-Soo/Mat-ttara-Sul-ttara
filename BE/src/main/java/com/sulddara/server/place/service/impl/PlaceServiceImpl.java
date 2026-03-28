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
import com.sulddara.server.place.dto.PlaceSyncRequestDto;
import com.sulddara.server.place.dto.PlaceSyncResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.place.service.PlaceService;
import com.sulddara.server.s3.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.geo.GeoPoint;
import org.springframework.data.elasticsearch.core.query.GeoDistanceOrder;
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
    private final ElasticsearchOperations elasticsearchOperations;


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
                    .map(doc -> toPlaceItemDto(doc, lat, lng))
                    .toList();
            totalElements = (int) esPage.getTotalElements();
        } else {
            // ES 캐시 미스: 카카오 API 호출 후 ES에 비동기 적재
            log.debug("ES cache miss for keyword: '{}', falling back to Kakao API", keyword);
            int displaySize = Math.min(size, KAKAO_DISPLAY_MAX);

            KakaoLocalSearchResponseDto kakaoResponse = externalPlaceSearchService.searchPlaces(keyword, displaySize, page, "accuracy", lat, lng);

            List<String> externalIds = kakaoResponse.getDocuments().stream()
                    .map(KakaoLocalSearchResponseDto.Document::getId)
                    .toList();
            
            java.util.Map<String, PlaceEntity> localPlaceMap = externalIds.isEmpty() ? java.util.Collections.emptyMap() :
                    placeRepository.findAllWithReviewsByProviderAndExternalPlaceIdIn(PROVIDER_KAKAO, externalIds)
                            .stream()
                            .collect(Collectors.toMap(PlaceEntity::getExternalPlaceId, p -> p, (p1, p2) -> p1));

            items = kakaoResponse.getDocuments().stream().map(doc -> {
                String cleanTitle = stripHtmlTags(doc.getPlace_name());
                String externalId = doc.getId();

                Optional<PlaceEntity> localPlaceOpt = Optional.ofNullable(localPlaceMap.get(externalId));
                Long placeId = localPlaceOpt.map(PlaceEntity::getId).orElse(null);
                Boolean isOpen = localPlaceOpt.map(PlaceEntity::getIsOpen).orElse(true);

                Double itemLat = parseDoubleSafely(doc.getY());
                Double itemLng = parseDoubleSafely(doc.getX());

                placeIndexingService.indexToElasticsearchAsync(externalId, cleanTitle, resolveAddress(doc),
                        doc.getCategory_name(), itemLat, itemLng, doc.getPhone());

                Double rating = localPlaceOpt.map(PlaceEntity::getAverageRating).orElse(0.0);
                Integer reviewCount = localPlaceOpt.map(p -> p.getReviews().size()).orElse(0);

                Double distance = (lat != null && lng != null) ? calculateDistance(lat, lng, itemLat, itemLng) : 0.0;

                return PlaceSearchResponseDto.PlaceItemDto.builder()
                        .placeId(placeId)
                        .name(cleanTitle)
                        .address(resolveAddress(doc))
                        .lat(itemLat)
                        .lng(itemLng)
                        .rating(rating)
                        .imageUrl(localPlaceOpt.map(PlaceEntity::getImageUrl).orElse(null))
                        .category(doc.getCategory_name())
                        .isOpen(isOpen)
                        .reviewCount(reviewCount)
                        .distance(distance)
                        .build();
            }).toList();

            totalElements = kakaoResponse.getMeta().getTotal_count();
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


    @Override
    public List<RecommendedPlace> getRecommendedFromRedis(Long userId, Long sessionId, Double lat, Double lng) {
        String redisKey = "recommend:session:" + sessionId + ":user:" + userId;
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

    @Override
    @Transactional
    public PlaceDetailResponse getPlaceDetail(Long placeId) {
        PlaceEntity place = placeRepository.findByIdWithReviews(placeId)
                .orElseThrow(() -> new BaseException(ErrorCode.ENTITY_NOT_FOUND));

//        if (place.getImageUrl() == null && place.getOriginImgUrl() != null) {
//            String s3Url = s3Service.uploadFromExternalUrl(place.getOriginImgUrl());
//            if (s3Url != null) {
//                updatePlaceImageUrl(placeId, s3Url);
//            }
//        }

        if (isMissingData(place)) {
            fetchAndEnrichData(place);
            place = placeRepository.findByIdWithReviews(placeId)
                    .orElseThrow(() -> new BaseException(ErrorCode.ENTITY_NOT_FOUND));
        }

        PlaceDetailResponse.OpeningHoursResponse openingHours = parseOpeningHours(place.getOpeningHours());

        Double rating = place.getAverageRating();

        return PlaceDetailResponse.builder()
                .placeId(place.getId())
                .name(place.getName())
                .address(place.getAddress())
                .phone(place.getPhone())
                .lat(place.getLat())
                .lng(place.getLng())
                .rating(rating)
                .category(place.getCategory())
                .description(place.getDescription())
                .rating(rating)
                .imageUrls(place.getImageUrl() != null ? List.of(place.getImageUrl()) : List.of())
                .openingHours(openingHours)
                .url(place.getUrl())
                .build();
    }

    @Override
    public PlaceSyncResponseDto syncPlace(PlaceSyncRequestDto request) {
        try {
            return performSync(request);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.info("Race condition in syncPlace for externalId {}. Retrying find...", request.externalPlaceId());
            // Retry: Another thread should have committed the record.
            return placeRepository.findByProviderAndExternalPlaceId(PROVIDER_KAKAO, request.externalPlaceId())
                    .map(place -> new PlaceSyncResponseDto(place.getId()))
                    .orElseThrow(() -> e); // If still missing, it was a different integrity violation
        }
    }

    @Transactional
    protected PlaceSyncResponseDto performSync(PlaceSyncRequestDto request) {
        return placeRepository.findByProviderAndExternalPlaceId(PROVIDER_KAKAO, request.externalPlaceId())
                .map(place -> new PlaceSyncResponseDto(place.getId()))
                .orElseGet(() -> {
                    PlaceEntity newPlace = new PlaceEntity(
                            PROVIDER_KAKAO,
                            request.externalPlaceId(),
                            request.name(),
                            request.address(),
                            request.lat(),
                            request.lng()
                    );
                    newPlace.updateCategory(request.category());
                    newPlace.updateDetails(null, null, null, request.phone(), request.url());

                    PlaceEntity savedPlace = placeRepository.save(newPlace);
                    return new PlaceSyncResponseDto(savedPlace.getId());
                });
    }

    private PlaceDetailResponse.OpeningHoursResponse parseOpeningHours(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, PlaceDetailResponse.OpeningHoursResponse.class);
        } catch (JsonProcessingException e) {
            throw new BaseException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private void fetchAndEnrichData(PlaceEntity place) {
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
                saveEnrichedData(place.getId(), response);
            }
        } catch (Exception e) {
            log.error("AI 서버 통신 중 오류 발생 (Lazy Loading 실패): {}", e.getMessage());
        }
    }

    private boolean isMissingData(PlaceEntity place) {
        return place.getDescription() == null
                || place.getOpeningHours() == null || place.getPhone() == null
                || place.getUrl() == null;
    }

    @Transactional
    public void saveEnrichedData(Long placeId, AiEnrichResponse response) {
        placeRepository.findById(placeId).ifPresent(p ->
                p.updateDetails(
                        response.getImageUrl(),
                        response.getDescription(),
                        response.getOpeningHours(),
                        response.getPhone(),
                        response.getUrl()
                )
        );
    }

    @Transactional
    public void updatePlaceImageUrl(Long placeId, String s3Url) {
        placeRepository.findById(placeId).ifPresent(p -> p.updateImageUrl(s3Url));
    }

    @Override
    @Transactional
    public void enrichPlaceData(Long placeId) {
        PlaceEntity place = placeRepository.findById(placeId)
                .orElseThrow(() -> new BaseException(ErrorCode.ENTITY_NOT_FOUND));

        fetchAndEnrichData(place);
    }

    // ===== 검색 보조 메서드 =====

    private Page<PlaceDocument> searchFromElasticsearch(String keyword, int page, int size) {
        try {
            // 단순 일치 검색 대신 name에 포함된 키워드로 검색 (PlaceSearchRepository 위임)
            return placeSearchRepository.findByNameContaining(keyword, PageRequest.of(page - 1, size));
        } catch (Exception e) {
            log.warn("Elasticsearch query failed: {}", e.getMessage());
            return null;
        }
    }

    private String resolveAddress(KakaoLocalSearchResponseDto.Document doc) {
        if (doc.getRoad_address_name() != null && !doc.getRoad_address_name().isBlank()) {
            return doc.getRoad_address_name();
        }
        return doc.getAddress_name();
    }

    private String stripHtmlTags(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "");
    }

    private Double parseDoubleSafely(String value) {
        try {
            return Double.valueOf(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
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

    private PlaceSearchResponseDto emptyResult(int page, int size) {
        return PlaceSearchResponseDto.builder()
                .content(Collections.emptyList())
                .pageInfo(PlaceSearchResponseDto.PageInfoDto.builder()
                        .page(page).size(size).totalElements(0).totalPages(0).hasNext(false)
                        .build())
                .build();
    }

    private PlaceSearchResponseDto.PlaceItemDto toPlaceItemDto(PlaceDocument doc, Double userLat, Double userLng) {
        Optional<PlaceEntity> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId(
                doc.getProvider(), doc.getExternalPlaceId());

        Double rating = localPlaceOpt.map(PlaceEntity::getAverageRating).orElse(0.0);
        Integer reviewCount = localPlaceOpt.map(p -> p.getReviews().size()).orElse(0);
        Double distance = (userLat != null && userLng != null) ? calculateDistance(userLat, userLng, doc.getLat(), doc.getLng()) : 0.0;

        return PlaceSearchResponseDto.PlaceItemDto.builder()
                .placeId(localPlaceOpt.map(PlaceEntity::getId).orElse(null))
                .name(doc.getName())
                .address(doc.getAddress())
                .lat(doc.getLat())
                .lng(doc.getLng())
                .rating(rating)
                .imageUrl(localPlaceOpt.map(PlaceEntity::getImageUrl).orElse(doc.getImageUrl()))
                .category(doc.getCategory())
                .isOpen(doc.getIsOpen() != null ? doc.getIsOpen() : true)
                .reviewCount(reviewCount)
                .distance(distance)
                .build();
    }
}