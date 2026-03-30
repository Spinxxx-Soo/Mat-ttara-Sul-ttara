package com.sulddara.server.chat.domain.enums;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum StatusType {
    @JsonProperty("ACTIVE")
    ACTIVE,
    @JsonProperty("CLOSED")
    CLOSED
}
