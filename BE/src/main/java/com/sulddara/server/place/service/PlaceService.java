package com.sulddara.server.place.service;

import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSyncRequestDto;
import com.sulddara.server.place.dto.PlaceSyncResponseDto;

import java.util.List;

public interface PlaceService {

    /**
     * FR-13 가게 검색 기능
     * 외부 지도 API를 통해 검색하고 로컬 DB의 데이터(평점, 리뷰수 등)와 결합하여 반환합니다.
     *
     * @param keyword 검색어
     * @param lat 사용자의 현재 위도 (선택)
     * @param lng 사용자의 현재 경도 (선택)
     * @param page 조회할 페이지
     * @param size 페이지 당 크기
     * @param sort 정렬 기준 (distance, rating 등)
     * @return 통합된 가게 검색 결과
     */
    PlaceSearchResponseDto searchPlaces(String keyword, Double lat, Double lng, int page, int size, String sort);

    List<RecommendedPlace> getRecommendedFromRedis(Long id, Double lat, Double lng);

    PlaceDetailResponse getPlaceDetail(Long placeId);

    PlaceSyncResponseDto syncPlace(PlaceSyncRequestDto request);
}
