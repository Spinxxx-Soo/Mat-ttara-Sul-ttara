package com.sulddara.server.place.repository;

import com.sulddara.server.place.document.PlaceDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

/**
 * Elasticsearch 기반 장소 검색 Repository.
 * 키워드 전문 검색 및 페이징을 지원합니다.
 */
public interface PlaceSearchRepository extends ElasticsearchRepository<PlaceDocument, String> {

    Page<PlaceDocument> findByNameContaining(String keyword, Pageable pageable);
}
