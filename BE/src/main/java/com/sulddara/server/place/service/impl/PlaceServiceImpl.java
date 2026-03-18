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

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceServiceImpl implements PlaceService {

    private final ExternalPlaceSearchService externalPlaceSearchService;
    private final PlaceRepository placeRepository;

    @Override
    @Transactional(readOnly = true)
    public PlaceSearchResponseDto searchPlaces(String keyword, Double lat, Double lng, int page, int size, String sort) {
        
        // 1. 네이버 API 검색 호출 (정렬은 일단 random 혹은 comment 중 기본값 사용, 여기서는 네이버 기본인 random(유사도순) 사용)
        // 네이버 API의 display 최대값이 5이므로, size를 5로 제한하거나 추가 로직이 필요하지만 우선 size만큼 요청
        int displaySize = Math.min(size, 5); 
        NaverLocalSearchResponseDto naverResponse = externalPlaceSearchService.searchPlaces(keyword, displaySize, page, "random");

        // 2. 검색 결과 변환 및 로컬 DB (PLACES 테이블) 데이터 매핑
        List<PlaceSearchResponseDto.PlaceItemDto> items = naverResponse.getItems().stream().map(item -> {
            String cleanTitle = stripHtmlTags(item.getTitle());
            String externalId = item.getMapx() + item.getMapy(); // KATEC 좌표 결합 문자열을 임시 식별자로 사용 혹은 title 사용
            
            Optional<Place> localPlaceOpt = placeRepository.findByProviderAndExternalPlaceId("NAVER", externalId);
            
            // 로컬 DB에 존재하면 해당 정보 활용, 없으면 기본값
            Long placeId = localPlaceOpt.map(Place::getId).orElse(null);
            Boolean isOpen = localPlaceOpt.map(Place::getIsOpen).orElse(true);
            
            // 향후 리뷰 테이블 조인을 통해 계산할 평점/리뷰수 (현재는 0으로 처리)
            Double rating = 0.0;
            Integer reviewCount = 0;
            
            // 거리 계산 (TODO: KATEC -> WGS84 변환 로직 필요, 현재는 0.0)
            Double distance = 0.0;

            return PlaceSearchResponseDto.PlaceItemDto.builder()
                    .placeId(placeId)
                    .name(cleanTitle)
                    .address(item.getRoadAddress() != null && !item.getRoadAddress().isBlank() ? item.getRoadAddress() : item.getAddress())
                    .lat(Double.valueOf(item.getMapx())) // 보존용 KATEC
                    .lng(Double.valueOf(item.getMapy())) // 보존용 KATEC
                    .rating(rating)
                    .imageUrl(localPlaceOpt.map(Place::getImageUrl).orElse(null))
                    .category(item.getCategory())
                    .isOpen(isOpen)
                    .reviewCount(reviewCount)
                    .distance(distance)
                    .build();
        }).collect(Collectors.toList());

        // 3. 정렬 로직 (distance, rating 기준)
        if ("distance".equalsIgnoreCase(sort)) {
            items.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getDistance));
        } else if ("rating".equalsIgnoreCase(sort)) {
            items.sort(Comparator.comparing(PlaceSearchResponseDto.PlaceItemDto::getRating).reversed());
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
                .content(items)
                .pageInfo(pageInfo)
                .build();
    }

    private String stripHtmlTags(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "");
    }
}
