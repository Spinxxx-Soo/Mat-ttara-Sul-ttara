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
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Slf4j
@Service
@RequiredArgsConstructor
public class NaverPlaceSearchServiceImpl implements ExternalPlaceSearchService {

    private final RestTemplate restTemplate;

    @Value("${external.naver.local-search.url}")
    private String naverSearchUrl;

    @Value("${external.naver.local-search.client-id}")
    private String clientId;

    @Value("${external.naver.local-search.client-secret}")
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
        headers.set("X-Naver-Client-Id", clientId);
        headers.set("X-Naver-Client-Secret", clientSecret);

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        log.debug("Calling Naver Local Search API : URI={}", uri);

        ResponseEntity<NaverLocalSearchResponseDto> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                requestEntity,
                NaverLocalSearchResponseDto.class
        );

        return response.getBody();
    }
}
