package com.sulddara.server.auth.controller;

import com.sulddara.server.auth.controller.request.TokenRefreshRequest;
import com.sulddara.server.auth.controller.response.LoginResponse;
import com.sulddara.server.auth.controller.response.TokenResponse;
import com.sulddara.server.auth.service.AuthService;
import com.sulddara.server.auth.service.SocialLoginService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    @Qualifier("googleSocialLoginService")
    private final SocialLoginService googleSocialLoginService;

    @Qualifier("naverSocialLoginService")
    private final SocialLoginService naverSocialLoginService;

    private final AuthService authService;

    @GetMapping("/callback/{provider}")
    public ResponseEntity<LoginResponse> callback(
            @PathVariable String provider,
            @RequestParam String code) {

        SocialLoginService service;
        if(provider.equals("naver")){
            service = naverSocialLoginService;
        }else{
            service = googleSocialLoginService;
        }

        return ResponseEntity.ok(service.login(provider, code));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody TokenRefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Boolean>> logout(HttpServletRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(Collections.singletonMap("ok", true));
    }
}
