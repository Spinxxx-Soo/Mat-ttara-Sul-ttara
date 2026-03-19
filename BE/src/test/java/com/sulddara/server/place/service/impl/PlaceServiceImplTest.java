package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;

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

    @Mock
    private PlaceSearchRepository placeSearchRepository;

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
    @DisplayName("searchPlaces - ES 캐시 미스 시 외부 API 검색 결과를 반환한다")
    void searchPlaces_esCacheMiss_returnsNaverResults() {
        // given
        String keyword = "맛집";
        double userLat = 37.5665;
        double userLng = 126.9780;

        // ES는 빈 결과 반환 (캐시 미스)
        @SuppressWarnings("unchecked")
        Page<com.sulddara.server.place.document.PlaceDocument> emptyPage = mock(Page.class);
        given(emptyPage.hasContent()).willReturn(false);
        given(placeSearchRepository.findByNameContaining(eq(keyword), any())).willReturn(emptyPage);

        NaverLocalSearchResponseDto.NaverPlaceItem mockItem = mock(NaverLocalSearchResponseDto.NaverPlaceItem.class);
        given(mockItem.getTitle()).willReturn("<b>네이버</b> 맛집 1");
        given(mockItem.getCategory()).willReturn("음식점>한식");
        given(mockItem.getRoadAddress()).willReturn("도로명 주소 1");
        given(mockItem.getMapx()).willReturn("314681");  // KATEC X (TM128)
        given(mockItem.getMapy()).willReturn("544307");   // KATEC Y (TM128)
        given(mockItem.getTelephone()).willReturn("02-1234-5678");

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
        // KATEC(TM128) -> WGS84 변환 검증 (대략적인 범위 검증)
        assertThat(responseItem.getLat()).isGreaterThan(37.0).isLessThan(38.0);
        assertThat(responseItem.getLng()).isGreaterThan(126.0).isLessThan(128.0);
        assertThat(responseItem.getDistance()).isZero();
        assertThat(responseItem.getRating()).isZero();
    }
}
