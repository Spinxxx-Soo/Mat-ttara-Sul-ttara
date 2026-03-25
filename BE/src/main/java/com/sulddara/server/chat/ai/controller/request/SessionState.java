package com.sulddara.server.chat.ai.controller.request;

import lombok.Builder;

import java.util.Map;

@Builder
public record SessionState(
        Double lat,
        Double lng,
        String time,
        Map<String, Object> extraData
) {}
