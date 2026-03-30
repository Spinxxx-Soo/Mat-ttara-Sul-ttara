package com.sulddara.server.chat.ai.controller.response;

import com.sulddara.server.chat.ai.controller.request.SessionState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiChatResponse {
    private String threadId;
    private long userId;
    private String chatResponse;
    private String type;
    private String memoryStatus;
    private SessionState parsedState;
    // AI가 요약한 채팅방 제목
    private String title;
    // 추천 최종 장소
    private List<RecommendedPlace> places;
}
