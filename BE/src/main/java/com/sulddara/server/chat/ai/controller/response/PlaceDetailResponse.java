package com.sulddara.server.chat.ai.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlaceDetailResponse {
    private Long placeId;
    private String name;
    private String address;
    private String phone;
    private Double lat;
    private Double lng;
    private Double rating;
    private String category;
    private String description;
    private List<String> imageUrls;
    private OpeningHoursResponse openingHours;
    private String url;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpeningHoursResponse {
        private String today;
        private List<DayTime> weekly;
    }

    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DayTime {
        private String day;
        private String time;
    }
}
