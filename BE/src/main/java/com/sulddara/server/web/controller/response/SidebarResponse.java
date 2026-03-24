package com.sulddara.server.web.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class SidebarResponse {
    private String title;
    private String url;
}
