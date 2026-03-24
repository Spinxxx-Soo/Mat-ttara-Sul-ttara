package com.sulddara.server.chat.ai.controller.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecommendedPlace {
    private Long placeId;
    private String name;
    private Double lat;
    private Double lng;
    private String address;
    private String recommendReason;
    private List<String> tags;
}
