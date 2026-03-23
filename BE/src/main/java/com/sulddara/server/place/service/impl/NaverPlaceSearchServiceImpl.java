package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.dto.NaverLocalSearchResponseDto;
import com.sulddara.server.place.service.ExternalPlaceSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
@Service
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
    public NaverLocalSearchResponseDto searchPlaces(String query, int display, int start, String sort) {
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
            ResponseEntity<NaverLocalSearchResponseDto> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    requestEntity,
                    NaverLocalSearchResponseDto.class
            );

            NaverLocalSearchResponseDto body = response.getBody();
            if (body == null) {
                log.warn("Naver Local Search API returned null body for query: {}", query);
                return emptyResponse();
            }
            return body;
        } catch (RestClientException e) {
            log.error("Naver Local Search API call failed for query: {}", query, e);
            return emptyResponse();
        }
    }

    private NaverLocalSearchResponseDto emptyResponse() {
        NaverLocalSearchResponseDto empty = new NaverLocalSearchResponseDto();
        // items가 null인 경우를 방지하기 위해 빈 리스트를 반환하도록 별도 생성자 대신 getter에서 처리
        return empty;
    }
}
