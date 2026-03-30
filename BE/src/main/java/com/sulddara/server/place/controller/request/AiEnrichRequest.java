package com.sulddara.server.place.controller.request;

import lombok.Builder;

@Builder
public record AiEnrichRequest (String provider, String externalPlaceId){
}
