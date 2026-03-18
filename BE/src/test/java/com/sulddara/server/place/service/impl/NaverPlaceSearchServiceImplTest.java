package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class NaverPlaceSearchServiceImplTest {

    @InjectMocks
    private NaverPlaceSearchServiceImpl naverPlaceSearchService;

    @Mock
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(naverPlaceSearchService, "clientId", "test_client_id");
        ReflectionTestUtils.setField(naverPlaceSearchService, "clientSecret", "test_client_secret");
        ReflectionTestUtils.setField(naverPlaceSearchService, "naverSearchUrl", "https://openapi.naver.com/v1/search/local.json");
    }

    @Test
    @DisplayName("searchPlaces - 네이버 API 호출 성공 시 정상적인 파싱 결과를 반환한다")
    void searchPlaces_success_returnsParsedDto() {
        // given
        String keyword = "맛집";
        int display = 5;
        int start = 1;
        String sort = "random";

        NaverLocalSearchResponseDto mockResponse = mock(NaverLocalSearchResponseDto.class);
        NaverLocalSearchResponseDto.NaverPlaceItem mockItem = mock(NaverLocalSearchResponseDto.NaverPlaceItem.class);
        given(mockItem.getTitle()).willReturn("테스트 맛집");
        given(mockResponse.getItems()).willReturn(Collections.singletonList(mockItem));

        ResponseEntity<NaverLocalSearchResponseDto> responseEntity = new ResponseEntity<>(mockResponse, HttpStatus.OK);

        given(restTemplate.exchange(
                any(URI.class),
                eq(HttpMethod.GET),
                any(),
                eq(NaverLocalSearchResponseDto.class)
        )).willReturn(responseEntity);

        // when
        NaverLocalSearchResponseDto result = naverPlaceSearchService.searchPlaces(keyword, display, start, sort);

        // then
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getTitle()).isEqualTo("테스트 맛집");
    }

    @Test
    @DisplayName("searchPlaces - 외부 API 통신 장애 시 빈 결과를 반환한다 (Graceful Degradation)")
    void searchPlaces_restClientException_returnsEmptyDto() {
        // given
        String keyword = "장애발생";
        int display = 5;
        int start = 1;
        String sort = "random";

        given(restTemplate.exchange(
                any(URI.class),
                eq(HttpMethod.GET),
                any(),
                eq(NaverLocalSearchResponseDto.class)
        )).willThrow(new RestClientException("Connection Timeout"));

        // when
        NaverLocalSearchResponseDto result = naverPlaceSearchService.searchPlaces(keyword, display, start, sort);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getItems()).isEmpty();
    }
}
