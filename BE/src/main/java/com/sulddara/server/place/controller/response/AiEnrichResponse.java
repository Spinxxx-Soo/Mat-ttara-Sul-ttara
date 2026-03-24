package com.sulddara.server.place.controller.response;

import lombok.*;

@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AiEnrichResponse {
    private String imageUrl;
    private String description;
    private String phone;
    private String openingHours;
    private String url;
    private Boolean isSuccess;
}
