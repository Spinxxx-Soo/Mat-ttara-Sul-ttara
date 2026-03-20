package com.sulddara.server.chat.ai.controller.request;

import lombok.Builder;

@Builder
public record PreferenceSummary(
        //임시임 수정해야함
        String usageType, // 사적 or 공적
        String ageGroup, // 약속 참여 나잇대
        String gender // 성별 분위기
        //memorykey, memoryvalue
) {}
