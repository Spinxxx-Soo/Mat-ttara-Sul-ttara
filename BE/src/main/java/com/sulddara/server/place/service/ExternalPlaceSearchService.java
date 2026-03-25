package com.sulddara.server.place.service;

import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;

public interface ExternalPlaceSearchService {
    
    /**
     * 외부 지도 API를 이용하여 장소를 검색합니다.
     * 
     * @param query 검색어
     * @param display 검색 결과 출력 건수
     * @param start 검색 시작 위치
     * @param sort 정렬 옵션 (random, comment)
     * @return 검색 결과 응답 DTO
     */
    NaverLocalSearchResponseDto searchPlaces(String query, int display, int start, String sort);
}
