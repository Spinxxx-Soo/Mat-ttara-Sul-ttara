package com.sulddara.server.web.domain;

import lombok.Getter;

@Getter
public enum Sidebar {
    HOME("홈", "/chat"),
    SEARCH("검색", "/search"),
    PLAN("플랜", "/plan"),
    SETTINGS("환경설정", "/settings");

    private final String title;
    private final String url;

    Sidebar(String title, String url) {
        this.title = title;
        this.url = url;
    }
}
