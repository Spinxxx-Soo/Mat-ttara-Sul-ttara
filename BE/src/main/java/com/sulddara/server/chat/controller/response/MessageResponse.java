package com.sulddara.server.chat.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MessageResponse {
    private List<MessageDetailResponse> content;
    private PageInfoResponse pageInfo;

    @Builder
    @Data
    public static class PageInfoResponse {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean hasNext;
    }
}
