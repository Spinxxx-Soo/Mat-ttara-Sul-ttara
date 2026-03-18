package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class PlaceServiceImplTest {

    @InjectMocks
    private PlaceServiceImpl placeService;

    @Mock
    private ExternalPlaceSearchService externalSearchService;

    @Mock
    private PlaceRepository placeRepository;

    @Test
    @DisplayName("searchPlaces - 빈 키워드 입력 시 빈 결과를 반환한다 (Fail-Fast)")
    void searchPlaces_emptyKeyword_returnsEmptyResult() {
        // given
        String keyword = "   ";

        // when
        PlaceSearchResponseDto response = placeService.searchPlaces(keyword, 0.0, 0.0, 1, 10, "distance");

        // then
        assertThat(response.getContent()).isEmpty();
        assertThat(response.getPageInfo().getTotalElements()).isZero();
    }

    @Test
    @DisplayName("searchPlaces - 외부 API 검색 결과를 반환한다")
    void searchPlaces_validKeyword_returnsResults() {
        // given
        String keyword = "맛집";
        double userLat = 37.5665;
        double userLng = 126.9780;

        NaverLocalSearchResponseDto.NaverPlaceItem mockItem = mock(NaverLocalSearchResponseDto.NaverPlaceItem.class);
        given(mockItem.getTitle()).willReturn("<b>네이버</b> 맛집 1");
        given(mockItem.getCategory()).willReturn("음식점>한식");
        given(mockItem.getRoadAddress()).willReturn("도로명 주소 1");
        given(mockItem.getMapx()).willReturn("0");
        given(mockItem.getMapy()).willReturn("0");

        NaverLocalSearchResponseDto mockNaverResponse = mock(NaverLocalSearchResponseDto.class);
        given(mockNaverResponse.getItems()).willReturn(Collections.singletonList(mockItem));

        given(externalSearchService.searchPlaces(eq(keyword), anyInt(), anyInt(), anyString())).willReturn(mockNaverResponse);
        given(placeRepository.findByProviderAndExternalPlaceId(anyString(), anyString())).willReturn(Optional.empty());

        // when
        PlaceSearchResponseDto response = placeService.searchPlaces(keyword, userLat, userLng, 1, 10, "distance");

        // then
        assertThat(response.getContent()).hasSize(1);
        PlaceSearchResponseDto.PlaceItemDto responseItem = response.getContent().get(0);
        assertThat(responseItem.getName()).isEqualTo("네이버 맛집 1"); // HTML stripped
        assertThat(responseItem.getCategory()).isEqualTo("음식점>한식");
        assertThat(responseItem.getDistance()).isZero(); 
        assertThat(responseItem.getRating()).isZero();
    }
}
