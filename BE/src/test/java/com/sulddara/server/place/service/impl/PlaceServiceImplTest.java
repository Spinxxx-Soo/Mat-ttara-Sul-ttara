package com.sulddara.server.place.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.dto.KakaoLocalSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import com.sulddara.server.s3.service.S3Service;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

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

    @Mock
    private WebClient webClient;

    @Mock
    private PlaceIndexingService placeIndexingService;

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
    void searchPlaces_esCacheMiss_returnsKakaoResults() {
        // given
        String keyword = "맛집";
        double userLat = 37.5665;
        double userLng = 126.9780;

        // ES는 빈 결과 반환 (캐시 미스)
        @SuppressWarnings("unchecked")
        Page<com.sulddara.server.place.document.PlaceDocument> emptyPage = mock(Page.class);
        given(emptyPage.hasContent()).willReturn(false);
        given(placeSearchRepository.findByNameContaining(eq(keyword), any())).willReturn(emptyPage);

        KakaoLocalSearchResponseDto.Document mockDoc = mock(KakaoLocalSearchResponseDto.Document.class);
        given(mockDoc.getPlace_name()).willReturn("<b>카카오</b> 맛집 1");
        given(mockDoc.getCategory_name()).willReturn("음식점 > 한식");
        given(mockDoc.getRoad_address_name()).willReturn("도로명 주소 1");
        given(mockDoc.getX()).willReturn("126.9780"); // lng
        given(mockDoc.getY()).willReturn("37.5665");  // lat
        given(mockDoc.getPhone()).willReturn("02-1234-5678");
        given(mockDoc.getId()).willReturn("kakao_123");

        KakaoLocalSearchResponseDto.Meta mockMeta = mock(KakaoLocalSearchResponseDto.Meta.class);
        given(mockMeta.getTotal_count()).willReturn(1);

        KakaoLocalSearchResponseDto mockKakaoResponse = mock(KakaoLocalSearchResponseDto.class);
        given(mockKakaoResponse.getDocuments()).willReturn(Collections.singletonList(mockDoc));
        given(mockKakaoResponse.getMeta()).willReturn(mockMeta);

        given(externalSearchService.searchPlaces(eq(keyword), anyInt(), anyInt(), anyString(), any(), any())).willReturn(mockKakaoResponse);
        given(placeRepository.findByProviderAndExternalPlaceId(anyString(), anyString())).willReturn(Optional.empty());

        // when
        PlaceSearchResponseDto response = placeService.searchPlaces(keyword, userLat, userLng, 1, 10, "distance");

        // then
        assertThat(response.getContent()).hasSize(1);
        PlaceSearchResponseDto.PlaceItemDto responseItem = response.getContent().get(0);
        assertThat(responseItem.getName()).isEqualTo("카카오 맛집 1"); // HTML stripped
        assertThat(responseItem.getCategory()).isEqualTo("음식점 > 한식");
        assertThat(responseItem.getLat()).isEqualTo(37.5665);
        assertThat(responseItem.getLng()).isEqualTo(126.9780);
        assertThat(responseItem.getDistance()).isZero();
        assertThat(responseItem.getRating()).isZero();
    }

    @Test
    @DisplayName("Redis에서 추천 장소를 가져와 1km 이내인 장소만 필터링한다")
    void getRecommendedFromRedis_FilteringTest() throws JsonProcessingException {
        // given
        Long userId = 1L;
        Long sessionId = 2L;
        Double userLat = 37.5000; // 기준점
        Double userLng = 127.0000;

        // 1. 500m 거리 장소 (포함되어야 함)
        RecommendedPlace nearPlace = new RecommendedPlace(101L, "가까운 곳", 37.5040, 127.0000, "주소1");
        // 2. 1.5km 거리 장소 (제외되어야 함)
        RecommendedPlace farPlace = new RecommendedPlace(102L, "먼 곳", 37.5150, 127.0000, "주소2");

        List<RecommendedPlace> mockList = List.of(nearPlace, farPlace);
        String jsonList = objectMapper.writeValueAsString(mockList);

        String redisKey = "recommend:user:" + userId;
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(redisKey)).thenReturn(jsonList);

        // when
        List<RecommendedPlace> result = placeService.getRecommendedFromRedis(userId, sessionId, userLat, userLng);

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
        PlaceEntity mockPlace = createMockPlace(placeId, "사케바 온도", openingHoursJson);

        ReflectionTestUtils.setField(mockPlace, "phone", "02-123-4567");
        ReflectionTestUtils.setField(mockPlace, "url", "http://test.com");
        ReflectionTestUtils.setField(mockPlace, "description", "설명");

        // [중요] findById -> findByIdWithReviews로 변경된 메서드 Mocking
        given(placeRepository.findByIdWithReviews(placeId)).willReturn(Optional.of(mockPlace));

        // when
        PlaceDetailResponse response = placeService.getPlaceDetail(placeId);

        // then
        assertThat(response.getName()).isEqualTo("사케바 온도");
        assertThat(response.getOpeningHours().getToday()).isEqualTo("18:00 - 01:00");
        assertThat(response.getImageUrls()).containsExactly("https://test-image.com");
        assertThat(response.getRating()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 장소 상세 조회 시 ENTITY_NOT_FOUND 예외가 발생한다")
    void getPlaceDetail_NotFound() {
        // given
        Long placeId = 999L;
        // findByIdWithReviews 사용
        given(placeRepository.findByIdWithReviews(placeId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> placeService.getPlaceDetail(placeId))
                .isInstanceOf(BaseException.class);
    }

    @Test
    @DisplayName("이미지가 없고 원본 URL이 있을 때 S3 업로드가 실행되어야 한다")
    void shouldUploadToS3WhenImageIsNull() {
        // Given
        Long placeId = 1L;
        PlaceEntity place = createMockPlace(placeId, "맛술집", null);
        ReflectionTestUtils.setField(place, "imageUrl", null); // 이미지 없음
        ReflectionTestUtils.setField(place, "originImgUrl", "http://google.com/photo.jpg");

        // AI 통신 안 타게 설정 (MissingData가 아니도록)
        ReflectionTestUtils.setField(place, "phone", "02-123-4567");
        ReflectionTestUtils.setField(place, "url", "http://test.com");
        ReflectionTestUtils.setField(place, "description", "설명");

        // [수정] 서비스 로직 내에서 두 종류의 조회가 일어나므로 둘 다 Mocking 필요
        given(placeRepository.findByIdWithReviews(placeId)).willReturn(Optional.of(place));
        // updatePlaceImageUrl 메서드 내부에서 findById(placeId)를 호출함
        given(placeRepository.findById(placeId)).willReturn(Optional.of(place));

        given(s3Service.uploadFromExternalUrl(anyString())).willReturn("http://my-s3.com/saved.jpg");

        // When
        placeService.getPlaceDetail(placeId);

        // Then
        // 1. S3 서비스가 올바른 URL로 호출되었는지 확인
        verify(s3Service, times(1)).uploadFromExternalUrl(eq("http://google.com/photo.jpg"));

        // 2. 엔티티의 이미지가 S3 URL로 업데이트 되었는지 확인
        assertThat(place.getImageUrl()).isEqualTo("http://my-s3.com/saved.jpg");
    }

    private PlaceEntity createMockPlace(Long id, String name, String openingHours) {
        PlaceEntity place = new PlaceEntity("GOOGLE", "EXT_123", name, "서울 어딘가", 37.5, 127.0);
        ReflectionTestUtils.setField(place, "id", id);
        ReflectionTestUtils.setField(place, "openingHours", openingHours);
        ReflectionTestUtils.setField(place, "imageUrl", "https://test-image.com");
        return place;
    }
}
