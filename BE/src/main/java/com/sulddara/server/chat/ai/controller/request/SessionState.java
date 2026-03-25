package com.sulddara.server.chat.ai.controller.request;

import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
public record SessionState(
        Double lat,
        Double lng,
        String time,
        String title,
        String meetingDate,
        List<Long> finalPlaceIds,
        Map<String, Object> extraData
) {
    public SessionState withFinalPlaceIds(List<Long> ids) {
        return new SessionState(lat, lng, time, title, meetingDate, ids, extraData);
    }
}
