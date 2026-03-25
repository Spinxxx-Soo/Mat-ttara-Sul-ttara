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
    private Long nextCursor;
    private boolean hasNext;
}
