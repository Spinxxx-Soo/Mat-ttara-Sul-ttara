package com.sulddara.server.place.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.s3.service.S3Service;
import com.sulddara.server.share.error.exception.BaseException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.parameters.P;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

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

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private S3Service s3Service;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

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

    @Test
    @DisplayName("Redis에서 추천 장소를 가져와 1km 이내인 장소만 필터링한다")
    void getRecommendedFromRedis_FilteringTest() throws JsonProcessingException {
        // given
        Long userId = 1L;
        Double userLat = 37.5000; // 기준점
        Double userLng = 127.0000;

        // 1. 500m 거리 장소 (포함되어야 함)
        RecommendedPlace nearPlace = new RecommendedPlace(101L, "가까운 곳", 37.5040, 127.0000, "주소1", "이유1", List.of());
        // 2. 1.5km 거리 장소 (제외되어야 함)
        RecommendedPlace farPlace = new RecommendedPlace(102L, "먼 곳", 37.5150, 127.0000, "주소2", "이유2", List.of());

        List<RecommendedPlace> mockList = List.of(nearPlace, farPlace);
        String jsonList = objectMapper.writeValueAsString(mockList);

        String redisKey = "recommend:user:" + userId;
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(redisKey)).thenReturn(jsonList);

        // when
        List<RecommendedPlace> result = placeService.getRecommendedFromRedis(userId, userLat, userLng);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("가까운 곳");
    }

    @Test
    @DisplayName("장소 상세 조회 시 정상적으로 DTO로 변환된다")
    void getPlaceDetail_Success() throws JsonProcessingException {
        // given
        Long placeId = 1L;
        String openingHoursJson = "{\"today\":\"18:00 - 01:00\",\"weekly\":[{\"day\":\"MON\",\"time\":\"18:00\"}]}";

        // Reflection 등을 쓰거나 Builder가 없다면 생성자/Setter로 Mock 객체 생성
        // 여기서는 임의의 Place 엔티티 구성 (프로젝트의 Place 구조에 따름)
        Place mockPlace = createMockPlace(placeId, "사케바 온도", openingHoursJson);

        when(placeRepository.findById(placeId)).thenReturn(Optional.of(mockPlace));

        // when
        PlaceDetailResponse response = placeService.getPlaceDetail(placeId);

        // then
        assertThat(response.getName()).isEqualTo("사케바 온도");
        assertThat(response.getOpeningHours().getToday()).isEqualTo("18:00 - 01:00");
        assertThat(response.getImageUrls()).containsExactly("https://test-image.com");
    }

    @Test
    @DisplayName("존재하지 않는 장소 상세 조회 시 ENTITY_NOT_FOUND 예외가 발생한다")
    void getPlaceDetail_NotFound() {
        // given
        Long placeId = 999L;
        when(placeRepository.findById(placeId)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> placeService.getPlaceDetail(placeId))
                .isInstanceOf(BaseException.class);
    }

    // Helper method: 테스트용 엔티티 생성 (엔티티가 빌더가 없거나 protected인 경우 대응)
    private Place createMockPlace(Long id, String name, String openingHours) {
        // 프로젝트의 Place 구조에 맞춰 필드 주입 (ReflectionTestUtils 사용 권장)
        Place place = new Place("GOOGLE", "EXT_123", name, "서울 어딘가", 37.5, 127.0);
        ReflectionTestUtils.setField(place, "id", id);
        ReflectionTestUtils.setField(place, "openingHours", openingHours);
        ReflectionTestUtils.setField(place, "imageUrl", "https://test-image.com");
        return place;
    }

    @Test
    @DisplayName("이미지가 없고 원본 URL이 있을 때 S3 업로드가 실행되어야 한다")
    void shouldUploadToS3WhenImageIsNull() {
        // Given
        Long placeId = 1L;

        Place place = new Place("GOOGLE", "ext_id_123", "맛술집", "서울 강남구", 37.5, 127.0);
        ReflectionTestUtils.setField(place, "originImgUrl", "http://google.com/photo.jpg");
        ReflectionTestUtils.setField(place, "id", placeId);

        given(placeRepository.findById(placeId)).willReturn(Optional.of(place));
        given(s3Service.uploadFromExternalUrl(anyString())).willReturn("http://my-s3.com/saved.jpg");

        // When
        placeService.getPlaceDetail(placeId);

        // Then
        verify(s3Service, times(1)).uploadFromExternalUrl(eq("http://google.com/photo.jpg"));
        assertThat(place.getImageUrl()).isEqualTo("http://my-s3.com/saved.jpg");
    }
}
