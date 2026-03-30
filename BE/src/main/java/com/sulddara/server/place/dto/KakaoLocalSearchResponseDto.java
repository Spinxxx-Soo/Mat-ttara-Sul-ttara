package com.sulddara.server.place.dto;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Getter
@NoArgsConstructor
public class KakaoLocalSearchResponseDto {

    private Meta meta;
    private List<Document> documents;

    public Meta getMeta() {
        return meta != null ? meta : new Meta();
    }

    public List<Document> getDocuments() {
        return documents != null ? documents : Collections.emptyList();
    }

    @Getter
    @NoArgsConstructor
    public static class Meta {
        private int total_count;
        private int pageable_count;
        private boolean is_end;
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Document {
        private String id;
        private String place_name;
        private String category_name;
        private String category_group_code;
        private String category_group_name;
        private String phone;
        private String address_name;
        private String road_address_name;
        private String x; // 경도 (lng)
        private String y; // 위도 (lat)
        private String place_url;
        private String distance;
    }
}
