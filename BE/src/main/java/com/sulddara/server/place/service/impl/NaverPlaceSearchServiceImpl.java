package com.sulddara.server.place.service.impl;

import com.sulddara.server.global.error.exception.ExternalServiceException;
import com.sulddara.server.place.dto.KakaoLocalSearchResponseDto;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Slf4j
//@Service
@RequiredArgsConstructor
public class NaverPlaceSearchServiceImpl implements ExternalPlaceSearchService {

    private static final String HEADER_CLIENT_ID = "X-Naver-Client-Id";
    private static final String HEADER_CLIENT_SECRET = "X-Naver-Client-Secret";

    private final RestTemplate restTemplate;

    @Value("${spring.external.naver.local-search.url}")
    private String naverSearchUrl;

    @Value("${spring.external.naver.local-search.client-id}")
    private String clientId;

    @Value("${spring.external.naver.local-search.client-secret}")
    private String clientSecret;

    @Override
    public KakaoLocalSearchResponseDto searchPlaces(String query, int display, int start, String sort, Double lat, Double lng) {
        URI uri = UriComponentsBuilder.fromUriString(naverSearchUrl)
                .queryParam("query", query)
                .queryParam("display", display)
                .queryParam("start", start)
                .queryParam("sort", sort)
                .build()
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HEADER_CLIENT_ID, clientId);
        headers.set(HEADER_CLIENT_SECRET, clientSecret);

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        log.debug("Calling Naver Local Search API : URI={}", uri);

        try {
            ResponseEntity<KakaoLocalSearchResponseDto> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    requestEntity,
                    KakaoLocalSearchResponseDto.class
            );

            KakaoLocalSearchResponseDto body = response.getBody();
            if (body == null) {
                throw new ExternalServiceException("네이버 지역 검색 API 응답 바디가 비어있습니다.");
            }
            return body;
        } catch (RestClientException e) {
            throw new ExternalServiceException("네이버 지역 검색 API 호출에 실패했습니다: " + query);
        }
    }
}
