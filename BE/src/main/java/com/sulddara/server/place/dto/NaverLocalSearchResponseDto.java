package com.sulddara.server.place.dto;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NaverLocalSearchResponseDto {

    private String lastBuildDate;
    private int total;
    private int start;
    private int display;
    private List<NaverPlaceItem> items;

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class NaverPlaceItem {
        private String title;
        private String link;
        private String category;
        private String description;
        private String telephone;
        private String address;
        private String roadAddress;
        private String mapx; // 카텍 좌표계
        private String mapy; // 카텍 좌표계
    }
}
