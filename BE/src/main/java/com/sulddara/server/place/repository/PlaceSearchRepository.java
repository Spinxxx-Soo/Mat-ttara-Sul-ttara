package com.sulddara.server.place.repository;

import com.sulddara.server.place.document.PlaceDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

/**
 * Elasticsearch 기반 장소 검색 Repository.
 * 키워드 전문 검색 및 카테고리 필터링을 지원합니다.
 */
public interface PlaceSearchRepository extends ElasticsearchRepository<PlaceDocument, String> {

    List<PlaceDocument> findByNameContaining(String keyword);
}
