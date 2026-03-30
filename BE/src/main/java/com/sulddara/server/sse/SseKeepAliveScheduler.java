package com.sulddara.server.sse;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SseKeepAliveScheduler {
    private final SseHub sseHub;

    @Scheduled(fixedDelay = 20_000)
    public void ping() {
        sseHub.pingAll();
    }
}
