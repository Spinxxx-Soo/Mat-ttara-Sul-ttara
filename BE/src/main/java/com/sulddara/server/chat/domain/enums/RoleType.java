package com.sulddara.server.chat.domain.enums;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum RoleType {
    @JsonProperty("USER")
    USER,
    @JsonProperty("ASSISTANT")
    ASSISTANT
}
