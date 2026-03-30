package com.sulddara.server.config;

import com.sulddara.server.sse.SseHub;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 장시간 유지되는 SSE 연결이 서블릿 컨테이너 기본 비동기 타임아웃으로 끊기지 않도록
 * {@link org.springframework.web.servlet.mvc.method.annotation.SseEmitter} 타임아웃과 맞춥니다.
 */
@Configuration
public class AsyncWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setDefaultTimeout(SseHub.EMITTER_TIMEOUT_MS);
    }
}
