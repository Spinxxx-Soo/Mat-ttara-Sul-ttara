package com.sulddara.server.plan.dto;

import java.util.List;

public record AiPlanCreateRequestDto(
        String title,
        String meetingDate,
        String time,
        List<Long> finalPlaceIds
) {}
