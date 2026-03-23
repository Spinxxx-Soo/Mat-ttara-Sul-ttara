package com.sulddara.server.sse.payload;

public interface ChatEventPayload {
    long getSessionId();

    String getEventName();
}
