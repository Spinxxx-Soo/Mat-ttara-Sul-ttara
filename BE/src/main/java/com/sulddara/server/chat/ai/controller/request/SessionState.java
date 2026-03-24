package com.sulddara.server.chat.ai.controller.request;

import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
public record SessionState(
        Double lat,
        Double lng,
        String time,
        List<Long> selectedPlaceIds,
        Map<String, Object> extraData
) {
    public SessionState withSelectedPlaceIds(List<Long> ids) {
        return new SessionState(lat, lng, time, ids, extraData);
    }
}
