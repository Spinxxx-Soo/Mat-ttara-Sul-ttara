package com.sulddara.server.place.service.impl;

import com.sulddara.server.global.error.exception.ExternalServiceException;
import com.sulddara.server.place.dto.KakaoLocalSearchResponseDto;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Slf4j
@Primary
@Service
@RequiredArgsConstructor
public class KakaoPlaceSearchServiceImpl implements ExternalPlaceSearchService {

    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String KAKAO_PREFIX = "KakaoAK ";

    private final RestTemplate restTemplate;

    @Value("${spring.external.kakao.local-search.url}")
    private String kakaoSearchUrl;

    @Value("${spring.external.kakao.local-search.api-key}")
    private String apiKey;

    @Override
    public KakaoLocalSearchResponseDto searchPlaces(String query, int display, int start, String sort, Double lat, Double lng) {
        // Kakao API uses 'page' and 'size' instead of 'start' and 'display'
        // Here we keep the interface but map the parameters.
        // Interface: display (size), start (offset)
        // Kakao: size (1-45), page (1-45)
//        int page = (start / display) + 1;
        int page = start;
        int size = Math.min(display, 45); // Kakao max size is 45

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(kakaoSearchUrl)
                .queryParam("query", query)
                .queryParam("size", size)
                .queryParam("page", page);

        // 위치 정보가 있을 때만 위치 기반 반경 검색 파라미터 추가
        if (lat != null && lng != null) {
            uriBuilder
                    .queryParam("x", lng)   // 카카오: x = 경도
                    .queryParam("y", lat)   // 카카오: y = 위도
                    .queryParam("radius", 20000); // 반경 20km
        }

        URI uri = uriBuilder.build().encode().toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HEADER_AUTHORIZATION, KAKAO_PREFIX + apiKey);

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        log.debug("Calling Kakao Local Search API : URI={}", uri);

        try {
            ResponseEntity<KakaoLocalSearchResponseDto> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    requestEntity,
                    KakaoLocalSearchResponseDto.class
            );

            KakaoLocalSearchResponseDto body = response.getBody();
            if (body == null) {
                throw new ExternalServiceException("카카오 지역 검색 API 응답 바디가 비어있습니다.");
            }
            return body;
        } catch (RestClientException e) {
            log.error("Kakao Local Search API error: ", e);
            throw new ExternalServiceException("카카오 지역 검색 API 호출에 실패했습니다: " + query);
        }
    }
}
