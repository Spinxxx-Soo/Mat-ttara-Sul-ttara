package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.place.service.PlaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceServiceImpl implements PlaceService {

    private static final String PROVIDER_NAVER = "NAVER";
    private static final int NAVER_DISPLAY_MAX = 5;

    private final ExternalPlaceSearchService externalPlaceSearchService;
    private final PlaceRepository placeRepository;

    @Override
    @Transactional(readOnly = true)
    public PlaceSearchResponseDto searchPlaces(String keyword, Double lat, Double lng, int page, int size, String sort) {

        // Fail-Fast: 검색어 없이 호출된 경우 빈 결과를 즉시 반환
        if (keyword == null || keyword.isBlank()) {
            return emptyResult(page, size);
        }

        // 1. 네이버 API 검색 호출
        int displaySize = Math.min(size, NAVER_DISPLAY_MAX);
        NaverLocalSearchResponseDto naverResponse = externalPlaceSearchService.searchPlaces(keyword, displaySize, page, "random");

        // 2. 검색 결과 변환 및 로컬 DB (PLACES 테이블) 데이터 매핑
        List<PlaceSearchResponseDto.PlaceItemDto> items = naverResponse.getItems().stream().map(item -> {
            String cleanTitle = stripHtmlTags(item.getTitle());
            String externalId = item.getMapx() + item.getMapy();

            Optional<Place> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId(PROVIDER_NAVER, externalId);

            Long placeId = localPlaceOpt.map(Place::getId).orElse(null);
            Boolean isOpen = localPlaceOpt.map(Place::getIsOpen).orElse(true);

            // TODO: 리뷰 테이블 조인을 통해 계산 (현재 기본값)
            Double rating = 0.0;
            Integer reviewCount = 0;

            // TODO: KATEC -> WGS84 변환 로직 필요 (현재 기본값)
            Double distance = 0.0;

            return PlaceSearchResponseDto.PlaceItemDto.builder()
                    .placeId(placeId)
                    .name(cleanTitle)
                    .address(resolveAddress(item))
                    .lat(parseDoubleSafely(item.getMapx()))
                    .lng(parseDoubleSafely(item.getMapy()))
                    .rating(rating)
                    .imageUrl(localPlaceOpt.map(Place::getImageUrl).orElse(null))
                    .category(item.getCategory())
                    .isOpen(isOpen)
                    .reviewCount(reviewCount)
                    .distance(distance)
                    .build();
        }).toList();

        // 3. 정렬 로직 (원본 리스트가 불변이므로 새로운 리스트로 복사 후 정렬)
        List<PlaceSearchResponseDto.PlaceItemDto> sortedItems = new java.util.ArrayList<>(items);
        if ("distance".equalsIgnoreCase(sort)) {
            sortedItems.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getDistance));
        } else if ("rating".equalsIgnoreCase(sort)) {
            sortedItems.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getRating).reversed());
        }

        // 4. 페이징 메타데이터 생성
        boolean hasNext = naverResponse.getTotal() > (page * size);
        int totalPages = (int) Math.ceil((double) naverResponse.getTotal() / size);

        PlaceSearchResponseDto.PageInfoDto pageInfo = PlaceSearchResponseDto.PageInfoDto.builder()
                .page(page)
                .size(size)
                .totalElements(naverResponse.getTotal())
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();

        return PlaceSearchResponseDto.builder()
                .content(sortedItems)
                .pageInfo(pageInfo)
                .build();
    }

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
}
