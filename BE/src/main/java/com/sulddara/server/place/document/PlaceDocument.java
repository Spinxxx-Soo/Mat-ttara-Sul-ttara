package com.sulddara.server.place.document;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

/**
 * Elasticsearch 'places' 인덱스에 매핑되는 문서 클래스.
 * 네이버 API에서 조회한 장소 데이터를 ES에 캐싱하여 전문 검색을 지원합니다.
 * Nori 한국어 형태소 분석기를 사용하여 한국어 검색 품질을 보장합니다.
 */
@Document(indexName = "places")
@Setting(settingPath = "/elasticsearch/settings.json")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "nori_analyzer", searchAnalyzer = "nori_analyzer")
    private String name;

    @Field(type = FieldType.Text, analyzer = "nori_analyzer")
    private String address;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Double)
    private Double lat;

    @Field(type = FieldType.Double)
    private Double lng;

    @Field(type = FieldType.Keyword)
    private String provider;

    @Field(type = FieldType.Keyword)
    private String externalPlaceId;

    @Field(type = FieldType.Text)
    private String imageUrl;

    @Field(type = FieldType.Keyword)
    private String phone;

    @Field(type = FieldType.Boolean)
    private Boolean isOpen;

    @Builder
    public PlaceDocument(String id, String name, String address, String category,
                         Double lat, Double lng, String provider, String externalPlaceId,
                         String imageUrl, String phone, Boolean isOpen) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.category = category;
        this.lat = lat;
        this.lng = lng;
        this.provider = provider;
        this.externalPlaceId = externalPlaceId;
        this.imageUrl = imageUrl;
        this.phone = phone;
        this.isOpen = isOpen;
    }
}
