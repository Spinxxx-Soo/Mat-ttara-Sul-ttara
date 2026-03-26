package com.sulddara.server.place.service.impl;

import com.sulddara.server.place.document.PlaceDocument;
import com.sulddara.server.place.repository.PlaceSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Elasticsearch 비동기 인덱싱 전용 서비스.
 * Spring @Async는 프록시 기반이므로 같은 빈 내부 호출 시 비동기가 동작하지 않는다.
 * PlaceServiceImpl에서 분리하여 프록시를 통해 호출되도록 보장한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceIndexingService {

    private static final String PROVIDER_KAKAO = "KAKAO";

    private final PlaceSearchRepository placeSearchRepository;

    @Async
    public void indexToElasticsearchAsync(String externalId, String name, String address,
                                          String category, Double lat, Double lng, String phone) {
        try {
            PlaceDocument doc = PlaceDocument.builder()
                    .id(PROVIDER_KAKAO + "_" + externalId)
                    .name(name)
                    .address(address)
                    .category(category)
                    .lat(lat)
                    .lng(lng)
                    .provider(PROVIDER_KAKAO)
                    .externalPlaceId(externalId)
                    .phone(phone)
                    .isOpen(true)
                    .build();
            placeSearchRepository.save(doc);
            log.debug("Indexed place to ES: {}", name);
        } catch (Exception e) {
            log.warn("Failed to index place to Elasticsearch: {}", e.getMessage());
        }
    }
}
